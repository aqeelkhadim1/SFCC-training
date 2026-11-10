'use strict';

$(function () {
    var form = document.getElementById('external-api-create-form');

    if (!form) {
        return;
    }

    form.addEventListener('submit', function (event) {
        var userId = document.getElementById('external-api-user-id');
        var title = document.getElementById('external-api-title');
        var body = document.getElementById('external-api-body');
        var valid = true;

        [userId, title, body].forEach(function (input) {
            var message = '';
            if (!input.value.trim()) {
                message = input === userId ? 'User ID is required.'
                    : (input === title ? 'Title is required.' : 'Description is required.');
            } else if (input === userId && (!/^\d+$/.test(input.value) || Number(input.value) < 1)) {
                message = 'User ID must be a positive whole number.';
            }

            input.classList.toggle('is-invalid', Boolean(message));
            if (message) {
                input.setCustomValidity(message);
                input.nextElementSibling.textContent = message;
                valid = false;
            } else {
                input.setCustomValidity('');
            }
        });

        if (!valid) {
            event.preventDefault();
            form.reportValidity();
        }
    });
});
