var services = require('../RedisServices/RedisDataServices');
var utils = require('../Util/utils');

exports.create_zones = (req, res, next) => {
  services.zoneService.getLocations().then(function (locations) {
    res.render('pages/admin/zone/create', {
      page: req.originalUrl,
      title: 'Create New Zones',
      locations: locations,
      user: res.user,
    });
  });
}

exports.add_new_zone = (req, res, next) => {
  services.zoneService.addZone(req.body).then(function (result) {
    res.send(result);
  })
}

exports.get_zone_list = (req, res, next) => {
  services.zoneService.getZones().then(zones => {
    res.render('pages/admin/zone/list', {
      title: 'Zones',
      page: req.originalUrl,
      user: res.user,
      zones: zones.map(utils.formattedRecord),
    });
  });
}

exports.get_zone = (req, res, next) => {
  let id = req.params.id;
  services.zoneService.getLocations().then(function (locations) {
    services.zoneService.getZone(id).then(zone => {
      res.render('pages/admin/zone/edit', {
        page: req.originalUrl,
        title: 'Zone Details',
        user: res.user,
        locations: locations,
        zone: zone
      });
    });
  });  
}

exports.update_zone = (req, res, next) => {
  services.zoneService.updateZone(req.body).then(result => {
    res.send(result);
  })
}

exports.delete_zone = (req, res, next) => {
  services.zoneService.removeZone(req.params.id).then(result => {
    res.send(result);
  })
}