var redis = require('redis'); 
var dataContext = require("../RedisServices/dataContext")
var redisSearch = require('../redisearchclient');
var SHIPPER_INDEX = "index:shipper"
const rs = redisSearch(redis, SHIPPER_INDEX, {
    clientOptions:dataContext.clientOptions
});
const csv=require('csvtojson')

csv()
.fromFile("./shipper.csv")
.then((jsonObj)=>{
    
   
    jsonObj.forEach(element => {
        dataContext.redisClient.incr("SHIPID",(err,reply)=>{
            rs.add(reply,{id:reply,name:element.sCarrierName,firstName:element.sContactFirstName,lastName:element.sContactLastName,telephone:element.sTelephone,fax:element.sFaxNumber, email:element.sEmail, address:element.sAddress,state:element.sState,country:element.sCountry})
            console.log(element.sCarrierName ); 
        }); 
       
    });
   
    
})