'use strict';

/**
 * @namespace Account
 */

var server = require('server');
// SFCC resolves superModule dynamically; TypeScript cannot resolve its virtual module ID.
// @ts-ignore
server.extend(module.superModule);

/**
 * Validates custom registration fields before the base registration handler.
 */
server.prepend('SubmitRegistration', function (req, res, next) {
    // SFCC resolves the cartridge wildcard alias at runtime.
    // @ts-ignore
    var registrationHelper = require('*/cartridge/scripts/helpers/registrationHelper');
    // SFRA exposes getForm at runtime, but some editor typings omit it.
    var registrationForm = server.forms['getForm']('profile'); // eslint-disable-line dot-notation
    var customValues = registrationHelper.validateRegistrationForm(registrationForm);

    res.setViewData(customValues);
    return next();
});

/**
 * Persists custom attributes after the base handler creates the customer.
 */
server.append('SubmitRegistration', function (req, res, next) {
    // SFCC resolves the cartridge wildcard alias at runtime.
    // @ts-ignore
    var registrationHelper = require('*/cartridge/scripts/helpers/registrationHelper');

    this.on('route:BeforeComplete', function (innerReq, innerRes) {
        var viewData = innerRes.getViewData();

        if (viewData && viewData.authenticatedCustomer) {
            registrationHelper.saveProfileAttributes(
                viewData.authenticatedCustomer,
                viewData.customDob,
                viewData.customPhone
            );
        }
    });

    return next();
});

/**
 * Adds the formatted Date-type DOB to the account dashboard model.
 */
server.append('Show', function (req, res, next) {
    // SFCC resolves the cartridge wildcard alias at runtime.
    // @ts-ignore
    var registrationHelper = require('*/cartridge/scripts/helpers/registrationHelper');
    var viewData = res.getViewData();
    var profile = req.currentCustomer.raw && req.currentCustomer.raw.profile;

    if (profile && viewData && viewData.account && viewData.account.profile && profile.custom.dateOfBirth) {
        viewData.account.profile.dateOfBirth = registrationHelper.formatDate(profile.custom.dateOfBirth);
    }

    return next();
});

module.exports = server.exports();
