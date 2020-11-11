var express = require('express');
var router = express.Router();
var middleware = require('../../middleware');

var services = require('../../Services/RedisDataServices');
var customerCtrl = require('../../Controller/CustomerController');

router.get('/login', function (req, res, next) {
  if (req.session.token)
    res.redirect('/dashboard');
  else  
    res.render('login')
});    

router.post('/login', (req, res, next) => {
  services.customerService.login(req.body.email, req.body.password).then(loginResult => {
    if(loginResult.success || loginResult.authenticated){
      req.session.token = loginResult.token;
      req.session.customerId = loginResult.user._id
  const webUrl = req.protocol + '://' + req.get('host'); 
  res.send({success : true ,role : loginResult,url : webUrl + '/warehouse/customer/package/list/'+req.session.customerId});
    }else{
      services.customerChildService.login(req.body.email, req.body.password).then(loginResultchild => {
        return res.send(loginResultchild)
      })
    }
  })
});

router.get('/dashboard', middleware().checkSession,customerCtrl.get_customer_awb_list);

router.get('/change-pass', middleware().checkSession, function (req, res, next) {
	res.render('pages/customer/account/change-pass', {
		page: '/account' + req.url,
		title: "Change Password",
		user: res.user,
	});
});

router.post('/change-pass', middleware().checkSession, function (req, res, next) {
  services.customerService.changePassword({email : res.user.email,password : req.body.password, oldPassword : req.body.oldpass}).then(result => {
		res.send(result)
  })
});

router.get('/forgot-password', function (req, res, next) {  
  res.render('customer_forgot_password');
});

router.post('/request-pwd-reset',async function(req,res,next){
  const webUrl = req.protocol + '://' + req.get('host');
  const result = await services.customerService.requestResetPassword(req.body.email, webUrl);
  res.send(result);
});


module.exports = router;
