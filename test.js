//#region  Manifest TEST
// var ManifestService = require('./RedisServices/ManifestService').ManifestService; 
// var pservice =  require('./RedisServices/PackageService').PackageService; 
// var ms = new ManifestService(); 
// var ps = new pservice(); 
// ps.removePackage("088",161)
//ps.updateManifestPackageToInTransit(161)
// .then((result)=>{
//     console.log(result);
// });

// ms.createNewManifest(ms.mtypes.air,"stevan").then((result)=>{
//     console.log(result)
// }).catch((err)=>{
//     console.log(err);
// });
//#endregion

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

//========== Package Service ==========//
services.manifestService.getOpenManifest().then(manifests => {
  console.log(manifests);
})