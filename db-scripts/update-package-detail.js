'use strict';

// Importing Environment Variables
require('dotenv').config();

const createConnection = require('../Util/mongo');
const Package = require('../models/package');
const PackageHistory = require('../models/packageHistory');

const Awb = require('../models/awb');
const Customer = require('../models/customer');
const Barcode = require('../models/barcode');
const Shipper = require('../models/shipper');
const Zone = require('../models/zone');
const Carrier = require('../models/carrier');

createConnection()
  .then(() => {
    return Package.find({$or : [{awbIdString : {$exists : false}},{carrierName : {$exists : false}}] },async (err, response) => {
        if (err) {
          console.error('Error while finding packages ', err);
          process.exit();
        }
        return response
      })
  }).then(async(data) => {
      console.log("data",data.length)
    for(let pack of data){
        if(pack.awbId && pack.customerId && pack.shipperId && pack.originBarcode){
            let awb = await Awb.findById(pack.awbId)
            let customer = await Customer.findById(pack.customerId);
            let shipper = await Shipper.findById(pack.shipperId);
            let zone = await Zone.findById(pack.zoneId);
            let carrier = await Carrier.findById(pack.carrierId);
            let barcode = await Barcode.findById(pack.originBarcode).read('primary');
            var storeLocation = '';
            
            var updateData =  {
                awbIdNumber:(awb && awb.awbId)?awb.awbId:'',
                awbIdString:(awb && awb.awbId)?awb.awbId:''                        
            }
            if(zone && zone.name){
                updateData.zoneName = zone.name;
            }
            if(carrier && carrier.name){
                updateData.carrierName = carrier.name;
            }

            if(barcode && barcode.barcode){
                updateData.barcode = barcode.barcode;
            }
            if(customer){
                updateData.customerFirstName = customer.firstName;
                updateData.customerLastName = customer.lastName;
                updateData.customerFullName = customer.firstName + (customer.lastName?' '+ customer.lastName: '');
                 
            }
            if(customer && customer.pmb){
                updateData.pmb = customer.pmb;
                updateData.pmbString = customer.pmb;
                var pmb =  customer.pmb;
                if((pmb > 0 && pmb <= 1999) || (pmb >= 4000 && pmb <= 4999)) {
                    updateData.storeLocation = 'CABLEBEACH';
                }
                else if((pmb >= 3000 && pmb <= 3999)){
                    updateData. storeLocation = 'ALBANY';
                }else{
                    updateData. storeLocation = '';
                }                                                                           
            }
            if(shipper && shipper.name){
                updateData.shipperName = shipper.name;
            }
            var update = await Package.updateOne({_id:pack._id},updateData);
            var updateHistory = await PackageHistory.updateOne({_id:pack._id},updateData);
        }
    }
    return true
  }).then(() => {
    console.log('Packages other detail updated successfully!!');
    process.exit();
  }).catch((error) => {
    console.error('Error while updating package', error);
    process.exit();
  });