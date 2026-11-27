/* eslint-disable */
// @ts-nocheck
'use strict';

var Site = require('dw/system/Site');
var Transaction = require('dw/system/Transaction');
var Resource = require('dw/web/Resource');
var Money = require('dw/value/Money');
var formatMoney = require('dw/util/StringUtils').formatMoney;
var basketCalculationHelpers = require('*/cartridge/scripts/helpers/basketCalculationHelpers');

var GIFT_WRAP_PROMO_ID = 'order-gift-wrapping';
var PREF_ENABLED = 'enableOrderGiftWrapping';
var PREF_PRICE = 'orderGiftWrappingPrice';

function getCurrencyCode(container) {
    return (container && container.currencyCode) || session.getCurrency().getCurrencyCode();
}

/**
 * Reads order-level gift wrapping Site Preferences safely.
 * @param {dw.order.LineItemCtnr} [container] - Optional basket/order for currency context
 * @returns {Object} { enabled, price, formattedPrice }
 */
function getConfig(container) {
    var currentSite = Site.getCurrent();
    var enabledFlag = Boolean(currentSite.getCustomPreferenceValue(PREF_ENABLED));
    var rawPrice = currentSite.getCustomPreferenceValue(PREF_PRICE);
    var parsedPrice = rawPrice !== null && rawPrice !== undefined ? Number(rawPrice) : NaN;
    var validPrice = isFinite(parsedPrice) && parsedPrice >= 0;
    var enabled = enabledFlag && validPrice;
    var price = enabled ? parsedPrice : 0;

    return {
        enabled: enabled,
        price: price,
        formattedPrice: formatMoney(new Money(price, getCurrencyCode(container)))
    };
}

/**
 * Finds the order-level gift wrapping PriceAdjustment on a Basket or Order.
 * @param {dw.order.LineItemCtnr} container - Basket or Order
 * @returns {dw.order.PriceAdjustment|null}
 */
function getGiftWrapPriceAdjustment(container) {
    if (!container || typeof container.getPriceAdjustmentByPromotionID !== 'function') {
        return null;
    }
    return container.getPriceAdjustmentByPromotionID(GIFT_WRAP_PROMO_ID);
}

/**
 * Removes the order-level gift wrapping PriceAdjustment and resets basket custom state.
 * @param {dw.order.Basket} basket - Current basket
 */
function clearGiftWrap(basket) {
    if (!basket) { return; }
    var existing = getGiftWrapPriceAdjustment(basket);
    if (existing) {
        basket.removePriceAdjustment(existing);
    }
    basket.custom.isOrderGiftWrapped = false;
    basket.custom.orderGiftWrappingCharge = 0;
}

/**
 * Idempotently syncs the single order-level gift wrapping PriceAdjustment during basket calculation.
 * @param {dw.order.Basket} basket - Current basket
 * @returns {number} Applied order gift wrapping charge
 */
function syncGiftWrapPriceAdjustment(basket) {
    if (!basket) { return 0; }
    var cfg = getConfig(basket);
    var hasProducts = basket.productLineItems && !basket.productLineItems.empty;
    var shouldApply = cfg.enabled && hasProducts && Boolean(basket.custom.isOrderGiftWrapped);

    if (!shouldApply) {
        clearGiftWrap(basket);
        return 0;
    }

    var pa = getGiftWrapPriceAdjustment(basket);
    if (!pa) {
        pa = basket.createPriceAdjustment(GIFT_WRAP_PROMO_ID);
    }

    pa.setManual(true);
    pa.setLineItemText(Resource.msg('label.order.gift.wrapping', 'giftWrapping', null));
    pa.setPriceValue(cfg.price);
    basket.custom.orderGiftWrappingCharge = cfg.price;
    return cfg.price;
}

/**
 * Updates order gift wrapping selection on the current basket and recalculates totals.
 * @param {dw.order.Basket} basket - Current basket
 * @param {boolean} enabled - Desired gift wrapping toggle state
 * @returns {Object} { error, message }
 */
function setOrderGiftWrapping(basket, enabled) {
    if (!basket || !basket.productLineItems || basket.productLineItems.empty) {
        return { error: true, message: Resource.msg('error.gift.wrapping.empty.cart', 'giftWrapping', null) };
    }
    var cfg = getConfig(basket);
    if (enabled && !cfg.enabled) {
        return { error: true, message: Resource.msg('error.gift.wrapping.unavailable', 'giftWrapping', null) };
    }

    Transaction.wrap(function () {
        basket.custom.isOrderGiftWrapped = Boolean(enabled);
        basketCalculationHelpers.calculateTotals(basket);
    });
    return { error: false };
}

/**
 * Returns applied order gift wrapping Money amount from a Basket or Order container.
 * @param {dw.order.LineItemCtnr} container - Basket or Order
 * @returns {dw.value.Money|null}
 */
function getGiftWrapChargeMoney(container) {
    var pa = getGiftWrapPriceAdjustment(container);
    if (!pa) { return null; }
    var money = pa.price && pa.price.available ? pa.price : pa.basePrice;
    return money && money.available ? money : null;
}

module.exports = {
    GIFT_WRAP_PROMO_ID: GIFT_WRAP_PROMO_ID,
    getConfig: getConfig,
    getGiftWrapPriceAdjustment: getGiftWrapPriceAdjustment,
    syncGiftWrapPriceAdjustment: syncGiftWrapPriceAdjustment,
    setOrderGiftWrapping: setOrderGiftWrapping,
    getGiftWrapChargeMoney: getGiftWrapChargeMoney
};
