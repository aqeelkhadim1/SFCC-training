'use strict';

var server = require('server');
var base = module.superModule;
var Resource = require('dw/web/Resource');
var Transaction = require('dw/system/Transaction');

server.extend(base);

/**
 * Parse a strict DD-MM-YYYY value as a JavaScript Date.
 *
 * @param {string} value Input value
 * @returns {Date|null} Parsed date, or null when the value is invalid
 */
function parseDateOfBirth(value) {
  var match = /^(\d{2})-(\d{2})-(\d{4})$/.exec(value || '');
  var day;
  var month;
  var year;
  var date;

  if (!match) {
    return null;
  }

  day = Number(match[1]);
  month = Number(match[2]);
  year = Number(match[3]);

  if (year < 1 || month < 1 || month > 12 || day < 1 || day > 31) {
    return null;
  }

  date = new Date(0);
  date.setFullYear(year, month - 1, day);
  date.setHours(0, 0, 0, 0);

  if (date.getFullYear() !== year || date.getMonth() !== month - 1 || date.getDate() !== day) {
    return null;
  }

  return date;
}

server.prepend('SubmitRegistration', function validateRegistrationFields(req, res, next) {
  var registrationForm = server.forms.getForm('profile');
  var dateOfBirthValue = registrationForm.customer.dateOfBirth.value || '';
  var dateOfBirth = parseDateOfBirth(dateOfBirthValue);
  var phone = registrationForm.customer.phone.value || '';

  if (!dateOfBirthValue) {
    registrationForm.customer.dateOfBirth.valid = false;
    registrationForm.customer.dateOfBirth.error = Resource.msg('error.message.required', 'forms', null);
    registrationForm.valid = false;
  } else if (!dateOfBirth) {
    registrationForm.customer.dateOfBirth.valid = false;
    registrationForm.customer.dateOfBirth.error = Resource.msg('error.message.parse.dateofbirth.registration', 'forms', null);
    registrationForm.valid = false;
  }

  if (!/^\(\d{3}\) \d{3}-\d{4}$/.test(phone)) {
    registrationForm.customer.phone.valid = false;
    registrationForm.customer.phone.error = phone
      ? Resource.msg('error.message.parse.phone.registration', 'forms', null)
      : Resource.msg('error.message.required', 'forms', null);
    registrationForm.valid = false;
  }

  res.setViewData({ dateOfBirth: dateOfBirth });
  return next();
});

server.append('SubmitRegistration', function saveRegistrationDateOfBirth(req, res, next) {
  this.on('route:BeforeComplete', function setProfileBirthday() {
    var viewData = res.getViewData();
    var customer = viewData.authenticatedCustomer;

    if (customer && viewData.dateOfBirth) {
      Transaction.wrap(function saveBirthday() {
        customer.getProfile().setBirthday(viewData.dateOfBirth);
      });
    }
  });

  return next();
});

module.exports = server.exports();
