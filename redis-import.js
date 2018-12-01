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


// var redis = require('redis');
// var redisSearch = require('../redisearchclient/index');
// var lredis = require('./DataServices/redis-local')

var services = require('./RedisServices/RedisDataServices')
var rse  = require('./redisearchclient')
// services.manifestService.deleteManifest(132);
// services.manifestService.getOpenManifest(1).then(function(result){
//     console.log('manifest-Count')
//     console.log(result);
// }); 



//#region Manifest Index
// let manifestIndex = redisSearch(redis, 'index:manifest', {
//     clientOptions: {
//         'host': 'redis-14897.c2822.us-east-1-mz.ec2.cloud.rlrcp.com',
//         'port': '14897',
//         auth_pass: 't5atRuWQlOW7Vp2uhZpQivcIotDmTPpl'
//     }
// });
// manifestIndex.dropIndex();
// manifestIndex.createIndex([
//     manifestIndex.fieldDefinition.numeric("mid", true),
//     manifestIndex.fieldDefinition.text("title", true),
//     manifestIndex.fieldDefinition.numeric("stageId", true),
//     manifestIndex.fieldDefinition.text("stage", true),
//     manifestIndex.fieldDefinition.text("dateCreated", true),
//     manifestIndex.fieldDefinition.text("mtypeId", true),
//     manifestIndex.fieldDefinition.text("createdBy", true),
//  ])
// console.log('Populating manifest keys')
// lredis.getKeys('tew:manifest:*').then((keys) => {
//     keys.forEach(element => {
//         lredis.hgetall(element).then((obj) => {
//             console.log(obj);
//             obj.title = "M-"+obj.mid
//             obj.stage = "Open"
//             manifestIndex.add(obj.mid, obj)
//         });
//     });
// });
//#endregion

//#region Package Index
// let packageIndex = redisSearch(redis, 'tew:packages', {
//     clientOptions: {
//         'host': 'redis-14897.c2822.us-east-1-mz.ec2.cloud.rlrcp.com',
//         'port': '14897',
//         auth_pass: 't5atRuWQlOW7Vp2uhZpQivcIotDmTPpl'
//     }
// });

// packageIndex.createIndex([
//     packageIndex.fieldDefinition.text("trackingNo", true),
//     packageIndex.fieldDefinition.text("skybox", true),
//     packageIndex.fieldDefinition.text("customer", true),
//     packageIndex.fieldDefinition.text("shipper", true),
//     packageIndex.fieldDefinition.text("description", true),
//     packageIndex.fieldDefinition.numeric("pieces", true),
//     packageIndex.fieldDefinition.numeric("weight", true),
//     packageIndex.fieldDefinition.numeric("value", true),
// ])
//#endregion
//console.log('search index created');

//#region Customer Index
// let customersIndex = redisSearch(redis, 'tew:customers', {
//     clientOptions: {
//         'host': 'redis-14897.c2822.us-east-1-mz.ec2.cloud.rlrcp.com',
//         'port': '14897',
//         auth_pass: 't5atRuWQlOW7Vp2uhZpQivcIotDmTPpl'
//     }
// });
// customersIndex.createIndex([
//     customersIndex.fieldDefinition.text("name", true),
//     customersIndex.fieldDefinition.text("mobile", false),
//     customersIndex.fieldDefinition.text("email", true),
//     customersIndex.fieldDefinition.text("skybox", true),
//     customersIndex.fieldDefinition.numeric('svalue',true),
//     customersIndex.fieldDefinition.text("area", true)
// ]); 
// console.log('Populating customer keys')
//   lredis.getKeys('tew:owner*').then((keys)=>{
//   keys.forEach(element => {
//       lredis.hgetall(element).then((obj)=>{
//           console.log(obj);
//             obj.svalue = obj.skybox; 
//             obj.skybox ="T-"+obj.skybox;
//           customersIndex.add(obj.skybox,obj)
//       }); 
//   });
// }); 
//#endregion