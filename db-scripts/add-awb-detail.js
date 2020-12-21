'use strict';

// Importing Environment Variables
require('dotenv').config();

const createConnection = require('../Util/mongo');
const Package = require('../models/package');
const Awb = require('../models/awb');
const Customer = require('../models/customer');
const Shipper = require('../models/shipper');

createConnection()
  .then(() => {
    return Awb.find({},async (err, response) => {
        if (err) {
          console.error('Error while finding packages ', err);
          process.exit();
        }
        return response
      })
  }).then(async(data) => {
      
    for(let awb of data){
        if(awb.customerId && awb.shipper ){
            let customer = await Customer.findById(awb.customerId);
            let shipper = await Shipper.findById(awb.shipper);
            if(customer && shipper){
                var updateData =  {
                    customerFirstName:customer.firstName,
                    customerLastName : customer.lastName,
                    customerFullName : customer.firstName + (customer.lastName?' '+ customer.lastName: ''),
                    shipperName : shipper.name,
                    pmb:customer.pmb,
                    pmbString: customer.pmb                    
                }       
                var update = await Awb.updateOne({_id:awb._id},updateData);
            }
        }
    }
    return true
  }).then(() => {
    console.log('Awbs other detail update successfully!!');
    process.exit();
  }).catch((error) => {
    console.error('Error while updating awbs', error);
    process.exit();
  });