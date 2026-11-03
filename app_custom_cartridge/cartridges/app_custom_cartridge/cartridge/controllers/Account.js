'use strict';

/**
 * @namespace Account
 */

var server = require('server');
// @ts-ignore
server.extend(module.superModule);

// @ts-ignore
var csrfProtection = require('*/cartridge/scripts/middleware/csrf');
var Resource = require('dw/web/Resource');
var Transaction = require('dw/system/Transaction');
// @ts-ignore
var registrationValidationHelper = require('../scripts/helpers/registrationValidationHelper');

/**
 * Invalidates a form field, sets its localized error message, and invalidates the base form element.
 *
 * @param {Object} form - The SFRA form object
 * @param {Object} field - The form field to invalidate
 * @param {string} resourceKey - The error resource bundle key
 * @param {Object} [fieldBase] - The underlying base form element (optional)
 */
function invalidateField(form, field, resourceKey, fieldBase) {
    field.valid = false;
    field.error = Resource.msg(resourceKey, 'forms', null);
    form.valid = false;
    if (fieldBase && typeof fieldBase.invalidateFormElement === 'function') {
        fieldBase.invalidateFormElement();
    }
}

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
        // eslint-disable-next-line dot-notation
        var registrationForm = server.forms['getForm']('profile');
        var customer = registrationForm.customer;
        var baseCustomer = registrationForm.base && registrationForm.base.customer;

        var dobField = customer.dateofbirth;
        var phoneField = customer.phone;
        var dob = dobField.value ? dobField.value.trim() : '';
        var phone = phoneField.value ? phoneField.value.trim() : '';

        // Date of Birth validation
        if (!dob) {
            invalidateField(registrationForm, dobField, 'error.message.required.dob', baseCustomer && baseCustomer.dateofbirth);
        } else if (!registrationValidationHelper.isValidDob(dob)) {
            invalidateField(registrationForm, dobField, 'error.message.invalid.dob', baseCustomer && baseCustomer.dateofbirth);
        }

        // Phone Number validation
        if (!phone) {
            invalidateField(registrationForm, phoneField, 'error.message.required.phone', baseCustomer && baseCustomer.phone);
        } else if (!registrationValidationHelper.isValidPhone(phone)) {
            invalidateField(registrationForm, phoneField, 'error.message.invalid.phone', baseCustomer && baseCustomer.phone);
        }

        // Store validated custom attributes in viewData for BeforeComplete hook
        res.setViewData({
            customDob: dob,
            customPhone: phone
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
        var viewData = innerRes.getViewData();

        if (viewData && viewData.authenticatedCustomer) {
            var dobDate = registrationValidationHelper.parseDobToDate(viewData.customDob);
            var phoneValue = viewData.customPhone;

            if (dobDate && phoneValue && registrationValidationHelper.isValidPhone(phoneValue)) {
                var profile = viewData.authenticatedCustomer.getProfile();

                Transaction.wrap(function () {
                    // Save Date of Birth as Date-type custom attribute
                    profile.custom.dateOfBirth = dobDate;
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

/**
 * Account-Show : Append middleware to expose Date of Birth on the account dashboard.
 * @name Base/Account-Show
 * @function
 * @memberof Account
 * @param {Object} req - Request object
 * @param {Object} res - Response object
 * @param {Function} next - Next function
 * @returns {void}
 */
server.append('Show', function (req, res, next) {
    var viewData = res.getViewData();

    if (viewData && viewData.account && viewData.account.profile && req.currentCustomer.raw && req.currentCustomer.raw.profile) {
        var rawProfile = req.currentCustomer.raw.profile;
        if (rawProfile.custom && rawProfile.custom.dateOfBirth) {
            var dob = rawProfile.custom.dateOfBirth;
            if (dob instanceof Date) {
                var Calendar = require('dw/util/Calendar');
                var StringUtils = require('dw/util/StringUtils');
                var calendar = new Calendar(dob);
                calendar.setTimeZone('UTC');
                viewData.account.profile.dateOfBirth = StringUtils.formatCalendar(calendar, 'dd-MM-yyyy');
            } else {
                viewData.account.profile.dateOfBirth = dob.toString();
            }
        }
    }

    return next();
});

module.exports = server.exports();
