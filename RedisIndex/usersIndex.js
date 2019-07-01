var redis = require('redis'); 
var rediSearch = require('../redisearchclient/index'); 


let userIndex = rediSearch(redis,'index:users', {
    clientOptions: {
                 'host': 'core.shiptropical.com',
                 'port': '6379',
                 auth_pass: 'Silver123.',
                 tls:{ servername:'core.shiptropical.com'}
    }
    
}); 
userIndex.dropIndex(); 
userIndex.createIndex([
    userIndex.fieldDefinition.numeric("id",true),
    userIndex.fieldDefinition.text("username",true),
    userIndex.fieldDefinition.text("email",true),
    userIndex.fieldDefinition.text("firstName",true),
    userIndex.fieldDefinition.text("lastName",true),
    userIndex.fieldDefinition.text("password",true),
    userIndex.fieldDefinition.text("mobile",true),
    userIndex.fieldDefinition.text("role",true),
    userIndex.fieldDefinition.numeric("locationId",true),
    userIndex.fieldDefinition.numeric("locationName",true)
]); 

