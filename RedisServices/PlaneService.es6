
var redis = require('redis');
var lredis = require('./redis-local');
var dataContext = require('./dataContext'); 
var redisSearch = require('../redisearchclient/index');
const PREFIX = "plane:"
const INDEX = "index:planes"
const PLANE_COUNTER = "plane:id"; 
const PLANE_COMPARTMENTS = "plane:x:compartments" //list of compartments 
const COMPARTMENT_INDEX = "index:plane:compartment"; 

const rs = redisSearch(redis, INDEX, {
    clientOptions:dataContext.clientOptions
});
export class PlaneService{
    constructor(){

    }
    addPlane(plane){
        return new Promise((resolve,reject)=>{
          dataContext.redisClient.incr(PLANE_COUNTER,(err,id)=>{
              plane.id = id; 
              dataContext.redisClient.hmset(PREFIX+id,plane); 
              rs.add(id,plane,(err,res)=>{
                  resolve({saved:true}); 
              }); 
          })
        })
    }
    rmPlane(planeId){
        return new Promise((resolve,reject)=>{
            rs.delDocument(INDEX,planeId); 
            dataContext.redisClient.del(PREFIX+planeId,(err,res)=>{
                resolve({deleted:true})
            })
        })
    }
    getPlane(planeId){
        return new Promise((resolve,reject)=>{
            dataContext.redisClient.hgetall(PREFIX+planeId,(err,p)=>{
                resolve({plane:p}); 
            })
        })
    }
    getPlanes(){
        return new Promise((resolve,reject)=>{
            rs.search('*',{},(err,planesResult)=>{
                var planes = []; 
                planesResults.results.forEach(plane => {
                    planes.push(planes.doc)
                    
                });
                resolve({planes:palnes}); 
            })
        })
    }
    addCompartment(planeId,comparment){
        return new Promise((resolve,reject)=>{
            
        })
    }
    removeCompartment(cid){
        return new Promise((resolve,reject)=>{
            
        })
    }
   
}