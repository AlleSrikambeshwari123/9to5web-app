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
        } else {

          resolve({success:true,message:"Successfully Deleted"});
        }
      });
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
