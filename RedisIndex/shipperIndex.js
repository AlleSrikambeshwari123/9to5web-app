var redis = require('redis'); 
var dataContext = require("../RedisServices/dataContext")
var rediSearch = require('../redisearchclient/index'); 
var env = require('../environment')

let customerIndex = rediSearch(redis,'index:shipper', {
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
    customerIndex.fieldDefinition.text("telephone",true),
    customerIndex.fieldDefinition.text("fax",true),
    customerIndex.fieldDefinition.text("address",true),
    customerIndex.fieldDefinition.text("state",true),
    customerIndex.fieldDefinition.text("country",true),
    
    customerIndex.fieldDefinition.text("email",true),
   
]); 