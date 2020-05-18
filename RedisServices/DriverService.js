'use strict';

const strings = require('../Res/strings');

var client = require('./dataContext').redisClient;
var lredis = require('./redis-local');

const PREFIX = strings.redis_prefix_driver;
const DRIVER_ID = strings.redis_id_driver;
const DRIVER_LIST = strings.redis_prefix_driver_list;

const Driver = require('../models/driver');

class DriverService {
  getDrivers() {
   return new Promise(async(resolve, reject) => {
      let drivers = await Driver.find({})
      resolve(drivers)
    })
  }
  getLocationDrivers(location) {
    return new Promise(async(resolve, reject) => {
      let drivers = await Driver.find({location: location})
      resolve(drivers)
    });
  }
  getDriver(driverId) {
    return new Promise((resolve, reject) => {
      Driver.findOne({_id: driverId}).exec((err, result) => {
        if (err) {
          resolve({});
        } else {
          resolve(result)
        }
      });
    });
  }
  createDriver(driver) {
    return new Promise((resolve, reject) => {
      let newDriver = new Driver(driver);
      newDriver.save((err, result) => {
        if (err) {
          console.log(err);
          resolve({ success: false, message: strings.string_response_error});
        } else {
          resolve({ 
            success: true, 
            message: strings.string_response_added, 
            driver: result
          });
        }
      })
    });
  }
  updateDriver(id, driver) {
    return new Promise(async(resolve, reject) => {
      Driver.findOneAndUpdate({_id: id}, driver, (err, result) => {
        if (err) {
          resolve({ success: false, message: strings.string_response_error});
        } else {
          resolve({ success: true, message: strings.string_response_updated});
        }
      })
    })
  }
  removeDriver(id) {
    return new Promise((resolve, reject) => {
      Driver.deleteOne({_id: id}, (err, result) => {
        if (err) {
          resolve({ success: false, message: strings.string_response_error });
        } else {
          resolve({ success: true, message: strings.string_response_removed });
        }
      })
    });
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