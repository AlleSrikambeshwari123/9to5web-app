

var dataContext = require('./dataContext'); 
var redis = require('redis'); 

var redisSearch = require('../redisearchclient');
var SHIPPER_INDEX = "index:shipper"
const rs = redisSearch(redis, SHIPPER_INDEX, {
    clientOptions:dataContext.clientOptions
});
export class ShipperService {
    constructor(){

    }


    addShipper(shipper){
        return new Promise((resolve,reject)=>{
            dataContext.redisClient.incr("shipper:id",(err,reply)=>{
                shipper.id= reply
                rs.add(reply,shipper,(err,sresult)=>{
                    if (err)
                        resolve({saved:false})
                    resolve({saved:true,shipper})
                })
            })
        })
    }
    getAllShippers(){
        return new Promise((resolve,reject)=>{
            rs.search('*',{offset:0, numberOfResults:5000,sortBy:"name",sortDir:"ASC"},(err,shippers)=>{
                var listing  = []; 
                if (err){
                    console.log(err)
                }
                
                shippers.results.forEach(shipper => {
                    listing.push(shipper.doc); 
                });
                
                resolve({shippers:listing})
            })
        })
    }
    findShipper(text){
        return new Promise((resolve,reject)=>{
            rs.search(`@name:${text}*`,{offset:0, numberOfResults:5000,sortBy:"name",sortDir:"ASC"},(err,shippers)=>{
                var listing  = []; 
                shippers.results.forEach(shipper => {
                    listing.push(shipper.doc); 
                });
                resolve({shippers:listing})
            })
        })
    }
}