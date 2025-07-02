/** @odoo-module */

import { ProductScreen } from "@point_of_sale/app/screens/product_screen/product_screen";
import { patch } from "@web/core/utils/patch";
import { usePos } from "@point_of_sale/app/store/pos_hook";
import { onMounted } from "@odoo/owl";
import { getOnNotified } from "@point_of_sale/utils";



patch(ProductScreen.prototype, {
	setup() {
        super.setup();
        this.pos = usePos();
        onMounted(this.onMounted);
		var self = this;
    	self.pos.onNotified = getOnNotified(self.pos.bus, self.pos.config.access_token);
        if (self.pos.config.pos_display_stock){
            self.pos.onNotified("PRODUCT_MODIFIED", (payload) => {
        		self.pos.models.loadData(payload);
        		if (payload['product.product'][0]){
                    self.pos.models['product.product'].getBy('id',payload['product.product'][0].id)
        		}
            });
        }
    },

    onMounted() {
		let self = this;
		self.change_css();
		let config = self.pos.config;
		let color_background = config.color_background || "#4caf50"; 
		let font_color = config.font_background || "#ffffff"; 
	
		if (config.pos_stock_type === 'onhand' || config.pos_stock_type === 'available') {
			let labels;
			
			if (config.stock_position === 'top_left') {
				labels = [document.getElementsByClassName('qty-left-label'), document.getElementsByClassName('qty-image-label')];
			} else if (config.stock_position === 'top_right') {
				labels = [document.getElementsByClassName('qty-tright-label')];
			} else if (config.stock_position === 'bottom_right') {
				labels = [document.getElementsByClassName('qty-bright-label')];
			}
			labels.forEach(labelGroup => {
				Array.from(labelGroup).forEach(label => {
					label.style.backgroundColor = color_background;
					label.style.color = font_color;
				});
			});
		}
	},
	
	change_css() {
		let self = this;
		let order = self.pos;
		
		if (order) {
			var interval = setInterval(function () {
				self.interval = interval;
				order.set_interval(interval);
				let config = self.pos.config;
				let color_background = config.color_background || "#4caf50"; // default value
				let font_color = config.font_background || "#ffffff"; // default value
	
				if (config.pos_stock_type === 'onhand' || config.pos_stock_type === 'available') {
					let labels;
	
					if (config.stock_position === 'top_left') {
						labels = [document.getElementsByClassName('qty-left-label'), document.getElementsByClassName('qty-image-label')];
					} else if (config.stock_position === 'top_right') {
						labels = [document.getElementsByClassName('qty-tright-label')];
					} else if (config.stock_position === 'bottom_right') {
						labels = [document.getElementsByClassName('qty-bright-label')];
					}
	
					labels.forEach(labelGroup => {
						Array.from(labelGroup).forEach(label => {
							label.style.backgroundColor = color_background;
							label.style.color = font_color;
						});
					});
				}
			}, 1200);
		}
	},

	get productsToDisplay() {
		let self = this;
		let prods = super.productsToDisplay;
		let location = self.pos.custom_stock_locations;
		let all_location = self.pos.all_location;
		let order = self.pos.get_order();
		let config = self.pos.config;
		let color_background = config.color_background;
		let font_color = config.font_background;

		const applyStyles = (elements, bgColor, textColor) => {
			Array.from(elements).forEach(el => {
				el.style.backgroundColor = bgColor;
				el.style.color = textColor;
			});
		};

		if (config.pos_stock_type === 'onhand' || config.pos_stock_type === 'available') {
			if (config.stock_position === 'top_left') {
				const elements = document.getElementsByClassName('qty-left-label');
				const imageElements = document.getElementsByClassName('qty-image-label');
				const bgColor = color_background || "#4caf50";
				const textColor = font_color || "#ffffff";
				applyStyles(elements, bgColor, textColor);
				applyStyles(imageElements, bgColor, textColor);
			}
			if (config.stock_position === 'top_right') {
				const elements = document.getElementsByClassName('qty-tright-label');
				const bgColor = color_background || "#4caf50";
				const textColor = font_color || "#ffffff";
				applyStyles(elements, bgColor, textColor);
			}
			if (config.stock_position === 'bottom_right') {
				const elements = document.getElementsByClassName('qty-bright-label');
				const bgColor = color_background || "#4caf50";
				const textColor = font_color || "#ffffff";
				applyStyles(elements, bgColor, textColor);
			}
		}
		if (config.show_stock_location === 'specific') {
			if (config.pos_stock_type === 'onhand') {
				prods.forEach(async function(prd) {
					let bi_on_hand = 0;
					if(prd.isConfigurable()){
						const newProduct = self.pos.models["product.product"].filter((p) => 
							p.raw.product_tmpl_id === prd.raw.product_tmpl_id
						)
						if(newProduct.length > 0){
							var final_data = 0;
							var virtual_available = 0
							newProduct.forEach(async function(vprd){

								let loc_available = JSON.parse(vprd.quant_text);	
								vprd['bi_on_hand'] = 0;
								vprd['virtual_available'] = 0;	
								for (let k in loc_available) {
									if (location[0]['id'] === parseInt(k)) {
										final_data += loc_available[k][0];
										virtual_available = loc_available[k][0];
										vprd['virtual_available'] = virtual_available;
									}
								}
							});
								newProduct.forEach(async function(ava_prd){

									bi_on_hand = final_data;
									const remove_product = order.get_display_product_qty(ava_prd);
									bi_on_hand -= remove_product;
									ava_prd['bi_on_hand'] = bi_on_hand;
							});
						}
					}else{
						var variant_products = []
						if(prd.isConfigurable()){
							const newProduct = this.pos.models["product.product"].find((p) => 
								p.raw.product_tmpl_id === prd.raw.product_tmpl_id
							)
						}
						prd['bi_on_hand'] = 0;
						let loc_onhand = JSON.parse(prd.quant_text);
						for (let k in loc_onhand) {
							if (location[0]['id'] === parseInt(k)) {
								bi_on_hand = loc_onhand[k][0];;
								const remove_product = order.get_display_product_qty(prd);
								bi_on_hand -= remove_product;
								prd['bi_on_hand'] = bi_on_hand;
							}
						}
					}
				});
				// this.pos.data.syncInProgress = false;
			}
			if (config.pos_stock_type === 'available') {
				prods.forEach(async function(prd) {
					let bi_available = 0;
					if(prd.isConfigurable()){
						const newProduct = self.pos.models["product.product"].filter((p) => 
							p.raw.product_tmpl_id === prd.raw.product_tmpl_id
						)
						if(newProduct.length > 0){
							var final_data = 0;
							var virtual_available = 0
							newProduct.forEach(async function(vprd){
								let loc_available = JSON.parse(vprd.quant_text);	
								vprd['bi_available'] = 0;
								vprd['virtual_available'] = 0;	
								for (let k in loc_available) {
									if (location[0]['id'] === parseInt(k)) {
										final_data += loc_available[k][3];
										virtual_available = loc_available[k][3];
										vprd['virtual_available'] = virtual_available;
									}
								}
							});
								newProduct.forEach(async function(ava_prd){
									bi_available = final_data;
									const remove_product = order.get_display_product_qty(ava_prd);
									bi_available -= remove_product;
									ava_prd['bi_available'] = bi_available;
							});
						}

					}else{
						let loc_available = JSON.parse(prd.quant_text);
						prd['bi_available'] = 0;
						let total = 0;
						let out = 0;
						let inc = 0;
						for (let k in loc_available) {
							if (location[0]['id'] === parseInt(k)) {
								total += loc_available[k][3];
								if (loc_available[k][1]) {
									out += loc_available[k][1];
								}
								if (loc_available[k][2]) {
									inc += loc_available[k][2];
								}
								let final_data = (total + inc);

								bi_available = final_data;
								const remove_product = order.get_display_product_qty(prd);
								bi_available -= remove_product;
								// ava_prd['bi_available'] = bi_available;

								prd['bi_available'] = bi_available;
								prd['virtual_available'] = final_data;
							}
						}
					}
				});

			}
		} else {
			let picking_warehouse = self.pos.config.picking_type_id.default_location_src_id.id;
			location = all_location.filter(loc => loc.id == picking_warehouse)
			if (config.pos_stock_type === 'onhand') {
				prods.forEach(async function(prd) {
					let bi_on_hand = 0;
					if(prd.isConfigurable()){
						const newProduct = self.pos.models["product.product"].filter((p) => 
							p.raw.product_tmpl_id === prd.raw.product_tmpl_id
						)
						if(newProduct.length > 0){
							var final_data = 0;
							var virtual_available = 0
							newProduct.forEach(async function(vprd){

								let loc_available = JSON.parse(vprd.quant_text);	
								vprd['bi_on_hand'] = 0;
								vprd['virtual_available'] = 0;	
								for (let k in loc_available) {
									final_data += loc_available[k][0];
									virtual_available = loc_available[k][0];
									vprd['virtual_available'] = virtual_available;
								}
							});
								newProduct.forEach(async function(ava_prd){
									bi_on_hand = final_data;
									const remove_product = order.get_display_product_qty(ava_prd);
									bi_on_hand -= remove_product;
									ava_prd['bi_on_hand'] = bi_on_hand;
							});
						}
					}else{
						
						bi_on_hand = prd.qty_available;;
						const remove_product = order.get_display_product_qty(prd);
						bi_on_hand -= remove_product;
						prd['bi_on_hand'] = bi_on_hand;
						prd['virtual_available'] = prd.qty_available;

					}
				});
				// this.pos.data.syncInProgress = false;
			}
			if (config.pos_stock_type === 'available') {
				prods.forEach(async function(prd) {
					let bi_available = 0;
					if(prd.isConfigurable()){
						const newProduct = self.pos.models["product.product"].filter((p) => 
							p.raw.product_tmpl_id === prd.raw.product_tmpl_id
						)
						if(newProduct.length > 0){
							var final_data = 0;
							var virtual_available = 0
							newProduct.forEach(async function(vprd){
								let loc_available = JSON.parse(vprd.quant_text);	
								vprd['bi_available'] = 0;
								vprd['virtual_available'] = 0;	
								for (let k in loc_available) {
									final_data += loc_available[k][3];
									virtual_available = loc_available[k][3];
									vprd['virtual_available'] = virtual_available;
								}
							});
								newProduct.forEach(async function(ava_prd){
									bi_available = final_data;
									const remove_product = order.get_display_product_qty(ava_prd);
									bi_available -= remove_product;
									ava_prd['bi_available'] = bi_available;
							});
						}

					}else{
						let loc_available = JSON.parse(prd.quant_text);
						prd['bi_available'] = 0;
						let total = 0;
						let out = 0;
						let inc = 0;
						for (let k in loc_available) {
							total += loc_available[k][3];
							if (loc_available[k][1]) {
								out += loc_available[k][1];
							}
							if (loc_available[k][2]) {
								inc += loc_available[k][2];
							}
							let final_data = (total + inc);

							bi_available = final_data;
							const remove_product = order.get_display_product_qty(prd);
							bi_available -= remove_product;

							prd['bi_available'] = bi_available;
							prd['virtual_available'] = final_data;
						}
					}
				});

			}
		}
		
		return prods;
}
});
