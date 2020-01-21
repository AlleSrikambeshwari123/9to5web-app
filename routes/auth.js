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
    if (authresult.valid == true) {
      req.session.token = authresult.token;
      var cuser = authresult.user;
      if (cuser.role.indexOf(role_admin) > -1) {
        res.send({ success: true, role: cuser.role, url: '/dashboard' });
      } else if (cuser.role.indexOf(role_whfl) > -1) {
        res.send({ success: true, role: cuser.role, url: '/warehouse/fll-new-package' });
      } else if (cuser.role.indexOf(role_whnas) > -1) {
        res.send({ success: true, role: cuser.role, url: 'warehouse/nas-no-docs' });
      } else if (cuser.role.indexOf(role_store) > -1) {
        res.send({ success: true, role: cuser.role, url: 'warehouse/store-packages' })
      }
    } else {
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