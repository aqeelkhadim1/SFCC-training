'use strict';

function isRealDateOfBirth(value) {
    var match = /^(\d{2})-(\d{2})-(\d{4})$/.exec(value);
    var day;
    var month;
    var year;
    var date;

    if (!match) {
        return false;
    }

    day = Number(match[1]);
    month = Number(match[2]);
    year = Number(match[3]);
    date = new Date(0);
    date.setUTCFullYear(year, month - 1, day);

    return year > 0 && date.getUTCFullYear() === year
        && date.getUTCMonth() === month - 1 && date.getUTCDate() === day;
}

function showValidation(input, message) {
    var $input = $(input);
    var $container = $input.closest('.mb-3');

    $input.toggleClass('is-invalid', Boolean(message));
    $container.find('.invalid-feedback').text(message || '');
}

$(function () {
    var dateInput = document.getElementById('registration-form-date-of-birth');
    var phoneInput = document.getElementById('registration-form-phone');

    if (dateInput) {
        $(dateInput).on('blur change input', function () {
            var value = this.value;
            var message = '';

            if (!value) {
                message = $(this).data('missing-error');
            } else if (!isRealDateOfBirth(value)) {
                message = $(this).data('pattern-mismatch');
            }

            this.setCustomValidity(message || '');
            showValidation(this, message);
        });
    }

    if (phoneInput) {
        $(phoneInput).on('blur', function () {
            var value = this.value;
            var message = '';

            if (!value) {
                message = $(this).data('missing-error');
            } else if (!/^\([0-9]{3}\) [0-9]{3}-[0-9]{4}$/.test(value)) {
                message = $(this).data('pattern-mismatch');
            }

            showValidation(this, message);
        });
    }

    document.addEventListener('invalid', function (event) {
        var input = event.target;

        if (input !== dateInput && input !== phoneInput) {
            return;
        }

        window.setTimeout(function () {
            var value = input.value;
            var message;

            if (!value) {
                message = $(input).data('missing-error');
            } else if (input === dateInput && !isRealDateOfBirth(value)) {
                message = $(input).data('pattern-mismatch');
            } else if (input === phoneInput && !/^\([0-9]{3}\) [0-9]{3}-[0-9]{4}$/.test(value)) {
                message = $(input).data('pattern-mismatch');
            } else {
                message = '';
            }

            if (input === dateInput) {
                input.setCustomValidity(message || '');
            }
            showValidation(input, message);
        }, 0);
    }, true);
});
