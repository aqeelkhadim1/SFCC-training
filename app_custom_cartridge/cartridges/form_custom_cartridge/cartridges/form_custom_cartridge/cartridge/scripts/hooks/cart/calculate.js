/* eslint-disable */
// @ts-nocheck
'use strict';

var baseCalculate = require('app_storefront_base/cartridge/scripts/hooks/cart/calculate');
var giftWrappingHelper = require('*/cartridge/scripts/helpers/giftWrappingHelper');

/**
 * Extends dw.order.calculateTax to sync the order-level gift wrapping PriceAdjustment
 * after discounts have been evaluated and update order-level adjustment taxes.
 * @param {dw.order.Basket} basket - The current basket
 * @returns {dw.system.Status}
 */
exports.calculateTax = function (basket) {
    var appliedCharge = giftWrappingHelper.syncGiftWrapPriceAdjustment(basket);
    var status = baseCalculate.calculateTax(basket);
    if (appliedCharge > 0 && basket && typeof basket.updateOrderLevelPriceAdjustmentTax === 'function') {
        basket.updateOrderLevelPriceAdjustmentTax();
    }
    return status;
};
