var CustomerService = require('./CustomerService').CustomerService; 
var ManifestService = require('./ManifestService').ManifestService; 
var customerService = new CustomerService(); 
var manifestService = new ManifestService(); 

module.exports = { 
  customerService: customerService,
  manifestService: manifestService
}