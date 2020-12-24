'use strict';

// Importing Environment Variables
require('dotenv').config();

const createConnection = require('../Util/mongo');
const Package = require('../models/package');
const Zone = require('../models/zone');
const Location = require('../models/location');

createConnection()
  .then(() => {
      return Package.find({},async(err,response)=>{
        if (err) {
            console.error('Error while finding packages ', err);
            process.exit();
          }
          return response
      })
  }).then(async(data) => {
    for(let pkg of data){
      if(pkg.zoneId){
        let zoneResult = await Zone.findOne({_id:pkg.zoneId})
        // var packIds = [...new Set(zone.package)]
        console.log("pkg",pkg._id,zoneResult._id)
        await Location.findByIdAndUpdate({_id : zoneResult.location},{ $push: { packages: pkg._id }})
      }
    }
    console.log("return")
    return true;
  }).then(() => {
    console.log('Packageids is update in customer successfully!!');
    process.exit();
  }).catch((error) => {
    console.error('Error while updating customer', error);
    process.exit();
  });
      