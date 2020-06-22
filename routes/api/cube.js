var express = require('express');
var router = express.Router();
var passport = require('passport');
require('./authHelper')
const strings = require('../../Res/strings');
var services = require('../../Services/RedisDataServices');
var middleware = require('../../middleware');
var moment = require('moment');
var mongoose = require('mongoose');

router.post('/create-cube', passport.authenticate('jwt', { session: false }), async(req, res, next) => {
    
  try{
        if(!req.body.type || !req.body.name){
          return res.send({ success: false, message: strings.string_response_error });
        } 
        const cubeName = await services.cubeService.getCubeName(req.body.name, req.body.type);       
        const detail = {
            cubepackageId:null,
            userId:req.body.userId,
            createdBy:req.body.userId,
            name:cubeName
        }       
        services.cubeService.createCube(detail).then(async result => {          
            res.send(result);
        })
    }catch(err){
        console.log(err);
        res.send({ success: false, message: strings.string_response_error });
    }
});

router.post('/update-cube/:id', async(req, res, next) => {
  try{
      const cubepackagedata = await services.cubeService.updatePackage(req.params.id,req.body); 
      const detail = { 
          name:req.body.name
      }       
      services.cubeService.updateCube(req.params.id,detail).then(result => {
          res.send(result);
      })
  }catch(err){
      console.log(err);
      res.send({ success: false, message: strings.string_response_error });
  }
});

router.post('/assign-packages/:id',passport.authenticate('jwt', { session: false }), async (req,res,next)=>{
    try{
      const cubeData = await services.cubeService.getCubeDetail(req.params.id);
      if(!cubeData){
        return res.send({ success: false, message: strings.string_response_error });
      }
            
      //const trackingNumber = req.body.trackingNumber;
      //const packageIds = await services.cubeService.getPackageIds(trackingNumber);
      const packageIds = req.body.packageIds?req.body.packageIds:'';
      const package = packageIds.split(',');
      const pid = [];
      for(let i=0;i<package.length;i++){
        pid.push(mongoose.Types.ObjectId(package[i]));
        await services.packageService.updatePackageStatus(package[i],8,req.body.userId);        
      }

      if(!package && package.length==0){        
        return res.send({ success: false, message: strings.string_response_error });
      }   
      const packageDetail = await services.cubeService.packageDetail(package[0]);
      if(!packageDetail){
        return res.send({ success: false, message: strings.string_response_error });
      }  
      packageDetail.packageType = "Cube";    
      const updateDetail = {packages:package};
      if(cubeData.cubepackageId==null){
        const cubepackageId = await services.cubeService.createPackage(cubeData, packageDetail);  
        updateDetail.cubepackageId = cubepackageId;
      }
      services.cubeService.assignPackage(req.params.id, updateDetail).then(async result => {
        await services.cubeService.updatePackageCubeId(pid, req.params.id);
        return res.send(result);
      })
    }catch(err){
      console.log(err)
      res.send({ success: false, message: strings.string_response_error });
    }
})

router.post('/web/assign-packages/:id',middleware().checkSession, async (req,res,next)=>{
  
    try{
      const cubeData = await services.cubeService.getCubeDetail(req.params.id);
      if(!cubeData){
        return res.send({ success: false, message: strings.string_response_error });
      }
            
      //const trackingNumber = req.body.trackingNumber;
      //const packageIds = await services.cubeService.getPackageIds(trackingNumber);
      const packageIds = req.body.packageIds?req.body.packageIds:'';
      const package = packageIds.split(',');
      const pid = [];
      for(let i=0;i<package.length;i++){
        pid.push(mongoose.Types.ObjectId(package[i]));
        await services.packageService.updatePackageStatus(package[i],8,req.userId);        
      }

      if(!package && package.length==0){        
        return res.send({ success: false, message: strings.string_response_error });
      }   
      const packageDetail = await services.cubeService.packageDetail(package[0]);
      if(!packageDetail){
        return res.send({ success: false, message: strings.string_response_error });
      }  
      packageDetail.packageType = "Cube";    
      const updateDetail = {packages:package};
      if(cubeData.cubepackageId==null){
        const cubepackageId = await services.cubeService.createPackage(cubeData, packageDetail);  
        updateDetail.cubepackageId = cubepackageId;
      }
      services.cubeService.assignPackage(req.params.id, updateDetail).then(async result => {
        await services.cubeService.updatePackageCubeId(pid, req.params.id);
        return res.send(result);
      })
    }catch(err){
      console.log(err)
      res.send({ success: false, message: strings.string_response_error });
    }
})

router.get('/all-cubes', passport.authenticate('jwt', { session: false }), async (req,res,next)=>{
  try{
    const cubeData = await services.cubeService.allCubes();
    res.send(cubeData);
  }catch(err){
    console.log(err)
    res.send({ success: false, message: strings.string_response_error });
  }
})

router.get('/get-cube/:id',async (req,res,next)=>{
  try{
    const cubeData = await services.cubeService.getCube(req.params.id);
    res.send(cubeData);
  }catch(err){
    console.log(err)
    res.send({ success: false, message: strings.string_response_error });
  }

})

router.get('/getcube2',passport.authenticate('jwt', { session: false }), async (req,res,next)=>{
  try{
    const cubes = await services.cubeService.getCube2Type()
    if(cubes == null) res.send({success:false,message:'No Data Found'})
    else res.send({success:true,data:cubes})
  }catch(err){
    console.log(err)
    res.send({ success: false, message: strings.string_response_error });
  }

})

router.delete('/delete-cube/:id',async (req,res,next)=>{
  try{
    const cubeData = await services.cubeService.removeCube(req.params.id);
    res.send(cubeData);
  }catch(err){
    console.log(err)
    res.send("result");
  }
})

module.exports = router;