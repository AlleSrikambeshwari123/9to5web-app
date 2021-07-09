var express = require('express');
var router = express.Router();
var services = require('../../Services/RedisDataServices');
var moment = require('moment');
var passport = require('passport');
require('./authHelper')

router.post('/login', (req, res, next) => {
  services.customerService.login(req.body.email, req.body.password).then(loginResult => {
    if(loginResult.success || loginResult.authenticated){
      req.session.isAdmin = false;
      return res.send(loginResult);
    }else{
      services.customerChildService.login(req.body.email, req.body.password).then(loginResultchild => {
        return res.send(loginResultchild)
      })
    }
  })
});
router.post('/sign-up', function (req, res, next) {
  services.customerService.signUp(req.body).then(signUpResult => {
    res.send(signUpResult);
  });
});

router.post('/update-fcm',passport.authenticate('jwt', { session: false }), (req, res, next) => {
  var email = req.body.email;
  var fcmToken = req.body.fcmToken;
  services.customerService.updateFcm(email, fcmToken).then(result => {
    res.send(result);
  })
})
router.post('/update-notification-status',passport.authenticate('jwt', { session: false }), (req, res, next) => {
  var email = req.body.email;
  var status = req.body.status;
  services.customerService.notificationStatus(email, status).then(result => {
    res.send(result);
  })
})
router.post('/update-device-id',passport.authenticate('jwt', { session: false }), (req, res, next) => {
  var email = req.body.email;
  var deviceId = req.body.deviceId;
  services.customerService.deviceUniqueId(email, deviceId).then(result => {
    res.send(result);
  })
})

router.post('/update-profile', passport.authenticate('jwt', { session: false }),function (req, res, next) {
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
 const email = req.body.email;
 const webUrl = req.protocol + '://' + req.get('host'); 
  services.customerService.requestResetPassword(email,webUrl).then(requestResult => {
    res.send(requestResult)
  })
});

router.get('/get-packages/:id', passport.authenticate('jwt', { session: false }),(req, res, next) => {
  services.packageService.getCustomerPackages(req.params.id).then(packages => {
    if(packages.success){
      return res.send(packages);
    }else{
      services.customerChildService.getCustomer({_id: req.params.id}).then(result => {
        if(result.id){
          services.packageService.getCustomerPackages(result.parentCustomer.id).then(packages => {
            return res.send(packages);
          })
        }else{
          return res.send(result)
        }
      })
    }
  })
});

router.get('/get-packages-history', passport.authenticate('jwt', { session: false }),function (req, res, next) {
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

router.get('/get-version', passport.authenticate('jwt', { session: false }),function (req, res, next) {
  res.send({
    android: 4,
    IOS: 4
  })
});
module.exports = router;