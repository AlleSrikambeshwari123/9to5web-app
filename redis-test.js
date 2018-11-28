var redis = require('./DataServices/redis'); 
var lredis = require('./DataServices/redis-local');

redis.customerList(10,1).then(function(results){
    console.log(results) ;
});
lredis.set("test","1").then((redResult)=>{
    console.log(redResult); 
    
}); 

