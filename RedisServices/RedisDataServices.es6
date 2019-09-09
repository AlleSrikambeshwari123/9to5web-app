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

module.exports = { 
  customerService: customerService,
  manifestService: manifestService,
  packageService: packageService,
  userService:userService,
  locationService:locationService
}