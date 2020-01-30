var services = require('../RedisServices/RedisDataServices');
var utils = require('../Util/utils');

exports.get_plane_list = (req, res, next) => {
  services.planeService.getPlanes().then(planes => {
    Promise.all(planes.map(plane => {
      console.log(plane.pilotId);
      return services.pilotService.getPilot(plane.pilotId);
    })).then(pilots => {
      console.log(pilots);
      planes.forEach((plane, i) => plane.pilot = pilots[i]);
      res.render('pages/fleet/plane/list', {
        page: req.originalUrl,
        user: res.user,
        title: 'Planes',
        planes: planes.map(utils.formattedRecord),
      })
    })
  })
}

exports.create_plane = (req, res, next) => {
  res.render('pages/fleet/plane/create', {
    page: req.originalUrl,
    user: res.user,
    title: 'Add New Plane',
  })
}

exports.add_new_plane = (req, res, next) => {
  services.planeService.addPlane(req.body).then(result => {
    res.send(result);
  })
}

exports.delete_plane = (req, res, next) => {
  services.planeService.removePlane(req.params.id).then(result => {
    res.send(result);
  })
}

exports.get_plane_detail = (req, res, next) => {
  services.planeService.getPlane(req.params.id).then(plane => {
    services.pilotService.getPilotsWarehouse(plane.warehouse).then(pilots => {
      res.render('pages/fleet/plane/edit', {
        page: req.originalUrl,
        user: res.user,
        title: 'Plane Details',
        plane: utils.formattedRecord(plane),
        pilots: pilots,
      })
    })
  })
}

exports.update_plane = (req, res, next) => {
  services.planeService.updatePlane(req.params.id, req.body).then(result => {
    res.send(result);
  })
}

exports.get_plane = (req, res, next) => {
  services.planeService.getPlane(req.params.id).then(plane => {
    res.send(plane);
  })
}