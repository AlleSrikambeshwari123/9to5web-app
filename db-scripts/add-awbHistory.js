'use strict';

// Importing Environment Variables
require('dotenv').config();

const createConnection = require('../Util/mongo');
const Package = require('../models/package');
const Awb = require('../models/awb');
const AwbHistory = require('../models/awbHistory');


createConnection()
  .then(() => {
    console.log('******finding all awbs******');
    return Awb.find({}, async (err, result) => {
      if (err) {
        console.error('Error while finding awbs ', err);
        process.exit();
      }
      return result
    })
  }).then(async (awbs) => {
    let count = 0    
    return new Promise(async (resolve, reject)=>{
      console.log("awbs length ",awbs.length)
      for (let awb of awbs) {
        let awbObj = awb.toJSON()
        if(!awbObj.po_number || !awbObj.po_number == undefined ){
          awbObj.po_number = Math.floor(100000 + Math.random() * 90000000);
        }
        const awbResult = new AwbHistory(awbObj);
        await awbResult.save((err)=>{
          if(err){
            console.log("Awb not added with awbId = ",awbObj.awbId)
          }
          if(count == awbs.length-1){
            return resolve()
          }
          count++
        })
      }
    })
  }).then(() => {
    console.log('AWBS added successfully!!');
    process.exit();
  }).catch((error) => {
    console.error('Error while adding AWBS.', error);
    process.exit();
  });
