'use strict';

// Importing Environment Variables
require('dotenv').config();

const createConnection = require('../Util/mongo');
const Package = require('../models/package');
const Awb = require('../models/awb');


createConnection()
  .then(() => {
    console.log('******finding all packages******');
    return Package.find({},async (err, response) => {
      if (err) {
        console.error('Error while finding packages ', err);
        process.exit();
      }
      return response
    })
  })
  .then(async(data) => {
    for(let pack of data){
      let awb = await Awb.findById(pack.awbId)
      if(awb == null){
        let packdelete = await Package.deleteOne({_id : pack._id})
      }
    }
    return true
  })
  .then(() => {
    console.log('Packages with null awb are removed successfully!!');
    process.exit();
  })
  .catch((error) => {
    console.error('Error while inserting the defaultCompanies', error);
    process.exit();
  });
