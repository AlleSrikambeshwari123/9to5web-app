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
              srv.packageIndex.update(pkg.package.id, pkg.package, function (errResp, response) {
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
//# sourceMappingURL=data:application/json;charset=utf8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIlJlZGlzU2VydmljZXMvUGFja2FnZVNlcnZpY2UuZXM2Il0sIm5hbWVzIjpbInJlZGlzIiwicmVxdWlyZSIsImxyZWRpcyIsIm1vbWVudCIsInJlZGlzU2VhcmNoIiwiZnMiLCJQYWNrYWdlVXRpbCIsIlBhY2thZ2VVdGlsaXR5IiwicGFja2FnZVV0aWwiLCJQS0dfSURYIiwiUEtHX0lEX0NPVU5URVIiLCJkYXRhQ29udGV4dCIsIlBLR19QUkVGSVgiLCJBV0JfSUQiLCJJTkRFWF9BV0IiLCJSRUNfUEtHIiwidW5pcUlkIiwiQ3VzdG9tZXJTZXJ2aWNlIiwiY3VzdG9tZXJTZXJ2aWNlIiwiUEtHX1NUQVRVUyIsImFkZENvbW1hbmQiLCJhd2JJbmRleCIsImNsaWVudE9wdGlvbnMiLCJzZWFyY2hDbGllbnREZXRhaWxzIiwicGFja2FnZUluZGV4IiwiZ2V0UGFja2FnZVZvbHVtbmUiLCJtUGFja2FnZSIsImNyZWF0ZURvY3VtZW50IiwidFBhY2thZ2UiLCJwYWNrYWdlRG9jdW1lbnQiLCJpZCIsInRyYWNraW5nTm8iLCJza3lib3giLCJkYXRlUmVjaWV2ZWQiLCJ1bml4IiwiYXdiIiwibWlkIiwidm9sdW1lIiwid2VpZ2h0IiwicGllY2VzIiwiY3VzdG9tZXIiLCJzaGlwcGVyIiwiZGVzY3JpcHRpb24iLCJkaW1lbnNpb25zIiwiY2FycmllciIsInN0YXR1cyIsInZhbHVlIiwiY29uc29sZSIsImxvZyIsInNldFBhY2thZ2VJblRyYW5zaXQiLCJrZXlzIiwibXNlYXJjaGVyIiwiUHJvbWlzZSIsInJlc29sdmUiLCJyZWplY3QiLCJiYXRjaGVyIiwiY2xpZW50IiwiYmF0Y2giLCJmb3JFYWNoIiwibG9jYXRpb24iLCJlbGVtZW50IiwiaG1zZXQiLCJleGVjIiwiZXJyIiwicmVzdWx0IiwiYWRkUGFja2FnZVRvSW5kZXgiLCJnZXRQYWNrYWdlIiwidGhlbiIsImRlbERvY3VtZW50IiwicGFjayIsImRvbmUiLCJkb2N1bWVudCIsImFkZCIsIlBhY2thZ2VTZXJ2aWNlIiwic2V0dXBJbmRleCIsIm15U2VhcmNoIiwicmVkaXNDbGllbnQiLCJleGlzdHMiLCJzZXQiLCJpbml0UmVzdWx0IiwiaW5jciIsIm5ld0lkIiwidG9TdHJpbmciLCJ1cGRhdGVkX2J5IiwidXNlcm5hbWUiLCJkYXRlX3VwZGF0ZWQiLCJ1cGRhdGUiLCJlcnIxIiwiYXdiUmVzIiwic2F2ZWQiLCJyZXBseSIsImludm9pY2UiLCJoYXNEb2NzIiwiY3JlYXRlZF9ieSIsImRhdGVDcmVhdGVkIiwic2VhcmNoIiwibnVtYmVyT2ZSZXN1bHRzIiwib2Zmc2V0IiwicGFja2FnZXMiLCJ0b3RhbFJlc3VsdHMiLCJyZXN1bHRzIiwicGFja2FnZTEiLCJkb2MiLCJOdW1iZXIiLCJkYXRhIiwic3J2IiwicGFja2FnZWxpc3QiLCJjb3VudCIsImxlbmd0aCIsInN1YnN0cmluZyIsInB1c2giLCJzb3J0QnkiLCJhd2JzIiwiYXdiTGlzdCIsImFsbCIsIm1hcCIsImdldEN1c3RvbWVyIiwiY3VzdG9tZXJJZCIsImdldEF3Yk92ZXJ2aWV3IiwiY3VzdG9tZXJzIiwiaSIsImZvcm1hdCIsImNvbnNpZ25lZSIsIm5hbWUiLCJkZXRhaWxzIiwicG1iIiwiY2F0Y2giLCJnZXREb2MiLCJnZXRBd2JEZXRhaWxzIiwidHJhY2tpbmdOdW1iZXIiLCJsb2NhdGlvbl9pZCIsInBhY2thZ2VSZXN1bHQiLCJuZXdQYWNrYWdlIiwiYm94U2l6ZSIsImF3YkluZm8iLCJpc1NlZCIsImludm9pY2VOdW1iZXIiLCJoYXptYXQiLCJzYXZlQXdiIiwiY1BhY2thZ2UiLCJhd2JSZXN1bHQiLCJpc0NvbnNvbGlkYXRlZCIsInNhdmVQYWNrYWdlVG9Bd2IiLCJwa2dCYXRjaCIsInNhZGQiLCJwa2dSZXN1bHQiLCJwa2ciLCJobWdldCIsImdldFBhY2thZ2VJZEZyb21CYXJDb2RlIiwidG90YWxXZWlnaHQiLCJpc05hTiIsImJvZHkiLCJyZXBsYWNlIiwidHJpbSIsInRyYWNraW5nIiwicmVzcG9uc2UiLCJpbmRleFBhY2thZ2UiLCJkb2NSZXN1bHQiLCJwYWdlIiwicGFnZVNpemUiLCJiYXJjb2RlIiwicGtnSWQiLCJnZXRBd2IiLCJhd2JpbmZvIiwicGFja2FnZSIsIm1zZWFyY2giLCJvbGREb2NJZCIsImRvY0lkIiwidXBkYXRlZFBhY2thZ2VzIiwicGFja2FnZUlkIiwibWFuaWZlc3QiLCJtYW5pZmVzdEtleSIsImRlbCIsImRlY3IiLCJnZXRLZXlzIiwia2V5c0NvdW50Iiwia1Jlc3VsdCIsInNyZW0iLCJyUmVzdWx0IiwiZGVsZXRlZCIsImJpbiIsInNlYXJjaGVyIiwiYWN0aW9uIiwicGFja2FnZU5vIiwiY29tcGFydG1lbnQiLCJhZGRlZCIsImdldEZsaWdodENvbXBhcnRtZW50V2VpZ2h0IiwiZnJlc3VsdCIsImFnZ3JlZ2F0ZSIsInJlbW92ZWQiLCJzaGlwbWVudElkIiwic2hpcG1lbnRDb3VudCIsInNjYXJkIiwiY2FyZCIsInBrZ0NvdW50IiwicGtnSWZubyIsInB1Ymxpc2giLCJnZXRQYWNrYWdlQnlJZCIsInJlZkxvYyIsIndsb2MiLCJub2RvY3MiLCJlcnJSZXNwIiwic2VudCIsInVwZGF0ZVJlc3VsdCIsInVwZGF0ZWQiLCJiYXJDb2RlVmFsdWUiLCJwYXJ0cyIsInNwbGl0Il0sIm1hcHBpbmdzIjoiOzs7Ozs7Ozs7QUFBQTs7QUFDQTs7Ozs7O0FBR0EsSUFBSUEsUUFBUUMsUUFBUSxPQUFSLENBQVo7QUFDQSxJQUFJQyxTQUFTRCxRQUFRLGVBQVIsQ0FBYjtBQUNBLElBQUlFLFNBQVNGLFFBQVEsUUFBUixDQUFiO0FBQ0EsSUFBSUcsY0FBY0gsUUFBUSxxQkFBUixDQUFsQjtBQUNBLElBQUlJLEtBQUtKLFFBQVEsSUFBUixDQUFUO0FBQ0EsSUFBSUUsU0FBU0YsUUFBUSxRQUFSLENBQWI7QUFDQSxJQUFJSyxjQUFjTCxRQUFRLHFCQUFSLEVBQStCTSxjQUFqRDtBQUNBLElBQUlDLGNBQWMsSUFBSUYsV0FBSixFQUFsQjtBQUNBLElBQU1HLFVBQVUsZ0JBQWhCO0FBQ0EsSUFBTUMsaUJBQWlCLFlBQXZCO0FBQ0EsSUFB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QW9CLGVBQXBCO0FBQ0E4QyxjQUFJOUIsUUFBSixDQUFhVyxNQUFiLENBQW9CMkUsS0FBcEIsRUFBMEJmLElBQUk1QyxHQUE5QixFQUFrQyxVQUFDdkMsR0FBRCxFQUFLNEksWUFBTCxFQUFvQjtBQUNwRCxnQkFBRzVJLEdBQUgsRUFDRVQsT0FBTyxFQUFDc0osU0FBUSxLQUFULEVBQVA7QUFDRnZKLG9CQUFRLEVBQUN1SixTQUFRLElBQVQsRUFBUjtBQUNELFdBSkQ7QUFLSCxTQVJEO0FBU0YsT0FaTSxDQUFQO0FBYUQ7QUFDRDs7Ozs7OztBQUdILFNBQVN4RCx1QkFBVCxDQUFpQ3lELFlBQWpDLEVBQThDO0FBQzVDLE1BQUlDLFFBQVFELGFBQWFFLEtBQWIsQ0FBbUIsR0FBbkIsQ0FBWjtBQUNBLE1BQUlELE1BQU1sRyxNQUFOLElBQWdCLENBQXBCLEVBQ0UsSUFBSSxPQUFPa0csTUFBTSxDQUFOLENBQVAsSUFBbUIsV0FBdkIsRUFDQSxPQUFPQSxNQUFNLENBQU4sRUFBU3JELElBQVQsRUFBUDtBQUNGLFNBQU8sRUFBUDtBQUNEIiwiZmlsZSI6IlJlZGlzU2VydmljZXMvUGFja2FnZVNlcnZpY2UuanMiLCJzb3VyY2VzQ29udGVudCI6WyJpbXBvcnQgeyBjcHVzIH0gZnJvbSBcIm9zXCI7XG5pbXBvcnQgeyBwcm9taXNlcyB9IGZyb20gXCJkbnNcIjtcblxuXG52YXIgcmVkaXMgPSByZXF1aXJlKFwicmVkaXNcIik7XG52YXIgbHJlZGlzID0gcmVxdWlyZShcIi4vcmVkaXMtbG9jYWxcIik7XG52YXIgbW9tZW50ID0gcmVxdWlyZShcIm1vbWVudFwiKTtcbnZhciByZWRpc1NlYXJjaCA9IHJlcXVpcmUoXCIuLi9yZWRpc2VhcmNoY2xpZW50XCIpO1xudmFyIGZzID0gcmVxdWlyZShcImZzXCIpO1xudmFyIG1vbWVudCA9IHJlcXVpcmUoJ21vbWVudCcpXG52YXIgUGFja2FnZVV0aWwgPSByZXF1aXJlKFwiLi4vVXRpbC9wYWNrYWdldXRpbFwiKS5QYWNrYWdlVXRpbGl0eTtcbnZhciBwYWNrYWdlVXRpbCA9IG5ldyBQYWNrYWdlVXRpbCgpO1xuY29uc3QgUEtHX0lEWCA9IFwiaW5kZXg6cGFja2FnZXNcIjtcbmNvbnN0IFBLR19JRF9DT1VOVEVSID0gXCJwYWNrYWdlOmlkXCI7XG52YXIgZGF0YUNvbnRleHQgPSByZXF1aXJlKCcuL2RhdGFDb250ZXh0JylcbmNvbnN0IFBLR19QUkVGSVggPSBcInBhY2thZ2VzOlwiO1xuY29uc3QgQVdCX0lEID0gXCJhd2I6aWRcIlxuY29uc3QgSU5ERVhfQVdCID0gXCJpbmRleDphd2JcIlxuY29uc3QgUkVDX1BLRyA9IFwicGtnOnJlYzpcIlxudmFyIHVuaXFJZCA9IHJlcXVpcmUoXCJ1bmlxaWRcIik7IFxudmFyIEN1c3RvbWVyU2VydmljZSA9IHJlcXVpcmUoJy4vQ3VzdG9tZXJTZXJ2aWNlJykuQ3VzdG9tZXJTZXJ2aWNlOyBcbnZhciBjdXN0b21lclNlcnZpY2UgPSBuZXcgQ3VzdG9tZXJTZXJ2aWNlKClcbmNvbnN0IFBLR19TVEFUVVMgPSB7IFxuICAxIDogXCJSZWNlaXZlZFwiLFxuICAyOiBcIkxvYWRlZCBvbiBBaXJDcmFmdFwiLFxuICAzOiBcIkluIFRyYW5zaXRcIixcbiAgNDogXCJSZWNpZXZlZCBpbiBOQVNcIixcbiAgNTogXCJSZWFkeSBmb3IgUGlja3VwIC8gRGVsaXZlcnlcIixcbiAgNjogXCJEZWxpdmVyZWRcIlxuXG59OyBcbnJlZGlzLmFkZENvbW1hbmQoXCJmdC5hZ2dyZWdhdGVcIilcbmNvbnN0IGF3YkluZGV4ID0gcmVkaXNTZWFyY2gocmVkaXMsIElOREVYX0FXQiwge1xuICBjbGllbnRPcHRpb25zOiBscmVkaXMuc2VhcmNoQ2xpZW50RGV0YWlsc1xufSk7XG5jb25zdCBwYWNrYWdlSW5kZXggPSByZWRpc1NlYXJjaChyZWRpcywgUEtHX0lEWCwge1xuICBjbGllbnRPcHRpb25zOiBscmVkaXMuc2VhcmNoQ2xpZW50RGV0YWlsc1xufSk7XG5mdW5jdGlvbiBnZXRQYWNrYWdlVm9sdW1uZShtUGFja2FnZSl7XG5cbiAgcmV0dXJuIDA7IFxufVxuZnVuY3Rpb24gY3JlYXRlRG9jdW1lbnQodFBhY2thZ2UpIHtcbiAgdmFyIHBhY2thZ2VEb2N1bWVudCA9IHtcbiAgICBpZDp0UGFja2FnZS5pZCxcbiAgICB0cmFja2luZ05vOiB0UGFja2FnZS50cmFja2luZ05vLFxuICAgIHNreWJveDogdFBhY2thZ2Uuc2t5Ym94LFxuICAgIGRhdGVSZWNpZXZlZCA6IG1vbWVudCgpLnVuaXgoKSwgXG4gICAgYXdiOjAsIFxuICAgIG1pZDowLFxuICAgIHZvbHVtZTogZ2V0UGFja2FnZVZvbHVtbmUodFBhY2thZ2UpLFxuICAgIHdlaWdodDp0UGFja2FnZS53ZWlnaHQsXG4gICAgcGllY2VzOnRQYWNrYWdlLnBpZWNlcyxcbiAgICBjdXN0b21lcjogdFBhY2thZ2UuY3VzdG9tZXIsXG4gICAgc2hpcHBlcjogdFBhY2thZ2Uuc2hpcHBlcixcbiAgICBkZXNjcmlwdGlvbjogdFBhY2thZ2UuZGVzY3JpcHRpb24sXG4gICAgZGltZW5zaW9uczp0UGFja2FnZS5kaW1lbnNpb25zLFxuICAgIGNhcnJpZXI6dFBhY2thZ2UuY2FycmllcixcbiAgICAvL3NreWJveFY6IHRQYWNrYWdlLnNreWJveCwgYWRkIGRpbWVuaW9uIFxuICAgIHN0YXR1czogdFBhY2thZ2Uuc3RhdHVzLFxuICAgIG1pZDogdFBhY2thZ2UubWlkLFxuICAgIHZhbHVlOiB0UGFja2FnZS52YWx1ZSxcbiAgICBcbiAgfTtcbiAgY29uc29sZS5sb2coXCJhYm91dCB0byBhZGQgdGhlIHBhY2thZ2UgdG8gdGhlIGluZGV4XCIpO1xuICByZXR1cm4gcGFja2FnZURvY3VtZW50O1xufVxuZnVuY3Rpb24gc2V0UGFja2FnZUluVHJhbnNpdChrZXlzLCBtc2VhcmNoZXIpIHtcbiAgcmV0dXJuIG5ldyBQcm9taXNlKChyZXNvbHZlLCByZWplY3QpID0+IHtcbiAgICB2YXIgYmF0Y2hlciA9IG1zZWFyY2hlci5jbGllbnQuYmF0Y2goKTtcbiAgICBrZXlzLmZvckVhY2goZWxlbWVudCA9PiB7XG4gICAgICB2YXIgdmFsdWUgPSB7XG4gICAgICAgIHN0YXR1czogMixcbiAgICAgICAgbG9jYXRpb246IFwiSW4gVHJhbnNpdFwiXG4gICAgICB9O1xuICAgICAgY29uc29sZS5sb2coZWxlbWVudCArIFwiaXMgdGhlIGVsZW1lbnRcIik7XG5cbiAgICAgIGJhdGNoZXIuaG1zZXQoUEtHX1BSRUZJWCArIGVsZW1lbnQsIHZhbHVlKTtcbiAgICB9KTtcbiAgICBiYXRjaGVyLmV4ZWMoKGVyciwgcmVzdWx0KSA9PiB7XG4gICAgICBjb25zb2xlLmxvZyhyZXN1bHQpO1xuICAgICAgLy9yZWFkZCB0aGUgZG9jdW1lbnRzIGhlcmVcbiAgICAgIGtleXMuZm9yRWFjaChlbGVtZW50ID0+IHtcbiAgICAgICAgYWRkUGFja2FnZVRvSW5kZXgoZWxlbWVudCwgbXNlYXJjaGVyKTtcbiAgICAgIH0pO1xuICAgICAgcmVzb2x2ZShyZXN1bHQpO1xuICAgIH0pO1xuICB9KTtcbn1cblxuZnVuY3Rpb24gYWRkUGFja2FnZVRvSW5kZXgodHJhY2tpbmdObywgbXNlYXJjaGVyKSB7XG4gIGxyZWRpcy5nZXRQYWNrYWdlKHRyYWNraW5nTm8pLnRoZW4ocGFjayA9PiB7XG4gICAgbXNlYXJjaGVyLmRlbERvY3VtZW50KFBLR19JRFgsIGAke3BhY2subWlkfS0ke3RyYWNraW5nTm99YCwgKGVyciwgZG9uZSkgPT4ge1xuICAgICAgdmFyIGRvY3VtZW50ID0gY3JlYXRlRG9jdW1lbnQocGFjayk7XG4gICAgICBjb25zb2xlLmxvZyhcInJlYWRkaW5nIHBhY2thZ2UgdG8gdGhlIGluZGV4IGxpa2UgYSBib3NzIFwiICsgdHJhY2tpbmdObyk7XG4gICAgICBtc2VhcmNoZXIuYWRkKHBhY2subWlkICsgXCItXCIgKyBwYWNrLnRyYWNraW5nTm8sIGRvY3VtZW50KTtcbiAgICB9KTtcbiAgfSk7XG59XG5leHBvcnQgY2xhc3MgUGFja2FnZVNlcnZpY2Uge1xuICBjb25zdHJ1Y3RvcigpIHtcbiAgICB0aGlzLnNldHVwSW5kZXgoKTtcbiAgfVxuICBzZXR1cEluZGV4KCkge1xuICAgIHRoaXMubXlTZWFyY2ggPSByZWRpc1NlYXJjaChyZWRpcywgUEtHX0lEWCwge1xuICAgICAgY2xpZW50T3B0aW9uczogbHJlZGlzLnNlYXJjaENsaWVudERldGFpbHNcbiAgICB9KTtcbiAgfVxuICBnZXROZXdBd2IoKXtcbiAgICByZXR1cm4gbmV3IFByb21pc2UoKHJlc29sdmUscmVqZWN0KT0+e1xuICAgICAgZGF0YUNvbnRleHQucmVkaXNDbGllbnQuZXhpc3RzKEFXQl9JRCwoZXJyLHJlc3VsdCk9PntcbiAgICAgICAgY29uc29sZS5sb2cocmVzdWx0KTsgXG4gICAgICAgIGlmIChyZXN1bHQgIT0gXCIxXCIpe1xuICAgICAgICAgIGRhdGFDb250ZXh0LnJlZGlzQ2xpZW50LnNldChBV0JfSUQgPT0gMTAwMDAwLChlcnIsaW5pdFJlc3VsdCk9PntcbiAgICAgICAgICAgIGRhdGFDb250ZXh0LnJlZGlzQ2xpZW50LmluY3IoQVdCX0lELChlcnIsbmV3SWQpPT57XG4gICAgICAgICAgICAgIHJlc29sdmUoe2F3YjpuZXdJZH0pXG4gICAgICAgICAgICB9KVxuICAgICAgICAgIH0pXG4gICAgICAgIH1cbiAgICAgICAgZWxzZSB7XG4gICAgICAgICAgZGF0YUNvbnRleHQucmVkaXNDbGllbnQuaW5jcihBV0JfSUQsKGVycixuZXdJZCk9PntcbiAgICAgICAgICAgIHJlc29sdmUoe2F3YjpuZXdJZH0pXG4gICAgICAgICAgfSlcbiAgICAgICAgfVxuICAgICAgfSlcbiAgICB9KTtcbiAgfVxuICBzYXZlQXdiKGF3Yil7XG4gICAgcmV0dXJuIG5ldyBQcm9taXNlKChyZXNvbHZlLHJlamVjdCk9PntcbiAgICAgIGNvbnNvbGUubG9nKCdzYXZpbmcuLi4nLGF3Yixtb21lbnQoKS50b1N0cmluZyhcImhoOm1tOnNzXCIpKVxuICAgICAgaWYgKGF3Yi5pZCAhPVwiXCIpe1xuICAgICAgICBhd2IudXBkYXRlZF9ieSA9IGF3Yi51c2VybmFtZTsgXG4gICAgICAgIGF3Yi5kYXRlX3VwZGF0ZWQgPSBtb21lbnQoKS51bml4KCk7IFxuICAgICAgICBhd2JJbmRleC51cGRhdGUoYXdiLmlkLGF3YiwoZXJyMSxhd2JSZXMpPT57XG4gICAgICAgICAgaWYgKGVycjEpe1xuICAgICAgICAgICAgY29uc29sZS5sb2coJ3NhdmluZyBlcnInLGVycjEpXG4gICAgICAgICAgICByZXNvbHZlKHtzYXZlZDpmYWxzZX0pXG4gICAgICAgICAgfVxuICAgICAgICAgIHJlc29sdmUoe3NhdmVkOnRydWUsIGlkOmF3Yi5pZH0pXG4gICAgICAgIH0pXG4gICAgICB9XG4gICAgICBlbHNle1xuICAgICAgZGF0YUNvbnRleHQucmVkaXNDbGllbnQuaW5jcihBV0JfSUQsKGVycixyZXBseSk9PntcbiAgICAgICAgYXdiLmlkID0gcmVwbHk7IFxuICAgICAgICBhd2Iuc3RhdHVzID0gMTsgXG4gICAgICAgIGlmIChhd2IuaW52b2ljZSl7XG4gICAgICAgICAgYXdiLmhhc0RvY3MgPSAxXG4gICAgICAgICAgY29uc29sZS5sb2coXCJIQVMgRE9DQ0NDQ1wiKVxuICAgICAgICB9XG4gICAgICAgIGVsc2Uge1xuICAgICAgICAgIGF3Yi5oYXNEb2NzID0gMCA7IFxuICAgICAgICAgIGNvbnNvbGUubG9nKFwiSEFTIE5PIERPQ0NDQ0NcIilcbiAgICAgICAgfVxuXG4gICAgICAgIGF3Yi5jcmVhdGVkX2J5ID0gYXdiLnVzZXJuYW1lOyBcbiAgICAgICAgZGVsZXRlIGF3Yi51c2VybmFtZTtcbiAgICAgICAgYXdiLmRhdGVDcmVhdGVkID0gbW9tZW50KCkudW5peCgpOyBcbiAgICAgICAgICBhd2JJbmRleC5hZGQoYXdiLmlkLGF3YiwoZXJyMSxhd2JSZXMpPT57XG4gICAgICAgICAgICBpZiAoZXJyMSl7XG4gICAgICAgICAgICAgIGNvbnNvbGUubG9nKCdzYXZpbmcgZXJyJyxlcnIxKVxuICAgICAgICAgICAgICByZXNvbHZlKHtzYXZlZDpmYWxzZX0pXG4gICAgICAgICAgICB9XG4gICAgICAgICAgICByZXNvbHZlKHtzYXZlZDp0cnVlLCBpZDpyZXBseX0pXG4gICAgICAgICAgfSlcbiAgICAgIH0pXG4gICAgfVxuICAgICAgXG4gICAgICBcbiAgICB9KVxuICB9XG4gIGdldEF3Yk92ZXJ2aWV3KGlkKXtcbiAgICAvLyBnZXQgdGhlIGF3YiBwYWNrYWdlcyBhbmQgYWRkIGV2ZXJ5dGhpbmcgaW4gXG4gICAgcmV0dXJuIG5ldyBQcm9taXNlKChyZXNvbHZlLHJlamVjdCk9PntcbiAgICAgIHBhY2thZ2VJbmRleC5zZWFyY2goYEBhd2I6WyR7aWR9ICR7aWR9XWAse251bWJlck9mUmVzdWx0czo1MDAwLG9mZnNldDowfSwoZXJyLHBhY2thZ2VzKT0+e1xuICAgICAgICB2YXIgd2VpZ2h0ID0gMCA7IFxuICAgICAgICB2YXIgcGllY2VzID0gcGFja2FnZXMudG90YWxSZXN1bHRzOyBcbiAgICAgICAgdmFyIGRlc2NyaXB0aW9uID0gXCJcIlxuICAgICAgICBwYWNrYWdlcy5yZXN1bHRzLmZvckVhY2gocGFja2FnZTEgPT4ge1xuICAgICAgICAgIGlmIChkZXNjcmlwdGlvbiA9PVwiXCIpXG4gICAgICAgICAgICBkZXNjcmlwdGlvbiA9IHBhY2thZ2UxLmRvYy5kZXNjcmlwdGlvbjsgXG4gICAgICAgICAgd2VpZ2h0ICs9IE51bWJlcihwYWNrYWdlMS5kb2Mud2VpZ2h0KVxuICAgICAgICB9KTtcbiAgICAgICAgdmFyIGRhdGEgID0ge3dlaWdodDp3ZWlnaHQsZGVzY3JpcHRpb246ZGVzY3JpcHRpb24scGllY2VzOnBpZWNlc31cbiAgICAgICAgY29uc29sZS5sb2coZGF0YSxcIkFXQiBERVRBSUxTXCIpOyBcbiAgICAgICAgcmVzb2x2ZSggZGF0YSlcbiAgICAgIH0pXG4gICAgfSlcbiAgIFxuICB9XG4gIGdldEF3YkRldGFpbHMoaWQpe1xuICAgIHZhciBzcnYgPSB0aGlzOyBcbiAgICByZXR1cm4gbmV3IFByb21pc2UoKHJlc29sdmUscmVqZWN0KT0+e1xuICAgICAgY29uc29sZS5sb2coYEBhd2I6WyR7aWR9ICR7aWR9XWApXG4gICAgIFxuICAgICAgcGFja2FnZUluZGV4LnNlYXJjaChgQGF3YjpbJHtpZH0gJHtpZH1dYCx7bnVtYmVyT2ZSZXN1bHRzOjUwMDAsb2Zmc2V0OjB9LChlcnIscGFja2FnZXMpPT57XG4gICAgICAgIGlmIChlcnIpXG4gICAgICAgICBjb25zb2xlLmxvZyhlcnIpXG4gICAgICBcbiAgICAgICAgdmFyICBwYWNrYWdlbGlzdCAgPSBbXVxuICAgICAgICB2YXIgY291bnQgPSAxOyBcbiAgICAgICAgcGFja2FnZXMucmVzdWx0cy5mb3JFYWNoKHBhY2thZ2UxID0+IHtcblxuICAgICAgICAgIGlmIChwYWNrYWdlMS5kb2MudHJhY2tpbmdOby5sZW5ndGggPiA3KXtcbiAgICAgICAgICAgIC8vb25seSBkaXNwbGF5IHRoZSBsYXN0IDcgXG4gICAgICAgICAgICBwYWNrYWdlMS5kb2MudHJhY2tpbmdObyA9IHBhY2thZ2UxLmRvYy50cmFja2luZ05vLnN1YnN0cmluZyhwYWNrYWdlMS5kb2MudHJhY2tpbmdOby5sZW5ndGggLTcpXG4gICAgICAgICAgICBcbiAgICAgICAgICB9XG4gICAgICAgICAgcGFja2FnZTEuZG9jLnBhY2thZ2VJbmRleCA9IGNvdW50O1xuICAgICAgICAgIGNvdW50ICsrOyBcbiAgICAgICAgICBwYWNrYWdlbGlzdC5wdXNoKCBwYWNrYWdlMS5kb2MpXG4gICAgICAgIH0pO1xuICAgICAgIFxuICAgICAgIFxuICAgICAgICByZXNvbHZlKCBwYWNrYWdlbGlzdClcbiAgICAgIH0pXG4gICAgfSlcbiAgfVxuICBsaXN0Tm9Eb2NzRmxsKCl7XG4gICAgcmV0dXJuIG5ldyBQcm9taXNlKChyZXNvbHZlLHJlamVjdCk9PntcbiAgICAgICBhd2JJbmRleC5zZWFyY2goXCJAc3RhdHVzOlsxIDFdIEBoYXNEb2NzOlswIDBdXCIse29mZnNldDowLG51bWJlck9mUmVzdWx0czo1MDAwLHNvcnRCeTonaWQnfSwoZXJyLGF3YnMpPT57XG4gICAgICAgICB2YXIgYXdiTGlzdCA9IFtdOyBcbiAgICAgICAgIFByb21pc2UuYWxsKGF3YnMucmVzdWx0cy5tYXAoYXdiPT5jdXN0b21lclNlcnZpY2UuZ2V0Q3VzdG9tZXIoYXdiLmRvYy5jdXN0b21lcklkKSkpLnRoZW4oY3VzdG9tZXJzPT57XG4gICAgICAgICAgIFByb21pc2UuYWxsKGF3YnMucmVzdWx0cy5tYXAoYXdiPT50aGlzLmdldEF3Yk92ZXJ2aWV3KGF3Yi5kb2MuaWQpKSkudGhlbihkZXRhaWxzPT57XG4gICAgICAgICAgICBjb25zb2xlLmxvZyhcImdvdCB0aGUgY3VzdG9tZXJzXCIsY3VzdG9tZXJzLCBhd2JzKVxuICAgICAgICAgICAgZm9yKHZhciBpID0wIDsgaSA8IGF3YnMucmVzdWx0cy5sZW5ndGggOyBpKysgKXtcbiAgICAgICAgICAgICAgdmFyIGF3YiA9IGF3YnMucmVzdWx0c1tpXTsgXG4gICAgICAgICAgICAgIGF3Yi5kb2MuZGF0ZUNyZWF0ZWQgPSBtb21lbnQudW5peChhd2IuZG9jLmRhdGVDcmVhdGVkKS5mb3JtYXQoXCJZWVlZLU1NLUREIGhoOm1tIEFcIilcbiAgICAgICAgICAgICAgLy93ZSBuZWVkIHRvIGdldCB0aGUgY3VzdG9tZXIgXG4gICAgICAgICAgICAgIGF3Yi5kb2MuY29uc2lnbmVlID0gY3VzdG9tZXJzW2ldLm5hbWU7IFxuICAgICAgICAgICAgICBhd2IuZG9jLndlaWdodCA9IGRldGFpbHNbaV0ud2VpZ2h0OyBcbiAgICAgICAgICAgICAgYXdiLmRvYy5wbWIgPSBjdXN0b21lcnNbaV0ucG1iOyBcbiAgICAgICAgICAgICAgYXdiLmRvYy5kZXNjcmlwdGlvbiA9IGRldGFpbHNbaV0uZGVzY3JpcHRpb247IFxuICAgICAgICAgICAgICBhd2IuZG9jLnBpZWNlcyA9IGRldGFpbHNbaV0ucGllY2VzOyBcbiAgICAgICAgICAgICAgaWYgKGN1c3RvbWVyc1tpXS5wbWIgPT0gJycpe1xuICAgICAgICAgICAgICAgIGF3Yi5kb2MucG1iID0gJzkwMDAnXG4gICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgY29uc29sZS5sb2coJ3B1c2hpbmcgJyxhd2IpXG4gICAgICAgICAgICAgIC8vd2UgbmVlZCB0byBnZXQgYWxsIHRoZSBwYWNrYWdlcyBcbiAgICAgICAgICAgICAgYXdiTGlzdC5wdXNoKGF3Yi5kb2MpXG4gICAgICAgICAgICAgfVxuICAgICAgICAgICAgIHJlc29sdmUoe2F3YnM6YXdiTGlzdH0pXG4gICAgICAgICAgIH0pXG4gICAgICAgICAgXG4gICAgICAgICAgfSkuY2F0Y2goZXJyPT57XG4gICAgICAgICAgICBjb25zb2xlLmxvZyhlcnIpOyBcbiAgICAgICAgICB9KVxuICAgICAgICAgXG4gICAgICAgIC8vICBhd2JzLnJlc3VsdHMuZm9yRWFjaChhd2IgPT4ge1xuICAgICAgICAgICBcbiAgICAgICAgICBcbiAgICAgICAgLy8gIH0pO1xuICAgICAgICAgXG4gICAgICAgfSlcbiAgICB9KVxuICB9XG5cbiAgbGlzdEF3YmluRmxsKCl7XG4gICAgcmV0dXJuIG5ldyBQcm9taXNlKChyZXNvbHZlLHJlamVjdCk9PntcbiAgICAgICBhd2JJbmRleC5zZWFyY2goXCJAc3RhdHVzOlsxIDFdIEBoYXNEb2NzOlsxIDFdXCIse29mZnNldDowLG51bWJlck9mUmVzdWx0czo1MDAwLHNvcnRCeTonaWQnfSwoZXJyLGF3YnMpPT57XG4gICAgICAgICB2YXIgYXdiTGlzdCA9IFtdOyBcbiAgICAgICAgIFByb21pc2UuYWxsKGF3YnMucmVzdWx0cy5tYXAoYXdiPT5jdXN0b21lclNlcnZpY2UuZ2V0Q3VzdG9tZXIoYXdiLmRvYy5jdXN0b21lcklkKSkpLnRoZW4oY3VzdG9tZXJzPT57XG4gICAgICAgICAgIFByb21pc2UuYWxsKGF3YnMucmVzdWx0cy5tYXAoYXdiPT50aGlzLmdldEF3Yk92ZXJ2aWV3KGF3Yi5kb2MuaWQpKSkudGhlbihkZXRhaWxzPT57XG4gICAgICAgICAgICBjb25zb2xlLmxvZyhcImdvdCB0aGUgY3VzdG9tZXJzXCIsY3VzdG9tZXJzLCBhd2JzKVxuICAgICAgICAgICAgZm9yKHZhciBpID0wIDsgaSA8IGF3YnMucmVzdWx0cy5sZW5ndGggOyBpKysgKXtcbiAgICAgICAgICAgICAgdmFyIGF3YiA9IGF3YnMucmVzdWx0c1tpXTsgXG4gICAgICAgICAgICAgIGF3Yi5kb2MuZGF0ZUNyZWF0ZWQgPSBtb21lbnQudW5peChhd2IuZG9jLmRhdGVDcmVhdGVkKS5mb3JtYXQoXCJZWVlZLU1NLUREIGhoOm1tIEFcIilcbiAgICAgICAgICAgICAgLy93ZSBuZWVkIHRvIGdldCB0aGUgY3VzdG9tZXIgXG4gICAgICAgICAgICAgIGF3Yi5kb2MuY29uc2lnbmVlID0gY3VzdG9tZXJzW2ldLm5hbWU7IFxuICAgICAgICAgICAgICBhd2IuZG9jLnBtYiA9IGN1c3RvbWVyc1tpXS5wbWI7IFxuICAgICAgICAgICAgICBhd2IuZG9jLndlaWdodCA9IGRldGFpbHNbaV0ud2VpZ2h0OyBcbiAgICAgICAgICAgICAgYXdiLmRvYy5kZXNjcmlwdGlvbiA9IGRldGFpbHNbaV0uZGVzY3JpcHRpb247IFxuICAgICAgICAgICAgICBhd2IuZG9jLnBpZWNlcyA9IGRldGFpbHNbaV0ucGllY2VzOyBcbiAgICAgICAgICAgICAgaWYgKGN1c3RvbWVyc1tpXS5wbWIgPT0gJycpe1xuICAgICAgICAgICAgICAgIGF3Yi5kb2MucG1iID0gJzkwMDAnXG4gICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgY29uc29sZS5sb2coJ3B1c2hpbmcgJyxhd2IpXG4gICAgICAgICAgICAgIC8vd2UgbmVlZCB0byBnZXQgYWxsIHRoZSBwYWNrYWdlcyBcbiAgICAgICAgICAgICAgYXdiTGlzdC5wdXNoKGF3Yi5kb2MpXG4gICAgICAgICAgICAgfVxuICAgICAgICAgICAgIHJlc29sdmUoe2F3YnM6YXdiTGlzdH0pXG4gICAgICAgICAgIH0pXG4gICAgICAgICAgXG4gICAgICAgICAgfSkuY2F0Y2goZXJyPT57XG4gICAgICAgICAgICBjb25zb2xlLmxvZyhlcnIpOyBcbiAgICAgICAgICB9KVxuICAgICAgICAgXG4gICAgICAgIC8vICBhd2JzLnJlc3VsdHMuZm9yRWFjaChhd2IgPT4ge1xuICAgICAgICAgICBcbiAgICAgICAgICBcbiAgICAgICAgLy8gIH0pO1xuICAgICAgICAgXG4gICAgICAgfSlcbiAgICB9KVxuICB9XG4gIGdldEF3YihpZCl7XG4gICAgY29uc3Qgc3J2ID0gdGhpczsgXG4gICAgcmV0dXJuIG5ldyBQcm9taXNlKChyZXNvbHZlLHJlamVjdCk9PntcbiAgICAgIGF3YkluZGV4LmdldERvYyhpZCwoZXJyLGF3Yik9PntcbiAgICAgICAgLy9nZXQgdGhlIGN1c3RvbWVyIFxuICAgICAgICBjdXN0b21lclNlcnZpY2UuZ2V0Q3VzdG9tZXIoYXdiLmRvYy5jdXN0b21lcklkKS50aGVuKGN1c3RvbWVyPT57XG4gICAgICAgICAgYXdiLmRvYy5jdXN0b21lciA9IGN1c3RvbWVyOyBcbiAgICAgICAgICBzcnYuZ2V0QXdiRGV0YWlscyhpZCkudGhlbihwYWNrYWdlcz0+e1xuICAgICAgICAgICAgLy9nZXQgdGhlIHBhY2thZ2VzIGZvciB0aGUgYXdiIFxuICAgICAgICAgICAgYXdiLmRvYy5wYWNrYWdlcyA9IHBhY2thZ2VzOyBcbiAgICAgICAgICAgIHJlc29sdmUoe2F3Yjphd2IuZG9jfSkgIFxuICAgICAgICAgIH0pXG4gICAgICAgICAgXG4gICAgICAgIH0pXG4gICAgICAgIFxuICAgICAgfSlcbiAgICB9KVxuICB9XG4gIHVwZGF0ZUxvY2F0aW9uKHRyYWNraW5nTnVtYmVyLGxvY2F0aW9uX2lkKXtcbiAgICByZXR1cm4gbmV3IFByb21pc2UoKHJlc29sdmUscmVqZWN0KT0+e1xuICAgICAgcGFja2FnZUluZGV4LnNlYXJjaChcIkB0cmFja2luZ05vOlwiK3RyYWNraW5nTnVtYmVyLHtsb2NhdGlvbjpsb2NhdGlvbl9pZH0sKGVycixwYWNrYWdlUmVzdWx0KT0+e1xuXG4gICAgICB9KVxuICAgIH0pXG4gIH1cbiAgc2F2ZVBhY2thZ2VUb0F3YihuZXdQYWNrYWdlKXtcbiAgICByZXR1cm4gbmV3IFByb21pc2UoKHJlc29sdmUscmVzdWx0KT0+e1xuICAgICAgaWYgKG5ld1BhY2thZ2UuaWQgIT1cIjBcIil7XG4gICAgICAgIHBhY2thZ2VJbmRleC51cGRhdGUobmV3UGFja2FnZS5pZCxuZXdQYWNrYWdlLChlcnIscmVzdWx0KT0+e1xuICAgICAgICAgIGlmIChlcnIpXG4gICAgICAgICAgICBjb25zb2xlLmxvZyhlcnIpOyBcbiAgICAgICAgICByZXNvbHZlKHtzYXZlZDp0cnVlLGlkOm5ld1BhY2thZ2UuaWR9KVxuICAgICAgICB9KVxuICAgICAgfVxuICAgICAgZWxzZSB7XG4gICAgICAgIGRhdGFDb250ZXh0LnJlZGlzQ2xpZW50LmluY3IoUEtHX0lEX0NPVU5URVIsKGVycixpZCk9PntcbiAgICAgICAgICBuZXdQYWNrYWdlLmlkID0gaWQ7IFxuICAgICAgICAgIHBhY2thZ2VJbmRleC5hZGQoaWQsbmV3UGFja2FnZSwoZXJyLHJlc3VsdCk9PntcbiAgICAgICAgICAgIGlmIChlcnIpXG4gICAgICAgICAgICAgIGNvbnNvbGUubG9nKGVycik7IFxuICAgICAgICAgICAgcmVzb2x2ZSh7c2F2ZWQ6dHJ1ZSxpZDppZH0pXG4gICAgICAgICAgfSlcbiAgICAgICAgfSlcbiAgICAgIH1cbiAgIFxuICAgIH0pXG4gIH1cbiAgY3JlYXRlQ29uc29sYXRlZChwYWNrYWdlcyx1c2VybmFtZSxib3hTaXplKXtcbiAgICB2YXIgc3J2ID0gdGhpczsgXG4gICAgcmV0dXJuIG5ldyBQcm9taXNlKChyZXNvbHZlLHJlamVjdCk9PntcbiAgICAgIHZhciBhd2JJbmZvID0geyBcbiAgICAgICAgaWQ6IFwiXCIsXG4gICAgICAgIGlzU2VkOjAsXG4gICAgICAgIGhhc0RvY3M6IFwiMFwiLFxuICAgICAgICBpbnZvaWNlTnVtYmVyOlwiXCIsXG4gICAgICAgIHZhbHVlOlwiMFwiLFxuICAgICAgICBjdXN0b21lcklkOjI0MTk3LFxuICAgICAgICBzaGlwcGVyOlwiNDgyXCIsIC8vIHdlIHNob3VsZCBnZXQgYW4gaWQgaGVyZSBcbiAgICAgICAgY2FycmllcjpcIlVTUFNcIixcbiAgICAgICAgaGF6bWF0OlwiXCIsXG4gICAgICAgIHVzZXJuYW1lOiAgdXNlcm5hbWVcbiAgICAgICBcbiAgICB9O1xuICAgIHNydi5zYXZlQXdiKGF3YkluZm8pLnRoZW4oYXdiUmVzdWx0PT57XG4gICAgICAgLy9hZGQgXG4gICAgICAgICAgdmFyIGNQYWNrYWdlID0ge1xuICAgICAgICAgICAgaWQ6MCxcbiAgICAgICAgICAgIHRyYWNraW5nTm86IHVuaXFJZCgpLFxuICAgICAgICAgICAgZGVzY3JpcHRpb246IFwiQ29uc29saWRhdGVkIFBhY2thZ2VcIixcbiAgICAgICAgICAgIHdlaWdodDowLCBcbiAgICAgICAgICAgIGRpbWVuc2lvbnM6ICBgJHtib3hTaXplfXgke2JveFNpemV9eCR7Ym94U2l6ZX1gLFxuICAgICAgICAgICAgYXdiOmF3YlJlc3VsdC5pZCwgXG4gICAgICAgICAgICBpc0NvbnNvbGlkYXRlZDogXCIxXCIsIFxuICAgICAgICAgICAgY3JlYXRlZF9ieTogdXNlcm5hbWUsIFxuICAgICAgICAgIFxuICAgICAgICB9OyBcbiAgICAgICAgc3J2LnNhdmVQYWNrYWdlVG9Bd2IoY1BhY2thZ2UpLnRoZW4ocGtnUmVzdWx0PT57XG4gICAgICAgICAgLy8gZ2V0IHRoZSBpZCBcbiAgICAgICAgICAvL1xuICAgICAgICAgIHZhciBiYXRjaCA9IGRhdGFDb250ZXh0LnJlZGlzQ2xpZW50LmJhdGNoKCk7IFxuICAgICAgICAgIHZhciBwa2dCYXRjaCA9IGRhdGFDb250ZXh0LnJlZGlzQ2xpZW50LmJhdGNoKCk7IFxuXG4gICAgICAgICAgcGFja2FnZXMuZm9yRWFjaChwa2cgPT4ge1xuICAgICAgICAgICAgLy90aGVzZSBhcmUgYmFyY29kZXMgXG4gICAgICAgICAgICBiYXRjaC5zYWRkKFwiY29uc29saWRhdGVkOnBrZzpcIitwa2dSZXN1bHQuaWQscGtnKVxuICAgICAgICAgICAgcGtnQmF0Y2guaG1nZXQoUEtHX1BSRUZJWCtnZXRQYWNrYWdlSWRGcm9tQmFyQ29kZShwa2cpLFwid2VpZ2h0XCIpXG4gICAgICAgICAgfSk7XG4gICAgICAgICAgYmF0Y2guZXhlYygoZXJyLHJlc3VsdHMpPT57XG4gICAgICAgICAgICAvL1xuICAgICAgICAgICAgcGtnQmF0Y2guZXhlYygoZXJyMSxyZXN1bHRzKT0+e1xuICAgICAgICAgICAgICB2YXIgdG90YWxXZWlnaHQgPSAwOyBcbiAgICAgICAgICAgICAgcmVzdWx0cy5mb3JFYWNoKHdlaWdodCA9PiB7XG4gICAgICAgICAgICAgICAgaWYgKGlzTmFOKE51bWJlcih3ZWlnaHQpKSA9PSBmYWxzZSlcbiAgICAgICAgICAgICAgICAgIHRvdGFsV2VpZ2h0ICs9IE51bWJlcih3ZWlnaHQpO1xuICAgICAgICAgICAgICB9KTtcbiAgICAgICAgICAgICAgLy93ZSBuZWVkIHRvIHVwZGF0ZSB0aGUgdG90YWwgd2VpZ2h0IG9mIHRoZSBwYWNrYWdlIG5vdyBcbiAgICAgICAgICAgICAgc3J2LnBhY2thZ2VJbmRleC51cGRhdGUoY1BhY2thZ2UuaWQse3dlaWdodDp0b3RhbFdlaWdodH0pXG4gICAgICAgICAgICB9KVxuICAgICAgICAgICAgXG4gICAgICAgICAgICByZXNvbHZlKHtzYXZlZDp0cnVlLGlkOnBrZ1Jlc3VsdC5pZH0pXG4gICAgICAgICAgfSlcbiAgICAgICAgfSlcbiAgICAgICAgXG4gICAgfSlcblxuICAgXG4gICAgICAvL3ZhbGlkYXRlIHRoZSBwYWNrYWdlIFxuICAgIFxuXG4gICAgfSlcbiAgfVxuICBzYXZlUGFja2FnZShib2R5KXtcbiAgICByZXR1cm4gbmV3IFByb21pc2UoKHJlc29sdmUscmVqZWN0KT0+e1xuICAgICAgdmFyIGNQYWNrYWdlID0ge1xuICAgICAgICBcbiAgICAgICAgc2t5Ym94OiBib2R5LnNreWJveCxcbiAgICAgICAgY3VzdG9tZXI6IGJvZHkuY3VzdG9tZXIucmVwbGFjZShcIi1cIiwgXCJcIikudHJpbSgpLFxuICAgICAgICB0cmFja2luZ05vOiBib2R5LnRyYWNraW5nLFxuICAgICAgICBkZXNjcmlwdGlvbjogYm9keS5kZXNjcmlwdGlvbixcbiAgICAgICAgc2hpcHBlcjogYm9keS5zaGlwcGVyLFxuICAgICAgICBjYXJyaWVyOmJvZHkuY2FycmllcixcbiAgICAgICAgdmFsdWU6IE51bWJlcihib2R5LnZhbHVlKSxcbiAgICAgICAgcGllY2VzOiBOdW1iZXIoYm9keS5waWVjZXMpLFxuICAgICAgICB3ZWlnaHQ6IE51bWJlcihib2R5LndlaWdodCksXG4gICAgICAgIGRpbWVuc2lvbnM6IGJvZHkuZGltZW5zaW9ucyxcbiAgICAgICAgc3RhdHVzOiAxLFxuICAgICAgICBsb2NhdGlvbjogXCJGTExcIixcbiAgICAgICAgbWlkOiAwLFxuICAgICAgICBhd2I6MCxcbiAgICAgICAgLy9oYXNPcHQ6IHRydWUsXG4gICAgICAgIC8vbXR5cGU6IGJvZHkubXR5cGVcbiAgICAgIH07XG4gICAgICAvL3ZhbGlkYXRlIHRoZSBwYWNrYWdlIFxuICAgICAgZGF0YUNvbnRleHQucmVkaXNDbGllbnQuaW5jcihQS0dfSURfQ09VTlRFUiwoZXJyLGlkKT0+e1xuICAgICAgICBjUGFja2FnZS5pZCA9IGlkOyBcbiAgICAgICAgZGF0YUNvbnRleHQucmVkaXNDbGllbnQuc2V0KFBLR19QUkVGSVgraWQsY1BhY2thZ2UsKGVycixyZXNwb25zZSk9PntcbiAgICAgICAgICBpZiAoZXJyKXtcbiAgICAgICAgICAgIHJlamVjdCh7c2F2ZWQ6ZmFsc2UsZXJyOmVycn0pXG4gICAgICAgICAgfVxuICAgICAgICAgICB2YXIgaW5kZXhQYWNrYWdlID0gIGNyZWF0ZURvY3VtZW50KGNQYWNrYWdlKTsgXG4gICAgICAgICAgIGNvbnNvbGUubG9nKGluZGV4UGFja2FnZSk7IFxuICAgICAgICAgICBwYWNrYWdlSW5kZXguYWRkKGNQYWNrYWdlLmlkLGluZGV4UGFja2FnZSwoZXJyMSxkb2NSZXN1bHQpPT57XG4gICAgICAgICAgICAgY29uc29sZS5sb2coZG9jUmVzdWx0KTsgXG4gICAgICAgICAgICAgaWYoZXJyMSl7XG4gICAgICAgICAgICAgICByZWplY3Qoe3NhdmVkOmZhbHNlLGVycjplcnIxfSlcbiAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgcmVzb2x2ZSh7c2F2ZWQ6dHJ1ZX0pXG4gICAgICAgICAgIH0pXG5cbiAgICAgICAgfSlcbiAgICAgIH0pO1xuICAgIFxuXG5cbiAgICB9KVxuICB9XG5cbiAgZ2V0TWFuaWZlc3RQYWNrYWdlcygpe1xuICAgIHJldHVybiBuZXcgUHJvbWlzZSgocmVzb2x2ZSxyZWplY3QpPT57XG4gICAgICBcbiAgICAgIHRoaXMubXlTZWFyY2guc2VhcmNoKFxuICAgICAgICBgQG1pZDpbMCAwXWAsXG4gICAgICAgIHsgb2Zmc2V0OiAwLCBudW1iZXJPZlJlc3VsdHM6IDUwMDAgfSxcbiAgICAgICAgKGVyciwgZGF0YSkgPT4ge1xuICAgICAgICAgIHZhciBwYWNrYWdlcyA9IFtdO1xuICAgICAgICAgIGNvbnNvbGUubG9nKGRhdGEpO1xuICAgICAgICAgIGRhdGEucmVzdWx0cy5mb3JFYWNoKGVsZW1lbnQgPT4ge1xuXG4gICAgICAgICAgICBwYWNrYWdlcy5wdXNoKGVsZW1lbnQuZG9jKTtcbiAgICAgICAgICAgIHJlc29sdmUocGFja2FnZXMpOyAgICAgICAgICAgICAgICAgXG4gICAgICAgIH0pO1xuICAgIH0pO1xuICAgIH0pXG4gIH1cbiAgZ2V0UmVjZWl2ZWRQYWNrYWdlcyhwYWdlLHBhZ2VTaXplKXtcbiAgICByZXR1cm4gbmV3IFByb21pc2UoKHJlc29sdmUscmVqZWN0KT0+e1xuICAgICAgXG4gICAgICB0aGlzLm15U2VhcmNoLnNlYXJjaChcbiAgICAgICAgYEBtaWQ6WzAgMF1gLFxuICAgICAgICB7IG9mZnNldDogMCwgbnVtYmVyT2ZSZXN1bHRzOiA1MDAwIH0sXG4gICAgICAgIChlcnIsIGRhdGEpID0+IHtcbiAgICAgICAgICB2YXIgcGFja2FnZXMgPSBbXTtcbiAgICAgICAgICBjb25zb2xlLmxvZyhkYXRhKTtcbiAgICAgICAgICBkYXRhLnJlc3VsdHMuZm9yRWFjaChlbGVtZW50ID0+IHtcblxuICAgICAgICAgICAgcGFja2FnZXMucHVzaChlbGVtZW50LmRvYyk7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgXG4gICAgICAgIH0pO1xuICAgICAgICByZXNvbHZlKHBhY2thZ2VzKTsgXG4gICAgfSk7XG4gICAgfSlcbiAgfVxuICBnZXROb0RvY3NQYWNrYWNrYWdlcyhwYWdlLHBhZ2VTaXplKXtcbiAgICByZXR1cm4gbmV3IFByb21pc2UoKHJlc29sdmUscmVqZWN0KT0+e1xuICAgICAgXG4gICAgICB0aGlzLm15U2VhcmNoLnNlYXJjaChcbiAgICAgICAgYEBoYXNEb2NzOlswIDBdYCxcbiAgICAgICAgeyBvZmZzZXQ6IDAsIG51bWJlck9mUmVzdWx0czogNTAwMCB9LFxuICAgICAgICAoZXJyLCBkYXRhKSA9PiB7XG4gICAgICAgICAgdmFyIHBhY2thZ2VzID0gW107XG4gICAgICAgICAgY29uc29sZS5sb2coZGF0YSk7XG4gICAgICAgICAgZGF0YS5yZXN1bHRzLmZvckVhY2goZWxlbWVudCA9PiB7XG5cbiAgICAgICAgICAgIHBhY2thZ2VzLnB1c2goZWxlbWVudC5kb2MpO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIFxuICAgICAgICB9KTtcbiAgICAgICAgcmVzb2x2ZShwYWNrYWdlcyk7IFxuICAgIH0pO1xuICAgIH0pXG4gIH1cbiAgZ2V0cGFja2FnZWJ5UmVkaXNJZChpZCl7XG4gICAgcmV0dXJuIG5ldyBQcm9taXNlKChyZXNvbHZlLHJlamVjdCk9PntcbiAgICAgIHBhY2thZ2VJbmRleC5nZXREb2MoaWQsKGVycixkb2N1bWVudCk9PntcbiAgICAgICAgcmVzb2x2ZShkb2N1bWVudC5kb2MpOyBcbiAgICAgIH0pXG4gICAgfSlcbiAgfVxuICBnZXRQYWNrYWdlQnlJZChiYXJjb2RlKXtcbiAgICB2YXIgc3J2ID0gdGhpczsgXG4gICAgdmFyIHBrZ0lkID0gZ2V0UGFja2FnZUlkRnJvbUJhckNvZGUoYmFyY29kZSk7IFxuICAgIHJldHVybiBuZXcgUHJvbWlzZSgocmVzb2x2ZSxyZWplY3QpPT57XG4gICAgICB0aGlzLm15U2VhcmNoLmdldERvYyhwa2dJZCwoZXJyLGRvY3VtZW50KT0+e1xuICAgICAgICAvL2dldCB0aGUgYXdiIGluZm8gaGVyZSBhcyB3ZWxsIFxuICAgICAgICBzcnYuZ2V0QXdiKGRvY3VtZW50LmRvYy5hd2IpLnRoZW4oYXdiaW5mbz0+e1xuICAgICAgICAgIGNvbnNvbGUubG9nKGF3YmluZm8pOyBcbiAgICAgICAgICB2YXIgcmVzcG9uc2UgPSB7IFxuICAgICAgICAgICAgYXdiIDogYXdiaW5mby5hd2IsXG4gICAgICAgICAgICBwYWNrYWdlIDogZG9jdW1lbnQuZG9jXG4gICAgICAgICAgfVxuICAgICAgICAgIHJlc29sdmUocmVzcG9uc2UpOyBcbiAgICAgICAgfSk7IFxuICAgICAgICBcbiAgICAgIH0pXG4gICAgfSk7IFxuICB9XG4gIC8vdXNpbmcgdGhpcyBcbiAgXG5cbiAgdXBkYXRlTWFuaWZlc3RQYWNrYWdlVG9JblRyYW5zaXQobWlkKSB7XG4gICAgLy9nZXQgYWxsIHRoZSBwYWNrYWdlc1xuICAgIC8vd2UgbmVlZCB0byB1cGRhdGUgdGhlIGluZGV4IGF0IHRoaXMgcG9pbnQgYXMgd2VsbFxuICAgIHZhciBtc2VhcmNoID0gdGhpcy5teVNlYXJjaDtcbiAgICB0aGlzLm15U2VhcmNoLnNlYXJjaChcbiAgICAgIGBAbWlkOlske21pZH0gJHttaWR9XWAsXG4gICAgICB7IG9mZnNldDogMCwgbnVtYmVyT2ZSZXN1bHRzOiA1MDAwIH0sXG4gICAgICAoZXJyLCBkYXRhKSA9PiB7XG4gICAgICAgIHZhciBwYWNrYWdlcyA9IFtdO1xuICAgICAgICBjb25zb2xlLmxvZyhkYXRhKTtcbiAgICAgICAgZGF0YS5yZXN1bHRzLmZvckVhY2goZWxlbWVudCA9PiB7XG4gICAgICAgICAgdmFyIG9sZERvY0lkID0gZWxlbWVudC5kb2NJZDtcbiAgICAgICAgICBlbGVtZW50LmRvY0lkID0gZWxlbWVudC5kb2NJZC5yZXBsYWNlKGAke21pZH0tYCwgXCJcIik7XG4gICAgICAgICAgcGFja2FnZXMucHVzaChlbGVtZW50LmRvY0lkKTtcbiAgICAgICAgICAvLyBpIGNvdWxkIGRlbGV0ZSBoZXJlXG4gICAgICAgICAgLy8gbXNlYXJjaC5kZWxEb2N1bWVudChQS0dfSURYLG9sZERvY0lkKVxuICAgICAgICAgIC8vdXBkYXRlIGFsbCB0aGUgcGFja2FnZXNcbiAgICAgICAgfSk7XG4gICAgICAgIHNldFBhY2thZ2VJblRyYW5zaXQocGFja2FnZXMsIG1zZWFyY2gsIG1pZCkudGhlbihmdW5jdGlvbihcbiAgICAgICAgICB1cGRhdGVkUGFja2FnZXNcbiAgICAgICAgKSB7XG4gICAgICAgICAgY29uc29sZS5sb2coXCJ1cGRhdGVkIHBhY2thZ2VzXCIpO1xuICAgICAgICAgIGNvbnNvbGUubG9nKHVwZGF0ZWRQYWNrYWdlcyk7XG4gICAgICAgIH0pO1xuICAgICAgfVxuICAgICk7XG4gIH1cbiAgcmVtb3ZlUGFja2FnZUZyb21NYW5pZmVzdChwYWNrYWdlSWQsIG1pZCkge1xuICAgIHZhciBtc2VhcmNoID0gdGhpcy5teVNlYXJjaDtcbiAgICByZXR1cm4gbmV3IFByb21pc2UoKHJlc29sdmUsIHJlamVjdCkgPT4ge1xuICAgICAgdmFyIG1hbmlmZXN0ID0gbWlkO1xuICAgICAgdmFyIG1hbmlmZXN0S2V5ID0gXCJtYW5pZmVzdDpcIiArIG1hbmlmZXN0ICsgXCI6KlwiO1xuXG4gICAgICBscmVkaXMuZGVsKFwicGFja2FnZXM6XCIgKyB0cmFja2luZ05vKS50aGVuKGZ1bmN0aW9uKHJlc3VsdCkge1xuICAgICAgICBjb25zb2xlLmxvZyhyZXN1bHQpO1xuICAgICAgICBtc2VhcmNoLmRlbERvY3VtZW50KFBLR19JRFgsIGAke21pZH0tJHt0cmFja2luZ05vfWApO1xuICAgICAgICAvL3dlIG5lZWQgdG8gcmVtb3ZlIGZyb20gdGhlIGluZGV4IGFuZCBkZWMgdGhlIGNvdW50ZXJcbiAgICAgICAgbHJlZGlzLmNsaWVudC5kZWNyKFwibWNvdW50ZXI6XCIgKyBtaWQpO1xuICAgICAgICAvL3JTZXJ2aWNlcy5wYWNrYWdlU2VydmljZS5ybVBhY2thZ2UobWlkLCB0cmFja2luZ05vKTtcbiAgICAgICAgbHJlZGlzLmdldEtleXMobWFuaWZlc3RLZXkpLnRoZW4oa1Jlc3VsdCA9PiB7XG4gICAgICAgICAgLy90aGUgbGlzdCBvZiBhbGwgdGhlIHNldHMgLi4ud2UgbmVlZCB0byByZW1vdmUgdGhlIGtleSBmcm9tIGVhY2ggb25lXG4gICAgICAgICAgdmFyIGtleXNDb3VudCA9IDA7XG5cbiAgICAgICAgICBrUmVzdWx0LmZvckVhY2goZWxlbWVudCA9PiB7XG4gICAgICAgICAgICBjb25zb2xlLmxvZyhcbiAgICAgICAgICAgICAgYHJlbW92aW5nICR7dHJhY2tpbmdOb30gcGFja2FnZSBtYW5pZmVzdCBzZXQgJHtlbGVtZW50fSBgXG4gICAgICAgICAgICApO1xuICAgICAgICAgICAgbHJlZGlzLnNyZW0oZWxlbWVudCwgdHJhY2tpbmdObykudGhlbihmdW5jdGlvbihyUmVzdWx0KSB7XG4gICAgICAgICAgICAgIGNvbnNvbGUubG9nKHJSZXN1bHQpO1xuICAgICAgICAgICAgICBjb25zb2xlLmxvZyhcInJlbW92ZWRcIik7XG4gICAgICAgICAgICAgIGlmIChrZXlzQ291bnQgPT0ga1Jlc3VsdC5sZW5ndGggLSAxKSBrZXlzQ291bnQrKztcbiAgICAgICAgICAgIH0pO1xuICAgICAgICAgIH0pO1xuICAgICAgICAgIHJlc29sdmUoe1xuICAgICAgICAgICAgZGVsZXRlZDogdHJ1ZVxuICAgICAgICAgIH0pO1xuICAgICAgICB9KTtcblxuICAgICAgICAvL3dlIGFsc28gbmVlZCB0byByZW1vdmUgZnJvbSBhbnkgc2V0c1xuICAgICAgfSk7XG4gICAgfSk7XG4gIH1cbiAgcmVtb3ZlUGFja2FnZUJ5SWQoaWQpIHtcbiAgICB2YXIgbXNlYXJjaCA9IHRoaXMubXlTZWFyY2g7XG4gICAgcmV0dXJuIG5ldyBQcm9taXNlKChyZXNvbHZlLCByZWplY3QpID0+IHtcbiAgICAgIFxuICAgICAgcGFja2FnZUluZGV4LmRlbERvY3VtZW50KFBLR19JRFgsaWQsKGVycixyZXNwb25zZSk9PntcbiAgICAgICAgaWYgKGVycilcbiAgICAgICAgICBjb25zb2xlLmxvZyhlcnIpOyBcbiAgICAgICAgY29uc29sZS5sb2cocmVzcG9uc2UpOyBcbiAgICAgICAgcmVzb2x2ZSh7ZGVsZXRlZDp0cnVlfSlcbiAgICAgIH0pXG4gICAgICBcbiAgICAgICAgXG4gICAgICBcbiAgICB9KTtcbiAgfVxuICBzdG9yZVBhY2thZ2VGb3JQaWNrdXAodHJhY2tpbmdObyxiaW4pe1xuICAgIHZhciBzZWFyY2hlciA9IHRoaXMubXlTZWFyY2g7XG4gICAgcmV0dXJuIG5ldyBQcm9taXNlKChyZXNvbHZlLHJlamVjdCk9PntcbiAgICAgICBscmVkaXMuaG1zZXQoUEtHX1BSRUZJWCt0cmFja2luZ05vLHtzdGF0dXM6NCxsb2NhdGlvbjpiaW59KS50aGVuKChyZXN1bHQpPT57XG4gICAgICAgICBscmVkaXMuZ2V0UGFja2FnZSh0cmFja2luZ05vKS50aGVuKChwa2cpPT57XG4gICAgICAgICAgYWRkUGFja2FnZVRvSW5kZXgodHJhY2tpbmdObyxzZWFyY2hlcikgOyBcbiAgICAgICAgICByZXNvbHZlKHBrZyk7ICAgXG4gICAgICAgICB9KTtcbiAgICAgICB9KSBcbiAgICB9KTsgXG4gIH1cbiAgdXBkYXRlUGFja2FnZUluZGV4KHRyYWNraW5nKXtcbiAgICAgIHJldHVybiBuZXcgUHJvbWlzZSgocmVzb2x2ZSxyZWplY3QpPT57XG4gICAgICAgICAgdmFyIG1zZWFyY2ggPSB0aGlzLm15U2VhcmNoOyBcbiAgICAgICAgICBhZGRQYWNrYWdlVG9JbmRleCh0cmFja2luZyxtc2VhcmNoKTsgXG4gICAgICAgICByZXNvbHZlKHsndXBkYXRlZCc6dHJ1ZX0pO1xuICAgICAgfSlcbiAgfVxuICBnZXRDdXN0b21lclBhY2thZ2VzKHNreWJveCkge31cbiAgZ2V0TWFuaWZlc3RQYWNrYWdlc0J5U3RhdHVzKG1pZCxzdGF0dXMpIHtcbiAgICAgIHJldHVybiBuZXcgUHJvbWlzZSgocmVzb2x2ZSxyZWplY3QpPT57XG4gICAgICAgICAgY29uc29sZS5sb2coYEBtaWQ6WyR7bWlkfSAke21pZH1dYClcbiAgICAgICAgdGhpcy5teVNlYXJjaC5zZWFyY2goXG4gICAgICAgICAgICBgQG1pZDpbJHttaWR9ICR7bWlkfV1gLFxuICAgICAgICAgICAgeyBvZmZzZXQ6IDAsIG51bWJlck9mUmVzdWx0czogNTAwMCB9LFxuICAgICAgICAgICAgKGVyciwgZGF0YSkgPT4ge1xuICAgICAgICAgICAgICB2YXIgcGFja2FnZXMgPSBbXTtcbiAgICAgICAgICAgICAgY29uc29sZS5sb2coZGF0YSk7XG4gICAgICAgICAgICAgIGRhdGEucmVzdWx0cy5mb3JFYWNoKGVsZW1lbnQgPT4ge1xuXG4gICAgICAgICAgICAgICAgcGFja2FnZXMucHVzaChlbGVtZW50LmRvYyk7XG4gICAgICAgICAgICAgICAgcmVzb2x2ZShwYWNrYWdlcyk7ICAgICAgICAgICAgICAgICBcbiAgICAgICAgICAgIH0pO1xuICAgICAgICB9KTtcbiAgICAgIH0pO1xuICBcbiAgfSAgIFxuICBcbiAgXG5cbiAgIC8vI3JlZ2lvbiBNYW5pZmVzdCBQYWNrYWdlIEZ1bmN0aW9ucyBcblxuICAgYWRkVG9GbGlnaHQoYWN0aW9uKXtcbiAgICAgdmFyIHNydiA9IHRoaXM7IFxuICAgIHJldHVybiBuZXcgUHJvbWlzZSgocmVzb2x2ZSxyZWplY3QpPT57XG4gICAgICB2YXIgcGFja2FnZU5vID0gZ2V0UGFja2FnZUlkRnJvbUJhckNvZGUoYWN0aW9uLmJhcmNvZGUpOyBcbiAgICAgIGNvbnNvbGUubG9nKGFjdGlvbik7IFxuICAgICAgdGhpcy5teVNlYXJjaC51cGRhdGUocGFja2FnZU5vLHttaWQ6YWN0aW9uLm1pZCAsIHN0YXR1czogMiwgbG9jYXRpb246XCJMb2FkZWQgb24gQWlyQ3JhZnRcIixjb21wYXJ0bWVudDphY3Rpb24uY29tcGFydG1lbnR9LChlcnIscmVzdWx0KT0+e1xuICAgICAgICBpZihlcnIpXG4gICAgICAgICAgcmVzb2x2ZSh7YWRkZWQ6ZmFsc2V9KVxuICAgICAgICBzcnYuZ2V0RmxpZ2h0Q29tcGFydG1lbnRXZWlnaHQoYWN0aW9uLm1pZCxhY3Rpb24uY29tcGFydG1lbnQpLnRoZW4oZnJlc3VsdD0+e1xuICAgICAgICAgIGZyZXN1bHQuYWRkZWQgPSB0cnVlOyBcbiAgICAgICAgICByZXNvbHZlKGZyZXN1bHQpXG4gICAgICAgIH0pXG4gICAgICAgXG4gICAgICB9KVxuICAgICAgICBcbiAgICB9KVxuICAgfVxuICAgLy9nZXQgdGhlIGNvbXBhcnRtZW50IHdlaWdodCBcbiAgIGdldEZsaWdodENvbXBhcnRtZW50V2VpZ2h0KG1pZCxjb21wYXJ0bWVudCl7XG4gICAgIHJldHVybiBuZXcgUHJvbWlzZSgocmVzb2x2ZSxyZWplY3QpPT57XG4gICAgICBcbiAgICAgIHRoaXMubXlTZWFyY2guYWdncmVnYXRlKGBAbWlkOlske21pZH0gJHttaWR9XSBAY29tcGFydG1lbnQ6JHtjb21wYXJ0bWVudH1gLCB7fSwoZXJyLHJlcGx5KT0+e1xuICAgICAgICAgaWYgKGVycilcbiAgICAgICAgIGNvbnNvbGUubG9nKGVycik7IFxuICAgICAgICAgY29uc29sZS5sb2cocmVwbHksXCJUT1RBTCBTRUNUSU9OIFdlaWdodFwiKVxuICAgICAgICAgaWYgKHJlcGx5WzFdKXtcbiAgICAgICAgICAgdmFyIHJlc3VsdCA9IHJlcGx5WzFdO1xuICAgICAgICAgICB2YXIgY29tcGFydG1lbnQgPSByZXN1bHRbM107IFxuICAgICAgICAgICB2YXIgd2VpZ2h0ID0gcmVzdWx0WzVdOyBcbiAgICAgICAgIH1cbiAgICAgICAgIHJlc29sdmUoe2NvbXBhcnRtZW50OmNvbXBhcnRtZW50LHdlaWdodDp3ZWlnaHR9KVxuICAgICAgIH0pXG4gICAgIH0pXG4gICB9XG4gICAvL3JlbW92ZSBmcm9tIGZsaWdodCBcbiAgIHJlbW92ZUZyb21GbGlnaHQoYWN0aW9uKXtcbiAgICByZXR1cm4gbmV3IFByb21pc2UoKHJlc29sdmUscmVqZWN0KT0+e1xuICAgICAgICB2YXIgcGFja2FnZU5vID0gZ2V0UGFja2FnZUlkRnJvbUJhckNvZGUoYWN0aW9uLmJhcmNvZGUpOyAgIFxuICAgICAgICB0aGlzLm15U2VhcmNoLnVwZGF0ZShwYWNrYWdlTm8se21pZDphY3Rpb24ubWlkfSwoZXJyLHJlc3VsdCk9PntcbiAgICAgICAgaWYoZXJyKVxuICAgICAgICAgICAgcmVzb2x2ZSh7cmVtb3ZlZDpmYWxzZX0pXG4gICAgICAgICAgXG4gICAgICAgICAgcmVzb2x2ZSh7cmVtb3ZlZDp0cnVlfSlcbiAgICAgICAgfSlcbiAgICB9KVxuICAgfVxuICAgcmVjRnJvbVRydWNrKHRyYWNraW5nTm8sdXNlcm5hbWUsc2hpcG1lbnRJZCl7XG4gICAgIHJldHVybiBuZXcgUHJvbWlzZSgocmVzb2x2ZSxyZWplY3QpPT57XG4gICAgICAgIGRhdGFDb250ZXh0LnJlZGlzQ2xpZW50LnNhZGQoXCJzaGlwbWVudDppZDpcIitzaGlwbWVudElkLHRyYWNraW5nTm8sKGVycixyZXBseSk9PntcbiAgICAgICAgICBkYXRhQ29udGV4dC5yZWRpc0NsaWVudC5zZXQoUkVDX1BLRyt0cmFja2luZ05vLG1vbWVudCgpLnVuaXgoKSwgKGVycixyZXN1bHQpPT57XG4gICAgICAgICAgICBpZiAoZXJyKSByZXNvbHZlKHtzYXZlZDpmYWxzZX0pXG4gICAgICAgICAgICAvL3NoaXBtZW50IGNvdW50IFxuICAgICAgICAgICAgdmFyIHNoaXBtZW50Q291bnQgPSAxO1xuICAgICAgICAgICAgZGF0YUNvbnRleHQucmVkaXNDbGllbnQuc2NhcmQoXCJzaGlwbWVudDppZDpcIitzaGlwbWVudElkLChlcnIsY2FyZCk9PntcbiAgICAgICAgICAgICAgcmVzb2x2ZSh7c2F2ZWQ6dHJ1ZSxwa2dDb3VudDpjYXJkfSlcbiAgICAgICAgICAgIH0pO1xuICAgICAgICAgICBcbiAgICAgICAgICB9KVxuICAgICAgICB9KVxuICAgICAgICBcbiAgICAgfSlcbiAgIH1cbiAgIHByb2Nzc2Vzc1BhY2thZ2UocGtnSWZubyx1c2VybmFtZSl7XG4gICAgdmFyIHNydiA9IHRoaXM7ICBcbiAgICByZXR1cm4gbmV3IFByb21pc2UoKHJlc29sdmUscmVqZWN0KT0+e1xuICAgICAgIC8vd2UgYWxzbyBuZWVkIHRvIHNldCB0aGUgd2FyZWhvdXNlIGxvY2F0aW9uIGhlcmUgXG4gICAgICAgZGF0YUNvbnRleHQucmVkaXNDbGllbnQuaG1zZXQoXCJmZWVzOmF3YjpcIitwa2dJZm5vLmF3Yixwa2dJZm5vLChlcnIscmVzdWx0KT0+e1xuICAgICAgICAgaWYgKGVycilcbiAgICAgICAgICBjb25zb2xlLmxvZyhlcnIpOyBcbiAgICAgICAgICBjb25zb2xlLmxvZyhyZXN1bHQpOyBcbiAgICAgICAgICBjb25zb2xlLmxvZyhcInByaW50OmZlZXM6XCIrdXNlcm5hbWUsdXNlcm5hbWUpOyBcbiAgICAgICAgIGRhdGFDb250ZXh0LnJlZGlzQ2xpZW50LnB1Ymxpc2goXCJwcmludDpmZWVzOlwiK3VzZXJuYW1lLHBrZ0lmbm8uYXdiKTsgXG4gICAgICAgICAgc3J2LmdldFBhY2thZ2VCeUlkKHBrZ0lmbm8uYmFyY29kZSkudGhlbihwa2c9PntcblxuICAgICAgICAgICAgaWYgKHBrZ0lmbm8ucmVmTG9jKXtcbiAgICAgICAgICAgICAgcGtnLnBhY2thZ2Uud2xvYyA9IHBrZ0lmbm8ucmVmTG9jOyBcbiAgICAgICAgICAgICAgaWYgKE51bWJlcihwa2dJZm5vLm5vZG9jcykhPSAwIClcbiAgICAgICAgICAgICAgICBwa2cucGFja2FnZS5oYXNEb2NzID0gMCA7IFxuICAgICAgICAgICAgICAgIGNvbnNvbGUubG9nKCd1cGRhdGluZyB3aXRoICcscGtnLnBhY2thZ2UpXG4gICAgICAgICAgICAgIHNydi5wYWNrYWdlSW5kZXgudXBkYXRlKHBrZy5wYWNrYWdlLmlkLHBrZy5wYWNrYWdlLChlcnJSZXNwLHJlc3BvbnNlKT0+e1xuICAgICAgICAgICAgICAgIGlmKGVyclJlc3ApXG4gICAgICAgICAgICAgICAgY29uc29sZS5sb2coZXJyUmVzcClcbiAgICAgICAgICAgICAgfSlcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIFxuICAgICAgICAgIH0pXG4gICAgICAgICByZXNvbHZlKHtzZW50OnRydWV9KVxuICAgICAgIH0pXG4gICAgIH0pXG4gICB9XG4gICByZWNGcm9tUGxhbmVOYXMoYmFyY29kZSl7XG4gICAgIHJldHVybiBuZXcgUHJvbWlzZSgocmVzb2x2ZSxyZWplY3QpPT57XG4gICAgICAgdmFyIHNydiA9IHRoaXMgOyBcbiAgICAgICB2YXIgcGtnSWQgPSBnZXRQYWNrYWdlSWRGcm9tQmFyQ29kZShiYXJjb2RlKTsgXG4gICAgICAgIHNydi5teVNlYXJjaC5nZXREb2MocGtnSWQsKGVycixwa2cpPT57XG4gICAgICAgICAgICBwa2cuZG9jLnN0YXR1cyA9IDQ7IFxuICAgICAgICAgICAgcGtnLmRvYy5sb2NhdGlvbiAgPSBcIldhcmVob3VzZSBOQVNcIjsgXG4gICAgICAgICAgICBzcnYubXlTZWFyY2gudXBkYXRlKHBrZ0lkLHBrZy5kb2MsKGVycix1cGRhdGVSZXN1bHQpPT57XG4gICAgICAgICAgICAgIGlmKGVycilcbiAgICAgICAgICAgICAgICByZWplY3Qoe3VwZGF0ZWQ6ZmFsc2V9KVxuICAgICAgICAgICAgICByZXNvbHZlKHt1cGRhdGVkOnRydWV9KVxuICAgICAgICAgICAgfSlcbiAgICAgICAgfSlcbiAgICAgfSlcbiAgIH1cbiAgIC8vI2VuZHJlZ2lvblxufVxuXG5mdW5jdGlvbiBnZXRQYWNrYWdlSWRGcm9tQmFyQ29kZShiYXJDb2RlVmFsdWUpe1xuICB2YXIgcGFydHMgPSBiYXJDb2RlVmFsdWUuc3BsaXQoXCItXCIpOyBcbiAgaWYgKHBhcnRzLmxlbmd0aCA9PSAzKVxuICAgIGlmICh0eXBlb2YgcGFydHNbMl0gIT0gXCJ1bmRlZmluZWRcIilcbiAgICByZXR1cm4gcGFydHNbMl0udHJpbSgpOyBcbiAgcmV0dXJuIFwiXCJcbn1cbiJdfQ==
