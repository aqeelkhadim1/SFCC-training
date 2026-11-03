'use strict';

/**
 * Helper module for validating and processing custom customer registration fields
 * (Date of Birth and Phone Number).
 */

var DOB_REGEX = /^(\d{2})-(\d{2})-(\d{4})$/;
var PHONE_REGEX = /^\(\d{3}\) \d{3}-\d{4}$/;

/**
 * Converts a valid DD-MM-YYYY string to a JavaScript Date object (UTC-based).
 * Validates format, calendar existence (including leap years), realistic year range (1900-2100),
 * and rejects future dates.
 *
 * @param {string} dobString - Date of birth string in DD-MM-YYYY format.
 * @returns {Date|null} - JavaScript Date instance or null if invalid.
 */
function parseDobToDate(dobString) {
    if (!dobString || typeof dobString !== 'string') {
        return null;
    }

    var match = dobString.trim().match(DOB_REGEX);
    if (!match) {
        return null;
    }

    var day = parseInt(match[1], 10);
    var month = parseInt(match[2], 10);
    var year = parseInt(match[3], 10);

    if (year < 1900 || year > 2100) {
        return null;
    }

    var date = new Date(Date.UTC(year, month - 1, day));
    // Verify date didn't roll over (e.g. Feb 31 -> Mar 3 or invalid leap year)
    if (date.getUTCFullYear() !== year || date.getUTCMonth() !== month - 1 || date.getUTCDate() !== day) {
        return null;
    }

    // Must not be a future date (DOB cannot be after today)
    var now = new Date();
    var todayUtc = Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate());
    if (date.getTime() > todayUtc) {
        return null;
    }

    return date;
}

/**
 * Validates whether a given string is in DD-MM-YYYY format
 * and represents a real calendar date.
 * Strictly rejects non-existent dates as well as future dates.
 *
 * @param {string} dobString - Date of birth string in DD-MM-YYYY format.
 * @returns {boolean} - True if valid calendar date, false otherwise.
 */
function isValidDob(dobString) {
    return parseDobToDate(dobString) !== null;
}

/**
 * Validates whether a given phone number strictly matches the (999) 999-9999 format.
 * Rejects unformatted, partial, alphabetic, or incorrectly spaced strings.
 *
 * @param {string} phoneString - Phone number string.
 * @returns {boolean} - True if format matches (999) 999-9999, false otherwise.
 */
function isValidPhone(phoneString) {
    return !!(phoneString && typeof phoneString === 'string' && PHONE_REGEX.test(phoneString.trim()));
}

module.exports = {
    isValidDob: isValidDob,
    isValidPhone: isValidPhone,
    parseDobToDate: parseDobToDate
};
