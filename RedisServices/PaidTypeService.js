const strings = require('../Res/strings');
const csv = require('csvtojson');

var client = require('./dataContext').redisClient;
var lredis = require('./redis-local');

const PREFIX = strings.redis_prefix_paid_type;
const PAIDTYPE_ID = strings.redis_id_paid_type;

class PaidTypeService {
  importShippersFromCsv() {
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
      client.incr(PAIDTYPE_ID, (err, id) => {
        if (err) resolve({ success: false, message: strings.string_response_error });
        paidType.id = id;
        client.hmset(PREFIX + id, paidType, (err, result) => {
          if (err) resolve({ success: false, message: strings.string_response_error });
          resolve({ success: true, message: strings.string_response_added, paidType: paidType });
        })
      })
    })
  }
  updatePaidType(id, body) {
    return new Promise((resolve, reject) => {
      client.exists(PREFIX + id, (err, exist) => {
        if (err) resolve({ success: false, message: strings.string_response_error });
        if (Number(exist) == 1) {
          client.hmset(PREFIX + id, body);
          resolve({ success: true, message: strings.string_response_updated });
        } else
          resolve({ success: true, message: strings.string_not_found_customer });
      })
    })
  }
  removePaidType(id) {
    return new Promise((resolve, reject) => {
      client.del(PREFIX + id, (err, result) => {
        if (err) resolve({ success: false, message: strings.string_response_error });
        resolve({ success: true, message: strings.string_response_removed });
      })
    });
  }
  getPaidType(id) {
    return new Promise((resolve, reject) => {
      client.hgetall(PREFIX + id, (err, paidType) => {
        if (err) resolve({});
        resolve(paidType);
      })
    });
  }
  getAllPaidTypes() {
    return new Promise((resolve, reject) => {
      client.keys(PREFIX + '*', (err, keys) => {
        if (err) resolve([]);
        Promise.all(keys.map(key => {
          return lredis.hgetall(key);
        })).then(paidTypes => {
          resolve(paidTypes);
        })
      })
    })
  }
  removeAll() {
    return new Promise((resolve, reject) => {
      client.set(PAIDTYPE_ID, 0);
      client.keys(PREFIX + '*', (err, keys) => {
        if (err) resolve([]);
        Promise.all(keys.map(key => {
          return lredis.del(key);
        })).then(result => {
          resolve(result);
        })
      })
    });
  }
}

//========== DB Structure ==========//
// id:
// name:

module.exports = PaidTypeService;