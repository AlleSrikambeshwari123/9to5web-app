
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
const AwbHistory = require('../models/awbHistory');
const CubeAwb = require('../models/cubeawb');
const Cube2Type = require('../models/cube2Type');

class CubeService {  
  getCubes(req) {
    var daterange = req.query.daterange?req.query.daterange:'';            
    var searchData = {};
    if(daterange){
      var date_arr = daterange.split('-');
      var startDate = (date_arr[0]).trim();      
      var stdate = new Date(startDate);
      stdate.setDate(stdate.getDate() +1);

       var endDate = (date_arr[1]).trim();
      var endate = new Date(endDate);
      endate.setDate(endate.getDate() +1);   
      
      stdate = new Date(stdate.setUTCHours(0,0,0,0));
      stdate = stdate.toISOString();
      endate = new Date(endate.setUTCHours(23,59,59,0));
      endate = endate.toISOString(); 
         
      searchData.createdAt = {"$gte":stdate, "$lte": endate};
    }

     if(!req.query.daterange && !req.query.clear){
      var endate = new Date();      
      endate.setDate(endate.getDate());
      var stdate = new Date();
      stdate.setDate(stdate.getDate() - parseInt(strings.default_days_table)); 
      
      stdate = new Date(stdate.setUTCHours(0,0,0,0));
      stdate = stdate.toISOString();
      endate = new Date(endate.setUTCHours(23,59,59,0));
      endate = endate.toISOString(); 
            
      searchData.createdAt = {"$gte":stdate, "$lte": endate};
    }
    if(req.query.clear){
      var endate = new Date();      
      endate.setDate(endate.getDate()+1);
      var stdate = new Date();
      stdate.setDate(stdate.getDate() -14); 
      
      stdate = new Date(stdate.setUTCHours(0,0,0,0));
      stdate = stdate.toISOString();
      endate = new Date(endate.setUTCHours(23,59,59,0));
      endate = endate.toISOString(); 
            
      searchData.createdAt = {"$gte":stdate, "$lte": endate};

    }
    return new Promise((resolve, reject) => {
      Cube.find(searchData).populate(['userId','cubeAwbId','cubepackageId']).exec(async (err, result) => {
        if (err) {
          resolve([]);
        } else {
          for(let i=0;i<result.length;i++){
            var cube = result[i];
            const awbId = (cube.cubepackageId && cube.cubepackageId.awbId)?cube.cubepackageId.awbId:null;
            const awbData = await AwbHistory.findOne({_id:awbId});
            result[i]['awbId'] = (awbData && awbData.awbId)?awbData.awbId:'';
            // let cubeAwbNo = result[i].cubeAwbId ? result[i].cubeAwbId.cubeAwbNo: ''
            // result[i]['awbId'] = 'C'+cubeAwbNo
          }
          resolve(result);
        }
      })
    })
  }

