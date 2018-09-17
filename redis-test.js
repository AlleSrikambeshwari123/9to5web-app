var redis  = require('redis'); 
var client = redis.createClient(6379,"192.168.1.52",{auth_pass: 'UbUzoIX26ZEZ'});
client.set('name','hr',(err,data)=>{
    client.get('name',(error,data1)=>{
        console.log('set name as '+data1); 
    });
}); 

