const strings = require('../Res/strings');
const csv = require('csvtojson');

var client = require('./dataContext').redisClient;
var lredis = require('./redis-local');

const PaidType = require('../models/paidType');

const PREFIX = strings.redis_prefix_paid_type;
const PAIDTYPE_ID = strings.redis_id_paid_type;

class PaidTypeService {
  importPaidTypeFromCsv() {
    return new Promise((resolve, reject) => {
      this.removeAll().then(result => {
        csv().fromFile("./DB_Seed/-----.csv").then(jsonObj => {
          Promise.all(jsonObj.map(element => {
            console.log(element.sCarrierName);
            client.incr(PAIDTYPE_ID, (err, id) => {
              return lredis.hmset(PREFIX + id, {
                id: id,
                name: element.sCarrierName,
              });
            });
          })).then(result => {
            resolve(result);
          })
        })
      })
    });
  }
  addPaidType(paidType) {
    return new Promise((resolve, reject) => {
      const newPaidType = new PaidType({name: paidType.name})
      newPaidType.save((err, result) => {
        if (err) {
          resolve({ success: false, message: strings.string_response_error });
        } else {
          paidType['id'] = result['_id'];
          resolve({ success: true, message: strings.string_response_added, paidType: paidType });
        }
      });
    })
  }
  updatePaidType(id, body) {
    return new Promise((resolve, reject) => {
      PaidType.findOneAndUpdate({_id: id}, {name: body.name}, (err, result) => {
        if (err) {
          resolve({ success: false, message: strings.string_response_error });
        } else {
          resolve({ success: true, message: strings.string_not_found_customer });
        }
      });
    })
  }
  removePaidType(id) {
    return new Promise((resolve, reject) => {
      PaidType.deleteOne({_id: id}, (err, result) => {
        if (err) {
          resolve({ success: false, message: strings.string_response_error });
        } else {
          resolve({ success: true, message: strings.string_response_removed });
        }
      })
    });
  }
  getPaidType(id) {
    return new Promise((resolve, reject) => {
      PaidType.findOne({_id: id}, (err, result) => {
        if (err) {
          resolve({});
        } else {
          resolve(result);
        }
      })
    });
  }
  getAllPaidTypes() {
    return new Promise((resolve, reject) => {
      PaidType.find({}, (err, result) => {
        if (err) {
          resolve([]);
        } else {
          resolve(result);
        }
      })
    })
  }
  removeAll() {
    return new Promise((resolve, reject) => {
      PaidType.deleteMany({}, (err, result) => {
        if (err) {
          resolve([]);
        } else {
          resolve(result);
        }
      })
    });
  }
}

//========== DB Structure ==========//
// id:
// name:

module.exports = PaidTypeService;