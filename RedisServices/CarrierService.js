const strings = require('../Res/strings');
const csv = require('csvtojson');

var client = require('./dataContext').redisClient;
var lredis = require('./redis-local');

const PREFIX = strings.redis_prefix_carrier;
const CARRIER_ID = strings.redis_id_carrier;
const Carrier = require('../models/Carrier');

class CarrierService {
  addCarrier(carrier) {
    console.log(carrier)
    return new Promise((resolve, reject) => {
     let obj_carrier = new Carrier(carrier);
     obj_carrier.save((err, result) => {
        if (err) {
          resolve({ success: false, message: err});
        } else {
          resolve({ success: true, message: "successfully added"});
        }
      })
    })
  }
  updateCarrier(id, body) {
    console.log(body)
    return new Promise(async(resolve, reject) => {
      Carrier.findOneAndUpdate({_id: id},body, (err, result) => {
          if (err) {
            resolve({ success: false, message: err});
          } else {
            resolve({ success: true, message: "successfully updated"});
          }
      })
    })
  }
  removeCarrier(id) {
   return new Promise((resolve, reject) => {
      Carrier.deleteOne({_id: id}, (err, result) => {
          if (err) {
            resolve({ success: false, message: err });
          } else {
            resolve({ success: true, message: "successfully removed"});
          }
      })
    
    });
  }
  getCarrier(id) {
    return new Promise((resolve, reject) => {
      Carrier.find({_id: id}).exec((err, result) => {
        if (err) {
          resolve({});
        } else {

          resolve(result[0])
        }
      });
    });
  }
  getAllCarriers() {
    return new Promise(async(resolve, reject) => {
      let carriers = await Carrier.find({})
      resolve(carriers)
    })
  }
  removeAll() {
    return new Promise(async(resolve, reject) => {
       await Carrier.remove()
       resolve(true)
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