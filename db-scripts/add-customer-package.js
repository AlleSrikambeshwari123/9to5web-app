'use strict';

// Importing Environment Variables
require('dotenv').config();

const createConnection = require('../Util/mongo');
const Package = require('../models/package');
const Awb = require('../models/awb');
const Customer = require('../models/customer');

createConnection()
  .then(() => {
    return Package.aggregate([
      {
        $group:{
          _id:"$customerId", 
          package:{$push:"$_id"
          }
      }
    }
    ],async (err, response) => {
        if (err) {
          console.error('Error while finding packages ', err);
          process.exit();
        }
        return response
      })
  }).then(async(data) => {
    for(let customer of data){
      var packIds = [...new Set(customer.package)]
      await Customer.findByIdAndUpdate({_id:customer._id}, {package:packIds});
    }
    return true;
  }).then(() => {
    console.log('Packageids is update in customer successfully!!');
    process.exit();
  }).catch((error) => {
    console.error('Error while updating customer', error);
    process.exit();
  });
      

