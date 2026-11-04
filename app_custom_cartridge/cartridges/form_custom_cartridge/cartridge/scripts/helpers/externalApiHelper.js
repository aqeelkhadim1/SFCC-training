'use strict';

/**
 * externalApiHelper.js
 * External REST API ke liye backend validation, sanitization aur server-side pagination helper.
 */

/**
 * Post ke form payload ko sanitize aur validate karta hai (POST aur PUT requests ke liye).
 * @param {Object} payload - { userId, title, body }
 * @returns {Object} { isValid, errors, data }
 */
function validatePostPayload(payload) {
    var p = payload || {};
    var userId = parseInt(p.userId || p.userid, 10);
    var title = p.title ? String(p.title).trim() : '';
    var body = (p.body || p.description) ? String(p.body || p.description).trim() : '';
    var errors = {};

    // User ID validation: Positive integer hona zaroori hai
    if (!userId || userId <= 0) {
        errors.userId = 'Valid positive User ID zaroori hai (e.g. 1, 2, 3).';
    }

    // Title validation: Khali na ho aur 200 characters ki limit check
    if (!title) {
        errors.title = 'Post Title zaroori hai.';
    } else if (title.length > 200) {
        errors.title = 'Title 200 characters se zyada nahi ho sakta.';
    }

    // Description/Body validation: Khali na ho
    if (!body) {
        errors.body = 'Post Description zaroori hai.';
    }

    var isValid = Object.keys(errors).length === 0;
    return {
        isValid: isValid,
        errors: errors,
        data: isValid ? { userId: userId, title: title, body: body } : null
    };
}

/**
 * Post ID ko validate karta hai API calls se pehle (GET, PUT, DELETE).
 * @param {string|number} postId - URL parameter se aane wali ID
 * @returns {Object} { isValid, id, error }
 */
function validatePostId(postId) {
    var id = parseInt(postId, 10);
    var isValid = Boolean(id && id > 0);
    return {
        isValid: isValid,
        id: isValid ? id : null,
        error: isValid ? null : 'Invalid Post ID. Sirf positive numbers allow hain.'
    };
}

/**
 * Server-side pagination state aur boundary controls calculate karta hai.
 * @param {number|string} page - Current requested page
 * @param {number|string} limit - Per page records
 * @param {number|string} totalRecords - Total API records count
 * @returns {Object} Pagination metadata
 */
function calculatePagination(page, limit, totalRecords) {
    var pageSize = parseInt(limit, 10) || 10;
    var total = parseInt(totalRecords, 10) || 100;
    var totalPages = Math.max(1, Math.ceil(total / pageSize));
    var currentPage = Math.min(Math.max(1, parseInt(page, 10) || 1), totalPages);

    return {
        page: currentPage,
        pageSize: pageSize,
        totalRecords: total,
        totalPages: totalPages,
        hasPrev: currentPage > 1,
        hasNext: currentPage < totalPages,
        prevPage: currentPage - 1,
        nextPage: currentPage + 1
    };
}

module.exports = {
    validatePostPayload: validatePostPayload,
    validatePostId: validatePostId,
    calculatePagination: calculatePagination
};
