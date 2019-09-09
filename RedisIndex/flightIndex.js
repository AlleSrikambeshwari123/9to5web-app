var redis = require('redis'); 
var rediSearch = require('../redisearchclient/index'); 
var env = require('../environment')

let flightIndex = rediSearch(redis,'index:flight', {
    clientOptions: {
                 'host': env.redis_host,
                 'port': env.redis_port,
                 auth_pass: env.redis_pass,
                //  tls:{ servername:env.red}
    }
    
}); 
flightIndex.dropIndex(); 
flightIndex.createIndex([
    flightIndex.fieldDefinition.numeric("id",true),
    flightIndex.fieldDefinition.numeric("planeId",true),
    flightindex.fieldDefinition.numeric("pilotId",false),
    flightIndex.fieldDefinition.text("pilotName"),
    flightIndex.fieldDefinition.numeric("compartmentId",true),
    flightIndex.fieldDefinition.text("packageId",true),
    flightIndex.fieldDefinition.text("")
    //flightIndex.fieldDefinition.text("company",true)
]); 