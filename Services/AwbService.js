const Promise = require('bluebird');
var moment = require('moment');
var strings = require('../Res/strings');

const Awb = require('../models/awb');
const StoreInvoice = require('../models/storeInvoice');
const AwbStatus = require('../models/awbStatus');
const Barcode = require('../models/barcode');
const PurchaseOrder = require('../models/purchaseOrder');

const Manifest = require('../models/manifest');
const Plane = require('../models/plane');
const User = require('../models/user');
const PriceLabel = require('../models/pricelabel');

const DELIVERY_METHODS = {
    DELIVERY: 1,
    PICKUP: 2,
};

const ACTION = {
    1: "Created",
    2: "Updated",
    3: "Deleted"
}

class AwbService {
    constructor() {
        this.services = {};
    }

    setServiceInstances(services) {
        this.services = services;
    }

    createAwb(awb) {
        return new Promise((resolve, reject) => {
            if (awb.hasOwnProperty && awb.hasOwnProperty('hazmat') && !awb['hazmat']) {
                delete awb.hazmat;
            }

            if (awb.driver === '') {
                delete awb.driver;
            }
            const newAwb = new Awb(awb);
            newAwb.save((err, result) => {
                if (err) {
                    console.log("<==== Error While Creating Awb ====> ", err);
                    resolve({ success: false, message: strings.string_response_error });
                } else {
                    this.updateAwbStatus(result, 1, awb['createdBy']);
                    awb['id'] = result['_id'];
                    resolve({ success: true, message: strings.string_response_created, awb: awb });
                }
            });
        });
    }

    async updateAwbStatus(awb, action, userId) {
        return new Promise((resolve, reject) => {
            const awbstatus = {
                awbId: awb['_id'],
                awbGeneratedId: awb['awbId'],
                action: ACTION[action],
                User: userId
            };
            const newAwbStatus = new AwbStatus(awbstatus);
            newAwbStatus.save((err, result) => {
                if (err) {
                    console.log("<==== Error While Updating status of Awb ====> ", err);
                    resolve([]);
                } else {
                    resolve(result);
                }
            })
        });
    }

