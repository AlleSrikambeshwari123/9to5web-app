var redis = require('redis');
var lredis = require('../DataServices/redis-local');
var moment = require('moment');
var redisSearch = require('redisearchclient');
const MID_COUNTER = "global:midCounter";
const MID_PREFIX = "tew:manifest:";
const MID_INDEX = "index:manifest";
const OPEN_MANIFEST = "manifest:open";
const CLOSED_MANIFEST = "manifest:closed"
const SHIPPED_MANIFEST = "manifest:shipped"
const VERIFIED_MANIFEST = "manifest:verified"; // manifest that have duties verified

var manifestTypes = {
    air: {
        id: 1,
        title: "Air Cargo",
        prefix: "M-"
    },
    ocean: {
        id: 2,
        title: "Ocean",
        prefix: "S-"
    },
    hazmat: {
        id: 3,
        title: "HAZMAT",
        prefix: "H-"
    }
}
var manifestStages = {
    open: {
        id: 1,
        title: 'Open'
    },
    closed: {
        id: 2,
        title: 'Closed'
    },
    shipped: {
        id: 3,
        title: 'Shipped'
    },
    verified: {
        id: 4,
        title: 'Verified'
    }

}

export class ManifestService {

    constructor() {
        
        this.redisClient = lredis.client;
        this.mtypes = manifestTypes;
        this.mstages = manifestStages;
        //check to ensure we have the manifest counter 
        this.checkSetup(); 
        this.setupIndex()
    }
    setupIndex(){
        this.mySearch = redisSearch(redis, 'index:manifest', {
            clientOptions: {
                'host': 'redis-14897.c2822.us-east-1-mz.ec2.cloud.rlrcp.com',
                'port': '14897',
                auth_pass: 't5atRuWQlOW7Vp2uhZpQivcIotDmTPpl'
            }
        });
    }
    checkSetup(){
        this.redisClient.exists(MID_COUNTER, (err, res) => {
            if (res == 0) {
                //create the manifest 
                lredis.set(MID_COUNTER, 100);
            }
            
        });
    }

    getTypes() {
        return this.mytypes
    }
    getStages() {
        return this.manifestStages;
    }

    getOpenManifest(typeId){
        
        return new Promise((resolve,reject)=>{
           console.log( `@stageId:[${typeId} ${typeId}] @mtypeId:${typeId}`);
            this.mySearch.search(`@stageId:[1 1] @mtypeId:${typeId}`, {
                offset:0,
                numberOfResults: 100,
                sortBy: "mid",
                dir: "DESC"
            }, (r1, data) => {
                if (r1)
                 {
                     console.log('we had an error')
                    console.log(r1);
                    
                 }   
                 console.log('no errors detected here ...')
                 //console.log(manifestList);
                 console.log(data);
                resolve(data.totalResults);
                
                
            });
            
        });
        
    }
    createNewManifest(type, user) {
        //we have some rules to follow here 
        //1. a new manifest cannot be created if the previous manifest is not closed 
        //check for open manifest first 
        return new Promise((resolve, reject) => {
            this.getOpenManifest(type.id).then((openCount) => {
              
                console.log(type); 
                if (openCount>0) {
                    //we can't add the manifest reject 
                    reject({
                        "message": "There is an open manifest Please close it before creating a new manifest."
                    });

                } else {
                    console.log('trying to create the manifest........')
                    this.redisClient.multi()
                        .incr(MID_COUNTER)
                        .exec((err, resp) => {
                            console.log(resp);
                            var manifest = {
                                mid: resp[0],
                                title: type.prefix+resp[0],
                                dateCreated: moment().format("YYYY-MM-DD"),
                                mtypeId: type.id,
                                stageId: manifestStages.open.id,
                                stage: manifestStages.open.title,
                                createdBy: user
                            };
                            this.redisClient.multi()
                                .hmset(MID_PREFIX + manifest.mid, manifest)
                                .sadd(OPEN_MANIFEST, manifest.mid)
                                .exec((err, results) => {
                                    this.mySearch.add(manifest.mid,manifest);
                                    //also add to the index here one time 
                                    if (err) {
                                        reject(err);
                                    } else {
                                        resolve(manifest)
                                    }
                                });
                        });
                }

            }).catch((err)=>{
                console.log("err detected"); 
                console.log(err);
            });

        });

    }
    changeStage(mid, stages) {
        return new Promise((resolve, reject) => {
            
            lredis.client.hmset(MID_PREFIX+mid,"stageId",stages,(err,result)=>{
                var stage = this.getStageById(stages); 
                console.log('looked up the stage '+stage.title);
                lredis.client.hmset(MID_PREFIX+mid,"stage",stage.title,(err,result2)=>{}); 
                lredis.hgetall(MID_PREFIX+mid).then((uManifest)=>{
                    this.mySearch.delDocument("index:manifest",mid,(err,result1)=>{
                        console.log('changing document');
                        console.log(err);
                        console.log(result1) 
                        this.mySearch.add(uManifest.mid,uManifest); 
                        resolve(result); 
                    }); 
                   
                });
               
            });
            //we also need to to update the document 

            
        })
    }
    listManifest(type,page,pageSize){
        return new Promise((resolve,reject)=>{
            var offsetVal = (page - 1) * pageSize;
            console.log('offset '+offsetVal);
            
            this.mySearch.search("@mtypeId:"+type, {
                offset:offsetVal,
                numberOfResults: pageSize,
                sortBy: "mid",
                dir: "DESC"
            }, (r1, data) => {
                if (r1)
                    console.log(r1);
                 var manifestList = []; 
                 data.results.forEach(manifestResult => {
                    manifestList.push(manifestResult.doc);    
                    
                 });
                 //console.log(manifestList);
                 var pagedData = {
                    manifests:manifestList,
                    totalResults : data.totalResults,
                    page : page,
                    pageSize: pageSize, 
                    TotalPages : (data.totalResults/pageSize)
                }
                resolve(pagedData);
                console.log(manifestList);
                
            });
        });
    }
    getManifest(mid) {
        return lredis.hgetall(MID_PREFIX+mid)
    }
    deleteManifest(mid){
       return new Promise((resolve,reject)=>{
        lredis.client.del(MID_PREFIX+mid,(err,resp)=>{
            console.log(resp); 
            this.mySearch.delDocument("index:manifest",mid,(err,result)=>{
                console.log("deleting mid"); 
                console.log(err); 
                console.log(result);
            }); 
            lredis.srem(OPEN_MANIFEST,mid);
            resolve({deleted:true})    
        })

       }); 
        
        
    }
    getTypebyId (id){
        if (id == 1){
            return manifestTypes.air;
        }
        if (id == 2){
            return manifestTypes.ocean;
        }
        if (id == 3){
            return manifestTypes.hazmat;
        }
        return manifestTypes.air; 
    }
    getStageById(id){
        if (id == 1){
            return manifestStages.open;
        }
        if (id == 2){
            return manifestStages.closed;
        }
        if (id == 3){
            return manifestStages.shipped;
        }
        if (id == 4){
            return manifestStages.verified;
        }
        return manifestStages.open; 
    }
}