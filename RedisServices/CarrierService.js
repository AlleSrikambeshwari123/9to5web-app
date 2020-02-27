const strings = require('../Res/strings');
const csv = require('csvtojson');

var client = require('./dataContext').redisClient;
var lredis = require('./redis-local');

const PREFIX = strings.redis_prefix_carrier;
const CARRIER_ID = strings.redis_id_carrier;

class CarrierService {
  addCarrier(carrier) {
    return new Promise((resolve, reject) => {
      client.incr(CARRIER_ID, (err, id) => {
        if (err) resolve({ success: false, message: strings.string_response_error });
        carrier.id = id;
        client.hmset(PREFIX + id, carrier, (err, result) => {
          if (err) resolve({ success: false, message: strings.string_response_error });
          resolve({ success: true, message: strings.string_response_added, carrier: carrier });
        })
      })
    })
  }
  updateCarrier(id, body) {
    return new Promise((resolve, reject) => {
      client.exists(PREFIX + id, (err, exist) => {
        if (err) resolve({ success: false, message: strings.string_response_error });
        if (Number(exist) == 1) {
          client.hmset(PREFIX + id, body);
          resolve({ success: true, message: strings.string_response_updated });
        } else
          resolve({ success: true, message: strings.string_not_found_user });
      })
    })
  }
  removeCarrier(id) {
    return new Promise((resolve, reject) => {
      client.del(PREFIX + id, (err, result) => {
        if (err) resolve({ success: false, message: strings.string_response_error });
        resolve({ success: true, message: strings.string_response_removed });
      })
    });
  }
  getCarrier(id) {
    return new Promise((resolve, reject) => {
      client.hgetall(PREFIX + id, (err, carrier) => {
        if (err) resolve({});
        resolve(carrier);
      })
    });
  }
  getAllCarriers() {
    return new Promise((resolve, reject) => {
      client.keys(PREFIX + '*', (err, keys) => {
        if (err) resolve([]);
        Promise.all(keys.map(key => {
          return lredis.hgetall(key);
        })).then(carriers => {
          resolve(carriers);
        })
      })
    })
  }
  removeAll() {
    return new Promise((resolve, reject) => {
      client.set(CARRIER_ID, 0);
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
// firstName:
// lastName:
// telephone:
// email:
// fax:
// address:
// city:
// state:
// country:
// zipcode:

module.exports = CarrierService;