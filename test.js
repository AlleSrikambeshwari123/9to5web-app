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
var user = {
  username: "admin",
  firstName: "admin",
  lastName: "9-5 Import",
  password: "admin",
  email: "admin@9-5imports.com",
  mobile: "868.354.7177",
  role: "Admin"
}
var services = require('./RedisServices/RedisDataServices');
services.userService.createUser(user).then(result => {
  // services.shipperService.importShippersFromCsv().then(result => {
  // services.customerService.importShippersFromCsv().then(result => {
  console.log(result);
})
// });