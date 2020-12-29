'use strict';

// Importing Environment Variables
require('dotenv').config();

const createConnection = require('../Util/mongo');
const Package = require('../models/package');
const Awb = require('../models/awb');
const PackageHistory = require('../models/packageHistory');
let awbIds = []

createConnection()
  .then(() => {
    console.log('******finding all packages******');
    return Awb.aggregate([   {
      $lookup:{
          from: "packages",
          localField: "packages",
          foreignField: "_id",
          as:"package"
      }
  },], async (err, result) => {
      if (err) {
        console.error('Error while finding packages ', err);
        process.exit();
      }
      return result
    })
  }).then(async (awbs) => {
    console.log("awb",awbs.length)
    let count = 0    
    return new Promise(async (resolve, reject)=>{
        for(let awbId of awbs){
            let flag = 0 
            for(let pkg of awbId.package){
                if(pkg.lastStatusText != "Received By Customer"){
                    flag =1
                }
            }
            if(flag == 0 && awbId.package.length>0){
                console.log("awb deleted",awbId.awbId)
                await Package.deleteMany({awbId : awbId})
                await Awb.deleteOne({_id : awbId})
            }
            if(count == awbs.length-1){
                return resolve()
            }
            count++
        }
    })
  }).then(() => {
    console.log('Packages added successfully!!');
    process.exit();
  }).catch((error) => {
    console.error('Error while adding Packages.', error);
    process.exit();
  });
