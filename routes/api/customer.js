var express = require('express');
var router = express.Router();
var services = require('../../RedisServices/RedisDataServices');
/* GET home page. */
router.post('/login', function (req, res, next) {
  services.customerService.login(req.body.username, req.body.password).then(loginResult => {
    res.send(loginResult);
  })
});
router.post('/update-profile', function (req, res, next) {
  var body = req.body;
  var customer = {
    firstName: body.firstName,
    lastName: body.lastName,
    email: body.email,
    mobile: body.mobile,
  }
  services.customerService.saveProfile(customer).then(loginResult => {
    res.send(loginResult);

  })
});
router.post('/change-password', function (req, res, next) {
  var body = req.body;
  var passwordRequest = {
    username: body.username,
    password: body.password,
    oldPassword: body.oldPassword,
  }
  services.customerService.changePassword(passwordRequest).then(result => {
    res.send(result);
  })
});
router.get('/get-packages', function (req, res, next) {
  var body = req.body;
  res.send({
    packages: [
      { packageId: 34, trackingNumber: "114-3477688-4697861", description: "Fog Lamps", dateRec: "2019-07-2", dateDelivered: "", cost: 0, status: "In Miami", statusId: 1 },
      { packageId: 35, trackingNumber: "114-2440197-3408215", description: "Bose Quiet Comfort ", dateRec: "2019-07-2", dateDelivered: "", cost: 0, status: "In Transit", statusId: 2 },
      { packageId: 36, trackingNumber: "114-0354742-6210612", description: "USB C adapter", dateRec: "2019-07-2", dateDelivered: "", cost: 0, status: "Processing", statusId: 3 },
    ]
  });

  //   services.packageService.getCustomerPackagesByStatus(req.body.skybox,req.body.status,req.body.page).then(packageResult=>{
  //     res.send({packages:packageResult})
  // }); 
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
router.post('/sign-up', function (req, res, next) {
  var body = req.body;
  var customer = {
    firstName: body.firstName,
    lastName: body.lastName,
    email: body.email,
    mobile: body.mobile,
    password: body.password
  }
  services.customerService.signUp(customer).then(signUpResult => {
    res.send(signUpResult);
  });
});
module.exports = router;