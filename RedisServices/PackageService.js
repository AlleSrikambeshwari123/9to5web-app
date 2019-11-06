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
      var _this7 = this;

      return new Promise(function (resolve, reject) {
        var msearch = _this7.mySearch;
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
      var _this8 = this;

      return new Promise(function (resolve, reject) {
        console.log("@mid:[" + mid + " " + mid + "]");
        _this8.mySearch.search("@mid:[" + mid + " " + mid + "]", { offset: 0, numberOfResults: 5000 }, function (err, data) {
          var packages = [];
          console.log(data);
          data.results.forEach(function (element) {

            packages.push(element.doc);
            resolve(packages);
          });
        });
      });
    }

    //#region Manifest Package Functions 

  }, {
    key: "addToFlight",
    value: function addToFlight(action) {
      var _this9 = this;

      var srv = this;
      return new Promise(function (resolve, reject) {
        var packageNo = getPackageIdFromBarCode(action.barcode);
        console.log(action);
        _this9.mySearch.update(packageNo, { mid: action.mid, status: 2, location: "Loaded on AirCraft", compartment: action.compartment }, function (err, result) {
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
      var _this10 = this;

      return new Promise(function (resolve, reject) {

        _this10.mySearch.aggregate("@mid:[" + mid + " " + mid + "] @compartment:" + compartment, {}, function (err, reply) {
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
      var _this11 = this;

      return new Promise(function (resolve, reject) {
        var packageNo = getPackageIdFromBarCode(action.barcode);
        _this11.mySearch.update(packageNo, { mid: action.mid }, function (err, result) {
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
      var _this12 = this;

      return new Promise(function (resolve, reject) {
        var srv = _this12;
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
//# sourceMappingURL=data:application/json;charset=utf8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIlJlZGlzU2VydmljZXMvUGFja2FnZVNlcnZpY2UuZXM2Il0sIm5hbWVzIjpbInJlZGlzIiwicmVxdWlyZSIsImxyZWRpcyIsIm1vbWVudCIsInJlZGlzU2VhcmNoIiwiZnMiLCJQYWNrYWdlVXRpbCIsIlBhY2thZ2VVdGlsaXR5IiwicGFja2FnZVV0aWwiLCJQS0dfSURYIiwiUEtHX0lEX0NPVU5URVIiLCJkYXRhQ29udGV4dCIsIlBLR19QUkVGSVgiLCJBV0JfSUQiLCJJTkRFWF9BV0IiLCJSRUNfUEtHIiwidW5pcUlkIiwiQ3VzdG9tZXJTZXJ2aWNlIiwiY3VzdG9tZXJTZXJ2aWNlIiwiUEtHX1NUQVRVUyIsImFkZENvbW1hbmQiLCJhd2JJbmRleCIsImNsaWVudE9wdGlvbnMiLCJzZWFyY2hDbGllbnREZXRhaWxzIiwicGFja2FnZUluZGV4IiwiZ2V0UGFja2FnZVZvbHVtbmUiLCJtUGFja2FnZSIsImNyZWF0ZURvY3VtZW50IiwidFBhY2thZ2UiLCJwYWNrYWdlRG9jdW1lbnQiLCJpZCIsInRyYWNraW5nTm8iLCJza3lib3giLCJkYXRlUmVjaWV2ZWQiLCJ1bml4IiwiYXdiIiwibWlkIiwidm9sdW1lIiwid2VpZ2h0IiwicGllY2VzIiwiY3VzdG9tZXIiLCJzaGlwcGVyIiwiZGVzY3JpcHRpb24iLCJkaW1lbnNpb25zIiwiY2FycmllciIsInN0YXR1cyIsInZhbHVlIiwiY29uc29sZSIsImxvZyIsInNldFBhY2thZ2VJblRyYW5zaXQiLCJrZXlzIiwibXNlYXJjaGVyIiwiUHJvbWlzZSIsInJlc29sdmUiLCJyZWplY3QiLCJiYXRjaGVyIiwiY2xpZW50IiwiYmF0Y2giLCJmb3JFYWNoIiwibG9jYXRpb24iLCJlbGVtZW50IiwiaG1zZXQiLCJleGVjIiwiZXJyIiwicmVzdWx0IiwiYWRkUGFja2FnZVRvSW5kZXgiLCJnZXRQYWNrYWdlIiwidGhlbiIsImRlbERvY3VtZW50IiwicGFjayIsImRvbmUiLCJkb2N1bWVudCIsImFkZCIsIlBhY2thZ2VTZXJ2aWNlIiwic2V0dXBJbmRleCIsIm15U2VhcmNoIiwicmVkaXNDbGllbnQiLCJleGlzdHMiLCJzZXQiLCJpbml0UmVzdWx0IiwiaW5jciIsIm5ld0lkIiwidG9TdHJpbmciLCJ1cGRhdGVkX2J5IiwidXNlcm5hbWUiLCJkYXRlX3VwZGF0ZWQiLCJ1cGRhdGUiLCJlcnIxIiwiYXdiUmVzIiwic2F2ZWQiLCJyZXBseSIsImludm9pY2UiLCJoYXNEb2NzIiwiY3JlYXRlZF9ieSIsImRhdGVDcmVhdGVkIiwic2VhcmNoIiwibnVtYmVyT2ZSZXN1bHRzIiwib2Zmc2V0IiwicGFja2FnZXMiLCJ0b3RhbFJlc3VsdHMiLCJyZXN1bHRzIiwicGFja2FnZTEiLCJkb2MiLCJOdW1iZXIiLCJkYXRhIiwic3J2IiwicGFja2FnZWxpc3QiLCJjb3VudCIsImxlbmd0aCIsInN1YnN0cmluZyIsInB1c2giLCJzb3J0QnkiLCJhd2JzIiwiYXdiTGlzdCIsImFsbCIsIm1hcCIsImdldEN1c3RvbWVyIiwiY3VzdG9tZXJJZCIsImdldEF3Yk92ZXJ2aWV3IiwiY3VzdG9tZXJzIiwiaSIsImZvcm1hdCIsImNvbnNpZ25lZSIsIm5hbWUiLCJkZXRhaWxzIiwicG1iIiwiY2F0Y2giLCJnZXREb2MiLCJnZXRBd2JEZXRhaWxzIiwidHJhY2tpbmdOdW1iZXIiLCJsb2NhdGlvbl9pZCIsInBhY2thZ2VSZXN1bHQiLCJuZXdQYWNrYWdlIiwiYm94U2l6ZSIsImF3YkluZm8iLCJpc1NlZCIsImludm9pY2VOdW1iZXIiLCJoYXptYXQiLCJzYXZlQXdiIiwiY1BhY2thZ2UiLCJhd2JSZXN1bHQiLCJpc0NvbnNvbGlkYXRlZCIsInNhdmVQYWNrYWdlVG9Bd2IiLCJwa2dCYXRjaCIsInNhZGQiLCJwa2dSZXN1bHQiLCJwa2ciLCJobWdldCIsImdldFBhY2thZ2VJZEZyb21CYXJDb2RlIiwidG90YWxXZWlnaHQiLCJpc05hTiIsImJvZHkiLCJyZXBsYWNlIiwidHJpbSIsInRyYWNraW5nIiwicmVzcG9uc2UiLCJpbmRleFBhY2thZ2UiLCJkb2NSZXN1bHQiLCJwYWdlIiwicGFnZVNpemUiLCJiYXJjb2RlIiwicGtnSWQiLCJnZXRBd2IiLCJhd2JpbmZvIiwicGFja2FnZSIsIm1zZWFyY2giLCJvbGREb2NJZCIsImRvY0lkIiwidXBkYXRlZFBhY2thZ2VzIiwicGFja2FnZUlkIiwibWFuaWZlc3QiLCJtYW5pZmVzdEtleSIsImRlbCIsImRlY3IiLCJnZXRLZXlzIiwia2V5c0NvdW50Iiwia1Jlc3VsdCIsInNyZW0iLCJyUmVzdWx0IiwiZGVsZXRlZCIsImJpbiIsInNlYXJjaGVyIiwiYWN0aW9uIiwicGFja2FnZU5vIiwiY29tcGFydG1lbnQiLCJhZGRlZCIsImdldEZsaWdodENvbXBhcnRtZW50V2VpZ2h0IiwiZnJlc3VsdCIsImFnZ3JlZ2F0ZSIsInJlbW92ZWQiLCJzaGlwbWVudElkIiwic2hpcG1lbnRDb3VudCIsInNjYXJkIiwiY2FyZCIsInBrZ0NvdW50IiwicGtnSWZubyIsInB1Ymxpc2giLCJnZXRQYWNrYWdlQnlJZCIsInJlZkxvYyIsIndsb2MiLCJub2RvY3MiLCJlcnJSZXNwIiwic2VudCIsInVwZGF0ZVJlc3VsdCIsInVwZGF0ZWQiLCJiYXJDb2RlVmFsdWUiLCJwYXJ0cyIsInNwbGl0Il0sIm1hcHBpbmdzIjoiOzs7Ozs7Ozs7QUFBQTs7QUFDQTs7Ozs7O0FBR0EsSUFBSUEsUUFBUUMsUUFBUSxPQUFSLENBQVo7QUFDQSxJQUFJQyxTQUFTRCxRQUFRLGVBQVIsQ0FBYjtBQUNBLElBQUlFLFNBQVNGLFFBQVEsUUFBUixDQUFiO0FBQ0EsSUFBSUcsY0FBY0gsUUFBUSxxQkFBUixDQUFsQjtBQUNBLElBQUlJLEtBQUtKLFFBQVEsSUFBUixDQUFUO0FBQ0EsSUFBSUUsU0FBU0YsUUFBUSxRQUFSLENBQWI7QUFDQSxJQUFJSyxjQUFjTCxRQUFRLHFCQUFSLEVBQStCTSxjQUFqRDtBQUNBLElBQUlDLGNBQWMsSUFBSUYsV0FBSixFQUFsQjtBQUNBLElBQU1HLFVBQVUsZ0JBQWhCO0FBQ0EsSUFBTUMsaUJBQWlCLFlBQXZCO0FBQ0EsSUFB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OEMsY0FBSTlCLFFBQUosQ0FBYVcsTUFBYixDQUFvQjJFLEtBQXBCLEVBQTBCZixJQUFJNUMsR0FBOUIsRUFBa0MsVUFBQ3ZDLEdBQUQsRUFBSzRJLFlBQUwsRUFBb0I7QUFDcEQsZ0JBQUc1SSxHQUFILEVBQ0VULE9BQU8sRUFBQ3NKLFNBQVEsS0FBVCxFQUFQO0FBQ0Z2SixvQkFBUSxFQUFDdUosU0FBUSxJQUFULEVBQVI7QUFDRCxXQUpEO0FBS0gsU0FSRDtBQVNGLE9BWk0sQ0FBUDtBQWFEO0FBQ0Q7Ozs7Ozs7QUFHSCxTQUFTeEQsdUJBQVQsQ0FBaUN5RCxZQUFqQyxFQUE4QztBQUM1QyxNQUFJQyxRQUFRRCxhQUFhRSxLQUFiLENBQW1CLEdBQW5CLENBQVo7QUFDQSxNQUFJRCxNQUFNbEcsTUFBTixJQUFnQixDQUFwQixFQUNFLElBQUksT0FBT2tHLE1BQU0sQ0FBTixDQUFQLElBQW1CLFdBQXZCLEVBQ0EsT0FBT0EsTUFBTSxDQUFOLEVBQVNyRCxJQUFULEVBQVA7QUFDRixTQUFPLEVBQVA7QUFDRCIsImZpbGUiOiJSZWRpc1NlcnZpY2VzL1BhY2thZ2VTZXJ2aWNlLmpzIiwic291cmNlc0NvbnRlbnQiOlsiaW1wb3J0IHsgY3B1cyB9IGZyb20gXCJvc1wiO1xuaW1wb3J0IHsgcHJvbWlzZXMgfSBmcm9tIFwiZG5zXCI7XG5cblxudmFyIHJlZGlzID0gcmVxdWlyZShcInJlZGlzXCIpO1xudmFyIGxyZWRpcyA9IHJlcXVpcmUoXCIuL3JlZGlzLWxvY2FsXCIpO1xudmFyIG1vbWVudCA9IHJlcXVpcmUoXCJtb21lbnRcIik7XG52YXIgcmVkaXNTZWFyY2ggPSByZXF1aXJlKFwiLi4vcmVkaXNlYXJjaGNsaWVudFwiKTtcbnZhciBmcyA9IHJlcXVpcmUoXCJmc1wiKTtcbnZhciBtb21lbnQgPSByZXF1aXJlKCdtb21lbnQnKVxudmFyIFBhY2thZ2VVdGlsID0gcmVxdWlyZShcIi4uL1V0aWwvcGFja2FnZXV0aWxcIikuUGFja2FnZVV0aWxpdHk7XG52YXIgcGFja2FnZVV0aWwgPSBuZXcgUGFja2FnZVV0aWwoKTtcbmNvbnN0IFBLR19JRFggPSBcImluZGV4OnBhY2thZ2VzXCI7XG5jb25zdCBQS0dfSURfQ09VTlRFUiA9IFwicGFja2FnZTppZFwiO1xudmFyIGRhdGFDb250ZXh0ID0gcmVxdWlyZSgnLi9kYXRhQ29udGV4dCcpXG5jb25zdCBQS0dfUFJFRklYID0gXCJwYWNrYWdlczpcIjtcbmNvbnN0IEFXQl9JRCA9IFwiYXdiOmlkXCJcbmNvbnN0IElOREVYX0FXQiA9IFwiaW5kZXg6YXdiXCJcbmNvbnN0IFJFQ19QS0cgPSBcInBrZzpyZWM6XCJcbnZhciB1bmlxSWQgPSByZXF1aXJlKFwidW5pcWlkXCIpOyBcbnZhciBDdXN0b21lclNlcnZpY2UgPSByZXF1aXJlKCcuL0N1c3RvbWVyU2VydmljZScpLkN1c3RvbWVyU2VydmljZTsgXG52YXIgY3VzdG9tZXJTZXJ2aWNlID0gbmV3IEN1c3RvbWVyU2VydmljZSgpXG5jb25zdCBQS0dfU1RBVFVTID0geyBcbiAgMSA6IFwiUmVjZWl2ZWRcIixcbiAgMjogXCJMb2FkZWQgb24gQWlyQ3JhZnRcIixcbiAgMzogXCJJbiBUcmFuc2l0XCIsXG4gIDQ6IFwiUmVjaWV2ZWQgaW4gTkFTXCIsXG4gIDU6IFwiUmVhZHkgZm9yIFBpY2t1cCAvIERlbGl2ZXJ5XCIsXG4gIDY6IFwiRGVsaXZlcmVkXCJcblxufTsgXG5yZWRpcy5hZGRDb21tYW5kKFwiZnQuYWdncmVnYXRlXCIpXG5jb25zdCBhd2JJbmRleCA9IHJlZGlzU2VhcmNoKHJlZGlzLCBJTkRFWF9BV0IsIHtcbiAgY2xpZW50T3B0aW9uczogbHJlZGlzLnNlYXJjaENsaWVudERldGFpbHNcbn0pO1xuY29uc3QgcGFja2FnZUluZGV4ID0gcmVkaXNTZWFyY2gocmVkaXMsIFBLR19JRFgsIHtcbiAgY2xpZW50T3B0aW9uczogbHJlZGlzLnNlYXJjaENsaWVudERldGFpbHNcbn0pO1xuZnVuY3Rpb24gZ2V0UGFja2FnZVZvbHVtbmUobVBhY2thZ2Upe1xuXG4gIHJldHVybiAwOyBcbn1cbmZ1bmN0aW9uIGNyZWF0ZURvY3VtZW50KHRQYWNrYWdlKSB7XG4gIHZhciBwYWNrYWdlRG9jdW1lbnQgPSB7XG4gICAgaWQ6dFBhY2thZ2UuaWQsXG4gICAgdHJhY2tpbmdObzogdFBhY2thZ2UudHJhY2tpbmdObyxcbiAgICBza3lib3g6IHRQYWNrYWdlLnNreWJveCxcbiAgICBkYXRlUmVjaWV2ZWQgOiBtb21lbnQoKS51bml4KCksIFxuICAgIGF3YjowLCBcbiAgICBtaWQ6MCxcbiAgICB2b2x1bWU6IGdldFBhY2thZ2VWb2x1bW5lKHRQYWNrYWdlKSxcbiAgICB3ZWlnaHQ6dFBhY2thZ2Uud2VpZ2h0LFxuICAgIHBpZWNlczp0UGFja2FnZS5waWVjZXMsXG4gICAgY3VzdG9tZXI6IHRQYWNrYWdlLmN1c3RvbWVyLFxuICAgIHNoaXBwZXI6IHRQYWNrYWdlLnNoaXBwZXIsXG4gICAgZGVzY3JpcHRpb246IHRQYWNrYWdlLmRlc2NyaXB0aW9uLFxuICAgIGRpbWVuc2lvbnM6dFBhY2thZ2UuZGltZW5zaW9ucyxcbiAgICBjYXJyaWVyOnRQYWNrYWdlLmNhcnJpZXIsXG4gICAgLy9za3lib3hWOiB0UGFja2FnZS5za3lib3gsIGFkZCBkaW1lbmlvbiBcbiAgICBzdGF0dXM6IHRQYWNrYWdlLnN0YXR1cyxcbiAgICBtaWQ6IHRQYWNrYWdlLm1pZCxcbiAgICB2YWx1ZTogdFBhY2thZ2UudmFsdWUsXG4gICAgXG4gIH07XG4gIGNvbnNvbGUubG9nKFwiYWJvdXQgdG8gYWRkIHRoZSBwYWNrYWdlIHRvIHRoZSBpbmRleFwiKTtcbiAgcmV0dXJuIHBhY2thZ2VEb2N1bWVudDtcbn1cbmZ1bmN0aW9uIHNldFBhY2thZ2VJblRyYW5zaXQoa2V5cywgbXNlYXJjaGVyKSB7XG4gIHJldHVybiBuZXcgUHJvbWlzZSgocmVzb2x2ZSwgcmVqZWN0KSA9PiB7XG4gICAgdmFyIGJhdGNoZXIgPSBtc2VhcmNoZXIuY2xpZW50LmJhdGNoKCk7XG4gICAga2V5cy5mb3JFYWNoKGVsZW1lbnQgPT4ge1xuICAgICAgdmFyIHZhbHVlID0ge1xuICAgICAgICBzdGF0dXM6IDIsXG4gICAgICAgIGxvY2F0aW9uOiBcIkluIFRyYW5zaXRcIlxuICAgICAgfTtcbiAgICAgIGNvbnNvbGUubG9nKGVsZW1lbnQgKyBcImlzIHRoZSBlbGVtZW50XCIpO1xuXG4gICAgICBiYXRjaGVyLmhtc2V0KFBLR19QUkVGSVggKyBlbGVtZW50LCB2YWx1ZSk7XG4gICAgfSk7XG4gICAgYmF0Y2hlci5leGVjKChlcnIsIHJlc3VsdCkgPT4ge1xuICAgICAgY29uc29sZS5sb2cocmVzdWx0KTtcbiAgICAgIC8vcmVhZGQgdGhlIGRvY3VtZW50cyBoZXJlXG4gICAgICBrZXlzLmZvckVhY2goZWxlbWVudCA9PiB7XG4gICAgICAgIGFkZFBhY2thZ2VUb0luZGV4KGVsZW1lbnQsIG1zZWFyY2hlcik7XG4gICAgICB9KTtcbiAgICAgIHJlc29sdmUocmVzdWx0KTtcbiAgICB9KTtcbiAgfSk7XG59XG5cbmZ1bmN0aW9uIGFkZFBhY2thZ2VUb0luZGV4KHRyYWNraW5nTm8sIG1zZWFyY2hlcikge1xuICBscmVkaXMuZ2V0UGFja2FnZSh0cmFja2luZ05vKS50aGVuKHBhY2sgPT4ge1xuICAgIG1zZWFyY2hlci5kZWxEb2N1bWVudChQS0dfSURYLCBgJHtwYWNrLm1pZH0tJHt0cmFja2luZ05vfWAsIChlcnIsIGRvbmUpID0+IHtcbiAgICAgIHZhciBkb2N1bWVudCA9IGNyZWF0ZURvY3VtZW50KHBhY2spO1xuICAgICAgY29uc29sZS5sb2coXCJyZWFkZGluZyBwYWNrYWdlIHRvIHRoZSBpbmRleCBsaWtlIGEgYm9zcyBcIiArIHRyYWNraW5nTm8pO1xuICAgICAgbXNlYXJjaGVyLmFkZChwYWNrLm1pZCArIFwiLVwiICsgcGFjay50cmFja2luZ05vLCBkb2N1bWVudCk7XG4gICAgfSk7XG4gIH0pO1xufVxuZXhwb3J0IGNsYXNzIFBhY2thZ2VTZXJ2aWNlIHtcbiAgY29uc3RydWN0b3IoKSB7XG4gICAgdGhpcy5zZXR1cEluZGV4KCk7XG4gIH1cbiAgc2V0dXBJbmRleCgpIHtcbiAgICB0aGlzLm15U2VhcmNoID0gcmVkaXNTZWFyY2gocmVkaXMsIFBLR19JRFgsIHtcbiAgICAgIGNsaWVudE9wdGlvbnM6IGxyZWRpcy5zZWFyY2hDbGllbnREZXRhaWxzXG4gICAgfSk7XG4gIH1cbiAgZ2V0TmV3QXdiKCl7XG4gICAgcmV0dXJuIG5ldyBQcm9taXNlKChyZXNvbHZlLHJlamVjdCk9PntcbiAgICAgIGRhdGFDb250ZXh0LnJlZGlzQ2xpZW50LmV4aXN0cyhBV0JfSUQsKGVycixyZXN1bHQpPT57XG4gICAgICAgIGNvbnNvbGUubG9nKHJlc3VsdCk7IFxuICAgICAgICBpZiAocmVzdWx0ICE9IFwiMVwiKXtcbiAgICAgICAgICBkYXRhQ29udGV4dC5yZWRpc0NsaWVudC5zZXQoQVdCX0lEID09IDEwMDAwMCwoZXJyLGluaXRSZXN1bHQpPT57XG4gICAgICAgICAgICBkYXRhQ29udGV4dC5yZWRpc0NsaWVudC5pbmNyKEFXQl9JRCwoZXJyLG5ld0lkKT0+e1xuICAgICAgICAgICAgICByZXNvbHZlKHthd2I6bmV3SWR9KVxuICAgICAgICAgICAgfSlcbiAgICAgICAgICB9KVxuICAgICAgICB9XG4gICAgICAgIGVsc2Uge1xuICAgICAgICAgIGRhdGFDb250ZXh0LnJlZGlzQ2xpZW50LmluY3IoQVdCX0lELChlcnIsbmV3SWQpPT57XG4gICAgICAgICAgICByZXNvbHZlKHthd2I6bmV3SWR9KVxuICAgICAgICAgIH0pXG4gICAgICAgIH1cbiAgICAgIH0pXG4gICAgfSk7XG4gIH1cbiAgc2F2ZUF3Yihhd2Ipe1xuICAgIHJldHVybiBuZXcgUHJvbWlzZSgocmVzb2x2ZSxyZWplY3QpPT57XG4gICAgICBjb25zb2xlLmxvZygnc2F2aW5nLi4uJyxhd2IsbW9tZW50KCkudG9TdHJpbmcoXCJoaDptbTpzc1wiKSlcbiAgICAgIGlmIChhd2IuaWQgIT1cIlwiKXtcbiAgICAgICAgYXdiLnVwZGF0ZWRfYnkgPSBhd2IudXNlcm5hbWU7IFxuICAgICAgICBhd2IuZGF0ZV91cGRhdGVkID0gbW9tZW50KCkudW5peCgpOyBcbiAgICAgICAgYXdiSW5kZXgudXBkYXRlKGF3Yi5pZCxhd2IsKGVycjEsYXdiUmVzKT0+e1xuICAgICAgICAgIGlmIChlcnIxKXtcbiAgICAgICAgICAgIGNvbnNvbGUubG9nKCdzYXZpbmcgZXJyJyxlcnIxKVxuICAgICAgICAgICAgcmVzb2x2ZSh7c2F2ZWQ6ZmFsc2V9KVxuICAgICAgICAgIH1cbiAgICAgICAgICByZXNvbHZlKHtzYXZlZDp0cnVlLCBpZDphd2IuaWR9KVxuICAgICAgICB9KVxuICAgICAgfVxuICAgICAgZWxzZXtcbiAgICAgIGRhdGFDb250ZXh0LnJlZGlzQ2xpZW50LmluY3IoQVdCX0lELChlcnIscmVwbHkpPT57XG4gICAgICAgIGF3Yi5pZCA9IHJlcGx5OyBcbiAgICAgICAgYXdiLnN0YXR1cyA9IDE7IFxuICAgICAgICBpZiAoYXdiLmludm9pY2Upe1xuICAgICAgICAgIGF3Yi5oYXNEb2NzID0gMVxuICAgICAgICAgIGNvbnNvbGUubG9nKFwiSEFTIERPQ0NDQ0NcIilcbiAgICAgICAgfVxuICAgICAgICBlbHNlIHtcbiAgICAgICAgICBhd2IuaGFzRG9jcyA9IDAgOyBcbiAgICAgICAgICBjb25zb2xlLmxvZyhcIkhBUyBOTyBET0NDQ0NDXCIpXG4gICAgICAgIH1cblxuICAgICAgICBhd2IuY3JlYXRlZF9ieSA9IGF3Yi51c2VybmFtZTsgXG4gICAgICAgIGRlbGV0ZSBhd2IudXNlcm5hbWU7XG4gICAgICAgIGF3Yi5kYXRlQ3JlYXRlZCA9IG1vbWVudCgpLnVuaXgoKTsgXG4gICAgICAgICAgYXdiSW5kZXguYWRkKGF3Yi5pZCxhd2IsKGVycjEsYXdiUmVzKT0+e1xuICAgICAgICAgICAgaWYgKGVycjEpe1xuICAgICAgICAgICAgICBjb25zb2xlLmxvZygnc2F2aW5nIGVycicsZXJyMSlcbiAgICAgICAgICAgICAgcmVzb2x2ZSh7c2F2ZWQ6ZmFsc2V9KVxuICAgICAgICAgICAgfVxuICAgICAgICAgICAgcmVzb2x2ZSh7c2F2ZWQ6dHJ1ZSwgaWQ6cmVwbHl9KVxuICAgICAgICAgIH0pXG4gICAgICB9KVxuICAgIH1cbiAgICAgIFxuICAgICAgXG4gICAgfSlcbiAgfVxuICBnZXRBd2JPdmVydmlldyhpZCl7XG4gICAgLy8gZ2V0IHRoZSBhd2IgcGFja2FnZXMgYW5kIGFkZCBldmVyeXRoaW5nIGluIFxuICAgIHJldHVybiBuZXcgUHJvbWlzZSgocmVzb2x2ZSxyZWplY3QpPT57XG4gICAgICBwYWNrYWdlSW5kZXguc2VhcmNoKGBAYXdiOlske2lkfSAke2lkfV1gLHtudW1iZXJPZlJlc3VsdHM6NTAwMCxvZmZzZXQ6MH0sKGVycixwYWNrYWdlcyk9PntcbiAgICAgICAgdmFyIHdlaWdodCA9IDAgOyBcbiAgICAgICAgdmFyIHBpZWNlcyA9IHBhY2thZ2VzLnRvdGFsUmVzdWx0czsgXG4gICAgICAgIHZhciBkZXNjcmlwdGlvbiA9IFwiXCJcbiAgICAgICAgcGFja2FnZXMucmVzdWx0cy5mb3JFYWNoKHBhY2thZ2UxID0+IHtcbiAgICAgICAgICBpZiAoZGVzY3JpcHRpb24gPT1cIlwiKVxuICAgICAgICAgICAgZGVzY3JpcHRpb24gPSBwYWNrYWdlMS5kb2MuZGVzY3JpcHRpb247IFxuICAgICAgICAgIHdlaWdodCArPSBOdW1iZXIocGFja2FnZTEuZG9jLndlaWdodClcbiAgICAgICAgfSk7XG4gICAgICAgIHZhciBkYXRhICA9IHt3ZWlnaHQ6d2VpZ2h0LGRlc2NyaXB0aW9uOmRlc2NyaXB0aW9uLHBpZWNlczpwaWVjZXN9XG4gICAgICAgIGNvbnNvbGUubG9nKGRhdGEsXCJBV0IgREVUQUlMU1wiKTsgXG4gICAgICAgIHJlc29sdmUoIGRhdGEpXG4gICAgICB9KVxuICAgIH0pXG4gICBcbiAgfVxuICBnZXRBd2JEZXRhaWxzKGlkKXtcbiAgICB2YXIgc3J2ID0gdGhpczsgXG4gICAgcmV0dXJuIG5ldyBQcm9taXNlKChyZXNvbHZlLHJlamVjdCk9PntcbiAgICAgIGNvbnNvbGUubG9nKGBAYXdiOlske2lkfSAke2lkfV1gKVxuICAgICBcbiAgICAgIHBhY2thZ2VJbmRleC5zZWFyY2goYEBhd2I6WyR7aWR9ICR7aWR9XWAse251bWJlck9mUmVzdWx0czo1MDAwLG9mZnNldDowfSwoZXJyLHBhY2thZ2VzKT0+e1xuICAgICAgICBpZiAoZXJyKVxuICAgICAgICAgY29uc29sZS5sb2coZXJyKVxuICAgICAgXG4gICAgICAgIHZhciAgcGFja2FnZWxpc3QgID0gW11cbiAgICAgICAgdmFyIGNvdW50ID0gMTsgXG4gICAgICAgIHBhY2thZ2VzLnJlc3VsdHMuZm9yRWFjaChwYWNrYWdlMSA9PiB7XG5cbiAgICAgICAgICBpZiAocGFja2FnZTEuZG9jLnRyYWNraW5nTm8ubGVuZ3RoID4gNyl7XG4gICAgICAgICAgICAvL29ubHkgZGlzcGxheSB0aGUgbGFzdCA3IFxuICAgICAgICAgICAgcGFja2FnZTEuZG9jLnRyYWNraW5nTm8gPSBwYWNrYWdlMS5kb2MudHJhY2tpbmdOby5zdWJzdHJpbmcocGFja2FnZTEuZG9jLnRyYWNraW5nTm8ubGVuZ3RoIC03KVxuICAgICAgICAgICAgXG4gICAgICAgICAgfVxuICAgICAgICAgIHBhY2thZ2UxLmRvYy5wYWNrYWdlSW5kZXggPSBjb3VudDtcbiAgICAgICAgICBjb3VudCArKzsgXG4gICAgICAgICAgcGFja2FnZWxpc3QucHVzaCggcGFja2FnZTEuZG9jKVxuICAgICAgICB9KTtcbiAgICAgICBcbiAgICAgICBcbiAgICAgICAgcmVzb2x2ZSggcGFja2FnZWxpc3QpXG4gICAgICB9KVxuICAgIH0pXG4gIH1cbiAgbGlzdE5vRG9jc0ZsbCgpe1xuICAgIHJldHVybiBuZXcgUHJvbWlzZSgocmVzb2x2ZSxyZWplY3QpPT57XG4gICAgICAgYXdiSW5kZXguc2VhcmNoKFwiQHN0YXR1czpbMSAxXSBAaGFzRG9jczpbMCAwXVwiLHtvZmZzZXQ6MCxudW1iZXJPZlJlc3VsdHM6NTAwMCxzb3J0Qnk6J2lkJ30sKGVycixhd2JzKT0+e1xuICAgICAgICAgdmFyIGF3Ykxpc3QgPSBbXTsgXG4gICAgICAgICBQcm9taXNlLmFsbChhd2JzLnJlc3VsdHMubWFwKGF3Yj0+Y3VzdG9tZXJTZXJ2aWNlLmdldEN1c3RvbWVyKGF3Yi5kb2MuY3VzdG9tZXJJZCkpKS50aGVuKGN1c3RvbWVycz0+e1xuICAgICAgICAgICBQcm9taXNlLmFsbChhd2JzLnJlc3VsdHMubWFwKGF3Yj0+dGhpcy5nZXRBd2JPdmVydmlldyhhd2IuZG9jLmlkKSkpLnRoZW4oZGV0YWlscz0+e1xuICAgICAgICAgICAgY29uc29sZS5sb2coXCJnb3QgdGhlIGN1c3RvbWVyc1wiLGN1c3RvbWVycywgYXdicylcbiAgICAgICAgICAgIGZvcih2YXIgaSA9MCA7IGkgPCBhd2JzLnJlc3VsdHMubGVuZ3RoIDsgaSsrICl7XG4gICAgICAgICAgICAgIHZhciBhd2IgPSBhd2JzLnJlc3VsdHNbaV07IFxuICAgICAgICAgICAgICBhd2IuZG9jLmRhdGVDcmVhdGVkID0gbW9tZW50LnVuaXgoYXdiLmRvYy5kYXRlQ3JlYXRlZCkuZm9ybWF0KFwiWVlZWS1NTS1ERCBoaDptbSBBXCIpXG4gICAgICAgICAgICAgIC8vd2UgbmVlZCB0byBnZXQgdGhlIGN1c3RvbWVyIFxuICAgICAgICAgICAgICBhd2IuZG9jLmNvbnNpZ25lZSA9IGN1c3RvbWVyc1tpXS5uYW1lOyBcbiAgICAgICAgICAgICAgYXdiLmRvYy53ZWlnaHQgPSBkZXRhaWxzW2ldLndlaWdodDsgXG4gICAgICAgICAgICAgIGF3Yi5kb2MucG1iID0gY3VzdG9tZXJzW2ldLnBtYjsgXG4gICAgICAgICAgICAgIGF3Yi5kb2MuZGVzY3JpcHRpb24gPSBkZXRhaWxzW2ldLmRlc2NyaXB0aW9uOyBcbiAgICAgICAgICAgICAgYXdiLmRvYy5waWVjZXMgPSBkZXRhaWxzW2ldLnBpZWNlczsgXG4gICAgICAgICAgICAgIGlmIChjdXN0b21lcnNbaV0ucG1iID09ICcnKXtcbiAgICAgICAgICAgICAgICBhd2IuZG9jLnBtYiA9ICc5MDAwJ1xuICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgIGNvbnNvbGUubG9nKCdwdXNoaW5nICcsYXdiKVxuICAgICAgICAgICAgICAvL3dlIG5lZWQgdG8gZ2V0IGFsbCB0aGUgcGFja2FnZXMgXG4gICAgICAgICAgICAgIGF3Ykxpc3QucHVzaChhd2IuZG9jKVxuICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICByZXNvbHZlKHthd2JzOmF3Ykxpc3R9KVxuICAgICAgICAgICB9KVxuICAgICAgICAgIFxuICAgICAgICAgIH0pLmNhdGNoKGVycj0+e1xuICAgICAgICAgICAgY29uc29sZS5sb2coZXJyKTsgXG4gICAgICAgICAgfSlcbiAgICAgICAgIFxuICAgICAgICAvLyAgYXdicy5yZXN1bHRzLmZvckVhY2goYXdiID0+IHtcbiAgICAgICAgICAgXG4gICAgICAgICAgXG4gICAgICAgIC8vICB9KTtcbiAgICAgICAgIFxuICAgICAgIH0pXG4gICAgfSlcbiAgfVxuXG4gIGxpc3RBd2JpbkZsbCgpe1xuICAgIHJldHVybiBuZXcgUHJvbWlzZSgocmVzb2x2ZSxyZWplY3QpPT57XG4gICAgICAgYXdiSW5kZXguc2VhcmNoKFwiQHN0YXR1czpbMSAxXSBAaGFzRG9jczpbMSAxXVwiLHtvZmZzZXQ6MCxudW1iZXJPZlJlc3VsdHM6NTAwMCxzb3J0Qnk6J2lkJ30sKGVycixhd2JzKT0+e1xuICAgICAgICAgdmFyIGF3Ykxpc3QgPSBbXTsgXG4gICAgICAgICBQcm9taXNlLmFsbChhd2JzLnJlc3VsdHMubWFwKGF3Yj0+Y3VzdG9tZXJTZXJ2aWNlLmdldEN1c3RvbWVyKGF3Yi5kb2MuY3VzdG9tZXJJZCkpKS50aGVuKGN1c3RvbWVycz0+e1xuICAgICAgICAgICBQcm9taXNlLmFsbChhd2JzLnJlc3VsdHMubWFwKGF3Yj0+dGhpcy5nZXRBd2JPdmVydmlldyhhd2IuZG9jLmlkKSkpLnRoZW4oZGV0YWlscz0+e1xuICAgICAgICAgICAgY29uc29sZS5sb2coXCJnb3QgdGhlIGN1c3RvbWVyc1wiLGN1c3RvbWVycywgYXdicylcbiAgICAgICAgICAgIGZvcih2YXIgaSA9MCA7IGkgPCBhd2JzLnJlc3VsdHMubGVuZ3RoIDsgaSsrICl7XG4gICAgICAgICAgICAgIHZhciBhd2IgPSBhd2JzLnJlc3VsdHNbaV07IFxuICAgICAgICAgICAgICBhd2IuZG9jLmRhdGVDcmVhdGVkID0gbW9tZW50LnVuaXgoYXdiLmRvYy5kYXRlQ3JlYXRlZCkuZm9ybWF0KFwiWVlZWS1NTS1ERCBoaDptbSBBXCIpXG4gICAgICAgICAgICAgIC8vd2UgbmVlZCB0byBnZXQgdGhlIGN1c3RvbWVyIFxuICAgICAgICAgICAgICBhd2IuZG9jLmNvbnNpZ25lZSA9IGN1c3RvbWVyc1tpXS5uYW1lOyBcbiAgICAgICAgICAgICAgYXdiLmRvYy5wbWIgPSBjdXN0b21lcnNbaV0ucG1iOyBcbiAgICAgICAgICAgICAgYXdiLmRvYy53ZWlnaHQgPSBkZXRhaWxzW2ldLndlaWdodDsgXG4gICAgICAgICAgICAgIGF3Yi5kb2MuZGVzY3JpcHRpb24gPSBkZXRhaWxzW2ldLmRlc2NyaXB0aW9uOyBcbiAgICAgICAgICAgICAgYXdiLmRvYy5waWVjZXMgPSBkZXRhaWxzW2ldLnBpZWNlczsgXG4gICAgICAgICAgICAgIGlmIChjdXN0b21lcnNbaV0ucG1iID09ICcnKXtcbiAgICAgICAgICAgICAgICBhd2IuZG9jLnBtYiA9ICc5MDAwJ1xuICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgIGNvbnNvbGUubG9nKCdwdXNoaW5nICcsYXdiKVxuICAgICAgICAgICAgICAvL3dlIG5lZWQgdG8gZ2V0IGFsbCB0aGUgcGFja2FnZXMgXG4gICAgICAgICAgICAgIGF3Ykxpc3QucHVzaChhd2IuZG9jKVxuICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICByZXNvbHZlKHthd2JzOmF3Ykxpc3R9KVxuICAgICAgICAgICB9KVxuICAgICAgICAgIFxuICAgICAgICAgIH0pLmNhdGNoKGVycj0+e1xuICAgICAgICAgICAgY29uc29sZS5sb2coZXJyKTsgXG4gICAgICAgICAgfSlcbiAgICAgICAgIFxuICAgICAgICAvLyAgYXdicy5yZXN1bHRzLmZvckVhY2goYXdiID0+IHtcbiAgICAgICAgICAgXG4gICAgICAgICAgXG4gICAgICAgIC8vICB9KTtcbiAgICAgICAgIFxuICAgICAgIH0pXG4gICAgfSlcbiAgfVxuICBnZXRBd2IoaWQpe1xuICAgIGNvbnN0IHNydiA9IHRoaXM7IFxuICAgIHJldHVybiBuZXcgUHJvbWlzZSgocmVzb2x2ZSxyZWplY3QpPT57XG4gICAgICBhd2JJbmRleC5nZXREb2MoaWQsKGVycixhd2IpPT57XG4gICAgICAgIC8vZ2V0IHRoZSBjdXN0b21lciBcbiAgICAgICAgY3VzdG9tZXJTZXJ2aWNlLmdldEN1c3RvbWVyKGF3Yi5kb2MuY3VzdG9tZXJJZCkudGhlbihjdXN0b21lcj0+e1xuICAgICAgICAgIGF3Yi5kb2MuY3VzdG9tZXIgPSBjdXN0b21lcjsgXG4gICAgICAgICAgc3J2LmdldEF3YkRldGFpbHMoaWQpLnRoZW4ocGFja2FnZXM9PntcbiAgICAgICAgICAgIC8vZ2V0IHRoZSBwYWNrYWdlcyBmb3IgdGhlIGF3YiBcbiAgICAgICAgICAgIGF3Yi5kb2MucGFja2FnZXMgPSBwYWNrYWdlczsgXG4gICAgICAgICAgICByZXNvbHZlKHthd2I6YXdiLmRvY30pICBcbiAgICAgICAgICB9KVxuICAgICAgICAgIFxuICAgICAgICB9KVxuICAgICAgICBcbiAgICAgIH0pXG4gICAgfSlcbiAgfVxuICB1cGRhdGVMb2NhdGlvbih0cmFja2luZ051bWJlcixsb2NhdGlvbl9pZCl7XG4gICAgcmV0dXJuIG5ldyBQcm9taXNlKChyZXNvbHZlLHJlamVjdCk9PntcbiAgICAgIHBhY2thZ2VJbmRleC5zZWFyY2goXCJAdHJhY2tpbmdObzpcIit0cmFja2luZ051bWJlcix7bG9jYXRpb246bG9jYXRpb25faWR9LChlcnIscGFja2FnZVJlc3VsdCk9PntcblxuICAgICAgfSlcbiAgICB9KVxuICB9XG4gIHNhdmVQYWNrYWdlVG9Bd2IobmV3UGFja2FnZSl7XG4gICAgcmV0dXJuIG5ldyBQcm9taXNlKChyZXNvbHZlLHJlc3VsdCk9PntcbiAgICAgIGlmIChuZXdQYWNrYWdlLmlkICE9XCIwXCIpe1xuICAgICAgICBwYWNrYWdlSW5kZXgudXBkYXRlKG5ld1BhY2thZ2UuaWQsbmV3UGFja2FnZSwoZXJyLHJlc3VsdCk9PntcbiAgICAgICAgICBpZiAoZXJyKVxuICAgICAgICAgICAgY29uc29sZS5sb2coZXJyKTsgXG4gICAgICAgICAgcmVzb2x2ZSh7c2F2ZWQ6dHJ1ZSxpZDpuZXdQYWNrYWdlLmlkfSlcbiAgICAgICAgfSlcbiAgICAgIH1cbiAgICAgIGVsc2Uge1xuICAgICAgICBkYXRhQ29udGV4dC5yZWRpc0NsaWVudC5pbmNyKFBLR19JRF9DT1VOVEVSLChlcnIsaWQpPT57XG4gICAgICAgICAgbmV3UGFja2FnZS5pZCA9IGlkOyBcbiAgICAgICAgICBwYWNrYWdlSW5kZXguYWRkKGlkLG5ld1BhY2thZ2UsKGVycixyZXN1bHQpPT57XG4gICAgICAgICAgICBpZiAoZXJyKVxuICAgICAgICAgICAgICBjb25zb2xlLmxvZyhlcnIpOyBcbiAgICAgICAgICAgIHJlc29sdmUoe3NhdmVkOnRydWUsaWQ6aWR9KVxuICAgICAgICAgIH0pXG4gICAgICAgIH0pXG4gICAgICB9XG4gICBcbiAgICB9KVxuICB9XG4gIGNyZWF0ZUNvbnNvbGF0ZWQocGFja2FnZXMsdXNlcm5hbWUsYm94U2l6ZSl7XG4gICAgdmFyIHNydiA9IHRoaXM7IFxuICAgIHJldHVybiBuZXcgUHJvbWlzZSgocmVzb2x2ZSxyZWplY3QpPT57XG4gICAgICB2YXIgYXdiSW5mbyA9IHsgXG4gICAgICAgIGlkOiBcIlwiLFxuICAgICAgICBpc1NlZDowLFxuICAgICAgICBoYXNEb2NzOiBcIjBcIixcbiAgICAgICAgaW52b2ljZU51bWJlcjpcIlwiLFxuICAgICAgICB2YWx1ZTpcIjBcIixcbiAgICAgICAgY3VzdG9tZXJJZDoyNDE5NyxcbiAgICAgICAgc2hpcHBlcjpcIjQ4MlwiLCAvLyB3ZSBzaG91bGQgZ2V0IGFuIGlkIGhlcmUgXG4gICAgICAgIGNhcnJpZXI6XCJVU1BTXCIsXG4gICAgICAgIGhhem1hdDpcIlwiLFxuICAgICAgICB1c2VybmFtZTogIHVzZXJuYW1lXG4gICAgICAgXG4gICAgfTtcbiAgICBzcnYuc2F2ZUF3Yihhd2JJbmZvKS50aGVuKGF3YlJlc3VsdD0+e1xuICAgICAgIC8vYWRkIFxuICAgICAgICAgIHZhciBjUGFja2FnZSA9IHtcbiAgICAgICAgICAgIGlkOjAsXG4gICAgICAgICAgICB0cmFja2luZ05vOiB1bmlxSWQoKSxcbiAgICAgICAgICAgIGRlc2NyaXB0aW9uOiBcIkNvbnNvbGlkYXRlZCBQYWNrYWdlXCIsXG4gICAgICAgICAgICB3ZWlnaHQ6MCwgXG4gICAgICAgICAgICBkaW1lbnNpb25zOiAgYCR7Ym94U2l6ZX14JHtib3hTaXplfXgke2JveFNpemV9YCxcbiAgICAgICAgICAgIGF3Yjphd2JSZXN1bHQuaWQsIFxuICAgICAgICAgICAgaXNDb25zb2xpZGF0ZWQ6IFwiMVwiLCBcbiAgICAgICAgICAgIGNyZWF0ZWRfYnk6IHVzZXJuYW1lLCBcbiAgICAgICAgICBcbiAgICAgICAgfTsgXG4gICAgICAgIHNydi5zYXZlUGFja2FnZVRvQXdiKGNQYWNrYWdlKS50aGVuKHBrZ1Jlc3VsdD0+e1xuICAgICAgICAgIC8vIGdldCB0aGUgaWQgXG4gICAgICAgICAgLy9cbiAgICAgICAgICB2YXIgYmF0Y2ggPSBkYXRhQ29udGV4dC5yZWRpc0NsaWVudC5iYXRjaCgpOyBcbiAgICAgICAgICB2YXIgcGtnQmF0Y2ggPSBkYXRhQ29udGV4dC5yZWRpc0NsaWVudC5iYXRjaCgpOyBcblxuICAgICAgICAgIHBhY2thZ2VzLmZvckVhY2gocGtnID0+IHtcbiAgICAgICAgICAgIC8vdGhlc2UgYXJlIGJhcmNvZGVzIFxuICAgICAgICAgICAgYmF0Y2guc2FkZChcImNvbnNvbGlkYXRlZDpwa2c6XCIrcGtnUmVzdWx0LmlkLHBrZylcbiAgICAgICAgICAgIHBrZ0JhdGNoLmhtZ2V0KFBLR19QUkVGSVgrZ2V0UGFja2FnZUlkRnJvbUJhckNvZGUocGtnKSxcIndlaWdodFwiKVxuICAgICAgICAgIH0pO1xuICAgICAgICAgIGJhdGNoLmV4ZWMoKGVycixyZXN1bHRzKT0+e1xuICAgICAgICAgICAgLy9cbiAgICAgICAgICAgIHBrZ0JhdGNoLmV4ZWMoKGVycjEscmVzdWx0cyk9PntcbiAgICAgICAgICAgICAgdmFyIHRvdGFsV2VpZ2h0ID0gMDsgXG4gICAgICAgICAgICAgIHJlc3VsdHMuZm9yRWFjaCh3ZWlnaHQgPT4ge1xuICAgICAgICAgICAgICAgIGlmIChpc05hTihOdW1iZXIod2VpZ2h0KSkgPT0gZmFsc2UpXG4gICAgICAgICAgICAgICAgICB0b3RhbFdlaWdodCArPSBOdW1iZXIod2VpZ2h0KTtcbiAgICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICAgIC8vd2UgbmVlZCB0byB1cGRhdGUgdGhlIHRvdGFsIHdlaWdodCBvZiB0aGUgcGFja2FnZSBub3cgXG4gICAgICAgICAgICAgIHNydi5wYWNrYWdlSW5kZXgudXBkYXRlKGNQYWNrYWdlLmlkLHt3ZWlnaHQ6dG90YWxXZWlnaHR9KVxuICAgICAgICAgICAgfSlcbiAgICAgICAgICAgIFxuICAgICAgICAgICAgcmVzb2x2ZSh7c2F2ZWQ6dHJ1ZSxpZDpwa2dSZXN1bHQuaWR9KVxuICAgICAgICAgIH0pXG4gICAgICAgIH0pXG4gICAgICAgIFxuICAgIH0pXG5cbiAgIFxuICAgICAgLy92YWxpZGF0ZSB0aGUgcGFja2FnZSBcbiAgICBcblxuICAgIH0pXG4gIH1cbiAgc2F2ZVBhY2thZ2UoYm9keSl7XG4gICAgcmV0dXJuIG5ldyBQcm9taXNlKChyZXNvbHZlLHJlamVjdCk9PntcbiAgICAgIHZhciBjUGFja2FnZSA9IHtcbiAgICAgICAgXG4gICAgICAgIHNreWJveDogYm9keS5za3lib3gsXG4gICAgICAgIGN1c3RvbWVyOiBib2R5LmN1c3RvbWVyLnJlcGxhY2UoXCItXCIsIFwiXCIpLnRyaW0oKSxcbiAgICAgICAgdHJhY2tpbmdObzogYm9keS50cmFja2luZyxcbiAgICAgICAgZGVzY3JpcHRpb246IGJvZHkuZGVzY3JpcHRpb24sXG4gICAgICAgIHNoaXBwZXI6IGJvZHkuc2hpcHBlcixcbiAgICAgICAgY2Fycmllcjpib2R5LmNhcnJpZXIsXG4gICAgICAgIHZhbHVlOiBOdW1iZXIoYm9keS52YWx1ZSksXG4gICAgICAgIHBpZWNlczogTnVtYmVyKGJvZHkucGllY2VzKSxcbiAgICAgICAgd2VpZ2h0OiBOdW1iZXIoYm9keS53ZWlnaHQpLFxuICAgICAgICBkaW1lbnNpb25zOiBib2R5LmRpbWVuc2lvbnMsXG4gICAgICAgIHN0YXR1czogMSxcbiAgICAgICAgbG9jYXRpb246IFwiRkxMXCIsXG4gICAgICAgIG1pZDogMCxcbiAgICAgICAgYXdiOjAsXG4gICAgICAgIC8vaGFzT3B0OiB0cnVlLFxuICAgICAgICAvL210eXBlOiBib2R5Lm10eXBlXG4gICAgICB9O1xuICAgICAgLy92YWxpZGF0ZSB0aGUgcGFja2FnZSBcbiAgICAgIGRhdGFDb250ZXh0LnJlZGlzQ2xpZW50LmluY3IoUEtHX0lEX0NPVU5URVIsKGVycixpZCk9PntcbiAgICAgICAgY1BhY2thZ2UuaWQgPSBpZDsgXG4gICAgICAgIGRhdGFDb250ZXh0LnJlZGlzQ2xpZW50LnNldChQS0dfUFJFRklYK2lkLGNQYWNrYWdlLChlcnIscmVzcG9uc2UpPT57XG4gICAgICAgICAgaWYgKGVycil7XG4gICAgICAgICAgICByZWplY3Qoe3NhdmVkOmZhbHNlLGVycjplcnJ9KVxuICAgICAgICAgIH1cbiAgICAgICAgICAgdmFyIGluZGV4UGFja2FnZSA9ICBjcmVhdGVEb2N1bWVudChjUGFja2FnZSk7IFxuICAgICAgICAgICBjb25zb2xlLmxvZyhpbmRleFBhY2thZ2UpOyBcbiAgICAgICAgICAgcGFja2FnZUluZGV4LmFkZChjUGFja2FnZS5pZCxpbmRleFBhY2thZ2UsKGVycjEsZG9jUmVzdWx0KT0+e1xuICAgICAgICAgICAgIGNvbnNvbGUubG9nKGRvY1Jlc3VsdCk7IFxuICAgICAgICAgICAgIGlmKGVycjEpe1xuICAgICAgICAgICAgICAgcmVqZWN0KHtzYXZlZDpmYWxzZSxlcnI6ZXJyMX0pXG4gICAgICAgICAgICAgfVxuICAgICAgICAgICAgIHJlc29sdmUoe3NhdmVkOnRydWV9KVxuICAgICAgICAgICB9KVxuXG4gICAgICAgIH0pXG4gICAgICB9KTtcbiAgICBcblxuXG4gICAgfSlcbiAgfVxuXG4gIGdldE1hbmlmZXN0UGFja2FnZXMoKXtcbiAgICByZXR1cm4gbmV3IFByb21pc2UoKHJlc29sdmUscmVqZWN0KT0+e1xuICAgICAgXG4gICAgICB0aGlzLm15U2VhcmNoLnNlYXJjaChcbiAgICAgICAgYEBtaWQ6WzAgMF1gLFxuICAgICAgICB7IG9mZnNldDogMCwgbnVtYmVyT2ZSZXN1bHRzOiA1MDAwIH0sXG4gICAgICAgIChlcnIsIGRhdGEpID0+IHtcbiAgICAgICAgICB2YXIgcGFja2FnZXMgPSBbXTtcbiAgICAgICAgICBjb25zb2xlLmxvZyhkYXRhKTtcbiAgICAgICAgICBkYXRhLnJlc3VsdHMuZm9yRWFjaChlbGVtZW50ID0+IHtcblxuICAgICAgICAgICAgcGFja2FnZXMucHVzaChlbGVtZW50LmRvYyk7XG4gICAgICAgICAgICByZXNvbHZlKHBhY2thZ2VzKTsgICAgICAgICAgICAgICAgIFxuICAgICAgICB9KTtcbiAgICB9KTtcbiAgICB9KVxuICB9XG4gIGdldFJlY2VpdmVkUGFja2FnZXMocGFnZSxwYWdlU2l6ZSl7XG4gICAgcmV0dXJuIG5ldyBQcm9taXNlKChyZXNvbHZlLHJlamVjdCk9PntcbiAgICAgIFxuICAgICAgdGhpcy5teVNlYXJjaC5zZWFyY2goXG4gICAgICAgIGBAbWlkOlswIDBdYCxcbiAgICAgICAgeyBvZmZzZXQ6IDAsIG51bWJlck9mUmVzdWx0czogNTAwMCB9LFxuICAgICAgICAoZXJyLCBkYXRhKSA9PiB7XG4gICAgICAgICAgdmFyIHBhY2thZ2VzID0gW107XG4gICAgICAgICAgY29uc29sZS5sb2coZGF0YSk7XG4gICAgICAgICAgZGF0YS5yZXN1bHRzLmZvckVhY2goZWxlbWVudCA9PiB7XG5cbiAgICAgICAgICAgIHBhY2thZ2VzLnB1c2goZWxlbWVudC5kb2MpO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIFxuICAgICAgICB9KTtcbiAgICAgICAgcmVzb2x2ZShwYWNrYWdlcyk7IFxuICAgIH0pO1xuICAgIH0pXG4gIH1cbiAgZ2V0Tm9Eb2NzUGFja2Fja2FnZXMocGFnZSxwYWdlU2l6ZSl7XG4gICAgcmV0dXJuIG5ldyBQcm9taXNlKChyZXNvbHZlLHJlamVjdCk9PntcbiAgICAgIFxuICAgICAgdGhpcy5teVNlYXJjaC5zZWFyY2goXG4gICAgICAgIGBAaGFzRG9jczpbMCAwXWAsXG4gICAgICAgIHsgb2Zmc2V0OiAwLCBudW1iZXJPZlJlc3VsdHM6IDUwMDAgfSxcbiAgICAgICAgKGVyciwgZGF0YSkgPT4ge1xuICAgICAgICAgIHZhciBwYWNrYWdlcyA9IFtdO1xuICAgICAgICAgIGNvbnNvbGUubG9nKGRhdGEpO1xuICAgICAgICAgIGRhdGEucmVzdWx0cy5mb3JFYWNoKGVsZW1lbnQgPT4ge1xuXG4gICAgICAgICAgICBwYWNrYWdlcy5wdXNoKGVsZW1lbnQuZG9jKTtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBcbiAgICAgICAgfSk7XG4gICAgICAgIHJlc29sdmUocGFja2FnZXMpOyBcbiAgICB9KTtcbiAgICB9KVxuICB9XG4gIGdldHBhY2thZ2VieVJlZGlzSWQoaWQpe1xuICAgIHJldHVybiBuZXcgUHJvbWlzZSgocmVzb2x2ZSxyZWplY3QpPT57XG4gICAgICBwYWNrYWdlSW5kZXguZ2V0RG9jKGlkLChlcnIsZG9jdW1lbnQpPT57XG4gICAgICAgIHJlc29sdmUoZG9jdW1lbnQuZG9jKTsgXG4gICAgICB9KVxuICAgIH0pXG4gIH1cbiAgZ2V0UGFja2FnZUJ5SWQoYmFyY29kZSl7XG4gICAgdmFyIHNydiA9IHRoaXM7IFxuICAgIHZhciBwa2dJZCA9IGdldFBhY2thZ2VJZEZyb21CYXJDb2RlKGJhcmNvZGUpOyBcbiAgICByZXR1cm4gbmV3IFByb21pc2UoKHJlc29sdmUscmVqZWN0KT0+e1xuICAgICAgdGhpcy5teVNlYXJjaC5nZXREb2MocGtnSWQsKGVycixkb2N1bWVudCk9PntcbiAgICAgICAgLy9nZXQgdGhlIGF3YiBpbmZvIGhlcmUgYXMgd2VsbCBcbiAgICAgICAgc3J2LmdldEF3Yihkb2N1bWVudC5kb2MuYXdiKS50aGVuKGF3YmluZm89PntcbiAgICAgICAgICBjb25zb2xlLmxvZyhhd2JpbmZvKTsgXG4gICAgICAgICAgdmFyIHJlc3BvbnNlID0geyBcbiAgICAgICAgICAgIGF3YiA6IGF3YmluZm8uYXdiLFxuICAgICAgICAgICAgcGFja2FnZSA6IGRvY3VtZW50LmRvY1xuICAgICAgICAgIH1cbiAgICAgICAgICByZXNvbHZlKHJlc3BvbnNlKTsgXG4gICAgICAgIH0pOyBcbiAgICAgICAgXG4gICAgICB9KVxuICAgIH0pOyBcbiAgfVxuICAvL3VzaW5nIHRoaXMgXG4gIFxuXG4gIHVwZGF0ZU1hbmlmZXN0UGFja2FnZVRvSW5UcmFuc2l0KG1pZCkge1xuICAgIC8vZ2V0IGFsbCB0aGUgcGFja2FnZXNcbiAgICAvL3dlIG5lZWQgdG8gdXBkYXRlIHRoZSBpbmRleCBhdCB0aGlzIHBvaW50IGFzIHdlbGxcbiAgICB2YXIgbXNlYXJjaCA9IHRoaXMubXlTZWFyY2g7XG4gICAgdGhpcy5teVNlYXJjaC5zZWFyY2goXG4gICAgICBgQG1pZDpbJHttaWR9ICR7bWlkfV1gLFxuICAgICAgeyBvZmZzZXQ6IDAsIG51bWJlck9mUmVzdWx0czogNTAwMCB9LFxuICAgICAgKGVyciwgZGF0YSkgPT4ge1xuICAgICAgICB2YXIgcGFja2FnZXMgPSBbXTtcbiAgICAgICAgY29uc29sZS5sb2coZGF0YSk7XG4gICAgICAgIGRhdGEucmVzdWx0cy5mb3JFYWNoKGVsZW1lbnQgPT4ge1xuICAgICAgICAgIHZhciBvbGREb2NJZCA9IGVsZW1lbnQuZG9jSWQ7XG4gICAgICAgICAgZWxlbWVudC5kb2NJZCA9IGVsZW1lbnQuZG9jSWQucmVwbGFjZShgJHttaWR9LWAsIFwiXCIpO1xuICAgICAgICAgIHBhY2thZ2VzLnB1c2goZWxlbWVudC5kb2NJZCk7XG4gICAgICAgICAgLy8gaSBjb3VsZCBkZWxldGUgaGVyZVxuICAgICAgICAgIC8vIG1zZWFyY2guZGVsRG9jdW1lbnQoUEtHX0lEWCxvbGREb2NJZClcbiAgICAgICAgICAvL3VwZGF0ZSBhbGwgdGhlIHBhY2thZ2VzXG4gICAgICAgIH0pO1xuICAgICAgICBzZXRQYWNrYWdlSW5UcmFuc2l0KHBhY2thZ2VzLCBtc2VhcmNoLCBtaWQpLnRoZW4oZnVuY3Rpb24oXG4gICAgICAgICAgdXBkYXRlZFBhY2thZ2VzXG4gICAgICAgICkge1xuICAgICAgICAgIGNvbnNvbGUubG9nKFwidXBkYXRlZCBwYWNrYWdlc1wiKTtcbiAgICAgICAgICBjb25zb2xlLmxvZyh1cGRhdGVkUGFja2FnZXMpO1xuICAgICAgICB9KTtcbiAgICAgIH1cbiAgICApO1xuICB9XG4gIHJlbW92ZVBhY2thZ2VGcm9tTWFuaWZlc3QocGFja2FnZUlkLCBtaWQpIHtcbiAgICB2YXIgbXNlYXJjaCA9IHRoaXMubXlTZWFyY2g7XG4gICAgcmV0dXJuIG5ldyBQcm9taXNlKChyZXNvbHZlLCByZWplY3QpID0+IHtcbiAgICAgIHZhciBtYW5pZmVzdCA9IG1pZDtcbiAgICAgIHZhciBtYW5pZmVzdEtleSA9IFwibWFuaWZlc3Q6XCIgKyBtYW5pZmVzdCArIFwiOipcIjtcblxuICAgICAgbHJlZGlzLmRlbChcInBhY2thZ2VzOlwiICsgdHJhY2tpbmdObykudGhlbihmdW5jdGlvbihyZXN1bHQpIHtcbiAgICAgICAgY29uc29sZS5sb2cocmVzdWx0KTtcbiAgICAgICAgbXNlYXJjaC5kZWxEb2N1bWVudChQS0dfSURYLCBgJHttaWR9LSR7dHJhY2tpbmdOb31gKTtcbiAgICAgICAgLy93ZSBuZWVkIHRvIHJlbW92ZSBmcm9tIHRoZSBpbmRleCBhbmQgZGVjIHRoZSBjb3VudGVyXG4gICAgICAgIGxyZWRpcy5jbGllbnQuZGVjcihcIm1jb3VudGVyOlwiICsgbWlkKTtcbiAgICAgICAgLy9yU2VydmljZXMucGFja2FnZVNlcnZpY2Uucm1QYWNrYWdlKG1pZCwgdHJhY2tpbmdObyk7XG4gICAgICAgIGxyZWRpcy5nZXRLZXlzKG1hbmlmZXN0S2V5KS50aGVuKGtSZXN1bHQgPT4ge1xuICAgICAgICAgIC8vdGhlIGxpc3Qgb2YgYWxsIHRoZSBzZXRzIC4uLndlIG5lZWQgdG8gcmVtb3ZlIHRoZSBrZXkgZnJvbSBlYWNoIG9uZVxuICAgICAgICAgIHZhciBrZXlzQ291bnQgPSAwO1xuXG4gICAgICAgICAga1Jlc3VsdC5mb3JFYWNoKGVsZW1lbnQgPT4ge1xuICAgICAgICAgICAgY29uc29sZS5sb2coXG4gICAgICAgICAgICAgIGByZW1vdmluZyAke3RyYWNraW5nTm99IHBhY2thZ2UgbWFuaWZlc3Qgc2V0ICR7ZWxlbWVudH0gYFxuICAgICAgICAgICAgKTtcbiAgICAgICAgICAgIGxyZWRpcy5zcmVtKGVsZW1lbnQsIHRyYWNraW5nTm8pLnRoZW4oZnVuY3Rpb24oclJlc3VsdCkge1xuICAgICAgICAgICAgICBjb25zb2xlLmxvZyhyUmVzdWx0KTtcbiAgICAgICAgICAgICAgY29uc29sZS5sb2coXCJyZW1vdmVkXCIpO1xuICAgICAgICAgICAgICBpZiAoa2V5c0NvdW50ID09IGtSZXN1bHQubGVuZ3RoIC0gMSkga2V5c0NvdW50Kys7XG4gICAgICAgICAgICB9KTtcbiAgICAgICAgICB9KTtcbiAgICAgICAgICByZXNvbHZlKHtcbiAgICAgICAgICAgIGRlbGV0ZWQ6IHRydWVcbiAgICAgICAgICB9KTtcbiAgICAgICAgfSk7XG5cbiAgICAgICAgLy93ZSBhbHNvIG5lZWQgdG8gcmVtb3ZlIGZyb20gYW55IHNldHNcbiAgICAgIH0pO1xuICAgIH0pO1xuICB9XG4gIHJlbW92ZVBhY2thZ2VCeUlkKGlkKSB7XG4gICAgdmFyIG1zZWFyY2ggPSB0aGlzLm15U2VhcmNoO1xuICAgIHJldHVybiBuZXcgUHJvbWlzZSgocmVzb2x2ZSwgcmVqZWN0KSA9PiB7XG4gICAgICBcbiAgICAgIHBhY2thZ2VJbmRleC5kZWxEb2N1bWVudChQS0dfSURYLGlkLChlcnIscmVzcG9uc2UpPT57XG4gICAgICAgIGlmIChlcnIpXG4gICAgICAgICAgY29uc29sZS5sb2coZXJyKTsgXG4gICAgICAgIGNvbnNvbGUubG9nKHJlc3BvbnNlKTsgXG4gICAgICAgIHJlc29sdmUoe2RlbGV0ZWQ6dHJ1ZX0pXG4gICAgICB9KVxuICAgICAgXG4gICAgICAgIFxuICAgICAgXG4gICAgfSk7XG4gIH1cbiAgc3RvcmVQYWNrYWdlRm9yUGlja3VwKHRyYWNraW5nTm8sYmluKXtcbiAgICB2YXIgc2VhcmNoZXIgPSB0aGlzLm15U2VhcmNoO1xuICAgIHJldHVybiBuZXcgUHJvbWlzZSgocmVzb2x2ZSxyZWplY3QpPT57XG4gICAgICAgbHJlZGlzLmhtc2V0KFBLR19QUkVGSVgrdHJhY2tpbmdObyx7c3RhdHVzOjQsbG9jYXRpb246YmlufSkudGhlbigocmVzdWx0KT0+e1xuICAgICAgICAgbHJlZGlzLmdldFBhY2thZ2UodHJhY2tpbmdObykudGhlbigocGtnKT0+e1xuICAgICAgICAgIGFkZFBhY2thZ2VUb0luZGV4KHRyYWNraW5nTm8sc2VhcmNoZXIpIDsgXG4gICAgICAgICAgcmVzb2x2ZShwa2cpOyAgIFxuICAgICAgICAgfSk7XG4gICAgICAgfSkgXG4gICAgfSk7IFxuICB9XG4gIHVwZGF0ZVBhY2thZ2VJbmRleCh0cmFja2luZyl7XG4gICAgICByZXR1cm4gbmV3IFByb21pc2UoKHJlc29sdmUscmVqZWN0KT0+e1xuICAgICAgICAgIHZhciBtc2VhcmNoID0gdGhpcy5teVNlYXJjaDsgXG4gICAgICAgICAgYWRkUGFja2FnZVRvSW5kZXgodHJhY2tpbmcsbXNlYXJjaCk7IFxuICAgICAgICAgcmVzb2x2ZSh7J3VwZGF0ZWQnOnRydWV9KTtcbiAgICAgIH0pXG4gIH1cbiAgZ2V0Q3VzdG9tZXJQYWNrYWdlcyhza3lib3gpIHt9XG4gIGdldE1hbmlmZXN0UGFja2FnZXNCeVN0YXR1cyhtaWQsc3RhdHVzKSB7XG4gICAgICByZXR1cm4gbmV3IFByb21pc2UoKHJlc29sdmUscmVqZWN0KT0+e1xuICAgICAgICAgIGNvbnNvbGUubG9nKGBAbWlkOlske21pZH0gJHttaWR9XWApXG4gICAgICAgIHRoaXMubXlTZWFyY2guc2VhcmNoKFxuICAgICAgICAgICAgYEBtaWQ6WyR7bWlkfSAke21pZH1dYCxcbiAgICAgICAgICAgIHsgb2Zmc2V0OiAwLCBudW1iZXJPZlJlc3VsdHM6IDUwMDAgfSxcbiAgICAgICAgICAgIChlcnIsIGRhdGEpID0+IHtcbiAgICAgICAgICAgICAgdmFyIHBhY2thZ2VzID0gW107XG4gICAgICAgICAgICAgIGNvbnNvbGUubG9nKGRhdGEpO1xuICAgICAgICAgICAgICBkYXRhLnJlc3VsdHMuZm9yRWFjaChlbGVtZW50ID0+IHtcblxuICAgICAgICAgICAgICAgIHBhY2thZ2VzLnB1c2goZWxlbWVudC5kb2MpO1xuICAgICAgICAgICAgICAgIHJlc29sdmUocGFja2FnZXMpOyAgICAgICAgICAgICAgICAgXG4gICAgICAgICAgICB9KTtcbiAgICAgICAgfSk7XG4gICAgICB9KTtcbiAgXG4gIH0gICBcbiAgXG4gIFxuXG4gICAvLyNyZWdpb24gTWFuaWZlc3QgUGFja2FnZSBGdW5jdGlvbnMgXG5cbiAgIGFkZFRvRmxpZ2h0KGFjdGlvbil7XG4gICAgIHZhciBzcnYgPSB0aGlzOyBcbiAgICByZXR1cm4gbmV3IFByb21pc2UoKHJlc29sdmUscmVqZWN0KT0+e1xuICAgICAgdmFyIHBhY2thZ2VObyA9IGdldFBhY2thZ2VJZEZyb21CYXJDb2RlKGFjdGlvbi5iYXJjb2RlKTsgXG4gICAgICBjb25zb2xlLmxvZyhhY3Rpb24pOyBcbiAgICAgIHRoaXMubXlTZWFyY2gudXBkYXRlKHBhY2thZ2VObyx7bWlkOmFjdGlvbi5taWQgLCBzdGF0dXM6IDIsIGxvY2F0aW9uOlwiTG9hZGVkIG9uIEFpckNyYWZ0XCIsY29tcGFydG1lbnQ6YWN0aW9uLmNvbXBhcnRtZW50fSwoZXJyLHJlc3VsdCk9PntcbiAgICAgICAgaWYoZXJyKVxuICAgICAgICAgIHJlc29sdmUoe2FkZGVkOmZhbHNlfSlcbiAgICAgICAgc3J2LmdldEZsaWdodENvbXBhcnRtZW50V2VpZ2h0KGFjdGlvbi5taWQsYWN0aW9uLmNvbXBhcnRtZW50KS50aGVuKGZyZXN1bHQ9PntcbiAgICAgICAgICBmcmVzdWx0LmFkZGVkID0gdHJ1ZTsgXG4gICAgICAgICAgcmVzb2x2ZShmcmVzdWx0KVxuICAgICAgICB9KVxuICAgICAgIFxuICAgICAgfSlcbiAgICAgICAgXG4gICAgfSlcbiAgIH1cbiAgIC8vZ2V0IHRoZSBjb21wYXJ0bWVudCB3ZWlnaHQgXG4gICBnZXRGbGlnaHRDb21wYXJ0bWVudFdlaWdodChtaWQsY29tcGFydG1lbnQpe1xuICAgICByZXR1cm4gbmV3IFByb21pc2UoKHJlc29sdmUscmVqZWN0KT0+e1xuICAgICAgXG4gICAgICB0aGlzLm15U2VhcmNoLmFnZ3JlZ2F0ZShgQG1pZDpbJHttaWR9ICR7bWlkfV0gQGNvbXBhcnRtZW50OiR7Y29tcGFydG1lbnR9YCwge30sKGVycixyZXBseSk9PntcbiAgICAgICAgIGlmIChlcnIpXG4gICAgICAgICBjb25zb2xlLmxvZyhlcnIpOyBcbiAgICAgICAgIGNvbnNvbGUubG9nKHJlcGx5LFwiVE9UQUwgU0VDVElPTiBXZWlnaHRcIilcbiAgICAgICAgIGlmIChyZXBseVsxXSl7XG4gICAgICAgICAgIHZhciByZXN1bHQgPSByZXBseVsxXTtcbiAgICAgICAgICAgdmFyIGNvbXBhcnRtZW50ID0gcmVzdWx0WzNdOyBcbiAgICAgICAgICAgdmFyIHdlaWdodCA9IHJlc3VsdFs1XTsgXG4gICAgICAgICB9XG4gICAgICAgICByZXNvbHZlKHtjb21wYXJ0bWVudDpjb21wYXJ0bWVudCx3ZWlnaHQ6d2VpZ2h0fSlcbiAgICAgICB9KVxuICAgICB9KVxuICAgfVxuICAgLy9yZW1vdmUgZnJvbSBmbGlnaHQgXG4gICByZW1vdmVGcm9tRmxpZ2h0KGFjdGlvbil7XG4gICAgcmV0dXJuIG5ldyBQcm9taXNlKChyZXNvbHZlLHJlamVjdCk9PntcbiAgICAgICAgdmFyIHBhY2thZ2VObyA9IGdldFBhY2thZ2VJZEZyb21CYXJDb2RlKGFjdGlvbi5iYXJjb2RlKTsgICBcbiAgICAgICAgdGhpcy5teVNlYXJjaC51cGRhdGUocGFja2FnZU5vLHttaWQ6YWN0aW9uLm1pZH0sKGVycixyZXN1bHQpPT57XG4gICAgICAgIGlmKGVycilcbiAgICAgICAgICAgIHJlc29sdmUoe3JlbW92ZWQ6ZmFsc2V9KVxuICAgICAgICAgIFxuICAgICAgICAgIHJlc29sdmUoe3JlbW92ZWQ6dHJ1ZX0pXG4gICAgICAgIH0pXG4gICAgfSlcbiAgIH1cbiAgIHJlY0Zyb21UcnVjayh0cmFja2luZ05vLHVzZXJuYW1lLHNoaXBtZW50SWQpe1xuICAgICByZXR1cm4gbmV3IFByb21pc2UoKHJlc29sdmUscmVqZWN0KT0+e1xuICAgICAgICBkYXRhQ29udGV4dC5yZWRpc0NsaWVudC5zYWRkKFwic2hpcG1lbnQ6aWQ6XCIrc2hpcG1lbnRJZCx0cmFja2luZ05vLChlcnIscmVwbHkpPT57XG4gICAgICAgICAgZGF0YUNvbnRleHQucmVkaXNDbGllbnQuc2V0KFJFQ19QS0crdHJhY2tpbmdObyxtb21lbnQoKS51bml4KCksIChlcnIscmVzdWx0KT0+e1xuICAgICAgICAgICAgaWYgKGVycikgcmVzb2x2ZSh7c2F2ZWQ6ZmFsc2V9KVxuICAgICAgICAgICAgLy9zaGlwbWVudCBjb3VudCBcbiAgICAgICAgICAgIHZhciBzaGlwbWVudENvdW50ID0gMTtcbiAgICAgICAgICAgIGRhdGFDb250ZXh0LnJlZGlzQ2xpZW50LnNjYXJkKFwic2hpcG1lbnQ6aWQ6XCIrc2hpcG1lbnRJZCwoZXJyLGNhcmQpPT57XG4gICAgICAgICAgICAgIHJlc29sdmUoe3NhdmVkOnRydWUscGtnQ291bnQ6Y2FyZH0pXG4gICAgICAgICAgICB9KTtcbiAgICAgICAgICAgXG4gICAgICAgICAgfSlcbiAgICAgICAgfSlcbiAgICAgICAgXG4gICAgIH0pXG4gICB9XG4gICBwcm9jc3Nlc3NQYWNrYWdlKHBrZ0lmbm8sdXNlcm5hbWUpe1xuICAgIHZhciBzcnYgPSB0aGlzOyAgXG4gICAgcmV0dXJuIG5ldyBQcm9taXNlKChyZXNvbHZlLHJlamVjdCk9PntcbiAgICAgICAvL3dlIGFsc28gbmVlZCB0byBzZXQgdGhlIHdhcmVob3VzZSBsb2NhdGlvbiBoZXJlIFxuICAgICAgIGRhdGFDb250ZXh0LnJlZGlzQ2xpZW50Lmhtc2V0KFwiZmVlczphd2I6XCIrcGtnSWZuby5hd2IscGtnSWZubywoZXJyLHJlc3VsdCk9PntcbiAgICAgICAgIGlmIChlcnIpXG4gICAgICAgICAgY29uc29sZS5sb2coZXJyKTsgXG4gICAgICAgICAgY29uc29sZS5sb2cocmVzdWx0KTsgXG4gICAgICAgICAgY29uc29sZS5sb2coXCJwcmludDpmZWVzOlwiK3VzZXJuYW1lLHVzZXJuYW1lKTsgXG4gICAgICAgICBkYXRhQ29udGV4dC5yZWRpc0NsaWVudC5wdWJsaXNoKFwicHJpbnQ6ZmVlczpcIit1c2VybmFtZSxwa2dJZm5vLmF3Yik7IFxuICAgICAgICAgIHNydi5nZXRQYWNrYWdlQnlJZChwa2dJZm5vLmJhcmNvZGUpLnRoZW4ocGtnPT57XG5cbiAgICAgICAgICAgIGlmIChwa2dJZm5vLnJlZkxvYyl7XG4gICAgICAgICAgICAgIHBrZy5wYWNrYWdlLndsb2MgPSBwa2dJZm5vLnJlZkxvYzsgXG4gICAgICAgICAgICAgIGlmIChOdW1iZXIocGtnSWZuby5ub2RvY3MpIT0gMCApXG4gICAgICAgICAgICAgICAgcGtnLnBhY2thZ2UuaGFzRG9jcyA9IDAgOyBcbiAgICAgICAgICAgICAgICBjb25zb2xlLmxvZygndXBkYXRpbmcgd2l0aCAnLHBrZy5wYWNrYWdlKVxuICAgICAgICAgICAgICBwYWNrYWdlSW5kZXgudXBkYXRlKHBrZy5wYWNrYWdlLmlkLHBrZy5wYWNrYWdlLChlcnJSZXNwLHJlc3BvbnNlKT0+e1xuICAgICAgICAgICAgICAgIGlmKGVyclJlc3ApXG4gICAgICAgICAgICAgICAgY29uc29sZS5sb2coZXJyUmVzcClcbiAgICAgICAgICAgICAgfSlcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIFxuICAgICAgICAgIH0pXG4gICAgICAgICByZXNvbHZlKHtzZW50OnRydWV9KVxuICAgICAgIH0pXG4gICAgIH0pXG4gICB9XG4gICByZWNGcm9tUGxhbmVOYXMoYmFyY29kZSl7XG4gICAgIHJldHVybiBuZXcgUHJvbWlzZSgocmVzb2x2ZSxyZWplY3QpPT57XG4gICAgICAgdmFyIHNydiA9IHRoaXMgOyBcbiAgICAgICB2YXIgcGtnSWQgPSBnZXRQYWNrYWdlSWRGcm9tQmFyQ29kZShiYXJjb2RlKTsgXG4gICAgICAgIHNydi5teVNlYXJjaC5nZXREb2MocGtnSWQsKGVycixwa2cpPT57XG4gICAgICAgICAgICBwa2cuZG9jLnN0YXR1cyA9IDQ7IFxuICAgICAgICAgICAgcGtnLmRvYy5sb2NhdGlvbiAgPSBcIldhcmVob3VzZSBOQVNcIjsgXG4gICAgICAgICAgICBzcnYubXlTZWFyY2gudXBkYXRlKHBrZ0lkLHBrZy5kb2MsKGVycix1cGRhdGVSZXN1bHQpPT57XG4gICAgICAgICAgICAgIGlmKGVycilcbiAgICAgICAgICAgICAgICByZWplY3Qoe3VwZGF0ZWQ6ZmFsc2V9KVxuICAgICAgICAgICAgICByZXNvbHZlKHt1cGRhdGVkOnRydWV9KVxuICAgICAgICAgICAgfSlcbiAgICAgICAgfSlcbiAgICAgfSlcbiAgIH1cbiAgIC8vI2VuZHJlZ2lvblxufVxuXG5mdW5jdGlvbiBnZXRQYWNrYWdlSWRGcm9tQmFyQ29kZShiYXJDb2RlVmFsdWUpe1xuICB2YXIgcGFydHMgPSBiYXJDb2RlVmFsdWUuc3BsaXQoXCItXCIpOyBcbiAgaWYgKHBhcnRzLmxlbmd0aCA9PSAzKVxuICAgIGlmICh0eXBlb2YgcGFydHNbMl0gIT0gXCJ1bmRlZmluZWRcIilcbiAgICByZXR1cm4gcGFydHNbMl0udHJpbSgpOyBcbiAgcmV0dXJuIFwiXCJcbn1cbiJdfQ==
