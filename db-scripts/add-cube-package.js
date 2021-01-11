'use strict';

// Importing Environment Variables
require('dotenv').config();

const createConnection = require('../Util/mongo');
const Package = require('../models/package');
const PackageHistory = require('../models/packageHistory');

createConnection()
  .then(() => {
    return Package.find({packageType : 'Cube'},async (err, response) => {
        if (err) {
          console.error('Error while finding packages ', err);
          process.exit();
        }
        return response
      })
  }).then(async(data) => {
      
    for(let pack of data){
      let pkgObj = {}
      pkgObj.masterDescription = pack.description
      pkgObj.masterWeight =  pack.weight
      pkgObj.masterDimensions = pack.dimensions
      var update = await Package.updateOne({_id:pack._id},pkgObj);
      var updateHistory = await PackageHistory.updateOne({_id:pack._id},pkgObj);
    }
    return true
  }).then(() => {
    console.log('Cube package details updated successfully!!');
    process.exit();
  }).catch((error) => {
    console.error('Error while updating package', error);
    process.exit();
  });