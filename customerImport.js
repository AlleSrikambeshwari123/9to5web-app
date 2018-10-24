var redis = require('./DataServices/redis'); 

redis.getKeys('tew:owners:*',(results)=>{
    console.log(results)
});