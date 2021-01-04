'use strict';

// Importing Environment Variables
require('dotenv').config();

const createConnection = require('../Util/mongo');
const Package = require('../models/package');
const Awb = require('../models/awb');
const PackageHistory = require('../models/packageHistory');


createConnection()
  .then(() => {
    console.log('******finding all packages******');
    return Package.find({}, async (err, result) => {
      if (err) {
        console.error('Error while finding packages ', err);
        process.exit();
      }
      return result
    })
  }).then(async (pkgs) => {
    let count = 0    
    return new Promise(async (resolve, reject)=>{
      console.log("pkgs length",pkgs.length)
      for (let pkg of pkgs) {
        let pkgObj = pkg.toJSON()
        const pkgResult = new PackageHistory(pkgObj);
        await pkgResult.save((err)=>{
          if(err){
            console.log("Package not added with _id = ",pkgObj._id)
          }
          if(count == pkgs.length-1){
            return resolve()
          }
          count++
        })
      }
    })
  }).then(() => {
    console.log('Packages added successfully!!');
    process.exit();
  }).catch((error) => {
    console.error('Error while adding Packages.', error);
    process.exit();
  });
