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

      return new Promise(function (resolve, reject) {
        var packageNo = getPackageIdFromBarCode(action.barcode);
        console.log(action);
        _this9.mySearch.update(packageNo, { mid: action.mid, status: 2, location: "Loaded on AirCraft" }, function (err, result) {
          if (err) resolve({ added: false });

          resolve({ added: true });
        });
      });
    }
    //remove from flight 

  }, {
    key: "removeFromFlight",
    value: function removeFromFlight(action) {
      var _this10 = this;

      return new Promise(function (resolve, reject) {
        var packageNo = getPackageIdFromBarCode(action.barcode);
        _this10.mySearch.update(packageNo, { mid: action.mid }, function (err, result) {
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
      var _this11 = this;

      return new Promise(function (resolve, reject) {
        var srv = _this11;
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
//# sourceMappingURL=data:application/json;charset=utf8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIlJlZGlzU2VydmljZXMvUGFja2FnZVNlcnZpY2UuZXM2Il0sIm5hbWVzIjpbInJlZGlzIiwicmVxdWlyZSIsImxyZWRpcyIsIm1vbWVudCIsInJlZGlzU2VhcmNoIiwiZnMiLCJQYWNrYWdlVXRpbCIsIlBhY2thZ2VVdGlsaXR5IiwicGFja2FnZVV0aWwiLCJQS0dfSURYIiwiUEtHX0lEX0NPVU5URVIiLCJkYXRhQ29udGV4dCIsIlBLR19QUkVGSVgiLCJBV0JfSUQiLCJJTkRFWF9BV0IiLCJSRUNfUEtHIiwiQ3VzdG9tZXJTZXJ2aWNlIiwiY3VzdG9tZXJTZXJ2aWNlIiwiUEtHX1NUQVRVUyIsImF3YkluZGV4IiwiY2xpZW50T3B0aW9ucyIsInNlYXJjaENsaWVudERldGFpbHMiLCJwYWNrYWdlSW5kZXgiLCJnZXRQYWNrYWdlVm9sdW1uZSIsIm1QYWNrYWdlIiwiY3JlYXRlRG9jdW1lbnQiLCJ0UGFja2FnZSIsInBhY2thZ2VEb2N1bWVudCIsImlkIiwidHJhY2tpbmdObyIsInNreWJveCIsImRhdGVSZWNpZXZlZCIsInVuaXgiLCJhd2IiLCJtaWQiLCJ2b2x1bWUiLCJ3ZWlnaHQiLCJwaWVjZXMiLCJjdXN0b21lciIsInNoaXBwZXIiLCJkZXNjcmlwdGlvbiIsImRpbWVuc2lvbnMiLCJjYXJyaWVyIiwic3RhdHVzIiwidmFsdWUiLCJjb25zb2xlIiwibG9nIiwic2V0UGFja2FnZUluVHJhbnNpdCIsImtleXMiLCJtc2VhcmNoZXIiLCJQcm9taXNlIiwicmVzb2x2ZSIsInJlamVjdCIsImJhdGNoZXIiLCJjbGllbnQiLCJiYXRjaCIsImZvckVhY2giLCJsb2NhdGlvbiIsImVsZW1lbnQiLCJobXNldCIsImV4ZWMiLCJlcnIiLCJyZXN1bHQiLCJhZGRQYWNrYWdlVG9JbmRleCIsImdldFBhY2thZ2UiLCJ0aGVuIiwiZGVsRG9jdW1lbnQiLCJwYWNrIiwiZG9uZSIsImRvY3VtZW50IiwiYWRkIiwiUGFja2FnZVNlcnZpY2UiLCJzZXR1cEluZGV4IiwibXlTZWFyY2giLCJyZWRpc0NsaWVudCIsImV4aXN0cyIsInNldCIsImluaXRSZXN1bHQiLCJpbmNyIiwibmV3SWQiLCJ0b1N0cmluZyIsInVwZGF0ZSIsImVycjEiLCJhd2JSZXMiLCJzYXZlZCIsInJlcGx5IiwiaW52b2ljZSIsImhhc0RvY3MiLCJkYXRlQ3JlYXRlZCIsInNlYXJjaCIsIm51bWJlck9mUmVzdWx0cyIsIm9mZnNldCIsInBhY2thZ2VzIiwidG90YWxSZXN1bHRzIiwicmVzdWx0cyIsInBhY2thZ2UxIiwiZG9jIiwiTnVtYmVyIiwiZGF0YSIsInNydiIsInBhY2thZ2VsaXN0IiwiY291bnQiLCJsZW5ndGgiLCJzdWJzdHJpbmciLCJwdXNoIiwic29ydEJ5IiwiYXdicyIsImF3Ykxpc3QiLCJhbGwiLCJtYXAiLCJnZXRDdXN0b21lciIsImN1c3RvbWVySWQiLCJnZXRBd2JPdmVydmlldyIsImN1c3RvbWVycyIsImkiLCJmb3JtYXQiLCJjb25zaWduZWUiLCJuYW1lIiwiZGV0YWlscyIsInBtYiIsImNhdGNoIiwiZ2V0RG9jIiwiZ2V0QXdiRGV0YWlscyIsInRyYWNraW5nTnVtYmVyIiwibG9jYXRpb25faWQiLCJwYWNrYWdlUmVzdWx0IiwibmV3UGFja2FnZSIsImJvZHkiLCJjUGFja2FnZSIsInJlcGxhY2UiLCJ0cmltIiwidHJhY2tpbmciLCJyZXNwb25zZSIsImluZGV4UGFja2FnZSIsImRvY1Jlc3VsdCIsInBhZ2UiLCJwYWdlU2l6ZSIsImJhcmNvZGUiLCJwa2dJZCIsImdldFBhY2thZ2VJZEZyb21CYXJDb2RlIiwiZ2V0QXdiIiwiYXdiaW5mbyIsInBhY2thZ2UiLCJtc2VhcmNoIiwib2xkRG9jSWQiLCJkb2NJZCIsInVwZGF0ZWRQYWNrYWdlcyIsInBhY2thZ2VJZCIsIm1hbmlmZXN0IiwibWFuaWZlc3RLZXkiLCJkZWwiLCJkZWNyIiwiZ2V0S2V5cyIsImtleXNDb3VudCIsImtSZXN1bHQiLCJzcmVtIiwiclJlc3VsdCIsImRlbGV0ZWQiLCJiaW4iLCJzZWFyY2hlciIsInBrZyIsImFjdGlvbiIsInBhY2thZ2VObyIsImFkZGVkIiwicmVtb3ZlZCIsInVzZXJuYW1lIiwic2hpcG1lbnRJZCIsInNhZGQiLCJzaGlwbWVudENvdW50Iiwic2NhcmQiLCJjYXJkIiwicGtnQ291bnQiLCJwa2dJZm5vIiwicHVibGlzaCIsInNlbnQiLCJ1cGRhdGVSZXN1bHQiLCJ1cGRhdGVkIiwiYmFyQ29kZVZhbHVlIiwicGFydHMiLCJzcGxpdCJdLCJtYXBwaW5ncyI6Ijs7Ozs7Ozs7O0FBQUE7O0FBQ0E7Ozs7OztBQUdBLElBQUlBLFFBQVFDLFFBQVEsT0FBUixDQUFaO0FBQ0EsSUFBSUMsU0FBU0QsUUFBUSxlQUFSLENBQWI7QUFDQSxJQUFJRSxTQUFTRixRQUFRLFFBQVIsQ0FBYjtBQUNBLElBQUlHLGNBQWNILFFBQVEscUJBQVIsQ0FBbEI7QUFDQSxJQUFJSSxLQUFLSixRQUFRLElBQVIsQ0FBVDtBQUNBLElBQUlFLFNBQVNGLFFBQVEsUUFBUixDQUFiO0FBQ0EsSUFBSUssY0FBY0wsUUFBUSxxQkFBUixFQUErQk0sY0FBakQ7QUFDQSxJQUFJQyxjQUFjLElBQUlGLFdBQUosRUFBbEI7QUFDQSxJQUFNRyxVQUFVLGdCQUFoQjtBQUNBLElBQU1DLGlCQUFpQixZQUF2QjtBQUNBLElBQUlDLGNBQWNWLFFBQVEsZUFBUixDQUFsQjtBQUNBLElBQU1XLGFBQWEsV0FBbkI7QUFDQSxJQUFNQyxTQUFTLFFBQWY7QUFDQSxJQUFNQyxZQUFZLFdBQWxCO0FBQ0EsSUFBTUMsVUFBVSxVQUFoQjtBQUNBLElBQUlDLGtCQUFrQmYsUUFBUSxtQkFBUixFQUE2QmUsZUFBbkQ7QUFDQSxJQUFJQyxrQkFBa0IsSUFBSUQsZUFBSixFQUF0QjtBQUNBLElBQU1FLGFBQWE7QUFDakIsS0FBSSxVQURhO0FBRWpCLEtBQUcsb0JBRmM7QUFHakIsS0FBRyxZQUhjO0FBSWpCLEtBQUcsaUJBSmM7QUFLakIsS0FBRyw2QkFMYztBQU1qQixLQUFHOztBQU5jLENBQW5COztBQVVBLElBQU1DLFdBQVdmLFlBQVlKLEtBQVosRUFB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a0Isa0JBQVEsRUFBQzJILE1BQUssSUFBTixFQUFSO0FBQ0QsU0FORDtBQU9ELE9BUk0sQ0FBUDtBQVNEOzs7b0NBQ2VyQyxPLEVBQVE7QUFBQTs7QUFDdEIsYUFBTyxJQUFJdkYsT0FBSixDQUFZLFVBQUNDLE9BQUQsRUFBU0MsTUFBVCxFQUFrQjtBQUNuQyxZQUFJK0MsTUFBTSxPQUFWO0FBQ0EsWUFBSXVDLFFBQVFDLHdCQUF3QkYsT0FBeEIsQ0FBWjtBQUNDdEMsWUFBSTFCLFFBQUosQ0FBYWdELE1BQWIsQ0FBb0JpQixLQUFwQixFQUEwQixVQUFDN0UsR0FBRCxFQUFLbUcsR0FBTCxFQUFXO0FBQ2pDQSxjQUFJaEUsR0FBSixDQUFRckQsTUFBUixHQUFpQixDQUFqQjtBQUNBcUgsY0FBSWhFLEdBQUosQ0FBUXZDLFFBQVIsR0FBb0IsZUFBcEI7QUFDQTBDLGNBQUkxQixRQUFKLENBQWFRLE1BQWIsQ0FBb0J5RCxLQUFwQixFQUEwQnNCLElBQUloRSxHQUE5QixFQUFrQyxVQUFDbkMsR0FBRCxFQUFLa0gsWUFBTCxFQUFvQjtBQUNwRCxnQkFBR2xILEdBQUgsRUFDRVQsT0FBTyxFQUFDNEgsU0FBUSxLQUFULEVBQVA7QUFDRjdILG9CQUFRLEVBQUM2SCxTQUFRLElBQVQsRUFBUjtBQUNELFdBSkQ7QUFLSCxTQVJEO0FBU0YsT0FaTSxDQUFQO0FBYUQ7QUFDRDs7Ozs7OztBQUdILFNBQVNyQyx1QkFBVCxDQUFpQ3NDLFlBQWpDLEVBQThDO0FBQzVDLE1BQUlDLFFBQVFELGFBQWFFLEtBQWIsQ0FBbUIsR0FBbkIsQ0FBWjtBQUNBLE1BQUlELE1BQU01RSxNQUFOLElBQWdCLENBQXBCLEVBQ0UsSUFBSSxPQUFPNEUsTUFBTSxDQUFOLENBQVAsSUFBbUIsV0FBdkIsRUFDQSxPQUFPQSxNQUFNLENBQU4sRUFBU2hELElBQVQsRUFBUDtBQUNGLFNBQU8sRUFBUDtBQUNEIiwiZmlsZSI6IlJlZGlzU2VydmljZXMvUGFja2FnZVNlcnZpY2UuanMiLCJzb3VyY2VzQ29udGVudCI6WyJpbXBvcnQgeyBjcHVzIH0gZnJvbSBcIm9zXCI7XG5pbXBvcnQgeyBwcm9taXNlcyB9IGZyb20gXCJkbnNcIjtcblxuXG52YXIgcmVkaXMgPSByZXF1aXJlKFwicmVkaXNcIik7XG52YXIgbHJlZGlzID0gcmVxdWlyZShcIi4vcmVkaXMtbG9jYWxcIik7XG52YXIgbW9tZW50ID0gcmVxdWlyZShcIm1vbWVudFwiKTtcbnZhciByZWRpc1NlYXJjaCA9IHJlcXVpcmUoXCIuLi9yZWRpc2VhcmNoY2xpZW50XCIpO1xudmFyIGZzID0gcmVxdWlyZShcImZzXCIpO1xudmFyIG1vbWVudCA9IHJlcXVpcmUoJ21vbWVudCcpXG52YXIgUGFja2FnZVV0aWwgPSByZXF1aXJlKFwiLi4vVXRpbC9wYWNrYWdldXRpbFwiKS5QYWNrYWdlVXRpbGl0eTtcbnZhciBwYWNrYWdlVXRpbCA9IG5ldyBQYWNrYWdlVXRpbCgpO1xuY29uc3QgUEtHX0lEWCA9IFwiaW5kZXg6cGFja2FnZXNcIjtcbmNvbnN0IFBLR19JRF9DT1VOVEVSID0gXCJwYWNrYWdlOmlkXCI7XG52YXIgZGF0YUNvbnRleHQgPSByZXF1aXJlKCcuL2RhdGFDb250ZXh0JylcbmNvbnN0IFBLR19QUkVGSVggPSBcInBhY2thZ2VzOlwiO1xuY29uc3QgQVdCX0lEID0gXCJhd2I6aWRcIlxuY29uc3QgSU5ERVhfQVdCID0gXCJpbmRleDphd2JcIlxuY29uc3QgUkVDX1BLRyA9IFwicGtnOnJlYzpcIlxudmFyIEN1c3RvbWVyU2VydmljZSA9IHJlcXVpcmUoJy4vQ3VzdG9tZXJTZXJ2aWNlJykuQ3VzdG9tZXJTZXJ2aWNlOyBcbnZhciBjdXN0b21lclNlcnZpY2UgPSBuZXcgQ3VzdG9tZXJTZXJ2aWNlKClcbmNvbnN0IFBLR19TVEFUVVMgPSB7IFxuICAxIDogXCJSZWNlaXZlZFwiLFxuICAyOiBcIkxvYWRlZCBvbiBBaXJDcmFmdFwiLFxuICAzOiBcIkluIFRyYW5zaXRcIixcbiAgNDogXCJSZWNpZXZlZCBpbiBOQVNcIixcbiAgNTogXCJSZWFkeSBmb3IgUGlja3VwIC8gRGVsaXZlcnlcIixcbiAgNjogXCJEZWxpdmVyZWRcIlxuXG59OyBcblxuY29uc3QgYXdiSW5kZXggPSByZWRpc1NlYXJjaChyZWRpcywgSU5ERVhfQVdCLCB7XG4gIGNsaWVudE9wdGlvbnM6IGxyZWRpcy5zZWFyY2hDbGllbnREZXRhaWxzXG59KTtcbmNvbnN0IHBhY2thZ2VJbmRleCA9IHJlZGlzU2VhcmNoKHJlZGlzLCBQS0dfSURYLCB7XG4gIGNsaWVudE9wdGlvbnM6IGxyZWRpcy5zZWFyY2hDbGllbnREZXRhaWxzXG59KTtcbmZ1bmN0aW9uIGdldFBhY2thZ2VWb2x1bW5lKG1QYWNrYWdlKXtcblxuICByZXR1cm4gMDsgXG59XG5mdW5jdGlvbiBjcmVhdGVEb2N1bWVudCh0UGFja2FnZSkge1xuICB2YXIgcGFja2FnZURvY3VtZW50ID0ge1xuICAgIGlkOnRQYWNrYWdlLmlkLFxuICAgIHRyYWNraW5nTm86IHRQYWNrYWdlLnRyYWNraW5nTm8sXG4gICAgc2t5Ym94OiB0UGFja2FnZS5za3lib3gsXG4gICAgZGF0ZVJlY2lldmVkIDogbW9tZW50KCkudW5peCgpLCBcbiAgICBhd2I6MCwgXG4gICAgbWlkOjAsXG4gICAgdm9sdW1lOiBnZXRQYWNrYWdlVm9sdW1uZSh0UGFja2FnZSksXG4gICAgd2VpZ2h0OnRQYWNrYWdlLndlaWdodCxcbiAgICBwaWVjZXM6dFBhY2thZ2UucGllY2VzLFxuICAgIGN1c3RvbWVyOiB0UGFja2FnZS5jdXN0b21lcixcbiAgICBzaGlwcGVyOiB0UGFja2FnZS5zaGlwcGVyLFxuICAgIGRlc2NyaXB0aW9uOiB0UGFja2FnZS5kZXNjcmlwdGlvbixcbiAgICBkaW1lbnNpb25zOnRQYWNrYWdlLmRpbWVuc2lvbnMsXG4gICAgY2Fycmllcjp0UGFja2FnZS5jYXJyaWVyLFxuICAgIC8vc2t5Ym94VjogdFBhY2thZ2Uuc2t5Ym94LCBhZGQgZGltZW5pb24gXG4gICAgc3RhdHVzOiB0UGFja2FnZS5zdGF0dXMsXG4gICAgbWlkOiB0UGFja2FnZS5taWQsXG4gICAgdmFsdWU6IHRQYWNrYWdlLnZhbHVlLFxuICAgIFxuICB9O1xuICBjb25zb2xlLmxvZyhcImFib3V0IHRvIGFkZCB0aGUgcGFja2FnZSB0byB0aGUgaW5kZXhcIik7XG4gIHJldHVybiBwYWNrYWdlRG9jdW1lbnQ7XG59XG5mdW5jdGlvbiBzZXRQYWNrYWdlSW5UcmFuc2l0KGtleXMsIG1zZWFyY2hlcikge1xuICByZXR1cm4gbmV3IFByb21pc2UoKHJlc29sdmUsIHJlamVjdCkgPT4ge1xuICAgIHZhciBiYXRjaGVyID0gbXNlYXJjaGVyLmNsaWVudC5iYXRjaCgpO1xuICAgIGtleXMuZm9yRWFjaChlbGVtZW50ID0+IHtcbiAgICAgIHZhciB2YWx1ZSA9IHtcbiAgICAgICAgc3RhdHVzOiAyLFxuICAgICAgICBsb2NhdGlvbjogXCJJbiBUcmFuc2l0XCJcbiAgICAgIH07XG4gICAgICBjb25zb2xlLmxvZyhlbGVtZW50ICsgXCJpcyB0aGUgZWxlbWVudFwiKTtcblxuICAgICAgYmF0Y2hlci5obXNldChQS0dfUFJFRklYICsgZWxlbWVudCwgdmFsdWUpO1xuICAgIH0pO1xuICAgIGJhdGNoZXIuZXhlYygoZXJyLCByZXN1bHQpID0+IHtcbiAgICAgIGNvbnNvbGUubG9nKHJlc3VsdCk7XG4gICAgICAvL3JlYWRkIHRoZSBkb2N1bWVudHMgaGVyZVxuICAgICAga2V5cy5mb3JFYWNoKGVsZW1lbnQgPT4ge1xuICAgICAgICBhZGRQYWNrYWdlVG9JbmRleChlbGVtZW50LCBtc2VhcmNoZXIpO1xuICAgICAgfSk7XG4gICAgICByZXNvbHZlKHJlc3VsdCk7XG4gICAgfSk7XG4gIH0pO1xufVxuXG5mdW5jdGlvbiBhZGRQYWNrYWdlVG9JbmRleCh0cmFja2luZ05vLCBtc2VhcmNoZXIpIHtcbiAgbHJlZGlzLmdldFBhY2thZ2UodHJhY2tpbmdObykudGhlbihwYWNrID0+IHtcbiAgICBtc2VhcmNoZXIuZGVsRG9jdW1lbnQoUEtHX0lEWCwgYCR7cGFjay5taWR9LSR7dHJhY2tpbmdOb31gLCAoZXJyLCBkb25lKSA9PiB7XG4gICAgICB2YXIgZG9jdW1lbnQgPSBjcmVhdGVEb2N1bWVudChwYWNrKTtcbiAgICAgIGNvbnNvbGUubG9nKFwicmVhZGRpbmcgcGFja2FnZSB0byB0aGUgaW5kZXggbGlrZSBhIGJvc3MgXCIgKyB0cmFja2luZ05vKTtcbiAgICAgIG1zZWFyY2hlci5hZGQocGFjay5taWQgKyBcIi1cIiArIHBhY2sudHJhY2tpbmdObywgZG9jdW1lbnQpO1xuICAgIH0pO1xuICB9KTtcbn1cbmV4cG9ydCBjbGFzcyBQYWNrYWdlU2VydmljZSB7XG4gIGNvbnN0cnVjdG9yKCkge1xuICAgIHRoaXMuc2V0dXBJbmRleCgpO1xuICB9XG4gIHNldHVwSW5kZXgoKSB7XG4gICAgdGhpcy5teVNlYXJjaCA9IHJlZGlzU2VhcmNoKHJlZGlzLCBQS0dfSURYLCB7XG4gICAgICBjbGllbnRPcHRpb25zOiBscmVkaXMuc2VhcmNoQ2xpZW50RGV0YWlsc1xuICAgIH0pO1xuICB9XG4gIGdldE5ld0F3Yigpe1xuICAgIHJldHVybiBuZXcgUHJvbWlzZSgocmVzb2x2ZSxyZWplY3QpPT57XG4gICAgICBkYXRhQ29udGV4dC5yZWRpc0NsaWVudC5leGlzdHMoQVdCX0lELChlcnIscmVzdWx0KT0+e1xuICAgICAgICBjb25zb2xlLmxvZyhyZXN1bHQpOyBcbiAgICAgICAgaWYgKHJlc3VsdCAhPSBcIjFcIil7XG4gICAgICAgICAgZGF0YUNvbnRleHQucmVkaXNDbGllbnQuc2V0KEFXQl9JRCA9PSAxMDAwMDAsKGVycixpbml0UmVzdWx0KT0+e1xuICAgICAgICAgICAgZGF0YUNvbnRleHQucmVkaXNDbGllbnQuaW5jcihBV0JfSUQsKGVycixuZXdJZCk9PntcbiAgICAgICAgICAgICAgcmVzb2x2ZSh7YXdiOm5ld0lkfSlcbiAgICAgICAgICAgIH0pXG4gICAgICAgICAgfSlcbiAgICAgICAgfVxuICAgICAgICBlbHNlIHtcbiAgICAgICAgICBkYXRhQ29udGV4dC5yZWRpc0NsaWVudC5pbmNyKEFXQl9JRCwoZXJyLG5ld0lkKT0+e1xuICAgICAgICAgICAgcmVzb2x2ZSh7YXdiOm5ld0lkfSlcbiAgICAgICAgICB9KVxuICAgICAgICB9XG4gICAgICB9KVxuICAgIH0pO1xuICB9XG4gIHNhdmVBd2IoYXdiKXtcbiAgICByZXR1cm4gbmV3IFByb21pc2UoKHJlc29sdmUscmVqZWN0KT0+e1xuICAgICAgY29uc29sZS5sb2coJ3NhdmluZy4uLicsYXdiLG1vbWVudCgpLnRvU3RyaW5nKFwiaGg6bW06c3NcIikpXG4gICAgICBpZiAoYXdiLmlkICE9XCJcIil7XG4gICAgICAgIGF3YkluZGV4LnVwZGF0ZShhd2IuaWQsYXdiLChlcnIxLGF3YlJlcyk9PntcbiAgICAgICAgICBpZiAoZXJyMSl7XG4gICAgICAgICAgICBjb25zb2xlLmxvZygnc2F2aW5nIGVycicsZXJyMSlcbiAgICAgICAgICAgIHJlc29sdmUoe3NhdmVkOmZhbHNlfSlcbiAgICAgICAgICB9XG4gICAgICAgICAgcmVzb2x2ZSh7c2F2ZWQ6dHJ1ZSwgaWQ6YXdiLmlkfSlcbiAgICAgICAgfSlcbiAgICAgIH1cbiAgICAgIGVsc2V7XG4gICAgICBkYXRhQ29udGV4dC5yZWRpc0NsaWVudC5pbmNyKEFXQl9JRCwoZXJyLHJlcGx5KT0+e1xuICAgICAgICBhd2IuaWQgPSByZXBseTsgXG4gICAgICAgIGF3Yi5zdGF0dXMgPSAxOyBcbiAgICAgICAgaWYgKGF3Yi5pbnZvaWNlKXtcbiAgICAgICAgICBhd2IuaGFzRG9jcyA9IDFcbiAgICAgICAgICBjb25zb2xlLmxvZyhcIkhBUyBET0NDQ0NDXCIpXG4gICAgICAgIH1cbiAgICAgICAgZWxzZSB7XG4gICAgICAgICAgYXdiLmhhc0RvY3MgPSAwIDsgXG4gICAgICAgICAgY29uc29sZS5sb2coXCJIQVMgTk8gRE9DQ0NDQ1wiKVxuICAgICAgICB9XG4gICAgICAgIFxuICAgICAgICBhd2IuZGF0ZUNyZWF0ZWQgPSBtb21lbnQoKS51bml4KCk7IFxuICAgICAgICAgIGF3YkluZGV4LmFkZChhd2IuaWQsYXdiLChlcnIxLGF3YlJlcyk9PntcbiAgICAgICAgICAgIGlmIChlcnIxKXtcbiAgICAgICAgICAgICAgY29uc29sZS5sb2coJ3NhdmluZyBlcnInLGVycjEpXG4gICAgICAgICAgICAgIHJlc29sdmUoe3NhdmVkOmZhbHNlfSlcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIHJlc29sdmUoe3NhdmVkOnRydWUsIGlkOnJlcGx5fSlcbiAgICAgICAgICB9KVxuICAgICAgfSlcbiAgICB9XG4gICAgICBcbiAgICAgIFxuICAgIH0pXG4gIH1cbiAgZ2V0QXdiT3ZlcnZpZXcoaWQpe1xuICAgIC8vIGdldCB0aGUgYXdiIHBhY2thZ2VzIGFuZCBhZGQgZXZlcnl0aGluZyBpbiBcbiAgICByZXR1cm4gbmV3IFByb21pc2UoKHJlc29sdmUscmVqZWN0KT0+e1xuICAgICAgcGFja2FnZUluZGV4LnNlYXJjaChgQGF3YjpbJHtpZH0gJHtpZH1dYCx7bnVtYmVyT2ZSZXN1bHRzOjUwMDAsb2Zmc2V0OjB9LChlcnIscGFja2FnZXMpPT57XG4gICAgICAgIHZhciB3ZWlnaHQgPSAwIDsgXG4gICAgICAgIHZhciBwaWVjZXMgPSBwYWNrYWdlcy50b3RhbFJlc3VsdHM7IFxuICAgICAgICB2YXIgZGVzY3JpcHRpb24gPSBcIlwiXG4gICAgICAgIHBhY2thZ2VzLnJlc3VsdHMuZm9yRWFjaChwYWNrYWdlMSA9PiB7XG4gICAgICAgICAgaWYgKGRlc2NyaXB0aW9uID09XCJcIilcbiAgICAgICAgICAgIGRlc2NyaXB0aW9uID0gcGFja2FnZTEuZG9jLmRlc2NyaXB0aW9uOyBcbiAgICAgICAgICB3ZWlnaHQgKz0gTnVtYmVyKHBhY2thZ2UxLmRvYy53ZWlnaHQpXG4gICAgICAgIH0pO1xuICAgICAgICB2YXIgZGF0YSAgPSB7d2VpZ2h0OndlaWdodCxkZXNjcmlwdGlvbjpkZXNjcmlwdGlvbixwaWVjZXM6cGllY2VzfVxuICAgICAgICBjb25zb2xlLmxvZyhkYXRhLFwiQVdCIERFVEFJTFNcIik7IFxuICAgICAgICByZXNvbHZlKCBkYXRhKVxuICAgICAgfSlcbiAgICB9KVxuICAgXG4gIH1cbiAgZ2V0QXdiRGV0YWlscyhpZCl7XG4gICAgdmFyIHNydiA9IHRoaXM7IFxuICAgIHJldHVybiBuZXcgUHJvbWlzZSgocmVzb2x2ZSxyZWplY3QpPT57XG4gICAgICBjb25zb2xlLmxvZyhgQGF3YjpbJHtpZH0gJHtpZH1dYClcbiAgICAgXG4gICAgICBwYWNrYWdlSW5kZXguc2VhcmNoKGBAYXdiOlske2lkfSAke2lkfV1gLHtudW1iZXJPZlJlc3VsdHM6NTAwMCxvZmZzZXQ6MH0sKGVycixwYWNrYWdlcyk9PntcbiAgICAgICAgaWYgKGVycilcbiAgICAgICAgIGNvbnNvbGUubG9nKGVycilcbiAgICAgIFxuICAgICAgICB2YXIgIHBhY2thZ2VsaXN0ICA9IFtdXG4gICAgICAgIHZhciBjb3VudCA9IDE7IFxuICAgICAgICBwYWNrYWdlcy5yZXN1bHRzLmZvckVhY2gocGFja2FnZTEgPT4ge1xuXG4gICAgICAgICAgaWYgKHBhY2thZ2UxLmRvYy50cmFja2luZ05vLmxlbmd0aCA+IDcpe1xuICAgICAgICAgICAgLy9vbmx5IGRpc3BsYXkgdGhlIGxhc3QgNyBcbiAgICAgICAgICAgIHBhY2thZ2UxLmRvYy50cmFja2luZ05vID0gcGFja2FnZTEuZG9jLnRyYWNraW5nTm8uc3Vic3RyaW5nKHBhY2thZ2UxLmRvYy50cmFja2luZ05vLmxlbmd0aCAtNylcbiAgICAgICAgICAgIFxuICAgICAgICAgIH1cbiAgICAgICAgICBwYWNrYWdlMS5kb2MucGFja2FnZUluZGV4ID0gY291bnQ7XG4gICAgICAgICAgY291bnQgKys7IFxuICAgICAgICAgIHBhY2thZ2VsaXN0LnB1c2goIHBhY2thZ2UxLmRvYylcbiAgICAgICAgfSk7XG4gICAgICAgXG4gICAgICAgXG4gICAgICAgIHJlc29sdmUoIHBhY2thZ2VsaXN0KVxuICAgICAgfSlcbiAgICB9KVxuICB9XG4gIGxpc3ROb0RvY3NGbGwoKXtcbiAgICByZXR1cm4gbmV3IFByb21pc2UoKHJlc29sdmUscmVqZWN0KT0+e1xuICAgICAgIGF3YkluZGV4LnNlYXJjaChcIkBzdGF0dXM6WzEgMV0gQGhhc0RvY3M6WzAgMF1cIix7b2Zmc2V0OjAsbnVtYmVyT2ZSZXN1bHRzOjUwMDAsc29ydEJ5OidpZCd9LChlcnIsYXdicyk9PntcbiAgICAgICAgIHZhciBhd2JMaXN0ID0gW107IFxuICAgICAgICAgUHJvbWlzZS5hbGwoYXdicy5yZXN1bHRzLm1hcChhd2I9PmN1c3RvbWVyU2VydmljZS5nZXRDdXN0b21lcihhd2IuZG9jLmN1c3RvbWVySWQpKSkudGhlbihjdXN0b21lcnM9PntcbiAgICAgICAgICAgUHJvbWlzZS5hbGwoYXdicy5yZXN1bHRzLm1hcChhd2I9PnRoaXMuZ2V0QXdiT3ZlcnZpZXcoYXdiLmRvYy5pZCkpKS50aGVuKGRldGFpbHM9PntcbiAgICAgICAgICAgIGNvbnNvbGUubG9nKFwiZ290IHRoZSBjdXN0b21lcnNcIixjdXN0b21lcnMsIGF3YnMpXG4gICAgICAgICAgICBmb3IodmFyIGkgPTAgOyBpIDwgYXdicy5yZXN1bHRzLmxlbmd0aCA7IGkrKyApe1xuICAgICAgICAgICAgICB2YXIgYXdiID0gYXdicy5yZXN1bHRzW2ldOyBcbiAgICAgICAgICAgICAgYXdiLmRvYy5kYXRlQ3JlYXRlZCA9IG1vbWVudC51bml4KGF3Yi5kb2MuZGF0ZUNyZWF0ZWQpLmZvcm1hdChcIllZWVktTU0tREQgaGg6bW0gQVwiKVxuICAgICAgICAgICAgICAvL3dlIG5lZWQgdG8gZ2V0IHRoZSBjdXN0b21lciBcbiAgICAgICAgICAgICAgYXdiLmRvYy5jb25zaWduZWUgPSBjdXN0b21lcnNbaV0ubmFtZTsgXG4gICAgICAgICAgICAgIGF3Yi5kb2Mud2VpZ2h0ID0gZGV0YWlsc1tpXS53ZWlnaHQ7IFxuICAgICAgICAgICAgICBhd2IuZG9jLnBtYiA9IGN1c3RvbWVyc1tpXS5wbWI7IFxuICAgICAgICAgICAgICBhd2IuZG9jLmRlc2NyaXB0aW9uID0gZGV0YWlsc1tpXS5kZXNjcmlwdGlvbjsgXG4gICAgICAgICAgICAgIGF3Yi5kb2MucGllY2VzID0gZGV0YWlsc1tpXS5waWVjZXM7IFxuICAgICAgICAgICAgICBpZiAoY3VzdG9tZXJzW2ldLnBtYiA9PSAnJyl7XG4gICAgICAgICAgICAgICAgYXdiLmRvYy5wbWIgPSAnOTAwMCdcbiAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICBjb25zb2xlLmxvZygncHVzaGluZyAnLGF3YilcbiAgICAgICAgICAgICAgLy93ZSBuZWVkIHRvIGdldCBhbGwgdGhlIHBhY2thZ2VzIFxuICAgICAgICAgICAgICBhd2JMaXN0LnB1c2goYXdiLmRvYylcbiAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgcmVzb2x2ZSh7YXdiczphd2JMaXN0fSlcbiAgICAgICAgICAgfSlcbiAgICAgICAgICBcbiAgICAgICAgICB9KS5jYXRjaChlcnI9PntcbiAgICAgICAgICAgIGNvbnNvbGUubG9nKGVycik7IFxuICAgICAgICAgIH0pXG4gICAgICAgICBcbiAgICAgICAgLy8gIGF3YnMucmVzdWx0cy5mb3JFYWNoKGF3YiA9PiB7XG4gICAgICAgICAgIFxuICAgICAgICAgIFxuICAgICAgICAvLyAgfSk7XG4gICAgICAgICBcbiAgICAgICB9KVxuICAgIH0pXG4gIH1cblxuICBsaXN0QXdiaW5GbGwoKXtcbiAgICByZXR1cm4gbmV3IFByb21pc2UoKHJlc29sdmUscmVqZWN0KT0+e1xuICAgICAgIGF3YkluZGV4LnNlYXJjaChcIkBzdGF0dXM6WzEgMV0gQGhhc0RvY3M6WzEgMV1cIix7b2Zmc2V0OjAsbnVtYmVyT2ZSZXN1bHRzOjUwMDAsc29ydEJ5OidpZCd9LChlcnIsYXdicyk9PntcbiAgICAgICAgIHZhciBhd2JMaXN0ID0gW107IFxuICAgICAgICAgUHJvbWlzZS5hbGwoYXdicy5yZXN1bHRzLm1hcChhd2I9PmN1c3RvbWVyU2VydmljZS5nZXRDdXN0b21lcihhd2IuZG9jLmN1c3RvbWVySWQpKSkudGhlbihjdXN0b21lcnM9PntcbiAgICAgICAgICAgUHJvbWlzZS5hbGwoYXdicy5yZXN1bHRzLm1hcChhd2I9PnRoaXMuZ2V0QXdiT3ZlcnZpZXcoYXdiLmRvYy5pZCkpKS50aGVuKGRldGFpbHM9PntcbiAgICAgICAgICAgIGNvbnNvbGUubG9nKFwiZ290IHRoZSBjdXN0b21lcnNcIixjdXN0b21lcnMsIGF3YnMpXG4gICAgICAgICAgICBmb3IodmFyIGkgPTAgOyBpIDwgYXdicy5yZXN1bHRzLmxlbmd0aCA7IGkrKyApe1xuICAgICAgICAgICAgICB2YXIgYXdiID0gYXdicy5yZXN1bHRzW2ldOyBcbiAgICAgICAgICAgICAgYXdiLmRvYy5kYXRlQ3JlYXRlZCA9IG1vbWVudC51bml4KGF3Yi5kb2MuZGF0ZUNyZWF0ZWQpLmZvcm1hdChcIllZWVktTU0tREQgaGg6bW0gQVwiKVxuICAgICAgICAgICAgICAvL3dlIG5lZWQgdG8gZ2V0IHRoZSBjdXN0b21lciBcbiAgICAgICAgICAgICAgYXdiLmRvYy5jb25zaWduZWUgPSBjdXN0b21lcnNbaV0ubmFtZTsgXG4gICAgICAgICAgICAgIGF3Yi5kb2MucG1iID0gY3VzdG9tZXJzW2ldLnBtYjsgXG4gICAgICAgICAgICAgIGF3Yi5kb2Mud2VpZ2h0ID0gZGV0YWlsc1tpXS53ZWlnaHQ7IFxuICAgICAgICAgICAgICBhd2IuZG9jLmRlc2NyaXB0aW9uID0gZGV0YWlsc1tpXS5kZXNjcmlwdGlvbjsgXG4gICAgICAgICAgICAgIGF3Yi5kb2MucGllY2VzID0gZGV0YWlsc1tpXS5waWVjZXM7IFxuICAgICAgICAgICAgICBpZiAoY3VzdG9tZXJzW2ldLnBtYiA9PSAnJyl7XG4gICAgICAgICAgICAgICAgYXdiLmRvYy5wbWIgPSAnOTAwMCdcbiAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICBjb25zb2xlLmxvZygncHVzaGluZyAnLGF3YilcbiAgICAgICAgICAgICAgLy93ZSBuZWVkIHRvIGdldCBhbGwgdGhlIHBhY2thZ2VzIFxuICAgICAgICAgICAgICBhd2JMaXN0LnB1c2goYXdiLmRvYylcbiAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgcmVzb2x2ZSh7YXdiczphd2JMaXN0fSlcbiAgICAgICAgICAgfSlcbiAgICAgICAgICBcbiAgICAgICAgICB9KS5jYXRjaChlcnI9PntcbiAgICAgICAgICAgIGNvbnNvbGUubG9nKGVycik7IFxuICAgICAgICAgIH0pXG4gICAgICAgICBcbiAgICAgICAgLy8gIGF3YnMucmVzdWx0cy5mb3JFYWNoKGF3YiA9PiB7XG4gICAgICAgICAgIFxuICAgICAgICAgIFxuICAgICAgICAvLyAgfSk7XG4gICAgICAgICBcbiAgICAgICB9KVxuICAgIH0pXG4gIH1cbiAgZ2V0QXdiKGlkKXtcbiAgICBjb25zdCBzcnYgPSB0aGlzOyBcbiAgICByZXR1cm4gbmV3IFByb21pc2UoKHJlc29sdmUscmVqZWN0KT0+e1xuICAgICAgYXdiSW5kZXguZ2V0RG9jKGlkLChlcnIsYXdiKT0+e1xuICAgICAgICAvL2dldCB0aGUgY3VzdG9tZXIgXG4gICAgICAgIGN1c3RvbWVyU2VydmljZS5nZXRDdXN0b21lcihhd2IuZG9jLmN1c3RvbWVySWQpLnRoZW4oY3VzdG9tZXI9PntcbiAgICAgICAgICBhd2IuZG9jLmN1c3RvbWVyID0gY3VzdG9tZXI7IFxuICAgICAgICAgIHNydi5nZXRBd2JEZXRhaWxzKGlkKS50aGVuKHBhY2thZ2VzPT57XG4gICAgICAgICAgICAvL2dldCB0aGUgcGFja2FnZXMgZm9yIHRoZSBhd2IgXG4gICAgICAgICAgICBhd2IuZG9jLnBhY2thZ2VzID0gcGFja2FnZXM7IFxuICAgICAgICAgICAgcmVzb2x2ZSh7YXdiOmF3Yi5kb2N9KSAgXG4gICAgICAgICAgfSlcbiAgICAgICAgICBcbiAgICAgICAgfSlcbiAgICAgICAgXG4gICAgICB9KVxuICAgIH0pXG4gIH1cbiAgdXBkYXRlTG9jYXRpb24odHJhY2tpbmdOdW1iZXIsbG9jYXRpb25faWQpe1xuICAgIHJldHVybiBuZXcgUHJvbWlzZSgocmVzb2x2ZSxyZWplY3QpPT57XG4gICAgICBwYWNrYWdlSW5kZXguc2VhcmNoKFwiQHRyYWNraW5nTm86XCIrdHJhY2tpbmdOdW1iZXIse2xvY2F0aW9uOmxvY2F0aW9uX2lkfSwoZXJyLHBhY2thZ2VSZXN1bHQpPT57XG5cbiAgICAgIH0pXG4gICAgfSlcbiAgfVxuICBzYXZlUGFja2FnZVRvQXdiKG5ld1BhY2thZ2Upe1xuICAgIHJldHVybiBuZXcgUHJvbWlzZSgocmVzb2x2ZSxyZXN1bHQpPT57XG4gICAgICBpZiAobmV3UGFja2FnZS5pZCAhPVwiMFwiKXtcbiAgICAgICAgcGFja2FnZUluZGV4LnVwZGF0ZShuZXdQYWNrYWdlLmlkLG5ld1BhY2thZ2UsKGVycixyZXN1bHQpPT57XG4gICAgICAgICAgaWYgKGVycilcbiAgICAgICAgICAgIGNvbnNvbGUubG9nKGVycik7IFxuICAgICAgICAgIHJlc29sdmUoe3NhdmVkOnRydWUsaWQ6bmV3UGFja2FnZS5pZH0pXG4gICAgICAgIH0pXG4gICAgICB9XG4gICAgICBlbHNlIHtcbiAgICAgICAgZGF0YUNvbnRleHQucmVkaXNDbGllbnQuaW5jcihQS0dfSURfQ09VTlRFUiwoZXJyLGlkKT0+e1xuICAgICAgICAgIG5ld1BhY2thZ2UuaWQgPSBpZDsgXG4gICAgICAgICAgcGFja2FnZUluZGV4LmFkZChpZCxuZXdQYWNrYWdlLChlcnIscmVzdWx0KT0+e1xuICAgICAgICAgICAgaWYgKGVycilcbiAgICAgICAgICAgICAgY29uc29sZS5sb2coZXJyKTsgXG4gICAgICAgICAgICByZXNvbHZlKHtzYXZlZDp0cnVlLGlkOmlkfSlcbiAgICAgICAgICB9KVxuICAgICAgICB9KVxuICAgICAgfVxuICAgXG4gICAgfSlcbiAgfVxuICBzYXZlUGFja2FnZShib2R5KXtcbiAgICByZXR1cm4gbmV3IFByb21pc2UoKHJlc29sdmUscmVqZWN0KT0+e1xuICAgICAgdmFyIGNQYWNrYWdlID0ge1xuICAgICAgICBcbiAgICAgICAgc2t5Ym94OiBib2R5LnNreWJveCxcbiAgICAgICAgY3VzdG9tZXI6IGJvZHkuY3VzdG9tZXIucmVwbGFjZShcIi1cIiwgXCJcIikudHJpbSgpLFxuICAgICAgICB0cmFja2luZ05vOiBib2R5LnRyYWNraW5nLFxuICAgICAgICBkZXNjcmlwdGlvbjogYm9keS5kZXNjcmlwdGlvbixcbiAgICAgICAgc2hpcHBlcjogYm9keS5zaGlwcGVyLFxuICAgICAgICBjYXJyaWVyOmJvZHkuY2FycmllcixcbiAgICAgICAgdmFsdWU6IE51bWJlcihib2R5LnZhbHVlKSxcbiAgICAgICAgcGllY2VzOiBOdW1iZXIoYm9keS5waWVjZXMpLFxuICAgICAgICB3ZWlnaHQ6IE51bWJlcihib2R5LndlaWdodCksXG4gICAgICAgIGRpbWVuc2lvbnM6IGJvZHkuZGltZW5zaW9ucyxcbiAgICAgICAgc3RhdHVzOiAxLFxuICAgICAgICBsb2NhdGlvbjogXCJGTExcIixcbiAgICAgICAgbWlkOiAwLFxuICAgICAgICBhd2I6MCxcbiAgICAgICAgLy9oYXNPcHQ6IHRydWUsXG4gICAgICAgIC8vbXR5cGU6IGJvZHkubXR5cGVcbiAgICAgIH07XG4gICAgICAvL3ZhbGlkYXRlIHRoZSBwYWNrYWdlIFxuICAgICAgZGF0YUNvbnRleHQucmVkaXNDbGllbnQuaW5jcihQS0dfSURfQ09VTlRFUiwoZXJyLGlkKT0+e1xuICAgICAgICBjUGFja2FnZS5pZCA9IGlkOyBcbiAgICAgICAgZGF0YUNvbnRleHQucmVkaXNDbGllbnQuc2V0KFBLR19QUkVGSVgraWQsY1BhY2thZ2UsKGVycixyZXNwb25zZSk9PntcbiAgICAgICAgICBpZiAoZXJyKXtcbiAgICAgICAgICAgIHJlamVjdCh7c2F2ZWQ6ZmFsc2UsZXJyOmVycn0pXG4gICAgICAgICAgfVxuICAgICAgICAgICB2YXIgaW5kZXhQYWNrYWdlID0gIGNyZWF0ZURvY3VtZW50KGNQYWNrYWdlKTsgXG4gICAgICAgICAgIGNvbnNvbGUubG9nKGluZGV4UGFja2FnZSk7IFxuICAgICAgICAgICBwYWNrYWdlSW5kZXguYWRkKGNQYWNrYWdlLmlkLGluZGV4UGFja2FnZSwoZXJyMSxkb2NSZXN1bHQpPT57XG4gICAgICAgICAgICAgY29uc29sZS5sb2coZG9jUmVzdWx0KTsgXG4gICAgICAgICAgICAgaWYoZXJyMSl7XG4gICAgICAgICAgICAgICByZWplY3Qoe3NhdmVkOmZhbHNlLGVycjplcnIxfSlcbiAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgcmVzb2x2ZSh7c2F2ZWQ6dHJ1ZX0pXG4gICAgICAgICAgIH0pXG5cbiAgICAgICAgfSlcbiAgICAgIH0pO1xuICAgIFxuXG5cbiAgICB9KVxuICB9XG5cbiAgZ2V0TWFuaWZlc3RQYWNrYWdlcygpe1xuICAgIHJldHVybiBuZXcgUHJvbWlzZSgocmVzb2x2ZSxyZWplY3QpPT57XG4gICAgICBcbiAgICAgIHRoaXMubXlTZWFyY2guc2VhcmNoKFxuICAgICAgICBgQG1pZDpbMCAwXWAsXG4gICAgICAgIHsgb2Zmc2V0OiAwLCBudW1iZXJPZlJlc3VsdHM6IDUwMDAgfSxcbiAgICAgICAgKGVyciwgZGF0YSkgPT4ge1xuICAgICAgICAgIHZhciBwYWNrYWdlcyA9IFtdO1xuICAgICAgICAgIGNvbnNvbGUubG9nKGRhdGEpO1xuICAgICAgICAgIGRhdGEucmVzdWx0cy5mb3JFYWNoKGVsZW1lbnQgPT4ge1xuXG4gICAgICAgICAgICBwYWNrYWdlcy5wdXNoKGVsZW1lbnQuZG9jKTtcbiAgICAgICAgICAgIHJlc29sdmUocGFja2FnZXMpOyAgICAgICAgICAgICAgICAgXG4gICAgICAgIH0pO1xuICAgIH0pO1xuICAgIH0pXG4gIH1cbiAgZ2V0UmVjZWl2ZWRQYWNrYWdlcyhwYWdlLHBhZ2VTaXplKXtcbiAgICByZXR1cm4gbmV3IFByb21pc2UoKHJlc29sdmUscmVqZWN0KT0+e1xuICAgICAgXG4gICAgICB0aGlzLm15U2VhcmNoLnNlYXJjaChcbiAgICAgICAgYEBtaWQ6WzAgMF1gLFxuICAgICAgICB7IG9mZnNldDogMCwgbnVtYmVyT2ZSZXN1bHRzOiA1MDAwIH0sXG4gICAgICAgIChlcnIsIGRhdGEpID0+IHtcbiAgICAgICAgICB2YXIgcGFja2FnZXMgPSBbXTtcbiAgICAgICAgICBjb25zb2xlLmxvZyhkYXRhKTtcbiAgICAgICAgICBkYXRhLnJlc3VsdHMuZm9yRWFjaChlbGVtZW50ID0+IHtcblxuICAgICAgICAgICAgcGFja2FnZXMucHVzaChlbGVtZW50LmRvYyk7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgXG4gICAgICAgIH0pO1xuICAgICAgICByZXNvbHZlKHBhY2thZ2VzKTsgXG4gICAgfSk7XG4gICAgfSlcbiAgfVxuICBnZXROb0RvY3NQYWNrYWNrYWdlcyhwYWdlLHBhZ2VTaXplKXtcbiAgICByZXR1cm4gbmV3IFByb21pc2UoKHJlc29sdmUscmVqZWN0KT0+e1xuICAgICAgXG4gICAgICB0aGlzLm15U2VhcmNoLnNlYXJjaChcbiAgICAgICAgYEBoYXNEb2NzOlswIDBdYCxcbiAgICAgICAgeyBvZmZzZXQ6IDAsIG51bWJlck9mUmVzdWx0czogNTAwMCB9LFxuICAgICAgICAoZXJyLCBkYXRhKSA9PiB7XG4gICAgICAgICAgdmFyIHBhY2thZ2VzID0gW107XG4gICAgICAgICAgY29uc29sZS5sb2coZGF0YSk7XG4gICAgICAgICAgZGF0YS5yZXN1bHRzLmZvckVhY2goZWxlbWVudCA9PiB7XG5cbiAgICAgICAgICAgIHBhY2thZ2VzLnB1c2goZWxlbWVudC5kb2MpO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIFxuICAgICAgICB9KTtcbiAgICAgICAgcmVzb2x2ZShwYWNrYWdlcyk7IFxuICAgIH0pO1xuICAgIH0pXG4gIH1cbiAgZ2V0cGFja2FnZWJ5UmVkaXNJZChpZCl7XG4gICAgcmV0dXJuIG5ldyBQcm9taXNlKChyZXNvbHZlLHJlamVjdCk9PntcbiAgICAgIHBhY2thZ2VJbmRleC5nZXREb2MoaWQsKGVycixkb2N1bWVudCk9PntcbiAgICAgICAgcmVzb2x2ZShkb2N1bWVudC5kb2MpOyBcbiAgICAgIH0pXG4gICAgfSlcbiAgfVxuICBnZXRQYWNrYWdlQnlJZChiYXJjb2RlKXtcbiAgICB2YXIgc3J2ID0gdGhpczsgXG4gICAgdmFyIHBrZ0lkID0gZ2V0UGFja2FnZUlkRnJvbUJhckNvZGUoYmFyY29kZSk7IFxuICAgIHJldHVybiBuZXcgUHJvbWlzZSgocmVzb2x2ZSxyZWplY3QpPT57XG4gICAgICB0aGlzLm15U2VhcmNoLmdldERvYyhwa2dJZCwoZXJyLGRvY3VtZW50KT0+e1xuICAgICAgICAvL2dldCB0aGUgYXdiIGluZm8gaGVyZSBhcyB3ZWxsIFxuICAgICAgICBzcnYuZ2V0QXdiKGRvY3VtZW50LmRvYy5hd2IpLnRoZW4oYXdiaW5mbz0+e1xuICAgICAgICAgIGNvbnNvbGUubG9nKGF3YmluZm8pOyBcbiAgICAgICAgICB2YXIgcmVzcG9uc2UgPSB7IFxuICAgICAgICAgICAgYXdiIDogYXdiaW5mby5hd2IsXG4gICAgICAgICAgICBwYWNrYWdlIDogZG9jdW1lbnQuZG9jXG4gICAgICAgICAgfVxuICAgICAgICAgIHJlc29sdmUocmVzcG9uc2UpOyBcbiAgICAgICAgfSk7IFxuICAgICAgICBcbiAgICAgIH0pXG4gICAgfSk7IFxuICB9XG4gIC8vdXNpbmcgdGhpcyBcbiAgXG5cbiAgdXBkYXRlTWFuaWZlc3RQYWNrYWdlVG9JblRyYW5zaXQobWlkKSB7XG4gICAgLy9nZXQgYWxsIHRoZSBwYWNrYWdlc1xuICAgIC8vd2UgbmVlZCB0byB1cGRhdGUgdGhlIGluZGV4IGF0IHRoaXMgcG9pbnQgYXMgd2VsbFxuICAgIHZhciBtc2VhcmNoID0gdGhpcy5teVNlYXJjaDtcbiAgICB0aGlzLm15U2VhcmNoLnNlYXJjaChcbiAgICAgIGBAbWlkOlske21pZH0gJHttaWR9XWAsXG4gICAgICB7IG9mZnNldDogMCwgbnVtYmVyT2ZSZXN1bHRzOiA1MDAwIH0sXG4gICAgICAoZXJyLCBkYXRhKSA9PiB7XG4gICAgICAgIHZhciBwYWNrYWdlcyA9IFtdO1xuICAgICAgICBjb25zb2xlLmxvZyhkYXRhKTtcbiAgICAgICAgZGF0YS5yZXN1bHRzLmZvckVhY2goZWxlbWVudCA9PiB7XG4gICAgICAgICAgdmFyIG9sZERvY0lkID0gZWxlbWVudC5kb2NJZDtcbiAgICAgICAgICBlbGVtZW50LmRvY0lkID0gZWxlbWVudC5kb2NJZC5yZXBsYWNlKGAke21pZH0tYCwgXCJcIik7XG4gICAgICAgICAgcGFja2FnZXMucHVzaChlbGVtZW50LmRvY0lkKTtcbiAgICAgICAgICAvLyBpIGNvdWxkIGRlbGV0ZSBoZXJlXG4gICAgICAgICAgLy8gbXNlYXJjaC5kZWxEb2N1bWVudChQS0dfSURYLG9sZERvY0lkKVxuICAgICAgICAgIC8vdXBkYXRlIGFsbCB0aGUgcGFja2FnZXNcbiAgICAgICAgfSk7XG4gICAgICAgIHNldFBhY2thZ2VJblRyYW5zaXQocGFja2FnZXMsIG1zZWFyY2gsIG1pZCkudGhlbihmdW5jdGlvbihcbiAgICAgICAgICB1cGRhdGVkUGFja2FnZXNcbiAgICAgICAgKSB7XG4gICAgICAgICAgY29uc29sZS5sb2coXCJ1cGRhdGVkIHBhY2thZ2VzXCIpO1xuICAgICAgICAgIGNvbnNvbGUubG9nKHVwZGF0ZWRQYWNrYWdlcyk7XG4gICAgICAgIH0pO1xuICAgICAgfVxuICAgICk7XG4gIH1cbiAgcmVtb3ZlUGFja2FnZUZyb21NYW5pZmVzdChwYWNrYWdlSWQsIG1pZCkge1xuICAgIHZhciBtc2VhcmNoID0gdGhpcy5teVNlYXJjaDtcbiAgICByZXR1cm4gbmV3IFByb21pc2UoKHJlc29sdmUsIHJlamVjdCkgPT4ge1xuICAgICAgdmFyIG1hbmlmZXN0ID0gbWlkO1xuICAgICAgdmFyIG1hbmlmZXN0S2V5ID0gXCJtYW5pZmVzdDpcIiArIG1hbmlmZXN0ICsgXCI6KlwiO1xuXG4gICAgICBscmVkaXMuZGVsKFwicGFja2FnZXM6XCIgKyB0cmFja2luZ05vKS50aGVuKGZ1bmN0aW9uKHJlc3VsdCkge1xuICAgICAgICBjb25zb2xlLmxvZyhyZXN1bHQpO1xuICAgICAgICBtc2VhcmNoLmRlbERvY3VtZW50KFBLR19JRFgsIGAke21pZH0tJHt0cmFja2luZ05vfWApO1xuICAgICAgICAvL3dlIG5lZWQgdG8gcmVtb3ZlIGZyb20gdGhlIGluZGV4IGFuZCBkZWMgdGhlIGNvdW50ZXJcbiAgICAgICAgbHJlZGlzLmNsaWVudC5kZWNyKFwibWNvdW50ZXI6XCIgKyBtaWQpO1xuICAgICAgICAvL3JTZXJ2aWNlcy5wYWNrYWdlU2VydmljZS5ybVBhY2thZ2UobWlkLCB0cmFja2luZ05vKTtcbiAgICAgICAgbHJlZGlzLmdldEtleXMobWFuaWZlc3RLZXkpLnRoZW4oa1Jlc3VsdCA9PiB7XG4gICAgICAgICAgLy90aGUgbGlzdCBvZiBhbGwgdGhlIHNldHMgLi4ud2UgbmVlZCB0byByZW1vdmUgdGhlIGtleSBmcm9tIGVhY2ggb25lXG4gICAgICAgICAgdmFyIGtleXNDb3VudCA9IDA7XG5cbiAgICAgICAgICBrUmVzdWx0LmZvckVhY2goZWxlbWVudCA9PiB7XG4gICAgICAgICAgICBjb25zb2xlLmxvZyhcbiAgICAgICAgICAgICAgYHJlbW92aW5nICR7dHJhY2tpbmdOb30gcGFja2FnZSBtYW5pZmVzdCBzZXQgJHtlbGVtZW50fSBgXG4gICAgICAgICAgICApO1xuICAgICAgICAgICAgbHJlZGlzLnNyZW0oZWxlbWVudCwgdHJhY2tpbmdObykudGhlbihmdW5jdGlvbihyUmVzdWx0KSB7XG4gICAgICAgICAgICAgIGNvbnNvbGUubG9nKHJSZXN1bHQpO1xuICAgICAgICAgICAgICBjb25zb2xlLmxvZyhcInJlbW92ZWRcIik7XG4gICAgICAgICAgICAgIGlmIChrZXlzQ291bnQgPT0ga1Jlc3VsdC5sZW5ndGggLSAxKSBrZXlzQ291bnQrKztcbiAgICAgICAgICAgIH0pO1xuICAgICAgICAgIH0pO1xuICAgICAgICAgIHJlc29sdmUoe1xuICAgICAgICAgICAgZGVsZXRlZDogdHJ1ZVxuICAgICAgICAgIH0pO1xuICAgICAgICB9KTtcblxuICAgICAgICAvL3dlIGFsc28gbmVlZCB0byByZW1vdmUgZnJvbSBhbnkgc2V0c1xuICAgICAgfSk7XG4gICAgfSk7XG4gIH1cbiAgcmVtb3ZlUGFja2FnZUJ5SWQoaWQpIHtcbiAgICB2YXIgbXNlYXJjaCA9IHRoaXMubXlTZWFyY2g7XG4gICAgcmV0dXJuIG5ldyBQcm9taXNlKChyZXNvbHZlLCByZWplY3QpID0+IHtcbiAgICAgIFxuICAgICAgcGFja2FnZUluZGV4LmRlbERvY3VtZW50KFBLR19JRFgsaWQsKGVycixyZXNwb25zZSk9PntcbiAgICAgICAgaWYgKGVycilcbiAgICAgICAgICBjb25zb2xlLmxvZyhlcnIpOyBcbiAgICAgICAgY29uc29sZS5sb2cocmVzcG9uc2UpOyBcbiAgICAgICAgcmVzb2x2ZSh7ZGVsZXRlZDp0cnVlfSlcbiAgICAgIH0pXG4gICAgICBcbiAgICAgICAgXG4gICAgICBcbiAgICB9KTtcbiAgfVxuICBzdG9yZVBhY2thZ2VGb3JQaWNrdXAodHJhY2tpbmdObyxiaW4pe1xuICAgIHZhciBzZWFyY2hlciA9IHRoaXMubXlTZWFyY2g7XG4gICAgcmV0dXJuIG5ldyBQcm9taXNlKChyZXNvbHZlLHJlamVjdCk9PntcbiAgICAgICBscmVkaXMuaG1zZXQoUEtHX1BSRUZJWCt0cmFja2luZ05vLHtzdGF0dXM6NCxsb2NhdGlvbjpiaW59KS50aGVuKChyZXN1bHQpPT57XG4gICAgICAgICBscmVkaXMuZ2V0UGFja2FnZSh0cmFja2luZ05vKS50aGVuKChwa2cpPT57XG4gICAgICAgICAgYWRkUGFja2FnZVRvSW5kZXgodHJhY2tpbmdObyxzZWFyY2hlcikgOyBcbiAgICAgICAgICByZXNvbHZlKHBrZyk7ICAgXG4gICAgICAgICB9KTtcbiAgICAgICB9KSBcbiAgICB9KTsgXG4gIH1cbiAgdXBkYXRlUGFja2FnZUluZGV4KHRyYWNraW5nKXtcbiAgICAgIHJldHVybiBuZXcgUHJvbWlzZSgocmVzb2x2ZSxyZWplY3QpPT57XG4gICAgICAgICAgdmFyIG1zZWFyY2ggPSB0aGlzLm15U2VhcmNoOyBcbiAgICAgICAgICBhZGRQYWNrYWdlVG9JbmRleCh0cmFja2luZyxtc2VhcmNoKTsgXG4gICAgICAgICByZXNvbHZlKHsndXBkYXRlZCc6dHJ1ZX0pO1xuICAgICAgfSlcbiAgfVxuICBnZXRDdXN0b21lclBhY2thZ2VzKHNreWJveCkge31cbiAgZ2V0TWFuaWZlc3RQYWNrYWdlc0J5U3RhdHVzKG1pZCxzdGF0dXMpIHtcbiAgICAgIHJldHVybiBuZXcgUHJvbWlzZSgocmVzb2x2ZSxyZWplY3QpPT57XG4gICAgICAgICAgY29uc29sZS5sb2coYEBtaWQ6WyR7bWlkfSAke21pZH1dYClcbiAgICAgICAgdGhpcy5teVNlYXJjaC5zZWFyY2goXG4gICAgICAgICAgICBgQG1pZDpbJHttaWR9ICR7bWlkfV1gLFxuICAgICAgICAgICAgeyBvZmZzZXQ6IDAsIG51bWJlck9mUmVzdWx0czogNTAwMCB9LFxuICAgICAgICAgICAgKGVyciwgZGF0YSkgPT4ge1xuICAgICAgICAgICAgICB2YXIgcGFja2FnZXMgPSBbXTtcbiAgICAgICAgICAgICAgY29uc29sZS5sb2coZGF0YSk7XG4gICAgICAgICAgICAgIGRhdGEucmVzdWx0cy5mb3JFYWNoKGVsZW1lbnQgPT4ge1xuXG4gICAgICAgICAgICAgICAgcGFja2FnZXMucHVzaChlbGVtZW50LmRvYyk7XG4gICAgICAgICAgICAgICAgcmVzb2x2ZShwYWNrYWdlcyk7ICAgICAgICAgICAgICAgICBcbiAgICAgICAgICAgIH0pO1xuICAgICAgICB9KTtcbiAgICAgIH0pO1xuICBcbiAgfSAgIFxuICBcbiAgXG5cbiAgIC8vI3JlZ2lvbiBNYW5pZmVzdCBQYWNrYWdlIEZ1bmN0aW9ucyBcblxuICAgYWRkVG9GbGlnaHQoYWN0aW9uKXtcbiAgICByZXR1cm4gbmV3IFByb21pc2UoKHJlc29sdmUscmVqZWN0KT0+e1xuICAgICAgdmFyIHBhY2thZ2VObyA9IGdldFBhY2thZ2VJZEZyb21CYXJDb2RlKGFjdGlvbi5iYXJjb2RlKTsgXG4gICAgICBjb25zb2xlLmxvZyhhY3Rpb24pOyBcbiAgICAgIHRoaXMubXlTZWFyY2gudXBkYXRlKHBhY2thZ2VObyx7bWlkOmFjdGlvbi5taWQgLCBzdGF0dXM6IDIsIGxvY2F0aW9uOlwiTG9hZGVkIG9uIEFpckNyYWZ0XCJ9LChlcnIscmVzdWx0KT0+e1xuICAgICAgICBpZihlcnIpXG4gICAgICAgICAgcmVzb2x2ZSh7YWRkZWQ6ZmFsc2V9KVxuICAgICAgICBcbiAgICAgICAgcmVzb2x2ZSh7YWRkZWQ6dHJ1ZX0pXG4gICAgICB9KVxuICAgICAgICBcbiAgICB9KVxuICAgfVxuICAgLy9yZW1vdmUgZnJvbSBmbGlnaHQgXG4gICByZW1vdmVGcm9tRmxpZ2h0KGFjdGlvbil7XG4gICAgcmV0dXJuIG5ldyBQcm9taXNlKChyZXNvbHZlLHJlamVjdCk9PntcbiAgICAgICAgdmFyIHBhY2thZ2VObyA9IGdldFBhY2thZ2VJZEZyb21CYXJDb2RlKGFjdGlvbi5iYXJjb2RlKTsgICBcbiAgICAgICAgdGhpcy5teVNlYXJjaC51cGRhdGUocGFja2FnZU5vLHttaWQ6YWN0aW9uLm1pZH0sKGVycixyZXN1bHQpPT57XG4gICAgICAgIGlmKGVycilcbiAgICAgICAgICAgIHJlc29sdmUoe3JlbW92ZWQ6ZmFsc2V9KVxuICAgICAgICAgIFxuICAgICAgICAgIHJlc29sdmUoe3JlbW92ZWQ6dHJ1ZX0pXG4gICAgICAgIH0pXG4gICAgfSlcbiAgIH1cbiAgIHJlY0Zyb21UcnVjayh0cmFja2luZ05vLHVzZXJuYW1lLHNoaXBtZW50SWQpe1xuICAgICByZXR1cm4gbmV3IFByb21pc2UoKHJlc29sdmUscmVqZWN0KT0+e1xuICAgICAgICBkYXRhQ29udGV4dC5yZWRpc0NsaWVudC5zYWRkKFwic2hpcG1lbnQ6aWQ6XCIrc2hpcG1lbnRJZCx0cmFja2luZ05vLChlcnIscmVwbHkpPT57XG4gICAgICAgICAgZGF0YUNvbnRleHQucmVkaXNDbGllbnQuc2V0KFJFQ19QS0crdHJhY2tpbmdObyxtb21lbnQoKS51bml4KCksIChlcnIscmVzdWx0KT0+e1xuICAgICAgICAgICAgaWYgKGVycikgcmVzb2x2ZSh7c2F2ZWQ6ZmFsc2V9KVxuICAgICAgICAgICAgLy9zaGlwbWVudCBjb3VudCBcbiAgICAgICAgICAgIHZhciBzaGlwbWVudENvdW50ID0gMTtcbiAgICAgICAgICAgIGRhdGFDb250ZXh0LnJlZGlzQ2xpZW50LnNjYXJkKFwic2hpcG1lbnQ6aWQ6XCIrc2hpcG1lbnRJZCwoZXJyLGNhcmQpPT57XG4gICAgICAgICAgICAgIHJlc29sdmUoe3NhdmVkOnRydWUscGtnQ291bnQ6Y2FyZH0pXG4gICAgICAgICAgICB9KTtcbiAgICAgICAgICAgXG4gICAgICAgICAgfSlcbiAgICAgICAgfSlcbiAgICAgICAgXG4gICAgIH0pXG4gICB9XG4gICBwcm9jc3Nlc3NQYWNrYWdlKHBrZ0lmbm8sdXNlcm5hbWUpe1xuICAgICByZXR1cm4gbmV3IFByb21pc2UoKHJlc29sdmUscmVqZWN0KT0+e1xuICAgICAgIGRhdGFDb250ZXh0LnJlZGlzQ2xpZW50Lmhtc2V0KFwiZmVlczphd2I6XCIrcGtnSWZuby5hd2IscGtnSWZubywoZXJyLHJlc3VsdCk9PntcbiAgICAgICAgIGlmIChlcnIpXG4gICAgICAgICAgY29uc29sZS5sb2coZXJyKTsgXG4gICAgICAgICAgY29uc29sZS5sb2cocmVzdWx0KTsgXG4gICAgICAgICBkYXRhQ29udGV4dC5yZWRpc0NsaWVudC5wdWJsaXNoKFwicHJpbnQ6ZmVlczpcIit1c2VybmFtZSxwa2dJZm5vLmF3Yik7IFxuICAgICAgICAgcmVzb2x2ZSh7c2VudDp0cnVlfSlcbiAgICAgICB9KVxuICAgICB9KVxuICAgfVxuICAgcmVjRnJvbVBsYW5lTmFzKGJhcmNvZGUpe1xuICAgICByZXR1cm4gbmV3IFByb21pc2UoKHJlc29sdmUscmVqZWN0KT0+e1xuICAgICAgIHZhciBzcnYgPSB0aGlzIDsgXG4gICAgICAgdmFyIHBrZ0lkID0gZ2V0UGFja2FnZUlkRnJvbUJhckNvZGUoYmFyY29kZSk7IFxuICAgICAgICBzcnYubXlTZWFyY2guZ2V0RG9jKHBrZ0lkLChlcnIscGtnKT0+e1xuICAgICAgICAgICAgcGtnLmRvYy5zdGF0dXMgPSA0OyBcbiAgICAgICAgICAgIHBrZy5kb2MubG9jYXRpb24gID0gXCJXYXJlaG91c2UgTkFTXCI7IFxuICAgICAgICAgICAgc3J2Lm15U2VhcmNoLnVwZGF0ZShwa2dJZCxwa2cuZG9jLChlcnIsdXBkYXRlUmVzdWx0KT0+e1xuICAgICAgICAgICAgICBpZihlcnIpXG4gICAgICAgICAgICAgICAgcmVqZWN0KHt1cGRhdGVkOmZhbHNlfSlcbiAgICAgICAgICAgICAgcmVzb2x2ZSh7dXBkYXRlZDp0cnVlfSlcbiAgICAgICAgICAgIH0pXG4gICAgICAgIH0pXG4gICAgIH0pXG4gICB9XG4gICAvLyNlbmRyZWdpb25cbn1cblxuZnVuY3Rpb24gZ2V0UGFja2FnZUlkRnJvbUJhckNvZGUoYmFyQ29kZVZhbHVlKXtcbiAgdmFyIHBhcnRzID0gYmFyQ29kZVZhbHVlLnNwbGl0KFwiLVwiKTsgXG4gIGlmIChwYXJ0cy5sZW5ndGggPT0gMylcbiAgICBpZiAodHlwZW9mIHBhcnRzWzJdICE9IFwidW5kZWZpbmVkXCIpXG4gICAgcmV0dXJuIHBhcnRzWzJdLnRyaW0oKTsgXG4gIHJldHVybiBcIlwiXG59XG4iXX0=
