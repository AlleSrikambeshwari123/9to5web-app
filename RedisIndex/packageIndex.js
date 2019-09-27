var redis = require('redis'); 
var rediSearch = require('../redisearchclient/index'); 
var env = require('../environment')


let awbIndex = rediSearch(redis,'index:awb', {
    clientOptions: {
                 'host': env.redis_host,
                 'port': env.redis_port,
                 auth_pass: env.redis_pass,
                //  tls:{ servername:env.red}
    }
    
}); 
awbIndex.dropIndex(); 
awbIndex.createIndex([
    awbIndex.fieldDefinition.numeric("id"),
    awbIndex.fieldDefinition.numeric("isSed"),
    awbIndex.fieldDefinition.text("invoice"),
    awbIndex.fieldDefinition.text("invoiceNumber"),
    awbIndex.fieldDefinition.numeric("value"),
    awbIndex.fieldDefinition.numeric("customerId"),
    awbIndex.fieldDefinition.text("shipper"),
    awbIndex.fieldDefinition.text("carrier"),
    awbIndex.fieldDefinition.numeric("status"),
    awbIndex.fieldDefinition.numeric("dateCreated"),
    awbIndex.fieldDefinition.numeric("mid",true),
    awbIndex.fieldDefinition.numeric("hasDocs",true),
    awbIndex.fieldDefinition.numeric("peices",true),

])
let packageIndex = rediSearch(redis,'index:packages', {
    clientOptions: {
                 'host': env.redis_host,
                 'port': env.redis_port,
                 auth_pass: env.redis_pass,
                //  tls:{ servername:env.red}
    }
    
}); 
packageIndex.dropIndex(); 
packageIndex.createIndex([
    packageIndex.fieldDefinition.numeric("id",true),
    packageIndex.fieldDefinition.text("trackingNo",true),
    packageIndex.fieldDefinition.numeric("dateRecieved",true),
    packageIndex.fieldDefinition.numeric("awb",true),
    packageIndex.fieldDefinition.numeric("status",true),
    packageIndex.fieldDefinition.numeric("weight",false),
    packageIndex.fieldDefinition.text("description",true),
    packageIndex.fieldDefinition.numeric("volume",true),
    packageIndex.fieldDefinition.text("location",true),
    packageIndex.fieldDefinition.numeric("hasDocs",true),
    packageIndex.fieldDefinition.text("dimensions",true),
]); 