var redis = require('redis'); 
var rediSearch = require('../redisearchclient/index'); 
var env = require('../environment')

let deliveryIndex = rediSearch(redis,'index:deliveries', {
    clientOptions: {
                 'host': env.redis_host,
                 'port': env.redis_port,
                 auth_pass: env.redis_pass,
                //  tls:{ servername:env.red}
    }
    
}); 
deliveryIndex.dropIndex(); 
deliveryIndex.createIndex([
    deliveryIndex.fieldDefinition.numeric("id",true),
    deliveryIndex.fieldDefinition.text("deliveryDate",true),
    deliveryIndex.fieldDefinition.text("toLocation",true),
    deliveryIndex.fieldDefinition.text("status",true), //0 - packing , 1 -in transit, 2 - delivered 

    deliveryIndex.fieldDefinition.text("createdBy",true),
    deliveryIndex.fieldDefinition.text("createdDate",true),
    
]); 


//add package to delivery 
let packageDeliveryIndex = rediSearch(redis,'index:package:delivery', {
    clientOptions: {
                 'host': env.redis_host,
                 'port': env.redis_port,
                 auth_pass: env.redis_pass,
                //  tls:{ servername:env.red}
    }
    
}); 
packageDeliveryIndex.dropIndex(); 
packageDeliveryIndex.createIndex([
    packageDeliveryIndex.fieldDefinition.numeric("id",true),
    packageDeliveryIndex.fieldDefinition.numeric("delivery_id",true),
    packageDeliveryIndex.fieldDefinition.text("company_tracking",true),

]); 

