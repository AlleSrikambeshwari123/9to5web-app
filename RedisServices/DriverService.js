'use strict';

const strings = require('../Res/strings');

var client = require('./dataContext').redisClient;
var lredis = require('./redis-local');
const Driver = require('../models/Driver');

const PREFIX = strings.redis_prefix_driver;
const DRIVER_ID = strings.redis_id_driver;
const DRIVER_LIST = strings.redis_prefix_driver_list;

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
        if(err){
          resolve({});
        }else{
          resolve(result)
        }
      });
    });
  }
  createDriver(driver) {
    return new Promise((resolve, reject) => {
      let obj_driver = new Driver(driver);
      obj_driver.save((err, result) => {
        if (err) {
          resolve({ success: false, message: err});
        } else {
          resolve({ success: true, message: strings.string_response_added, driver: result});
        }
      })
    });
  }
  updateDriver(id, driver) {
    return new Promise(async(resolve, reject) => {
      Driver.findOneAndUpdate({_id: id},driver, (err, result) => {
          if (err) {
            resolve({ success: false, message: err});
          } else {
            resolve({ success: true, message:  strings.string_response_updated});
          }
      })
    })
  }
  removeDriver(id) {
    return new Promise((resolve, reject) => {
      Driver.deleteOne({_id: id}, (err, result) => {
          if (err) {
            resolve({ success: false, message: err });
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