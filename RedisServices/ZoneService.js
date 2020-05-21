const strings = require('../Res/strings');

var lredis = require('./redis-local');
var client = require('./dataContext').redisClient;
const PREFIX = strings.redis_prefix_location;
const ID_COUNTER = strings.redis_id_location;

const Location = require('../models/location');
const Zone = require('../models/zone');

class ZoneService {
  getZones() {
    return new Promise((resolve, reject) => {
      Zone.find()
      .populate('location')
      .exec((err, result) => {
        if (err) {
          resolve([]);
        } else {
            console.log(result)
          resolve(result);
        }
      })
    })
  }
  addZone(zone) {
    return new Promise((resolve, reject) => {
      const newZoneData = new Zone(zone);
      newZoneData.save((err, result) => {
        if (err) {
          console.error(err);  
          resolve({ success: false, message: strings.string_response_error });
        } else {
          resolve({ success: true, message: strings.string_response_created });
        }
      })
    });
  }
  getZone(id) {
    return new Promise((resolve, reject) => {
      Zone.findOne({_id: id})
      .populate('location', 'name')
      .exec((err, result) => {
        if (err) {
          resolve({});
        } else {
          resolve(result);
        }
      });
    })
  }
  updateZone(zone) {
    return new Promise(async (resolve, reject) => {
      const zoneData = await this.getZone(zone.id);
      if (!(zoneData && zoneData._id)) {
        return resolve({success: false, message: strings.string_not_found_location});
      }

      Zone.findOneAndUpdate(
        { _id: zoneData._id }, 
        zone,
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
  removeZone(id) {
    return new Promise((resolve, reject) => {
      Zone.deleteOne({_id: id}, (err, result) => {
        if (err) {
          resolve({ success: false, message: strings.string_response_error });
        } else {
          resolve({ success: true, message: strings.string_response_removed });
        }
      });
    })
  }
  getLocations(){
    return new Promise((resolve, reject) => {
        Location.find()
        .exec((err, result) => {
          if (err) {
            resolve([]);
          } else {
              console.log(result)
            resolve(result);
          }
        })
      })  
  }
}

module.exports = ZoneService;