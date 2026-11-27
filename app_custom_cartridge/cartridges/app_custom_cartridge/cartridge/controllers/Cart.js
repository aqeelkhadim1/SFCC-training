'use strict';

var server = require('server');
var BasketMgr = require('dw/order/BasketMgr');
var csrfProtection = require('*/cartridge/scripts/middleware/csrf');
var orderGiftWrapping = require('*/cartridge/scripts/helpers/orderGiftWrapping');

server.extend(module.superModule);

server.append('Show', function (req, res, next) {
    res.setViewData({ orderGiftWrapping: orderGiftWrapping.getDisplayState(BasketMgr.getCurrentBasket()) });
    return next();
});

server.post('UpdateOrderGiftWrapping', server.middleware.https, csrfProtection.validateAjaxRequest, function (req, res, next) {
    var result = orderGiftWrapping.update(BasketMgr.getCurrentBasket(), req.form.selected);

    res.setStatusCode(result.statusCode);
    res.json(result.body);
    return next();
});

module.exports = server.exports();
