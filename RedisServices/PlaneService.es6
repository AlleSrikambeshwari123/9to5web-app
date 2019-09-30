import { INSPECT_MAX_BYTES } from 'buffer';

var redis = require('redis');
var lredis = require('./redis-local');
var dataContext = require('./dataContext'); 
var redisSearch = require('../redisearchclient/index');
const PREFIX = "plane:"
const INDEX = "index:planes"
const PLANE_COUNTER = "plane:id"; 
const COMPARTMENT_COUNTER = "compartment:id"
const PLANE_COMPARTMENT_INDEX = "index:compartments"

 

const rs = redisSearch(redis, INDEX, {
    clientOptions:dataContext.clientOptions
});
const compartmentIndex = redisSearch(redis, PLANE_COMPARTMENT_INDEX, {
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
    updatePlane(plane){
        return new Promise ((resolve,reject)=>{
            dataContext.redisClient.hmset(PREFIX+plane.id,plane); 
            rs.update(plane.id,plane,(err,result)=>{
                resolve({saved:true})
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
                console.log(planesResult)
                var planes = []; 
                planesResult.results.forEach(plane => {
                    planes.push(plane.doc)
                    
                });
                resolve({planes:planes}); 
            })
        })
    }

    addCompartment(comparment){
        var srv = this; 
        return new Promise((resolve,reject)=>{
             dataContext.redisClient.incr(COMPARTMENT_COUNTER,(err,id)=>{
                 comparment.id = id; 
                 console.log(comparment)
                 if (isNaN(Number(comparment.volume)))
                 comparment.volume = 0 ; 
                 compartmentIndex.add(id,comparment,(err1,result)=>{
                     if (err1){
                         console.log(err1)
                        resolve({saved:false})
                        return; 
                     }
                     srv.updatePlaneCapcity(comparment.plane_id)
                    resolve({saved:true})
                 }); 
             })
        })
    }
    updatePlaneCapcity(planeId){
        // get the compartments 
        
        var total_weight = 0 ; 
        var total_volume = 0 ; 
        compartmentIndex.search(`@plane_id:[${planeId} ${planeId}]`,{offset:0,numberOfResults:100},(err,compResults)=>{
            if(err)
            console.log(err)
            compResults.results.forEach(compartment => {
                if (isNaN(Number(compartment.doc.weight)) == false){
                    total_weight += Number(compartment.doc.weight)
                }
                if (isNaN(Number(compartment.doc.volume)) == false){
                    total_volume += Number(compartment.doc.volume)
                }
                rs.getDoc(planeId,(err1,planeDoc)=>{
                    var plane = planeDoc.doc; 
                    plane.maximum_capacity = total_weight; 
                    rs.update(planeId,plane); 
                })    
            });
          
            
        })
    }
    listCompartments(planeId){
        var srv = this; 
        return new Promise((resolve,reject)=>{
            compartmentIndex.search(`@plane_id:[${planeId} ${planeId}]`,{offset:0,numberOfResults:100},(err,compResults)=>{
                var compartments = []; 
                compResults.results.forEach(compartment => {
                    compartments.push(compartment.doc)
                });
                //
                srv.getPlane(planeId).then(plane=>{
                    plane.plane.compartments = compartments; 
                    resolve(plane); 
                })
            })
        })
    }
    removeCompartment(planeId,cid){
        var srv = this; 
        return new Promise((resolve,reject)=>{
            compartmentIndex.delDocument(PLANE_COMPARTMENT_INDEX, cid,(err,delResult)=>{
                resolve({deleted:true})
                srv.updatePlaneCapcity(planeId)
            }); 
        })
    }
   
}