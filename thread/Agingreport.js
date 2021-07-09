'use strict';

// Importing Environment Variables
require('dotenv').config();

const createConnection = require('../Util/mongo');
const mongoose = require('mongoose');
const STRINGS = require('../Res/strings');
const fs = require('fs');
const PackageStatus = require('../models/packageStatus');
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
endate.setDate(endate.getDate() );

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
var filename = time+'_agingreport.csv'



createConnection()
  .then(() => {
    PackageStatus.aggregate([
        { $match: searchData },
        {
            $group: {
                _id: "$packageId",
                lastPackageCreatedAt: { $last: "$createdAt" },
                status: { $last: "$status" },
                updatedBy: { $last: "$updatedBy" },
                packageLastId: { $last: "$packageId" }
            }
        }, {
            $lookup: {
                from: "users",
                localField: "updatedBy",
                foreignField: "_id",
                as: "userId"
            },
        }, {
            $unwind: '$userId'
        }, {
            $lookup: {
                from: "packagehistories",
                localField: "packageLastId",
                foreignField: "_id",
                as: "package"
            },
        }, {
            $unwind: '$package'
        },
        {
            $project: {
                _id: 0,
                barcode:"$package.barcode",
                packageId: '$package.id',
                user: {
                    firstName: '$userId.firstName',
                    lastName: '$userId.lastName'
                },
                updatedAt: '$lastPackageCreatedAt',
                status: 1
            }
        }
    ]).exec(async function(err,data){
    
      if(err){
        console.log(err);
      }
      const csvWriter = createCsvWriter({
        path: 'public/reportcsv/'+filename,
        header: [
            {id:'Tracking', title:'Tracking No'},
            {id:'PMB', title:'PMB'},
            {id:'consignee', title:'consignee'},
            {id:'awb', title:'AWB'},
            {id:'Shipper', title:'Shipper'},
            {id:'Store', title:'Store'},
            {id:'originalbarcode', title:'Original Barcode'},
            {id:'description', title:'Description'},
            {id:'status', title:'status'},
            {id:'statusdate', title:'status Date'},
            {id:'packagetype', title:'Package Type'},
            {id:'zone', title:'zone'},
            {id:'career', title:'career'},
            {id:'weight', title:'weight'},
            {id:'volumetricweight', title:'volumetricweight'},
            {id:'Express', title:'express'},
            {id:'aging', title:'aging'},
            {id:'agingdollar', title:'agingdollar'},


            {id: 'barcode', title: 'Original Barcode'},            
            {id:'status', title: 'Status'},
            {id:'user', title: 'User'},
            {id:'date', title: 'Date'}
        ]
      });
      const records = [];
      for(var i=0;i<data.length; i++){
        var item = data[i]; 
        records.push({
            barcode: item.barcode?item.barcode:'',            
            status:item.status,
            user:item.user.firstName + " " + item.user.lastName,
            date:helpers.formatDate(item.updatedAt)
        })   
      } 
      console.log(records)     
      csvWriter.writeRecords(records)       // returns a promise
        .then(async() => {  
          var html = `Hi,<br/><br/>
          Your report has been generated.  Please check the dashboard for the download link. <a href = "${process.env.BASE_URL_WEB}/reportcsv/${filename}">Download Now</a>.`
          await Mail.sendReportEmail(workerData.email,"Aging Report", html);
          console.log(workerData.email);
          var detail = {
            reportType: 'AgingReport',
            dateFrom:stdate,
            dateTo:endate,
            dateRange: daterange,
            userId:workerData.userId,
            fileName:filename
          }
          var newReport = new ReportCsv(detail)
          console.log(newReport,'newreportt')
          await newReport.save();
          console.log('...Done package detail');
        });
    })
  })
  
parentPort.postMessage(  { fileName: workerData, status: 'Done' })
