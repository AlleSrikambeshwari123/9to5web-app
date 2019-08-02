var express = require('express');
var router = express.Router();
var services = require('../RedisServices/RedisDataServices');
var middleware = require('../middleware');
/* GET users listing. */
router.get('/locations', middleware(services.userService).requireAuthentication,function(req, res, next) {
  var pageData = {};
	pageData.title = "Locations"
	pageData.luser = res.User.firstName + ' ' + res.User.lastName;
	pageData.RoleId = res.User.role;
  res.render('pages/Stores/locations',pageData);
});
router.get('/add-locations', middleware(services.userService).requireAuthentication,function(req, res, next) {
  var pageData = {};
	pageData.title = "Location"
	pageData.luser = res.User.firstName + ' ' + res.User.lastName;
	pageData.RoleId = res.User.role;
  res.render('pages/Stores/new-location',pageData);
});
router.get('/change-pass', middleware(services.userService).requireAuthentication,function(req, res, next) {
  var pageData = {};
	pageData.title = "Change Password"
	pageData.luser = res.User.firstName + ' ' + res.User.lastName;
	pageData.RoleId = res.User.role;
  res.render('pages/change-pass',pageData);
});
module.exports = router;
