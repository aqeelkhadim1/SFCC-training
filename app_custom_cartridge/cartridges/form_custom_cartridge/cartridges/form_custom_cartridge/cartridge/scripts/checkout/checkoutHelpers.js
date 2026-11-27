/* eslint-disable */
// @ts-nocheck
'use strict';

var Transaction = require('dw/system/Transaction');
var baseHelpers = module.superModule;

var extended = {};
Object.keys(baseHelpers).forEach(function (key) {
    extended[key] = baseHelpers[key];
});

/**
 * Extends createOrder to guarantee order-level gift wrapping custom attributes
 * persist from Basket onto the created Order.
 * @param {dw.order.Basket} currentBasket - Current basket
 * @returns {dw.order.Order|null}
 */
extended.createOrder = function (currentBasket) {
    var order = baseHelpers.createOrder(currentBasket);
    if (order && currentBasket && currentBasket.custom) {
        Transaction.wrap(function () {
            order.custom.isOrderGiftWrapped = Boolean(currentBasket.custom.isOrderGiftWrapped);
            order.custom.orderGiftWrappingCharge = currentBasket.custom.orderGiftWrappingCharge || 0;
        });
    }
    return order;
};

module.exports = extended;
