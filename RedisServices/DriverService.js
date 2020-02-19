'use strict';

const strings = require('../Res/strings');

var client = require('./dataContext').redisClient;
var lredis = require('./redis-local');

const PREFIX = strings.redis_prefix_driver;
const DRIVER_ID = strings.redis_id_driver;
const DRIVER_LIST = strings.redis_prefix_driver_list;

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
  getLocationDrivers(location) {
    return new Promise((resolve, reject) => {
      client.smembers(DRIVER_LIST + location, (err, ids) => {
        if (err) resolve([]);
        else {
          Promise.all(ids.map(id => {
            return lredis.hgetall(PREFIX + id);
          })).then(drivers => {
            resolve(drivers);
          })
        }
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
        client.sadd(DRIVER_LIST + driver.location, id);
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
      this.getDriver(id).then(driver => {
        if (driver.id == undefined) {
          resolve({ success: false, message: strings.string_not_found_driver });
        } else {
          client.srem(DRIVER_LIST + driver.location, id);
          client.del(PREFIX + id);
          resolve({ success: true, message: strings.string_response_removed });
        }
      })
    })
  }
}

//========== DB Structure =========//
// id:
// firstName:
// lastName:
// mobile:
// email:
// location: 

module.exports = DriverService;