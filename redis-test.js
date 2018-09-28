var redis = require('./DataServices/redis'); 

redis.customerSearch("16586",10,1).then(function(results){
    console.log(results) ;
});

