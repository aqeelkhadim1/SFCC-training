/* eslint-disable */
// @ts-nocheck
'use strict';

/**
 * recentlyViewedHelper.js
 * Recently Viewed Products core logic: Guest cookie, Registered profile persistence,
 * Login merge, aur SFRA catalog tile + availability loading.
 */

var Cookie = require('dw/web/Cookie');
var ProductMgr = require('dw/catalog/ProductMgr');
var PromotionMgr = require('dw/campaign/PromotionMgr');
var Transaction = require('dw/system/Transaction');
var URLUtils = require('dw/web/URLUtils');
var Resource = require('dw/web/Resource');
var Logger = require('dw/system/Logger').getLogger('recentlyViewed', 'recentlyViewed');
var ProductFactory = require('*/cartridge/scripts/factories/product');
var productHelper = require('*/cartridge/scripts/helpers/productHelpers');
var decorators = require('*/cartridge/models/product/decorators/index');

var STORAGE_KEY = 'recentlyViewedProducts';
var MAX_ITEMS = 10;
var COOKIE_MAX_AGE = 30 * 24 * 60 * 60;
var MAX_COOKIE_LENGTH = 3800;

/** Deduplicates, sanitizes, and caps a list to MAX_ITEMS preserving order. */
function dedupeAndLimit(items) {
    if (!Array.isArray(items)) {
        return [];
    }
    var result = [];
    for (var i = 0; i < items.length && result.length < MAX_ITEMS; i++) {
        var val = items[i];
        if (typeof val === 'string' || typeof val === 'number') {
            var cleanId = String(val).trim();
            if (cleanId && cleanId.length <= 100 && result.indexOf(cleanId) === -1) {
                result.push(cleanId);
            }
        }
    }
    return result;
}

/** Safely parses JSON product ID array string without throwing on malformed values. */
function parseProductIds(rawValue) {
    if (!rawValue || typeof rawValue !== 'string') {
        return [];
    }
    try {
        return dedupeAndLimit(JSON.parse(rawValue));
    } catch (e) {
        return [];
    }
}

function getAuthenticatedCustomer(req) {
    return (req && req.currentCustomer && req.currentCustomer.raw
        && req.currentCustomer.raw.authenticated && req.currentCustomer.raw.profile)
        ? req.currentCustomer.raw
        : null;
}

/** Reads stored IDs from customer profile (if passed) or guest HTTP cookie. */
function readStoredIds(rawCustomer) {
    try {
        if (rawCustomer) {
            return parseProductIds(rawCustomer.profile.custom[STORAGE_KEY]);
        }
        var rvCookie = request && request.httpCookies && request.httpCookies[STORAGE_KEY];
        return (rvCookie && rvCookie.value) ? parseProductIds(decodeURIComponent(rvCookie.value)) : [];
    } catch (e) {
        Logger.warn('Failed to read recently viewed IDs: {0}', e.message);
        return [];
    }
}

/** Writes guest cookie (clears when ids is empty) with 4KB safety guard. */
function writeGuestCookie(req, res, ids) {
    try {
        var list = (ids || []).slice(0, MAX_ITEMS);
        var encoded = list.length ? encodeURIComponent(JSON.stringify(list)) : '';
        while (encoded.length > MAX_COOKIE_LENGTH && list.length > 0) {
            list.pop();
            encoded = encodeURIComponent(JSON.stringify(list));
        }

        var cookie = new Cookie(STORAGE_KEY, encoded);
        cookie.setMaxAge(list.length ? COOKIE_MAX_AGE : 0);
        cookie.setPath('/');
        cookie.setHttpOnly(true);
        cookie.setSecure(Boolean(req && req.https));

        var targetRes = (res && res.base) ? res.base : response;
        if (targetRes && typeof targetRes.addHttpCookie === 'function') {
            targetRes.addHttpCookie(cookie);
        }
    } catch (e) {
        Logger.error('Failed to write guest cookie: {0}', e.message);
    }
}

/** Persists IDs to registered customer profile custom attribute. */
function writeProfileIds(rawCustomer, ids) {
    try {
        var payload = JSON.stringify((ids || []).slice(0, MAX_ITEMS));
        Transaction.wrap(function () {
            rawCustomer.profile.custom[STORAGE_KEY] = payload;
        });
    } catch (e) {
        Logger.error('Failed to save profile recentlyViewedProducts: {0}', e.message);
    }
}

