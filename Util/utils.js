var phoneFormatter = require('phone-formatter');
var moment = require('moment');
var cryptojs = require('crypto-js');
var jwt = require('jsonwebtoken');
const strings = require('../Res/strings');

exports.generateToken = (user) => {
  return new Promise(function (resolve, reject) {
    var stringData = JSON.stringify(user);
    var encryptedData = cryptojs.AES.encrypt(stringData, strings.user_auth_key).toString();
    var token = jwt.sign({
      token: encryptedData
    }, strings.user_auth_key);
    resolve(token);
  });
}

exports.verifyToken = (token) => {
  return new Promise(function (reslove, reject) {
    try {
      var decodedJWT = jwt.verify(token, strings.user_auth_key);
      var bytes = cryptojs.AES.decrypt(decodedJWT.token, strings.user_auth_key);
      var tokenData = JSON.parse(bytes.toString(cryptojs.enc.Utf8));
      reslove(tokenData);
    } catch (e) {
      reject(e);
    }
  });
}

exports.formattedRecord = (record) => {
  if (record.companyId == '9to5') record.companyId = '9-5 Import';
  if (record.companyId == 'pmb') record.companyId = "Post Boxes";

  if (record.warehouse == 'fll') record.warehouse = "Warehouse FLL";
  if (record.warehouse == 'nas') record.warehouse = "Warehouse NAS";

  if (record.mobile && record.mobile.length >= 10)
    record.mobile = phoneFormatter.format(record.mobile, "(NNN) NNN-NNNN");
  if (record.phone && record.phone.length >= 10)
    record.phone = phoneFormatter.format(record.phone, "(NNN) NNN-NNNN");
  if (record.sender && record.sender.length >= 10)
    record.sender = phoneFormatter.format(record.sender, "(NNN) NNN-NNNN");
  if (record.recipient && record.recipient.length >= 10)
    record.recipient = phoneFormatter.format(record.recipient, "(NNN) NNN-NNNN");
  if (record.owner && record.owner.length >= 10)
    record.owner = phoneFormatter.format(record.owner, "(NNN) NNN-NNNN");
  if (record.customer && record.customer.mobile && record.customer.mobile.length >= 10)
    record.customer.mobile = phoneFormatter.format(record.customer.mobile, "(NNN) NNN-NNNN");
  if (record.dateCreated) {
    record.dateCreated = moment(record.dateCreated * 1000).format("YYYY/MM/DD, h:mm:ss A");
  }
  return record;
}

exports.formatDate = (unix, format) => {
  return moment(unix * 1000).format(format);
}