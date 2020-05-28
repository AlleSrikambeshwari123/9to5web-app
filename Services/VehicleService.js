
const strings = require('../Res/strings');

// var lredis = require('./redis-local');
// var client = require('./dataContext').redisClient;

// const PREFIX = strings.redis_prefix_vehicle;
// const VEHICLE_ID = strings.redis_id_vehicle;
// const VEHICLE_LIST = strings.redis_prefid_vehicle_list;

const Vehicle = require('../models/vehicle');

class VehicleService {
  addVehicle(vehicle) {
    return new Promise((resolve, reject) => {
      let newVehicle = new Vehicle(vehicle);
      newVehicle.save((err, result) => {
        if (err) {
          resolve({ success: false, message: strings.string_response_error});
        } else {
          resolve({ 
            success: true, 
            message: strings.string_response_added, 
            vehicle: result
          });
        }
      })
    })
  }
  updateVehicle(id, vehicle) {
    return new Promise((resolve, reject) => {
      Vehicle.findOneAndUpdate({_id: id}, vehicle, (err, result) => {
        if (err) {
          resolve({ success: false, message: strings.string_response_error});
        } else {
          resolve({ success: true, message:  strings.string_response_updated});
        }
      })
    })
  }
  removeVehicle(id) {
     return new Promise((resolve, reject) => {
      Vehicle.deleteOne({_id: id}, (err, result) => {
        if (err) {
          resolve({ success: false, message: strings.string_response_error });
        } else {
          resolve({ success: true, message: strings.string_response_removed });
        }
      })
    });
  }
  getVehicle(id) {
    return new Promise((resolve, reject) => {
      Vehicle.findOne({_id: id}).exec((err, result) => {
        if (err) {
          resolve({});
        } else {
          resolve(result)
        }
      });
    });
  }
  getVehicles() {
    return new Promise(async(resolve, reject) => {
      let vehicles = await Vehicle.find({})
      resolve(vehicles)
    })
  }
  getVehiclesByLocation(location) {
    return new Promise(async(resolve, reject) => {
      let vehicles = await Vehicle.find({location: location})
      resolve(vehicles)
    });
  }
}

//========== DB Structure ==========//
// id:
// vehicle_make:
// model:
// registration:
// driverId:
// location

module.exports = VehicleService;