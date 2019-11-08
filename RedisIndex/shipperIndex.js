var redis = require('redis'); 
var dataContext = require("../RedisServices/dataContext")
var rediSearch = require('../redisearchclient/index'); 
var env = require('../environment')

let shipperIndex = rediSearch(redis,'index:shipper', {
    clientOptions: {
                 'host': env.redis_host,
                 'port': env.redis_port,
                 auth_pass: env.redis_pass,
                //  tls:{ servername:env.red}
    }
    
}); 
shipperIndex.dropIndex(); 
shipperIndex.createIndex([
    shipperIndex.fieldDefinition.numeric("id",true),

    shipperIndex.fieldDefinition.text("name",true),
    shipperIndex.fieldDefinition.text("firstName",true),
    shipperIndex.fieldDefinition.text("lastName",true),
    shipperIndex.fieldDefinition.text("telephone",true),
    shipperIndex.fieldDefinition.text("fax",true),
    shipperIndex.fieldDefinition.text("address",true),
    shipperIndex.fieldDefinition.text("state",true),
    shipperIndex.fieldDefinition.text("country",true),
    shipperIndex.fieldDefinition.text("email",true),
   
]); 