const Promise = require('bluebird');
var moment = require("moment");
var strings = require('../Res/strings');

var lredis = require("./redis-local");
var client = require('./dataContext').redisClient;

const INIT_AWB_ID = strings.redis_id_awb_init
const PREFIX = strings.redis_prefix_awb;
const AWB_ID = strings.redis_id_awb;
const PREFIX_NO_DOCS_LIST = strings.redis_prefix_no_docs_list;
const PREFIX_AWBPO = strings.redis_prefix_awbpo;
const AWBPO_ID = strings.redis_id_awbpo;

const DELIVERY_METHODS = {
  DELIVERY: 1,
  PICKUP: 2,
};

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

  createPO(order) {
    return new Promise((resolve, reject) => {
      client.incr(AWBPO_ID, (err, id) => {
        if (err) resolve({ success: false, message: strings.string_response_error });
        order.id = id;
        client.hmset(PREFIX_AWBPO + id, order, (err, result) => {
          if (err) resolve({ success: false, message: strings.string_response_error });
          resolve({ success: true, message: strings.string_response_added, order: order });
        })
      })
    })
  }

  getAllPO() {
    return new Promise((resolve, reject) => {
      client.keys(PREFIX_AWBPO + '*', (err, keys) => {
        if (err) resolve([]);
        Promise.all(keys.map(key => {
          return lredis.hgetall(key);
        })).then(awbpos => {
          resolve(awbpos);
        })
      })
    });
  }

  updatePO(id, body) {
    return new Promise((resolve, reject) => {
      client.exists(PREFIX_AWBPO + id, (err, exist) => {
        if (err) resolve({ success: false, message: strings.string_response_error });
        if (Number(exist) == 1) {
          client.hmset(PREFIX_AWBPO + id, body);
          client.hgetall(PREFIX_AWBPO + id, (err, awbpoupd) => {
            if (err) resolve({});
            resolve({ success: true, message: strings.string_response_updated, awbpoupd: awbpoupd });
          })
        } else
          resolve({ success: true, message: strings.string_not_found_customer });
      })
    })
  }

  deletePO(id, ids) {
    return new Promise((resolve, reject) => {
      client.hgetall(PREFIX_AWBPO + id, (err, awbpo) => {
        if (err) resolve({});
        awbpo['serviceTypes['+ids+'][charge]'] = 'empty';
        awbpo['serviceTypes['+ids+'][amount]'] = 'empty';
        client.exists(PREFIX_AWBPO + id, (err, exist) => {
          if (err) resolve({ success: false, message: strings.string_response_error });
          if (Number(exist) == 1) {
            client.hmset(PREFIX_AWBPO + id, awbpo);
            resolve({ success: true, message: strings.string_response_updated });
          } else
            resolve({ success: true, message: strings.string_not_found_customer });
        })
        resolve({ success: true, awbpo: awbpo });
      })
    });
  }

  getPO(id) {
    return new Promise((resolve, reject) => {
      client.hgetall(PREFIX_AWBPO + id, (err, awbpo) => {
        if (err) resolve({});
        resolve(awbpo);
      })
    });
  }

  updateAwb(id, awb) {
    return new Promise((resolve, reject) => {
      // awb.updated_by = awb.username;
      awb.dateUpdated = moment().utc().unix();
      client.hmset(PREFIX + id, awb);
      resolve({ success: true, message: strings.string_response_updated, awb:{id} });
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

  async getAwbsNoDocsIds() {
    const ids = await Promise.fromCallback(cb => client.smembers(PREFIX_NO_DOCS_LIST, cb));
    return ids;
  }

  async getAwbsNoDocs() {
    try {
      const ids = await this.getAwbsNoDocsIds();
      return await Promise.all(ids.map(id => {
        return lredis.hgetall(PREFIX + id);
      }));
    } catch (err) {
      return [];
    }
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
// deliveryMethod: number, see DELIVERY_METHODS

module.exports = AwbService;
