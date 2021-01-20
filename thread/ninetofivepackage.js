'use strict';

// Importing Environment Variables
require('dotenv').config();

const createConnection = require('../Util/mongo');
const mongoose = require('mongoose');
const Company = require('../models/company');
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
stdate.setDate(stdate.getDate() );

var endDate = (date_arr[1]).trim();
var endate = new Date(endDate);
endate.setDate(endate.getDate());

stdate = new Date(stdate.setUTCHours(0,0,0,1));
endate = new Date(endate.setUTCHours(23,59,59,0));
var searchData = {pmb:9000, createdAt : {"$gte":stdate, "$lte": endate}};

if (workerData.users && workerData.users != "all") {
    searchData['createdBy'] = mongoose.Types.ObjectId(workerData.users);
}
if(workerData.package_status && workerData.package_status!="all"){
    searchData['lastStatusText'] = workerData.package_status;
}

var d = new Date();
var time = d.getTime();
var filename = time+'_ninetofive.csv'
createConnection()
  .then(() => {
    PackageHistory.aggregate([
        {$match:searchData},
        {
            $project:{
                barcode:1,
                lastStatusText:1,
                awb: { $concat: [ "AWB", "", "$awbIdString" ] },
                customerFullName: 1,
                storeLocation:{ $ifNull: [ "$storeLocation", "-" ]},
                createdAt:1  
            }  
        }

     ]).exec(async function(err,data){
    
      if(err){
        console.log(err);
      }
      const csvWriter = createCsvWriter({
        path: 'public/reportcsv/'+filename,
        header: [
            {id: 'barcode', title: 'Original Barcode'},
            {id: 'status', title: 'Package Status'},
            {id: 'awbno', title: 'AWB Number'},
            {id: 'customerName', title: 'Customer Name'},
            {id: 'location', title: 'Store Location'}
        ]
      });
      const records = [];
      for(var i=0;i<data.length; i++){
        var item = data[i]; 
        
        var dat = helpers.formatDate(item.createdAt)           
        records.push({
                barcode: item.barcode?item.barcode:'',
                status:item.lastStatusText,
                awbno: item.awb,
                customerName:item.customerFullName,               
                location:(item.storeLocation?item.storeLocation:'-')
              })   
        }      
      csvWriter.writeRecords(records)       // returns a promise
        .then(async() => {  
          var html = `Hi,<br/><br/>
          Your report has been generated.  Please check the dashboard for the download link.`
          await Mail.sendReportEmail(workerData.email,"9to5 Packages Report", html);
          console.log(workerData.email);
          var detail = {
            reportType: 'NINETOFIVEPACKAGE',
            dateFrom:stdate,
            dateTo:endate,
            dateRange: daterange,
            userId:workerData.userId,
            fileName:filename
          }
          var newReport = new ReportCsv(detail)
          await newReport.save();
          console.log('...Done NINETOFIVEPACKAGE detail');
        });
    })
  })
  
parentPort.postMessage(  { fileName: workerData, status: 'Done' })
