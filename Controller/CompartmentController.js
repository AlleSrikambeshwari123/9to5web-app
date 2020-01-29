var services = require('../RedisServices/RedisDataServices');
var utils = require('../Util/utils');

exports.get_compartment_list = (req, res, next) => {
  let planeId = req.params.planeId;
  Promise.all([
    services.planeService.getPlane(planeId),
    services.planeService.getCompartments(planeId),
  ]).then(results => {
    res.render('pages/fleet/compartment/list', {
      page: req.originalUrl,
      user: res.user,
      title: "Plane  Compartments",
      plane: results[0],
      comparts: results[1],
    })
  })
}

exports.add_new_compartment = (req, res, next) => {
  services.planeService.addCompartment(req.params.planeId, req.body).then(result => {
    res.send(result);
  })
}

exports.delete_compartment = (req, res, next) => {
  services.planeService.removeCompartment(req.params.planeId, req.body.id).then(result => {
    res.send(result);
  })
}