var redis = require('redis'); 
var rediSearch = require('../redisearchclient/index'); 
var env = require('../environment')

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

    packageIndex.fieldDefinition.text("skybox",true),
    packageIndex.fieldDefinition.text("shipper",true),
    packageIndex.fieldDefinition.numeric("status",true),
    packageIndex.fieldDefinition.numeric("pieces",true),
    packageIndex.fieldDefinition.numeric("weight",false),
    packageIndex.fieldDefinition.text("carrier",true),
    packageIndex.fieldDefinition.text("description",true),
    packageIndex.fieldDefinition.numeric("awb",true),
    packageIndex.fieldDefinition.numeric("mid",true),
    packageIndex.fieldDefinition.numeric("volume",true),
    packageIndex.fieldDefinition.text("location",true),
    packageIndex.fieldDefinition.numeric("value",true),
    packageIndex.fieldDefinition.numeric("dimensionalWeight",true),
    packageIndex.fieldDefinition.numeric("hasDocs",true),

]); 