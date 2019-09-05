var redis = require('redis'); 
var rediSearch = require('../redisearchclient/index'); 
var env = require('../environment')

let userIndex = rediSearch(redis,'index:users', {
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
    userIndex.fieldDefinition.text("name",true),
    userIndex.fieldDefinition.text("address",true),
    userIndex.fieldDefinition.text("phoneNumber",true),
    userIndex.fieldDefinition.text("managerId",true),
    userIndex.fieldDefinition.text("managerName",true),
    
]); 

