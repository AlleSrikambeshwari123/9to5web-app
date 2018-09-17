var redis  = require('redis'); 
const NSPACE_CUST = "skybox:"; 
const NSPACE_BOX = "tew:owner:"; 

var client = redis.createClient(6380,"tew-redis.redis.cache.windows.net",{auth_pass: 'euAj2NlScSkbO52pTt0LoEX7RajlFnZlmJ+baDt05Cw=', tls: {servername: 'tew-redis.redis.cache.windows.net'}});

var get = (key)=> {
    return new Promise((resolve,reject)=>{
        if (key == null) reject(); 
        client.get(key,(error,data)=>{
                if (error ) reject(error); 
                resolve(data)
        }); 
    });
}
var set = (key,value)=> {
    return new Promise((resolve,reject)=>{
        if (key == null) reject(); 
        client.set(key,value,(error,data)=>{
                if (error ) reject(error); 
                resolve(data)
        }); 
    });
}
var hashset = (key,value)=>{
    return new Promise((resolve,reject)=>{
        if (key == null) reject(); 
        client.hmset('packages:'+key,value,(error,data)=>{
            if (error) 
                reject(error); 
            resolve(data); 
         });
    });
  
}
var hmgetall = (key)=> {
    return new Promise((resolve,reject)=>{
        if (key == null) reject(); 
        client.hgetall(key,(error,data)=>{
                if (error ) reject(error); 
                resolve(data)
        }); 
    });
}




module.exports.set = set;
module.exports.get = get; 
module.exports.hmset = hashset; 
module.exports.hgetall = hmgetall; 
module.exports.client = client; 