    async getAwbStatuses() {
        return new Promise((resolve, reject) => {
            AwbStatus.find({}, (err, result) => {
                if (err) {
                    resolve([]);
                } else {
                    resolve(result);
                }
            }).populate('User');
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

    updateAwb(id, awb, userId) {
        return new Promise((resolve, reject) => {
            if (awb.hasOwnProperty && awb.hasOwnProperty('hazmat') && !awb['hazmat']) {
                delete awb.hazmat;
            }
            Awb.findOneAndUpdate({ _id: id }, {...awb }, (err, result) => {
                if (err) {
                    resolve({ success: false });
                } else {
                    this.updateAwbStatus(result, 2, userId);
                    resolve({ success: true });
                }
            });
        });
    }
    addAwbsPkgNoDocs(data, user) {
        return new Promise((resolve, reject) => {
            let packageIds = data.packageIds.split(',')
            Awb.findOneAndUpdate({ _id: data.id }, { $push: { packages: packageIds } }, (err, result) => {
                if (err) {
                    resolve({ success: false, message: strings.string_response_error });
                } else {
                    resolve({ success: true, message: strings.string_response_updated });;
                }
            });
        });
    }
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
            Awb.findOne({ _id: id })
                .exec((err, result) => {
                    if (err) {
                        resolve({});
                    } else {
                        resolve(result);
                    }
                });
        });
    }

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
                .populate('driver')
                .exec(async (err, result) => {
                  Promise.all(result.map(async res =>{
                    let awbPriceLabel = await PriceLabel.findOne({awbId:res._id}) ;

                    if(awbPriceLabel != null){
                      res['awbPriceLabel'] = awbPriceLabel.TotalInvoiceValue;
                    }
                    res['customer'] = res['customerId'];
                    return res;
                  })).then(()=> resolve(result))
                 
                   
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
                .populate('driver')
                .populate('createdBy')
                .exec(async(err, result) => {
                    if (result.customerId) {
                        result.customer = result.customerId;
                    }
                    // console.log(result);
                    let manifestIds = result.packages.map(function(value) {
                        return value.manifestId;
                    });

                    if (manifestIds && manifestIds.length) {
                        result['createdBy'] = await User.findOne({ _id: result.createdBy });
                        await Manifest.findOne({ _id: { $in: manifestIds } })
                            .populate('airportFromId')
                            .populate('airportToId')
                            .populate('planeId')
                            .exec((err, rest) => {
                                if (err) {
                                    console.log("Error get Awb", err);
                                } else {
                                    result['planeId'] = rest ? rest.planeId : '';
                                    result['airportFromId'] = rest ? rest.airportFromId : '';
                                    result['airportToId'] = rest ? rest.airportToId : '';
                                    result['shipDate'] = rest ? rest.shipDate : '';
                                    resolve(result)
                                }
                            });
                    } else {
                        resolve(result);
                    }
                });
        });
    }

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
                            data['customer']['name'] = (data['customerId'].lastName ? `${data['customerId'].firstName} ${data['customerId'].lastName}` : `${data['customerId'].lastName}`);
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
        let awb;
        let packages;
        let invoices;
        return new Promise((resolve, reject) => {
            Promise.all([
                this.getAwb(id),
                this.services.packageService.getPackages(id),
                this.services.invoiceService.getInvoicesByAWB(id)
            ]).then((results) => {
                awb = results[0];
                packages = results[1];
                console.log("results[1]", results[1])
                invoices = results[2]
                Promise.all([
                    this.services.customerService.getCustomer(awb.customerId),
                    this.services.shipperService.getShipper(awb.shipper),
                    this.services.carrierService.getCarrier(awb.carrier),
                    this.services.hazmatService.getHazmat(awb.hazmat),
                ]).then((otherInfos) => {
                    console.log("@@@", packages)
                    awb.packages = packages;
                    awb.invoices = invoices;
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
    
      awbByCondition(condition) {
        return new Promise((resolve, reject) => {
          Awb.findOne(condition, '_id').exec((err, awbData) => {
            if (err) {
              resolve([]);
            } else {
              resolve(awbData);
            }
          });
        });
      }
      getAwbsFullCustomer(id) {
        return new Promise((resolve, reject) => {
          Awb.find({customerId:id})
            .populate('customerId')
            .populate('shipper')
            .populate('carrier')
            .populate('hazmat')
            .populate('packages')
            .populate('purchaseOrders')
            .populate('invoices')
            .populate('driver')
            .exec((err, result) => {
              resolve(result);
            });
        });
      }

      getAwbsCustomer(id) {
        return new Promise((resolve, reject) => {
          Awb.findOne({customerId:id})
          .populate('invoices')
          .populate('customerId')
          .populate('shipper')
          .populate('carrier')
          .populate('hazmat')
          .populate('packages')
          .populate('purchaseOrders')
          .populate('invoices')
          .populate('driver')
          .populate('createdBy')
            .exec((err, result) => {
              resolve(result);
            });
        });
      }
      getAwbCustomer(id) {
        return new Promise((resolve, reject) => {
          Awb.find({customerId:id})
          // .populate('invoices')
          // .populate('customerId')
          // .populate('shipper')
          // .populate('carrier')
          // .populate('hazmat')
          // .populate('packages')
          // .populate('purchaseOrders')
          // .populate('invoices')
          // .populate('driver')
          // .populate('createdBy')
            .exec((err, result) => {
              resolve(result);
            });
        });
      }
    
      async getAwbsNoDocsCustomer(id) {
        return new Promise((resolve, reject) => {
          Awb.find({ invoices: { $eq: [] }, customerId:id })
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
                  data['customer']['name'] = (data['customerId'].lastName ? `${data['customerId'].firstName} ${data['customerId'].lastName}` : `${data['customerId'].lastName}`);
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

  async storeInvoceFile(data){
    return new Promise((resolve, reject) => { 
      const invoiceData = {
        awbId:data.awbId,
        filePath:data.filePath,
        fileName:data.fileName
      }
     
      const newInvoice = new StoreInvoice(invoiceData);
      newInvoice.save((err, result) => {
        if(err){
          console.log(err)
          resolve({ success: false, message: strings.string_response_error });
        }else{
          resolve({ success: true, message: strings.string_response_created, storeInvoice: result });
        }
      })
    })
  }

  async getAwbPriceLabel(awbId) {    
    return new Promise((resolve, reject) => { 
      PriceLabel.findOne({awbId:awbId}).exec((err, result) => {
        if(result){
          result = JSON.parse(JSON.stringify(result))
          Awb.findOne({_id:awbId})
        //.populate('customerId')
        //.populate('shipper')
        //.populate('carrier')
        //.populate('hazmat')
        //.populate('packages')
        //.populate('purchaseOrders')
        .populate('invoices')
        //.populate('driver')
        .exec((err, awbData) => {
          if(result && result.awbId){
            
            const invoices =(awbData && awbData.invoices)?awbData.invoices:[];
            var totalInvoice = 0;
            for(let i=0;i<invoices.length;i++){
              totalInvoice=totalInvoice+invoices[i].value;
            }

            result.totalPrice = totalInvoice;
            result.noOfInvoices = invoices.length
            result.awbId = awbData;

          
            result.Brokerage = result.Brokerage ? result.Brokerage.toFixed(2) : 0
            result.CustomsProc = result.CustomsProc ? result.CustomsProc.toFixed(2) : 0 
            result.CustomsVAT = result.CustomsVAT ? result.CustomsVAT.toFixed(2) : 0 
            result.VatMultiplier = result.VatMultiplier ? result.VatMultiplier.toFixed(2) : 0
            result.Delivery =  result.Delivery ? result.Delivery.toFixed(2): 0 
            result.Duty =  result.Duty ? result.Duty.toFixed(2) : 0
            result.EnvLevy = result.EnvLevy ? result.EnvLevy.toFixed(2) : 0
            result.Express = result.Express ? result.Express.toFixed(2) : 0
            result.Freight = result.Freight ? result.Freight.toFixed(2) : 0
            result.Hazmat = result.Hazmat ? result.Hazmat.toFixed(2) : 0
            result.Insurance = result.Insurance ? result.Insurance.toFixed(2) : 0 
            result.NoDocs = result.NoDocs ? result.NoDocs.toFixed(2) : 0
            result.Pickup = result.Pickup ? result.Pickup.toFixed(2)  : 0
            result.Sed = result.Sed ? result.Sed.toFixed(2) : 0
            result.ServiceVat = result.ServiceVat ? result.ServiceVat.toFixed(2) : 0 
            result.TotalWet = result.TotalWet ?result.TotalWet.toFixed(2) : 0
            result.TotalInvoiceValue = result.TotalInvoiceValue ? result.TotalInvoiceValue.toFixed(2) : 0
            result.TotalWeightValue = result.TotalWeightValue ? result.TotalWeightValue.toFixed(2) : 0
            result.NoOfInvoice = result.NoOfInvoice ?result.NoOfInvoice.toFixed(2) : 0
            result.totalPrice = result.totalPrice ? result.totalPrice.toFixed(2) : 0
            result.noOfInvoices = result.noOfInvoices ? result.noOfInvoices : 0 

            if(result.OverrideInvoiceValue){
              if(result.OverrideInvoiceValue > 0)
                result.TotalInvoiceValue = result.OverrideInvoiceValue 
              else
                result.TotalInvoiceValue = totalInvoice 
            }
          }
          resolve(result)
        })
      }else{
          resolve({ success: false, message: "Price Label Does not Exist For this AWB."});
      }
      })
    })    
    // return new Promise((resolve, reject) => {     
    //   PriceLabel.find({awbId:awbId}).populate({
    //     path:'awbId',            
    //     populate:{
    //          path:['invoices','customerId','shipper','carrier']
    //      }        
    //    }).exec((err, result) => {
    //     if(err){
    //       console.log(err)
    //       resolve({ success: false, message: strings.string_response_error });
    //     }else{
    //       resolve({ success: true, message: strings.string_response_created, storeInvoice: result });
    //     }
    //   })
    // })
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