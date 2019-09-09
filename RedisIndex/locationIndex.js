var redis = require('redis'); 
var rediSearch = require('../redisearchclient/index'); 
var env = require('../environment')

let locationIndex = rediSearch(redis,'index:locations', {
    clientOptions: {
                 'host': env.redis_host,
                 'port': env.redis_port,
                 auth_pass: env.redis_pass,
                //  tls:{ servername:env.red}
    }
    
}); 
locationIndex.dropIndex(); 
locationIndex.createIndex([
    locationIndex.fieldDefinition.numeric("id",true),
    locationIndex.fieldDefinition.text("name",true),
    locationIndex.fieldDefinition.text("address",true),
    locationIndex.fieldDefinition.text("phone",true),
    // locationIndex.fieldDefinition.text("managerId",true),
    // locationIndex.fieldDefinition.text("managerName",true),
    
]); 

