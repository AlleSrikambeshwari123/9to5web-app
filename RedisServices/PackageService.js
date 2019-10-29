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
    value: function recFromTruck(trackingNo) {
      return new Promise(function (resolve, reject) {

        dataContext.redisClient.set(REC_PKG + trackingNo, moment().unix(), function (err, result) {
          if (err) resolve({ saved: false });
          resolve({ saved: true });
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
//# sourceMappingURL=data:application/json;charset=utf8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIlJlZGlzU2VydmljZXMvUGFja2FnZVNlcnZpY2UuZXM2Il0sIm5hbWVzIjpbInJlZGlzIiwicmVxdWlyZSIsImxyZWRpcyIsIm1vbWVudCIsInJlZGlzU2VhcmNoIiwiZnMiLCJQYWNrYWdlVXRpbCIsIlBhY2thZ2VVdGlsaXR5IiwicGFja2FnZVV0aWwiLCJQS0dfSURYIiwiUEtHX0lEX0NPVU5URVIiLCJkYXRhQ29udGV4dCIsIlBLR19QUkVGSVgiLCJBV0JfSUQiLCJJTkRFWF9BV0IiLCJSRUNfUEtHIiwiQ3VzdG9tZXJTZXJ2aWNlIiwiY3VzdG9tZXJTZXJ2aWNlIiwiUEtHX1NUQVRVUyIsImF3YkluZGV4IiwiY2xpZW50T3B0aW9ucyIsInNlYXJjaENsaWVudERldGFpbHMiLCJwYWNrYWdlSW5kZXgiLCJnZXRQYWNrYWdlVm9sdW1uZSIsIm1QYWNrYWdlIiwiY3JlYXRlRG9jdW1lbnQiLCJ0UGFja2FnZSIsInBhY2thZ2VEb2N1bWVudCIsImlkIiwidHJhY2tpbmdObyIsInNreWJveCIsImRhdGVSZWNpZXZlZCIsInVuaXgiLCJhd2IiLCJtaWQiLCJ2b2x1bWUiLCJ3ZWlnaHQiLCJwaWVjZXMiLCJjdXN0b21lciIsInNoaXBwZXIiLCJkZXNjcmlwdGlvbiIsImRpbWVuc2lvbnMiLCJjYXJyaWVyIiwic3RhdHVzIiwidmFsdWUiLCJjb25zb2xlIiwibG9nIiwic2V0UGFja2FnZUluVHJhbnNpdCIsImtleXMiLCJtc2VhcmNoZXIiLCJQcm9taXNlIiwicmVzb2x2ZSIsInJlamVjdCIsImJhdGNoZXIiLCJjbGllbnQiLCJiYXRjaCIsImZvckVhY2giLCJsb2NhdGlvbiIsImVsZW1lbnQiLCJobXNldCIsImV4ZWMiLCJlcnIiLCJyZXN1bHQiLCJhZGRQYWNrYWdlVG9JbmRleCIsImdldFBhY2thZ2UiLCJ0aGVuIiwiZGVsRG9jdW1lbnQiLCJwYWNrIiwiZG9uZSIsImRvY3VtZW50IiwiYWRkIiwiUGFja2FnZVNlcnZpY2UiLCJzZXR1cEluZGV4IiwibXlTZWFyY2giLCJyZWRpc0NsaWVudCIsImV4aXN0cyIsInNldCIsImluaXRSZXN1bHQiLCJpbmNyIiwibmV3SWQiLCJ0b1N0cmluZyIsInVwZGF0ZSIsImVycjEiLCJhd2JSZXMiLCJzYXZlZCIsInJlcGx5IiwiaW52b2ljZSIsImhhc0RvY3MiLCJkYXRlQ3JlYXRlZCIsInNlYXJjaCIsIm51bWJlck9mUmVzdWx0cyIsIm9mZnNldCIsInBhY2thZ2VzIiwidG90YWxSZXN1bHRzIiwicmVzdWx0cyIsInBhY2thZ2UxIiwiZG9jIiwiTnVtYmVyIiwiZGF0YSIsInNydiIsInBhY2thZ2VsaXN0IiwiY291bnQiLCJsZW5ndGgiLCJzdWJzdHJpbmciLCJwdXNoIiwic29ydEJ5IiwiYXdicyIsImF3Ykxpc3QiLCJhbGwiLCJtYXAiLCJnZXRDdXN0b21lciIsImN1c3RvbWVySWQiLCJnZXRBd2JPdmVydmlldyIsImN1c3RvbWVycyIsImkiLCJmb3JtYXQiLCJjb25zaWduZWUiLCJuYW1lIiwiZGV0YWlscyIsInBtYiIsImNhdGNoIiwiZ2V0RG9jIiwiZ2V0QXdiRGV0YWlscyIsInRyYWNraW5nTnVtYmVyIiwibG9jYXRpb25faWQiLCJwYWNrYWdlUmVzdWx0IiwibmV3UGFja2FnZSIsImJvZHkiLCJjUGFja2FnZSIsInJlcGxhY2UiLCJ0cmltIiwidHJhY2tpbmciLCJyZXNwb25zZSIsImluZGV4UGFja2FnZSIsImRvY1Jlc3VsdCIsInBhZ2UiLCJwYWdlU2l6ZSIsImJhcmNvZGUiLCJwa2dJZCIsImdldFBhY2thZ2VJZEZyb21CYXJDb2RlIiwiZ2V0QXdiIiwiYXdiaW5mbyIsInBhY2thZ2UiLCJtc2VhcmNoIiwib2xkRG9jSWQiLCJkb2NJZCIsInVwZGF0ZWRQYWNrYWdlcyIsInBhY2thZ2VJZCIsIm1hbmlmZXN0IiwibWFuaWZlc3RLZXkiLCJkZWwiLCJkZWNyIiwiZ2V0S2V5cyIsImtleXNDb3VudCIsImtSZXN1bHQiLCJzcmVtIiwiclJlc3VsdCIsImRlbGV0ZWQiLCJiaW4iLCJzZWFyY2hlciIsInBrZyIsImFjdGlvbiIsInBhY2thZ2VObyIsImFkZGVkIiwicmVtb3ZlZCIsInBrZ0lmbm8iLCJ1c2VybmFtZSIsInB1Ymxpc2giLCJzZW50IiwidXBkYXRlUmVzdWx0IiwidXBkYXRlZCIsImJhckNvZGVWYWx1ZSIsInBhcnRzIiwic3BsaXQiXSwibWFwcGluZ3MiOiI7Ozs7Ozs7OztBQUFBOztBQUNBOzs7Ozs7QUFHQSxJQUFJQSxRQUFRQyxRQUFRLE9BQVIsQ0FBWjtBQUNBLElBQUlDLFNBQVNELFFBQVEsZUFBUixDQUFiO0FBQ0EsSUFBSUUsU0FBU0YsUUFBUSxRQUFSLENBQWI7QUFDQSxJQUFJRyxjQUFjSCxRQUFRLHFCQUFSLENBQWxCO0FBQ0EsSUFBSUksS0FBS0osUUFBUSxJQUFSLENBQVQ7QUFDQSxJQUFJRSxTQUFTRixRQUFRLFFBQVIsQ0FBYjtBQUNBLElBQUlLLGNBQWNMLFFBQVEscUJBQVIsRUFBK0JNLGNBQWpEO0FBQ0EsSUFBSUMsY0FBYyxJQUFJRixXQUFKLEVBQWxCO0FBQ0EsSUFBTUcsVUFBVSxnQkFBaEI7QUFDQSxJQUFNQyxpQkFBaUIsWUFBdkI7QUFDQSxJQUFJQyxjQUFjVixRQUFRLGVBQVIsQ0FBbEI7QUFDQSxJQUFNVyxhQUFhLFdBQW5CO0FBQ0EsSUFBTUMsU0FBUyxRQUFmO0FBQ0EsSUFBTUMsWUFBWSxXQUFsQjtBQUNBLElBQU1DLFVBQVUsVUFBaEI7QUFDQSxJQUFJQyxrQkFBa0JmLFFBQVEsbUJBQVIsRUFBNkJlLGVBQW5EO0FBQ0EsSUFBSUMsa0JBQWtCLElBQUlELGVBQUosRUFBdEI7QUFDQSxJQUFNRSxhQUFhO0FBQ2pCLEtBQUksVUFEYTtBQUVqQixLQUFHLG9CQUZjO0FBR2pCLEtBQUcsWUFIYztBQUlqQixLQUFHLGlCQUpjO0FBS2pCLEtBQUcsNkJBTGM7QUFNakIsS0FBRzs7QUFOYyxDQUFuQjs7QUFVQSxJQUFNQyxXQUFXZixZQUFZSixLQUFaLEVBQW1CYyxTQUFuQixFQUE4QjtBQUM3Q00saUJBQWVsQixPQUFPbUI7QUFEdUIsQ0FBOUIsQ0FBakI7QUFHQSxJ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SixDQUFRdkMsUUFBUixHQUFvQixlQUFwQjtBQUNBMEMsY0FBSTFCLFFBQUosQ0FBYVEsTUFBYixDQUFvQnlELEtBQXBCLEVBQTBCc0IsSUFBSWhFLEdBQTlCLEVBQWtDLFVBQUNuQyxHQUFELEVBQUs0RyxZQUFMLEVBQW9CO0FBQ3BELGdCQUFHNUcsR0FBSCxFQUNFVCxPQUFPLEVBQUNzSCxTQUFRLEtBQVQsRUFBUDtBQUNGdkgsb0JBQVEsRUFBQ3VILFNBQVEsSUFBVCxFQUFSO0FBQ0QsV0FKRDtBQUtILFNBUkQ7QUFTRixPQVpNLENBQVA7QUFhRDtBQUNEOzs7Ozs7O0FBR0gsU0FBUy9CLHVCQUFULENBQWlDZ0MsWUFBakMsRUFBOEM7QUFDNUMsTUFBSUMsUUFBUUQsYUFBYUUsS0FBYixDQUFtQixHQUFuQixDQUFaO0FBQ0EsTUFBSUQsTUFBTXRFLE1BQU4sSUFBZ0IsQ0FBcEIsRUFDRSxJQUFJLE9BQU9zRSxNQUFNLENBQU4sQ0FBUCxJQUFtQixXQUF2QixFQUNBLE9BQU9BLE1BQU0sQ0FBTixFQUFTMUMsSUFBVCxFQUFQO0FBQ0YsU0FBTyxFQUFQO0FBQ0QiLCJmaWxlIjoiUmVkaXNTZXJ2aWNlcy9QYWNrYWdlU2VydmljZS5qcyIsInNvdXJjZXNDb250ZW50IjpbImltcG9ydCB7IGNwdXMgfSBmcm9tIFwib3NcIjtcbmltcG9ydCB7IHByb21pc2VzIH0gZnJvbSBcImRuc1wiO1xuXG5cbnZhciByZWRpcyA9IHJlcXVpcmUoXCJyZWRpc1wiKTtcbnZhciBscmVkaXMgPSByZXF1aXJlKFwiLi9yZWRpcy1sb2NhbFwiKTtcbnZhciBtb21lbnQgPSByZXF1aXJlKFwibW9tZW50XCIpO1xudmFyIHJlZGlzU2VhcmNoID0gcmVxdWlyZShcIi4uL3JlZGlzZWFyY2hjbGllbnRcIik7XG52YXIgZnMgPSByZXF1aXJlKFwiZnNcIik7XG52YXIgbW9tZW50ID0gcmVxdWlyZSgnbW9tZW50JylcbnZhciBQYWNrYWdlVXRpbCA9IHJlcXVpcmUoXCIuLi9VdGlsL3BhY2thZ2V1dGlsXCIpLlBhY2thZ2VVdGlsaXR5O1xudmFyIHBhY2thZ2VVdGlsID0gbmV3IFBhY2thZ2VVdGlsKCk7XG5jb25zdCBQS0dfSURYID0gXCJpbmRleDpwYWNrYWdlc1wiO1xuY29uc3QgUEtHX0lEX0NPVU5URVIgPSBcInBhY2thZ2U6aWRcIjtcbnZhciBkYXRhQ29udGV4dCA9IHJlcXVpcmUoJy4vZGF0YUNvbnRleHQnKVxuY29uc3QgUEtHX1BSRUZJWCA9IFwicGFja2FnZXM6XCI7XG5jb25zdCBBV0JfSUQgPSBcImF3YjppZFwiXG5jb25zdCBJTkRFWF9BV0IgPSBcImluZGV4OmF3YlwiXG5jb25zdCBSRUNfUEtHID0gXCJwa2c6cmVjOlwiXG52YXIgQ3VzdG9tZXJTZXJ2aWNlID0gcmVxdWlyZSgnLi9DdXN0b21lclNlcnZpY2UnKS5DdXN0b21lclNlcnZpY2U7IFxudmFyIGN1c3RvbWVyU2VydmljZSA9IG5ldyBDdXN0b21lclNlcnZpY2UoKVxuY29uc3QgUEtHX1NUQVRVUyA9IHsgXG4gIDEgOiBcIlJlY2VpdmVkXCIsXG4gIDI6IFwiTG9hZGVkIG9uIEFpckNyYWZ0XCIsXG4gIDM6IFwiSW4gVHJhbnNpdFwiLFxuICA0OiBcIlJlY2lldmVkIGluIE5BU1wiLFxuICA1OiBcIlJlYWR5IGZvciBQaWNrdXAgLyBEZWxpdmVyeVwiLFxuICA2OiBcIkRlbGl2ZXJlZFwiXG5cbn07IFxuXG5jb25zdCBhd2JJbmRleCA9IHJlZGlzU2VhcmNoKHJlZGlzLCBJTkRFWF9BV0IsIHtcbiAgY2xpZW50T3B0aW9uczogbHJlZGlzLnNlYXJjaENsaWVudERldGFpbHNcbn0pO1xuY29uc3QgcGFja2FnZUluZGV4ID0gcmVkaXNTZWFyY2gocmVkaXMsIFBLR19JRFgsIHtcbiAgY2xpZW50T3B0aW9uczogbHJlZGlzLnNlYXJjaENsaWVudERldGFpbHNcbn0pO1xuZnVuY3Rpb24gZ2V0UGFja2FnZVZvbHVtbmUobVBhY2thZ2Upe1xuXG4gIHJldHVybiAwOyBcbn1cbmZ1bmN0aW9uIGNyZWF0ZURvY3VtZW50KHRQYWNrYWdlKSB7XG4gIHZhciBwYWNrYWdlRG9jdW1lbnQgPSB7XG4gICAgaWQ6dFBhY2thZ2UuaWQsXG4gICAgdHJhY2tpbmdObzogdFBhY2thZ2UudHJhY2tpbmdObyxcbiAgICBza3lib3g6IHRQYWNrYWdlLnNreWJveCxcbiAgICBkYXRlUmVjaWV2ZWQgOiBtb21lbnQoKS51bml4KCksIFxuICAgIGF3YjowLCBcbiAgICBtaWQ6MCxcbiAgICB2b2x1bWU6IGdldFBhY2thZ2VWb2x1bW5lKHRQYWNrYWdlKSxcbiAgICB3ZWlnaHQ6dFBhY2thZ2Uud2VpZ2h0LFxuICAgIHBpZWNlczp0UGFja2FnZS5waWVjZXMsXG4gICAgY3VzdG9tZXI6IHRQYWNrYWdlLmN1c3RvbWVyLFxuICAgIHNoaXBwZXI6IHRQYWNrYWdlLnNoaXBwZXIsXG4gICAgZGVzY3JpcHRpb246IHRQYWNrYWdlLmRlc2NyaXB0aW9uLFxuICAgIGRpbWVuc2lvbnM6dFBhY2thZ2UuZGltZW5zaW9ucyxcbiAgICBjYXJyaWVyOnRQYWNrYWdlLmNhcnJpZXIsXG4gICAgLy9za3lib3hWOiB0UGFja2FnZS5za3lib3gsIGFkZCBkaW1lbmlvbiBcbiAgICBzdGF0dXM6IHRQYWNrYWdlLnN0YXR1cyxcbiAgICBtaWQ6IHRQYWNrYWdlLm1pZCxcbiAgICB2YWx1ZTogdFBhY2thZ2UudmFsdWUsXG4gICAgXG4gIH07XG4gIGNvbnNvbGUubG9nKFwiYWJvdXQgdG8gYWRkIHRoZSBwYWNrYWdlIHRvIHRoZSBpbmRleFwiKTtcbiAgcmV0dXJuIHBhY2thZ2VEb2N1bWVudDtcbn1cbmZ1bmN0aW9uIHNldFBhY2thZ2VJblRyYW5zaXQoa2V5cywgbXNlYXJjaGVyKSB7XG4gIHJldHVybiBuZXcgUHJvbWlzZSgocmVzb2x2ZSwgcmVqZWN0KSA9PiB7XG4gICAgdmFyIGJhdGNoZXIgPSBtc2VhcmNoZXIuY2xpZW50LmJhdGNoKCk7XG4gICAga2V5cy5mb3JFYWNoKGVsZW1lbnQgPT4ge1xuICAgICAgdmFyIHZhbHVlID0ge1xuICAgICAgICBzdGF0dXM6IDIsXG4gICAgICAgIGxvY2F0aW9uOiBcIkluIFRyYW5zaXRcIlxuICAgICAgfTtcbiAgICAgIGNvbnNvbGUubG9nKGVsZW1lbnQgKyBcImlzIHRoZSBlbGVtZW50XCIpO1xuXG4gICAgICBiYXRjaGVyLmhtc2V0KFBLR19QUkVGSVggKyBlbGVtZW50LCB2YWx1ZSk7XG4gICAgfSk7XG4gICAgYmF0Y2hlci5leGVjKChlcnIsIHJlc3VsdCkgPT4ge1xuICAgICAgY29uc29sZS5sb2cocmVzdWx0KTtcbiAgICAgIC8vcmVhZGQgdGhlIGRvY3VtZW50cyBoZXJlXG4gICAgICBrZXlzLmZvckVhY2goZWxlbWVudCA9PiB7XG4gICAgICAgIGFkZFBhY2thZ2VUb0luZGV4KGVsZW1lbnQsIG1zZWFyY2hlcik7XG4gICAgICB9KTtcbiAgICAgIHJlc29sdmUocmVzdWx0KTtcbiAgICB9KTtcbiAgfSk7XG59XG5cbmZ1bmN0aW9uIGFkZFBhY2thZ2VUb0luZGV4KHRyYWNraW5nTm8sIG1zZWFyY2hlcikge1xuICBscmVkaXMuZ2V0UGFja2FnZSh0cmFja2luZ05vKS50aGVuKHBhY2sgPT4ge1xuICAgIG1zZWFyY2hlci5kZWxEb2N1bWVudChQS0dfSURYLCBgJHtwYWNrLm1pZH0tJHt0cmFja2luZ05vfWAsIChlcnIsIGRvbmUpID0+IHtcbiAgICAgIHZhciBkb2N1bWVudCA9IGNyZWF0ZURvY3VtZW50KHBhY2spO1xuICAgICAgY29uc29sZS5sb2coXCJyZWFkZGluZyBwYWNrYWdlIHRvIHRoZSBpbmRleCBsaWtlIGEgYm9zcyBcIiArIHRyYWNraW5nTm8pO1xuICAgICAgbXNlYXJjaGVyLmFkZChwYWNrLm1pZCArIFwiLVwiICsgcGFjay50cmFja2luZ05vLCBkb2N1bWVudCk7XG4gICAgfSk7XG4gIH0pO1xufVxuZXhwb3J0IGNsYXNzIFBhY2thZ2VTZXJ2aWNlIHtcbiAgY29uc3RydWN0b3IoKSB7XG4gICAgdGhpcy5zZXR1cEluZGV4KCk7XG4gIH1cbiAgc2V0dXBJbmRleCgpIHtcbiAgICB0aGlzLm15U2VhcmNoID0gcmVkaXNTZWFyY2gocmVkaXMsIFBLR19JRFgsIHtcbiAgICAgIGNsaWVudE9wdGlvbnM6IGxyZWRpcy5zZWFyY2hDbGllbnREZXRhaWxzXG4gICAgfSk7XG4gIH1cbiAgZ2V0TmV3QXdiKCl7XG4gICAgcmV0dXJuIG5ldyBQcm9taXNlKChyZXNvbHZlLHJlamVjdCk9PntcbiAgICAgIGRhdGFDb250ZXh0LnJlZGlzQ2xpZW50LmV4aXN0cyhBV0JfSUQsKGVycixyZXN1bHQpPT57XG4gICAgICAgIGNvbnNvbGUubG9nKHJlc3VsdCk7IFxuICAgICAgICBpZiAocmVzdWx0ICE9IFwiMVwiKXtcbiAgICAgICAgICBkYXRhQ29udGV4dC5yZWRpc0NsaWVudC5zZXQoQVdCX0lEID09IDEwMDAwMCwoZXJyLGluaXRSZXN1bHQpPT57XG4gICAgICAgICAgICBkYXRhQ29udGV4dC5yZWRpc0NsaWVudC5pbmNyKEFXQl9JRCwoZXJyLG5ld0lkKT0+e1xuICAgICAgICAgICAgICByZXNvbHZlKHthd2I6bmV3SWR9KVxuICAgICAgICAgICAgfSlcbiAgICAgICAgICB9KVxuICAgICAgICB9XG4gICAgICAgIGVsc2Uge1xuICAgICAgICAgIGRhdGFDb250ZXh0LnJlZGlzQ2xpZW50LmluY3IoQVdCX0lELChlcnIsbmV3SWQpPT57XG4gICAgICAgICAgICByZXNvbHZlKHthd2I6bmV3SWR9KVxuICAgICAgICAgIH0pXG4gICAgICAgIH1cbiAgICAgIH0pXG4gICAgfSk7XG4gIH1cbiAgc2F2ZUF3Yihhd2Ipe1xuICAgIHJldHVybiBuZXcgUHJvbWlzZSgocmVzb2x2ZSxyZWplY3QpPT57XG4gICAgICBjb25zb2xlLmxvZygnc2F2aW5nLi4uJyxhd2IsbW9tZW50KCkudG9TdHJpbmcoXCJoaDptbTpzc1wiKSlcbiAgICAgIGlmIChhd2IuaWQgIT1cIlwiKXtcbiAgICAgICAgYXdiSW5kZXgudXBkYXRlKGF3Yi5pZCxhd2IsKGVycjEsYXdiUmVzKT0+e1xuICAgICAgICAgIGlmIChlcnIxKXtcbiAgICAgICAgICAgIGNvbnNvbGUubG9nKCdzYXZpbmcgZXJyJyxlcnIxKVxuICAgICAgICAgICAgcmVzb2x2ZSh7c2F2ZWQ6ZmFsc2V9KVxuICAgICAgICAgIH1cbiAgICAgICAgICByZXNvbHZlKHtzYXZlZDp0cnVlLCBpZDphd2IuaWR9KVxuICAgICAgICB9KVxuICAgICAgfVxuICAgICAgZWxzZXtcbiAgICAgIGRhdGFDb250ZXh0LnJlZGlzQ2xpZW50LmluY3IoQVdCX0lELChlcnIscmVwbHkpPT57XG4gICAgICAgIGF3Yi5pZCA9IHJlcGx5OyBcbiAgICAgICAgYXdiLnN0YXR1cyA9IDE7IFxuICAgICAgICBpZiAoYXdiLmludm9pY2Upe1xuICAgICAgICAgIGF3Yi5oYXNEb2NzID0gMVxuICAgICAgICAgIGNvbnNvbGUubG9nKFwiSEFTIERPQ0NDQ0NcIilcbiAgICAgICAgfVxuICAgICAgICBlbHNlIHtcbiAgICAgICAgICBhd2IuaGFzRG9jcyA9IDAgOyBcbiAgICAgICAgICBjb25zb2xlLmxvZyhcIkhBUyBOTyBET0NDQ0NDXCIpXG4gICAgICAgIH1cbiAgICAgICAgXG4gICAgICAgIGF3Yi5kYXRlQ3JlYXRlZCA9IG1vbWVudCgpLnVuaXgoKTsgXG4gICAgICAgICAgYXdiSW5kZXguYWRkKGF3Yi5pZCxhd2IsKGVycjEsYXdiUmVzKT0+e1xuICAgICAgICAgICAgaWYgKGVycjEpe1xuICAgICAgICAgICAgICBjb25zb2xlLmxvZygnc2F2aW5nIGVycicsZXJyMSlcbiAgICAgICAgICAgICAgcmVzb2x2ZSh7c2F2ZWQ6ZmFsc2V9KVxuICAgICAgICAgICAgfVxuICAgICAgICAgICAgcmVzb2x2ZSh7c2F2ZWQ6dHJ1ZSwgaWQ6cmVwbHl9KVxuICAgICAgICAgIH0pXG4gICAgICB9KVxuICAgIH1cbiAgICAgIFxuICAgICAgXG4gICAgfSlcbiAgfVxuICBnZXRBd2JPdmVydmlldyhpZCl7XG4gICAgLy8gZ2V0IHRoZSBhd2IgcGFja2FnZXMgYW5kIGFkZCBldmVyeXRoaW5nIGluIFxuICAgIHJldHVybiBuZXcgUHJvbWlzZSgocmVzb2x2ZSxyZWplY3QpPT57XG4gICAgICBwYWNrYWdlSW5kZXguc2VhcmNoKGBAYXdiOlske2lkfSAke2lkfV1gLHtudW1iZXJPZlJlc3VsdHM6NTAwMCxvZmZzZXQ6MH0sKGVycixwYWNrYWdlcyk9PntcbiAgICAgICAgdmFyIHdlaWdodCA9IDAgOyBcbiAgICAgICAgdmFyIHBpZWNlcyA9IHBhY2thZ2VzLnRvdGFsUmVzdWx0czsgXG4gICAgICAgIHZhciBkZXNjcmlwdGlvbiA9IFwiXCJcbiAgICAgICAgcGFja2FnZXMucmVzdWx0cy5mb3JFYWNoKHBhY2thZ2UxID0+IHtcbiAgICAgICAgICBpZiAoZGVzY3JpcHRpb24gPT1cIlwiKVxuICAgICAgICAgICAgZGVzY3JpcHRpb24gPSBwYWNrYWdlMS5kb2MuZGVzY3JpcHRpb247IFxuICAgICAgICAgIHdlaWdodCArPSBOdW1iZXIocGFja2FnZTEuZG9jLndlaWdodClcbiAgICAgICAgfSk7XG4gICAgICAgIHZhciBkYXRhICA9IHt3ZWlnaHQ6d2VpZ2h0LGRlc2NyaXB0aW9uOmRlc2NyaXB0aW9uLHBpZWNlczpwaWVjZXN9XG4gICAgICAgIGNvbnNvbGUubG9nKGRhdGEsXCJBV0IgREVUQUlMU1wiKTsgXG4gICAgICAgIHJlc29sdmUoIGRhdGEpXG4gICAgICB9KVxuICAgIH0pXG4gICBcbiAgfVxuICBnZXRBd2JEZXRhaWxzKGlkKXtcbiAgICB2YXIgc3J2ID0gdGhpczsgXG4gICAgcmV0dXJuIG5ldyBQcm9taXNlKChyZXNvbHZlLHJlamVjdCk9PntcbiAgICAgIGNvbnNvbGUubG9nKGBAYXdiOlske2lkfSAke2lkfV1gKVxuICAgICBcbiAgICAgIHBhY2thZ2VJbmRleC5zZWFyY2goYEBhd2I6WyR7aWR9ICR7aWR9XWAse251bWJlck9mUmVzdWx0czo1MDAwLG9mZnNldDowfSwoZXJyLHBhY2thZ2VzKT0+e1xuICAgICAgICBpZiAoZXJyKVxuICAgICAgICAgY29uc29sZS5sb2coZXJyKVxuICAgICAgXG4gICAgICAgIHZhciAgcGFja2FnZWxpc3QgID0gW11cbiAgICAgICAgdmFyIGNvdW50ID0gMTsgXG4gICAgICAgIHBhY2thZ2VzLnJlc3VsdHMuZm9yRWFjaChwYWNrYWdlMSA9PiB7XG5cbiAgICAgICAgICBpZiAocGFja2FnZTEuZG9jLnRyYWNraW5nTm8ubGVuZ3RoID4gNyl7XG4gICAgICAgICAgICAvL29ubHkgZGlzcGxheSB0aGUgbGFzdCA3IFxuICAgICAgICAgICAgcGFja2FnZTEuZG9jLnRyYWNraW5nTm8gPSBwYWNrYWdlMS5kb2MudHJhY2tpbmdOby5zdWJzdHJpbmcocGFja2FnZTEuZG9jLnRyYWNraW5nTm8ubGVuZ3RoIC03KVxuICAgICAgICAgICAgXG4gICAgICAgICAgfVxuICAgICAgICAgIHBhY2thZ2UxLmRvYy5wYWNrYWdlSW5kZXggPSBjb3VudDtcbiAgICAgICAgICBjb3VudCArKzsgXG4gICAgICAgICAgcGFja2FnZWxpc3QucHVzaCggcGFja2FnZTEuZG9jKVxuICAgICAgICB9KTtcbiAgICAgICBcbiAgICAgICBcbiAgICAgICAgcmVzb2x2ZSggcGFja2FnZWxpc3QpXG4gICAgICB9KVxuICAgIH0pXG4gIH1cbiAgbGlzdE5vRG9jc0ZsbCgpe1xuICAgIHJldHVybiBuZXcgUHJvbWlzZSgocmVzb2x2ZSxyZWplY3QpPT57XG4gICAgICAgYXdiSW5kZXguc2VhcmNoKFwiQHN0YXR1czpbMSAxXSBAaGFzRG9jczpbMCAwXVwiLHtvZmZzZXQ6MCxudW1iZXJPZlJlc3VsdHM6NTAwMCxzb3J0Qnk6J2lkJ30sKGVycixhd2JzKT0+e1xuICAgICAgICAgdmFyIGF3Ykxpc3QgPSBbXTsgXG4gICAgICAgICBQcm9taXNlLmFsbChhd2JzLnJlc3VsdHMubWFwKGF3Yj0+Y3VzdG9tZXJTZXJ2aWNlLmdldEN1c3RvbWVyKGF3Yi5kb2MuY3VzdG9tZXJJZCkpKS50aGVuKGN1c3RvbWVycz0+e1xuICAgICAgICAgICBQcm9taXNlLmFsbChhd2JzLnJlc3VsdHMubWFwKGF3Yj0+dGhpcy5nZXRBd2JPdmVydmlldyhhd2IuZG9jLmlkKSkpLnRoZW4oZGV0YWlscz0+e1xuICAgICAgICAgICAgY29uc29sZS5sb2coXCJnb3QgdGhlIGN1c3RvbWVyc1wiLGN1c3RvbWVycywgYXdicylcbiAgICAgICAgICAgIGZvcih2YXIgaSA9MCA7IGkgPCBhd2JzLnJlc3VsdHMubGVuZ3RoIDsgaSsrICl7XG4gICAgICAgICAgICAgIHZhciBhd2IgPSBhd2JzLnJlc3VsdHNbaV07IFxuICAgICAgICAgICAgICBhd2IuZG9jLmRhdGVDcmVhdGVkID0gbW9tZW50LnVuaXgoYXdiLmRvYy5kYXRlQ3JlYXRlZCkuZm9ybWF0KFwiWVlZWS1NTS1ERCBoaDptbSBBXCIpXG4gICAgICAgICAgICAgIC8vd2UgbmVlZCB0byBnZXQgdGhlIGN1c3RvbWVyIFxuICAgICAgICAgICAgICBhd2IuZG9jLmNvbnNpZ25lZSA9IGN1c3RvbWVyc1tpXS5uYW1lOyBcbiAgICAgICAgICAgICAgYXdiLmRvYy53ZWlnaHQgPSBkZXRhaWxzW2ldLndlaWdodDsgXG4gICAgICAgICAgICAgIGF3Yi5kb2MucG1iID0gY3VzdG9tZXJzW2ldLnBtYjsgXG4gICAgICAgICAgICAgIGF3Yi5kb2MuZGVzY3JpcHRpb24gPSBkZXRhaWxzW2ldLmRlc2NyaXB0aW9uOyBcbiAgICAgICAgICAgICAgYXdiLmRvYy5waWVjZXMgPSBkZXRhaWxzW2ldLnBpZWNlczsgXG4gICAgICAgICAgICAgIGlmIChjdXN0b21lcnNbaV0ucG1iID09ICcnKXtcbiAgICAgICAgICAgICAgICBhd2IuZG9jLnBtYiA9ICc5MDAwJ1xuICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgIGNvbnNvbGUubG9nKCdwdXNoaW5nICcsYXdiKVxuICAgICAgICAgICAgICAvL3dlIG5lZWQgdG8gZ2V0IGFsbCB0aGUgcGFja2FnZXMgXG4gICAgICAgICAgICAgIGF3Ykxpc3QucHVzaChhd2IuZG9jKVxuICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICByZXNvbHZlKHthd2JzOmF3Ykxpc3R9KVxuICAgICAgICAgICB9KVxuICAgICAgICAgIFxuICAgICAgICAgIH0pLmNhdGNoKGVycj0+e1xuICAgICAgICAgICAgY29uc29sZS5sb2coZXJyKTsgXG4gICAgICAgICAgfSlcbiAgICAgICAgIFxuICAgICAgICAvLyAgYXdicy5yZXN1bHRzLmZvckVhY2goYXdiID0+IHtcbiAgICAgICAgICAgXG4gICAgICAgICAgXG4gICAgICAgIC8vICB9KTtcbiAgICAgICAgIFxuICAgICAgIH0pXG4gICAgfSlcbiAgfVxuXG4gIGxpc3RBd2JpbkZsbCgpe1xuICAgIHJldHVybiBuZXcgUHJvbWlzZSgocmVzb2x2ZSxyZWplY3QpPT57XG4gICAgICAgYXdiSW5kZXguc2VhcmNoKFwiQHN0YXR1czpbMSAxXSBAaGFzRG9jczpbMSAxXVwiLHtvZmZzZXQ6MCxudW1iZXJPZlJlc3VsdHM6NTAwMCxzb3J0Qnk6J2lkJ30sKGVycixhd2JzKT0+e1xuICAgICAgICAgdmFyIGF3Ykxpc3QgPSBbXTsgXG4gICAgICAgICBQcm9taXNlLmFsbChhd2JzLnJlc3VsdHMubWFwKGF3Yj0+Y3VzdG9tZXJTZXJ2aWNlLmdldEN1c3RvbWVyKGF3Yi5kb2MuY3VzdG9tZXJJZCkpKS50aGVuKGN1c3RvbWVycz0+e1xuICAgICAgICAgICBQcm9taXNlLmFsbChhd2JzLnJlc3VsdHMubWFwKGF3Yj0+dGhpcy5nZXRBd2JPdmVydmlldyhhd2IuZG9jLmlkKSkpLnRoZW4oZGV0YWlscz0+e1xuICAgICAgICAgICAgY29uc29sZS5sb2coXCJnb3QgdGhlIGN1c3RvbWVyc1wiLGN1c3RvbWVycywgYXdicylcbiAgICAgICAgICAgIGZvcih2YXIgaSA9MCA7IGkgPCBhd2JzLnJlc3VsdHMubGVuZ3RoIDsgaSsrICl7XG4gICAgICAgICAgICAgIHZhciBhd2IgPSBhd2JzLnJlc3VsdHNbaV07IFxuICAgICAgICAgICAgICBhd2IuZG9jLmRhdGVDcmVhdGVkID0gbW9tZW50LnVuaXgoYXdiLmRvYy5kYXRlQ3JlYXRlZCkuZm9ybWF0KFwiWVlZWS1NTS1ERCBoaDptbSBBXCIpXG4gICAgICAgICAgICAgIC8vd2UgbmVlZCB0byBnZXQgdGhlIGN1c3RvbWVyIFxuICAgICAgICAgICAgICBhd2IuZG9jLmNvbnNpZ25lZSA9IGN1c3RvbWVyc1tpXS5uYW1lOyBcbiAgICAgICAgICAgICAgYXdiLmRvYy5wbWIgPSBjdXN0b21lcnNbaV0ucG1iOyBcbiAgICAgICAgICAgICAgYXdiLmRvYy53ZWlnaHQgPSBkZXRhaWxzW2ldLndlaWdodDsgXG4gICAgICAgICAgICAgIGF3Yi5kb2MuZGVzY3JpcHRpb24gPSBkZXRhaWxzW2ldLmRlc2NyaXB0aW9uOyBcbiAgICAgICAgICAgICAgYXdiLmRvYy5waWVjZXMgPSBkZXRhaWxzW2ldLnBpZWNlczsgXG4gICAgICAgICAgICAgIGlmIChjdXN0b21lcnNbaV0ucG1iID09ICcnKXtcbiAgICAgICAgICAgICAgICBhd2IuZG9jLnBtYiA9ICc5MDAwJ1xuICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgIGNvbnNvbGUubG9nKCdwdXNoaW5nICcsYXdiKVxuICAgICAgICAgICAgICAvL3dlIG5lZWQgdG8gZ2V0IGFsbCB0aGUgcGFja2FnZXMgXG4gICAgICAgICAgICAgIGF3Ykxpc3QucHVzaChhd2IuZG9jKVxuICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICByZXNvbHZlKHthd2JzOmF3Ykxpc3R9KVxuICAgICAgICAgICB9KVxuICAgICAgICAgIFxuICAgICAgICAgIH0pLmNhdGNoKGVycj0+e1xuICAgICAgICAgICAgY29uc29sZS5sb2coZXJyKTsgXG4gICAgICAgICAgfSlcbiAgICAgICAgIFxuICAgICAgICAvLyAgYXdicy5yZXN1bHRzLmZvckVhY2goYXdiID0+IHtcbiAgICAgICAgICAgXG4gICAgICAgICAgXG4gICAgICAgIC8vICB9KTtcbiAgICAgICAgIFxuICAgICAgIH0pXG4gICAgfSlcbiAgfVxuICBnZXRBd2IoaWQpe1xuICAgIGNvbnN0IHNydiA9IHRoaXM7IFxuICAgIHJldHVybiBuZXcgUHJvbWlzZSgocmVzb2x2ZSxyZWplY3QpPT57XG4gICAgICBhd2JJbmRleC5nZXREb2MoaWQsKGVycixhd2IpPT57XG4gICAgICAgIC8vZ2V0IHRoZSBjdXN0b21lciBcbiAgICAgICAgY3VzdG9tZXJTZXJ2aWNlLmdldEN1c3RvbWVyKGF3Yi5kb2MuY3VzdG9tZXJJZCkudGhlbihjdXN0b21lcj0+e1xuICAgICAgICAgIGF3Yi5kb2MuY3VzdG9tZXIgPSBjdXN0b21lcjsgXG4gICAgICAgICAgc3J2LmdldEF3YkRldGFpbHMoaWQpLnRoZW4ocGFja2FnZXM9PntcbiAgICAgICAgICAgIC8vZ2V0IHRoZSBwYWNrYWdlcyBmb3IgdGhlIGF3YiBcbiAgICAgICAgICAgIGF3Yi5kb2MucGFja2FnZXMgPSBwYWNrYWdlczsgXG4gICAgICAgICAgICByZXNvbHZlKHthd2I6YXdiLmRvY30pICBcbiAgICAgICAgICB9KVxuICAgICAgICAgIFxuICAgICAgICB9KVxuICAgICAgICBcbiAgICAgIH0pXG4gICAgfSlcbiAgfVxuICB1cGRhdGVMb2NhdGlvbih0cmFja2luZ051bWJlcixsb2NhdGlvbl9pZCl7XG4gICAgcmV0dXJuIG5ldyBQcm9taXNlKChyZXNvbHZlLHJlamVjdCk9PntcbiAgICAgIHBhY2thZ2VJbmRleC5zZWFyY2goXCJAdHJhY2tpbmdObzpcIit0cmFja2luZ051bWJlcix7bG9jYXRpb246bG9jYXRpb25faWR9LChlcnIscGFja2FnZVJlc3VsdCk9PntcblxuICAgICAgfSlcbiAgICB9KVxuICB9XG4gIHNhdmVQYWNrYWdlVG9Bd2IobmV3UGFja2FnZSl7XG4gICAgcmV0dXJuIG5ldyBQcm9taXNlKChyZXNvbHZlLHJlc3VsdCk9PntcbiAgICAgIGlmIChuZXdQYWNrYWdlLmlkICE9XCIwXCIpe1xuICAgICAgICBwYWNrYWdlSW5kZXgudXBkYXRlKG5ld1BhY2thZ2UuaWQsbmV3UGFja2FnZSwoZXJyLHJlc3VsdCk9PntcbiAgICAgICAgICBpZiAoZXJyKVxuICAgICAgICAgICAgY29uc29sZS5sb2coZXJyKTsgXG4gICAgICAgICAgcmVzb2x2ZSh7c2F2ZWQ6dHJ1ZSxpZDpuZXdQYWNrYWdlLmlkfSlcbiAgICAgICAgfSlcbiAgICAgIH1cbiAgICAgIGVsc2Uge1xuICAgICAgICBkYXRhQ29udGV4dC5yZWRpc0NsaWVudC5pbmNyKFBLR19JRF9DT1VOVEVSLChlcnIsaWQpPT57XG4gICAgICAgICAgbmV3UGFja2FnZS5pZCA9IGlkOyBcbiAgICAgICAgICBwYWNrYWdlSW5kZXguYWRkKGlkLG5ld1BhY2thZ2UsKGVycixyZXN1bHQpPT57XG4gICAgICAgICAgICBpZiAoZXJyKVxuICAgICAgICAgICAgICBjb25zb2xlLmxvZyhlcnIpOyBcbiAgICAgICAgICAgIHJlc29sdmUoe3NhdmVkOnRydWUsaWQ6aWR9KVxuICAgICAgICAgIH0pXG4gICAgICAgIH0pXG4gICAgICB9XG4gICBcbiAgICB9KVxuICB9XG4gIHNhdmVQYWNrYWdlKGJvZHkpe1xuICAgIHJldHVybiBuZXcgUHJvbWlzZSgocmVzb2x2ZSxyZWplY3QpPT57XG4gICAgICB2YXIgY1BhY2thZ2UgPSB7XG4gICAgICAgIFxuICAgICAgICBza3lib3g6IGJvZHkuc2t5Ym94LFxuICAgICAgICBjdXN0b21lcjogYm9keS5jdXN0b21lci5yZXBsYWNlKFwiLVwiLCBcIlwiKS50cmltKCksXG4gICAgICAgIHRyYWNraW5nTm86IGJvZHkudHJhY2tpbmcsXG4gICAgICAgIGRlc2NyaXB0aW9uOiBib2R5LmRlc2NyaXB0aW9uLFxuICAgICAgICBzaGlwcGVyOiBib2R5LnNoaXBwZXIsXG4gICAgICAgIGNhcnJpZXI6Ym9keS5jYXJyaWVyLFxuICAgICAgICB2YWx1ZTogTnVtYmVyKGJvZHkudmFsdWUpLFxuICAgICAgICBwaWVjZXM6IE51bWJlcihib2R5LnBpZWNlcyksXG4gICAgICAgIHdlaWdodDogTnVtYmVyKGJvZHkud2VpZ2h0KSxcbiAgICAgICAgZGltZW5zaW9uczogYm9keS5kaW1lbnNpb25zLFxuICAgICAgICBzdGF0dXM6IDEsXG4gICAgICAgIGxvY2F0aW9uOiBcIkZMTFwiLFxuICAgICAgICBtaWQ6IDAsXG4gICAgICAgIGF3YjowLFxuICAgICAgICAvL2hhc09wdDogdHJ1ZSxcbiAgICAgICAgLy9tdHlwZTogYm9keS5tdHlwZVxuICAgICAgfTtcbiAgICAgIC8vdmFsaWRhdGUgdGhlIHBhY2thZ2UgXG4gICAgICBkYXRhQ29udGV4dC5yZWRpc0NsaWVudC5pbmNyKFBLR19JRF9DT1VOVEVSLChlcnIsaWQpPT57XG4gICAgICAgIGNQYWNrYWdlLmlkID0gaWQ7IFxuICAgICAgICBkYXRhQ29udGV4dC5yZWRpc0NsaWVudC5zZXQoUEtHX1BSRUZJWCtpZCxjUGFja2FnZSwoZXJyLHJlc3BvbnNlKT0+e1xuICAgICAgICAgIGlmIChlcnIpe1xuICAgICAgICAgICAgcmVqZWN0KHtzYXZlZDpmYWxzZSxlcnI6ZXJyfSlcbiAgICAgICAgICB9XG4gICAgICAgICAgIHZhciBpbmRleFBhY2thZ2UgPSAgY3JlYXRlRG9jdW1lbnQoY1BhY2thZ2UpOyBcbiAgICAgICAgICAgY29uc29sZS5sb2coaW5kZXhQYWNrYWdlKTsgXG4gICAgICAgICAgIHBhY2thZ2VJbmRleC5hZGQoY1BhY2thZ2UuaWQsaW5kZXhQYWNrYWdlLChlcnIxLGRvY1Jlc3VsdCk9PntcbiAgICAgICAgICAgICBjb25zb2xlLmxvZyhkb2NSZXN1bHQpOyBcbiAgICAgICAgICAgICBpZihlcnIxKXtcbiAgICAgICAgICAgICAgIHJlamVjdCh7c2F2ZWQ6ZmFsc2UsZXJyOmVycjF9KVxuICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICByZXNvbHZlKHtzYXZlZDp0cnVlfSlcbiAgICAgICAgICAgfSlcblxuICAgICAgICB9KVxuICAgICAgfSk7XG4gICAgXG5cblxuICAgIH0pXG4gIH1cblxuICBnZXRNYW5pZmVzdFBhY2thZ2VzKCl7XG4gICAgcmV0dXJuIG5ldyBQcm9taXNlKChyZXNvbHZlLHJlamVjdCk9PntcbiAgICAgIFxuICAgICAgdGhpcy5teVNlYXJjaC5zZWFyY2goXG4gICAgICAgIGBAbWlkOlswIDBdYCxcbiAgICAgICAgeyBvZmZzZXQ6IDAsIG51bWJlck9mUmVzdWx0czogNTAwMCB9LFxuICAgICAgICAoZXJyLCBkYXRhKSA9PiB7XG4gICAgICAgICAgdmFyIHBhY2thZ2VzID0gW107XG4gICAgICAgICAgY29uc29sZS5sb2coZGF0YSk7XG4gICAgICAgICAgZGF0YS5yZXN1bHRzLmZvckVhY2goZWxlbWVudCA9PiB7XG5cbiAgICAgICAgICAgIHBhY2thZ2VzLnB1c2goZWxlbWVudC5kb2MpO1xuICAgICAgICAgICAgcmVzb2x2ZShwYWNrYWdlcyk7ICAgICAgICAgICAgICAgICBcbiAgICAgICAgfSk7XG4gICAgfSk7XG4gICAgfSlcbiAgfVxuICBnZXRSZWNlaXZlZFBhY2thZ2VzKHBhZ2UscGFnZVNpemUpe1xuICAgIHJldHVybiBuZXcgUHJvbWlzZSgocmVzb2x2ZSxyZWplY3QpPT57XG4gICAgICBcbiAgICAgIHRoaXMubXlTZWFyY2guc2VhcmNoKFxuICAgICAgICBgQG1pZDpbMCAwXWAsXG4gICAgICAgIHsgb2Zmc2V0OiAwLCBudW1iZXJPZlJlc3VsdHM6IDUwMDAgfSxcbiAgICAgICAgKGVyciwgZGF0YSkgPT4ge1xuICAgICAgICAgIHZhciBwYWNrYWdlcyA9IFtdO1xuICAgICAgICAgIGNvbnNvbGUubG9nKGRhdGEpO1xuICAgICAgICAgIGRhdGEucmVzdWx0cy5mb3JFYWNoKGVsZW1lbnQgPT4ge1xuXG4gICAgICAgICAgICBwYWNrYWdlcy5wdXNoKGVsZW1lbnQuZG9jKTtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBcbiAgICAgICAgfSk7XG4gICAgICAgIHJlc29sdmUocGFja2FnZXMpOyBcbiAgICB9KTtcbiAgICB9KVxuICB9XG4gIGdldE5vRG9jc1BhY2thY2thZ2VzKHBhZ2UscGFnZVNpemUpe1xuICAgIHJldHVybiBuZXcgUHJvbWlzZSgocmVzb2x2ZSxyZWplY3QpPT57XG4gICAgICBcbiAgICAgIHRoaXMubXlTZWFyY2guc2VhcmNoKFxuICAgICAgICBgQGhhc0RvY3M6WzAgMF1gLFxuICAgICAgICB7IG9mZnNldDogMCwgbnVtYmVyT2ZSZXN1bHRzOiA1MDAwIH0sXG4gICAgICAgIChlcnIsIGRhdGEpID0+IHtcbiAgICAgICAgICB2YXIgcGFja2FnZXMgPSBbXTtcbiAgICAgICAgICBjb25zb2xlLmxvZyhkYXRhKTtcbiAgICAgICAgICBkYXRhLnJlc3VsdHMuZm9yRWFjaChlbGVtZW50ID0+IHtcblxuICAgICAgICAgICAgcGFja2FnZXMucHVzaChlbGVtZW50LmRvYyk7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgXG4gICAgICAgIH0pO1xuICAgICAgICByZXNvbHZlKHBhY2thZ2VzKTsgXG4gICAgfSk7XG4gICAgfSlcbiAgfVxuICBnZXRwYWNrYWdlYnlSZWRpc0lkKGlkKXtcbiAgICByZXR1cm4gbmV3IFByb21pc2UoKHJlc29sdmUscmVqZWN0KT0+e1xuICAgICAgcGFja2FnZUluZGV4LmdldERvYyhpZCwoZXJyLGRvY3VtZW50KT0+e1xuICAgICAgICByZXNvbHZlKGRvY3VtZW50LmRvYyk7IFxuICAgICAgfSlcbiAgICB9KVxuICB9XG4gIGdldFBhY2thZ2VCeUlkKGJhcmNvZGUpe1xuICAgIHZhciBzcnYgPSB0aGlzOyBcbiAgICB2YXIgcGtnSWQgPSBnZXRQYWNrYWdlSWRGcm9tQmFyQ29kZShiYXJjb2RlKTsgXG4gICAgcmV0dXJuIG5ldyBQcm9taXNlKChyZXNvbHZlLHJlamVjdCk9PntcbiAgICAgIHRoaXMubXlTZWFyY2guZ2V0RG9jKHBrZ0lkLChlcnIsZG9jdW1lbnQpPT57XG4gICAgICAgIC8vZ2V0IHRoZSBhd2IgaW5mbyBoZXJlIGFzIHdlbGwgXG4gICAgICAgIHNydi5nZXRBd2IoZG9jdW1lbnQuZG9jLmF3YikudGhlbihhd2JpbmZvPT57XG4gICAgICAgICAgY29uc29sZS5sb2coYXdiaW5mbyk7IFxuICAgICAgICAgIHZhciByZXNwb25zZSA9IHsgXG4gICAgICAgICAgICBhd2IgOiBhd2JpbmZvLmF3YixcbiAgICAgICAgICAgIHBhY2thZ2UgOiBkb2N1bWVudC5kb2NcbiAgICAgICAgICB9XG4gICAgICAgICAgcmVzb2x2ZShyZXNwb25zZSk7IFxuICAgICAgICB9KTsgXG4gICAgICAgIFxuICAgICAgfSlcbiAgICB9KTsgXG4gIH1cbiAgLy91c2luZyB0aGlzIFxuICBcblxuICB1cGRhdGVNYW5pZmVzdFBhY2thZ2VUb0luVHJhbnNpdChtaWQpIHtcbiAgICAvL2dldCBhbGwgdGhlIHBhY2thZ2VzXG4gICAgLy93ZSBuZWVkIHRvIHVwZGF0ZSB0aGUgaW5kZXggYXQgdGhpcyBwb2ludCBhcyB3ZWxsXG4gICAgdmFyIG1zZWFyY2ggPSB0aGlzLm15U2VhcmNoO1xuICAgIHRoaXMubXlTZWFyY2guc2VhcmNoKFxuICAgICAgYEBtaWQ6WyR7bWlkfSAke21pZH1dYCxcbiAgICAgIHsgb2Zmc2V0OiAwLCBudW1iZXJPZlJlc3VsdHM6IDUwMDAgfSxcbiAgICAgIChlcnIsIGRhdGEpID0+IHtcbiAgICAgICAgdmFyIHBhY2thZ2VzID0gW107XG4gICAgICAgIGNvbnNvbGUubG9nKGRhdGEpO1xuICAgICAgICBkYXRhLnJlc3VsdHMuZm9yRWFjaChlbGVtZW50ID0+IHtcbiAgICAgICAgICB2YXIgb2xkRG9jSWQgPSBlbGVtZW50LmRvY0lkO1xuICAgICAgICAgIGVsZW1lbnQuZG9jSWQgPSBlbGVtZW50LmRvY0lkLnJlcGxhY2UoYCR7bWlkfS1gLCBcIlwiKTtcbiAgICAgICAgICBwYWNrYWdlcy5wdXNoKGVsZW1lbnQuZG9jSWQpO1xuICAgICAgICAgIC8vIGkgY291bGQgZGVsZXRlIGhlcmVcbiAgICAgICAgICAvLyBtc2VhcmNoLmRlbERvY3VtZW50KFBLR19JRFgsb2xkRG9jSWQpXG4gICAgICAgICAgLy91cGRhdGUgYWxsIHRoZSBwYWNrYWdlc1xuICAgICAgICB9KTtcbiAgICAgICAgc2V0UGFja2FnZUluVHJhbnNpdChwYWNrYWdlcywgbXNlYXJjaCwgbWlkKS50aGVuKGZ1bmN0aW9uKFxuICAgICAgICAgIHVwZGF0ZWRQYWNrYWdlc1xuICAgICAgICApIHtcbiAgICAgICAgICBjb25zb2xlLmxvZyhcInVwZGF0ZWQgcGFja2FnZXNcIik7XG4gICAgICAgICAgY29uc29sZS5sb2codXBkYXRlZFBhY2thZ2VzKTtcbiAgICAgICAgfSk7XG4gICAgICB9XG4gICAgKTtcbiAgfVxuICByZW1vdmVQYWNrYWdlRnJvbU1hbmlmZXN0KHBhY2thZ2VJZCwgbWlkKSB7XG4gICAgdmFyIG1zZWFyY2ggPSB0aGlzLm15U2VhcmNoO1xuICAgIHJldHVybiBuZXcgUHJvbWlzZSgocmVzb2x2ZSwgcmVqZWN0KSA9PiB7XG4gICAgICB2YXIgbWFuaWZlc3QgPSBtaWQ7XG4gICAgICB2YXIgbWFuaWZlc3RLZXkgPSBcIm1hbmlmZXN0OlwiICsgbWFuaWZlc3QgKyBcIjoqXCI7XG5cbiAgICAgIGxyZWRpcy5kZWwoXCJwYWNrYWdlczpcIiArIHRyYWNraW5nTm8pLnRoZW4oZnVuY3Rpb24ocmVzdWx0KSB7XG4gICAgICAgIGNvbnNvbGUubG9nKHJlc3VsdCk7XG4gICAgICAgIG1zZWFyY2guZGVsRG9jdW1lbnQoUEtHX0lEWCwgYCR7bWlkfS0ke3RyYWNraW5nTm99YCk7XG4gICAgICAgIC8vd2UgbmVlZCB0byByZW1vdmUgZnJvbSB0aGUgaW5kZXggYW5kIGRlYyB0aGUgY291bnRlclxuICAgICAgICBscmVkaXMuY2xpZW50LmRlY3IoXCJtY291bnRlcjpcIiArIG1pZCk7XG4gICAgICAgIC8vclNlcnZpY2VzLnBhY2thZ2VTZXJ2aWNlLnJtUGFja2FnZShtaWQsIHRyYWNraW5nTm8pO1xuICAgICAgICBscmVkaXMuZ2V0S2V5cyhtYW5pZmVzdEtleSkudGhlbihrUmVzdWx0ID0+IHtcbiAgICAgICAgICAvL3RoZSBsaXN0IG9mIGFsbCB0aGUgc2V0cyAuLi53ZSBuZWVkIHRvIHJlbW92ZSB0aGUga2V5IGZyb20gZWFjaCBvbmVcbiAgICAgICAgICB2YXIga2V5c0NvdW50ID0gMDtcblxuICAgICAgICAgIGtSZXN1bHQuZm9yRWFjaChlbGVtZW50ID0+IHtcbiAgICAgICAgICAgIGNvbnNvbGUubG9nKFxuICAgICAgICAgICAgICBgcmVtb3ZpbmcgJHt0cmFja2luZ05vfSBwYWNrYWdlIG1hbmlmZXN0IHNldCAke2VsZW1lbnR9IGBcbiAgICAgICAgICAgICk7XG4gICAgICAgICAgICBscmVkaXMuc3JlbShlbGVtZW50LCB0cmFja2luZ05vKS50aGVuKGZ1bmN0aW9uKHJSZXN1bHQpIHtcbiAgICAgICAgICAgICAgY29uc29sZS5sb2coclJlc3VsdCk7XG4gICAgICAgICAgICAgIGNvbnNvbGUubG9nKFwicmVtb3ZlZFwiKTtcbiAgICAgICAgICAgICAgaWYgKGtleXNDb3VudCA9PSBrUmVzdWx0Lmxlbmd0aCAtIDEpIGtleXNDb3VudCsrO1xuICAgICAgICAgICAgfSk7XG4gICAgICAgICAgfSk7XG4gICAgICAgICAgcmVzb2x2ZSh7XG4gICAgICAgICAgICBkZWxldGVkOiB0cnVlXG4gICAgICAgICAgfSk7XG4gICAgICAgIH0pO1xuXG4gICAgICAgIC8vd2UgYWxzbyBuZWVkIHRvIHJlbW92ZSBmcm9tIGFueSBzZXRzXG4gICAgICB9KTtcbiAgICB9KTtcbiAgfVxuICByZW1vdmVQYWNrYWdlQnlJZChpZCkge1xuICAgIHZhciBtc2VhcmNoID0gdGhpcy5teVNlYXJjaDtcbiAgICByZXR1cm4gbmV3IFByb21pc2UoKHJlc29sdmUsIHJlamVjdCkgPT4ge1xuICAgICAgXG4gICAgICBwYWNrYWdlSW5kZXguZGVsRG9jdW1lbnQoUEtHX0lEWCxpZCwoZXJyLHJlc3BvbnNlKT0+e1xuICAgICAgICBpZiAoZXJyKVxuICAgICAgICAgIGNvbnNvbGUubG9nKGVycik7IFxuICAgICAgICBjb25zb2xlLmxvZyhyZXNwb25zZSk7IFxuICAgICAgICByZXNvbHZlKHtkZWxldGVkOnRydWV9KVxuICAgICAgfSlcbiAgICAgIFxuICAgICAgICBcbiAgICAgIFxuICAgIH0pO1xuICB9XG4gIHN0b3JlUGFja2FnZUZvclBpY2t1cCh0cmFja2luZ05vLGJpbil7XG4gICAgdmFyIHNlYXJjaGVyID0gdGhpcy5teVNlYXJjaDtcbiAgICByZXR1cm4gbmV3IFByb21pc2UoKHJlc29sdmUscmVqZWN0KT0+e1xuICAgICAgIGxyZWRpcy5obXNldChQS0dfUFJFRklYK3RyYWNraW5nTm8se3N0YXR1czo0LGxvY2F0aW9uOmJpbn0pLnRoZW4oKHJlc3VsdCk9PntcbiAgICAgICAgIGxyZWRpcy5nZXRQYWNrYWdlKHRyYWNraW5nTm8pLnRoZW4oKHBrZyk9PntcbiAgICAgICAgICBhZGRQYWNrYWdlVG9JbmRleCh0cmFja2luZ05vLHNlYXJjaGVyKSA7IFxuICAgICAgICAgIHJlc29sdmUocGtnKTsgICBcbiAgICAgICAgIH0pO1xuICAgICAgIH0pIFxuICAgIH0pOyBcbiAgfVxuICB1cGRhdGVQYWNrYWdlSW5kZXgodHJhY2tpbmcpe1xuICAgICAgcmV0dXJuIG5ldyBQcm9taXNlKChyZXNvbHZlLHJlamVjdCk9PntcbiAgICAgICAgICB2YXIgbXNlYXJjaCA9IHRoaXMubXlTZWFyY2g7IFxuICAgICAgICAgIGFkZFBhY2thZ2VUb0luZGV4KHRyYWNraW5nLG1zZWFyY2gpOyBcbiAgICAgICAgIHJlc29sdmUoeyd1cGRhdGVkJzp0cnVlfSk7XG4gICAgICB9KVxuICB9XG4gIGdldEN1c3RvbWVyUGFja2FnZXMoc2t5Ym94KSB7fVxuICBnZXRNYW5pZmVzdFBhY2thZ2VzQnlTdGF0dXMobWlkLHN0YXR1cykge1xuICAgICAgcmV0dXJuIG5ldyBQcm9taXNlKChyZXNvbHZlLHJlamVjdCk9PntcbiAgICAgICAgICBjb25zb2xlLmxvZyhgQG1pZDpbJHttaWR9ICR7bWlkfV1gKVxuICAgICAgICB0aGlzLm15U2VhcmNoLnNlYXJjaChcbiAgICAgICAgICAgIGBAbWlkOlske21pZH0gJHttaWR9XWAsXG4gICAgICAgICAgICB7IG9mZnNldDogMCwgbnVtYmVyT2ZSZXN1bHRzOiA1MDAwIH0sXG4gICAgICAgICAgICAoZXJyLCBkYXRhKSA9PiB7XG4gICAgICAgICAgICAgIHZhciBwYWNrYWdlcyA9IFtdO1xuICAgICAgICAgICAgICBjb25zb2xlLmxvZyhkYXRhKTtcbiAgICAgICAgICAgICAgZGF0YS5yZXN1bHRzLmZvckVhY2goZWxlbWVudCA9PiB7XG5cbiAgICAgICAgICAgICAgICBwYWNrYWdlcy5wdXNoKGVsZW1lbnQuZG9jKTtcbiAgICAgICAgICAgICAgICByZXNvbHZlKHBhY2thZ2VzKTsgICAgICAgICAgICAgICAgIFxuICAgICAgICAgICAgfSk7XG4gICAgICAgIH0pO1xuICAgICAgfSk7XG4gIFxuICB9ICAgXG4gIFxuICBcblxuICAgLy8jcmVnaW9uIE1hbmlmZXN0IFBhY2thZ2UgRnVuY3Rpb25zIFxuXG4gICBhZGRUb0ZsaWdodChhY3Rpb24pe1xuICAgIHJldHVybiBuZXcgUHJvbWlzZSgocmVzb2x2ZSxyZWplY3QpPT57XG4gICAgICB2YXIgcGFja2FnZU5vID0gZ2V0UGFja2FnZUlkRnJvbUJhckNvZGUoYWN0aW9uLmJhcmNvZGUpOyBcbiAgICAgIGNvbnNvbGUubG9nKGFjdGlvbik7IFxuICAgICAgdGhpcy5teVNlYXJjaC51cGRhdGUocGFja2FnZU5vLHttaWQ6YWN0aW9uLm1pZCAsIHN0YXR1czogMiwgbG9jYXRpb246XCJMb2FkZWQgb24gQWlyQ3JhZnRcIn0sKGVycixyZXN1bHQpPT57XG4gICAgICAgIGlmKGVycilcbiAgICAgICAgICByZXNvbHZlKHthZGRlZDpmYWxzZX0pXG4gICAgICAgIFxuICAgICAgICByZXNvbHZlKHthZGRlZDp0cnVlfSlcbiAgICAgIH0pXG4gICAgICAgIFxuICAgIH0pXG4gICB9XG4gICAvL3JlbW92ZSBmcm9tIGZsaWdodCBcbiAgIHJlbW92ZUZyb21GbGlnaHQoYWN0aW9uKXtcbiAgICByZXR1cm4gbmV3IFByb21pc2UoKHJlc29sdmUscmVqZWN0KT0+e1xuICAgICAgICB2YXIgcGFja2FnZU5vID0gZ2V0UGFja2FnZUlkRnJvbUJhckNvZGUoYWN0aW9uLmJhcmNvZGUpOyAgIFxuICAgICAgICB0aGlzLm15U2VhcmNoLnVwZGF0ZShwYWNrYWdlTm8se21pZDphY3Rpb24ubWlkfSwoZXJyLHJlc3VsdCk9PntcbiAgICAgICAgaWYoZXJyKVxuICAgICAgICAgICAgcmVzb2x2ZSh7cmVtb3ZlZDpmYWxzZX0pXG4gICAgICAgICAgXG4gICAgICAgICAgcmVzb2x2ZSh7cmVtb3ZlZDp0cnVlfSlcbiAgICAgICAgfSlcbiAgICB9KVxuICAgfVxuICAgcmVjRnJvbVRydWNrKHRyYWNraW5nTm8pe1xuICAgICByZXR1cm4gbmV3IFByb21pc2UoKHJlc29sdmUscmVqZWN0KT0+e1xuICAgICBcbiAgICAgICAgZGF0YUNvbnRleHQucmVkaXNDbGllbnQuc2V0KFJFQ19QS0crdHJhY2tpbmdObyxtb21lbnQoKS51bml4KCksIChlcnIscmVzdWx0KT0+e1xuICAgICAgICAgIGlmIChlcnIpIHJlc29sdmUoe3NhdmVkOmZhbHNlfSlcbiAgICAgICAgICByZXNvbHZlKHtzYXZlZDp0cnVlfSlcbiAgICAgICAgfSlcbiAgICAgfSlcbiAgIH1cbiAgIHByb2Nzc2Vzc1BhY2thZ2UocGtnSWZubyx1c2VybmFtZSl7XG4gICAgIHJldHVybiBuZXcgUHJvbWlzZSgocmVzb2x2ZSxyZWplY3QpPT57XG4gICAgICAgZGF0YUNvbnRleHQucmVkaXNDbGllbnQuaG1zZXQoXCJmZWVzOmF3YjpcIitwa2dJZm5vLmF3Yixwa2dJZm5vLChlcnIscmVzdWx0KT0+e1xuICAgICAgICAgaWYgKGVycilcbiAgICAgICAgICBjb25zb2xlLmxvZyhlcnIpOyBcbiAgICAgICAgICBjb25zb2xlLmxvZyhyZXN1bHQpOyBcbiAgICAgICAgIGRhdGFDb250ZXh0LnJlZGlzQ2xpZW50LnB1Ymxpc2goXCJwcmludDpmZWVzOlwiK3VzZXJuYW1lLHBrZ0lmbm8uYXdiKTsgXG4gICAgICAgICByZXNvbHZlKHtzZW50OnRydWV9KVxuICAgICAgIH0pXG4gICAgIH0pXG4gICB9XG4gICByZWNGcm9tUGxhbmVOYXMoYmFyY29kZSl7XG4gICAgIHJldHVybiBuZXcgUHJvbWlzZSgocmVzb2x2ZSxyZWplY3QpPT57XG4gICAgICAgdmFyIHNydiA9IHRoaXMgOyBcbiAgICAgICB2YXIgcGtnSWQgPSBnZXRQYWNrYWdlSWRGcm9tQmFyQ29kZShiYXJjb2RlKTsgXG4gICAgICAgIHNydi5teVNlYXJjaC5nZXREb2MocGtnSWQsKGVycixwa2cpPT57XG4gICAgICAgICAgICBwa2cuZG9jLnN0YXR1cyA9IDQ7IFxuICAgICAgICAgICAgcGtnLmRvYy5sb2NhdGlvbiAgPSBcIldhcmVob3VzZSBOQVNcIjsgXG4gICAgICAgICAgICBzcnYubXlTZWFyY2gudXBkYXRlKHBrZ0lkLHBrZy5kb2MsKGVycix1cGRhdGVSZXN1bHQpPT57XG4gICAgICAgICAgICAgIGlmKGVycilcbiAgICAgICAgICAgICAgICByZWplY3Qoe3VwZGF0ZWQ6ZmFsc2V9KVxuICAgICAgICAgICAgICByZXNvbHZlKHt1cGRhdGVkOnRydWV9KVxuICAgICAgICAgICAgfSlcbiAgICAgICAgfSlcbiAgICAgfSlcbiAgIH1cbiAgIC8vI2VuZHJlZ2lvblxufVxuXG5mdW5jdGlvbiBnZXRQYWNrYWdlSWRGcm9tQmFyQ29kZShiYXJDb2RlVmFsdWUpe1xuICB2YXIgcGFydHMgPSBiYXJDb2RlVmFsdWUuc3BsaXQoXCItXCIpOyBcbiAgaWYgKHBhcnRzLmxlbmd0aCA9PSAzKVxuICAgIGlmICh0eXBlb2YgcGFydHNbMl0gIT0gXCJ1bmRlZmluZWRcIilcbiAgICByZXR1cm4gcGFydHNbMl0udHJpbSgpOyBcbiAgcmV0dXJuIFwiXCJcbn1cbiJdfQ==
