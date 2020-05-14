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
    if (authresult.authenticated == true && authresult.isUserEnabled) {
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
      res.send({ 
        success: false, 
        authenticated: authresult.authenticated,
        isUserEnabled: authresult.isUserEnabled 
      });
    }
  });
});

router.get('/forgot-password', function (req, res, next) {  
  res.render('forgot_password');
});

router.get('/reset-password/user/:id',async function(req, res, next){
  const result = await services.userService.getUserByResetPasswordToken(req.params.id);    
  result.reset_link = 'user/' + req.params.id;
  res.render('password-set-new',result); 
});

router.post('/reset-password/user/:id', async function(req, res, next){
  const result = await services.userService.resetPassword(req.params.id, req.body.password); 
  res.send(result);
})

router.get('/reset-password/success', function(req,res, next){
  res.render('password-set-success', {
    loginUrl: req.query.login
  })
})

router.get('/logout', function (req, res, next) {
  req.session.reset();
  res.redirect('/');
});

router.post('/users/request-pwd-reset',async function(req,res,next){
  const webUrl = req.protocol + '://' + req.get('host'); 
  const result = await services.userService.requestPasswordReset(req.body.email, webUrl);
  res.send(result);
});

module.exports = router;