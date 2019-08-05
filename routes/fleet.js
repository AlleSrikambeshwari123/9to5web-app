var express = require('express');
var router = express.Router();
var services = require('../RedisServices/RedisDataServices');
var middleware = require('../middleware');

var RedisCustomerService = require('../RedisServices/CustomerService').CustomerService
var rCusomterService = new RedisCustomerService();

router.get('/vehicles', middleware(services.userService).requireAuthentication, function (req, res, next) {
	var pageData = {};
	pageData.title = "Vehicles"
	pageData.luser = res.User.firstName + ' ' + res.User.lastName;
	pageData.RoleId = res.User.role;
	res.render('pages/fleet/vehicles', pageData);
});

router.get('/addvehicle', middleware(services.userService).requireAuthentication, function (req, res, next) {
	var pageData = {};
	pageData.title = "Add Vehicle"
	pageData.luser = res.User.firstName + ' ' + res.User.lastName;
	pageData.RoleId = res.User.role;

	res.render('pages/fleet/addvehicle', pageData);
});

router.get('/drivers', middleware(services.userService).requireAuthentication, function (req, res, next) {
	var pageData = {};
	pageData.title = "Drivers"
	pageData.luser = res.User.firstName + ' ' + res.User.lastName;
	pageData.RoleId = res.User.role;

	res.render('pages/fleet/drivers', pageData);
});

router.get('/adddriver', middleware(services.userService).requireAuthentication, function (req, res, next) {
	var pageData = {};
	pageData.title = "Add Driver"
	pageData.luser = res.User.firstName + ' ' + res.User.lastName;
	pageData.RoleId = res.User.role;

	res.render('pages/fleet/adddriver', pageData);
});

router.get('/routes', middleware(services.userService).requireAuthentication, function (req, res, next) {
	var pageData = {};
	pageData.title = "Routes"
	pageData.luser = res.User.firstName + ' ' + res.User.lastName;
	pageData.RoleId = res.User.role;

	res.render('pages/fleet/routes', pageData);
});

router.get('/addroute', middleware(services.userService).requireAuthentication, function (req, res, next) {
	var pageData = {};
	pageData.title = "Add Route"
	pageData.luser = res.User.firstName + ' ' + res.User.lastName;
	pageData.RoleId = res.User.role;

	res.render('pages/fleet/addroute', pageData);
});
module.exports = router;