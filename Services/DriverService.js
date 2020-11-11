'use strict';

const strings = require('../Res/strings');

// var client = require('./dataContext').redisClient;
// var lredis = require('./redis-local');

// const PREFIX = strings.redis_prefix_driver;
// const DRIVER_ID = strings.redis_id_driver;
// const DRIVER_LIST = strings.redis_prefix_driver_list;

const Driver = require('../models/driver');

class DriverService {
  getDrivers() {
   return new Promise(async(resolve, reject) => {
      let drivers = await Driver.find({})
      resolve(drivers)
    })
  }
  getDriversList(req) {
    var start = req.body.start ? parseInt(req.body.start) : 0;
    var length = req.body.length ? parseInt(req.body.length) : 10;      
    var field = req.body['order[0][column]'] ?parseInt(req.body['order[0][column]']) : 0;
    var columns = {0:'firstName', 1: 'createdAt', 2: 'email', 3:'mobile', 4: 'location'} 
    
    var dir = req.body['order[0][dir]'] ? req.body['order[0][dir]'] : 0;
    var sort = (dir=='asc') ? 1 : -1;
    var sortField = columns[field];

    var search = req.body['search[value]'] ? req.body['search[value]'] : ''; 
    var searchData = {};

    //date range
    var daterange = req.body.daterange?req.body.daterange:''
    if(daterange){
      var date_arr = daterange.split('-');
      var startDate = (date_arr[0]).trim();      
      var stdate = new Date(startDate);
      stdate.setDate(stdate.getDate() +1);

      var endDate = (date_arr[1]).trim();
      var endate = new Date(endDate);
      endate.setDate(endate.getDate() +1);     
      searchData.createdAt = {"$gte":stdate, "$lte": endate};
    }

    if(!req.body.daterange && !req.body.clear){
      var endate = new Date();      
      endate.setDate(endate.getDate()+1);
      var stdate = new Date();
      stdate.setDate(stdate.getDate() -21);      
      searchData.createdAt = {"$gte":stdate, "$lte": endate};
    }

    if(search){
      searchData.$or = [          
        {firstName:{'$regex' : search, '$options' : 'i'}},
        {lastName:{'$regex' : search, '$options' : 'i'}},
        {email:{'$regex' : search, '$options' : 'i'}},
        //{mobile:{'$regex' : search, '$options' : 'i'}},
        {location:{'$regex' : search, '$options' : 'i'}}
      ]
    }
    return new Promise(async(resolve, reject) => {

      var totalRecords = await Driver.countDocuments(searchData);
      console.log(totalRecords);
      if(totalRecords && totalRecords){
        let drivers = await Driver.find(searchData)
                                  .sort({[sortField]:sort})
                                  .skip(start)
                                  .limit(length)
        resolve({total: totalRecords, drivers: drivers});
      }else{
        resolve({total: 0, drivers: []})
      }
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