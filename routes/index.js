var express = require('express');
var router = express.Router();
var RedisDataService = require("../RedisServices/RedisDataServices")
var services = require('../RedisServices/RedisDataServices');
/* GET home page. */
router.get('/', function (req, res, next) {
  res.render('index', { title: 'Express' });
});
router.post('/', function (req, res, next) {
  var body = req.body;
  var username = body.username;
  var password = body.password;
  services.userService.authenticate(username, password).then(function (authresult) {
    if (authresult.valid == true) {
      // services.userService.generateToken(authresult.user).then(function(token){
      req.session.token = authresult.token;
      var cuser = authresult.user;
      if (cuser.role == "Admin") {
        //replace with admin dashboard
        res.json({ success: true, role: "admin" });
      }
      else {
        //replace with general user dashboard
        res.json({ success: true, role: "user" });
      }
      //});
    }
    else {
      res.render('index', { title: 'Express' });
    }
  });
});
router.get('/forgot-password', function (req, res, next) {
  console.log("HERE");
  res.render('forgot_password');
});
router.get('/logout', function (req, res, next) {
  req.session.reset();

  res.redirect('/');
});

module.exports = router;
