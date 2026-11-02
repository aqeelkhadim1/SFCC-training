'use strict';

/**
 * @namespace Account
 */

var server = require('server');
// @ts-ignore
server.extend(module.superModule);

// @ts-ignore
var csrfProtection = require('*/cartridge/scripts/middleware/csrf');

/**
 * Account-SubmitRegistration : Prepend middleware to enforce server-side validation
 * for Date of Birth (DD-MM-YYYY, calendar-valid) and Phone Number ((999) 999-9999).
 * If invalid, marks the form invalid and attaches field-level error messages.
 * @name Base/Account-SubmitRegistration
 * @function
 * @memberof Account
 * @param {Object} req - Request object
 * @param {Object} res - Response object
 * @param {Function} next - Next function
 * @returns {void}
 */
server.prepend(
    'SubmitRegistration',
    server.middleware.https,
    csrfProtection.validateAjaxRequest,
    function (req, res, next) {
        var Resource = require('dw/web/Resource');
        // @ts-ignore
        var registrationValidationHelper = require('../scripts/helpers/registrationValidationHelper');
        // eslint-disable-next-line dot-notation
        var registrationForm = server.forms['getForm']('profile');

        var dob = registrationForm.customer.dateofbirth.value;
        var phone = registrationForm.customer.phone.value;

        // Date of Birth validation
        if (!dob || dob.trim() === '') {
            registrationForm.customer.dateofbirth.valid = false;
            registrationForm.customer.dateofbirth.error = Resource.msg('error.message.required.dob', 'forms', null);
            registrationForm.valid = false;
            if (registrationForm.base && registrationForm.base.customer && registrationForm.base.customer.dateofbirth) {
                registrationForm.base.customer.dateofbirth.invalidateFormElement();
            }
        } else if (!registrationValidationHelper.isValidDob(dob.trim())) {
            registrationForm.customer.dateofbirth.valid = false;
            registrationForm.customer.dateofbirth.error = Resource.msg('error.message.invalid.dob', 'forms', null);
            registrationForm.valid = false;
            if (registrationForm.base && registrationForm.base.customer && registrationForm.base.customer.dateofbirth) {
                registrationForm.base.customer.dateofbirth.invalidateFormElement();
            }
        }

        // Phone Number validation
        if (!phone || phone.trim() === '') {
            registrationForm.customer.phone.valid = false;
            registrationForm.customer.phone.error = Resource.msg('error.message.required.phone', 'forms', null);
            registrationForm.valid = false;
            if (registrationForm.base && registrationForm.base.customer && registrationForm.base.customer.phone) {
                registrationForm.base.customer.phone.invalidateFormElement();
            }
        } else if (!registrationValidationHelper.isValidPhone(phone.trim())) {
            registrationForm.customer.phone.valid = false;
            registrationForm.customer.phone.error = Resource.msg('error.message.invalid.phone', 'forms', null);
            registrationForm.valid = false;
            if (registrationForm.base && registrationForm.base.customer && registrationForm.base.customer.phone) {
                registrationForm.base.customer.phone.invalidateFormElement();
            }
        }

        // Store validated custom attributes in viewData for BeforeComplete hook
        res.setViewData({
            customDob: dob ? dob.trim() : '',
            customPhone: phone ? phone.trim() : ''
        });

        return next();
    }
);

/**
 * Account-SubmitRegistration : Append middleware to persist custom Date of Birth
 * (as a Date object) and Phone Number (as a String) to the newly created customer profile.
 * @name Base/Account-SubmitRegistration
 * @function
 * @memberof Account
 * @param {Object} req - Request object
 * @param {Object} res - Response object
 * @param {Function} next - Next function
 * @returns {void}
 */
server.append('SubmitRegistration', function (req, res, next) {
    this.on('route:BeforeComplete', function (innerReq, innerRes) { // eslint-disable-line no-shadow
        var Transaction = require('dw/system/Transaction');
        // @ts-ignore
        var registrationValidationHelper = require('../scripts/helpers/registrationValidationHelper');
        var viewData = innerRes.getViewData();

        if (viewData && viewData.authenticatedCustomer) {
            var dobValue = viewData.customDob;
            var phoneValue = viewData.customPhone;

            if (dobValue && phoneValue && registrationValidationHelper.isValidDob(dobValue) && registrationValidationHelper.isValidPhone(phoneValue)) {
                var profile = viewData.authenticatedCustomer.getProfile();
                var dobDate = registrationValidationHelper.parseDobToDate(dobValue);

                Transaction.wrap(function () {
                    // Save Date of Birth as Date-type custom attribute
                    if (dobDate) {
                        profile.custom.dateOfBirth = dobDate;
                    }
                    // Save Phone Number as String-type custom attribute
                    profile.custom.phoneNumber = phoneValue;
                    // Also populate standard profile phoneHome
                    profile.phoneHome = phoneValue;
                });
            }
        }
    });

    return next();
});

module.exports = server.exports();
