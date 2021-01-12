'use strict';

// Importing Environment Variables
require('dotenv').config();

const createConnection = require('../Util/mongo');
const Package = require('../models/package');
const PackageHistory = require('../models/packageHistory');
const PackageStatus = require('../models/packageStatus');

createConnection()
  .then(() => {
    return Package.find({$or :[{lastStatusText :{$exists : false}},{lastStatusText : ''},{lastStatusText : null}]},async (err, response) => {
        if (err) {
          console.error('Error while finding packages ', err);
          process.exit();
        }
        return response
      })
  }).then(async(data) => {
      
    for(let pack of data){
      let pkgObj = {}
      let packageStatusResult = await PackageStatus.find({packageId : pack._id}).sort({ updatedAt: -1 })[0]
      if(packageStatusResult && packageStatusResult.status){
        pkgObj.lastStatusText = packageStatusResult.status
      }else{
        pkgObj.lastStatusText = 'Received in FLL'
        let statusObj = new PackageStatus( {packageId : pack._id,status : pkgObj.lastStatusText});
        await statusObj.save()
      }
      var update = await Package.updateOne({_id:pack._id},pkgObj);
      var updateHistory = await PackageHistory.updateOne({_id:pack._id},pkgObj);
    }
    return true
  }).then(() => {
    console.log('Package status updated successfully!!');
    process.exit();
  }).catch((error) => {
    console.error('Error while updating package', error);
    process.exit();
  });