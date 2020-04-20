var express = require('express');
var router = express.Router();
var middleware = require('../middleware');
var RedisDataService = require("../RedisServices/RedisDataServices")
var services = require('../RedisServices/RedisDataServices');

const strings = require('../Res/strings');
const role_admin = strings.role_admin;
const role_whfl = strings.role_warehouse_fl;
const role_whnas = strings.role_warehouse_nas;
const role_store = strings.role_store;

router.post('/login', (req, res, next) => {
  var username = req.body.username;
  var password = req.body.password;
  services.userService.authenticate(username, password).then(function (authresult) {
    console.log(authresult);
    if (authresult.authenticated == true) {
      req.session.token = authresult.token;
      var cuser = authresult.user;
      const roles = cuser.roles.map((data) => data.type);
      
      if (roles.indexOf(role_admin) > -1) {
        res.send({ success: true, role: roles, url: '/dashboard' });
      } else if (roles.indexOf(role_whfl) > -1) {
        res.send({ success: true, role: roles, url: '/warehouse/fll-new-package' });
      } else if (roles.indexOf(role_whnas) > -1) {
        res.send({ success: true, role: roles, url: 'warehouse/nas-no-docs' });
      } else if (roles.indexOf(role_store) > -1) {
        res.send({ success: true, role: roles, url: 'warehouse/store-packages' })
      }
    } else {
      res.send({ success: false });
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