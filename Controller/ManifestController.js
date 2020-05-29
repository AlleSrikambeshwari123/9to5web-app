var services = require('../Services/RedisDataServices');
var utils = require('../Util/utils');

exports.get_manifest_list = (req, res, next) => {
  services.manifestService.getManifests().then(manifests => {
    manifests.forEach((manifest, i) => manifest.plane = manifest.planeId);
    res.render('pages/warehouse/manifest/list', {
      page: req.originalUrl,
      user: res.user,
      title: 'Manifests',
      manifests: manifests.map(utils.formattedRecord),
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

exports.delete_manifest = (req, res, next) => {
  services.manifestService.deleteManifest(req.params.id).then(result => {
    res.send(result);
  })
}

exports.get_manifest_detail = (req, res, next) => {
  const manifestId = req.params.id;
  Promise.all([
    services.manifestService.getManifest(manifestId),
    services.packageService.getPackageOnManifest(manifestId)
  ]).then((results) => {
    const manifest = results[0];
    const packages = results[1];

    packages.forEach((pkg, i) => pkg.compartment = pkg.compartmentId);
    
    res.render('pages/warehouse/manifest/preview', {
      page: req.originalUrl,
      user: res.user,
      title: 'Preview Manifest ' + manifest.title,
      plane: manifest['planeId'],
      manifest: manifest,
      packages: packages,
      airportFrom: manifest['airportFromId'],
      airportTo: manifest['airportToId'],
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
  const userId = req['userId'];
  services.manifestService.shipManifest(mid, userId).then((sResult) => {
    // services.packageService.updateManifestPackageToInTransit(mid, userId);
    res.send(sResult);
  });
}

exports.get_incoming_manifest = (req, res, next) => {
  services.manifestService.getManifestProcessing().then(manifests => {
    res.render('pages/warehouse/manifest/incoming', {
      page: req.originalUrl,
      user: res.user,
      title: 'Incoming Flights',
      manifests: manifests.map(utils.formattedRecord),
    });
  })
}

exports.receive_manifest = (req, res, next) => {
  var mid = req.params.id;
  const userId = req['userId'];
  services.manifestService.receiveManifest(mid, userId).then(result => {
    // services.packageService.updateManifestPackageToReceived(mid, userId);
    res.send(result);
  })
}
