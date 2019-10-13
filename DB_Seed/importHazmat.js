var redis = require('redis'); 
var dataContext = require("../RedisServices/dataContext")
var redisSearch = require('../redisearchclient');
var HAZMAT_INDEX = "index:hazmat"
const rs = redisSearch(redis, HAZMAT_INDEX, {
    clientOptions:dataContext.clientOptions
});
const csv = require('csvtojson'); 

csv()
.fromFile("./hazmat.csv")
.then((jsonObj)=>{
    
   
    jsonObj.forEach(element => {
        dataContext.redisClient.incr("HAZID",(err,reply)=>{
            rs.add(reply,{id:reply,name:element.sClassName,description:element.sClassDescription})
            console.log(element.sClassName +" "+element.sClassDescription)
        })
       
    });
   
    
})