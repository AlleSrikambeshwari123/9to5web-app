const Promise = require('bluebird');
var moment = require('moment');
var strings = require('../Res/strings');

// var lredis = require('./redis-local');
// var client = require('./dataContext').redisClient;

// const INIT_AWB_ID = strings.redis_id_awb_init;
// const PREFIX = strings.redis_prefix_awb;
// const AWB_ID = strings.redis_id_awb;
// const PREFIX_NO_DOCS_LIST = strings.redis_prefix_no_docs_list;

const Awb = require('../models/awb');
const Barcode = require('../models/barcode');
const PurchaseOrder = require('../models/purchaseOrder');

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

  // resetAwbId() {
  //   return new Promise((resolve, reject) => {
  //     client.set(AWB_ID, INIT_AWB_ID);
  //     resolve({ success: true });
  //   });
  // }
  // generateAwbId() {
  //   return new Promise((resolve, reject) => {
  //     client.exists(AWB_ID, (err, exist) => {
  //       if (Number(exist) != 1) {
  //         client.set(AWB_ID, INIT_AWB_ID, (err, result) => {
  //           client.incr(AWB_ID, (err, newId) => {
  //             resolve({ awb: newId });
  //           });
  //         });
  //       } else {
  //         client.incr(AWB_ID, (err, newId) => {
  //           resolve({ awb: newId });
  //         });
  //       }
  //     });
  //   });
  // }

  createAwb(awb) {
    return new Promise((resolve, reject) => {
      if (awb.hasOwnProperty && awb.hasOwnProperty('hazmat') && !awb['hazmat']) {
        delete awb.hazmat;
      }
      // awb.awbId = 'AWB' + Math.floor(100000 + Math.random() * 900000);
      const newAwb = new Awb(awb);
      newAwb.save((err, result) => {
        if (err) {
          resolve({ success: false, message: strings.string_response_error });
        } else {
          awb['id'] = result['_id'];
          resolve({ success: true, message: strings.string_response_created, awb: awb });
        }
      });
    });
  }

  async getPurchaseOrder(awbOrAWBId) {
    return new Promise((resolve, reject) => {
      PurchaseOrder.find({ awbId: awbOrAWBId }, (err, result) => {
        if (err) {
          resolve([]);
        } else {
          resolve(result);
        }
      });
    });
  }

  updateAwb(id, awb) {
    return new Promise((resolve, reject) => {
      if (awb.hasOwnProperty && awb.hasOwnProperty('hazmat') && !awb['hazmat']) {
        delete awb.hazmat;
      }
      Awb.findOneAndUpdate({ _id: id }, { ...awb }, (err, result) => {
        if (err) {
          resolve({ success: false });
        } else {
          resolve({ success: true });
        }
      });
    });
  }
  addAwbsPkgNoDocs(data,user){
    return new Promise((resolve, reject) => {
      let packageIds = data.packageIds.split(',')
      Awb.findOneAndUpdate({ _id: data.id }, {$push:{packages:packageIds}}, (err, result) => {
        if (err) {
          resolve({ success: false, message: strings.string_response_error });
        } else {
          resolve({ success: true, message: strings.string_response_updated });;
        }
      });
    });
  }
  // deleteAwb(awbId) {
  //   return new Promise((resolve, reject) => {
  //     client.del(PREFIX + awbId);
  //     client.srem(PREFIX_NO_DOCS_LIST, awbId);
  //     resolve({ success: true, message: strings.string_response_removed });
  //   });
  // }

  deleteAwb_updated(awbId) {
    return new Promise((resolve, reject) => {
      Awb.deleteOne({ _id: awbId }, (err, result) => {
        if (err) {
          resolve({ success: false, message: strings.string_response_error });
        } else {
          resolve({ success: true, message: strings.string_response_removed, data: result });
        }
      });
    });
  }

  getAwb(id) {
    return new Promise((resolve, reject) => {
      Awb.findOne({ _id: id }, (err, result) => {
        if (err) {
          resolve({});
        } else {
          resolve(result);
        }
      }).populate(['customerId', 'invoices']);
    });
  }

  // getAwbs() {
  //   return new Promise((resolve, reject) => {
  //     client.keys(PREFIX + '*', (err, keys) => {
  //       if (err) resolve([]);
  //       Promise.all(
  //         keys.map((key) => {
  //           return lredis.hgetall(key);
  //         })
  //       ).then((awbs) => {
  //         resolve(awbs);
  //       });
  //     });
  //   });
  // }

  getAwbsFull() {
    return new Promise((resolve, reject) => {
      Awb.find({})
        .populate('customerId')
        .populate('shipper')
        .populate('carrier')
        .populate('hazmat')
        .populate('packages')
        .populate('purchaseOrders')
        .populate('invoices')
        .exec((err, result) => {
          resolve(result);
        });
    });
  }

  getAwbPreviewDetails(id) {
    return new Promise((resolve, reject) => {
      Awb.findOne({ _id: id })
        .populate('customerId')
        .populate('shipper')
        .populate('carrier')
        .populate('hazmat')
        .populate('packages')
        .populate('purchaseOrders')
        .populate('invoices')
        .exec((err, result) => {
          if (result.customerId) {
            result.customer = result.customerId;
          }
          resolve(result);
        });
    });
  }

  // async getAwbsNoDocsIds() {
  //   const ids = await Promise.fromCallback((cb) => client.smembers(PREFIX_NO_DOCS_LIST, cb));
  //   return ids;
  // }

  async getInManifestNoInvoiceIds() {
    return new Promise((resolve, reject) => {
      Awb.find({ invoices: { $eq: [] } }, '_id').exec((err, awbData) => {
        if (err) {
          resolve([]);
        } else {
          awbData = awbData.map((data) => data['_id'].toString());
          resolve(awbData);
        }
      });
    });
  }

  async getAwbsNoDocs() {
    return new Promise((resolve, reject) => {
      Awb.find({ invoices: { $eq: [] } })
        .populate('customerId')
        .populate('shipper')
        .populate('carrier')
        .populate('packages')
        .populate('purchaseOrders')
        .exec((err, awbData) => {
          if (err) {
            resolve([]);
          } else {
            awbData.forEach((data) => {
              data['customer'] = data['customerId'];
              if (data['packages'] && data['packages'].length) {
                let weight = 0;
                data.packages.forEach((pkg) => (weight += Number(pkg.weight)));
                data['weight'] = weight;
              }
              data['dateCreated'] = moment(data['createdAt']).format('MMM DD, YYYY');
            });
            resolve(awbData);
          }
        });
    });
  }

  renameKey(obj, key, newKey) {
    const awb = Object.assign({}, obj);
    const customer = awb._doc[key];
    delete awb._doc[key];
    awb._doc[newKey] = customer;
    return awb._doc;
  }

  getFullAwb(id) {
    return new Promise((resolve, reject) => {
      Promise.all([this.getAwb(id), this.services.packageService.getPackages(id)]).then((results) => {
        let awb = results[0];
        let packages = results[1];
        Promise.all([
          this.services.customerService.getCustomer(awb.customerId),
          this.services.shipperService.getShipper(awb.shipper),
          this.services.carrierService.getCarrier(awb.carrier),
          this.services.hazmatService.getHazmat(awb.hazmat),
        ]).then((otherInfos) => {
          awb.packages = packages;
          awb.customerId = otherInfos[0];
          delete awb.customerId.password;
          awb.shipper = otherInfos[1];
          awb.carrier = otherInfos[2];
          awb.hazmat = otherInfos[3];
          resolve(this.renameKey(awb, 'customerId', 'customer'));
        });
      });
    });
  }

  createPurchaseOrders(awbId, purchaseOrders) {
    return new Promise((resolve, reject) => {
      Promise.all(
        purchaseOrders.map((pkg) => {
          return this.createPurchaseOrder(pkg, awbId);
        })
      ).then((result) => {
        resolve({ success: true });
      });
    });
  }

  createPurchaseOrder(newPackageOrder, awbId) {
    return new Promise((resolve, reject) => {
      newPackageOrder.awbId = awbId;
      const newPackageOrderData = new PurchaseOrder(newPackageOrder);
      newPackageOrderData.save((err, result) => {
        if (err) {
          resolve({ success: false, message: strings.string_response_error });
        } else {
          resolve({ success: true });
        }
      });
    });
  }

  updatePurchaseOrder(purchaseOrderId, purchaseOrderData) {
    return new Promise((resolve, reject) => {
      PurchaseOrder.findOneAndUpdate({ _id: purchaseOrderId }, { ...purchaseOrderData }, (err, result) => {
        if (err) {
          resolve({ success: false });
        } else {
          resolve({ success: true });
        }
      });
    });
  }

  removePurchaseOrder(id) {
    return new Promise((resolve, reject) => {
      PurchaseOrder.deleteOne({ _id: id }, (err, result) => {
        if (err) {
          resolve({ success: false, message: strings.string_response_error });
        } else {
          resolve(result);
        }
      });
    });
  }

  removePurchaseOrdersByAwb(awbId) {
    return new Promise((resolve, reject) => {
      PurchaseOrder.deleteMany({ awbId: awbId }, (err, result) => {
        if (err) {
          resolve({ success: false, message: strings.string_response_error });
        } else {
          resolve(result);
        }
      });
    });
  }

  addBarcode(detail) {
    console.log(detail);
    return new Promise((resolve, reject) => {
      const newBarcode = new Barcode({ barcode: detail.barcode });
      newBarcode.save((err, result) => {
        if (err) {
          resolve({ success: false, message: strings.string_response_error });
        } else {
          resolve({ success: true, data: result });
        }
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
// value: '500',
// isSed: '0',
// packages: [],
// id: '100006',
// dateCreated: '1581022119',
// status: '1',
// hasDocs: '1',
// deliveryMethod: number, see DELIVERY_METHODS

//========= DB Structure: Purchase order =========//
// source: "fll"
// paidTypeId: "5e8f17e2fcd7da7152d490ec"
// serviceTypeId: "5e8f17eafcd7da7152d490ed"
// notes: ""
// paidTypeText: "www"
// sourceText: "9-5 FLL"
// serviceTypeText: "wwww"
// amount: 0
// awbId: "5e8f17eafcd7da7152d770ed"

module.exports = AwbService;
