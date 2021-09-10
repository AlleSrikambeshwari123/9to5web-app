'use strict';

// Importing Environment Variables
require('dotenv').config();

const createConnection = require('../Util/mongo');
const Package = require('../models/package');
const Barcode = require('../models/barcode');


createConnection()
  .then(() => {
    console.log('******Finding all packages******');
    return Package.find({},async (err, response) => {
      if (err) {
        console.error('Error while finding packages ', err);
        process.exit();
      }
      return response
    })
  })
  .then(async(data) => {
    await Barcode.updateMany({},{status : "unused"})
    for(let pack of data){
      await Barcode.updateOne({_id : pack.originBarcode},{status : "used"})
    }
    return true
  })
  .then(() => {
    console.log('Barcode statuses are updated successfully!!');
    process.exit();
  })
  .catch((error) => {
    console.error('Error while updating the barcode status', error);
    process.exit();
  });
