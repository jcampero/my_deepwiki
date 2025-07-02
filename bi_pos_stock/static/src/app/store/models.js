/** @odoo-module */
import { PosStore } from "@point_of_sale/app/store/pos_store";
import { _t } from "@web/core/l10n/translation";
import { patch } from "@web/core/utils/patch";
import { AlertDialog } from "@web/core/confirmation_dialog/confirmation_dialog";
import { PosOrder } from "@point_of_sale/app/models/pos_order";

patch(PosStore.prototype, {
    async processServerData(loadedData) {
        await super.processServerData(...arguments);
        this.custom_stock_locations = this.data.models["stock.location"].filter(location => 
            location === this.config.stock_location_id
        );
        this.all_location = this.data.models['stock.location'].getAll();
    },

    async addLineToOrder(vals, order, opts = {}, configure = true){
        let self = this;
        let pos_config = self.config;
        const product = vals.product_id;
        let allow_order = pos_config.pos_allow_order;
        let deny_order= pos_config.pos_deny_order || 0;
        let call_super = true;
        let res = await super.addLineToOrder(vals, order,opts, configure);
        if(product.product_variant_count > 1){
            if(pos_config.pos_display_stock && product.type == 'consu' && product.is_storable){
                let line = order.get_selected_orderline()

                if (allow_order == false){
                    if (pos_config.pos_stock_type == 'onhand'){
                        if (res && res.product_id){
                            if ( parseFloat(res.product_id.virtual_available) <= 0){
                                call_super = false;
                                self.dialog.add(AlertDialog, {
                                    title: _t('Deny Order'),
                                    body: _t("Deny Order" + "(" + res.product_id.display_name + ")" + " is Out of Stock."),
                                });
                                if (res && res.order_id){
                                    res.order_id.removeOrderline(res)
                                }
                            }
                        }else{
                            if (line){
                                if (parseFloat(line.product_id.virtual_available) <= 0){
                                    call_super = false;
                                    self.dialog.add(AlertDialog, {
                                        title: _t('Deny Order'),
                                        body: _t("Deny Order" + "(" + line.product_id.display_name + ")" + " is Out of Stock."),
                                    });
                                    if (res && res.order_id){
                                        res.order_id.removeOrderline(res)
                                    } 
                                }
                            }
                        }
                    }
                    if (pos_config.pos_stock_type == 'available'){
                        if (res && res.product_id){
                            if ( parseFloat(res.product_id.virtual_available) <= 0 ){
                                call_super = false;
                                self.dialog.add(AlertDialog, {
                                    title: _t('Deny Order'),
                                    body: _t("Deny Order" + "(" + res.product_id.display_name + ")" + " is Out of Stock."),
                                });
                                if (res && res.order_id){
                                    res.order_id.removeOrderline(res)
                                }
                            }
                        }else{
                            if (line){
                                if ( parseFloat(res.product_id.virtual_available) <= 0 ){
                                    call_super = false;
                                    self.dialog.add(AlertDialog, {
                                        title: _t('Deny Order'),
                                        body: _t("Deny Order" + "(" + line.product_id.display_name + ")" + " is Out of Stock."),
                                    });
                                    if (res && res.order_id){
                                        res.order_id.removeOrderline(res)
                                    }
                                }
                            }
                        }
                    }
                }else{
                    if (pos_config.pos_stock_type == 'onhand'){
                        if (res && res.product_id){
                            if ( parseFloat(res.product_id.virtual_available) <= deny_order ){
                                call_super = false;
                                self.dialog.add(AlertDialog, {
                                    title: _t('Deny Order'),
                                    body: _t("Deny Order" + "(" + res.product_id.display_name + ")" + " is Out of Stock."),
                                });
                                if (res && res.order_id){
                                    res.order_id.removeOrderline(res)
                                }
                            }
                        }else{
                            if (line){
                                if ( parseFloat(line.product_id.virtual_available) <= deny_order ){
                                    call_super = false;
                                    self.dialog.add(AlertDialog, {
                                        title: _t('Deny Order'),
                                        body: _t("Deny Order" + "(" + line.product_id.display_name + ")" + " is Out of Stock."),
                                    });
                                    if (res && res.order_id){
                                        res.order_id.removeOrderline(res)
                                    }
                                }
                            }
                        }
                    }
                    if (pos_config.pos_stock_type == 'available'){
                        if (res && res.product_id){
                            if ( parseFloat(res.product_id.virtual_available) <= deny_order ){
                                call_super = false;
                                self.dialog.add(AlertDialog, {
                                    title: _t('Deny Order'),
                                    body: _t("Deny Order" + "(" + res.product_id.display_name + ")" + " is Out of Stock."),
                                });
                                if (res && res.order_id){
                                    res.order_id.removeOrderline(res)
                                }
                            }
                        }else{
                            if (line){
                                if ( parseFloat(line.product_id.virtual_available) <= deny_order ){
                                    call_super = false;
                                    self.dialog.add(AlertDialog, {
                                        title: _t('Deny Order'),
                                        body: _t("Deny Order" + "(" + line.product_id.display_name + ")" + " is Out of Stock."),
                                    });
                                    if (res && res.order_id){
                                        res.order_id.removeOrderline(res)
                                    }
                                }
                            }
                        }
                    }
                }
            }
            if(call_super){
                return res
            }
        }else{
            if(pos_config.pos_display_stock && product.type == 'consu' && product.is_storable){
                if (allow_order == false){
                    if (pos_config.pos_stock_type == 'onhand'){
                        if ( product.bi_on_hand <= 0 ){
                            call_super = false;
                            self.dialog.add(AlertDialog, {
                                title: _t('Deny Order'),
                                body: _t("Deny Order" + "(" + product.display_name + ")" + " is Out of Stock."),
                            });
                            if (res && res.order_id){
                                res.order_id.removeOrderline(res)
                            }
                        }
                    }
                    if (pos_config.pos_stock_type == 'available'){
                        if ( product.bi_available <= 0 ){
                            call_super = false;
                            self.dialog.add(AlertDialog, {
                                title: _t('Deny Order'),
                                body: _t("Deny Order" + "(" + product.display_name + ")" + " is Out of Stock."),
                            });
                            if (res && res.order_id){
                                res.order_id.removeOrderline(res)
                            }
                        }
                    }
                }else{
                    if (pos_config.pos_stock_type == 'onhand'){
                        if ( product.bi_on_hand <= deny_order ){
                            call_super = false;
                            self.dialog.add(AlertDialog, {
                                title: _t('Deny Order'),
                                body: _t("Deny Order" + "(" + product.display_name + ")" + " is Out of Stock."),
                            });
                            if (res && res.order_id){
                                res.order_id.removeOrderline(res)
                            }
                        }
                    }
                    if (pos_config.pos_stock_type == 'available'){
                        if ( product.bi_available <= deny_order ){
                            call_super = false;
                            self.dialog.add(AlertDialog, {
                                title: _t('Deny Order'),
                                body: _t("Deny Order" + "(" + product.display_name + ")" + " is Out of Stock."),
                            });
                            if (res && res.order_id){
                                res.order_id.removeOrderline(res)
                            }
                        }
                    }
                }
            }
            if(call_super){
                return res
            }
        }
    },    

    product_total(){
        let order = this.pos.get_order();
        var orderlines = order.get_orderlines();
        return orderlines.length;
    },

    set_interval(interval){
        this.interval=interval;
    },

    async pay() {
        var self = this;
        let order = this.get_order();
        let lines = order.get_orderlines();
        let pos_config = self.config; 
        let allow_order = pos_config.pos_allow_order;
        let deny_order = pos_config.pos_deny_order || 0;
        let call_super = true;
   
        if (pos_config.pos_display_stock) {
            let prod_used_qty = {};
            lines.forEach(line => {
                let prd = line.product_id;
                if (prd && prd.product_variant_count > 1){
                    if (prd.type == 'consu' && prd.is_storable) {
                        if (pos_config.pos_stock_type == 'onhand') {
                            if (prd.id in prod_used_qty) {
                                let old_qty = prod_used_qty[prd.id][1];
                                prod_used_qty[prd.id] = [prd.qty, line.qty + old_qty];
                            } else {
                                prod_used_qty[prd.id] = [prd.qty_available, line.qty];
                            }
                        }
                        if (pos_config.pos_stock_type == 'available') {
                            if (prd.id in prod_used_qty) {
                                let old_qty = prod_used_qty[prd.id][1];
                                prod_used_qty[prd.id] = [prd.virtual_available, line.qty + old_qty];
                            } else {
                                prod_used_qty[prd.id] = [prd.virtual_available, line.qty];
                            }
                        }
                    }

                }else{
                    if (prd.type == 'consu' && prd.is_storable) {
                        if (pos_config.pos_stock_type == 'onhand') {
                            if (prd.id in prod_used_qty) {
                                let old_qty = prod_used_qty[prd.id][1];
                                prod_used_qty[prd.id] = [prd.bi_on_hand, line.qty + old_qty];
                            } else {
                                prod_used_qty[prd.id] = [prd.bi_on_hand, line.qty];
                            }
                        }
                        if (pos_config.pos_stock_type == 'available') {
                            if (prd.id in prod_used_qty) {
                                let old_qty = prod_used_qty[prd.id][1];
                                prod_used_qty[prd.id] = [prd.bi_available, line.qty + old_qty];
                            } else {
                                prod_used_qty[prd.id] = [prd.bi_available, line.qty];
                            }
                        }
                    }
                }
            });

            for (let [i, pq] of Object.entries(prod_used_qty)) {
                let product = self.models['product.product'].getBy('id',i)
                if (allow_order == false && pq[0] < pq[1]) {
                    call_super = false;
                    self.dialog.add(AlertDialog, {
                        title: _t('Deny Order'),
                        body: _t("Deny Order" + "(" + product.display_name + ")" + " is Out of Stock."),
                    });
                }
                let check = pq[0] - pq[1];
                if (allow_order == true && pq[0] < deny_order) {
                    call_super = false;
                    self.dialog.add(AlertDialog, {
                        title: _t('Deny Order'),
                        body: _t("Deny Order" + "(" + product.display_name + ")" + " is Out of Stock."),
                    });
                }
            }
        }
        if (call_super) {
            super.pay();
        }
    }
   
});


patch(PosOrder.prototype, {
    get_display_product_qty(prd){
        var self = this;
        var products = {};
        var order = this;
        var display_qty = 0;
        if(order){
            var orderlines = order.lines;
            if(orderlines.length > 0){
                orderlines.forEach(function (line) {
                    if (line.product_id.product_variant_count > 1){
                        if (line.product_id.raw.product_tmpl_id == prd.raw.product_tmpl_id){
                            display_qty += line.qty
                            let prod_qt = parseFloat(line.product_id.prod_quant)
                            prod_qt -= 1
                            let prodstr = prod_qt.toString()
                        }
                    }else{
                        if(line.product_id.id == prd.id){
                            display_qty += line.qty
                        }
                    }
                });
            }
        }
        return display_qty
    },
});