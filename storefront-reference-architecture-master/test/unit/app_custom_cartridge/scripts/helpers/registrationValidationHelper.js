'use strict';

var assert = require('chai').assert;
var registrationValidationHelper = require('../../../../../cartridges/app_custom_cartridge/cartridge/scripts/helpers/registrationValidationHelper');

describe('registrationValidationHelper', function () {
    describe('isValidDob', function () {
        it('should accept valid dates in DD-MM-YYYY format', function () {
            assert.isTrue(registrationValidationHelper.isValidDob('28-10-2026'));
            assert.isTrue(registrationValidationHelper.isValidDob('01-01-2000'));
            assert.isTrue(registrationValidationHelper.isValidDob('31-12-1995'));
            assert.isTrue(registrationValidationHelper.isValidDob('29-02-2024')); // Leap year
        });

        it('should reject missing or empty DOB', function () {
            assert.isFalse(registrationValidationHelper.isValidDob(''));
            assert.isFalse(registrationValidationHelper.isValidDob(null));
            assert.isFalse(registrationValidationHelper.isValidDob(undefined));
            assert.isFalse(registrationValidationHelper.isValidDob('   '));
        });

        it('should reject invalid DOB format (not DD-MM-YYYY)', function () {
            assert.isFalse(registrationValidationHelper.isValidDob('2026/10/28'));
            assert.isFalse(registrationValidationHelper.isValidDob('28/10/2026'));
            assert.isFalse(registrationValidationHelper.isValidDob('28.10.2026'));
            assert.isFalse(registrationValidationHelper.isValidDob('1-1-2020'));
            assert.isFalse(registrationValidationHelper.isValidDob('28-10-26'));
            assert.isFalse(registrationValidationHelper.isValidDob('invalid-date'));
        });

        it('should reject impossible calendar dates (non-existent dates)', function () {
            assert.isFalse(registrationValidationHelper.isValidDob('31-02-2026'), 'February 31 must be rejected');
            assert.isFalse(registrationValidationHelper.isValidDob('29-02-2023'), 'February 29 in non-leap year must be rejected');
            assert.isFalse(registrationValidationHelper.isValidDob('31-04-2026'), 'April 31 must be rejected');
            assert.isFalse(registrationValidationHelper.isValidDob('31-06-2026'), 'June 31 must be rejected');
            assert.isFalse(registrationValidationHelper.isValidDob('31-09-2026'), 'September 31 must be rejected');
            assert.isFalse(registrationValidationHelper.isValidDob('31-11-2026'), 'November 31 must be rejected');
            assert.isFalse(registrationValidationHelper.isValidDob('00-01-2020'), 'Day 0 must be rejected');
            assert.isFalse(registrationValidationHelper.isValidDob('15-13-2020'), 'Month 13 must be rejected');
            assert.isFalse(registrationValidationHelper.isValidDob('15-00-2020'), 'Month 0 must be rejected');
        });

        it('should reject future dates (DOB cannot be after today)', function () {
            assert.isFalse(registrationValidationHelper.isValidDob('01-01-2099'), 'Year 2099 must be rejected');
            assert.isFalse(registrationValidationHelper.isValidDob('15-08-2050'), 'Year 2050 must be rejected');
        });
    });

    describe('isValidPhone', function () {
        it('should accept valid phone numbers in (999) 999-9999 format', function () {
            assert.isTrue(registrationValidationHelper.isValidPhone('(123) 456-7890'));
            assert.isTrue(registrationValidationHelper.isValidPhone('(999) 999-9999'));
            assert.isTrue(registrationValidationHelper.isValidPhone('(555) 012-3456'));
        });

        it('should reject missing or empty phone numbers', function () {
            assert.isFalse(registrationValidationHelper.isValidPhone(''));
            assert.isFalse(registrationValidationHelper.isValidPhone(null));
            assert.isFalse(registrationValidationHelper.isValidPhone(undefined));
            assert.isFalse(registrationValidationHelper.isValidPhone('   '));
        });

        it('should reject unformatted 10-digit phone number', function () {
            assert.isFalse(registrationValidationHelper.isValidPhone('1234567890'));
        });

        it('should reject phone numbers missing the space after area code', function () {
            assert.isFalse(registrationValidationHelper.isValidPhone('(123)456-7890'));
        });

        it('should reject phone numbers with missing digits', function () {
            assert.isFalse(registrationValidationHelper.isValidPhone('(123) 456-789'));
        });

        it('should reject alphabetic characters in phone number', function () {
            assert.isFalse(registrationValidationHelper.isValidPhone('(ABC) 456-7890'));
            assert.isFalse(registrationValidationHelper.isValidPhone('(123) 456-ABCD'));
        });
    });

    describe('parseDobToDate', function () {
        it('should convert valid DD-MM-YYYY to a JavaScript Date object', function () {
            var date = registrationValidationHelper.parseDobToDate('15-08-1995');
            assert.isNotNull(date);
            assert.instanceOf(date, Date);
            assert.strictEqual(date.getUTCFullYear(), 1995);
            assert.strictEqual(date.getUTCMonth(), 7); // 0-indexed, 7 = August
            assert.strictEqual(date.getUTCDate(), 15);
        });

        it('should return null for invalid dates', function () {
            assert.isNull(registrationValidationHelper.parseDobToDate('31-02-2026'));
            assert.isNull(registrationValidationHelper.parseDobToDate('invalid'));
            assert.isNull(registrationValidationHelper.parseDobToDate(''));
        });
    });
});

