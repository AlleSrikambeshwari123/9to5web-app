var services = require('../Services/RedisDataServices');
var utils = require('../Util/utils');
var helpers = require('../views/helpers');

exports.get_manifest_list = (req, res, next) => {
  services.manifestService.getManifests().then(manifests => {
    manifests.forEach((manifest, i) => manifest.plane = manifest.planeId);
    res.render('pages/warehouse/manifest/list', {
      page: req.originalUrl,
      user: res.user,
      title: 'Manifests',
      manifests: manifests.map(utils.formattedRecord),
      daterange:req.query.daterange?req.query.daterange:'',
      clear:req.query.clear
    })
  })
}

exports.get_all_manifest_list = (req, res, next)=>{
  services.manifestService.getAllManifests(req).then(manifestsResult => {
    var dataTable = {
      draw: req.query.draw,
      recordsTotal: manifestsResult.total,
      recordsFiltered: manifestsResult.total,
      data:[]
    }
    var data = [];
    var manifests = manifestsResult.manifests?manifestsResult.manifests:[];
    for(var i=0; i< manifests.length; i++){
      var manifestDetail = [];
      manifestDetail.push(`<strong>${manifests[i].plane &&  manifests[i].plane.tailNumber}${manifests[i].title}</strong>`);
      manifestDetail.push(helpers.formatDate(manifests[i].createdAt))
      if (manifests[i].stageId == 1 ) {
        stage = `<span class="badge badge-secondary">${manifests[i].stage}</span>`;
      } else if(manifests[i].stageId == 2) {
        stage = `<span class="badge badge-default">${manifests[i].stage}</span>`;
      } else if(manifests[i].stageId == 3) {
        stage = `<span class="badge badge-warning">${manifests[i].stage}</span>`;
      }else if(manifests[i].stageId == 4) {
        stage = `<span class="badge badge-primary">${manifests[i].stage}</span>`;
      }else if(manifests[i].stageId == 5) {
        stage = `<span class="badge badge-success">${manifests[i].stage}</span>`;
      }
      manifestDetail.push(stage)
      manifestDetail.push(manifests[i].plane &&  manifests[i].plane.tailNumber);
      var actions = `<a href='manage/${manifests[i]._id}/get' class="btn btn-link btn-primary px-3" data-toggle="tooltip"
      data-original-title="View Details"> <i class="fa fa-eye"></i> </a>`;
      if(manifests[i].stageId == 1) {
       actions = actions + ` <a class="btn btn-link btn-danger btn-rm-manifest px-3" data-toggle="modal" data-id="${manifests[i]._id}"
       data-original-title="Delete" data-target="#confirm-delete-manifest"> <i class="fa fa-trash"></i> </a>`
      }
      manifestDetail.push(actions);

      data.push(manifestDetail);
    }
    dataTable.data = data;
    res.json(dataTable);
  })
}

exports.create_manifest = (req, res, next) => {
  Promise.all([
    services.planeService.getPlanes(),
    services.awbService.getAwbsFull(),
    services.airportService.all(),
  ]).then(results => {
    res.render('pages/warehouse/manifest/create', {
      page: req.originalUrl,
      user: res.user,
      title: 'Create New Manifest',
      planes: results[0],
      awbs: results[1],
      airports: results[2],
    })
  })
}

exports.add_new_manifest = (req, res, next) => {
  services.manifestService.createManifest(req.body).then(result => {
    res.send(result);
  })
}

exports.get_manifest_detail_byId = (req,res,next) =>{
  if(req.params.id === undefined) res.send({success:false,message:'Please Provide ManifestId'})
  services.manifestService.getManifest(req.params.id).then(result=>{
    res.send({success:true,data:result})
  })
}
exports.delete_manifest = (req, res, next) => {
  services.manifestService.deleteManifest(req.params.id).then(result => {
    res.send(result);
  })
}

exports.get_manifest_detail = async (req, res, next) => {
  const manifestId = req.params.id;

  let packages = await services.packageService.cloneManifestAndOriginal(manifestId);
  let manifest = await services.manifestService.getManifest(manifestId);

  await Promise.all(packages.map(async (pkg, i) => {
    let awb = await services.printService.getAWBDataForPackagesRelatedEntitie(pkg.awbId);
    packages[i].pieces = awb.packages ? awb.packages.length : 0
    packages[i].compartment = packages[i].compartmentId;
    packages[i].packageNumber = "PK00" + packages[i].id;
  }));

    res.render('pages/warehouse/manifest/preview', {
    page: req.originalUrl,
    user: res.user,
    title: 'Preview Manifest ' + manifest['planeId'].tailNumber+manifest.title,
    plane: manifest['planeId'],
    manifest: manifest,
    packages: packages,
    airportFrom: manifest['airportFromId'],
    airportTo: manifest['airportToId'],
  })
}