  async getAllCubes(req){

    var start = req.body.start ? parseInt(req.body.start) : 0;
    var length = req.body.length ? parseInt(req.body.length) : 10;
    var field = req.body['order[0][column]'] ?parseInt(req.body['order[0][column]']) : 0;
    var columns = {0:'createdAt', 1: 'createdAt', 2: 'name', 3:'description'} 
    var dir = req.body['order[0][dir]'] ? req.body['order[0][dir]'] : 0;
    var sort = (dir=='asc') ? 1 : -1;
    var sortField = columns[field];
    var search = req.body['search[value]'] ? req.body['search[value]'] : '';
    var daterange = req.body.daterange?req.body.daterange:''

    var searchData = {};

    if(daterange){
      var date_arr = daterange.split('-');
      var startDate = (date_arr[0]).trim();      
      var stdate = new Date(startDate);
      stdate.setDate(stdate.getDate() +1);

      var endDate = (date_arr[1]).trim();
      var endate = new Date(endDate);
      endate.setDate(endate.getDate() +1);   
      
      stdate = new Date(stdate.setUTCHours(0,0,0,0));
      stdate = stdate.toISOString();
      endate = new Date(endate.setUTCHours(23,59,59,0));
      endate = endate.toISOString(); 
         
      searchData.createdAt = {"$gte":stdate, "$lte": endate};
    }
    if(!req.body.daterange && !req.body.clear){
      var endate = new Date();      
      endate.setDate(endate.getDate());
      var stdate = new Date();
      stdate.setDate(stdate.getDate() - parseInt(strings.default_days_table));  
      
      stdate = new Date(stdate.setUTCHours(0,0,0,0));
      stdate = stdate.toISOString();
      endate = new Date(endate.setUTCHours(23,59,59,0));
      endate = endate.toISOString(); 
           
      searchData.createdAt = {"$gte":stdate, "$lte": endate};
    }
    if(search){
      searchData.$or = [
        {"name":{'$regex' : search, '$options' : 'i'}},        
      ]
    }
    var totalCube = await Cube.count(searchData);
    return new Promise(async(resolve, reject) => {
      Cube.find(searchData)
      .populate(['userId','cubeAwbId','cubepackageId'])
      .sort({[sortField]:sort})
      .skip(start)
      .limit(length)
      .exec(async(err, result) => {
        if (err) {
          resolve([]);
        } else {
          for(let i=0;i<result.length;i++){
            var cube = result[i];
            const awbId = (cube.cubepackageId && cube.cubepackageId.awbId)?cube.cubepackageId.awbId:null;
            const awbData = await Awb.findOne({_id:awbId});
            result[i]['awbId'] = (awbData && awbData.awbId)?awbData.awbId:'';
            // let cubeAwbNo = result[i].cubeAwbId ? result[i].cubeAwbId.cubeAwbNo: ''
            // result[i]['awbId'] = 'C'+cubeAwbNo
          }
          resolve({cubes:result, total: totalCube});
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
          const awb = await this.createAwbCube(result)
          if(awb.success) return resolve(awb)          
          resolve({ success: true, message: strings.string_response_added, data:result,awb:awb });
        }
      });
    });
  }

