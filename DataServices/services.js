var UserService = require('./UserDataService').UserService; 
var userService = new UserService(); 
var ManifestService = require('./ManifestService').ManifestService; 
var mservice = new ManifestService();
module.exports = {
    userService : userService, 
    manifestService : mservice
}; 