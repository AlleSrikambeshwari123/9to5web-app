
module.exports = { 
    redis_clientOptions: {
        'host': normalizeValue(process.env.REDIS_HOST,"192.241.148.235"),
        'port': normalizeValue( process.env.REDIS_PORT,"6379"),
        auth_pass: normalizeValue(process.env.REDIS_PASS,"Silver123.")
    },
    redis_port: normalizeValue( process.env.REDIS_PORT,"6379"),
    redis_host: normalizeValue(process.env.REDIS_HOST,"192.241.148.235"),
    redis_pass : normalizeValue(process.env.REDIS_PASS,"Silver123.")
}
function normalizeValue(val, defaultValue) {
    console.log(val,"is the value")
   if ( typeof val === "undefined" ){
        return defaultValue; 
   }
   else {
       return val; 
   }
  
    return false;
  }