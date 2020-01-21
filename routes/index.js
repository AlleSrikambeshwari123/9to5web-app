var express = require('express');
var router = express.Router();
var middleware = require('../middleware');
var RedisDataService = require("../RedisServices/RedisDataServices")
var services = require('../RedisServices/RedisDataServices');
/* GET home page. */

router.get('/', function (req, res, next) {
  res.render('index', { title: 'Express' });
});

router.get('/dashboard', middleware(services.userService).checkSession, function (req, res, next) {
  res.render('pages/dashboard', {
    page: req.url,
    title: "Dashboard",
    luser: res.User.firstName + ' ' + res.User.lastName,
    RoleId: res.User.role
  });
});

module.exports = router;
