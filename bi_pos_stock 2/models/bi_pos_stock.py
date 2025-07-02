# -*- coding: utf-8 -*-
# Part of BrowseInfo. See LICENSE file for full copyright and licensing details.

from odoo import fields, models, api, _
import json
from odoo.exceptions import UserError, ValidationError
from odoo.tools import float_is_zero


class pos_config(models.Model):
    _inherit = 'pos.config'

    pos_display_stock = fields.Boolean(string='Display Stock in POS')
    pos_stock_type = fields.Selection(
        [('onhand', 'Qty on Hand'),('available', 'Qty Available')], default='onhand', string='Stock Type', help='Seller can display Different stock type in POS.')
    pos_allow_order = fields.Boolean(string='Allow POS Order When Product is Out of Stock')
    pos_deny_order = fields.Char(string='Deny POS Order When Product Qty is goes down to')
    stock_position = fields.Selection(
        [('top_right', 'Top Right'), ('top_left', 'Top Left'), ('bottom_right', 'Bottom Right')], default='top_left', string='Stock Position')

    show_stock_location = fields.Selection([
        ('all', 'All Warehouse'),
        ('specific', 'Current Session Warehouse'),
    ], string='Show Stock Of', default='all')

    stock_location_id = fields.Many2one(
        'stock.location', string='Stock Location',
        domain=[('usage', '=', 'internal')])
    
    color_background = fields.Char(
        string='Color',)
    font_background = fields.Char(
        string='Font Color',)
    low_stock = fields.Float(
        string='Product Low Stock',default=0.00)


class ResConfigSettings(models.TransientModel):
    _inherit = 'res.config.settings'

    pos_pos_display_stock = fields.Boolean(
        related="pos_config_id.pos_display_stock", readonly=False)
    pos_pos_stock_type = fields.Selection(related="pos_config_id.pos_stock_type", readonly=False,
                                          string='Stock Type', help='Seller can display Different stock type in POS.')
    pos_pos_allow_order = fields.Boolean(
        string='Allow POS Order When Product is Out of Stock', readonly=False, related="pos_config_id.pos_allow_order")
    pos_pos_deny_order = fields.Char(string='Deny POS Order When Product Qty is goes down to',
                                     readonly=False, related="pos_config_id.pos_deny_order")

    pos_show_stock_location = fields.Selection(
        string='Show Stock Of', readonly=False, related="pos_config_id.show_stock_location")

    pos_stock_location_id = fields.Many2one(
        'stock.location',
        string='Stock Location',
        domain=[('usage', '=', 'internal')],
        related="pos_config_id.stock_location_id",
        readonly=False
    )
    pos_stock_position = fields.Selection(
        related="pos_config_id.stock_position", readonly=False, string='Stock Position')
    pos_color_background = fields.Char(
        string='Background Color', readonly=False, related="pos_config_id.color_background")
    pos_font_background = fields.Char(
        string='Font Color', readonly=False, related="pos_config_id.font_background")
    pos_low_stock = fields.Float(
        string='Product Low Stock', readonly=False, related="pos_config_id.low_stock")


class PosOrder(models.Model):
    _inherit = 'pos.order'

    location_id = fields.Many2one(
        comodel_name='stock.location',
        related='config_id.stock_location_id',
        string="Location",
        store=True,
        readonly=True,
    )


class stock_quant(models.Model):
    _inherit = 'stock.move'

    @api.model_create_multi
    def create(self, vals_list):
        res = super(stock_quant, self).create(vals_list)

        notifications = []
        for rec in res:
            rec.product_id.sync_product()
        return res

    def write(self, vals):
        res = super(stock_quant, self).write(vals)
        notifications = []
        for rec in self:
            rec.product_id.sync_product()
        return res

