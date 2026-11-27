/* eslint-disable */
// @ts-nocheck
'use strict';

var server = require('server');
server.extend(module.superModule);

var csrfProtection = require('*/cartridge/scripts/middleware/csrf');

/**
 * Cart-ToggleGiftWrapping : Toggles order-level gift wrapping on the current basket via AJAX.
 */
server.post(
    'ToggleGiftWrapping',
    server.middleware.https,
    csrfProtection.validateAjaxRequest,
    csrfProtection.generateToken,
    function (req, res, next) {
        var BasketMgr = require('dw/order/BasketMgr');
        var URLUtils = require('dw/web/URLUtils');
        var CartModel = require('*/cartridge/models/cart');
        var giftWrappingHelper = require('*/cartridge/scripts/helpers/giftWrappingHelper');

        var currentBasket = BasketMgr.getCurrentBasket();
        if (!currentBasket) {
            res.setStatusCode(500);
            res.json({
                error: true,
                redirectUrl: URLUtils.url('Cart-Show').toString()
            });
            return next();
        }

        var enabled = req.form.enabled === 'true' || req.form.enabled === true;
        var result = giftWrappingHelper.setOrderGiftWrapping(currentBasket, enabled);
        var basketModel = new CartModel(currentBasket);

        if (result.error) {
            res.setStatusCode(400);
            res.json({
                error: true,
                errorMessage: result.message,
                basket: basketModel
            });
            return next();
        }

        res.json({
            error: false,
            basket: basketModel
        });
        return next();
    }
);

module.exports = server.exports();
