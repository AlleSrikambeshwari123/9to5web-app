var express = require('express');
var router = express.Router();
var middleware = require('../middleware');
var RedisDataService = require("../Services/RedisDataServices")
var services = require('../Services/RedisDataServices');
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
      req.session.userId = cuser._id
      const roles = cuser.roles.map((data) => data.type);
      // if (roles.indexOf(role_admin) > -1) {
        req.session.isAdmin = true;
        res.send({ success: true, role: roles, url: '/dashboard' });
      // } else if (roles.indexOf(role_whfl) > -1) {
      //   res.send({ success: true, role: roles, url: '/warehouse/fll-new-package' });
      // } else if (roles.indexOf(role_whnas) > -1) {
      //   res.send({ success: true, role: roles, url: 'warehouse/nas-no-docs' });
      // } else if (roles.indexOf(role_store) > -1) {
      //   res.send({ success: true, role: roles, url: 'warehouse/store-packages' })
      // }
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
  res.render('forgot_password',{process:process.env});
});

router.get('/reset-password/user/:id',async function(req, res, next){
  const result = await services.userService.getUserByResetPasswordToken(req.params.id);    
  result.reset_link = '/reset-password/user/' + req.params.id;
  res.render('password-set-new',result); 
});

router.post('/reset-password/user/:id', async function(req, res, next){
  const result = await services.userService.resetPassword(req.params.id, req.body.password); 
  res.send(result);
})


router.get('/reset-password/success', function(req,res, next){
  res.render('password-set-success', {
    process:process.env,
    loginUrl: req.query.login
  })
})

router.get('/reset-password/customer/success', function(req,res, next){
  res.render('password-set-customer-success', {
    process:process.env,
    loginUrl: req.query.login
  })
})
// router.get('/reset-password/customer/:id',async function(req, res, next){
//   const result = await services.customerService.getUserByResetPasswordToken(req.params.id);
//   result.reset_link = '/reset-password/customer/' + req.params.id;
//   result.postbox = false;
//   res.render('password-set-new-customer',result);     
// });

router.get(`${process.env.RESETMAIL_URL}`,async function(req, res, next){
  const result = await services.customerService.getUserByResetPasswordToken(req.params.id);
  result.reset_link = '/reset-password/customer/' + req.params.id;
  if(process.env.CLIENT_URL == "postboxesetc"){
    result.postbox = true;
  }else{
    result.postbox = false;
  }
  res.render('password-set-new-customer',result);     
});


router.get('/reset-password/postbox/customer/:id',async function(req, res, next){
  const result = await services.customerService.getUserByResetPasswordToken(req.params.id);
  result.reset_link = '/reset-password/customer/' + req.params.id;
  result.postbox = true ; 
  if(process.env.CLIENT_URL == "postboxesetc"){
    result.postbox = true;
  }else{
    result.postbox = false;
  }
  res.render('password-set-new-customer',result);     
});
router.post('/reset-password/postbox/customer/:id', function (req, res, next) {
  services.customerService.resetPassword(req.params.id, req.body.password).then(pwdResult => {
    // res.send(pwdResult);
    res.send(pwdResult)

  })
});

router.post('/reset-password/customer/:id', function (req, res, next) {
  services.customerService.resetPassword(req.params.id, req.body.password).then(pwdResult => {
    res.send(pwdResult);
  })
});

router.get('/logout', function (req, res, next) {
  // req.session.destroy();
  req.session.token = null;
  if(req.query.type){
    res.redirect('/customer/login');
  }else{
   res.redirect('/');
  }
});

router.post('/users/request-pwd-reset',async function(req,res,next){
  const webUrl = req.protocol + '://' + req.get('host'); 
  
  const result = await services.userService.requestPasswordReset(req.body.email, webUrl);
  res.send(result);
});

module.exports = router;