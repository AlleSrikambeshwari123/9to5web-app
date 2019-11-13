var dataContext = require('../RedisServices/dataContext')
var lredis = require('../RedisServices/redis-local')



 async function getUserPrinter(user){
     
  var printer = await lredis.get("wh:printer:"+user)
    return printer; 
  
   
}

async function setUserPrinter(user,printer){
    await lredis.set("wh:printer:"+user,printer); 
}

module.exports = {
    getUserPrinter : getUserPrinter,
    setUserPrinter: setUserPrinter
}