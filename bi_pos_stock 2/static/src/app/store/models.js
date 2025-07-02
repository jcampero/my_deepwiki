/** @odoo-module */
import { PosStore } from "@point_of_sale/app/store/pos_store";
import { _t } from "@web/core/l10n/translation";
import { patch } from "@web/core/utils/patch";
import { AlertDialog } from "@web/core/confirmation_dialog/confirmation_dialog";
import { PosOrder } from "@point_of_sale/app/models/pos_order";
import { PaymentScreen } from "@point_of_sale/app/screens/payment_screen/payment_screen";

patch(PosStore.prototype, {
    async processServerData(loadedData) {
        await super.processServerData(...arguments);
        this.custom_stock_locations = this.data.models["stock.location"].filter(location =>
            location.id === this.config.stock_location_id
        );
        this.all_location = this.data.models['stock.location'].getAll();
    },

    set_interval(interval){
        this.interval=interval;
    },

    validateProductStock(product, quantity, pos_config, allow_order, deny_order) {
        let hasStock = true;
        let stockValue = 0;

        if (product.product_variant_count > 1) {
            if (pos_config.pos_stock_type == 'onhand') {
                stockValue = parseFloat(product.virtual_available);
            } else if (pos_config.pos_stock_type == 'available') {
                stockValue = parseFloat(product.virtual_available);
            }
        } else {
            if (pos_config.pos_stock_type == 'onhand') {
                stockValue = parseFloat(product.bi_on_hand);
            } else if (pos_config.pos_stock_type == 'available') {
                stockValue = parseFloat(product.bi_available);
            }
        }

        if (allow_order == false) {
            hasStock = stockValue > 0;
        } else {
            hasStock = stockValue > deny_order;
        }

        return hasStock;
    },
});

patch(PaymentScreen.prototype, {
    async validateOrder(isForceValidate) {
        let order = this.pos.get_order();
        let lines = order.get_orderlines();
        let pos_config = this.pos.config;
        let allow_order = pos_config.pos_allow_order;
        let deny_order = pos_config.pos_deny_order || 0;

        let hasShippingDate = order.getShippingDate && order.getShippingDate();

        if (!hasShippingDate && pos_config.pos_display_stock) {
            let prod_used_qty = {};

            lines.forEach(line => {
                let prd = line.get_product();
                if (prd && prd.type == 'consu' && prd.is_storable) {
                    let stockKey = prd.id;
                    let currentStock = 0;

                    if (prd.product_variant_count > 1) {
                        if (pos_config.pos_stock_type == 'onhand') {
                            currentStock = prd.qty_available;
                        } else if (pos_config.pos_stock_type == 'available') {
                            currentStock = prd.virtual_available;
                        }
                    } else {
                        if (pos_config.pos_stock_type == 'onhand') {
                            currentStock = prd.bi_on_hand;
                        } else if (pos_config.pos_stock_type == 'available') {
                            currentStock = prd.bi_available;
                        }
                    }

                    if (stockKey in prod_used_qty) {
                        let old_qty = prod_used_qty[stockKey][1];
                        prod_used_qty[stockKey] = [currentStock, line.qty + old_qty];
                    } else {
                        prod_used_qty[stockKey] = [currentStock, line.qty];
                    }
                }
            });

            for (let [productId, stockInfo] of Object.entries(prod_used_qty)) {
                let product = this.pos.data.models["product.product"].get(parseInt(productId));

                if (!product) {
                    console.error(`Product with ID ${productId} not found`);
                    continue;
                }
                let availableStock = stockInfo[0];
                let requestedQty = stockInfo[1];

                if (allow_order == false) {
                    if (availableStock < requestedQty) {
                        this.dialog.add(AlertDialog, {
                            title: _t('Stock Insufficient'),
                            body: _t(`Cannot process order. Product "${product.display_name}" is out of stock. Available: ${availableStock}, Requested: ${requestedQty}`),
                        });
                        return false;
                    }
                } else {
                    if (availableStock < deny_order) {
                        this.dialog.add(AlertDialog, {
                            title: _t('Stock Insufficient'),
                            body: _t(`Cannot process order. Product "${product.display_name}" stock is below minimum threshold. Available: ${availableStock}, Minimum required: ${deny_order}`),
                        });
                        return false;
                    }
                }
            }
        }

        if (hasShippingDate && pos_config.pos_display_stock) {
            console.log('Ship Later is selected - allowing sale regardless of stock levels');
            this.dialog.add(AlertDialog, {
                title: _t('Ship Later Order'),
                body: _t('This order is scheduled for later shipment. Stock will be validated at shipping time.'),
            });
        }

        return super.validateOrder(isForceValidate);
    }
});

patch(PosOrder.prototype, {
    get_display_product_qty(prd) {
        let display_qty = 0;
        const orderlines = this.lines || [];

        orderlines.forEach(line => {
            const product = line.get_product();

            if (product.product_variant_count > 1) {
                if (product.product_tmpl_id === prd.product_tmpl_id) {
                    display_qty += line.qty;
                }
            } else {
                if (product.id === prd.id) {
                    display_qty += line.qty;
                }
            }
        });

        return display_qty;
    },
});