var CustomerService = require('./CustomerService').CustomerService; 
var ManifestService = require('./ManifestService').ManifestService; 
var customerService = new CustomerService(); 
var manifestService = new ManifestService(); 
var PackageService = require('./PackageService').PackageService
var packageService = new PackageService(); 
var UserService = require('./UserService').UserService; 
var userService = new UserService();
var LocationService = require('./LocationService').LocationService; 
var locationService = new LocationService(); 
var DeliveryService = require('./RouteService').DeliveryService; 
var deliveryService = new DeliveryService(); 
var VehicleService = require('./VehicleService').VehicleService
var vehicleService = new VehicleService()
var DriverService = require('./DriverService').DriverService; 
var driverService = new DriverService(); 

module.exports = { 
  customerService: customerService,
  manifestService: manifestService,
  packageService: packageService,
  userService:userService,
  locationService:locationService,
  deliveryService:deliveryService, 
  driverService : driverService, 
  vehicleService: vehicleService
}