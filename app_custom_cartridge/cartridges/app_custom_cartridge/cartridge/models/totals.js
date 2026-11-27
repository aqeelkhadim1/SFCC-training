'use strict';

var BaseTotals = module.superModule;
var formatMoney = require('dw/util/StringUtils').formatMoney;
var orderGiftWrapping = require('*/cartridge/scripts/helpers/orderGiftWrapping');
var renderTemplateHelper = require('*/cartridge/scripts/renderTemplateHelper');

/**
 * Extend SFRA totals with a dedicated order gift wrapping amount.
 * @param {dw.order.LineItemCtnr} lineItemContainer - basket or order being displayed
 */
function Totals(lineItemContainer) {
    BaseTotals.call(this, lineItemContainer);

    var fee = orderGiftWrapping.getAdjustment(lineItemContainer);
    this.orderGiftWrappingCharge = fee ? formatMoney(fee.price) : null;
    if (fee) {
        var beforeOrderAdjustments = lineItemContainer.getAdjustedMerchandizeTotalPrice(false);
        var afterOrderAdjustments = lineItemContainer.getAdjustedMerchandizeTotalPrice(true);
        var orderDiscount = beforeOrderAdjustments.subtract(afterOrderAdjustments).add(fee.price);

        this.orderLevelDiscountTotal = { value: orderDiscount.value, formatted: formatMoney(orderDiscount) };
        this.discounts = this.discounts.filter(function (discount) { return discount.UUID !== fee.UUID; });
        this.discountsHtml = renderTemplateHelper.getRenderedHtml({ totals: { discounts: this.discounts } }, 'cart/cartCouponDisplay');
    }
}

module.exports = Totals;
