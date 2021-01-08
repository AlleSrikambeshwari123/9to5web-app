'use strict';

// Importing Environment Variables
require('dotenv').config();

const createConnection = require('../Util/mongo');
const mongoose = require('mongoose');
const STRINGS = require('../Res/strings');
const fs = require('fs');
const PackageHistory = require('../models/packageHistory');
const ReportCsv = require('../models/reportcsv');
var helpers = require('../views/helpers');
var Mail = require('../Util/EmailService');
const createCsvWriter = require('csv-writer').createObjectCsvWriter;

const PKG_STATUS = {
    0: 'Package Created',
    1: 'Received in FLL',
    2: 'Loaded on AirCraft',
    3: 'In Transit',
    4: 'In Warehouse Nassuau',
    5: 'Received By Customer',
    6: 'Delivered',
    7: 'No Invoice Present',
    8: 'Assigned to cube',
    9: 'Delivered to Store',
    10: 'Removed from Flight FLL'
};
let objArr = ['created', 'received_fill', 'loaded_craft', 'in_transit', 'received_nas',
      'ready_pd', 'delivered', 'no_invoice', 'assigned_to_cube', 'delivered_to_store'];

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
var searchData = {createdAt : {"$gte":stdate, "$lte": endate}};

if (workerData.users && workerData.users != 'all') {
    searchData['updatedBy'] = mongoose.Types.ObjectId(workerData.users);
}
if (workerData.package_status && workerData.package_status != 'all') {
    searchData['status'] = workerData.package_status;
}

var d = new Date();
var time = d.getTime();
var filename = time+'_packagestatus.csv';
console.log(searchData);
createConnection()
  .then(() => {
    PackageHistory.aggregate([{$match:searchData}]).exec((err,packages)=>{        
        if(err){console.log(err)}
        let obj = {
            created: 0,
            received_fill: 0,
            loaded_craft: 0,
            in_transit: 0,
            received_nas: 0,
            ready_pd: 0,
            delivered: 0,
            no_invoice: 0,
            assigned_to_cube: 0,
            delivered_to_store: 0
        };
        packages.map((item) => {
            if (!item.lastStatusText) obj.created += 1;
            if (item.lastStatusText == PKG_STATUS[1]) obj.received_fill += 1;
            if (item.lastStatusText == PKG_STATUS[2]) obj.loaded_craft += 1;
            if (item.lastStatusText == PKG_STATUS[3]) obj.in_transit += 1;
            if (item.lastStatusText == PKG_STATUS[4] || item.lastStatusText == 'Recieved in NAS') obj.received_nas += 1;
            if (item.lastStatusText == PKG_STATUS[5]) obj.ready_pd += 1;
            if (item.lastStatusText == PKG_STATUS[6]) obj.delivered += 1;
            if (item.lastStatusText == PKG_STATUS[7]) obj.no_invoice += 1;
            if (item.lastStatusText == PKG_STATUS[8]) obj.assigned_to_cube += 1;
            if (item.lastStatusText == PKG_STATUS[9]) obj.delivered_to_store += 1;
        })
        console.log(obj);
        const csvWriter = createCsvWriter({
            path: 'public/reportcsv/'+filename,
            header: [
                {id: 'status', title: 'Status'},            
                {id:'noofpackages', title: 'Number of Packages'}                
            ]
          });
          const records = [];
          for(var i=0;i< objArr.length; i++){
             
            records.push({
                status: PKG_STATUS[i],            
                noofpackages:obj[objArr[i]]
            })   
          } 
          console.log(records)     
          csvWriter.writeRecords(records)       // returns a promise
            .then(async() => {  
              var html = `Hi,<br/><br/>
              Your report has been generated.  Please check the dashboard for the download link.`
              await Mail.sendReportEmail(workerData.email,"Package Status Report", html);
              console.log(workerData.email);
              var detail = {
                reportType: 'PACKAGESTATUS',
                dateFrom:stdate,
                dateTo:endate,
                dateRange: daterange,
                userId:workerData.userId,
                fileName:filename
              }
              var newReport = new ReportCsv(detail)
              await newReport.save();
              console.log('...Done PACKAGESTATUS detail');
            });
    })    
  })
  
parentPort.postMessage(  { fileName: workerData, status: 'Done' })
