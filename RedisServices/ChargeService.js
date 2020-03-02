
const strings = require('../Res/strings');
const csv = require('csvtojson');

var client = require('./dataContext').redisClient;
var lredis = require('./redis-local');

const CHARGE_ID = strings.redis_id_charge;
const PREFIX = strings.redis_prefix_charge;

class ChargeService {
  getCharge(id) {
    return new Promise((resolve, reject) => {
      client.hgetall(PREFIX + id, (err, charge) => {
        if (err) resolve({ description: "" });
        if (charge) resolve(charge);
        else resolve({ description: "" });
      })
    });
  }
  getCharges() {
    return new Promise((resolve, reject) => {
      client.keys(PREFIX + '*', (err, keys) => {
        if (err) resolve([]);
        Promise.all(keys.map(key => {
          return lredis.hgetall(key);
        })).then(classes => {
          resolve(classes);
        })
      })
    })
  }
  createCharge(charge) {
    return new Promise((resolve, reject) => {
      client.incr(CHARGE_ID, (err, id) => {
        if (err) resolve({ success: false, message: strings.string_response_error });
        charge.id = id;
        client.hmset(PREFIX + id, charge);
        resolve({ success: true, message: strings.string_response_added });
      });
    });
  }
  updateCharge(id, charge) {
    return new Promise((resolve, reject) => {
      client.exists(PREFIX + id, (err, exist) => {
        if (err) resolve({ success: false, message: strings.string_response_error });
        if (Number(exist) == 1) {
          client.hmset(PREFIX + id, charge);
          resolve({ success: true, message: strings.string_response_updated });
        } else
          resolve({ success: false, message: strings.string_not_found_service_charge });
      })
    })
  }
  removeCharge(id) {
    return new Promise((resolve, reject) => {
      this.getCharge(id).then(charge => {
        if (charge.id == undefined) {
          resolve({ success: false, message: strings.string_not_found_service_charge });
        } else {
          client.del(PREFIX + id);
          resolve({ success: true, message: strings.string_response_removed });
        }
      })
    })
  }
  removeAll() {
    return new Promise((resolve, reject) => {
      client.set(CHARGE_ID, 0);
      client.keys(PREFIX + '*', (err, keys) => {
        if (err) resolve([]);
        Promise.all(keys.map(key => {
          return lredis.del(key);
        })).then(classes => {
          resolve(classes);
        })
      })
    });
  }
}

//========== DB Structure ==========//
// id:
// name:
// amount:

module.exports = ChargeService;