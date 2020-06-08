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

exports.add_new_cube = (req, res, next) => {
  req.body['createdBy'] = req['userId'];
  services.cubeService.package(req.body).then(result => {
    res.send(result);
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

exports.delete_cube = (req, res, next) => {
  services.cubeService.removeCube(req.params.id).then(result => {
    res.send(result);
  })
}