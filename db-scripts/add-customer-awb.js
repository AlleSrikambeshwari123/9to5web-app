'use strict';

// Importing Environment Variables
require('dotenv').config();

const createConnection = require('../Util/mongo');
const Awb = require('../models/awb');
const Customer = require('../models/customer');

createConnection()
  .then(() => {
    return Awb.aggregate([
      {
        $group:{
          _id:"$customerId", 
          awb:{$push:"$_id"}
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
      var awbIds = [...new Set(customer.awb)]
      await Customer.findByIdAndUpdate({_id: customer._id}, {awb: awbIds});
    }
    return true;
  }).then(() => {
    console.log('Awbids update in customer  successfully!!');
    process.exit();
  }).catch((error) => {
    console.error('Error while updating customer', error);
    process.exit();
  });
      

