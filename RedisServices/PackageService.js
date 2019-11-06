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
redis.addCommand("ft.aggregate");
var awbIndex = redisSearch(redis, INDEX_AWB, {
  clientOptions: lredis.searchClientDetails
});
var packageIndex = redisSearch(redis, PKG_IDX, {
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
        packageIndex.search("@awb:[" + id + " " + id + "]", { numberOfResults: 5000, offset: 0 }, function (err, packages) {
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

        packageIndex.search("@awb:[" + id + " " + id + "]", { numberOfResults: 5000, offset: 0 }, function (err, packages) {
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
        awbIndex.search("@status:[1 1] @hasDocs:[0 0]", { offset: 0, numberOfResults: 5000, sortBy: 'id' }, function (err, awbs) {
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
        awbIndex.search("@status:[1 1] @hasDocs:[1 1]", { offset: 0, numberOfResults: 5000, sortBy: 'id' }, function (err, awbs) {
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
      var _this8 = this;

      return new Promise(function (resolve, reject) {
        var msearch = _this8.mySearch;
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
      var _this9 = this;

      return new Promise(function (resolve, reject) {
        console.log("@mid:[" + mid + " " + mid + "]");
        _this9.mySearch.search("@mid:[" + mid + " " + mid + "]", { offset: 0, numberOfResults: 5000 }, function (err, data) {
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
          Promise.all(reply.results.map(function (pkg) {
            return srv.getPackageByDocId(pkg.id);
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
      var _this10 = this;

      var srv = this;
      return new Promise(function (resolve, reject) {
        var packageNo = getPackageIdFromBarCode(action.barcode);
        console.log(action);
        _this10.mySearch.update(packageNo, { mid: action.mid, status: 2, location: "Loaded on AirCraft", compartment: action.compartment }, function (err, result) {
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
      var _this11 = this;

      return new Promise(function (resolve, reject) {

        _this11.mySearch.aggregate("@mid:[" + mid + " " + mid + "] @compartment:" + compartment, {}, function (err, reply) {
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
      var _this12 = this;

      return new Promise(function (resolve, reject) {
        var packageNo = getPackageIdFromBarCode(action.barcode);
        _this12.mySearch.update(packageNo, { mid: action.mid }, function (err, result) {
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

            if (pkgIfno.refLoc) {
              pkg.package.wloc = pkgIfno.refLoc;
              if (Number(pkgIfno.nodocs) != 0) pkg.package.hasDocs = 0;
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
      var _this13 = this;

      return new Promise(function (resolve, reject) {
        var srv = _this13;
        var pkgId = getPackageIdFromBarCode(barcode);
        srv.mySearch.getDoc(pkgId, function (err, pkg) {
          pkg.doc.status = 4;
          pkg.doc.location = "Warehouse NAS";
          srv.mySearch.update(pkgId, pkg.doc, function (err, updateResult) {
            if (err) reject({ updated: false });
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
//# sourceMappingURL=data:application/json;charset=utf8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIlJlZGlzU2VydmljZXMvUGFja2FnZVNlcnZpY2UuZXM2Il0sIm5hbWVzIjpbInJlZGlzIiwicmVxdWlyZSIsImxyZWRpcyIsIm1vbWVudCIsInJlZGlzU2VhcmNoIiwiZnMiLCJQYWNrYWdlVXRpbCIsIlBhY2thZ2VVdGlsaXR5IiwicGFja2FnZVV0aWwiLCJQS0dfSURYIiwiUEtHX0lEX0NPVU5URVIiLCJkYXRhQ29udGV4dCIsIlBLR19QUkVGSVgiLCJBV0JfSUQiLCJJTkRFWF9BV0IiLCJSRUNfUEtHIiwidW5pcUlkIiwiQ3VzdG9tZXJTZXJ2aWNlIiwiY3VzdG9tZXJTZXJ2aWNlIiwiUEtHX1NUQVRVUyIsImFkZENvbW1hbmQiLCJhd2JJbmRleCIsImNsaWVudE9wdGlvbnMiLCJzZWFyY2hDbGllbnREZXRhaWxzIiwicGFja2FnZUluZGV4IiwiZ2V0UGFja2FnZVZvbHVtbmUiLCJtUGFja2FnZSIsImNyZWF0ZURvY3VtZW50IiwidFBhY2thZ2UiLCJwYWNrYWdlRG9jdW1lbnQiLCJpZCIsInRyYWNraW5nTm8iLCJza3lib3giLCJkYXRlUmVjaWV2ZWQiLCJ1bml4IiwiYXdiIiwibWlkIiwidm9sdW1lIiwid2VpZ2h0IiwicGllY2VzIiwiY3VzdG9tZXIiLCJzaGlwcGVyIiwiZGVzY3JpcHRpb24iLCJkaW1lbnNpb25zIiwiY2FycmllciIsInN0YXR1cyIsInZhbHVlIiwiY29uc29sZSIsImxvZyIsInNldFBhY2thZ2VJblRyYW5zaXQiLCJrZXlzIiwibXNlYXJjaGVyIiwiUHJvbWlzZSIsInJlc29sdmUiLCJyZWplY3QiLCJiYXRjaGVyIiwiY2xpZW50IiwiYmF0Y2giLCJmb3JFYWNoIiwibG9jYXRpb24iLCJlbGVtZW50IiwiaG1zZXQiLCJleGVjIiwiZXJyIiwicmVzdWx0IiwiYWRkUGFja2FnZVRvSW5kZXgiLCJnZXRQYWNrYWdlIiwidGhlbiIsImRlbERvY3VtZW50IiwicGFjayIsImRvbmUiLCJkb2N1bWVudCIsImFkZCIsIlBhY2thZ2VTZXJ2aWNlIiwic2V0dXBJbmRleCIsIm15U2VhcmNoIiwicmVkaXNDbGllbnQiLCJleGlzdHMiLCJzZXQiLCJpbml0UmVzdWx0IiwiaW5jciIsIm5ld0lkIiwidG9TdHJpbmciLCJ1cGRhdGVkX2J5IiwidXNlcm5hbWUiLCJkYXRlX3VwZGF0ZWQiLCJ1cGRhdGUiLCJlcnIxIiwiYXdiUmVzIiwic2F2ZWQiLCJyZXBseSIsImludm9pY2UiLCJoYXNEb2NzIiwiY3JlYXRlZF9ieSIsImRhdGVDcmVhdGVkIiwic2VhcmNoIiwibnVtYmVyT2ZSZXN1bHRzIiwib2Zmc2V0IiwicGFja2FnZXMiLCJ0b3RhbFJlc3VsdHMiLCJyZXN1bHRzIiwicGFja2FnZTEiLCJkb2MiLCJOdW1iZXIiLCJkYXRhIiwic3J2IiwicGFja2FnZWxpc3QiLCJjb3VudCIsImxlbmd0aCIsInN1YnN0cmluZyIsInB1c2giLCJzb3J0QnkiLCJhd2JzIiwiYXdiTGlzdCIsImFsbCIsIm1hcCIsImdldEN1c3RvbWVyIiwiY3VzdG9tZXJJZCIsImdldEF3Yk92ZXJ2aWV3IiwiY3VzdG9tZXJzIiwiaSIsImZvcm1hdCIsImNvbnNpZ25lZSIsIm5hbWUiLCJkZXRhaWxzIiwicG1iIiwiY2F0Y2giLCJnZXREb2MiLCJnZXRBd2JEZXRhaWxzIiwidHJhY2tpbmdOdW1iZXIiLCJsb2NhdGlvbl9pZCIsInBhY2thZ2VSZXN1bHQiLCJuZXdQYWNrYWdlIiwiYm94U2l6ZSIsImF3YkluZm8iLCJpc1NlZCIsImludm9pY2VOdW1iZXIiLCJoYXptYXQiLCJzYXZlQXdiIiwiY1BhY2thZ2UiLCJhd2JSZXN1bHQiLCJpc0NvbnNvbGlkYXRlZCIsInNhdmVQYWNrYWdlVG9Bd2IiLCJwa2dCYXRjaCIsInNhZGQiLCJwa2dSZXN1bHQiLCJwa2ciLCJobWdldCIsImdldFBhY2thZ2VJZEZyb21CYXJDb2RlIiwidG90YWxXZWlnaHQiLCJpc05hTiIsImJvZHkiLCJyZXBsYWNlIiwidHJpbSIsInRyYWNraW5nIiwicmVzcG9uc2UiLCJpbmRleFBhY2thZ2UiLCJkb2NSZXN1bHQiLCJwYWdlIiwicGFnZVNpemUiLCJiYXJjb2RlIiwicGtnSWQiLCJnZXRBd2IiLCJhd2JpbmZvIiwicGFja2FnZSIsIm1zZWFyY2giLCJvbGREb2NJZCIsImRvY0lkIiwidXBkYXRlZFBhY2thZ2VzIiwicGFja2FnZUlkIiwibWFuaWZlc3QiLCJtYW5pZmVzdEtleSIsImRlbCIsImRlY3IiLCJnZXRLZXlzIiwia2V5c0NvdW50Iiwia1Jlc3VsdCIsInNyZW0iLCJyUmVzdWx0IiwiZGVsZXRlZCIsImJpbiIsInNlYXJjaGVyIiwiaXNOb0RvYyIsImNvbXBhbnkiLCJnZXRQYWNrYWdlQnlEb2NJZCIsImFjdGlvbiIsInBhY2thZ2VObyIsImNvbXBhcnRtZW50IiwiYWRkZWQiLCJnZXRGbGlnaHRDb21wYXJ0bWVudFdlaWdodCIsImZyZXN1bHQiLCJhZ2dyZWdhdGUiLCJyZW1vdmVkIiwic2hpcG1lbnRJZCIsInNoaXBtZW50Q291bnQiLCJzY2FyZCIsImNhcmQiLCJwa2dDb3VudCIsInBrZ0lmbm8iLCJwdWJsaXNoIiwiZ2V0UGFja2FnZUJ5SWQiLCJyZWZMb2MiLCJ3bG9jIiwibm9kb2NzIiwiZXJyUmVzcCIsInNlbnQiLCJ1cGRhdGVSZXN1bHQiLCJ1cGRhdGVkIiwiYmFyQ29kZVZhbHVlIiwicGFydHMiLCJzcGxpdCJdLCJtYXBwaW5ncyI6Ijs7Ozs7Ozs7O0FBQUE7O0FBQ0E7Ozs7OztBQUdBLElBQUlBLFFBQVFDLFFBQVEsT0FBUixDQUFaO0FBQ0EsSUFBSUMsU0FBU0QsUUFBUSxlQUFSLENBQWI7QUFDQSxJQUFJRSxTQUFTRixRQUFRLFFBQVIsQ0FBYjtBQUNBLElBQUlHLGNBQWNILFFBQVEscUJBQVIsQ0FBbEI7QUFDQSxJQUFJSSxLQUFLSixRQUFRLElBQVIsQ0FBVDtBQUNBLElBQUlFLFNBQVNGLFFBQVEsUUFBUixDQUFiO0FBQ0EsSUFBSUssY0FBY0wsUUFBUSxxQkFBUixFQUErQk0sY0FBakQ7QUFDQSxJQUFJQyxjQUFjLElBQUlGLFdBQUosRUFBbEI7QUFDQSxJQUFNRyxVQUFV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QyxNQUFULEVBQWtCO0FBQ25DLFlBQUltRCxNQUFNLE9BQVY7QUFDQSxZQUFJd0QsUUFBUWIsd0JBQXdCWSxPQUF4QixDQUFaO0FBQ0N2RCxZQUFJOUIsUUFBSixDQUFhb0QsTUFBYixDQUFvQmtDLEtBQXBCLEVBQTBCLFVBQUNsRyxHQUFELEVBQUttRixHQUFMLEVBQVc7QUFDakNBLGNBQUk1QyxHQUFKLENBQVF6RCxNQUFSLEdBQWlCLENBQWpCO0FBQ0FxRyxjQUFJNUMsR0FBSixDQUFRM0MsUUFBUixHQUFvQixlQUFwQjtBQUNBOEMsY0FBSTlCLFFBQUosQ0FBYVcsTUFBYixDQUFvQjJFLEtBQXBCLEVBQTBCZixJQUFJNUMsR0FBOUIsRUFBa0MsVUFBQ3ZDLEdBQUQsRUFBSytJLFlBQUwsRUFBb0I7QUFDcEQsZ0JBQUcvSSxHQUFILEVBQ0VULE9BQU8sRUFBQ3lKLFNBQVEsS0FBVCxFQUFQO0FBQ0YxSixvQkFBUSxFQUFDMEosU0FBUSxJQUFULEVBQVI7QUFDRCxXQUpEO0FBS0gsU0FSRDtBQVNGLE9BWk0sQ0FBUDtBQWFEOztBQUVEOzs7Ozs7O0FBR0gsU0FBUzNELHVCQUFULENBQWlDNEQsWUFBakMsRUFBOEM7QUFDNUMsTUFBSUMsUUFBUUQsYUFBYUUsS0FBYixDQUFtQixHQUFuQixDQUFaO0FBQ0EsTUFBSUQsTUFBTXJHLE1BQU4sSUFBZ0IsQ0FBcEIsRUFDRSxJQUFJLE9BQU9xRyxNQUFNLENBQU4sQ0FBUCxJQUFtQixXQUF2QixFQUNBLE9BQU9BLE1BQU0sQ0FBTixFQUFTeEQsSUFBVCxFQUFQO0FBQ0YsU0FBTyxFQUFQO0FBQ0QiLCJmaWxlIjoiUmVkaXNTZXJ2aWNlcy9QYWNrYWdlU2VydmljZS5qcyIsInNvdXJjZXNDb250ZW50IjpbImltcG9ydCB7IGNwdXMgfSBmcm9tIFwib3NcIjtcbmltcG9ydCB7IHByb21pc2VzIH0gZnJvbSBcImRuc1wiO1xuXG5cbnZhciByZWRpcyA9IHJlcXVpcmUoXCJyZWRpc1wiKTtcbnZhciBscmVkaXMgPSByZXF1aXJlKFwiLi9yZWRpcy1sb2NhbFwiKTtcbnZhciBtb21lbnQgPSByZXF1aXJlKFwibW9tZW50XCIpO1xudmFyIHJlZGlzU2VhcmNoID0gcmVxdWlyZShcIi4uL3JlZGlzZWFyY2hjbGllbnRcIik7XG52YXIgZnMgPSByZXF1aXJlKFwiZnNcIik7XG52YXIgbW9tZW50ID0gcmVxdWlyZSgnbW9tZW50JylcbnZhciBQYWNrYWdlVXRpbCA9IHJlcXVpcmUoXCIuLi9VdGlsL3BhY2thZ2V1dGlsXCIpLlBhY2thZ2VVdGlsaXR5O1xudmFyIHBhY2thZ2VVdGlsID0gbmV3IFBhY2thZ2VVdGlsKCk7XG5jb25zdCBQS0dfSURYID0gXCJpbmRleDpwYWNrYWdlc1wiO1xuY29uc3QgUEtHX0lEX0NPVU5URVIgPSBcInBhY2thZ2U6aWRcIjtcbnZhciBkYXRhQ29udGV4dCA9IHJlcXVpcmUoJy4vZGF0YUNvbnRleHQnKVxuY29uc3QgUEtHX1BSRUZJWCA9IFwicGFja2FnZXM6XCI7XG5jb25zdCBBV0JfSUQgPSBcImF3YjppZFwiXG5jb25zdCBJTkRFWF9BV0IgPSBcImluZGV4OmF3YlwiXG5jb25zdCBSRUNfUEtHID0gXCJwa2c6cmVjOlwiXG52YXIgdW5pcUlkID0gcmVxdWlyZShcInVuaXFpZFwiKTsgXG52YXIgQ3VzdG9tZXJTZXJ2aWNlID0gcmVxdWlyZSgnLi9DdXN0b21lclNlcnZpY2UnKS5DdXN0b21lclNlcnZpY2U7IFxudmFyIGN1c3RvbWVyU2VydmljZSA9IG5ldyBDdXN0b21lclNlcnZpY2UoKVxuY29uc3QgUEtHX1NUQVRVUyA9IHsgXG4gIDEgOiBcIlJlY2VpdmVkXCIsXG4gIDI6IFwiTG9hZGVkIG9uIEFpckNyYWZ0XCIsXG4gIDM6IFwiSW4gVHJhbnNpdFwiLFxuICA0OiBcIlJlY2lldmVkIGluIE5BU1wiLFxuICA1OiBcIlJlYWR5IGZvciBQaWNrdXAgLyBEZWxpdmVyeVwiLFxuICA2OiBcIkRlbGl2ZXJlZFwiXG5cbn07IFxucmVkaXMuYWRkQ29tbWFuZChcImZ0LmFnZ3JlZ2F0ZVwiKVxuY29uc3QgYXdiSW5kZXggPSByZWRpc1NlYXJjaChyZWRpcywgSU5ERVhfQVdCLCB7XG4gIGNsaWVudE9wdGlvbnM6IGxyZWRpcy5zZWFyY2hDbGllbnREZXRhaWxzXG59KTtcbmNvbnN0IHBhY2thZ2VJbmRleCA9IHJlZGlzU2VhcmNoKHJlZGlzLCBQS0dfSURYLCB7XG4gIGNsaWVudE9wdGlvbnM6IGxyZWRpcy5zZWFyY2hDbGllbnREZXRhaWxzXG59KTtcbmZ1bmN0aW9uIGdldFBhY2thZ2VWb2x1bW5lKG1QYWNrYWdlKXtcblxuICByZXR1cm4gMDsgXG59XG5mdW5jdGlvbiBjcmVhdGVEb2N1bWVudCh0UGFja2FnZSkge1xuICB2YXIgcGFja2FnZURvY3VtZW50ID0ge1xuICAgIGlkOnRQYWNrYWdlLmlkLFxuICAgIHRyYWNraW5nTm86IHRQYWNrYWdlLnRyYWNraW5nTm8sXG4gICAgc2t5Ym94OiB0UGFja2FnZS5za3lib3gsXG4gICAgZGF0ZVJlY2lldmVkIDogbW9tZW50KCkudW5peCgpLCBcbiAgICBhd2I6MCwgXG4gICAgbWlkOjAsXG4gICAgdm9sdW1lOiBnZXRQYWNrYWdlVm9sdW1uZSh0UGFja2FnZSksXG4gICAgd2VpZ2h0OnRQYWNrYWdlLndlaWdodCxcbiAgICBwaWVjZXM6dFBhY2thZ2UucGllY2VzLFxuICAgIGN1c3RvbWVyOiB0UGFja2FnZS5jdXN0b21lcixcbiAgICBzaGlwcGVyOiB0UGFja2FnZS5zaGlwcGVyLFxuICAgIGRlc2NyaXB0aW9uOiB0UGFja2FnZS5kZXNjcmlwdGlvbixcbiAgICBkaW1lbnNpb25zOnRQYWNrYWdlLmRpbWVuc2lvbnMsXG4gICAgY2Fycmllcjp0UGFja2FnZS5jYXJyaWVyLFxuICAgIC8vc2t5Ym94VjogdFBhY2thZ2Uuc2t5Ym94LCBhZGQgZGltZW5pb24gXG4gICAgc3RhdHVzOiB0UGFja2FnZS5zdGF0dXMsXG4gICAgbWlkOiB0UGFja2FnZS5taWQsXG4gICAgdmFsdWU6IHRQYWNrYWdlLnZhbHVlLFxuICAgIFxuICB9O1xuICBjb25zb2xlLmxvZyhcImFib3V0IHRvIGFkZCB0aGUgcGFja2FnZSB0byB0aGUgaW5kZXhcIik7XG4gIHJldHVybiBwYWNrYWdlRG9jdW1lbnQ7XG59XG5mdW5jdGlvbiBzZXRQYWNrYWdlSW5UcmFuc2l0KGtleXMsIG1zZWFyY2hlcikge1xuICByZXR1cm4gbmV3IFByb21pc2UoKHJlc29sdmUsIHJlamVjdCkgPT4ge1xuICAgIHZhciBiYXRjaGVyID0gbXNlYXJjaGVyLmNsaWVudC5iYXRjaCgpO1xuICAgIGtleXMuZm9yRWFjaChlbGVtZW50ID0+IHtcbiAgICAgIHZhciB2YWx1ZSA9IHtcbiAgICAgICAgc3RhdHVzOiAyLFxuICAgICAgICBsb2NhdGlvbjogXCJJbiBUcmFuc2l0XCJcbiAgICAgIH07XG4gICAgICBjb25zb2xlLmxvZyhlbGVtZW50ICsgXCJpcyB0aGUgZWxlbWVudFwiKTtcblxuICAgICAgYmF0Y2hlci5obXNldChQS0dfUFJFRklYICsgZWxlbWVudCwgdmFsdWUpO1xuICAgIH0pO1xuICAgIGJhdGNoZXIuZXhlYygoZXJyLCByZXN1bHQpID0+IHtcbiAgICAgIGNvbnNvbGUubG9nKHJlc3VsdCk7XG4gICAgICAvL3JlYWRkIHRoZSBkb2N1bWVudHMgaGVyZVxuICAgICAga2V5cy5mb3JFYWNoKGVsZW1lbnQgPT4ge1xuICAgICAgICBhZGRQYWNrYWdlVG9JbmRleChlbGVtZW50LCBtc2VhcmNoZXIpO1xuICAgICAgfSk7XG4gICAgICByZXNvbHZlKHJlc3VsdCk7XG4gICAgfSk7XG4gIH0pO1xufVxuXG5mdW5jdGlvbiBhZGRQYWNrYWdlVG9JbmRleCh0cmFja2luZ05vLCBtc2VhcmNoZXIpIHtcbiAgbHJlZGlzLmdldFBhY2thZ2UodHJhY2tpbmdObykudGhlbihwYWNrID0+IHtcbiAgICBtc2VhcmNoZXIuZGVsRG9jdW1lbnQoUEtHX0lEWCwgYCR7cGFjay5taWR9LSR7dHJhY2tpbmdOb31gLCAoZXJyLCBkb25lKSA9PiB7XG4gICAgICB2YXIgZG9jdW1lbnQgPSBjcmVhdGVEb2N1bWVudChwYWNrKTtcbiAgICAgIGNvbnNvbGUubG9nKFwicmVhZGRpbmcgcGFja2FnZSB0byB0aGUgaW5kZXggbGlrZSBhIGJvc3MgXCIgKyB0cmFja2luZ05vKTtcbiAgICAgIG1zZWFyY2hlci5hZGQocGFjay5taWQgKyBcIi1cIiArIHBhY2sudHJhY2tpbmdObywgZG9jdW1lbnQpO1xuICAgIH0pO1xuICB9KTtcbn1cbmV4cG9ydCBjbGFzcyBQYWNrYWdlU2VydmljZSB7XG4gIGNvbnN0cnVjdG9yKCkge1xuICAgIHRoaXMuc2V0dXBJbmRleCgpO1xuICB9XG4gIHNldHVwSW5kZXgoKSB7XG4gICAgdGhpcy5teVNlYXJjaCA9IHJlZGlzU2VhcmNoKHJlZGlzLCBQS0dfSURYLCB7XG4gICAgICBjbGllbnRPcHRpb25zOiBscmVkaXMuc2VhcmNoQ2xpZW50RGV0YWlsc1xuICAgIH0pO1xuICB9XG4gIGdldE5ld0F3Yigpe1xuICAgIHJldHVybiBuZXcgUHJvbWlzZSgocmVzb2x2ZSxyZWplY3QpPT57XG4gICAgICBkYXRhQ29udGV4dC5yZWRpc0NsaWVudC5leGlzdHMoQVdCX0lELChlcnIscmVzdWx0KT0+e1xuICAgICAgICBjb25zb2xlLmxvZyhyZXN1bHQpOyBcbiAgICAgICAgaWYgKHJlc3VsdCAhPSBcIjFcIil7XG4gICAgICAgICAgZGF0YUNvbnRleHQucmVkaXNDbGllbnQuc2V0KEFXQl9JRCA9PSAxMDAwMDAsKGVycixpbml0UmVzdWx0KT0+e1xuICAgICAgICAgICAgZGF0YUNvbnRleHQucmVkaXNDbGllbnQuaW5jcihBV0JfSUQsKGVycixuZXdJZCk9PntcbiAgICAgICAgICAgICAgcmVzb2x2ZSh7YXdiOm5ld0lkfSlcbiAgICAgICAgICAgIH0pXG4gICAgICAgICAgfSlcbiAgICAgICAgfVxuICAgICAgICBlbHNlIHtcbiAgICAgICAgICBkYXRhQ29udGV4dC5yZWRpc0NsaWVudC5pbmNyKEFXQl9JRCwoZXJyLG5ld0lkKT0+e1xuICAgICAgICAgICAgcmVzb2x2ZSh7YXdiOm5ld0lkfSlcbiAgICAgICAgICB9KVxuICAgICAgICB9XG4gICAgICB9KVxuICAgIH0pO1xuICB9XG4gIHNhdmVBd2IoYXdiKXtcbiAgICByZXR1cm4gbmV3IFByb21pc2UoKHJlc29sdmUscmVqZWN0KT0+e1xuICAgICAgY29uc29sZS5sb2coJ3NhdmluZy4uLicsYXdiLG1vbWVudCgpLnRvU3RyaW5nKFwiaGg6bW06c3NcIikpXG4gICAgICBpZiAoYXdiLmlkICE9XCJcIil7XG4gICAgICAgIGF3Yi51cGRhdGVkX2J5ID0gYXdiLnVzZXJuYW1lOyBcbiAgICAgICAgYXdiLmRhdGVfdXBkYXRlZCA9IG1vbWVudCgpLnVuaXgoKTsgXG4gICAgICAgIGF3YkluZGV4LnVwZGF0ZShhd2IuaWQsYXdiLChlcnIxLGF3YlJlcyk9PntcbiAgICAgICAgICBpZiAoZXJyMSl7XG4gICAgICAgICAgICBjb25zb2xlLmxvZygnc2F2aW5nIGVycicsZXJyMSlcbiAgICAgICAgICAgIHJlc29sdmUoe3NhdmVkOmZhbHNlfSlcbiAgICAgICAgICB9XG4gICAgICAgICAgcmVzb2x2ZSh7c2F2ZWQ6dHJ1ZSwgaWQ6YXdiLmlkfSlcbiAgICAgICAgfSlcbiAgICAgIH1cbiAgICAgIGVsc2V7XG4gICAgICBkYXRhQ29udGV4dC5yZWRpc0NsaWVudC5pbmNyKEFXQl9JRCwoZXJyLHJlcGx5KT0+e1xuICAgICAgICBhd2IuaWQgPSByZXBseTsgXG4gICAgICAgIGF3Yi5zdGF0dXMgPSAxOyBcbiAgICAgICAgaWYgKGF3Yi5pbnZvaWNlKXtcbiAgICAgICAgICBhd2IuaGFzRG9jcyA9IDFcbiAgICAgICAgICBjb25zb2xlLmxvZyhcIkhBUyBET0NDQ0NDXCIpXG4gICAgICAgIH1cbiAgICAgICAgZWxzZSB7XG4gICAgICAgICAgYXdiLmhhc0RvY3MgPSAwIDsgXG4gICAgICAgICAgY29uc29sZS5sb2coXCJIQVMgTk8gRE9DQ0NDQ1wiKVxuICAgICAgICB9XG5cbiAgICAgICAgYXdiLmNyZWF0ZWRfYnkgPSBhd2IudXNlcm5hbWU7IFxuICAgICAgICBkZWxldGUgYXdiLnVzZXJuYW1lO1xuICAgICAgICBhd2IuZGF0ZUNyZWF0ZWQgPSBtb21lbnQoKS51bml4KCk7IFxuICAgICAgICAgIGF3YkluZGV4LmFkZChhd2IuaWQsYXdiLChlcnIxLGF3YlJlcyk9PntcbiAgICAgICAgICAgIGlmIChlcnIxKXtcbiAgICAgICAgICAgICAgY29uc29sZS5sb2coJ3NhdmluZyBlcnInLGVycjEpXG4gICAgICAgICAgICAgIHJlc29sdmUoe3NhdmVkOmZhbHNlfSlcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIHJlc29sdmUoe3NhdmVkOnRydWUsIGlkOnJlcGx5fSlcbiAgICAgICAgICB9KVxuICAgICAgfSlcbiAgICB9XG4gICAgICBcbiAgICAgIFxuICAgIH0pXG4gIH1cbiAgZ2V0QXdiT3ZlcnZpZXcoaWQpe1xuICAgIC8vIGdldCB0aGUgYXdiIHBhY2thZ2VzIGFuZCBhZGQgZXZlcnl0aGluZyBpbiBcbiAgICByZXR1cm4gbmV3IFByb21pc2UoKHJlc29sdmUscmVqZWN0KT0+e1xuICAgICAgcGFja2FnZUluZGV4LnNlYXJjaChgQGF3YjpbJHtpZH0gJHtpZH1dYCx7bnVtYmVyT2ZSZXN1bHRzOjUwMDAsb2Zmc2V0OjB9LChlcnIscGFja2FnZXMpPT57XG4gICAgICAgIHZhciB3ZWlnaHQgPSAwIDsgXG4gICAgICAgIHZhciBwaWVjZXMgPSBwYWNrYWdlcy50b3RhbFJlc3VsdHM7IFxuICAgICAgICB2YXIgZGVzY3JpcHRpb24gPSBcIlwiXG4gICAgICAgIHBhY2thZ2VzLnJlc3VsdHMuZm9yRWFjaChwYWNrYWdlMSA9PiB7XG4gICAgICAgICAgaWYgKGRlc2NyaXB0aW9uID09XCJcIilcbiAgICAgICAgICAgIGRlc2NyaXB0aW9uID0gcGFja2FnZTEuZG9jLmRlc2NyaXB0aW9uOyBcbiAgICAgICAgICB3ZWlnaHQgKz0gTnVtYmVyKHBhY2thZ2UxLmRvYy53ZWlnaHQpXG4gICAgICAgIH0pO1xuICAgICAgICB2YXIgZGF0YSAgPSB7d2VpZ2h0OndlaWdodCxkZXNjcmlwdGlvbjpkZXNjcmlwdGlvbixwaWVjZXM6cGllY2VzfVxuICAgICAgICBjb25zb2xlLmxvZyhkYXRhLFwiQVdCIERFVEFJTFNcIik7IFxuICAgICAgICByZXNvbHZlKCBkYXRhKVxuICAgICAgfSlcbiAgICB9KVxuICAgXG4gIH1cbiAgZ2V0QXdiRGV0YWlscyhpZCl7XG4gICAgdmFyIHNydiA9IHRoaXM7IFxuICAgIHJldHVybiBuZXcgUHJvbWlzZSgocmVzb2x2ZSxyZWplY3QpPT57XG4gICAgICBjb25zb2xlLmxvZyhgQGF3YjpbJHtpZH0gJHtpZH1dYClcbiAgICAgXG4gICAgICBwYWNrYWdlSW5kZXguc2VhcmNoKGBAYXdiOlske2lkfSAke2lkfV1gLHtudW1iZXJPZlJlc3VsdHM6NTAwMCxvZmZzZXQ6MH0sKGVycixwYWNrYWdlcyk9PntcbiAgICAgICAgaWYgKGVycilcbiAgICAgICAgIGNvbnNvbGUubG9nKGVycilcbiAgICAgIFxuICAgICAgICB2YXIgIHBhY2thZ2VsaXN0ICA9IFtdXG4gICAgICAgIHZhciBjb3VudCA9IDE7IFxuICAgICAgICBwYWNrYWdlcy5yZXN1bHRzLmZvckVhY2gocGFja2FnZTEgPT4ge1xuXG4gICAgICAgICAgaWYgKHBhY2thZ2UxLmRvYy50cmFja2luZ05vLmxlbmd0aCA+IDcpe1xuICAgICAgICAgICAgLy9vbmx5IGRpc3BsYXkgdGhlIGxhc3QgNyBcbiAgICAgICAgICAgIHBhY2thZ2UxLmRvYy50cmFja2luZ05vID0gcGFja2FnZTEuZG9jLnRyYWNraW5nTm8uc3Vic3RyaW5nKHBhY2thZ2UxLmRvYy50cmFja2luZ05vLmxlbmd0aCAtNylcbiAgICAgICAgICAgIFxuICAgICAgICAgIH1cbiAgICAgICAgICBwYWNrYWdlMS5kb2MucGFja2FnZUluZGV4ID0gY291bnQ7XG4gICAgICAgICAgY291bnQgKys7IFxuICAgICAgICAgIHBhY2thZ2VsaXN0LnB1c2goIHBhY2thZ2UxLmRvYylcbiAgICAgICAgfSk7XG4gICAgICAgXG4gICAgICAgXG4gICAgICAgIHJlc29sdmUoIHBhY2thZ2VsaXN0KVxuICAgICAgfSlcbiAgICB9KVxuICB9XG4gIGxpc3ROb0RvY3NGbGwoKXtcbiAgICByZXR1cm4gbmV3IFByb21pc2UoKHJlc29sdmUscmVqZWN0KT0+e1xuICAgICAgIGF3YkluZGV4LnNlYXJjaChcIkBzdGF0dXM6WzEgMV0gQGhhc0RvY3M6WzAgMF1cIix7b2Zmc2V0OjAsbnVtYmVyT2ZSZXN1bHRzOjUwMDAsc29ydEJ5OidpZCd9LChlcnIsYXdicyk9PntcbiAgICAgICAgIHZhciBhd2JMaXN0ID0gW107IFxuICAgICAgICAgUHJvbWlzZS5hbGwoYXdicy5yZXN1bHRzLm1hcChhd2I9PmN1c3RvbWVyU2VydmljZS5nZXRDdXN0b21lcihhd2IuZG9jLmN1c3RvbWVySWQpKSkudGhlbihjdXN0b21lcnM9PntcbiAgICAgICAgICAgUHJvbWlzZS5hbGwoYXdicy5yZXN1bHRzLm1hcChhd2I9PnRoaXMuZ2V0QXdiT3ZlcnZpZXcoYXdiLmRvYy5pZCkpKS50aGVuKGRldGFpbHM9PntcbiAgICAgICAgICAgIGNvbnNvbGUubG9nKFwiZ290IHRoZSBjdXN0b21lcnNcIixjdXN0b21lcnMsIGF3YnMpXG4gICAgICAgICAgICBmb3IodmFyIGkgPTAgOyBpIDwgYXdicy5yZXN1bHRzLmxlbmd0aCA7IGkrKyApe1xuICAgICAgICAgICAgICB2YXIgYXdiID0gYXdicy5yZXN1bHRzW2ldOyBcbiAgICAgICAgICAgICAgYXdiLmRvYy5kYXRlQ3JlYXRlZCA9IG1vbWVudC51bml4KGF3Yi5kb2MuZGF0ZUNyZWF0ZWQpLmZvcm1hdChcIllZWVktTU0tREQgaGg6bW0gQVwiKVxuICAgICAgICAgICAgICAvL3dlIG5lZWQgdG8gZ2V0IHRoZSBjdXN0b21lciBcbiAgICAgICAgICAgICAgYXdiLmRvYy5jb25zaWduZWUgPSBjdXN0b21lcnNbaV0ubmFtZTsgXG4gICAgICAgICAgICAgIGF3Yi5kb2Mud2VpZ2h0ID0gZGV0YWlsc1tpXS53ZWlnaHQ7IFxuICAgICAgICAgICAgICBhd2IuZG9jLnBtYiA9IGN1c3RvbWVyc1tpXS5wbWI7IFxuICAgICAgICAgICAgICBhd2IuZG9jLmRlc2NyaXB0aW9uID0gZGV0YWlsc1tpXS5kZXNjcmlwdGlvbjsgXG4gICAgICAgICAgICAgIGF3Yi5kb2MucGllY2VzID0gZGV0YWlsc1tpXS5waWVjZXM7IFxuICAgICAgICAgICAgICBpZiAoY3VzdG9tZXJzW2ldLnBtYiA9PSAnJyl7XG4gICAgICAgICAgICAgICAgYXdiLmRvYy5wbWIgPSAnOTAwMCdcbiAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICBjb25zb2xlLmxvZygncHVzaGluZyAnLGF3YilcbiAgICAgICAgICAgICAgLy93ZSBuZWVkIHRvIGdldCBhbGwgdGhlIHBhY2thZ2VzIFxuICAgICAgICAgICAgICBhd2JMaXN0LnB1c2goYXdiLmRvYylcbiAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgcmVzb2x2ZSh7YXdiczphd2JMaXN0fSlcbiAgICAgICAgICAgfSlcbiAgICAgICAgICBcbiAgICAgICAgICB9KS5jYXRjaChlcnI9PntcbiAgICAgICAgICAgIGNvbnNvbGUubG9nKGVycik7IFxuICAgICAgICAgIH0pXG4gICAgICAgICBcbiAgICAgICAgLy8gIGF3YnMucmVzdWx0cy5mb3JFYWNoKGF3YiA9PiB7XG4gICAgICAgICAgIFxuICAgICAgICAgIFxuICAgICAgICAvLyAgfSk7XG4gICAgICAgICBcbiAgICAgICB9KVxuICAgIH0pXG4gIH1cblxuICBsaXN0QXdiaW5GbGwoKXtcbiAgICByZXR1cm4gbmV3IFByb21pc2UoKHJlc29sdmUscmVqZWN0KT0+e1xuICAgICAgIGF3YkluZGV4LnNlYXJjaChcIkBzdGF0dXM6WzEgMV0gQGhhc0RvY3M6WzEgMV1cIix7b2Zmc2V0OjAsbnVtYmVyT2ZSZXN1bHRzOjUwMDAsc29ydEJ5OidpZCd9LChlcnIsYXdicyk9PntcbiAgICAgICAgIHZhciBhd2JMaXN0ID0gW107IFxuICAgICAgICAgUHJvbWlzZS5hbGwoYXdicy5yZXN1bHRzLm1hcChhd2I9PmN1c3RvbWVyU2VydmljZS5nZXRDdXN0b21lcihhd2IuZG9jLmN1c3RvbWVySWQpKSkudGhlbihjdXN0b21lcnM9PntcbiAgICAgICAgICAgUHJvbWlzZS5hbGwoYXdicy5yZXN1bHRzLm1hcChhd2I9PnRoaXMuZ2V0QXdiT3ZlcnZpZXcoYXdiLmRvYy5pZCkpKS50aGVuKGRldGFpbHM9PntcbiAgICAgICAgICAgIGNvbnNvbGUubG9nKFwiZ290IHRoZSBjdXN0b21lcnNcIixjdXN0b21lcnMsIGF3YnMpXG4gICAgICAgICAgICBmb3IodmFyIGkgPTAgOyBpIDwgYXdicy5yZXN1bHRzLmxlbmd0aCA7IGkrKyApe1xuICAgICAgICAgICAgICB2YXIgYXdiID0gYXdicy5yZXN1bHRzW2ldOyBcbiAgICAgICAgICAgICAgYXdiLmRvYy5kYXRlQ3JlYXRlZCA9IG1vbWVudC51bml4KGF3Yi5kb2MuZGF0ZUNyZWF0ZWQpLmZvcm1hdChcIllZWVktTU0tREQgaGg6bW0gQVwiKVxuICAgICAgICAgICAgICAvL3dlIG5lZWQgdG8gZ2V0IHRoZSBjdXN0b21lciBcbiAgICAgICAgICAgICAgYXdiLmRvYy5jb25zaWduZWUgPSBjdXN0b21lcnNbaV0ubmFtZTsgXG4gICAgICAgICAgICAgIGF3Yi5kb2MucG1iID0gY3VzdG9tZXJzW2ldLnBtYjsgXG4gICAgICAgICAgICAgIGF3Yi5kb2Mud2VpZ2h0ID0gZGV0YWlsc1tpXS53ZWlnaHQ7IFxuICAgICAgICAgICAgICBhd2IuZG9jLmRlc2NyaXB0aW9uID0gZGV0YWlsc1tpXS5kZXNjcmlwdGlvbjsgXG4gICAgICAgICAgICAgIGF3Yi5kb2MucGllY2VzID0gZGV0YWlsc1tpXS5waWVjZXM7IFxuICAgICAgICAgICAgICBpZiAoY3VzdG9tZXJzW2ldLnBtYiA9PSAnJyl7XG4gICAgICAgICAgICAgICAgYXdiLmRvYy5wbWIgPSAnOTAwMCdcbiAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICBjb25zb2xlLmxvZygncHVzaGluZyAnLGF3YilcbiAgICAgICAgICAgICAgLy93ZSBuZWVkIHRvIGdldCBhbGwgdGhlIHBhY2thZ2VzIFxuICAgICAgICAgICAgICBhd2JMaXN0LnB1c2goYXdiLmRvYylcbiAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgcmVzb2x2ZSh7YXdiczphd2JMaXN0fSlcbiAgICAgICAgICAgfSlcbiAgICAgICAgICBcbiAgICAgICAgICB9KS5jYXRjaChlcnI9PntcbiAgICAgICAgICAgIGNvbnNvbGUubG9nKGVycik7IFxuICAgICAgICAgIH0pXG4gICAgICAgICBcbiAgICAgICAgLy8gIGF3YnMucmVzdWx0cy5mb3JFYWNoKGF3YiA9PiB7XG4gICAgICAgICAgIFxuICAgICAgICAgIFxuICAgICAgICAvLyAgfSk7XG4gICAgICAgICBcbiAgICAgICB9KVxuICAgIH0pXG4gIH1cbiAgZ2V0QXdiKGlkKXtcbiAgICBjb25zdCBzcnYgPSB0aGlzOyBcbiAgICByZXR1cm4gbmV3IFByb21pc2UoKHJlc29sdmUscmVqZWN0KT0+e1xuICAgICAgYXdiSW5kZXguZ2V0RG9jKGlkLChlcnIsYXdiKT0+e1xuICAgICAgICAvL2dldCB0aGUgY3VzdG9tZXIgXG4gICAgICAgIGN1c3RvbWVyU2VydmljZS5nZXRDdXN0b21lcihhd2IuZG9jLmN1c3RvbWVySWQpLnRoZW4oY3VzdG9tZXI9PntcbiAgICAgICAgICBhd2IuZG9jLmN1c3RvbWVyID0gY3VzdG9tZXI7IFxuICAgICAgICAgIHNydi5nZXRBd2JEZXRhaWxzKGlkKS50aGVuKHBhY2thZ2VzPT57XG4gICAgICAgICAgICAvL2dldCB0aGUgcGFja2FnZXMgZm9yIHRoZSBhd2IgXG4gICAgICAgICAgICBhd2IuZG9jLnBhY2thZ2VzID0gcGFja2FnZXM7IFxuICAgICAgICAgICAgcmVzb2x2ZSh7YXdiOmF3Yi5kb2N9KSAgXG4gICAgICAgICAgfSlcbiAgICAgICAgICBcbiAgICAgICAgfSlcbiAgICAgICAgXG4gICAgICB9KVxuICAgIH0pXG4gIH1cbiAgdXBkYXRlTG9jYXRpb24odHJhY2tpbmdOdW1iZXIsbG9jYXRpb25faWQpe1xuICAgIHJldHVybiBuZXcgUHJvbWlzZSgocmVzb2x2ZSxyZWplY3QpPT57XG4gICAgICBwYWNrYWdlSW5kZXguc2VhcmNoKFwiQHRyYWNraW5nTm86XCIrdHJhY2tpbmdOdW1iZXIse2xvY2F0aW9uOmxvY2F0aW9uX2lkfSwoZXJyLHBhY2thZ2VSZXN1bHQpPT57XG5cbiAgICAgIH0pXG4gICAgfSlcbiAgfVxuICBzYXZlUGFja2FnZVRvQXdiKG5ld1BhY2thZ2Upe1xuICAgIHJldHVybiBuZXcgUHJvbWlzZSgocmVzb2x2ZSxyZXN1bHQpPT57XG4gICAgICBpZiAobmV3UGFja2FnZS5pZCAhPVwiMFwiKXtcbiAgICAgICAgcGFja2FnZUluZGV4LnVwZGF0ZShuZXdQYWNrYWdlLmlkLG5ld1BhY2thZ2UsKGVycixyZXN1bHQpPT57XG4gICAgICAgICAgaWYgKGVycilcbiAgICAgICAgICAgIGNvbnNvbGUubG9nKGVycik7IFxuICAgICAgICAgIHJlc29sdmUoe3NhdmVkOnRydWUsaWQ6bmV3UGFja2FnZS5pZH0pXG4gICAgICAgIH0pXG4gICAgICB9XG4gICAgICBlbHNlIHtcbiAgICAgICAgZGF0YUNvbnRleHQucmVkaXNDbGllbnQuaW5jcihQS0dfSURfQ09VTlRFUiwoZXJyLGlkKT0+e1xuICAgICAgICAgIG5ld1BhY2thZ2UuaWQgPSBpZDsgXG4gICAgICAgICAgcGFja2FnZUluZGV4LmFkZChpZCxuZXdQYWNrYWdlLChlcnIscmVzdWx0KT0+e1xuICAgICAgICAgICAgaWYgKGVycilcbiAgICAgICAgICAgICAgY29uc29sZS5sb2coZXJyKTsgXG4gICAgICAgICAgICByZXNvbHZlKHtzYXZlZDp0cnVlLGlkOmlkfSlcbiAgICAgICAgICB9KVxuICAgICAgICB9KVxuICAgICAgfVxuICAgXG4gICAgfSlcbiAgfVxuICBjcmVhdGVDb25zb2xhdGVkKHBhY2thZ2VzLHVzZXJuYW1lLGJveFNpemUpe1xuICAgIHZhciBzcnYgPSB0aGlzOyBcbiAgICByZXR1cm4gbmV3IFByb21pc2UoKHJlc29sdmUscmVqZWN0KT0+e1xuICAgICAgdmFyIGF3YkluZm8gPSB7IFxuICAgICAgICBpZDogXCJcIixcbiAgICAgICAgaXNTZWQ6MCxcbiAgICAgICAgaGFzRG9jczogXCIwXCIsXG4gICAgICAgIGludm9pY2VOdW1iZXI6XCJcIixcbiAgICAgICAgdmFsdWU6XCIwXCIsXG4gICAgICAgIGN1c3RvbWVySWQ6MjQxOTcsXG4gICAgICAgIHNoaXBwZXI6XCI0ODJcIiwgLy8gd2Ugc2hvdWxkIGdldCBhbiBpZCBoZXJlIFxuICAgICAgICBjYXJyaWVyOlwiVVNQU1wiLFxuICAgICAgICBoYXptYXQ6XCJcIixcbiAgICAgICAgdXNlcm5hbWU6ICB1c2VybmFtZVxuICAgICAgIFxuICAgIH07XG4gICAgc3J2LnNhdmVBd2IoYXdiSW5mbykudGhlbihhd2JSZXN1bHQ9PntcbiAgICAgICAvL2FkZCBcbiAgICAgICAgICB2YXIgY1BhY2thZ2UgPSB7XG4gICAgICAgICAgICBpZDowLFxuICAgICAgICAgICAgdHJhY2tpbmdObzogdW5pcUlkKCksXG4gICAgICAgICAgICBkZXNjcmlwdGlvbjogXCJDb25zb2xpZGF0ZWQgUGFja2FnZVwiLFxuICAgICAgICAgICAgd2VpZ2h0OjAsIFxuICAgICAgICAgICAgZGltZW5zaW9uczogIGAke2JveFNpemV9eCR7Ym94U2l6ZX14JHtib3hTaXplfWAsXG4gICAgICAgICAgICBhd2I6YXdiUmVzdWx0LmlkLCBcbiAgICAgICAgICAgIGlzQ29uc29saWRhdGVkOiBcIjFcIiwgXG4gICAgICAgICAgICBjcmVhdGVkX2J5OiB1c2VybmFtZSwgXG4gICAgICAgICAgXG4gICAgICAgIH07IFxuICAgICAgICBzcnYuc2F2ZVBhY2thZ2VUb0F3YihjUGFja2FnZSkudGhlbihwa2dSZXN1bHQ9PntcbiAgICAgICAgICAvLyBnZXQgdGhlIGlkIFxuICAgICAgICAgIC8vXG4gICAgICAgICAgdmFyIGJhdGNoID0gZGF0YUNvbnRleHQucmVkaXNDbGllbnQuYmF0Y2goKTsgXG4gICAgICAgICAgdmFyIHBrZ0JhdGNoID0gZGF0YUNvbnRleHQucmVkaXNDbGllbnQuYmF0Y2goKTsgXG5cbiAgICAgICAgICBwYWNrYWdlcy5mb3JFYWNoKHBrZyA9PiB7XG4gICAgICAgICAgICAvL3RoZXNlIGFyZSBiYXJjb2RlcyBcbiAgICAgICAgICAgIGJhdGNoLnNhZGQoXCJjb25zb2xpZGF0ZWQ6cGtnOlwiK3BrZ1Jlc3VsdC5pZCxwa2cpXG4gICAgICAgICAgICBwa2dCYXRjaC5obWdldChQS0dfUFJFRklYK2dldFBhY2thZ2VJZEZyb21CYXJDb2RlKHBrZyksXCJ3ZWlnaHRcIilcbiAgICAgICAgICB9KTtcbiAgICAgICAgICBiYXRjaC5leGVjKChlcnIscmVzdWx0cyk9PntcbiAgICAgICAgICAgIC8vXG4gICAgICAgICAgICBwa2dCYXRjaC5leGVjKChlcnIxLHJlc3VsdHMpPT57XG4gICAgICAgICAgICAgIHZhciB0b3RhbFdlaWdodCA9IDA7IFxuICAgICAgICAgICAgICByZXN1bHRzLmZvckVhY2god2VpZ2h0ID0+IHtcbiAgICAgICAgICAgICAgICBpZiAoaXNOYU4oTnVtYmVyKHdlaWdodCkpID09IGZhbHNlKVxuICAgICAgICAgICAgICAgICAgdG90YWxXZWlnaHQgKz0gTnVtYmVyKHdlaWdodCk7XG4gICAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgICAvL3dlIG5lZWQgdG8gdXBkYXRlIHRoZSB0b3RhbCB3ZWlnaHQgb2YgdGhlIHBhY2thZ2Ugbm93IFxuICAgICAgICAgICAgICBzcnYucGFja2FnZUluZGV4LnVwZGF0ZShjUGFja2FnZS5pZCx7d2VpZ2h0OnRvdGFsV2VpZ2h0fSlcbiAgICAgICAgICAgIH0pXG4gICAgICAgICAgICBcbiAgICAgICAgICAgIHJlc29sdmUoe3NhdmVkOnRydWUsaWQ6cGtnUmVzdWx0LmlkfSlcbiAgICAgICAgICB9KVxuICAgICAgICB9KVxuICAgICAgICBcbiAgICB9KVxuXG4gICBcbiAgICAgIC8vdmFsaWRhdGUgdGhlIHBhY2thZ2UgXG4gICAgXG5cbiAgICB9KVxuICB9XG4gIHNhdmVQYWNrYWdlKGJvZHkpe1xuICAgIHJldHVybiBuZXcgUHJvbWlzZSgocmVzb2x2ZSxyZWplY3QpPT57XG4gICAgICB2YXIgY1BhY2thZ2UgPSB7XG4gICAgICAgIFxuICAgICAgICBza3lib3g6IGJvZHkuc2t5Ym94LFxuICAgICAgICBjdXN0b21lcjogYm9keS5jdXN0b21lci5yZXBsYWNlKFwiLVwiLCBcIlwiKS50cmltKCksXG4gICAgICAgIHRyYWNraW5nTm86IGJvZHkudHJhY2tpbmcsXG4gICAgICAgIGRlc2NyaXB0aW9uOiBib2R5LmRlc2NyaXB0aW9uLFxuICAgICAgICBzaGlwcGVyOiBib2R5LnNoaXBwZXIsXG4gICAgICAgIGNhcnJpZXI6Ym9keS5jYXJyaWVyLFxuICAgICAgICB2YWx1ZTogTnVtYmVyKGJvZHkudmFsdWUpLFxuICAgICAgICBwaWVjZXM6IE51bWJlcihib2R5LnBpZWNlcyksXG4gICAgICAgIHdlaWdodDogTnVtYmVyKGJvZHkud2VpZ2h0KSxcbiAgICAgICAgZGltZW5zaW9uczogYm9keS5kaW1lbnNpb25zLFxuICAgICAgICBzdGF0dXM6IDEsXG4gICAgICAgIGxvY2F0aW9uOiBcIkZMTFwiLFxuICAgICAgICBtaWQ6IDAsXG4gICAgICAgIGF3YjowLFxuICAgICAgICAvL2hhc09wdDogdHJ1ZSxcbiAgICAgICAgLy9tdHlwZTogYm9keS5tdHlwZVxuICAgICAgfTtcbiAgICAgIC8vdmFsaWRhdGUgdGhlIHBhY2thZ2UgXG4gICAgICBkYXRhQ29udGV4dC5yZWRpc0NsaWVudC5pbmNyKFBLR19JRF9DT1VOVEVSLChlcnIsaWQpPT57XG4gICAgICAgIGNQYWNrYWdlLmlkID0gaWQ7IFxuICAgICAgICBkYXRhQ29udGV4dC5yZWRpc0NsaWVudC5zZXQoUEtHX1BSRUZJWCtpZCxjUGFja2FnZSwoZXJyLHJlc3BvbnNlKT0+e1xuICAgICAgICAgIGlmIChlcnIpe1xuICAgICAgICAgICAgcmVqZWN0KHtzYXZlZDpmYWxzZSxlcnI6ZXJyfSlcbiAgICAgICAgICB9XG4gICAgICAgICAgIHZhciBpbmRleFBhY2thZ2UgPSAgY3JlYXRlRG9jdW1lbnQoY1BhY2thZ2UpOyBcbiAgICAgICAgICAgY29uc29sZS5sb2coaW5kZXhQYWNrYWdlKTsgXG4gICAgICAgICAgIHBhY2thZ2VJbmRleC5hZGQoY1BhY2thZ2UuaWQsaW5kZXhQYWNrYWdlLChlcnIxLGRvY1Jlc3VsdCk9PntcbiAgICAgICAgICAgICBjb25zb2xlLmxvZyhkb2NSZXN1bHQpOyBcbiAgICAgICAgICAgICBpZihlcnIxKXtcbiAgICAgICAgICAgICAgIHJlamVjdCh7c2F2ZWQ6ZmFsc2UsZXJyOmVycjF9KVxuICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICByZXNvbHZlKHtzYXZlZDp0cnVlfSlcbiAgICAgICAgICAgfSlcblxuICAgICAgICB9KVxuICAgICAgfSk7XG4gICAgXG5cblxuICAgIH0pXG4gIH1cblxuICBnZXRNYW5pZmVzdFBhY2thZ2VzKCl7XG4gICAgcmV0dXJuIG5ldyBQcm9taXNlKChyZXNvbHZlLHJlamVjdCk9PntcbiAgICAgIFxuICAgICAgdGhpcy5teVNlYXJjaC5zZWFyY2goXG4gICAgICAgIGBAbWlkOlswIDBdYCxcbiAgICAgICAgeyBvZmZzZXQ6IDAsIG51bWJlck9mUmVzdWx0czogNTAwMCB9LFxuICAgICAgICAoZXJyLCBkYXRhKSA9PiB7XG4gICAgICAgICAgdmFyIHBhY2thZ2VzID0gW107XG4gICAgICAgICAgY29uc29sZS5sb2coZGF0YSk7XG4gICAgICAgICAgZGF0YS5yZXN1bHRzLmZvckVhY2goZWxlbWVudCA9PiB7XG5cbiAgICAgICAgICAgIHBhY2thZ2VzLnB1c2goZWxlbWVudC5kb2MpO1xuICAgICAgICAgICAgcmVzb2x2ZShwYWNrYWdlcyk7ICAgICAgICAgICAgICAgICBcbiAgICAgICAgfSk7XG4gICAgfSk7XG4gICAgfSlcbiAgfVxuICBnZXRSZWNlaXZlZFBhY2thZ2VzKHBhZ2UscGFnZVNpemUpe1xuICAgIHJldHVybiBuZXcgUHJvbWlzZSgocmVzb2x2ZSxyZWplY3QpPT57XG4gICAgICBcbiAgICAgIHRoaXMubXlTZWFyY2guc2VhcmNoKFxuICAgICAgICBgQG1pZDpbMCAwXWAsXG4gICAgICAgIHsgb2Zmc2V0OiAwLCBudW1iZXJPZlJlc3VsdHM6IDUwMDAgfSxcbiAgICAgICAgKGVyciwgZGF0YSkgPT4ge1xuICAgICAgICAgIHZhciBwYWNrYWdlcyA9IFtdO1xuICAgICAgICAgIGNvbnNvbGUubG9nKGRhdGEpO1xuICAgICAgICAgIGRhdGEucmVzdWx0cy5mb3JFYWNoKGVsZW1lbnQgPT4ge1xuXG4gICAgICAgICAgICBwYWNrYWdlcy5wdXNoKGVsZW1lbnQuZG9jKTtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBcbiAgICAgICAgfSk7XG4gICAgICAgIHJlc29sdmUocGFja2FnZXMpOyBcbiAgICB9KTtcbiAgICB9KVxuICB9XG4gIGdldE5vRG9jc1BhY2thY2thZ2VzKHBhZ2UscGFnZVNpemUpe1xuICAgIHJldHVybiBuZXcgUHJvbWlzZSgocmVzb2x2ZSxyZWplY3QpPT57XG4gICAgICBcbiAgICAgIHRoaXMubXlTZWFyY2guc2VhcmNoKFxuICAgICAgICBgQGhhc0RvY3M6WzAgMF1gLFxuICAgICAgICB7IG9mZnNldDogMCwgbnVtYmVyT2ZSZXN1bHRzOiA1MDAwIH0sXG4gICAgICAgIChlcnIsIGRhdGEpID0+IHtcbiAgICAgICAgICB2YXIgcGFja2FnZXMgPSBbXTtcbiAgICAgICAgICBjb25zb2xlLmxvZyhkYXRhKTtcbiAgICAgICAgICBkYXRhLnJlc3VsdHMuZm9yRWFjaChlbGVtZW50ID0+IHtcblxuICAgICAgICAgICAgcGFja2FnZXMucHVzaChlbGVtZW50LmRvYyk7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgXG4gICAgICAgIH0pO1xuICAgICAgICByZXNvbHZlKHBhY2thZ2VzKTsgXG4gICAgfSk7XG4gICAgfSlcbiAgfVxuICBnZXRwYWNrYWdlYnlSZWRpc0lkKGlkKXtcbiAgICByZXR1cm4gbmV3IFByb21pc2UoKHJlc29sdmUscmVqZWN0KT0+e1xuICAgICAgcGFja2FnZUluZGV4LmdldERvYyhpZCwoZXJyLGRvY3VtZW50KT0+e1xuICAgICAgICByZXNvbHZlKGRvY3VtZW50LmRvYyk7IFxuICAgICAgfSlcbiAgICB9KVxuICB9XG4gIGdldFBhY2thZ2VCeUlkKGJhcmNvZGUpe1xuICAgIHZhciBzcnYgPSB0aGlzOyBcbiAgICB2YXIgcGtnSWQgPSBnZXRQYWNrYWdlSWRGcm9tQmFyQ29kZShiYXJjb2RlKTsgXG4gICAgcmV0dXJuIG5ldyBQcm9taXNlKChyZXNvbHZlLHJlamVjdCk9PntcbiAgICAgIHRoaXMubXlTZWFyY2guZ2V0RG9jKHBrZ0lkLChlcnIsZG9jdW1lbnQpPT57XG4gICAgICAgIC8vZ2V0IHRoZSBhd2IgaW5mbyBoZXJlIGFzIHdlbGwgXG4gICAgICAgIHNydi5nZXRBd2IoZG9jdW1lbnQuZG9jLmF3YikudGhlbihhd2JpbmZvPT57XG4gICAgICAgICAgY29uc29sZS5sb2coYXdiaW5mbyk7IFxuICAgICAgICAgIHZhciByZXNwb25zZSA9IHsgXG4gICAgICAgICAgICBhd2IgOiBhd2JpbmZvLmF3YixcbiAgICAgICAgICAgIHBhY2thZ2UgOiBkb2N1bWVudC5kb2NcbiAgICAgICAgICB9XG4gICAgICAgICAgcmVzb2x2ZShyZXNwb25zZSk7IFxuICAgICAgICB9KTsgXG4gICAgICAgIFxuICAgICAgfSlcbiAgICB9KTsgXG4gIH1cbiAgZ2V0UGFja2FnZUJ5RG9jSWQocGtnSWQpe1xuICAgIHZhciBzcnYgPSB0aGlzOyBcbiAgICByZXR1cm4gbmV3IFByb21pc2UoKHJlc29sdmUscmVqZWN0KT0+e1xuICAgICAgdGhpcy5teVNlYXJjaC5nZXREb2MocGtnSWQsKGVycixkb2N1bWVudCk9PntcbiAgICAgICAgLy9nZXQgdGhlIGF3YiBpbmZvIGhlcmUgYXMgd2VsbCBcbiAgICAgICAgc3J2LmdldEF3Yihkb2N1bWVudC5kb2MuYXdiKS50aGVuKGF3YmluZm89PntcbiAgICAgICAgICBjb25zb2xlLmxvZyhhd2JpbmZvKTsgXG4gICAgICAgICAgdmFyIHJlc3BvbnNlID0geyBcbiAgICAgICAgICAgIGF3YiA6IGF3YmluZm8uYXdiLFxuICAgICAgICAgICAgcGFja2FnZSA6IGRvY3VtZW50LmRvY1xuICAgICAgICAgIH1cbiAgICAgICAgICByZXNvbHZlKHJlc3BvbnNlKTsgXG4gICAgICAgIH0pOyBcbiAgICAgICAgXG4gICAgICB9KVxuICAgIH0pOyBcbiAgfVxuICAvL3VzaW5nIHRoaXMgXG4gIFxuXG4gIHVwZGF0ZU1hbmlmZXN0UGFja2FnZVRvSW5UcmFuc2l0KG1pZCkge1xuICAgIC8vZ2V0IGFsbCB0aGUgcGFja2FnZXNcbiAgICAvL3dlIG5lZWQgdG8gdXBkYXRlIHRoZSBpbmRleCBhdCB0aGlzIHBvaW50IGFzIHdlbGxcbiAgICB2YXIgbXNlYXJjaCA9IHRoaXMubXlTZWFyY2g7XG4gICAgdGhpcy5teVNlYXJjaC5zZWFyY2goXG4gICAgICBgQG1pZDpbJHttaWR9ICR7bWlkfV1gLFxuICAgICAgeyBvZmZzZXQ6IDAsIG51bWJlck9mUmVzdWx0czogNTAwMCB9LFxuICAgICAgKGVyciwgZGF0YSkgPT4ge1xuICAgICAgICB2YXIgcGFja2FnZXMgPSBbXTtcbiAgICAgICAgY29uc29sZS5sb2coZGF0YSk7XG4gICAgICAgIGRhdGEucmVzdWx0cy5mb3JFYWNoKGVsZW1lbnQgPT4ge1xuICAgICAgICAgIHZhciBvbGREb2NJZCA9IGVsZW1lbnQuZG9jSWQ7XG4gICAgICAgICAgZWxlbWVudC5kb2NJZCA9IGVsZW1lbnQuZG9jSWQucmVwbGFjZShgJHttaWR9LWAsIFwiXCIpO1xuICAgICAgICAgIHBhY2thZ2VzLnB1c2goZWxlbWVudC5kb2NJZCk7XG4gICAgICAgICAgLy8gaSBjb3VsZCBkZWxldGUgaGVyZVxuICAgICAgICAgIC8vIG1zZWFyY2guZGVsRG9jdW1lbnQoUEtHX0lEWCxvbGREb2NJZClcbiAgICAgICAgICAvL3VwZGF0ZSBhbGwgdGhlIHBhY2thZ2VzXG4gICAgICAgIH0pO1xuICAgICAgICBzZXRQYWNrYWdlSW5UcmFuc2l0KHBhY2thZ2VzLCBtc2VhcmNoLCBtaWQpLnRoZW4oZnVuY3Rpb24oXG4gICAgICAgICAgdXBkYXRlZFBhY2thZ2VzXG4gICAgICAgICkge1xuICAgICAgICAgIGNvbnNvbGUubG9nKFwidXBkYXRlZCBwYWNrYWdlc1wiKTtcbiAgICAgICAgICBjb25zb2xlLmxvZyh1cGRhdGVkUGFja2FnZXMpO1xuICAgICAgICB9KTtcbiAgICAgIH1cbiAgICApO1xuICB9XG4gIHJlbW92ZVBhY2thZ2VGcm9tTWFuaWZlc3QocGFja2FnZUlkLCBtaWQpIHtcbiAgICB2YXIgbXNlYXJjaCA9IHRoaXMubXlTZWFyY2g7XG4gICAgcmV0dXJuIG5ldyBQcm9taXNlKChyZXNvbHZlLCByZWplY3QpID0+IHtcbiAgICAgIHZhciBtYW5pZmVzdCA9IG1pZDtcbiAgICAgIHZhciBtYW5pZmVzdEtleSA9IFwibWFuaWZlc3Q6XCIgKyBtYW5pZmVzdCArIFwiOipcIjtcblxuICAgICAgbHJlZGlzLmRlbChcInBhY2thZ2VzOlwiICsgdHJhY2tpbmdObykudGhlbihmdW5jdGlvbihyZXN1bHQpIHtcbiAgICAgICAgY29uc29sZS5sb2cocmVzdWx0KTtcbiAgICAgICAgbXNlYXJjaC5kZWxEb2N1bWVudChQS0dfSURYLCBgJHttaWR9LSR7dHJhY2tpbmdOb31gKTtcbiAgICAgICAgLy93ZSBuZWVkIHRvIHJlbW92ZSBmcm9tIHRoZSBpbmRleCBhbmQgZGVjIHRoZSBjb3VudGVyXG4gICAgICAgIGxyZWRpcy5jbGllbnQuZGVjcihcIm1jb3VudGVyOlwiICsgbWlkKTtcbiAgICAgICAgLy9yU2VydmljZXMucGFja2FnZVNlcnZpY2Uucm1QYWNrYWdlKG1pZCwgdHJhY2tpbmdObyk7XG4gICAgICAgIGxyZWRpcy5nZXRLZXlzKG1hbmlmZXN0S2V5KS50aGVuKGtSZXN1bHQgPT4ge1xuICAgICAgICAgIC8vdGhlIGxpc3Qgb2YgYWxsIHRoZSBzZXRzIC4uLndlIG5lZWQgdG8gcmVtb3ZlIHRoZSBrZXkgZnJvbSBlYWNoIG9uZVxuICAgICAgICAgIHZhciBrZXlzQ291bnQgPSAwO1xuXG4gICAgICAgICAga1Jlc3VsdC5mb3JFYWNoKGVsZW1lbnQgPT4ge1xuICAgICAgICAgICAgY29uc29sZS5sb2coXG4gICAgICAgICAgICAgIGByZW1vdmluZyAke3RyYWNraW5nTm99IHBhY2thZ2UgbWFuaWZlc3Qgc2V0ICR7ZWxlbWVudH0gYFxuICAgICAgICAgICAgKTtcbiAgICAgICAgICAgIGxyZWRpcy5zcmVtKGVsZW1lbnQsIHRyYWNraW5nTm8pLnRoZW4oZnVuY3Rpb24oclJlc3VsdCkge1xuICAgICAgICAgICAgICBjb25zb2xlLmxvZyhyUmVzdWx0KTtcbiAgICAgICAgICAgICAgY29uc29sZS5sb2coXCJyZW1vdmVkXCIpO1xuICAgICAgICAgICAgICBpZiAoa2V5c0NvdW50ID09IGtSZXN1bHQubGVuZ3RoIC0gMSkga2V5c0NvdW50Kys7XG4gICAgICAgICAgICB9KTtcbiAgICAgICAgICB9KTtcbiAgICAgICAgICByZXNvbHZlKHtcbiAgICAgICAgICAgIGRlbGV0ZWQ6IHRydWVcbiAgICAgICAgICB9KTtcbiAgICAgICAgfSk7XG5cbiAgICAgICAgLy93ZSBhbHNvIG5lZWQgdG8gcmVtb3ZlIGZyb20gYW55IHNldHNcbiAgICAgIH0pO1xuICAgIH0pO1xuICB9XG4gIHJlbW92ZVBhY2thZ2VCeUlkKGlkKSB7XG4gICAgdmFyIG1zZWFyY2ggPSB0aGlzLm15U2VhcmNoO1xuICAgIHJldHVybiBuZXcgUHJvbWlzZSgocmVzb2x2ZSwgcmVqZWN0KSA9PiB7XG4gICAgICBcbiAgICAgIHBhY2thZ2VJbmRleC5kZWxEb2N1bWVudChQS0dfSURYLGlkLChlcnIscmVzcG9uc2UpPT57XG4gICAgICAgIGlmIChlcnIpXG4gICAgICAgICAgY29uc29sZS5sb2coZXJyKTsgXG4gICAgICAgIGNvbnNvbGUubG9nKHJlc3BvbnNlKTsgXG4gICAgICAgIHJlc29sdmUoe2RlbGV0ZWQ6dHJ1ZX0pXG4gICAgICB9KVxuICAgICAgXG4gICAgICAgIFxuICAgICAgXG4gICAgfSk7XG4gIH1cbiAgc3RvcmVQYWNrYWdlRm9yUGlja3VwKHRyYWNraW5nTm8sYmluKXtcbiAgICB2YXIgc2VhcmNoZXIgPSB0aGlzLm15U2VhcmNoO1xuICAgIHJldHVybiBuZXcgUHJvbWlzZSgocmVzb2x2ZSxyZWplY3QpPT57XG4gICAgICAgbHJlZGlzLmhtc2V0KFBLR19QUkVGSVgrdHJhY2tpbmdObyx7c3RhdHVzOjQsbG9jYXRpb246YmlufSkudGhlbigocmVzdWx0KT0+e1xuICAgICAgICAgbHJlZGlzLmdldFBhY2thZ2UodHJhY2tpbmdObykudGhlbigocGtnKT0+e1xuICAgICAgICAgIGFkZFBhY2thZ2VUb0luZGV4KHRyYWNraW5nTm8sc2VhcmNoZXIpIDsgXG4gICAgICAgICAgcmVzb2x2ZShwa2cpOyAgIFxuICAgICAgICAgfSk7XG4gICAgICAgfSkgXG4gICAgfSk7IFxuICB9XG4gIHVwZGF0ZVBhY2thZ2VJbmRleCh0cmFja2luZyl7XG4gICAgICByZXR1cm4gbmV3IFByb21pc2UoKHJlc29sdmUscmVqZWN0KT0+e1xuICAgICAgICAgIHZhciBtc2VhcmNoID0gdGhpcy5teVNlYXJjaDsgXG4gICAgICAgICAgYWRkUGFja2FnZVRvSW5kZXgodHJhY2tpbmcsbXNlYXJjaCk7IFxuICAgICAgICAgcmVzb2x2ZSh7J3VwZGF0ZWQnOnRydWV9KTtcbiAgICAgIH0pXG4gIH1cbiAgZ2V0Q3VzdG9tZXJQYWNrYWdlcyhza3lib3gpIHt9XG5cblxuICAvL25vIG1vcmUgc2t5Ym94XG4gIGdldE1hbmlmZXN0UGFja2FnZXNCeVN0YXR1cyhtaWQsc3RhdHVzKSB7XG4gICAgICByZXR1cm4gbmV3IFByb21pc2UoKHJlc29sdmUscmVqZWN0KT0+e1xuICAgICAgICAgIGNvbnNvbGUubG9nKGBAbWlkOlske21pZH0gJHttaWR9XWApXG4gICAgICAgIHRoaXMubXlTZWFyY2guc2VhcmNoKFxuICAgICAgICAgICAgYEBtaWQ6WyR7bWlkfSAke21pZH1dYCxcbiAgICAgICAgICAgIHsgb2Zmc2V0OiAwLCBudW1iZXJPZlJlc3VsdHM6IDUwMDAgfSxcbiAgICAgICAgICAgIChlcnIsIGRhdGEpID0+IHtcbiAgICAgICAgICAgICAgdmFyIHBhY2thZ2VzID0gW107XG4gICAgICAgICAgICAgIGNvbnNvbGUubG9nKGRhdGEpO1xuICAgICAgICAgICAgICBkYXRhLnJlc3VsdHMuZm9yRWFjaChlbGVtZW50ID0+IHtcblxuICAgICAgICAgICAgICAgIHBhY2thZ2VzLnB1c2goZWxlbWVudC5kb2MpO1xuICAgICAgICAgICAgICAgIHJlc29sdmUocGFja2FnZXMpOyAgICAgICAgICAgICAgICAgXG4gICAgICAgICAgICB9KTtcbiAgICAgICAgfSk7XG4gICAgICB9KTtcbiAgXG4gIH0gICBcbiAgXG4gIC8vI3JlZ2lvbiBQYWtjYWdlIEZpbHRlcnMgIFxuICBnZXRQYWNrYWdlc05hc1dhcmVob3VzZShpc05vRG9jLGNvbXBhbnkpe1xuICAgIHZhciBzcnYgPSB0aGlzOyBcbiAgICByZXR1cm4gbmV3IFByb21pc2UoKHJlc29sdmUscmVqZWN0KT0+e1xuICAgICAgICBwYWNrYWdlSW5kZXguc2VhcmNoKGBAc3RhdHVzOls0IDRdIEBjb21wYW55OiR7Y29tcGFueX0gQGhhc0RvY3M6WyR7aXNOb0RvY30gJHtpc05vRG9jfV1gLHt9LChlcnIscmVwbHkpPT57XG4gICAgICAgICAgUHJvbWlzZS5hbGwocmVwbHkucmVzdWx0cy5tYXAocGtnID0+IHNydi5nZXRQYWNrYWdlQnlEb2NJZChwa2cuaWQpKSkudGhlbihwYWNrYWdlcz0+e1xuICAgICAgICAgICAgcmVzb2x2ZShwYWNrYWdlcyk7IFxuICAgICAgICAgIH0pXG5cbiAgICAgICAgfSlcbiAgICB9KVxuICB9XG5cbiAgLy8jZW5kcmVnaW9uXG4gIFxuXG4gICAvLyNyZWdpb24gTWFuaWZlc3QgUGFja2FnZSBGdW5jdGlvbnMgXG5cbiAgIGFkZFRvRmxpZ2h0KGFjdGlvbil7XG4gICAgIHZhciBzcnYgPSB0aGlzOyBcbiAgICByZXR1cm4gbmV3IFByb21pc2UoKHJlc29sdmUscmVqZWN0KT0+e1xuICAgICAgdmFyIHBhY2thZ2VObyA9IGdldFBhY2thZ2VJZEZyb21CYXJDb2RlKGFjdGlvbi5iYXJjb2RlKTsgXG4gICAgICBjb25zb2xlLmxvZyhhY3Rpb24pOyBcbiAgICAgIHRoaXMubXlTZWFyY2gudXBkYXRlKHBhY2thZ2VObyx7bWlkOmFjdGlvbi5taWQgLCBzdGF0dXM6IDIsIGxvY2F0aW9uOlwiTG9hZGVkIG9uIEFpckNyYWZ0XCIsY29tcGFydG1lbnQ6YWN0aW9uLmNvbXBhcnRtZW50fSwoZXJyLHJlc3VsdCk9PntcbiAgICAgICAgaWYoZXJyKVxuICAgICAgICAgIHJlc29sdmUoe2FkZGVkOmZhbHNlfSlcbiAgICAgICAgc3J2LmdldEZsaWdodENvbXBhcnRtZW50V2VpZ2h0KGFjdGlvbi5taWQsYWN0aW9uLmNvbXBhcnRtZW50KS50aGVuKGZyZXN1bHQ9PntcbiAgICAgICAgICBmcmVzdWx0LmFkZGVkID0gdHJ1ZTsgXG4gICAgICAgICAgcmVzb2x2ZShmcmVzdWx0KVxuICAgICAgICB9KVxuICAgICAgIFxuICAgICAgfSlcbiAgICAgICAgXG4gICAgfSlcbiAgIH1cbiAgIC8vZ2V0IHRoZSBjb21wYXJ0bWVudCB3ZWlnaHQgXG4gICBnZXRGbGlnaHRDb21wYXJ0bWVudFdlaWdodChtaWQsY29tcGFydG1lbnQpe1xuICAgICByZXR1cm4gbmV3IFByb21pc2UoKHJlc29sdmUscmVqZWN0KT0+e1xuICAgICAgXG4gICAgICB0aGlzLm15U2VhcmNoLmFnZ3JlZ2F0ZShgQG1pZDpbJHttaWR9ICR7bWlkfV0gQGNvbXBhcnRtZW50OiR7Y29tcGFydG1lbnR9YCwge30sKGVycixyZXBseSk9PntcbiAgICAgICAgIGlmIChlcnIpXG4gICAgICAgICBjb25zb2xlLmxvZyhlcnIpOyBcbiAgICAgICAgIGNvbnNvbGUubG9nKHJlcGx5LFwiVE9UQUwgU0VDVElPTiBXZWlnaHRcIilcbiAgICAgICAgIGlmIChyZXBseVsxXSl7XG4gICAgICAgICAgIHZhciByZXN1bHQgPSByZXBseVsxXTtcbiAgICAgICAgICAgdmFyIGNvbXBhcnRtZW50ID0gcmVzdWx0WzNdOyBcbiAgICAgICAgICAgdmFyIHdlaWdodCA9IHJlc3VsdFs1XTsgXG4gICAgICAgICB9XG4gICAgICAgICByZXNvbHZlKHtjb21wYXJ0bWVudDpjb21wYXJ0bWVudCx3ZWlnaHQ6d2VpZ2h0fSlcbiAgICAgICB9KVxuICAgICB9KVxuICAgfVxuICAgLy9yZW1vdmUgZnJvbSBmbGlnaHQgXG4gICByZW1vdmVGcm9tRmxpZ2h0KGFjdGlvbil7XG4gICAgcmV0dXJuIG5ldyBQcm9taXNlKChyZXNvbHZlLHJlamVjdCk9PntcbiAgICAgICAgdmFyIHBhY2thZ2VObyA9IGdldFBhY2thZ2VJZEZyb21CYXJDb2RlKGFjdGlvbi5iYXJjb2RlKTsgICBcbiAgICAgICAgdGhpcy5teVNlYXJjaC51cGRhdGUocGFja2FnZU5vLHttaWQ6YWN0aW9uLm1pZH0sKGVycixyZXN1bHQpPT57XG4gICAgICAgIGlmKGVycilcbiAgICAgICAgICAgIHJlc29sdmUoe3JlbW92ZWQ6ZmFsc2V9KVxuICAgICAgICAgIFxuICAgICAgICAgIHJlc29sdmUoe3JlbW92ZWQ6dHJ1ZX0pXG4gICAgICAgIH0pXG4gICAgfSlcbiAgIH1cbiAgIHJlY0Zyb21UcnVjayh0cmFja2luZ05vLHVzZXJuYW1lLHNoaXBtZW50SWQpe1xuICAgICByZXR1cm4gbmV3IFByb21pc2UoKHJlc29sdmUscmVqZWN0KT0+e1xuICAgICAgICBkYXRhQ29udGV4dC5yZWRpc0NsaWVudC5zYWRkKFwic2hpcG1lbnQ6aWQ6XCIrc2hpcG1lbnRJZCx0cmFja2luZ05vLChlcnIscmVwbHkpPT57XG4gICAgICAgICAgZGF0YUNvbnRleHQucmVkaXNDbGllbnQuc2V0KFJFQ19QS0crdHJhY2tpbmdObyxtb21lbnQoKS51bml4KCksIChlcnIscmVzdWx0KT0+e1xuICAgICAgICAgICAgaWYgKGVycikgcmVzb2x2ZSh7c2F2ZWQ6ZmFsc2V9KVxuICAgICAgICAgICAgLy9zaGlwbWVudCBjb3VudCBcbiAgICAgICAgICAgIHZhciBzaGlwbWVudENvdW50ID0gMTtcbiAgICAgICAgICAgIGRhdGFDb250ZXh0LnJlZGlzQ2xpZW50LnNjYXJkKFwic2hpcG1lbnQ6aWQ6XCIrc2hpcG1lbnRJZCwoZXJyLGNhcmQpPT57XG4gICAgICAgICAgICAgIHJlc29sdmUoe3NhdmVkOnRydWUscGtnQ291bnQ6Y2FyZH0pXG4gICAgICAgICAgICB9KTtcbiAgICAgICAgICAgXG4gICAgICAgICAgfSlcbiAgICAgICAgfSlcbiAgICAgICAgXG4gICAgIH0pXG4gICB9XG4gICBwcm9jc3Nlc3NQYWNrYWdlKHBrZ0lmbm8sdXNlcm5hbWUpe1xuICAgIHZhciBzcnYgPSB0aGlzOyAgXG4gICAgcmV0dXJuIG5ldyBQcm9taXNlKChyZXNvbHZlLHJlamVjdCk9PntcbiAgICAgICAvL3dlIGFsc28gbmVlZCB0byBzZXQgdGhlIHdhcmVob3VzZSBsb2NhdGlvbiBoZXJlIFxuICAgICAgIGRhdGFDb250ZXh0LnJlZGlzQ2xpZW50Lmhtc2V0KFwiZmVlczphd2I6XCIrcGtnSWZuby5hd2IscGtnSWZubywoZXJyLHJlc3VsdCk9PntcbiAgICAgICAgIGlmIChlcnIpXG4gICAgICAgICAgY29uc29sZS5sb2coZXJyKTsgXG4gICAgICAgICAgY29uc29sZS5sb2cocmVzdWx0KTsgXG4gICAgICAgICAgY29uc29sZS5sb2coXCJwcmludDpmZWVzOlwiK3VzZXJuYW1lLHVzZXJuYW1lKTsgXG4gICAgICAgICBkYXRhQ29udGV4dC5yZWRpc0NsaWVudC5wdWJsaXNoKFwicHJpbnQ6ZmVlczpcIit1c2VybmFtZSxwa2dJZm5vLmF3Yik7IFxuICAgICAgICAgIHNydi5nZXRQYWNrYWdlQnlJZChwa2dJZm5vLmJhcmNvZGUpLnRoZW4ocGtnPT57XG5cbiAgICAgICAgICAgIGlmIChwa2dJZm5vLnJlZkxvYyl7XG4gICAgICAgICAgICAgIHBrZy5wYWNrYWdlLndsb2MgPSBwa2dJZm5vLnJlZkxvYzsgXG4gICAgICAgICAgICAgIGlmIChOdW1iZXIocGtnSWZuby5ub2RvY3MpIT0gMCApXG4gICAgICAgICAgICAgICAgcGtnLnBhY2thZ2UuaGFzRG9jcyA9IDAgOyBcbiAgICAgICAgICAgICAgICBwa2cucGFja2FnZS5zdGF0dXMgPSA0OyBcblxuICAgICAgICAgICAgICAgIC8vc2V0IHRoZW9tcGFueSBcbiAgICAgICAgICAgICAgICBpZiAoTnVtYmVyKHBrZy5hd2IuY3VzdG9tZXIucG1iKSA+IDkwMDApe1xuICAgICAgICAgICAgICAgICAgcGtnLnBhY2thZ2UuY29tcGFueSA9IFwiMFwiXG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIGVsc2UgXG4gICAgICAgICAgICAgICAgICBwa2cucGFja2FnZS5jb21wYW55ID0gXCIxXCJcbiAgICAgICAgICAgICAgICBjb25zb2xlLmxvZygndXBkYXRpbmcgd2l0aCAnLHBrZy5wYWNrYWdlKVxuICAgICAgICAgICAgICBwYWNrYWdlSW5kZXgudXBkYXRlKHBrZy5wYWNrYWdlLmlkLHBrZy5wYWNrYWdlLChlcnJSZXNwLHJlc3BvbnNlKT0+e1xuICAgICAgICAgICAgICAgIGlmKGVyclJlc3ApXG4gICAgICAgICAgICAgICAgY29uc29sZS5sb2coZXJyUmVzcClcbiAgICAgICAgICAgICAgfSlcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIFxuICAgICAgICAgIH0pXG4gICAgICAgICByZXNvbHZlKHtzZW50OnRydWV9KVxuICAgICAgIH0pXG4gICAgIH0pXG4gICB9XG4gICByZWNGcm9tUGxhbmVOYXMoYmFyY29kZSl7XG4gICAgIHJldHVybiBuZXcgUHJvbWlzZSgocmVzb2x2ZSxyZWplY3QpPT57XG4gICAgICAgdmFyIHNydiA9IHRoaXMgOyBcbiAgICAgICB2YXIgcGtnSWQgPSBnZXRQYWNrYWdlSWRGcm9tQmFyQ29kZShiYXJjb2RlKTsgXG4gICAgICAgIHNydi5teVNlYXJjaC5nZXREb2MocGtnSWQsKGVycixwa2cpPT57XG4gICAgICAgICAgICBwa2cuZG9jLnN0YXR1cyA9IDQ7IFxuICAgICAgICAgICAgcGtnLmRvYy5sb2NhdGlvbiAgPSBcIldhcmVob3VzZSBOQVNcIjsgXG4gICAgICAgICAgICBzcnYubXlTZWFyY2gudXBkYXRlKHBrZ0lkLHBrZy5kb2MsKGVycix1cGRhdGVSZXN1bHQpPT57XG4gICAgICAgICAgICAgIGlmKGVycilcbiAgICAgICAgICAgICAgICByZWplY3Qoe3VwZGF0ZWQ6ZmFsc2V9KVxuICAgICAgICAgICAgICByZXNvbHZlKHt1cGRhdGVkOnRydWV9KVxuICAgICAgICAgICAgfSlcbiAgICAgICAgfSlcbiAgICAgfSlcbiAgIH1cblxuICAgLy8jZW5kcmVnaW9uXG59XG5cbmZ1bmN0aW9uIGdldFBhY2thZ2VJZEZyb21CYXJDb2RlKGJhckNvZGVWYWx1ZSl7XG4gIHZhciBwYXJ0cyA9IGJhckNvZGVWYWx1ZS5zcGxpdChcIi1cIik7IFxuICBpZiAocGFydHMubGVuZ3RoID09IDMpXG4gICAgaWYgKHR5cGVvZiBwYXJ0c1syXSAhPSBcInVuZGVmaW5lZFwiKVxuICAgIHJldHVybiBwYXJ0c1syXS50cmltKCk7IFxuICByZXR1cm4gXCJcIlxufVxuIl19
