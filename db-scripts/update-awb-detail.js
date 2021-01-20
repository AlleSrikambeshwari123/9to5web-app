'use strict';

// Importing Environment Variables
require('dotenv').config();

const createConnection = require('../Util/mongo');
const Package = require('../models/package');
const Awb = require('../models/awb');
const AwbHistory = require('../models/awbHistory');

const Customer = require('../models/customer');
const Shipper = require('../models/shipper');
const Carrier = require('../models/carrier');

createConnection()
  .then(() => {
    return Awb.find({$or :[ {awbIdString : {$exists : false} },{carrierName : {$exists : false} }]},async (err, response) => {
        if (err) {
          console.error('Error while finding awbs ', err);
          process.exit();
        }
        return response
      })
  }).then(async(data) => {
      console.log("data",data.length)
    for(let awb of data){
        if(awb.customerId && awb.shipper ){
            let customer = await Customer.findById(awb.customerId);
            let shipper = await Shipper.findById(awb.shipper);
            let carrier = await Carrier.findById(awb.carrier);
            if(customer && shipper && carrier){
                var updateData =  {
                    customerFirstName:customer.firstName,
                    customerLastName : customer.lastName,
                    customerFullName : customer.firstName + (customer.lastName?' '+ customer.lastName: ''),
                    shipperName : shipper.name,
                    pmb:customer.pmb,
                    pmbString: customer.pmb,
                    awbIdString: awb.awbId?awb.awbId:'' ,
                    carrierName: (carrier && carrier.name)? carrier.name : ''                  
                }       
                var update = await Awb.updateOne({_id:awb._id},updateData);
                var updateHistory = await AwbHistory.updateOne({_id:awb._id},updateData);
            }
        }
    }
    return true
  }).then(() => {
    console.log('Awbs other detail updated successfully!!');
    process.exit();
  }).catch((error) => {
    console.error('Error while updating awbs', error);
    process.exit();
  });