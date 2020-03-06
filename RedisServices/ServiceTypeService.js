const strings = require('../Res/strings');
const csv = require('csvtojson');

var client = require('./dataContext').redisClient;
var lredis = require('./redis-local');

const PREFIX = strings.redis_prefix_service_type;
const SERVICETYPE_ID = strings.redis_id_service_type;

class ServiceTypeService {
  importServiceTypeFromCsv() {
    return new Promise((resolve, reject) => {
      this.removeAll().then(result => {
        csv().fromFile("./DB_Seed/-----.csv").then(jsonObj => {
          Promise.all(jsonObj.map(element => {
            console.log(element.sCarrierName);
            client.incr(SERVICETYPE_ID, (err, id) => {
              return lredis.hmset(PREFIX + id, {
                id: id,
                name: element.sCarrierName,
                amount: element.Amount,
              });
            });
          })).then(result => {
            resolve(result);
          })
        })
      })
    });
  }

  addServiceType(serviceType) {
    return new Promise((resolve, reject) => {
      client.incr(SERVICETYPE_ID, (err, id) => {
        if (err) resolve({ success: false, message: strings.string_response_error });
        serviceType.id = id;
        client.hmset(PREFIX + id, serviceType, (err, result) => {
          if (err) resolve({ success: false, message: strings.string_response_error });
          resolve({ success: true, message: strings.string_response_added, serviceType: serviceType });
        })
      })
    })
  }
  updateServiceType(id, body) {
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
  removeServiceType(id) {
    return new Promise((resolve, reject) => {
      client.del(PREFIX + id, (err, result) => {
        if (err) resolve({ success: false, message: strings.string_response_error });
        resolve({ success: true, message: strings.string_response_removed });
      })
    });
  }
  getServiceType(id) {
    return new Promise((resolve, reject) => {
      client.hgetall(PREFIX + id, (err, serviceType) => {
        if (err) resolve({});
        resolve(serviceType);
      })
    });
  }
  getAllServiceTypes() {
    return new Promise((resolve, reject) => {
      client.keys(PREFIX + '*', (err, keys) => {
        if (err) resolve([]);
        Promise.all(keys.map(key => {
          return lredis.hgetall(key);
        })).then(serviceTypes => {
          resolve(serviceTypes);
        })
      })
    })
  }
  removeAll() {
    return new Promise((resolve, reject) => {
      client.set(SERVICETYPE_ID, 0);
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
// amount:

module.exports = ServiceTypeService;