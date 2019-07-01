// var redis = require('./RedisServices/redis'); 

// redis.getKeys('tew:owners:*',(results)=>{
//     console.log(results)
// });

var UserService = require('./RedisServices/UserService').UserService; 
var userService = new UserService();

userService.saveUser({
    username:"stevan",
    password:"Silver123.",
    email:"stevan@withrevel.io",
    mobile:"3547177",
    firstName:"Stevan",
    lastName:"Thomas",
    role:"Admin"

}).then(result=>{
    console.log(result)
})