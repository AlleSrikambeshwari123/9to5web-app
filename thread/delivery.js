'use strict';

// Importing Environment Variables
require('dotenv').config();

const createConnection = require('../Util/mongo');
const STRINGS = require('../Res/strings');
const fs = require('fs');
const PackageHistory = require('../models/packageHistory');
const ReportCsv = require('../models/reportcsv');
var helpers = require('../views/helpers');
var Mail = require('../Util/EmailService');
const createCsvWriter = require('csv-writer').createObjectCsvWriter;
const { workerData, parentPort }  = require('worker_threads');
var daterange = workerData.daterange;
var date_arr  = daterange.split('-');
var startDate = (date_arr[0]).trim();      
var stdate = new Date(startDate);
stdate.setDate(stdate.getDate()+1 );

var endDate = (date_arr[1]).trim();
var endate = new Date(endDate);
endate.setDate(endate.getDate() +1);

stdate = new Date(stdate.setUTCHours(0,0,0,1));
endate = new Date(endate.setUTCHours(23,59,59,0));
var searchData = {deliveryId: { $exists: true, $ne: null },createdAt : {"$gte":stdate, "$lte": endate}};

var d = new Date();
var time = d.getTime();
var filename = time+'_deliverydetail.csv'
createConnection()
  .then(() => {
    PackageHistory.aggregate([
      {$match:searchData},
      {
        $lookup:{
          from: "deliveries",
          localField: "deliveryId",
          foreignField: "_id",
          as: "delivery"
         }
    },
    {$unwind:"$delivery"},
    {
        $lookup:{
          from: "drivers",
          localField: "delivery.driverId",
          foreignField: "_id",
          as: "driver"
         }
    },
    {$unwind:"$driver"}
]).exec(async function(err,data){
    
      if(err){
        console.log(err);
      }
      const csvWriter = createCsvWriter({
        path: 'public/reportcsv/'+filename,
        header: [
            {id: 'barcode', title: 'Original Barcode'},
            {id: 'driverName', title: 'Driver Name'},
            {id: 'date', title: 'Date'},
            {id:'status', title: 'Status'},
            {id:'location', title: 'Location'}
        ]
      });
      const records = [];
      for(var i=0;i<data.length; i++){
        var item = data[i]; 
        var driverName = '';
        if(item.driver ){
          var driverData = item.driver;
          driverName = (driverData.firstName?driverData.firstName:'') + (driverData.lastName?' '+driverData.lastName:'')
        } 
        var dat = helpers.formatDate(item.delivery.delivery_date)// moment(item.delivery_date).format("DD MMM, YYYY | hh:mm")             
        records.push(
              {
                barcode: item.barcode?item.barcode:'',
               driverName: driverName,
               date:dat,
               status:item.lastStatusText,
               location:(item.storeLocation?item.storeLocation:'-')
              }
            )   
      }      
      csvWriter.writeRecords(records)       // returns a promise
        .then(async() => {  
          var html = `Hi,<br/><br/>
          Your report has been generated.  Please check the dashboard for the download link.`
          await Mail.sendReportEmail(workerData.email,"Delivery Detail Report", html);
          console.log(workerData.email);
          var detail = {
            reportType: 'DELIVERYDETAIL',
            dateFrom:stdate,
            dateTo:endate,
            dateRange: daterange,
            userId:workerData.userId,
            fileName:filename
          }
          var newReport = new ReportCsv(detail)
          await newReport.save();
          console.log('...Done delivery detail');
        });
    })
  })
  
parentPort.postMessage(  { fileName: workerData, status: 'Done' })
