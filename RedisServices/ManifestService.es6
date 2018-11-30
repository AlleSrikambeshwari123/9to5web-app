var redis = require('redis');
var lredis = require('../DataServices/redis-local');
var moment = require('moment');
var redisSearch = require('redisearchclient');
const MID_COUNTER = "global:midCounter";
const MID_PREFIX = "tew:manifest:";
const OPEN_MANIFEST = "manifest:open";
const CLOSED_MANIFEST = "manifest:closed"
const SHIPPED_MANIFEST = "manifest:shipped"
const VERIFIED_MANIFEST = "manifest:verified"; // manifest that have duties verified

var manifestTypes = {
    air: {
        id: 1,
        title: "Air Cargo",
        prefix: "M"
    },
    ocean: {
        id: 1,
        title: "Ocean",
        prefix: "S"
    },
    hazmat: {
        id: 3,
        title: "HAZMAT",
        prefix: "H"
    }
}
var manifestStages = {
    open: {id:1,title:'Open'},
    closed: {id:2,title:'Closed'},
    shipped: {id:3,title:'Shipped'},
    verified: {id:4,title:'Verified'}

}

export class ManifestService {

    constructor() {
        this.redisClient = lredis.client;
        this.mtypes = manifestTypes; 
        this.mstages = manifestStages;
        //check to ensure we have the manifest counter 
        this.redisClient.exists(MID_COUNTER, (err, res) => {
            if (res == 0) {
                //create the manifest 
                lredis.set(MID_COUNTER, 100);
            }
            console.log(res);
        });
    }
    getTypes(){
        return this.mytypes
    }
    getStages(){
        return this.manifestStages; 
    }
    createNewManifest(type, user) {
        //we have some rules to follow here 
        //1. a new manifest cannot be created if the previous manifest is not closed 
        //check for open manifest first 
        return new Promise((resolve, reject) => {
            lredis.setSize(OPEN_MANIFEST).then((openCount) => {
                console.log("openCount")
                console.log(openCount);
                if (openCount > 0) {
                    //we can't add the manifest reject 
                    reject({
                        "message": "there is an open manifest please close it"
                    });
                      
                }
                else {
                    this.redisClient.multi()
                    .incr(MID_COUNTER)
                    .exec((err, resp) => {
                        console.log(resp);
                        var manifest = {
                            mid: resp[0],
                            title: '',
                            dateCreated: moment().format("YYYY-MM-DD"),
                            mtypeId: type.id,
                            stageId: manifestStages.open.id,
                            createdBy : user
                        };
                        this.redisClient.multi()
                            .hmset(MID_PREFIX + manifest.mid, manifest)
                            .sadd(OPEN_MANIFEST,manifest.mid)
                            .exec((err, results) => {
                                if (err) {
                                    reject(err);
                                } else {
                                    resolve(results)
                                }
                            });
                    });
                }
                
            });

        });

    }
    closeManifest(mid){

    }
    shipManifest(mid){

    }
    deleteManifest() {

    }
}