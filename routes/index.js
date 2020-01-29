var express = require('express');
var router = express.Router();
var middleware = require('../middleware');
var services = require('../RedisServices/RedisDataServices');

router.get('/', function (req, res, next) {
  if (req.session.token)
    res.redirect('/dashboard');
  else
    res.render('index');
});

router.get('/dashboard', middleware(services.userService).checkSession, function (req, res, next) {
  res.render('pages/dashboard', {
    page: req.originalUrl,
    title: "Dashboard",
    user: res.user,
  });
});

module.exports = router;
