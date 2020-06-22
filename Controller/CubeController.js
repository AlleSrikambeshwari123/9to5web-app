var services = require('../Services/RedisDataServices');
var utils = require('../Util/utils');

exports.get_cube_list = (req, res, next) => {
  services.cubeService.getCubes().then(cubes => {    
    res.render('pages/warehouse/cube/list', {
      page: req.originalUrl,
      title: 'Cube',
      user: res.user,
      cubes: cubes.map(utils.formattedRecord)
    })
  })
}
exports.getAllCubes = async (req,res,next) =>{
  try{
    const cubeData = await services.cubeService.allCubes();
    res.send(cubeData);
  }catch(err){
    console.log(err)
    res.send({ success: false, message: "Not Found" });
  }
}

exports.cube_detail = (req, res, next) => {
  services.cubeService.CubeDtail(req.params.id).then(cube => {  
    services.packageService.getPackageCube(cube.packages).then(pkgdetail => {  
      cube.pkgdetail = pkgdetail;
      res.render('pages/warehouse/cube/detail', {
        page: req.originalUrl,
        title: 'Cube Detail',
        user: res.user,
        cube: cube
      })
    })
  })
}

exports.cube_awb_detail = (req, res, next) => {
  services.cubeService.CubeAwbDtail(req.params.id).then(cube => {  
    res.render('pages/warehouse/cube/cubeAwb', {
      page: req.originalUrl,
      title: 'Cube Awb Detail',
      user: res.user,
      cube: cube
    })
  })
}

exports.add_new_cube = (req, res, next) => {
  req.body['createdBy'] = req['userId'];
  services.cubeService.package(req.body).then(result => {
    res.send(result);
  })
}

exports.add_new_cube2type = (req, res, next) => {
  req.body['createdBy'] = req['userId'];
  services.cubeService.addcube2type(req.body).then(result => {
    res.send(result);
  })
}
exports.update_cube2type = (req, res, next) => {
  req.body['createdBy'] = req['userId'];
  services.cubeService.updatecube2type(req.body).then(result => {
    res.send(result);
  })
}

exports.get_cube2type_list = (req, res, next) => {
  services.cubeService.getCube2Type().then(cubes => {    
   res.send(cubes)
  })
}
exports.delete_cube2type = (req, res, next) => {
  services.cubeService.deleteCube2Type(req.params.id).then(cubes => {    
   res.send(cubes)
  })
}

exports.get_cube_detail = (req, res, next) => {
  services.cubeService.getCube(req.params.id).then(cube => {
    res.send(cube);
  })
}

exports.update_cube = (req, res, next) => {
  services.cubeService.updateCube(req.params.id, req.body).then(result => {
    res.send(result);
  })
}

exports.update_awb_cube = (req, res, next) => {
  services.cubeService.updateAwbCube(req.body).then(result => {
    res.send(result);
  })
}

exports.delete_cube = (req, res, next) => {
  services.cubeService.removeCube(req.params.id).then(result => {
    res.send(result);
  })
}