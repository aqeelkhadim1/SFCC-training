'use strict';

var server = require('server');
var base = module.superModule;
var cache = require('*/cartridge/scripts/middleware/cache');
var consentTracking = require('*/cartridge/scripts/middleware/consentTracking');
var pageMetaData = require('*/cartridge/scripts/middleware/pageMetaData');
var recentlyViewed = require('*/cartridge/scripts/helpers/recentlyViewed');

server.extend(base);

server.replace('Show', consentTracking.consent, cache.applyDefaultCache, function renderCodedHomePage(req, res, next) {
    var Site = require('dw/system/Site');
    var pageMetaHelper = require('*/cartridge/scripts/helpers/pageMetaHelper');
    var ids = recentlyViewed.getIds(req);
    var products = recentlyViewed.getProducts(ids);

    pageMetaHelper.setPageMetaTags(req.pageMetaData, Site.current);
    // The homepage contains visitor-specific history, so do not cache it for other shoppers.
    res.personalized = true;
    res.cachePeriod = 0;
    res.cachePeriodUnit = 'minutes';
    res.render('home/homePage', {
        recentlyViewedProducts: products,
        display: { swatches: false, ratings: false, showQuickView: false }
    });
    return next();
}, pageMetaData.computedPageMetaData);

module.exports = server.exports();
