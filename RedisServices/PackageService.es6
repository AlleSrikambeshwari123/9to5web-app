import { client } from "../DataServices/redis-local";

var redis = require("redis");
var lredis = require("../DataServices/redis-local");
var moment = require("moment");
var redisSearch = require("../redisearchclient");
var fs = require("fs");

var PackageUtil = require("../Util/packageutil").PackageUtility;
var packageUtil = new PackageUtil();
const PKG_IDX = "index:packages";
const PKG_PREFIX = "packages:";
function createDocument(tPackage) {
  var packageDocument = {
    trackingNo: tPackage.trackingNo,
    skybox: tPackage.skybox,
    customer: tPackage.customer,
    shipper: tPackage.shipper,
    description: tPackage.description,
    skyboxV: tPackage.skybox,
    status: tPackage.status,
    mid: tPackage.mid,
    value: tPackage.ttvalue
  };
  console.log("about to add the package to the index");
  return packageDocument;
}
function setPackageInTransit(keys, msearcher) {
  return new Promise((resolve, reject) => {
    var batcher = msearcher.client.batch();
    keys.forEach(element => {
      var value = {
        status: 2,
        location: "In Transit"
      };
      console.log(element + "is the element");

      batcher.hmset(PKG_PREFIX + element, value);
    });
    batcher.exec((err, result) => {
      console.log(result);
      //readd the documents here
      keys.forEach(element => {
        addPackageToIndex(element, msearcher);
      });
      resolve(result);
    });
  });
}

function addPackageToIndex(trackingNo, msearcher) {
  lredis.getPackage(trackingNo).then(pack => {
    msearcher.delDocument(PKG_IDX, `${pack.mid}-${trackingNo}`, (err, done) => {
      var document = createDocument(pack);
      console.log("readding package to the index like a boss " + trackingNo);
      msearcher.add(pack.mid + "-" + pack.trackingNo, document);
    });
  });
}
export class PackageService {
  constructor() {
    this.setupIndex();
  }
  setupIndex() {
    this.mySearch = redisSearch(redis, PKG_IDX, {
      clientOptions: {
        host: "redis-14897.c2822.us-east-1-mz.ec2.cloud.rlrcp.com",
        port: "14897",
        auth_pass: "t5atRuWQlOW7Vp2uhZpQivcIotDmTPpl"
      }
    });
  }
  savePackage(body) {
    
    var searcher = this.mySearch; 
    return new Promise((resolve, reject) => {
      var cPackage = {
        skybox: body.skybox,
        customer: body.customer.replace("-", "").trim(),
        trackingNo: body.tracking,
        dutyPercent: 0.2,
        description: body.description,
        shipper: body.shipper,
        value: Number(body.value),
        pieces: Number(body.pieces),
        weight: Number(body.weight),
        status: 1,
        location: "Miami",
        mid: body.mid,
        hasOpt: true,
        mtype: body.mtype
      };
      console.log("about to save the package");
      if (typeof cPackage.shipper === "undefined") cPackage.shipper = "";
      if (typeof cPackage.description === "undefined")
        cPackage.description = "";
      console.log(body);
      if (Number(body.isBusiness) == 1) {
        cPackage.hasOpt = false;
      }
      cPackage = packageUtil.calculateFees(cPackage);
      console.log("package with fees");

      //we also want to calculate the the package fees one time......
      //we have the package details here .. now we need to get the existing package

      var container = "";
      var containerNo = "";
      if (typeof body.bag != "undefined") {
        cPackage.bag = body.bag;
        container = "bag";
        containerNo = cPackage.bag;
      }
      if (typeof body.skid != "undefined") {
        cPackage.skid = body.skid;
        container = "skid";
        containerNo = cPackage.skid;
      }
      //we need to check to see of the owner is a business here

      lredis.getPackage(cPackage.trackingNo).then(p => {
        if (p) {
          var currentContainer = `manifest:${p.mid}:${p.mtype}:${container}:`;
          console.log("found package ");
          console.log(p);
          if (container == "bag") {
            //check to see if the back no is the same.
            if (p.bag != cPackage.bag) {
              //remove it from the original list
              lredis.srem(currentContainer + p.bag, p.trackingNo);
              console.log(
                "remove package from current set " + currentContainer
              );
            }
          } else {
            //check to see if the skid number is the same.
            if (p.skid != cPackage.skid) {
              //remove it from the original list
              lredis.srem(currentContainer + p.skid, p.trackingNo);
              console.log(
                "remove package from current set " + currentContainer
              );
            }
          }
        } else {
          // the package doesn't exist update the counter
          lredis.client.incr("mcounter:" + cPackage.mid);
          
        }

        lredis
          .hmset("packages:" + cPackage.trackingNo, cPackage)
          .then(function(result) {
            //add to queue for persistent processing
            
            var manifestKey = `manifest:${cPackage.mid}:${
              cPackage.mtype
            }:${container}:${containerNo}`;
            console.log("about to create the document....");
            addPackageToIndex(cPackage.trackingNo,searcher); 
            console.log("added the package to index");
            lredis
              .setAdd(manifestKey, cPackage.trackingNo)
              .then(function(sResult) {
                //get the members one time here
                console.log("added the package to the set");
                console.log(manifestKey);
                lredis
                  .getMembers(manifestKey)
                  .then(data => {
                    console.log("data");
                    console.log(data);
                    Promise.all(data.map(lredis.getPackage));
                  })
                  .then(function(rdata) {
                    //we need to alert the person that the package is here so read email etc.
                    //add to the index
                    console.log("data");
                    console.log(rdata);

                    resolve({
                      saved: true,
                      packages: rdata,
                      sPackage: cPackage
                    });
                  })
                  .catch(err3 => {
                    console.log(err3);
                    reject({
                      err: err3,
                      saved: true,
                      listing: false
                    });
                  });
              })
              .catch(function(err) {
                resolve({
                  saved: false
                });
              });
          })
          .catch(function(err2) {
            reject({
              saved: false
            });
          });

        //save the package to the package NS
      });
    });
  }

