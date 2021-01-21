'use strict';

// Importing Environment Variables
require('dotenv').config();

const createConnection = require('../Util/mongo');
const Pricelabel = require('../models/pricelabel');


createConnection()
  .then(() => {
    console.log('******finding all pricelables******');
    return Pricelabel.find({"createdAt" : {$lte:new Date("2021-01-19")} }, async (err, result) => {
      if (err) {
        console.error('Error while finding pricelabels ', err);
        process.exit();
      }
      return result
    })
  }).then(async (priceLabels) => {
    let count = 0    
    return new Promise(async (resolve, reject)=>{
      console.log("pricelabels length",priceLabels.length)
      for (let price of priceLabels) {
        if(price.OverrideFreight == 0){
            price.OverrideFreight = price.Freight
        }
        if(price.OverrideInsurance == 0){
            price.OverrideInsurance = price.Insurance
        }
        await Pricelabel.updateOne({_id : price._id},price)
        if(count == priceLabels.length-1){
            return resolve()
        }
        count++
      }
    })
  }).then(() => {
    console.log('Pricelabels updated successfully!!');
    process.exit();
  }).catch((error) => {
    console.error('Error while updating pricelabels.', error);
    process.exit();
  });
