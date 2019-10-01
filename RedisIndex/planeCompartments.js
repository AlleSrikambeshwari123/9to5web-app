var redis = require('redis'); 
var rediSearch = require('../redisearchclient/index'); 
var env = require('../environment')

let userIndex = rediSearch(redis,'index:compartments', {
    clientOptions: {
                 'host': env.redis_host,
                 'port': env.redis_port,
                 auth_pass: env.redis_pass,
                //  tls:{ servername:env.red}
    }
    
}); 
userIndex.dropIndex(); 
userIndex.createIndex([
    userIndex.fieldDefinition.numeric("id",true),
    userIndex.fieldDefinition.numeric("plane_id",true),
    userIndex.fieldDefinition.numeric("weight",true),
    userIndex.fieldDefinition.numeric("volume",true),
   
]); 