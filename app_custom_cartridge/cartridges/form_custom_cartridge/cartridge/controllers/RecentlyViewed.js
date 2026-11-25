/* eslint-disable */
// @ts-nocheck
'use strict';

/**
 * @namespace RecentlyViewed
 * RecentlyViewed.js
 * Uncached endpoints for rendering the Homepage Recently Viewed slider, Nav list page, and AJAX PDP tracking.
 */

var server = require('server');
var renderTemplateHelper = require('*/cartridge/scripts/renderTemplateHelper');
var recentlyViewedHelper = require('*/cartridge/scripts/helpers/recentlyViewedHelper');

var ITEMS_PER_SLIDE = 4;

/**
 * Loads valid items, renders SFRA product tiles, and chunks into Bootstrap carousel slides.
 * @param {Object} req
 * @returns {Object}
 */
function getRecentlyViewedViewData(req) {
    var items = recentlyViewedHelper.getRecentlyViewedProducts(req).map(function (item) {
        return {
            id: item.product.id,
            tileHtml: renderTemplateHelper.getRenderedHtml({
                product: item.product,
                urls: item.urls,
                display: item.display
            }, 'product/gridTile'),
            availability: item.availability
        };
    });

    var slides = [];
    for (var i = 0; i < items.length; i += ITEMS_PER_SLIDE) {
        slides.push(items.slice(i, i + ITEMS_PER_SLIDE));
    }

    return {
        products: items,
        slides: slides
    };
}

server.get('Show', function (req, res, next) {
    res.cachePeriod = 0; // eslint-disable-line no-param-reassign
    res.personalized = true; // eslint-disable-line no-param-reassign
    res.render('recentlyViewed/recentlyViewedSection', getRecentlyViewedViewData(req));
    return next();
});

server.get('List', function (req, res, next) {
    res.cachePeriod = 0; // eslint-disable-line no-param-reassign
    res.personalized = true; // eslint-disable-line no-param-reassign
    res.render('recentlyViewed/recentlyViewedPage', getRecentlyViewedViewData(req));
    return next();
});

server.post('Track', function (req, res, next) {
    res.cachePeriod = 0; // eslint-disable-line no-param-reassign
    var pid = req.form.pid || req.querystring.pid;
    var result = recentlyViewedHelper.trackProductView(req, res, pid);

    res.json({
        success: true,
        tracked: result.tracked,
        count: result.ids ? result.ids.length : 0
    });
    return next();
});

module.exports = server.exports();
