var express = require('express');
var router = express.Router();
var middleware = require('../middleware');
var services = require('../RedisServices/RedisDataServices');

router.get('/', function (req, res, next) {
  res.render('index', { title: 'Express' });
});

router.get('/dashboard', middleware(services.userService).checkSession, function (req, res, next) {
  res.render('pages/dashboard', {
    page: req.url,
    title: "Dashboard",
    user: res.user,
  });
});

module.exports = router;
