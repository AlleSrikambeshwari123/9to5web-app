// var client = require('./RedisServices/dataContext').redisClient;

// var user = {
//   username: "admin",
//   firstName: "admin",
//   lastName: "9-5 Import",
//   password: "admin",
//   email: "admin@9-5imports.com",
//   mobile: "868.354.7177",
//   role: "Admin"
// }
// client.del('customer:id');

var services = require('./RedisServices/RedisDataServices');

//========== Firebase Test ==========//
// var firebase = require('./Util/firebase');
// firebase.sendNotification({
//   fcmToken: "epnyIxvbFvc:APA91bEb6xfEvPHt06Ba5t6OeCiiUpyCfcQlYfllZyyGmhOK_O56EoyHLw3j0o1Obqqde07zL3XDCvKtf178CBaZD47AM07YSVdI71ssSokIVxf5uLVC45NQYLnGkfAXtTBx8C0Ivmup"
// }, "Test Message", "Test Message");

//========== AWB Service ==========//
// services.awbService.getFullAwb('100006').then(awb => {
//   console.log(awb);
// })
// services.awbService.resetAwbId().then(result => {
//   // services.userService.createUser(user).then(result => {
//   // services.shipperService.importShippersFromCsv().then(result => {
//   // services.customerService.importShippersFromCsv().then(result => {
//   console.log(result);
// })
// });

//========== Package Service ==========//
// const PKG_STATUS = {
//   1: "Received",
//   2: "Loaded on AirCraft",
//   3: "In Transit",
//   4: "Recieved in NAS",
//   5: "Ready for Pickup / Delivery",
//   6: "Delivered"
// };
// console.log(PKG_STATUS['1']);
// services.packageService.updatePackageStatus(10, 5, 'denis').then(result => console.log(result));
// services.packageService.getCustomerPackages(3).then(result => console.log(result));

//========== Manifest Service ==========//
// services.manifestService.getOpenManifest().then(manifests => {
//   console.log(manifests);
// })

//========== Package Service ==========//
// services.hazmatService.importClassesFromCsv().then(result => {
//   console.log(result);
// })

//========== AWB Service ==========//
services.carrierService.getCarrier(2).then(carrier => {
  services.carrierService.removeAll().then(res => {
    services.carrierService.addCarrier(carrier);
  })
})