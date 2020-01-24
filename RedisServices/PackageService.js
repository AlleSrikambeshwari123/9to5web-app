var emailService = require("../Util/EmailService")
var redis = require("redis");
var moment = require("moment");
var redisSearch = require("../redisearchclient");
var fs = require("fs");
var uniqId = require("uniqid");

var PackageUtil = require("../Util/packageutil").PackageUtility;
var packageUtil = new PackageUtil();

var client = require('./dataContext').redisClient;
var lredis = require('./redis-local');

const PREFIX = "package:";
const PACKAGE_ID = "id:package";
const PREFIX_PACKAGE_LIST = "list:package:"; // this key + awbId = array of packages

const REC_PKG = "pkg:rec:"
var CustomerService = require('./CustomerService');
var customerService = new CustomerService()
const PKG_STATUS = {
  1: "Received",
  2: "Loaded on AirCraft",
  3: "In Transit",
  4: "Recieved in NAS",
  5: "Ready for Pickup / Delivery",
  6: "Delivered"

};

function getPackageVolumne(mPackage) {

  return 0;
}
function createDocument(tPackage) {
  var packageDocument = {
    id: tPackage.id,
    trackingNo: tPackage.trackingNo,
    skybox: tPackage.skybox,
    dateRecieved: moment().unix(),
    awb: 0,
    mid: 0,
    volume: getPackageVolumne(tPackage),
    weight: tPackage.weight,
    pieces: tPackage.pieces,
    customer: tPackage.customer,
    shipper: tPackage.shipper,
    description: tPackage.description,
    dimensions: tPackage.dimensions,
    carrier: tPackage.carrier,
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

      batcher.hmset(PACKAGE_ID + element, value);
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

class PackageService {
  // Only show 7 trackingNo on the list;
  getPackages(awbId) {
    return new Promise((resolve, reject) => {
      client.smembers(PREFIX_PACKAGE_LIST + awbId, (err, ids) => {
        if (err) resolve([]);
        Promise.all(ids.map(id => {
          return lredis.hgetall(PREFIX + id);
        })).then(packages => {
          resolve(packages);
        })
      })
    });
  }

  getAwbPackageOverview(awbId) {
    // get the awb packages and add everything in 
    return new Promise((resolve, reject) => {
      this.getPackages(awbId).then(packages => {
        let weight = 0;
        var pieces = packages.length;
        var description = "";
        packages.forEach(pkg => {
          weight += Number(pkg.weight);
          description = pkg.description;
        })
        resolve({ weight: weight, description: description, pieces: pieces });
      })
    })
  }

  updatePackageLocation(trackingNumber, locationId) {
    return new Promise((resolve, reject) => {
      lredis.search(PREFIX, 'trackingNo', trackingNumber).then(packages => {
        packages.forEach(pkg => pkg.location = locationId);
        resolve({ success: true });
      })
    });
  }

  createPackages(awbId, packages) {
    return new Promise((resolve, reject) => {
      Promise.all(packages.map(pkg => {
        return this.createPackage(pkg, awbId);
      })).then(result => {
        resolve({ success: true });
      })
    });
  }

  createPackage(newPackage, awbId) {
    // var cPackage = {
    //   skybox: body.skybox,
    //   customer: body.customer.replace("-", "").trim(),
    //   trackingNo: body.tracking,
    //   description: body.description,
    //   shipper: body.shipper,
    //   carrier: body.carrier,
    //   value: Number(body.value),
    //   pieces: Number(body.pieces),
    //   weight: Number(body.weight),
    //   dimensions: body.dimensions,
    //   status: 1,
    //   location: "FLL",
    //   mid: 0,
    //   awb: 0,
    // }
    return new Promise((resolve, reject) => {
      client.incr(PACKAGE_ID, (err, id) => {
        newPackage.id = id;
        newPackage.awbId = awbId;
        client.hmset(PREFIX + id, newPackage);
        client.sadd(PREFIX_PACKAGE_LIST + awbId, id);
        resolve({ success: true });
      })
    });
  }

  updatePackage(id, pkg) {
    return new Promise((resolve, reject) => {
      client.hmset(PREFIX + id, pkg);
      resolve({ success: true });
    });
  }

  removePackages(awbId) {
    return new Promise((resolve, reject) => {
      client.smembers(PREFIX_PACKAGE_LIST + awbId, (err, ids) => {
        Promise.all(ids.map(id => {
          return this.removePackage(awbId, id);
        })).then(results => {
          resolve(results);
        })
      })
    });
  }

  removePackage(awbId, id) {
    return new Promise((resolve, reject) => {
      client.del(PREFIX + id);
      client.srem(PREFIX_PACKAGE_LIST + awbId, id);
      resolve({ success: true });
    });
  }


  listNoDocsFll() {
    return new Promise((resolve, reject) => {
      awbIndex.search("@status:[1 1] @hasDocs:[0 0]", { offset: 0, numberOfResults: 5000, sortBy: 'id', sortDir: "DESC" }, (err, awbs) => {
        var awbList = [];
        Promise.all(awbs.results.map(awb => customerService.getCustomer(awb.doc.customerId))).then(customers => {
          Promise.all(awbs.results.map(awb => this.getAwbOverview(awb.doc.id))).then(details => {
            console.log("got the customers", customers, awbs)
            for (var i = 0; i < awbs.results.length; i++) {
              var awb = awbs.results[i];
              awb.doc.dateCreated = moment.unix(awb.doc.dateCreated).format("YYYY-MM-DD hh:mm A")
              //we need to get the customer 
              awb.doc.consignee = customers[i].name;
              awb.doc.weight = details[i].weight;
              awb.doc.pmb = customers[i].pmb;
              awb.doc.description = details[i].description;
              awb.doc.pieces = details[i].pieces;
              if (customers[i].pmb == '') {
                awb.doc.pmb = '9000'
              }
              console.log('pushing ', awb)
              //we need to get all the packages 
              awbList.push(awb.doc)
            }
            awbList = awbList.reverse();
            resolve({ awbs: awbList })
          })

        }).catch(err => {
          console.log(err);
        })

        //  awbs.results.forEach(awb => {


        //  });

      })
    })
  }

  listAwbinFll() {
    return new Promise((resolve, reject) => {
      awbIndex.search("@status:[1 1] @hasDocs:[1 1]", { offset: 0, numberOfResults: 5000, sortBy: 'id', sortDir: 'DESC' }, (err, awbs) => {
        var awbList = [];
        Promise.all(awbs.results.map(awb => customerService.getCustomer(awb.doc.customerId))).then(customers => {
          Promise.all(awbs.results.map(awb => this.getAwbOverview(awb.doc.id))).then(details => {
            console.log("got the customers", customers, awbs)
            for (var i = 0; i < awbs.results.length; i++) {
              var awb = awbs.results[i];
              awb.doc.dateCreated = moment.unix(awb.doc.dateCreated).format("YYYY-MM-DD hh:mm A")
              //we need to get the customer 
              awb.doc.consignee = customers[i].name;
              awb.doc.pmb = customers[i].pmb;
              awb.doc.weight = details[i].weight;
              awb.doc.description = details[i].description;
              awb.doc.pieces = details[i].pieces;
              if (customers[i].pmb == '') {
                awb.doc.pmb = '9000'
              }
              console.log('pushing ', awb)
              //we need to get all the packages 
              awbList.push(awb.doc)
            }
            resolve({ awbs: awbList })
          })

        }).catch(err => {
          console.log(err);
        })

        //  awbs.results.forEach(awb => {


        //  });

      })
    })
  }

  createConsolated(packages, username, boxSize) {
    var srv = this;
    return new Promise((resolve, reject) => {
      var awbInfo = {
        id: "",
        isSed: 0,
        hasDocs: "0",
        invoiceNumber: "",
        value: "0",
        customerId: 24197,
        shipper: "482", // we should get an id here 
        carrier: "USPS",
        hazmat: "",
        username: username

      };
      srv.saveAwb(awbInfo).then(awbResult => {
        //add 
        var cPackage = {
          id: 0,
          trackingNo: uniqId(),
          description: "Consolidated Package",
          weight: 0,
          dimensions: `${boxSize}x${boxSize}x${boxSize}`,
          awb: awbResult.id,
          isConsolidated: "1",
          created_by: username,

        };
        srv.savePackageToAwb(cPackage).then(pkgResult => {
          // get the id 
          //
          var batch = client.batch();
          var pkgBatch = client.batch();

          packages.forEach(pkg => {
            //these are barcodes 
            batch.sadd("consolidated:pkg:" + pkgResult.id, pkg)
            pkgBatch.hmget(PACKAGE_ID + getPackageIdFromBarCode(pkg), "weight")
          });
          batch.exec((err, results) => {
            //
            pkgBatch.exec((err1, results) => {
              var totalWeight = 0;
              results.forEach(weight => {
                if (isNaN(Number(weight)) == false)
                  totalWeight += Number(weight);
              });
              //we need to update the total weight of the package now 
              srv.packageIndex.update(cPackage.id, { weight: totalWeight })
            })

            resolve({ saved: true, id: pkgResult.id })
          })
        })

      })


      //validate the package 


    })
  }
  getManifestPackages() {
    return new Promise((resolve, reject) => {
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
  getReceivedPackages(page, pageSize) {
    return new Promise((resolve, reject) => {

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
  getNoDocsPackackages(page, pageSize) {
    return new Promise((resolve, reject) => {

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
  getpackagebyRedisId(id) {
    return new Promise((resolve, reject) => {
      packageIndex.getDoc(id, (err, document) => {
        resolve(document.doc);
      })
    })
  }
  getPackageById(barcode) {
    var srv = this;
    var pkgId = getPackageIdFromBarCode(barcode);
    return new Promise((resolve, reject) => {
      this.mySearch.getDoc(pkgId, (err, document) => {
        //get the awb info here as well 
        srv.getAwb(document.doc.awb).then(awbinfo => {
          srv.getShipper(awbinfo.awb.shipper).then(shipper => {
            console.log(awbinfo);
            awbinfo.awb.shipper = shipper.name;
            var response = {
              awb: awbinfo.awb,
              package: document.doc
            }
            resolve(response);
          })

        });

      })
    });
  }
  updateStoreLocation(checkin) {
    var srv = this;
    return new Promise((resolve, reject) => {
      var id = getPackageIdFromBarCode(checkin.barcode);
      packageIndex.getDoc(id, (err, pkg) => {
        pkg.doc.locationId = checkin.locationId;
        pkg.doc.location = checkin.location;
        pkg.doc.status = 5;
        packageIndex.update(id, pkg, (err, result) => {
          //we need to send the email here for the package 
          srv.getPackageByDocId(id).then(info => {
            emailService.sendAtStoreEmail(checkin.location, info);
            resolve({ updated: true });
          })

        });
      })
    })
  }
  checkOutToCustomer(barcode, user) {
    var srv = this;
    return new Promise((resolve, reject) => {
      //we want to check out set the satatus 
      var id = getPackageIdFromBarCode(barcode);
      srv.getPackageByDocId(id).then(pkg => {
        console.log(pkg, "THE PKG")
        pkg.package.status = 6 //checked out to customer 
        pkg.package.checkoutBy = user;
        packageIndex.update(pkg.package.id, pkg.package, (errm, reply) => {
          if (errm) {
            console.log(errm)
            resolve({ updated: false })
          }
          resolve({ updated: true })
        })
      })

    })
  }
  getPackageByDocId(pkgId) {
    var srv = this;
    return new Promise((resolve, reject) => {
      this.mySearch.getDoc(pkgId, (err, document) => {
        //get the awb info here as well 
        srv.getAwb(document.doc.awb).then(awbinfo => {
          console.log(awbinfo);
          var response = {
            awb: awbinfo.awb,
            package: document.doc
          }
          resolve(response);
        });

      })
    });
  }
  getManifestPackages(mid) {
    return new Promise((resolve, reject) => {
      packageIndex.search(`@mid:[${mid} ${mid}]`, { offset: 0, numberOfResults: 5000, sortBy: 'id', sortDir: "DESC" }, (err, packages1) => {
        var packages = [];
        packages1.results.forEach(pkg => {

          packages.push(pkg.doc)
        });
        Promise.all(packages.map(pkgData => this.getAwb(pkgData.awb))).then(reswithAwb => {
          for (var i = 0; i < reswithAwb.length; i++) {
            console.log("adding ", reswithAwb[i].awb);
            packages[i].awbInfo = reswithAwb[i].awb;
          }
          resolve(packages);
        })


        // Promise.all(awbs.results.map(awb=>customerService.getCustomer(awb.doc.customerId))).then(customers=>{
        //   Promise.all(awbs.results.map(awb=>this.getAwbOverview(awb.doc.id))).then(details=>{
        //    console.log("got the customers",customers, awbs)
        //    for(var i =0 ; i < awbs.results.length ; i++ ){
        //      var awb = awbs.results[i]; 
        //      awb.doc.dateCreated = moment.unix(awb.doc.dateCreated).format("YYYY-MM-DD hh:mm A")
        //      //we need to get the customer 
        //      awb.doc.consignee = customers[i].name; 
        //      awb.doc.weight = details[i].weight; 
        //      awb.doc.pmb = customers[i].pmb; 
        //      awb.doc.description = details[i].description; 
        //      awb.doc.pieces = details[i].pieces; 
        //      if (customers[i].pmb == ''){
        //        awb.doc.pmb = '9000'
        //      }
        //      console.log('pushing ',awb)
        //      //we need to get all the packages 
        //      awbList.push(awb.doc)
        //     }
        //     awbList = awbList.reverse();
        //     resolve({awbs:awbList})
        //   })

        //  }).catch(err=>{
        //    console.log(err); 
        //  })

        //  awbs.results.forEach(awb => {


        //  });

      })
    })
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
        setPackageInTransit(packages, msearch, mid).then(function (
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

      lredis.del("packages:" + trackingNo).then(function (result) {
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
            lredis.srem(element, trackingNo).then(function (rResult) {
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

      packageIndex.delDocument(PKG_IDX, id, (err, response) => {
        if (err)
          console.log(err);
        console.log(response);
        resolve({ deleted: true })
      })



    });
  }
  storePackageForPickup(trackingNo, bin) {
    var searcher = this.mySearch;
    return new Promise((resolve, reject) => {
      lredis.hmset(PACKAGE_ID + trackingNo, { status: 4, location: bin }).then((result) => {
        lredis.getPackage(trackingNo).then((pkg) => {
          addPackageToIndex(trackingNo, searcher);
          resolve(pkg);
        });
      })
    });
  }
  updatePackageIndex(tracking) {
    return new Promise((resolve, reject) => {
      var msearch = this.mySearch;
      addPackageToIndex(tracking, msearch);
      resolve({ 'updated': true });
    })
  }
  getCustomerPackages(skybox) { }


  //no more skybox
  getManifestPackagesByStatus(mid, status) {
    return new Promise((resolve, reject) => {
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
  getPackagesNasWarehouse(isNoDoc, company) {
    var srv = this;
    return new Promise((resolve, reject) => {
      packageIndex.search(`@status:[4 4] @company:${company} @hasDocs:[${isNoDoc} ${isNoDoc}]`, {}, (err, reply) => {
        console.log(reply.results);
        Promise.all(reply.results.map(pkg => srv.getPackageByDocId(pkg.docId))).then(packages => {
          resolve(packages);
        })

      })
    })
  }

  //#endregion


  //#region Manifest Package Functions 

  addToFlight(action) {
    var srv = this;
    return new Promise((resolve, reject) => {
      var packageNo = getPackageIdFromBarCode(action.barcode);
      console.log(action);
      this.mySearch.update(packageNo, { mid: action.mid, status: 2, location: "Loaded on AirCraft", compartment: action.compartment }, (err, result) => {
        if (err)
          resolve({ added: false })
        srv.getFlightCompartmentWeight(action.mid, action.compartment).then(fresult => {
          fresult.added = true;
          resolve(fresult)
        })

      })

    })
  }
  //get the compartment weight 
  getFlightCompartmentWeight(mid, compartment) {
    return new Promise((resolve, reject) => {

      this.mySearch.aggregate(`@mid:[${mid} ${mid}] @compartment:${compartment}`, {}, (err, reply) => {
        if (err)
          console.log(err);
        console.log(reply, "TOTAL SECTION Weight")
        if (reply[1]) {
          var result = reply[1];
          var compartment = result[3];
          var weight = result[5];
        }
        resolve({ compartment: compartment, weight: weight })
      })
    })
  }
  //remove from flight 
  removeFromFlight(action) {
    return new Promise((resolve, reject) => {
      var packageNo = getPackageIdFromBarCode(action.barcode);
      this.mySearch.update(packageNo, { mid: action.mid }, (err, result) => {
        if (err)
          resolve({ removed: false })

        resolve({ removed: true })
      })
    })
  }
  recFromTruck(trackingNo, username, shipmentId) {
    return new Promise((resolve, reject) => {
      client.sadd("shipment:id:" + shipmentId, trackingNo, (err, reply) => {
        client.set(REC_PKG + trackingNo, moment().unix(), (err, result) => {
          if (err) resolve({ saved: false })
          //shipment count 
          var shipmentCount = 1;
          client.scard("shipment:id:" + shipmentId, (err, card) => {
            resolve({ saved: true, pkgCount: card })
          });

        })
      })

    })
  }
  procssessPackage(pkgIfno, username) {
    var srv = this;
    return new Promise((resolve, reject) => {
      //we also need to set the warehouse location here 
      client.hmset("fees:awb:" + pkgIfno.awb, pkgIfno, (err, result) => {
        if (err)
          console.log(err);



        console.log(result);
        console.log("print:fees:" + username, username);
        client.publish("print:fees:" + username, pkgIfno.awb);

        srv.getPackageById(pkgIfno.barcode).then(pkg => {
          emailService.sendNoDocsEmail(pkg)
          if (pkgIfno.refLoc) {
            pkg.package.wloc = pkgIfno.refLoc;

            pkg.package.hasDocs = pkgIfno.hasDocs;
            pkg.package.status = 4;

            //set theompany 
            if (Number(pkg.awb.customer.pmb) > 9000) {
              pkg.package.company = "0"
            }
            else
              pkg.package.company = "1"
            console.log('updating with ', pkg.package)

            packageIndex.update(pkg.package.id, pkg.package, (errResp, response) => {

              if (errResp)
                console.log(errResp)
            })
          }

        })
        resolve({ sent: true })
      })
    })
  }
  recFromPlaneNas(barcode) {
    return new Promise((resolve, reject) => {
      var srv = this;
      var pkgId = getPackageIdFromBarCode(barcode);
      srv.mySearch.getDoc(pkgId, (err, pkg) => {
        pkg.doc.status = 4;
        pkg.doc.location = "Warehouse NAS";
        if (pkg.doc.hasDocs == "undefined")
          pkg.doc.hasDocs = 0;
        srv.mySearch.update(pkgId, pkg.doc, (err, updateResult) => {

          if (err) {
            console.log(err)
            reject({ updated: false })
          }
          resolve({ updated: true })
        })
      })
    })
  }

  //#endregion
}

function getPackageIdFromBarCode(barCodeValue) {
  var parts = barCodeValue.split("-");
  if (parts.length == 3)
    if (typeof parts[2] != "undefined")
      return parts[2].trim();
  return ""
}

module.exports = PackageService;