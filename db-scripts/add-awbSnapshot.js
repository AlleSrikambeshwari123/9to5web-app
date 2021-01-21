'use strict';

// Importing Environment Variables
require('dotenv').config();

const createConnection = require('../Util/mongo');
const Package = require('../models/package');
const Awb = require('../models/awb');
const AwbHistory = require('../models/awbHistory');
const Customer = require('../models/customer');
const Shipper = require('../models/shipper');
const awbData = require('../DB_Seed/awb.js')
createConnection()
  .then(async () => {
    return new Promise(async (resolve, reject) => {

      let count = 0, c = 0
      console.log("awbs length ",awbData.awbs.length)
      for (let awbObj of awbData.awbs) {

        let checkAwb = await Awb.findById(awbObj._id.$oid)
        let checkAwbNumber = await Awb.findOne({awbId : awbObj.awbId})
        // console.log("awbData", awbObj, awbData.awbs.length, checkAwb)
        if (!checkAwb && !checkAwbNumber && awbObj && awbObj._id) {
          awbObj._id = awbObj._id.$oid
          awbObj.customerId = (awbObj.customerId && awbObj.customerId.$oid) ? awbObj.customerId.$oid : null
          awbObj.shipper = (awbObj.shipper && awbObj.shipper.$oid) ? awbObj.shipper.$oid : null
          awbObj.carrier = (awbObj.carrier && awbObj.carrier.$oid) ? awbObj.carrier.$oid : null
          awbObj.driver = (awbObj.driver && awbObj.driver.$oid) ? awbObj.driver.$oid : null
          awbObj.hazmat = (awbObj.hazmat && awbObj.hazmat.$oid) ? awbObj.hazmat.$oid : null
          awbObj.createdBy = (awbObj.createdBy && awbObj.createdBy.$oid) ? awbObj.createdBy.$oid : null
          awbObj.updatedBy = (awbObj.updatedBy && awbObj.updatedBy.$oid) ? awbObj.updatedBy.$oid : awbObj.createdBy
          awbObj.createdAt = awbObj.createdAt.$date
          awbObj.updatedAt = awbObj.updatedAt.$date
          if (awbObj.packages && awbObj.packages.length > 0) {
            let pkgsArray = []
            for (let pkg of awbObj.packages) {
              pkgsArray.push(pkg.$oid)
            }
            awbObj.packages = pkgsArray
          }
          if (awbObj.purchaseOrders && awbObj.purchaseOrders.length > 0) {
            let poArray = []
            for (let po of awbObj.purchaseOrders) {
              poArray.push(po.$oid)
            }
            awbObj.purchaseOrders = poArray
          }
          if (awbObj.invoices && awbObj.invoices.length > 0) {
            let invoicesArray = []
            for (let invoice of awbObj.invoices) {
              invoicesArray.push(invoice.$oid)
            }
            awbObj.invoices = invoicesArray
          }
          if(!awbObj.po_number || !awbObj.po_number == undefined ){
            awbObj.po_number = Math.floor(100000 + Math.random() * 90000000);
          }
          // console.log("awbOjb", awbObj)
          const awbResult = new Awb(awbObj);
          await awbResult.save(async (err, result) => {
            if (err) {
              c++
              console.log("Awb not added with awbId = ", awbObj.awbId)
            }
            const awbHistoryResult = new AwbHistory(awbObj);
            await awbHistoryResult.save()
            if (count == awbData.awbs.length - 1) {
              return resolve()
            }
            count++
          })
        }else{
          console.log("Awb not added",awbObj.awbId)
          if (count == awbData.awbs.length - 1) {
            return resolve()
          }
          count++
        }
      }
      return true
    })
  }).then(() => {
    console.log('Awbs other detail update successfully!!');
    process.exit();
  }).catch((error) => {
    console.error('Error while updating awbs', error);
    process.exit();
  });