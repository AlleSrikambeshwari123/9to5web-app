var redis = require('redis'); 
var rediSearch = require('../redisearchclient/index'); 
var env = require('../environment')

let customerIndex = rediSearch(redis,'index:customers', {
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
    customerIndex.fieldDefinition.text("firstName",true),
    customerIndex.fieldDefinition.text("lastName",true),
    customerIndex.fieldDefinition.text("pmb",true),
    customerIndex.fieldDefinition.text("address",true),
    //ADD TAG Manually to index for country 
    customerIndex.fieldDefinition.text("identificationNo",true),
    customerIndex.fieldDefinition.text("identificationType",true),
    customerIndex.fieldDefinition.text("email",true),
    customerIndex.fieldDefinition.text("phone",true),
    customerIndex.fieldDefinition.text("branch",true),
    customerIndex.fieldDefinition.text("company",true),
    customerIndex.fieldDefinition.numeric("dateCreated",true),
]); 