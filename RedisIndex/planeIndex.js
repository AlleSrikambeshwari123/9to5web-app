var redis = require('redis'); 
var rediSearch = require('../redisearchclient/index'); 
var env = require('../environment')

let userIndex = rediSearch(redis,'index:planes', {
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
    userIndex.fieldDefinition.text("tail_num",true),
    userIndex.fieldDefinition.text("maximum_capacity",true),
    userIndex.fieldDefinition.text("pilot",true),
    userIndex.fieldDefinition.text("company",true)
]); 

