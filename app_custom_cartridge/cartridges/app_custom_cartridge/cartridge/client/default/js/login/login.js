'use strict';

var base = require('base/login/login');

var DOB_PATTERN = /^(\d{2})-(\d{2})-(\d{4})$/;
var PHONE_PATTERN = /^\(\d{3}\) \d{3}-\d{4}$/;

function pad(value) {
    return ('0' + value).slice(-2);
}

function isValidDob(value) {
    var match = value.match(DOB_PATTERN);

    if (!match) {
        return false;
    }

    var day = parseInt(match[1], 10);
    var month = parseInt(match[2], 10);
    var year = parseInt(match[3], 10);
    var date = new Date(year, month - 1, day);
    var today = new Date();

    today.setHours(0, 0, 0, 0);

    return year >= 1900
        && date.getFullYear() === year
        && date.getMonth() === month - 1
        && date.getDate() === day
        && date <= today;
}

function setFieldState($field, $error, valid, message) {
    $field.toggleClass('is-invalid', !valid).attr('aria-invalid', String(!valid));
    $error.text(valid ? '' : message);
    return valid;
}

function validateDob($field, $error) {
    var value = $.trim($field.val());
    var message = value
        ? $field.data('pattern-mismatch')
        : $field.data('missing-error');

    return setFieldState($field, $error, !!value && isValidDob(value), message);
}

function validatePhone($field, $error) {
    var value = $.trim($field.val());
    var message = value
        ? $field.data('pattern-mismatch')
        : $field.data('missing-error');

    return setFieldState($field, $error, !!value && PHONE_PATTERN.test(value), message);
}

function formatDob(value) {
    var digits = value.replace(/\D/g, '').slice(0, 8);
    var parts = [digits.slice(0, 2), digits.slice(2, 4), digits.slice(4, 8)];

    return parts.filter(function (part) {
        return part.length;
    }).join('-');
}

function formatPhone(value) {
    var digits = value.replace(/\D/g, '').slice(0, 10);

    if (digits.length <= 3) {
        return digits ? '(' + digits : '';
    }

    if (digits.length <= 6) {
        return '(' + digits.slice(0, 3) + ') ' + digits.slice(3);
    }

    return '(' + digits.slice(0, 3) + ') '
        + digits.slice(3, 6) + '-' + digits.slice(6);
}

function initRegistrationValidation() {
    var $form = $('form.registration');

    if (!$form.length) {
        return;
    }

    var $dob = $form.find('#registration-form-dob');
    var $dobPicker = $form.find('#registration-form-dob-picker');
    var $dobError = $form.find('#form-dob-error');
    var $phone = $form.find('#registration-form-phone');
    var $phoneError = $form.find('#form-phone-error');
    var today = new Date();

    $dobPicker.attr(
        'max',
        today.getFullYear() + '-' + pad(today.getMonth() + 1) + '-' + pad(today.getDate())
    );

    $form.find('#dob-calendar-btn').on('click', function () {
        var picker = $dobPicker[0];

        if (!picker) {
            return;
        }

        if (typeof picker.showPicker === 'function') {
            try {
                picker.showPicker();
            } catch (e) {
                picker.focus();
                picker.click();
            }
        } else {
            picker.focus();
            picker.click();
        }
    });

    $dobPicker.on('change', function () {
        var parts = String($(this).val() || '').split('-');

        if (parts.length === 3) {
            $dob.val(parts[2] + '-' + parts[1] + '-' + parts[0]);
            validateDob($dob, $dobError);
        }
    });

    $dob.on('input blur', function () {
        $dob.val(formatDob($dob.val()));
        validateDob($dob, $dobError);
    });

    $phone.on('input blur', function () {
        $phone.val(formatPhone($phone.val()));
        validatePhone($phone, $phoneError);
    });

    $form.on('submit.registrationValidation', function (event) {
        var dobValid = validateDob($dob, $dobError);
        var phoneValid = validatePhone($phone, $phoneError);

        if (!dobValid || !phoneValid) {
            event.preventDefault();
            event.stopImmediatePropagation();
            $form.find('.is-invalid').first().trigger('focus');
            return false;
        }

        return true;
    });
}

var baseRegister = base.register;

base.register = function () {
    initRegistrationValidation();
    baseRegister();
};

module.exports = base;
