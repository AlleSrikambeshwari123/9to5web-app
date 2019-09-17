var redis = require('redis'); 
var rediSearch = require('../redisearchclient/index'); 
var env = require('../environment')

let vehicleIndex = rediSearch(redis,'index:vehicles', {
    clientOptions: {
                 'host': env.redis_host,
                 'port': env.redis_port,
                 auth_pass: env.redis_pass,
                //  tls:{ servername:env.red}
    }
    
}); 
vehicleIndex.dropIndex(); 
vehicleIndex.createIndex([
    vehicleIndex.fieldDefinition.numeric("id",true),
    vehicleIndex.fieldDefinition.text("plate",true),
    vehicleIndex.fieldDefinition.text("driverId",true),
    vehicleIndex.fieldDefinition.text("driverName",true),
    vehicleIndex.fieldDefinition.text("make",true),
    vehicleIndex.fieldDefinition.text("model",true),
    vehicleIndex.fieldDefinition.text("country",true)
]); 

