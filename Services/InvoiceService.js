let Promise = require('bluebird');
let assert = require('assert');

let awsLib = require('../Util/aws');
var path = require('path');
var fs = require('fs');
const imagesToPdf = require("images-to-pdf")


// let client = require('./dataContext').redisClient;
const Invoice = require('../models/invoice');
const StoreInvoice = require('../models/storeInvoice');

const Keys = {
  item: (id) => `invoice:${id}`,
  id: () => `id:invoice`,
  awbInvoices: (awbId) => `awbInvoices:${awbId}`,
};

class InvoiceService {
  async create(data) {
    const newInvoice = new Invoice(data);
    await Promise.fromCallback((cb) => newInvoice.save(cb));
    return newInvoice;
  }

  async updateInvoice(invoiceId, data) {
    return new Promise((resolve, reject) => {
      const updatedData = {...data};
      if (!updatedData['filename']) {
        delete updatedData['filename'];
      }

      Invoice.findOneAndUpdate({_id: invoiceId}, {...updatedData}, (err, result) => {
        if (err) {
          resolve({success: false});
        } else {
          resolve({success: true});
        }
      })
    });
  }

  // async getByKey(key) {
  //   return await Promise.fromCallback((cb) => client.hgetall(key, cb));
  // }

  async get(id) {
    return await this.getByKey(Keys.item(id));
  }

  // async update(id, data) {
  //   let key = Keys.item(id);
  //   let exists = await Promise.fromCallback((cb) => client.exists(key, cb));
  //   if (exists !== 1) {
  //     throw new Error('Not found');
  //   }

  //   let previous = await this.get(id);

  //   let transaction = client.multi();
  //   transaction.hmset(key, data);

  //   if ('awbId' in data && previous.awbId != data.awbId) {
  //     // If we updating awbId we should update lists of invoices for awb
  //     transaction.srem(Keys.awbInvoices(previous.awbId), previous.id);
  //     if (data.awbId) {
  //       transaction.sadd(Keys.awbInvoices(previous.awbId), data.awbId);
  //     }
  //   }

  //   await Promise.fromCallback((cb) => transaction.exec(cb));
  // }

  async removeFromAWB(id) {
    await this.update(id, {
      awbId: null,
    });
  }

  async getInvoicesByAWB(awbId) {
    return new Promise((resolve, reject) => {
      Invoice.find({awbId: awbId}, (err, result) => {
        if (err) {
          resolve([]);
        } else {
          resolve(result);
        }
      });
    })
  }

  async getInvoiceFilesByAWBs(awbIdArray) {
    let resultArrayFiles = [];
    let datetime = (new Date()).getTime();
    return new Promise((resolve, reject) => {
      Invoice.find({awbId: { $in : awbIdArray }}, (err, result) => {
        if (err) {
          resolve([]);
        } else {
          if(result.length == 0) resolve([])
          Promise.all(result.map(async (singleInvoice) => {
            if(singleInvoice.filename) {
              let fileBuffer = await awsLib.getObjectData(singleInvoice.filename);
              await fs.writeFileSync(path.resolve(process.cwd(), `airCaroDownload/${singleInvoice.awbId}_${singleInvoice._id}_${datetime}_invoice.png`), fileBuffer.Body);
              await imagesToPdf([path.resolve(process.cwd(), `airCaroDownload/${singleInvoice.awbId}_${singleInvoice._id}_${datetime}_invoice.png`)], path.resolve(process.cwd(), `airCaroDownload/${singleInvoice.awbId}_${singleInvoice._id}_${datetime}_invoice.pdf`))
              resultArrayFiles.push({
                filePath : path.resolve(process.cwd(), `airCaroDownload/${singleInvoice.awbId}_${singleInvoice._id}_${datetime}_invoice.pdf`),
                isFile : true,
                awbId: singleInvoice.awbId
              });
            } else {
              resultArrayFiles.push({
                isFile : false,
                awbId: singleInvoice.awbId
              })
            }
            if(result.length === resultArrayFiles.length)
              resolve(resultArrayFiles);
          }));
       }
      });
    })
  }

