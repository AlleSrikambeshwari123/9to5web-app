const strings = require('../Res/strings');

var lredis = require('./redis-local');
var client = require('./dataContext').redisClient;
const PREFIX = strings.redis_prefix_location;
const ID_COUNTER = strings.redis_id_location;

class LocationService {
  getLocations() {
    return new Promise((resolve, reject) => {
      client.keys(PREFIX + '*', (err, keys) => {
        if (err) resolve([]);
        console.log(keys);
        Promise.all(keys.map(key => {
          return lredis.hgetall(key);
        })).then(locations => {
          resolve(locations);
        })
      })
    })
  }
  addLocation(location) {
    return new Promise((resolve, reject) => {
      client.incr(ID_COUNTER, (err, id) => {
        if (err) resolve({ success: false, message: strings.string_response_error });
        location.id = id;
        client.hmset(PREFIX + id, location, (err, result) => {
          if (err) resolve({ success: false, message: strings.string_response_error });
          resolve({ success: true, message: strings.string_response_created });
        })
      })
    });
  }
  getLocation(id) {
    return new Promise((resolve, reject) => {
      client.hgetall(PREFIX + id, (err, location) => {
        if (err) resolve({});
        resolve(location);
      })
    })
  }
  updateLocation(location) {
    return new Promise((resolve, reject) => {
      client.exists(PREFIX + location.id, (err, exist) => {
        if (Number(exist) == 1) {
          client.hmset(PREFIX + location.id, location);
          resolve({ success: true, message: strings.string_response_updated });
        } else {
          resolve({ success: false, message: strings.string_response_error });
        }
      })
    });
  }
  removeLocation(id) {
    return new Promise((resolve, reject) => {
      client.del(PREFIX + id);
      resolve({ success: true, message: strings.string_response_removed });
    })
  }
}

module.exports = LocationService;