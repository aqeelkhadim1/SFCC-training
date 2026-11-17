'use strict';

var Calendar = require('dw/util/Calendar');
var Resource = require('dw/web/Resource');
var StringUtils = require('dw/util/StringUtils');
var Transaction = require('dw/system/Transaction');

var DOB_REGEX = /^(\d{2})-(\d{2})-(\d{4})$/;
var PHONE_REGEX = /^\(\d{3}\) \d{3}-\d{4}$/;

/**
 * Parses a valid DD-MM-YYYY value as an SFCC Date.
 * @param {string} value - Date of birth value
 * @returns {Date|null} Parsed date or null
 */
function parseDobToDate(value) {
    var normalizedValue = typeof value === 'string' ? value.trim() : '';
    var match = normalizedValue.match(DOB_REGEX);

    if (!match || parseInt(match[3], 10) < 1900) {
        return null;
    }

    var calendar = new Calendar();

    try {
        calendar.parseByFormat(normalizedValue, 'dd-MM-yyyy');
    } catch (e) {
        return null;
    }

    if (StringUtils.formatCalendar(calendar, 'dd-MM-yyyy') !== normalizedValue
        || calendar.after(new Calendar())
    ) {
        return null;
    }

    return calendar.getTime();
}

/**
 * Validates a formatted phone number.
 * @param {string} value - Phone number
 * @returns {boolean} Whether the value is valid
 */
function isValidPhone(value) {
    return typeof value === 'string' && PHONE_REGEX.test(value.trim());
}

/**
 * Validates custom registration fields and returns normalized values.
 * @param {Object} form - Profile registration form
 * @returns {Object} Validated DOB and phone values
 */
function validateRegistrationForm(form) {
    var registrationForm = form;
    var customer = registrationForm.customer;
    var baseCustomer = registrationForm.base && registrationForm.base.customer;
    var dobField = customer.dateofbirth;
    var dob = String(dobField.value || '').trim();
    var dobDate = parseDobToDate(dob);

    // Mandatory/regexp validation is handled by the SFRA form definition.
    // This additional check rejects impossible and future calendar dates.
    if (dob && !dobDate) {
        dobField.valid = false;
        dobField.error = Resource.msg('error.message.invalid.dob', 'forms', null);
        registrationForm.valid = false;

        if (baseCustomer && baseCustomer.dateofbirth) {
            baseCustomer.dateofbirth.invalidateFormElement();
        }
    }

    return {
        customDob: dobDate,
        customPhone: String(customer.phone.value || '').trim()
    };
}

/**
 * Persists validated custom values on a customer profile.
 * @param {dw.customer.Customer} customer - Authenticated customer
 * @param {Date} dob - Date-type DOB value
 * @param {string} phone - Formatted phone value
 */
function saveProfileAttributes(customer, dob, phone) {
    if (!customer || !(dob instanceof Date) || !isValidPhone(phone)) {
        return;
    }

    var profile = customer.getProfile();

    if (!profile) {
        return;
    }

    // Preserve the non-null narrowing inside the transaction callback.
    var customerProfile = profile;

    Transaction.wrap(function () {
        customerProfile.custom.dateOfBirth = dob;
        customerProfile.setBirthday(dob);
        customerProfile.custom.phoneNumber = phone;
    });
}

/**
 * Formats a Date-type profile attribute for storefront display.
 * @param {Date} date - Stored profile date
 * @returns {string|null} DD-MM-YYYY value
 */
function formatDate(date) {
    if (!(date instanceof Date)) {
        return date ? String(date) : null;
    }

    var calendar = new Calendar(date);
    return StringUtils.formatCalendar(calendar, 'dd-MM-yyyy');
}

module.exports = {
    validateRegistrationForm: validateRegistrationForm,
    saveProfileAttributes: saveProfileAttributes,
    formatDate: formatDate
};
