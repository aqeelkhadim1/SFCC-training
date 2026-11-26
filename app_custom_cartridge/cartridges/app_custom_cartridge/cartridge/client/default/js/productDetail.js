'use strict';

require('base/productDetail');
var processInclude = require('base/util');

$(document).ready(function () {
    processInclude(require('wishlist/product/wishlist'));
});
