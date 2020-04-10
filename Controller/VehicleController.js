var services = require('../RedisServices/RedisDataServices');
var utils = require('../Util/utils');

exports.get_vehicle_list = (req, res, next) => {
  services.vehicleService.getVehicles().then(vehicles => {
    getFullVehicles(vehicles).then(vehicles => {
      res.render('pages/fleet/vehicle/list', {
        page: req.originalUrl,
        title: 'Vehicles',
        user: res.user,
        vehicles: vehicles.map(utils.formattedRecord),
      })
    })
  })
}

exports.create_vehicle = (req, res, next) => {
  res.render('pages/fleet/vehicle/create', {
    page: req.originalUrl,
    title: 'Create New Vehicle',
    user: res.user
  });
}

exports.add_new_vehicle = (req, res, next) => {
  services.vehicleService.addVehicle(req.body).then(result => {
    res.send(result);
  })
}

exports.get_vehicle_detail = (req, res, next) => {
  services.vehicleService.getVehicle(req.params.id).then(vehicle => {
    services.driverService.getLocationDrivers(vehicle.location).then(drivers => {
      res.render('pages/fleet/vehicle/edit', {
        page: req.originalUrl,
        title: 'Vehicle Details',
        user: res.user,
        vehicle: utils.formattedRecord(vehicle),
        drivers: drivers
      })
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

exports.get_location_vehicles = (req, res, next) => {
  var location = req.params.location;
  services.vehicleService.getVehiclesByLocation(location).then(vehicles => {
    res.send(vehicles);
  })
}

var getFullVehicles = (vehicles) => {
  return new Promise((resolve, reject) => {
    Promise.all(vehicles.map(vehicle => {
      return getFullVehicle(vehicle);
    })).then(vehicles => {
      resolve(vehicles);
    })
  });
}

var getFullVehicle = (vehicle) => {
  return new Promise((resolve, reject) => {
    services.driverService.getDriver(vehicle.driverId).then(driver => {
      vehicle.driver = driver;
      resolve(vehicle);
    })
  });
}