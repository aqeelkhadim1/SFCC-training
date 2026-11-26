'use strict';

var server = require('server');
server.extend(module.superModule);
var productListHelper = require('*/cartridge/scripts/productList/productListHelpers');
var ProductList = require('dw/customer/ProductList');
var ProductListMgr = require('dw/customer/ProductListMgr');
var URLUtils = require('dw/web/URLUtils');
var csrfProtection = require('*/cartridge/scripts/middleware/csrf');

// The inherited page templates expect a list even for a first-time visitor.
server.prepend('Show', server.middleware.https, function (req, res, next) {
    productListHelper.getCurrentOrNewList(req.currentCustomer.raw, { type: ProductList.TYPE_WISH_LIST });
    return next();
});

server.replace('RemoveList', server.middleware.post, server.middleware.https, csrfProtection.validateRequest,
    function (req, res, next) {
        var customer = req.currentCustomer.raw;
        var list = productListHelper.getList(customer, { type: ProductList.TYPE_WISH_LIST });
        if (list && list.UUID === req.form.listID) {
            productListHelper.removeList(customer, list, {});
            req.session.privacyCache.set('wishlist', '');
        }
        res.redirect(URLUtils.https('Wishlist-Show'));
        return next();
    });

server.prepend('MoreList', function (req, res, next) {
    var publicView = req.querystring.publicView === 'true';
    if (publicView) {
        var listID = req.querystring.id;
        var list = listID ? ProductListMgr.getProductList(listID) : null;
        if (!list || !list.public || list.type !== ProductList.TYPE_WISH_LIST) {
            res.redirect(URLUtils.url('Wishlist-Show'));
            return next();
        }
    } else {
        productListHelper.getCurrentOrNewList(req.currentCustomer.raw, { type: ProductList.TYPE_WISH_LIST });
    }

    res.setViewData({
        wishlistFragment: true,
        socialLinks: publicView || !!req.currentCustomer.profile
    });
    return next();
});

module.exports = server.exports();