  createAwbCube(cbresult){
    return new Promise((resolve,reject)=>{
      let newAwbCube ={
        cubeId:cbresult.userId,
        cubeTrackingNo:cbresult.name,
        createdBy:cbresult.createdBy
      }
      const awb = new CubeAwb(newAwbCube)
      awb.save(async (err,result)=>{
        if(err){
          console.log(err)
          resolve({ success: false, message: strings.string_response_error, data:null });
        }else{
          const cube = await Cube.findOneAndUpdate({_id:cbresult.id},{cubeAwbId:result.id})
          resolve({ success: true, message: strings.string_response_added, awb:result,data:cube });
        }
      })
    })
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

  updateAwbCube(cube) {
    return new Promise((resolve, reject) => {
      const updatedCubeData = {
        weight : cube.weight,
        dimensions: cube.dimensions, 
        description: cube.description
      };
      CubeAwb.findOneAndUpdate({_id: cube.id}, updatedCubeData, async (err, result) => {
        if (err) {
          resolve({ success: false, message: strings.string_response_error });
        } else {
          // let cubeResult = await Cube.findOne({cubeAwbId : cube.id});
          // if(cubeResult && cubeResult.cubepackageId)
            // await Package.findOneAndUpdate({_id : cubeResult.cubepackageId},updatedCubeData)
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
    return new Promise(async (resolve, reject) => { 
      await Cube.findOneAndUpdate({_id: id},{$push :{packages: updatedCubeData.packages}})
      delete updatedCubeData.packages
      if(updatedCubeData.cubepackageId){
        Cube.updateOne({_id: id}, updatedCubeData, (err, result) => {
          if (err) {
            resolve({ success: false, message: strings.string_response_error });
          } else {
            resolve({ success: true, message: strings.string_response_updated });
          }
        });
      }    
      else{
        resolve({ success: true, message: strings.string_response_updated });
      }
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

  async allCubesForApp(){
    try {
      let cube = await Cube.find({}).select('name createdAt')
      // cube = await Promise.all(cube.map(cb=>{
      //   cb._doc['cubeDetail'] = cb.cubepackageId
      //   delete cb._doc.cubepackageId
      //   console.log(cb)
      //   return cb
      // }))
      if(cube === null) return ({success:false,message:strings.string_noData})
      return ({success:true,data:cube})
    } catch (error) {
      console.error({allCubesForApp:error})
      return ({success:false,message:strings.string_response_error})
    }
  }

  async getCubeDetail(id){
    const data = await Cube.findOne({_id:id});
    return data;
  }

  async getCube(id){
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
          from:"packagehistories",
          localField:"packages",
          foreignField:"_id",
          as:"packages"
        }
      },
      {
        $lookup:{
          from:"cubeawbs",
          localField:"cubeAwbId",
          foreignField:"_id",
          as:"cubeAwbDetail"
        }
      },
      {
        $lookup:{
            from:"packagehistories",
            localField:"cubepackageId",
            foreignField:"_id",
            as:"cubeDetail"
          }
      },
      {$unwind:"$cubeDetail"},
      {
        $project:{_id:1, packages:1,name:1,cubepackageId: 1, cubeDetail:1, cubeAwbDetail: 1}
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
        let awbData = await Awb.findOne({_id:awbId});
        if(!awbData)
          awbData = await AwbHistory.findOne({_id:awbId});
        cube = JSON.parse(JSON.stringify(cube));
        cube.awbId = (awbData && awbData.awbId)?awbData.awbId:'';
        resolve(cube); 
      })  
    })
  }

  async CubeAwbDetail(id){
    return new Promise((resolve, reject) => {   
      CubeAwb.findOne({_id:id}).populate('createdBy').exec(async (err, cube) => {        
        resolve(cube); 
      })  
    })
  }

  async getCube2Type(){
    return new Promise((resolve, reject) => {   
      Cube2Type.find({}).exec(async (err, cube) => {      
        if(err) resolve([])  
        else resolve(cube); 
      })  
    })
  }

  async deleteCube2Type(id){
    return new Promise((resolve, reject) => {   
      Cube2Type.deleteOne({_id:id}).exec(async (err, cube) => {      
        if (err) {
          resolve({ success: false, message: strings.string_response_error });
        } else {
          resolve({ success: true, message: strings.string_response_removed });
        }
      })  
    })
  }
  async addcube2type(data){
    return new Promise((resolve,reject)=>{
      let type = {
        type:data.type,
        createdBy:data.createdBy
      }
      let cube = new Cube2Type(type)
      cube.save(async (err,result)=>{
        if(err){
          resolve({ success: false, message: strings.string_response_error });
        }else{
          resolve({ success: true, message: strings.string_response_added, data:result})
        }
      })
    })
  }
  async updatecube2type(data){
    return new Promise((resolve,reject)=>{
      let type = {
        type:data.type,
      }
      Cube2Type.findOneAndUpdate({_id:data.id},type,async (err,result)=>{
        if(err){
          resolve({ success: false, message: strings.string_response_error });
        }else{
          resolve({ success: true, message: strings.string_response_updated})
        }
      })
    })
  }

  async getCubeCompleteData(id){
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
          from:"packagehistories",
          localField:"packages",
          foreignField:"_id",
          as:"packageList"
        }
      },
      {
        $lookup:{
            from:"packagehistories",
            localField:"cubepackageId",
            foreignField:"_id",
            as:"cubeDetail"
          }
      },
      {$unwind:"$cubeDetail"},
      // { 
      //   $lookup: {
      //     from: "manifests",
      //     localField: "cubeDetail.manifestId",
      //     foreignField: "_id",
      //     as: "maniFestObject" 
      //   }
      // },  
      //{$unwind:"$maniFestObject"},
      {
        $project:{_id:1, packageList:1,name:1,cubepackageId: 1, cubeDetail : 1}
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
  deletePackage(cubeId, packageId){
    console.log(cubeId,packageId)
    return new Promise((resolve, reject) => {
      Cube.updateOne({_id: cubeId}, {$pull: { packages:  packageId}}, (err, result) => {
        Package.updateOne({_id: cubeId}, {cubeId: null}, (err, result) => {
        if (err) {
          console.log(err)
          resolve({ success: false, message: err });
        } else {
          resolve({ success: true, message: strings.string_response_removed });
        }
      })
      })
    });
  }

}

module.exports = CubeService;