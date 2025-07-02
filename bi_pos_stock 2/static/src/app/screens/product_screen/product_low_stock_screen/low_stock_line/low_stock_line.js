/** @odoo-module */

import { registry } from "@web/core/registry";
import { Component } from "@odoo/owl";

export class LowStockLine extends Component {
    static template = "bi_pos_stock.LowStockLine";
    static props = {
        product: { type: Object },
    };
};
registry.category("pos_screens").add("LowStockLine", LowStockLine);
