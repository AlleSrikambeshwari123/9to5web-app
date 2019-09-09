import { ftruncate } from 'fs';

var dataContext = require('./dataContext'); 
var redis = require('redis'); 
const PREFIX = "driver:"
const DRIVER_ID = "driver:id"
var redisSearch = require('../redisearchclient');
var DRIVER_INDEX = "index:drivers"
const rs = redisSearch(redis, DRIVER_INDEX, {
    clientOptions:dataContext.clientOptions
});
export class DriverService { 

    constructor(){
        
    }
  getDrivers(){
      return new Promise((resolve,rejct)=>{
            rs.search('*',{
                offset:0,
                numberOfResults: 1000,
                sortBy: "lastName",
                dir: "DESC"
            },(err,results)=>{
                var drivers = []; 
                results.results.forEach(driverDocument => {
                    drivers.push(driverDocument.doc)
                });
                resolve({drivers:drivers})
            })
      })
  }
  findDriver(query){
      return new Promise((resolve,reject)=>{
          rs.search(query,{offset:0,numberOfResults:1000},(err,drivers)=>{
              //array 
              var fDrivers = []; 
              drivers.results.forEach(driverDocument => {
                    fDrivers.push(driverDocument.doc); 
              });

            resolve({drivers:fDrivers})
          })
      })
  }
  getDriver(driverId){
    return new Promise((resolve,reject)=>{
        if (driverId){
            rs.search("@id:"+driverId,{
                offset:0,
                numberOfResults: 1,
                
            },(err,driverRes)=>{
                if (driverRes.results.length==1){
                    resolve({driver:driverRes.results[0].doc})
                }
                else {
                    resolve({driver:{}})
                }
            }); 
        }
    })
  }
  createDriver(driver){
    return new Promise((resolve,reject)=>{
        dataContext.redisClient.incr(DRIVER_ID,(err,id)=>{
            driver.id = id ; 
            dataContext.redisClient.hmset(DRIVER+id,driver); 
            rs.add(id,driver,(err,result)=>{
                resolve({saved:true})
            })
        })   
    })
  }
  updateDriver(driver){
    return new Promise((resolve,reject)=>{
        rs.update(driver.id,driver,(err,result));
    })
  }
  removeDriver(id){
    return new Promise((resolve,reject)=>{
        
        rs.del(id,(err,restult)=>{
            dataContext.redisClient.del(PREFIX+id)
            resolve({deleted:true})
        })
    })  
  }
  

}