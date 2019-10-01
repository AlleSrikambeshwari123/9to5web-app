var redis = require('redis'); 
var rediSearch = require('../redisearchclient/index'); 
var env = require('../environment')

let userIndex = rediSearch(redis,'index:pilots', {
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
    userIndex.fieldDefinition.text("pilot_name",true),
    userIndex.fieldDefinition.text("email",true),
    userIndex.fieldDefinition.text("mobile",true),
    userIndex.fieldDefinition.text("company",true)
]); 

