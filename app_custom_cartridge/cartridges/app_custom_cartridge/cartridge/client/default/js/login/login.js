'use strict';

var base = require('base/login/login');

/**
 * Validates calendar date correctness for DD-MM-YYYY (handles leap years, days per month, future dates).
 * @param {string} str - Date string in DD-MM-YYYY.
 * @returns {boolean} - True if real calendar date and not in the future.
 */
function isValidCalendarDate(str) {
    if (!str) {
        return false;
    }
    var match = str.trim().match(/^(\d{2})-(\d{2})-(\d{4})$/);
    if (!match) {
        return false;
    }

    var d = parseInt(match[1], 10);
    var m = parseInt(match[2], 10);
    var y = parseInt(match[3], 10);

    if (y < 1900 || y > 2100) {
        return false;
    }

    var date = new Date(Date.UTC(y, m - 1, d));
    // Verify date didn't roll over (e.g. Feb 31 -> Mar 3 or invalid leap year)
    if (date.getUTCFullYear() !== y || date.getUTCMonth() !== m - 1 || date.getUTCDate() !== d) {
        return false;
    }

    // Must not be a future date (DOB cannot be after today)
    var now = new Date();
    var todayUtc = Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate());
    if (date.getTime() > todayUtc) {
        return false;
    }

    return true;
}

/**
 * Validates phone number format strictly as (999) 999-9999.
 * @param {string} str - Phone string.
 * @returns {boolean} - True if valid format.
 */
function isValidPhone(str) {
    if (!str) {
        return false;
    }
    return /^\(\d{3}\) \d{3}-\d{4}$/.test(str.trim());
}

/**
 * Validates DOB field and updates UI error state immediately.
 * @param {jQuery} $dob - Input element
 * @param {jQuery} $dobError - Error feedback element
 * @returns {boolean} - True if valid, false otherwise
 */
function validateDobField($dob, $dobError) {
    var val = ($dob.val() || '').trim();
    if (!val) {
        $dob.addClass('is-invalid');
        $dobError.text($dob.data('missing-error') || 'Date of Birth is required.');
        return false;
    }
    if (!isValidCalendarDate(val)) {
        $dob.addClass('is-invalid');
        $dobError.text($dob.data('pattern-mismatch') || 'Please enter a valid date in DD-MM-YYYY format.');
        return false;
    }
    $dob.removeClass('is-invalid');
    $dobError.text('');
    return true;
}

/**
 * Validates Phone field and updates UI error state immediately.
 * @param {jQuery} $phone - Input element
 * @param {jQuery} $phoneError - Error feedback element
 * @returns {boolean} - True if valid, false otherwise
 */
function validatePhoneField($phone, $phoneError) {
    var val = ($phone.val() || '').trim();
    if (!val) {
        $phone.addClass('is-invalid');
        $phoneError.text($phone.data('missing-error') || 'Phone Number is required.');
        return false;
    }
    if (!isValidPhone(val)) {
        $phone.addClass('is-invalid');
        $phoneError.text($phone.data('pattern-mismatch') || 'Please enter a valid phone number in (999) 999-9999 format.');
        return false;
    }
    $phone.removeClass('is-invalid');
    $phoneError.text('');
    return true;
}

/**
 * Attaches real-time live validation events on typing and native calendar picker synchronization.
 */
