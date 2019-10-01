var redis = require('redis'); 
var rediSearch = require('../redisearchclient/index'); 
var env = require('../environment')

let manifestIndex = rediSearch(redis,'index:manifest', {
    clientOptions: {
                 'host': env.redis_host,
                 'port': env.redis_port,
                 auth_pass: env.redis_pass,
                //  tls:{ servername:env.red}
    }
    
}); 
manifestIndex.dropIndex(); 
manifestIndex.createIndex([
    manifestIndex.fieldDefinition.numeric("mid",true),
    manifestIndex.fieldDefinition.text("type",true),
    manifestIndex.fieldDefinition.numeric("stageId",true),
    manifestIndex.fieldDefinition.numeric("planeId",true),
    manifestIndex.fieldDefinition.numeric("pilotId",true),
    manifestIndex.fieldDefinition.numeric("fligtDate",true),
    manifestIndex.fieldDefinition.numeric("dateCreated",true),
    
    manifestIndex.fieldDefinition.text("mtypeId",true),
    manifestIndex.fieldDefinition.text("createdBy",true),

]); 

manifestIndex.add(0,{
    mid:0,
    type:"default",
    stageId:0,
    dateCreated:0,
    mtypeId:0,
    createdBy:"SYSTEM"
})