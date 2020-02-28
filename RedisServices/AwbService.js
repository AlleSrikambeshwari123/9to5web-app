var moment = require("moment");
var strings = require('../Res/strings');

var lredis = require("./redis-local");
var client = require('./dataContext').redisClient;

const INIT_AWB_ID = strings.redis_id_awb_init
const PREFIX = strings.redis_prefix_awb;
const AWB_ID = strings.redis_id_awb;
const PREFIX_NO_DOCS_LIST = strings.redis_prefix_no_docs_list;

class AwbService {
  constructor() {
    this.services = {};
  }

  setServiceInstances(services) {
    this.services = services;
  }

  resetAwbId() {
    return new Promise((resolve, reject) => {
      client.set(AWB_ID, INIT_AWB_ID);
      resolve({ success: true });
    });
  }
  generateAwbId() {
    return new Promise((resolve, reject) => {
      client.exists(AWB_ID, (err, exist) => {
        if (Number(exist) != 1) {
          client.set(AWB_ID, INIT_AWB_ID, (err, result) => {
            client.incr(AWB_ID, (err, newId) => {
              resolve({ awb: newId })
            })
          })
        } else {
          client.incr(AWB_ID, (err, newId) => {
            resolve({ awb: newId })
          })
        }
      })
    });
  }

  createAwb(awb) {
    return new Promise((resolve, reject) => {
      this.generateAwbId().then(result => {
        // awb.created_by = awb.username;
        awb.id = result.awb;
        awb.dateCreated = moment().utc().unix();
        awb.status = 1;
        if (awb.invoice)
          awb.hasDocs = 1;
        else {
          awb.hasDocs = 0;
          client.sadd(PREFIX_NO_DOCS_LIST, awb.id);
        }
        client.hmset(PREFIX + awb.id, awb);
        resolve({ success: true, message: strings.string_response_created, awb: awb });
      })
    });
  }

  updateAwb(id, awb) {
    return new Promise((resolve, reject) => {
      // awb.updated_by = awb.username;
      awb.dateUpdated = moment().utc().unix();
      client.hmset(PREFIX + id, awb);
      resolve({ success: true, message: strings.string_response_updated });
    });
  }

  deleteAwb(awbId) {
    return new Promise((resolve, reject) => {
      client.del(PREFIX + awbId);
      client.srem(PREFIX_NO_DOCS_LIST, awbId);
      resolve({ success: true, message: strings.string_response_removed });
    });
  }

  getAwb(id) {
    return new Promise((resolve, reject) => {
      client.hgetall(PREFIX + id, (err, awb) => {
        if (err || !awb || awb == null) resolve({});
        else {
          this.services.customerService.getCustomer(awb.customerId).then(customer => {
            awb.customer = customer;
            resolve(awb);
          })
        }
      })
    });
  }

  getAwbs() {
    return new Promise((resolve, reject) => {
      client.keys(PREFIX + '*', (err, keys) => {
        if (err) resolve([]);
        Promise.all(keys.map(key => {
          return lredis.hgetall(key);
        })).then(awbs => {
          resolve(awbs);
        })
      })
    });
  }

  getAwbsNoDocs() {
    return new Promise((resolve, reject) => {
      client.smembers(PREFIX_NO_DOCS_LIST, (err, ids) => {
        if (err) resolve([]);
        Promise.all(ids.map(id => {
          return lredis.hgetall(PREFIX + id);
        })).then(awbs => {
          resolve(awbs);
        })
      })
    });
  }

  getFullAwb(id) {
    return new Promise((resolve, reject) => {
      Promise.all([
        this.getAwb(id),
        this.services.packageService.getPackages(id),
      ]).then(results => {
        let awb = results[0];
        let packages = results[1];
        Promise.all([
          this.services.customerService.getCustomer(awb.customerId),
          this.services.shipperService.getShipper(awb.shipper),
          this.services.carrierService.getCarrier(awb.carrier),
          this.services.hazmatService.getHazmat(awb.hazmat),
        ]).then(otherInfos => {
          awb.packages = packages;
          awb.customer = otherInfos[0];
          delete awb.customer.password;
          delete awb.customer.confirmPassword;
          awb.shipper = otherInfos[1];
          awb.carrier = otherInfos[2];
          awb.hazmat = otherInfos[3];

          resolve(awb);
        })
      });
    });
  }
}

//========== DB Structure ==========//
// customerId: '2',
// shipper: shipperId
// carrier: carrierId
// hazmat: hazmatId
// note: 'Test',
// invoiceNumber: '1234',
// value: '500',
// isSed: '0',
// packages: [],
// invoice: '8k71navk6b7qx6p_1581022117.png',
// id: '100006',
// dateCreated: '1581022119',
// status: '1',
// hasDocs: '1',

module.exports = AwbService;