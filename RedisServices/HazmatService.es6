

var dataContext = require('./dataContext'); 
var redis = require('redis'); 

var redisSearch = require('../redisearchclient');
var HAZMAT_INDEX = "index:hazmat"
const rs = redisSearch(redis, HAZMAT_INDEX, {
    clientOptions:dataContext.clientOptions
});
export class HazmatService{
    constructor(){

    }
    getAllClasses(){
        return new Promise((resolve,reject)=>{
            rs.search('*',{offset:0, numberOfResults:5000,sortBy:"name",sortDir:"ASC"},(err,shippers)=>{
                var listing  = []; 
                shippers.results.forEach(shipper => {
                    listing.push(shipper.doc); 
                });
                resolve({shippers:listing})
            })
        })
    }
    findClass(text){
        return new Promise((resolve,reject)=>{
            return new Promise((resolve,reject)=>{
                rs.search(`@name:${text}*`,{offset:0, numberOfResults:5000,sortBy:"name",sortDir:"ASC"},(err,shippers)=>{
                    var listing  = []; 
                    shippers.results.forEach(shipper => {
                        listing.push(shipper.doc); 
                    });
                    resolve({shippers:listing})
                })
            })
        })
    }
}