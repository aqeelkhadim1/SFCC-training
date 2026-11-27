'use strict';

var base = module.superModule;
var orderGiftWrapping = require('*/cartridge/scripts/helpers/orderGiftWrapping');

/**
 * Calculate basket totals with the wrapping fee applied after promotions and base tax calculation.
 * @param {dw.order.Basket} basket - current basket
 */
function calculateTotals(basket) {
    orderGiftWrapping.prepareCalculation(basket);
    base.calculateTotals(basket);
    orderGiftWrapping.applyAdjustment(basket);
}

module.exports = {
    calculateTaxes: base.calculateTaxes,
    calculateTotals: calculateTotals
};
