var redis = require('redis'); 
var envronment = require('../environment.js')
console.log('creating client',envronment.redis_host)
var client = redis.createClient(envronment.redis_port, envronment.redis_host, {
     auth_pass: envronment.redis_pass,
//       tls: {
//           servername: '157.230.50.153'
    
//   }
});
client.set('test','testing')
client.get("test",(err,result)=>{
    console.log(result,"working")
})
var clientOptions= {
    'host': envronment.redis_host,
    'port': envronment.redis_port,
    auth_pass: envronment.redis_pass
}

module.exports = { 
    redisClient: client,
    clientOptions: clientOptions
}