var express = require('express');
var router = express.Router();
var services = require('../../RedisServices/RedisDataServices');
var moment = require('moment');

router.post('/login', (req, res, next) => {
  services.customerService.login(req.body.email, req.body.password).then(loginResult => {
    res.send(loginResult);
  })
});
router.post('/sign-up', function (req, res, next) {
  services.customerService.signUp(req.body).then(signUpResult => {
    res.send(signUpResult);
  });
});

router.post('/update-fcm', (req, res, next) => {
  var email = req.body.email;
  var fcmToken = req.body.fcmToken;
  services.customerService.updateFcm(email, fcmToken).then(result => {
    res.send(result);
  })
})

router.post('/update-profile', function (req, res, next) {
  services.customerService.saveProfile(req.body).then(loginResult => {
    res.send(loginResult);

  })
});

router.post('/change-password', function (req, res, next) {
  // var body = req.body;
  // var passwordRequest = {
  //   username: body.username,
  //   password: body.password,
  //   oldPassword: body.oldPassword,
  // }
  services.customerService.changePassword(req.body).then(result => {
    res.send(result);
  })
});
router.post('/req-pwd-reset', function (req, res, next) {
  console.log(req.body);
  services.customerService.requestResetPassword(req.body.skybox).then(requestResult => {
    res.send(requestResult)
  })
});
router.post('/pwd-reset', function (req, res, next) {
  services.customerService.resetPasswd(req.body).then(pwdResult => {
    res.send(pwdResult);
  })
});

router.get('/get-packages/:id', (req, res, next) => {
  services.packageService.getCustomerPackages(req.params.id).then(packages => {
    res.send(packages);
  })
});

router.get('/get-packages-history', function (req, res, next) {
  // services.packageService.getCustomerPackagesByStatus(req.body.skybox,req.body.status,req.body.page).then(packageResult=>{
  //     res.send({packages:packageResult})
  // }); 
  res.send({
    packages: [
      { packageId: 34, trackingNumber: "114-3477688-4697861", description: "Fog Lamps", dateRec: "2019-07-2", dateDelivered: "2019-07-07", cost: 250.00, status: "Delivered", statusId: 5 },
      { packageId: 35, trackingNumber: "114-2440197-3408215", description: "Bose Quiet Comfort ", dateRec: "2019-07-2", dateDelivered: "2019-07-07", cost: 389.00, status: "Delivered", statusId: 5 },
      { packageId: 36, trackingNumber: "114-0354742-6210612", description: "USB C adapter", dateRec: "2019-07-2", dateDelivered: "2019-07-07", cost: 25.00, status: "Delivered", statusId: 5 },
    ]
  })
});
module.exports = router;