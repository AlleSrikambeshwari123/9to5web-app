const strings = require('../Res/strings');
const csv = require('csvtojson');

var client = require('./dataContext').redisClient;
var lredis = require('./redis-local');

const PREFIX = strings.redis_prefix_airline;
const AIRLINE_ID = strings.redis_id_airline;

class AirlineService {
  importAirlinesFromCsv() {
    return new Promise((resolve, reject) => {
      this.removeAll().then(result => {
        csv().fromFile("./DB_Seed/----.csv").then(jsonObj => {
          Promise.all(jsonObj.map(element => {
            console.log(element.sCarrierName);
            client.incr(AIRLINE_ID, (err, id) => {
              return lredis.hmset(PREFIX + id, {
                id: id,
                name: element.sCarrierName,
                firstName: element.sContactFirstName,
                lastName: element.sContactLastName,
              });
            });
          })).then(result => {
            resolve(result);
          })
        })
      })
    });
  }

  addAirline(airline) {
    return new Promise((resolve, reject) => {
      client.incr(AIRLINE_ID, (err, id) => {
        if (err) resolve({ success: false, message: strings.string_response_error });
        airline.id = id;
        client.hmset(PREFIX + id, airline, (err, result) => {
          if (err) resolve({ success: false, message: strings.string_response_error });
          resolve({ success: true, message: strings.string_response_added, shipper: shipper });
        })
      })
    })
  }
  updateAirline(id, body) {
    return new Promise((resolve, reject) => {
      client.exists(PREFIX + id, (err, exist) => {
        if (err) resolve({ success: false, message: strings.string_response_error });
        if (Number(exist) == 1) {
          client.hmset(PREFIX + id, body);
          resolve({ success: true, message: strings.string_response_updated });
        } else
          resolve({ success: true, message: strings.string_not_found_customer });
      })
    })
  }
  removeAirline(id) {
    return new Promise((resolve, reject) => {
      client.del(PREFIX + id, (err, result) => {
        if (err) resolve({ success: false, message: strings.string_response_error });
        resolve({ success: true, message: strings.string_response_removed });
      })
    });
  }
  getAirline(id) {
    return new Promise((resolve, reject) => {
      client.hgetall(PREFIX + id, (err, airline) => {
        if (err) resolve({});
        resolve(airline);
      })
    });
  }
  getAllAirlines() {
    return new Promise((resolve, reject) => {
      client.keys(PREFIX + '*', (err, keys) => {
        if (err) resolve([]);
        Promise.all(keys.map(key => {
          return lredis.hgetall(key);
        })).then(airlines => {
          resolve(airlines);
        })
      })
    })
  }
  removeAll() {
    return new Promise((resolve, reject) => {
      client.set(AIRLINE_ID, 0);
      client.keys(PREFIX + '*', (err, keys) => {
        if (err) resolve([]);
        Promise.all(keys.map(key => {
          return lredis.del(key);
        })).then(result => {
          resolve(result);
        })
      })
    });
  }
}

//========== DB Structure ==========//
// id:
// name:
// firstName:
// lastName:

module.exports = AirlineService;