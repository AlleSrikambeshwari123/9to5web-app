var services = require('../RedisServices/RedisDataServices');
var utils = require('../Util/utils');

exports.get_manifest_list = (req, res, next) => {
  services.manifestService.getManifests().then(manifests => {
    Promise.all(manifests.map(manifest => {
      return services.planeService.getPlane(manifest.planeId);
    })).then(planes => {
      manifests.forEach((manifest, i) => manifest.plane = planes[i]);
      res.render('pages/warehouse/manifest/list', {
        page: req.originalUrl,
        user: res.user,
        title: 'Manifests',
        manifests: manifests.map(utils.formattedRecord),
      })
    })
  })
}

exports.create_manifest = (req, res, next) => {
  Promise.all([
    services.planeService.getPlanes(),
    services.awbService.getAwbs(),
  ]).then(results => {
    res.render('pages/warehouse/manifest/create', {
      page: req.originalUrl,
      user: res.user,
      title: 'Create New Manifest',
      planes: results[0],
      awbs: results[1],
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
  var manifestId = req.params.id;
  Promise.all([
    services.manifestService.getManifest(manifestId),
    services.packageService.getPackageOnManifest(manifestId),
  ]).then(results => {
    var manifest = results[0];
    var packages = results[1];
    Promise.all(packages.map(pkg => {
      return services.planeService.getCompartment(pkg.compartmentId);
    })).then(comparts => {
      packages.forEach((pkg, i) => pkg.compartment = comparts[i]);
      console.log(packages);
      services.planeService.getPlane(manifest.planeId).then(plane => {
        res.render('pages/warehouse/manifest/preview', {
          page: req.originalUrl,
          user: res.user,
          title: 'Preview Manifest ' + manifest.title,
          plane: plane,
          manifest: manifest,
          packages: packages,
        })
      })
    })
  })
}

exports.close_manifest = (req, res, next) => {
  let manifestId = req.params.id;
  services.manifestService.changeStage(manifestId, 2).then(result => {
    res.send(result);
  });
}

exports.ship_manifest = (req, res, next) => {
  var mid = req.params.id;
  var user = res.user.username;
  services.manifestService.shipManifest(mid, user).then((sResult) => {
    services.packageService.updateManifestPackageToInTransit(mid, user);
    res.send(sResult);
  });
}

exports.get_incoming_manifest = (req, res, next) => {
  services.manifestService.getManifestProcessing().then(manifests => {
    Promise.all(manifests.map(manifest => {
      return services.planeService.getPlane(manifest.planeId);
    })).then(planes => {
      manifests.forEach((manifest, i) => manifest.plane = planes[i]);
      res.render('pages/warehouse/manifest/incoming', {
        page: req.originalUrl,
        user: res.user,
        title: 'Incoming Flights',
        manifests: manifests.map(utils.formattedRecord),
      })
    })
  })
}

exports.receive_manifest = (req, res, next) => {
  var mid = req.params.id;
  var user = res.user.username;
  services.manifestService.receiveManifest(mid, user).then(result => {
    services.packageService.updateManifestPackageToReceived(mid, user);
    res.send(result);
  })
}