function handleLiveValidation() {
    var $form = $('form.registration');
    var $dob = $('#registration-form-dob');
    var $dobPicker = $('#registration-form-dob-picker');
    var $dobBtn = $('#dob-calendar-btn');
    var $dobError = $('#form-dob-error');
    var $phone = $('#registration-form-phone');
    var $phoneError = $('#form-phone-error');

    if ($form.length === 0) {
        return;
    }

    var dobInteracted = false;
    var phoneInteracted = false;

    // Set max date on the calendar picker to today (no future dates)
    var today = new Date();
    var yyyy = today.getFullYear();
    var mm = String(today.getMonth() + 1).padStart(2, '0');
    var dd = String(today.getDate()).padStart(2, '0');
    var todayIso = yyyy + '-' + mm + '-' + dd;
    $dobPicker.attr('max', todayIso);

    // Clicking calendar icon button triggers the real native browser Date Picker
    $dobBtn.on('click', function (e) {
        e.preventDefault();
        var pickerEl = $dobPicker[0];
        if (pickerEl) {
            if (typeof pickerEl.showPicker === 'function') {
                pickerEl.showPicker();
            } else {
                pickerEl.focus();
                pickerEl.click();
            }
        }
    });

    // When a date is selected from the native calendar picker:
    // Format YYYY-MM-DD -> DD-MM-YYYY and display inside the input!
    $dobPicker.on('change', function () {
        var pickerVal = $(this).val(); // YYYY-MM-DD
        if (pickerVal && /^\d{4}-\d{2}-\d{2}$/.test(pickerVal)) {
            var parts = pickerVal.split('-');
            var dmy = parts[2] + '-' + parts[1] + '-' + parts[0];
            $dob.val(dmy);
            dobInteracted = true;
            $dob.trigger('input');
        }
    });

    // Live typing validation and progressive auto-formatting for Date of Birth
    $dob.on('input', function () {
        dobInteracted = true;
        var raw = $(this).val();

        // Progressive auto-masking: automatically insert '-' as user types digits
        var digits = raw.replace(/\D/g, '');
        if (digits.length > 8) {
            digits = digits.substring(0, 8);
        }

        var formatted = '';
        if (digits.length > 0) {
            if (digits.length < 2) {
                formatted = digits;
            } else if (digits.length === 2) {
                formatted = raw.endsWith('-') ? digits + '-' : digits;
            } else if (digits.length < 4) {
                formatted = digits.substring(0, 2) + '-' + digits.substring(2);
            } else if (digits.length === 4) {
                formatted = raw.endsWith('-') ? digits.substring(0, 2) + '-' + digits.substring(2) + '-' : digits.substring(0, 2) + '-' + digits.substring(2);
            } else {
                formatted = digits.substring(0, 2) + '-' + digits.substring(2, 4) + '-' + digits.substring(4);
            }
        }

        if (raw !== formatted && digits.length > 0) {
            $(this).val(formatted);
        } else if (digits.length === 0 && raw !== '') {
            $(this).val('');
        }

        validateDobField($dob, $dobError);
    });

    $dob.on('blur', function () {
        if (dobInteracted) {
            validateDobField($dob, $dobError);
        }
    });

    // Live typing validation and auto-formatting for Phone Number
    $phone.on('input', function () {
        phoneInteracted = true;
        var raw = $(this).val();
        var digits = raw.replace(/\D/g, '');

        // Auto-format to (999) 999-9999 if user types digits
        if (digits.length > 0 && !raw.startsWith('(') && raw.indexOf(')') === -1) {
            if (digits.length > 10) {
                digits = digits.substring(0, 10);
            }
            if (digits.length === 10) {
                $(this).val('(' + digits.substring(0, 3) + ') ' + digits.substring(3, 6) + '-' + digits.substring(6, 10));
            }
        }

        validatePhoneField($phone, $phoneError);
    });

    $phone.on('blur', function () {
        if (phoneInteracted) {
            validatePhoneField($phone, $phoneError);
        }
    });
}

// Extend base register functionality
var baseRegister = base.register;

base.register = function () {
    handleLiveValidation();

    $('form.registration').on('submit', function (e) {
        var $dob = $('#registration-form-dob');
        var $phone = $('#registration-form-phone');
        var $dobError = $('#form-dob-error');
        var $phoneError = $('#form-phone-error');

        var isDobValid = validateDobField($dob, $dobError);
        var isPhoneValid = validatePhoneField($phone, $phoneError);

        if (!isDobValid || !isPhoneValid) {
            e.preventDefault();
            e.stopPropagation();
            e.stopImmediatePropagation();
            if (typeof $(this).spinner === 'function') {
                $(this).spinner().stop();
            }
            return false;
        }
    });

    baseRegister();
};

module.exports = base;
