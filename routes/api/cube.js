var express = require('express');
var router = express.Router();
const strings = require('../../Res/strings');
var services = require('../../RedisServices/RedisDataServices');
var moment = require('moment');

router.post('/create-cube', async(req, res, next) => {
    try{        
        const detail = {
            cubepackageId:null,
            userId:req.body.userId,
            createdBy:req.body.userId,
            name:req.body.name
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

router.post('/assign-packages/:id',async (req,res,next)=>{
    try{
      const cubeData = await services.cubeService.getCubeDetail(req.params.id);
      if(!cubeData){
        return res.send({ success: false, message: strings.string_response_error });
      }
      let package = [];      
      const trackingNumber = req.body.trackingNumber;
      const packageIds = await services.cubeService.getPackageIds(trackingNumber);
            package = package.concat(packageIds); 
      if(!package && package.length==0){
        return res.send({ success: false, message: strings.string_response_error });
      }   
      const packageDetail = await services.cubeService.packageDetail(package[0]);
      if(!packageDetail){
        return res.send({ success: false, message: strings.string_response_error });
      }       
      const updateDetail = {packages:package};
      if(cubeData.cubepackageId==null){
        const cubepackageId = await services.cubeService.createPackage(cubeData, packageDetail);  
        updateDetail.cubepackageId = cubepackageId;
      }
      services.cubeService.assignPackage(req.params.id, updateDetail).then(async result => {
        await services.cubeService.updatePackageCubeId(packageIds, req.params.id);
        return res.send(result);
      })
    }catch(err){
      console.log(err)
      res.send({ success: false, message: strings.string_response_error });
    }
})

router.get('/all-cubes',async (req,res,next)=>{
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