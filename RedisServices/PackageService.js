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
    value: function createConsolated(packages, username) {
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
            dimensions: "0x0x0",
            awb: awbResult.id,
            isConsolidated: "1",
            created_by: username

          };
          srv.savePackageToAwb(cPackage).then(function (pkgResult) {
            // get the id 
            //
            var batch = dataContext.redisClient.batch();
            packages.forEach(function (pkg) {
              //these are barcodes 
              batch.sadd("consolidated:pkg:" + pkgResult.id, pkg);
            });
            batch.exec(function (err, results) {
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

        _this10.mySearch.aggregate("@mid:[" + mid + " " + mid + "] @compartment:Nose", {}, function (err, reply) {
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
      return new Promise(function (resolve, reject) {
        dataContext.redisClient.hmset("fees:awb:" + pkgIfno.awb, pkgIfno, function (err, result) {
          if (err) console.log(err);
          console.log(result);
          dataContext.redisClient.publish("print:fees:" + username, pkgIfno.awb);
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
//# sourceMappingURL=data:application/json;charset=utf8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIlJlZGlzU2VydmljZXMvUGFja2FnZVNlcnZpY2UuZXM2Il0sIm5hbWVzIjpbInJlZGlzIiwicmVxdWlyZSIsImxyZWRpcyIsIm1vbWVudCIsInJlZGlzU2VhcmNoIiwiZnMiLCJQYWNrYWdlVXRpbCIsIlBhY2thZ2VVdGlsaXR5IiwicGFja2FnZVV0aWwiLCJQS0dfSURYIiwiUEtHX0lEX0NPVU5URVIiLCJkYXRhQ29udGV4dCIsIlBLR19QUkVGSVgiLCJBV0JfSUQiLCJJTkRFWF9BV0IiLCJSRUNfUEtHIiwidW5pcUlkIiwiQ3VzdG9tZXJTZXJ2aWNlIiwiY3VzdG9tZXJTZXJ2aWNlIiwiUEtHX1NUQVRVUyIsImFkZENvbW1hbmQiLCJhd2JJbmRleCIsImNsaWVudE9wdGlvbnMiLCJzZWFyY2hDbGllbnREZXRhaWxzIiwicGFja2FnZUluZGV4IiwiZ2V0UGFja2FnZVZvbHVtbmUiLCJtUGFja2FnZSIsImNyZWF0ZURvY3VtZW50IiwidFBhY2thZ2UiLCJwYWNrYWdlRG9jdW1lbnQiLCJpZCIsInRyYWNraW5nTm8iLCJza3lib3giLCJkYXRlUmVjaWV2ZWQiLCJ1bml4IiwiYXdiIiwibWlkIiwidm9sdW1lIiwid2VpZ2h0IiwicGllY2VzIiwiY3VzdG9tZXIiLCJzaGlwcGVyIiwiZGVzY3JpcHRpb24iLCJkaW1lbnNpb25zIiwiY2FycmllciIsInN0YXR1cyIsInZhbHVlIiwiY29uc29sZSIsImxvZyIsInNldFBhY2thZ2VJblRyYW5zaXQiLCJrZXlzIiwibXNlYXJjaGVyIiwiUHJvbWlzZSIsInJlc29sdmUiLCJyZWplY3QiLCJiYXRjaGVyIiwiY2xpZW50IiwiYmF0Y2giLCJmb3JFYWNoIiwibG9jYXRpb24iLCJlbGVtZW50IiwiaG1zZXQiLCJleGVjIiwiZXJyIiwicmVzdWx0IiwiYWRkUGFja2FnZVRvSW5kZXgiLCJnZXRQYWNrYWdlIiwidGhlbiIsImRlbERvY3VtZW50IiwicGFjayIsImRvbmUiLCJkb2N1bWVudCIsImFkZCIsIlBhY2thZ2VTZXJ2aWNlIiwic2V0dXBJbmRleCIsIm15U2VhcmNoIiwicmVkaXNDbGllbnQiLCJleGlzdHMiLCJzZXQiLCJpbml0UmVzdWx0IiwiaW5jciIsIm5ld0lkIiwidG9TdHJpbmciLCJ1cGRhdGVkX2J5IiwidXNlcm5hbWUiLCJkYXRlX3VwZGF0ZWQiLCJ1cGRhdGUiLCJlcnIxIiwiYXdiUmVzIiwic2F2ZWQiLCJyZXBseSIsImludm9pY2UiLCJoYXNEb2NzIiwiY3JlYXRlZF9ieSIsImRhdGVDcmVhdGVkIiwic2VhcmNoIiwibnVtYmVyT2ZSZXN1bHRzIiwib2Zmc2V0IiwicGFja2FnZXMiLCJ0b3RhbFJlc3VsdHMiLCJyZXN1bHRzIiwicGFja2FnZTEiLCJkb2MiLCJOdW1iZXIiLCJkYXRhIiwic3J2IiwicGFja2FnZWxpc3QiLCJjb3VudCIsImxlbmd0aCIsInN1YnN0cmluZyIsInB1c2giLCJzb3J0QnkiLCJhd2JzIiwiYXdiTGlzdCIsImFsbCIsIm1hcCIsImdldEN1c3RvbWVyIiwiY3VzdG9tZXJJZCIsImdldEF3Yk92ZXJ2aWV3IiwiY3VzdG9tZXJzIiwiaSIsImZvcm1hdCIsImNvbnNpZ25lZSIsIm5hbWUiLCJkZXRhaWxzIiwicG1iIiwiY2F0Y2giLCJnZXREb2MiLCJnZXRBd2JEZXRhaWxzIiwidHJhY2tpbmdOdW1iZXIiLCJsb2NhdGlvbl9pZCIsInBhY2thZ2VSZXN1bHQiLCJuZXdQYWNrYWdlIiwiYXdiSW5mbyIsImlzU2VkIiwiaW52b2ljZU51bWJlciIsImhhem1hdCIsInNhdmVBd2IiLCJjUGFja2FnZSIsImF3YlJlc3VsdCIsImlzQ29uc29saWRhdGVkIiwic2F2ZVBhY2thZ2VUb0F3YiIsInNhZGQiLCJwa2dSZXN1bHQiLCJwa2ciLCJib2R5IiwicmVwbGFjZSIsInRyaW0iLCJ0cmFja2luZyIsInJlc3BvbnNlIiwiaW5kZXhQYWNrYWdlIiwiZG9jUmVzdWx0IiwicGFnZSIsInBhZ2VTaXplIiwiYmFyY29kZSIsInBrZ0lkIiwiZ2V0UGFja2FnZUlkRnJvbUJhckNvZGUiLCJnZXRBd2IiLCJhd2JpbmZvIiwicGFja2FnZSIsIm1zZWFyY2giLCJvbGREb2NJZCIsImRvY0lkIiwidXBkYXRlZFBhY2thZ2VzIiwicGFja2FnZUlkIiwibWFuaWZlc3QiLCJtYW5pZmVzdEtleSIsImRlbCIsImRlY3IiLCJnZXRLZXlzIiwia2V5c0NvdW50Iiwia1Jlc3VsdCIsInNyZW0iLCJyUmVzdWx0IiwiZGVsZXRlZCIsImJpbiIsInNlYXJjaGVyIiwiYWN0aW9uIiwicGFja2FnZU5vIiwiY29tcGFydG1lbnQiLCJhZGRlZCIsImdldEZsaWdodENvbXBhcnRtZW50V2VpZ2h0IiwiZnJlc3VsdCIsImFnZ3JlZ2F0ZSIsInJlbW92ZWQiLCJzaGlwbWVudElkIiwic2hpcG1lbnRDb3VudCIsInNjYXJkIiwiY2FyZCIsInBrZ0NvdW50IiwicGtnSWZubyIsInB1Ymxpc2giLCJzZW50IiwidXBkYXRlUmVzdWx0IiwidXBkYXRlZCIsImJhckNvZGVWYWx1ZSIsInBhcnRzIiwic3BsaXQiXSwibWFwcGluZ3MiOiI7Ozs7Ozs7OztBQUFBOztBQUNBOzs7Ozs7QUFHQSxJQUFJQSxRQUFRQyxRQUFRLE9BQVIsQ0FBWjtBQUNBLElBQUlDLFNBQVNELFFBQVEsZUFBUixDQUFiO0FBQ0EsSUFBSUUsU0FBU0YsUUFBUSxRQUFSLENBQWI7QUFDQSxJQUFJRyxjQUFjSCxRQUFRLHFCQUFSLENBQWxCO0FBQ0EsSUFBSUksS0FBS0osUUFBUSxJQUFSLENBQVQ7QUFDQSxJQUFJRSxTQUFTRixRQUFRLFFBQVIsQ0FBYjtBQUNBLElBQUlLLGNBQWNMLFFBQVEscUJBQVIsRUFBK0JNLGNBQWpEO0FBQ0EsSUFBSUMsY0FBYyxJQUFJRixXQUFKLEVBQWxCO0FBQ0EsSUFBTUcsVUFBVSxnQkFBaEI7QUFDQSxJQUFNQyxpQkFBaUIsWUFBdkI7QUFDQSxJQUFJQyxjQUFjVixRQUFRLGVBQVIsQ0FBbEI7QUFDQSxJQUFNVyxhQUFhLFdBQW5CO0FBQ0EsSUFBTUMsU0FBUyxRQUFmO0FBQ0EsSUFBTUMsWUFBWSxXQUFsQjtBQUNBLElBQU1DLFVB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QUFHSCxTQUFTdEMsdUJBQVQsQ0FBaUN1QyxZQUFqQyxFQUE4QztBQUM1QyxNQUFJQyxRQUFRRCxhQUFhRSxLQUFiLENBQW1CLEdBQW5CLENBQVo7QUFDQSxNQUFJRCxNQUFNeEYsTUFBTixJQUFnQixDQUFwQixFQUNFLElBQUksT0FBT3dGLE1BQU0sQ0FBTixDQUFQLElBQW1CLFdBQXZCLEVBQ0EsT0FBT0EsTUFBTSxDQUFOLEVBQVNqRCxJQUFULEVBQVA7QUFDRixTQUFPLEVBQVA7QUFDRCIsImZpbGUiOiJSZWRpc1NlcnZpY2VzL1BhY2thZ2VTZXJ2aWNlLmpzIiwic291cmNlc0NvbnRlbnQiOlsiaW1wb3J0IHsgY3B1cyB9IGZyb20gXCJvc1wiO1xuaW1wb3J0IHsgcHJvbWlzZXMgfSBmcm9tIFwiZG5zXCI7XG5cblxudmFyIHJlZGlzID0gcmVxdWlyZShcInJlZGlzXCIpO1xudmFyIGxyZWRpcyA9IHJlcXVpcmUoXCIuL3JlZGlzLWxvY2FsXCIpO1xudmFyIG1vbWVudCA9IHJlcXVpcmUoXCJtb21lbnRcIik7XG52YXIgcmVkaXNTZWFyY2ggPSByZXF1aXJlKFwiLi4vcmVkaXNlYXJjaGNsaWVudFwiKTtcbnZhciBmcyA9IHJlcXVpcmUoXCJmc1wiKTtcbnZhciBtb21lbnQgPSByZXF1aXJlKCdtb21lbnQnKVxudmFyIFBhY2thZ2VVdGlsID0gcmVxdWlyZShcIi4uL1V0aWwvcGFja2FnZXV0aWxcIikuUGFja2FnZVV0aWxpdHk7XG52YXIgcGFja2FnZVV0aWwgPSBuZXcgUGFja2FnZVV0aWwoKTtcbmNvbnN0IFBLR19JRFggPSBcImluZGV4OnBhY2thZ2VzXCI7XG5jb25zdCBQS0dfSURfQ09VTlRFUiA9IFwicGFja2FnZTppZFwiO1xudmFyIGRhdGFDb250ZXh0ID0gcmVxdWlyZSgnLi9kYXRhQ29udGV4dCcpXG5jb25zdCBQS0dfUFJFRklYID0gXCJwYWNrYWdlczpcIjtcbmNvbnN0IEFXQl9JRCA9IFwiYXdiOmlkXCJcbmNvbnN0IElOREVYX0FXQiA9IFwiaW5kZXg6YXdiXCJcbmNvbnN0IFJFQ19QS0cgPSBcInBrZzpyZWM6XCJcbnZhciB1bmlxSWQgPSByZXF1aXJlKFwidW5pcWlkXCIpOyBcbnZhciBDdXN0b21lclNlcnZpY2UgPSByZXF1aXJlKCcuL0N1c3RvbWVyU2VydmljZScpLkN1c3RvbWVyU2VydmljZTsgXG52YXIgY3VzdG9tZXJTZXJ2aWNlID0gbmV3IEN1c3RvbWVyU2VydmljZSgpXG5jb25zdCBQS0dfU1RBVFVTID0geyBcbiAgMSA6IFwiUmVjZWl2ZWRcIixcbiAgMjogXCJMb2FkZWQgb24gQWlyQ3JhZnRcIixcbiAgMzogXCJJbiBUcmFuc2l0XCIsXG4gIDQ6IFwiUmVjaWV2ZWQgaW4gTkFTXCIsXG4gIDU6IFwiUmVhZHkgZm9yIFBpY2t1cCAvIERlbGl2ZXJ5XCIsXG4gIDY6IFwiRGVsaXZlcmVkXCJcblxufTsgXG5yZWRpcy5hZGRDb21tYW5kKFwiZnQuYWdncmVnYXRlXCIpXG5jb25zdCBhd2JJbmRleCA9IHJlZGlzU2VhcmNoKHJlZGlzLCBJTkRFWF9BV0IsIHtcbiAgY2xpZW50T3B0aW9uczogbHJlZGlzLnNlYXJjaENsaWVudERldGFpbHNcbn0pO1xuY29uc3QgcGFja2FnZUluZGV4ID0gcmVkaXNTZWFyY2gocmVkaXMsIFBLR19JRFgsIHtcbiAgY2xpZW50T3B0aW9uczogbHJlZGlzLnNlYXJjaENsaWVudERldGFpbHNcbn0pO1xuZnVuY3Rpb24gZ2V0UGFja2FnZVZvbHVtbmUobVBhY2thZ2Upe1xuXG4gIHJldHVybiAwOyBcbn1cbmZ1bmN0aW9uIGNyZWF0ZURvY3VtZW50KHRQYWNrYWdlKSB7XG4gIHZhciBwYWNrYWdlRG9jdW1lbnQgPSB7XG4gICAgaWQ6dFBhY2thZ2UuaWQsXG4gICAgdHJhY2tpbmdObzogdFBhY2thZ2UudHJhY2tpbmdObyxcbiAgICBza3lib3g6IHRQYWNrYWdlLnNreWJveCxcbiAgICBkYXRlUmVjaWV2ZWQgOiBtb21lbnQoKS51bml4KCksIFxuICAgIGF3YjowLCBcbiAgICBtaWQ6MCxcbiAgICB2b2x1bWU6IGdldFBhY2thZ2VWb2x1bW5lKHRQYWNrYWdlKSxcbiAgICB3ZWlnaHQ6dFBhY2thZ2Uud2VpZ2h0LFxuICAgIHBpZWNlczp0UGFja2FnZS5waWVjZXMsXG4gICAgY3VzdG9tZXI6IHRQYWNrYWdlLmN1c3RvbWVyLFxuICAgIHNoaXBwZXI6IHRQYWNrYWdlLnNoaXBwZXIsXG4gICAgZGVzY3JpcHRpb246IHRQYWNrYWdlLmRlc2NyaXB0aW9uLFxuICAgIGRpbWVuc2lvbnM6dFBhY2thZ2UuZGltZW5zaW9ucyxcbiAgICBjYXJyaWVyOnRQYWNrYWdlLmNhcnJpZXIsXG4gICAgLy9za3lib3hWOiB0UGFja2FnZS5za3lib3gsIGFkZCBkaW1lbmlvbiBcbiAgICBzdGF0dXM6IHRQYWNrYWdlLnN0YXR1cyxcbiAgICBtaWQ6IHRQYWNrYWdlLm1pZCxcbiAgICB2YWx1ZTogdFBhY2thZ2UudmFsdWUsXG4gICAgXG4gIH07XG4gIGNvbnNvbGUubG9nKFwiYWJvdXQgdG8gYWRkIHRoZSBwYWNrYWdlIHRvIHRoZSBpbmRleFwiKTtcbiAgcmV0dXJuIHBhY2thZ2VEb2N1bWVudDtcbn1cbmZ1bmN0aW9uIHNldFBhY2thZ2VJblRyYW5zaXQoa2V5cywgbXNlYXJjaGVyKSB7XG4gIHJldHVybiBuZXcgUHJvbWlzZSgocmVzb2x2ZSwgcmVqZWN0KSA9PiB7XG4gICAgdmFyIGJhdGNoZXIgPSBtc2VhcmNoZXIuY2xpZW50LmJhdGNoKCk7XG4gICAga2V5cy5mb3JFYWNoKGVsZW1lbnQgPT4ge1xuICAgICAgdmFyIHZhbHVlID0ge1xuICAgICAgICBzdGF0dXM6IDIsXG4gICAgICAgIGxvY2F0aW9uOiBcIkluIFRyYW5zaXRcIlxuICAgICAgfTtcbiAgICAgIGNvbnNvbGUubG9nKGVsZW1lbnQgKyBcImlzIHRoZSBlbGVtZW50XCIpO1xuXG4gICAgICBiYXRjaGVyLmhtc2V0KFBLR19QUkVGSVggKyBlbGVtZW50LCB2YWx1ZSk7XG4gICAgfSk7XG4gICAgYmF0Y2hlci5leGVjKChlcnIsIHJlc3VsdCkgPT4ge1xuICAgICAgY29uc29sZS5sb2cocmVzdWx0KTtcbiAgICAgIC8vcmVhZGQgdGhlIGRvY3VtZW50cyBoZXJlXG4gICAgICBrZXlzLmZvckVhY2goZWxlbWVudCA9PiB7XG4gICAgICAgIGFkZFBhY2thZ2VUb0luZGV4KGVsZW1lbnQsIG1zZWFyY2hlcik7XG4gICAgICB9KTtcbiAgICAgIHJlc29sdmUocmVzdWx0KTtcbiAgICB9KTtcbiAgfSk7XG59XG5cbmZ1bmN0aW9uIGFkZFBhY2thZ2VUb0luZGV4KHRyYWNraW5nTm8sIG1zZWFyY2hlcikge1xuICBscmVkaXMuZ2V0UGFja2FnZSh0cmFja2luZ05vKS50aGVuKHBhY2sgPT4ge1xuICAgIG1zZWFyY2hlci5kZWxEb2N1bWVudChQS0dfSURYLCBgJHtwYWNrLm1pZH0tJHt0cmFja2luZ05vfWAsIChlcnIsIGRvbmUpID0+IHtcbiAgICAgIHZhciBkb2N1bWVudCA9IGNyZWF0ZURvY3VtZW50KHBhY2spO1xuICAgICAgY29uc29sZS5sb2coXCJyZWFkZGluZyBwYWNrYWdlIHRvIHRoZSBpbmRleCBsaWtlIGEgYm9zcyBcIiArIHRyYWNraW5nTm8pO1xuICAgICAgbXNlYXJjaGVyLmFkZChwYWNrLm1pZCArIFwiLVwiICsgcGFjay50cmFja2luZ05vLCBkb2N1bWVudCk7XG4gICAgfSk7XG4gIH0pO1xufVxuZXhwb3J0IGNsYXNzIFBhY2thZ2VTZXJ2aWNlIHtcbiAgY29uc3RydWN0b3IoKSB7XG4gICAgdGhpcy5zZXR1cEluZGV4KCk7XG4gIH1cbiAgc2V0dXBJbmRleCgpIHtcbiAgICB0aGlzLm15U2VhcmNoID0gcmVkaXNTZWFyY2gocmVkaXMsIFBLR19JRFgsIHtcbiAgICAgIGNsaWVudE9wdGlvbnM6IGxyZWRpcy5zZWFyY2hDbGllbnREZXRhaWxzXG4gICAgfSk7XG4gIH1cbiAgZ2V0TmV3QXdiKCl7XG4gICAgcmV0dXJuIG5ldyBQcm9taXNlKChyZXNvbHZlLHJlamVjdCk9PntcbiAgICAgIGRhdGFDb250ZXh0LnJlZGlzQ2xpZW50LmV4aXN0cyhBV0JfSUQsKGVycixyZXN1bHQpPT57XG4gICAgICAgIGNvbnNvbGUubG9nKHJlc3VsdCk7IFxuICAgICAgICBpZiAocmVzdWx0ICE9IFwiMVwiKXtcbiAgICAgICAgICBkYXRhQ29udGV4dC5yZWRpc0NsaWVudC5zZXQoQVdCX0lEID09IDEwMDAwMCwoZXJyLGluaXRSZXN1bHQpPT57XG4gICAgICAgICAgICBkYXRhQ29udGV4dC5yZWRpc0NsaWVudC5pbmNyKEFXQl9JRCwoZXJyLG5ld0lkKT0+e1xuICAgICAgICAgICAgICByZXNvbHZlKHthd2I6bmV3SWR9KVxuICAgICAgICAgICAgfSlcbiAgICAgICAgICB9KVxuICAgICAgICB9XG4gICAgICAgIGVsc2Uge1xuICAgICAgICAgIGRhdGFDb250ZXh0LnJlZGlzQ2xpZW50LmluY3IoQVdCX0lELChlcnIsbmV3SWQpPT57XG4gICAgICAgICAgICByZXNvbHZlKHthd2I6bmV3SWR9KVxuICAgICAgICAgIH0pXG4gICAgICAgIH1cbiAgICAgIH0pXG4gICAgfSk7XG4gIH1cbiAgc2F2ZUF3Yihhd2Ipe1xuICAgIHJldHVybiBuZXcgUHJvbWlzZSgocmVzb2x2ZSxyZWplY3QpPT57XG4gICAgICBjb25zb2xlLmxvZygnc2F2aW5nLi4uJyxhd2IsbW9tZW50KCkudG9TdHJpbmcoXCJoaDptbTpzc1wiKSlcbiAgICAgIGlmIChhd2IuaWQgIT1cIlwiKXtcbiAgICAgICAgYXdiLnVwZGF0ZWRfYnkgPSBhd2IudXNlcm5hbWU7IFxuICAgICAgICBhd2IuZGF0ZV91cGRhdGVkID0gbW9tZW50KCkudW5peCgpOyBcbiAgICAgICAgYXdiSW5kZXgudXBkYXRlKGF3Yi5pZCxhd2IsKGVycjEsYXdiUmVzKT0+e1xuICAgICAgICAgIGlmIChlcnIxKXtcbiAgICAgICAgICAgIGNvbnNvbGUubG9nKCdzYXZpbmcgZXJyJyxlcnIxKVxuICAgICAgICAgICAgcmVzb2x2ZSh7c2F2ZWQ6ZmFsc2V9KVxuICAgICAgICAgIH1cbiAgICAgICAgICByZXNvbHZlKHtzYXZlZDp0cnVlLCBpZDphd2IuaWR9KVxuICAgICAgICB9KVxuICAgICAgfVxuICAgICAgZWxzZXtcbiAgICAgIGRhdGFDb250ZXh0LnJlZGlzQ2xpZW50LmluY3IoQVdCX0lELChlcnIscmVwbHkpPT57XG4gICAgICAgIGF3Yi5pZCA9IHJlcGx5OyBcbiAgICAgICAgYXdiLnN0YXR1cyA9IDE7IFxuICAgICAgICBpZiAoYXdiLmludm9pY2Upe1xuICAgICAgICAgIGF3Yi5oYXNEb2NzID0gMVxuICAgICAgICAgIGNvbnNvbGUubG9nKFwiSEFTIERPQ0NDQ0NcIilcbiAgICAgICAgfVxuICAgICAgICBlbHNlIHtcbiAgICAgICAgICBhd2IuaGFzRG9jcyA9IDAgOyBcbiAgICAgICAgICBjb25zb2xlLmxvZyhcIkhBUyBOTyBET0NDQ0NDXCIpXG4gICAgICAgIH1cblxuICAgICAgICBhd2IuY3JlYXRlZF9ieSA9IGF3Yi51c2VybmFtZTsgXG4gICAgICAgIGRlbGV0ZSBhd2IudXNlcm5hbWU7XG4gICAgICAgIGF3Yi5kYXRlQ3JlYXRlZCA9IG1vbWVudCgpLnVuaXgoKTsgXG4gICAgICAgICAgYXdiSW5kZXguYWRkKGF3Yi5pZCxhd2IsKGVycjEsYXdiUmVzKT0+e1xuICAgICAgICAgICAgaWYgKGVycjEpe1xuICAgICAgICAgICAgICBjb25zb2xlLmxvZygnc2F2aW5nIGVycicsZXJyMSlcbiAgICAgICAgICAgICAgcmVzb2x2ZSh7c2F2ZWQ6ZmFsc2V9KVxuICAgICAgICAgICAgfVxuICAgICAgICAgICAgcmVzb2x2ZSh7c2F2ZWQ6dHJ1ZSwgaWQ6cmVwbHl9KVxuICAgICAgICAgIH0pXG4gICAgICB9KVxuICAgIH1cbiAgICAgIFxuICAgICAgXG4gICAgfSlcbiAgfVxuICBnZXRBd2JPdmVydmlldyhpZCl7XG4gICAgLy8gZ2V0IHRoZSBhd2IgcGFja2FnZXMgYW5kIGFkZCBldmVyeXRoaW5nIGluIFxuICAgIHJldHVybiBuZXcgUHJvbWlzZSgocmVzb2x2ZSxyZWplY3QpPT57XG4gICAgICBwYWNrYWdlSW5kZXguc2VhcmNoKGBAYXdiOlske2lkfSAke2lkfV1gLHtudW1iZXJPZlJlc3VsdHM6NTAwMCxvZmZzZXQ6MH0sKGVycixwYWNrYWdlcyk9PntcbiAgICAgICAgdmFyIHdlaWdodCA9IDAgOyBcbiAgICAgICAgdmFyIHBpZWNlcyA9IHBhY2thZ2VzLnRvdGFsUmVzdWx0czsgXG4gICAgICAgIHZhciBkZXNjcmlwdGlvbiA9IFwiXCJcbiAgICAgICAgcGFja2FnZXMucmVzdWx0cy5mb3JFYWNoKHBhY2thZ2UxID0+IHtcbiAgICAgICAgICBpZiAoZGVzY3JpcHRpb24gPT1cIlwiKVxuICAgICAgICAgICAgZGVzY3JpcHRpb24gPSBwYWNrYWdlMS5kb2MuZGVzY3JpcHRpb247IFxuICAgICAgICAgIHdlaWdodCArPSBOdW1iZXIocGFja2FnZTEuZG9jLndlaWdodClcbiAgICAgICAgfSk7XG4gICAgICAgIHZhciBkYXRhICA9IHt3ZWlnaHQ6d2VpZ2h0LGRlc2NyaXB0aW9uOmRlc2NyaXB0aW9uLHBpZWNlczpwaWVjZXN9XG4gICAgICAgIGNvbnNvbGUubG9nKGRhdGEsXCJBV0IgREVUQUlMU1wiKTsgXG4gICAgICAgIHJlc29sdmUoIGRhdGEpXG4gICAgICB9KVxuICAgIH0pXG4gICBcbiAgfVxuICBnZXRBd2JEZXRhaWxzKGlkKXtcbiAgICB2YXIgc3J2ID0gdGhpczsgXG4gICAgcmV0dXJuIG5ldyBQcm9taXNlKChyZXNvbHZlLHJlamVjdCk9PntcbiAgICAgIGNvbnNvbGUubG9nKGBAYXdiOlske2lkfSAke2lkfV1gKVxuICAgICBcbiAgICAgIHBhY2thZ2VJbmRleC5zZWFyY2goYEBhd2I6WyR7aWR9ICR7aWR9XWAse251bWJlck9mUmVzdWx0czo1MDAwLG9mZnNldDowfSwoZXJyLHBhY2thZ2VzKT0+e1xuICAgICAgICBpZiAoZXJyKVxuICAgICAgICAgY29uc29sZS5sb2coZXJyKVxuICAgICAgXG4gICAgICAgIHZhciAgcGFja2FnZWxpc3QgID0gW11cbiAgICAgICAgdmFyIGNvdW50ID0gMTsgXG4gICAgICAgIHBhY2thZ2VzLnJlc3VsdHMuZm9yRWFjaChwYWNrYWdlMSA9PiB7XG5cbiAgICAgICAgICBpZiAocGFja2FnZTEuZG9jLnRyYWNraW5nTm8ubGVuZ3RoID4gNyl7XG4gICAgICAgICAgICAvL29ubHkgZGlzcGxheSB0aGUgbGFzdCA3IFxuICAgICAgICAgICAgcGFja2FnZTEuZG9jLnRyYWNraW5nTm8gPSBwYWNrYWdlMS5kb2MudHJhY2tpbmdOby5zdWJzdHJpbmcocGFja2FnZTEuZG9jLnRyYWNraW5nTm8ubGVuZ3RoIC03KVxuICAgICAgICAgICAgXG4gICAgICAgICAgfVxuICAgICAgICAgIHBhY2thZ2UxLmRvYy5wYWNrYWdlSW5kZXggPSBjb3VudDtcbiAgICAgICAgICBjb3VudCArKzsgXG4gICAgICAgICAgcGFja2FnZWxpc3QucHVzaCggcGFja2FnZTEuZG9jKVxuICAgICAgICB9KTtcbiAgICAgICBcbiAgICAgICBcbiAgICAgICAgcmVzb2x2ZSggcGFja2FnZWxpc3QpXG4gICAgICB9KVxuICAgIH0pXG4gIH1cbiAgbGlzdE5vRG9jc0ZsbCgpe1xuICAgIHJldHVybiBuZXcgUHJvbWlzZSgocmVzb2x2ZSxyZWplY3QpPT57XG4gICAgICAgYXdiSW5kZXguc2VhcmNoKFwiQHN0YXR1czpbMSAxXSBAaGFzRG9jczpbMCAwXVwiLHtvZmZzZXQ6MCxudW1iZXJPZlJlc3VsdHM6NTAwMCxzb3J0Qnk6J2lkJ30sKGVycixhd2JzKT0+e1xuICAgICAgICAgdmFyIGF3Ykxpc3QgPSBbXTsgXG4gICAgICAgICBQcm9taXNlLmFsbChhd2JzLnJlc3VsdHMubWFwKGF3Yj0+Y3VzdG9tZXJTZXJ2aWNlLmdldEN1c3RvbWVyKGF3Yi5kb2MuY3VzdG9tZXJJZCkpKS50aGVuKGN1c3RvbWVycz0+e1xuICAgICAgICAgICBQcm9taXNlLmFsbChhd2JzLnJlc3VsdHMubWFwKGF3Yj0+dGhpcy5nZXRBd2JPdmVydmlldyhhd2IuZG9jLmlkKSkpLnRoZW4oZGV0YWlscz0+e1xuICAgICAgICAgICAgY29uc29sZS5sb2coXCJnb3QgdGhlIGN1c3RvbWVyc1wiLGN1c3RvbWVycywgYXdicylcbiAgICAgICAgICAgIGZvcih2YXIgaSA9MCA7IGkgPCBhd2JzLnJlc3VsdHMubGVuZ3RoIDsgaSsrICl7XG4gICAgICAgICAgICAgIHZhciBhd2IgPSBhd2JzLnJlc3VsdHNbaV07IFxuICAgICAgICAgICAgICBhd2IuZG9jLmRhdGVDcmVhdGVkID0gbW9tZW50LnVuaXgoYXdiLmRvYy5kYXRlQ3JlYXRlZCkuZm9ybWF0KFwiWVlZWS1NTS1ERCBoaDptbSBBXCIpXG4gICAgICAgICAgICAgIC8vd2UgbmVlZCB0byBnZXQgdGhlIGN1c3RvbWVyIFxuICAgICAgICAgICAgICBhd2IuZG9jLmNvbnNpZ25lZSA9IGN1c3RvbWVyc1tpXS5uYW1lOyBcbiAgICAgICAgICAgICAgYXdiLmRvYy53ZWlnaHQgPSBkZXRhaWxzW2ldLndlaWdodDsgXG4gICAgICAgICAgICAgIGF3Yi5kb2MucG1iID0gY3VzdG9tZXJzW2ldLnBtYjsgXG4gICAgICAgICAgICAgIGF3Yi5kb2MuZGVzY3JpcHRpb24gPSBkZXRhaWxzW2ldLmRlc2NyaXB0aW9uOyBcbiAgICAgICAgICAgICAgYXdiLmRvYy5waWVjZXMgPSBkZXRhaWxzW2ldLnBpZWNlczsgXG4gICAgICAgICAgICAgIGlmIChjdXN0b21lcnNbaV0ucG1iID09ICcnKXtcbiAgICAgICAgICAgICAgICBhd2IuZG9jLnBtYiA9ICc5MDAwJ1xuICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgIGNvbnNvbGUubG9nKCdwdXNoaW5nICcsYXdiKVxuICAgICAgICAgICAgICAvL3dlIG5lZWQgdG8gZ2V0IGFsbCB0aGUgcGFja2FnZXMgXG4gICAgICAgICAgICAgIGF3Ykxpc3QucHVzaChhd2IuZG9jKVxuICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICByZXNvbHZlKHthd2JzOmF3Ykxpc3R9KVxuICAgICAgICAgICB9KVxuICAgICAgICAgIFxuICAgICAgICAgIH0pLmNhdGNoKGVycj0+e1xuICAgICAgICAgICAgY29uc29sZS5sb2coZXJyKTsgXG4gICAgICAgICAgfSlcbiAgICAgICAgIFxuICAgICAgICAvLyAgYXdicy5yZXN1bHRzLmZvckVhY2goYXdiID0+IHtcbiAgICAgICAgICAgXG4gICAgICAgICAgXG4gICAgICAgIC8vICB9KTtcbiAgICAgICAgIFxuICAgICAgIH0pXG4gICAgfSlcbiAgfVxuXG4gIGxpc3RBd2JpbkZsbCgpe1xuICAgIHJldHVybiBuZXcgUHJvbWlzZSgocmVzb2x2ZSxyZWplY3QpPT57XG4gICAgICAgYXdiSW5kZXguc2VhcmNoKFwiQHN0YXR1czpbMSAxXSBAaGFzRG9jczpbMSAxXVwiLHtvZmZzZXQ6MCxudW1iZXJPZlJlc3VsdHM6NTAwMCxzb3J0Qnk6J2lkJ30sKGVycixhd2JzKT0+e1xuICAgICAgICAgdmFyIGF3Ykxpc3QgPSBbXTsgXG4gICAgICAgICBQcm9taXNlLmFsbChhd2JzLnJlc3VsdHMubWFwKGF3Yj0+Y3VzdG9tZXJTZXJ2aWNlLmdldEN1c3RvbWVyKGF3Yi5kb2MuY3VzdG9tZXJJZCkpKS50aGVuKGN1c3RvbWVycz0+e1xuICAgICAgICAgICBQcm9taXNlLmFsbChhd2JzLnJlc3VsdHMubWFwKGF3Yj0+dGhpcy5nZXRBd2JPdmVydmlldyhhd2IuZG9jLmlkKSkpLnRoZW4oZGV0YWlscz0+e1xuICAgICAgICAgICAgY29uc29sZS5sb2coXCJnb3QgdGhlIGN1c3RvbWVyc1wiLGN1c3RvbWVycywgYXdicylcbiAgICAgICAgICAgIGZvcih2YXIgaSA9MCA7IGkgPCBhd2JzLnJlc3VsdHMubGVuZ3RoIDsgaSsrICl7XG4gICAgICAgICAgICAgIHZhciBhd2IgPSBhd2JzLnJlc3VsdHNbaV07IFxuICAgICAgICAgICAgICBhd2IuZG9jLmRhdGVDcmVhdGVkID0gbW9tZW50LnVuaXgoYXdiLmRvYy5kYXRlQ3JlYXRlZCkuZm9ybWF0KFwiWVlZWS1NTS1ERCBoaDptbSBBXCIpXG4gICAgICAgICAgICAgIC8vd2UgbmVlZCB0byBnZXQgdGhlIGN1c3RvbWVyIFxuICAgICAgICAgICAgICBhd2IuZG9jLmNvbnNpZ25lZSA9IGN1c3RvbWVyc1tpXS5uYW1lOyBcbiAgICAgICAgICAgICAgYXdiLmRvYy5wbWIgPSBjdXN0b21lcnNbaV0ucG1iOyBcbiAgICAgICAgICAgICAgYXdiLmRvYy53ZWlnaHQgPSBkZXRhaWxzW2ldLndlaWdodDsgXG4gICAgICAgICAgICAgIGF3Yi5kb2MuZGVzY3JpcHRpb24gPSBkZXRhaWxzW2ldLmRlc2NyaXB0aW9uOyBcbiAgICAgICAgICAgICAgYXdiLmRvYy5waWVjZXMgPSBkZXRhaWxzW2ldLnBpZWNlczsgXG4gICAgICAgICAgICAgIGlmIChjdXN0b21lcnNbaV0ucG1iID09ICcnKXtcbiAgICAgICAgICAgICAgICBhd2IuZG9jLnBtYiA9ICc5MDAwJ1xuICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgIGNvbnNvbGUubG9nKCdwdXNoaW5nICcsYXdiKVxuICAgICAgICAgICAgICAvL3dlIG5lZWQgdG8gZ2V0IGFsbCB0aGUgcGFja2FnZXMgXG4gICAgICAgICAgICAgIGF3Ykxpc3QucHVzaChhd2IuZG9jKVxuICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICByZXNvbHZlKHthd2JzOmF3Ykxpc3R9KVxuICAgICAgICAgICB9KVxuICAgICAgICAgIFxuICAgICAgICAgIH0pLmNhdGNoKGVycj0+e1xuICAgICAgICAgICAgY29uc29sZS5sb2coZXJyKTsgXG4gICAgICAgICAgfSlcbiAgICAgICAgIFxuICAgICAgICAvLyAgYXdicy5yZXN1bHRzLmZvckVhY2goYXdiID0+IHtcbiAgICAgICAgICAgXG4gICAgICAgICAgXG4gICAgICAgIC8vICB9KTtcbiAgICAgICAgIFxuICAgICAgIH0pXG4gICAgfSlcbiAgfVxuICBnZXRBd2IoaWQpe1xuICAgIGNvbnN0IHNydiA9IHRoaXM7IFxuICAgIHJldHVybiBuZXcgUHJvbWlzZSgocmVzb2x2ZSxyZWplY3QpPT57XG4gICAgICBhd2JJbmRleC5nZXREb2MoaWQsKGVycixhd2IpPT57XG4gICAgICAgIC8vZ2V0IHRoZSBjdXN0b21lciBcbiAgICAgICAgY3VzdG9tZXJTZXJ2aWNlLmdldEN1c3RvbWVyKGF3Yi5kb2MuY3VzdG9tZXJJZCkudGhlbihjdXN0b21lcj0+e1xuICAgICAgICAgIGF3Yi5kb2MuY3VzdG9tZXIgPSBjdXN0b21lcjsgXG4gICAgICAgICAgc3J2LmdldEF3YkRldGFpbHMoaWQpLnRoZW4ocGFja2FnZXM9PntcbiAgICAgICAgICAgIC8vZ2V0IHRoZSBwYWNrYWdlcyBmb3IgdGhlIGF3YiBcbiAgICAgICAgICAgIGF3Yi5kb2MucGFja2FnZXMgPSBwYWNrYWdlczsgXG4gICAgICAgICAgICByZXNvbHZlKHthd2I6YXdiLmRvY30pICBcbiAgICAgICAgICB9KVxuICAgICAgICAgIFxuICAgICAgICB9KVxuICAgICAgICBcbiAgICAgIH0pXG4gICAgfSlcbiAgfVxuICB1cGRhdGVMb2NhdGlvbih0cmFja2luZ051bWJlcixsb2NhdGlvbl9pZCl7XG4gICAgcmV0dXJuIG5ldyBQcm9taXNlKChyZXNvbHZlLHJlamVjdCk9PntcbiAgICAgIHBhY2thZ2VJbmRleC5zZWFyY2goXCJAdHJhY2tpbmdObzpcIit0cmFja2luZ051bWJlcix7bG9jYXRpb246bG9jYXRpb25faWR9LChlcnIscGFja2FnZVJlc3VsdCk9PntcblxuICAgICAgfSlcbiAgICB9KVxuICB9XG4gIHNhdmVQYWNrYWdlVG9Bd2IobmV3UGFja2FnZSl7XG4gICAgcmV0dXJuIG5ldyBQcm9taXNlKChyZXNvbHZlLHJlc3VsdCk9PntcbiAgICAgIGlmIChuZXdQYWNrYWdlLmlkICE9XCIwXCIpe1xuICAgICAgICBwYWNrYWdlSW5kZXgudXBkYXRlKG5ld1BhY2thZ2UuaWQsbmV3UGFja2FnZSwoZXJyLHJlc3VsdCk9PntcbiAgICAgICAgICBpZiAoZXJyKVxuICAgICAgICAgICAgY29uc29sZS5sb2coZXJyKTsgXG4gICAgICAgICAgcmVzb2x2ZSh7c2F2ZWQ6dHJ1ZSxpZDpuZXdQYWNrYWdlLmlkfSlcbiAgICAgICAgfSlcbiAgICAgIH1cbiAgICAgIGVsc2Uge1xuICAgICAgICBkYXRhQ29udGV4dC5yZWRpc0NsaWVudC5pbmNyKFBLR19JRF9DT1VOVEVSLChlcnIsaWQpPT57XG4gICAgICAgICAgbmV3UGFja2FnZS5pZCA9IGlkOyBcbiAgICAgICAgICBwYWNrYWdlSW5kZXguYWRkKGlkLG5ld1BhY2thZ2UsKGVycixyZXN1bHQpPT57XG4gICAgICAgICAgICBpZiAoZXJyKVxuICAgICAgICAgICAgICBjb25zb2xlLmxvZyhlcnIpOyBcbiAgICAgICAgICAgIHJlc29sdmUoe3NhdmVkOnRydWUsaWQ6aWR9KVxuICAgICAgICAgIH0pXG4gICAgICAgIH0pXG4gICAgICB9XG4gICBcbiAgICB9KVxuICB9XG4gIGNyZWF0ZUNvbnNvbGF0ZWQocGFja2FnZXMsdXNlcm5hbWUpe1xuICAgIHZhciBzcnYgPSB0aGlzOyBcbiAgICByZXR1cm4gbmV3IFByb21pc2UoKHJlc29sdmUscmVqZWN0KT0+e1xuICAgICAgdmFyIGF3YkluZm8gPSB7IFxuICAgICAgICBpZDogXCJcIixcbiAgICAgICAgaXNTZWQ6MCxcbiAgICAgICAgaGFzRG9jczogXCIwXCIsXG4gICAgICAgIGludm9pY2VOdW1iZXI6XCJcIixcbiAgICAgICAgdmFsdWU6XCIwXCIsXG4gICAgICAgIGN1c3RvbWVySWQ6MjQxOTcsXG4gICAgICAgIHNoaXBwZXI6XCI0ODJcIiwgLy8gd2Ugc2hvdWxkIGdldCBhbiBpZCBoZXJlIFxuICAgICAgICBjYXJyaWVyOlwiVVNQU1wiLFxuICAgICAgICBoYXptYXQ6XCJcIixcbiAgICAgICAgdXNlcm5hbWU6ICB1c2VybmFtZVxuICAgICAgIFxuICAgIH07XG4gICAgc3J2LnNhdmVBd2IoYXdiSW5mbykudGhlbihhd2JSZXN1bHQ9PntcbiAgICAgICAvL2FkZCBcbiAgICAgICAgICB2YXIgY1BhY2thZ2UgPSB7XG4gICAgICAgICAgICBpZDowLFxuICAgICAgICAgICAgdHJhY2tpbmdObzogdW5pcUlkKCksXG4gICAgICAgICAgICBkZXNjcmlwdGlvbjogXCJDb25zb2xpZGF0ZWQgUGFja2FnZVwiLFxuICAgICAgICAgICAgd2VpZ2h0OjAsIFxuICAgICAgICAgICAgZGltZW5zaW9uczogXCIweDB4MFwiLFxuICAgICAgICAgICAgYXdiOmF3YlJlc3VsdC5pZCwgXG4gICAgICAgICAgICBpc0NvbnNvbGlkYXRlZDogXCIxXCIsIFxuICAgICAgICAgICAgY3JlYXRlZF9ieTogdXNlcm5hbWUsIFxuICAgICAgICAgIFxuICAgICAgICB9OyBcbiAgICAgICAgc3J2LnNhdmVQYWNrYWdlVG9Bd2IoY1BhY2thZ2UpLnRoZW4ocGtnUmVzdWx0PT57XG4gICAgICAgICAgLy8gZ2V0IHRoZSBpZCBcbiAgICAgICAgICAvL1xuICAgICAgICAgIHZhciBiYXRjaCA9IGRhdGFDb250ZXh0LnJlZGlzQ2xpZW50LmJhdGNoKCk7IFxuICAgICAgICAgIHBhY2thZ2VzLmZvckVhY2gocGtnID0+IHtcbiAgICAgICAgICAgIC8vdGhlc2UgYXJlIGJhcmNvZGVzIFxuICAgICAgICAgICAgYmF0Y2guc2FkZChcImNvbnNvbGlkYXRlZDpwa2c6XCIrcGtnUmVzdWx0LmlkLHBrZylcbiAgICAgICAgICB9KTtcbiAgICAgICAgICBiYXRjaC5leGVjKChlcnIscmVzdWx0cyk9PntcbiAgICAgICAgICAgIHJlc29sdmUoe3NhdmVkOnRydWUsaWQ6cGtnUmVzdWx0LmlkfSlcbiAgICAgICAgICB9KVxuICAgICAgICB9KVxuICAgICAgICBcbiAgICB9KVxuXG4gICBcbiAgICAgIC8vdmFsaWRhdGUgdGhlIHBhY2thZ2UgXG4gICAgXG5cbiAgICB9KVxuICB9XG4gIHNhdmVQYWNrYWdlKGJvZHkpe1xuICAgIHJldHVybiBuZXcgUHJvbWlzZSgocmVzb2x2ZSxyZWplY3QpPT57XG4gICAgICB2YXIgY1BhY2thZ2UgPSB7XG4gICAgICAgIFxuICAgICAgICBza3lib3g6IGJvZHkuc2t5Ym94LFxuICAgICAgICBjdXN0b21lcjogYm9keS5jdXN0b21lci5yZXBsYWNlKFwiLVwiLCBcIlwiKS50cmltKCksXG4gICAgICAgIHRyYWNraW5nTm86IGJvZHkudHJhY2tpbmcsXG4gICAgICAgIGRlc2NyaXB0aW9uOiBib2R5LmRlc2NyaXB0aW9uLFxuICAgICAgICBzaGlwcGVyOiBib2R5LnNoaXBwZXIsXG4gICAgICAgIGNhcnJpZXI6Ym9keS5jYXJyaWVyLFxuICAgICAgICB2YWx1ZTogTnVtYmVyKGJvZHkudmFsdWUpLFxuICAgICAgICBwaWVjZXM6IE51bWJlcihib2R5LnBpZWNlcyksXG4gICAgICAgIHdlaWdodDogTnVtYmVyKGJvZHkud2VpZ2h0KSxcbiAgICAgICAgZGltZW5zaW9uczogYm9keS5kaW1lbnNpb25zLFxuICAgICAgICBzdGF0dXM6IDEsXG4gICAgICAgIGxvY2F0aW9uOiBcIkZMTFwiLFxuICAgICAgICBtaWQ6IDAsXG4gICAgICAgIGF3YjowLFxuICAgICAgICAvL2hhc09wdDogdHJ1ZSxcbiAgICAgICAgLy9tdHlwZTogYm9keS5tdHlwZVxuICAgICAgfTtcbiAgICAgIC8vdmFsaWRhdGUgdGhlIHBhY2thZ2UgXG4gICAgICBkYXRhQ29udGV4dC5yZWRpc0NsaWVudC5pbmNyKFBLR19JRF9DT1VOVEVSLChlcnIsaWQpPT57XG4gICAgICAgIGNQYWNrYWdlLmlkID0gaWQ7IFxuICAgICAgICBkYXRhQ29udGV4dC5yZWRpc0NsaWVudC5zZXQoUEtHX1BSRUZJWCtpZCxjUGFja2FnZSwoZXJyLHJlc3BvbnNlKT0+e1xuICAgICAgICAgIGlmIChlcnIpe1xuICAgICAgICAgICAgcmVqZWN0KHtzYXZlZDpmYWxzZSxlcnI6ZXJyfSlcbiAgICAgICAgICB9XG4gICAgICAgICAgIHZhciBpbmRleFBhY2thZ2UgPSAgY3JlYXRlRG9jdW1lbnQoY1BhY2thZ2UpOyBcbiAgICAgICAgICAgY29uc29sZS5sb2coaW5kZXhQYWNrYWdlKTsgXG4gICAgICAgICAgIHBhY2thZ2VJbmRleC5hZGQoY1BhY2thZ2UuaWQsaW5kZXhQYWNrYWdlLChlcnIxLGRvY1Jlc3VsdCk9PntcbiAgICAgICAgICAgICBjb25zb2xlLmxvZyhkb2NSZXN1bHQpOyBcbiAgICAgICAgICAgICBpZihlcnIxKXtcbiAgICAgICAgICAgICAgIHJlamVjdCh7c2F2ZWQ6ZmFsc2UsZXJyOmVycjF9KVxuICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICByZXNvbHZlKHtzYXZlZDp0cnVlfSlcbiAgICAgICAgICAgfSlcblxuICAgICAgICB9KVxuICAgICAgfSk7XG4gICAgXG5cblxuICAgIH0pXG4gIH1cblxuICBnZXRNYW5pZmVzdFBhY2thZ2VzKCl7XG4gICAgcmV0dXJuIG5ldyBQcm9taXNlKChyZXNvbHZlLHJlamVjdCk9PntcbiAgICAgIFxuICAgICAgdGhpcy5teVNlYXJjaC5zZWFyY2goXG4gICAgICAgIGBAbWlkOlswIDBdYCxcbiAgICAgICAgeyBvZmZzZXQ6IDAsIG51bWJlck9mUmVzdWx0czogNTAwMCB9LFxuICAgICAgICAoZXJyLCBkYXRhKSA9PiB7XG4gICAgICAgICAgdmFyIHBhY2thZ2VzID0gW107XG4gICAgICAgICAgY29uc29sZS5sb2coZGF0YSk7XG4gICAgICAgICAgZGF0YS5yZXN1bHRzLmZvckVhY2goZWxlbWVudCA9PiB7XG5cbiAgICAgICAgICAgIHBhY2thZ2VzLnB1c2goZWxlbWVudC5kb2MpO1xuICAgICAgICAgICAgcmVzb2x2ZShwYWNrYWdlcyk7ICAgICAgICAgICAgICAgICBcbiAgICAgICAgfSk7XG4gICAgfSk7XG4gICAgfSlcbiAgfVxuICBnZXRSZWNlaXZlZFBhY2thZ2VzKHBhZ2UscGFnZVNpemUpe1xuICAgIHJldHVybiBuZXcgUHJvbWlzZSgocmVzb2x2ZSxyZWplY3QpPT57XG4gICAgICBcbiAgICAgIHRoaXMubXlTZWFyY2guc2VhcmNoKFxuICAgICAgICBgQG1pZDpbMCAwXWAsXG4gICAgICAgIHsgb2Zmc2V0OiAwLCBudW1iZXJPZlJlc3VsdHM6IDUwMDAgfSxcbiAgICAgICAgKGVyciwgZGF0YSkgPT4ge1xuICAgICAgICAgIHZhciBwYWNrYWdlcyA9IFtdO1xuICAgICAgICAgIGNvbnNvbGUubG9nKGRhdGEpO1xuICAgICAgICAgIGRhdGEucmVzdWx0cy5mb3JFYWNoKGVsZW1lbnQgPT4ge1xuXG4gICAgICAgICAgICBwYWNrYWdlcy5wdXNoKGVsZW1lbnQuZG9jKTtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBcbiAgICAgICAgfSk7XG4gICAgICAgIHJlc29sdmUocGFja2FnZXMpOyBcbiAgICB9KTtcbiAgICB9KVxuICB9XG4gIGdldE5vRG9jc1BhY2thY2thZ2VzKHBhZ2UscGFnZVNpemUpe1xuICAgIHJldHVybiBuZXcgUHJvbWlzZSgocmVzb2x2ZSxyZWplY3QpPT57XG4gICAgICBcbiAgICAgIHRoaXMubXlTZWFyY2guc2VhcmNoKFxuICAgICAgICBgQGhhc0RvY3M6WzAgMF1gLFxuICAgICAgICB7IG9mZnNldDogMCwgbnVtYmVyT2ZSZXN1bHRzOiA1MDAwIH0sXG4gICAgICAgIChlcnIsIGRhdGEpID0+IHtcbiAgICAgICAgICB2YXIgcGFja2FnZXMgPSBbXTtcbiAgICAgICAgICBjb25zb2xlLmxvZyhkYXRhKTtcbiAgICAgICAgICBkYXRhLnJlc3VsdHMuZm9yRWFjaChlbGVtZW50ID0+IHtcblxuICAgICAgICAgICAgcGFja2FnZXMucHVzaChlbGVtZW50LmRvYyk7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgXG4gICAgICAgIH0pO1xuICAgICAgICByZXNvbHZlKHBhY2thZ2VzKTsgXG4gICAgfSk7XG4gICAgfSlcbiAgfVxuICBnZXRwYWNrYWdlYnlSZWRpc0lkKGlkKXtcbiAgICByZXR1cm4gbmV3IFByb21pc2UoKHJlc29sdmUscmVqZWN0KT0+e1xuICAgICAgcGFja2FnZUluZGV4LmdldERvYyhpZCwoZXJyLGRvY3VtZW50KT0+e1xuICAgICAgICByZXNvbHZlKGRvY3VtZW50LmRvYyk7IFxuICAgICAgfSlcbiAgICB9KVxuICB9XG4gIGdldFBhY2thZ2VCeUlkKGJhcmNvZGUpe1xuICAgIHZhciBzcnYgPSB0aGlzOyBcbiAgICB2YXIgcGtnSWQgPSBnZXRQYWNrYWdlSWRGcm9tQmFyQ29kZShiYXJjb2RlKTsgXG4gICAgcmV0dXJuIG5ldyBQcm9taXNlKChyZXNvbHZlLHJlamVjdCk9PntcbiAgICAgIHRoaXMubXlTZWFyY2guZ2V0RG9jKHBrZ0lkLChlcnIsZG9jdW1lbnQpPT57XG4gICAgICAgIC8vZ2V0IHRoZSBhd2IgaW5mbyBoZXJlIGFzIHdlbGwgXG4gICAgICAgIHNydi5nZXRBd2IoZG9jdW1lbnQuZG9jLmF3YikudGhlbihhd2JpbmZvPT57XG4gICAgICAgICAgY29uc29sZS5sb2coYXdiaW5mbyk7IFxuICAgICAgICAgIHZhciByZXNwb25zZSA9IHsgXG4gICAgICAgICAgICBhd2IgOiBhd2JpbmZvLmF3YixcbiAgICAgICAgICAgIHBhY2thZ2UgOiBkb2N1bWVudC5kb2NcbiAgICAgICAgICB9XG4gICAgICAgICAgcmVzb2x2ZShyZXNwb25zZSk7IFxuICAgICAgICB9KTsgXG4gICAgICAgIFxuICAgICAgfSlcbiAgICB9KTsgXG4gIH1cbiAgLy91c2luZyB0aGlzIFxuICBcblxuICB1cGRhdGVNYW5pZmVzdFBhY2thZ2VUb0luVHJhbnNpdChtaWQpIHtcbiAgICAvL2dldCBhbGwgdGhlIHBhY2thZ2VzXG4gICAgLy93ZSBuZWVkIHRvIHVwZGF0ZSB0aGUgaW5kZXggYXQgdGhpcyBwb2ludCBhcyB3ZWxsXG4gICAgdmFyIG1zZWFyY2ggPSB0aGlzLm15U2VhcmNoO1xuICAgIHRoaXMubXlTZWFyY2guc2VhcmNoKFxuICAgICAgYEBtaWQ6WyR7bWlkfSAke21pZH1dYCxcbiAgICAgIHsgb2Zmc2V0OiAwLCBudW1iZXJPZlJlc3VsdHM6IDUwMDAgfSxcbiAgICAgIChlcnIsIGRhdGEpID0+IHtcbiAgICAgICAgdmFyIHBhY2thZ2VzID0gW107XG4gICAgICAgIGNvbnNvbGUubG9nKGRhdGEpO1xuICAgICAgICBkYXRhLnJlc3VsdHMuZm9yRWFjaChlbGVtZW50ID0+IHtcbiAgICAgICAgICB2YXIgb2xkRG9jSWQgPSBlbGVtZW50LmRvY0lkO1xuICAgICAgICAgIGVsZW1lbnQuZG9jSWQgPSBlbGVtZW50LmRvY0lkLnJlcGxhY2UoYCR7bWlkfS1gLCBcIlwiKTtcbiAgICAgICAgICBwYWNrYWdlcy5wdXNoKGVsZW1lbnQuZG9jSWQpO1xuICAgICAgICAgIC8vIGkgY291bGQgZGVsZXRlIGhlcmVcbiAgICAgICAgICAvLyBtc2VhcmNoLmRlbERvY3VtZW50KFBLR19JRFgsb2xkRG9jSWQpXG4gICAgICAgICAgLy91cGRhdGUgYWxsIHRoZSBwYWNrYWdlc1xuICAgICAgICB9KTtcbiAgICAgICAgc2V0UGFja2FnZUluVHJhbnNpdChwYWNrYWdlcywgbXNlYXJjaCwgbWlkKS50aGVuKGZ1bmN0aW9uKFxuICAgICAgICAgIHVwZGF0ZWRQYWNrYWdlc1xuICAgICAgICApIHtcbiAgICAgICAgICBjb25zb2xlLmxvZyhcInVwZGF0ZWQgcGFja2FnZXNcIik7XG4gICAgICAgICAgY29uc29sZS5sb2codXBkYXRlZFBhY2thZ2VzKTtcbiAgICAgICAgfSk7XG4gICAgICB9XG4gICAgKTtcbiAgfVxuICByZW1vdmVQYWNrYWdlRnJvbU1hbmlmZXN0KHBhY2thZ2VJZCwgbWlkKSB7XG4gICAgdmFyIG1zZWFyY2ggPSB0aGlzLm15U2VhcmNoO1xuICAgIHJldHVybiBuZXcgUHJvbWlzZSgocmVzb2x2ZSwgcmVqZWN0KSA9PiB7XG4gICAgICB2YXIgbWFuaWZlc3QgPSBtaWQ7XG4gICAgICB2YXIgbWFuaWZlc3RLZXkgPSBcIm1hbmlmZXN0OlwiICsgbWFuaWZlc3QgKyBcIjoqXCI7XG5cbiAgICAgIGxyZWRpcy5kZWwoXCJwYWNrYWdlczpcIiArIHRyYWNraW5nTm8pLnRoZW4oZnVuY3Rpb24ocmVzdWx0KSB7XG4gICAgICAgIGNvbnNvbGUubG9nKHJlc3VsdCk7XG4gICAgICAgIG1zZWFyY2guZGVsRG9jdW1lbnQoUEtHX0lEWCwgYCR7bWlkfS0ke3RyYWNraW5nTm99YCk7XG4gICAgICAgIC8vd2UgbmVlZCB0byByZW1vdmUgZnJvbSB0aGUgaW5kZXggYW5kIGRlYyB0aGUgY291bnRlclxuICAgICAgICBscmVkaXMuY2xpZW50LmRlY3IoXCJtY291bnRlcjpcIiArIG1pZCk7XG4gICAgICAgIC8vclNlcnZpY2VzLnBhY2thZ2VTZXJ2aWNlLnJtUGFja2FnZShtaWQsIHRyYWNraW5nTm8pO1xuICAgICAgICBscmVkaXMuZ2V0S2V5cyhtYW5pZmVzdEtleSkudGhlbihrUmVzdWx0ID0+IHtcbiAgICAgICAgICAvL3RoZSBsaXN0IG9mIGFsbCB0aGUgc2V0cyAuLi53ZSBuZWVkIHRvIHJlbW92ZSB0aGUga2V5IGZyb20gZWFjaCBvbmVcbiAgICAgICAgICB2YXIga2V5c0NvdW50ID0gMDtcblxuICAgICAgICAgIGtSZXN1bHQuZm9yRWFjaChlbGVtZW50ID0+IHtcbiAgICAgICAgICAgIGNvbnNvbGUubG9nKFxuICAgICAgICAgICAgICBgcmVtb3ZpbmcgJHt0cmFja2luZ05vfSBwYWNrYWdlIG1hbmlmZXN0IHNldCAke2VsZW1lbnR9IGBcbiAgICAgICAgICAgICk7XG4gICAgICAgICAgICBscmVkaXMuc3JlbShlbGVtZW50LCB0cmFja2luZ05vKS50aGVuKGZ1bmN0aW9uKHJSZXN1bHQpIHtcbiAgICAgICAgICAgICAgY29uc29sZS5sb2coclJlc3VsdCk7XG4gICAgICAgICAgICAgIGNvbnNvbGUubG9nKFwicmVtb3ZlZFwiKTtcbiAgICAgICAgICAgICAgaWYgKGtleXNDb3VudCA9PSBrUmVzdWx0Lmxlbmd0aCAtIDEpIGtleXNDb3VudCsrO1xuICAgICAgICAgICAgfSk7XG4gICAgICAgICAgfSk7XG4gICAgICAgICAgcmVzb2x2ZSh7XG4gICAgICAgICAgICBkZWxldGVkOiB0cnVlXG4gICAgICAgICAgfSk7XG4gICAgICAgIH0pO1xuXG4gICAgICAgIC8vd2UgYWxzbyBuZWVkIHRvIHJlbW92ZSBmcm9tIGFueSBzZXRzXG4gICAgICB9KTtcbiAgICB9KTtcbiAgfVxuICByZW1vdmVQYWNrYWdlQnlJZChpZCkge1xuICAgIHZhciBtc2VhcmNoID0gdGhpcy5teVNlYXJjaDtcbiAgICByZXR1cm4gbmV3IFByb21pc2UoKHJlc29sdmUsIHJlamVjdCkgPT4ge1xuICAgICAgXG4gICAgICBwYWNrYWdlSW5kZXguZGVsRG9jdW1lbnQoUEtHX0lEWCxpZCwoZXJyLHJlc3BvbnNlKT0+e1xuICAgICAgICBpZiAoZXJyKVxuICAgICAgICAgIGNvbnNvbGUubG9nKGVycik7IFxuICAgICAgICBjb25zb2xlLmxvZyhyZXNwb25zZSk7IFxuICAgICAgICByZXNvbHZlKHtkZWxldGVkOnRydWV9KVxuICAgICAgfSlcbiAgICAgIFxuICAgICAgICBcbiAgICAgIFxuICAgIH0pO1xuICB9XG4gIHN0b3JlUGFja2FnZUZvclBpY2t1cCh0cmFja2luZ05vLGJpbil7XG4gICAgdmFyIHNlYXJjaGVyID0gdGhpcy5teVNlYXJjaDtcbiAgICByZXR1cm4gbmV3IFByb21pc2UoKHJlc29sdmUscmVqZWN0KT0+e1xuICAgICAgIGxyZWRpcy5obXNldChQS0dfUFJFRklYK3RyYWNraW5nTm8se3N0YXR1czo0LGxvY2F0aW9uOmJpbn0pLnRoZW4oKHJlc3VsdCk9PntcbiAgICAgICAgIGxyZWRpcy5nZXRQYWNrYWdlKHRyYWNraW5nTm8pLnRoZW4oKHBrZyk9PntcbiAgICAgICAgICBhZGRQYWNrYWdlVG9JbmRleCh0cmFja2luZ05vLHNlYXJjaGVyKSA7IFxuICAgICAgICAgIHJlc29sdmUocGtnKTsgICBcbiAgICAgICAgIH0pO1xuICAgICAgIH0pIFxuICAgIH0pOyBcbiAgfVxuICB1cGRhdGVQYWNrYWdlSW5kZXgodHJhY2tpbmcpe1xuICAgICAgcmV0dXJuIG5ldyBQcm9taXNlKChyZXNvbHZlLHJlamVjdCk9PntcbiAgICAgICAgICB2YXIgbXNlYXJjaCA9IHRoaXMubXlTZWFyY2g7IFxuICAgICAgICAgIGFkZFBhY2thZ2VUb0luZGV4KHRyYWNraW5nLG1zZWFyY2gpOyBcbiAgICAgICAgIHJlc29sdmUoeyd1cGRhdGVkJzp0cnVlfSk7XG4gICAgICB9KVxuICB9XG4gIGdldEN1c3RvbWVyUGFja2FnZXMoc2t5Ym94KSB7fVxuICBnZXRNYW5pZmVzdFBhY2thZ2VzQnlTdGF0dXMobWlkLHN0YXR1cykge1xuICAgICAgcmV0dXJuIG5ldyBQcm9taXNlKChyZXNvbHZlLHJlamVjdCk9PntcbiAgICAgICAgICBjb25zb2xlLmxvZyhgQG1pZDpbJHttaWR9ICR7bWlkfV1gKVxuICAgICAgICB0aGlzLm15U2VhcmNoLnNlYXJjaChcbiAgICAgICAgICAgIGBAbWlkOlske21pZH0gJHttaWR9XWAsXG4gICAgICAgICAgICB7IG9mZnNldDogMCwgbnVtYmVyT2ZSZXN1bHRzOiA1MDAwIH0sXG4gICAgICAgICAgICAoZXJyLCBkYXRhKSA9PiB7XG4gICAgICAgICAgICAgIHZhciBwYWNrYWdlcyA9IFtdO1xuICAgICAgICAgICAgICBjb25zb2xlLmxvZyhkYXRhKTtcbiAgICAgICAgICAgICAgZGF0YS5yZXN1bHRzLmZvckVhY2goZWxlbWVudCA9PiB7XG5cbiAgICAgICAgICAgICAgICBwYWNrYWdlcy5wdXNoKGVsZW1lbnQuZG9jKTtcbiAgICAgICAgICAgICAgICByZXNvbHZlKHBhY2thZ2VzKTsgICAgICAgICAgICAgICAgIFxuICAgICAgICAgICAgfSk7XG4gICAgICAgIH0pO1xuICAgICAgfSk7XG4gIFxuICB9ICAgXG4gIFxuICBcblxuICAgLy8jcmVnaW9uIE1hbmlmZXN0IFBhY2thZ2UgRnVuY3Rpb25zIFxuXG4gICBhZGRUb0ZsaWdodChhY3Rpb24pe1xuICAgICB2YXIgc3J2ID0gdGhpczsgXG4gICAgcmV0dXJuIG5ldyBQcm9taXNlKChyZXNvbHZlLHJlamVjdCk9PntcbiAgICAgIHZhciBwYWNrYWdlTm8gPSBnZXRQYWNrYWdlSWRGcm9tQmFyQ29kZShhY3Rpb24uYmFyY29kZSk7IFxuICAgICAgY29uc29sZS5sb2coYWN0aW9uKTsgXG4gICAgICB0aGlzLm15U2VhcmNoLnVwZGF0ZShwYWNrYWdlTm8se21pZDphY3Rpb24ubWlkICwgc3RhdHVzOiAyLCBsb2NhdGlvbjpcIkxvYWRlZCBvbiBBaXJDcmFmdFwiLGNvbXBhcnRtZW50OmFjdGlvbi5jb21wYXJ0bWVudH0sKGVycixyZXN1bHQpPT57XG4gICAgICAgIGlmKGVycilcbiAgICAgICAgICByZXNvbHZlKHthZGRlZDpmYWxzZX0pXG4gICAgICAgIHNydi5nZXRGbGlnaHRDb21wYXJ0bWVudFdlaWdodChhY3Rpb24ubWlkLGFjdGlvbi5jb21wYXJ0bWVudCkudGhlbihmcmVzdWx0PT57XG4gICAgICAgICAgZnJlc3VsdC5hZGRlZCA9IHRydWU7IFxuICAgICAgICAgIHJlc29sdmUoZnJlc3VsdClcbiAgICAgICAgfSlcbiAgICAgICBcbiAgICAgIH0pXG4gICAgICAgIFxuICAgIH0pXG4gICB9XG4gICAvL2dldCB0aGUgY29tcGFydG1lbnQgd2VpZ2h0IFxuICAgZ2V0RmxpZ2h0Q29tcGFydG1lbnRXZWlnaHQobWlkLGNvbXBhcnRtZW50KXtcbiAgICAgcmV0dXJuIG5ldyBQcm9taXNlKChyZXNvbHZlLHJlamVjdCk9PntcbiAgICAgIFxuICAgICAgdGhpcy5teVNlYXJjaC5hZ2dyZWdhdGUoYEBtaWQ6WyR7bWlkfSAke21pZH1dIEBjb21wYXJ0bWVudDpOb3NlYCwge30sKGVycixyZXBseSk9PntcbiAgICAgICAgIGlmIChlcnIpXG4gICAgICAgICBjb25zb2xlLmxvZyhlcnIpOyBcbiAgICAgICAgIGNvbnNvbGUubG9nKHJlcGx5LFwiVE9UQUwgU0VDVElPTiBXZWlnaHRcIilcbiAgICAgICAgIGlmIChyZXBseVsxXSl7XG4gICAgICAgICAgIHZhciByZXN1bHQgPSByZXBseVsxXTtcbiAgICAgICAgICAgdmFyIGNvbXBhcnRtZW50ID0gcmVzdWx0WzNdOyBcbiAgICAgICAgICAgdmFyIHdlaWdodCA9IHJlc3VsdFs1XTsgXG4gICAgICAgICB9XG4gICAgICAgICByZXNvbHZlKHtjb21wYXJ0bWVudDpjb21wYXJ0bWVudCx3ZWlnaHQ6d2VpZ2h0fSlcbiAgICAgICB9KVxuICAgICB9KVxuICAgfVxuICAgLy9yZW1vdmUgZnJvbSBmbGlnaHQgXG4gICByZW1vdmVGcm9tRmxpZ2h0KGFjdGlvbil7XG4gICAgcmV0dXJuIG5ldyBQcm9taXNlKChyZXNvbHZlLHJlamVjdCk9PntcbiAgICAgICAgdmFyIHBhY2thZ2VObyA9IGdldFBhY2thZ2VJZEZyb21CYXJDb2RlKGFjdGlvbi5iYXJjb2RlKTsgICBcbiAgICAgICAgdGhpcy5teVNlYXJjaC51cGRhdGUocGFja2FnZU5vLHttaWQ6YWN0aW9uLm1pZH0sKGVycixyZXN1bHQpPT57XG4gICAgICAgIGlmKGVycilcbiAgICAgICAgICAgIHJlc29sdmUoe3JlbW92ZWQ6ZmFsc2V9KVxuICAgICAgICAgIFxuICAgICAgICAgIHJlc29sdmUoe3JlbW92ZWQ6dHJ1ZX0pXG4gICAgICAgIH0pXG4gICAgfSlcbiAgIH1cbiAgIHJlY0Zyb21UcnVjayh0cmFja2luZ05vLHVzZXJuYW1lLHNoaXBtZW50SWQpe1xuICAgICByZXR1cm4gbmV3IFByb21pc2UoKHJlc29sdmUscmVqZWN0KT0+e1xuICAgICAgICBkYXRhQ29udGV4dC5yZWRpc0NsaWVudC5zYWRkKFwic2hpcG1lbnQ6aWQ6XCIrc2hpcG1lbnRJZCx0cmFja2luZ05vLChlcnIscmVwbHkpPT57XG4gICAgICAgICAgZGF0YUNvbnRleHQucmVkaXNDbGllbnQuc2V0KFJFQ19QS0crdHJhY2tpbmdObyxtb21lbnQoKS51bml4KCksIChlcnIscmVzdWx0KT0+e1xuICAgICAgICAgICAgaWYgKGVycikgcmVzb2x2ZSh7c2F2ZWQ6ZmFsc2V9KVxuICAgICAgICAgICAgLy9zaGlwbWVudCBjb3VudCBcbiAgICAgICAgICAgIHZhciBzaGlwbWVudENvdW50ID0gMTtcbiAgICAgICAgICAgIGRhdGFDb250ZXh0LnJlZGlzQ2xpZW50LnNjYXJkKFwic2hpcG1lbnQ6aWQ6XCIrc2hpcG1lbnRJZCwoZXJyLGNhcmQpPT57XG4gICAgICAgICAgICAgIHJlc29sdmUoe3NhdmVkOnRydWUscGtnQ291bnQ6Y2FyZH0pXG4gICAgICAgICAgICB9KTtcbiAgICAgICAgICAgXG4gICAgICAgICAgfSlcbiAgICAgICAgfSlcbiAgICAgICAgXG4gICAgIH0pXG4gICB9XG4gICBwcm9jc3Nlc3NQYWNrYWdlKHBrZ0lmbm8sdXNlcm5hbWUpe1xuICAgICByZXR1cm4gbmV3IFByb21pc2UoKHJlc29sdmUscmVqZWN0KT0+e1xuICAgICAgIGRhdGFDb250ZXh0LnJlZGlzQ2xpZW50Lmhtc2V0KFwiZmVlczphd2I6XCIrcGtnSWZuby5hd2IscGtnSWZubywoZXJyLHJlc3VsdCk9PntcbiAgICAgICAgIGlmIChlcnIpXG4gICAgICAgICAgY29uc29sZS5sb2coZXJyKTsgXG4gICAgICAgICAgY29uc29sZS5sb2cocmVzdWx0KTsgXG4gICAgICAgICBkYXRhQ29udGV4dC5yZWRpc0NsaWVudC5wdWJsaXNoKFwicHJpbnQ6ZmVlczpcIit1c2VybmFtZSxwa2dJZm5vLmF3Yik7IFxuICAgICAgICAgcmVzb2x2ZSh7c2VudDp0cnVlfSlcbiAgICAgICB9KVxuICAgICB9KVxuICAgfVxuICAgcmVjRnJvbVBsYW5lTmFzKGJhcmNvZGUpe1xuICAgICByZXR1cm4gbmV3IFByb21pc2UoKHJlc29sdmUscmVqZWN0KT0+e1xuICAgICAgIHZhciBzcnYgPSB0aGlzIDsgXG4gICAgICAgdmFyIHBrZ0lkID0gZ2V0UGFja2FnZUlkRnJvbUJhckNvZGUoYmFyY29kZSk7IFxuICAgICAgICBzcnYubXlTZWFyY2guZ2V0RG9jKHBrZ0lkLChlcnIscGtnKT0+e1xuICAgICAgICAgICAgcGtnLmRvYy5zdGF0dXMgPSA0OyBcbiAgICAgICAgICAgIHBrZy5kb2MubG9jYXRpb24gID0gXCJXYXJlaG91c2UgTkFTXCI7IFxuICAgICAgICAgICAgc3J2Lm15U2VhcmNoLnVwZGF0ZShwa2dJZCxwa2cuZG9jLChlcnIsdXBkYXRlUmVzdWx0KT0+e1xuICAgICAgICAgICAgICBpZihlcnIpXG4gICAgICAgICAgICAgICAgcmVqZWN0KHt1cGRhdGVkOmZhbHNlfSlcbiAgICAgICAgICAgICAgcmVzb2x2ZSh7dXBkYXRlZDp0cnVlfSlcbiAgICAgICAgICAgIH0pXG4gICAgICAgIH0pXG4gICAgIH0pXG4gICB9XG4gICAvLyNlbmRyZWdpb25cbn1cblxuZnVuY3Rpb24gZ2V0UGFja2FnZUlkRnJvbUJhckNvZGUoYmFyQ29kZVZhbHVlKXtcbiAgdmFyIHBhcnRzID0gYmFyQ29kZVZhbHVlLnNwbGl0KFwiLVwiKTsgXG4gIGlmIChwYXJ0cy5sZW5ndGggPT0gMylcbiAgICBpZiAodHlwZW9mIHBhcnRzWzJdICE9IFwidW5kZWZpbmVkXCIpXG4gICAgcmV0dXJuIHBhcnRzWzJdLnRyaW0oKTsgXG4gIHJldHVybiBcIlwiXG59XG4iXX0=
