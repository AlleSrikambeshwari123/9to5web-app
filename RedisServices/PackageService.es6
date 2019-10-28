import { cpus } from "os";
import { promises } from "dns";


var redis = require("redis");
var lredis = require("./redis-local");
var moment = require("moment");
var redisSearch = require("../redisearchclient");
var fs = require("fs");
var moment = require('moment')
var PackageUtil = require("../Util/packageutil").PackageUtility;
var packageUtil = new PackageUtil();
const PKG_IDX = "index:packages";
const PKG_ID_COUNTER = "package:id";
var dataContext = require('./dataContext')
const PKG_PREFIX = "packages:";
const AWB_ID = "awb:id"
const INDEX_AWB = "index:awb"
const REC_PKG = "pkg:rec:"
var CustomerService = require('./CustomerService').CustomerService; 
var customerService = new CustomerService()
const PKG_STATUS = { 
  1 : "Received",
  2: "Loaded on AirCraft",
  3: "In Transit",
  4: "Recieved in NAS",
  5: "Ready for Pickup / Delivery",
  6: "Delivered"

}; 

const awbIndex = redisSearch(redis, INDEX_AWB, {
  clientOptions: lredis.searchClientDetails
});
const packageIndex = redisSearch(redis, PKG_IDX, {
  clientOptions: lredis.searchClientDetails
});
function getPackageVolumne(mPackage){

  return 0; 
}
function createDocument(tPackage) {
  var packageDocument = {
    id:tPackage.id,
    trackingNo: tPackage.trackingNo,
    skybox: tPackage.skybox,
    dateRecieved : moment().unix(), 
    awb:0, 
    mid:0,
    volume: getPackageVolumne(tPackage),
    weight:tPackage.weight,
    pieces:tPackage.pieces,
    customer: tPackage.customer,
    shipper: tPackage.shipper,
    description: tPackage.description,
    dimensions:tPackage.dimensions,
    carrier:tPackage.carrier,
    //skyboxV: tPackage.skybox, add dimenion 
    status: tPackage.status,
    mid: tPackage.mid,
    value: tPackage.value,
    
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
      clientOptions: lredis.searchClientDetails
    });
  }
  getNewAwb(){
    return new Promise((resolve,reject)=>{
      dataContext.redisClient.exists(AWB_ID,(err,result)=>{
        console.log(result); 
        if (result != "1"){
          dataContext.redisClient.set(AWB_ID == 100000,(err,initResult)=>{
            dataContext.redisClient.incr(AWB_ID,(err,newId)=>{
              resolve({awb:newId})
            })
          })
        }
        else {
          dataContext.redisClient.incr(AWB_ID,(err,newId)=>{
            resolve({awb:newId})
          })
        }
      })
    });
  }
  saveAwb(awb){
    return new Promise((resolve,reject)=>{
      console.log('saving...',awb,moment().toString("hh:mm:ss"))
      if (awb.id !=""){
        awbIndex.update(awb.id,awb,(err1,awbRes)=>{
          if (err1){
            console.log('saving err',err1)
            resolve({saved:false})
          }
          resolve({saved:true, id:awb.id})
        })
      }
      else{
      dataContext.redisClient.incr(AWB_ID,(err,reply)=>{
        awb.id = reply; 
        awb.status = 1; 
        if (awb.invoice){
          awb.hasDocs = 1
          console.log("HAS DOCCCCC")
        }
        else {
          awb.hasDocs = 0 ; 
          console.log("HAS NO DOCCCCC")
        }
        
        awb.dateCreated = moment().unix(); 
          awbIndex.add(awb.id,awb,(err1,awbRes)=>{
            if (err1){
              console.log('saving err',err1)
              resolve({saved:false})
            }
            resolve({saved:true, id:reply})
          })
      })
    }
      
      
    })
  }
  getAwbOverview(id){
    // get the awb packages and add everything in 
    return new Promise((resolve,reject)=>{
      packageIndex.search(`@awb:[${id} ${id}]`,{numberOfResults:5000,offset:0},(err,packages)=>{
        var weight = 0 ; 
        var pieces = packages.totalResults; 
        var description = ""
        packages.results.forEach(package1 => {
          if (description =="")
            description = package1.doc.description; 
          weight += Number(package1.doc.weight)
        });
        var data  = {weight:weight,description:description,pieces:pieces}
        console.log(data,"AWB DETAILS"); 
        resolve( data)
      })
    })
   
  }
  getAwbDetails(id){
    var srv = this; 
    return new Promise((resolve,reject)=>{
      console.log(`@awb:[${id} ${id}]`)
     
      packageIndex.search(`@awb:[${id} ${id}]`,{numberOfResults:5000,offset:0},(err,packages)=>{
        if (err)
         console.log(err)
      
        var  packagelist  = []
        var count = 1; 
        packages.results.forEach(package1 => {

          if (package1.doc.trackingNo.length > 7){
            //only display the last 7 
            package1.doc.trackingNo = package1.doc.trackingNo.substring(package1.doc.trackingNo.length -7)
            
          }
          package1.doc.packageIndex = count;
          count ++; 
          packagelist.push( package1.doc)
        });
       
       
        resolve( packagelist)
      })
    })
  }
  listNoDocsFll(){
    return new Promise((resolve,reject)=>{
       awbIndex.search("@status:[1 1] @hasDocs:[0 0]",{offset:0,numberOfResults:5000,sortBy:'id'},(err,awbs)=>{
         var awbList = []; 
         Promise.all(awbs.results.map(awb=>customerService.getCustomer(awb.doc.customerId))).then(customers=>{
           Promise.all(awbs.results.map(awb=>this.getAwbOverview(awb.doc.id))).then(details=>{
            console.log("got the customers",customers, awbs)
            for(var i =0 ; i < awbs.results.length ; i++ ){
              var awb = awbs.results[i]; 
              awb.doc.dateCreated = moment.unix(awb.doc.dateCreated).format("YYYY-MM-DD hh:mm A")
              //we need to get the customer 
              awb.doc.consignee = customers[i].name; 
              awb.doc.weight = details[i].weight; 
              awb.doc.pmb = customers[i].pmb; 
              awb.doc.description = details[i].description; 
              awb.doc.pieces = details[i].pieces; 
              if (customers[i].pmb == ''){
                awb.doc.pmb = '9000'
              }
              console.log('pushing ',awb)
              //we need to get all the packages 
              awbList.push(awb.doc)
             }
             resolve({awbs:awbList})
           })
          
          }).catch(err=>{
            console.log(err); 
          })
         
        //  awbs.results.forEach(awb => {
           
          
        //  });
         
       })
    })
  }

  listAwbinFll(){
    return new Promise((resolve,reject)=>{
       awbIndex.search("@status:[1 1] @hasDocs:[1 1]",{offset:0,numberOfResults:5000,sortBy:'id'},(err,awbs)=>{
         var awbList = []; 
         Promise.all(awbs.results.map(awb=>customerService.getCustomer(awb.doc.customerId))).then(customers=>{
           Promise.all(awbs.results.map(awb=>this.getAwbOverview(awb.doc.id))).then(details=>{
            console.log("got the customers",customers, awbs)
            for(var i =0 ; i < awbs.results.length ; i++ ){
              var awb = awbs.results[i]; 
              awb.doc.dateCreated = moment.unix(awb.doc.dateCreated).format("YYYY-MM-DD hh:mm A")
              //we need to get the customer 
              awb.doc.consignee = customers[i].name; 
              awb.doc.pmb = customers[i].pmb; 
              awb.doc.weight = details[i].weight; 
              awb.doc.description = details[i].description; 
              awb.doc.pieces = details[i].pieces; 
              if (customers[i].pmb == ''){
                awb.doc.pmb = '9000'
              }
              console.log('pushing ',awb)
              //we need to get all the packages 
              awbList.push(awb.doc)
             }
             resolve({awbs:awbList})
           })
          
          }).catch(err=>{
            console.log(err); 
          })
         
        //  awbs.results.forEach(awb => {
           
          
        //  });
         
       })
    })
  }
  getAwb(id){
    const srv = this; 
    return new Promise((resolve,reject)=>{
      awbIndex.getDoc(id,(err,awb)=>{
        //get the customer 
        customerService.getCustomer(awb.doc.customerId).then(customer=>{
          awb.doc.customer = customer; 
          srv.getAwbDetails(id).then(packages=>{
            //get the packages for the awb 
            awb.doc.packages = packages; 
            resolve({awb:awb.doc})  
          })
          
        })
        
      })
    })
  }
  updateLocation(trackingNumber,location_id){
    return new Promise((resolve,reject)=>{
      packageIndex.search("@trackingNo:"+trackingNumber,{location:location_id},(err,packageResult)=>{

      })
    })
  }
  savePackageToAwb(newPackage){
    return new Promise((resolve,result)=>{
      dataContext.redisClient.incr(PKG_ID_COUNTER,(err,id)=>{
        newPackage.id = id; 
        packageIndex.add(id,newPackage,(err,result)=>{
          if (err)
            console.log(err); 
          resolve({saved:true,id:id})
        })
      })
    })
  }
  savePackage(body){
    return new Promise((resolve,reject)=>{
      var cPackage = {
        
        skybox: body.skybox,
        customer: body.customer.replace("-", "").trim(),
        trackingNo: body.tracking,
        description: body.description,
        shipper: body.shipper,
        carrier:body.carrier,
        value: Number(body.value),
        pieces: Number(body.pieces),
        weight: Number(body.weight),
        dimensions: body.dimensions,
        status: 1,
        location: "FLL",
        mid: 0,
        awb:0,
        //hasOpt: true,
        //mtype: body.mtype
      };
      //validate the package 
      dataContext.redisClient.incr(PKG_ID_COUNTER,(err,id)=>{
        cPackage.id = id; 
        dataContext.redisClient.set(PKG_PREFIX+id,cPackage,(err,response)=>{
          if (err){
            reject({saved:false,err:err})
          }
           var indexPackage =  createDocument(cPackage); 
           console.log(indexPackage); 
           packageIndex.add(cPackage.id,indexPackage,(err1,docResult)=>{
             console.log(docResult); 
             if(err1){
               reject({saved:false,err:err1})
             }
             resolve({saved:true})
           })

        })
      });
    


    })
  }
  savePackageOld(body) {
    
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
        location: "FLL",
        mid: body.mid,
        hasOpt: true,
        //mtype: body.mtype
      };
      console.log("about to save the package");
      if (typeof cPackage.shipper === "undefined") cPackage.shipper = "";
      if (typeof cPackage.description === "undefined")
        cPackage.description = "";
      console.log(body);
      // if (Number(body.isBusiness) == 1) {
      //   cPackage.hasOpt = false;
      // }
      //cPackage = packageUtil.calculateFees(cPackage);
      console.log("package with fees");

      //we also want to calculate the the package fees one time......
      //we have the package details here .. now we need to get the existing package

     
      //we need to check to see of the owner is a business here
      console.log("here about to get the package")
      lredis.getPackage(cPackage.trackingNo).then(p => {
        console.log('p is the ',p); 
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
      }).catch(err232=>{
        console.log(err232)
      });
    });
  } 
  getManifestPackages(){
    return new Promise((resolve,reject)=>{
      
      this.mySearch.search(
        `@mid:[0 0]`,
        { offset: 0, numberOfResults: 5000 },
        (err, data) => {
          var packages = [];
          console.log(data);
          data.results.forEach(element => {

            packages.push(element.doc);
            resolve(packages);                 
        });
    });
    })
  }
  getReceivedPackages(page,pageSize){
    return new Promise((resolve,reject)=>{
      
      this.mySearch.search(
        `@mid:[0 0]`,
        { offset: 0, numberOfResults: 5000 },
        (err, data) => {
          var packages = [];
          console.log(data);
          data.results.forEach(element => {

            packages.push(element.doc);
                            
        });
        resolve(packages); 
    });
    })
  }
  getNoDocsPackackages(page,pageSize){
    return new Promise((resolve,reject)=>{
      
      this.mySearch.search(
        `@hasDocs:[0 0]`,
        { offset: 0, numberOfResults: 5000 },
        (err, data) => {
          var packages = [];
          console.log(data);
          data.results.forEach(element => {

            packages.push(element.doc);
                            
        });
        resolve(packages); 
    });
    })
  }
  getPackageById(barcode){
    var srv = this; 
    var pkgId = getPackageIdFromBarCode(barcode); 
    return new Promise((resolve,reject)=>{
      this.mySearch.getDoc(pkgId,(err,document)=>{
        //get the awb info here as well 
        srv.getAwb(document.doc.awb).then(awbinfo=>{
          console.log(awbinfo); 
          var response = { 
            awb : awbinfo.awb,
            package : document.doc
          }
          resolve(response); 
        }); 
        
      })
    }); 
  }
  //using this 
  

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
  removePackageFromManifest(packageId, mid) {
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
  removePackageById(id) {
    var msearch = this.mySearch;
    return new Promise((resolve, reject) => {
    
      rediSearch.delDocument(PKG_IDX,id,(err,response)=>{
        resolve({deleted:true})
      })
      
        
      
    });
  }
  storePackageForPickup(trackingNo,bin){
    var searcher = this.mySearch;
    return new Promise((resolve,reject)=>{
       lredis.hmset(PKG_PREFIX+trackingNo,{status:4,location:bin}).then((result)=>{
         lredis.getPackage(trackingNo).then((pkg)=>{
          addPackageToIndex(trackingNo,searcher) ; 
          resolve(pkg);   
         });
       }) 
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
          console.log(`@mid:[${mid} ${mid}]`)
        this.mySearch.search(
            `@mid:[${mid} ${mid}]`,
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
  
  

   //#region Manifest Package Functions 

   addToFlight(action){
    return new Promise((resolve,reject)=>{
      var packageNo = getPackageIdFromBarCode(action.barcode); 
      console.log(action); 
      this.mySearch.update(packageNo,{mid:action.mid , status: 2, location:"Loaded on AirCraft"},(err,result)=>{
        if(err)
          resolve({added:false})
        
        resolve({added:true})
      })
        
    })
   }
   //remove from flight 
   removeFromFlight(action){
    return new Promise((resolve,reject)=>{
        var packageNo = getPackageIdFromBarCode(action.barcode);   
        this.mySearch.update(packageNo,{mid:action.mid},(err,result)=>{
        if(err)
            resolve({removed:false})
          
          resolve({removed:true})
        })
    })
   }
   recFromTruck(trackingNo){
     return new Promise((resolve,reject)=>{
     
        dataContext.redisClient.set(REC_PKG+trackingNo,moment().unix(), (err,result)=>{
          if (err) resolve({saved:false})
          resolve({saved:true})
        })
     })
   }
   procssessPackage(pkgIfno,username){
     return new Promise((resolve,reject)=>{
       dataContext.redisClient.hmset("fees:awb:"+pkgIfno.awb,pkginfo,(err,result)=>{
         dataContext.redisClient.publish("print:fees:"+username,pkgIfno.awb); 
         resolve({sent:true})
       })
     })
   }
   recFromPlaneNas(barcode){
     return new Promise((resolve,reject)=>{
       var srv = this ; 
       var pkgId = getPackageIdFromBarCode(barcode); 
        srv.mySearch.getDoc(pkgId,(err,pkg)=>{
            pkg.doc.status = 4; 
            pkg.doc.location  = "Warehouse NAS"; 
            srv.mySearch.update(pkgId,pkg.doc,(err,updateResult)=>{
              if(err)
                reject({updated:false})
              resolve({updated:true})
            })
        })
     })
   }
   //#endregion
}

function getPackageIdFromBarCode(barCodeValue){
  var parts = barCodeValue.split("-"); 
  if (parts.length == 3)
    if (typeof parts[2] != "undefined")
    return parts[2].trim(); 
  return ""
}
