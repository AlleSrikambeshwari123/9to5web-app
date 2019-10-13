var redis = require('redis'); 
var rediSearch = require('../redisearchclient/index'); 
var env = require('../environment')

let customerIndex = rediSearch(redis,'index:hazmat', {
    clientOptions: {
                 'host': env.redis_host,
                 'port': env.redis_port,
                 auth_pass: env.redis_pass,
                //  tls:{ servername:env.red}
    }
    
}); 
customerIndex.dropIndex(); 
customerIndex.createIndex([
    customerIndex.fieldDefinition.numeric("id",true),

    customerIndex.fieldDefinition.text("name",true),
    customerIndex.fieldDefinition.text("description",true),
    
]); 