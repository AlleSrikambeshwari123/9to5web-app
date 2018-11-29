//#region MY SERVICE 
// var CustomerService = require('./RedisServices/CustomerService').CustomerService;
// var cs = new CustomerService(); 
// cs.listCustomers(1,10);

//#endregion


//#region FT DIRECT 
// var
//    redis       = require('redis'),
//    redisearch  = require('redis-redisearch');
// redisearch(redis);
// var rs = require('redredisearch');
// var client = redis.createClient(14897, "redis-14897.c2822.us-east-1-mz.ec2.cloud.rlrcp.com", {
//    auth_pass: 't5atRuWQlOW7Vp2uhZpQivcIotDmTPpl',
// });
 
// // client.ft_search('tew:customers "*" SORTBY skybox ASC LIMIT 0 10', (err,response)=>{
// //    console.log(err); 
// // })
// client.ft_search('tew:customers','*' ,'SORTBY' ,'skybox', 'ASC', 'LIMIT','0','20',(err,response)=>{
//    if (err){
//       console.log(err);
//    }
//    console.log(response) ; 
// });

//#endregion


var redis = require('redis'); 
var redisSearch = require('redisearchclient'); 
var lredis = require('./DataServices/redis-local')


let mySearch = redisSearch(redis,'tew:customers',{clientOptions:{'host':'redis-14897.c2822.us-east-1-mz.ec2.cloud.rlrcp.com','port':'14897',auth_pass: 't5atRuWQlOW7Vp2uhZpQivcIotDmTPpl' }});
console.log('search index created'); 
//  mySearch.createIndex([
//       mySearch.fieldDefinition.text("name",true),
//       mySearch.fieldDefinition.text("mobile",false),
//       mySearch.fieldDefinition.text("email",true),
//       mySearch.fieldDefinition.text("skybox",true),
//       mySearch.fieldDefinition.text("area",true), 
//()=>{
//  lredis.getKeys("tew*").then((kresults)=>{
//      console.log(kresults); 
//     kresults.forEach(element => {

//          lredis.hgetall(element).then((customer)=>{
//              mySearch.add(customer.skybox,customer); 
//              console.log("added document "+customer.name); 
//          })
//      });
//  })
//}
//]); 

  lredis.getKeys('tew:*').then((keys)=>{
  keys.forEach(element => {
      lredis.hgetall(element).then((obj)=>{
          console.log(obj);
          mySearch.add(obj.skybox,obj)
      }); 
  });
}); 

//  mySearch.search("*",{offset:20,numberOfRecords:10},(r1,r2)=>{
//     console.log(r1); 
//     console.log(r2); 
//  });

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