/** Tracks an online product/variant view for either authenticated user or guest. */
function trackProductView(req, res, pid) {
    var cleanId = pid ? String(pid).trim() : '';
    var apiProduct = cleanId ? ProductMgr.getProduct(cleanId) : null;
    if (!apiProduct || !apiProduct.online) {
        return { tracked: false, ids: [] };
    }

    var rawCustomer = getAuthenticatedCustomer(req);
    var currentIds = readStoredIds(rawCustomer);
    if (currentIds[0] === cleanId) {
        return { tracked: false, ids: currentIds };
    }

    var updatedIds = dedupeAndLimit([cleanId].concat(currentIds));
    if (rawCustomer) {
        writeProfileIds(rawCustomer, updatedIds);
    } else {
        writeGuestCookie(req, res, updatedIds);
    }
    return { tracked: true, ids: updatedIds };
}

/** Merges guest cookie IDs with customer profile IDs on login/registration and clears cookie. */
function mergeOnLogin(req, res, authenticatedCustomer) {
    var rawCustomer = authenticatedCustomer || getAuthenticatedCustomer(req);
    if (!rawCustomer || !rawCustomer.profile) {
        return { merged: false, ids: [] };
    }

    var guestIds = readStoredIds(null);
    var profileIds = readStoredIds(rawCustomer);
    if (!guestIds.length) {
        return { merged: false, ids: profileIds };
    }

    var mergedIds = dedupeAndLimit(guestIds.concat(profileIds));
    writeProfileIds(rawCustomer, mergedIds);
    writeGuestCookie(req, res, []);
    return { merged: true, ids: mergedIds };
}

function buildProductTile(pid, apiProduct) {
    var tile = null;
    try {
        tile = ProductFactory.get({ pid: pid, pview: 'tile' });
    } catch (e) {
        tile = null;
    }

    if (!tile || !tile.id || !tile.price || !tile.images || !tile.images.medium || !tile.images.medium.length) {
        try {
            tile = Object.create(null);
            decorators.base(tile, apiProduct, productHelper.getProductType(apiProduct));
            decorators.price(tile, apiProduct, PromotionMgr.activeCustomerPromotions.getProductPromotions(apiProduct), false, apiProduct.optionModel);
            decorators.images(tile, apiProduct, { types: ['medium'], quantity: 'single' });
            decorators.ratings(tile);
        } catch (err) {
            return null;
        }
    }

    return (tile && tile.id && tile.images && tile.images.medium && tile.images.medium.length) ? tile : null;
}

/** Loads valid online recently viewed product tiles and availability for storefront display. */
function getRecentlyViewedProducts(req) {
    var storedIds = readStoredIds(getAuthenticatedCustomer(req));
    var results = [];

    for (var i = 0; i < storedIds.length && results.length < MAX_ITEMS; i++) {
        var pid = storedIds[i];
        var apiProduct = ProductMgr.getProduct(pid);
        var tileProduct = (apiProduct && apiProduct.online) ? buildProductTile(pid, apiProduct) : null;

        if (tileProduct) {
            var avModel = apiProduct.getAvailabilityModel();
            var inStock = Boolean(avModel && avModel.inStock && avModel.isOrderable());

            results.push({
                product: tileProduct,
                urls: {
                    product: URLUtils.url('Product-Show', 'pid', tileProduct.id).relative().toString(),
                    quickView: URLUtils.url('Product-ShowQuickView', 'pid', tileProduct.id).relative().toString()
                },
                display: {
                    ratings: true,
                    swatches: Boolean(tileProduct.variationAttributes && tileProduct.variationAttributes.length)
                },
                availability: {
                    inStock: inStock,
                    label: Resource.msg(inStock ? 'label.availability.instock' : 'label.availability.outofstock', 'recentlyViewed', null)
                }
            });
        }
    }

    return results;
}

module.exports = {
    parseProductIds: parseProductIds,
    trackProductView: trackProductView,
    mergeOnLogin: mergeOnLogin,
    getRecentlyViewedProducts: getRecentlyViewedProducts
};
