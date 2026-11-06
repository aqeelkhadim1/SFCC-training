'use strict';

var PagingModel = require('dw/web/PagingModel');
var URLUtils = require('dw/web/URLUtils');

var DEFAULT_PAGE_SIZE = 10;

/**
 * Creates and wraps dw.web.PagingModel for paginating array/collection records.
 * @param {dw.util.Collection|Array} allRecords - Records collection
 * @param {number} page - Current page number (1-based)
 * @param {number} pageSize - Number of records per page
 * @param {string} endpoint - Target controller endpoint for pagination links
 * @returns {Object} Paging model result containing records and pagination metadata
 */
function createPagingModel(allRecords, page, pageSize, endpoint) {
    var size = pageSize || DEFAULT_PAGE_SIZE;
    var currentPage = page || 1;
    var targetEndpoint = endpoint || 'ExternalApi-Show';

    // Create PagingModel
    var paging = new PagingModel(allRecords.iterator(), allRecords.size());

    paging.setPageSize(size);
    paging.setStart((currentPage - 1) * size);

    // Get current page records
    var iterator = paging.pageElements;
    var pageRecords = [];

    while (iterator.hasNext()) {
        pageRecords.push(iterator.next());
    }

    // Check previous and next pages
    var hasPrevious = paging.currentPage > 0;
    var hasNext = paging.currentPage < paging.maxPage;

    // Base URL
    var baseUrl = URLUtils.url(targetEndpoint);

    // Generate Next URL
    var nextUrl = null;

    if (hasNext) {
        try {
            paging.setStart(currentPage * size);
            nextUrl = paging.appendPaging(baseUrl).toString();
        } catch (e) {
            nextUrl = URLUtils.url(targetEndpoint, 'page', currentPage + 1, 'pageSize', size).toString();
        }
    }

    // Generate Previous URL
    var previousUrl = null;

    if (hasPrevious) {
        try {
            paging.setStart((currentPage - 2) * size);
            previousUrl = paging.appendPaging(baseUrl).toString();
        } catch (e) {
            previousUrl = URLUtils.url(targetEndpoint, 'page', currentPage - 1, 'pageSize', size).toString();
        }
    }

    // Reset start offset to current page
    paging.setStart((currentPage - 1) * size);

    return {
        records: pageRecords,
        pagination: {
            page: currentPage,
            currentPage: currentPage,
            totalPages: paging.pageCount,
            pageCount: paging.pageCount,
            totalRecords: paging.count,
            totalCount: paging.count,
            pageSize: paging.pageSize,
            hasPrevious: hasPrevious,
            hasNext: hasNext,
            previousUrl: previousUrl,
            nextUrl: nextUrl
        }
    };
}

module.exports = {
    createPagingModel: createPagingModel
};
