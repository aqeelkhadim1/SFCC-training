'use strict';

/* global request */

var COOKIE_NAME = 'recentlyViewedProducts';
var PROFILE_ATTRIBUTE = 'recentlyViewedProductss';
var MAX_PRODUCTS = 10;
var ProductMgr = require('dw/catalog/ProductMgr');

/** Parse and sanitize a stored JSON history. */
function parseIds(value) {
    var ids;
    var decodedValue;
    var result = [];
    var seen = {};
    var i;
    var id;

    try {
        ids = typeof value === 'string' ? JSON.parse(value) : value;
    } catch (e) {
        try {
            decodedValue = decodeURIComponent(value);
            ids = JSON.parse(decodedValue);
        } catch (decodeError) {
            return result;
        }
    }
    if (!(ids instanceof Array)) {
        return result;
    }
    for (i = 0; i < ids.length && result.length < MAX_PRODUCTS; i++) {
        id = typeof ids[i] === 'string' ? ids[i] : '';
        if (/^[A-Za-z0-9._-]{1,100}$/.test(id) && !seen[id]) {
            seen[id] = true;
            result.push(id);
        }
    }
    return result;
}

/** Merge lists in priority order while preserving order and removing duplicates. */
function mergeIds(primary, secondary) {
    var result = [];
    var seen = new Set();
    var ids = (primary || []).concat(secondary || []);
    var i;

    for (i = 0; i < ids.length && result.length < MAX_PRODUCTS; i++) {
        if (ids[i] && !seen.has(ids[i])) {
            seen.add(ids[i]);
            result.push(ids[i]);
        }
    }

    return result;
}

function getRequestCookie(name) {
    var cookies = typeof request !== 'undefined' && request.getHttpCookies
        ? request.getHttpCookies()
        : null;

    if (!cookies) {
        return null;
    }
    return cookies[name] || (typeof cookies.get === 'function' ? cookies.get(name) : null);
}

function getGuestIds() {
    var cookie = getRequestCookie(COOKIE_NAME);
    return cookie ? parseIds(cookie.value) : [];
}

function getProfileIds(profile) {
    return profile && profile.custom ? parseIds(profile.custom[PROFILE_ATTRIBUTE]) : [];
}

function writeGuestIds(req, res, ids) {
    var Cookie = require('dw/web/Cookie');
    var cookie = new Cookie(COOKIE_NAME, encodeURIComponent(JSON.stringify(ids)));
    cookie.setPath('/');
    cookie.setMaxAge(60 * 60 * 24 * 30);
    cookie.setHttpOnly(true);
    cookie.setSecure(req.https);
    // SFRA's response wrapper exposes the platform Response as `base`.
    res.base.addHttpCookie(cookie);
}

function saveProfileIds(profile, ids) {
    var Transaction = require('dw/system/Transaction');
    Transaction.wrap(function () {
        profile.custom[PROFILE_ATTRIBUTE] = JSON.stringify(ids);
    });
}

function track(req, res, productId) {
    var customer = req.currentCustomer.raw;
    var profile = customer && customer.authenticated ? customer.profile : null;
    var product = productId ? ProductMgr.getProduct(productId) : null;
    var ids;

    if (!product || !product.online) {
        return;
    }

    ids = profile ? getProfileIds(profile) : getGuestIds();
    ids = [String(product.ID)].concat(ids.filter(function (id) {
        return id !== String(product.ID);
    })).slice(0, MAX_PRODUCTS);

    if (profile) {
        saveProfileIds(profile, ids);
    } else {
        writeGuestIds(req, res, ids);
    }
}

function mergeGuestHistory(req, res, profile) {
    var ids = mergeIds(getGuestIds(), getProfileIds(profile));
    saveProfileIds(profile, ids);
    // A zero-age cookie removes the guest copy after it has been persisted.
    var Cookie = require('dw/web/Cookie');
    var cookie = new Cookie(COOKIE_NAME, '');
    cookie.setPath('/');
    cookie.setMaxAge(0);
    cookie.setHttpOnly(true);
    cookie.setSecure(req.https);
    // SFRA's response wrapper exposes the platform Response as `base`.
    res.base.addHttpCookie(cookie);
    return ids;
}

function getIds(req) {
    var customer = req.currentCustomer.raw;
    var profile = customer && customer.authenticated ? customer.profile : null;
    return profile ? getProfileIds(profile) : getGuestIds();
}

function getProducts(ids) {
    var productHelper = require('*/cartridge/scripts/helpers/productHelpers');
    var productTile = require('*/cartridge/models/product/productTile');
    var URLUtils = require('dw/web/URLUtils');
    var products = [];
    var i;
    var apiProduct;
    var tile;

    for (i = 0; i < ids.length && products.length < MAX_PRODUCTS; i++) {
        apiProduct = ProductMgr.getProduct(ids[i]);
        if (!apiProduct || !apiProduct.online || !apiProduct.availabilityModel.isOrderable(1)) {
            continue;
        }
        tile = productTile(Object.create(null), apiProduct, productHelper.getProductType(apiProduct));
        if (!tile || !tile.id) {
            continue;
        }
        tile.raw = apiProduct;
        tile.urls = {
            product: URLUtils.url('Product-Show', 'pid', tile.id).relative().toString(),
            quickView: URLUtils.url('Product-ShowQuickView', 'pid', tile.id).relative().toString()
        };
        tile.availabilityLabel = 'Available';
        products.push(tile);
    }
    return products;
}

module.exports = {
    getIds: getIds,
    getProducts: getProducts,
    track: track,
    mergeGuestHistory: mergeGuestHistory
};
