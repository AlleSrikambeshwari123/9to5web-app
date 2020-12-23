'use strict';

// Importing Environment Variables
require('dotenv').config();

const createConnection = require('../Util/mongo');
const Awb = require('../models/awb');
const Carrier = require('../models/carrier');

createConnection()
  .then(() => {
    return Awb.find(async(err,response)=>{            
        if (err) {
            console.error('Error while finding packages ', err);
            process.exit();
        }
        return response;
    })
  }).then(async(data) => {
      if(data && data.length){
        for(let awb of data){
            var carrierData = await Carrier.findOne({_id:awb.carrier});
            var updateData = {          
                carrierName:( carrierData && carrierData.name)?carrierData.name:'',
            }
            await Awb.findByIdAndUpdate({_id:awb._id}, updateData);
        }
    }
    return true;
  }).then(() => {
    console.log('carrier is update in awb successfully!!');
    process.exit();
  }).catch((error) => {
    console.error('Error while updating awb', error);
    process.exit();
  });