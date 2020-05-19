var express = require('express');
var router = express.Router();
var services = require('../../RedisServices/RedisDataServices');
var moment = require('moment');

router.post('/create-cube', async(req, res, next) => {
    try{
        const cubepackagedata = await services.cubeService.createPackage(req.body); 
        const detail = {
            cubepackageId:cubepackagedata._id,
            createdBy:req.body.userId,
            name:req.body.name
        }       
        services.cubeService.createCube(detail).then(async result => {          
            res.send(result);
        })
    }catch(err){
        console.log(err);
        resolve({ success: false, message: strings.string_response_error });
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
      resolve({ success: false, message: strings.string_response_error });
  }
});

router.post('/assign-packages/:id',async (req,res,next)=>{
    try{
      const cubeData = await services.cubeService.getCube(req.params.id);
      let package = cubeData.packages;      
      const trackingNumber = req.body.trackingNumber;
      const packageIds = await services.cubeService.getPackageIds(trackingNumber);
            package = package.concat(packageIds);
      services.cubeService.assignPackage(req.params.id, {packages:package}).then(result => {
          res.send(result);
      })
    }catch(err){
      console.log(err)
      resolve({ success: false, message: strings.string_response_error });
    }
})

router.get('/all-cubes',async (req,res,next)=>{
  try{
    const cubeData = await services.cubeService.allCubes();
    res.send(cubeData);
  }catch(err){
    console.log(err)
    resolve({ success: false, message: strings.string_response_error });
  }
})

router.get('/get-cube/:id',async (req,res,next)=>{
  try{
    const cubeData = await services.cubeService.getCube(req.params.id);
    res.send(cubeData);
  }catch(err){
    console.log(err)
    resolve({ success: false, message: strings.string_response_error });
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