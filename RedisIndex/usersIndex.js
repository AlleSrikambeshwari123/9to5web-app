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
    userIndex.fieldDefinition.text("username",true),
    userIndex.fieldDefinition.text("email",true),
    userIndex.fieldDefinition.text("firstName",true),
    userIndex.fieldDefinition.text("lastName",true),
    userIndex.fieldDefinition.text("password",true),
    userIndex.fieldDefinition.text("mobile",true),
    userIndex.fieldDefinition.text("role",true),
    userIndex.fieldDefinition.numeric("locationId",true),
    userIndex.fieldDefinition.numeric("locationName",true)
]); 

