const strings = require('../Res/strings');

// Redis
// var client = require('./dataContext').redisClient;
// var lredis = require('./redis-local');

// const PREFIX = strings.redis_prefix_pilot;
// const PILOT_ID = strings.redis_id_pilot;
// const PILOT_LIST = strings.redis_prefix_pilot_list;

const Pilot = require('../models/pilot');

class PilotService {
  addPilot(pilot) {
    return new Promise((resolve, reject) => {
      let newPilot = new Pilot(pilot);
      newPilot.save((err, result) => {
        if (err) {
          resolve({ success: false, message: strings.string_response_error});
        } else {
          resolve({ 
            success: true, 
            message: strings.string_response_added, 
            pilot: result
          });
        }
      })
    })
  }
  updatePilot(id, pilot) {
    return new Promise(async(resolve, reject) => {
      Pilot.findOneAndUpdate({_id: id}, pilot, (err, result) => {
        if (err) {
          resolve({ success: false, message: strings.string_response_error});
        } else {
          resolve({ success: true, message:  strings.string_response_updated});
        }
      })
    })
  }
  getPilots() {
    return new Promise(async(resolve, reject) => {
      let pilots = await Pilot.find({})
      resolve(pilots)
    })
  }
  getPilotsWarehouse(warehouse) {
    return new Promise(async(resolve, reject) => {
      let pilots = await Pilot.find({warehouse: warehouse})
      resolve(pilots)
    });
  }
  getPilot(id) {
    return new Promise((resolve, reject) => {
      Pilot.findOne({_id: id}).exec((err, result) => {
        if (err) {
          resolve({});
        } else {
          resolve(result)
        }
      });
    });
  }
  removePilot(id) {
    return new Promise((resolve, reject) => {
      Pilot.deleteOne({_id: id}, (err, result) => {
        if (err) {
          resolve({ success: false, message: strings.string_response_error });
        } else {
          resolve({ success: true, message: strings.string_response_removed });
        }
      })
    });
  }
}

module.exports = PilotService;