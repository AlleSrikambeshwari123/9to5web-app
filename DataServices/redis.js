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
        client.hmset(key,value,(error,data)=>{
            if (error) 
                reject(error); 
            resolve(data); 
         });
    });
  
}
var getPackage = (key)=> {
    return new Promise((resolve,reject)=>{
        console.log('key = packages:' +key); 
        if (key == null) reject(); 
        client.hgetall('packages:'+key,(error,data)=>{
              
                if (error ){
                    reject(error); 
                    console.log(error);
                } 
                console.log(data);
                resolve(data)
        }); 
    });
}
var setAdd  = (key,value)=>{
    return new Promise((resolve,reject)=>{
        if (key == null) reject(); 
        client.sadd(key,value,(error,data)=>{
            
                if (error ) reject(error); 
                resolve(data)
        }); 
    });
}
var getMembers = (key)=>{
    return new Promise((resolve,reject)=>{
        if (key == null) reject(); 
        client.smembers(key,(error,data)=>{
                if (error ) {reject(error);
               
                } 
                console.log('printing smembers')
                console.log(data);
                resolve(data)
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

var getNSRecords =  (key)=>{
    return new Promise((resolve,reject)=>{
        if (key == null) reject(); 
        client.scan('0','MATCH',key,(error,data)=>{
                if (error ) reject(error); 
                resolve(data)
        }); 
    });
}
var delkey = (key)=>{
    return new Promise((resolve,reject)=>{
        if (key == null) reject(); 
        client.del(key,(error,data)=>{
                if (error ) reject(error); 
                resolve(data)
        }); 
    });
}


module.exports.set = set;
module.exports.get = get; 
module.exports.getPackage = getPackage;
module.exports.getNS  = getNSRecords;
module.exports.setAdd = setAdd; 
module.exports.del = delkey; 
module.exports.hmset = hashset; 
module.exports.getMembers = getMembers; 
module.exports.hgetall = hmgetall; 
module.exports.client = client; 
