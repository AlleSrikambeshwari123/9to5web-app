const strings = require('../Res/strings');
const csv = require('csvtojson');

var client = require('./dataContext').redisClient;
var lredis = require('./redis-local');

const PREFIX = strings.redis_prefix_carrier;
const CARRIER_ID = strings.redis_id_carrier;

const Carrier = require('../models/carrier');

class CarrierService {
  addCarrier(carrier) {
    return new Promise((resolve, reject) => {
      let newCarrier = new Carrier(carrier);
      newCarrier.save((err, result) => {
        if (err) {
          resolve({ success: false, message: strings.string_response_error});
        } else {
          resolve({ 
            success: true, 
            message: strings.string_response_added, 
            carrier: result
          });
        }
      })
    })
  }
  updateCarrier(id, body) {
    return new Promise(async(resolve, reject) => {
      Carrier.findOneAndUpdate({_id: id}, body, (err, result) => {
        if (err) {
          resolve({ success: false, message: strings.string_response_error});
        } else {
          resolve({ success: true, message: strings.string_response_updated });
        }
      })
    })
  }
  removeCarrier(id) {
    return new Promise((resolve, reject) => {
      Carrier.deleteOne({_id: id}, (err, result) => {
        if (err) {
          resolve({ success: false, message: strings.string_response_error });
        } else {
          resolve({ success: true, message: strings.string_response_removed });
        }
      })
    });
  }
  getCarrier(id) {
    return new Promise((resolve, reject) => {
      Carrier.findOne({_id: id}).exec((err, result) => {
        if (err) {
          resolve({});
        } else {
          resolve(result)
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
    return new Promise((resolve, reject) => {
      Carrier.deleteMany({}, (err, result) => {
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