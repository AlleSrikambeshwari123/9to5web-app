
var moment = require("moment");
var strings = require('../Res/strings');

var lredis = require("./redis-local");
var client = require('./dataContext').redisClient;

const INIT_AWB_ID = 1
const PREFIX = "awb:";
const AWB_ID = "id:awb";
const PREFIX_NO_DOCS_LIST = "list:awb:no";

var CustomerService = require('./CustomerService');
var customerService = new CustomerService()

class AwbService {
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

  getAwb(id) {
    return new Promise((resolve, reject) => {
      client.hgetall(PREFIX + id, (err, awb) => {
        if (err) resolve({});
        customerService.getCustomer(awb.customerId).then(customer => {
          awb.customer = customer;
          resolve(awb);
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
}

module.exports = AwbService;