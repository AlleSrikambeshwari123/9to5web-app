
// Importing Environment Variables
require('dotenv').config();

const createConnection = require('../Util/mongo');
const STRINGS = require('../Res/strings');
const fs = require('fs');
var abc =1;
const Awb = require('../models/awb');
const ReportCsv = require('../models/reportcsv');
var helpers = require('../views/helpers');
var Mail = require('../Util/EmailService');
const createCsvWriter = require('csv-writer').createObjectCsvWriter;
const { workerData, parentPort }  = require('worker_threads');

var daterange = workerData.daterange;
var date_arr  = daterange.split('-');
var startDate = (date_arr[0]).trim();      
var stdate = new Date(startDate);
stdate.setDate(stdate.getDate());

var endDate = (date_arr[1]).trim();
var endate = new Date(endDate);
endate.setDate(endate.getDate());

stdate = new Date(stdate.setUTCHours(0,0,0,1));
endate = new Date(endate.setUTCHours(23,59,59,0));
var searchData = { createdAt : {"$gte":stdate, "$lte": endate}};
var d = new Date();
var time = d.getTime();
var filename = time+'_users.csv'
createConnection()
  .then(() => {
    const mongoose = require('mongoose');
    var db = mongoose.connection;
    Awb.aggregate([
      {$match:searchData},
      {
        $group:{
          _id:"$createdBy",
          awbCount:{$sum:1}
        }
      },
      {
        $lookup:{
          from:"users",
          localField: "_id",
          foreignField:"_id",
          as:"user"
        }
      },
      {$unwind:"$user"}
    ]).exec(async function(err,data){
    
      if(err){
        console.log(err);
      }
      const csvWriter = createCsvWriter({
        path: 'public/reportcsv/'+filename,
        header: [
            {id: 'userName', title: 'Username'},
            {id: 'name', title: 'Name'},
            {id: 'toalawb', title: 'Total AWB Created'},
            {id: 'userEmail', title: 'User Email'}
        ]
      });
      const records = [];
      for(var i=0;i<data.length; i++){
        var item = data[i].user; 
        var name = item.firstName +(item.lastName?' '+item.lastName:'')
        var dat = helpers.formatDate(item.createdAt)  ;

        records.push({
            userName: item.username?item.username:'',
            name:name,
            toalawb: data[i].awbCount,
            userEmail:item.email              
            })   
        }      
      csvWriter.writeRecords(records)       // returns a promise
        .then(async() => {  
          var html = `Hi,<br/><br/>
          Your report has been generated.  Please check the dashboard for the download link.`
          await Mail.sendReportEmail(workerData.email,"users Report", html);
          console.log(workerData.email);
          var detail = {
            reportType: 'USERS',
            dateFrom:stdate,
            dateTo:endate,
            dateRange: daterange,
            userId:workerData.userId,
            fileName:filename
          }
          var newReport = new ReportCsv(detail)
          await newReport.save();
          console.log('...Done USERS detail');
        });
    })
  })
  
parentPort.postMessage(  { fileName: workerData, status: 'Done' })