exports.create_new_manifest_clone = (req, res, next) => {
  services.manifestService.createManifestCloneFromOriginal(req.body).then(result => {
    res.send(result);
  })
}

exports.make_manifest_clone = (req, res, next) => {
  const manifestId = req.params.id;
  Promise.all([
    services.manifestService.getManifest(manifestId),
    services.packageService.cloneManifestAndOriginal(manifestId),
    services.planeService.getPlanes(),
    services.airportService.all(),
  ]).then((results) => {
    const manifest = results[0];
    const packages = results[1];
    
    packages.forEach((pkg, i) => pkg.compartment = pkg.compartmentId);
    res.render('pages/warehouse/manifest/clone', {
      page: req.originalUrl,
      user: res.user,
      title: 'Manifest Clone ' + manifest['planeId'].tailNumber+manifest.title,
      originalManifestId:manifestId,
      plane: manifest['planeId'],
      manifest: manifest,
      packages: packages,
      airportFrom: manifest['airportFromId'],
      airportTo: manifest['airportToId'],
      planes: results[2],
      airports: results[3],
    })
  });
}

exports.close_manifest = (req, res, next) => {
  let manifestId = req.params.id;
  services.manifestService.changeStage(manifestId, 2).then(result => {
    res.send(result);
  });
}

exports.ship_manifest = (req, res, next) => {
  var mid = req.params.id;
  // var user = res.user.username;
  const userId = req['userId'] || req.user.id || req.headers.userid;
  services.manifestService.shipManifest(mid, userId).then((sResult) => {
    services.packageService.updateManifestPackageToLoadOnAirCraft(mid, userId);
    res.send(sResult);
  });
}

exports.get_incoming_manifest = (req, res, next) => {
  //services.manifestService.getManifestProcessing().then(manifests => {
    res.render('pages/warehouse/manifest/incoming', {
      page: req.originalUrl,
      user: res.user,
      title: 'Incoming Flights',
      manifests: [],
      daterange:req.query.daterange?req.query.daterange:'',
      clear:req.query.clear
    });
  //})
}

exports.receive_manifest = (req, res, next) => {
  var mid = req.params.id;
  const userId = req['userId'] || req.user.id || req.headers.userid;
  services.manifestService.receiveManifest(mid, userId).then(result => {
    services.packageService.updateManifestPackageToReceived(mid, userId);
    res.send(result);
  })
}

exports.get_all_incoming_manifest = (req, res, next) => {
  if(req.body.clear){
    req.body.daterange = '';
  }
  services.manifestService.get_all_incoming_manifest(req).then(manifestResult => {
    var dataTable = {
      draw: req.query.draw,
      recordsTotal: manifestResult.total,
      recordsFiltered: manifestResult.total,
      data:[]
    }
    var data = [];
    var manifests = manifestResult.manifests ? manifestResult.manifests : [];
    for(var i=0; i< manifests.length; i++){
      var manifestDetail = [];
      manifestDetail.push(`<strong>${manifests[i].title}</strong>`);
      manifestDetail.push(helpers.formatDate(manifests[i].createdAt));
      var stage = '';
      if (manifests[i].stageId == 1 ) {
        stage = `<span class="badge badge-secondary">${manifests[i].stage}</span>`;
      } else if(manifests[i].stageId == 2) {
        stage = `<span class="badge badge-default">${manifests[i].stage}</span>`;
      } else if(manifests[i].stageId == 3) {
        stage = `<span class="badge badge-warning">${manifests[i].stage}</span>`;
      }else if(manifests[i].stageId == 4) {
        stage = `<span class="badge badge-primary">${manifests[i].stage}</span>`;
      }else if(manifests[i].stageId == 5) {
        stage = `<span class="badge badge-success">${manifests[i].stage}</span>`;
      }
      manifestDetail.push(stage);
      manifestDetail.push(manifests[i].plane && manifests[i].plane.tailNumber)
      var actions = `<a href='manage/${manifests[i]._id}/get' class="btn btn-link btn-primary px-3" data-toggle="tooltip"
      data-original-title="View Details"> <i class="fa fa-eye"></i> </a>`;
      if(manifests[i].stageId == 1) {
       actions = actions + ` <a class="btn btn-link btn-danger btn-rm-manifest px-3" data-toggle="modal" data-id="${manifests[i]._id}"
       data-original-title="Delete" data-target="#confirm-delete-manifest"> <i class="fa fa-trash"></i> </a>`
      }
      manifestDetail.push(actions);
      data.push(manifestDetail);
    }
    dataTable.data = data;
    res.json(dataTable);
  })
}
