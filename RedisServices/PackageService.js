"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.PackageService = undefined;

var _createClass = function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; }();

var _os = require("os");

var _dns = require("dns");

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

function _defineProperty(obj, key, value) { if (key in obj) { Object.defineProperty(obj, key, { value: value, enumerable: true, configurable: true, writable: true }); } else { obj[key] = value; } return obj; }

var emailService = require("../Util/EmailService");
var redis = require("redis");
var lredis = require("./redis-local");
var moment = require("moment");
var redisSearch = require("../redisearchclient");
var fs = require("fs");
var moment = require('moment');
var PackageUtil = require("../Util/packageutil").PackageUtility;
var packageUtil = new PackageUtil();
var PKG_IDX = "index:packages";
var PKG_ID_COUNTER = "package:id";
var dataContext = require('./dataContext');
var PKG_PREFIX = "packages:";
var AWB_ID = "awb:id";
var INDEX_AWB = "index:awb";
var REC_PKG = "pkg:rec:";
var uniqId = require("uniqid");
var CustomerService = require('./CustomerService').CustomerService;
var customerService = new CustomerService();
var PKG_STATUS = {
  1: "Received",
  2: "Loaded on AirCraft",
  3: "In Transit",
  4: "Recieved in NAS",
  5: "Ready for Pickup / Delivery",
  6: "Delivered"

};
var INDEX_SHIPPER = "index:shipper";
redis.addCommand("ft.aggregate");
var awbIndex = redisSearch(redis, INDEX_AWB, {
  clientOptions: lredis.searchClientDetails
});
var packageIndex = redisSearch(redis, PKG_IDX, {
  clientOptions: lredis.searchClientDetails
});
var shipperIndex = redisSearch(redis, INDEX_SHIPPER, {
  clientOptions: lredis.searchClientDetails
});
function getPackageVolumne(mPackage) {

  return 0;
}
function createDocument(tPackage) {
  var _packageDocument;

  var packageDocument = (_packageDocument = {
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
    status: tPackage.status
  }, _defineProperty(_packageDocument, "mid", tPackage.mid), _defineProperty(_packageDocument, "value", tPackage.value), _packageDocument);
  console.log("about to add the package to the index");
  return packageDocument;
}
function setPackageInTransit(keys, msearcher) {
  return new Promise(function (resolve, reject) {
    var batcher = msearcher.client.batch();
    keys.forEach(function (element) {
      var value = {
        status: 2,
        location: "In Transit"
      };
      console.log(element + "is the element");

      batcher.hmset(PKG_PREFIX + element, value);
    });
    batcher.exec(function (err, result) {
      console.log(result);
      //readd the documents here
      keys.forEach(function (element) {
        addPackageToIndex(element, msearcher);
      });
      resolve(result);
    });
  });
}

function addPackageToIndex(trackingNo, msearcher) {
  lredis.getPackage(trackingNo).then(function (pack) {
    msearcher.delDocument(PKG_IDX, pack.mid + "-" + trackingNo, function (err, done) {
      var document = createDocument(pack);
      console.log("readding package to the index like a boss " + trackingNo);
      msearcher.add(pack.mid + "-" + pack.trackingNo, document);
    });
  });
}

