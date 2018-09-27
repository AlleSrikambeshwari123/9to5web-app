var redis  = require('redis'); 
var client = redis.createClient(6380,"tew-redis.redis.cache.windows.net",{auth_pass: 'euAj2NlScSkbO52pTt0LoEX7RajlFnZlmJ+baDt05Cw=', tls: {servername: 'tew-redis.redis.cache.windows.net'}});

var currentPage = 2 ; 
var pageSize = 20 ; 
var startIndex = (currentPage -1) * pageSize; 
var endIndex = startIndex + (pageSize-1); 
client.keys('customer*',(error,data)=>{
    console.log(data); 
}); 
var args = ['customer:names',"[A",'(Z\xff',"LIMIT", `${startIndex}`, `${pageSize}`]
client.zrangebylex(args,(error,data)=>{
    console.log(data); 
});
client.zcard('customer:skybox',(err,data)=>{
    console.log(data); 
});





