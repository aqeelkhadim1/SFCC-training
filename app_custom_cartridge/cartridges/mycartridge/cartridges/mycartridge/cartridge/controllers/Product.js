'use strict';

var server = require('server');
var base = module.superModule;
var recentlyViewed = require('*/cartridge/scripts/helpers/recentlyViewed');

server.extend(base);

server.prepend('Show', function trackRecentlyViewedProduct(req, res, next) {
    recentlyViewed.track(req, res, req.querystring.pid);
    return next();
});

server.prepend('ShowInCategory', function trackRecentlyViewedProductInCategory(req, res, next) {
    recentlyViewed.track(req, res, req.querystring.pid);
    return next();
});

module.exports = server.exports();
