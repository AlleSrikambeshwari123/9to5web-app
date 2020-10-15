var services = require('../Services/RedisDataServices');
var utils = require('../Util/utils');
var helpers = require('../views/helpers');

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
      zones: [],
      daterange:req.query.daterange?req.query.daterange:'',
      clear:req.query.clear
    });
  });
}

exports.get_all_zone = (req, res, next) => {
  if(req.body.clear){
    req.body.daterange = '';
  }
  services.zoneService.get_all_zone(req).then(zoneResult => {
    var dataTable = {
      draw: req.query.draw,
      recordsTotal: zoneResult.total,
      recordsFiltered: zoneResult.total,
      data:[]
    }
    var data = [];
    var zones = zoneResult.zones?zoneResult.zones:[];
    for(var i=0; i< zones.length; i++){
      var zoneDetail = [];
      zoneDetail.push(zones[i].name ? zones[i].name : '');
      zoneDetail.push(helpers.formatDate(zones[i].createdAt))
      zoneDetail.push((zones[i].location && zones[i].location.name)  ? zones[i].location.name : '');
      zoneDetail.push(`<a href="manage/${zones[i]._id}%>/get"><i class='fas fa-pencil-alt'></i></a>`);
      data.push(zoneDetail);
    }
    dataTable.data = data;
    res.json(dataTable);
  })
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