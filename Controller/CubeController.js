var services = require('../Services/RedisDataServices');
var utils = require('../Util/utils');
var helpers = require('../views/helpers')

exports.get_cube_list = (req, res, next) => {
  if(req.query.clear){
    req.query.daterange = '';
  }
  services.cubeService.getCubes(req).then(cubes => {    
    res.render('pages/warehouse/cube/list', {
      page: req.originalUrl,
      title: 'Cube',
      user: res.user,
      cubes: cubes.map(utils.formattedRecord),
      clear:req.query.clear,      
    })
  })
}

exports.get_all_cube_list = (req, res, next) => {
  if(req.body.clear)
    req.body.daterange =''
  services.cubeService.getAllCubes(req).then(results => {
    const cubes = results.cubes;
    var dataTable = {
      draw: req.query.draw,
      recordsTotal: results.total,
      recordsFiltered: results.total,
      data:[]
    }
    let data = [];
    for(var i=0; i< cubes.length; i++){
      var cubeDetail = [];
      cubeDetail.push(cubes[i].id)
      cubeDetail.push(helpers.formatDate(cubes[i].createdAt));
      let cube2link = cubes[i].cubeAwbId ? cubes[i].cubeAwbId.id : ''
      if(cube2link == '') cube2link = '#' 
      else cube2link = '/warehouse/cube/awbDetail/'+cube2link
      cubeDetail.push(cubes[i].name)
      cubeDetail.push(` <a class="btn btn-link" href="${cube2link}">${cubes[i].awbId}</a>`)
      let viewCubeLink = (cubes[i].packages.length ? cubes[i].id : '')
      let downloadpdfLink = (cubes[i].packages.length ? cubes[i].id : '')
      if(downloadpdfLink == '') {
        viewCubeLink = '#';
        downloadpdfLink = '#'
      } 
      else {
        viewCubeLink = '/warehouse/cube/detail/'+ downloadpdfLink
        downloadpdfLink = '/api/printer/download-pdf/cube/'+ downloadpdfLink
      }
      cubeDetail.push(`<a href="${viewCubeLink}" ><i class="fas fa-eye"></i></a>`)
      cubeDetail.push(`<a href="${downloadpdfLink}"><i class="fa fa-download"></i></a>
      <a
        class="btn btn-link btn-primary btn-print-pkg"
        data-toggle="modal"
        data-id="${cubes[i].id}"
        data-original-title="Print Label"
        data-target="#print-popup"
      ><i class="fa fa-print"></i>
    </a>`)
      cubeDetail.push(`<button href='#' data-id='${cubes[i].id}' data-target="#edit-hazmat" data-toggle='modal'
      class='btn btn-link btn-primary btn-edit-hazmat mx-3' onclick="editHazmat(this)"><i class="fas fa-pen"></i></button>`)
      data.push(cubeDetail);
    }
    dataTable.data = data;
    res.json(dataTable);
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