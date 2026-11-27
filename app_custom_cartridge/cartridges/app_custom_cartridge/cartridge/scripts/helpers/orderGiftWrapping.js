'use strict';

var Money = require('dw/value/Money');
var Resource = require('dw/web/Resource');
var Site = require('dw/system/Site');
var StringUtils = require('dw/util/StringUtils');
var Transaction = require('dw/system/Transaction');
var collections = require('*/cartridge/scripts/util/collections');

var ADJUSTMENT_ID = 'ORDER_GIFT_WRAP';

/**
 * Find the wrapping adjustment on a basket or order.
 * @param {dw.order.LineItemCtnr} lineItemContainer - current basket or order
 * @returns {?dw.order.PriceAdjustment} adjustment for the wrapping fee
 */
function getAdjustment(lineItemContainer) {
    return lineItemContainer && lineItemContainer.getPriceAdjustmentByPromotionID(ADJUSTMENT_ID);
}

/**
 * Check whether a custom attribute is available on the basket.
 * @param {dw.order.Basket} basket - current basket
 * @param {string} attributeID - custom attribute ID
 * @returns {boolean} whether the attribute is defined
 */
function hasBasketAttribute(basket, attributeID) {
    var definition = basket.describe();
    return !!(definition && definition.getCustomAttributeDefinition(attributeID));
}

/**
 * Read the enabled site preference amount.
 * @returns {?number} positive wrapping fee
 */
function getConfiguredPrice() {
    var site = Site.getCurrent();
    if (site.getCustomPreferenceValue('enableOrderGiftWrapping') !== true) {
        return null;
    }

    var price = site.getCustomPreferenceValue('orderGiftWrappingPrice');
    return typeof price === 'number' && price > 0 && price < Infinity ? price : null;
}

/**
 * Read the wrapping price for an eligible basket.
 * @param {dw.order.Basket} basket - current basket
 * @returns {?number} configured fee for the eligible basket
 */
function getBasketPrice(basket) {
    if (!basket || basket.productLineItems.empty) {
        return null;
    }

    var price = getConfiguredPrice();
    return price !== null && hasBasketAttribute(basket, 'isOrderGiftWrapped') ? price : null;
}

/**
 * Build the Cart checkbox state from the current basket.
 * @param {dw.order.Basket} basket - current basket
 * @returns {?Object} selection state and formatted price
 */
function getDisplayState(basket) {
    var price = getBasketPrice(basket);
    if (price === null) {
        return null;
    }

    return {
        selected: basket.custom.isOrderGiftWrapped === true,
        price: StringUtils.formatMoney(new Money(price, basket.currencyCode))
    };
}

/**
 * Update the selection and recalculate the basket in one transaction.
 * @param {dw.order.Basket} basket - current basket
 * @param {boolean} selected - requested checkbox state
 * @returns {boolean} whether the update was applied
 */
function updateSelection(basket, selected) {
    var basketCalculationHelpers = require('*/cartridge/scripts/helpers/basketCalculationHelpers');

    return Transaction.wrap(function () {
        if (getBasketPrice(basket) === null) {
            return false;
        }

        var custom = basket.custom;
        custom.isOrderGiftWrapped = selected;
        basketCalculationHelpers.calculateTotals(basket);
        return true;
    });
}

/**
 * Process the Cart request and return its status and response body.
 * @param {dw.order.Basket} basket - current basket
 * @param {string} selected - raw checkbox state from the request
 * @returns {Object} HTTP status code and response body
 */
function update(basket, selected) {
    var statusCode;

    if (selected !== 'true' && selected !== 'false') {
        statusCode = 400;
    } else if (basket && updateSelection(basket, selected === 'true')) {
        var TotalsModel = require('*/cartridge/models/totals');
        return {
            statusCode: 200,
            body: {
                orderGiftWrapping: getDisplayState(basket),
                totals: new TotalsModel(basket)
            }
        };
    } else {
        statusCode = 409;
    }

    return {
        statusCode: statusCode,
        body: { errorMessage: Resource.msg('error.order.gift.wrapping.update', 'orderGiftWrapping', null) }
    };
}

/**
 * Exclude the fee from promotion eligibility and remove legacy shipping fees.
 * @param {dw.order.Basket} basket - current basket
 */
function prepareCalculation(basket) {
    var adjustment = getAdjustment(basket);
    if (adjustment) {
        basket.removePriceAdjustment(adjustment);
    }

    // Clean up existing baskets created before the switch to an order adjustment.
    collections.forEach(basket.shipments, function (shipment) {
        var fee = shipment.getShippingLineItem(ADJUSTMENT_ID);
        if (fee) {
            shipment.removeShippingLineItem(fee);
        }
    });

    var custom = basket.custom;
    if (hasBasketAttribute(basket, 'isOrderGiftWrapped') && custom.isOrderGiftWrapped
        && (basket.productLineItems.empty || getConfiguredPrice() === null)) {
        custom.isOrderGiftWrapped = false;
    }
}

/**
 * Record the actual fee for Order reporting.
 * @param {dw.order.Basket} basket - current basket
 * @param {number} charge - applied fee in the basket currency
 */
function saveBasketCharge(basket, charge) {
    var custom = basket.custom;
    if (hasBasketAttribute(basket, 'orderGiftWrappingCharge') && custom.orderGiftWrappingCharge !== charge) {
        custom.orderGiftWrappingCharge = charge;
    }
}

/**
 * Apply the fee after standard calculation and refresh adjustment tax and totals.
 * @param {dw.order.Basket} basket - current basket
 */
function applyAdjustment(basket) {
    var price = getBasketPrice(basket);
    if (price === null || !basket.custom.isOrderGiftWrapped) {
        saveBasketCharge(basket, 0);
        return;
    }

    var merchandiseBeforeFee = basket.getAdjustedMerchandizeTotalPrice(true);
    var fee = getAdjustment(basket) || basket.createPriceAdjustment(ADJUSTMENT_ID);
    fee.setLineItemText(Resource.msg('label.order.gift.wrapping.fee', 'orderGiftWrapping', null));
    fee.setPriceValue(price);
    basket.updateOrderLevelPriceAdjustmentTax();
    basket.updateTotals();

    var appliedFee = basket.getAdjustedMerchandizeTotalPrice(true).subtract(merchandiseBeforeFee);
    if (appliedFee.value <= 0 || appliedFee.value !== fee.basePrice.value) {
        throw new Error('The order gift wrapping adjustment did not increase the adjusted merchandise total by its fee.');
    }

    saveBasketCharge(basket, appliedFee.value);
}

module.exports = {
    prepareCalculation: prepareCalculation,
    applyAdjustment: applyAdjustment,
    getAdjustment: getAdjustment,
    getDisplayState: getDisplayState,
    update: update
};
