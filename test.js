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

var services = require('./RedisServices/RedisDataServices');
services.shipperService.importShippersFromCsv().then(result => {
  // services.customerService.importShippersFromCsv().then(result => {
  console.log(result);
})
// });