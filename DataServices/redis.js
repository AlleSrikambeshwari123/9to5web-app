var redis  = require('redis'); 
const NSPACE_CUST = "skybox:"; 
const NSPACE_BOX = "customer:"; 

var client = redis.createClient(6380,"hikett-test.redis.cache.windows.net",{auth_pass: 'MgchpaUTzMSo5f4SAQsXwjau6r2OdY6OLHOV2sLQYKg=', tls: {servername: 'hikett-test.redis.cache.windows.net'}});

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

var getLoc = (key)=> {
    return new Promise((resolve,reject)=>{
        if (key == null) reject(); 
        client.get(`driver:location:${key}`,(error,data)=>{
                if (error ) reject(error); 
                var driverLoc = { 
                    username:key, 
                    location:data
                };
                resolve(driverLoc)
        }); 
    });
}
var scanLocations = (match)=>{
    return new Promise((resolve,reject)=>{
        client.scan('0','MATCH','system:driver:*', (error,data)=>{
            console.log('output from scand'); 
            //console.log(data); 
            if (data)
            {
                var keys = data[1]; 
                var usernames = [];
                for(i=0;i<keys.length;i++){
                    //get the usernames only 
                    var driver = keys[i].replace("system:driver:",""); 
                    usernames.push(driver); 
                }
                resolve(usernames); 
            }
             
        }); 
    });
}
var smembers = (key)=>{
    return new Promise((resolve,reject)=>{
        if (key == null) reject(); 
        client.smembers(key,(error,data)=>{
                if (error ) reject(error); 
                console.log('printing smembers')
                resolve(data)
        }); 
    });
}
var details = (data)=>
{
    return new Promise((resolve,reject)=>{
        console.log(data); 
       
        client.hgetall("driver:details:"+data.username,(error,rtnData)=>{
            if (error ) reject(error);
                data.details = rtnData; 
                resolve(data); 
        }); 
    });  
}
module.exports.scanLoc = scanLocations; 
module.exports.get = get; 
module.exports.smembers = smembers;
module.exports.driverLocation = getLoc;  
module.exports.driverDetails = details; 
module.exports.client = client; 
