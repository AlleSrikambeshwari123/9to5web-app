var UserService = require('./UserDataService').UserService; 
var userService = new UserService(); 
var ManifestService = require('./ManifestService').ManifestService; 
var mservice = new ManifestService();
var CustomerService = require('./CustomerService').Customer; 
var customerService = new CustomerService(); 
module.exports = {
    userService : userService, 
    manifestService : mservice, 
    customerService: customerService
}; 