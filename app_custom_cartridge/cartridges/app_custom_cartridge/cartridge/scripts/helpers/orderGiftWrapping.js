'use strict';

var Money = require('dw/value/Money');
var Resource = require('dw/web/Resource');
var Site = require('dw/system/Site');
var StringUtils = require('dw/util/StringUtils');
var TaxMgr = require('dw/order/TaxMgr');
var Transaction = require('dw/system/Transaction');
var TotalsModel = require('*/cartridge/models/totals');
var basketCalculationHelpers = require('*/cartridge/scripts/helpers/basketCalculationHelpers');
var collections = require('*/cartridge/scripts/util/collections');

var SHIPPING_LINE_ID = 'ORDER_GIFT_WRAP';

function hasSelectionAttribute(basket) {
    var definition = basket.describe();
    return definition && definition.getCustomAttributeDefinition('isOrderGiftWrapped');
}

function getConfiguredPrice() {
    var site = Site.getCurrent();
    if (site.getCustomPreferenceValue('enableOrderGiftWrapping') !== true) {
        return null;
    }

    var price = site.getCustomPreferenceValue('orderGiftWrappingPrice');
    return typeof price === 'number' && isFinite(price) && price >= 0 ? price : null;
}

function getBasketPrice(basket) {
    if (!basket || basket.productLineItems.empty) {
        return null;
    }

    var price = getConfiguredPrice();
    return price !== null && hasSelectionAttribute(basket) ? price : null;
}

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

function updateSelection(basket, selected) {
    return Transaction.wrap(function () {
        if (getBasketPrice(basket) === null) {
            return false;
        }

        basket.custom.isOrderGiftWrapped = selected;
        basketCalculationHelpers.calculateTotals(basket);
        return true;
    });
}

function update(basket, selected) {
    var statusCode;

    if (selected !== 'true' && selected !== 'false') {
        statusCode = 400;
    } else if (basket && updateSelection(basket, selected === 'true')) {
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

// Runs before base calculation so shipping promotions only see the shipping costs.
function calculate(basket) {
    collections.forEach(basket.shipments, function (shipment) {
        var fee = shipment.getShippingLineItem(SHIPPING_LINE_ID);
        if (fee) {
            shipment.removeShippingLineItem(fee);
        }
    });

    if (hasSelectionAttribute(basket) && basket.custom.isOrderGiftWrapped
        && (basket.productLineItems.empty || getConfiguredPrice() === null)) {
        basket.custom.isOrderGiftWrapped = false;
    }
}

// Runs after promotions, before base tax calculation and basket.updateTotals().
function calculateTax(basket) {
    var price = getBasketPrice(basket);
    if (price === null || !basket.custom.isOrderGiftWrapped) {
        return;
    }

    var shipment = basket.defaultShipment;
    var standardShipping = shipment.standardShippingLineItem;
    var fee = shipment.getShippingLineItem(SHIPPING_LINE_ID) || shipment.createShippingLineItem(SHIPPING_LINE_ID);

    fee.setLineItemText(Resource.msg('label.order.gift.wrapping.fee', 'orderGiftWrapping', null));
    fee.setPriceValue(price);
    if (standardShipping && standardShipping.taxClassID) {
        fee.setTaxClassID(standardShipping.taxClassID);
        if (standardShipping.taxClassID === TaxMgr.customRateTaxClassID) {
            fee.setTaxRate(standardShipping.taxRate);
        }
    }
}

module.exports = {
    calculate: calculate,
    calculateTax: calculateTax,
    getDisplayState: getDisplayState,
    update: update
};
