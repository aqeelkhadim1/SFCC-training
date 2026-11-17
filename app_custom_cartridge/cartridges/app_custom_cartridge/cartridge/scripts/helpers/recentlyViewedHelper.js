'use strict';

/* global request, response, Set */

var Cookie = require('dw/web/Cookie');
var Site = require('dw/system/Site');
var ProductMgr = require('dw/catalog/ProductMgr');
var Transaction = require('dw/system/Transaction');
var Logger = require('dw/system/Logger');

var LIMIT = 10;
var MAX_COOKIE_LENGTH = 1800;
var PROFILE_ATTRIBUTE = 'recentlyViewedProducts';

/**
 * Remove duplicate IDs while preserving order and keeping at most ten.
 * @param {Array} ids - Product IDs
 * @returns {Array} Unique product IDs
 */
function normalize(ids) {
    if (!Array.isArray(ids)) return [];

    return Array.from(new Set(ids)).slice(0, LIMIT);
}

/**
 * Safely parse stored JSON history.
 * @param {string} value - Stored JSON
 * @returns {Array} Valid IDs, or an empty list for invalid data
 */
function parse(value) {
    if (typeof value !== 'string' || value.length > 12000) return [];

    try {
        return normalize(JSON.parse(value));
    } catch (error) {
        return [];
    }
}

/**
 * Resolve the cookie name using the current site's context.
 * @returns {string} Site-specific cookie name
 */
function cookieName() {
    return 'recentlyViewed_' + encodeURIComponent(Site.getCurrent().getID());
}

/**
 * Read and validate the incoming guest cookie.
 * @returns {Array} Guest product IDs
 */
function readGuestHistory() {
    var cookie = request.httpCookies[cookieName()];

    if (!cookie || !cookie.value || cookie.value.length > MAX_COOKIE_LENGTH) {
        return [];
    }

    try {
        return parse(decodeURIComponent(cookie.value));
    } catch (error) {
        return [];
    }
}

/**
 * Write a size-limited guest cookie, or delete it for empty history.
 * @param {Array} ids - Product IDs to store
 */
function saveGuestHistory(ids) {
    var history = normalize(ids);
    var value = encodeURIComponent(JSON.stringify(history));
    while (value.length > MAX_COOKIE_LENGTH && history.length) {
        history.pop();
        value = encodeURIComponent(JSON.stringify(history));
    }
    var cookie = new Cookie(cookieName(), value);

    cookie.setPath('/');
    cookie.setSecure(true);
    cookie.setHttpOnly(true);
    cookie.setMaxAge(history.length ? 30 * 24 * 60 * 60 : 0);

    response.addHttpCookie(cookie);
}

/**
 * Restrict profile access to authenticated registered customers.
 * @param {dw.customer.Customer} customer - Current customer
 * @returns {dw.customer.Profile|null} Customer profile when authenticated
 */
function getProfile(customer) {
    return customer && customer.authenticated && customer.registered
        ? customer.profile : null;
}

/**
 * Read saved profile history without interrupting the storefront on failure.
 * @param {dw.customer.Customer} customer - Current customer
 * @returns {Array} Saved product IDs
 */
function readCustomer(customer) {
    var profile = getProfile(customer);
    if (!profile) return [];

    try {
        return parse(profile.custom[PROFILE_ATTRIBUTE]);
    } catch (error) {
        Logger.warn('Recently viewed profile read failed: {0}', error.message);
        return [];
    }
}

/**
 * Persist normalized history transactionally, skipping unchanged values.
 * @param {dw.customer.Customer} customer - Current customer
 * @param {Array} ids - Product IDs to store
 * @returns {boolean} Whether persistence succeeded
 */
function saveCustomer(customer, ids) {
    var profile = getProfile(customer);
    if (!profile) return false;

    try {
        var value = JSON.stringify(normalize(ids));

        if (profile.custom[PROFILE_ATTRIBUTE] !== value) {
            Transaction.wrap(function () {
                profile.custom[PROFILE_ATTRIBUTE] = value;
            });
        }

        return true;
    } catch (error) {
        Logger.error('Recently viewed profile save failed: {0}', error.message);
        return false;
    }
}

/**
 * Move a viewed catalog product to the front of the appropriate history.
 * @param {string} productId - Viewed product ID
 * @param {dw.customer.Customer} customer - Current customer
 */
function track(productId, customer) {
    if (!normalize([productId]).length) return;

    var product = ProductMgr.getProduct(productId);

    if (!product || !product.online || !product.assignedToSiteCatalog) {
        return;
    }

    var guest = readGuestHistory();

    if (getProfile(customer)) {
        var ids = [productId].concat(guest, readCustomer(customer));

        if (saveCustomer(customer, ids) && guest.length) {
            saveGuestHistory([]);
        }
    } else {
        saveGuestHistory([productId].concat(guest));
    }
}

/**
 * Merge guest-first history and clear its cookie after successful persistence.
 * @param {dw.customer.Customer} customer - Authenticated customer
 */
function mergeOnLogin(customer) {
    if (!getProfile(customer)) return;

    var guest = readGuestHistory();
    if (!guest.length) return;

    var ids = guest.concat(readCustomer(customer));

    if (saveCustomer(customer, ids)) {
        saveGuestHistory([]);
    }
}

/**
 * Build existing SFRA tiles for valid, orderable history products.
 * @param {dw.customer.Customer} customer - Current customer
 * @returns {Array} Product tile contexts and PDP URLs
 */
function getProducts(customer) {
    var ids = readGuestHistory();

    if (getProfile(customer)) {
        ids = normalize(ids.concat(readCustomer(customer)));
    }

    if (!ids.length) return [];

    var productTile = require('*/cartridge/models/product/productTile');
    var productHelpers = require('*/cartridge/scripts/helpers/productHelpers');
    var URLUtils = require('dw/web/URLUtils');
    var products = [];

    ids.forEach(function (id) {
        var product = ProductMgr.getProduct(id);

        if (!product || !product.online || !product.assignedToSiteCatalog
            || !product.availabilityModel.orderable) {
            return;
        }

        try {
            products.push({
                product: productTile({}, product, productHelpers.getProductType(product)),
                urls: {
                    product: URLUtils.url('Product-Show', 'pid', id).toString()
                }
            });
        } catch (error) {
            Logger.warn('Recently viewed product tile failed: {0}', error.message);
        }
    });

    return products;
}

module.exports = {
    track: track,
    mergeOnLogin: mergeOnLogin,
    getProducts: getProducts
};
