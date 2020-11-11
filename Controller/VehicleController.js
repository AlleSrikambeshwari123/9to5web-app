var services = require('../Services/RedisDataServices');
var utils = require('../Util/utils');
var helpers = require('../views/helpers');

exports.get_vehicle_list = (req, res, next) => {
  services.vehicleService.getVehicles().then(vehicles => {
    getFullVehicles(vehicles).then(vehicles => {
      res.render('pages/fleet/vehicle/list', {
        page: req.originalUrl,
        title: 'Vehicles',
        user: res.user,
        vehicles: vehicles.map(utils.formattedRecord),
        daterange:req.query.daterange?req.query.daterange:'',
        clear:req.query.clear
      })
   })
  })
}
exports.get_all_vehicle_list = (req, res, next) => {
  services.vehicleService.getAllVehicles(req).then(vehiclesResult => {    
    var dataTable = {
      draw: req.query.draw,
      recordsTotal: vehiclesResult.total,
      recordsFiltered: vehiclesResult.total,
      data:[]
    }
    var data = [];
    var vehicles = vehiclesResult.vehicles?vehiclesResult.vehicles:[];
    vehicles = vehicles.map(utils.formattedRecord);
    for(var i=0; i< vehicles.length; i++){
      var vehicleDetail = [];
      vehicleDetail.push(vehicles[i].vehicleMake ? vehicles[i].vehicleMake : '');
      vehicleDetail.push(helpers.formatDate(vehicles[i].createdAt));
      vehicleDetail.push(vehicles[i].model ? vehicles[i].model : '');
      vehicleDetail.push(vehicles[i].registration ? vehicles[i].registration : '');
      var fname = (vehicles[i].driver && vehicles[i].driver.firstName) ?vehicles[i].driver.firstName: '';
      var lname = (vehicles[i].driver && vehicles[i].driver.lastName) ?vehicles[i].driver.lastName: '';
      vehicleDetail.push(fname+ '' +lname);
      vehicleDetail.push(vehicles[i].location ? vehicles[i].location : '');
      vehicleDetail.push(`<a href='manage/${vehicles[i]._id}/get'><i class="fas fa-user-edit"></i></a>`);
      data.push(vehicleDetail);
    }
    dataTable.data = data;
    res.json(dataTable);
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