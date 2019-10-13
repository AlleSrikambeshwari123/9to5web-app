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
        dataContext.redisClient.incr(PKG_ID_COUNTER, function (err, id) {
          newPackage.id = id;
          packageIndex.add(id, newPackage, function (err, result) {
            if (err) console.log(err);
            resolve({ saved: true, id: id });
          });
        });
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
    key: "savePackageOld",
    value: function savePackageOld(body) {

      var searcher = this.mySearch;
      return new Promise(function (resolve, reject) {
        var cPackage = {
          skybox: body.skybox,
          customer: body.customer.replace("-", "").trim(),
          trackingNo: body.tracking,
          dutyPercent: 0.2,
          description: body.description,
          shipper: body.shipper,
          value: Number(body.value),
          pieces: Number(body.pieces),
          weight: Number(body.weight),
          status: 1,
          location: "FLL",
          mid: body.mid,
          hasOpt: true
          //mtype: body.mtype
        };
        console.log("about to save the package");
        if (typeof cPackage.shipper === "undefined") cPackage.shipper = "";
        if (typeof cPackage.description === "undefined") cPackage.description = "";
        console.log(body);
        // if (Number(body.isBusiness) == 1) {
        //   cPackage.hasOpt = false;
        // }
        //cPackage = packageUtil.calculateFees(cPackage);
        console.log("package with fees");

        //we also want to calculate the the package fees one time......
        //we have the package details here .. now we need to get the existing package


        //we need to check to see of the owner is a business here
        console.log("here about to get the package");
        lredis.getPackage(cPackage.trackingNo).then(function (p) {
          console.log('p is the ', p);
          if (p) {
            var currentContainer = "manifest:" + p.mid + ":" + p.mtype + ":" + container + ":";
            console.log("found package ");
            console.log(p);
            if (container == "bag") {
              //check to see if the back no is the same.
              if (p.bag != cPackage.bag) {
                //remove it from the original list
                lredis.srem(currentContainer + p.bag, p.trackingNo);
                console.log("remove package from current set " + currentContainer);
              }
            } else {
              //check to see if the skid number is the same.
              if (p.skid != cPackage.skid) {
                //remove it from the original list
                lredis.srem(currentContainer + p.skid, p.trackingNo);
                console.log("remove package from current set " + currentContainer);
              }
            }
          } else {
            // the package doesn't exist update the counter
            lredis.client.incr("mcounter:" + cPackage.mid);
          }

          lredis.hmset("packages:" + cPackage.trackingNo, cPackage).then(function (result) {
            //add to queue for persistent processing

            var manifestKey = "manifest:" + cPackage.mid + ":" + cPackage.mtype + ":" + container + ":" + containerNo;
            console.log("about to create the document....");
            addPackageToIndex(cPackage.trackingNo, searcher);
            console.log("added the package to index");
            lredis.setAdd(manifestKey, cPackage.trackingNo).then(function (sResult) {
              //get the members one time here
              console.log("added the package to the set");
              console.log(manifestKey);
              lredis.getMembers(manifestKey).then(function (data) {
                console.log("data");
                console.log(data);
                Promise.all(data.map(lredis.getPackage));
              }).then(function (rdata) {
                //we need to alert the person that the package is here so read email etc.
                //add to the index
                console.log("data");
                console.log(rdata);

                resolve({
                  saved: true,
                  packages: rdata,
                  sPackage: cPackage
                });
              }).catch(function (err3) {
                console.log(err3);
                reject({
                  err: err3,
                  saved: true,
                  listing: false
                });
              });
            }).catch(function (err) {
              resolve({
                saved: false
              });
            });
          }).catch(function (err2) {
            reject({
              saved: false
            });
          });

          //save the package to the package NS
        }).catch(function (err232) {
          console.log(err232);
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
    key: "getPackageById",
    value: function getPackageById(id) {
      return new Promise(function (resolve, reject) {
        rediSearch.getDoc(id, function (err, document) {
          resolve(document.doc);
        });
      });
    }
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

        rediSearch.delDocument(PKG_IDX, id, function (err, response) {
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
      var _this6 = this;

      return new Promise(function (resolve, reject) {
        var msearch = _this6.mySearch;
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
      var _this7 = this;

      return new Promise(function (resolve, reject) {
        console.log("@mid:[" + mid + " " + mid + "] @status=[" + status + " " + status + "]");
        _this7.mySearch.search("@mid:[" + mid + " " + mid + "] @status:[" + status + " " + status + "]", { offset: 0, numberOfResults: 5000 }, function (err, data) {
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
      var _this8 = this;

      return new Promise(function (resolve, reject) {
        var packageNo = getPackageIdFromBarCode(action.barcode);
        _this8.mySearch.update(packageNo, { mid: action.mid, status: 2, location: "Loaded on AirCraft" }, function (err, result) {
          if (err) resolve({ added: false });

          resolve({ added: true });
        });
      });
    }
  }, {
    key: "removeFromFlight",
    value: function removeFromFlight(action) {
      var _this9 = this;

      return new Promise(function (resolve, reject) {
        var packageNo = getPackageIdFromBarCode(action.barcode);
        _this9.mySearch.update(packageNo, { mid: action.mid }, function (err, result) {
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
    key: "recFromPlaneNas",
    value: function recFromPlaneNas(barcode) {
      var _this10 = this;

      return new Promise(function (resolve, reject) {
        var srv = _this10;
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
//# sourceMappingURL=data:application/json;charset=utf8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIlJlZGlzU2VydmljZXMvUGFja2FnZVNlcnZpY2UuZXM2Il0sIm5hbWVzIjpbInJlZGlzIiwicmVxdWlyZSIsImxyZWRpcyIsIm1vbWVudCIsInJlZGlzU2VhcmNoIiwiZnMiLCJQYWNrYWdlVXRpbCIsIlBhY2thZ2VVdGlsaXR5IiwicGFja2FnZVV0aWwiLCJQS0dfSURYIiwiUEtHX0lEX0NPVU5URVIiLCJkYXRhQ29udGV4dCIsIlBLR19QUkVGSVgiLCJBV0JfSUQiLCJJTkRFWF9BV0IiLCJSRUNfUEtHIiwiQ3VzdG9tZXJTZXJ2aWNlIiwiY3VzdG9tZXJTZXJ2aWNlIiwiUEtHX1NUQVRVUyIsImF3YkluZGV4IiwiY2xpZW50T3B0aW9ucyIsInNlYXJjaENsaWVudERldGFpbHMiLCJwYWNrYWdlSW5kZXgiLCJnZXRQYWNrYWdlVm9sdW1uZSIsIm1QYWNrYWdlIiwiY3JlYXRlRG9jdW1lbnQiLCJ0UGFja2FnZSIsInBhY2thZ2VEb2N1bWVudCIsImlkIiwidHJhY2tpbmdObyIsInNreWJveCIsImRhdGVSZWNpZXZlZCIsInVuaXgiLCJhd2IiLCJtaWQiLCJ2b2x1bWUiLCJ3ZWlnaHQiLCJwaWVjZXMiLCJjdXN0b21lciIsInNoaXBwZXIiLCJkZXNjcmlwdGlvbiIsImRpbWVuc2lvbnMiLCJjYXJyaWVyIiwic3RhdHVzIiwidmFsdWUiLCJjb25zb2xlIiwibG9nIiwic2V0UGFja2FnZUluVHJhbnNpdCIsImtleXMiLCJtc2VhcmNoZXIiLCJQcm9taXNlIiwicmVzb2x2ZSIsInJlamVjdCIsImJhdGNoZXIiLCJjbGllbnQiLCJiYXRjaCIsImZvckVhY2giLCJsb2NhdGlvbiIsImVsZW1lbnQiLCJobXNldCIsImV4ZWMiLCJlcnIiLCJyZXN1bHQiLCJhZGRQYWNrYWdlVG9JbmRleCIsImdldFBhY2thZ2UiLCJ0aGVuIiwiZGVsRG9jdW1lbnQiLCJwYWNrIiwiZG9uZSIsImRvY3VtZW50IiwiYWRkIiwiUGFja2FnZVNlcnZpY2UiLCJzZXR1cEluZGV4IiwibXlTZWFyY2giLCJyZWRpc0NsaWVudCIsImV4aXN0cyIsInNldCIsImluaXRSZXN1bHQiLCJpbmNyIiwibmV3SWQiLCJ0b1N0cmluZyIsInJlcGx5IiwiaW52b2ljZSIsImhhc0RvY3MiLCJkYXRlQ3JlYXRlZCIsImVycjEiLCJhd2JSZXMiLCJzYXZlZCIsInNlYXJjaCIsIm51bWJlck9mUmVzdWx0cyIsIm9mZnNldCIsInBhY2thZ2VzIiwidG90YWxSZXN1bHRzIiwicmVzdWx0cyIsInBhY2thZ2UxIiwiZG9jIiwiTnVtYmVyIiwiZGF0YSIsInNydiIsInBhY2thZ2VsaXN0IiwiY291bnQiLCJsZW5ndGgiLCJzdWJzdHJpbmciLCJwdXNoIiwic29ydEJ5IiwiYXdicyIsImF3Ykxpc3QiLCJhbGwiLCJtYXAiLCJnZXRDdXN0b21lciIsImN1c3RvbWVySWQiLCJnZXRBd2JPdmVydmlldyIsImN1c3RvbWVycyIsImkiLCJmb3JtYXQiLCJjb25zaWduZWUiLCJuYW1lIiwiZGV0YWlscyIsInBtYiIsImNhdGNoIiwiZ2V0RG9jIiwiZ2V0QXdiRGV0YWlscyIsInRyYWNraW5nTnVtYmVyIiwibG9jYXRpb25faWQiLCJwYWNrYWdlUmVzdWx0IiwibmV3UGFja2FnZSIsImJvZHkiLCJjUGFja2FnZSIsInJlcGxhY2UiLCJ0cmltIiwidHJhY2tpbmciLCJyZXNwb25zZSIsImluZGV4UGFja2FnZSIsImRvY1Jlc3VsdCIsInNlYXJjaGVyIiwiZHV0eVBlcmNlbnQiLCJoYXNPcHQiLCJwIiwiY3VycmVudENvbnRhaW5lciIsIm10eXBlIiwiY29udGFpbmVyIiwiYmFnIiwic3JlbSIsInNraWQiLCJtYW5pZmVzdEtleSIsImNvbnRhaW5lck5vIiwic2V0QWRkIiwic1Jlc3VsdCIsImdldE1lbWJlcnMiLCJyZGF0YSIsInNQYWNrYWdlIiwiZXJyMyIsImxpc3RpbmciLCJlcnIyIiwiZXJyMjMyIiwicGFnZSIsInBhZ2VTaXplIiwicmVkaVNlYXJjaCIsIm1zZWFyY2giLCJvbGREb2NJZCIsImRvY0lkIiwidXBkYXRlZFBhY2thZ2VzIiwicGFja2FnZUlkIiwibWFuaWZlc3QiLCJkZWwiLCJkZWNyIiwiZ2V0S2V5cyIsImtleXNDb3VudCIsImtSZXN1bHQiLCJyUmVzdWx0IiwiZGVsZXRlZCIsImJpbiIsInBrZyIsImFjdGlvbiIsInBhY2thZ2VObyIsImdldFBhY2thZ2VJZEZyb21CYXJDb2RlIiwiYmFyY29kZSIsInVwZGF0ZSIsImFkZGVkIiwicmVtb3ZlZCIsInBrZ0lkIiwidXBkYXRlUmVzdWx0IiwidXBkYXRlZCIsImJhckNvZGVWYWx1ZSIsInBhcnRzIiwic3BsaXQiXSwibWFwcGluZ3MiOiI7Ozs7Ozs7OztBQUFBOztBQUNBOzs7Ozs7QUFHQSxJQUFJQSxRQUFRQyxRQUFRLE9BQVIsQ0FBWjtBQUNBLElBQUlDLFNBQVNELFFBQVEsZUFBUixDQUFiO0FBQ0EsSUFBSUUsU0FBU0YsUUFBUSxRQUFSLENBQWI7QUFDQSxJQUFJRyxjQUFjSCxRQUFRLHFCQUFSLENBQWxCO0FBQ0EsSUFBSUksS0FBS0osUUFBUSxJQUFSLENBQVQ7QUFDQSxJQUFJRSxTQUFTRixRQUFRLFFBQVIsQ0FBYjtBQUNBLElBQUlLLGNBQWNMLFFBQVEscUJBQVIsRUFBK0JNLGNBQWpEO0FBQ0EsSUFBSUMsY0FBYyxJQUFJRixXQUFKLEVBQWxCO0FBQ0EsSUFBTUcsVUFBVSxnQkFBaEI7QUFDQSxJQUFNQyxpQkFBaUIsWUFBdkI7QUFDQSxJQUFJQyxjQUFjVixRQUFRLGVBQVIsQ0FBbEI7QUFDQSxJQUFNVyxhQUFhLFdBQW5CO0FBQ0EsSUFBTUMsU0FBUyxRQUFmO0FBQ0EsSUFBTUMsWUFBWSxXQUFsQjtBQUNBLElBQU1DLFVBQVUsVUFBaEI7QUFDQSxJQUFJQyxrQkFBa0JmLFFBQVEsbUJBQVIsRUFBNkJlLGVBQW5EO0FBQ0EsSUFBSUMsa0JBQWtCLElBQUlELGVBQUosRUFBdEI7QUFDQSxJQUFNRSxhQUFhO0FBQ2pCLEtBQUksVUFEYTtBQUVqQixLQUFHLG9CQUZjO0FBR2pCLEtBQUcsWUFIYztBQUlqQixLQUFHLGlCQUpjO0FBS2pCLEtBQUcs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LENBQU4sQ0FBUCxJQUFtQixXQUF2QixFQUNBLE9BQU9BLE1BQU0sQ0FBTixFQUFTdkQsSUFBVCxFQUFQO0FBQ0YsU0FBTyxFQUFQO0FBQ0QiLCJmaWxlIjoiUmVkaXNTZXJ2aWNlcy9QYWNrYWdlU2VydmljZS5qcyIsInNvdXJjZXNDb250ZW50IjpbImltcG9ydCB7IGNwdXMgfSBmcm9tIFwib3NcIjtcbmltcG9ydCB7IHByb21pc2VzIH0gZnJvbSBcImRuc1wiO1xuXG5cbnZhciByZWRpcyA9IHJlcXVpcmUoXCJyZWRpc1wiKTtcbnZhciBscmVkaXMgPSByZXF1aXJlKFwiLi9yZWRpcy1sb2NhbFwiKTtcbnZhciBtb21lbnQgPSByZXF1aXJlKFwibW9tZW50XCIpO1xudmFyIHJlZGlzU2VhcmNoID0gcmVxdWlyZShcIi4uL3JlZGlzZWFyY2hjbGllbnRcIik7XG52YXIgZnMgPSByZXF1aXJlKFwiZnNcIik7XG52YXIgbW9tZW50ID0gcmVxdWlyZSgnbW9tZW50JylcbnZhciBQYWNrYWdlVXRpbCA9IHJlcXVpcmUoXCIuLi9VdGlsL3BhY2thZ2V1dGlsXCIpLlBhY2thZ2VVdGlsaXR5O1xudmFyIHBhY2thZ2VVdGlsID0gbmV3IFBhY2thZ2VVdGlsKCk7XG5jb25zdCBQS0dfSURYID0gXCJpbmRleDpwYWNrYWdlc1wiO1xuY29uc3QgUEtHX0lEX0NPVU5URVIgPSBcInBhY2thZ2U6aWRcIjtcbnZhciBkYXRhQ29udGV4dCA9IHJlcXVpcmUoJy4vZGF0YUNvbnRleHQnKVxuY29uc3QgUEtHX1BSRUZJWCA9IFwicGFja2FnZXM6XCI7XG5jb25zdCBBV0JfSUQgPSBcImF3YjppZFwiXG5jb25zdCBJTkRFWF9BV0IgPSBcImluZGV4OmF3YlwiXG5jb25zdCBSRUNfUEtHID0gXCJwa2c6cmVjOlwiXG52YXIgQ3VzdG9tZXJTZXJ2aWNlID0gcmVxdWlyZSgnLi9DdXN0b21lclNlcnZpY2UnKS5DdXN0b21lclNlcnZpY2U7IFxudmFyIGN1c3RvbWVyU2VydmljZSA9IG5ldyBDdXN0b21lclNlcnZpY2UoKVxuY29uc3QgUEtHX1NUQVRVUyA9IHsgXG4gIDEgOiBcIlJlY2VpdmVkXCIsXG4gIDI6IFwiTG9hZGVkIG9uIEFpckNyYWZ0XCIsXG4gIDM6IFwiSW4gVHJhbnNpdFwiLFxuICA0OiBcIlJlY2lldmVkIGluIE5BU1wiLFxuICA1OiBcIlJlYWR5IGZvciBQaWNrdXAgLyBEZWxpdmVyeVwiLFxuICA2OiBcIkRlbGl2ZXJlZFwiXG5cbn07IFxuXG5jb25zdCBhd2JJbmRleCA9IHJlZGlzU2VhcmNoKHJlZGlzLCBJTkRFWF9BV0IsIHtcbiAgY2xpZW50T3B0aW9uczogbHJlZGlzLnNlYXJjaENsaWVudERldGFpbHNcbn0pO1xuY29uc3QgcGFja2FnZUluZGV4ID0gcmVkaXNTZWFyY2gocmVkaXMsIFBLR19JRFgsIHtcbiAgY2xpZW50T3B0aW9uczogbHJlZGlzLnNlYXJjaENsaWVudERldGFpbHNcbn0pO1xuZnVuY3Rpb24gZ2V0UGFja2FnZVZvbHVtbmUobVBhY2thZ2Upe1xuXG4gIHJldHVybiAwOyBcbn1cbmZ1bmN0aW9uIGNyZWF0ZURvY3VtZW50KHRQYWNrYWdlKSB7XG4gIHZhciBwYWNrYWdlRG9jdW1lbnQgPSB7XG4gICAgaWQ6dFBhY2thZ2UuaWQsXG4gICAgdHJhY2tpbmdObzogdFBhY2thZ2UudHJhY2tpbmdObyxcbiAgICBza3lib3g6IHRQYWNrYWdlLnNreWJveCxcbiAgICBkYXRlUmVjaWV2ZWQgOiBtb21lbnQoKS51bml4KCksIFxuICAgIGF3YjowLCBcbiAgICBtaWQ6MCxcbiAgICB2b2x1bWU6IGdldFBhY2thZ2VWb2x1bW5lKHRQYWNrYWdlKSxcbiAgICB3ZWlnaHQ6dFBhY2thZ2Uud2VpZ2h0LFxuICAgIHBpZWNlczp0UGFja2FnZS5waWVjZXMsXG4gICAgY3VzdG9tZXI6IHRQYWNrYWdlLmN1c3RvbWVyLFxuICAgIHNoaXBwZXI6IHRQYWNrYWdlLnNoaXBwZXIsXG4gICAgZGVzY3JpcHRpb246IHRQYWNrYWdlLmRlc2NyaXB0aW9uLFxuICAgIGRpbWVuc2lvbnM6dFBhY2thZ2UuZGltZW5zaW9ucyxcbiAgICBjYXJyaWVyOnRQYWNrYWdlLmNhcnJpZXIsXG4gICAgLy9za3lib3hWOiB0UGFja2FnZS5za3lib3gsIGFkZCBkaW1lbmlvbiBcbiAgICBzdGF0dXM6IHRQYWNrYWdlLnN0YXR1cyxcbiAgICBtaWQ6IHRQYWNrYWdlLm1pZCxcbiAgICB2YWx1ZTogdFBhY2thZ2UudmFsdWUsXG4gICAgXG4gIH07XG4gIGNvbnNvbGUubG9nKFwiYWJvdXQgdG8gYWRkIHRoZSBwYWNrYWdlIHRvIHRoZSBpbmRleFwiKTtcbiAgcmV0dXJuIHBhY2thZ2VEb2N1bWVudDtcbn1cbmZ1bmN0aW9uIHNldFBhY2thZ2VJblRyYW5zaXQoa2V5cywgbXNlYXJjaGVyKSB7XG4gIHJldHVybiBuZXcgUHJvbWlzZSgocmVzb2x2ZSwgcmVqZWN0KSA9PiB7XG4gICAgdmFyIGJhdGNoZXIgPSBtc2VhcmNoZXIuY2xpZW50LmJhdGNoKCk7XG4gICAga2V5cy5mb3JFYWNoKGVsZW1lbnQgPT4ge1xuICAgICAgdmFyIHZhbHVlID0ge1xuICAgICAgICBzdGF0dXM6IDIsXG4gICAgICAgIGxvY2F0aW9uOiBcIkluIFRyYW5zaXRcIlxuICAgICAgfTtcbiAgICAgIGNvbnNvbGUubG9nKGVsZW1lbnQgKyBcImlzIHRoZSBlbGVtZW50XCIpO1xuXG4gICAgICBiYXRjaGVyLmhtc2V0KFBLR19QUkVGSVggKyBlbGVtZW50LCB2YWx1ZSk7XG4gICAgfSk7XG4gICAgYmF0Y2hlci5leGVjKChlcnIsIHJlc3VsdCkgPT4ge1xuICAgICAgY29uc29sZS5sb2cocmVzdWx0KTtcbiAgICAgIC8vcmVhZGQgdGhlIGRvY3VtZW50cyBoZXJlXG4gICAgICBrZXlzLmZvckVhY2goZWxlbWVudCA9PiB7XG4gICAgICAgIGFkZFBhY2thZ2VUb0luZGV4KGVsZW1lbnQsIG1zZWFyY2hlcik7XG4gICAgICB9KTtcbiAgICAgIHJlc29sdmUocmVzdWx0KTtcbiAgICB9KTtcbiAgfSk7XG59XG5cbmZ1bmN0aW9uIGFkZFBhY2thZ2VUb0luZGV4KHRyYWNraW5nTm8sIG1zZWFyY2hlcikge1xuICBscmVkaXMuZ2V0UGFja2FnZSh0cmFja2luZ05vKS50aGVuKHBhY2sgPT4ge1xuICAgIG1zZWFyY2hlci5kZWxEb2N1bWVudChQS0dfSURYLCBgJHtwYWNrLm1pZH0tJHt0cmFja2luZ05vfWAsIChlcnIsIGRvbmUpID0+IHtcbiAgICAgIHZhciBkb2N1bWVudCA9IGNyZWF0ZURvY3VtZW50KHBhY2spO1xuICAgICAgY29uc29sZS5sb2coXCJyZWFkZGluZyBwYWNrYWdlIHRvIHRoZSBpbmRleCBsaWtlIGEgYm9zcyBcIiArIHRyYWNraW5nTm8pO1xuICAgICAgbXNlYXJjaGVyLmFkZChwYWNrLm1pZCArIFwiLVwiICsgcGFjay50cmFja2luZ05vLCBkb2N1bWVudCk7XG4gICAgfSk7XG4gIH0pO1xufVxuZXhwb3J0IGNsYXNzIFBhY2thZ2VTZXJ2aWNlIHtcbiAgY29uc3RydWN0b3IoKSB7XG4gICAgdGhpcy5zZXR1cEluZGV4KCk7XG4gIH1cbiAgc2V0dXBJbmRleCgpIHtcbiAgICB0aGlzLm15U2VhcmNoID0gcmVkaXNTZWFyY2gocmVkaXMsIFBLR19JRFgsIHtcbiAgICAgIGNsaWVudE9wdGlvbnM6IGxyZWRpcy5zZWFyY2hDbGllbnREZXRhaWxzXG4gICAgfSk7XG4gIH1cbiAgZ2V0TmV3QXdiKCl7XG4gICAgcmV0dXJuIG5ldyBQcm9taXNlKChyZXNvbHZlLHJlamVjdCk9PntcbiAgICAgIGRhdGFDb250ZXh0LnJlZGlzQ2xpZW50LmV4aXN0cyhBV0JfSUQsKGVycixyZXN1bHQpPT57XG4gICAgICAgIGNvbnNvbGUubG9nKHJlc3VsdCk7IFxuICAgICAgICBpZiAocmVzdWx0ICE9IFwiMVwiKXtcbiAgICAgICAgICBkYXRhQ29udGV4dC5yZWRpc0NsaWVudC5zZXQoQVdCX0lEID09IDEwMDAwMCwoZXJyLGluaXRSZXN1bHQpPT57XG4gICAgICAgICAgICBkYXRhQ29udGV4dC5yZWRpc0NsaWVudC5pbmNyKEFXQl9JRCwoZXJyLG5ld0lkKT0+e1xuICAgICAgICAgICAgICByZXNvbHZlKHthd2I6bmV3SWR9KVxuICAgICAgICAgICAgfSlcbiAgICAgICAgICB9KVxuICAgICAgICB9XG4gICAgICAgIGVsc2Uge1xuICAgICAgICAgIGRhdGFDb250ZXh0LnJlZGlzQ2xpZW50LmluY3IoQVdCX0lELChlcnIsbmV3SWQpPT57XG4gICAgICAgICAgICByZXNvbHZlKHthd2I6bmV3SWR9KVxuICAgICAgICAgIH0pXG4gICAgICAgIH1cbiAgICAgIH0pXG4gICAgfSk7XG4gIH1cbiAgc2F2ZUF3Yihhd2Ipe1xuICAgIHJldHVybiBuZXcgUHJvbWlzZSgocmVzb2x2ZSxyZWplY3QpPT57XG4gICAgICBjb25zb2xlLmxvZygnc2F2aW5nLi4uJyxhd2IsbW9tZW50KCkudG9TdHJpbmcoXCJoaDptbTpzc1wiKSlcbiAgICAgIGRhdGFDb250ZXh0LnJlZGlzQ2xpZW50LmluY3IoQVdCX0lELChlcnIscmVwbHkpPT57XG4gICAgICAgIGF3Yi5pZCA9IHJlcGx5OyBcbiAgICAgICAgYXdiLnN0YXR1cyA9IDE7IFxuICAgICAgICBpZiAoYXdiLmludm9pY2Upe1xuICAgICAgICAgIGF3Yi5oYXNEb2NzID0gMVxuICAgICAgICAgIGNvbnNvbGUubG9nKFwiSEFTIERPQ0NDQ0NcIilcbiAgICAgICAgfVxuICAgICAgICBlbHNlIHtcbiAgICAgICAgICBhd2IuaGFzRG9jcyA9IDAgOyBcbiAgICAgICAgICBjb25zb2xlLmxvZyhcIkhBUyBOTyBET0NDQ0NDXCIpXG4gICAgICAgIH1cbiAgICAgICAgXG4gICAgICAgIGF3Yi5kYXRlQ3JlYXRlZCA9IG1vbWVudCgpLnVuaXgoKTsgXG4gICAgICAgICAgYXdiSW5kZXguYWRkKGF3Yi5pZCxhd2IsKGVycjEsYXdiUmVzKT0+e1xuICAgICAgICAgICAgaWYgKGVycjEpe1xuICAgICAgICAgICAgICBjb25zb2xlLmxvZygnc2F2aW5nIGVycicsZXJyMSlcbiAgICAgICAgICAgICAgcmVzb2x2ZSh7c2F2ZWQ6ZmFsc2V9KVxuICAgICAgICAgICAgfVxuICAgICAgICAgICAgcmVzb2x2ZSh7c2F2ZWQ6dHJ1ZSwgaWQ6cmVwbHl9KVxuICAgICAgICAgIH0pXG4gICAgICB9KVxuICAgICAgIFxuICAgICAgXG4gICAgICBcbiAgICB9KVxuICB9XG4gIGdldEF3Yk92ZXJ2aWV3KGlkKXtcbiAgICAvLyBnZXQgdGhlIGF3YiBwYWNrYWdlcyBhbmQgYWRkIGV2ZXJ5dGhpbmcgaW4gXG4gICAgcmV0dXJuIG5ldyBQcm9taXNlKChyZXNvbHZlLHJlamVjdCk9PntcbiAgICAgIHBhY2thZ2VJbmRleC5zZWFyY2goYEBhd2I6WyR7aWR9ICR7aWR9XWAse251bWJlck9mUmVzdWx0czo1MDAwLG9mZnNldDowfSwoZXJyLHBhY2thZ2VzKT0+e1xuICAgICAgICB2YXIgd2VpZ2h0ID0gMCA7IFxuICAgICAgICB2YXIgcGllY2VzID0gcGFja2FnZXMudG90YWxSZXN1bHRzOyBcbiAgICAgICAgdmFyIGRlc2NyaXB0aW9uID0gXCJcIlxuICAgICAgICBwYWNrYWdlcy5yZXN1bHRzLmZvckVhY2gocGFja2FnZTEgPT4ge1xuICAgICAgICAgIGlmIChkZXNjcmlwdGlvbiA9PVwiXCIpXG4gICAgICAgICAgICBkZXNjcmlwdGlvbiA9IHBhY2thZ2UxLmRvYy5kZXNjcmlwdGlvbjsgXG4gICAgICAgICAgd2VpZ2h0ICs9IE51bWJlcihwYWNrYWdlMS5kb2Mud2VpZ2h0KVxuICAgICAgICB9KTtcbiAgICAgICAgdmFyIGRhdGEgID0ge3dlaWdodDp3ZWlnaHQsZGVzY3JpcHRpb246ZGVzY3JpcHRpb24scGllY2VzOnBpZWNlc31cbiAgICAgICAgY29uc29sZS5sb2coZGF0YSxcIkFXQiBERVRBSUxTXCIpOyBcbiAgICAgICAgcmVzb2x2ZSggZGF0YSlcbiAgICAgIH0pXG4gICAgfSlcbiAgIFxuICB9XG4gIGdldEF3YkRldGFpbHMoaWQpe1xuICAgIHZhciBzcnYgPSB0aGlzOyBcbiAgICByZXR1cm4gbmV3IFByb21pc2UoKHJlc29sdmUscmVqZWN0KT0+e1xuICAgICAgY29uc29sZS5sb2coYEBhd2I6WyR7aWR9ICR7aWR9XWApXG4gICAgIFxuICAgICAgcGFja2FnZUluZGV4LnNlYXJjaChgQGF3YjpbJHtpZH0gJHtpZH1dYCx7bnVtYmVyT2ZSZXN1bHRzOjUwMDAsb2Zmc2V0OjB9LChlcnIscGFja2FnZXMpPT57XG4gICAgICAgIGlmIChlcnIpXG4gICAgICAgICBjb25zb2xlLmxvZyhlcnIpXG4gICAgICBcbiAgICAgICAgdmFyICBwYWNrYWdlbGlzdCAgPSBbXVxuICAgICAgICB2YXIgY291bnQgPSAxOyBcbiAgICAgICAgcGFja2FnZXMucmVzdWx0cy5mb3JFYWNoKHBhY2thZ2UxID0+IHtcblxuICAgICAgICAgIGlmIChwYWNrYWdlMS5kb2MudHJhY2tpbmdOby5sZW5ndGggPiA3KXtcbiAgICAgICAgICAgIC8vb25seSBkaXNwbGF5IHRoZSBsYXN0IDcgXG4gICAgICAgICAgICBwYWNrYWdlMS5kb2MudHJhY2tpbmdObyA9IHBhY2thZ2UxLmRvYy50cmFja2luZ05vLnN1YnN0cmluZyhwYWNrYWdlMS5kb2MudHJhY2tpbmdOby5sZW5ndGggLTcpXG4gICAgICAgICAgICBcbiAgICAgICAgICB9XG4gICAgICAgICAgcGFja2FnZTEuZG9jLnBhY2thZ2VJbmRleCA9IGNvdW50O1xuICAgICAgICAgIGNvdW50ICsrOyBcbiAgICAgICAgICBwYWNrYWdlbGlzdC5wdXNoKCBwYWNrYWdlMS5kb2MpXG4gICAgICAgIH0pO1xuICAgICAgIFxuICAgICAgIFxuICAgICAgICByZXNvbHZlKCBwYWNrYWdlbGlzdClcbiAgICAgIH0pXG4gICAgfSlcbiAgfVxuICBsaXN0Tm9Eb2NzRmxsKCl7XG4gICAgcmV0dXJuIG5ldyBQcm9taXNlKChyZXNvbHZlLHJlamVjdCk9PntcbiAgICAgICBhd2JJbmRleC5zZWFyY2goXCJAc3RhdHVzOlsxIDFdIEBoYXNEb2NzOlswIDBdXCIse29mZnNldDowLG51bWJlck9mUmVzdWx0czo1MDAwLHNvcnRCeTonaWQnfSwoZXJyLGF3YnMpPT57XG4gICAgICAgICB2YXIgYXdiTGlzdCA9IFtdOyBcbiAgICAgICAgIFByb21pc2UuYWxsKGF3YnMucmVzdWx0cy5tYXAoYXdiPT5jdXN0b21lclNlcnZpY2UuZ2V0Q3VzdG9tZXIoYXdiLmRvYy5jdXN0b21lcklkKSkpLnRoZW4oY3VzdG9tZXJzPT57XG4gICAgICAgICAgIFByb21pc2UuYWxsKGF3YnMucmVzdWx0cy5tYXAoYXdiPT50aGlzLmdldEF3Yk92ZXJ2aWV3KGF3Yi5kb2MuaWQpKSkudGhlbihkZXRhaWxzPT57XG4gICAgICAgICAgICBjb25zb2xlLmxvZyhcImdvdCB0aGUgY3VzdG9tZXJzXCIsY3VzdG9tZXJzLCBhd2JzKVxuICAgICAgICAgICAgZm9yKHZhciBpID0wIDsgaSA8IGF3YnMucmVzdWx0cy5sZW5ndGggOyBpKysgKXtcbiAgICAgICAgICAgICAgdmFyIGF3YiA9IGF3YnMucmVzdWx0c1tpXTsgXG4gICAgICAgICAgICAgIGF3Yi5kb2MuZGF0ZUNyZWF0ZWQgPSBtb21lbnQudW5peChhd2IuZG9jLmRhdGVDcmVhdGVkKS5mb3JtYXQoXCJZWVlZLU1NLUREIGhoOm1tIEFcIilcbiAgICAgICAgICAgICAgLy93ZSBuZWVkIHRvIGdldCB0aGUgY3VzdG9tZXIgXG4gICAgICAgICAgICAgIGF3Yi5kb2MuY29uc2lnbmVlID0gY3VzdG9tZXJzW2ldLm5hbWU7IFxuICAgICAgICAgICAgICBhd2IuZG9jLndlaWdodCA9IGRldGFpbHNbaV0ud2VpZ2h0OyBcbiAgICAgICAgICAgICAgYXdiLmRvYy5wbWIgPSBjdXN0b21lcnNbaV0ucG1iOyBcbiAgICAgICAgICAgICAgYXdiLmRvYy5kZXNjcmlwdGlvbiA9IGRldGFpbHNbaV0uZGVzY3JpcHRpb247IFxuICAgICAgICAgICAgICBhd2IuZG9jLnBpZWNlcyA9IGRldGFpbHNbaV0ucGllY2VzOyBcbiAgICAgICAgICAgICAgaWYgKGN1c3RvbWVyc1tpXS5wbWIgPT0gJycpe1xuICAgICAgICAgICAgICAgIGF3Yi5kb2MucG1iID0gJzkwMDAnXG4gICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgY29uc29sZS5sb2coJ3B1c2hpbmcgJyxhd2IpXG4gICAgICAgICAgICAgIC8vd2UgbmVlZCB0byBnZXQgYWxsIHRoZSBwYWNrYWdlcyBcbiAgICAgICAgICAgICAgYXdiTGlzdC5wdXNoKGF3Yi5kb2MpXG4gICAgICAgICAgICAgfVxuICAgICAgICAgICAgIHJlc29sdmUoe2F3YnM6YXdiTGlzdH0pXG4gICAgICAgICAgIH0pXG4gICAgICAgICAgXG4gICAgICAgICAgfSkuY2F0Y2goZXJyPT57XG4gICAgICAgICAgICBjb25zb2xlLmxvZyhlcnIpOyBcbiAgICAgICAgICB9KVxuICAgICAgICAgXG4gICAgICAgIC8vICBhd2JzLnJlc3VsdHMuZm9yRWFjaChhd2IgPT4ge1xuICAgICAgICAgICBcbiAgICAgICAgICBcbiAgICAgICAgLy8gIH0pO1xuICAgICAgICAgXG4gICAgICAgfSlcbiAgICB9KVxuICB9XG5cbiAgbGlzdEF3YmluRmxsKCl7XG4gICAgcmV0dXJuIG5ldyBQcm9taXNlKChyZXNvbHZlLHJlamVjdCk9PntcbiAgICAgICBhd2JJbmRleC5zZWFyY2goXCJAc3RhdHVzOlsxIDFdIEBoYXNEb2NzOlsxIDFdXCIse29mZnNldDowLG51bWJlck9mUmVzdWx0czo1MDAwLHNvcnRCeTonaWQnfSwoZXJyLGF3YnMpPT57XG4gICAgICAgICB2YXIgYXdiTGlzdCA9IFtdOyBcbiAgICAgICAgIFByb21pc2UuYWxsKGF3YnMucmVzdWx0cy5tYXAoYXdiPT5jdXN0b21lclNlcnZpY2UuZ2V0Q3VzdG9tZXIoYXdiLmRvYy5jdXN0b21lcklkKSkpLnRoZW4oY3VzdG9tZXJzPT57XG4gICAgICAgICAgIFByb21pc2UuYWxsKGF3YnMucmVzdWx0cy5tYXAoYXdiPT50aGlzLmdldEF3Yk92ZXJ2aWV3KGF3Yi5kb2MuaWQpKSkudGhlbihkZXRhaWxzPT57XG4gICAgICAgICAgICBjb25zb2xlLmxvZyhcImdvdCB0aGUgY3VzdG9tZXJzXCIsY3VzdG9tZXJzLCBhd2JzKVxuICAgICAgICAgICAgZm9yKHZhciBpID0wIDsgaSA8IGF3YnMucmVzdWx0cy5sZW5ndGggOyBpKysgKXtcbiAgICAgICAgICAgICAgdmFyIGF3YiA9IGF3YnMucmVzdWx0c1tpXTsgXG4gICAgICAgICAgICAgIGF3Yi5kb2MuZGF0ZUNyZWF0ZWQgPSBtb21lbnQudW5peChhd2IuZG9jLmRhdGVDcmVhdGVkKS5mb3JtYXQoXCJZWVlZLU1NLUREIGhoOm1tIEFcIilcbiAgICAgICAgICAgICAgLy93ZSBuZWVkIHRvIGdldCB0aGUgY3VzdG9tZXIgXG4gICAgICAgICAgICAgIGF3Yi5kb2MuY29uc2lnbmVlID0gY3VzdG9tZXJzW2ldLm5hbWU7IFxuICAgICAgICAgICAgICBhd2IuZG9jLnBtYiA9IGN1c3RvbWVyc1tpXS5wbWI7IFxuICAgICAgICAgICAgICBhd2IuZG9jLndlaWdodCA9IGRldGFpbHNbaV0ud2VpZ2h0OyBcbiAgICAgICAgICAgICAgYXdiLmRvYy5kZXNjcmlwdGlvbiA9IGRldGFpbHNbaV0uZGVzY3JpcHRpb247IFxuICAgICAgICAgICAgICBhd2IuZG9jLnBpZWNlcyA9IGRldGFpbHNbaV0ucGllY2VzOyBcbiAgICAgICAgICAgICAgaWYgKGN1c3RvbWVyc1tpXS5wbWIgPT0gJycpe1xuICAgICAgICAgICAgICAgIGF3Yi5kb2MucG1iID0gJzkwMDAnXG4gICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgY29uc29sZS5sb2coJ3B1c2hpbmcgJyxhd2IpXG4gICAgICAgICAgICAgIC8vd2UgbmVlZCB0byBnZXQgYWxsIHRoZSBwYWNrYWdlcyBcbiAgICAgICAgICAgICAgYXdiTGlzdC5wdXNoKGF3Yi5kb2MpXG4gICAgICAgICAgICAgfVxuICAgICAgICAgICAgIHJlc29sdmUoe2F3YnM6YXdiTGlzdH0pXG4gICAgICAgICAgIH0pXG4gICAgICAgICAgXG4gICAgICAgICAgfSkuY2F0Y2goZXJyPT57XG4gICAgICAgICAgICBjb25zb2xlLmxvZyhlcnIpOyBcbiAgICAgICAgICB9KVxuICAgICAgICAgXG4gICAgICAgIC8vICBhd2JzLnJlc3VsdHMuZm9yRWFjaChhd2IgPT4ge1xuICAgICAgICAgICBcbiAgICAgICAgICBcbiAgICAgICAgLy8gIH0pO1xuICAgICAgICAgXG4gICAgICAgfSlcbiAgICB9KVxuICB9XG4gIGdldEF3YihpZCl7XG4gICAgY29uc3Qgc3J2ID0gdGhpczsgXG4gICAgcmV0dXJuIG5ldyBQcm9taXNlKChyZXNvbHZlLHJlamVjdCk9PntcbiAgICAgIGF3YkluZGV4LmdldERvYyhpZCwoZXJyLGF3Yik9PntcbiAgICAgICAgLy9nZXQgdGhlIGN1c3RvbWVyIFxuICAgICAgICBjdXN0b21lclNlcnZpY2UuZ2V0Q3VzdG9tZXIoYXdiLmRvYy5jdXN0b21lcklkKS50aGVuKGN1c3RvbWVyPT57XG4gICAgICAgICAgYXdiLmRvYy5jdXN0b21lciA9IGN1c3RvbWVyOyBcbiAgICAgICAgICBzcnYuZ2V0QXdiRGV0YWlscyhpZCkudGhlbihwYWNrYWdlcz0+e1xuICAgICAgICAgICAgLy9nZXQgdGhlIHBhY2thZ2VzIGZvciB0aGUgYXdiIFxuICAgICAgICAgICAgYXdiLmRvYy5wYWNrYWdlcyA9IHBhY2thZ2VzOyBcbiAgICAgICAgICAgIHJlc29sdmUoe2F3Yjphd2IuZG9jfSkgIFxuICAgICAgICAgIH0pXG4gICAgICAgICAgXG4gICAgICAgIH0pXG4gICAgICAgIFxuICAgICAgfSlcbiAgICB9KVxuICB9XG4gIHVwZGF0ZUxvY2F0aW9uKHRyYWNraW5nTnVtYmVyLGxvY2F0aW9uX2lkKXtcbiAgICByZXR1cm4gbmV3IFByb21pc2UoKHJlc29sdmUscmVqZWN0KT0+e1xuICAgICAgcGFja2FnZUluZGV4LnNlYXJjaChcIkB0cmFja2luZ05vOlwiK3RyYWNraW5nTnVtYmVyLHtsb2NhdGlvbjpsb2NhdGlvbl9pZH0sKGVycixwYWNrYWdlUmVzdWx0KT0+e1xuXG4gICAgICB9KVxuICAgIH0pXG4gIH1cbiAgc2F2ZVBhY2thZ2VUb0F3YihuZXdQYWNrYWdlKXtcbiAgICByZXR1cm4gbmV3IFByb21pc2UoKHJlc29sdmUscmVzdWx0KT0+e1xuICAgICAgZGF0YUNvbnRleHQucmVkaXNDbGllbnQuaW5jcihQS0dfSURfQ09VTlRFUiwoZXJyLGlkKT0+e1xuICAgICAgICBuZXdQYWNrYWdlLmlkID0gaWQ7IFxuICAgICAgICBwYWNrYWdlSW5kZXguYWRkKGlkLG5ld1BhY2thZ2UsKGVycixyZXN1bHQpPT57XG4gICAgICAgICAgaWYgKGVycilcbiAgICAgICAgICAgIGNvbnNvbGUubG9nKGVycik7IFxuICAgICAgICAgIHJlc29sdmUoe3NhdmVkOnRydWUsaWQ6aWR9KVxuICAgICAgICB9KVxuICAgICAgfSlcbiAgICB9KVxuICB9XG4gIHNhdmVQYWNrYWdlKGJvZHkpe1xuICAgIHJldHVybiBuZXcgUHJvbWlzZSgocmVzb2x2ZSxyZWplY3QpPT57XG4gICAgICB2YXIgY1BhY2thZ2UgPSB7XG4gICAgICAgIFxuICAgICAgICBza3lib3g6IGJvZHkuc2t5Ym94LFxuICAgICAgICBjdXN0b21lcjogYm9keS5jdXN0b21lci5yZXBsYWNlKFwiLVwiLCBcIlwiKS50cmltKCksXG4gICAgICAgIHRyYWNraW5nTm86IGJvZHkudHJhY2tpbmcsXG4gICAgICAgIGRlc2NyaXB0aW9uOiBib2R5LmRlc2NyaXB0aW9uLFxuICAgICAgICBzaGlwcGVyOiBib2R5LnNoaXBwZXIsXG4gICAgICAgIGNhcnJpZXI6Ym9keS5jYXJyaWVyLFxuICAgICAgICB2YWx1ZTogTnVtYmVyKGJvZHkudmFsdWUpLFxuICAgICAgICBwaWVjZXM6IE51bWJlcihib2R5LnBpZWNlcyksXG4gICAgICAgIHdlaWdodDogTnVtYmVyKGJvZHkud2VpZ2h0KSxcbiAgICAgICAgZGltZW5zaW9uczogYm9keS5kaW1lbnNpb25zLFxuICAgICAgICBzdGF0dXM6IDEsXG4gICAgICAgIGxvY2F0aW9uOiBcIkZMTFwiLFxuICAgICAgICBtaWQ6IDAsXG4gICAgICAgIGF3YjowLFxuICAgICAgICAvL2hhc09wdDogdHJ1ZSxcbiAgICAgICAgLy9tdHlwZTogYm9keS5tdHlwZVxuICAgICAgfTtcbiAgICAgIC8vdmFsaWRhdGUgdGhlIHBhY2thZ2UgXG4gICAgICBkYXRhQ29udGV4dC5yZWRpc0NsaWVudC5pbmNyKFBLR19JRF9DT1VOVEVSLChlcnIsaWQpPT57XG4gICAgICAgIGNQYWNrYWdlLmlkID0gaWQ7IFxuICAgICAgICBkYXRhQ29udGV4dC5yZWRpc0NsaWVudC5zZXQoUEtHX1BSRUZJWCtpZCxjUGFja2FnZSwoZXJyLHJlc3BvbnNlKT0+e1xuICAgICAgICAgIGlmIChlcnIpe1xuICAgICAgICAgICAgcmVqZWN0KHtzYXZlZDpmYWxzZSxlcnI6ZXJyfSlcbiAgICAgICAgICB9XG4gICAgICAgICAgIHZhciBpbmRleFBhY2thZ2UgPSAgY3JlYXRlRG9jdW1lbnQoY1BhY2thZ2UpOyBcbiAgICAgICAgICAgY29uc29sZS5sb2coaW5kZXhQYWNrYWdlKTsgXG4gICAgICAgICAgIHBhY2thZ2VJbmRleC5hZGQoY1BhY2thZ2UuaWQsaW5kZXhQYWNrYWdlLChlcnIxLGRvY1Jlc3VsdCk9PntcbiAgICAgICAgICAgICBjb25zb2xlLmxvZyhkb2NSZXN1bHQpOyBcbiAgICAgICAgICAgICBpZihlcnIxKXtcbiAgICAgICAgICAgICAgIHJlamVjdCh7c2F2ZWQ6ZmFsc2UsZXJyOmVycjF9KVxuICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICByZXNvbHZlKHtzYXZlZDp0cnVlfSlcbiAgICAgICAgICAgfSlcblxuICAgICAgICB9KVxuICAgICAgfSk7XG4gICAgXG5cblxuICAgIH0pXG4gIH1cbiAgc2F2ZVBhY2thZ2VPbGQoYm9keSkge1xuICAgIFxuICAgIHZhciBzZWFyY2hlciA9IHRoaXMubXlTZWFyY2g7IFxuICAgIHJldHVybiBuZXcgUHJvbWlzZSgocmVzb2x2ZSwgcmVqZWN0KSA9PiB7XG4gICAgICB2YXIgY1BhY2thZ2UgPSB7XG4gICAgICAgIHNreWJveDogYm9keS5za3lib3gsXG4gICAgICAgIGN1c3RvbWVyOiBib2R5LmN1c3RvbWVyLnJlcGxhY2UoXCItXCIsIFwiXCIpLnRyaW0oKSxcbiAgICAgICAgdHJhY2tpbmdObzogYm9keS50cmFja2luZyxcbiAgICAgICAgZHV0eVBlcmNlbnQ6IDAuMixcbiAgICAgICAgZGVzY3JpcHRpb246IGJvZHkuZGVzY3JpcHRpb24sXG4gICAgICAgIHNoaXBwZXI6IGJvZHkuc2hpcHBlcixcbiAgICAgICAgdmFsdWU6IE51bWJlcihib2R5LnZhbHVlKSxcbiAgICAgICAgcGllY2VzOiBOdW1iZXIoYm9keS5waWVjZXMpLFxuICAgICAgICB3ZWlnaHQ6IE51bWJlcihib2R5LndlaWdodCksXG4gICAgICAgIHN0YXR1czogMSxcbiAgICAgICAgbG9jYXRpb246IFwiRkxMXCIsXG4gICAgICAgIG1pZDogYm9keS5taWQsXG4gICAgICAgIGhhc09wdDogdHJ1ZSxcbiAgICAgICAgLy9tdHlwZTogYm9keS5tdHlwZVxuICAgICAgfTtcbiAgICAgIGNvbnNvbGUubG9nKFwiYWJvdXQgdG8gc2F2ZSB0aGUgcGFja2FnZVwiKTtcbiAgICAgIGlmICh0eXBlb2YgY1BhY2thZ2Uuc2hpcHBlciA9PT0gXCJ1bmRlZmluZWRcIikgY1BhY2thZ2Uuc2hpcHBlciA9IFwiXCI7XG4gICAgICBpZiAodHlwZW9mIGNQYWNrYWdlLmRlc2NyaXB0aW9uID09PSBcInVuZGVmaW5lZFwiKVxuICAgICAgICBjUGFja2FnZS5kZXNjcmlwdGlvbiA9IFwiXCI7XG4gICAgICBjb25zb2xlLmxvZyhib2R5KTtcbiAgICAgIC8vIGlmIChOdW1iZXIoYm9keS5pc0J1c2luZXNzKSA9PSAxKSB7XG4gICAgICAvLyAgIGNQYWNrYWdlLmhhc09wdCA9IGZhbHNlO1xuICAgICAgLy8gfVxuICAgICAgLy9jUGFja2FnZSA9IHBhY2thZ2VVdGlsLmNhbGN1bGF0ZUZlZXMoY1BhY2thZ2UpO1xuICAgICAgY29uc29sZS5sb2coXCJwYWNrYWdlIHdpdGggZmVlc1wiKTtcblxuICAgICAgLy93ZSBhbHNvIHdhbnQgdG8gY2FsY3VsYXRlIHRoZSB0aGUgcGFja2FnZSBmZWVzIG9uZSB0aW1lLi4uLi4uXG4gICAgICAvL3dlIGhhdmUgdGhlIHBhY2thZ2UgZGV0YWlscyBoZXJlIC4uIG5vdyB3ZSBuZWVkIHRvIGdldCB0aGUgZXhpc3RpbmcgcGFja2FnZVxuXG4gICAgIFxuICAgICAgLy93ZSBuZWVkIHRvIGNoZWNrIHRvIHNlZSBvZiB0aGUgb3duZXIgaXMgYSBidXNpbmVzcyBoZXJlXG4gICAgICBjb25zb2xlLmxvZyhcImhlcmUgYWJvdXQgdG8gZ2V0IHRoZSBwYWNrYWdlXCIpXG4gICAgICBscmVkaXMuZ2V0UGFja2FnZShjUGFja2FnZS50cmFja2luZ05vKS50aGVuKHAgPT4ge1xuICAgICAgICBjb25zb2xlLmxvZygncCBpcyB0aGUgJyxwKTsgXG4gICAgICAgIGlmIChwKSB7XG4gICAgICAgICAgdmFyIGN1cnJlbnRDb250YWluZXIgPSBgbWFuaWZlc3Q6JHtwLm1pZH06JHtwLm10eXBlfToke2NvbnRhaW5lcn06YDtcbiAgICAgICAgICBjb25zb2xlLmxvZyhcImZvdW5kIHBhY2thZ2UgXCIpO1xuICAgICAgICAgIGNvbnNvbGUubG9nKHApO1xuICAgICAgICAgIGlmIChjb250YWluZXIgPT0gXCJiYWdcIikge1xuICAgICAgICAgICAgLy9jaGVjayB0byBzZWUgaWYgdGhlIGJhY2sgbm8gaXMgdGhlIHNhbWUuXG4gICAgICAgICAgICBpZiAocC5iYWcgIT0gY1BhY2thZ2UuYmFnKSB7XG4gICAgICAgICAgICAgIC8vcmVtb3ZlIGl0IGZyb20gdGhlIG9yaWdpbmFsIGxpc3RcbiAgICAgICAgICAgICAgbHJlZGlzLnNyZW0oY3VycmVudENvbnRhaW5lciArIHAuYmFnLCBwLnRyYWNraW5nTm8pO1xuICAgICAgICAgICAgICBjb25zb2xlLmxvZyhcbiAgICAgICAgICAgICAgICBcInJlbW92ZSBwYWNrYWdlIGZyb20gY3VycmVudCBzZXQgXCIgKyBjdXJyZW50Q29udGFpbmVyXG4gICAgICAgICAgICAgICk7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgIC8vY2hlY2sgdG8gc2VlIGlmIHRoZSBza2lkIG51bWJlciBpcyB0aGUgc2FtZS5cbiAgICAgICAgICAgIGlmIChwLnNraWQgIT0gY1BhY2thZ2Uuc2tpZCkge1xuICAgICAgICAgICAgICAvL3JlbW92ZSBpdCBmcm9tIHRoZSBvcmlnaW5hbCBsaXN0XG4gICAgICAgICAgICAgIGxyZWRpcy5zcmVtKGN1cnJlbnRDb250YWluZXIgKyBwLnNraWQsIHAudHJhY2tpbmdObyk7XG4gICAgICAgICAgICAgIGNvbnNvbGUubG9nKFxuICAgICAgICAgICAgICAgIFwicmVtb3ZlIHBhY2thZ2UgZnJvbSBjdXJyZW50IHNldCBcIiArIGN1cnJlbnRDb250YWluZXJcbiAgICAgICAgICAgICAgKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICB9XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgLy8gdGhlIHBhY2thZ2UgZG9lc24ndCBleGlzdCB1cGRhdGUgdGhlIGNvdW50ZXJcbiAgICAgICAgICBscmVkaXMuY2xpZW50LmluY3IoXCJtY291bnRlcjpcIiArIGNQYWNrYWdlLm1pZCk7XG4gICAgICAgICAgXG4gICAgICAgIH1cblxuICAgICAgICBscmVkaXNcbiAgICAgICAgICAuaG1zZXQoXCJwYWNrYWdlczpcIiArIGNQYWNrYWdlLnRyYWNraW5nTm8sIGNQYWNrYWdlKVxuICAgICAgICAgIC50aGVuKGZ1bmN0aW9uKHJlc3VsdCkge1xuICAgICAgICAgICAgLy9hZGQgdG8gcXVldWUgZm9yIHBlcnNpc3RlbnQgcHJvY2Vzc2luZ1xuICAgICAgICAgICAgXG4gICAgICAgICAgICB2YXIgbWFuaWZlc3RLZXkgPSBgbWFuaWZlc3Q6JHtjUGFja2FnZS5taWR9OiR7XG4gICAgICAgICAgICAgIGNQYWNrYWdlLm10eXBlXG4gICAgICAgICAgICB9OiR7Y29udGFpbmVyfToke2NvbnRhaW5lck5vfWA7XG4gICAgICAgICAgICBjb25zb2xlLmxvZyhcImFib3V0IHRvIGNyZWF0ZSB0aGUgZG9jdW1lbnQuLi4uXCIpO1xuICAgICAgICAgICAgYWRkUGFja2FnZVRvSW5kZXgoY1BhY2thZ2UudHJhY2tpbmdObyxzZWFyY2hlcik7IFxuICAgICAgICAgICAgY29uc29sZS5sb2coXCJhZGRlZCB0aGUgcGFja2FnZSB0byBpbmRleFwiKTtcbiAgICAgICAgICAgIGxyZWRpc1xuICAgICAgICAgICAgICAuc2V0QWRkKG1hbmlmZXN0S2V5LCBjUGFja2FnZS50cmFja2luZ05vKVxuICAgICAgICAgICAgICAudGhlbihmdW5jdGlvbihzUmVzdWx0KSB7XG4gICAgICAgICAgICAgICAgLy9nZXQgdGhlIG1lbWJlcnMgb25lIHRpbWUgaGVyZVxuICAgICAgICAgICAgICAgIGNvbnNvbGUubG9nKFwiYWRkZWQgdGhlIHBhY2thZ2UgdG8gdGhlIHNldFwiKTtcbiAgICAgICAgICAgICAgICBjb25zb2xlLmxvZyhtYW5pZmVzdEtleSk7XG4gICAgICAgICAgICAgICAgbHJlZGlzXG4gICAgICAgICAgICAgICAgICAuZ2V0TWVtYmVycyhtYW5pZmVzdEtleSlcbiAgICAgICAgICAgICAgICAgIC50aGVuKGRhdGEgPT4ge1xuICAgICAgICAgICAgICAgICAgICBjb25zb2xlLmxvZyhcImRhdGFcIik7XG4gICAgICAgICAgICAgICAgICAgIGNvbnNvbGUubG9nKGRhdGEpO1xuICAgICAgICAgICAgICAgICAgICBQcm9taXNlLmFsbChkYXRhLm1hcChscmVkaXMuZ2V0UGFja2FnZSkpO1xuICAgICAgICAgICAgICAgICAgfSlcbiAgICAgICAgICAgICAgICAgIC50aGVuKGZ1bmN0aW9uKHJkYXRhKSB7XG4gICAgICAgICAgICAgICAgICAgIC8vd2UgbmVlZCB0byBhbGVydCB0aGUgcGVyc29uIHRoYXQgdGhlIHBhY2thZ2UgaXMgaGVyZSBzbyByZWFkIGVtYWlsIGV0Yy5cbiAgICAgICAgICAgICAgICAgICAgLy9hZGQgdG8gdGhlIGluZGV4XG4gICAgICAgICAgICAgICAgICAgIGNvbnNvbGUubG9nKFwiZGF0YVwiKTtcbiAgICAgICAgICAgICAgICAgICAgY29uc29sZS5sb2cocmRhdGEpO1xuXG4gICAgICAgICAgICAgICAgICAgIHJlc29sdmUoe1xuICAgICAgICAgICAgICAgICAgICAgIHNhdmVkOiB0cnVlLFxuICAgICAgICAgICAgICAgICAgICAgIHBhY2thZ2VzOiByZGF0YSxcbiAgICAgICAgICAgICAgICAgICAgICBzUGFja2FnZTogY1BhY2thZ2VcbiAgICAgICAgICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICAgICAgICB9KVxuICAgICAgICAgICAgICAgICAgLmNhdGNoKGVycjMgPT4ge1xuICAgICAgICAgICAgICAgICAgICBjb25zb2xlLmxvZyhlcnIzKTtcbiAgICAgICAgICAgICAgICAgICAgcmVqZWN0KHtcbiAgICAgICAgICAgICAgICAgICAgICBlcnI6IGVycjMsXG4gICAgICAgICAgICAgICAgICAgICAgc2F2ZWQ6IHRydWUsXG4gICAgICAgICAgICAgICAgICAgICAgbGlzdGluZzogZmFsc2VcbiAgICAgICAgICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICAgICAgICB9KTtcbiAgICAgICAgICAgICAgfSlcbiAgICAgICAgICAgICAgLmNhdGNoKGZ1bmN0aW9uKGVycikge1xuICAgICAgICAgICAgICAgIHJlc29sdmUoe1xuICAgICAgICAgICAgICAgICAgc2F2ZWQ6IGZhbHNlXG4gICAgICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICAgIH0pO1xuICAgICAgICAgIH0pXG4gICAgICAgICAgLmNhdGNoKGZ1bmN0aW9uKGVycjIpIHtcbiAgICAgICAgICAgIHJlamVjdCh7XG4gICAgICAgICAgICAgIHNhdmVkOiBmYWxzZVxuICAgICAgICAgICAgfSk7XG4gICAgICAgICAgfSk7XG5cbiAgICAgICAgLy9zYXZlIHRoZSBwYWNrYWdlIHRvIHRoZSBwYWNrYWdlIE5TXG4gICAgICB9KS5jYXRjaChlcnIyMzI9PntcbiAgICAgICAgY29uc29sZS5sb2coZXJyMjMyKVxuICAgICAgfSk7XG4gICAgfSk7XG4gIH0gXG4gIGdldE1hbmlmZXN0UGFja2FnZXMoKXtcbiAgICByZXR1cm4gbmV3IFByb21pc2UoKHJlc29sdmUscmVqZWN0KT0+e1xuICAgICAgXG4gICAgICB0aGlzLm15U2VhcmNoLnNlYXJjaChcbiAgICAgICAgYEBtaWQ6WzAgMF1gLFxuICAgICAgICB7IG9mZnNldDogMCwgbnVtYmVyT2ZSZXN1bHRzOiA1MDAwIH0sXG4gICAgICAgIChlcnIsIGRhdGEpID0+IHtcbiAgICAgICAgICB2YXIgcGFja2FnZXMgPSBbXTtcbiAgICAgICAgICBjb25zb2xlLmxvZyhkYXRhKTtcbiAgICAgICAgICBkYXRhLnJlc3VsdHMuZm9yRWFjaChlbGVtZW50ID0+IHtcblxuICAgICAgICAgICAgcGFja2FnZXMucHVzaChlbGVtZW50LmRvYyk7XG4gICAgICAgICAgICByZXNvbHZlKHBhY2thZ2VzKTsgICAgICAgICAgICAgICAgIFxuICAgICAgICB9KTtcbiAgICB9KTtcbiAgICB9KVxuICB9XG4gIGdldFJlY2VpdmVkUGFja2FnZXMocGFnZSxwYWdlU2l6ZSl7XG4gICAgcmV0dXJuIG5ldyBQcm9taXNlKChyZXNvbHZlLHJlamVjdCk9PntcbiAgICAgIFxuICAgICAgdGhpcy5teVNlYXJjaC5zZWFyY2goXG4gICAgICAgIGBAbWlkOlswIDBdYCxcbiAgICAgICAgeyBvZmZzZXQ6IDAsIG51bWJlck9mUmVzdWx0czogNTAwMCB9LFxuICAgICAgICAoZXJyLCBkYXRhKSA9PiB7XG4gICAgICAgICAgdmFyIHBhY2thZ2VzID0gW107XG4gICAgICAgICAgY29uc29sZS5sb2coZGF0YSk7XG4gICAgICAgICAgZGF0YS5yZXN1bHRzLmZvckVhY2goZWxlbWVudCA9PiB7XG5cbiAgICAgICAgICAgIHBhY2thZ2VzLnB1c2goZWxlbWVudC5kb2MpO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIFxuICAgICAgICB9KTtcbiAgICAgICAgcmVzb2x2ZShwYWNrYWdlcyk7IFxuICAgIH0pO1xuICAgIH0pXG4gIH1cbiAgZ2V0Tm9Eb2NzUGFja2Fja2FnZXMocGFnZSxwYWdlU2l6ZSl7XG4gICAgcmV0dXJuIG5ldyBQcm9taXNlKChyZXNvbHZlLHJlamVjdCk9PntcbiAgICAgIFxuICAgICAgdGhpcy5teVNlYXJjaC5zZWFyY2goXG4gICAgICAgIGBAaGFzRG9jczpbMCAwXWAsXG4gICAgICAgIHsgb2Zmc2V0OiAwLCBudW1iZXJPZlJlc3VsdHM6IDUwMDAgfSxcbiAgICAgICAgKGVyciwgZGF0YSkgPT4ge1xuICAgICAgICAgIHZhciBwYWNrYWdlcyA9IFtdO1xuICAgICAgICAgIGNvbnNvbGUubG9nKGRhdGEpO1xuICAgICAgICAgIGRhdGEucmVzdWx0cy5mb3JFYWNoKGVsZW1lbnQgPT4ge1xuXG4gICAgICAgICAgICBwYWNrYWdlcy5wdXNoKGVsZW1lbnQuZG9jKTtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBcbiAgICAgICAgfSk7XG4gICAgICAgIHJlc29sdmUocGFja2FnZXMpOyBcbiAgICB9KTtcbiAgICB9KVxuICB9XG4gIGdldFBhY2thZ2VCeUlkKGlkKXtcbiAgICByZXR1cm4gbmV3IFByb21pc2UoKHJlc29sdmUscmVqZWN0KT0+e1xuICAgICAgcmVkaVNlYXJjaC5nZXREb2MoaWQsKGVycixkb2N1bWVudCk9PntcbiAgICAgICAgcmVzb2x2ZShkb2N1bWVudC5kb2MpOyBcbiAgICAgIH0pXG4gICAgfSk7IFxuICB9XG4gIHVwZGF0ZU1hbmlmZXN0UGFja2FnZVRvSW5UcmFuc2l0KG1pZCkge1xuICAgIC8vZ2V0IGFsbCB0aGUgcGFja2FnZXNcbiAgICAvL3dlIG5lZWQgdG8gdXBkYXRlIHRoZSBpbmRleCBhdCB0aGlzIHBvaW50IGFzIHdlbGxcbiAgICB2YXIgbXNlYXJjaCA9IHRoaXMubXlTZWFyY2g7XG4gICAgdGhpcy5teVNlYXJjaC5zZWFyY2goXG4gICAgICBgQG1pZDpbJHttaWR9ICR7bWlkfV1gLFxuICAgICAgeyBvZmZzZXQ6IDAsIG51bWJlck9mUmVzdWx0czogNTAwMCB9LFxuICAgICAgKGVyciwgZGF0YSkgPT4ge1xuICAgICAgICB2YXIgcGFja2FnZXMgPSBbXTtcbiAgICAgICAgY29uc29sZS5sb2coZGF0YSk7XG4gICAgICAgIGRhdGEucmVzdWx0cy5mb3JFYWNoKGVsZW1lbnQgPT4ge1xuICAgICAgICAgIHZhciBvbGREb2NJZCA9IGVsZW1lbnQuZG9jSWQ7XG4gICAgICAgICAgZWxlbWVudC5kb2NJZCA9IGVsZW1lbnQuZG9jSWQucmVwbGFjZShgJHttaWR9LWAsIFwiXCIpO1xuICAgICAgICAgIHBhY2thZ2VzLnB1c2goZWxlbWVudC5kb2NJZCk7XG4gICAgICAgICAgLy8gaSBjb3VsZCBkZWxldGUgaGVyZVxuICAgICAgICAgIC8vIG1zZWFyY2guZGVsRG9jdW1lbnQoUEtHX0lEWCxvbGREb2NJZClcbiAgICAgICAgICAvL3VwZGF0ZSBhbGwgdGhlIHBhY2thZ2VzXG4gICAgICAgIH0pO1xuICAgICAgICBzZXRQYWNrYWdlSW5UcmFuc2l0KHBhY2thZ2VzLCBtc2VhcmNoLCBtaWQpLnRoZW4oZnVuY3Rpb24oXG4gICAgICAgICAgdXBkYXRlZFBhY2thZ2VzXG4gICAgICAgICkge1xuICAgICAgICAgIGNvbnNvbGUubG9nKFwidXBkYXRlZCBwYWNrYWdlc1wiKTtcbiAgICAgICAgICBjb25zb2xlLmxvZyh1cGRhdGVkUGFja2FnZXMpO1xuICAgICAgICB9KTtcbiAgICAgIH1cbiAgICApO1xuICB9XG4gIHJlbW92ZVBhY2thZ2VGcm9tTWFuaWZlc3QocGFja2FnZUlkLCBtaWQpIHtcbiAgICB2YXIgbXNlYXJjaCA9IHRoaXMubXlTZWFyY2g7XG4gICAgcmV0dXJuIG5ldyBQcm9taXNlKChyZXNvbHZlLCByZWplY3QpID0+IHtcbiAgICAgIHZhciBtYW5pZmVzdCA9IG1pZDtcbiAgICAgIHZhciBtYW5pZmVzdEtleSA9IFwibWFuaWZlc3Q6XCIgKyBtYW5pZmVzdCArIFwiOipcIjtcblxuICAgICAgbHJlZGlzLmRlbChcInBhY2thZ2VzOlwiICsgdHJhY2tpbmdObykudGhlbihmdW5jdGlvbihyZXN1bHQpIHtcbiAgICAgICAgY29uc29sZS5sb2cocmVzdWx0KTtcbiAgICAgICAgbXNlYXJjaC5kZWxEb2N1bWVudChQS0dfSURYLCBgJHttaWR9LSR7dHJhY2tpbmdOb31gKTtcbiAgICAgICAgLy93ZSBuZWVkIHRvIHJlbW92ZSBmcm9tIHRoZSBpbmRleCBhbmQgZGVjIHRoZSBjb3VudGVyXG4gICAgICAgIGxyZWRpcy5jbGllbnQuZGVjcihcIm1jb3VudGVyOlwiICsgbWlkKTtcbiAgICAgICAgLy9yU2VydmljZXMucGFja2FnZVNlcnZpY2Uucm1QYWNrYWdlKG1pZCwgdHJhY2tpbmdObyk7XG4gICAgICAgIGxyZWRpcy5nZXRLZXlzKG1hbmlmZXN0S2V5KS50aGVuKGtSZXN1bHQgPT4ge1xuICAgICAgICAgIC8vdGhlIGxpc3Qgb2YgYWxsIHRoZSBzZXRzIC4uLndlIG5lZWQgdG8gcmVtb3ZlIHRoZSBrZXkgZnJvbSBlYWNoIG9uZVxuICAgICAgICAgIHZhciBrZXlzQ291bnQgPSAwO1xuXG4gICAgICAgICAga1Jlc3VsdC5mb3JFYWNoKGVsZW1lbnQgPT4ge1xuICAgICAgICAgICAgY29uc29sZS5sb2coXG4gICAgICAgICAgICAgIGByZW1vdmluZyAke3RyYWNraW5nTm99IHBhY2thZ2UgbWFuaWZlc3Qgc2V0ICR7ZWxlbWVudH0gYFxuICAgICAgICAgICAgKTtcbiAgICAgICAgICAgIGxyZWRpcy5zcmVtKGVsZW1lbnQsIHRyYWNraW5nTm8pLnRoZW4oZnVuY3Rpb24oclJlc3VsdCkge1xuICAgICAgICAgICAgICBjb25zb2xlLmxvZyhyUmVzdWx0KTtcbiAgICAgICAgICAgICAgY29uc29sZS5sb2coXCJyZW1vdmVkXCIpO1xuICAgICAgICAgICAgICBpZiAoa2V5c0NvdW50ID09IGtSZXN1bHQubGVuZ3RoIC0gMSkga2V5c0NvdW50Kys7XG4gICAgICAgICAgICB9KTtcbiAgICAgICAgICB9KTtcbiAgICAgICAgICByZXNvbHZlKHtcbiAgICAgICAgICAgIGRlbGV0ZWQ6IHRydWVcbiAgICAgICAgICB9KTtcbiAgICAgICAgfSk7XG5cbiAgICAgICAgLy93ZSBhbHNvIG5lZWQgdG8gcmVtb3ZlIGZyb20gYW55IHNldHNcbiAgICAgIH0pO1xuICAgIH0pO1xuICB9XG4gIHJlbW92ZVBhY2thZ2VCeUlkKGlkKSB7XG4gICAgdmFyIG1zZWFyY2ggPSB0aGlzLm15U2VhcmNoO1xuICAgIHJldHVybiBuZXcgUHJvbWlzZSgocmVzb2x2ZSwgcmVqZWN0KSA9PiB7XG4gICAgXG4gICAgICByZWRpU2VhcmNoLmRlbERvY3VtZW50KFBLR19JRFgsaWQsKGVycixyZXNwb25zZSk9PntcbiAgICAgICAgcmVzb2x2ZSh7ZGVsZXRlZDp0cnVlfSlcbiAgICAgIH0pXG4gICAgICBcbiAgICAgICAgXG4gICAgICBcbiAgICB9KTtcbiAgfVxuICBzdG9yZVBhY2thZ2VGb3JQaWNrdXAodHJhY2tpbmdObyxiaW4pe1xuICAgIHZhciBzZWFyY2hlciA9IHRoaXMubXlTZWFyY2g7XG4gICAgcmV0dXJuIG5ldyBQcm9taXNlKChyZXNvbHZlLHJlamVjdCk9PntcbiAgICAgICBscmVkaXMuaG1zZXQoUEtHX1BSRUZJWCt0cmFja2luZ05vLHtzdGF0dXM6NCxsb2NhdGlvbjpiaW59KS50aGVuKChyZXN1bHQpPT57XG4gICAgICAgICBscmVkaXMuZ2V0UGFja2FnZSh0cmFja2luZ05vKS50aGVuKChwa2cpPT57XG4gICAgICAgICAgYWRkUGFja2FnZVRvSW5kZXgodHJhY2tpbmdObyxzZWFyY2hlcikgOyBcbiAgICAgICAgICByZXNvbHZlKHBrZyk7ICAgXG4gICAgICAgICB9KTtcbiAgICAgICB9KSBcbiAgICB9KTsgXG4gIH1cbiAgdXBkYXRlUGFja2FnZUluZGV4KHRyYWNraW5nKXtcbiAgICAgIHJldHVybiBuZXcgUHJvbWlzZSgocmVzb2x2ZSxyZWplY3QpPT57XG4gICAgICAgICAgdmFyIG1zZWFyY2ggPSB0aGlzLm15U2VhcmNoOyBcbiAgICAgICAgICBhZGRQYWNrYWdlVG9JbmRleCh0cmFja2luZyxtc2VhcmNoKTsgXG4gICAgICAgICByZXNvbHZlKHsndXBkYXRlZCc6dHJ1ZX0pO1xuICAgICAgfSlcbiAgfVxuICBnZXRDdXN0b21lclBhY2thZ2VzKHNreWJveCkge31cbiAgZ2V0TWFuaWZlc3RQYWNrYWdlc0J5U3RhdHVzKG1pZCxzdGF0dXMpIHtcbiAgICAgIHJldHVybiBuZXcgUHJvbWlzZSgocmVzb2x2ZSxyZWplY3QpPT57XG4gICAgICAgICAgY29uc29sZS5sb2coYEBtaWQ6WyR7bWlkfSAke21pZH1dIEBzdGF0dXM9WyR7c3RhdHVzfSAke3N0YXR1c31dYClcbiAgICAgICAgdGhpcy5teVNlYXJjaC5zZWFyY2goXG4gICAgICAgICAgICBgQG1pZDpbJHttaWR9ICR7bWlkfV0gQHN0YXR1czpbJHtzdGF0dXN9ICR7c3RhdHVzfV1gLFxuICAgICAgICAgICAgeyBvZmZzZXQ6IDAsIG51bWJlck9mUmVzdWx0czogNTAwMCB9LFxuICAgICAgICAgICAgKGVyciwgZGF0YSkgPT4ge1xuICAgICAgICAgICAgICB2YXIgcGFja2FnZXMgPSBbXTtcbiAgICAgICAgICAgICAgY29uc29sZS5sb2coZGF0YSk7XG4gICAgICAgICAgICAgIGRhdGEucmVzdWx0cy5mb3JFYWNoKGVsZW1lbnQgPT4ge1xuXG4gICAgICAgICAgICAgICAgcGFja2FnZXMucHVzaChlbGVtZW50LmRvYyk7XG4gICAgICAgICAgICAgICAgcmVzb2x2ZShwYWNrYWdlcyk7ICAgICAgICAgICAgICAgICBcbiAgICAgICAgICAgIH0pO1xuICAgICAgICB9KTtcbiAgICAgIH0pO1xuICBcbiAgfSAgIFxuICBcbiAgXG5cbiAgIC8vI3JlZ2lvbiBNYW5pZmVzdCBQYWNrYWdlIEZ1bmN0aW9ucyBcblxuICAgYWRkVG9GbGlnaHQoYWN0aW9uKXtcbiAgICByZXR1cm4gbmV3IFByb21pc2UoKHJlc29sdmUscmVqZWN0KT0+e1xuICAgICAgdmFyIHBhY2thZ2VObyA9IGdldFBhY2thZ2VJZEZyb21CYXJDb2RlKGFjdGlvbi5iYXJjb2RlKTsgXG4gICAgICB0aGlzLm15U2VhcmNoLnVwZGF0ZShwYWNrYWdlTm8se21pZDphY3Rpb24ubWlkICwgc3RhdHVzOiAyLCBsb2NhdGlvbjpcIkxvYWRlZCBvbiBBaXJDcmFmdFwifSwoZXJyLHJlc3VsdCk9PntcbiAgICAgICAgaWYoZXJyKVxuICAgICAgICAgIHJlc29sdmUoe2FkZGVkOmZhbHNlfSlcbiAgICAgICAgXG4gICAgICAgIHJlc29sdmUoe2FkZGVkOnRydWV9KVxuICAgICAgfSlcbiAgICAgICAgXG4gICAgfSlcbiAgIH1cbiAgIHJlbW92ZUZyb21GbGlnaHQoYWN0aW9uKXtcbiAgICByZXR1cm4gbmV3IFByb21pc2UoKHJlc29sdmUscmVqZWN0KT0+e1xuICAgICAgICB2YXIgcGFja2FnZU5vID0gZ2V0UGFja2FnZUlkRnJvbUJhckNvZGUoYWN0aW9uLmJhcmNvZGUpOyAgIFxuICAgICAgICB0aGlzLm15U2VhcmNoLnVwZGF0ZShwYWNrYWdlTm8se21pZDphY3Rpb24ubWlkfSwoZXJyLHJlc3VsdCk9PntcbiAgICAgICAgaWYoZXJyKVxuICAgICAgICAgICAgcmVzb2x2ZSh7cmVtb3ZlZDpmYWxzZX0pXG4gICAgICAgICAgXG4gICAgICAgICAgcmVzb2x2ZSh7cmVtb3ZlZDp0cnVlfSlcbiAgICAgICAgfSlcbiAgICB9KVxuICAgfVxuICAgcmVjRnJvbVRydWNrKHRyYWNraW5nTm8pe1xuICAgICByZXR1cm4gbmV3IFByb21pc2UoKHJlc29sdmUscmVqZWN0KT0+e1xuICAgICBcbiAgICAgICAgZGF0YUNvbnRleHQucmVkaXNDbGllbnQuc2V0KFJFQ19QS0crdHJhY2tpbmdObyxtb21lbnQoKS51bml4KCksIChlcnIscmVzdWx0KT0+e1xuICAgICAgICAgIGlmIChlcnIpIHJlc29sdmUoe3NhdmVkOmZhbHNlfSlcbiAgICAgICAgICByZXNvbHZlKHtzYXZlZDp0cnVlfSlcbiAgICAgICAgfSlcbiAgICAgfSlcbiAgIH1cblxuICAgcmVjRnJvbVBsYW5lTmFzKGJhcmNvZGUpe1xuICAgICByZXR1cm4gbmV3IFByb21pc2UoKHJlc29sdmUscmVqZWN0KT0+e1xuICAgICAgIHZhciBzcnYgPSB0aGlzIDsgXG4gICAgICAgdmFyIHBrZ0lkID0gZ2V0UGFja2FnZUlkRnJvbUJhckNvZGUoYmFyY29kZSk7IFxuICAgICAgICBzcnYubXlTZWFyY2guZ2V0RG9jKHBrZ0lkLChlcnIscGtnKT0+e1xuICAgICAgICAgICAgcGtnLmRvYy5zdGF0dXMgPSA0OyBcbiAgICAgICAgICAgIHBrZy5kb2MubG9jYXRpb24gID0gXCJXYXJlaG91c2UgTkFTXCI7IFxuICAgICAgICAgICAgc3J2Lm15U2VhcmNoLnVwZGF0ZShwa2dJZCxwa2cuZG9jLChlcnIsdXBkYXRlUmVzdWx0KT0+e1xuICAgICAgICAgICAgICBpZihlcnIpXG4gICAgICAgICAgICAgICAgcmVqZWN0KHt1cGRhdGVkOmZhbHNlfSlcbiAgICAgICAgICAgICAgcmVzb2x2ZSh7dXBkYXRlZDp0cnVlfSlcbiAgICAgICAgICAgIH0pXG4gICAgICAgIH0pXG4gICAgIH0pXG4gICB9XG4gICAvLyNlbmRyZWdpb25cbn1cblxuZnVuY3Rpb24gZ2V0UGFja2FnZUlkRnJvbUJhckNvZGUoYmFyQ29kZVZhbHVlKXtcbiAgdmFyIHBhcnRzID0gYmFyQ29kZVZhbHVlLnNwbGl0KFwiLVwiKTsgXG4gIGlmIChwYXJ0cy5sZW5ndGggPT0gMylcbiAgICBpZiAodHlwZW9mIHBhcnRzWzJdICE9IFwidW5kZWZpbmVkXCIpXG4gICAgcmV0dXJuIHBhcnRzWzJdLnRyaW0oKTsgXG4gIHJldHVybiBcIlwiXG59XG4iXX0=
