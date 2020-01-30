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

exports.close_manifest = (req, res, next) => {
  let manifestId = req.params.id;
  services.manifestService.changeStage(manifestId, 2).then(result => {
    res.send(result);
  });
}

exports.delete_manifest = (req, res, next) => {
  services.manifestService.deleteManifest(req.params.id).then(result => {
    res.send(result);
  })
}