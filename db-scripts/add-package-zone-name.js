'use strict';

// Importing Environment Variables
require('dotenv').config();

const createConnection = require('../Util/mongo');
const Package = require('../models/package');
const PackageHistory = require('../models/packageHistory');
const Zone = require('../models/zone');

createConnection()
  .then(() => {
    return Package.find({$and :[{zoneId :{$exists : true}},{zoneName : {$exists: false}}]},async (err, response) => {
        if (err) {
          console.error('Error while finding packages ', err);
          process.exit();
        }
        return response
      })
  }).then(async(data) => {
    console.log("pkgs length",data.length)
    for(let pack of data){
      let pkgObj = {}
      let zoneResult = await Zone.findOne({_id : pack.zoneId})
      pkgObj.zoneName = (zoneResult && zoneResult.name) ? zoneResult.name : ''
      var update = await Package.updateOne({_id:pack._id},pkgObj);
      var updateHistory = await PackageHistory.updateOne({_id:pack._id},pkgObj);
    }
    return true
  }).then(() => {
    console.log('Packages with zoneName updated successfully!!');
    process.exit();
  }).catch((error) => {
    console.error('Error while updating package', error);
    process.exit();
  });