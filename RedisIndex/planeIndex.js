var redis = require('redis'); 
var rediSearch = require('../redisearchclient/index'); 
var env = require('../environment')

let planeIndex = rediSearch(redis,'index:planes', {
    clientOptions: {
                 'host': env.redis_host,
                 'port': env.redis_port,
                 auth_pass: env.redis_pass,
                //  tls:{ servername:env.red}
    }
    
}); 
planeIndex.dropIndex(); 
planeIndex.createIndex([
    planeIndex.fieldDefinition.numeric("id",true),
    planeIndex.fieldDefinition.text("tail_num",true),
    planeIndex.fieldDefinition.text("maximum_capacity",true),
    planeIndex.fieldDefinition.text("pilot",true),
    planeIndex.fieldDefinition.text("aircraft_type",true),
    planeIndex.fieldDefinition.text("contact_name",true),
    planeIndex.fieldDefinition.text("contact_phone",true),
    planeIndex.fieldDefinition.text("company",true)
]); 

