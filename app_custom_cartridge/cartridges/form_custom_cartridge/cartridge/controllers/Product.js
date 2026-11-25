/* eslint-disable */
// @ts-nocheck
'use strict';

/**
 * @namespace Product
 * Product.js
 * Extends base Product controller to track visited products (Show, ShowInCategory, Variation).
 */

var server = require('server');
server.extend(module.superModule);

var recentlyViewedHelper = require('*/cartridge/scripts/helpers/recentlyViewedHelper');

/**
 * Resolves visited product ID from viewData (or querystring fallback) and tracks it.
 * @param {Object} req
 * @param {Object} res
 * @param {boolean} allowQuerystringFallback
 */
function trackVisitedProduct(req, res, allowQuerystringFallback) {
    var viewData = res.getViewData();
    var pid = (viewData && viewData.product && viewData.product.id)
        ? viewData.product.id
        : (allowQuerystringFallback ? req.querystring.pid : null);

    if (pid) {
        recentlyViewedHelper.trackProductView(req, res, pid);
    }
}

['Show', 'ShowInCategory'].forEach(function (routeName) {
    server.append(routeName, function (req, res, next) {
        trackVisitedProduct(req, res, true);
        return next();
    });
});

server.append('Variation', function (req, res, next) {
    trackVisitedProduct(req, res, false);
    return next();
});

module.exports = server.exports();
