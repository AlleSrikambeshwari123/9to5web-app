'use strict';

// Importing Environment Variables
require('dotenv').config();

const createConnection = require('../Util/mongo');
const Company = require('../models/company');
const STRINGS = require('../Res/strings');
const fs = require('fs');
const AwbStatus = require('../models/awbStatus');
const Awb = require('../models/awb');
const ReportCsv = require('../models/reportcsv');
var helpers = require('../views/helpers');
var Mail = require('../Util/EmailService');
const createCsvWriter = require('csv-writer').createObjectCsvWriter;
const { workerData, parentPort }  = require('worker_threads');

console.log(workerData)
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

var d = new Date();
var time = d.getTime();
var filename = time+'_allawbstatus.csv'
createConnection()
  .then(() => {
    AwbStatus.aggregate([
      {$match:searchData},
      {
        $lookup:{
          from: "users",
          localField: "User",
          foreignField: "_id",
          as: "User"
         }
    }]).exec(async function(err,data){
      if(err){
        console.log(err);
      }
      const csvWriter = createCsvWriter({
        path: 'public/reportcsv/'+filename,
        header: [
            {id: 'awbid', title: 'AWB Id'},
            {id: 'employeeName', title: 'Employee Name'},
            {id:'status', title: 'Status'},
            {id:'date', title: 'Date'}
        ]
      });
      const records = [];
      for(var i=0;i<data.length; i++){
        var item = data[i];
        var awbData = await Awb.findOne({_id:item.awbId});        
        records.push(
              {
               awbid: awbData.awbId,
               employeeName: data[i].User[0].username,
               status:data[i].action,
               date:helpers.formatDate(data[i].createdAt)
              }
            )   
      }
      csvWriter.writeRecords(records)       // returns a promise
        .then(async() => {  
          var html = `Hi,<br/><br/>
          Your report has been generated.  Please check the dashboard for the download link.`
          await Mail.sendReportEmail(workerData.email,"All Awb Report", html);
          console.log(workerData.email);
          var detail = {
            reportType: 'ALLAWBSTATUS',
            dateFrom:stdate,
            dateTo:endate,
            dateRange: daterange,
            userId:workerData.userId,
            fileName:filename
          }
          var newReport = new ReportCsv(detail)
          await newReport.save();
          console.log('...Done');
        });
    })
  })
  
parentPort.postMessage(  { fileName: workerData, status: 'Done' })
