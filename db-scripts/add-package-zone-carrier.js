'use strict';

// Importing Environment Variables
require('dotenv').config();

const createConnection = require('../Util/mongo');
const Package = require('../models/package');
const Carrier = require('../models/carrier');
const Zone = require('../models/zone');


createConnection()
  .then(() => {
    return Package.find(async(err,response)=>{            
        if (err) {
            console.error('Error while finding packages ', err);
            process.exit();
        }
        return response;
    })
  }).then(async(data) => {
    if(data && data.length>0){
        for(let pack of data){
            var zoneData = await Zone.findOne({_id:pack.zoneId});
            var carrierData = await Carrier.findOne({_id:pack.carrierId});
            var updateData = {
                zoneName:(zoneData && zoneData.name )? zoneData.name:'',
                carrierName:(carrierData && carrierData.name )? carrierData.name:'',
            }
            await Package.findByIdAndUpdate({_id:pack._id}, updateData);
        }
    }
    return true;
  }).then(() => {
    console.log('zone and carrier is update in package successfully!!');
    process.exit();
  }).catch((error) => {
    console.error('Error while updating package', error);
    process.exit();
  });