  async getInvoices() {
    return new Promise((resolve, reject) => {
      Invoice.find({}).populate('awbId').exec((err, result) => {
        if (err) {
          resolve([]);
        } else {
          resolve(result);
        }
      });
    })
  }

  getSearchInvoice(id){
    return new Promise((resolve, reject) => {
      StoreInvoice.findById(id).populate('awbId').exec((err, result) => {
        if (err) {
          resolve({});
        } else  if(result == null){
          Invoice.findById(id).populate('awbId').exec((error, res) => {
            if (error) {
              resolve({});
            }else{
              resolve(res);
            }   
          })
        }else{
          resolve(result);
        }
      });
    })
  }

  async getAllStoreInvoice(){
    return new Promise((resolve, reject) => {
      StoreInvoice.find().populate('awbId').exec((err, result) => {
        if (err) {
          resolve([]);
        } else {
          resolve(result);
        }
      });
    })
  }

  async deleteStoreInvoice(id){
    return new Promise((resolve, reject) => {
      StoreInvoice.findOneAndRemove({_id:id}).exec((err, result) => {
        if (err) {
          resolve({success:false,message:err});
        } else if(result == null){
          Invoice.findOneAndRemove({_id:id}).exec((err, result) => {
            if (err) {
              resolve({success:false,message:err});
            }else{
              resolve({success:true,message:"Successfully Deleted"});
            }   
          })
        }else{
          resolve({success:true,message:"Successfully Deleted"});
        }
      });
    })
  }

   getAllInvoice(req, storeInvoice){
    var start = req.body.start ? parseInt(req.body.start) : 0;
    var length = req.body.length ? parseInt(req.body.length) : 10;      
    var field = req.body['order[0][column]'] ?parseInt(req.body['order[0][column]']) : 0;
    var columns = {0:'awb.awbId', 1: 'createdAt'} 
    
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
        {"awb.awbId":{'$regex' : search, '$options' : 'i'}},        
      ]
    }

    return new Promise( async (resolve, reject) => {
      var totalResult = await Invoice.aggregate([
        {$limit:1},
        {$addFields:{allinvoices:storeInvoice}},
        {$unwind:"$allinvoices"},
        {$replaceRoot:{newRoot:"$allinvoices"}},
        {
          $lookup:{
            from: "awbs",
            localField: "awbId",
            foreignField: "_id",
            as:"awb"
          }
        },
        {$unwind:"$awb"},
        {$match:searchData},
        {$count :"total"}        
      ]);
      console.log(searchData)
      if(totalResult && totalResult.length && totalResult[0].total){
        Invoice.aggregate([
          {$limit:1},
          {$addFields:{allinvoices:storeInvoice}},
          {$unwind:"$allinvoices"},
          {$replaceRoot:{newRoot:"$allinvoices"}}, 
          {
            $lookup:{
              from: "awbs",
              localField: "awbId",
              foreignField: "_id",
              as:"awb"
            }
          },
          {$unwind:"$awb"}, 
          {$match:searchData}, 
          { $sort : { [sortField] : sort}}, 
          {$skip:start},
          {$limit:length}    
        ]).exec(function(err, result){
          if(err){
            resolve({total:0, invoices: []})
          }else{
            resolve({total:totalResult[0].total, invoices: result})
          }
        })
      }else{
        resolve({total:0, invoices: []})
      }
    })
  }

  // async all() {
  //   let keys = await Promise.fromCallback((cb) => client.keys(Keys.item('*'), cb));
  //   return await Promise.map(keys, (key) => this.getByKey(key));
  // }

  // async generateId() {
  //   let id = await Promise.fromCallback((cb) => client.incr(Keys.id(), cb));
  //   return id;
  // }
}

module.exports = InvoiceService;
