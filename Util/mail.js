var domain = 'mg.coral.media';
var api_key = 'key-26b3924502603002f75c25ebde19be8e';
var mailgun = require('mailgun-js')({ apiKey: api_key, domain: domain });

// NOTE: Don't forget to change it before push.
// http://paylanes-dev.sprocket.solutions:3000/
const URL = 'http://paylanes-dev.sprocket.solutions:3000/'

exports.sendEmail = (toEmail, subject, html) => {
  return new Promise(function (resolve, reject) {
    contactService.getInfo().then(contacts => {
      html = html.replace(/{{CONTACT_EMAIL}}/g, contacts.email);
      html = html.replace(/{{CONTACT_LOCATION}}/g, contacts.location);
      html = html.replace(/{{CONTACT_PHONE}}/g, contacts.phone);

      let data = {
        from: '9-5 Import <no-reply@95import.com>',
        to: toEmail,
        subject: subject,
        html: html
      };
      mailgun.messages().send(data, function (error, body) {
        if (error) reject(error);
        else resolve(body);
      })
    })
  })
};
