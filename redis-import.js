var redis = require('redis'); 
var lredis = require('./DataServices/redis-local');
var redisSearch = require('redisearchclient'); 
var client = redis.createClient(12000, "192.168.21.110", {
    auth_pass: 'Silver123.'   
});
console.log('client'); 


let mySearch = redisSearch(redis,'tew:customers',{clientOptions:{'host':'192.168.21.110','port':'12000',auth_pass: 'Silver123.' }});


// lredis.getKeys('tew:*').then((keys)=>{
// keys.forEach(element => {
//     lredis.hgetall(element).then((obj)=>{
//         console.log(obj);
//         mySearch.add(obj.skybox,obj)
//     }); 
// });
// }); 

mySearch.search("ste*",{offset:0,numberOfRecords:10},(r1,r2)=>{
   console.log(r1); 
   console.log(r2); 
});

//mySearch.add(16586,)

 //mySearch.createIndex([
//     mySearch.fieldDefinition.text("name",true),
//     mySearch.fieldDefinition.text("mobile",false),
//     mySearch.fieldDefinition.text("email",true),
//     mySearch.fieldDefinition.numeric("skybox",true),
//     mySearch.fieldDefinition.text("area",true), 
//     ()=>{
//         lredis.getKeys("tew*").then((kresults)=>{
//             console.log(kresults); 
//             kresults.forEach(element => {
//             //    lredis.hgetall(element).then((customer)=>{
//             //         mySearch.add()
//             //    })
//             });
//         })
//     }
// ])





//so we are going to pull the keys then insert localally 
//create the bindings to redis 

//create the customer index 

//add the keys to the index 


