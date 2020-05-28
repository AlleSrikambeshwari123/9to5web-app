const strings = require('../Res/strings');
const csv = require('csvtojson');

// var client = require('./dataContext').redisClient;
// var lredis = require('./redis-local');
// const PREFIX = strings.redis_prefix_service_type;
// const SERVICETYPE_ID = strings.redis_id_service_type;

const ServiceType = require('../models/serviceType');

class ServiceTypeService {
  // importServiceTypeFromCsv() {
  //   return new Promise((resolve, reject) => {
  //     this.removeAll().then(result => {
  //       csv().fromFile("./DB_Seed/-----.csv").then(jsonObj => {
  //         Promise.all(jsonObj.map(element => {
  //           console.log(element.sCarrierName);
  //           client.incr(SERVICETYPE_ID, (err, id) => {
  //             return lredis.hmset(PREFIX + id, {
  //               id: id,
  //               name: element.sCarrierName,
  //               amount: element.Amount,
  //             });
  //           });
  //         })).then(result => {
  //           resolve(result);
  //         })
  //       })
  //     })
  //   });
  // }

  addServiceType(serviceType) {
    return new Promise((resolve, reject) => {
      const newServiceType = new ServiceType(serviceType);
      newServiceType.save((err, result) => {
        if (err) {
          resolve({ success: false, message: strings.string_response_error });
        } else {
          serviceType['id'] = serviceType['_id'];
          resolve({ success: true, message: strings.string_response_added, serviceType: serviceType });
        }
      });
    })
  }
  updateServiceType(id, body) {
    return new Promise((resolve, reject) => {
      ServiceType.findOneAndUpdate({_id: id}, {name: body.name, amount: body.amount}, (err, result) => {
        if (err) {
          resolve({ success: false, message: strings.string_response_error });
        } else {
          resolve({ success: true, message: strings.string_not_found_customer });
        }
      });
    })
  }
  removeServiceType(id) {
    return new Promise((resolve, reject) => {
      ServiceType.deleteOne({_id: id}, (err, result) => {
        if (err) {
          resolve({ success: false, message: strings.string_response_error });
        } else {
          resolve({ success: true, message: strings.string_response_removed });
        }
      })
    });
  }
  getServiceType(id) {
    return new Promise((resolve, reject) => {
      ServiceType.findOne({_id: id}, (err, result) => {
        if (err) {
          resolve({});
        } else {
          resolve(result);
        }
      })
    });
  }
  getAllServiceTypes() {
    return new Promise((resolve, reject) => {
      ServiceType.find({}, (err, result) => {
        if (err) {
          resolve([]);
        } else {
          resolve(result);
        }
      })
    })
  }
  removeAll() {
    return new Promise((resolve, reject) => {
      PaidType.deleteMany({}, (err, result) => {
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
// amount:

module.exports = ServiceTypeService;