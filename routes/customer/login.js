var express = require('express');
var router = express.Router();
var middleware = require('../../middleware');
var emailservice = require('../../Util/EmailService');

var services = require('../../Services/RedisDataServices');
var customerCtrl = require('../../Controller/CustomerController');
var uniqid = require('uniqid');
var moment = require('moment');

const multer = require('multer');

var storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, global.uploadRoot + '/')
  },
  filename: function (req, file, cb) {
    const fext = (file.originalname).split('.').pop();
    cb(null, uniqid() + '_' + moment().utc().unix() + "." + fext) //Appending extension
  }
});
var upload = multer({ storage: storage });

let loginurl = process.env.LOGIN_URL.replace('/customer','');
 loginurl = loginurl.replace('\n','');

console.log(loginurl , "loginurl")



// router.get(`${process.env.LOGIN_URL.replace('/customer','')}`, function (req, res, next) {
  router.get(`${loginurl}`, function (req, res, next) {

  if (req.session.token)
    res.redirect('/dashboard');
  else{
    var result ;
    
    if(process.env.CLIENT_URL == "postboxesetc"){
      result = true;
    }else{
      result = false;
    }

    res.render('login',{process:process.env ,result:result })
  }
});



// router.get(`${process.env.LOGIN_URL.replace('/customer','')}`, function (req, res, next) {
router.get(`${loginurl}`, function (req, res, next) {


  if (req.session.token)
    res.redirect('/dashboard');
  else{
  var result ; 
  if(process.env.CLIENT_URL == "postboxesetc"){
    result = true;
  }else{
    result = false;
  }
    res.render('login',{process:process.env,result:result})
}
});

// router.get('/login', function (req, res, next) {

//   if (req.session.token)
//     res.redirect('/dashboard');
//   else
//     res.render('login',{process:process.env})
// });



router.post('/login', (req, res, next) => {
  services.customerService.login(req.body.email.replace("%40", "@"), req.body.password).then(loginResult => {
    if (loginResult.success || loginResult.authenticated) {
      req.session.token = loginResult.token;
      req.session.customerId = loginResult.user._id
      const webUrl = req.protocol + '://' + req.get('host');
      res.send({ success: true, role: loginResult, url: webUrl + '/customer/report/package-report?search_type=100' });
    } else {
      services.customerChildService.login(req.body.email, req.body.password).then(loginResultchild => {
        return res.send(loginResultchild)
      })
    }
  })
});

router.get('/dashboard', middleware().checkSession, customerCtrl.get_customer_awb_list);


router.get('/change-pass', middleware().checkSession, function (req, res, next) {
  res.render('pages/customer/account/change-pass', {
    page: '/account' + req.url,
    title: "Change Password",
    user: res.user,
  });
});

router.post('/change-pass', middleware().checkSession, function (req, res, next) {
  services.customerService.changePassword({ email: res.user.email, password: req.body.password, oldPassword: req.body.oldpass }).then(result => {
    res.send(result)
  })
});

router.get('/postbox/forgot-password', function (req, res, next) {
  console.log("i am called")
  // res.render('customer_forgot_password',{process:process.env , isPostbox:true});
  res.render('customer_forgot_password',{process:process.env,isPostbox:process.env.CLIENT_URL  == "postboxesetc" ? true : false});

});



// router.get('/forgot-password', function (req, res, next) {
//   res.render('customer_forgot_password',{process:process.env,isPostbox:false});
// });
let forgetpassurl = process.env.FORGOT_PASS_URL.replace('/customer','');
console.log(forgetpassurl)
forgetpassurl = forgetpassurl.replace('\n','')

console.log(forgetpassurl)
router.get(`${forgetpassurl}`, function (req, res, next) {
  res.render('customer_forgot_password',{process:process.env,isPostbox:process.env.CLIENT_URL  == "postboxesetc" ? true : false});
});


router.post('/request-pwd-reset', async function (req, res, next) {
  const webUrl = req.protocol + '://' + req.get('host');
  emailservice.sendResetPassword(req.body.email,"Reset your password" , "<h1>Hello</h1>")
  const result = await services.customerService.requestResetPassword(req.body.email, webUrl);
  res.send(result);
});

router.get('/awb', middleware().checkSession, customerCtrl.get_customer_awbs);

router.get('/awb/:id/preview', middleware().checkSession, customerCtrl.preview_awb);

router.get('/awb/:id/previewjson', middleware().checkSession, customerCtrl.preview_awbjson);


router.get('/billing', middleware().checkSession, customerCtrl.billing);

router.get("/upload/invoices", middleware().checkSession, customerCtrl.upload_invoices);

router.post("/upload/invoice", middleware().checkSession, upload.single('invoice'), customerCtrl.upload_invoice);

router.get("/account/profile", middleware().checkSession, customerCtrl.profile);

router.post("/update/profile", middleware().checkSession, customerCtrl.updateProfile);


router.get("/report/package-report", middleware().checkSession, customerCtrl.packageReport);
module.exports = router;