  updateManifestPackageToInTransit(mid) {
    //get all the packages
    //we need to update the index at this point as well
    var msearch = this.mySearch;
    this.mySearch.search(
      `@mid:[${mid} ${mid}]`,
      { offset: 0, numberOfResults: 5000 },
      (err, data) => {
        var packages = [];
        console.log(data);
        data.results.forEach(element => {
          var oldDocId = element.docId;
          element.docId = element.docId.replace(`${mid}-`, "");
          packages.push(element.docId);
          // i could delete here
          // msearch.delDocument(PKG_IDX,oldDocId)
          //update all the packages
        });
        setPackageInTransit(packages, msearch, mid).then(function(
          updatedPackages
        ) {
          console.log("updated packages");
          console.log(updatedPackages);
        });
      }
    );
  }
  removePackage(trackingNo, mid) {
    var msearch = this.mySearch;
    return new Promise((resolve, reject) => {
      var manifest = mid;
      var manifestKey = "manifest:" + manifest + ":*";

      lredis.del("packages:" + trackingNo).then(function(result) {
        console.log(result);
        msearch.delDocument(PKG_IDX, `${mid}-${trackingNo}`);
        //we need to remove from the index and dec the counter
        lredis.client.decr("mcounter:" + mid);
        //rServices.packageService.rmPackage(mid, trackingNo);
        lredis.getKeys(manifestKey).then(kResult => {
          //the list of all the sets ...we need to remove the key from each one
          var keysCount = 0;

          kResult.forEach(element => {
            console.log(
              `removing ${trackingNo} package manifest set ${element} `
            );
            lredis.srem(element, trackingNo).then(function(rResult) {
              console.log(rResult);
              console.log("removed");
              if (keysCount == kResult.length - 1) keysCount++;
            });
          });
          resolve({
            deleted: true
          });
        });

        //we also need to remove from any sets
      });
    });
  }
  updatePackageIndex(tracking){
      return new Promise((resolve,reject)=>{
          var msearch = this.mySearch; 
          addPackageToIndex(tracking,msearch); 
         resolve({'updated':true});
      })
  }
  getCustomerPackages(skybox) {}
  getManifestPackagesByStatus(mid,status) {
      return new Promise((resolve,reject)=>{
          console.log(`@mid:[${mid} ${mid}] @status=[${status} ${status}]`)
        this.mySearch.search(
            `@mid:[${mid} ${mid}] @status:[${status} ${status}]`,
            { offset: 0, numberOfResults: 5000 },
            (err, data) => {
              var packages = [];
              console.log(data);
              data.results.forEach(element => {

                packages.push(element.doc);
                resolve(packages);                 
            });
        });
      });
  
  }     
}
