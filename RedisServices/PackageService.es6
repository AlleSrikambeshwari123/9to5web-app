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
var uniqId = require("uniqid"); 
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
redis.addCommand("ft.aggregate")
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
        awb.updated_by = awb.username; 
        awb.date_updated = moment().unix(); 
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

        awb.created_by = awb.username; 
        delete awb.username;
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
      if (newPackage.id !="0"){
        packageIndex.update(newPackage.id,newPackage,(err,result)=>{
          if (err)
            console.log(err); 
          resolve({saved:true,id:newPackage.id})
        })
      }
      else {
        dataContext.redisClient.incr(PKG_ID_COUNTER,(err,id)=>{
          newPackage.id = id; 
          packageIndex.add(id,newPackage,(err,result)=>{
            if (err)
              console.log(err); 
            resolve({saved:true,id:id})
          })
        })
      }
   
    })
  }
  createConsolated(packages,username,boxSize){
    var srv = this; 
    return new Promise((resolve,reject)=>{
      var awbInfo = { 
        id: "",
        isSed:0,
        hasDocs: "0",
        invoiceNumber:"",
        value:"0",
        customerId:24197,
        shipper:"482", // we should get an id here 
        carrier:"USPS",
        hazmat:"",
        username:  username
       
    };
    srv.saveAwb(awbInfo).then(awbResult=>{
       //add 
          var cPackage = {
            id:0,
            trackingNo: uniqId(),
            description: "Consolidated Package",
            weight:0, 
            dimensions:  `${boxSize}x${boxSize}x${boxSize}`,
            awb:awbResult.id, 
            isConsolidated: "1", 
            created_by: username, 
          
        }; 
        srv.savePackageToAwb(cPackage).then(pkgResult=>{
          // get the id 
          //
          var batch = dataContext.redisClient.batch(); 
          var pkgBatch = dataContext.redisClient.batch(); 

          packages.forEach(pkg => {
            //these are barcodes 
            batch.sadd("consolidated:pkg:"+pkgResult.id,pkg)
            pkgBatch.hmget(PKG_PREFIX+getPackageIdFromBarCode(pkg),"weight")
          });
          batch.exec((err,results)=>{
            //
            pkgBatch.exec((err1,results)=>{
              var totalWeight = 0; 
              results.forEach(weight => {
                if (isNaN(Number(weight)) == false)
                  totalWeight += Number(weight);
              });
              //we need to update the total weight of the package now 
              srv.packageIndex.update(cPackage.id,{weight:totalWeight})
            })
            
            resolve({saved:true,id:pkgResult.id})
          })
        })
        
    })

   
      //validate the package 
    

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
  getpackagebyRedisId(id){
    return new Promise((resolve,reject)=>{
      packageIndex.getDoc(id,(err,document)=>{
        resolve(document.doc); 
      })
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
  getPackageByDocId(pkgId){
    var srv = this; 
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
      
      packageIndex.delDocument(PKG_IDX,id,(err,response)=>{
        if (err)
          console.log(err); 
        console.log(response); 
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


  //no more skybox
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
  
  //#region Pakcage Filters  
  getPackagesNasWarehouse(isNoDoc,company){
    var srv = this; 
    return new Promise((resolve,reject)=>{
        packageIndex.search(`@status:[4 4] @company:${company} @hasDocs:[${isNoDoc} ${isNoDoc}]`,{},(err,reply)=>{
          Promise.all(reply.results.map(pkg => srv.getPackageByDocId(pkg.id))).then(packages=>{
            resolve(packages); 
          })

        })
    })
  }

  //#endregion
  

   //#region Manifest Package Functions 

   addToFlight(action){
     var srv = this; 
    return new Promise((resolve,reject)=>{
      var packageNo = getPackageIdFromBarCode(action.barcode); 
      console.log(action); 
      this.mySearch.update(packageNo,{mid:action.mid , status: 2, location:"Loaded on AirCraft",compartment:action.compartment},(err,result)=>{
        if(err)
          resolve({added:false})
        srv.getFlightCompartmentWeight(action.mid,action.compartment).then(fresult=>{
          fresult.added = true; 
          resolve(fresult)
        })
       
      })
        
    })
   }
   //get the compartment weight 
   getFlightCompartmentWeight(mid,compartment){
     return new Promise((resolve,reject)=>{
      
      this.mySearch.aggregate(`@mid:[${mid} ${mid}] @compartment:${compartment}`, {},(err,reply)=>{
         if (err)
         console.log(err); 
         console.log(reply,"TOTAL SECTION Weight")
         if (reply[1]){
           var result = reply[1];
           var compartment = result[3]; 
           var weight = result[5]; 
         }
         resolve({compartment:compartment,weight:weight})
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
   recFromTruck(trackingNo,username,shipmentId){
     return new Promise((resolve,reject)=>{
        dataContext.redisClient.sadd("shipment:id:"+shipmentId,trackingNo,(err,reply)=>{
          dataContext.redisClient.set(REC_PKG+trackingNo,moment().unix(), (err,result)=>{
            if (err) resolve({saved:false})
            //shipment count 
            var shipmentCount = 1;
            dataContext.redisClient.scard("shipment:id:"+shipmentId,(err,card)=>{
              resolve({saved:true,pkgCount:card})
            });
           
          })
        })
        
     })
   }
   procssessPackage(pkgIfno,username){
    var srv = this;  
    return new Promise((resolve,reject)=>{
       //we also need to set the warehouse location here 
       dataContext.redisClient.hmset("fees:awb:"+pkgIfno.awb,pkgIfno,(err,result)=>{
         if (err)
          console.log(err); 
          console.log(result); 
          console.log("print:fees:"+username,username); 
         dataContext.redisClient.publish("print:fees:"+username,pkgIfno.awb); 
          srv.getPackageById(pkgIfno.barcode).then(pkg=>{

            if (pkgIfno.refLoc){
              pkg.package.wloc = pkgIfno.refLoc; 
              if (Number(pkgIfno.nodocs)!= 0 )
                pkg.package.hasDocs = 0 ; 
                pkg.package.status = 4; 

                //set theompany 
                if (Number(pkg.awb.customer.pmb) > 9000){
                  pkg.package.company = "0"
                }
                else 
                  pkg.package.company = "1"
                console.log('updating with ',pkg.package)
              packageIndex.update(pkg.package.id,pkg.package,(errResp,response)=>{
                if(errResp)
                console.log(errResp)
              })
            }
            
          })
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
