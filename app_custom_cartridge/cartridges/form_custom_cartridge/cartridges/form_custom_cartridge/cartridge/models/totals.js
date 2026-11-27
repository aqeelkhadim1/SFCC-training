/* eslint-disable */
// @ts-nocheck
'use strict';

var Money = require('dw/value/Money');
var formatMoney = require('dw/util/StringUtils').formatMoney;
var renderTemplateHelper = require('*/cartridge/scripts/renderTemplateHelper');
var baseTotals = module.superModule;
var giftWrappingHelper = require('*/cartridge/scripts/helpers/giftWrappingHelper');

/**
 * Extends TotalsModel to keep order-level gift wrapping PriceAdjustment separate from order
 * discounts and expose orderGiftWrappingTotal, isOrderGiftWrapped, and orderGiftWrappingConfig.
 * @param {dw.order.LineItemCtnr} lineItemContainer - Current basket or order
 */
function totals(lineItemContainer) {
    baseTotals.call(this, lineItemContainer);

    var giftWrapPa = giftWrappingHelper.getGiftWrapPriceAdjustment(lineItemContainer);
    var giftWrapMoney = giftWrappingHelper.getGiftWrapChargeMoney(lineItemContainer);
    this.orderGiftWrappingConfig = giftWrappingHelper.getConfig(lineItemContainer);
    this.isOrderGiftWrapped = Boolean(giftWrapMoney && giftWrapMoney.available);

    if (this.isOrderGiftWrapped) {
        if (this.orderLevelDiscountTotal && typeof this.orderLevelDiscountTotal.value === 'number') {
            var adjustedDiscount = this.orderLevelDiscountTotal.value + giftWrapMoney.value;
            this.orderLevelDiscountTotal = {
                value: adjustedDiscount,
                formatted: formatMoney(new Money(adjustedDiscount, lineItemContainer.currencyCode))
            };
        }
        if (giftWrapPa && Array.isArray(this.discounts)) {
            this.discounts = this.discounts.filter(function (item) {
                return item.UUID !== giftWrapPa.UUID;
            });
            this.discountsHtml = renderTemplateHelper.getRenderedHtml(
                { totals: { discounts: this.discounts } },
                'cart/cartCouponDisplay'
            );
        }
        this.orderGiftWrappingTotal = {
            value: giftWrapMoney.value,
            formatted: formatMoney(giftWrapMoney)
        };
    } else {
        this.orderGiftWrappingTotal = {
            value: 0,
            formatted: '-'
        };
    }
}

module.exports = totals;
