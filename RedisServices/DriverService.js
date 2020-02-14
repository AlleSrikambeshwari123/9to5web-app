'use strict';

const strings = require('../Res/strings');

var client = require('./dataContext').redisClient;
var lredis = require('./redis-local');

var PREFIX = strings.redis_prefix_driver;
var DRIVER_ID = strings.redis_id_driver;

class DriverService {
  getDrivers() {
    return new Promise((resolve, rejct) => {
      client.keys(PREFIX + '*', (err, keys) => {
        if (err) resolve([]);
        Promise.all(keys.map(key => {
          return lredis.hgetall(key);
        })).then(drivers => {
          resolve(drivers);
        })
      })
    });
  }
  getDriver(driverId) {
    return new Promise((resolve, reject) => {
      client.hgetall(PREFIX + driverId, (err, driver) => {
        if (err) resolve({});
        resolve(driver);
      })
    });
  }
  createDriver(driver) {
    return new Promise((resolve, reject) => {
      client.incr(DRIVER_ID, (err, id) => {
        if (err) resolve({ success: false, message: strings.string_response_error });
        driver.id = id;
        client.hmset(PREFIX + id, driver);
        resolve({ success: true, message: strings.string_response_added });
      });
    });
  }
  updateDriver(id, driver) {
    return new Promise((resolve, reject) => {
      client.exists(PREFIX + id, (err, exist) => {
        if (err) resolve({ success: false, message: strings.string_response_error });
        if (Number(exist) == 1) {
          client.hmset(PREFIX + id, driver);
          resolve({ success: true, message: strings.string_response_updated });
        } else
          resolve({ success: false, message: strings.string_not_found_driver });
      })
    })
  }
  removeDriver(id) {
    return new Promise((resolve, reject) => {
      client.del(PREFIX + id);
      resolve({ success: true, message: strings.string_response_removed });
    })
  }
}

//========== DB Structure =========//
// id:

module.exports = DriverService;