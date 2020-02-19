var moment = require("moment");
const strings = require('../Res/strings');

var client = require('./dataContext').redisClient;
var lredis = require("./redis-local");
var redisearch = require('./redisearch');

const PREFIX = strings.redis_prefix_delivery;
const ID_DELIVERY = strings.redis_id_delivery;
const DELIVERY_SET = strings.redis_prefix_delivery_package_list;

class DeliveryService {
  constructor() {
    this.services = {};
  }

  setServiceInstances(services) {
    this.services = services;
  }

  createDelivery(delivery, username) {
    return new Promise((resolve, reject) => {
      client.incr(ID_DELIVERY, (err, id) => {
        if (err) resolve({ success: false, message: strings.string_response_error });

        delivery.id = id;
        delivery.status = 0;
        delivery.createdBy = username;
        delivery.dateCreated = moment().utc().unix();
        client.hmset(PREFIX + id, delivery);
        resolve({ success: true, message: strings.string_response_created });
      })
    })
  }

  getDelivery(deliveryId) {
    return new Promise((resolve, reject) => {
      client.hgetall(PREFIX + deliveryId, (err, delivery) => {
        if (err) resolve({});
        else resolve(delivery);
      })
    });
  }

  getDeliveries() {
    return new Promise((resolve, reject) => {
      client.keys(PREFIX + '*', (err, keys) => {
        if (err) resolve([]);
        Promise.all(keys.map(key => {
          return lredis.hgetall(key);
        })).then(deliveries => {
          resolve(deliveries);
        })
      })
    })
  }

  getFullDelivery(deliveryId) {
    return new Promise((resolve, reject) => {
      this.getDelivery(deliveryId).then(delivery => {
        Promise.all([
          this.services.locationService.getLocation(delivery.locationId),
          this.services.driverService.getDriver(delivery.driverId),
          this.services.vehicleService.getVehicle(delivery.vehicleId),
          this.getDeliveryPackages(deliveryId)
        ]).then(results => {
          delivery.location = results[0];
          delivery.driver = results[1];
          delivery.vehicle = results[2];
          delivery.packages = results[3];
          resolve(delivery);
        })
      })
    });
  }

  getOpenDeliveries() {
    return new Promise((resolve, reject) => {
      redisearch.search(PREFIX, [{ field: 'status', value: '0' }]).then(deliveries => {
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
    return new Promise((resolve, reject) => {
      client.sadd(DELIVERY_SET + deliveryId, packageIds, (err, reply) => {
        if (err) resolve({ success: false, message: strings.string_response_error });
        resolve({ success: true, message: strings.string_response_added });
      })
    })
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