'use strict';

var server = require('server');
server.extend(module.superModule);

// A remote include isolates personalized history from cached homepage markup.
server.get('RecentlyViewed', function (req, res, next) {
    // SFCC resolves the cartridge wildcard alias at runtime.
    // @ts-ignore
    var recentlyViewedHelper = require('*/cartridge/scripts/helpers/recentlyViewedHelper');
    res.render('components/recentlyViewed', {
        recentlyViewedProducts: recentlyViewedHelper.getProducts(req.currentCustomer.raw)
    });
    return next();
});

module.exports = server.exports();
