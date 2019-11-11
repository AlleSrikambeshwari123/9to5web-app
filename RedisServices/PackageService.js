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
        var packagelist = [];
        if (isNaN(id)) {
          resolve(packagelist);
          return;
        }

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
//# sourceMappingURL=data:application/json;charset=utf8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIlJlZGlzU2VydmljZXMvUGFja2FnZVNlcnZpY2UuZXM2Il0sIm5hbWVzIjpbImVtYWlsU2VydmljZSIsInJlcXVpcmUiLCJyZWRpcyIsImxyZWRpcyIsIm1vbWVudCIsInJlZGlzU2VhcmNoIiwiZnMiLCJQYWNrYWdlVXRpbCIsIlBhY2thZ2VVdGlsaXR5IiwicGFja2FnZVV0aWwiLCJQS0dfSURYIiwiUEtHX0lEX0NPVU5URVIiLCJkYXRhQ29udGV4dCIsIlBLR19QUkVGSVgiLCJBV0JfSUQiLCJJTkRFWF9BV0IiLCJSRUNfUEtHIiwidW5pcUlkIiwiQ3VzdG9tZXJTZXJ2aWNlIiwiY3VzdG9tZXJTZXJ2aWNlIiwiUEtHX1NUQVRVUyIsIklOREVYX1NISVBQRVIiLCJhZGRDb21tYW5kIiwiYXdiSW5kZXgiLCJjbGllbnRPcHRpb25zIiwic2VhcmNoQ2xpZW50RGV0YWlscyIsInBhY2thZ2VJbmRleCIsInNoaXBwZXJJbmRleCIsImdldFBhY2thZ2VWb2x1bW5lIiwibVBhY2thZ2UiLCJjcmVhdGVEb2N1bWVudCIsInRQYWNrYWdlIiwicGFja2FnZURvY3VtZW50IiwiaWQiLCJ0cmFja2luZ05vIiwic2t5Ym94IiwiZGF0ZVJlY2lldmVkIiwidW5peCIsImF3YiIsIm1pZCIsInZvbHVtZSIsIndlaWdodCIsInBpZWNlcyIsImN1c3RvbWVyIiwic2hpcHBlciIsImRlc2NyaXB0aW9uIiwiZGltZW5zaW9ucyIsImNhcnJpZXIiLCJzdGF0dXMiLCJ2YWx1ZSIsImNvbnNvbGUiLCJsb2ciLCJzZXRQYWNrYWdlSW5UcmFuc2l0Iiwia2V5cyIsIm1zZWFyY2hlciIsIlByb21pc2UiLCJyZXNvbHZlIiwicmVqZWN0IiwiYmF0Y2hlciIsImNsaWVudCIsImJhdGNoIiwiZm9yRWFjaCIsImxvY2F0aW9uIiwiZWxlbWVudCIsImhtc2V0IiwiZXhlYyIsImVyciIsInJlc3VsdCIsImFkZFBhY2thZ2VUb0luZGV4IiwiZ2V0UGFja2FnZSIsInRoZW4iLCJkZWxEb2N1bWVudCIsInBhY2siLCJkb25lIiwiZG9jdW1lbnQiLCJhZGQiLCJQYWNrYWdlU2VydmljZSIsInNldHVwSW5kZXgiLCJteVNlYXJjaCIsInJlZGlzQ2xpZW50IiwiZXhpc3RzIiwic2V0IiwiaW5pdFJlc3VsdCIsImluY3IiLCJuZXdJZCIsInRvU3RyaW5nIiwidXBkYXRlZF9ieSIsInVzZXJuYW1lIiwiZGF0ZV91cGRhdGVkIiwidXBkYXRlIiwiZXJyMSIsImF3YlJlcyIsInNhdmVkIiwicmVwbHkiLCJpbnZvaWNlIiwiaGFzRG9jcyIsImNyZWF0ZWRfYnkiLCJkYXRlQ3JlYXRlZCIsInNlYXJjaCIsIm51bWJlck9mUmVzdWx0cyIsIm9mZnNldCIsInNvcnRCeSIsInBhY2thZ2VzIiwidG90YWxSZXN1bHRzIiwicmVzdWx0cyIsInBhY2thZ2UxIiwiZG9jIiwiTnVtYmVyIiwiZGF0YSIsInNydiIsInBhY2thZ2VsaXN0IiwiaXNOYU4iLCJjb3VudCIsImxlbmd0aCIsInN1YnN0cmluZyIsInB1c2giLCJzb3J0RGlyIiwiYXdicyIsImF3Ykxpc3QiLCJhbGwiLCJtYXAiLCJnZXRDdXN0b21lciIsImN1c3RvbWVySWQiLCJnZXRBd2JPdmVydmlldyIsImN1c3RvbWVycyIsImkiLCJmb3JtYXQiLCJjb25zaWduZWUiLCJuYW1lIiwiZGV0YWlscyIsInBtYiIsInJldmVyc2UiLCJjYXRjaCIsImdldERvYyIsImdldEF3YkRldGFpbHMiLCJ0cmFja2luZ051bWJlciIsImxvY2F0aW9uX2lkIiwicGFja2FnZVJlc3VsdCIsIm5ld1BhY2thZ2UiLCJzcmVzdWx0IiwiYm94U2l6ZSIsImF3YkluZm8iLCJpc1NlZCIsImludm9pY2VOdW1iZXIiLCJoYXptYXQiLCJzYXZlQXdiIiwiY1BhY2thZ2UiLCJhd2JSZXN1bHQiLCJpc0NvbnNvbGlkYXRlZCIsInNhdmVQYWNrYWdlVG9Bd2IiLCJwa2dCYXRjaCIsInNhZGQiLCJwa2dSZXN1bHQiLCJwa2ciLCJobWdldCIsImdldFBhY2thZ2VJZEZyb21CYXJDb2RlIiwidG90YWxXZWlnaHQiLCJib2R5IiwicmVwbGFjZSIsInRyaW0iLCJ0cmFja2luZyIsInJlc3BvbnNlIiwiaW5kZXhQYWNrYWdlIiwiZG9jUmVzdWx0IiwicGFnZSIsInBhZ2VTaXplIiwiYmFyY29kZSIsInBrZ0lkIiwiZ2V0QXdiIiwiZ2V0U2hpcHBlciIsImF3YmluZm8iLCJwYWNrYWdlIiwiY2hlY2tpbiIsImxvY2F0aW9uSWQiLCJnZXRQYWNrYWdlQnlEb2NJZCIsInNlbmRBdFN0b3JlRW1haWwiLCJpbmZvIiwidXBkYXRlZCIsInVzZXIiLCJjaGVja291dEJ5IiwiZXJybSIsInBhY2thZ2VzMSIsInBrZ0RhdGEiLCJyZXN3aXRoQXdiIiwibXNlYXJjaCIsIm9sZERvY0lkIiwiZG9jSWQiLCJ1cGRhdGVkUGFja2FnZXMiLCJwYWNrYWdlSWQiLCJtYW5pZmVzdCIsIm1hbmlmZXN0S2V5IiwiZGVsIiwiZGVjciIsImdldEtleXMiLCJrZXlzQ291bnQiLCJrUmVzdWx0Iiwic3JlbSIsInJSZXN1bHQiLCJkZWxldGVkIiwiYmluIiwic2VhcmNoZXIiLCJpc05vRG9jIiwiY29tcGFueSIsImFjdGlvbiIsInBhY2thZ2VObyIsImNvbXBhcnRtZW50IiwiYWRkZWQiLCJnZXRGbGlnaHRDb21wYXJ0bWVudFdlaWdodCIsImZyZXN1bHQiLCJhZ2dyZWdhdGUiLCJyZW1vdmVkIiwic2hpcG1lbnRJZCIsInNoaXBtZW50Q291bnQiLCJzY2FyZCIsImNhcmQiLCJwa2dDb3VudCIsInBrZ0lmbm8iLCJwdWJsaXNoIiwiZ2V0UGFja2FnZUJ5SWQiLCJzZW5kTm9Eb2NzRW1haWwiLCJyZWZMb2MiLCJ3bG9jIiwiZXJyUmVzcCIsInNlbnQiLCJ1cGRhdGVSZXN1bHQiLCJiYXJDb2RlVmFsdWUiLCJwYXJ0cyIsInNwbGl0Il0sIm1hcHBpbmdzIjoiOzs7Ozs7Ozs7QUFBQTs7QUFDQTs7Ozs7O0FBRUEsSUFBSUEsZUFBZUMsUUFBUSxzQkFBUixDQUFuQjtBQUNBLElBQUlDLFFBQVFELFFBQVEsT0FBUixDQUFaO0FBQ0EsSUFB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R0FBSCxFQUNEO0FBQ0VoQixzQkFBUUMsR0FBUixDQUFZZSxHQUFaO0FBQ0RULHFCQUFPLEVBQUN3SCxTQUFRLEtBQVQsRUFBUDtBQUNBO0FBQ0F6SCxvQkFBUSxFQUFDeUgsU0FBUSxJQUFULEVBQVI7QUFDRCxXQVJEO0FBU0gsU0FkRDtBQWVGLE9BbEJNLENBQVA7QUFtQkQ7O0FBRUQ7Ozs7Ozs7QUFHSCxTQUFTdEIsdUJBQVQsQ0FBaUNzRSxZQUFqQyxFQUE4QztBQUM1QyxNQUFJQyxRQUFRRCxhQUFhRSxLQUFiLENBQW1CLEdBQW5CLENBQVo7QUFDQSxNQUFJRCxNQUFNakgsTUFBTixJQUFnQixDQUFwQixFQUNFLElBQUksT0FBT2lILE1BQU0sQ0FBTixDQUFQLElBQW1CLFdBQXZCLEVBQ0EsT0FBT0EsTUFBTSxDQUFOLEVBQVNuRSxJQUFULEVBQVA7QUFDRixTQUFPLEVBQVA7QUFDRCIsImZpbGUiOiJSZWRpc1NlcnZpY2VzL1BhY2thZ2VTZXJ2aWNlLmpzIiwic291cmNlc0NvbnRlbnQiOlsiaW1wb3J0IHsgY3B1cyB9IGZyb20gXCJvc1wiO1xuaW1wb3J0IHsgcHJvbWlzZXMgfSBmcm9tIFwiZG5zXCI7XG5cbnZhciBlbWFpbFNlcnZpY2UgPSByZXF1aXJlKFwiLi4vVXRpbC9FbWFpbFNlcnZpY2VcIilcbnZhciByZWRpcyA9IHJlcXVpcmUoXCJyZWRpc1wiKTtcbnZhciBscmVkaXMgPSByZXF1aXJlKFwiLi9yZWRpcy1sb2NhbFwiKTtcbnZhciBtb21lbnQgPSByZXF1aXJlKFwibW9tZW50XCIpO1xudmFyIHJlZGlzU2VhcmNoID0gcmVxdWlyZShcIi4uL3JlZGlzZWFyY2hjbGllbnRcIik7XG52YXIgZnMgPSByZXF1aXJlKFwiZnNcIik7XG52YXIgbW9tZW50ID0gcmVxdWlyZSgnbW9tZW50JylcbnZhciBQYWNrYWdlVXRpbCA9IHJlcXVpcmUoXCIuLi9VdGlsL3BhY2thZ2V1dGlsXCIpLlBhY2thZ2VVdGlsaXR5O1xudmFyIHBhY2thZ2VVdGlsID0gbmV3IFBhY2thZ2VVdGlsKCk7XG5jb25zdCBQS0dfSURYID0gXCJpbmRleDpwYWNrYWdlc1wiO1xuY29uc3QgUEtHX0lEX0NPVU5URVIgPSBcInBhY2thZ2U6aWRcIjtcbnZhciBkYXRhQ29udGV4dCA9IHJlcXVpcmUoJy4vZGF0YUNvbnRleHQnKVxuY29uc3QgUEtHX1BSRUZJWCA9IFwicGFja2FnZXM6XCI7XG5jb25zdCBBV0JfSUQgPSBcImF3YjppZFwiXG5jb25zdCBJTkRFWF9BV0IgPSBcImluZGV4OmF3YlwiXG5jb25zdCBSRUNfUEtHID0gXCJwa2c6cmVjOlwiXG52YXIgdW5pcUlkID0gcmVxdWlyZShcInVuaXFpZFwiKTsgXG52YXIgQ3VzdG9tZXJTZXJ2aWNlID0gcmVxdWlyZSgnLi9DdXN0b21lclNlcnZpY2UnKS5DdXN0b21lclNlcnZpY2U7IFxudmFyIGN1c3RvbWVyU2VydmljZSA9IG5ldyBDdXN0b21lclNlcnZpY2UoKVxuY29uc3QgUEtHX1NUQVRVUyA9IHsgXG4gIDEgOiBcIlJlY2VpdmVkXCIsXG4gIDI6IFwiTG9hZGVkIG9uIEFpckNyYWZ0XCIsXG4gIDM6IFwiSW4gVHJhbnNpdFwiLFxuICA0OiBcIlJlY2lldmVkIGluIE5BU1wiLFxuICA1OiBcIlJlYWR5IGZvciBQaWNrdXAgLyBEZWxpdmVyeVwiLFxuICA2OiBcIkRlbGl2ZXJlZFwiXG5cbn07IFxuY29uc3QgSU5ERVhfU0hJUFBFUiA9IFwiaW5kZXg6c2hpcHBlclwiXG5yZWRpcy5hZGRDb21tYW5kKFwiZnQuYWdncmVnYXRlXCIpXG5jb25zdCBhd2JJbmRleCA9IHJlZGlzU2VhcmNoKHJlZGlzLCBJTkRFWF9BV0IsIHtcbiAgY2xpZW50T3B0aW9uczogbHJlZGlzLnNlYXJjaENsaWVudERldGFpbHNcbn0pO1xuY29uc3QgcGFja2FnZUluZGV4ID0gcmVkaXNTZWFyY2gocmVkaXMsIFBLR19JRFgsIHtcbiAgY2xpZW50T3B0aW9uczogbHJlZGlzLnNlYXJjaENsaWVudERldGFpbHNcbn0pO1xuY29uc3Qgc2hpcHBlckluZGV4ID0gcmVkaXNTZWFyY2gocmVkaXMsIElOREVYX1NISVBQRVIsIHtcbiAgY2xpZW50T3B0aW9uczogbHJlZGlzLnNlYXJjaENsaWVudERldGFpbHNcbn0pO1xuZnVuY3Rpb24gZ2V0UGFja2FnZVZvbHVtbmUobVBhY2thZ2Upe1xuXG4gIHJldHVybiAwOyBcbn1cbmZ1bmN0aW9uIGNyZWF0ZURvY3VtZW50KHRQYWNrYWdlKSB7XG4gIHZhciBwYWNrYWdlRG9jdW1lbnQgPSB7XG4gICAgaWQ6dFBhY2thZ2UuaWQsXG4gICAgdHJhY2tpbmdObzogdFBhY2thZ2UudHJhY2tpbmdObyxcbiAgICBza3lib3g6IHRQYWNrYWdlLnNreWJveCxcbiAgICBkYXRlUmVjaWV2ZWQgOiBtb21lbnQoKS51bml4KCksIFxuICAgIGF3YjowLCBcbiAgICBtaWQ6MCxcbiAgICB2b2x1bWU6IGdldFBhY2thZ2VWb2x1bW5lKHRQYWNrYWdlKSxcbiAgICB3ZWlnaHQ6dFBhY2thZ2Uud2VpZ2h0LFxuICAgIHBpZWNlczp0UGFja2FnZS5waWVjZXMsXG4gICAgY3VzdG9tZXI6IHRQYWNrYWdlLmN1c3RvbWVyLFxuICAgIHNoaXBwZXI6IHRQYWNrYWdlLnNoaXBwZXIsXG4gICAgZGVzY3JpcHRpb246IHRQYWNrYWdlLmRlc2NyaXB0aW9uLFxuICAgIGRpbWVuc2lvbnM6dFBhY2thZ2UuZGltZW5zaW9ucyxcbiAgICBjYXJyaWVyOnRQYWNrYWdlLmNhcnJpZXIsXG4gICAgLy9za3lib3hWOiB0UGFja2FnZS5za3lib3gsIGFkZCBkaW1lbmlvbiBcbiAgICBzdGF0dXM6IHRQYWNrYWdlLnN0YXR1cyxcbiAgICBtaWQ6IHRQYWNrYWdlLm1pZCxcbiAgICB2YWx1ZTogdFBhY2thZ2UudmFsdWUsXG4gICAgXG4gIH07XG4gIGNvbnNvbGUubG9nKFwiYWJvdXQgdG8gYWRkIHRoZSBwYWNrYWdlIHRvIHRoZSBpbmRleFwiKTtcbiAgcmV0dXJuIHBhY2thZ2VEb2N1bWVudDtcbn1cbmZ1bmN0aW9uIHNldFBhY2thZ2VJblRyYW5zaXQoa2V5cywgbXNlYXJjaGVyKSB7XG4gIHJldHVybiBuZXcgUHJvbWlzZSgocmVzb2x2ZSwgcmVqZWN0KSA9PiB7XG4gICAgdmFyIGJhdGNoZXIgPSBtc2VhcmNoZXIuY2xpZW50LmJhdGNoKCk7XG4gICAga2V5cy5mb3JFYWNoKGVsZW1lbnQgPT4ge1xuICAgICAgdmFyIHZhbHVlID0ge1xuICAgICAgICBzdGF0dXM6IDIsXG4gICAgICAgIGxvY2F0aW9uOiBcIkluIFRyYW5zaXRcIlxuICAgICAgfTtcbiAgICAgIGNvbnNvbGUubG9nKGVsZW1lbnQgKyBcImlzIHRoZSBlbGVtZW50XCIpO1xuXG4gICAgICBiYXRjaGVyLmhtc2V0KFBLR19QUkVGSVggKyBlbGVtZW50LCB2YWx1ZSk7XG4gICAgfSk7XG4gICAgYmF0Y2hlci5leGVjKChlcnIsIHJlc3VsdCkgPT4ge1xuICAgICAgY29uc29sZS5sb2cocmVzdWx0KTtcbiAgICAgIC8vcmVhZGQgdGhlIGRvY3VtZW50cyBoZXJlXG4gICAgICBrZXlzLmZvckVhY2goZWxlbWVudCA9PiB7XG4gICAgICAgIGFkZFBhY2thZ2VUb0luZGV4KGVsZW1lbnQsIG1zZWFyY2hlcik7XG4gICAgICB9KTtcbiAgICAgIHJlc29sdmUocmVzdWx0KTtcbiAgICB9KTtcbiAgfSk7XG59XG5cbmZ1bmN0aW9uIGFkZFBhY2thZ2VUb0luZGV4KHRyYWNraW5nTm8sIG1zZWFyY2hlcikge1xuICBscmVkaXMuZ2V0UGFja2FnZSh0cmFja2luZ05vKS50aGVuKHBhY2sgPT4ge1xuICAgIG1zZWFyY2hlci5kZWxEb2N1bWVudChQS0dfSURYLCBgJHtwYWNrLm1pZH0tJHt0cmFja2luZ05vfWAsIChlcnIsIGRvbmUpID0+IHtcbiAgICAgIHZhciBkb2N1bWVudCA9IGNyZWF0ZURvY3VtZW50KHBhY2spO1xuICAgICAgY29uc29sZS5sb2coXCJyZWFkZGluZyBwYWNrYWdlIHRvIHRoZSBpbmRleCBsaWtlIGEgYm9zcyBcIiArIHRyYWNraW5nTm8pO1xuICAgICAgbXNlYXJjaGVyLmFkZChwYWNrLm1pZCArIFwiLVwiICsgcGFjay50cmFja2luZ05vLCBkb2N1bWVudCk7XG4gICAgfSk7XG4gIH0pO1xufVxuZXhwb3J0IGNsYXNzIFBhY2thZ2VTZXJ2aWNlIHtcbiAgY29uc3RydWN0b3IoKSB7XG4gICAgdGhpcy5zZXR1cEluZGV4KCk7XG4gIH1cbiAgc2V0dXBJbmRleCgpIHtcbiAgICB0aGlzLm15U2VhcmNoID0gcmVkaXNTZWFyY2gocmVkaXMsIFBLR19JRFgsIHtcbiAgICAgIGNsaWVudE9wdGlvbnM6IGxyZWRpcy5zZWFyY2hDbGllbnREZXRhaWxzXG4gICAgfSk7XG4gIH1cbiAgZ2V0TmV3QXdiKCl7XG4gICAgcmV0dXJuIG5ldyBQcm9taXNlKChyZXNvbHZlLHJlamVjdCk9PntcbiAgICAgIGRhdGFDb250ZXh0LnJlZGlzQ2xpZW50LmV4aXN0cyhBV0JfSUQsKGVycixyZXN1bHQpPT57XG4gICAgICAgIGNvbnNvbGUubG9nKHJlc3VsdCk7IFxuICAgICAgICBpZiAocmVzdWx0ICE9IFwiMVwiKXtcbiAgICAgICAgICBkYXRhQ29udGV4dC5yZWRpc0NsaWVudC5zZXQoQVdCX0lEID09IDEwMDAwMCwoZXJyLGluaXRSZXN1bHQpPT57XG4gICAgICAgICAgICBkYXRhQ29udGV4dC5yZWRpc0NsaWVudC5pbmNyKEFXQl9JRCwoZXJyLG5ld0lkKT0+e1xuICAgICAgICAgICAgICByZXNvbHZlKHthd2I6bmV3SWR9KVxuICAgICAgICAgICAgfSlcbiAgICAgICAgICB9KVxuICAgICAgICB9XG4gICAgICAgIGVsc2Uge1xuICAgICAgICAgIGRhdGFDb250ZXh0LnJlZGlzQ2xpZW50LmluY3IoQVdCX0lELChlcnIsbmV3SWQpPT57XG4gICAgICAgICAgICByZXNvbHZlKHthd2I6bmV3SWR9KVxuICAgICAgICAgIH0pXG4gICAgICAgIH1cbiAgICAgIH0pXG4gICAgfSk7XG4gIH1cbiAgc2F2ZUF3Yihhd2Ipe1xuICAgIHJldHVybiBuZXcgUHJvbWlzZSgocmVzb2x2ZSxyZWplY3QpPT57XG4gICAgICBjb25zb2xlLmxvZygnc2F2aW5nLi4uJyxhd2IsbW9tZW50KCkudG9TdHJpbmcoXCJoaDptbTpzc1wiKSlcbiAgICAgIGlmIChhd2IuaWQgIT1cIlwiKXtcbiAgICAgICAgYXdiLnVwZGF0ZWRfYnkgPSBhd2IudXNlcm5hbWU7IFxuICAgICAgICBhd2IuZGF0ZV91cGRhdGVkID0gbW9tZW50KCkudW5peCgpOyBcbiAgICAgICAgYXdiSW5kZXgudXBkYXRlKGF3Yi5pZCxhd2IsKGVycjEsYXdiUmVzKT0+e1xuICAgICAgICAgIGlmIChlcnIxKXtcbiAgICAgICAgICAgIGNvbnNvbGUubG9nKCdzYXZpbmcgZXJyJyxlcnIxKVxuICAgICAgICAgICAgcmVzb2x2ZSh7c2F2ZWQ6ZmFsc2V9KVxuICAgICAgICAgIH1cbiAgICAgICAgICByZXNvbHZlKHtzYXZlZDp0cnVlLCBpZDphd2IuaWR9KVxuICAgICAgICB9KVxuICAgICAgfVxuICAgICAgZWxzZXtcbiAgICAgIGRhdGFDb250ZXh0LnJlZGlzQ2xpZW50LmluY3IoQVdCX0lELChlcnIscmVwbHkpPT57XG4gICAgICAgIGF3Yi5pZCA9IHJlcGx5OyBcbiAgICAgICAgYXdiLnN0YXR1cyA9IDE7IFxuICAgICAgICBpZiAoYXdiLmludm9pY2Upe1xuICAgICAgICAgIGF3Yi5oYXNEb2NzID0gMVxuICAgICAgICAgIGNvbnNvbGUubG9nKFwiSEFTIERPQ0NDQ0NcIilcbiAgICAgICAgfVxuICAgICAgICBlbHNlIHtcbiAgICAgICAgICBhd2IuaGFzRG9jcyA9IDAgOyBcbiAgICAgICAgICBjb25zb2xlLmxvZyhcIkhBUyBOTyBET0NDQ0NDXCIpXG4gICAgICAgIH1cblxuICAgICAgICBhd2IuY3JlYXRlZF9ieSA9IGF3Yi51c2VybmFtZTsgXG4gICAgICAgIGRlbGV0ZSBhd2IudXNlcm5hbWU7XG4gICAgICAgIGF3Yi5kYXRlQ3JlYXRlZCA9IG1vbWVudCgpLnVuaXgoKTsgXG4gICAgICAgICAgYXdiSW5kZXguYWRkKGF3Yi5pZCxhd2IsKGVycjEsYXdiUmVzKT0+e1xuICAgICAgICAgICAgaWYgKGVycjEpe1xuICAgICAgICAgICAgICBjb25zb2xlLmxvZygnc2F2aW5nIGVycicsZXJyMSlcbiAgICAgICAgICAgICAgcmVzb2x2ZSh7c2F2ZWQ6ZmFsc2V9KVxuICAgICAgICAgICAgfVxuICAgICAgICAgICAgcmVzb2x2ZSh7c2F2ZWQ6dHJ1ZSwgaWQ6cmVwbHl9KVxuICAgICAgICAgIH0pXG4gICAgICB9KVxuICAgIH1cbiAgICAgIFxuICAgICAgXG4gICAgfSlcbiAgfVxuICBnZXRBd2JPdmVydmlldyhpZCl7XG4gICAgLy8gZ2V0IHRoZSBhd2IgcGFja2FnZXMgYW5kIGFkZCBldmVyeXRoaW5nIGluIFxuICAgIHJldHVybiBuZXcgUHJvbWlzZSgocmVzb2x2ZSxyZWplY3QpPT57XG4gICAgICBwYWNrYWdlSW5kZXguc2VhcmNoKGBAYXdiOlske2lkfSAke2lkfV1gLHtudW1iZXJPZlJlc3VsdHM6NTAwMCxvZmZzZXQ6MCxzb3J0Qnk6J3BrZ05vJ30sKGVycixwYWNrYWdlcyk9PntcbiAgICAgICAgdmFyIHdlaWdodCA9IDAgOyBcbiAgICAgICAgdmFyIHBpZWNlcyA9IHBhY2thZ2VzLnRvdGFsUmVzdWx0czsgXG4gICAgICAgIHZhciBkZXNjcmlwdGlvbiA9IFwiXCJcbiAgICAgICAgcGFja2FnZXMucmVzdWx0cy5mb3JFYWNoKHBhY2thZ2UxID0+IHtcbiAgICAgICAgICBpZiAoZGVzY3JpcHRpb24gPT1cIlwiKVxuICAgICAgICAgICAgZGVzY3JpcHRpb24gPSBwYWNrYWdlMS5kb2MuZGVzY3JpcHRpb247IFxuICAgICAgICAgIHdlaWdodCArPSBOdW1iZXIocGFja2FnZTEuZG9jLndlaWdodClcbiAgICAgICAgfSk7XG4gICAgICAgIHZhciBkYXRhICA9IHt3ZWlnaHQ6d2VpZ2h0LGRlc2NyaXB0aW9uOmRlc2NyaXB0aW9uLHBpZWNlczpwaWVjZXN9XG4gICAgICAgIGNvbnNvbGUubG9nKGRhdGEsXCJBV0IgREVUQUlMU1wiKTsgXG4gICAgICAgIHJlc29sdmUoIGRhdGEpXG4gICAgICB9KVxuICAgIH0pXG4gICBcbiAgfVxuICBnZXRBd2JEZXRhaWxzKGlkKXtcbiAgICB2YXIgc3J2ID0gdGhpczsgXG4gICAgcmV0dXJuIG5ldyBQcm9taXNlKChyZXNvbHZlLHJlamVjdCk9PntcbiAgICAgIGNvbnNvbGUubG9nKGBAYXdiOlske2lkfSAke2lkfV1gKVxuICAgICAgdmFyICBwYWNrYWdlbGlzdCAgPSBbXVxuICAgICBpZiAoaXNOYU4oaWQpKVxuICAgICB7XG4gICAgICAgcmVzb2x2ZShwYWNrYWdlbGlzdClcbiAgICAgICByZXR1cm4gOyBcbiAgICAgfVxuXG4gICAgICBwYWNrYWdlSW5kZXguc2VhcmNoKGBAYXdiOlske2lkfSAke2lkfV1gLHtudW1iZXJPZlJlc3VsdHM6NTAwMCxvZmZzZXQ6MCxzb3J0Qnk6XCJwa2dOb1wifSwoZXJyLHBhY2thZ2VzKT0+e1xuICAgICAgICBpZiAoZXJyKVxuICAgICAgICAgY29uc29sZS5sb2coZXJyKVxuICAgICAgXG4gICAgICAgIHZhciAgcGFja2FnZWxpc3QgID0gW11cbiAgICAgICAgdmFyIGNvdW50ID0gMTsgXG4gICAgICAgIHBhY2thZ2VzLnJlc3VsdHMuZm9yRWFjaChwYWNrYWdlMSA9PiB7XG5cbiAgICAgICAgICBpZiAocGFja2FnZTEuZG9jLnRyYWNraW5nTm8ubGVuZ3RoID4gNyl7XG4gICAgICAgICAgICAvL29ubHkgZGlzcGxheSB0aGUgbGFzdCA3IFxuICAgICAgICAgICAgcGFja2FnZTEuZG9jLnRyYWNraW5nTm8gPSBwYWNrYWdlMS5kb2MudHJhY2tpbmdOby5zdWJzdHJpbmcocGFja2FnZTEuZG9jLnRyYWNraW5nTm8ubGVuZ3RoIC03KVxuICAgICAgICAgICAgXG4gICAgICAgICAgfVxuICAgICAgICAgIHBhY2thZ2UxLmRvYy5wYWNrYWdlSW5kZXggPSBjb3VudDtcbiAgICAgICAgICBjb3VudCArKzsgXG4gICAgICAgICAgcGFja2FnZWxpc3QucHVzaCggcGFja2FnZTEuZG9jKVxuICAgICAgICB9KTtcbiAgICAgICBcbiAgICAgICBcbiAgICAgICAgcmVzb2x2ZSggcGFja2FnZWxpc3QpXG4gICAgICB9KVxuICAgIH0pXG4gIH1cbiAgbGlzdE5vRG9jc0ZsbCgpe1xuICAgIHJldHVybiBuZXcgUHJvbWlzZSgocmVzb2x2ZSxyZWplY3QpPT57XG4gICAgICAgYXdiSW5kZXguc2VhcmNoKFwiQHN0YXR1czpbMSAxXSBAaGFzRG9jczpbMCAwXVwiLHtvZmZzZXQ6MCxudW1iZXJPZlJlc3VsdHM6NTAwMCxzb3J0Qnk6J2lkJyxzb3J0RGlyOlwiREVTQ1wifSwoZXJyLGF3YnMpPT57XG4gICAgICAgICB2YXIgYXdiTGlzdCA9IFtdOyBcbiAgICAgICAgIFByb21pc2UuYWxsKGF3YnMucmVzdWx0cy5tYXAoYXdiPT5jdXN0b21lclNlcnZpY2UuZ2V0Q3VzdG9tZXIoYXdiLmRvYy5jdXN0b21lcklkKSkpLnRoZW4oY3VzdG9tZXJzPT57XG4gICAgICAgICAgIFByb21pc2UuYWxsKGF3YnMucmVzdWx0cy5tYXAoYXdiPT50aGlzLmdldEF3Yk92ZXJ2aWV3KGF3Yi5kb2MuaWQpKSkudGhlbihkZXRhaWxzPT57XG4gICAgICAgICAgICBjb25zb2xlLmxvZyhcImdvdCB0aGUgY3VzdG9tZXJzXCIsY3VzdG9tZXJzLCBhd2JzKVxuICAgICAgICAgICAgZm9yKHZhciBpID0wIDsgaSA8IGF3YnMucmVzdWx0cy5sZW5ndGggOyBpKysgKXtcbiAgICAgICAgICAgICAgdmFyIGF3YiA9IGF3YnMucmVzdWx0c1tpXTsgXG4gICAgICAgICAgICAgIGF3Yi5kb2MuZGF0ZUNyZWF0ZWQgPSBtb21lbnQudW5peChhd2IuZG9jLmRhdGVDcmVhdGVkKS5mb3JtYXQoXCJZWVlZLU1NLUREIGhoOm1tIEFcIilcbiAgICAgICAgICAgICAgLy93ZSBuZWVkIHRvIGdldCB0aGUgY3VzdG9tZXIgXG4gICAgICAgICAgICAgIGF3Yi5kb2MuY29uc2lnbmVlID0gY3VzdG9tZXJzW2ldLm5hbWU7IFxuICAgICAgICAgICAgICBhd2IuZG9jLndlaWdodCA9IGRldGFpbHNbaV0ud2VpZ2h0OyBcbiAgICAgICAgICAgICAgYXdiLmRvYy5wbWIgPSBjdXN0b21lcnNbaV0ucG1iOyBcbiAgICAgICAgICAgICAgYXdiLmRvYy5kZXNjcmlwdGlvbiA9IGRldGFpbHNbaV0uZGVzY3JpcHRpb247IFxuICAgICAgICAgICAgICBhd2IuZG9jLnBpZWNlcyA9IGRldGFpbHNbaV0ucGllY2VzOyBcbiAgICAgICAgICAgICAgaWYgKGN1c3RvbWVyc1tpXS5wbWIgPT0gJycpe1xuICAgICAgICAgICAgICAgIGF3Yi5kb2MucG1iID0gJzkwMDAnXG4gICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgY29uc29sZS5sb2coJ3B1c2hpbmcgJyxhd2IpXG4gICAgICAgICAgICAgIC8vd2UgbmVlZCB0byBnZXQgYWxsIHRoZSBwYWNrYWdlcyBcbiAgICAgICAgICAgICAgYXdiTGlzdC5wdXNoKGF3Yi5kb2MpXG4gICAgICAgICAgICAgfVxuICAgICAgICAgICAgIGF3Ykxpc3QgPSBhd2JMaXN0LnJldmVyc2UoKTtcbiAgICAgICAgICAgICByZXNvbHZlKHthd2JzOmF3Ykxpc3R9KVxuICAgICAgICAgICB9KVxuICAgICAgICAgIFxuICAgICAgICAgIH0pLmNhdGNoKGVycj0+e1xuICAgICAgICAgICAgY29uc29sZS5sb2coZXJyKTsgXG4gICAgICAgICAgfSlcbiAgICAgICAgIFxuICAgICAgICAvLyAgYXdicy5yZXN1bHRzLmZvckVhY2goYXdiID0+IHtcbiAgICAgICAgICAgXG4gICAgICAgICAgXG4gICAgICAgIC8vICB9KTtcbiAgICAgICAgIFxuICAgICAgIH0pXG4gICAgfSlcbiAgfVxuXG4gIGxpc3RBd2JpbkZsbCgpe1xuICAgIHJldHVybiBuZXcgUHJvbWlzZSgocmVzb2x2ZSxyZWplY3QpPT57XG4gICAgICAgYXdiSW5kZXguc2VhcmNoKFwiQHN0YXR1czpbMSAxXSBAaGFzRG9jczpbMSAxXVwiLHtvZmZzZXQ6MCxudW1iZXJPZlJlc3VsdHM6NTAwMCxzb3J0Qnk6J2lkJyxzb3J0RGlyOidERVNDJ30sKGVycixhd2JzKT0+e1xuICAgICAgICAgdmFyIGF3Ykxpc3QgPSBbXTsgXG4gICAgICAgICBQcm9taXNlLmFsbChhd2JzLnJlc3VsdHMubWFwKGF3Yj0+Y3VzdG9tZXJTZXJ2aWNlLmdldEN1c3RvbWVyKGF3Yi5kb2MuY3VzdG9tZXJJZCkpKS50aGVuKGN1c3RvbWVycz0+e1xuICAgICAgICAgICBQcm9taXNlLmFsbChhd2JzLnJlc3VsdHMubWFwKGF3Yj0+dGhpcy5nZXRBd2JPdmVydmlldyhhd2IuZG9jLmlkKSkpLnRoZW4oZGV0YWlscz0+e1xuICAgICAgICAgICAgY29uc29sZS5sb2coXCJnb3QgdGhlIGN1c3RvbWVyc1wiLGN1c3RvbWVycywgYXdicylcbiAgICAgICAgICAgIGZvcih2YXIgaSA9MCA7IGkgPCBhd2JzLnJlc3VsdHMubGVuZ3RoIDsgaSsrICl7XG4gICAgICAgICAgICAgIHZhciBhd2IgPSBhd2JzLnJlc3VsdHNbaV07IFxuICAgICAgICAgICAgICBhd2IuZG9jLmRhdGVDcmVhdGVkID0gbW9tZW50LnVuaXgoYXdiLmRvYy5kYXRlQ3JlYXRlZCkuZm9ybWF0KFwiWVlZWS1NTS1ERCBoaDptbSBBXCIpXG4gICAgICAgICAgICAgIC8vd2UgbmVlZCB0byBnZXQgdGhlIGN1c3RvbWVyIFxuICAgICAgICAgICAgICBhd2IuZG9jLmNvbnNpZ25lZSA9IGN1c3RvbWVyc1tpXS5uYW1lOyBcbiAgICAgICAgICAgICAgYXdiLmRvYy5wbWIgPSBjdXN0b21lcnNbaV0ucG1iOyBcbiAgICAgICAgICAgICAgYXdiLmRvYy53ZWlnaHQgPSBkZXRhaWxzW2ldLndlaWdodDsgXG4gICAgICAgICAgICAgIGF3Yi5kb2MuZGVzY3JpcHRpb24gPSBkZXRhaWxzW2ldLmRlc2NyaXB0aW9uOyBcbiAgICAgICAgICAgICAgYXdiLmRvYy5waWVjZXMgPSBkZXRhaWxzW2ldLnBpZWNlczsgXG4gICAgICAgICAgICAgIGlmIChjdXN0b21lcnNbaV0ucG1iID09ICcnKXtcbiAgICAgICAgICAgICAgICBhd2IuZG9jLnBtYiA9ICc5MDAwJ1xuICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgIGNvbnNvbGUubG9nKCdwdXNoaW5nICcsYXdiKVxuICAgICAgICAgICAgICAvL3dlIG5lZWQgdG8gZ2V0IGFsbCB0aGUgcGFja2FnZXMgXG4gICAgICAgICAgICAgIGF3Ykxpc3QucHVzaChhd2IuZG9jKVxuICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICByZXNvbHZlKHthd2JzOmF3Ykxpc3R9KVxuICAgICAgICAgICB9KVxuICAgICAgICAgIFxuICAgICAgICAgIH0pLmNhdGNoKGVycj0+e1xuICAgICAgICAgICAgY29uc29sZS5sb2coZXJyKTsgXG4gICAgICAgICAgfSlcbiAgICAgICAgIFxuICAgICAgICAvLyAgYXdicy5yZXN1bHRzLmZvckVhY2goYXdiID0+IHtcbiAgICAgICAgICAgXG4gICAgICAgICAgXG4gICAgICAgIC8vICB9KTtcbiAgICAgICAgIFxuICAgICAgIH0pXG4gICAgfSlcbiAgfVxuICBnZXRBd2IoaWQpe1xuICAgIGNvbnN0IHNydiA9IHRoaXM7IFxuICAgIHJldHVybiBuZXcgUHJvbWlzZSgocmVzb2x2ZSxyZWplY3QpPT57XG4gICAgICBhd2JJbmRleC5nZXREb2MoaWQsKGVycixhd2IpPT57XG4gICAgICAgIC8vZ2V0IHRoZSBjdXN0b21lciBcbiAgICAgICAgY3VzdG9tZXJTZXJ2aWNlLmdldEN1c3RvbWVyKGF3Yi5kb2MuY3VzdG9tZXJJZCkudGhlbihjdXN0b21lcj0+e1xuICAgICAgICAgIGF3Yi5kb2MuY3VzdG9tZXIgPSBjdXN0b21lcjsgXG4gICAgICAgICAgc3J2LmdldEF3YkRldGFpbHMoaWQpLnRoZW4ocGFja2FnZXM9PntcbiAgICAgICAgICAgIC8vZ2V0IHRoZSBwYWNrYWdlcyBmb3IgdGhlIGF3YiBcbiAgICAgICAgICAgIGF3Yi5kb2MucGFja2FnZXMgPSBwYWNrYWdlczsgXG4gICAgICAgICAgICByZXNvbHZlKHthd2I6YXdiLmRvY30pICBcbiAgICAgICAgICB9KVxuICAgICAgICAgIFxuICAgICAgICB9KVxuICAgICAgICBcbiAgICAgIH0pXG4gICAgfSlcbiAgfVxuICB1cGRhdGVMb2NhdGlvbih0cmFja2luZ051bWJlcixsb2NhdGlvbl9pZCl7XG4gICAgcmV0dXJuIG5ldyBQcm9taXNlKChyZXNvbHZlLHJlamVjdCk9PntcbiAgICAgIHBhY2thZ2VJbmRleC5zZWFyY2goXCJAdHJhY2tpbmdObzpcIit0cmFja2luZ051bWJlcix7bG9jYXRpb246bG9jYXRpb25faWR9LChlcnIscGFja2FnZVJlc3VsdCk9PntcblxuICAgICAgfSlcbiAgICB9KVxuICB9XG4gIHNhdmVQYWNrYWdlVG9Bd2IobmV3UGFja2FnZSl7XG4gICAgcmV0dXJuIG5ldyBQcm9taXNlKChyZXNvbHZlLHJlc3VsdCk9PntcbiAgICAgIGlmIChuZXdQYWNrYWdlLmlkICE9XCIwXCIpe1xuICAgICAgICBwYWNrYWdlSW5kZXgudXBkYXRlKG5ld1BhY2thZ2UuaWQsbmV3UGFja2FnZSwoZXJyLHJlc3VsdCk9PntcbiAgICAgICAgICBpZiAoZXJyKVxuICAgICAgICAgICAgY29uc29sZS5sb2coZXJyKTsgXG4gICAgICAgICAgcmVzb2x2ZSh7c2F2ZWQ6dHJ1ZSxpZDpuZXdQYWNrYWdlLmlkfSlcbiAgICAgICAgfSlcbiAgICAgIH1cbiAgICAgIGVsc2Uge1xuICAgICAgICBkYXRhQ29udGV4dC5yZWRpc0NsaWVudC5pbmNyKFBLR19JRF9DT1VOVEVSLChlcnIsaWQpPT57XG4gICAgICAgICAgbmV3UGFja2FnZS5pZCA9IGlkOyBcbiAgICAgICAgICBwYWNrYWdlSW5kZXguYWRkKGlkLG5ld1BhY2thZ2UsKGVycixyZXN1bHQpPT57XG4gICAgICAgICAgICBpZiAoZXJyKVxuICAgICAgICAgICAgICBjb25zb2xlLmxvZyhlcnIpOyBcbiAgICAgICAgICAgIHJlc29sdmUoe3NhdmVkOnRydWUsaWQ6aWR9KVxuICAgICAgICAgIH0pXG4gICAgICAgIH0pXG4gICAgICB9XG4gICBcbiAgICB9KVxuICB9XG4gIGdldFNoaXBwZXIoaWQpe1xuICAgIHJldHVybiBuZXcgUHJvbWlzZSgocmVzb2x2ZSxyZWplY3QpPT57XG4gICAgIHNoaXBwZXJJbmRleC5nZXREb2MoaWQsKGVycixzcmVzdWx0KT0+e1xuICAgICAgIGlmIChlcnIpXG4gICAgICAgIHJlc29sdmUoaWQpO1xuXG4gICAgICAgIHJlc29sdmUoc3Jlc3VsdC5kb2MpOyBcbiAgICAgfSlcbiAgICB9KVxuICB9XG4gIGNyZWF0ZUNvbnNvbGF0ZWQocGFja2FnZXMsdXNlcm5hbWUsYm94U2l6ZSl7XG4gICAgdmFyIHNydiA9IHRoaXM7IFxuICAgIHJldHVybiBuZXcgUHJvbWlzZSgocmVzb2x2ZSxyZWplY3QpPT57XG4gICAgICB2YXIgYXdiSW5mbyA9IHsgXG4gICAgICAgIGlkOiBcIlwiLFxuICAgICAgICBpc1NlZDowLFxuICAgICAgICBoYXNEb2NzOiBcIjBcIixcbiAgICAgICAgaW52b2ljZU51bWJlcjpcIlwiLFxuICAgICAgICB2YWx1ZTpcIjBcIixcbiAgICAgICAgY3VzdG9tZXJJZDoyNDE5NyxcbiAgICAgICAgc2hpcHBlcjpcIjQ4MlwiLCAvLyB3ZSBzaG91bGQgZ2V0IGFuIGlkIGhlcmUgXG4gICAgICAgIGNhcnJpZXI6XCJVU1BTXCIsXG4gICAgICAgIGhhem1hdDpcIlwiLFxuICAgICAgICB1c2VybmFtZTogIHVzZXJuYW1lXG4gICAgICAgXG4gICAgfTtcbiAgICBzcnYuc2F2ZUF3Yihhd2JJbmZvKS50aGVuKGF3YlJlc3VsdD0+e1xuICAgICAgIC8vYWRkIFxuICAgICAgICAgIHZhciBjUGFja2FnZSA9IHtcbiAgICAgICAgICAgIGlkOjAsXG4gICAgICAgICAgICB0cmFja2luZ05vOiB1bmlxSWQoKSxcbiAgICAgICAgICAgIGRlc2NyaXB0aW9uOiBcIkNvbnNvbGlkYXRlZCBQYWNrYWdlXCIsXG4gICAgICAgICAgICB3ZWlnaHQ6MCwgXG4gICAgICAgICAgICBkaW1lbnNpb25zOiAgYCR7Ym94U2l6ZX14JHtib3hTaXplfXgke2JveFNpemV9YCxcbiAgICAgICAgICAgIGF3Yjphd2JSZXN1bHQuaWQsIFxuICAgICAgICAgICAgaXNDb25zb2xpZGF0ZWQ6IFwiMVwiLCBcbiAgICAgICAgICAgIGNyZWF0ZWRfYnk6IHVzZXJuYW1lLCBcbiAgICAgICAgICBcbiAgICAgICAgfTsgXG4gICAgICAgIHNydi5zYXZlUGFja2FnZVRvQXdiKGNQYWNrYWdlKS50aGVuKHBrZ1Jlc3VsdD0+e1xuICAgICAgICAgIC8vIGdldCB0aGUgaWQgXG4gICAgICAgICAgLy9cbiAgICAgICAgICB2YXIgYmF0Y2ggPSBkYXRhQ29udGV4dC5yZWRpc0NsaWVudC5iYXRjaCgpOyBcbiAgICAgICAgICB2YXIgcGtnQmF0Y2ggPSBkYXRhQ29udGV4dC5yZWRpc0NsaWVudC5iYXRjaCgpOyBcblxuICAgICAgICAgIHBhY2thZ2VzLmZvckVhY2gocGtnID0+IHtcbiAgICAgICAgICAgIC8vdGhlc2UgYXJlIGJhcmNvZGVzIFxuICAgICAgICAgICAgYmF0Y2guc2FkZChcImNvbnNvbGlkYXRlZDpwa2c6XCIrcGtnUmVzdWx0LmlkLHBrZylcbiAgICAgICAgICAgIHBrZ0JhdGNoLmhtZ2V0KFBLR19QUkVGSVgrZ2V0UGFja2FnZUlkRnJvbUJhckNvZGUocGtnKSxcIndlaWdodFwiKVxuICAgICAgICAgIH0pO1xuICAgICAgICAgIGJhdGNoLmV4ZWMoKGVycixyZXN1bHRzKT0+e1xuICAgICAgICAgICAgLy9cbiAgICAgICAgICAgIHBrZ0JhdGNoLmV4ZWMoKGVycjEscmVzdWx0cyk9PntcbiAgICAgICAgICAgICAgdmFyIHRvdGFsV2VpZ2h0ID0gMDsgXG4gICAgICAgICAgICAgIHJlc3VsdHMuZm9yRWFjaCh3ZWlnaHQgPT4ge1xuICAgICAgICAgICAgICAgIGlmIChpc05hTihOdW1iZXIod2VpZ2h0KSkgPT0gZmFsc2UpXG4gICAgICAgICAgICAgICAgICB0b3RhbFdlaWdodCArPSBOdW1iZXIod2VpZ2h0KTtcbiAgICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICAgIC8vd2UgbmVlZCB0byB1cGRhdGUgdGhlIHRvdGFsIHdlaWdodCBvZiB0aGUgcGFja2FnZSBub3cgXG4gICAgICAgICAgICAgIHNydi5wYWNrYWdlSW5kZXgudXBkYXRlKGNQYWNrYWdlLmlkLHt3ZWlnaHQ6dG90YWxXZWlnaHR9KVxuICAgICAgICAgICAgfSlcbiAgICAgICAgICAgIFxuICAgICAgICAgICAgcmVzb2x2ZSh7c2F2ZWQ6dHJ1ZSxpZDpwa2dSZXN1bHQuaWR9KVxuICAgICAgICAgIH0pXG4gICAgICAgIH0pXG4gICAgICAgIFxuICAgIH0pXG5cbiAgIFxuICAgICAgLy92YWxpZGF0ZSB0aGUgcGFja2FnZSBcbiAgICBcblxuICAgIH0pXG4gIH1cbiAgc2F2ZVBhY2thZ2UoYm9keSl7XG4gICAgcmV0dXJuIG5ldyBQcm9taXNlKChyZXNvbHZlLHJlamVjdCk9PntcbiAgICAgIHZhciBjUGFja2FnZSA9IHtcbiAgICAgICAgXG4gICAgICAgIHNreWJveDogYm9keS5za3lib3gsXG4gICAgICAgIGN1c3RvbWVyOiBib2R5LmN1c3RvbWVyLnJlcGxhY2UoXCItXCIsIFwiXCIpLnRyaW0oKSxcbiAgICAgICAgdHJhY2tpbmdObzogYm9keS50cmFja2luZyxcbiAgICAgICAgZGVzY3JpcHRpb246IGJvZHkuZGVzY3JpcHRpb24sXG4gICAgICAgIHNoaXBwZXI6IGJvZHkuc2hpcHBlcixcbiAgICAgICAgY2Fycmllcjpib2R5LmNhcnJpZXIsXG4gICAgICAgIHZhbHVlOiBOdW1iZXIoYm9keS52YWx1ZSksXG4gICAgICAgIHBpZWNlczogTnVtYmVyKGJvZHkucGllY2VzKSxcbiAgICAgICAgd2VpZ2h0OiBOdW1iZXIoYm9keS53ZWlnaHQpLFxuICAgICAgICBkaW1lbnNpb25zOiBib2R5LmRpbWVuc2lvbnMsXG4gICAgICAgIHN0YXR1czogMSxcbiAgICAgICAgbG9jYXRpb246IFwiRkxMXCIsXG4gICAgICAgIG1pZDogMCxcbiAgICAgICAgYXdiOjAsXG4gICAgICAgIC8vaGFzT3B0OiB0cnVlLFxuICAgICAgICAvL210eXBlOiBib2R5Lm10eXBlXG4gICAgICB9O1xuICAgICAgLy92YWxpZGF0ZSB0aGUgcGFja2FnZSBcbiAgICAgIGRhdGFDb250ZXh0LnJlZGlzQ2xpZW50LmluY3IoUEtHX0lEX0NPVU5URVIsKGVycixpZCk9PntcbiAgICAgICAgY1BhY2thZ2UuaWQgPSBpZDsgXG4gICAgICAgIGRhdGFDb250ZXh0LnJlZGlzQ2xpZW50LnNldChQS0dfUFJFRklYK2lkLGNQYWNrYWdlLChlcnIscmVzcG9uc2UpPT57XG4gICAgICAgICAgaWYgKGVycil7XG4gICAgICAgICAgICByZWplY3Qoe3NhdmVkOmZhbHNlLGVycjplcnJ9KVxuICAgICAgICAgIH1cbiAgICAgICAgICAgdmFyIGluZGV4UGFja2FnZSA9ICBjcmVhdGVEb2N1bWVudChjUGFja2FnZSk7IFxuICAgICAgICAgICBjb25zb2xlLmxvZyhpbmRleFBhY2thZ2UpOyBcbiAgICAgICAgICAgcGFja2FnZUluZGV4LmFkZChjUGFja2FnZS5pZCxpbmRleFBhY2thZ2UsKGVycjEsZG9jUmVzdWx0KT0+e1xuICAgICAgICAgICAgIGNvbnNvbGUubG9nKGRvY1Jlc3VsdCk7IFxuICAgICAgICAgICAgIGlmKGVycjEpe1xuICAgICAgICAgICAgICAgcmVqZWN0KHtzYXZlZDpmYWxzZSxlcnI6ZXJyMX0pXG4gICAgICAgICAgICAgfVxuICAgICAgICAgICAgIHJlc29sdmUoe3NhdmVkOnRydWV9KVxuICAgICAgICAgICB9KVxuXG4gICAgICAgIH0pXG4gICAgICB9KTtcbiAgICBcblxuXG4gICAgfSlcbiAgfVxuXG4gIGdldE1hbmlmZXN0UGFja2FnZXMoKXtcbiAgICByZXR1cm4gbmV3IFByb21pc2UoKHJlc29sdmUscmVqZWN0KT0+e1xuICAgICAgXG4gICAgICB0aGlzLm15U2VhcmNoLnNlYXJjaChcbiAgICAgICAgYEBtaWQ6WzAgMF1gLFxuICAgICAgICB7IG9mZnNldDogMCwgbnVtYmVyT2ZSZXN1bHRzOiA1MDAwIH0sXG4gICAgICAgIChlcnIsIGRhdGEpID0+IHtcbiAgICAgICAgICB2YXIgcGFja2FnZXMgPSBbXTtcbiAgICAgICAgICBjb25zb2xlLmxvZyhkYXRhKTtcbiAgICAgICAgICBkYXRhLnJlc3VsdHMuZm9yRWFjaChlbGVtZW50ID0+IHtcblxuICAgICAgICAgICAgcGFja2FnZXMucHVzaChlbGVtZW50LmRvYyk7XG4gICAgICAgICAgICByZXNvbHZlKHBhY2thZ2VzKTsgICAgICAgICAgICAgICAgIFxuICAgICAgICB9KTtcbiAgICB9KTtcbiAgICB9KVxuICB9XG4gIGdldFJlY2VpdmVkUGFja2FnZXMocGFnZSxwYWdlU2l6ZSl7XG4gICAgcmV0dXJuIG5ldyBQcm9taXNlKChyZXNvbHZlLHJlamVjdCk9PntcbiAgICAgIFxuICAgICAgdGhpcy5teVNlYXJjaC5zZWFyY2goXG4gICAgICAgIGBAbWlkOlswIDBdYCxcbiAgICAgICAgeyBvZmZzZXQ6IDAsIG51bWJlck9mUmVzdWx0czogNTAwMCB9LFxuICAgICAgICAoZXJyLCBkYXRhKSA9PiB7XG4gICAgICAgICAgdmFyIHBhY2thZ2VzID0gW107XG4gICAgICAgICAgY29uc29sZS5sb2coZGF0YSk7XG4gICAgICAgICAgZGF0YS5yZXN1bHRzLmZvckVhY2goZWxlbWVudCA9PiB7XG5cbiAgICAgICAgICAgIHBhY2thZ2VzLnB1c2goZWxlbWVudC5kb2MpO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIFxuICAgICAgICB9KTtcbiAgICAgICAgcmVzb2x2ZShwYWNrYWdlcyk7IFxuICAgIH0pO1xuICAgIH0pXG4gIH1cbiAgZ2V0Tm9Eb2NzUGFja2Fja2FnZXMocGFnZSxwYWdlU2l6ZSl7XG4gICAgcmV0dXJuIG5ldyBQcm9taXNlKChyZXNvbHZlLHJlamVjdCk9PntcbiAgICAgIFxuICAgICAgdGhpcy5teVNlYXJjaC5zZWFyY2goXG4gICAgICAgIGBAaGFzRG9jczpbMCAwXWAsXG4gICAgICAgIHsgb2Zmc2V0OiAwLCBudW1iZXJPZlJlc3VsdHM6IDUwMDAgfSxcbiAgICAgICAgKGVyciwgZGF0YSkgPT4ge1xuICAgICAgICAgIHZhciBwYWNrYWdlcyA9IFtdO1xuICAgICAgICAgIGNvbnNvbGUubG9nKGRhdGEpO1xuICAgICAgICAgIGRhdGEucmVzdWx0cy5mb3JFYWNoKGVsZW1lbnQgPT4ge1xuXG4gICAgICAgICAgICBwYWNrYWdlcy5wdXNoKGVsZW1lbnQuZG9jKTtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBcbiAgICAgICAgfSk7XG4gICAgICAgIHJlc29sdmUocGFja2FnZXMpOyBcbiAgICB9KTtcbiAgICB9KVxuICB9XG4gIGdldHBhY2thZ2VieVJlZGlzSWQoaWQpe1xuICAgIHJldHVybiBuZXcgUHJvbWlzZSgocmVzb2x2ZSxyZWplY3QpPT57XG4gICAgICBwYWNrYWdlSW5kZXguZ2V0RG9jKGlkLChlcnIsZG9jdW1lbnQpPT57XG4gICAgICAgIHJlc29sdmUoZG9jdW1lbnQuZG9jKTsgXG4gICAgICB9KVxuICAgIH0pXG4gIH1cbiAgZ2V0UGFja2FnZUJ5SWQoYmFyY29kZSl7XG4gICAgdmFyIHNydiA9IHRoaXM7IFxuICAgIHZhciBwa2dJZCA9IGdldFBhY2thZ2VJZEZyb21CYXJDb2RlKGJhcmNvZGUpOyBcbiAgICByZXR1cm4gbmV3IFByb21pc2UoKHJlc29sdmUscmVqZWN0KT0+e1xuICAgICAgdGhpcy5teVNlYXJjaC5nZXREb2MocGtnSWQsKGVycixkb2N1bWVudCk9PntcbiAgICAgICAgLy9nZXQgdGhlIGF3YiBpbmZvIGhlcmUgYXMgd2VsbCBcbiAgICAgICAgc3J2LmdldEF3Yihkb2N1bWVudC5kb2MuYXdiKS50aGVuKGF3YmluZm89PntcbiAgICAgICAgICBzcnYuZ2V0U2hpcHBlcihhd2JpbmZvLmF3Yi5zaGlwcGVyKS50aGVuKHNoaXBwZXI9PntcbiAgICAgICAgICAgIGNvbnNvbGUubG9nKGF3YmluZm8pOyBcbiAgICAgICAgICAgIGF3YmluZm8uYXdiLnNoaXBwZXIgPSBzaGlwcGVyLm5hbWU7XG4gICAgICAgICAgICB2YXIgcmVzcG9uc2UgPSB7IFxuICAgICAgICAgICAgICBhd2IgOiBhd2JpbmZvLmF3YixcbiAgICAgICAgICAgICAgcGFja2FnZSA6IGRvY3VtZW50LmRvY1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgcmVzb2x2ZShyZXNwb25zZSk7IFxuICAgICAgICAgIH0pXG4gICAgICAgICBcbiAgICAgICAgfSk7IFxuICAgICAgICBcbiAgICAgIH0pXG4gICAgfSk7IFxuICB9XG4gIHVwZGF0ZVN0b3JlTG9jYXRpb24oY2hlY2tpbil7XG4gICAgdmFyIHNydiA9IHRoaXM7IFxuICAgIHJldHVybiBuZXcgUHJvbWlzZSAoKHJlc29sdmUscmVqZWN0KT0+e1xuICAgICAgdmFyIGlkID0gZ2V0UGFja2FnZUlkRnJvbUJhckNvZGUoY2hlY2tpbi5iYXJjb2RlKTsgXG4gICAgICBwYWNrYWdlSW5kZXguZ2V0RG9jKGlkLChlcnIscGtnKT0+e1xuICAgICAgICBwa2cuZG9jLmxvY2F0aW9uSWQgPSBjaGVja2luLmxvY2F0aW9uSWQ7IFxuICAgICAgICBwa2cuZG9jLmxvY2F0aW9uID0gY2hlY2tpbi5sb2NhdGlvbjsgXG4gICAgICAgIHBrZy5kb2Muc3RhdHVzID0gNTsgXG4gICAgICAgICBwYWNrYWdlSW5kZXgudXBkYXRlKGlkLHBrZywoZXJyLHJlc3VsdCk9PntcbiAgICAgICAgICAgLy93ZSBuZWVkIHRvIHNlbmQgdGhlIGVtYWlsIGhlcmUgZm9yIHRoZSBwYWNrYWdlIFxuICAgICAgICAgICBzcnYuZ2V0UGFja2FnZUJ5RG9jSWQoaWQpLnRoZW4oaW5mbz0+e1xuICAgICAgICAgICAgICBlbWFpbFNlcnZpY2Uuc2VuZEF0U3RvcmVFbWFpbChjaGVja2luLmxvY2F0aW9uLGluZm8pO1xuICAgICAgICAgICAgICByZXNvbHZlKHt1cGRhdGVkOnRydWV9KTsgXG4gICAgICAgICAgIH0pXG4gICAgICAgICBcbiAgICAgICAgIH0pO1xuICAgICAgfSlcbiAgICB9KVxuICB9XG4gIGNoZWNrT3V0VG9DdXN0b21lcihiYXJjb2RlLHVzZXIpe1xuICAgIHZhciBzcnYgPSB0aGlzOyBcbiAgICByZXR1cm4gbmV3IFByb21pc2UgKChyZXNvbHZlLHJlamVjdCk9PntcbiAgICAgIC8vd2Ugd2FudCB0byBjaGVjayBvdXQgc2V0IHRoZSBzYXRhdHVzIFxuICAgICAgdmFyIGlkID0gZ2V0UGFja2FnZUlkRnJvbUJhckNvZGUoYmFyY29kZSk7IFxuICAgICAgc3J2LmdldFBhY2thZ2VCeURvY0lkKGlkKS50aGVuKHBrZz0+e1xuICAgICAgICBjb25zb2xlLmxvZyhwa2csXCJUSEUgUEtHXCIpXG4gICAgICAgIHBrZy5wYWNrYWdlLnN0YXR1cyA9IDYgLy9jaGVja2VkIG91dCB0byBjdXN0b21lciBcbiAgICAgICAgcGtnLnBhY2thZ2UuY2hlY2tvdXRCeSA9IHVzZXI7XG4gICAgICAgIHBhY2thZ2VJbmRleC51cGRhdGUocGtnLnBhY2thZ2UuaWQsIHBrZy5wYWNrYWdlLChlcnJtLHJlcGx5KT0+e1xuICAgICAgICAgIGlmKGVycm0pXG4gICAgICAgICAgIHtcbiAgICAgICAgICAgICBjb25zb2xlLmxvZyhlcnJtKVxuICAgICAgICAgICAgcmVzb2x2ZSh7dXBkYXRlZDpmYWxzZX0pXG4gICAgICAgICAgIH0gXG4gICAgICAgICAgcmVzb2x2ZSh7dXBkYXRlZDp0cnVlfSlcbiAgICAgICAgfSlcbiAgICAgIH0pIFxuXG4gICAgfSlcbiAgfVxuICBnZXRQYWNrYWdlQnlEb2NJZChwa2dJZCl7XG4gICAgdmFyIHNydiA9IHRoaXM7IFxuICAgIHJldHVybiBuZXcgUHJvbWlzZSgocmVzb2x2ZSxyZWplY3QpPT57XG4gICAgICB0aGlzLm15U2VhcmNoLmdldERvYyhwa2dJZCwoZXJyLGRvY3VtZW50KT0+e1xuICAgICAgICAvL2dldCB0aGUgYXdiIGluZm8gaGVyZSBhcyB3ZWxsIFxuICAgICAgICBzcnYuZ2V0QXdiKGRvY3VtZW50LmRvYy5hd2IpLnRoZW4oYXdiaW5mbz0+e1xuICAgICAgICAgIGNvbnNvbGUubG9nKGF3YmluZm8pOyBcbiAgICAgICAgICB2YXIgcmVzcG9uc2UgPSB7IFxuICAgICAgICAgICAgYXdiIDogYXdiaW5mby5hd2IsXG4gICAgICAgICAgICBwYWNrYWdlIDogZG9jdW1lbnQuZG9jXG4gICAgICAgICAgfVxuICAgICAgICAgIHJlc29sdmUocmVzcG9uc2UpOyBcbiAgICAgICAgfSk7IFxuICAgICAgICBcbiAgICAgIH0pXG4gICAgfSk7IFxuICB9XG4gIGdldE1hbmlmZXN0UGFja2FnZXMobWlkKXtcbiAgICByZXR1cm4gbmV3IFByb21pc2UoKHJlc29sdmUscmVqZWN0KT0+e1xuICAgICAgcGFja2FnZUluZGV4LnNlYXJjaChgQG1pZDpbJHttaWR9ICR7bWlkfV1gLHtvZmZzZXQ6MCxudW1iZXJPZlJlc3VsdHM6NTAwMCxzb3J0Qnk6J2lkJyxzb3J0RGlyOlwiREVTQ1wifSwoZXJyLHBhY2thZ2VzMSk9PntcbiAgICAgICAgdmFyIHBhY2thZ2VzID0gW107XG4gICAgICAgIHBhY2thZ2VzMS5yZXN1bHRzLmZvckVhY2gocGtnID0+IHtcbiAgICAgICAgICBcbiAgICAgICAgICBwYWNrYWdlcy5wdXNoKHBrZy5kb2MpXG4gICAgICAgIH0pO1xuICAgICAgICBQcm9taXNlLmFsbChwYWNrYWdlcy5tYXAocGtnRGF0YT0+dGhpcy5nZXRBd2IocGtnRGF0YS5hd2IpKSkudGhlbihyZXN3aXRoQXdiPT57XG4gICAgICAgICBmb3IodmFyIGkgPTA7IGkgPCByZXN3aXRoQXdiLmxlbmd0aDtpKyspe1xuICAgICAgICAgICBjb25zb2xlLmxvZyhcImFkZGluZyBcIixyZXN3aXRoQXdiW2ldLmF3Yik7IFxuICAgICAgICAgICBwYWNrYWdlc1tpXS5hd2JJbmZvID0gcmVzd2l0aEF3YltpXS5hd2I7IFxuICAgICAgICAgfVxuICAgICAgICAgcmVzb2x2ZShwYWNrYWdlcyk7XG4gICAgICAgIH0pIFxuICAgICAgICBcblxuICAgICAgICAvLyBQcm9taXNlLmFsbChhd2JzLnJlc3VsdHMubWFwKGF3Yj0+Y3VzdG9tZXJTZXJ2aWNlLmdldEN1c3RvbWVyKGF3Yi5kb2MuY3VzdG9tZXJJZCkpKS50aGVuKGN1c3RvbWVycz0+e1xuICAgICAgICAvLyAgIFByb21pc2UuYWxsKGF3YnMucmVzdWx0cy5tYXAoYXdiPT50aGlzLmdldEF3Yk92ZXJ2aWV3KGF3Yi5kb2MuaWQpKSkudGhlbihkZXRhaWxzPT57XG4gICAgICAgIC8vICAgIGNvbnNvbGUubG9nKFwiZ290IHRoZSBjdXN0b21lcnNcIixjdXN0b21lcnMsIGF3YnMpXG4gICAgICAgIC8vICAgIGZvcih2YXIgaSA9MCA7IGkgPCBhd2JzLnJlc3VsdHMubGVuZ3RoIDsgaSsrICl7XG4gICAgICAgIC8vICAgICAgdmFyIGF3YiA9IGF3YnMucmVzdWx0c1tpXTsgXG4gICAgICAgIC8vICAgICAgYXdiLmRvYy5kYXRlQ3JlYXRlZCA9IG1vbWVudC51bml4KGF3Yi5kb2MuZGF0ZUNyZWF0ZWQpLmZvcm1hdChcIllZWVktTU0tREQgaGg6bW0gQVwiKVxuICAgICAgICAvLyAgICAgIC8vd2UgbmVlZCB0byBnZXQgdGhlIGN1c3RvbWVyIFxuICAgICAgICAvLyAgICAgIGF3Yi5kb2MuY29uc2lnbmVlID0gY3VzdG9tZXJzW2ldLm5hbWU7IFxuICAgICAgICAvLyAgICAgIGF3Yi5kb2Mud2VpZ2h0ID0gZGV0YWlsc1tpXS53ZWlnaHQ7IFxuICAgICAgICAvLyAgICAgIGF3Yi5kb2MucG1iID0gY3VzdG9tZXJzW2ldLnBtYjsgXG4gICAgICAgIC8vICAgICAgYXdiLmRvYy5kZXNjcmlwdGlvbiA9IGRldGFpbHNbaV0uZGVzY3JpcHRpb247IFxuICAgICAgICAvLyAgICAgIGF3Yi5kb2MucGllY2VzID0gZGV0YWlsc1tpXS5waWVjZXM7IFxuICAgICAgICAvLyAgICAgIGlmIChjdXN0b21lcnNbaV0ucG1iID09ICcnKXtcbiAgICAgICAgLy8gICAgICAgIGF3Yi5kb2MucG1iID0gJzkwMDAnXG4gICAgICAgIC8vICAgICAgfVxuICAgICAgICAvLyAgICAgIGNvbnNvbGUubG9nKCdwdXNoaW5nICcsYXdiKVxuICAgICAgICAvLyAgICAgIC8vd2UgbmVlZCB0byBnZXQgYWxsIHRoZSBwYWNrYWdlcyBcbiAgICAgICAgLy8gICAgICBhd2JMaXN0LnB1c2goYXdiLmRvYylcbiAgICAgICAgLy8gICAgIH1cbiAgICAgICAgLy8gICAgIGF3Ykxpc3QgPSBhd2JMaXN0LnJldmVyc2UoKTtcbiAgICAgICAgLy8gICAgIHJlc29sdmUoe2F3YnM6YXdiTGlzdH0pXG4gICAgICAgIC8vICAgfSlcbiAgICAgICAgIFxuICAgICAgICAvLyAgfSkuY2F0Y2goZXJyPT57XG4gICAgICAgIC8vICAgIGNvbnNvbGUubG9nKGVycik7IFxuICAgICAgICAvLyAgfSlcbiAgICAgICAgXG4gICAgICAgLy8gIGF3YnMucmVzdWx0cy5mb3JFYWNoKGF3YiA9PiB7XG4gICAgICAgICAgXG4gICAgICAgICBcbiAgICAgICAvLyAgfSk7XG4gICAgICAgIFxuICAgICAgfSlcbiAgIH0pXG4gIH1cbiAgLy91c2luZyB0aGlzIFxuICBcblxuICB1cGRhdGVNYW5pZmVzdFBhY2thZ2VUb0luVHJhbnNpdChtaWQpIHtcbiAgICAvL2dldCBhbGwgdGhlIHBhY2thZ2VzXG4gICAgLy93ZSBuZWVkIHRvIHVwZGF0ZSB0aGUgaW5kZXggYXQgdGhpcyBwb2ludCBhcyB3ZWxsXG4gICAgdmFyIG1zZWFyY2ggPSB0aGlzLm15U2VhcmNoO1xuICAgIHRoaXMubXlTZWFyY2guc2VhcmNoKFxuICAgICAgYEBtaWQ6WyR7bWlkfSAke21pZH1dYCxcbiAgICAgIHsgb2Zmc2V0OiAwLCBudW1iZXJPZlJlc3VsdHM6IDUwMDAgfSxcbiAgICAgIChlcnIsIGRhdGEpID0+IHtcbiAgICAgICAgdmFyIHBhY2thZ2VzID0gW107XG4gICAgICAgIGNvbnNvbGUubG9nKGRhdGEpO1xuICAgICAgICBkYXRhLnJlc3VsdHMuZm9yRWFjaChlbGVtZW50ID0+IHtcbiAgICAgICAgICB2YXIgb2xkRG9jSWQgPSBlbGVtZW50LmRvY0lkO1xuICAgICAgICAgIGVsZW1lbnQuZG9jSWQgPSBlbGVtZW50LmRvY0lkLnJlcGxhY2UoYCR7bWlkfS1gLCBcIlwiKTtcbiAgICAgICAgICBwYWNrYWdlcy5wdXNoKGVsZW1lbnQuZG9jSWQpO1xuICAgICAgICAgIC8vIGkgY291bGQgZGVsZXRlIGhlcmVcbiAgICAgICAgICAvLyBtc2VhcmNoLmRlbERvY3VtZW50KFBLR19JRFgsb2xkRG9jSWQpXG4gICAgICAgICAgLy91cGRhdGUgYWxsIHRoZSBwYWNrYWdlc1xuICAgICAgICB9KTtcbiAgICAgICAgc2V0UGFja2FnZUluVHJhbnNpdChwYWNrYWdlcywgbXNlYXJjaCwgbWlkKS50aGVuKGZ1bmN0aW9uKFxuICAgICAgICAgIHVwZGF0ZWRQYWNrYWdlc1xuICAgICAgICApIHtcbiAgICAgICAgICBjb25zb2xlLmxvZyhcInVwZGF0ZWQgcGFja2FnZXNcIik7XG4gICAgICAgICAgY29uc29sZS5sb2codXBkYXRlZFBhY2thZ2VzKTtcbiAgICAgICAgfSk7XG4gICAgICB9XG4gICAgKTtcbiAgfVxuICByZW1vdmVQYWNrYWdlRnJvbU1hbmlmZXN0KHBhY2thZ2VJZCwgbWlkKSB7XG4gICAgdmFyIG1zZWFyY2ggPSB0aGlzLm15U2VhcmNoO1xuICAgIHJldHVybiBuZXcgUHJvbWlzZSgocmVzb2x2ZSwgcmVqZWN0KSA9PiB7XG4gICAgICB2YXIgbWFuaWZlc3QgPSBtaWQ7XG4gICAgICB2YXIgbWFuaWZlc3RLZXkgPSBcIm1hbmlmZXN0OlwiICsgbWFuaWZlc3QgKyBcIjoqXCI7XG5cbiAgICAgIGxyZWRpcy5kZWwoXCJwYWNrYWdlczpcIiArIHRyYWNraW5nTm8pLnRoZW4oZnVuY3Rpb24ocmVzdWx0KSB7XG4gICAgICAgIGNvbnNvbGUubG9nKHJlc3VsdCk7XG4gICAgICAgIG1zZWFyY2guZGVsRG9jdW1lbnQoUEtHX0lEWCwgYCR7bWlkfS0ke3RyYWNraW5nTm99YCk7XG4gICAgICAgIC8vd2UgbmVlZCB0byByZW1vdmUgZnJvbSB0aGUgaW5kZXggYW5kIGRlYyB0aGUgY291bnRlclxuICAgICAgICBscmVkaXMuY2xpZW50LmRlY3IoXCJtY291bnRlcjpcIiArIG1pZCk7XG4gICAgICAgIC8vclNlcnZpY2VzLnBhY2thZ2VTZXJ2aWNlLnJtUGFja2FnZShtaWQsIHRyYWNraW5nTm8pO1xuICAgICAgICBscmVkaXMuZ2V0S2V5cyhtYW5pZmVzdEtleSkudGhlbihrUmVzdWx0ID0+IHtcbiAgICAgICAgICAvL3RoZSBsaXN0IG9mIGFsbCB0aGUgc2V0cyAuLi53ZSBuZWVkIHRvIHJlbW92ZSB0aGUga2V5IGZyb20gZWFjaCBvbmVcbiAgICAgICAgICB2YXIga2V5c0NvdW50ID0gMDtcblxuICAgICAgICAgIGtSZXN1bHQuZm9yRWFjaChlbGVtZW50ID0+IHtcbiAgICAgICAgICAgIGNvbnNvbGUubG9nKFxuICAgICAgICAgICAgICBgcmVtb3ZpbmcgJHt0cmFja2luZ05vfSBwYWNrYWdlIG1hbmlmZXN0IHNldCAke2VsZW1lbnR9IGBcbiAgICAgICAgICAgICk7XG4gICAgICAgICAgICBscmVkaXMuc3JlbShlbGVtZW50LCB0cmFja2luZ05vKS50aGVuKGZ1bmN0aW9uKHJSZXN1bHQpIHtcbiAgICAgICAgICAgICAgY29uc29sZS5sb2coclJlc3VsdCk7XG4gICAgICAgICAgICAgIGNvbnNvbGUubG9nKFwicmVtb3ZlZFwiKTtcbiAgICAgICAgICAgICAgaWYgKGtleXNDb3VudCA9PSBrUmVzdWx0Lmxlbmd0aCAtIDEpIGtleXNDb3VudCsrO1xuICAgICAgICAgICAgfSk7XG4gICAgICAgICAgfSk7XG4gICAgICAgICAgcmVzb2x2ZSh7XG4gICAgICAgICAgICBkZWxldGVkOiB0cnVlXG4gICAgICAgICAgfSk7XG4gICAgICAgIH0pO1xuXG4gICAgICAgIC8vd2UgYWxzbyBuZWVkIHRvIHJlbW92ZSBmcm9tIGFueSBzZXRzXG4gICAgICB9KTtcbiAgICB9KTtcbiAgfVxuICByZW1vdmVQYWNrYWdlQnlJZChpZCkge1xuICAgIHZhciBtc2VhcmNoID0gdGhpcy5teVNlYXJjaDtcbiAgICByZXR1cm4gbmV3IFByb21pc2UoKHJlc29sdmUsIHJlamVjdCkgPT4ge1xuICAgICAgXG4gICAgICBwYWNrYWdlSW5kZXguZGVsRG9jdW1lbnQoUEtHX0lEWCxpZCwoZXJyLHJlc3BvbnNlKT0+e1xuICAgICAgICBpZiAoZXJyKVxuICAgICAgICAgIGNvbnNvbGUubG9nKGVycik7IFxuICAgICAgICBjb25zb2xlLmxvZyhyZXNwb25zZSk7IFxuICAgICAgICByZXNvbHZlKHtkZWxldGVkOnRydWV9KVxuICAgICAgfSlcbiAgICAgIFxuICAgICAgICBcbiAgICAgIFxuICAgIH0pO1xuICB9XG4gIHN0b3JlUGFja2FnZUZvclBpY2t1cCh0cmFja2luZ05vLGJpbil7XG4gICAgdmFyIHNlYXJjaGVyID0gdGhpcy5teVNlYXJjaDtcbiAgICByZXR1cm4gbmV3IFByb21pc2UoKHJlc29sdmUscmVqZWN0KT0+e1xuICAgICAgIGxyZWRpcy5obXNldChQS0dfUFJFRklYK3RyYWNraW5nTm8se3N0YXR1czo0LGxvY2F0aW9uOmJpbn0pLnRoZW4oKHJlc3VsdCk9PntcbiAgICAgICAgIGxyZWRpcy5nZXRQYWNrYWdlKHRyYWNraW5nTm8pLnRoZW4oKHBrZyk9PntcbiAgICAgICAgICBhZGRQYWNrYWdlVG9JbmRleCh0cmFja2luZ05vLHNlYXJjaGVyKSA7IFxuICAgICAgICAgIHJlc29sdmUocGtnKTsgICBcbiAgICAgICAgIH0pO1xuICAgICAgIH0pIFxuICAgIH0pOyBcbiAgfVxuICB1cGRhdGVQYWNrYWdlSW5kZXgodHJhY2tpbmcpe1xuICAgICAgcmV0dXJuIG5ldyBQcm9taXNlKChyZXNvbHZlLHJlamVjdCk9PntcbiAgICAgICAgICB2YXIgbXNlYXJjaCA9IHRoaXMubXlTZWFyY2g7IFxuICAgICAgICAgIGFkZFBhY2thZ2VUb0luZGV4KHRyYWNraW5nLG1zZWFyY2gpOyBcbiAgICAgICAgIHJlc29sdmUoeyd1cGRhdGVkJzp0cnVlfSk7XG4gICAgICB9KVxuICB9XG4gIGdldEN1c3RvbWVyUGFja2FnZXMoc2t5Ym94KSB7fVxuXG5cbiAgLy9ubyBtb3JlIHNreWJveFxuICBnZXRNYW5pZmVzdFBhY2thZ2VzQnlTdGF0dXMobWlkLHN0YXR1cykge1xuICAgICAgcmV0dXJuIG5ldyBQcm9taXNlKChyZXNvbHZlLHJlamVjdCk9PntcbiAgICAgICAgICBjb25zb2xlLmxvZyhgQG1pZDpbJHttaWR9ICR7bWlkfV1gKVxuICAgICAgICB0aGlzLm15U2VhcmNoLnNlYXJjaChcbiAgICAgICAgICAgIGBAbWlkOlske21pZH0gJHttaWR9XWAsXG4gICAgICAgICAgICB7IG9mZnNldDogMCwgbnVtYmVyT2ZSZXN1bHRzOiA1MDAwIH0sXG4gICAgICAgICAgICAoZXJyLCBkYXRhKSA9PiB7XG4gICAgICAgICAgICAgIHZhciBwYWNrYWdlcyA9IFtdO1xuICAgICAgICAgICAgICBjb25zb2xlLmxvZyhkYXRhKTtcbiAgICAgICAgICAgICAgZGF0YS5yZXN1bHRzLmZvckVhY2goZWxlbWVudCA9PiB7XG5cbiAgICAgICAgICAgICAgICBwYWNrYWdlcy5wdXNoKGVsZW1lbnQuZG9jKTtcbiAgICAgICAgICAgICAgICByZXNvbHZlKHBhY2thZ2VzKTsgICAgICAgICAgICAgICAgIFxuICAgICAgICAgICAgfSk7XG4gICAgICAgIH0pO1xuICAgICAgfSk7XG4gIFxuICB9ICAgXG4gIFxuICAvLyNyZWdpb24gUGFrY2FnZSBGaWx0ZXJzICBcbiAgZ2V0UGFja2FnZXNOYXNXYXJlaG91c2UoaXNOb0RvYyxjb21wYW55KXtcbiAgICB2YXIgc3J2ID0gdGhpczsgXG4gICAgcmV0dXJuIG5ldyBQcm9taXNlKChyZXNvbHZlLHJlamVjdCk9PntcbiAgICAgICAgcGFja2FnZUluZGV4LnNlYXJjaChgQHN0YXR1czpbNCA0XSBAY29tcGFueToke2NvbXBhbnl9IEBoYXNEb2NzOlske2lzTm9Eb2N9ICR7aXNOb0RvY31dYCx7fSwoZXJyLHJlcGx5KT0+e1xuICAgICAgICAgIGNvbnNvbGUubG9nKHJlcGx5LnJlc3VsdHMpOyBcbiAgICAgICAgICBQcm9taXNlLmFsbChyZXBseS5yZXN1bHRzLm1hcChwa2cgPT4gc3J2LmdldFBhY2thZ2VCeURvY0lkKHBrZy5kb2NJZCkpKS50aGVuKHBhY2thZ2VzPT57XG4gICAgICAgICAgICByZXNvbHZlKHBhY2thZ2VzKTsgXG4gICAgICAgICAgfSlcblxuICAgICAgICB9KVxuICAgIH0pXG4gIH1cblxuICAvLyNlbmRyZWdpb25cbiAgXG5cbiAgIC8vI3JlZ2lvbiBNYW5pZmVzdCBQYWNrYWdlIEZ1bmN0aW9ucyBcblxuICAgYWRkVG9GbGlnaHQoYWN0aW9uKXtcbiAgICAgdmFyIHNydiA9IHRoaXM7IFxuICAgIHJldHVybiBuZXcgUHJvbWlzZSgocmVzb2x2ZSxyZWplY3QpPT57XG4gICAgICB2YXIgcGFja2FnZU5vID0gZ2V0UGFja2FnZUlkRnJvbUJhckNvZGUoYWN0aW9uLmJhcmNvZGUpOyBcbiAgICAgIGNvbnNvbGUubG9nKGFjdGlvbik7IFxuICAgICAgdGhpcy5teVNlYXJjaC51cGRhdGUocGFja2FnZU5vLHttaWQ6YWN0aW9uLm1pZCAsIHN0YXR1czogMiwgbG9jYXRpb246XCJMb2FkZWQgb24gQWlyQ3JhZnRcIixjb21wYXJ0bWVudDphY3Rpb24uY29tcGFydG1lbnR9LChlcnIscmVzdWx0KT0+e1xuICAgICAgICBpZihlcnIpXG4gICAgICAgICAgcmVzb2x2ZSh7YWRkZWQ6ZmFsc2V9KVxuICAgICAgICBzcnYuZ2V0RmxpZ2h0Q29tcGFydG1lbnRXZWlnaHQoYWN0aW9uLm1pZCxhY3Rpb24uY29tcGFydG1lbnQpLnRoZW4oZnJlc3VsdD0+e1xuICAgICAgICAgIGZyZXN1bHQuYWRkZWQgPSB0cnVlOyBcbiAgICAgICAgICByZXNvbHZlKGZyZXN1bHQpXG4gICAgICAgIH0pXG4gICAgICAgXG4gICAgICB9KVxuICAgICAgICBcbiAgICB9KVxuICAgfVxuICAgLy9nZXQgdGhlIGNvbXBhcnRtZW50IHdlaWdodCBcbiAgIGdldEZsaWdodENvbXBhcnRtZW50V2VpZ2h0KG1pZCxjb21wYXJ0bWVudCl7XG4gICAgIHJldHVybiBuZXcgUHJvbWlzZSgocmVzb2x2ZSxyZWplY3QpPT57XG4gICAgICBcbiAgICAgIHRoaXMubXlTZWFyY2guYWdncmVnYXRlKGBAbWlkOlske21pZH0gJHttaWR9XSBAY29tcGFydG1lbnQ6JHtjb21wYXJ0bWVudH1gLCB7fSwoZXJyLHJlcGx5KT0+e1xuICAgICAgICAgaWYgKGVycilcbiAgICAgICAgIGNvbnNvbGUubG9nKGVycik7IFxuICAgICAgICAgY29uc29sZS5sb2cocmVwbHksXCJUT1RBTCBTRUNUSU9OIFdlaWdodFwiKVxuICAgICAgICAgaWYgKHJlcGx5WzFdKXtcbiAgICAgICAgICAgdmFyIHJlc3VsdCA9IHJlcGx5WzFdO1xuICAgICAgICAgICB2YXIgY29tcGFydG1lbnQgPSByZXN1bHRbM107IFxuICAgICAgICAgICB2YXIgd2VpZ2h0ID0gcmVzdWx0WzVdOyBcbiAgICAgICAgIH1cbiAgICAgICAgIHJlc29sdmUoe2NvbXBhcnRtZW50OmNvbXBhcnRtZW50LHdlaWdodDp3ZWlnaHR9KVxuICAgICAgIH0pXG4gICAgIH0pXG4gICB9XG4gICAvL3JlbW92ZSBmcm9tIGZsaWdodCBcbiAgIHJlbW92ZUZyb21GbGlnaHQoYWN0aW9uKXtcbiAgICByZXR1cm4gbmV3IFByb21pc2UoKHJlc29sdmUscmVqZWN0KT0+e1xuICAgICAgICB2YXIgcGFja2FnZU5vID0gZ2V0UGFja2FnZUlkRnJvbUJhckNvZGUoYWN0aW9uLmJhcmNvZGUpOyAgIFxuICAgICAgICB0aGlzLm15U2VhcmNoLnVwZGF0ZShwYWNrYWdlTm8se21pZDphY3Rpb24ubWlkfSwoZXJyLHJlc3VsdCk9PntcbiAgICAgICAgaWYoZXJyKVxuICAgICAgICAgICAgcmVzb2x2ZSh7cmVtb3ZlZDpmYWxzZX0pXG4gICAgICAgICAgXG4gICAgICAgICAgcmVzb2x2ZSh7cmVtb3ZlZDp0cnVlfSlcbiAgICAgICAgfSlcbiAgICB9KVxuICAgfVxuICAgcmVjRnJvbVRydWNrKHRyYWNraW5nTm8sdXNlcm5hbWUsc2hpcG1lbnRJZCl7XG4gICAgIHJldHVybiBuZXcgUHJvbWlzZSgocmVzb2x2ZSxyZWplY3QpPT57XG4gICAgICAgIGRhdGFDb250ZXh0LnJlZGlzQ2xpZW50LnNhZGQoXCJzaGlwbWVudDppZDpcIitzaGlwbWVudElkLHRyYWNraW5nTm8sKGVycixyZXBseSk9PntcbiAgICAgICAgICBkYXRhQ29udGV4dC5yZWRpc0NsaWVudC5zZXQoUkVDX1BLRyt0cmFja2luZ05vLG1vbWVudCgpLnVuaXgoKSwgKGVycixyZXN1bHQpPT57XG4gICAgICAgICAgICBpZiAoZXJyKSByZXNvbHZlKHtzYXZlZDpmYWxzZX0pXG4gICAgICAgICAgICAvL3NoaXBtZW50IGNvdW50IFxuICAgICAgICAgICAgdmFyIHNoaXBtZW50Q291bnQgPSAxO1xuICAgICAgICAgICAgZGF0YUNvbnRleHQucmVkaXNDbGllbnQuc2NhcmQoXCJzaGlwbWVudDppZDpcIitzaGlwbWVudElkLChlcnIsY2FyZCk9PntcbiAgICAgICAgICAgICAgcmVzb2x2ZSh7c2F2ZWQ6dHJ1ZSxwa2dDb3VudDpjYXJkfSlcbiAgICAgICAgICAgIH0pO1xuICAgICAgICAgICBcbiAgICAgICAgICB9KVxuICAgICAgICB9KVxuICAgICAgICBcbiAgICAgfSlcbiAgIH1cbiAgIHByb2Nzc2Vzc1BhY2thZ2UocGtnSWZubyx1c2VybmFtZSl7XG4gICAgdmFyIHNydiA9IHRoaXM7ICBcbiAgICByZXR1cm4gbmV3IFByb21pc2UoKHJlc29sdmUscmVqZWN0KT0+e1xuICAgICAgIC8vd2UgYWxzbyBuZWVkIHRvIHNldCB0aGUgd2FyZWhvdXNlIGxvY2F0aW9uIGhlcmUgXG4gICAgICAgZGF0YUNvbnRleHQucmVkaXNDbGllbnQuaG1zZXQoXCJmZWVzOmF3YjpcIitwa2dJZm5vLmF3Yixwa2dJZm5vLChlcnIscmVzdWx0KT0+e1xuICAgICAgICAgaWYgKGVycilcbiAgICAgICAgICBjb25zb2xlLmxvZyhlcnIpOyBcblxuXG5cbiAgICAgICAgICBjb25zb2xlLmxvZyhyZXN1bHQpOyBcbiAgICAgICAgICBjb25zb2xlLmxvZyhcInByaW50OmZlZXM6XCIrdXNlcm5hbWUsdXNlcm5hbWUpOyBcbiAgICAgICAgIGRhdGFDb250ZXh0LnJlZGlzQ2xpZW50LnB1Ymxpc2goXCJwcmludDpmZWVzOlwiK3VzZXJuYW1lLHBrZ0lmbm8uYXdiKTsgXG4gICAgICAgICBcbiAgICAgICAgICBzcnYuZ2V0UGFja2FnZUJ5SWQocGtnSWZuby5iYXJjb2RlKS50aGVuKHBrZz0+e1xuICAgICAgICAgICAgZW1haWxTZXJ2aWNlLnNlbmROb0RvY3NFbWFpbChwa2cpXG4gICAgICAgICAgICBpZiAocGtnSWZuby5yZWZMb2Mpe1xuICAgICAgICAgICAgICBwa2cucGFja2FnZS53bG9jID0gcGtnSWZuby5yZWZMb2M7IFxuICAgICAgICAgICAgICBcbiAgICAgICAgICAgICAgICBwa2cucGFja2FnZS5oYXNEb2NzID0gcGtnSWZuby5oYXNEb2NzIDsgXG4gICAgICAgICAgICAgICAgcGtnLnBhY2thZ2Uuc3RhdHVzID0gNDsgXG5cbiAgICAgICAgICAgICAgICAvL3NldCB0aGVvbXBhbnkgXG4gICAgICAgICAgICAgICAgaWYgKE51bWJlcihwa2cuYXdiLmN1c3RvbWVyLnBtYikgPiA5MDAwKXtcbiAgICAgICAgICAgICAgICAgIHBrZy5wYWNrYWdlLmNvbXBhbnkgPSBcIjBcIlxuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICBlbHNlIFxuICAgICAgICAgICAgICAgICAgcGtnLnBhY2thZ2UuY29tcGFueSA9IFwiMVwiXG4gICAgICAgICAgICAgICAgY29uc29sZS5sb2coJ3VwZGF0aW5nIHdpdGggJyxwa2cucGFja2FnZSlcbiAgICAgICAgICAgICAgICBcbiAgICAgICAgICAgICAgcGFja2FnZUluZGV4LnVwZGF0ZShwa2cucGFja2FnZS5pZCxwa2cucGFja2FnZSwoZXJyUmVzcCxyZXNwb25zZSk9PntcbiAgICAgICAgICAgICAgICBcbiAgICAgICAgICAgICAgICBpZihlcnJSZXNwKVxuICAgICAgICAgICAgICAgIGNvbnNvbGUubG9nKGVyclJlc3ApXG4gICAgICAgICAgICAgIH0pXG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBcbiAgICAgICAgICB9KVxuICAgICAgICAgcmVzb2x2ZSh7c2VudDp0cnVlfSlcbiAgICAgICB9KVxuICAgICB9KVxuICAgfVxuICAgcmVjRnJvbVBsYW5lTmFzKGJhcmNvZGUpe1xuICAgICByZXR1cm4gbmV3IFByb21pc2UoKHJlc29sdmUscmVqZWN0KT0+e1xuICAgICAgIHZhciBzcnYgPSB0aGlzIDsgXG4gICAgICAgdmFyIHBrZ0lkID0gZ2V0UGFja2FnZUlkRnJvbUJhckNvZGUoYmFyY29kZSk7IFxuICAgICAgICBzcnYubXlTZWFyY2guZ2V0RG9jKHBrZ0lkLChlcnIscGtnKT0+e1xuICAgICAgICAgICAgcGtnLmRvYy5zdGF0dXMgPSA0OyBcbiAgICAgICAgICAgIHBrZy5kb2MubG9jYXRpb24gID0gXCJXYXJlaG91c2UgTkFTXCI7IFxuICAgICAgICAgICAgaWYgKHBrZy5kb2MuaGFzRG9jcyA9PSBcInVuZGVmaW5lZFwiKVxuICAgICAgICAgICAgICBwa2cuZG9jLmhhc0RvY3MgPSAwIDsgXG4gICAgICAgICAgICBzcnYubXlTZWFyY2gudXBkYXRlKHBrZ0lkLHBrZy5kb2MsKGVycix1cGRhdGVSZXN1bHQpPT57XG4gICAgICAgICAgICAgIFxuICAgICAgICAgICAgICBpZihlcnIpXG4gICAgICAgICAgICAgeyAgXG4gICAgICAgICAgICAgICBjb25zb2xlLmxvZyhlcnIpXG4gICAgICAgICAgICAgIHJlamVjdCh7dXBkYXRlZDpmYWxzZX0pIFxuICAgICAgICAgICAgIH0gXG4gICAgICAgICAgICAgIHJlc29sdmUoe3VwZGF0ZWQ6dHJ1ZX0pXG4gICAgICAgICAgICB9KVxuICAgICAgICB9KVxuICAgICB9KVxuICAgfVxuXG4gICAvLyNlbmRyZWdpb25cbn1cblxuZnVuY3Rpb24gZ2V0UGFja2FnZUlkRnJvbUJhckNvZGUoYmFyQ29kZVZhbHVlKXtcbiAgdmFyIHBhcnRzID0gYmFyQ29kZVZhbHVlLnNwbGl0KFwiLVwiKTsgXG4gIGlmIChwYXJ0cy5sZW5ndGggPT0gMylcbiAgICBpZiAodHlwZW9mIHBhcnRzWzJdICE9IFwidW5kZWZpbmVkXCIpXG4gICAgcmV0dXJuIHBhcnRzWzJdLnRyaW0oKTsgXG4gIHJldHVybiBcIlwiXG59XG4iXX0=
