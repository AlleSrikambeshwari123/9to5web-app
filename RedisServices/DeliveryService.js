var moment = require("moment");
const strings = require('../Res/strings');

var client = require('./dataContext').redisClient;
var lredis = require("./redis-local");

const PREFIX = strings.redis_prefix_delivery;
const ID_DELIVERY = strings.redis_id_delivery;
const DELIVERY_SET = strings.redis_prefix_delivery_package_list;

const Delivery = require('../models/delivery');
const Package = require('../models/package');

class DeliveryService {
  constructor() {
    this.services = {};
  }

  setServiceInstances(services) {
    this.services = services;
  }

  createDelivery(delivery) {
    delivery["status"] = 0;
    
    return new Promise((resolve, reject) => {
      let objDelivery = new Delivery(delivery);
      objDelivery.save((err, result) => {
        if (err) {
          resolve({ success: false, message: err});
        } else {
          resolve({ 
            success: true, 
            message: strings.string_response_added, 
            delivery: result
          });
        }
      })
    })
  }

  getDelivery(deliveryId) {
    return new Promise((resolve, reject) => {
      Delivery.findOne({_id: deliveryId}, (err, result) => {
        if (err) {
          resolve({});
        } else {
          resolve(result)
        }
      });
    });
  }

  getDeliveries() {
    return new Promise(async(resolve, reject) => {
      let deliveries = await Delivery.find({})
      resolve(deliveries)
    })
  }

  getDeliveriesFullData() {
    return new Promise(async(resolve, reject) => {
      Delivery.find({})
      .populate('locationId')
      .populate('deliveryId')
      .populate('vehicleId')
      .populate('driverId')
      .populate('packages')
      .populate('createdBy', 'username')
      .exec((err, deliveries) => {
        if (err) {
          return resolve([]);
        }

        deliveries = deliveries.map((delivery) => {
          delivery.location = delivery.locationId;
          delivery.driver = delivery.driverId;
          delivery.vehicle = delivery.vehicleId;
          return delivery;
        });

        resolve(deliveries);
      })
    })
  }  

  getFullDelivery(deliveryId) {
    return new Promise((resolve, reject) => {
      Delivery.findOne({_id: deliveryId})
      .populate('locationId')
      .populate('deliveryId')
      .populate('vehicleId')
      .populate('driverId')
      .populate('packages')
      .populate('createdBy', 'username')
      .exec((err, delivery) => {
        if (err) {
          return resolve({});
        }
        delivery.location = delivery.locationId;
        delivery.driver = delivery.driverId;
        delivery.vehicle = delivery.vehicleId;
        delivery.createdBy = delivery.createdBy && delivery.createdBy.username;
        resolve(delivery);
      })
    });
  }

  getOpenDeliveries() {
    return new Promise((resolve, reject) => {
      lredis.search(PREFIX, [{ field: 'status', value: '0' }]).then(deliveries => {
        resolve(deliveries);
      })
    })
  }

  sendDelivery(deliveryId) {
    return new Promise((resolve, reject) => {
      client.hmset(PREFIX + deliveryId, { status: 1 });
      resolve({ success: true, message: strings.string_response_updated });
    })
  }

  addPackagesToDelivery(deliveryId, packageIds) {
    return new Promise(async(resolve, reject) => {
      packageIds.forEach(async(id) => {
        Package.findOneAndUpdate({_id: id},{deliveryId: deliveryId}, (err, result) => {
          if (err) {
            resolve({ success: false, message: err});
          } else {
          }
        })
      })
      resolve({ success: true, message:  strings.string_response_updated});
    })

    // return new Promise((resolve, reject) => {
    //   client.sadd(DELIVERY_SET + deliveryId, packageIds, (err, reply) => {
    //     if (err) resolve({ success: false, message: strings.string_response_error });
    //     resolve({ success: true, message: strings.string_response_added });
    //   })
    // })
  }

  getDeliveryPackages(deliveryId) {
    return new Promise((resolve, reject) => {
      client.smembers(DELIVERY_SET + deliveryId, (err, packageIds) => {
        if (err) resolve([]);
        Promise.all(packageIds.map(id => this.services.packageService.getPackage(id))).then(packages => {
          resolve(packages)
        })
      })
    })
  }
}

//========== DB Structure ==========//
// id:
// locationId:
// driverId:
// vehicleId:
// createdBy:
// dateCreated:
// delivery_date:
// status:

module.exports = DeliveryService;