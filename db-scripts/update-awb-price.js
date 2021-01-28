'use strict';

// Importing Environment Variables
require('dotenv').config();

const createConnection = require('../Util/mongo');
const Awb = require('../models/awb');
const AwbHistory = require('../models/awbHistory');
const PriceLabel = require('../models/pricelabel');

createConnection()
  .then(() => {
    return Awb.find({},async (err, response) => {
        if (err) {
          console.error('Error while finding awbs ', err);
          process.exit();
        }
        return response
      })
  }).then(async(data) => {
      console.log("data",data.length)
    for(let awb of data){
      let priceLabelResult = await PriceLabel.findOne({awbId : awb._id})
      if(priceLabelResult && priceLabelResult.SumOfAllCharges){
        await Awb.updateOne({_id:awb._id},{finalPrice : priceLabelResult.SumOfAllCharges});
        await AwbHistory.updateOne({_id:awb._id},{finalPrice : priceLabelResult.SumOfAllCharges});
      }
    }
    return true
  }).then(() => {
    console.log('Awbs price updated successfully!!');
    process.exit();
  }).catch((error) => {
    console.error('Error while updating awbs', error);
    process.exit();
  });