var PackageService = exports.PackageService = function () {
  function PackageService() {
    _classCallCheck(this, PackageService);

    this.setupIndex();
  }

  _createClass(PackageService, [{
    key: "setupIndex",
    value: function setupIndex() {
      this.mySearch = redisSearch(redis, PKG_IDX, {
        clientOptions: lredis.searchClientDetails
      });
    }
  }, {
    key: "getNewAwb",
    value: function getNewAwb() {
      return new Promise(function (resolve, reject) {
        dataContext.redisClient.exists(AWB_ID, function (err, result) {
          console.log(result);
          if (result != "1") {
            dataContext.redisClient.set(AWB_ID == 100000, function (err, initResult) {
              dataContext.redisClient.incr(AWB_ID, function (err, newId) {
                resolve({ awb: newId });
              });
            });
          } else {
            dataContext.redisClient.incr(AWB_ID, function (err, newId) {
              resolve({ awb: newId });
            });
          }
        });
      });
    }
  }, {
    key: "saveAwb",
    value: function saveAwb(awb) {
      return new Promise(function (resolve, reject) {
        console.log('saving...', awb, moment().toString("hh:mm:ss"));
        if (awb.id != "") {
          awb.updated_by = awb.username;
          awb.date_updated = moment().unix();
          awbIndex.update(awb.id, awb, function (err1, awbRes) {
            if (err1) {
              console.log('saving err', err1);
              resolve({ saved: false });
            }
            resolve({ saved: true, id: awb.id });
          });
        } else {
          dataContext.redisClient.incr(AWB_ID, function (err, reply) {
            awb.id = reply;
            awb.status = 1;
            if (awb.invoice) {
              awb.hasDocs = 1;
              console.log("HAS DOCCCCC");
            } else {
              awb.hasDocs = 0;
              console.log("HAS NO DOCCCCC");
            }

            awb.created_by = awb.username;
            delete awb.username;
            awb.dateCreated = moment().unix();
            awbIndex.add(awb.id, awb, function (err1, awbRes) {
              if (err1) {
                console.log('saving err', err1);
                resolve({ saved: false });
              }
              resolve({ saved: true, id: reply });
            });
          });
        }
      });
    }
  }, {
    key: "getAwbOverview",
    value: function getAwbOverview(id) {
      // get the awb packages and add everything in 
      return new Promise(function (resolve, reject) {
        packageIndex.search("@awb:[" + id + " " + id + "]", { numberOfResults: 5000, offset: 0, sortBy: 'pkgNo' }, function (err, packages) {
          var weight = 0;
          var pieces = packages.totalResults;
          var description = "";
          packages.results.forEach(function (package1) {
            if (description == "") description = package1.doc.description;
            weight += Number(package1.doc.weight);
          });
          var data = { weight: weight, description: description, pieces: pieces };
          console.log(data, "AWB DETAILS");
          resolve(data);
        });
      });
    }
  }, {
    key: "getAwbDetails",
    value: function getAwbDetails(id) {
      var srv = this;
      return new Promise(function (resolve, reject) {
        console.log("@awb:[" + id + " " + id + "]");

        packageIndex.search("@awb:[" + id + " " + id + "]", { numberOfResults: 5000, offset: 0, sortBy: "pkgNo" }, function (err, packages) {
          if (err) console.log(err);

          var packagelist = [];
          var count = 1;
          packages.results.forEach(function (package1) {

            if (package1.doc.trackingNo.length > 7) {
              //only display the last 7 
              package1.doc.trackingNo = package1.doc.trackingNo.substring(package1.doc.trackingNo.length - 7);
            }
            package1.doc.packageIndex = count;
            count++;
            packagelist.push(package1.doc);
          });

          resolve(packagelist);
        });
      });
    }
  }, {
    key: "listNoDocsFll",
    value: function listNoDocsFll() {
      var _this = this;

      return new Promise(function (resolve, reject) {
        awbIndex.search("@status:[1 1] @hasDocs:[0 0]", { offset: 0, numberOfResults: 5000, sortBy: 'id', sortDir: "DESC" }, function (err, awbs) {
          var awbList = [];
          Promise.all(awbs.results.map(function (awb) {
            return customerService.getCustomer(awb.doc.customerId);
          })).then(function (customers) {
            Promise.all(awbs.results.map(function (awb) {
              return _this.getAwbOverview(awb.doc.id);
            })).then(function (details) {
              console.log("got the customers", customers, awbs);
              for (var i = 0; i < awbs.results.length; i++) {
                var awb = awbs.results[i];
                awb.doc.dateCreated = moment.unix(awb.doc.dateCreated).format("YYYY-MM-DD hh:mm A");
                //we need to get the customer 
                awb.doc.consignee = customers[i].name;
                awb.doc.weight = details[i].weight;
                awb.doc.pmb = customers[i].pmb;
                awb.doc.description = details[i].description;
                awb.doc.pieces = details[i].pieces;
                if (customers[i].pmb == '') {
                  awb.doc.pmb = '9000';
                }
                console.log('pushing ', awb);
                //we need to get all the packages 
                awbList.push(awb.doc);
              }
              awbList = awbList.reverse();
              resolve({ awbs: awbList });
            });
          }).catch(function (err) {
            console.log(err);
          });

          //  awbs.results.forEach(awb => {


          //  });
        });
      });
    }
  }, {
    key: "listAwbinFll",
    value: function listAwbinFll() {
      var _this2 = this;

      return new Promise(function (resolve, reject) {
        awbIndex.search("@status:[1 1] @hasDocs:[1 1]", { offset: 0, numberOfResults: 5000, sortBy: 'id', sortDir: 'DESC' }, function (err, awbs) {
          var awbList = [];
          Promise.all(awbs.results.map(function (awb) {
            return customerService.getCustomer(awb.doc.customerId);
          })).then(function (customers) {
            Promise.all(awbs.results.map(function (awb) {
              return _this2.getAwbOverview(awb.doc.id);
            })).then(function (details) {
              console.log("got the customers", customers, awbs);
              for (var i = 0; i < awbs.results.length; i++) {
                var awb = awbs.results[i];
                awb.doc.dateCreated = moment.unix(awb.doc.dateCreated).format("YYYY-MM-DD hh:mm A");
                //we need to get the customer 
                awb.doc.consignee = customers[i].name;
                awb.doc.pmb = customers[i].pmb;
                awb.doc.weight = details[i].weight;
                awb.doc.description = details[i].description;
                awb.doc.pieces = details[i].pieces;
                if (customers[i].pmb == '') {
                  awb.doc.pmb = '9000';
                }
                console.log('pushing ', awb);
                //we need to get all the packages 
                awbList.push(awb.doc);
              }
              resolve({ awbs: awbList });
            });
          }).catch(function (err) {
            console.log(err);
          });

          //  awbs.results.forEach(awb => {


          //  });
        });
      });
    }
  }, {
    key: "getAwb",
    value: function getAwb(id) {
      var srv = this;
      return new Promise(function (resolve, reject) {
        awbIndex.getDoc(id, function (err, awb) {
          //get the customer 
          customerService.getCustomer(awb.doc.customerId).then(function (customer) {
            awb.doc.customer = customer;
            srv.getAwbDetails(id).then(function (packages) {
              //get the packages for the awb 
              awb.doc.packages = packages;
              resolve({ awb: awb.doc });
            });
          });
        });
      });
    }
  }, {
    key: "updateLocation",
    value: function updateLocation(trackingNumber, location_id) {
      return new Promise(function (resolve, reject) {
        packageIndex.search("@trackingNo:" + trackingNumber, { location: location_id }, function (err, packageResult) {});
      });
    }
  }, {
    key: "savePackageToAwb",
    value: function savePackageToAwb(newPackage) {
      return new Promise(function (resolve, result) {
        if (newPackage.id != "0") {
          packageIndex.update(newPackage.id, newPackage, function (err, result) {
            if (err) console.log(err);
            resolve({ saved: true, id: newPackage.id });
          });
        } else {
          dataContext.redisClient.incr(PKG_ID_COUNTER, function (err, id) {
            newPackage.id = id;
            packageIndex.add(id, newPackage, function (err, result) {
              if (err) console.log(err);
              resolve({ saved: true, id: id });
            });
          });
        }
      });
    }
  }, {
    key: "getShipper",
    value: function getShipper(id) {
      return new Promise(function (resolve, reject) {
        shipperIndex.getDoc(id, function (err, sresult) {
          if (err) resolve(id);

          resolve(sresult.doc);
        });
      });
    }
  }, {
    key: "createConsolated",
    value: function createConsolated(packages, username, boxSize) {
      var srv = this;
      return new Promise(function (resolve, reject) {
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
        srv.saveAwb(awbInfo).then(function (awbResult) {
          //add 
          var cPackage = {
            id: 0,
            trackingNo: uniqId(),
            description: "Consolidated Package",
            weight: 0,
            dimensions: boxSize + "x" + boxSize + "x" + boxSize,
            awb: awbResult.id,
            isConsolidated: "1",
            created_by: username

          };
          srv.savePackageToAwb(cPackage).then(function (pkgResult) {
            // get the id 
            //
            var batch = dataContext.redisClient.batch();
            var pkgBatch = dataContext.redisClient.batch();

            packages.forEach(function (pkg) {
              //these are barcodes 
              batch.sadd("consolidated:pkg:" + pkgResult.id, pkg);
              pkgBatch.hmget(PKG_PREFIX + getPackageIdFromBarCode(pkg), "weight");
            });
            batch.exec(function (err, results) {
              //
              pkgBatch.exec(function (err1, results) {
                var totalWeight = 0;
                results.forEach(function (weight) {
                  if (isNaN(Number(weight)) == false) totalWeight += Number(weight);
                });
                //we need to update the total weight of the package now 
                srv.packageIndex.update(cPackage.id, { weight: totalWeight });
              });

              resolve({ saved: true, id: pkgResult.id });
            });
          });
        });

        //validate the package 

      });
    }
  }, {
    key: "savePackage",
    value: function savePackage(body) {
      return new Promise(function (resolve, reject) {
        var cPackage = {

          skybox: body.skybox,
          customer: body.customer.replace("-", "").trim(),
          trackingNo: body.tracking,
          description: body.description,
          shipper: body.shipper,
          carrier: body.carrier,
          value: Number(body.value),
          pieces: Number(body.pieces),
          weight: Number(body.weight),
          dimensions: body.dimensions,
          status: 1,
          location: "FLL",
          mid: 0,
          awb: 0
          //hasOpt: true,
          //mtype: body.mtype
        };
        //validate the package 
        dataContext.redisClient.incr(PKG_ID_COUNTER, function (err, id) {
          cPackage.id = id;
          dataContext.redisClient.set(PKG_PREFIX + id, cPackage, function (err, response) {
            if (err) {
              reject({ saved: false, err: err });
            }
            var indexPackage = createDocument(cPackage);
            console.log(indexPackage);
            packageIndex.add(cPackage.id, indexPackage, function (err1, docResult) {
              console.log(docResult);
              if (err1) {
                reject({ saved: false, err: err1 });
              }
              resolve({ saved: true });
            });
          });
        });
      });
    }
  }, {
    key: "getManifestPackages",
    value: function getManifestPackages() {
      var _this3 = this;

      return new Promise(function (resolve, reject) {

        _this3.mySearch.search("@mid:[0 0]", { offset: 0, numberOfResults: 5000 }, function (err, data) {
          var packages = [];
          console.log(data);
          data.results.forEach(function (element) {

            packages.push(element.doc);
            resolve(packages);
          });
        });
      });
    }
  }, {
    key: "getReceivedPackages",
    value: function getReceivedPackages(page, pageSize) {
      var _this4 = this;

      return new Promise(function (resolve, reject) {

        _this4.mySearch.search("@mid:[0 0]", { offset: 0, numberOfResults: 5000 }, function (err, data) {
          var packages = [];
          console.log(data);
          data.results.forEach(function (element) {

            packages.push(element.doc);
          });
          resolve(packages);
        });
      });
    }
  }, {
    key: "getNoDocsPackackages",
    value: function getNoDocsPackackages(page, pageSize) {
      var _this5 = this;

      return new Promise(function (resolve, reject) {

        _this5.mySearch.search("@hasDocs:[0 0]", { offset: 0, numberOfResults: 5000 }, function (err, data) {
          var packages = [];
          console.log(data);
          data.results.forEach(function (element) {

            packages.push(element.doc);
          });
          resolve(packages);
        });
      });
    }
  }, {
    key: "getpackagebyRedisId",
    value: function getpackagebyRedisId(id) {
      return new Promise(function (resolve, reject) {
        packageIndex.getDoc(id, function (err, document) {
          resolve(document.doc);
        });
      });
    }
  }, {
    key: "getPackageById",
    value: function getPackageById(barcode) {
      var _this6 = this;

      var srv = this;
      var pkgId = getPackageIdFromBarCode(barcode);
      return new Promise(function (resolve, reject) {
        _this6.mySearch.getDoc(pkgId, function (err, document) {
          //get the awb info here as well 
          srv.getAwb(document.doc.awb).then(function (awbinfo) {
            srv.getShipper(awbinfo.awb.shipper).then(function (shipper) {
              console.log(awbinfo);
              awbinfo.awb.shipper = shipper.name;
              var response = {
                awb: awbinfo.awb,
                package: document.doc
              };
              resolve(response);
            });
          });
        });
      });
    }
  }, {
    key: "updateStoreLocation",
    value: function updateStoreLocation(checkin) {
      var srv = this;
      return new Promise(function (resolve, reject) {
        var id = getPackageIdFromBarCode(checkin.barcode);
        packageIndex.getDoc(id, function (err, pkg) {
          pkg.doc.locationId = checkin.locationId;
          pkg.doc.location = checkin.location;
          pkg.doc.status = 5;
          packageIndex.update(id, pkg, function (err, result) {
            //we need to send the email here for the package 
            srv.getPackageByDocId(id).then(function (info) {
              emailService.sendAtStoreEmail(checkin.location, info);
              resolve({ updated: true });
            });
          });
        });
      });
    }
  }, {
    key: "checkOutToCustomer",
    value: function checkOutToCustomer(barcode, user) {
      var srv = this;
      return new Promise(function (resolve, reject) {
        //we want to check out set the satatus 
        var id = getPackageIdFromBarCode(barcode);
        srv.getPackageByDocId(id).then(function (pkg) {
          console.log(pkg, "THE PKG");
          pkg.package.status = 6; //checked out to customer 
          pkg.package.checkoutBy = user;
          packageIndex.update(pkg.package.id, pkg.package, function (errm, reply) {
            if (errm) {
              console.log(errm);
              resolve({ updated: false });
            }
            resolve({ updated: true });
          });
        });
      });
    }
  }, {
    key: "getPackageByDocId",
    value: function getPackageByDocId(pkgId) {
      var _this7 = this;

      var srv = this;
      return new Promise(function (resolve, reject) {
        _this7.mySearch.getDoc(pkgId, function (err, document) {
          //get the awb info here as well 
          srv.getAwb(document.doc.awb).then(function (awbinfo) {
            console.log(awbinfo);
            var response = {
              awb: awbinfo.awb,
              package: document.doc
            };
            resolve(response);
          });
        });
      });
    }
  }, {
    key: "getManifestPackages",
    value: function getManifestPackages(mid) {
      var _this8 = this;

      return new Promise(function (resolve, reject) {
        packageIndex.search("@mid:[" + mid + " " + mid + "]", { offset: 0, numberOfResults: 5000, sortBy: 'id', sortDir: "DESC" }, function (err, packages1) {
          var packages = [];
          packages1.results.forEach(function (pkg) {

            packages.push(pkg.doc);
          });
          Promise.all(packages.map(function (pkgData) {
            return _this8.getAwb(pkgData.awb);
          })).then(function (reswithAwb) {
            for (var i = 0; i < reswithAwb.length; i++) {
              console.log("adding ", reswithAwb[i].awb);
              packages[i].awbInfo = reswithAwb[i].awb;
            }
            resolve(packages);
          });

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
        });
      });
    }
    //using this 


  }, {
    key: "updateManifestPackageToInTransit",
    value: function updateManifestPackageToInTransit(mid) {
      //get all the packages
      //we need to update the index at this point as well
      var msearch = this.mySearch;
      this.mySearch.search("@mid:[" + mid + " " + mid + "]", { offset: 0, numberOfResults: 5000 }, function (err, data) {
        var packages = [];
        console.log(data);
        data.results.forEach(function (element) {
          var oldDocId = element.docId;
          element.docId = element.docId.replace(mid + "-", "");
          packages.push(element.docId);
          // i could delete here
          // msearch.delDocument(PKG_IDX,oldDocId)
          //update all the packages
        });
        setPackageInTransit(packages, msearch, mid).then(function (updatedPackages) {
          console.log("updated packages");
          console.log(updatedPackages);
        });
      });
    }
  }, {
    key: "removePackageFromManifest",
    value: function removePackageFromManifest(packageId, mid) {
      var msearch = this.mySearch;
      return new Promise(function (resolve, reject) {
        var manifest = mid;
        var manifestKey = "manifest:" + manifest + ":*";

        lredis.del("packages:" + trackingNo).then(function (result) {
          console.log(result);
          msearch.delDocument(PKG_IDX, mid + "-" + trackingNo);
          //we need to remove from the index and dec the counter
          lredis.client.decr("mcounter:" + mid);
          //rServices.packageService.rmPackage(mid, trackingNo);
          lredis.getKeys(manifestKey).then(function (kResult) {
            //the list of all the sets ...we need to remove the key from each one
            var keysCount = 0;

            kResult.forEach(function (element) {
              console.log("removing " + trackingNo + " package manifest set " + element + " ");
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
  }, {
    key: "removePackageById",
    value: function removePackageById(id) {
      var msearch = this.mySearch;
      return new Promise(function (resolve, reject) {

        packageIndex.delDocument(PKG_IDX, id, function (err, response) {
          if (err) console.log(err);
          console.log(response);
          resolve({ deleted: true });
        });
      });
    }
  }, {
    key: "storePackageForPickup",
    value: function storePackageForPickup(trackingNo, bin) {
      var searcher = this.mySearch;
      return new Promise(function (resolve, reject) {
        lredis.hmset(PKG_PREFIX + trackingNo, { status: 4, location: bin }).then(function (result) {
          lredis.getPackage(trackingNo).then(function (pkg) {
            addPackageToIndex(trackingNo, searcher);
            resolve(pkg);
          });
        });
      });
    }
  }, {
    key: "updatePackageIndex",
    value: function updatePackageIndex(tracking) {
      var _this9 = this;

      return new Promise(function (resolve, reject) {
        var msearch = _this9.mySearch;
        addPackageToIndex(tracking, msearch);
        resolve({ 'updated': true });
      });
    }
  }, {
    key: "getCustomerPackages",
    value: function getCustomerPackages(skybox) {}

    //no more skybox

  }, {
    key: "getManifestPackagesByStatus",
    value: function getManifestPackagesByStatus(mid, status) {
      var _this10 = this;

      return new Promise(function (resolve, reject) {
        console.log("@mid:[" + mid + " " + mid + "]");
        _this10.mySearch.search("@mid:[" + mid + " " + mid + "]", { offset: 0, numberOfResults: 5000 }, function (err, data) {
          var packages = [];
          console.log(data);
          data.results.forEach(function (element) {

            packages.push(element.doc);
            resolve(packages);
          });
        });
      });
    }

    //#region Pakcage Filters  

  }, {
    key: "getPackagesNasWarehouse",
    value: function getPackagesNasWarehouse(isNoDoc, company) {
      var srv = this;
      return new Promise(function (resolve, reject) {
        packageIndex.search("@status:[4 4] @company:" + company + " @hasDocs:[" + isNoDoc + " " + isNoDoc + "]", {}, function (err, reply) {
          console.log(reply.results);
          Promise.all(reply.results.map(function (pkg) {
            return srv.getPackageByDocId(pkg.docId);
          })).then(function (packages) {
            resolve(packages);
          });
        });
      });
    }

    //#endregion


    //#region Manifest Package Functions 

  }, {
    key: "addToFlight",
    value: function addToFlight(action) {
      var _this11 = this;

      var srv = this;
      return new Promise(function (resolve, reject) {
        var packageNo = getPackageIdFromBarCode(action.barcode);
        console.log(action);
        _this11.mySearch.update(packageNo, { mid: action.mid, status: 2, location: "Loaded on AirCraft", compartment: action.compartment }, function (err, result) {
          if (err) resolve({ added: false });
          srv.getFlightCompartmentWeight(action.mid, action.compartment).then(function (fresult) {
            fresult.added = true;
            resolve(fresult);
          });
        });
      });
    }
    //get the compartment weight 

  }, {
    key: "getFlightCompartmentWeight",
    value: function getFlightCompartmentWeight(mid, compartment) {
      var _this12 = this;

      return new Promise(function (resolve, reject) {

        _this12.mySearch.aggregate("@mid:[" + mid + " " + mid + "] @compartment:" + compartment, {}, function (err, reply) {
          if (err) console.log(err);
          console.log(reply, "TOTAL SECTION Weight");
          if (reply[1]) {
            var result = reply[1];
            var compartment = result[3];
            var weight = result[5];
          }
          resolve({ compartment: compartment, weight: weight });
        });
      });
    }
    //remove from flight 

  }, {
    key: "removeFromFlight",
    value: function removeFromFlight(action) {
      var _this13 = this;

      return new Promise(function (resolve, reject) {
        var packageNo = getPackageIdFromBarCode(action.barcode);
        _this13.mySearch.update(packageNo, { mid: action.mid }, function (err, result) {
          if (err) resolve({ removed: false });

          resolve({ removed: true });
        });
      });
    }
  }, {
    key: "recFromTruck",
    value: function recFromTruck(trackingNo, username, shipmentId) {
      return new Promise(function (resolve, reject) {
        dataContext.redisClient.sadd("shipment:id:" + shipmentId, trackingNo, function (err, reply) {
          dataContext.redisClient.set(REC_PKG + trackingNo, moment().unix(), function (err, result) {
            if (err) resolve({ saved: false });
            //shipment count 
            var shipmentCount = 1;
            dataContext.redisClient.scard("shipment:id:" + shipmentId, function (err, card) {
              resolve({ saved: true, pkgCount: card });
            });
          });
        });
      });
    }
  }, {
    key: "procssessPackage",
    value: function procssessPackage(pkgIfno, username) {
      var srv = this;
      return new Promise(function (resolve, reject) {
        //we also need to set the warehouse location here 
        dataContext.redisClient.hmset("fees:awb:" + pkgIfno.awb, pkgIfno, function (err, result) {
          if (err) console.log(err);

          console.log(result);
          console.log("print:fees:" + username, username);
          dataContext.redisClient.publish("print:fees:" + username, pkgIfno.awb);

          srv.getPackageById(pkgIfno.barcode).then(function (pkg) {
            emailService.sendNoDocsEmail(pkg);
            if (pkgIfno.refLoc) {
              pkg.package.wloc = pkgIfno.refLoc;

              pkg.package.hasDocs = pkgIfno.hasDocs;
              pkg.package.status = 4;

              //set theompany 
              if (Number(pkg.awb.customer.pmb) > 9000) {
                pkg.package.company = "0";
              } else pkg.package.company = "1";
              console.log('updating with ', pkg.package);

              packageIndex.update(pkg.package.id, pkg.package, function (errResp, response) {

                if (errResp) console.log(errResp);
              });
            }
          });
          resolve({ sent: true });
        });
      });
    }
  }, {
    key: "recFromPlaneNas",
    value: function recFromPlaneNas(barcode) {
      var _this14 = this;

      return new Promise(function (resolve, reject) {
        var srv = _this14;
        var pkgId = getPackageIdFromBarCode(barcode);
        srv.mySearch.getDoc(pkgId, function (err, pkg) {
          pkg.doc.status = 4;
          pkg.doc.location = "Warehouse NAS";
          if (pkg.doc.hasDocs == "undefined") pkg.doc.hasDocs = 0;
          srv.mySearch.update(pkgId, pkg.doc, function (err, updateResult) {

            if (err) {
              console.log(err);
              reject({ updated: false });
            }
            resolve({ updated: true });
          });
        });
      });
    }

    //#endregion

  }]);

  return PackageService;
}();

function getPackageIdFromBarCode(barCodeValue) {
  var parts = barCodeValue.split("-");
  if (parts.length == 3) if (typeof parts[2] != "undefined") return parts[2].trim();
  return "";
}
//# sourceMappingURL=data:application/json;charset=utf8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIlJlZGlzU2VydmljZXMvUGFja2FnZVNlcnZpY2UuZXM2Il0sIm5hbWVzIjpbImVtYWlsU2VydmljZSIsInJlcXVpcmUiLCJyZWRpcyIsImxyZWRpcyIsIm1vbWVudCIsInJlZGlzU2VhcmNoIiwiZnMiLCJQYWNrYWdlVXRpbCIsIlBhY2thZ2VVdGlsaXR5IiwicGFja2FnZVV0aWwiLCJQS0dfSURYIiwiUEtHX0lEX0NPVU5URVIiLCJkYXRhQ29udGV4dCIsIlBLR19QUkVGSVgiLCJBV0JfSUQiLCJJTkRFWF9BV0IiLCJSRUNfUEtHIiwidW5pcUlkIiwiQ3VzdG9tZXJTZXJ2aWNlIiwiY3VzdG9tZXJTZXJ2aWNlIiwiUEtHX1NUQVRVUyIsIklOREVYX1NISVBQRVIiLCJhZGRDb21tYW5kIiwiYXdiSW5kZXgiLCJjbGllbnRPcHRpb25zIiwic2VhcmNoQ2xpZW50RGV0YWlscyIsInBhY2thZ2VJbmRleCIsInNoaXBwZXJJbmRleCIsImdldFBhY2thZ2VWb2x1bW5lIiwibVBhY2thZ2UiLCJjcmVhdGVEb2N1bWVudCIsInRQYWNrYWdlIiwicGFja2FnZURvY3VtZW50IiwiaWQiLCJ0cmFja2luZ05vIiwic2t5Ym94IiwiZGF0ZVJlY2lldmVkIiwidW5peCIsImF3YiIsIm1pZCIsInZvbHVtZSIsIndlaWdodCIsInBpZWNlcyIsImN1c3RvbWVyIiwic2hpcHBlciIsImRlc2NyaXB0aW9uIiwiZGltZW5zaW9ucyIsImNhcnJpZXIiLCJzdGF0dXMiLCJ2YWx1ZSIsImNvbnNvbGUiLCJsb2ciLCJzZXRQYWNrYWdlSW5UcmFuc2l0Iiwia2V5cyIsIm1zZWFyY2hlciIsIlByb21pc2UiLCJyZXNvbHZlIiwicmVqZWN0IiwiYmF0Y2hlciIsImNsaWVudCIsImJhdGNoIiwiZm9yRWFjaCIsImxvY2F0aW9uIiwiZWxlbWVudCIsImhtc2V0IiwiZXhlYyIsImVyciIsInJlc3VsdCIsImFkZFBhY2thZ2VUb0luZGV4IiwiZ2V0UGFja2FnZSIsInRoZW4iLCJkZWxEb2N1bWVudCIsInBhY2siLCJkb25lIiwiZG9jdW1lbnQiLCJhZGQiLCJQYWNrYWdlU2VydmljZSIsInNldHVwSW5kZXgiLCJteVNlYXJjaCIsInJlZGlzQ2xpZW50IiwiZXhpc3RzIiwic2V0IiwiaW5pdFJlc3VsdCIsImluY3IiLCJuZXdJZCIsInRvU3RyaW5nIiwidXBkYXRlZF9ieSIsInVzZXJuYW1lIiwiZGF0ZV91cGRhdGVkIiwidXBkYXRlIiwiZXJyMSIsImF3YlJlcyIsInNhdmVkIiwicmVwbHkiLCJpbnZvaWNlIiwiaGFzRG9jcyIsImNyZWF0ZWRfYnkiLCJkYXRlQ3JlYXRlZCIsInNlYXJjaCIsIm51bWJlck9mUmVzdWx0cyIsIm9mZnNldCIsInNvcnRCeSIsInBhY2thZ2VzIiwidG90YWxSZXN1bHRzIiwicmVzdWx0cyIsInBhY2thZ2UxIiwiZG9jIiwiTnVtYmVyIiwiZGF0YSIsInNydiIsInBhY2thZ2VsaXN0IiwiY291bnQiLCJsZW5ndGgiLCJzdWJzdHJpbmciLCJwdXNoIiwic29ydERpciIsImF3YnMiLCJhd2JMaXN0IiwiYWxsIiwibWFwIiwiZ2V0Q3VzdG9tZXIiLCJjdXN0b21lcklkIiwiZ2V0QXdiT3ZlcnZpZXciLCJjdXN0b21lcnMiLCJpIiwiZm9ybWF0IiwiY29uc2lnbmVlIiwibmFtZSIsImRldGFpbHMiLCJwbWIiLCJyZXZlcnNlIiwiY2F0Y2giLCJnZXREb2MiLCJnZXRBd2JEZXRhaWxzIiwidHJhY2tpbmdOdW1iZXIiLCJsb2NhdGlvbl9pZCIsInBhY2thZ2VSZXN1bHQiLCJuZXdQYWNrYWdlIiwic3Jlc3VsdCIsImJveFNpemUiLCJhd2JJbmZvIiwiaXNTZWQiLCJpbnZvaWNlTnVtYmVyIiwiaGF6bWF0Iiwic2F2ZUF3YiIsImNQYWNrYWdlIiwiYXdiUmVzdWx0IiwiaXNDb25zb2xpZGF0ZWQiLCJzYXZlUGFja2FnZVRvQXdiIiwicGtnQmF0Y2giLCJzYWRkIiwicGtnUmVzdWx0IiwicGtnIiwiaG1nZXQiLCJnZXRQYWNrYWdlSWRGcm9tQmFyQ29kZSIsInRvdGFsV2VpZ2h0IiwiaXNOYU4iLCJib2R5IiwicmVwbGFjZSIsInRyaW0iLCJ0cmFja2luZyIsInJlc3BvbnNlIiwiaW5kZXhQYWNrYWdlIiwiZG9jUmVzdWx0IiwicGFnZSIsInBhZ2VTaXplIiwiYmFyY29kZSIsInBrZ0lkIiwiZ2V0QXdiIiwiZ2V0U2hpcHBlciIsImF3YmluZm8iLCJwYWNrYWdlIiwiY2hlY2tpbiIsImxvY2F0aW9uSWQiLCJnZXRQYWNrYWdlQnlEb2NJZCIsInNlbmRBdFN0b3JlRW1haWwiLCJpbmZvIiwidXBkYXRlZCIsInVzZXIiLCJjaGVja291dEJ5IiwiZXJybSIsInBhY2thZ2VzMSIsInBrZ0RhdGEiLCJyZXN3aXRoQXdiIiwibXNlYXJjaCIsIm9sZERvY0lkIiwiZG9jSWQiLCJ1cGRhdGVkUGFja2FnZXMiLCJwYWNrYWdlSWQiLCJtYW5pZmVzdCIsIm1hbmlmZXN0S2V5IiwiZGVsIiwiZGVjciIsImdldEtleXMiLCJrZXlzQ291bnQiLCJrUmVzdWx0Iiwic3JlbSIsInJSZXN1bHQiLCJkZWxldGVkIiwiYmluIiwic2VhcmNoZXIiLCJpc05vRG9jIiwiY29tcGFueSIsImFjdGlvbiIsInBhY2thZ2VObyIsImNvbXBhcnRtZW50IiwiYWRkZWQiLCJnZXRGbGlnaHRDb21wYXJ0bWVudFdlaWdodCIsImZyZXN1bHQiLCJhZ2dyZWdhdGUiLCJyZW1vdmVkIiwic2hpcG1lbnRJZCIsInNoaXBtZW50Q291bnQiLCJzY2FyZCIsImNhcmQiLCJwa2dDb3VudCIsInBrZ0lmbm8iLCJwdWJsaXNoIiwiZ2V0UGFja2FnZUJ5SWQiLCJzZW5kTm9Eb2NzRW1haWwiLCJyZWZMb2MiLCJ3bG9jIiwiZXJyUmVzcCIsInNlbnQiLCJ1cGRhdGVSZXN1bHQiLCJiYXJDb2RlVmFsdWUiLCJwYXJ0cyIsInNwbGl0Il0sIm1hcHBpbmdzIjoiOzs7Ozs7Ozs7QUFBQTs7QUFDQTs7Ozs7O0FBRUEsSUFBSUEsZUFBZUMsUUFBUSxzQkFBUixDQUFuQjtBQUNBLElBQUlDLFFBQVFELFFBQVEsT0FBUixDQUFaO0FBQ0EsSUFB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QUN5SCxTQUFRLElBQVQsRUFBUjtBQUNELFdBUkQ7QUFTSCxTQWREO0FBZUYsT0FsQk0sQ0FBUDtBQW1CRDs7QUFFRDs7Ozs7OztBQUdILFNBQVN2Qix1QkFBVCxDQUFpQ3VFLFlBQWpDLEVBQThDO0FBQzVDLE1BQUlDLFFBQVFELGFBQWFFLEtBQWIsQ0FBbUIsR0FBbkIsQ0FBWjtBQUNBLE1BQUlELE1BQU1sSCxNQUFOLElBQWdCLENBQXBCLEVBQ0UsSUFBSSxPQUFPa0gsTUFBTSxDQUFOLENBQVAsSUFBbUIsV0FBdkIsRUFDQSxPQUFPQSxNQUFNLENBQU4sRUFBU25FLElBQVQsRUFBUDtBQUNGLFNBQU8sRUFBUDtBQUNEIiwiZmlsZSI6IlJlZGlzU2VydmljZXMvUGFja2FnZVNlcnZpY2UuanMiLCJzb3VyY2VzQ29udGVudCI6WyJpbXBvcnQgeyBjcHVzIH0gZnJvbSBcIm9zXCI7XG5pbXBvcnQgeyBwcm9taXNlcyB9IGZyb20gXCJkbnNcIjtcblxudmFyIGVtYWlsU2VydmljZSA9IHJlcXVpcmUoXCIuLi9VdGlsL0VtYWlsU2VydmljZVwiKVxudmFyIHJlZGlzID0gcmVxdWlyZShcInJlZGlzXCIpO1xudmFyIGxyZWRpcyA9IHJlcXVpcmUoXCIuL3JlZGlzLWxvY2FsXCIpO1xudmFyIG1vbWVudCA9IHJlcXVpcmUoXCJtb21lbnRcIik7XG52YXIgcmVkaXNTZWFyY2ggPSByZXF1aXJlKFwiLi4vcmVkaXNlYXJjaGNsaWVudFwiKTtcbnZhciBmcyA9IHJlcXVpcmUoXCJmc1wiKTtcbnZhciBtb21lbnQgPSByZXF1aXJlKCdtb21lbnQnKVxudmFyIFBhY2thZ2VVdGlsID0gcmVxdWlyZShcIi4uL1V0aWwvcGFja2FnZXV0aWxcIikuUGFja2FnZVV0aWxpdHk7XG52YXIgcGFja2FnZVV0aWwgPSBuZXcgUGFja2FnZVV0aWwoKTtcbmNvbnN0IFBLR19JRFggPSBcImluZGV4OnBhY2thZ2VzXCI7XG5jb25zdCBQS0dfSURfQ09VTlRFUiA9IFwicGFja2FnZTppZFwiO1xudmFyIGRhdGFDb250ZXh0ID0gcmVxdWlyZSgnLi9kYXRhQ29udGV4dCcpXG5jb25zdCBQS0dfUFJFRklYID0gXCJwYWNrYWdlczpcIjtcbmNvbnN0IEFXQl9JRCA9IFwiYXdiOmlkXCJcbmNvbnN0IElOREVYX0FXQiA9IFwiaW5kZXg6YXdiXCJcbmNvbnN0IFJFQ19QS0cgPSBcInBrZzpyZWM6XCJcbnZhciB1bmlxSWQgPSByZXF1aXJlKFwidW5pcWlkXCIpOyBcbnZhciBDdXN0b21lclNlcnZpY2UgPSByZXF1aXJlKCcuL0N1c3RvbWVyU2VydmljZScpLkN1c3RvbWVyU2VydmljZTsgXG52YXIgY3VzdG9tZXJTZXJ2aWNlID0gbmV3IEN1c3RvbWVyU2VydmljZSgpXG5jb25zdCBQS0dfU1RBVFVTID0geyBcbiAgMSA6IFwiUmVjZWl2ZWRcIixcbiAgMjogXCJMb2FkZWQgb24gQWlyQ3JhZnRcIixcbiAgMzogXCJJbiBUcmFuc2l0XCIsXG4gIDQ6IFwiUmVjaWV2ZWQgaW4gTkFTXCIsXG4gIDU6IFwiUmVhZHkgZm9yIFBpY2t1cCAvIERlbGl2ZXJ5XCIsXG4gIDY6IFwiRGVsaXZlcmVkXCJcblxufTsgXG5jb25zdCBJTkRFWF9TSElQUEVSID0gXCJpbmRleDpzaGlwcGVyXCJcbnJlZGlzLmFkZENvbW1hbmQoXCJmdC5hZ2dyZWdhdGVcIilcbmNvbnN0IGF3YkluZGV4ID0gcmVkaXNTZWFyY2gocmVkaXMsIElOREVYX0FXQiwge1xuICBjbGllbnRPcHRpb25zOiBscmVkaXMuc2VhcmNoQ2xpZW50RGV0YWlsc1xufSk7XG5jb25zdCBwYWNrYWdlSW5kZXggPSByZWRpc1NlYXJjaChyZWRpcywgUEtHX0lEWCwge1xuICBjbGllbnRPcHRpb25zOiBscmVkaXMuc2VhcmNoQ2xpZW50RGV0YWlsc1xufSk7XG5jb25zdCBzaGlwcGVySW5kZXggPSByZWRpc1NlYXJjaChyZWRpcywgSU5ERVhfU0hJUFBFUiwge1xuICBjbGllbnRPcHRpb25zOiBscmVkaXMuc2VhcmNoQ2xpZW50RGV0YWlsc1xufSk7XG5mdW5jdGlvbiBnZXRQYWNrYWdlVm9sdW1uZShtUGFja2FnZSl7XG5cbiAgcmV0dXJuIDA7IFxufVxuZnVuY3Rpb24gY3JlYXRlRG9jdW1lbnQodFBhY2thZ2UpIHtcbiAgdmFyIHBhY2thZ2VEb2N1bWVudCA9IHtcbiAgICBpZDp0UGFja2FnZS5pZCxcbiAgICB0cmFja2luZ05vOiB0UGFja2FnZS50cmFja2luZ05vLFxuICAgIHNreWJveDogdFBhY2thZ2Uuc2t5Ym94LFxuICAgIGRhdGVSZWNpZXZlZCA6IG1vbWVudCgpLnVuaXgoKSwgXG4gICAgYXdiOjAsIFxuICAgIG1pZDowLFxuICAgIHZvbHVtZTogZ2V0UGFja2FnZVZvbHVtbmUodFBhY2thZ2UpLFxuICAgIHdlaWdodDp0UGFja2FnZS53ZWlnaHQsXG4gICAgcGllY2VzOnRQYWNrYWdlLnBpZWNlcyxcbiAgICBjdXN0b21lcjogdFBhY2thZ2UuY3VzdG9tZXIsXG4gICAgc2hpcHBlcjogdFBhY2thZ2Uuc2hpcHBlcixcbiAgICBkZXNjcmlwdGlvbjogdFBhY2thZ2UuZGVzY3JpcHRpb24sXG4gICAgZGltZW5zaW9uczp0UGFja2FnZS5kaW1lbnNpb25zLFxuICAgIGNhcnJpZXI6dFBhY2thZ2UuY2FycmllcixcbiAgICAvL3NreWJveFY6IHRQYWNrYWdlLnNreWJveCwgYWRkIGRpbWVuaW9uIFxuICAgIHN0YXR1czogdFBhY2thZ2Uuc3RhdHVzLFxuICAgIG1pZDogdFBhY2thZ2UubWlkLFxuICAgIHZhbHVlOiB0UGFja2FnZS52YWx1ZSxcbiAgICBcbiAgfTtcbiAgY29uc29sZS5sb2coXCJhYm91dCB0byBhZGQgdGhlIHBhY2thZ2UgdG8gdGhlIGluZGV4XCIpO1xuICByZXR1cm4gcGFja2FnZURvY3VtZW50O1xufVxuZnVuY3Rpb24gc2V0UGFja2FnZUluVHJhbnNpdChrZXlzLCBtc2VhcmNoZXIpIHtcbiAgcmV0dXJuIG5ldyBQcm9taXNlKChyZXNvbHZlLCByZWplY3QpID0+IHtcbiAgICB2YXIgYmF0Y2hlciA9IG1zZWFyY2hlci5jbGllbnQuYmF0Y2goKTtcbiAgICBrZXlzLmZvckVhY2goZWxlbWVudCA9PiB7XG4gICAgICB2YXIgdmFsdWUgPSB7XG4gICAgICAgIHN0YXR1czogMixcbiAgICAgICAgbG9jYXRpb246IFwiSW4gVHJhbnNpdFwiXG4gICAgICB9O1xuICAgICAgY29uc29sZS5sb2coZWxlbWVudCArIFwiaXMgdGhlIGVsZW1lbnRcIik7XG5cbiAgICAgIGJhdGNoZXIuaG1zZXQoUEtHX1BSRUZJWCArIGVsZW1lbnQsIHZhbHVlKTtcbiAgICB9KTtcbiAgICBiYXRjaGVyLmV4ZWMoKGVyciwgcmVzdWx0KSA9PiB7XG4gICAgICBjb25zb2xlLmxvZyhyZXN1bHQpO1xuICAgICAgLy9yZWFkZCB0aGUgZG9jdW1lbnRzIGhlcmVcbiAgICAgIGtleXMuZm9yRWFjaChlbGVtZW50ID0+IHtcbiAgICAgICAgYWRkUGFja2FnZVRvSW5kZXgoZWxlbWVudCwgbXNlYXJjaGVyKTtcbiAgICAgIH0pO1xuICAgICAgcmVzb2x2ZShyZXN1bHQpO1xuICAgIH0pO1xuICB9KTtcbn1cblxuZnVuY3Rpb24gYWRkUGFja2FnZVRvSW5kZXgodHJhY2tpbmdObywgbXNlYXJjaGVyKSB7XG4gIGxyZWRpcy5nZXRQYWNrYWdlKHRyYWNraW5nTm8pLnRoZW4ocGFjayA9PiB7XG4gICAgbXNlYXJjaGVyLmRlbERvY3VtZW50KFBLR19JRFgsIGAke3BhY2subWlkfS0ke3RyYWNraW5nTm99YCwgKGVyciwgZG9uZSkgPT4ge1xuICAgICAgdmFyIGRvY3VtZW50ID0gY3JlYXRlRG9jdW1lbnQocGFjayk7XG4gICAgICBjb25zb2xlLmxvZyhcInJlYWRkaW5nIHBhY2thZ2UgdG8gdGhlIGluZGV4IGxpa2UgYSBib3NzIFwiICsgdHJhY2tpbmdObyk7XG4gICAgICBtc2VhcmNoZXIuYWRkKHBhY2subWlkICsgXCItXCIgKyBwYWNrLnRyYWNraW5nTm8sIGRvY3VtZW50KTtcbiAgICB9KTtcbiAgfSk7XG59XG5leHBvcnQgY2xhc3MgUGFja2FnZVNlcnZpY2Uge1xuICBjb25zdHJ1Y3RvcigpIHtcbiAgICB0aGlzLnNldHVwSW5kZXgoKTtcbiAgfVxuICBzZXR1cEluZGV4KCkge1xuICAgIHRoaXMubXlTZWFyY2ggPSByZWRpc1NlYXJjaChyZWRpcywgUEtHX0lEWCwge1xuICAgICAgY2xpZW50T3B0aW9uczogbHJlZGlzLnNlYXJjaENsaWVudERldGFpbHNcbiAgICB9KTtcbiAgfVxuICBnZXROZXdBd2IoKXtcbiAgICByZXR1cm4gbmV3IFByb21pc2UoKHJlc29sdmUscmVqZWN0KT0+e1xuICAgICAgZGF0YUNvbnRleHQucmVkaXNDbGllbnQuZXhpc3RzKEFXQl9JRCwoZXJyLHJlc3VsdCk9PntcbiAgICAgICAgY29uc29sZS5sb2cocmVzdWx0KTsgXG4gICAgICAgIGlmIChyZXN1bHQgIT0gXCIxXCIpe1xuICAgICAgICAgIGRhdGFDb250ZXh0LnJlZGlzQ2xpZW50LnNldChBV0JfSUQgPT0gMTAwMDAwLChlcnIsaW5pdFJlc3VsdCk9PntcbiAgICAgICAgICAgIGRhdGFDb250ZXh0LnJlZGlzQ2xpZW50LmluY3IoQVdCX0lELChlcnIsbmV3SWQpPT57XG4gICAgICAgICAgICAgIHJlc29sdmUoe2F3YjpuZXdJZH0pXG4gICAgICAgICAgICB9KVxuICAgICAgICAgIH0pXG4gICAgICAgIH1cbiAgICAgICAgZWxzZSB7XG4gICAgICAgICAgZGF0YUNvbnRleHQucmVkaXNDbGllbnQuaW5jcihBV0JfSUQsKGVycixuZXdJZCk9PntcbiAgICAgICAgICAgIHJlc29sdmUoe2F3YjpuZXdJZH0pXG4gICAgICAgICAgfSlcbiAgICAgICAgfVxuICAgICAgfSlcbiAgICB9KTtcbiAgfVxuICBzYXZlQXdiKGF3Yil7XG4gICAgcmV0dXJuIG5ldyBQcm9taXNlKChyZXNvbHZlLHJlamVjdCk9PntcbiAgICAgIGNvbnNvbGUubG9nKCdzYXZpbmcuLi4nLGF3Yixtb21lbnQoKS50b1N0cmluZyhcImhoOm1tOnNzXCIpKVxuICAgICAgaWYgKGF3Yi5pZCAhPVwiXCIpe1xuICAgICAgICBhd2IudXBkYXRlZF9ieSA9IGF3Yi51c2VybmFtZTsgXG4gICAgICAgIGF3Yi5kYXRlX3VwZGF0ZWQgPSBtb21lbnQoKS51bml4KCk7IFxuICAgICAgICBhd2JJbmRleC51cGRhdGUoYXdiLmlkLGF3YiwoZXJyMSxhd2JSZXMpPT57XG4gICAgICAgICAgaWYgKGVycjEpe1xuICAgICAgICAgICAgY29uc29sZS5sb2coJ3NhdmluZyBlcnInLGVycjEpXG4gICAgICAgICAgICByZXNvbHZlKHtzYXZlZDpmYWxzZX0pXG4gICAgICAgICAgfVxuICAgICAgICAgIHJlc29sdmUoe3NhdmVkOnRydWUsIGlkOmF3Yi5pZH0pXG4gICAgICAgIH0pXG4gICAgICB9XG4gICAgICBlbHNle1xuICAgICAgZGF0YUNvbnRleHQucmVkaXNDbGllbnQuaW5jcihBV0JfSUQsKGVycixyZXBseSk9PntcbiAgICAgICAgYXdiLmlkID0gcmVwbHk7IFxuICAgICAgICBhd2Iuc3RhdHVzID0gMTsgXG4gICAgICAgIGlmIChhd2IuaW52b2ljZSl7XG4gICAgICAgICAgYXdiLmhhc0RvY3MgPSAxXG4gICAgICAgICAgY29uc29sZS5sb2coXCJIQVMgRE9DQ0NDQ1wiKVxuICAgICAgICB9XG4gICAgICAgIGVsc2Uge1xuICAgICAgICAgIGF3Yi5oYXNEb2NzID0gMCA7IFxuICAgICAgICAgIGNvbnNvbGUubG9nKFwiSEFTIE5PIERPQ0NDQ0NcIilcbiAgICAgICAgfVxuXG4gICAgICAgIGF3Yi5jcmVhdGVkX2J5ID0gYXdiLnVzZXJuYW1lOyBcbiAgICAgICAgZGVsZXRlIGF3Yi51c2VybmFtZTtcbiAgICAgICAgYXdiLmRhdGVDcmVhdGVkID0gbW9tZW50KCkudW5peCgpOyBcbiAgICAgICAgICBhd2JJbmRleC5hZGQoYXdiLmlkLGF3YiwoZXJyMSxhd2JSZXMpPT57XG4gICAgICAgICAgICBpZiAoZXJyMSl7XG4gICAgICAgICAgICAgIGNvbnNvbGUubG9nKCdzYXZpbmcgZXJyJyxlcnIxKVxuICAgICAgICAgICAgICByZXNvbHZlKHtzYXZlZDpmYWxzZX0pXG4gICAgICAgICAgICB9XG4gICAgICAgICAgICByZXNvbHZlKHtzYXZlZDp0cnVlLCBpZDpyZXBseX0pXG4gICAgICAgICAgfSlcbiAgICAgIH0pXG4gICAgfVxuICAgICAgXG4gICAgICBcbiAgICB9KVxuICB9XG4gIGdldEF3Yk92ZXJ2aWV3KGlkKXtcbiAgICAvLyBnZXQgdGhlIGF3YiBwYWNrYWdlcyBhbmQgYWRkIGV2ZXJ5dGhpbmcgaW4gXG4gICAgcmV0dXJuIG5ldyBQcm9taXNlKChyZXNvbHZlLHJlamVjdCk9PntcbiAgICAgIHBhY2thZ2VJbmRleC5zZWFyY2goYEBhd2I6WyR7aWR9ICR7aWR9XWAse251bWJlck9mUmVzdWx0czo1MDAwLG9mZnNldDowLHNvcnRCeToncGtnTm8nfSwoZXJyLHBhY2thZ2VzKT0+e1xuICAgICAgICB2YXIgd2VpZ2h0ID0gMCA7IFxuICAgICAgICB2YXIgcGllY2VzID0gcGFja2FnZXMudG90YWxSZXN1bHRzOyBcbiAgICAgICAgdmFyIGRlc2NyaXB0aW9uID0gXCJcIlxuICAgICAgICBwYWNrYWdlcy5yZXN1bHRzLmZvckVhY2gocGFja2FnZTEgPT4ge1xuICAgICAgICAgIGlmIChkZXNjcmlwdGlvbiA9PVwiXCIpXG4gICAgICAgICAgICBkZXNjcmlwdGlvbiA9IHBhY2thZ2UxLmRvYy5kZXNjcmlwdGlvbjsgXG4gICAgICAgICAgd2VpZ2h0ICs9IE51bWJlcihwYWNrYWdlMS5kb2Mud2VpZ2h0KVxuICAgICAgICB9KTtcbiAgICAgICAgdmFyIGRhdGEgID0ge3dlaWdodDp3ZWlnaHQsZGVzY3JpcHRpb246ZGVzY3JpcHRpb24scGllY2VzOnBpZWNlc31cbiAgICAgICAgY29uc29sZS5sb2coZGF0YSxcIkFXQiBERVRBSUxTXCIpOyBcbiAgICAgICAgcmVzb2x2ZSggZGF0YSlcbiAgICAgIH0pXG4gICAgfSlcbiAgIFxuICB9XG4gIGdldEF3YkRldGFpbHMoaWQpe1xuICAgIHZhciBzcnYgPSB0aGlzOyBcbiAgICByZXR1cm4gbmV3IFByb21pc2UoKHJlc29sdmUscmVqZWN0KT0+e1xuICAgICAgY29uc29sZS5sb2coYEBhd2I6WyR7aWR9ICR7aWR9XWApXG4gICAgIFxuICAgICAgcGFja2FnZUluZGV4LnNlYXJjaChgQGF3YjpbJHtpZH0gJHtpZH1dYCx7bnVtYmVyT2ZSZXN1bHRzOjUwMDAsb2Zmc2V0OjAsc29ydEJ5OlwicGtnTm9cIn0sKGVycixwYWNrYWdlcyk9PntcbiAgICAgICAgaWYgKGVycilcbiAgICAgICAgIGNvbnNvbGUubG9nKGVycilcbiAgICAgIFxuICAgICAgICB2YXIgIHBhY2thZ2VsaXN0ICA9IFtdXG4gICAgICAgIHZhciBjb3VudCA9IDE7IFxuICAgICAgICBwYWNrYWdlcy5yZXN1bHRzLmZvckVhY2gocGFja2FnZTEgPT4ge1xuXG4gICAgICAgICAgaWYgKHBhY2thZ2UxLmRvYy50cmFja2luZ05vLmxlbmd0aCA+IDcpe1xuICAgICAgICAgICAgLy9vbmx5IGRpc3BsYXkgdGhlIGxhc3QgNyBcbiAgICAgICAgICAgIHBhY2thZ2UxLmRvYy50cmFja2luZ05vID0gcGFja2FnZTEuZG9jLnRyYWNraW5nTm8uc3Vic3RyaW5nKHBhY2thZ2UxLmRvYy50cmFja2luZ05vLmxlbmd0aCAtNylcbiAgICAgICAgICAgIFxuICAgICAgICAgIH1cbiAgICAgICAgICBwYWNrYWdlMS5kb2MucGFja2FnZUluZGV4ID0gY291bnQ7XG4gICAgICAgICAgY291bnQgKys7IFxuICAgICAgICAgIHBhY2thZ2VsaXN0LnB1c2goIHBhY2thZ2UxLmRvYylcbiAgICAgICAgfSk7XG4gICAgICAgXG4gICAgICAgXG4gICAgICAgIHJlc29sdmUoIHBhY2thZ2VsaXN0KVxuICAgICAgfSlcbiAgICB9KVxuICB9XG4gIGxpc3ROb0RvY3NGbGwoKXtcbiAgICByZXR1cm4gbmV3IFByb21pc2UoKHJlc29sdmUscmVqZWN0KT0+e1xuICAgICAgIGF3YkluZGV4LnNlYXJjaChcIkBzdGF0dXM6WzEgMV0gQGhhc0RvY3M6WzAgMF1cIix7b2Zmc2V0OjAsbnVtYmVyT2ZSZXN1bHRzOjUwMDAsc29ydEJ5OidpZCcsc29ydERpcjpcIkRFU0NcIn0sKGVycixhd2JzKT0+e1xuICAgICAgICAgdmFyIGF3Ykxpc3QgPSBbXTsgXG4gICAgICAgICBQcm9taXNlLmFsbChhd2JzLnJlc3VsdHMubWFwKGF3Yj0+Y3VzdG9tZXJTZXJ2aWNlLmdldEN1c3RvbWVyKGF3Yi5kb2MuY3VzdG9tZXJJZCkpKS50aGVuKGN1c3RvbWVycz0+e1xuICAgICAgICAgICBQcm9taXNlLmFsbChhd2JzLnJlc3VsdHMubWFwKGF3Yj0+dGhpcy5nZXRBd2JPdmVydmlldyhhd2IuZG9jLmlkKSkpLnRoZW4oZGV0YWlscz0+e1xuICAgICAgICAgICAgY29uc29sZS5sb2coXCJnb3QgdGhlIGN1c3RvbWVyc1wiLGN1c3RvbWVycywgYXdicylcbiAgICAgICAgICAgIGZvcih2YXIgaSA9MCA7IGkgPCBhd2JzLnJlc3VsdHMubGVuZ3RoIDsgaSsrICl7XG4gICAgICAgICAgICAgIHZhciBhd2IgPSBhd2JzLnJlc3VsdHNbaV07IFxuICAgICAgICAgICAgICBhd2IuZG9jLmRhdGVDcmVhdGVkID0gbW9tZW50LnVuaXgoYXdiLmRvYy5kYXRlQ3JlYXRlZCkuZm9ybWF0KFwiWVlZWS1NTS1ERCBoaDptbSBBXCIpXG4gICAgICAgICAgICAgIC8vd2UgbmVlZCB0byBnZXQgdGhlIGN1c3RvbWVyIFxuICAgICAgICAgICAgICBhd2IuZG9jLmNvbnNpZ25lZSA9IGN1c3RvbWVyc1tpXS5uYW1lOyBcbiAgICAgICAgICAgICAgYXdiLmRvYy53ZWlnaHQgPSBkZXRhaWxzW2ldLndlaWdodDsgXG4gICAgICAgICAgICAgIGF3Yi5kb2MucG1iID0gY3VzdG9tZXJzW2ldLnBtYjsgXG4gICAgICAgICAgICAgIGF3Yi5kb2MuZGVzY3JpcHRpb24gPSBkZXRhaWxzW2ldLmRlc2NyaXB0aW9uOyBcbiAgICAgICAgICAgICAgYXdiLmRvYy5waWVjZXMgPSBkZXRhaWxzW2ldLnBpZWNlczsgXG4gICAgICAgICAgICAgIGlmIChjdXN0b21lcnNbaV0ucG1iID09ICcnKXtcbiAgICAgICAgICAgICAgICBhd2IuZG9jLnBtYiA9ICc5MDAwJ1xuICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgIGNvbnNvbGUubG9nKCdwdXNoaW5nICcsYXdiKVxuICAgICAgICAgICAgICAvL3dlIG5lZWQgdG8gZ2V0IGFsbCB0aGUgcGFja2FnZXMgXG4gICAgICAgICAgICAgIGF3Ykxpc3QucHVzaChhd2IuZG9jKVxuICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICBhd2JMaXN0ID0gYXdiTGlzdC5yZXZlcnNlKCk7XG4gICAgICAgICAgICAgcmVzb2x2ZSh7YXdiczphd2JMaXN0fSlcbiAgICAgICAgICAgfSlcbiAgICAgICAgICBcbiAgICAgICAgICB9KS5jYXRjaChlcnI9PntcbiAgICAgICAgICAgIGNvbnNvbGUubG9nKGVycik7IFxuICAgICAgICAgIH0pXG4gICAgICAgICBcbiAgICAgICAgLy8gIGF3YnMucmVzdWx0cy5mb3JFYWNoKGF3YiA9PiB7XG4gICAgICAgICAgIFxuICAgICAgICAgIFxuICAgICAgICAvLyAgfSk7XG4gICAgICAgICBcbiAgICAgICB9KVxuICAgIH0pXG4gIH1cblxuICBsaXN0QXdiaW5GbGwoKXtcbiAgICByZXR1cm4gbmV3IFByb21pc2UoKHJlc29sdmUscmVqZWN0KT0+e1xuICAgICAgIGF3YkluZGV4LnNlYXJjaChcIkBzdGF0dXM6WzEgMV0gQGhhc0RvY3M6WzEgMV1cIix7b2Zmc2V0OjAsbnVtYmVyT2ZSZXN1bHRzOjUwMDAsc29ydEJ5OidpZCcsc29ydERpcjonREVTQyd9LChlcnIsYXdicyk9PntcbiAgICAgICAgIHZhciBhd2JMaXN0ID0gW107IFxuICAgICAgICAgUHJvbWlzZS5hbGwoYXdicy5yZXN1bHRzLm1hcChhd2I9PmN1c3RvbWVyU2VydmljZS5nZXRDdXN0b21lcihhd2IuZG9jLmN1c3RvbWVySWQpKSkudGhlbihjdXN0b21lcnM9PntcbiAgICAgICAgICAgUHJvbWlzZS5hbGwoYXdicy5yZXN1bHRzLm1hcChhd2I9PnRoaXMuZ2V0QXdiT3ZlcnZpZXcoYXdiLmRvYy5pZCkpKS50aGVuKGRldGFpbHM9PntcbiAgICAgICAgICAgIGNvbnNvbGUubG9nKFwiZ290IHRoZSBjdXN0b21lcnNcIixjdXN0b21lcnMsIGF3YnMpXG4gICAgICAgICAgICBmb3IodmFyIGkgPTAgOyBpIDwgYXdicy5yZXN1bHRzLmxlbmd0aCA7IGkrKyApe1xuICAgICAgICAgICAgICB2YXIgYXdiID0gYXdicy5yZXN1bHRzW2ldOyBcbiAgICAgICAgICAgICAgYXdiLmRvYy5kYXRlQ3JlYXRlZCA9IG1vbWVudC51bml4KGF3Yi5kb2MuZGF0ZUNyZWF0ZWQpLmZvcm1hdChcIllZWVktTU0tREQgaGg6bW0gQVwiKVxuICAgICAgICAgICAgICAvL3dlIG5lZWQgdG8gZ2V0IHRoZSBjdXN0b21lciBcbiAgICAgICAgICAgICAgYXdiLmRvYy5jb25zaWduZWUgPSBjdXN0b21lcnNbaV0ubmFtZTsgXG4gICAgICAgICAgICAgIGF3Yi5kb2MucG1iID0gY3VzdG9tZXJzW2ldLnBtYjsgXG4gICAgICAgICAgICAgIGF3Yi5kb2Mud2VpZ2h0ID0gZGV0YWlsc1tpXS53ZWlnaHQ7IFxuICAgICAgICAgICAgICBhd2IuZG9jLmRlc2NyaXB0aW9uID0gZGV0YWlsc1tpXS5kZXNjcmlwdGlvbjsgXG4gICAgICAgICAgICAgIGF3Yi5kb2MucGllY2VzID0gZGV0YWlsc1tpXS5waWVjZXM7IFxuICAgICAgICAgICAgICBpZiAoY3VzdG9tZXJzW2ldLnBtYiA9PSAnJyl7XG4gICAgICAgICAgICAgICAgYXdiLmRvYy5wbWIgPSAnOTAwMCdcbiAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICBjb25zb2xlLmxvZygncHVzaGluZyAnLGF3YilcbiAgICAgICAgICAgICAgLy93ZSBuZWVkIHRvIGdldCBhbGwgdGhlIHBhY2thZ2VzIFxuICAgICAgICAgICAgICBhd2JMaXN0LnB1c2goYXdiLmRvYylcbiAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgcmVzb2x2ZSh7YXdiczphd2JMaXN0fSlcbiAgICAgICAgICAgfSlcbiAgICAgICAgICBcbiAgICAgICAgICB9KS5jYXRjaChlcnI9PntcbiAgICAgICAgICAgIGNvbnNvbGUubG9nKGVycik7IFxuICAgICAgICAgIH0pXG4gICAgICAgICBcbiAgICAgICAgLy8gIGF3YnMucmVzdWx0cy5mb3JFYWNoKGF3YiA9PiB7XG4gICAgICAgICAgIFxuICAgICAgICAgIFxuICAgICAgICAvLyAgfSk7XG4gICAgICAgICBcbiAgICAgICB9KVxuICAgIH0pXG4gIH1cbiAgZ2V0QXdiKGlkKXtcbiAgICBjb25zdCBzcnYgPSB0aGlzOyBcbiAgICByZXR1cm4gbmV3IFByb21pc2UoKHJlc29sdmUscmVqZWN0KT0+e1xuICAgICAgYXdiSW5kZXguZ2V0RG9jKGlkLChlcnIsYXdiKT0+e1xuICAgICAgICAvL2dldCB0aGUgY3VzdG9tZXIgXG4gICAgICAgIGN1c3RvbWVyU2VydmljZS5nZXRDdXN0b21lcihhd2IuZG9jLmN1c3RvbWVySWQpLnRoZW4oY3VzdG9tZXI9PntcbiAgICAgICAgICBhd2IuZG9jLmN1c3RvbWVyID0gY3VzdG9tZXI7IFxuICAgICAgICAgIHNydi5nZXRBd2JEZXRhaWxzKGlkKS50aGVuKHBhY2thZ2VzPT57XG4gICAgICAgICAgICAvL2dldCB0aGUgcGFja2FnZXMgZm9yIHRoZSBhd2IgXG4gICAgICAgICAgICBhd2IuZG9jLnBhY2thZ2VzID0gcGFja2FnZXM7IFxuICAgICAgICAgICAgcmVzb2x2ZSh7YXdiOmF3Yi5kb2N9KSAgXG4gICAgICAgICAgfSlcbiAgICAgICAgICBcbiAgICAgICAgfSlcbiAgICAgICAgXG4gICAgICB9KVxuICAgIH0pXG4gIH1cbiAgdXBkYXRlTG9jYXRpb24odHJhY2tpbmdOdW1iZXIsbG9jYXRpb25faWQpe1xuICAgIHJldHVybiBuZXcgUHJvbWlzZSgocmVzb2x2ZSxyZWplY3QpPT57XG4gICAgICBwYWNrYWdlSW5kZXguc2VhcmNoKFwiQHRyYWNraW5nTm86XCIrdHJhY2tpbmdOdW1iZXIse2xvY2F0aW9uOmxvY2F0aW9uX2lkfSwoZXJyLHBhY2thZ2VSZXN1bHQpPT57XG5cbiAgICAgIH0pXG4gICAgfSlcbiAgfVxuICBzYXZlUGFja2FnZVRvQXdiKG5ld1BhY2thZ2Upe1xuICAgIHJldHVybiBuZXcgUHJvbWlzZSgocmVzb2x2ZSxyZXN1bHQpPT57XG4gICAgICBpZiAobmV3UGFja2FnZS5pZCAhPVwiMFwiKXtcbiAgICAgICAgcGFja2FnZUluZGV4LnVwZGF0ZShuZXdQYWNrYWdlLmlkLG5ld1BhY2thZ2UsKGVycixyZXN1bHQpPT57XG4gICAgICAgICAgaWYgKGVycilcbiAgICAgICAgICAgIGNvbnNvbGUubG9nKGVycik7IFxuICAgICAgICAgIHJlc29sdmUoe3NhdmVkOnRydWUsaWQ6bmV3UGFja2FnZS5pZH0pXG4gICAgICAgIH0pXG4gICAgICB9XG4gICAgICBlbHNlIHtcbiAgICAgICAgZGF0YUNvbnRleHQucmVkaXNDbGllbnQuaW5jcihQS0dfSURfQ09VTlRFUiwoZXJyLGlkKT0+e1xuICAgICAgICAgIG5ld1BhY2thZ2UuaWQgPSBpZDsgXG4gICAgICAgICAgcGFja2FnZUluZGV4LmFkZChpZCxuZXdQYWNrYWdlLChlcnIscmVzdWx0KT0+e1xuICAgICAgICAgICAgaWYgKGVycilcbiAgICAgICAgICAgICAgY29uc29sZS5sb2coZXJyKTsgXG4gICAgICAgICAgICByZXNvbHZlKHtzYXZlZDp0cnVlLGlkOmlkfSlcbiAgICAgICAgICB9KVxuICAgICAgICB9KVxuICAgICAgfVxuICAgXG4gICAgfSlcbiAgfVxuICBnZXRTaGlwcGVyKGlkKXtcbiAgICByZXR1cm4gbmV3IFByb21pc2UoKHJlc29sdmUscmVqZWN0KT0+e1xuICAgICBzaGlwcGVySW5kZXguZ2V0RG9jKGlkLChlcnIsc3Jlc3VsdCk9PntcbiAgICAgICBpZiAoZXJyKVxuICAgICAgICByZXNvbHZlKGlkKTtcblxuICAgICAgICByZXNvbHZlKHNyZXN1bHQuZG9jKTsgXG4gICAgIH0pXG4gICAgfSlcbiAgfVxuICBjcmVhdGVDb25zb2xhdGVkKHBhY2thZ2VzLHVzZXJuYW1lLGJveFNpemUpe1xuICAgIHZhciBzcnYgPSB0aGlzOyBcbiAgICByZXR1cm4gbmV3IFByb21pc2UoKHJlc29sdmUscmVqZWN0KT0+e1xuICAgICAgdmFyIGF3YkluZm8gPSB7IFxuICAgICAgICBpZDogXCJcIixcbiAgICAgICAgaXNTZWQ6MCxcbiAgICAgICAgaGFzRG9jczogXCIwXCIsXG4gICAgICAgIGludm9pY2VOdW1iZXI6XCJcIixcbiAgICAgICAgdmFsdWU6XCIwXCIsXG4gICAgICAgIGN1c3RvbWVySWQ6MjQxOTcsXG4gICAgICAgIHNoaXBwZXI6XCI0ODJcIiwgLy8gd2Ugc2hvdWxkIGdldCBhbiBpZCBoZXJlIFxuICAgICAgICBjYXJyaWVyOlwiVVNQU1wiLFxuICAgICAgICBoYXptYXQ6XCJcIixcbiAgICAgICAgdXNlcm5hbWU6ICB1c2VybmFtZVxuICAgICAgIFxuICAgIH07XG4gICAgc3J2LnNhdmVBd2IoYXdiSW5mbykudGhlbihhd2JSZXN1bHQ9PntcbiAgICAgICAvL2FkZCBcbiAgICAgICAgICB2YXIgY1BhY2thZ2UgPSB7XG4gICAgICAgICAgICBpZDowLFxuICAgICAgICAgICAgdHJhY2tpbmdObzogdW5pcUlkKCksXG4gICAgICAgICAgICBkZXNjcmlwdGlvbjogXCJDb25zb2xpZGF0ZWQgUGFja2FnZVwiLFxuICAgICAgICAgICAgd2VpZ2h0OjAsIFxuICAgICAgICAgICAgZGltZW5zaW9uczogIGAke2JveFNpemV9eCR7Ym94U2l6ZX14JHtib3hTaXplfWAsXG4gICAgICAgICAgICBhd2I6YXdiUmVzdWx0LmlkLCBcbiAgICAgICAgICAgIGlzQ29uc29saWRhdGVkOiBcIjFcIiwgXG4gICAgICAgICAgICBjcmVhdGVkX2J5OiB1c2VybmFtZSwgXG4gICAgICAgICAgXG4gICAgICAgIH07IFxuICAgICAgICBzcnYuc2F2ZVBhY2thZ2VUb0F3YihjUGFja2FnZSkudGhlbihwa2dSZXN1bHQ9PntcbiAgICAgICAgICAvLyBnZXQgdGhlIGlkIFxuICAgICAgICAgIC8vXG4gICAgICAgICAgdmFyIGJhdGNoID0gZGF0YUNvbnRleHQucmVkaXNDbGllbnQuYmF0Y2goKTsgXG4gICAgICAgICAgdmFyIHBrZ0JhdGNoID0gZGF0YUNvbnRleHQucmVkaXNDbGllbnQuYmF0Y2goKTsgXG5cbiAgICAgICAgICBwYWNrYWdlcy5mb3JFYWNoKHBrZyA9PiB7XG4gICAgICAgICAgICAvL3RoZXNlIGFyZSBiYXJjb2RlcyBcbiAgICAgICAgICAgIGJhdGNoLnNhZGQoXCJjb25zb2xpZGF0ZWQ6cGtnOlwiK3BrZ1Jlc3VsdC5pZCxwa2cpXG4gICAgICAgICAgICBwa2dCYXRjaC5obWdldChQS0dfUFJFRklYK2dldFBhY2thZ2VJZEZyb21CYXJDb2RlKHBrZyksXCJ3ZWlnaHRcIilcbiAgICAgICAgICB9KTtcbiAgICAgICAgICBiYXRjaC5leGVjKChlcnIscmVzdWx0cyk9PntcbiAgICAgICAgICAgIC8vXG4gICAgICAgICAgICBwa2dCYXRjaC5leGVjKChlcnIxLHJlc3VsdHMpPT57XG4gICAgICAgICAgICAgIHZhciB0b3RhbFdlaWdodCA9IDA7IFxuICAgICAgICAgICAgICByZXN1bHRzLmZvckVhY2god2VpZ2h0ID0+IHtcbiAgICAgICAgICAgICAgICBpZiAoaXNOYU4oTnVtYmVyKHdlaWdodCkpID09IGZhbHNlKVxuICAgICAgICAgICAgICAgICAgdG90YWxXZWlnaHQgKz0gTnVtYmVyKHdlaWdodCk7XG4gICAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgICAvL3dlIG5lZWQgdG8gdXBkYXRlIHRoZSB0b3RhbCB3ZWlnaHQgb2YgdGhlIHBhY2thZ2Ugbm93IFxuICAgICAgICAgICAgICBzcnYucGFja2FnZUluZGV4LnVwZGF0ZShjUGFja2FnZS5pZCx7d2VpZ2h0OnRvdGFsV2VpZ2h0fSlcbiAgICAgICAgICAgIH0pXG4gICAgICAgICAgICBcbiAgICAgICAgICAgIHJlc29sdmUoe3NhdmVkOnRydWUsaWQ6cGtnUmVzdWx0LmlkfSlcbiAgICAgICAgICB9KVxuICAgICAgICB9KVxuICAgICAgICBcbiAgICB9KVxuXG4gICBcbiAgICAgIC8vdmFsaWRhdGUgdGhlIHBhY2thZ2UgXG4gICAgXG5cbiAgICB9KVxuICB9XG4gIHNhdmVQYWNrYWdlKGJvZHkpe1xuICAgIHJldHVybiBuZXcgUHJvbWlzZSgocmVzb2x2ZSxyZWplY3QpPT57XG4gICAgICB2YXIgY1BhY2thZ2UgPSB7XG4gICAgICAgIFxuICAgICAgICBza3lib3g6IGJvZHkuc2t5Ym94LFxuICAgICAgICBjdXN0b21lcjogYm9keS5jdXN0b21lci5yZXBsYWNlKFwiLVwiLCBcIlwiKS50cmltKCksXG4gICAgICAgIHRyYWNraW5nTm86IGJvZHkudHJhY2tpbmcsXG4gICAgICAgIGRlc2NyaXB0aW9uOiBib2R5LmRlc2NyaXB0aW9uLFxuICAgICAgICBzaGlwcGVyOiBib2R5LnNoaXBwZXIsXG4gICAgICAgIGNhcnJpZXI6Ym9keS5jYXJyaWVyLFxuICAgICAgICB2YWx1ZTogTnVtYmVyKGJvZHkudmFsdWUpLFxuICAgICAgICBwaWVjZXM6IE51bWJlcihib2R5LnBpZWNlcyksXG4gICAgICAgIHdlaWdodDogTnVtYmVyKGJvZHkud2VpZ2h0KSxcbiAgICAgICAgZGltZW5zaW9uczogYm9keS5kaW1lbnNpb25zLFxuICAgICAgICBzdGF0dXM6IDEsXG4gICAgICAgIGxvY2F0aW9uOiBcIkZMTFwiLFxuICAgICAgICBtaWQ6IDAsXG4gICAgICAgIGF3YjowLFxuICAgICAgICAvL2hhc09wdDogdHJ1ZSxcbiAgICAgICAgLy9tdHlwZTogYm9keS5tdHlwZVxuICAgICAgfTtcbiAgICAgIC8vdmFsaWRhdGUgdGhlIHBhY2thZ2UgXG4gICAgICBkYXRhQ29udGV4dC5yZWRpc0NsaWVudC5pbmNyKFBLR19JRF9DT1VOVEVSLChlcnIsaWQpPT57XG4gICAgICAgIGNQYWNrYWdlLmlkID0gaWQ7IFxuICAgICAgICBkYXRhQ29udGV4dC5yZWRpc0NsaWVudC5zZXQoUEtHX1BSRUZJWCtpZCxjUGFja2FnZSwoZXJyLHJlc3BvbnNlKT0+e1xuICAgICAgICAgIGlmIChlcnIpe1xuICAgICAgICAgICAgcmVqZWN0KHtzYXZlZDpmYWxzZSxlcnI6ZXJyfSlcbiAgICAgICAgICB9XG4gICAgICAgICAgIHZhciBpbmRleFBhY2thZ2UgPSAgY3JlYXRlRG9jdW1lbnQoY1BhY2thZ2UpOyBcbiAgICAgICAgICAgY29uc29sZS5sb2coaW5kZXhQYWNrYWdlKTsgXG4gICAgICAgICAgIHBhY2thZ2VJbmRleC5hZGQoY1BhY2thZ2UuaWQsaW5kZXhQYWNrYWdlLChlcnIxLGRvY1Jlc3VsdCk9PntcbiAgICAgICAgICAgICBjb25zb2xlLmxvZyhkb2NSZXN1bHQpOyBcbiAgICAgICAgICAgICBpZihlcnIxKXtcbiAgICAgICAgICAgICAgIHJlamVjdCh7c2F2ZWQ6ZmFsc2UsZXJyOmVycjF9KVxuICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICByZXNvbHZlKHtzYXZlZDp0cnVlfSlcbiAgICAgICAgICAgfSlcblxuICAgICAgICB9KVxuICAgICAgfSk7XG4gICAgXG5cblxuICAgIH0pXG4gIH1cblxuICBnZXRNYW5pZmVzdFBhY2thZ2VzKCl7XG4gICAgcmV0dXJuIG5ldyBQcm9taXNlKChyZXNvbHZlLHJlamVjdCk9PntcbiAgICAgIFxuICAgICAgdGhpcy5teVNlYXJjaC5zZWFyY2goXG4gICAgICAgIGBAbWlkOlswIDBdYCxcbiAgICAgICAgeyBvZmZzZXQ6IDAsIG51bWJlck9mUmVzdWx0czogNTAwMCB9LFxuICAgICAgICAoZXJyLCBkYXRhKSA9PiB7XG4gICAgICAgICAgdmFyIHBhY2thZ2VzID0gW107XG4gICAgICAgICAgY29uc29sZS5sb2coZGF0YSk7XG4gICAgICAgICAgZGF0YS5yZXN1bHRzLmZvckVhY2goZWxlbWVudCA9PiB7XG5cbiAgICAgICAgICAgIHBhY2thZ2VzLnB1c2goZWxlbWVudC5kb2MpO1xuICAgICAgICAgICAgcmVzb2x2ZShwYWNrYWdlcyk7ICAgICAgICAgICAgICAgICBcbiAgICAgICAgfSk7XG4gICAgfSk7XG4gICAgfSlcbiAgfVxuICBnZXRSZWNlaXZlZFBhY2thZ2VzKHBhZ2UscGFnZVNpemUpe1xuICAgIHJldHVybiBuZXcgUHJvbWlzZSgocmVzb2x2ZSxyZWplY3QpPT57XG4gICAgICBcbiAgICAgIHRoaXMubXlTZWFyY2guc2VhcmNoKFxuICAgICAgICBgQG1pZDpbMCAwXWAsXG4gICAgICAgIHsgb2Zmc2V0OiAwLCBudW1iZXJPZlJlc3VsdHM6IDUwMDAgfSxcbiAgICAgICAgKGVyciwgZGF0YSkgPT4ge1xuICAgICAgICAgIHZhciBwYWNrYWdlcyA9IFtdO1xuICAgICAgICAgIGNvbnNvbGUubG9nKGRhdGEpO1xuICAgICAgICAgIGRhdGEucmVzdWx0cy5mb3JFYWNoKGVsZW1lbnQgPT4ge1xuXG4gICAgICAgICAgICBwYWNrYWdlcy5wdXNoKGVsZW1lbnQuZG9jKTtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBcbiAgICAgICAgfSk7XG4gICAgICAgIHJlc29sdmUocGFja2FnZXMpOyBcbiAgICB9KTtcbiAgICB9KVxuICB9XG4gIGdldE5vRG9jc1BhY2thY2thZ2VzKHBhZ2UscGFnZVNpemUpe1xuICAgIHJldHVybiBuZXcgUHJvbWlzZSgocmVzb2x2ZSxyZWplY3QpPT57XG4gICAgICBcbiAgICAgIHRoaXMubXlTZWFyY2guc2VhcmNoKFxuICAgICAgICBgQGhhc0RvY3M6WzAgMF1gLFxuICAgICAgICB7IG9mZnNldDogMCwgbnVtYmVyT2ZSZXN1bHRzOiA1MDAwIH0sXG4gICAgICAgIChlcnIsIGRhdGEpID0+IHtcbiAgICAgICAgICB2YXIgcGFja2FnZXMgPSBbXTtcbiAgICAgICAgICBjb25zb2xlLmxvZyhkYXRhKTtcbiAgICAgICAgICBkYXRhLnJlc3VsdHMuZm9yRWFjaChlbGVtZW50ID0+IHtcblxuICAgICAgICAgICAgcGFja2FnZXMucHVzaChlbGVtZW50LmRvYyk7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgXG4gICAgICAgIH0pO1xuICAgICAgICByZXNvbHZlKHBhY2thZ2VzKTsgXG4gICAgfSk7XG4gICAgfSlcbiAgfVxuICBnZXRwYWNrYWdlYnlSZWRpc0lkKGlkKXtcbiAgICByZXR1cm4gbmV3IFByb21pc2UoKHJlc29sdmUscmVqZWN0KT0+e1xuICAgICAgcGFja2FnZUluZGV4LmdldERvYyhpZCwoZXJyLGRvY3VtZW50KT0+e1xuICAgICAgICByZXNvbHZlKGRvY3VtZW50LmRvYyk7IFxuICAgICAgfSlcbiAgICB9KVxuICB9XG4gIGdldFBhY2thZ2VCeUlkKGJhcmNvZGUpe1xuICAgIHZhciBzcnYgPSB0aGlzOyBcbiAgICB2YXIgcGtnSWQgPSBnZXRQYWNrYWdlSWRGcm9tQmFyQ29kZShiYXJjb2RlKTsgXG4gICAgcmV0dXJuIG5ldyBQcm9taXNlKChyZXNvbHZlLHJlamVjdCk9PntcbiAgICAgIHRoaXMubXlTZWFyY2guZ2V0RG9jKHBrZ0lkLChlcnIsZG9jdW1lbnQpPT57XG4gICAgICAgIC8vZ2V0IHRoZSBhd2IgaW5mbyBoZXJlIGFzIHdlbGwgXG4gICAgICAgIHNydi5nZXRBd2IoZG9jdW1lbnQuZG9jLmF3YikudGhlbihhd2JpbmZvPT57XG4gICAgICAgICAgc3J2LmdldFNoaXBwZXIoYXdiaW5mby5hd2Iuc2hpcHBlcikudGhlbihzaGlwcGVyPT57XG4gICAgICAgICAgICBjb25zb2xlLmxvZyhhd2JpbmZvKTsgXG4gICAgICAgICAgICBhd2JpbmZvLmF3Yi5zaGlwcGVyID0gc2hpcHBlci5uYW1lO1xuICAgICAgICAgICAgdmFyIHJlc3BvbnNlID0geyBcbiAgICAgICAgICAgICAgYXdiIDogYXdiaW5mby5hd2IsXG4gICAgICAgICAgICAgIHBhY2thZ2UgOiBkb2N1bWVudC5kb2NcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIHJlc29sdmUocmVzcG9uc2UpOyBcbiAgICAgICAgICB9KVxuICAgICAgICAgXG4gICAgICAgIH0pOyBcbiAgICAgICAgXG4gICAgICB9KVxuICAgIH0pOyBcbiAgfVxuICB1cGRhdGVTdG9yZUxvY2F0aW9uKGNoZWNraW4pe1xuICAgIHZhciBzcnYgPSB0aGlzOyBcbiAgICByZXR1cm4gbmV3IFByb21pc2UgKChyZXNvbHZlLHJlamVjdCk9PntcbiAgICAgIHZhciBpZCA9IGdldFBhY2thZ2VJZEZyb21CYXJDb2RlKGNoZWNraW4uYmFyY29kZSk7IFxuICAgICAgcGFja2FnZUluZGV4LmdldERvYyhpZCwoZXJyLHBrZyk9PntcbiAgICAgICAgcGtnLmRvYy5sb2NhdGlvbklkID0gY2hlY2tpbi5sb2NhdGlvbklkOyBcbiAgICAgICAgcGtnLmRvYy5sb2NhdGlvbiA9IGNoZWNraW4ubG9jYXRpb247IFxuICAgICAgICBwa2cuZG9jLnN0YXR1cyA9IDU7IFxuICAgICAgICAgcGFja2FnZUluZGV4LnVwZGF0ZShpZCxwa2csKGVycixyZXN1bHQpPT57XG4gICAgICAgICAgIC8vd2UgbmVlZCB0byBzZW5kIHRoZSBlbWFpbCBoZXJlIGZvciB0aGUgcGFja2FnZSBcbiAgICAgICAgICAgc3J2LmdldFBhY2thZ2VCeURvY0lkKGlkKS50aGVuKGluZm89PntcbiAgICAgICAgICAgICAgZW1haWxTZXJ2aWNlLnNlbmRBdFN0b3JlRW1haWwoY2hlY2tpbi5sb2NhdGlvbixpbmZvKTtcbiAgICAgICAgICAgICAgcmVzb2x2ZSh7dXBkYXRlZDp0cnVlfSk7IFxuICAgICAgICAgICB9KVxuICAgICAgICAgXG4gICAgICAgICB9KTtcbiAgICAgIH0pXG4gICAgfSlcbiAgfVxuICBjaGVja091dFRvQ3VzdG9tZXIoYmFyY29kZSx1c2VyKXtcbiAgICB2YXIgc3J2ID0gdGhpczsgXG4gICAgcmV0dXJuIG5ldyBQcm9taXNlICgocmVzb2x2ZSxyZWplY3QpPT57XG4gICAgICAvL3dlIHdhbnQgdG8gY2hlY2sgb3V0IHNldCB0aGUgc2F0YXR1cyBcbiAgICAgIHZhciBpZCA9IGdldFBhY2thZ2VJZEZyb21CYXJDb2RlKGJhcmNvZGUpOyBcbiAgICAgIHNydi5nZXRQYWNrYWdlQnlEb2NJZChpZCkudGhlbihwa2c9PntcbiAgICAgICAgY29uc29sZS5sb2cocGtnLFwiVEhFIFBLR1wiKVxuICAgICAgICBwa2cucGFja2FnZS5zdGF0dXMgPSA2IC8vY2hlY2tlZCBvdXQgdG8gY3VzdG9tZXIgXG4gICAgICAgIHBrZy5wYWNrYWdlLmNoZWNrb3V0QnkgPSB1c2VyO1xuICAgICAgICBwYWNrYWdlSW5kZXgudXBkYXRlKHBrZy5wYWNrYWdlLmlkLCBwa2cucGFja2FnZSwoZXJybSxyZXBseSk9PntcbiAgICAgICAgICBpZihlcnJtKVxuICAgICAgICAgICB7XG4gICAgICAgICAgICAgY29uc29sZS5sb2coZXJybSlcbiAgICAgICAgICAgIHJlc29sdmUoe3VwZGF0ZWQ6ZmFsc2V9KVxuICAgICAgICAgICB9IFxuICAgICAgICAgIHJlc29sdmUoe3VwZGF0ZWQ6dHJ1ZX0pXG4gICAgICAgIH0pXG4gICAgICB9KSBcblxuICAgIH0pXG4gIH1cbiAgZ2V0UGFja2FnZUJ5RG9jSWQocGtnSWQpe1xuICAgIHZhciBzcnYgPSB0aGlzOyBcbiAgICByZXR1cm4gbmV3IFByb21pc2UoKHJlc29sdmUscmVqZWN0KT0+e1xuICAgICAgdGhpcy5teVNlYXJjaC5nZXREb2MocGtnSWQsKGVycixkb2N1bWVudCk9PntcbiAgICAgICAgLy9nZXQgdGhlIGF3YiBpbmZvIGhlcmUgYXMgd2VsbCBcbiAgICAgICAgc3J2LmdldEF3Yihkb2N1bWVudC5kb2MuYXdiKS50aGVuKGF3YmluZm89PntcbiAgICAgICAgICBjb25zb2xlLmxvZyhhd2JpbmZvKTsgXG4gICAgICAgICAgdmFyIHJlc3BvbnNlID0geyBcbiAgICAgICAgICAgIGF3YiA6IGF3YmluZm8uYXdiLFxuICAgICAgICAgICAgcGFja2FnZSA6IGRvY3VtZW50LmRvY1xuICAgICAgICAgIH1cbiAgICAgICAgICByZXNvbHZlKHJlc3BvbnNlKTsgXG4gICAgICAgIH0pOyBcbiAgICAgICAgXG4gICAgICB9KVxuICAgIH0pOyBcbiAgfVxuICBnZXRNYW5pZmVzdFBhY2thZ2VzKG1pZCl7XG4gICAgcmV0dXJuIG5ldyBQcm9taXNlKChyZXNvbHZlLHJlamVjdCk9PntcbiAgICAgIHBhY2thZ2VJbmRleC5zZWFyY2goYEBtaWQ6WyR7bWlkfSAke21pZH1dYCx7b2Zmc2V0OjAsbnVtYmVyT2ZSZXN1bHRzOjUwMDAsc29ydEJ5OidpZCcsc29ydERpcjpcIkRFU0NcIn0sKGVycixwYWNrYWdlczEpPT57XG4gICAgICAgIHZhciBwYWNrYWdlcyA9IFtdO1xuICAgICAgICBwYWNrYWdlczEucmVzdWx0cy5mb3JFYWNoKHBrZyA9PiB7XG4gICAgICAgICAgXG4gICAgICAgICAgcGFja2FnZXMucHVzaChwa2cuZG9jKVxuICAgICAgICB9KTtcbiAgICAgICAgUHJvbWlzZS5hbGwocGFja2FnZXMubWFwKHBrZ0RhdGE9PnRoaXMuZ2V0QXdiKHBrZ0RhdGEuYXdiKSkpLnRoZW4ocmVzd2l0aEF3Yj0+e1xuICAgICAgICAgZm9yKHZhciBpID0wOyBpIDwgcmVzd2l0aEF3Yi5sZW5ndGg7aSsrKXtcbiAgICAgICAgICAgY29uc29sZS5sb2coXCJhZGRpbmcgXCIscmVzd2l0aEF3YltpXS5hd2IpOyBcbiAgICAgICAgICAgcGFja2FnZXNbaV0uYXdiSW5mbyA9IHJlc3dpdGhBd2JbaV0uYXdiOyBcbiAgICAgICAgIH1cbiAgICAgICAgIHJlc29sdmUocGFja2FnZXMpO1xuICAgICAgICB9KSBcbiAgICAgICAgXG5cbiAgICAgICAgLy8gUHJvbWlzZS5hbGwoYXdicy5yZXN1bHRzLm1hcChhd2I9PmN1c3RvbWVyU2VydmljZS5nZXRDdXN0b21lcihhd2IuZG9jLmN1c3RvbWVySWQpKSkudGhlbihjdXN0b21lcnM9PntcbiAgICAgICAgLy8gICBQcm9taXNlLmFsbChhd2JzLnJlc3VsdHMubWFwKGF3Yj0+dGhpcy5nZXRBd2JPdmVydmlldyhhd2IuZG9jLmlkKSkpLnRoZW4oZGV0YWlscz0+e1xuICAgICAgICAvLyAgICBjb25zb2xlLmxvZyhcImdvdCB0aGUgY3VzdG9tZXJzXCIsY3VzdG9tZXJzLCBhd2JzKVxuICAgICAgICAvLyAgICBmb3IodmFyIGkgPTAgOyBpIDwgYXdicy5yZXN1bHRzLmxlbmd0aCA7IGkrKyApe1xuICAgICAgICAvLyAgICAgIHZhciBhd2IgPSBhd2JzLnJlc3VsdHNbaV07IFxuICAgICAgICAvLyAgICAgIGF3Yi5kb2MuZGF0ZUNyZWF0ZWQgPSBtb21lbnQudW5peChhd2IuZG9jLmRhdGVDcmVhdGVkKS5mb3JtYXQoXCJZWVlZLU1NLUREIGhoOm1tIEFcIilcbiAgICAgICAgLy8gICAgICAvL3dlIG5lZWQgdG8gZ2V0IHRoZSBjdXN0b21lciBcbiAgICAgICAgLy8gICAgICBhd2IuZG9jLmNvbnNpZ25lZSA9IGN1c3RvbWVyc1tpXS5uYW1lOyBcbiAgICAgICAgLy8gICAgICBhd2IuZG9jLndlaWdodCA9IGRldGFpbHNbaV0ud2VpZ2h0OyBcbiAgICAgICAgLy8gICAgICBhd2IuZG9jLnBtYiA9IGN1c3RvbWVyc1tpXS5wbWI7IFxuICAgICAgICAvLyAgICAgIGF3Yi5kb2MuZGVzY3JpcHRpb24gPSBkZXRhaWxzW2ldLmRlc2NyaXB0aW9uOyBcbiAgICAgICAgLy8gICAgICBhd2IuZG9jLnBpZWNlcyA9IGRldGFpbHNbaV0ucGllY2VzOyBcbiAgICAgICAgLy8gICAgICBpZiAoY3VzdG9tZXJzW2ldLnBtYiA9PSAnJyl7XG4gICAgICAgIC8vICAgICAgICBhd2IuZG9jLnBtYiA9ICc5MDAwJ1xuICAgICAgICAvLyAgICAgIH1cbiAgICAgICAgLy8gICAgICBjb25zb2xlLmxvZygncHVzaGluZyAnLGF3YilcbiAgICAgICAgLy8gICAgICAvL3dlIG5lZWQgdG8gZ2V0IGFsbCB0aGUgcGFja2FnZXMgXG4gICAgICAgIC8vICAgICAgYXdiTGlzdC5wdXNoKGF3Yi5kb2MpXG4gICAgICAgIC8vICAgICB9XG4gICAgICAgIC8vICAgICBhd2JMaXN0ID0gYXdiTGlzdC5yZXZlcnNlKCk7XG4gICAgICAgIC8vICAgICByZXNvbHZlKHthd2JzOmF3Ykxpc3R9KVxuICAgICAgICAvLyAgIH0pXG4gICAgICAgICBcbiAgICAgICAgLy8gIH0pLmNhdGNoKGVycj0+e1xuICAgICAgICAvLyAgICBjb25zb2xlLmxvZyhlcnIpOyBcbiAgICAgICAgLy8gIH0pXG4gICAgICAgIFxuICAgICAgIC8vICBhd2JzLnJlc3VsdHMuZm9yRWFjaChhd2IgPT4ge1xuICAgICAgICAgIFxuICAgICAgICAgXG4gICAgICAgLy8gIH0pO1xuICAgICAgICBcbiAgICAgIH0pXG4gICB9KVxuICB9XG4gIC8vdXNpbmcgdGhpcyBcbiAgXG5cbiAgdXBkYXRlTWFuaWZlc3RQYWNrYWdlVG9JblRyYW5zaXQobWlkKSB7XG4gICAgLy9nZXQgYWxsIHRoZSBwYWNrYWdlc1xuICAgIC8vd2UgbmVlZCB0byB1cGRhdGUgdGhlIGluZGV4IGF0IHRoaXMgcG9pbnQgYXMgd2VsbFxuICAgIHZhciBtc2VhcmNoID0gdGhpcy5teVNlYXJjaDtcbiAgICB0aGlzLm15U2VhcmNoLnNlYXJjaChcbiAgICAgIGBAbWlkOlske21pZH0gJHttaWR9XWAsXG4gICAgICB7IG9mZnNldDogMCwgbnVtYmVyT2ZSZXN1bHRzOiA1MDAwIH0sXG4gICAgICAoZXJyLCBkYXRhKSA9PiB7XG4gICAgICAgIHZhciBwYWNrYWdlcyA9IFtdO1xuICAgICAgICBjb25zb2xlLmxvZyhkYXRhKTtcbiAgICAgICAgZGF0YS5yZXN1bHRzLmZvckVhY2goZWxlbWVudCA9PiB7XG4gICAgICAgICAgdmFyIG9sZERvY0lkID0gZWxlbWVudC5kb2NJZDtcbiAgICAgICAgICBlbGVtZW50LmRvY0lkID0gZWxlbWVudC5kb2NJZC5yZXBsYWNlKGAke21pZH0tYCwgXCJcIik7XG4gICAgICAgICAgcGFja2FnZXMucHVzaChlbGVtZW50LmRvY0lkKTtcbiAgICAgICAgICAvLyBpIGNvdWxkIGRlbGV0ZSBoZXJlXG4gICAgICAgICAgLy8gbXNlYXJjaC5kZWxEb2N1bWVudChQS0dfSURYLG9sZERvY0lkKVxuICAgICAgICAgIC8vdXBkYXRlIGFsbCB0aGUgcGFja2FnZXNcbiAgICAgICAgfSk7XG4gICAgICAgIHNldFBhY2thZ2VJblRyYW5zaXQocGFja2FnZXMsIG1zZWFyY2gsIG1pZCkudGhlbihmdW5jdGlvbihcbiAgICAgICAgICB1cGRhdGVkUGFja2FnZXNcbiAgICAgICAgKSB7XG4gICAgICAgICAgY29uc29sZS5sb2coXCJ1cGRhdGVkIHBhY2thZ2VzXCIpO1xuICAgICAgICAgIGNvbnNvbGUubG9nKHVwZGF0ZWRQYWNrYWdlcyk7XG4gICAgICAgIH0pO1xuICAgICAgfVxuICAgICk7XG4gIH1cbiAgcmVtb3ZlUGFja2FnZUZyb21NYW5pZmVzdChwYWNrYWdlSWQsIG1pZCkge1xuICAgIHZhciBtc2VhcmNoID0gdGhpcy5teVNlYXJjaDtcbiAgICByZXR1cm4gbmV3IFByb21pc2UoKHJlc29sdmUsIHJlamVjdCkgPT4ge1xuICAgICAgdmFyIG1hbmlmZXN0ID0gbWlkO1xuICAgICAgdmFyIG1hbmlmZXN0S2V5ID0gXCJtYW5pZmVzdDpcIiArIG1hbmlmZXN0ICsgXCI6KlwiO1xuXG4gICAgICBscmVkaXMuZGVsKFwicGFja2FnZXM6XCIgKyB0cmFja2luZ05vKS50aGVuKGZ1bmN0aW9uKHJlc3VsdCkge1xuICAgICAgICBjb25zb2xlLmxvZyhyZXN1bHQpO1xuICAgICAgICBtc2VhcmNoLmRlbERvY3VtZW50KFBLR19JRFgsIGAke21pZH0tJHt0cmFja2luZ05vfWApO1xuICAgICAgICAvL3dlIG5lZWQgdG8gcmVtb3ZlIGZyb20gdGhlIGluZGV4IGFuZCBkZWMgdGhlIGNvdW50ZXJcbiAgICAgICAgbHJlZGlzLmNsaWVudC5kZWNyKFwibWNvdW50ZXI6XCIgKyBtaWQpO1xuICAgICAgICAvL3JTZXJ2aWNlcy5wYWNrYWdlU2VydmljZS5ybVBhY2thZ2UobWlkLCB0cmFja2luZ05vKTtcbiAgICAgICAgbHJlZGlzLmdldEtleXMobWFuaWZlc3RLZXkpLnRoZW4oa1Jlc3VsdCA9PiB7XG4gICAgICAgICAgLy90aGUgbGlzdCBvZiBhbGwgdGhlIHNldHMgLi4ud2UgbmVlZCB0byByZW1vdmUgdGhlIGtleSBmcm9tIGVhY2ggb25lXG4gICAgICAgICAgdmFyIGtleXNDb3VudCA9IDA7XG5cbiAgICAgICAgICBrUmVzdWx0LmZvckVhY2goZWxlbWVudCA9PiB7XG4gICAgICAgICAgICBjb25zb2xlLmxvZyhcbiAgICAgICAgICAgICAgYHJlbW92aW5nICR7dHJhY2tpbmdOb30gcGFja2FnZSBtYW5pZmVzdCBzZXQgJHtlbGVtZW50fSBgXG4gICAgICAgICAgICApO1xuICAgICAgICAgICAgbHJlZGlzLnNyZW0oZWxlbWVudCwgdHJhY2tpbmdObykudGhlbihmdW5jdGlvbihyUmVzdWx0KSB7XG4gICAgICAgICAgICAgIGNvbnNvbGUubG9nKHJSZXN1bHQpO1xuICAgICAgICAgICAgICBjb25zb2xlLmxvZyhcInJlbW92ZWRcIik7XG4gICAgICAgICAgICAgIGlmIChrZXlzQ291bnQgPT0ga1Jlc3VsdC5sZW5ndGggLSAxKSBrZXlzQ291bnQrKztcbiAgICAgICAgICAgIH0pO1xuICAgICAgICAgIH0pO1xuICAgICAgICAgIHJlc29sdmUoe1xuICAgICAgICAgICAgZGVsZXRlZDogdHJ1ZVxuICAgICAgICAgIH0pO1xuICAgICAgICB9KTtcblxuICAgICAgICAvL3dlIGFsc28gbmVlZCB0byByZW1vdmUgZnJvbSBhbnkgc2V0c1xuICAgICAgfSk7XG4gICAgfSk7XG4gIH1cbiAgcmVtb3ZlUGFja2FnZUJ5SWQoaWQpIHtcbiAgICB2YXIgbXNlYXJjaCA9IHRoaXMubXlTZWFyY2g7XG4gICAgcmV0dXJuIG5ldyBQcm9taXNlKChyZXNvbHZlLCByZWplY3QpID0+IHtcbiAgICAgIFxuICAgICAgcGFja2FnZUluZGV4LmRlbERvY3VtZW50KFBLR19JRFgsaWQsKGVycixyZXNwb25zZSk9PntcbiAgICAgICAgaWYgKGVycilcbiAgICAgICAgICBjb25zb2xlLmxvZyhlcnIpOyBcbiAgICAgICAgY29uc29sZS5sb2cocmVzcG9uc2UpOyBcbiAgICAgICAgcmVzb2x2ZSh7ZGVsZXRlZDp0cnVlfSlcbiAgICAgIH0pXG4gICAgICBcbiAgICAgICAgXG4gICAgICBcbiAgICB9KTtcbiAgfVxuICBzdG9yZVBhY2thZ2VGb3JQaWNrdXAodHJhY2tpbmdObyxiaW4pe1xuICAgIHZhciBzZWFyY2hlciA9IHRoaXMubXlTZWFyY2g7XG4gICAgcmV0dXJuIG5ldyBQcm9taXNlKChyZXNvbHZlLHJlamVjdCk9PntcbiAgICAgICBscmVkaXMuaG1zZXQoUEtHX1BSRUZJWCt0cmFja2luZ05vLHtzdGF0dXM6NCxsb2NhdGlvbjpiaW59KS50aGVuKChyZXN1bHQpPT57XG4gICAgICAgICBscmVkaXMuZ2V0UGFja2FnZSh0cmFja2luZ05vKS50aGVuKChwa2cpPT57XG4gICAgICAgICAgYWRkUGFja2FnZVRvSW5kZXgodHJhY2tpbmdObyxzZWFyY2hlcikgOyBcbiAgICAgICAgICByZXNvbHZlKHBrZyk7ICAgXG4gICAgICAgICB9KTtcbiAgICAgICB9KSBcbiAgICB9KTsgXG4gIH1cbiAgdXBkYXRlUGFja2FnZUluZGV4KHRyYWNraW5nKXtcbiAgICAgIHJldHVybiBuZXcgUHJvbWlzZSgocmVzb2x2ZSxyZWplY3QpPT57XG4gICAgICAgICAgdmFyIG1zZWFyY2ggPSB0aGlzLm15U2VhcmNoOyBcbiAgICAgICAgICBhZGRQYWNrYWdlVG9JbmRleCh0cmFja2luZyxtc2VhcmNoKTsgXG4gICAgICAgICByZXNvbHZlKHsndXBkYXRlZCc6dHJ1ZX0pO1xuICAgICAgfSlcbiAgfVxuICBnZXRDdXN0b21lclBhY2thZ2VzKHNreWJveCkge31cblxuXG4gIC8vbm8gbW9yZSBza3lib3hcbiAgZ2V0TWFuaWZlc3RQYWNrYWdlc0J5U3RhdHVzKG1pZCxzdGF0dXMpIHtcbiAgICAgIHJldHVybiBuZXcgUHJvbWlzZSgocmVzb2x2ZSxyZWplY3QpPT57XG4gICAgICAgICAgY29uc29sZS5sb2coYEBtaWQ6WyR7bWlkfSAke21pZH1dYClcbiAgICAgICAgdGhpcy5teVNlYXJjaC5zZWFyY2goXG4gICAgICAgICAgICBgQG1pZDpbJHttaWR9ICR7bWlkfV1gLFxuICAgICAgICAgICAgeyBvZmZzZXQ6IDAsIG51bWJlck9mUmVzdWx0czogNTAwMCB9LFxuICAgICAgICAgICAgKGVyciwgZGF0YSkgPT4ge1xuICAgICAgICAgICAgICB2YXIgcGFja2FnZXMgPSBbXTtcbiAgICAgICAgICAgICAgY29uc29sZS5sb2coZGF0YSk7XG4gICAgICAgICAgICAgIGRhdGEucmVzdWx0cy5mb3JFYWNoKGVsZW1lbnQgPT4ge1xuXG4gICAgICAgICAgICAgICAgcGFja2FnZXMucHVzaChlbGVtZW50LmRvYyk7XG4gICAgICAgICAgICAgICAgcmVzb2x2ZShwYWNrYWdlcyk7ICAgICAgICAgICAgICAgICBcbiAgICAgICAgICAgIH0pO1xuICAgICAgICB9KTtcbiAgICAgIH0pO1xuICBcbiAgfSAgIFxuICBcbiAgLy8jcmVnaW9uIFBha2NhZ2UgRmlsdGVycyAgXG4gIGdldFBhY2thZ2VzTmFzV2FyZWhvdXNlKGlzTm9Eb2MsY29tcGFueSl7XG4gICAgdmFyIHNydiA9IHRoaXM7IFxuICAgIHJldHVybiBuZXcgUHJvbWlzZSgocmVzb2x2ZSxyZWplY3QpPT57XG4gICAgICAgIHBhY2thZ2VJbmRleC5zZWFyY2goYEBzdGF0dXM6WzQgNF0gQGNvbXBhbnk6JHtjb21wYW55fSBAaGFzRG9jczpbJHtpc05vRG9jfSAke2lzTm9Eb2N9XWAse30sKGVycixyZXBseSk9PntcbiAgICAgICAgICBjb25zb2xlLmxvZyhyZXBseS5yZXN1bHRzKTsgXG4gICAgICAgICAgUHJvbWlzZS5hbGwocmVwbHkucmVzdWx0cy5tYXAocGtnID0+IHNydi5nZXRQYWNrYWdlQnlEb2NJZChwa2cuZG9jSWQpKSkudGhlbihwYWNrYWdlcz0+e1xuICAgICAgICAgICAgcmVzb2x2ZShwYWNrYWdlcyk7IFxuICAgICAgICAgIH0pXG5cbiAgICAgICAgfSlcbiAgICB9KVxuICB9XG5cbiAgLy8jZW5kcmVnaW9uXG4gIFxuXG4gICAvLyNyZWdpb24gTWFuaWZlc3QgUGFja2FnZSBGdW5jdGlvbnMgXG5cbiAgIGFkZFRvRmxpZ2h0KGFjdGlvbil7XG4gICAgIHZhciBzcnYgPSB0aGlzOyBcbiAgICByZXR1cm4gbmV3IFByb21pc2UoKHJlc29sdmUscmVqZWN0KT0+e1xuICAgICAgdmFyIHBhY2thZ2VObyA9IGdldFBhY2thZ2VJZEZyb21CYXJDb2RlKGFjdGlvbi5iYXJjb2RlKTsgXG4gICAgICBjb25zb2xlLmxvZyhhY3Rpb24pOyBcbiAgICAgIHRoaXMubXlTZWFyY2gudXBkYXRlKHBhY2thZ2VObyx7bWlkOmFjdGlvbi5taWQgLCBzdGF0dXM6IDIsIGxvY2F0aW9uOlwiTG9hZGVkIG9uIEFpckNyYWZ0XCIsY29tcGFydG1lbnQ6YWN0aW9uLmNvbXBhcnRtZW50fSwoZXJyLHJlc3VsdCk9PntcbiAgICAgICAgaWYoZXJyKVxuICAgICAgICAgIHJlc29sdmUoe2FkZGVkOmZhbHNlfSlcbiAgICAgICAgc3J2LmdldEZsaWdodENvbXBhcnRtZW50V2VpZ2h0KGFjdGlvbi5taWQsYWN0aW9uLmNvbXBhcnRtZW50KS50aGVuKGZyZXN1bHQ9PntcbiAgICAgICAgICBmcmVzdWx0LmFkZGVkID0gdHJ1ZTsgXG4gICAgICAgICAgcmVzb2x2ZShmcmVzdWx0KVxuICAgICAgICB9KVxuICAgICAgIFxuICAgICAgfSlcbiAgICAgICAgXG4gICAgfSlcbiAgIH1cbiAgIC8vZ2V0IHRoZSBjb21wYXJ0bWVudCB3ZWlnaHQgXG4gICBnZXRGbGlnaHRDb21wYXJ0bWVudFdlaWdodChtaWQsY29tcGFydG1lbnQpe1xuICAgICByZXR1cm4gbmV3IFByb21pc2UoKHJlc29sdmUscmVqZWN0KT0+e1xuICAgICAgXG4gICAgICB0aGlzLm15U2VhcmNoLmFnZ3JlZ2F0ZShgQG1pZDpbJHttaWR9ICR7bWlkfV0gQGNvbXBhcnRtZW50OiR7Y29tcGFydG1lbnR9YCwge30sKGVycixyZXBseSk9PntcbiAgICAgICAgIGlmIChlcnIpXG4gICAgICAgICBjb25zb2xlLmxvZyhlcnIpOyBcbiAgICAgICAgIGNvbnNvbGUubG9nKHJlcGx5LFwiVE9UQUwgU0VDVElPTiBXZWlnaHRcIilcbiAgICAgICAgIGlmIChyZXBseVsxXSl7XG4gICAgICAgICAgIHZhciByZXN1bHQgPSByZXBseVsxXTtcbiAgICAgICAgICAgdmFyIGNvbXBhcnRtZW50ID0gcmVzdWx0WzNdOyBcbiAgICAgICAgICAgdmFyIHdlaWdodCA9IHJlc3VsdFs1XTsgXG4gICAgICAgICB9XG4gICAgICAgICByZXNvbHZlKHtjb21wYXJ0bWVudDpjb21wYXJ0bWVudCx3ZWlnaHQ6d2VpZ2h0fSlcbiAgICAgICB9KVxuICAgICB9KVxuICAgfVxuICAgLy9yZW1vdmUgZnJvbSBmbGlnaHQgXG4gICByZW1vdmVGcm9tRmxpZ2h0KGFjdGlvbil7XG4gICAgcmV0dXJuIG5ldyBQcm9taXNlKChyZXNvbHZlLHJlamVjdCk9PntcbiAgICAgICAgdmFyIHBhY2thZ2VObyA9IGdldFBhY2thZ2VJZEZyb21CYXJDb2RlKGFjdGlvbi5iYXJjb2RlKTsgICBcbiAgICAgICAgdGhpcy5teVNlYXJjaC51cGRhdGUocGFja2FnZU5vLHttaWQ6YWN0aW9uLm1pZH0sKGVycixyZXN1bHQpPT57XG4gICAgICAgIGlmKGVycilcbiAgICAgICAgICAgIHJlc29sdmUoe3JlbW92ZWQ6ZmFsc2V9KVxuICAgICAgICAgIFxuICAgICAgICAgIHJlc29sdmUoe3JlbW92ZWQ6dHJ1ZX0pXG4gICAgICAgIH0pXG4gICAgfSlcbiAgIH1cbiAgIHJlY0Zyb21UcnVjayh0cmFja2luZ05vLHVzZXJuYW1lLHNoaXBtZW50SWQpe1xuICAgICByZXR1cm4gbmV3IFByb21pc2UoKHJlc29sdmUscmVqZWN0KT0+e1xuICAgICAgICBkYXRhQ29udGV4dC5yZWRpc0NsaWVudC5zYWRkKFwic2hpcG1lbnQ6aWQ6XCIrc2hpcG1lbnRJZCx0cmFja2luZ05vLChlcnIscmVwbHkpPT57XG4gICAgICAgICAgZGF0YUNvbnRleHQucmVkaXNDbGllbnQuc2V0KFJFQ19QS0crdHJhY2tpbmdObyxtb21lbnQoKS51bml4KCksIChlcnIscmVzdWx0KT0+e1xuICAgICAgICAgICAgaWYgKGVycikgcmVzb2x2ZSh7c2F2ZWQ6ZmFsc2V9KVxuICAgICAgICAgICAgLy9zaGlwbWVudCBjb3VudCBcbiAgICAgICAgICAgIHZhciBzaGlwbWVudENvdW50ID0gMTtcbiAgICAgICAgICAgIGRhdGFDb250ZXh0LnJlZGlzQ2xpZW50LnNjYXJkKFwic2hpcG1lbnQ6aWQ6XCIrc2hpcG1lbnRJZCwoZXJyLGNhcmQpPT57XG4gICAgICAgICAgICAgIHJlc29sdmUoe3NhdmVkOnRydWUscGtnQ291bnQ6Y2FyZH0pXG4gICAgICAgICAgICB9KTtcbiAgICAgICAgICAgXG4gICAgICAgICAgfSlcbiAgICAgICAgfSlcbiAgICAgICAgXG4gICAgIH0pXG4gICB9XG4gICBwcm9jc3Nlc3NQYWNrYWdlKHBrZ0lmbm8sdXNlcm5hbWUpe1xuICAgIHZhciBzcnYgPSB0aGlzOyAgXG4gICAgcmV0dXJuIG5ldyBQcm9taXNlKChyZXNvbHZlLHJlamVjdCk9PntcbiAgICAgICAvL3dlIGFsc28gbmVlZCB0byBzZXQgdGhlIHdhcmVob3VzZSBsb2NhdGlvbiBoZXJlIFxuICAgICAgIGRhdGFDb250ZXh0LnJlZGlzQ2xpZW50Lmhtc2V0KFwiZmVlczphd2I6XCIrcGtnSWZuby5hd2IscGtnSWZubywoZXJyLHJlc3VsdCk9PntcbiAgICAgICAgIGlmIChlcnIpXG4gICAgICAgICAgY29uc29sZS5sb2coZXJyKTsgXG5cblxuXG4gICAgICAgICAgY29uc29sZS5sb2cocmVzdWx0KTsgXG4gICAgICAgICAgY29uc29sZS5sb2coXCJwcmludDpmZWVzOlwiK3VzZXJuYW1lLHVzZXJuYW1lKTsgXG4gICAgICAgICBkYXRhQ29udGV4dC5yZWRpc0NsaWVudC5wdWJsaXNoKFwicHJpbnQ6ZmVlczpcIit1c2VybmFtZSxwa2dJZm5vLmF3Yik7IFxuICAgICAgICAgXG4gICAgICAgICAgc3J2LmdldFBhY2thZ2VCeUlkKHBrZ0lmbm8uYmFyY29kZSkudGhlbihwa2c9PntcbiAgICAgICAgICAgIGVtYWlsU2VydmljZS5zZW5kTm9Eb2NzRW1haWwocGtnKVxuICAgICAgICAgICAgaWYgKHBrZ0lmbm8ucmVmTG9jKXtcbiAgICAgICAgICAgICAgcGtnLnBhY2thZ2Uud2xvYyA9IHBrZ0lmbm8ucmVmTG9jOyBcbiAgICAgICAgICAgICAgXG4gICAgICAgICAgICAgICAgcGtnLnBhY2thZ2UuaGFzRG9jcyA9IHBrZ0lmbm8uaGFzRG9jcyA7IFxuICAgICAgICAgICAgICAgIHBrZy5wYWNrYWdlLnN0YXR1cyA9IDQ7IFxuXG4gICAgICAgICAgICAgICAgLy9zZXQgdGhlb21wYW55IFxuICAgICAgICAgICAgICAgIGlmIChOdW1iZXIocGtnLmF3Yi5jdXN0b21lci5wbWIpID4gOTAwMCl7XG4gICAgICAgICAgICAgICAgICBwa2cucGFja2FnZS5jb21wYW55ID0gXCIwXCJcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgZWxzZSBcbiAgICAgICAgICAgICAgICAgIHBrZy5wYWNrYWdlLmNvbXBhbnkgPSBcIjFcIlxuICAgICAgICAgICAgICAgIGNvbnNvbGUubG9nKCd1cGRhdGluZyB3aXRoICcscGtnLnBhY2thZ2UpXG4gICAgICAgICAgICAgICAgXG4gICAgICAgICAgICAgIHBhY2thZ2VJbmRleC51cGRhdGUocGtnLnBhY2thZ2UuaWQscGtnLnBhY2thZ2UsKGVyclJlc3AscmVzcG9uc2UpPT57XG4gICAgICAgICAgICAgICAgXG4gICAgICAgICAgICAgICAgaWYoZXJyUmVzcClcbiAgICAgICAgICAgICAgICBjb25zb2xlLmxvZyhlcnJSZXNwKVxuICAgICAgICAgICAgICB9KVxuICAgICAgICAgICAgfVxuICAgICAgICAgICAgXG4gICAgICAgICAgfSlcbiAgICAgICAgIHJlc29sdmUoe3NlbnQ6dHJ1ZX0pXG4gICAgICAgfSlcbiAgICAgfSlcbiAgIH1cbiAgIHJlY0Zyb21QbGFuZU5hcyhiYXJjb2RlKXtcbiAgICAgcmV0dXJuIG5ldyBQcm9taXNlKChyZXNvbHZlLHJlamVjdCk9PntcbiAgICAgICB2YXIgc3J2ID0gdGhpcyA7IFxuICAgICAgIHZhciBwa2dJZCA9IGdldFBhY2thZ2VJZEZyb21CYXJDb2RlKGJhcmNvZGUpOyBcbiAgICAgICAgc3J2Lm15U2VhcmNoLmdldERvYyhwa2dJZCwoZXJyLHBrZyk9PntcbiAgICAgICAgICAgIHBrZy5kb2Muc3RhdHVzID0gNDsgXG4gICAgICAgICAgICBwa2cuZG9jLmxvY2F0aW9uICA9IFwiV2FyZWhvdXNlIE5BU1wiOyBcbiAgICAgICAgICAgIGlmIChwa2cuZG9jLmhhc0RvY3MgPT0gXCJ1bmRlZmluZWRcIilcbiAgICAgICAgICAgICAgcGtnLmRvYy5oYXNEb2NzID0gMCA7IFxuICAgICAgICAgICAgc3J2Lm15U2VhcmNoLnVwZGF0ZShwa2dJZCxwa2cuZG9jLChlcnIsdXBkYXRlUmVzdWx0KT0+e1xuICAgICAgICAgICAgICBcbiAgICAgICAgICAgICAgaWYoZXJyKVxuICAgICAgICAgICAgIHsgIFxuICAgICAgICAgICAgICAgY29uc29sZS5sb2coZXJyKVxuICAgICAgICAgICAgICByZWplY3Qoe3VwZGF0ZWQ6ZmFsc2V9KSBcbiAgICAgICAgICAgICB9IFxuICAgICAgICAgICAgICByZXNvbHZlKHt1cGRhdGVkOnRydWV9KVxuICAgICAgICAgICAgfSlcbiAgICAgICAgfSlcbiAgICAgfSlcbiAgIH1cblxuICAgLy8jZW5kcmVnaW9uXG59XG5cbmZ1bmN0aW9uIGdldFBhY2thZ2VJZEZyb21CYXJDb2RlKGJhckNvZGVWYWx1ZSl7XG4gIHZhciBwYXJ0cyA9IGJhckNvZGVWYWx1ZS5zcGxpdChcIi1cIik7IFxuICBpZiAocGFydHMubGVuZ3RoID09IDMpXG4gICAgaWYgKHR5cGVvZiBwYXJ0c1syXSAhPSBcInVuZGVmaW5lZFwiKVxuICAgIHJldHVybiBwYXJ0c1syXS50cmltKCk7IFxuICByZXR1cm4gXCJcIlxufVxuIl19
