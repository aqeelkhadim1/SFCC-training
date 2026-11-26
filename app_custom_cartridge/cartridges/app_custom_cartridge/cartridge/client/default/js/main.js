'use strict';

require('base/main');
var processInclude = require('base/util');

$(document).ready(function () {
    processInclude(require('wishlist/product/wishlistHeart'));
    require('wishlist/components/miniCart').moveToWishlist();
});
