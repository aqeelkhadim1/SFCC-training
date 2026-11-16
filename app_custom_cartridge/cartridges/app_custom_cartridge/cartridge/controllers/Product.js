'use strict';

var server = require('server');
server.extend(module.superModule);

// SFCC resolves the cartridge wildcard alias at runtime.
// @ts-ignore
var csrfProtection = require('*/cartridge/scripts/middleware/csrf');

// PDP routes retain the base cache settings. Only this POST is uncached.
server.post('TrackRecentlyViewed', server.middleware.https, csrfProtection.validateAjaxRequest, function (req, res, next) {
    // SFCC resolves the cartridge wildcard alias at runtime.
    // @ts-ignore
    var recentlyViewedHelper = require('*/cartridge/scripts/helpers/recentlyViewedHelper');
    recentlyViewedHelper.track(req.form.pid, req.currentCustomer.raw);
    res.json({ success: true });
    return next();
});

module.exports = server.exports();
