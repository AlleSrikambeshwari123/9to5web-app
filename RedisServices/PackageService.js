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
              pkg.package.hasDocs = 4;

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
//# sourceMappingURL=data:application/json;charset=utf8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIlJlZGlzU2VydmljZXMvUGFja2FnZVNlcnZpY2UuZXM2Il0sIm5hbWVzIjpbInJlZGlzIiwicmVxdWlyZSIsImxyZWRpcyIsIm1vbWVudCIsInJlZGlzU2VhcmNoIiwiZnMiLCJQYWNrYWdlVXRpbCIsIlBhY2thZ2VVdGlsaXR5IiwicGFja2FnZVV0aWwiLCJQS0dfSURYIiwiUEtHX0lEX0NPVU5URVIiLCJkYXRhQ29udGV4dCIsIlBLR19QUkVGSVgiLCJBV0JfSUQiLCJJTkRFWF9BV0IiLCJSRUNfUEtHIiwidW5pcUlkIiwiQ3VzdG9tZXJTZXJ2aWNlIiwiY3VzdG9tZXJTZXJ2aWNlIiwiUEtHX1NUQVRVUyIsImFkZENvbW1hbmQiLCJhd2JJbmRleCIsImNsaWVudE9wdGlvbnMiLCJzZWFyY2hDbGllbnREZXRhaWxzIiwicGFja2FnZUluZGV4IiwiZ2V0UGFja2FnZVZvbHVtbmUiLCJtUGFja2FnZSIsImNyZWF0ZURvY3VtZW50IiwidFBhY2thZ2UiLCJwYWNrYWdlRG9jdW1lbnQiLCJpZCIsInRyYWNraW5nTm8iLCJza3lib3giLCJkYXRlUmVjaWV2ZWQiLCJ1bml4IiwiYXdiIiwibWlkIiwidm9sdW1lIiwid2VpZ2h0IiwicGllY2VzIiwiY3VzdG9tZXIiLCJzaGlwcGVyIiwiZGVzY3JpcHRpb24iLCJkaW1lbnNpb25zIiwiY2FycmllciIsInN0YXR1cyIsInZhbHVlIiwiY29uc29sZSIsImxvZyIsInNldFBhY2thZ2VJblRyYW5zaXQiLCJrZXlzIiwibXNlYXJjaGVyIiwiUHJvbWlzZSIsInJlc29sdmUiLCJyZWplY3QiLCJiYXRjaGVyIiwiY2xpZW50IiwiYmF0Y2giLCJmb3JFYWNoIiwibG9jYXRpb24iLCJlbGVtZW50IiwiaG1zZXQiLCJleGVjIiwiZXJyIiwicmVzdWx0IiwiYWRkUGFja2FnZVRvSW5kZXgiLCJnZXRQYWNrYWdlIiwidGhlbiIsImRlbERvY3VtZW50IiwicGFjayIsImRvbmUiLCJkb2N1bWVudCIsImFkZCIsIlBhY2thZ2VTZXJ2aWNlIiwic2V0dXBJbmRleCIsIm15U2VhcmNoIiwicmVkaXNDbGllbnQiLCJleGlzdHMiLCJzZXQiLCJpbml0UmVzdWx0IiwiaW5jciIsIm5ld0lkIiwidG9TdHJpbmciLCJ1cGRhdGVkX2J5IiwidXNlcm5hbWUiLCJkYXRlX3VwZGF0ZWQiLCJ1cGRhdGUiLCJlcnIxIiwiYXdiUmVzIiwic2F2ZWQiLCJyZXBseSIsImludm9pY2UiLCJoYXNEb2NzIiwiY3JlYXRlZF9ieSIsImRhdGVDcmVhdGVkIiwic2VhcmNoIiwibnVtYmVyT2ZSZXN1bHRzIiwib2Zmc2V0IiwicGFja2FnZXMiLCJ0b3RhbFJlc3VsdHMiLCJyZXN1bHRzIiwicGFja2FnZTEiLCJkb2MiLCJOdW1iZXIiLCJkYXRhIiwic3J2IiwicGFja2FnZWxpc3QiLCJjb3VudCIsImxlbmd0aCIsInN1YnN0cmluZyIsInB1c2giLCJzb3J0QnkiLCJhd2JzIiwiYXdiTGlzdCIsImFsbCIsIm1hcCIsImdldEN1c3RvbWVyIiwiY3VzdG9tZXJJZCIsImdldEF3Yk92ZXJ2aWV3IiwiY3VzdG9tZXJzIiwiaSIsImZvcm1hdCIsImNvbnNpZ25lZSIsIm5hbWUiLCJkZXRhaWxzIiwicG1iIiwiY2F0Y2giLCJnZXREb2MiLCJnZXRBd2JEZXRhaWxzIiwidHJhY2tpbmdOdW1iZXIiLCJsb2NhdGlvbl9pZCIsInBhY2thZ2VSZXN1bHQiLCJuZXdQYWNrYWdlIiwiYm94U2l6ZSIsImF3YkluZm8iLCJpc1NlZCIsImludm9pY2VOdW1iZXIiLCJoYXptYXQiLCJzYXZlQXdiIiwiY1BhY2thZ2UiLCJhd2JSZXN1bHQiLCJpc0NvbnNvbGlkYXRlZCIsInNhdmVQYWNrYWdlVG9Bd2IiLCJwa2dCYXRjaCIsInNhZGQiLCJwa2dSZXN1bHQiLCJwa2ciLCJobWdldCIsImdldFBhY2thZ2VJZEZyb21CYXJDb2RlIiwidG90YWxXZWlnaHQiLCJpc05hTiIsImJvZHkiLCJyZXBsYWNlIiwidHJpbSIsInRyYWNraW5nIiwicmVzcG9uc2UiLCJpbmRleFBhY2thZ2UiLCJkb2NSZXN1bHQiLCJwYWdlIiwicGFnZVNpemUiLCJiYXJjb2RlIiwicGtnSWQiLCJnZXRBd2IiLCJhd2JpbmZvIiwicGFja2FnZSIsIm1zZWFyY2giLCJvbGREb2NJZCIsImRvY0lkIiwidXBkYXRlZFBhY2thZ2VzIiwicGFja2FnZUlkIiwibWFuaWZlc3QiLCJtYW5pZmVzdEtleSIsImRlbCIsImRlY3IiLCJnZXRLZXlzIiwia2V5c0NvdW50Iiwia1Jlc3VsdCIsInNyZW0iLCJyUmVzdWx0IiwiZGVsZXRlZCIsImJpbiIsInNlYXJjaGVyIiwiaXNOb0RvYyIsImNvbXBhbnkiLCJnZXRQYWNrYWdlQnlEb2NJZCIsImFjdGlvbiIsInBhY2thZ2VObyIsImNvbXBhcnRtZW50IiwiYWRkZWQiLCJnZXRGbGlnaHRDb21wYXJ0bWVudFdlaWdodCIsImZyZXN1bHQiLCJhZ2dyZWdhdGUiLCJyZW1vdmVkIiwic2hpcG1lbnRJZCIsInNoaXBtZW50Q291bnQiLCJzY2FyZCIsImNhcmQiLCJwa2dDb3VudCIsInBrZ0lmbm8iLCJwdWJsaXNoIiwiZ2V0UGFja2FnZUJ5SWQiLCJyZWZMb2MiLCJ3bG9jIiwibm9kb2NzIiwiZXJyUmVzcCIsInNlbnQiLCJ1cGRhdGVSZXN1bHQiLCJ1cGRhdGVkIiwiYmFyQ29kZVZhbHVlIiwicGFydHMiLCJzcGxpdCJdLCJtYXBwaW5ncyI6Ijs7Ozs7Ozs7O0FBQUE7O0FBQ0E7Ozs7OztBQUdBLElBQUlBLFFBQVFDLFFBQVEsT0FBUixDQUFaO0FBQ0EsSUFBSUMsU0FBU0QsUUFBUSxlQUFSLENBQWI7QUFDQSxJQUFJRSxTQUFTRixRQUFRLFFBQVIsQ0FBYjtBQUNBLElBQUlHLGNBQWNILFFBQVEscUJBQVIsQ0FBbEI7QUFDQSxJQUFJSSxLQUFLSixRQUFRLElBQVIsQ0FBVDtBQUNBLElBQUlFLFNBQVNGLFFBQVEsUUFBUixDQUFiO0FBQ0EsSUFBSUssY0FBY0wsUUFBUSxxQkFBUixFQUErQk0sY0FBakQ7QUFDQSxJQUFJQyxjQUFjLElBQUlGLFdBQUosRUFBbEI7QUFDQSxJQUFNRyxVQUFV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a0I7QUFDbkMsWUFBSW1ELE1BQU0sT0FBVjtBQUNBLFlBQUl3RCxRQUFRYix3QkFBd0JZLE9BQXhCLENBQVo7QUFDQ3ZELFlBQUk5QixRQUFKLENBQWFvRCxNQUFiLENBQW9Ca0MsS0FBcEIsRUFBMEIsVUFBQ2xHLEdBQUQsRUFBS21GLEdBQUwsRUFBVztBQUNqQ0EsY0FBSTVDLEdBQUosQ0FBUXpELE1BQVIsR0FBaUIsQ0FBakI7QUFDQXFHLGNBQUk1QyxHQUFKLENBQVEzQyxRQUFSLEdBQW9CLGVBQXBCO0FBQ0E4QyxjQUFJOUIsUUFBSixDQUFhVyxNQUFiLENBQW9CMkUsS0FBcEIsRUFBMEJmLElBQUk1QyxHQUE5QixFQUFrQyxVQUFDdkMsR0FBRCxFQUFLK0ksWUFBTCxFQUFvQjtBQUNwRCxnQkFBRy9JLEdBQUgsRUFDRVQsT0FBTyxFQUFDeUosU0FBUSxLQUFULEVBQVA7QUFDRjFKLG9CQUFRLEVBQUMwSixTQUFRLElBQVQsRUFBUjtBQUNELFdBSkQ7QUFLSCxTQVJEO0FBU0YsT0FaTSxDQUFQO0FBYUQ7O0FBRUQ7Ozs7Ozs7QUFHSCxTQUFTM0QsdUJBQVQsQ0FBaUM0RCxZQUFqQyxFQUE4QztBQUM1QyxNQUFJQyxRQUFRRCxhQUFhRSxLQUFiLENBQW1CLEdBQW5CLENBQVo7QUFDQSxNQUFJRCxNQUFNckcsTUFBTixJQUFnQixDQUFwQixFQUNFLElBQUksT0FBT3FHLE1BQU0sQ0FBTixDQUFQLElBQW1CLFdBQXZCLEVBQ0EsT0FBT0EsTUFBTSxDQUFOLEVBQVN4RCxJQUFULEVBQVA7QUFDRixTQUFPLEVBQVA7QUFDRCIsImZpbGUiOiJSZWRpc1NlcnZpY2VzL1BhY2thZ2VTZXJ2aWNlLmpzIiwic291cmNlc0NvbnRlbnQiOlsiaW1wb3J0IHsgY3B1cyB9IGZyb20gXCJvc1wiO1xuaW1wb3J0IHsgcHJvbWlzZXMgfSBmcm9tIFwiZG5zXCI7XG5cblxudmFyIHJlZGlzID0gcmVxdWlyZShcInJlZGlzXCIpO1xudmFyIGxyZWRpcyA9IHJlcXVpcmUoXCIuL3JlZGlzLWxvY2FsXCIpO1xudmFyIG1vbWVudCA9IHJlcXVpcmUoXCJtb21lbnRcIik7XG52YXIgcmVkaXNTZWFyY2ggPSByZXF1aXJlKFwiLi4vcmVkaXNlYXJjaGNsaWVudFwiKTtcbnZhciBmcyA9IHJlcXVpcmUoXCJmc1wiKTtcbnZhciBtb21lbnQgPSByZXF1aXJlKCdtb21lbnQnKVxudmFyIFBhY2thZ2VVdGlsID0gcmVxdWlyZShcIi4uL1V0aWwvcGFja2FnZXV0aWxcIikuUGFja2FnZVV0aWxpdHk7XG52YXIgcGFja2FnZVV0aWwgPSBuZXcgUGFja2FnZVV0aWwoKTtcbmNvbnN0IFBLR19JRFggPSBcImluZGV4OnBhY2thZ2VzXCI7XG5jb25zdCBQS0dfSURfQ09VTlRFUiA9IFwicGFja2FnZTppZFwiO1xudmFyIGRhdGFDb250ZXh0ID0gcmVxdWlyZSgnLi9kYXRhQ29udGV4dCcpXG5jb25zdCBQS0dfUFJFRklYID0gXCJwYWNrYWdlczpcIjtcbmNvbnN0IEFXQl9JRCA9IFwiYXdiOmlkXCJcbmNvbnN0IElOREVYX0FXQiA9IFwiaW5kZXg6YXdiXCJcbmNvbnN0IFJFQ19QS0cgPSBcInBrZzpyZWM6XCJcbnZhciB1bmlxSWQgPSByZXF1aXJlKFwidW5pcWlkXCIpOyBcbnZhciBDdXN0b21lclNlcnZpY2UgPSByZXF1aXJlKCcuL0N1c3RvbWVyU2VydmljZScpLkN1c3RvbWVyU2VydmljZTsgXG52YXIgY3VzdG9tZXJTZXJ2aWNlID0gbmV3IEN1c3RvbWVyU2VydmljZSgpXG5jb25zdCBQS0dfU1RBVFVTID0geyBcbiAgMSA6IFwiUmVjZWl2ZWRcIixcbiAgMjogXCJMb2FkZWQgb24gQWlyQ3JhZnRcIixcbiAgMzogXCJJbiBUcmFuc2l0XCIsXG4gIDQ6IFwiUmVjaWV2ZWQgaW4gTkFTXCIsXG4gIDU6IFwiUmVhZHkgZm9yIFBpY2t1cCAvIERlbGl2ZXJ5XCIsXG4gIDY6IFwiRGVsaXZlcmVkXCJcblxufTsgXG5yZWRpcy5hZGRDb21tYW5kKFwiZnQuYWdncmVnYXRlXCIpXG5jb25zdCBhd2JJbmRleCA9IHJlZGlzU2VhcmNoKHJlZGlzLCBJTkRFWF9BV0IsIHtcbiAgY2xpZW50T3B0aW9uczogbHJlZGlzLnNlYXJjaENsaWVudERldGFpbHNcbn0pO1xuY29uc3QgcGFja2FnZUluZGV4ID0gcmVkaXNTZWFyY2gocmVkaXMsIFBLR19JRFgsIHtcbiAgY2xpZW50T3B0aW9uczogbHJlZGlzLnNlYXJjaENsaWVudERldGFpbHNcbn0pO1xuZnVuY3Rpb24gZ2V0UGFja2FnZVZvbHVtbmUobVBhY2thZ2Upe1xuXG4gIHJldHVybiAwOyBcbn1cbmZ1bmN0aW9uIGNyZWF0ZURvY3VtZW50KHRQYWNrYWdlKSB7XG4gIHZhciBwYWNrYWdlRG9jdW1lbnQgPSB7XG4gICAgaWQ6dFBhY2thZ2UuaWQsXG4gICAgdHJhY2tpbmdObzogdFBhY2thZ2UudHJhY2tpbmdObyxcbiAgICBza3lib3g6IHRQYWNrYWdlLnNreWJveCxcbiAgICBkYXRlUmVjaWV2ZWQgOiBtb21lbnQoKS51bml4KCksIFxuICAgIGF3YjowLCBcbiAgICBtaWQ6MCxcbiAgICB2b2x1bWU6IGdldFBhY2thZ2VWb2x1bW5lKHRQYWNrYWdlKSxcbiAgICB3ZWlnaHQ6dFBhY2thZ2Uud2VpZ2h0LFxuICAgIHBpZWNlczp0UGFja2FnZS5waWVjZXMsXG4gICAgY3VzdG9tZXI6IHRQYWNrYWdlLmN1c3RvbWVyLFxuICAgIHNoaXBwZXI6IHRQYWNrYWdlLnNoaXBwZXIsXG4gICAgZGVzY3JpcHRpb246IHRQYWNrYWdlLmRlc2NyaXB0aW9uLFxuICAgIGRpbWVuc2lvbnM6dFBhY2thZ2UuZGltZW5zaW9ucyxcbiAgICBjYXJyaWVyOnRQYWNrYWdlLmNhcnJpZXIsXG4gICAgLy9za3lib3hWOiB0UGFja2FnZS5za3lib3gsIGFkZCBkaW1lbmlvbiBcbiAgICBzdGF0dXM6IHRQYWNrYWdlLnN0YXR1cyxcbiAgICBtaWQ6IHRQYWNrYWdlLm1pZCxcbiAgICB2YWx1ZTogdFBhY2thZ2UudmFsdWUsXG4gICAgXG4gIH07XG4gIGNvbnNvbGUubG9nKFwiYWJvdXQgdG8gYWRkIHRoZSBwYWNrYWdlIHRvIHRoZSBpbmRleFwiKTtcbiAgcmV0dXJuIHBhY2thZ2VEb2N1bWVudDtcbn1cbmZ1bmN0aW9uIHNldFBhY2thZ2VJblRyYW5zaXQoa2V5cywgbXNlYXJjaGVyKSB7XG4gIHJldHVybiBuZXcgUHJvbWlzZSgocmVzb2x2ZSwgcmVqZWN0KSA9PiB7XG4gICAgdmFyIGJhdGNoZXIgPSBtc2VhcmNoZXIuY2xpZW50LmJhdGNoKCk7XG4gICAga2V5cy5mb3JFYWNoKGVsZW1lbnQgPT4ge1xuICAgICAgdmFyIHZhbHVlID0ge1xuICAgICAgICBzdGF0dXM6IDIsXG4gICAgICAgIGxvY2F0aW9uOiBcIkluIFRyYW5zaXRcIlxuICAgICAgfTtcbiAgICAgIGNvbnNvbGUubG9nKGVsZW1lbnQgKyBcImlzIHRoZSBlbGVtZW50XCIpO1xuXG4gICAgICBiYXRjaGVyLmhtc2V0KFBLR19QUkVGSVggKyBlbGVtZW50LCB2YWx1ZSk7XG4gICAgfSk7XG4gICAgYmF0Y2hlci5leGVjKChlcnIsIHJlc3VsdCkgPT4ge1xuICAgICAgY29uc29sZS5sb2cocmVzdWx0KTtcbiAgICAgIC8vcmVhZGQgdGhlIGRvY3VtZW50cyBoZXJlXG4gICAgICBrZXlzLmZvckVhY2goZWxlbWVudCA9PiB7XG4gICAgICAgIGFkZFBhY2thZ2VUb0luZGV4KGVsZW1lbnQsIG1zZWFyY2hlcik7XG4gICAgICB9KTtcbiAgICAgIHJlc29sdmUocmVzdWx0KTtcbiAgICB9KTtcbiAgfSk7XG59XG5cbmZ1bmN0aW9uIGFkZFBhY2thZ2VUb0luZGV4KHRyYWNraW5nTm8sIG1zZWFyY2hlcikge1xuICBscmVkaXMuZ2V0UGFja2FnZSh0cmFja2luZ05vKS50aGVuKHBhY2sgPT4ge1xuICAgIG1zZWFyY2hlci5kZWxEb2N1bWVudChQS0dfSURYLCBgJHtwYWNrLm1pZH0tJHt0cmFja2luZ05vfWAsIChlcnIsIGRvbmUpID0+IHtcbiAgICAgIHZhciBkb2N1bWVudCA9IGNyZWF0ZURvY3VtZW50KHBhY2spO1xuICAgICAgY29uc29sZS5sb2coXCJyZWFkZGluZyBwYWNrYWdlIHRvIHRoZSBpbmRleCBsaWtlIGEgYm9zcyBcIiArIHRyYWNraW5nTm8pO1xuICAgICAgbXNlYXJjaGVyLmFkZChwYWNrLm1pZCArIFwiLVwiICsgcGFjay50cmFja2luZ05vLCBkb2N1bWVudCk7XG4gICAgfSk7XG4gIH0pO1xufVxuZXhwb3J0IGNsYXNzIFBhY2thZ2VTZXJ2aWNlIHtcbiAgY29uc3RydWN0b3IoKSB7XG4gICAgdGhpcy5zZXR1cEluZGV4KCk7XG4gIH1cbiAgc2V0dXBJbmRleCgpIHtcbiAgICB0aGlzLm15U2VhcmNoID0gcmVkaXNTZWFyY2gocmVkaXMsIFBLR19JRFgsIHtcbiAgICAgIGNsaWVudE9wdGlvbnM6IGxyZWRpcy5zZWFyY2hDbGllbnREZXRhaWxzXG4gICAgfSk7XG4gIH1cbiAgZ2V0TmV3QXdiKCl7XG4gICAgcmV0dXJuIG5ldyBQcm9taXNlKChyZXNvbHZlLHJlamVjdCk9PntcbiAgICAgIGRhdGFDb250ZXh0LnJlZGlzQ2xpZW50LmV4aXN0cyhBV0JfSUQsKGVycixyZXN1bHQpPT57XG4gICAgICAgIGNvbnNvbGUubG9nKHJlc3VsdCk7IFxuICAgICAgICBpZiAocmVzdWx0ICE9IFwiMVwiKXtcbiAgICAgICAgICBkYXRhQ29udGV4dC5yZWRpc0NsaWVudC5zZXQoQVdCX0lEID09IDEwMDAwMCwoZXJyLGluaXRSZXN1bHQpPT57XG4gICAgICAgICAgICBkYXRhQ29udGV4dC5yZWRpc0NsaWVudC5pbmNyKEFXQl9JRCwoZXJyLG5ld0lkKT0+e1xuICAgICAgICAgICAgICByZXNvbHZlKHthd2I6bmV3SWR9KVxuICAgICAgICAgICAgfSlcbiAgICAgICAgICB9KVxuICAgICAgICB9XG4gICAgICAgIGVsc2Uge1xuICAgICAgICAgIGRhdGFDb250ZXh0LnJlZGlzQ2xpZW50LmluY3IoQVdCX0lELChlcnIsbmV3SWQpPT57XG4gICAgICAgICAgICByZXNvbHZlKHthd2I6bmV3SWR9KVxuICAgICAgICAgIH0pXG4gICAgICAgIH1cbiAgICAgIH0pXG4gICAgfSk7XG4gIH1cbiAgc2F2ZUF3Yihhd2Ipe1xuICAgIHJldHVybiBuZXcgUHJvbWlzZSgocmVzb2x2ZSxyZWplY3QpPT57XG4gICAgICBjb25zb2xlLmxvZygnc2F2aW5nLi4uJyxhd2IsbW9tZW50KCkudG9TdHJpbmcoXCJoaDptbTpzc1wiKSlcbiAgICAgIGlmIChhd2IuaWQgIT1cIlwiKXtcbiAgICAgICAgYXdiLnVwZGF0ZWRfYnkgPSBhd2IudXNlcm5hbWU7IFxuICAgICAgICBhd2IuZGF0ZV91cGRhdGVkID0gbW9tZW50KCkudW5peCgpOyBcbiAgICAgICAgYXdiSW5kZXgudXBkYXRlKGF3Yi5pZCxhd2IsKGVycjEsYXdiUmVzKT0+e1xuICAgICAgICAgIGlmIChlcnIxKXtcbiAgICAgICAgICAgIGNvbnNvbGUubG9nKCdzYXZpbmcgZXJyJyxlcnIxKVxuICAgICAgICAgICAgcmVzb2x2ZSh7c2F2ZWQ6ZmFsc2V9KVxuICAgICAgICAgIH1cbiAgICAgICAgICByZXNvbHZlKHtzYXZlZDp0cnVlLCBpZDphd2IuaWR9KVxuICAgICAgICB9KVxuICAgICAgfVxuICAgICAgZWxzZXtcbiAgICAgIGRhdGFDb250ZXh0LnJlZGlzQ2xpZW50LmluY3IoQVdCX0lELChlcnIscmVwbHkpPT57XG4gICAgICAgIGF3Yi5pZCA9IHJlcGx5OyBcbiAgICAgICAgYXdiLnN0YXR1cyA9IDE7IFxuICAgICAgICBpZiAoYXdiLmludm9pY2Upe1xuICAgICAgICAgIGF3Yi5oYXNEb2NzID0gMVxuICAgICAgICAgIGNvbnNvbGUubG9nKFwiSEFTIERPQ0NDQ0NcIilcbiAgICAgICAgfVxuICAgICAgICBlbHNlIHtcbiAgICAgICAgICBhd2IuaGFzRG9jcyA9IDAgOyBcbiAgICAgICAgICBjb25zb2xlLmxvZyhcIkhBUyBOTyBET0NDQ0NDXCIpXG4gICAgICAgIH1cblxuICAgICAgICBhd2IuY3JlYXRlZF9ieSA9IGF3Yi51c2VybmFtZTsgXG4gICAgICAgIGRlbGV0ZSBhd2IudXNlcm5hbWU7XG4gICAgICAgIGF3Yi5kYXRlQ3JlYXRlZCA9IG1vbWVudCgpLnVuaXgoKTsgXG4gICAgICAgICAgYXdiSW5kZXguYWRkKGF3Yi5pZCxhd2IsKGVycjEsYXdiUmVzKT0+e1xuICAgICAgICAgICAgaWYgKGVycjEpe1xuICAgICAgICAgICAgICBjb25zb2xlLmxvZygnc2F2aW5nIGVycicsZXJyMSlcbiAgICAgICAgICAgICAgcmVzb2x2ZSh7c2F2ZWQ6ZmFsc2V9KVxuICAgICAgICAgICAgfVxuICAgICAgICAgICAgcmVzb2x2ZSh7c2F2ZWQ6dHJ1ZSwgaWQ6cmVwbHl9KVxuICAgICAgICAgIH0pXG4gICAgICB9KVxuICAgIH1cbiAgICAgIFxuICAgICAgXG4gICAgfSlcbiAgfVxuICBnZXRBd2JPdmVydmlldyhpZCl7XG4gICAgLy8gZ2V0IHRoZSBhd2IgcGFja2FnZXMgYW5kIGFkZCBldmVyeXRoaW5nIGluIFxuICAgIHJldHVybiBuZXcgUHJvbWlzZSgocmVzb2x2ZSxyZWplY3QpPT57XG4gICAgICBwYWNrYWdlSW5kZXguc2VhcmNoKGBAYXdiOlske2lkfSAke2lkfV1gLHtudW1iZXJPZlJlc3VsdHM6NTAwMCxvZmZzZXQ6MH0sKGVycixwYWNrYWdlcyk9PntcbiAgICAgICAgdmFyIHdlaWdodCA9IDAgOyBcbiAgICAgICAgdmFyIHBpZWNlcyA9IHBhY2thZ2VzLnRvdGFsUmVzdWx0czsgXG4gICAgICAgIHZhciBkZXNjcmlwdGlvbiA9IFwiXCJcbiAgICAgICAgcGFja2FnZXMucmVzdWx0cy5mb3JFYWNoKHBhY2thZ2UxID0+IHtcbiAgICAgICAgICBpZiAoZGVzY3JpcHRpb24gPT1cIlwiKVxuICAgICAgICAgICAgZGVzY3JpcHRpb24gPSBwYWNrYWdlMS5kb2MuZGVzY3JpcHRpb247IFxuICAgICAgICAgIHdlaWdodCArPSBOdW1iZXIocGFja2FnZTEuZG9jLndlaWdodClcbiAgICAgICAgfSk7XG4gICAgICAgIHZhciBkYXRhICA9IHt3ZWlnaHQ6d2VpZ2h0LGRlc2NyaXB0aW9uOmRlc2NyaXB0aW9uLHBpZWNlczpwaWVjZXN9XG4gICAgICAgIGNvbnNvbGUubG9nKGRhdGEsXCJBV0IgREVUQUlMU1wiKTsgXG4gICAgICAgIHJlc29sdmUoIGRhdGEpXG4gICAgICB9KVxuICAgIH0pXG4gICBcbiAgfVxuICBnZXRBd2JEZXRhaWxzKGlkKXtcbiAgICB2YXIgc3J2ID0gdGhpczsgXG4gICAgcmV0dXJuIG5ldyBQcm9taXNlKChyZXNvbHZlLHJlamVjdCk9PntcbiAgICAgIGNvbnNvbGUubG9nKGBAYXdiOlske2lkfSAke2lkfV1gKVxuICAgICBcbiAgICAgIHBhY2thZ2VJbmRleC5zZWFyY2goYEBhd2I6WyR7aWR9ICR7aWR9XWAse251bWJlck9mUmVzdWx0czo1MDAwLG9mZnNldDowfSwoZXJyLHBhY2thZ2VzKT0+e1xuICAgICAgICBpZiAoZXJyKVxuICAgICAgICAgY29uc29sZS5sb2coZXJyKVxuICAgICAgXG4gICAgICAgIHZhciAgcGFja2FnZWxpc3QgID0gW11cbiAgICAgICAgdmFyIGNvdW50ID0gMTsgXG4gICAgICAgIHBhY2thZ2VzLnJlc3VsdHMuZm9yRWFjaChwYWNrYWdlMSA9PiB7XG5cbiAgICAgICAgICBpZiAocGFja2FnZTEuZG9jLnRyYWNraW5nTm8ubGVuZ3RoID4gNyl7XG4gICAgICAgICAgICAvL29ubHkgZGlzcGxheSB0aGUgbGFzdCA3IFxuICAgICAgICAgICAgcGFja2FnZTEuZG9jLnRyYWNraW5nTm8gPSBwYWNrYWdlMS5kb2MudHJhY2tpbmdOby5zdWJzdHJpbmcocGFja2FnZTEuZG9jLnRyYWNraW5nTm8ubGVuZ3RoIC03KVxuICAgICAgICAgICAgXG4gICAgICAgICAgfVxuICAgICAgICAgIHBhY2thZ2UxLmRvYy5wYWNrYWdlSW5kZXggPSBjb3VudDtcbiAgICAgICAgICBjb3VudCArKzsgXG4gICAgICAgICAgcGFja2FnZWxpc3QucHVzaCggcGFja2FnZTEuZG9jKVxuICAgICAgICB9KTtcbiAgICAgICBcbiAgICAgICBcbiAgICAgICAgcmVzb2x2ZSggcGFja2FnZWxpc3QpXG4gICAgICB9KVxuICAgIH0pXG4gIH1cbiAgbGlzdE5vRG9jc0ZsbCgpe1xuICAgIHJldHVybiBuZXcgUHJvbWlzZSgocmVzb2x2ZSxyZWplY3QpPT57XG4gICAgICAgYXdiSW5kZXguc2VhcmNoKFwiQHN0YXR1czpbMSAxXSBAaGFzRG9jczpbMCAwXVwiLHtvZmZzZXQ6MCxudW1iZXJPZlJlc3VsdHM6NTAwMCxzb3J0Qnk6J2lkJ30sKGVycixhd2JzKT0+e1xuICAgICAgICAgdmFyIGF3Ykxpc3QgPSBbXTsgXG4gICAgICAgICBQcm9taXNlLmFsbChhd2JzLnJlc3VsdHMubWFwKGF3Yj0+Y3VzdG9tZXJTZXJ2aWNlLmdldEN1c3RvbWVyKGF3Yi5kb2MuY3VzdG9tZXJJZCkpKS50aGVuKGN1c3RvbWVycz0+e1xuICAgICAgICAgICBQcm9taXNlLmFsbChhd2JzLnJlc3VsdHMubWFwKGF3Yj0+dGhpcy5nZXRBd2JPdmVydmlldyhhd2IuZG9jLmlkKSkpLnRoZW4oZGV0YWlscz0+e1xuICAgICAgICAgICAgY29uc29sZS5sb2coXCJnb3QgdGhlIGN1c3RvbWVyc1wiLGN1c3RvbWVycywgYXdicylcbiAgICAgICAgICAgIGZvcih2YXIgaSA9MCA7IGkgPCBhd2JzLnJlc3VsdHMubGVuZ3RoIDsgaSsrICl7XG4gICAgICAgICAgICAgIHZhciBhd2IgPSBhd2JzLnJlc3VsdHNbaV07IFxuICAgICAgICAgICAgICBhd2IuZG9jLmRhdGVDcmVhdGVkID0gbW9tZW50LnVuaXgoYXdiLmRvYy5kYXRlQ3JlYXRlZCkuZm9ybWF0KFwiWVlZWS1NTS1ERCBoaDptbSBBXCIpXG4gICAgICAgICAgICAgIC8vd2UgbmVlZCB0byBnZXQgdGhlIGN1c3RvbWVyIFxuICAgICAgICAgICAgICBhd2IuZG9jLmNvbnNpZ25lZSA9IGN1c3RvbWVyc1tpXS5uYW1lOyBcbiAgICAgICAgICAgICAgYXdiLmRvYy53ZWlnaHQgPSBkZXRhaWxzW2ldLndlaWdodDsgXG4gICAgICAgICAgICAgIGF3Yi5kb2MucG1iID0gY3VzdG9tZXJzW2ldLnBtYjsgXG4gICAgICAgICAgICAgIGF3Yi5kb2MuZGVzY3JpcHRpb24gPSBkZXRhaWxzW2ldLmRlc2NyaXB0aW9uOyBcbiAgICAgICAgICAgICAgYXdiLmRvYy5waWVjZXMgPSBkZXRhaWxzW2ldLnBpZWNlczsgXG4gICAgICAgICAgICAgIGlmIChjdXN0b21lcnNbaV0ucG1iID09ICcnKXtcbiAgICAgICAgICAgICAgICBhd2IuZG9jLnBtYiA9ICc5MDAwJ1xuICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgIGNvbnNvbGUubG9nKCdwdXNoaW5nICcsYXdiKVxuICAgICAgICAgICAgICAvL3dlIG5lZWQgdG8gZ2V0IGFsbCB0aGUgcGFja2FnZXMgXG4gICAgICAgICAgICAgIGF3Ykxpc3QucHVzaChhd2IuZG9jKVxuICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICByZXNvbHZlKHthd2JzOmF3Ykxpc3R9KVxuICAgICAgICAgICB9KVxuICAgICAgICAgIFxuICAgICAgICAgIH0pLmNhdGNoKGVycj0+e1xuICAgICAgICAgICAgY29uc29sZS5sb2coZXJyKTsgXG4gICAgICAgICAgfSlcbiAgICAgICAgIFxuICAgICAgICAvLyAgYXdicy5yZXN1bHRzLmZvckVhY2goYXdiID0+IHtcbiAgICAgICAgICAgXG4gICAgICAgICAgXG4gICAgICAgIC8vICB9KTtcbiAgICAgICAgIFxuICAgICAgIH0pXG4gICAgfSlcbiAgfVxuXG4gIGxpc3RBd2JpbkZsbCgpe1xuICAgIHJldHVybiBuZXcgUHJvbWlzZSgocmVzb2x2ZSxyZWplY3QpPT57XG4gICAgICAgYXdiSW5kZXguc2VhcmNoKFwiQHN0YXR1czpbMSAxXSBAaGFzRG9jczpbMSAxXVwiLHtvZmZzZXQ6MCxudW1iZXJPZlJlc3VsdHM6NTAwMCxzb3J0Qnk6J2lkJ30sKGVycixhd2JzKT0+e1xuICAgICAgICAgdmFyIGF3Ykxpc3QgPSBbXTsgXG4gICAgICAgICBQcm9taXNlLmFsbChhd2JzLnJlc3VsdHMubWFwKGF3Yj0+Y3VzdG9tZXJTZXJ2aWNlLmdldEN1c3RvbWVyKGF3Yi5kb2MuY3VzdG9tZXJJZCkpKS50aGVuKGN1c3RvbWVycz0+e1xuICAgICAgICAgICBQcm9taXNlLmFsbChhd2JzLnJlc3VsdHMubWFwKGF3Yj0+dGhpcy5nZXRBd2JPdmVydmlldyhhd2IuZG9jLmlkKSkpLnRoZW4oZGV0YWlscz0+e1xuICAgICAgICAgICAgY29uc29sZS5sb2coXCJnb3QgdGhlIGN1c3RvbWVyc1wiLGN1c3RvbWVycywgYXdicylcbiAgICAgICAgICAgIGZvcih2YXIgaSA9MCA7IGkgPCBhd2JzLnJlc3VsdHMubGVuZ3RoIDsgaSsrICl7XG4gICAgICAgICAgICAgIHZhciBhd2IgPSBhd2JzLnJlc3VsdHNbaV07IFxuICAgICAgICAgICAgICBhd2IuZG9jLmRhdGVDcmVhdGVkID0gbW9tZW50LnVuaXgoYXdiLmRvYy5kYXRlQ3JlYXRlZCkuZm9ybWF0KFwiWVlZWS1NTS1ERCBoaDptbSBBXCIpXG4gICAgICAgICAgICAgIC8vd2UgbmVlZCB0byBnZXQgdGhlIGN1c3RvbWVyIFxuICAgICAgICAgICAgICBhd2IuZG9jLmNvbnNpZ25lZSA9IGN1c3RvbWVyc1tpXS5uYW1lOyBcbiAgICAgICAgICAgICAgYXdiLmRvYy5wbWIgPSBjdXN0b21lcnNbaV0ucG1iOyBcbiAgICAgICAgICAgICAgYXdiLmRvYy53ZWlnaHQgPSBkZXRhaWxzW2ldLndlaWdodDsgXG4gICAgICAgICAgICAgIGF3Yi5kb2MuZGVzY3JpcHRpb24gPSBkZXRhaWxzW2ldLmRlc2NyaXB0aW9uOyBcbiAgICAgICAgICAgICAgYXdiLmRvYy5waWVjZXMgPSBkZXRhaWxzW2ldLnBpZWNlczsgXG4gICAgICAgICAgICAgIGlmIChjdXN0b21lcnNbaV0ucG1iID09ICcnKXtcbiAgICAgICAgICAgICAgICBhd2IuZG9jLnBtYiA9ICc5MDAwJ1xuICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgIGNvbnNvbGUubG9nKCdwdXNoaW5nICcsYXdiKVxuICAgICAgICAgICAgICAvL3dlIG5lZWQgdG8gZ2V0IGFsbCB0aGUgcGFja2FnZXMgXG4gICAgICAgICAgICAgIGF3Ykxpc3QucHVzaChhd2IuZG9jKVxuICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICByZXNvbHZlKHthd2JzOmF3Ykxpc3R9KVxuICAgICAgICAgICB9KVxuICAgICAgICAgIFxuICAgICAgICAgIH0pLmNhdGNoKGVycj0+e1xuICAgICAgICAgICAgY29uc29sZS5sb2coZXJyKTsgXG4gICAgICAgICAgfSlcbiAgICAgICAgIFxuICAgICAgICAvLyAgYXdicy5yZXN1bHRzLmZvckVhY2goYXdiID0+IHtcbiAgICAgICAgICAgXG4gICAgICAgICAgXG4gICAgICAgIC8vICB9KTtcbiAgICAgICAgIFxuICAgICAgIH0pXG4gICAgfSlcbiAgfVxuICBnZXRBd2IoaWQpe1xuICAgIGNvbnN0IHNydiA9IHRoaXM7IFxuICAgIHJldHVybiBuZXcgUHJvbWlzZSgocmVzb2x2ZSxyZWplY3QpPT57XG4gICAgICBhd2JJbmRleC5nZXREb2MoaWQsKGVycixhd2IpPT57XG4gICAgICAgIC8vZ2V0IHRoZSBjdXN0b21lciBcbiAgICAgICAgY3VzdG9tZXJTZXJ2aWNlLmdldEN1c3RvbWVyKGF3Yi5kb2MuY3VzdG9tZXJJZCkudGhlbihjdXN0b21lcj0+e1xuICAgICAgICAgIGF3Yi5kb2MuY3VzdG9tZXIgPSBjdXN0b21lcjsgXG4gICAgICAgICAgc3J2LmdldEF3YkRldGFpbHMoaWQpLnRoZW4ocGFja2FnZXM9PntcbiAgICAgICAgICAgIC8vZ2V0IHRoZSBwYWNrYWdlcyBmb3IgdGhlIGF3YiBcbiAgICAgICAgICAgIGF3Yi5kb2MucGFja2FnZXMgPSBwYWNrYWdlczsgXG4gICAgICAgICAgICByZXNvbHZlKHthd2I6YXdiLmRvY30pICBcbiAgICAgICAgICB9KVxuICAgICAgICAgIFxuICAgICAgICB9KVxuICAgICAgICBcbiAgICAgIH0pXG4gICAgfSlcbiAgfVxuICB1cGRhdGVMb2NhdGlvbih0cmFja2luZ051bWJlcixsb2NhdGlvbl9pZCl7XG4gICAgcmV0dXJuIG5ldyBQcm9taXNlKChyZXNvbHZlLHJlamVjdCk9PntcbiAgICAgIHBhY2thZ2VJbmRleC5zZWFyY2goXCJAdHJhY2tpbmdObzpcIit0cmFja2luZ051bWJlcix7bG9jYXRpb246bG9jYXRpb25faWR9LChlcnIscGFja2FnZVJlc3VsdCk9PntcblxuICAgICAgfSlcbiAgICB9KVxuICB9XG4gIHNhdmVQYWNrYWdlVG9Bd2IobmV3UGFja2FnZSl7XG4gICAgcmV0dXJuIG5ldyBQcm9taXNlKChyZXNvbHZlLHJlc3VsdCk9PntcbiAgICAgIGlmIChuZXdQYWNrYWdlLmlkICE9XCIwXCIpe1xuICAgICAgICBwYWNrYWdlSW5kZXgudXBkYXRlKG5ld1BhY2thZ2UuaWQsbmV3UGFja2FnZSwoZXJyLHJlc3VsdCk9PntcbiAgICAgICAgICBpZiAoZXJyKVxuICAgICAgICAgICAgY29uc29sZS5sb2coZXJyKTsgXG4gICAgICAgICAgcmVzb2x2ZSh7c2F2ZWQ6dHJ1ZSxpZDpuZXdQYWNrYWdlLmlkfSlcbiAgICAgICAgfSlcbiAgICAgIH1cbiAgICAgIGVsc2Uge1xuICAgICAgICBkYXRhQ29udGV4dC5yZWRpc0NsaWVudC5pbmNyKFBLR19JRF9DT1VOVEVSLChlcnIsaWQpPT57XG4gICAgICAgICAgbmV3UGFja2FnZS5pZCA9IGlkOyBcbiAgICAgICAgICBwYWNrYWdlSW5kZXguYWRkKGlkLG5ld1BhY2thZ2UsKGVycixyZXN1bHQpPT57XG4gICAgICAgICAgICBpZiAoZXJyKVxuICAgICAgICAgICAgICBjb25zb2xlLmxvZyhlcnIpOyBcbiAgICAgICAgICAgIHJlc29sdmUoe3NhdmVkOnRydWUsaWQ6aWR9KVxuICAgICAgICAgIH0pXG4gICAgICAgIH0pXG4gICAgICB9XG4gICBcbiAgICB9KVxuICB9XG4gIGNyZWF0ZUNvbnNvbGF0ZWQocGFja2FnZXMsdXNlcm5hbWUsYm94U2l6ZSl7XG4gICAgdmFyIHNydiA9IHRoaXM7IFxuICAgIHJldHVybiBuZXcgUHJvbWlzZSgocmVzb2x2ZSxyZWplY3QpPT57XG4gICAgICB2YXIgYXdiSW5mbyA9IHsgXG4gICAgICAgIGlkOiBcIlwiLFxuICAgICAgICBpc1NlZDowLFxuICAgICAgICBoYXNEb2NzOiBcIjBcIixcbiAgICAgICAgaW52b2ljZU51bWJlcjpcIlwiLFxuICAgICAgICB2YWx1ZTpcIjBcIixcbiAgICAgICAgY3VzdG9tZXJJZDoyNDE5NyxcbiAgICAgICAgc2hpcHBlcjpcIjQ4MlwiLCAvLyB3ZSBzaG91bGQgZ2V0IGFuIGlkIGhlcmUgXG4gICAgICAgIGNhcnJpZXI6XCJVU1BTXCIsXG4gICAgICAgIGhhem1hdDpcIlwiLFxuICAgICAgICB1c2VybmFtZTogIHVzZXJuYW1lXG4gICAgICAgXG4gICAgfTtcbiAgICBzcnYuc2F2ZUF3Yihhd2JJbmZvKS50aGVuKGF3YlJlc3VsdD0+e1xuICAgICAgIC8vYWRkIFxuICAgICAgICAgIHZhciBjUGFja2FnZSA9IHtcbiAgICAgICAgICAgIGlkOjAsXG4gICAgICAgICAgICB0cmFja2luZ05vOiB1bmlxSWQoKSxcbiAgICAgICAgICAgIGRlc2NyaXB0aW9uOiBcIkNvbnNvbGlkYXRlZCBQYWNrYWdlXCIsXG4gICAgICAgICAgICB3ZWlnaHQ6MCwgXG4gICAgICAgICAgICBkaW1lbnNpb25zOiAgYCR7Ym94U2l6ZX14JHtib3hTaXplfXgke2JveFNpemV9YCxcbiAgICAgICAgICAgIGF3Yjphd2JSZXN1bHQuaWQsIFxuICAgICAgICAgICAgaXNDb25zb2xpZGF0ZWQ6IFwiMVwiLCBcbiAgICAgICAgICAgIGNyZWF0ZWRfYnk6IHVzZXJuYW1lLCBcbiAgICAgICAgICBcbiAgICAgICAgfTsgXG4gICAgICAgIHNydi5zYXZlUGFja2FnZVRvQXdiKGNQYWNrYWdlKS50aGVuKHBrZ1Jlc3VsdD0+e1xuICAgICAgICAgIC8vIGdldCB0aGUgaWQgXG4gICAgICAgICAgLy9cbiAgICAgICAgICB2YXIgYmF0Y2ggPSBkYXRhQ29udGV4dC5yZWRpc0NsaWVudC5iYXRjaCgpOyBcbiAgICAgICAgICB2YXIgcGtnQmF0Y2ggPSBkYXRhQ29udGV4dC5yZWRpc0NsaWVudC5iYXRjaCgpOyBcblxuICAgICAgICAgIHBhY2thZ2VzLmZvckVhY2gocGtnID0+IHtcbiAgICAgICAgICAgIC8vdGhlc2UgYXJlIGJhcmNvZGVzIFxuICAgICAgICAgICAgYmF0Y2guc2FkZChcImNvbnNvbGlkYXRlZDpwa2c6XCIrcGtnUmVzdWx0LmlkLHBrZylcbiAgICAgICAgICAgIHBrZ0JhdGNoLmhtZ2V0KFBLR19QUkVGSVgrZ2V0UGFja2FnZUlkRnJvbUJhckNvZGUocGtnKSxcIndlaWdodFwiKVxuICAgICAgICAgIH0pO1xuICAgICAgICAgIGJhdGNoLmV4ZWMoKGVycixyZXN1bHRzKT0+e1xuICAgICAgICAgICAgLy9cbiAgICAgICAgICAgIHBrZ0JhdGNoLmV4ZWMoKGVycjEscmVzdWx0cyk9PntcbiAgICAgICAgICAgICAgdmFyIHRvdGFsV2VpZ2h0ID0gMDsgXG4gICAgICAgICAgICAgIHJlc3VsdHMuZm9yRWFjaCh3ZWlnaHQgPT4ge1xuICAgICAgICAgICAgICAgIGlmIChpc05hTihOdW1iZXIod2VpZ2h0KSkgPT0gZmFsc2UpXG4gICAgICAgICAgICAgICAgICB0b3RhbFdlaWdodCArPSBOdW1iZXIod2VpZ2h0KTtcbiAgICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICAgIC8vd2UgbmVlZCB0byB1cGRhdGUgdGhlIHRvdGFsIHdlaWdodCBvZiB0aGUgcGFja2FnZSBub3cgXG4gICAgICAgICAgICAgIHNydi5wYWNrYWdlSW5kZXgudXBkYXRlKGNQYWNrYWdlLmlkLHt3ZWlnaHQ6dG90YWxXZWlnaHR9KVxuICAgICAgICAgICAgfSlcbiAgICAgICAgICAgIFxuICAgICAgICAgICAgcmVzb2x2ZSh7c2F2ZWQ6dHJ1ZSxpZDpwa2dSZXN1bHQuaWR9KVxuICAgICAgICAgIH0pXG4gICAgICAgIH0pXG4gICAgICAgIFxuICAgIH0pXG5cbiAgIFxuICAgICAgLy92YWxpZGF0ZSB0aGUgcGFja2FnZSBcbiAgICBcblxuICAgIH0pXG4gIH1cbiAgc2F2ZVBhY2thZ2UoYm9keSl7XG4gICAgcmV0dXJuIG5ldyBQcm9taXNlKChyZXNvbHZlLHJlamVjdCk9PntcbiAgICAgIHZhciBjUGFja2FnZSA9IHtcbiAgICAgICAgXG4gICAgICAgIHNreWJveDogYm9keS5za3lib3gsXG4gICAgICAgIGN1c3RvbWVyOiBib2R5LmN1c3RvbWVyLnJlcGxhY2UoXCItXCIsIFwiXCIpLnRyaW0oKSxcbiAgICAgICAgdHJhY2tpbmdObzogYm9keS50cmFja2luZyxcbiAgICAgICAgZGVzY3JpcHRpb246IGJvZHkuZGVzY3JpcHRpb24sXG4gICAgICAgIHNoaXBwZXI6IGJvZHkuc2hpcHBlcixcbiAgICAgICAgY2Fycmllcjpib2R5LmNhcnJpZXIsXG4gICAgICAgIHZhbHVlOiBOdW1iZXIoYm9keS52YWx1ZSksXG4gICAgICAgIHBpZWNlczogTnVtYmVyKGJvZHkucGllY2VzKSxcbiAgICAgICAgd2VpZ2h0OiBOdW1iZXIoYm9keS53ZWlnaHQpLFxuICAgICAgICBkaW1lbnNpb25zOiBib2R5LmRpbWVuc2lvbnMsXG4gICAgICAgIHN0YXR1czogMSxcbiAgICAgICAgbG9jYXRpb246IFwiRkxMXCIsXG4gICAgICAgIG1pZDogMCxcbiAgICAgICAgYXdiOjAsXG4gICAgICAgIC8vaGFzT3B0OiB0cnVlLFxuICAgICAgICAvL210eXBlOiBib2R5Lm10eXBlXG4gICAgICB9O1xuICAgICAgLy92YWxpZGF0ZSB0aGUgcGFja2FnZSBcbiAgICAgIGRhdGFDb250ZXh0LnJlZGlzQ2xpZW50LmluY3IoUEtHX0lEX0NPVU5URVIsKGVycixpZCk9PntcbiAgICAgICAgY1BhY2thZ2UuaWQgPSBpZDsgXG4gICAgICAgIGRhdGFDb250ZXh0LnJlZGlzQ2xpZW50LnNldChQS0dfUFJFRklYK2lkLGNQYWNrYWdlLChlcnIscmVzcG9uc2UpPT57XG4gICAgICAgICAgaWYgKGVycil7XG4gICAgICAgICAgICByZWplY3Qoe3NhdmVkOmZhbHNlLGVycjplcnJ9KVxuICAgICAgICAgIH1cbiAgICAgICAgICAgdmFyIGluZGV4UGFja2FnZSA9ICBjcmVhdGVEb2N1bWVudChjUGFja2FnZSk7IFxuICAgICAgICAgICBjb25zb2xlLmxvZyhpbmRleFBhY2thZ2UpOyBcbiAgICAgICAgICAgcGFja2FnZUluZGV4LmFkZChjUGFja2FnZS5pZCxpbmRleFBhY2thZ2UsKGVycjEsZG9jUmVzdWx0KT0+e1xuICAgICAgICAgICAgIGNvbnNvbGUubG9nKGRvY1Jlc3VsdCk7IFxuICAgICAgICAgICAgIGlmKGVycjEpe1xuICAgICAgICAgICAgICAgcmVqZWN0KHtzYXZlZDpmYWxzZSxlcnI6ZXJyMX0pXG4gICAgICAgICAgICAgfVxuICAgICAgICAgICAgIHJlc29sdmUoe3NhdmVkOnRydWV9KVxuICAgICAgICAgICB9KVxuXG4gICAgICAgIH0pXG4gICAgICB9KTtcbiAgICBcblxuXG4gICAgfSlcbiAgfVxuXG4gIGdldE1hbmlmZXN0UGFja2FnZXMoKXtcbiAgICByZXR1cm4gbmV3IFByb21pc2UoKHJlc29sdmUscmVqZWN0KT0+e1xuICAgICAgXG4gICAgICB0aGlzLm15U2VhcmNoLnNlYXJjaChcbiAgICAgICAgYEBtaWQ6WzAgMF1gLFxuICAgICAgICB7IG9mZnNldDogMCwgbnVtYmVyT2ZSZXN1bHRzOiA1MDAwIH0sXG4gICAgICAgIChlcnIsIGRhdGEpID0+IHtcbiAgICAgICAgICB2YXIgcGFja2FnZXMgPSBbXTtcbiAgICAgICAgICBjb25zb2xlLmxvZyhkYXRhKTtcbiAgICAgICAgICBkYXRhLnJlc3VsdHMuZm9yRWFjaChlbGVtZW50ID0+IHtcblxuICAgICAgICAgICAgcGFja2FnZXMucHVzaChlbGVtZW50LmRvYyk7XG4gICAgICAgICAgICByZXNvbHZlKHBhY2thZ2VzKTsgICAgICAgICAgICAgICAgIFxuICAgICAgICB9KTtcbiAgICB9KTtcbiAgICB9KVxuICB9XG4gIGdldFJlY2VpdmVkUGFja2FnZXMocGFnZSxwYWdlU2l6ZSl7XG4gICAgcmV0dXJuIG5ldyBQcm9taXNlKChyZXNvbHZlLHJlamVjdCk9PntcbiAgICAgIFxuICAgICAgdGhpcy5teVNlYXJjaC5zZWFyY2goXG4gICAgICAgIGBAbWlkOlswIDBdYCxcbiAgICAgICAgeyBvZmZzZXQ6IDAsIG51bWJlck9mUmVzdWx0czogNTAwMCB9LFxuICAgICAgICAoZXJyLCBkYXRhKSA9PiB7XG4gICAgICAgICAgdmFyIHBhY2thZ2VzID0gW107XG4gICAgICAgICAgY29uc29sZS5sb2coZGF0YSk7XG4gICAgICAgICAgZGF0YS5yZXN1bHRzLmZvckVhY2goZWxlbWVudCA9PiB7XG5cbiAgICAgICAgICAgIHBhY2thZ2VzLnB1c2goZWxlbWVudC5kb2MpO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIFxuICAgICAgICB9KTtcbiAgICAgICAgcmVzb2x2ZShwYWNrYWdlcyk7IFxuICAgIH0pO1xuICAgIH0pXG4gIH1cbiAgZ2V0Tm9Eb2NzUGFja2Fja2FnZXMocGFnZSxwYWdlU2l6ZSl7XG4gICAgcmV0dXJuIG5ldyBQcm9taXNlKChyZXNvbHZlLHJlamVjdCk9PntcbiAgICAgIFxuICAgICAgdGhpcy5teVNlYXJjaC5zZWFyY2goXG4gICAgICAgIGBAaGFzRG9jczpbMCAwXWAsXG4gICAgICAgIHsgb2Zmc2V0OiAwLCBudW1iZXJPZlJlc3VsdHM6IDUwMDAgfSxcbiAgICAgICAgKGVyciwgZGF0YSkgPT4ge1xuICAgICAgICAgIHZhciBwYWNrYWdlcyA9IFtdO1xuICAgICAgICAgIGNvbnNvbGUubG9nKGRhdGEpO1xuICAgICAgICAgIGRhdGEucmVzdWx0cy5mb3JFYWNoKGVsZW1lbnQgPT4ge1xuXG4gICAgICAgICAgICBwYWNrYWdlcy5wdXNoKGVsZW1lbnQuZG9jKTtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBcbiAgICAgICAgfSk7XG4gICAgICAgIHJlc29sdmUocGFja2FnZXMpOyBcbiAgICB9KTtcbiAgICB9KVxuICB9XG4gIGdldHBhY2thZ2VieVJlZGlzSWQoaWQpe1xuICAgIHJldHVybiBuZXcgUHJvbWlzZSgocmVzb2x2ZSxyZWplY3QpPT57XG4gICAgICBwYWNrYWdlSW5kZXguZ2V0RG9jKGlkLChlcnIsZG9jdW1lbnQpPT57XG4gICAgICAgIHJlc29sdmUoZG9jdW1lbnQuZG9jKTsgXG4gICAgICB9KVxuICAgIH0pXG4gIH1cbiAgZ2V0UGFja2FnZUJ5SWQoYmFyY29kZSl7XG4gICAgdmFyIHNydiA9IHRoaXM7IFxuICAgIHZhciBwa2dJZCA9IGdldFBhY2thZ2VJZEZyb21CYXJDb2RlKGJhcmNvZGUpOyBcbiAgICByZXR1cm4gbmV3IFByb21pc2UoKHJlc29sdmUscmVqZWN0KT0+e1xuICAgICAgdGhpcy5teVNlYXJjaC5nZXREb2MocGtnSWQsKGVycixkb2N1bWVudCk9PntcbiAgICAgICAgLy9nZXQgdGhlIGF3YiBpbmZvIGhlcmUgYXMgd2VsbCBcbiAgICAgICAgc3J2LmdldEF3Yihkb2N1bWVudC5kb2MuYXdiKS50aGVuKGF3YmluZm89PntcbiAgICAgICAgICBjb25zb2xlLmxvZyhhd2JpbmZvKTsgXG4gICAgICAgICAgdmFyIHJlc3BvbnNlID0geyBcbiAgICAgICAgICAgIGF3YiA6IGF3YmluZm8uYXdiLFxuICAgICAgICAgICAgcGFja2FnZSA6IGRvY3VtZW50LmRvY1xuICAgICAgICAgIH1cbiAgICAgICAgICByZXNvbHZlKHJlc3BvbnNlKTsgXG4gICAgICAgIH0pOyBcbiAgICAgICAgXG4gICAgICB9KVxuICAgIH0pOyBcbiAgfVxuICBnZXRQYWNrYWdlQnlEb2NJZChwa2dJZCl7XG4gICAgdmFyIHNydiA9IHRoaXM7IFxuICAgIHJldHVybiBuZXcgUHJvbWlzZSgocmVzb2x2ZSxyZWplY3QpPT57XG4gICAgICB0aGlzLm15U2VhcmNoLmdldERvYyhwa2dJZCwoZXJyLGRvY3VtZW50KT0+e1xuICAgICAgICAvL2dldCB0aGUgYXdiIGluZm8gaGVyZSBhcyB3ZWxsIFxuICAgICAgICBzcnYuZ2V0QXdiKGRvY3VtZW50LmRvYy5hd2IpLnRoZW4oYXdiaW5mbz0+e1xuICAgICAgICAgIGNvbnNvbGUubG9nKGF3YmluZm8pOyBcbiAgICAgICAgICB2YXIgcmVzcG9uc2UgPSB7IFxuICAgICAgICAgICAgYXdiIDogYXdiaW5mby5hd2IsXG4gICAgICAgICAgICBwYWNrYWdlIDogZG9jdW1lbnQuZG9jXG4gICAgICAgICAgfVxuICAgICAgICAgIHJlc29sdmUocmVzcG9uc2UpOyBcbiAgICAgICAgfSk7IFxuICAgICAgICBcbiAgICAgIH0pXG4gICAgfSk7IFxuICB9XG4gIC8vdXNpbmcgdGhpcyBcbiAgXG5cbiAgdXBkYXRlTWFuaWZlc3RQYWNrYWdlVG9JblRyYW5zaXQobWlkKSB7XG4gICAgLy9nZXQgYWxsIHRoZSBwYWNrYWdlc1xuICAgIC8vd2UgbmVlZCB0byB1cGRhdGUgdGhlIGluZGV4IGF0IHRoaXMgcG9pbnQgYXMgd2VsbFxuICAgIHZhciBtc2VhcmNoID0gdGhpcy5teVNlYXJjaDtcbiAgICB0aGlzLm15U2VhcmNoLnNlYXJjaChcbiAgICAgIGBAbWlkOlske21pZH0gJHttaWR9XWAsXG4gICAgICB7IG9mZnNldDogMCwgbnVtYmVyT2ZSZXN1bHRzOiA1MDAwIH0sXG4gICAgICAoZXJyLCBkYXRhKSA9PiB7XG4gICAgICAgIHZhciBwYWNrYWdlcyA9IFtdO1xuICAgICAgICBjb25zb2xlLmxvZyhkYXRhKTtcbiAgICAgICAgZGF0YS5yZXN1bHRzLmZvckVhY2goZWxlbWVudCA9PiB7XG4gICAgICAgICAgdmFyIG9sZERvY0lkID0gZWxlbWVudC5kb2NJZDtcbiAgICAgICAgICBlbGVtZW50LmRvY0lkID0gZWxlbWVudC5kb2NJZC5yZXBsYWNlKGAke21pZH0tYCwgXCJcIik7XG4gICAgICAgICAgcGFja2FnZXMucHVzaChlbGVtZW50LmRvY0lkKTtcbiAgICAgICAgICAvLyBpIGNvdWxkIGRlbGV0ZSBoZXJlXG4gICAgICAgICAgLy8gbXNlYXJjaC5kZWxEb2N1bWVudChQS0dfSURYLG9sZERvY0lkKVxuICAgICAgICAgIC8vdXBkYXRlIGFsbCB0aGUgcGFja2FnZXNcbiAgICAgICAgfSk7XG4gICAgICAgIHNldFBhY2thZ2VJblRyYW5zaXQocGFja2FnZXMsIG1zZWFyY2gsIG1pZCkudGhlbihmdW5jdGlvbihcbiAgICAgICAgICB1cGRhdGVkUGFja2FnZXNcbiAgICAgICAgKSB7XG4gICAgICAgICAgY29uc29sZS5sb2coXCJ1cGRhdGVkIHBhY2thZ2VzXCIpO1xuICAgICAgICAgIGNvbnNvbGUubG9nKHVwZGF0ZWRQYWNrYWdlcyk7XG4gICAgICAgIH0pO1xuICAgICAgfVxuICAgICk7XG4gIH1cbiAgcmVtb3ZlUGFja2FnZUZyb21NYW5pZmVzdChwYWNrYWdlSWQsIG1pZCkge1xuICAgIHZhciBtc2VhcmNoID0gdGhpcy5teVNlYXJjaDtcbiAgICByZXR1cm4gbmV3IFByb21pc2UoKHJlc29sdmUsIHJlamVjdCkgPT4ge1xuICAgICAgdmFyIG1hbmlmZXN0ID0gbWlkO1xuICAgICAgdmFyIG1hbmlmZXN0S2V5ID0gXCJtYW5pZmVzdDpcIiArIG1hbmlmZXN0ICsgXCI6KlwiO1xuXG4gICAgICBscmVkaXMuZGVsKFwicGFja2FnZXM6XCIgKyB0cmFja2luZ05vKS50aGVuKGZ1bmN0aW9uKHJlc3VsdCkge1xuICAgICAgICBjb25zb2xlLmxvZyhyZXN1bHQpO1xuICAgICAgICBtc2VhcmNoLmRlbERvY3VtZW50KFBLR19JRFgsIGAke21pZH0tJHt0cmFja2luZ05vfWApO1xuICAgICAgICAvL3dlIG5lZWQgdG8gcmVtb3ZlIGZyb20gdGhlIGluZGV4IGFuZCBkZWMgdGhlIGNvdW50ZXJcbiAgICAgICAgbHJlZGlzLmNsaWVudC5kZWNyKFwibWNvdW50ZXI6XCIgKyBtaWQpO1xuICAgICAgICAvL3JTZXJ2aWNlcy5wYWNrYWdlU2VydmljZS5ybVBhY2thZ2UobWlkLCB0cmFja2luZ05vKTtcbiAgICAgICAgbHJlZGlzLmdldEtleXMobWFuaWZlc3RLZXkpLnRoZW4oa1Jlc3VsdCA9PiB7XG4gICAgICAgICAgLy90aGUgbGlzdCBvZiBhbGwgdGhlIHNldHMgLi4ud2UgbmVlZCB0byByZW1vdmUgdGhlIGtleSBmcm9tIGVhY2ggb25lXG4gICAgICAgICAgdmFyIGtleXNDb3VudCA9IDA7XG5cbiAgICAgICAgICBrUmVzdWx0LmZvckVhY2goZWxlbWVudCA9PiB7XG4gICAgICAgICAgICBjb25zb2xlLmxvZyhcbiAgICAgICAgICAgICAgYHJlbW92aW5nICR7dHJhY2tpbmdOb30gcGFja2FnZSBtYW5pZmVzdCBzZXQgJHtlbGVtZW50fSBgXG4gICAgICAgICAgICApO1xuICAgICAgICAgICAgbHJlZGlzLnNyZW0oZWxlbWVudCwgdHJhY2tpbmdObykudGhlbihmdW5jdGlvbihyUmVzdWx0KSB7XG4gICAgICAgICAgICAgIGNvbnNvbGUubG9nKHJSZXN1bHQpO1xuICAgICAgICAgICAgICBjb25zb2xlLmxvZyhcInJlbW92ZWRcIik7XG4gICAgICAgICAgICAgIGlmIChrZXlzQ291bnQgPT0ga1Jlc3VsdC5sZW5ndGggLSAxKSBrZXlzQ291bnQrKztcbiAgICAgICAgICAgIH0pO1xuICAgICAgICAgIH0pO1xuICAgICAgICAgIHJlc29sdmUoe1xuICAgICAgICAgICAgZGVsZXRlZDogdHJ1ZVxuICAgICAgICAgIH0pO1xuICAgICAgICB9KTtcblxuICAgICAgICAvL3dlIGFsc28gbmVlZCB0byByZW1vdmUgZnJvbSBhbnkgc2V0c1xuICAgICAgfSk7XG4gICAgfSk7XG4gIH1cbiAgcmVtb3ZlUGFja2FnZUJ5SWQoaWQpIHtcbiAgICB2YXIgbXNlYXJjaCA9IHRoaXMubXlTZWFyY2g7XG4gICAgcmV0dXJuIG5ldyBQcm9taXNlKChyZXNvbHZlLCByZWplY3QpID0+IHtcbiAgICAgIFxuICAgICAgcGFja2FnZUluZGV4LmRlbERvY3VtZW50KFBLR19JRFgsaWQsKGVycixyZXNwb25zZSk9PntcbiAgICAgICAgaWYgKGVycilcbiAgICAgICAgICBjb25zb2xlLmxvZyhlcnIpOyBcbiAgICAgICAgY29uc29sZS5sb2cocmVzcG9uc2UpOyBcbiAgICAgICAgcmVzb2x2ZSh7ZGVsZXRlZDp0cnVlfSlcbiAgICAgIH0pXG4gICAgICBcbiAgICAgICAgXG4gICAgICBcbiAgICB9KTtcbiAgfVxuICBzdG9yZVBhY2thZ2VGb3JQaWNrdXAodHJhY2tpbmdObyxiaW4pe1xuICAgIHZhciBzZWFyY2hlciA9IHRoaXMubXlTZWFyY2g7XG4gICAgcmV0dXJuIG5ldyBQcm9taXNlKChyZXNvbHZlLHJlamVjdCk9PntcbiAgICAgICBscmVkaXMuaG1zZXQoUEtHX1BSRUZJWCt0cmFja2luZ05vLHtzdGF0dXM6NCxsb2NhdGlvbjpiaW59KS50aGVuKChyZXN1bHQpPT57XG4gICAgICAgICBscmVkaXMuZ2V0UGFja2FnZSh0cmFja2luZ05vKS50aGVuKChwa2cpPT57XG4gICAgICAgICAgYWRkUGFja2FnZVRvSW5kZXgodHJhY2tpbmdObyxzZWFyY2hlcikgOyBcbiAgICAgICAgICByZXNvbHZlKHBrZyk7ICAgXG4gICAgICAgICB9KTtcbiAgICAgICB9KSBcbiAgICB9KTsgXG4gIH1cbiAgdXBkYXRlUGFja2FnZUluZGV4KHRyYWNraW5nKXtcbiAgICAgIHJldHVybiBuZXcgUHJvbWlzZSgocmVzb2x2ZSxyZWplY3QpPT57XG4gICAgICAgICAgdmFyIG1zZWFyY2ggPSB0aGlzLm15U2VhcmNoOyBcbiAgICAgICAgICBhZGRQYWNrYWdlVG9JbmRleCh0cmFja2luZyxtc2VhcmNoKTsgXG4gICAgICAgICByZXNvbHZlKHsndXBkYXRlZCc6dHJ1ZX0pO1xuICAgICAgfSlcbiAgfVxuICBnZXRDdXN0b21lclBhY2thZ2VzKHNreWJveCkge31cbiAgZ2V0TWFuaWZlc3RQYWNrYWdlc0J5U3RhdHVzKG1pZCxzdGF0dXMpIHtcbiAgICAgIHJldHVybiBuZXcgUHJvbWlzZSgocmVzb2x2ZSxyZWplY3QpPT57XG4gICAgICAgICAgY29uc29sZS5sb2coYEBtaWQ6WyR7bWlkfSAke21pZH1dYClcbiAgICAgICAgdGhpcy5teVNlYXJjaC5zZWFyY2goXG4gICAgICAgICAgICBgQG1pZDpbJHttaWR9ICR7bWlkfV1gLFxuICAgICAgICAgICAgeyBvZmZzZXQ6IDAsIG51bWJlck9mUmVzdWx0czogNTAwMCB9LFxuICAgICAgICAgICAgKGVyciwgZGF0YSkgPT4ge1xuICAgICAgICAgICAgICB2YXIgcGFja2FnZXMgPSBbXTtcbiAgICAgICAgICAgICAgY29uc29sZS5sb2coZGF0YSk7XG4gICAgICAgICAgICAgIGRhdGEucmVzdWx0cy5mb3JFYWNoKGVsZW1lbnQgPT4ge1xuXG4gICAgICAgICAgICAgICAgcGFja2FnZXMucHVzaChlbGVtZW50LmRvYyk7XG4gICAgICAgICAgICAgICAgcmVzb2x2ZShwYWNrYWdlcyk7ICAgICAgICAgICAgICAgICBcbiAgICAgICAgICAgIH0pO1xuICAgICAgICB9KTtcbiAgICAgIH0pO1xuICBcbiAgfSAgIFxuICBcbiAgLy8jcmVnaW9uIFBha2NhZ2UgRmlsdGVycyAgXG4gIFxuICBnZXRQYWNrYWdlc05hc1dhcmVob3VzZShpc05vRG9jLGNvbXBhbnkpe1xuICAgIHZhciBzcnYgPSB0aGlzOyBcbiAgICByZXR1cm4gbmV3IFByb21pc2UoKHJlc29sdmUscmVqZWN0KT0+e1xuICAgICAgICBwYWNrYWdlSW5kZXguc2VhcmNoKGBAc3RhdHVzOls0IDRdIEBjb21wYW55OiR7Y29tcGFueX0gQGhhc0RvY3M6WyR7aXNOb0RvY30gJHtpc05vRG9jfV1gLHt9LChlcnIscmVwbHkpPT57XG4gICAgICAgICAgUHJvbWlzZS5hbGwocmVwbHkucmVzdWx0cy5tYXAocGtnID0+IHNydi5nZXRQYWNrYWdlQnlEb2NJZChwa2cuaWQpKSkudGhlbihwYWNrYWdlcz0+e1xuICAgICAgICAgICAgcmVzb2x2ZShwYWNrYWdlcyk7IFxuICAgICAgICAgIH0pXG5cbiAgICAgICAgfSlcbiAgICB9KVxuICB9XG5cbiAgLy8jZW5kcmVnaW9uXG4gIFxuXG4gICAvLyNyZWdpb24gTWFuaWZlc3QgUGFja2FnZSBGdW5jdGlvbnMgXG5cbiAgIGFkZFRvRmxpZ2h0KGFjdGlvbil7XG4gICAgIHZhciBzcnYgPSB0aGlzOyBcbiAgICByZXR1cm4gbmV3IFByb21pc2UoKHJlc29sdmUscmVqZWN0KT0+e1xuICAgICAgdmFyIHBhY2thZ2VObyA9IGdldFBhY2thZ2VJZEZyb21CYXJDb2RlKGFjdGlvbi5iYXJjb2RlKTsgXG4gICAgICBjb25zb2xlLmxvZyhhY3Rpb24pOyBcbiAgICAgIHRoaXMubXlTZWFyY2gudXBkYXRlKHBhY2thZ2VObyx7bWlkOmFjdGlvbi5taWQgLCBzdGF0dXM6IDIsIGxvY2F0aW9uOlwiTG9hZGVkIG9uIEFpckNyYWZ0XCIsY29tcGFydG1lbnQ6YWN0aW9uLmNvbXBhcnRtZW50fSwoZXJyLHJlc3VsdCk9PntcbiAgICAgICAgaWYoZXJyKVxuICAgICAgICAgIHJlc29sdmUoe2FkZGVkOmZhbHNlfSlcbiAgICAgICAgc3J2LmdldEZsaWdodENvbXBhcnRtZW50V2VpZ2h0KGFjdGlvbi5taWQsYWN0aW9uLmNvbXBhcnRtZW50KS50aGVuKGZyZXN1bHQ9PntcbiAgICAgICAgICBmcmVzdWx0LmFkZGVkID0gdHJ1ZTsgXG4gICAgICAgICAgcmVzb2x2ZShmcmVzdWx0KVxuICAgICAgICB9KVxuICAgICAgIFxuICAgICAgfSlcbiAgICAgICAgXG4gICAgfSlcbiAgIH1cbiAgIC8vZ2V0IHRoZSBjb21wYXJ0bWVudCB3ZWlnaHQgXG4gICBnZXRGbGlnaHRDb21wYXJ0bWVudFdlaWdodChtaWQsY29tcGFydG1lbnQpe1xuICAgICByZXR1cm4gbmV3IFByb21pc2UoKHJlc29sdmUscmVqZWN0KT0+e1xuICAgICAgXG4gICAgICB0aGlzLm15U2VhcmNoLmFnZ3JlZ2F0ZShgQG1pZDpbJHttaWR9ICR7bWlkfV0gQGNvbXBhcnRtZW50OiR7Y29tcGFydG1lbnR9YCwge30sKGVycixyZXBseSk9PntcbiAgICAgICAgIGlmIChlcnIpXG4gICAgICAgICBjb25zb2xlLmxvZyhlcnIpOyBcbiAgICAgICAgIGNvbnNvbGUubG9nKHJlcGx5LFwiVE9UQUwgU0VDVElPTiBXZWlnaHRcIilcbiAgICAgICAgIGlmIChyZXBseVsxXSl7XG4gICAgICAgICAgIHZhciByZXN1bHQgPSByZXBseVsxXTtcbiAgICAgICAgICAgdmFyIGNvbXBhcnRtZW50ID0gcmVzdWx0WzNdOyBcbiAgICAgICAgICAgdmFyIHdlaWdodCA9IHJlc3VsdFs1XTsgXG4gICAgICAgICB9XG4gICAgICAgICByZXNvbHZlKHtjb21wYXJ0bWVudDpjb21wYXJ0bWVudCx3ZWlnaHQ6d2VpZ2h0fSlcbiAgICAgICB9KVxuICAgICB9KVxuICAgfVxuICAgLy9yZW1vdmUgZnJvbSBmbGlnaHQgXG4gICByZW1vdmVGcm9tRmxpZ2h0KGFjdGlvbil7XG4gICAgcmV0dXJuIG5ldyBQcm9taXNlKChyZXNvbHZlLHJlamVjdCk9PntcbiAgICAgICAgdmFyIHBhY2thZ2VObyA9IGdldFBhY2thZ2VJZEZyb21CYXJDb2RlKGFjdGlvbi5iYXJjb2RlKTsgICBcbiAgICAgICAgdGhpcy5teVNlYXJjaC51cGRhdGUocGFja2FnZU5vLHttaWQ6YWN0aW9uLm1pZH0sKGVycixyZXN1bHQpPT57XG4gICAgICAgIGlmKGVycilcbiAgICAgICAgICAgIHJlc29sdmUoe3JlbW92ZWQ6ZmFsc2V9KVxuICAgICAgICAgIFxuICAgICAgICAgIHJlc29sdmUoe3JlbW92ZWQ6dHJ1ZX0pXG4gICAgICAgIH0pXG4gICAgfSlcbiAgIH1cbiAgIHJlY0Zyb21UcnVjayh0cmFja2luZ05vLHVzZXJuYW1lLHNoaXBtZW50SWQpe1xuICAgICByZXR1cm4gbmV3IFByb21pc2UoKHJlc29sdmUscmVqZWN0KT0+e1xuICAgICAgICBkYXRhQ29udGV4dC5yZWRpc0NsaWVudC5zYWRkKFwic2hpcG1lbnQ6aWQ6XCIrc2hpcG1lbnRJZCx0cmFja2luZ05vLChlcnIscmVwbHkpPT57XG4gICAgICAgICAgZGF0YUNvbnRleHQucmVkaXNDbGllbnQuc2V0KFJFQ19QS0crdHJhY2tpbmdObyxtb21lbnQoKS51bml4KCksIChlcnIscmVzdWx0KT0+e1xuICAgICAgICAgICAgaWYgKGVycikgcmVzb2x2ZSh7c2F2ZWQ6ZmFsc2V9KVxuICAgICAgICAgICAgLy9zaGlwbWVudCBjb3VudCBcbiAgICAgICAgICAgIHZhciBzaGlwbWVudENvdW50ID0gMTtcbiAgICAgICAgICAgIGRhdGFDb250ZXh0LnJlZGlzQ2xpZW50LnNjYXJkKFwic2hpcG1lbnQ6aWQ6XCIrc2hpcG1lbnRJZCwoZXJyLGNhcmQpPT57XG4gICAgICAgICAgICAgIHJlc29sdmUoe3NhdmVkOnRydWUscGtnQ291bnQ6Y2FyZH0pXG4gICAgICAgICAgICB9KTtcbiAgICAgICAgICAgXG4gICAgICAgICAgfSlcbiAgICAgICAgfSlcbiAgICAgICAgXG4gICAgIH0pXG4gICB9XG4gICBwcm9jc3Nlc3NQYWNrYWdlKHBrZ0lmbm8sdXNlcm5hbWUpe1xuICAgIHZhciBzcnYgPSB0aGlzOyAgXG4gICAgcmV0dXJuIG5ldyBQcm9taXNlKChyZXNvbHZlLHJlamVjdCk9PntcbiAgICAgICAvL3dlIGFsc28gbmVlZCB0byBzZXQgdGhlIHdhcmVob3VzZSBsb2NhdGlvbiBoZXJlIFxuICAgICAgIGRhdGFDb250ZXh0LnJlZGlzQ2xpZW50Lmhtc2V0KFwiZmVlczphd2I6XCIrcGtnSWZuby5hd2IscGtnSWZubywoZXJyLHJlc3VsdCk9PntcbiAgICAgICAgIGlmIChlcnIpXG4gICAgICAgICAgY29uc29sZS5sb2coZXJyKTsgXG4gICAgICAgICAgY29uc29sZS5sb2cocmVzdWx0KTsgXG4gICAgICAgICAgY29uc29sZS5sb2coXCJwcmludDpmZWVzOlwiK3VzZXJuYW1lLHVzZXJuYW1lKTsgXG4gICAgICAgICBkYXRhQ29udGV4dC5yZWRpc0NsaWVudC5wdWJsaXNoKFwicHJpbnQ6ZmVlczpcIit1c2VybmFtZSxwa2dJZm5vLmF3Yik7IFxuICAgICAgICAgIHNydi5nZXRQYWNrYWdlQnlJZChwa2dJZm5vLmJhcmNvZGUpLnRoZW4ocGtnPT57XG5cbiAgICAgICAgICAgIGlmIChwa2dJZm5vLnJlZkxvYyl7XG4gICAgICAgICAgICAgIHBrZy5wYWNrYWdlLndsb2MgPSBwa2dJZm5vLnJlZkxvYzsgXG4gICAgICAgICAgICAgIGlmIChOdW1iZXIocGtnSWZuby5ub2RvY3MpIT0gMCApXG4gICAgICAgICAgICAgICAgcGtnLnBhY2thZ2UuaGFzRG9jcyA9IDAgOyBcbiAgICAgICAgICAgICAgICBwa2cucGFja2FnZS5oYXNEb2NzID0gNDsgXG5cbiAgICAgICAgICAgICAgICAvL3NldCB0aGVvbXBhbnkgXG4gICAgICAgICAgICAgICAgaWYgKE51bWJlcihwa2cuYXdiLmN1c3RvbWVyLnBtYikgPiA5MDAwKXtcbiAgICAgICAgICAgICAgICAgIHBrZy5wYWNrYWdlLmNvbXBhbnkgPSBcIjBcIlxuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICBlbHNlIFxuICAgICAgICAgICAgICAgICAgcGtnLnBhY2thZ2UuY29tcGFueSA9IFwiMVwiXG4gICAgICAgICAgICAgICAgY29uc29sZS5sb2coJ3VwZGF0aW5nIHdpdGggJyxwa2cucGFja2FnZSlcbiAgICAgICAgICAgICAgcGFja2FnZUluZGV4LnVwZGF0ZShwa2cucGFja2FnZS5pZCxwa2cucGFja2FnZSwoZXJyUmVzcCxyZXNwb25zZSk9PntcbiAgICAgICAgICAgICAgICBpZihlcnJSZXNwKVxuICAgICAgICAgICAgICAgIGNvbnNvbGUubG9nKGVyclJlc3ApXG4gICAgICAgICAgICAgIH0pXG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBcbiAgICAgICAgICB9KVxuICAgICAgICAgcmVzb2x2ZSh7c2VudDp0cnVlfSlcbiAgICAgICB9KVxuICAgICB9KVxuICAgfVxuICAgcmVjRnJvbVBsYW5lTmFzKGJhcmNvZGUpe1xuICAgICByZXR1cm4gbmV3IFByb21pc2UoKHJlc29sdmUscmVqZWN0KT0+e1xuICAgICAgIHZhciBzcnYgPSB0aGlzIDsgXG4gICAgICAgdmFyIHBrZ0lkID0gZ2V0UGFja2FnZUlkRnJvbUJhckNvZGUoYmFyY29kZSk7IFxuICAgICAgICBzcnYubXlTZWFyY2guZ2V0RG9jKHBrZ0lkLChlcnIscGtnKT0+e1xuICAgICAgICAgICAgcGtnLmRvYy5zdGF0dXMgPSA0OyBcbiAgICAgICAgICAgIHBrZy5kb2MubG9jYXRpb24gID0gXCJXYXJlaG91c2UgTkFTXCI7IFxuICAgICAgICAgICAgc3J2Lm15U2VhcmNoLnVwZGF0ZShwa2dJZCxwa2cuZG9jLChlcnIsdXBkYXRlUmVzdWx0KT0+e1xuICAgICAgICAgICAgICBpZihlcnIpXG4gICAgICAgICAgICAgICAgcmVqZWN0KHt1cGRhdGVkOmZhbHNlfSlcbiAgICAgICAgICAgICAgcmVzb2x2ZSh7dXBkYXRlZDp0cnVlfSlcbiAgICAgICAgICAgIH0pXG4gICAgICAgIH0pXG4gICAgIH0pXG4gICB9XG5cbiAgIC8vI2VuZHJlZ2lvblxufVxuXG5mdW5jdGlvbiBnZXRQYWNrYWdlSWRGcm9tQmFyQ29kZShiYXJDb2RlVmFsdWUpe1xuICB2YXIgcGFydHMgPSBiYXJDb2RlVmFsdWUuc3BsaXQoXCItXCIpOyBcbiAgaWYgKHBhcnRzLmxlbmd0aCA9PSAzKVxuICAgIGlmICh0eXBlb2YgcGFydHNbMl0gIT0gXCJ1bmRlZmluZWRcIilcbiAgICByZXR1cm4gcGFydHNbMl0udHJpbSgpOyBcbiAgcmV0dXJuIFwiXCJcbn1cbiJdfQ==
