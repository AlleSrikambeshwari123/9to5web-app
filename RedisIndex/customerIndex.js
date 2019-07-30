var redis = require('redis'); 
var rediSearch = require('../redisearchclient/index'); 
var env = require('../environment')

let customerIndex = rediSearch(redis,'95:customers', {
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
    customerIndex.fieldDefinition.text("firstName",true),
    customerIndex.fieldDefinition.text("lastName",true),
    customerIndex.fieldDefinition.text("skybox",true),
    customerIndex.fieldDefinition.text("identificationNo",true),
    customerIndex.fieldDefinition.text("identificationType",true),
    customerIndex.fieldDefinition.text("email",true),
    customerIndex.fieldDefinition.text("phone",true),

    customerIndex.fieldDefinition.numeric("dateCreated",true),
]); 