class product(models.Model):
    _inherit = 'product.product'
    
    quant_text = fields.Text('Quant Qty', compute='_compute_avail_locations')
    prod_quant= fields.Text('Quant Qty',store=True)

    @api.model
    def _load_pos_data_fields(self, config_id):
        params = super()._load_pos_data_fields(config_id)
        params += ['type','product_variant_count','virtual_available','qty_available','incoming_qty','outgoing_qty','quant_text','prod_quant']
        return params


    @api.model
    def sync_product(self):
        notifications = []
        pos_configs = self.env['pos.config'].sudo().search([('pos_display_stock', '=', True)])
        for config in pos_configs:
            if config:
                prod_fields = self._load_pos_data_fields(config.id)
                config._notify('PRODUCT_MODIFIED', {
                    'product.product': self.read(prod_fields, load=False)
                })
        return True

    def get_low_stock_products(self,low_stock):
        products=self.search([('is_storable', '=' , True),('available_in_pos', '=', True)]);
        product_list=[]
        for product in products:
            if product.qty_available <= low_stock:
                product_list.append(product.id)
        return product_list
    
    @api.depends('stock_quant_ids', 'stock_quant_ids.product_id', 'stock_quant_ids.location_id',
                 'stock_quant_ids.quantity')
    def _compute_avail_locations(self):
        notifications = []
        for rec in self:
            final_data = {}
            rec.quant_text = json.dumps(final_data)
            if rec.is_storable:
                quants = self.env['stock.quant'].sudo().search(
                    [('product_id', 'in', rec.ids), ('location_id.usage', '=', 'internal')])
                for quant in quants:
                    loc = quant.location_id.id
                    if loc in final_data:
                        last_qty = final_data[loc][0]
                        final_data[loc][0] = last_qty + quant.quantity
                    else:
                        final_data[loc] = [quant.quantity, 0, 0,quant.available_quantity]
                rec.quant_text = json.dumps(final_data)
        return True


class StockPicking(models.Model):
    _inherit = 'stock.picking'

    @api.model
    def _create_picking_from_pos_order_lines(self, location_dest_id, lines, picking_type, partner=False):
        """We'll create some picking based on order_lines"""
        pickings = self.env['stock.picking']
        stockable_lines = lines.filtered(
            lambda l: l.product_id.type in ['product', 'consu'] and not float_is_zero(l.qty,
                                                                                      precision_rounding=l.product_id.uom_id.rounding)
        )
        if not stockable_lines:
            return pickings

        positive_lines = stockable_lines.filtered(lambda l: l.qty > 0)
        negative_lines = stockable_lines - positive_lines

        if positive_lines:
            pos_order = positive_lines[0].order_id
            location_id = pos_order.location_id.id if pos_order.location_id else picking_type.default_location_src_id.id
            vals = self._prepare_picking_vals(
                partner, picking_type, location_id, location_dest_id)

            positive_picking = self.env['stock.picking'].create(vals)
            positive_picking._create_move_from_pos_order_lines(positive_lines)
            self.env.flush_all()
            try:
                with self.env.cr.savepoint():
                    positive_picking._action_done()
            except (UserError, ValidationError):
                pass

            pickings |= positive_picking

        if negative_lines:
            print("====")
            # 8/0
            return_picking_type = picking_type
            # return_location_id = return_picking_type.default_location_dest_id.id or picking_type.default_location_src_id.id
            return_location_id = picking_type.default_location_src_id.id

            vals = self._prepare_picking_vals(
                partner, return_picking_type, location_dest_id, return_location_id)
            negative_picking = self.env['stock.picking'].create(vals)
            negative_picking._create_move_from_pos_order_lines(negative_lines)
            try:
                with self.env.cr.savepoint():
                    negative_picking._action_done()
            except (UserError, ValidationError):
                pass

            pickings |= negative_picking

        return pickings

class PickingType(models.Model):
    _inherit = "stock.picking.type"

    @api.model
    def _load_pos_data_fields(self, config_id):
        params = super()._load_pos_data_fields(config_id)
        params += ['default_location_src_id']
        return params
