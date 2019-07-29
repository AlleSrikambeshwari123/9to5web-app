// var redis = require('./RedisServices/redis'); 

// redis.getKeys('tew:owners:*',(results)=>{
//     console.log(results)
// });

var UserService = require('./RedisServices/UserService').UserService; 
var userService = new UserService();



var PackageService = require('./RedisServices/PackageService').PackageService
var packageService = new PackageService()


packageService.savePackage({
    trackingNo: "114-3477688-4697861", 
    customer:"",
    skybox:0,
    shipper:"Amazon",
    description:"Bose Quiet Comfort",
    status: 1,
    peices: 1,
    dimensions :"",
    weight: 1,
    carrier:"FedEX",
    volume: "",
    d_length : 1 ,
    d_height : 1,
    d_width: 1,
    manifest:-1
});

//packageService.updateStatus(); 

