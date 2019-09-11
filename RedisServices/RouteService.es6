var redis = require("redis");
var lredis = require("./redis-local");
var moment = require("moment");
var redisSearch = require("../redisearchclient");

const INDEX = "index:deliveries"
const ID = "delivery:ID"; 
var dataContext = require('./dataContext')
var deliveryIndex = redisSearch(redis, INDEX, {
    clientOptions: dataContext.clientOptions
});


export class DeliveryService {
    constructor(){

    }



    saveDelivery(delivery){
        return new Promise((resolve,reject)=>{
            dataContext.redisClient.incr(ID,(err,id)=>{
                delivery.id = id ; 
                console.log('saving delivery',delivery); 
                deliveryIndex.add(id,delivery) 
                resolve({saved:true});                
            })
            
        })
    }
    getDeliveries(){
        return new Promise((resolve,reject)=>{
            deliveryIndex.search("*",{offset:0,numberOfResults:1000,sortBy:'createdDate',sortDir:'DESC'},(err,reply)=>{
                if (err){
                    console.log(err); 
                    resolve({deliveries:[]})
                    return; 
                }
                var deliveries = []; 
                reply.results.forEach(delivery => {
                    deliveries.push(delivery.doc)    
                });
                resolve({deliveries:deliveries})
            })
        })
    }
}