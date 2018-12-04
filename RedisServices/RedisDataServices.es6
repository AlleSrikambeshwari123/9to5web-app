var CustomerService = require('./CustomerService').CustomerService; 
var ManifestService = require('./ManifestService').ManifestService; 
var customerService = new CustomerService(); 
var manifestService = new ManifestService(); 
var PackageService = require('./PackageService').PackageService
var packageService = new PackageService(); 

module.exports = { 
  customerService: customerService,
  manifestService: manifestService,
  packageService: packageService,
}