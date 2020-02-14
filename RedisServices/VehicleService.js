
const strings = require('../Res/strings');

var lredis = require('./redis-local');
var client = require('./dataContext').redisClient;

const PREFIX = strings.redis_prefix_vehicle;
const VEHICLE_ID = strings.redis_id_vehicle;

class VehicleService {
  addVehicle(vehicle) {
    return new Promise((resolve, reject) => {
      client.incr(VEHICLE_ID, (err, id) => {
        if (err) resolve({ success: false, message: strings.string_response_error });
        vehicle.id = id;
        client.hmset(PREFIX + id, vehicle);
        resolve({ success: true, message: strings.string_response_added });
      })
    })
  }
  updateVehicle(id, vehicle) {
    return new Promise((resolve, reject) => {
      client.exists(PREFIX + id, (err, exist) => {
        if (err) resolve({ success: false, message: strings.string_response_error });
        if (Number(exist) == 1) {
          client.hmset(PREFIX + id, vehicle);
          resolve({ success: true, message: strings.string_response_updated });
        } else
          resolve({ success: false, message: strings.string_not_found_vehicle });
      })
    })
  }
  removeVehicle(id) {
    return new Promise((resolve, reject) => {
      client.del(PREFIX + id);
      resolve({ success: true, message: strings.string_response_removed });
    })
  }
  getVehicle(id) {
    return new Promise((resolve, reject) => {
      client.hgetall(PREFIX + id, (err, vehicle) => {
        if (err) resolve({});
        resolve(vehicle);
      })
    })
  }
  getVehicles() {
    return new Promise((resolve, reject) => {
      client.keys(PREFIX + '*', (err, keys) => {
        if (err) resolve([]);
        Promise.all(keys.map(key => {
          return lredis.hgetall(key);
        })).then(vehicles => {
          resolve(vehicles);
        })
      })
    })
  }
  getVehiclesByCountry(country) {
    return new Promise((resolve, reject) => {
      lredis.search(PREFIX, 'country', country).then(vehicles => {
        resolve(vehicles);
      })
    })
  }
}

module.exports = VehicleService;