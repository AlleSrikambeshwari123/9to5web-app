const Promise = require('bluebird');
var moment = require('moment');
var strings = require('../Res/strings');

const Awb = require('../models/awb');
const StoreInvoice = require('../models/storeInvoice');
const AdditionalInvoice = require('../models/additionalInvoice');
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

    getAwbsFull(req) {
      var daterange = req.query.daterange?req.query.daterange:'';
      
      var searchData = {};
      if(daterange){
        var date_arr = daterange.split('-');
        var startDate = (date_arr[0]).trim();      
        var stdate = new Date(startDate);
        stdate.setDate(stdate.getDate() +1);

        var endDate = (date_arr[1]).trim();
        var endate = new Date(endDate);
        endate.setDate(endate.getDate() +1);     
        searchData.createdAt = {"$gte":stdate, "$lte": endate};
      }

      if(!req.query.daterange && !req.query.clear){
        var endate = new Date();      
        endate.setDate(endate.getDate()+1);
        var stdate = new Date();
        stdate.setDate(stdate.getDate() -21);      
        searchData.createdAt = {"$gte":stdate, "$lte": endate};
      }
      if(req.query.clear){
        var endate = new Date();      
        endate.setDate(endate.getDate()+1);
        var stdate = new Date();
        stdate.setDate(stdate.getDate() -14);      
        searchData.createdAt = {"$gte":stdate, "$lte": endate};
      }
      
        return new Promise((resolve, reject) => {
            Awb.find(searchData)
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
  
                      awbPriceLabel.Brokerage = awbPriceLabel.Brokerage ? awbPriceLabel.Brokerage.toFixed(2) : 0
                      awbPriceLabel.CustomsProc = awbPriceLabel.CustomsProc ? awbPriceLabel.CustomsProc.toFixed(2) : 0 
                      awbPriceLabel.CustomsVAT = awbPriceLabel.CustomsVAT ? awbPriceLabel.CustomsVAT.toFixed(2) : 0 
                      awbPriceLabel.Delivery =  awbPriceLabel.Delivery ? awbPriceLabel.Delivery.toFixed(2): 0 
                      awbPriceLabel.Duty =  awbPriceLabel.Duty ? awbPriceLabel.Duty.toFixed(2) : 0
                      awbPriceLabel.EnvLevy = awbPriceLabel.EnvLevy ? awbPriceLabel.EnvLevy.toFixed(2) : 0
                      awbPriceLabel.Express = awbPriceLabel.Express ? awbPriceLabel.Express.toFixed(2) : 0
                      awbPriceLabel.Freight = awbPriceLabel.Freight ? awbPriceLabel.Freight.toFixed(2) : 0
                      awbPriceLabel.Hazmat = awbPriceLabel.Hazmat ? awbPriceLabel.Hazmat.toFixed(2) : 0
                      awbPriceLabel.Insurance = awbPriceLabel.Insurance ? awbPriceLabel.Insurance.toFixed(2) : 0 
                      awbPriceLabel.NoDocs = awbPriceLabel.NoDocs ? awbPriceLabel.NoDocs.toFixed(2) : 0
                      awbPriceLabel.Pickup = awbPriceLabel.Pickup ? awbPriceLabel.Pickup.toFixed(2)  : 0
                      awbPriceLabel.Sed = awbPriceLabel.Sed ? awbPriceLabel.Sed.toFixed(2) : 0
                      awbPriceLabel.ServiceVat = awbPriceLabel.ServiceVat ? awbPriceLabel.ServiceVat.toFixed(2) : 0 
                      awbPriceLabel.Storage = awbPriceLabel.Storage ? awbPriceLabel.Storage.toFixed(2) : 0 
                      
                      awbPriceLabel.SumOfAllCharges = Number(awbPriceLabel.CustomsVAT) + Number(awbPriceLabel.ServiceVat) + Number(awbPriceLabel.Freight) + Number(awbPriceLabel.Duty)+ Number(awbPriceLabel.CustomsProc)+Number(awbPriceLabel.EnvLevy) +Number(awbPriceLabel.NoDocs) +
                      Number(awbPriceLabel.Insurance) + Number(awbPriceLabel.Storage) + Number(awbPriceLabel.Brokerage) +Number(awbPriceLabel.Express) + Number(awbPriceLabel.Delivery) + Number(awbPriceLabel.Hazmat) + Number(awbPriceLabel.Pickup)  + Number(awbPriceLabel.Sed)
           
                      res['awbPriceLabel'] = awbPriceLabel.SumOfAllCharges ? awbPriceLabel.SumOfAllCharges.toFixed(2) : 0;
                    }
                    res['customer'] = res['customerId'];
                    return res;
                  })).then(()=> resolve(result))
                 
                   
                });
        });
    }

    async getAllAwbsFullList(req){
      var start = req.body.start ? parseInt(req.body.start) : 0;
      var length = req.body.length ? parseInt(req.body.length) : 10;
      var sortColumn = req.body.order;
  
      var field = req.body['order[0][column]'] ?parseInt(req.body['order[0][column]']) : 0;
      var columns = {0:'createdAt', 1: 'createdAt', 2: 'customer.pmb', 3:'awbId', 4: 'customer.firstName', 5: 'shipper.name',6:'carrier.name',7:'packages.length',8:'weight'} 
      var dir = req.body['order[0][dir]'] ? req.body['order[0][dir]'] : 0;
      var sort = (dir=='asc') ? 1 : -1;
      var sortField = columns[field];
      var search = req.body['search[value]'] ? req.body['search[value]'] : '';
      var daterange = req.body.daterange?req.body.daterange:''
  
      var searchData = {};

      //date range
      var daterange = req.body.daterange?req.body.daterange:''
      if(daterange){
        var date_arr = daterange.split('-');
        var startDate = (date_arr[0]).trim();      
        var stdate = new Date(startDate);
        stdate.setDate(stdate.getDate() +1);

        var endDate = (date_arr[1]).trim();
        var endate = new Date(endDate);
        endate.setDate(endate.getDate() +1);     
        searchData.createdAt = {"$gte":stdate, "$lte": endate};
      }

      if(!req.body.daterange && !req.body.clear){
        var endate = new Date();      
        endate.setDate(endate.getDate()+1);
        var stdate = new Date();
        stdate.setDate(stdate.getDate() -21);      
        searchData.createdAt = {"$gte":stdate, "$lte": endate};
      }

      if(search ){
        
        searchData.$or = [
          {'shipper.name':{'$regex' : search , '$options' : 'i'}  },
          {'carrier.name':{'$regex' : search , '$options' : 'i'}  },
          {'driver.firstName':{'$regex' : search , '$options' : 'i'}  },
          {'driver.lastName':{'$regex' : search , '$options' : 'i'}  }
        ]
      }
      if(req.body.status == 1)
        searchData.packages =  { $gt: [] }
      else if(req.body.status == 2)
        searchData.invoices =  []
      else if(req.body.status == 3)
        searchData.packages =  []
      else if(req.body.status == 4)
        searchData.fll_pickup =  true
        
        return new Promise( async(resolve, reject) => {
        var piplineAggregate = [
          {
              $lookup:{
                from:"customers",
                  localField: 'customerId',
                  foreignField: '_id',
                  as:"customerId"
              }
          },
          //  {$unwind:"$customer"},
           {
            $lookup:{
                from:"shippers",
                localField: 'shipper',
                foreignField: '_id',
                as:"shipper"
            }
          },
        //  {$unwind:"$shipper"}, 
          {
          $lookup:{
              from:"carriers",
              localField: 'carrier',
              foreignField: '_id',
              as:"carrier"
          }
          },
          // {$unwind:"$carrier"},
          {
            $lookup:{
                from:"hazmats",
                localField: 'hazmat',
                foreignField: '_id',
                as:"hazmat"
            }
          },
        //  {$unwind:"$hazmat"},  
          {
          $lookup:{
              from:"drivers",
              localField: 'driver',
              foreignField: '_id',
              as:"driver"
          }
          },
          // {$unwind:"$driver"}, 
     
       {
        $lookup:{
            from:"packages",
            localField: 'packages',
            foreignField: '_id',
            as:"packages"
        }
      },
      // {$unwind:"$packages"}, 

      {
        $lookup:{
            from:"purchaseorders",
            localField: 'purchaseorders',
            foreignField: '_id',
            as:"purchaseOrders"
        }
      },
      // {$unwind:"$purchaseOrders"}, 

      {
        $lookup:{
            from:"invoices",
            localField: 'invoices',
            foreignField: '_id',
            as:"invoices"
        }
      },
      // {$unwind:"$invoices"}, 
          {
              $match:searchData
          }
        ];
  
        var totalRecords = await Awb.aggregate([
          ...piplineAggregate,
          ...[{$count: "total"}]
        ]);
        if(totalRecords && totalRecords.length && totalRecords[0].total){
          await Awb.aggregate([
            ...piplineAggregate,
            ...[
              {$sort: {createdAt:1}},
              {$skip: start},
              {$limit: length},
            ]
          ])
              .exec(async (err, result) => {
                Promise.all(result.map(async res =>{
                  let awbPriceLabel = await PriceLabel.findOne({awbId:res._id}) ;

                  if(awbPriceLabel != null){

                    awbPriceLabel.Brokerage = awbPriceLabel.Brokerage ? awbPriceLabel.Brokerage.toFixed(2) : 0
                    awbPriceLabel.CustomsProc = awbPriceLabel.CustomsProc ? awbPriceLabel.CustomsProc.toFixed(2) : 0 
                    awbPriceLabel.CustomsVAT = awbPriceLabel.CustomsVAT ? awbPriceLabel.CustomsVAT.toFixed(2) : 0 
                    awbPriceLabel.Delivery =  awbPriceLabel.Delivery ? awbPriceLabel.Delivery.toFixed(2): 0 
                    awbPriceLabel.Duty =  awbPriceLabel.Duty ? awbPriceLabel.Duty.toFixed(2) : 0
                    awbPriceLabel.EnvLevy = awbPriceLabel.EnvLevy ? awbPriceLabel.EnvLevy.toFixed(2) : 0
                    awbPriceLabel.Express = awbPriceLabel.Express ? awbPriceLabel.Express.toFixed(2) : 0
                    awbPriceLabel.Freight = awbPriceLabel.Freight ? awbPriceLabel.Freight.toFixed(2) : 0
                    awbPriceLabel.Hazmat = awbPriceLabel.Hazmat ? awbPriceLabel.Hazmat.toFixed(2) : 0
                    awbPriceLabel.Insurance = awbPriceLabel.Insurance ? awbPriceLabel.Insurance.toFixed(2) : 0 
                    awbPriceLabel.NoDocs = awbPriceLabel.NoDocs ? awbPriceLabel.NoDocs.toFixed(2) : 0
                    awbPriceLabel.Pickup = awbPriceLabel.Pickup ? awbPriceLabel.Pickup.toFixed(2)  : 0
                    awbPriceLabel.Sed = awbPriceLabel.Sed ? awbPriceLabel.Sed.toFixed(2) : 0
                    awbPriceLabel.ServiceVat = awbPriceLabel.ServiceVat ? awbPriceLabel.ServiceVat.toFixed(2) : 0 
                    awbPriceLabel.Storage = awbPriceLabel.Storage ? awbPriceLabel.Storage.toFixed(2) : 0 
                    
                    awbPriceLabel.SumOfAllCharges = Number(awbPriceLabel.CustomsVAT) + Number(awbPriceLabel.ServiceVat) + Number(awbPriceLabel.Freight) + Number(awbPriceLabel.Duty)+ Number(awbPriceLabel.CustomsProc)+Number(awbPriceLabel.EnvLevy) +Number(awbPriceLabel.NoDocs) +
                    Number(awbPriceLabel.Insurance) + Number(awbPriceLabel.Storage) + Number(awbPriceLabel.Brokerage) +Number(awbPriceLabel.Express) + Number(awbPriceLabel.Delivery) + Number(awbPriceLabel.Hazmat) + Number(awbPriceLabel.Pickup)  + Number(awbPriceLabel.Sed)
         
                    res['awbPriceLabel'] = awbPriceLabel.SumOfAllCharges ? awbPriceLabel.SumOfAllCharges.toFixed(2) : 0;
                    res.weight = awbPriceLabel.TotalWeightValue
                  }
                  res['customer'] = res['customerId'];
                  return res;
                })).then(()=> resolve({awbs : result,total : totalRecords[0].total}))
              });
          }
          else{
            resolve({awbs :[],total : 0})
          }
      });
  }

    getAllAwbsFull(req) {
      var start = req.body.start ? parseInt(req.body.start) : 0;
      var length = req.body.length ? parseInt(req.body.length) : 10;      
      var field = req.body['order[0][column]'] ?parseInt(req.body['order[0][column]']) : 0;
      var columns = {
          0:'customer.firstName',
          1: 'createdAt',
          2: 'customer.pmb',
          3: 'awbId',
          4: 'shipper.name',
          4: 'carrier.name'
        } 
      
      var dir = req.body['order[0][dir]'] ? req.body['order[0][dir]'] : 0;
      var sort = (dir=='asc') ? 1 : -1;
      var sortField = columns[field];

      var search = req.body['search[value]'] ? req.body['search[value]'] : ''; 
      var searchData = {};

      //date range
      var daterange = req.body.daterange?req.body.daterange:''
      if(daterange){
        var date_arr = daterange.split('-');
        var startDate = (date_arr[0]).trim();      
        var stdate = new Date(startDate);
        stdate.setDate(stdate.getDate() +1);

        var endDate = (date_arr[1]).trim();
        var endate = new Date(endDate);
        endate.setDate(endate.getDate() +1);     
        searchData.createdAt = {"$gte":stdate, "$lte": endate};
      }

      if(!req.body.daterange && !req.body.clear){
        var endate = new Date();      
        endate.setDate(endate.getDate()+1);
        var stdate = new Date();
        stdate.setDate(stdate.getDate() -21);      
        searchData.createdAt = {"$gte":stdate, "$lte": endate};
      }

      if(search){
        searchData.$or = [          
          {"customer.firstName": {'$regex' : search, '$options' : 'i'}},
          {"customer.pmb": {'$regex' : search, '$options' : 'i'}},
          {"awbId": search},
          {"shipper.name":{'$regex' : search, '$options' : 'i'}},
          {"carrier.name":{'$regex' : search, '$options' : 'i'}},
        ]
      }   
      
      var pipeLineAggregate = [
        
        {
          $lookup: {
            from: "customers",
            localField: "customerId",
            foreignField: "_id",
            as:"customer"
          }
        },
        {$unwind:"$customer"},
        {
          $lookup: {
            from: "shippers",
            localField: "shipper",
            foreignField: "_id",
            as:"shipper"
          }
        },
        {
          $lookup: {
            from: "carriers",
            localField: "carrier",
            foreignField: "_id",
            as:"carrier"
          }
        },
        {
          $lookup: {
            from: "hazmats",
            localField: "hazmat",
            foreignField: "_id",
            as:"hazmat"
          }
        },
        {
          $lookup: {
            from: "purchaseOrders",
            localField: "purchaseOrders",
            foreignField: "_id",
            as:"packages"
          }
        },
        {
          $lookup: {
            from: "invoices",
            localField: "invoices",
            foreignField: "_id",
            as:"invoices"
          }
        },
        {
          $lookup: {
            from: "drivers",
            localField: "driver",
            foreignField: "_id",
            as:"drivers"
          }
        },
        {
          $lookup: {
            from: "pricelabels",
            localField: "_id",
            foreignField: "awbId",
            as:"pricelabel"
          }
        },
        {
          $match:searchData
        }
      ];
      
      return new Promise(async (resolve, reject) => {
          var totalRecords = await Awb.aggregate([
            ...pipeLineAggregate,
            ...[{
                $count:"total"
              }]
          ]);
        if(totalRecords && totalRecords.length && totalRecords[0].total){
          Awb.aggregate([
            ...pipeLineAggregate,
            ...[
              {$sort:{[sortField]: sort}},
              {$skip: start},
              {$limit: length}
            ]
          ]).exec((err, result) => {
            if(!err){
              resolve({total: totalRecords[0].total, awbs: result});
            }else{
              resolve({total: 0, awbs: []})
            }
          })          
        }else{
          resolve({total: 0, awbs: []})
        }
    })
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

    async getAwbsNoDocsList(req) {
      var start = req.body.start ? parseInt(req.body.start) : 0;
      var length = req.body.length ? parseInt(req.body.length) : 10;
      var sortColumn = req.body.order;
  
      var field = req.body['order[0][column]'] ?parseInt(req.body['order[0][column]']) : 0;
      var columns = {0:'createdAt', 1: 'createdAt', 2: 'customer.pmb', 3:'awbId', 4: 'customer.firstName', 5: 'shipper.name',6:'carrier.name',7:'packages.length',8:'weight'} 
      var dir = req.body['order[0][dir]'] ? req.body['order[0][dir]'] : 0;
      var sort = (dir=='asc') ? 1 : -1;
      var sortField = columns[field];
      var search = req.body['search[value]'] ? req.body['search[value]'] : '';
      var daterange = req.body.daterange?req.body.daterange:''
  
      var searchData = {};

      if(daterange){
        var date_arr = daterange.split('-');
        var startDate = (date_arr[0]).trim();      
        var stdate = new Date(startDate);
        stdate.setDate(stdate.getDate() +1);

        var endDate = (date_arr[1]).trim();
        var endate = new Date(endDate);
        endate.setDate(endate.getDate() +1);     
        searchData.createdAt = {"$gte":stdate, "$lte": endate};
      }
      
      if(!req.body.daterange && !req.body.clear){
        var endate = new Date();      
        endate.setDate(endate.getDate()+1);
        var stdate = new Date();
        stdate.setDate(stdate.getDate() -21);      
        searchData.createdAt = {"$gte":stdate, "$lte": endate};
      }
      console.log("search",search)
      if(search){
        searchData.$or = [          
          {"customer.firstName": {'$regex' : search, '$options' : 'i'}},
          {"customer.pmb": {'$regex' : search, '$options' : 'i'}},
          {"awbId": search},
          {"shipper.name":{'$regex' : search, '$options' : 'i'}},
          {"carrier.name":{'$regex' : search, '$options' : 'i'}},
        ]
      }   
    
    var pipeLineAggregate = [
      
      {
        $lookup: {
          from: "customers",
          localField: "customerId",
          foreignField: "_id",
          as:"customer"
        }
      },
      {$unwind:"$customer"},
      {
        $lookup: {
          from: "shippers",
          localField: "shipper",
          foreignField: "_id",
          as:"shipper"
        }
      },
      {
        $lookup: {
          from: "carriers",
          localField: "carrier",
          foreignField: "_id",
          as:"carrier"
        }
      },
      {
        $lookup:{
            from:"packages",
            localField: 'packages',
            foreignField: '_id',
            as:"packages"
        }
      },
      // {
      //   $lookup: {
      //     from: "purchaseorders",
      //     localField: "purchaseorders",
      //     foreignField: "_id",
      //     as:"packages"
      //   }
      // },
      {
        $match:searchData
      }
    ];
      return new Promise(async (resolve, reject) => {  
        var totalRecords = await Awb.aggregate([
          ...pipeLineAggregate,
          ...[{
              $count:"total"
            }]
        ]);
      if(totalRecords && totalRecords.length && totalRecords[0].total){
        await Awb.aggregate([
          ...pipeLineAggregate,
          ...[
            {$sort:{[sortField]: sort}},
            {$skip: start},
            {$limit: length}
          ]
        ]).exec((err, awbData) => {
          if (err) {
            resolve([]);
          } else {
            awbData.forEach((data) => {
              data['customer']['name'] = (data['customer'].lastName ? `${data['customer'].firstName} ${data['customer'].lastName}` : `${data['customer'].firstName}`);
              if (data['packages'] && data['packages'].length) {
                              let weight = 0;
                              data.packages.forEach((pkg) => (weight += Number(pkg.weight)));
                              data['weight'] = weight.toFixed(2);
                            }
                            data['dateCreated'] = moment(data['createdAt']).format('MMM DD, YYYY');
                          });
                          console.log("awb",awbData)
                      resolve({awbs : awbData,total : totalRecords[0].total});
                  }
              });
      }else{
        resolve({total: 0, awbs: []})
      }
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
    createPurchaseOrder(pkg, awbId) {
      return new Promise((resolve, reject) => {
        pkg.awbId = awbId   
        const newPurchaseOrder = new PurchaseOrder(pkg);
        newPurchaseOrder.save((err, result) => {
          if (err) {
            resolve({ success: false });
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

    async getAwbsNoInvoiceCustomer(id) {
      return new Promise((resolve, reject) => {
        Awb.find({ invoices: { $eq: [] }, customerId:id })
          .populate('customerId')
          .populate('shipper')
          .populate('carrier')
          .populate('packages')
          .populate('purchaseOrders')
          .exec(async (err, awbData) => {
            if (err) {
              resolve([]);
            } else {
              let awbResponse = []
              for(let data of awbData){
                let storeInvoices = await StoreInvoice.find({awbId :data._id})
                if(storeInvoices.length == 0){
                  data['customer'] = data['customerId'];
                  data['customer']['name'] = (data['customerId'].lastName ? `${data['customerId'].firstName} ${data['customerId'].lastName}` : `${data['customerId'].lastName}`);
                  if (data['packages'] && data['packages'].length) {
                    let weight = 0;
                    data.packages.forEach((pkg) => (weight += Number(pkg.weight)));
                    data['weight'] = weight;
                  }
                  data['dateCreated'] = moment(data['createdAt']).format('MMM DD, YYYY');
                  awbResponse.push(data)
                }
              }
              resolve(awbResponse);
            }
          });
      });
    }

  async storeInvoiceFile(data){
    return new Promise((resolve, reject) => { 
      const invoiceData = {
        awbId:data.awbId,
        filePath:data.filePath,
        fileName:data.fileName,
        courierNo : data.courierNo,
        pmb : data.pmb,
        name : data.name,
        customerId : data.customerId
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

  async storeAdditionalInvoceFile(data){
    return new Promise((resolve, reject) => { 
      const invoiceData = {
        filePath:data.filePath,
        fileName:data.fileName,
        courierNo : data.courierNo,
        pmb : data.pmb,
        name : data.name,
        customerId : data.customerId
      }
     
      const newInvoice = new AdditionalInvoice(invoiceData);
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

  async getAwbPriceAndStatus(awbData,queryStatus){
    let awbResponse = []
    for(let awb of awbData){
      awb = awb.toJSON()
      let statusObject = await this.services.packageService.checkPackageStatus(awb)
      awb.status = statusObject.status
      awb.totalPrice = "Not Priced"
      let priceLabel = await this.getAwbPriceLabel(awb._id)
      awb.pricing = priceLabel
      if(!priceLabel.TotalWeightValue){
        let totalweightVal =0
        if(awb.packages){
            for (var i = 0; i < awb.packages.length; i++) {
              var weight = awb.packages[i].weight;
              if (awb.packages[i].packageCalculation == 'kg' || awb.packages[i].packageCalculation == 'Kg') {
                weight = 2.20462 * awb.packages[i].weight;
              }
              totalweightVal = totalweightVal + weight;
            }
          }
          awb.pricing.TotalWeightValue = totalweightVal
      }
      if(priceLabel.SumOfAllCharges)
          awb.totalPrice = priceLabel.SumOfAllCharges
      if(!queryStatus || queryStatus == "All")
          awbResponse.push(awb)
      else if(String(statusObject.id) == String(queryStatus))
        awbResponse.push(awb)
      else if(awb.totalPrice != "Not Priced" && queryStatus == 11)
        awbResponse.push(awb)
    }
    return awbResponse
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
        .populate('packages')
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
            let totalweightVal =0,totalVolumetricWeight =0;
            if(awbData.packages){
              for (var i = 0; i < awbData.packages.length; i++) {
                var weight = awbData.packages[i].weight;
                if (awbData.packages[i].packageCalculation == 'kg' || awbData.packages[i].packageCalculation == 'Kg') {
                  weight = 2.20462 * awbData.packages[i].weight;
                }
                totalweightVal = totalweightVal + weight;
                let check = 1;
                awbData.packages[i].dimensions.split('x').forEach(data =>{
                  check = check * data
                })
                let volumetricWeight = (check/166);
                totalVolumetricWeight = totalVolumetricWeight + volumetricWeight;
              }
              result.TotalWeightValue = totalweightVal
              result.TotalVolumetricWeight = totalVolumetricWeight
              result.Express = result.Express ? result.Express.toFixed(2) : 0
          
              if(result.Express >0){
                result.Express = 35
                if(result.TotalWeightValue >= 12 && result.TotalVolumetricWeight >=12 ){
                  if(result.TotalWeightValue > result.TotalVolumetricWeight){
                    result.Freight = result.TotalWeightValue * 3
                    if(result.Freight > 35) 
                      result.Express = result.Freight
                  }
                  else{
                    result.Freight = result.TotalVolumetricWeight * 3
                    if(result.Freight > 35) 
                      result.Express = result.Freight
                  }
                }else{
                  result.Freight =  35
                }
              }else{
                if(result.TotalWeightValue >= 2 && result.TotalVolumetricWeight >=2 ){
                  if(result.TotalWeightValue > result.TotalVolumetricWeight)
                    result.Freight = result.TotalWeightValue * 1.55
                  else
                    result.Freight = result.TotalVolumetricWeight * 1.55
                }else{
                  result.Freight =  3.10
                }
              }
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
            result.Freight = result.Freight ? result.Freight.toFixed(2) : 0
            result.Hazmat = result.Hazmat ? result.Hazmat.toFixed(2) : 0
            result.NoDocs = result.NoDocs ? result.NoDocs.toFixed(2) : 0
            result.Pickup = result.Pickup ? result.Pickup.toFixed(2)  : 0
            result.Sed = result.Sed ? result.Sed.toFixed(2) : 0
            result.ServiceVat = result.ServiceVat ? result.ServiceVat.toFixed(2) : 0 
            result.TotalWet = result.TotalWet ?result.TotalWet.toFixed(2) : 0
            result.TotalInvoiceValue = result.TotalInvoiceValue ? result.TotalInvoiceValue.toFixed(2) : 0
            result.TotalWeightValue = result.TotalWeightValue ? result.TotalWeightValue.toFixed(2) : 0
            result.TotalVolumetricWeight = result.TotalVolumetricWeight ? result.TotalVolumetricWeight.toFixed(2) : 0
            result.NoOfInvoice = result.NoOfInvoice ?result.NoOfInvoice.toFixed(2) : 0
            result.totalPrice = result.totalPrice ? result.totalPrice.toFixed(2) : 0
            result.Storage = result.Storage ? result.Storage.toFixed(2) : 0 
            
            result.SumOfAllCharges = Number(result.CustomsVAT) + Number(result.ServiceVat) + Number(result.Freight) + Number(result.Duty)+ Number(result.CustomsProc)+Number(result.EnvLevy) +Number(result.NoDocs) +
            Number(result.Insurance) + Number(result.Storage) + Number(result.Brokerage) +Number(result.Express) + Number(result.Delivery) + Number(result.Hazmat) + Number(result.Pickup)  + Number(result.Sed)
        
            result.SumOfAllCharges = result.SumOfAllCharges ? result.SumOfAllCharges.toFixed(2) : 0
            result.Insurance = 0
            if(result.OverrideInvoiceValue){
              if(result.OverrideInvoiceValue > 0)
                result.TotalInvoiceValue = result.OverrideInvoiceValue 
              else
                result.TotalInvoiceValue = totalInvoice 
              if(result.OverrideInvoiceValue >= 100)
                  result.Insurance = result.OverrideInvoiceValue * 0.015

              result.Insurance = result.Insurance ? result.Insurance.toFixed(2) : 0 
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