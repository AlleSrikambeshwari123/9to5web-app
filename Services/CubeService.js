
const strings = require('../Res/strings');
const csv = require('csvtojson');
const mongoose = require('mongoose');
var uniqId = require('uniqid');

// var client = require('./dataContext').redisClient;
// var lredis = require('./redis-local');
// const HAZMAT_ID = strings.redis_id_hazmat;
// const PREFIX = strings.redis_prefix_hazmat;

const Cube = require('../models/cube');
const Package = require('../models/package');
const Awb = require('../models/awb');

class CubeService {  
  getCubes() {
    return new Promise((resolve, reject) => {
      Cube.find({}).populate('userId').populate('cubepackageId').exec(async (err, result) => {
        if (err) {
          resolve([]);
        } else {
          for(let i=0;i<result.length;i++){
            var cube = result[i];
            const awbId = (cube.cubepackageId && cube.cubepackageId.awbId)?cube.cubepackageId.awbId:null;
            const awbData = await Awb.findOne({_id:awbId});
            
            result[i]['awbId'] = awbData.awbId?awbData.awbId:'';
          }
          //console.log(result)
          resolve(result);
        }
      })
    })
  }
  createCube(cube) {
    return new Promise((resolve, reject) => {
      const newCube = new Cube(cube)
      newCube.save(async (err, result) => {
        if (err) {
          console.log(err);
          resolve({ success: false, message: strings.string_response_error, data:null });
        } else {                  
          resolve({ success: true, message: strings.string_response_added, data:result });
        }
      });
    });
  }
  updateCube(id, cube) {
    return new Promise((resolve, reject) => {
      const updatedCubeData = {
        name: cube.name, 
        description: cube.description
      };
      Cube.findOneAndUpdate({_id: id}, updatedCubeData, (err, result) => {
        if (err) {
          resolve({ success: false, message: strings.string_response_error });
        } else {
          resolve({ success: true, message: strings.string_response_updated });
        }
      });
    })
  }
  removeCube(id) {
    return new Promise((resolve, reject) => {
      Cube.deleteOne({_id: id}, (err, result) => {
        if (err) {
          resolve({ success: false, message: strings.string_not_found_hazmat });
        } else {
          resolve({ success: true, message: strings.string_response_removed });
        }
      })
    })
  }

  removeAll() {
    return new Promise((resolve, reject) => {
      Cube.deleteMany({}, (err, result) => {
        if (err) {
          resolve([]);
        } else {
          resolve(result);
        }
      })
    });
  }

  async packageDetail(packageId){
    const packageDetail = await Package.findOne({_id:packageId});
    return packageDetail;
  }

 async createPackage(cubeData, packageDetail){
   return new Promise(async (resolve, reject) => {    
      const detail = {
        id:Date.now().toString(),
        trackingNo:uniqId(),
        description:cubeData.name,
        weight:0,
        dimensions:packageDetail.dimensions,
        packageCalculation:packageDetail.packageCalculation,
        customerId:cubeData.createdBy,
        packageType:packageDetail.packageType,
        awbId:packageDetail.awbId,
        shipperId:packageDetail.shipperId,
        carrierId:packageDetail.carrierId,
        createdBy:packageDetail.createdBy,
        originBarcode:packageDetail.originBarcode, 
      };      
      const newPackage = new Package(detail)
      const result = await newPackage.save();
      await Package.updateOne({_id:(result._id).toString()},{originBarcode:result._id});
      resolve(result);
   });
  }

  updatePackage(body,id){
    return new Promise((resolve, reject) => { 
      Package.updateOne({_id:id},{description:body.name}).exec((err,data)=>{
        if (err) {
          resolve({ success: false, message: strings.string_response_error });
        } else {
          resolve({ success: true, message: strings.string_response_updated });
        }
      })
    })
  }

  assignPackage(id, updatedCubeData){
    return new Promise((resolve, reject) => {     
      Cube.updateOne({_id: id}, updatedCubeData, (err, result) => {
        if (err) {
          resolve({ success: false, message: strings.string_response_error });
        } else {
          resolve({ success: true, message: strings.string_response_updated });
        }
      });
    })
  }

  updatePackageCubeId(packageIds, cubeId){
    return Package.updateMany({_id: {$in:packageIds}}, {"$set":{cubeId: cubeId}});
  }

  getPackageIds(trackingNo){
    return new Promise((resolve, reject) => {     
      Package.find({trackingNo: {$in:trackingNo}}).exec((err, result) => {
        if (err) {
          resolve({ success: false, message: strings.string_response_error });
        } else {          
          const packageIds = [];
          result.map((packageData)=>{
            packageIds.push(packageData._id)
          });          
          resolve(packageIds);
        }
      });
    })
  }

 allCubes(){
   return new Promise((resolve, reject) => { 
    Cube.aggregate([
      {
        $lookup:{
          from:"packages",
          localField:"packages",
          foreignField:"_id",
          as:"packages"
        }
      },
      {
        $lookup:{
            from:"packages",
            localField:"cubepackageId",
            foreignField:"_id",
            as:"cubeDetail"
          }
      },
      {$unwind:"$cubeDetail"},
      {
        $project:{_id:1, packages:1,name:1, "cubeDetail._id":1, "cubeDetail._id":1, "cubeDetail.trackingNo":1}
      }
      ]).exec((err, result) => {
        resolve(result);
      })    
    })
  }

  async getCubeDetail(id){
    const data = await Cube.findOne({_id:id});
    return data;
  }

  getCube(id){
    if(typeof id == "string"){
      id = mongoose.Types.ObjectId(id);
    }
    return new Promise((resolve, reject) => { 
    Cube.aggregate([
      {
        $match:{_id:id}
      },  
      {
        $lookup:{
          from:"packages",
          localField:"packages",
          foreignField:"_id",
          as:"packages"
        }
      },
      {
        $lookup:{
            from:"packages",
            localField:"cubepackageId",
            foreignField:"_id",
            as:"cubeDetail"
          }
      },
      {$unwind:"$cubeDetail"},
      {
        $project:{_id:1, packages:1,name:1, "cubeDetail._id":1, "cubeDetail._id":1, "cubeDetail.trackingNo":1}
      }
      ]).exec((err, result) => {
        if(result && result.length>0){
          resolve(result[0]);
        }else{
          resolve({})
        }
        
      })    
    })
  }

  async getCubeName(name, type){
    let now = new Date();
    let year = "" + now.getFullYear();
        year = year.toString().substr(-2);
    let month = "" + (now.getMonth() + 1); if (month.length == 1) { month = "0" + month; }
    let day = "" + now.getDate(); if (day.length == 1) { day = "0" + day; }
    let hour = "" + now.getHours(); if (hour.length == 1) { hour = "0" + hour; }
    let minute = "" + now.getMinutes(); if (minute.length == 1) { minute = "0" + minute; }       
    return name+month + day +  year + "-" + type ;    
  }
  //used by detail page of admin
  async CubeDtail(id){
    return new Promise((resolve, reject) => {   
      Cube.findOne({_id:id}).populate('userId').populate('cubepackageId').exec(async (err, cube) => {        
        const awbId = (cube.cubepackageId && cube.cubepackageId.awbId)?cube.cubepackageId.awbId:null;
        const awbData = await Awb.findOne({_id:awbId});
        cube = JSON.parse(JSON.stringify(cube));
        cube.awbId = (awbData && awbData.awbId)?awbData.awbId:'';
        resolve(cube); 
      })  
    })
  }

}

module.exports = CubeService;