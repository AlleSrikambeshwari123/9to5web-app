const strings = require('../Res/strings');

var lredis = require('./redis-local');
var client = require('./dataContext').redisClient;
const PREFIX = strings.redis_prefix_location;
const ID_COUNTER = strings.redis_id_location;

const Company = require('../models/company');
const Location = require('../models/location');

class LocationService {
  getLocations() {
    return new Promise((resolve, reject) => {
      Location.find({})
      .populate('company', 'name')
      .exec((err, result) => {
        if (err) {
          resolve([]);
        } else {
          resolve(result);
        }
      })
    })
  }
  getCompanies() {
    return new Promise((resolve, reject) => {
      Company.find({}, (err, result) => {
        if (err) {
          resolve([]);
        } else {
          resolve(result);
        }
      })
    });
  }
  addLocation(location) {
    return new Promise((resolve, reject) => {
      const newLocationData = new Location(location);
      newLocationData.save((err, result) => {
        if (err) {
          console.error(err);  
          resolve({ success: false, message: strings.string_response_error });
        } else {
          resolve({ success: true, message: strings.string_response_created });
        }
      })
    });
  }
  getLocation(id) {
    return new Promise((resolve, reject) => {
      Location.findOne({_id: id})
      .populate('company', 'name')
      .exec((err, result) => {
        if (err) {
          resolve({});
        } else {
          resolve(result);
        }
      });
    })
  }
  updateLocation(location) {
    return new Promise(async (resolve, reject) => {
      const locationData = await this.getLocation(location.id);
      if (!(locationData && locationData._id)) {
        return resolve({success: false, message: strings.string_not_found_location});
      }

      Location.findOneAndUpdate(
        { _id: locationData._id }, 
        { ...location },
        (err, result) => {
          if (err) {
            resolve({ success: false, message: strings.string_response_error });
          } else {
            resolve({ success: true, message: strings.string_response_updated });
          }
        }
      )
    });
  }
  removeLocation(id) {
    return new Promise((resolve, reject) => {
      Location.deleteOne({_id: id}, (err, result) => {
        if (err) {
          resolve({ success: false, message: strings.string_response_error });
        } else {
          resolve({ success: true, message: strings.string_response_removed });
        }
      });
    })
  }
}

//========== DB Structure ==========//
// id:
// phone:
// companyId:
// name:
// address:

module.exports = LocationService;