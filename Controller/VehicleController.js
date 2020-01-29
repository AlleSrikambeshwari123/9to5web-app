var services = require('../RedisServices/RedisDataServices');

exports.get_vehicle_list = (req, res, next) => {
  services.vehicleService.getVehicles().then(vehicles => {
    res.render('pages/fleet/vehicle/list', {
      page: req.originalUrl,
      title: 'Vehicles',
      user: res.user,
      vehicles: vehicles,
    })
  })
}

exports.create_vehicle = (req, res, next) => {
  res.render('pages/fleet/vehicle/create', {
    page: req.originalUrl,
    title: 'Create New Vehicle',
    user: res.user,
  })
}

exports.add_new_vehicle = (req, res, next) => {
  services.vehicleService.addVehicle(req.body).then(result => {
    res.send(result);
  })
}

exports.get_vehicle_detail = (req, res, next) => {
  services.vehicleService.getVehicle(req.params.id).then(vehicle => {
    res.render('pages/fleet/vehicle/edit', {
      page: req.originalUrl,
      title: 'Vehicle Details',
      user: res.user,
      vehicle: vehicle,
    })
  })
}

exports.update_vehicle = (req, res, next) => {
  services.vehicleService.updateVehicle(req.params.id, req.body).then(result => {
    res.send(result);
  })
}

exports.delete_vehicle = (req, res, next) => {
  services.vehicleService.removeVehicle(req.params.id).then(result => {
    res.send(result);
  })
}