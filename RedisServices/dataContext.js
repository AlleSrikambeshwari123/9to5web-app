var redis = require('redis'); 
var envronment = require('../environment.js')
console.log('creating client',envronment.redis_host)
const client = redis.createClient(envronment.redis_port, envronment.redis_host, {
     auth_pass: envronment.redis_pass,
//       tls: {
//           servername: '157.230.50.153'
    
//   }
});
redis.addCommand("ft.aggregate")


var clientOptions= {
    'host': envronment.redis_host,
    'port': envronment.redis_port,
    auth_pass: envronment.redis_pass
}

module.exports = { 
    redisClient: client,
    clientOptions: clientOptions
}