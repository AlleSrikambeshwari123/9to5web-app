var services = require('../Services/RedisDataServices');
var utils = require('../Util/utils');

exports.get_manifest_list = (req, res, next) => {
  if(req.query.clear){
    req.query.daterange = '';
  }
  services.manifestService.getManifests(req).then(manifests => {
    manifests.forEach((manifest, i) => manifest.plane = manifest.planeId);
    res.render('pages/warehouse/manifest/list', {
      page: req.originalUrl,
      user: res.user,
      title: 'Manifests',
      manifests: manifests.map(utils.formattedRecord),
      clear:req.query.clear,
      filter:"Manifests"
    })
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
  if(req.query.clear){
    req.query.daterange = '';
  }
  services.manifestService.getManifestProcessing(req).then(manifests => {
    res.render('pages/warehouse/manifest/incoming', {
      page: req.originalUrl,
      user: res.user,
      title: 'Incoming Flights',
      manifests: manifests.map(utils.formattedRecord),
      clear:req.query.clear,
      filter: "Incoming"
    });
  })
}

exports.receive_manifest = (req, res, next) => {
  var mid = req.params.id;
  const userId = req['userId'] || req.user.id || req.headers.userid;
  services.manifestService.receiveManifest(mid, userId).then(result => {
    services.packageService.updateManifestPackageToReceived(mid, userId);
    res.send(result);
  })
}
