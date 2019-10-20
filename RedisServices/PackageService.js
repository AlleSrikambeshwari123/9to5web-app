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
      var _this6 = this;

      var srv = this;
      return new Promise(function (resolve, reject) {
        _this6.mySearch.getDoc(id, function (err, document) {
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
        console.log("@mid:[" + mid + " " + mid + "] @status=[" + status + " " + status + "]");
        _this8.mySearch.search("@mid:[" + mid + " " + mid + "] @status:[" + status + " " + status + "]", { offset: 0, numberOfResults: 5000 }, function (err, data) {
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
//# sourceMappingURL=data:application/json;charset=utf8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIlJlZGlzU2VydmljZXMvUGFja2FnZVNlcnZpY2UuZXM2Il0sIm5hbWVzIjpbInJlZGlzIiwicmVxdWlyZSIsImxyZWRpcyIsIm1vbWVudCIsInJlZGlzU2VhcmNoIiwiZnMiLCJQYWNrYWdlVXRpbCIsIlBhY2thZ2VVdGlsaXR5IiwicGFja2FnZVV0aWwiLCJQS0dfSURYIiwiUEtHX0lEX0NPVU5URVIiLCJkYXRhQ29udGV4dCIsIlBLR19QUkVGSVgiLCJBV0JfSUQiLCJJTkRFWF9BV0IiLCJSRUNfUEtHIiwiQ3VzdG9tZXJTZXJ2aWNlIiwiY3VzdG9tZXJTZXJ2aWNlIiwiUEtHX1NUQVRVUyIsImF3YkluZGV4IiwiY2xpZW50T3B0aW9ucyIsInNlYXJjaENsaWVudERldGFpbHMiLCJwYWNrYWdlSW5kZXgiLCJnZXRQYWNrYWdlVm9sdW1uZSIsIm1QYWNrYWdlIiwiY3JlYXRlRG9jdW1lbnQiLCJ0UGFja2FnZSIsInBhY2thZ2VEb2N1bWVudCIsImlkIiwidHJhY2tpbmdObyIsInNreWJveCIsImRhdGVSZWNpZXZlZCIsInVuaXgiLCJhd2IiLCJtaWQiLCJ2b2x1bWUiLCJ3ZWlnaHQiLCJwaWVjZXMiLCJjdXN0b21lciIsInNoaXBwZXIiLCJkZXNjcmlwdGlvbiIsImRpbWVuc2lvbnMiLCJjYXJyaWVyIiwic3RhdHVzIiwidmFsdWUiLCJjb25zb2xlIiwibG9nIiwic2V0UGFja2FnZUluVHJhbnNpdCIsImtleXMiLCJtc2VhcmNoZXIiLCJQcm9taXNlIiwicmVzb2x2ZSIsInJlamVjdCIsImJhdGNoZXIiLCJjbGllbnQiLCJiYXRjaCIsImZvckVhY2giLCJsb2NhdGlvbiIsImVsZW1lbnQiLCJobXNldCIsImV4ZWMiLCJlcnIiLCJyZXN1bHQiLCJhZGRQYWNrYWdlVG9JbmRleCIsImdldFBhY2thZ2UiLCJ0aGVuIiwiZGVsRG9jdW1lbnQiLCJwYWNrIiwiZG9uZSIsImRvY3VtZW50IiwiYWRkIiwiUGFja2FnZVNlcnZpY2UiLCJzZXR1cEluZGV4IiwibXlTZWFyY2giLCJyZWRpc0NsaWVudCIsImV4aXN0cyIsInNldCIsImluaXRSZXN1bHQiLCJpbmNyIiwibmV3SWQiLCJ0b1N0cmluZyIsInJlcGx5IiwiaW52b2ljZSIsImhhc0RvY3MiLCJkYXRlQ3JlYXRlZCIsImVycjEiLCJhd2JSZXMiLCJzYXZlZCIsInNlYXJjaCIsIm51bWJlck9mUmVzdWx0cyIsIm9mZnNldCIsInBhY2thZ2VzIiwidG90YWxSZXN1bHRzIiwicmVzdWx0cyIsInBhY2thZ2UxIiwiZG9jIiwiTnVtYmVyIiwiZGF0YSIsInNydiIsInBhY2thZ2VsaXN0IiwiY291bnQiLCJsZW5ndGgiLCJzdWJzdHJpbmciLCJwdXNoIiwic29ydEJ5IiwiYXdicyIsImF3Ykxpc3QiLCJhbGwiLCJtYXAiLCJnZXRDdXN0b21lciIsImN1c3RvbWVySWQiLCJnZXRBd2JPdmVydmlldyIsImN1c3RvbWVycyIsImkiLCJmb3JtYXQiLCJjb25zaWduZWUiLCJuYW1lIiwiZGV0YWlscyIsInBtYiIsImNhdGNoIiwiZ2V0RG9jIiwiZ2V0QXdiRGV0YWlscyIsInRyYWNraW5nTnVtYmVyIiwibG9jYXRpb25faWQiLCJwYWNrYWdlUmVzdWx0IiwibmV3UGFja2FnZSIsImJvZHkiLCJjUGFja2FnZSIsInJlcGxhY2UiLCJ0cmltIiwidHJhY2tpbmciLCJyZXNwb25zZSIsImluZGV4UGFja2FnZSIsImRvY1Jlc3VsdCIsInNlYXJjaGVyIiwiZHV0eVBlcmNlbnQiLCJoYXNPcHQiLCJwIiwiY3VycmVudENvbnRhaW5lciIsIm10eXBlIiwiY29udGFpbmVyIiwiYmFnIiwic3JlbSIsInNraWQiLCJtYW5pZmVzdEtleSIsImNvbnRhaW5lck5vIiwic2V0QWRkIiwic1Jlc3VsdCIsImdldE1lbWJlcnMiLCJyZGF0YSIsInNQYWNrYWdlIiwiZXJyMyIsImxpc3RpbmciLCJlcnIyIiwiZXJyMjMyIiwicGFnZSIsInBhZ2VTaXplIiwiZ2V0QXdiIiwiYXdiaW5mbyIsInBhY2thZ2UiLCJtc2VhcmNoIiwib2xkRG9jSWQiLCJkb2NJZCIsInVwZGF0ZWRQYWNrYWdlcyIsInBhY2thZ2VJZCIsIm1hbmlmZXN0IiwiZGVsIiwiZGVjciIsImdldEtleXMiLCJrZXlzQ291bnQiLCJrUmVzdWx0IiwiclJlc3VsdCIsImRlbGV0ZWQiLCJyZWRpU2VhcmNoIiwiYmluIiwicGtnIiwiYWN0aW9uIiwicGFja2FnZU5vIiwiZ2V0UGFja2FnZUlkRnJvbUJhckNvZGUiLCJiYXJjb2RlIiwidXBkYXRlIiwiYWRkZWQiLCJyZW1vdmVkIiwicGtnSWQiLCJ1cGRhdGVSZXN1bHQiLCJ1cGRhdGVkIiwiYmFyQ29kZVZhbHVlIiwicGFydHMiLCJzcGxpdCJdLCJtYXBwaW5ncyI6Ijs7Ozs7Ozs7O0FBQUE7O0FBQ0E7Ozs7OztBQUdBLElBQUlBLFFBQVFDLFFBQVEsT0FBUixDQUFaO0FBQ0EsSUFBSUMsU0FBU0QsUUFBUSxlQUFSLENBQWI7QUFDQSxJQUFJRSxTQUFTRixRQUFRLFFBQVIsQ0FBYjtBQUNBLElBQUlHLGNBQWNILFFBQVEscUJBQVIsQ0FBbEI7QUFDQSxJQUFJSSxLQUFLSixRQUFRLElBQVIsQ0FBVDtBQUNBLElBQUlFLFNBQVNGLFFBQVEsUUFBUixDQUFiO0FBQ0EsSUFBSUssY0FBY0wsUUFBUSxxQkFBUixFQUErQk0sY0FBakQ7QUFDQSxJQUFJQyxjQUFjLElBQUlGLFdBQUosRUFBbEI7QUFDQSxJQUFNRyxVQUFVLGdCQUFoQjtBQUNBLElBQU1DLGlCQUFpQixZQUF2QjtBQUNBLElBQUlDLGNBQWNWLFFBQVEsZUFBUixDQUFsQjtBQUNBLElBQU1XLGFBQWEsV0FBbkI7QUFDQSxJQUFNQyxTQUFTLFFBQWY7QUFDQSxJQUFNQyxZQUFZLFdBQWxCO0FBQ0EsSUFBTUMsVUFBVSxVQUFoQjtBQUNBLElBQUlDLGtCQUFrQmYsUUFBUSxtQkFBUixFQUE2QmUsZUFBbkQ7QUFDQSxJQUFJQyxrQkFBa0IsSUFBSUQsZUFBSixFQUF0QjtBQUNBLElBQU1FLGFBQWE7QUFDakIsS0FBSSxVQURhO0FBRWpCLEtBQUcsb0JBRmM7QUFHakIsS0FBRyxZQUhj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cEQsZ0JBQUczSCxHQUFILEVBQ0VULE9BQU8sRUFBQ3FJLFNBQVEsS0FBVCxFQUFQO0FBQ0Z0SSxvQkFBUSxFQUFDc0ksU0FBUSxJQUFULEVBQVI7QUFDRCxXQUpEO0FBS0gsU0FSRDtBQVNGLE9BWk0sQ0FBUDtBQWFEO0FBQ0Q7Ozs7Ozs7QUFHSCxTQUFTUCx1QkFBVCxDQUFpQ1EsWUFBakMsRUFBOEM7QUFDNUMsTUFBSUMsUUFBUUQsYUFBYUUsS0FBYixDQUFtQixHQUFuQixDQUFaO0FBQ0EsTUFBSUQsTUFBTXRGLE1BQU4sSUFBZ0IsQ0FBcEIsRUFDRSxJQUFJLE9BQU9zRixNQUFNLENBQU4sQ0FBUCxJQUFtQixXQUF2QixFQUNBLE9BQU9BLE1BQU0sQ0FBTixFQUFTMUQsSUFBVCxFQUFQO0FBQ0YsU0FBTyxFQUFQO0FBQ0QiLCJmaWxlIjoiUmVkaXNTZXJ2aWNlcy9QYWNrYWdlU2VydmljZS5qcyIsInNvdXJjZXNDb250ZW50IjpbImltcG9ydCB7IGNwdXMgfSBmcm9tIFwib3NcIjtcbmltcG9ydCB7IHByb21pc2VzIH0gZnJvbSBcImRuc1wiO1xuXG5cbnZhciByZWRpcyA9IHJlcXVpcmUoXCJyZWRpc1wiKTtcbnZhciBscmVkaXMgPSByZXF1aXJlKFwiLi9yZWRpcy1sb2NhbFwiKTtcbnZhciBtb21lbnQgPSByZXF1aXJlKFwibW9tZW50XCIpO1xudmFyIHJlZGlzU2VhcmNoID0gcmVxdWlyZShcIi4uL3JlZGlzZWFyY2hjbGllbnRcIik7XG52YXIgZnMgPSByZXF1aXJlKFwiZnNcIik7XG52YXIgbW9tZW50ID0gcmVxdWlyZSgnbW9tZW50JylcbnZhciBQYWNrYWdlVXRpbCA9IHJlcXVpcmUoXCIuLi9VdGlsL3BhY2thZ2V1dGlsXCIpLlBhY2thZ2VVdGlsaXR5O1xudmFyIHBhY2thZ2VVdGlsID0gbmV3IFBhY2thZ2VVdGlsKCk7XG5jb25zdCBQS0dfSURYID0gXCJpbmRleDpwYWNrYWdlc1wiO1xuY29uc3QgUEtHX0lEX0NPVU5URVIgPSBcInBhY2thZ2U6aWRcIjtcbnZhciBkYXRhQ29udGV4dCA9IHJlcXVpcmUoJy4vZGF0YUNvbnRleHQnKVxuY29uc3QgUEtHX1BSRUZJWCA9IFwicGFja2FnZXM6XCI7XG5jb25zdCBBV0JfSUQgPSBcImF3YjppZFwiXG5jb25zdCBJTkRFWF9BV0IgPSBcImluZGV4OmF3YlwiXG5jb25zdCBSRUNfUEtHID0gXCJwa2c6cmVjOlwiXG52YXIgQ3VzdG9tZXJTZXJ2aWNlID0gcmVxdWlyZSgnLi9DdXN0b21lclNlcnZpY2UnKS5DdXN0b21lclNlcnZpY2U7IFxudmFyIGN1c3RvbWVyU2VydmljZSA9IG5ldyBDdXN0b21lclNlcnZpY2UoKVxuY29uc3QgUEtHX1NUQVRVUyA9IHsgXG4gIDEgOiBcIlJlY2VpdmVkXCIsXG4gIDI6IFwiTG9hZGVkIG9uIEFpckNyYWZ0XCIsXG4gIDM6IFwiSW4gVHJhbnNpdFwiLFxuICA0OiBcIlJlY2lldmVkIGluIE5BU1wiLFxuICA1OiBcIlJlYWR5IGZvciBQaWNrdXAgLyBEZWxpdmVyeVwiLFxuICA2OiBcIkRlbGl2ZXJlZFwiXG5cbn07IFxuXG5jb25zdCBhd2JJbmRleCA9IHJlZGlzU2VhcmNoKHJlZGlzLCBJTkRFWF9BV0IsIHtcbiAgY2xpZW50T3B0aW9uczogbHJlZGlzLnNlYXJjaENsaWVudERldGFpbHNcbn0pO1xuY29uc3QgcGFja2FnZUluZGV4ID0gcmVkaXNTZWFyY2gocmVkaXMsIFBLR19JRFgsIHtcbiAgY2xpZW50T3B0aW9uczogbHJlZGlzLnNlYXJjaENsaWVudERldGFpbHNcbn0pO1xuZnVuY3Rpb24gZ2V0UGFja2FnZVZvbHVtbmUobVBhY2thZ2Upe1xuXG4gIHJldHVybiAwOyBcbn1cbmZ1bmN0aW9uIGNyZWF0ZURvY3VtZW50KHRQYWNrYWdlKSB7XG4gIHZhciBwYWNrYWdlRG9jdW1lbnQgPSB7XG4gICAgaWQ6dFBhY2thZ2UuaWQsXG4gICAgdHJhY2tpbmdObzogdFBhY2thZ2UudHJhY2tpbmdObyxcbiAgICBza3lib3g6IHRQYWNrYWdlLnNreWJveCxcbiAgICBkYXRlUmVjaWV2ZWQgOiBtb21lbnQoKS51bml4KCksIFxuICAgIGF3YjowLCBcbiAgICBtaWQ6MCxcbiAgICB2b2x1bWU6IGdldFBhY2thZ2VWb2x1bW5lKHRQYWNrYWdlKSxcbiAgICB3ZWlnaHQ6dFBhY2thZ2Uud2VpZ2h0LFxuICAgIHBpZWNlczp0UGFja2FnZS5waWVjZXMsXG4gICAgY3VzdG9tZXI6IHRQYWNrYWdlLmN1c3RvbWVyLFxuICAgIHNoaXBwZXI6IHRQYWNrYWdlLnNoaXBwZXIsXG4gICAgZGVzY3JpcHRpb246IHRQYWNrYWdlLmRlc2NyaXB0aW9uLFxuICAgIGRpbWVuc2lvbnM6dFBhY2thZ2UuZGltZW5zaW9ucyxcbiAgICBjYXJyaWVyOnRQYWNrYWdlLmNhcnJpZXIsXG4gICAgLy9za3lib3hWOiB0UGFja2FnZS5za3lib3gsIGFkZCBkaW1lbmlvbiBcbiAgICBzdGF0dXM6IHRQYWNrYWdlLnN0YXR1cyxcbiAgICBtaWQ6IHRQYWNrYWdlLm1pZCxcbiAgICB2YWx1ZTogdFBhY2thZ2UudmFsdWUsXG4gICAgXG4gIH07XG4gIGNvbnNvbGUubG9nKFwiYWJvdXQgdG8gYWRkIHRoZSBwYWNrYWdlIHRvIHRoZSBpbmRleFwiKTtcbiAgcmV0dXJuIHBhY2thZ2VEb2N1bWVudDtcbn1cbmZ1bmN0aW9uIHNldFBhY2thZ2VJblRyYW5zaXQoa2V5cywgbXNlYXJjaGVyKSB7XG4gIHJldHVybiBuZXcgUHJvbWlzZSgocmVzb2x2ZSwgcmVqZWN0KSA9PiB7XG4gICAgdmFyIGJhdGNoZXIgPSBtc2VhcmNoZXIuY2xpZW50LmJhdGNoKCk7XG4gICAga2V5cy5mb3JFYWNoKGVsZW1lbnQgPT4ge1xuICAgICAgdmFyIHZhbHVlID0ge1xuICAgICAgICBzdGF0dXM6IDIsXG4gICAgICAgIGxvY2F0aW9uOiBcIkluIFRyYW5zaXRcIlxuICAgICAgfTtcbiAgICAgIGNvbnNvbGUubG9nKGVsZW1lbnQgKyBcImlzIHRoZSBlbGVtZW50XCIpO1xuXG4gICAgICBiYXRjaGVyLmhtc2V0KFBLR19QUkVGSVggKyBlbGVtZW50LCB2YWx1ZSk7XG4gICAgfSk7XG4gICAgYmF0Y2hlci5leGVjKChlcnIsIHJlc3VsdCkgPT4ge1xuICAgICAgY29uc29sZS5sb2cocmVzdWx0KTtcbiAgICAgIC8vcmVhZGQgdGhlIGRvY3VtZW50cyBoZXJlXG4gICAgICBrZXlzLmZvckVhY2goZWxlbWVudCA9PiB7XG4gICAgICAgIGFkZFBhY2thZ2VUb0luZGV4KGVsZW1lbnQsIG1zZWFyY2hlcik7XG4gICAgICB9KTtcbiAgICAgIHJlc29sdmUocmVzdWx0KTtcbiAgICB9KTtcbiAgfSk7XG59XG5cbmZ1bmN0aW9uIGFkZFBhY2thZ2VUb0luZGV4KHRyYWNraW5nTm8sIG1zZWFyY2hlcikge1xuICBscmVkaXMuZ2V0UGFja2FnZSh0cmFja2luZ05vKS50aGVuKHBhY2sgPT4ge1xuICAgIG1zZWFyY2hlci5kZWxEb2N1bWVudChQS0dfSURYLCBgJHtwYWNrLm1pZH0tJHt0cmFja2luZ05vfWAsIChlcnIsIGRvbmUpID0+IHtcbiAgICAgIHZhciBkb2N1bWVudCA9IGNyZWF0ZURvY3VtZW50KHBhY2spO1xuICAgICAgY29uc29sZS5sb2coXCJyZWFkZGluZyBwYWNrYWdlIHRvIHRoZSBpbmRleCBsaWtlIGEgYm9zcyBcIiArIHRyYWNraW5nTm8pO1xuICAgICAgbXNlYXJjaGVyLmFkZChwYWNrLm1pZCArIFwiLVwiICsgcGFjay50cmFja2luZ05vLCBkb2N1bWVudCk7XG4gICAgfSk7XG4gIH0pO1xufVxuZXhwb3J0IGNsYXNzIFBhY2thZ2VTZXJ2aWNlIHtcbiAgY29uc3RydWN0b3IoKSB7XG4gICAgdGhpcy5zZXR1cEluZGV4KCk7XG4gIH1cbiAgc2V0dXBJbmRleCgpIHtcbiAgICB0aGlzLm15U2VhcmNoID0gcmVkaXNTZWFyY2gocmVkaXMsIFBLR19JRFgsIHtcbiAgICAgIGNsaWVudE9wdGlvbnM6IGxyZWRpcy5zZWFyY2hDbGllbnREZXRhaWxzXG4gICAgfSk7XG4gIH1cbiAgZ2V0TmV3QXdiKCl7XG4gICAgcmV0dXJuIG5ldyBQcm9taXNlKChyZXNvbHZlLHJlamVjdCk9PntcbiAgICAgIGRhdGFDb250ZXh0LnJlZGlzQ2xpZW50LmV4aXN0cyhBV0JfSUQsKGVycixyZXN1bHQpPT57XG4gICAgICAgIGNvbnNvbGUubG9nKHJlc3VsdCk7IFxuICAgICAgICBpZiAocmVzdWx0ICE9IFwiMVwiKXtcbiAgICAgICAgICBkYXRhQ29udGV4dC5yZWRpc0NsaWVudC5zZXQoQVdCX0lEID09IDEwMDAwMCwoZXJyLGluaXRSZXN1bHQpPT57XG4gICAgICAgICAgICBkYXRhQ29udGV4dC5yZWRpc0NsaWVudC5pbmNyKEFXQl9JRCwoZXJyLG5ld0lkKT0+e1xuICAgICAgICAgICAgICByZXNvbHZlKHthd2I6bmV3SWR9KVxuICAgICAgICAgICAgfSlcbiAgICAgICAgICB9KVxuICAgICAgICB9XG4gICAgICAgIGVsc2Uge1xuICAgICAgICAgIGRhdGFDb250ZXh0LnJlZGlzQ2xpZW50LmluY3IoQVdCX0lELChlcnIsbmV3SWQpPT57XG4gICAgICAgICAgICByZXNvbHZlKHthd2I6bmV3SWR9KVxuICAgICAgICAgIH0pXG4gICAgICAgIH1cbiAgICAgIH0pXG4gICAgfSk7XG4gIH1cbiAgc2F2ZUF3Yihhd2Ipe1xuICAgIHJldHVybiBuZXcgUHJvbWlzZSgocmVzb2x2ZSxyZWplY3QpPT57XG4gICAgICBjb25zb2xlLmxvZygnc2F2aW5nLi4uJyxhd2IsbW9tZW50KCkudG9TdHJpbmcoXCJoaDptbTpzc1wiKSlcbiAgICAgIGRhdGFDb250ZXh0LnJlZGlzQ2xpZW50LmluY3IoQVdCX0lELChlcnIscmVwbHkpPT57XG4gICAgICAgIGF3Yi5pZCA9IHJlcGx5OyBcbiAgICAgICAgYXdiLnN0YXR1cyA9IDE7IFxuICAgICAgICBpZiAoYXdiLmludm9pY2Upe1xuICAgICAgICAgIGF3Yi5oYXNEb2NzID0gMVxuICAgICAgICAgIGNvbnNvbGUubG9nKFwiSEFTIERPQ0NDQ0NcIilcbiAgICAgICAgfVxuICAgICAgICBlbHNlIHtcbiAgICAgICAgICBhd2IuaGFzRG9jcyA9IDAgOyBcbiAgICAgICAgICBjb25zb2xlLmxvZyhcIkhBUyBOTyBET0NDQ0NDXCIpXG4gICAgICAgIH1cbiAgICAgICAgXG4gICAgICAgIGF3Yi5kYXRlQ3JlYXRlZCA9IG1vbWVudCgpLnVuaXgoKTsgXG4gICAgICAgICAgYXdiSW5kZXguYWRkKGF3Yi5pZCxhd2IsKGVycjEsYXdiUmVzKT0+e1xuICAgICAgICAgICAgaWYgKGVycjEpe1xuICAgICAgICAgICAgICBjb25zb2xlLmxvZygnc2F2aW5nIGVycicsZXJyMSlcbiAgICAgICAgICAgICAgcmVzb2x2ZSh7c2F2ZWQ6ZmFsc2V9KVxuICAgICAgICAgICAgfVxuICAgICAgICAgICAgcmVzb2x2ZSh7c2F2ZWQ6dHJ1ZSwgaWQ6cmVwbHl9KVxuICAgICAgICAgIH0pXG4gICAgICB9KVxuICAgICAgIFxuICAgICAgXG4gICAgICBcbiAgICB9KVxuICB9XG4gIGdldEF3Yk92ZXJ2aWV3KGlkKXtcbiAgICAvLyBnZXQgdGhlIGF3YiBwYWNrYWdlcyBhbmQgYWRkIGV2ZXJ5dGhpbmcgaW4gXG4gICAgcmV0dXJuIG5ldyBQcm9taXNlKChyZXNvbHZlLHJlamVjdCk9PntcbiAgICAgIHBhY2thZ2VJbmRleC5zZWFyY2goYEBhd2I6WyR7aWR9ICR7aWR9XWAse251bWJlck9mUmVzdWx0czo1MDAwLG9mZnNldDowfSwoZXJyLHBhY2thZ2VzKT0+e1xuICAgICAgICB2YXIgd2VpZ2h0ID0gMCA7IFxuICAgICAgICB2YXIgcGllY2VzID0gcGFja2FnZXMudG90YWxSZXN1bHRzOyBcbiAgICAgICAgdmFyIGRlc2NyaXB0aW9uID0gXCJcIlxuICAgICAgICBwYWNrYWdlcy5yZXN1bHRzLmZvckVhY2gocGFja2FnZTEgPT4ge1xuICAgICAgICAgIGlmIChkZXNjcmlwdGlvbiA9PVwiXCIpXG4gICAgICAgICAgICBkZXNjcmlwdGlvbiA9IHBhY2thZ2UxLmRvYy5kZXNjcmlwdGlvbjsgXG4gICAgICAgICAgd2VpZ2h0ICs9IE51bWJlcihwYWNrYWdlMS5kb2Mud2VpZ2h0KVxuICAgICAgICB9KTtcbiAgICAgICAgdmFyIGRhdGEgID0ge3dlaWdodDp3ZWlnaHQsZGVzY3JpcHRpb246ZGVzY3JpcHRpb24scGllY2VzOnBpZWNlc31cbiAgICAgICAgY29uc29sZS5sb2coZGF0YSxcIkFXQiBERVRBSUxTXCIpOyBcbiAgICAgICAgcmVzb2x2ZSggZGF0YSlcbiAgICAgIH0pXG4gICAgfSlcbiAgIFxuICB9XG4gIGdldEF3YkRldGFpbHMoaWQpe1xuICAgIHZhciBzcnYgPSB0aGlzOyBcbiAgICByZXR1cm4gbmV3IFByb21pc2UoKHJlc29sdmUscmVqZWN0KT0+e1xuICAgICAgY29uc29sZS5sb2coYEBhd2I6WyR7aWR9ICR7aWR9XWApXG4gICAgIFxuICAgICAgcGFja2FnZUluZGV4LnNlYXJjaChgQGF3YjpbJHtpZH0gJHtpZH1dYCx7bnVtYmVyT2ZSZXN1bHRzOjUwMDAsb2Zmc2V0OjB9LChlcnIscGFja2FnZXMpPT57XG4gICAgICAgIGlmIChlcnIpXG4gICAgICAgICBjb25zb2xlLmxvZyhlcnIpXG4gICAgICBcbiAgICAgICAgdmFyICBwYWNrYWdlbGlzdCAgPSBbXVxuICAgICAgICB2YXIgY291bnQgPSAxOyBcbiAgICAgICAgcGFja2FnZXMucmVzdWx0cy5mb3JFYWNoKHBhY2thZ2UxID0+IHtcblxuICAgICAgICAgIGlmIChwYWNrYWdlMS5kb2MudHJhY2tpbmdOby5sZW5ndGggPiA3KXtcbiAgICAgICAgICAgIC8vb25seSBkaXNwbGF5IHRoZSBsYXN0IDcgXG4gICAgICAgICAgICBwYWNrYWdlMS5kb2MudHJhY2tpbmdObyA9IHBhY2thZ2UxLmRvYy50cmFja2luZ05vLnN1YnN0cmluZyhwYWNrYWdlMS5kb2MudHJhY2tpbmdOby5sZW5ndGggLTcpXG4gICAgICAgICAgICBcbiAgICAgICAgICB9XG4gICAgICAgICAgcGFja2FnZTEuZG9jLnBhY2thZ2VJbmRleCA9IGNvdW50O1xuICAgICAgICAgIGNvdW50ICsrOyBcbiAgICAgICAgICBwYWNrYWdlbGlzdC5wdXNoKCBwYWNrYWdlMS5kb2MpXG4gICAgICAgIH0pO1xuICAgICAgIFxuICAgICAgIFxuICAgICAgICByZXNvbHZlKCBwYWNrYWdlbGlzdClcbiAgICAgIH0pXG4gICAgfSlcbiAgfVxuICBsaXN0Tm9Eb2NzRmxsKCl7XG4gICAgcmV0dXJuIG5ldyBQcm9taXNlKChyZXNvbHZlLHJlamVjdCk9PntcbiAgICAgICBhd2JJbmRleC5zZWFyY2goXCJAc3RhdHVzOlsxIDFdIEBoYXNEb2NzOlswIDBdXCIse29mZnNldDowLG51bWJlck9mUmVzdWx0czo1MDAwLHNvcnRCeTonaWQnfSwoZXJyLGF3YnMpPT57XG4gICAgICAgICB2YXIgYXdiTGlzdCA9IFtdOyBcbiAgICAgICAgIFByb21pc2UuYWxsKGF3YnMucmVzdWx0cy5tYXAoYXdiPT5jdXN0b21lclNlcnZpY2UuZ2V0Q3VzdG9tZXIoYXdiLmRvYy5jdXN0b21lcklkKSkpLnRoZW4oY3VzdG9tZXJzPT57XG4gICAgICAgICAgIFByb21pc2UuYWxsKGF3YnMucmVzdWx0cy5tYXAoYXdiPT50aGlzLmdldEF3Yk92ZXJ2aWV3KGF3Yi5kb2MuaWQpKSkudGhlbihkZXRhaWxzPT57XG4gICAgICAgICAgICBjb25zb2xlLmxvZyhcImdvdCB0aGUgY3VzdG9tZXJzXCIsY3VzdG9tZXJzLCBhd2JzKVxuICAgICAgICAgICAgZm9yKHZhciBpID0wIDsgaSA8IGF3YnMucmVzdWx0cy5sZW5ndGggOyBpKysgKXtcbiAgICAgICAgICAgICAgdmFyIGF3YiA9IGF3YnMucmVzdWx0c1tpXTsgXG4gICAgICAgICAgICAgIGF3Yi5kb2MuZGF0ZUNyZWF0ZWQgPSBtb21lbnQudW5peChhd2IuZG9jLmRhdGVDcmVhdGVkKS5mb3JtYXQoXCJZWVlZLU1NLUREIGhoOm1tIEFcIilcbiAgICAgICAgICAgICAgLy93ZSBuZWVkIHRvIGdldCB0aGUgY3VzdG9tZXIgXG4gICAgICAgICAgICAgIGF3Yi5kb2MuY29uc2lnbmVlID0gY3VzdG9tZXJzW2ldLm5hbWU7IFxuICAgICAgICAgICAgICBhd2IuZG9jLndlaWdodCA9IGRldGFpbHNbaV0ud2VpZ2h0OyBcbiAgICAgICAgICAgICAgYXdiLmRvYy5wbWIgPSBjdXN0b21lcnNbaV0ucG1iOyBcbiAgICAgICAgICAgICAgYXdiLmRvYy5kZXNjcmlwdGlvbiA9IGRldGFpbHNbaV0uZGVzY3JpcHRpb247IFxuICAgICAgICAgICAgICBhd2IuZG9jLnBpZWNlcyA9IGRldGFpbHNbaV0ucGllY2VzOyBcbiAgICAgICAgICAgICAgaWYgKGN1c3RvbWVyc1tpXS5wbWIgPT0gJycpe1xuICAgICAgICAgICAgICAgIGF3Yi5kb2MucG1iID0gJzkwMDAnXG4gICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgY29uc29sZS5sb2coJ3B1c2hpbmcgJyxhd2IpXG4gICAgICAgICAgICAgIC8vd2UgbmVlZCB0byBnZXQgYWxsIHRoZSBwYWNrYWdlcyBcbiAgICAgICAgICAgICAgYXdiTGlzdC5wdXNoKGF3Yi5kb2MpXG4gICAgICAgICAgICAgfVxuICAgICAgICAgICAgIHJlc29sdmUoe2F3YnM6YXdiTGlzdH0pXG4gICAgICAgICAgIH0pXG4gICAgICAgICAgXG4gICAgICAgICAgfSkuY2F0Y2goZXJyPT57XG4gICAgICAgICAgICBjb25zb2xlLmxvZyhlcnIpOyBcbiAgICAgICAgICB9KVxuICAgICAgICAgXG4gICAgICAgIC8vICBhd2JzLnJlc3VsdHMuZm9yRWFjaChhd2IgPT4ge1xuICAgICAgICAgICBcbiAgICAgICAgICBcbiAgICAgICAgLy8gIH0pO1xuICAgICAgICAgXG4gICAgICAgfSlcbiAgICB9KVxuICB9XG5cbiAgbGlzdEF3YmluRmxsKCl7XG4gICAgcmV0dXJuIG5ldyBQcm9taXNlKChyZXNvbHZlLHJlamVjdCk9PntcbiAgICAgICBhd2JJbmRleC5zZWFyY2goXCJAc3RhdHVzOlsxIDFdIEBoYXNEb2NzOlsxIDFdXCIse29mZnNldDowLG51bWJlck9mUmVzdWx0czo1MDAwLHNvcnRCeTonaWQnfSwoZXJyLGF3YnMpPT57XG4gICAgICAgICB2YXIgYXdiTGlzdCA9IFtdOyBcbiAgICAgICAgIFByb21pc2UuYWxsKGF3YnMucmVzdWx0cy5tYXAoYXdiPT5jdXN0b21lclNlcnZpY2UuZ2V0Q3VzdG9tZXIoYXdiLmRvYy5jdXN0b21lcklkKSkpLnRoZW4oY3VzdG9tZXJzPT57XG4gICAgICAgICAgIFByb21pc2UuYWxsKGF3YnMucmVzdWx0cy5tYXAoYXdiPT50aGlzLmdldEF3Yk92ZXJ2aWV3KGF3Yi5kb2MuaWQpKSkudGhlbihkZXRhaWxzPT57XG4gICAgICAgICAgICBjb25zb2xlLmxvZyhcImdvdCB0aGUgY3VzdG9tZXJzXCIsY3VzdG9tZXJzLCBhd2JzKVxuICAgICAgICAgICAgZm9yKHZhciBpID0wIDsgaSA8IGF3YnMucmVzdWx0cy5sZW5ndGggOyBpKysgKXtcbiAgICAgICAgICAgICAgdmFyIGF3YiA9IGF3YnMucmVzdWx0c1tpXTsgXG4gICAgICAgICAgICAgIGF3Yi5kb2MuZGF0ZUNyZWF0ZWQgPSBtb21lbnQudW5peChhd2IuZG9jLmRhdGVDcmVhdGVkKS5mb3JtYXQoXCJZWVlZLU1NLUREIGhoOm1tIEFcIilcbiAgICAgICAgICAgICAgLy93ZSBuZWVkIHRvIGdldCB0aGUgY3VzdG9tZXIgXG4gICAgICAgICAgICAgIGF3Yi5kb2MuY29uc2lnbmVlID0gY3VzdG9tZXJzW2ldLm5hbWU7IFxuICAgICAgICAgICAgICBhd2IuZG9jLnBtYiA9IGN1c3RvbWVyc1tpXS5wbWI7IFxuICAgICAgICAgICAgICBhd2IuZG9jLndlaWdodCA9IGRldGFpbHNbaV0ud2VpZ2h0OyBcbiAgICAgICAgICAgICAgYXdiLmRvYy5kZXNjcmlwdGlvbiA9IGRldGFpbHNbaV0uZGVzY3JpcHRpb247IFxuICAgICAgICAgICAgICBhd2IuZG9jLnBpZWNlcyA9IGRldGFpbHNbaV0ucGllY2VzOyBcbiAgICAgICAgICAgICAgaWYgKGN1c3RvbWVyc1tpXS5wbWIgPT0gJycpe1xuICAgICAgICAgICAgICAgIGF3Yi5kb2MucG1iID0gJzkwMDAnXG4gICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgY29uc29sZS5sb2coJ3B1c2hpbmcgJyxhd2IpXG4gICAgICAgICAgICAgIC8vd2UgbmVlZCB0byBnZXQgYWxsIHRoZSBwYWNrYWdlcyBcbiAgICAgICAgICAgICAgYXdiTGlzdC5wdXNoKGF3Yi5kb2MpXG4gICAgICAgICAgICAgfVxuICAgICAgICAgICAgIHJlc29sdmUoe2F3YnM6YXdiTGlzdH0pXG4gICAgICAgICAgIH0pXG4gICAgICAgICAgXG4gICAgICAgICAgfSkuY2F0Y2goZXJyPT57XG4gICAgICAgICAgICBjb25zb2xlLmxvZyhlcnIpOyBcbiAgICAgICAgICB9KVxuICAgICAgICAgXG4gICAgICAgIC8vICBhd2JzLnJlc3VsdHMuZm9yRWFjaChhd2IgPT4ge1xuICAgICAgICAgICBcbiAgICAgICAgICBcbiAgICAgICAgLy8gIH0pO1xuICAgICAgICAgXG4gICAgICAgfSlcbiAgICB9KVxuICB9XG4gIGdldEF3YihpZCl7XG4gICAgY29uc3Qgc3J2ID0gdGhpczsgXG4gICAgcmV0dXJuIG5ldyBQcm9taXNlKChyZXNvbHZlLHJlamVjdCk9PntcbiAgICAgIGF3YkluZGV4LmdldERvYyhpZCwoZXJyLGF3Yik9PntcbiAgICAgICAgLy9nZXQgdGhlIGN1c3RvbWVyIFxuICAgICAgICBjdXN0b21lclNlcnZpY2UuZ2V0Q3VzdG9tZXIoYXdiLmRvYy5jdXN0b21lcklkKS50aGVuKGN1c3RvbWVyPT57XG4gICAgICAgICAgYXdiLmRvYy5jdXN0b21lciA9IGN1c3RvbWVyOyBcbiAgICAgICAgICBzcnYuZ2V0QXdiRGV0YWlscyhpZCkudGhlbihwYWNrYWdlcz0+e1xuICAgICAgICAgICAgLy9nZXQgdGhlIHBhY2thZ2VzIGZvciB0aGUgYXdiIFxuICAgICAgICAgICAgYXdiLmRvYy5wYWNrYWdlcyA9IHBhY2thZ2VzOyBcbiAgICAgICAgICAgIHJlc29sdmUoe2F3Yjphd2IuZG9jfSkgIFxuICAgICAgICAgIH0pXG4gICAgICAgICAgXG4gICAgICAgIH0pXG4gICAgICAgIFxuICAgICAgfSlcbiAgICB9KVxuICB9XG4gIHVwZGF0ZUxvY2F0aW9uKHRyYWNraW5nTnVtYmVyLGxvY2F0aW9uX2lkKXtcbiAgICByZXR1cm4gbmV3IFByb21pc2UoKHJlc29sdmUscmVqZWN0KT0+e1xuICAgICAgcGFja2FnZUluZGV4LnNlYXJjaChcIkB0cmFja2luZ05vOlwiK3RyYWNraW5nTnVtYmVyLHtsb2NhdGlvbjpsb2NhdGlvbl9pZH0sKGVycixwYWNrYWdlUmVzdWx0KT0+e1xuXG4gICAgICB9KVxuICAgIH0pXG4gIH1cbiAgc2F2ZVBhY2thZ2VUb0F3YihuZXdQYWNrYWdlKXtcbiAgICByZXR1cm4gbmV3IFByb21pc2UoKHJlc29sdmUscmVzdWx0KT0+e1xuICAgICAgZGF0YUNvbnRleHQucmVkaXNDbGllbnQuaW5jcihQS0dfSURfQ09VTlRFUiwoZXJyLGlkKT0+e1xuICAgICAgICBuZXdQYWNrYWdlLmlkID0gaWQ7IFxuICAgICAgICBwYWNrYWdlSW5kZXguYWRkKGlkLG5ld1BhY2thZ2UsKGVycixyZXN1bHQpPT57XG4gICAgICAgICAgaWYgKGVycilcbiAgICAgICAgICAgIGNvbnNvbGUubG9nKGVycik7IFxuICAgICAgICAgIHJlc29sdmUoe3NhdmVkOnRydWUsaWQ6aWR9KVxuICAgICAgICB9KVxuICAgICAgfSlcbiAgICB9KVxuICB9XG4gIHNhdmVQYWNrYWdlKGJvZHkpe1xuICAgIHJldHVybiBuZXcgUHJvbWlzZSgocmVzb2x2ZSxyZWplY3QpPT57XG4gICAgICB2YXIgY1BhY2thZ2UgPSB7XG4gICAgICAgIFxuICAgICAgICBza3lib3g6IGJvZHkuc2t5Ym94LFxuICAgICAgICBjdXN0b21lcjogYm9keS5jdXN0b21lci5yZXBsYWNlKFwiLVwiLCBcIlwiKS50cmltKCksXG4gICAgICAgIHRyYWNraW5nTm86IGJvZHkudHJhY2tpbmcsXG4gICAgICAgIGRlc2NyaXB0aW9uOiBib2R5LmRlc2NyaXB0aW9uLFxuICAgICAgICBzaGlwcGVyOiBib2R5LnNoaXBwZXIsXG4gICAgICAgIGNhcnJpZXI6Ym9keS5jYXJyaWVyLFxuICAgICAgICB2YWx1ZTogTnVtYmVyKGJvZHkudmFsdWUpLFxuICAgICAgICBwaWVjZXM6IE51bWJlcihib2R5LnBpZWNlcyksXG4gICAgICAgIHdlaWdodDogTnVtYmVyKGJvZHkud2VpZ2h0KSxcbiAgICAgICAgZGltZW5zaW9uczogYm9keS5kaW1lbnNpb25zLFxuICAgICAgICBzdGF0dXM6IDEsXG4gICAgICAgIGxvY2F0aW9uOiBcIkZMTFwiLFxuICAgICAgICBtaWQ6IDAsXG4gICAgICAgIGF3YjowLFxuICAgICAgICAvL2hhc09wdDogdHJ1ZSxcbiAgICAgICAgLy9tdHlwZTogYm9keS5tdHlwZVxuICAgICAgfTtcbiAgICAgIC8vdmFsaWRhdGUgdGhlIHBhY2thZ2UgXG4gICAgICBkYXRhQ29udGV4dC5yZWRpc0NsaWVudC5pbmNyKFBLR19JRF9DT1VOVEVSLChlcnIsaWQpPT57XG4gICAgICAgIGNQYWNrYWdlLmlkID0gaWQ7IFxuICAgICAgICBkYXRhQ29udGV4dC5yZWRpc0NsaWVudC5zZXQoUEtHX1BSRUZJWCtpZCxjUGFja2FnZSwoZXJyLHJlc3BvbnNlKT0+e1xuICAgICAgICAgIGlmIChlcnIpe1xuICAgICAgICAgICAgcmVqZWN0KHtzYXZlZDpmYWxzZSxlcnI6ZXJyfSlcbiAgICAgICAgICB9XG4gICAgICAgICAgIHZhciBpbmRleFBhY2thZ2UgPSAgY3JlYXRlRG9jdW1lbnQoY1BhY2thZ2UpOyBcbiAgICAgICAgICAgY29uc29sZS5sb2coaW5kZXhQYWNrYWdlKTsgXG4gICAgICAgICAgIHBhY2thZ2VJbmRleC5hZGQoY1BhY2thZ2UuaWQsaW5kZXhQYWNrYWdlLChlcnIxLGRvY1Jlc3VsdCk9PntcbiAgICAgICAgICAgICBjb25zb2xlLmxvZyhkb2NSZXN1bHQpOyBcbiAgICAgICAgICAgICBpZihlcnIxKXtcbiAgICAgICAgICAgICAgIHJlamVjdCh7c2F2ZWQ6ZmFsc2UsZXJyOmVycjF9KVxuICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICByZXNvbHZlKHtzYXZlZDp0cnVlfSlcbiAgICAgICAgICAgfSlcblxuICAgICAgICB9KVxuICAgICAgfSk7XG4gICAgXG5cblxuICAgIH0pXG4gIH1cbiAgc2F2ZVBhY2thZ2VPbGQoYm9keSkge1xuICAgIFxuICAgIHZhciBzZWFyY2hlciA9IHRoaXMubXlTZWFyY2g7IFxuICAgIHJldHVybiBuZXcgUHJvbWlzZSgocmVzb2x2ZSwgcmVqZWN0KSA9PiB7XG4gICAgICB2YXIgY1BhY2thZ2UgPSB7XG4gICAgICAgIHNreWJveDogYm9keS5za3lib3gsXG4gICAgICAgIGN1c3RvbWVyOiBib2R5LmN1c3RvbWVyLnJlcGxhY2UoXCItXCIsIFwiXCIpLnRyaW0oKSxcbiAgICAgICAgdHJhY2tpbmdObzogYm9keS50cmFja2luZyxcbiAgICAgICAgZHV0eVBlcmNlbnQ6IDAuMixcbiAgICAgICAgZGVzY3JpcHRpb246IGJvZHkuZGVzY3JpcHRpb24sXG4gICAgICAgIHNoaXBwZXI6IGJvZHkuc2hpcHBlcixcbiAgICAgICAgdmFsdWU6IE51bWJlcihib2R5LnZhbHVlKSxcbiAgICAgICAgcGllY2VzOiBOdW1iZXIoYm9keS5waWVjZXMpLFxuICAgICAgICB3ZWlnaHQ6IE51bWJlcihib2R5LndlaWdodCksXG4gICAgICAgIHN0YXR1czogMSxcbiAgICAgICAgbG9jYXRpb246IFwiRkxMXCIsXG4gICAgICAgIG1pZDogYm9keS5taWQsXG4gICAgICAgIGhhc09wdDogdHJ1ZSxcbiAgICAgICAgLy9tdHlwZTogYm9keS5tdHlwZVxuICAgICAgfTtcbiAgICAgIGNvbnNvbGUubG9nKFwiYWJvdXQgdG8gc2F2ZSB0aGUgcGFja2FnZVwiKTtcbiAgICAgIGlmICh0eXBlb2YgY1BhY2thZ2Uuc2hpcHBlciA9PT0gXCJ1bmRlZmluZWRcIikgY1BhY2thZ2Uuc2hpcHBlciA9IFwiXCI7XG4gICAgICBpZiAodHlwZW9mIGNQYWNrYWdlLmRlc2NyaXB0aW9uID09PSBcInVuZGVmaW5lZFwiKVxuICAgICAgICBjUGFja2FnZS5kZXNjcmlwdGlvbiA9IFwiXCI7XG4gICAgICBjb25zb2xlLmxvZyhib2R5KTtcbiAgICAgIC8vIGlmIChOdW1iZXIoYm9keS5pc0J1c2luZXNzKSA9PSAxKSB7XG4gICAgICAvLyAgIGNQYWNrYWdlLmhhc09wdCA9IGZhbHNlO1xuICAgICAgLy8gfVxuICAgICAgLy9jUGFja2FnZSA9IHBhY2thZ2VVdGlsLmNhbGN1bGF0ZUZlZXMoY1BhY2thZ2UpO1xuICAgICAgY29uc29sZS5sb2coXCJwYWNrYWdlIHdpdGggZmVlc1wiKTtcblxuICAgICAgLy93ZSBhbHNvIHdhbnQgdG8gY2FsY3VsYXRlIHRoZSB0aGUgcGFja2FnZSBmZWVzIG9uZSB0aW1lLi4uLi4uXG4gICAgICAvL3dlIGhhdmUgdGhlIHBhY2thZ2UgZGV0YWlscyBoZXJlIC4uIG5vdyB3ZSBuZWVkIHRvIGdldCB0aGUgZXhpc3RpbmcgcGFja2FnZVxuXG4gICAgIFxuICAgICAgLy93ZSBuZWVkIHRvIGNoZWNrIHRvIHNlZSBvZiB0aGUgb3duZXIgaXMgYSBidXNpbmVzcyBoZXJlXG4gICAgICBjb25zb2xlLmxvZyhcImhlcmUgYWJvdXQgdG8gZ2V0IHRoZSBwYWNrYWdlXCIpXG4gICAgICBscmVkaXMuZ2V0UGFja2FnZShjUGFja2FnZS50cmFja2luZ05vKS50aGVuKHAgPT4ge1xuICAgICAgICBjb25zb2xlLmxvZygncCBpcyB0aGUgJyxwKTsgXG4gICAgICAgIGlmIChwKSB7XG4gICAgICAgICAgdmFyIGN1cnJlbnRDb250YWluZXIgPSBgbWFuaWZlc3Q6JHtwLm1pZH06JHtwLm10eXBlfToke2NvbnRhaW5lcn06YDtcbiAgICAgICAgICBjb25zb2xlLmxvZyhcImZvdW5kIHBhY2thZ2UgXCIpO1xuICAgICAgICAgIGNvbnNvbGUubG9nKHApO1xuICAgICAgICAgIGlmIChjb250YWluZXIgPT0gXCJiYWdcIikge1xuICAgICAgICAgICAgLy9jaGVjayB0byBzZWUgaWYgdGhlIGJhY2sgbm8gaXMgdGhlIHNhbWUuXG4gICAgICAgICAgICBpZiAocC5iYWcgIT0gY1BhY2thZ2UuYmFnKSB7XG4gICAgICAgICAgICAgIC8vcmVtb3ZlIGl0IGZyb20gdGhlIG9yaWdpbmFsIGxpc3RcbiAgICAgICAgICAgICAgbHJlZGlzLnNyZW0oY3VycmVudENvbnRhaW5lciArIHAuYmFnLCBwLnRyYWNraW5nTm8pO1xuICAgICAgICAgICAgICBjb25zb2xlLmxvZyhcbiAgICAgICAgICAgICAgICBcInJlbW92ZSBwYWNrYWdlIGZyb20gY3VycmVudCBzZXQgXCIgKyBjdXJyZW50Q29udGFpbmVyXG4gICAgICAgICAgICAgICk7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgIC8vY2hlY2sgdG8gc2VlIGlmIHRoZSBza2lkIG51bWJlciBpcyB0aGUgc2FtZS5cbiAgICAgICAgICAgIGlmIChwLnNraWQgIT0gY1BhY2thZ2Uuc2tpZCkge1xuICAgICAgICAgICAgICAvL3JlbW92ZSBpdCBmcm9tIHRoZSBvcmlnaW5hbCBsaXN0XG4gICAgICAgICAgICAgIGxyZWRpcy5zcmVtKGN1cnJlbnRDb250YWluZXIgKyBwLnNraWQsIHAudHJhY2tpbmdObyk7XG4gICAgICAgICAgICAgIGNvbnNvbGUubG9nKFxuICAgICAgICAgICAgICAgIFwicmVtb3ZlIHBhY2thZ2UgZnJvbSBjdXJyZW50IHNldCBcIiArIGN1cnJlbnRDb250YWluZXJcbiAgICAgICAgICAgICAgKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICB9XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgLy8gdGhlIHBhY2thZ2UgZG9lc24ndCBleGlzdCB1cGRhdGUgdGhlIGNvdW50ZXJcbiAgICAgICAgICBscmVkaXMuY2xpZW50LmluY3IoXCJtY291bnRlcjpcIiArIGNQYWNrYWdlLm1pZCk7XG4gICAgICAgICAgXG4gICAgICAgIH1cblxuICAgICAgICBscmVkaXNcbiAgICAgICAgICAuaG1zZXQoXCJwYWNrYWdlczpcIiArIGNQYWNrYWdlLnRyYWNraW5nTm8sIGNQYWNrYWdlKVxuICAgICAgICAgIC50aGVuKGZ1bmN0aW9uKHJlc3VsdCkge1xuICAgICAgICAgICAgLy9hZGQgdG8gcXVldWUgZm9yIHBlcnNpc3RlbnQgcHJvY2Vzc2luZ1xuICAgICAgICAgICAgXG4gICAgICAgICAgICB2YXIgbWFuaWZlc3RLZXkgPSBgbWFuaWZlc3Q6JHtjUGFja2FnZS5taWR9OiR7XG4gICAgICAgICAgICAgIGNQYWNrYWdlLm10eXBlXG4gICAgICAgICAgICB9OiR7Y29udGFpbmVyfToke2NvbnRhaW5lck5vfWA7XG4gICAgICAgICAgICBjb25zb2xlLmxvZyhcImFib3V0IHRvIGNyZWF0ZSB0aGUgZG9jdW1lbnQuLi4uXCIpO1xuICAgICAgICAgICAgYWRkUGFja2FnZVRvSW5kZXgoY1BhY2thZ2UudHJhY2tpbmdObyxzZWFyY2hlcik7IFxuICAgICAgICAgICAgY29uc29sZS5sb2coXCJhZGRlZCB0aGUgcGFja2FnZSB0byBpbmRleFwiKTtcbiAgICAgICAgICAgIGxyZWRpc1xuICAgICAgICAgICAgICAuc2V0QWRkKG1hbmlmZXN0S2V5LCBjUGFja2FnZS50cmFja2luZ05vKVxuICAgICAgICAgICAgICAudGhlbihmdW5jdGlvbihzUmVzdWx0KSB7XG4gICAgICAgICAgICAgICAgLy9nZXQgdGhlIG1lbWJlcnMgb25lIHRpbWUgaGVyZVxuICAgICAgICAgICAgICAgIGNvbnNvbGUubG9nKFwiYWRkZWQgdGhlIHBhY2thZ2UgdG8gdGhlIHNldFwiKTtcbiAgICAgICAgICAgICAgICBjb25zb2xlLmxvZyhtYW5pZmVzdEtleSk7XG4gICAgICAgICAgICAgICAgbHJlZGlzXG4gICAgICAgICAgICAgICAgICAuZ2V0TWVtYmVycyhtYW5pZmVzdEtleSlcbiAgICAgICAgICAgICAgICAgIC50aGVuKGRhdGEgPT4ge1xuICAgICAgICAgICAgICAgICAgICBjb25zb2xlLmxvZyhcImRhdGFcIik7XG4gICAgICAgICAgICAgICAgICAgIGNvbnNvbGUubG9nKGRhdGEpO1xuICAgICAgICAgICAgICAgICAgICBQcm9taXNlLmFsbChkYXRhLm1hcChscmVkaXMuZ2V0UGFja2FnZSkpO1xuICAgICAgICAgICAgICAgICAgfSlcbiAgICAgICAgICAgICAgICAgIC50aGVuKGZ1bmN0aW9uKHJkYXRhKSB7XG4gICAgICAgICAgICAgICAgICAgIC8vd2UgbmVlZCB0byBhbGVydCB0aGUgcGVyc29uIHRoYXQgdGhlIHBhY2thZ2UgaXMgaGVyZSBzbyByZWFkIGVtYWlsIGV0Yy5cbiAgICAgICAgICAgICAgICAgICAgLy9hZGQgdG8gdGhlIGluZGV4XG4gICAgICAgICAgICAgICAgICAgIGNvbnNvbGUubG9nKFwiZGF0YVwiKTtcbiAgICAgICAgICAgICAgICAgICAgY29uc29sZS5sb2cocmRhdGEpO1xuXG4gICAgICAgICAgICAgICAgICAgIHJlc29sdmUoe1xuICAgICAgICAgICAgICAgICAgICAgIHNhdmVkOiB0cnVlLFxuICAgICAgICAgICAgICAgICAgICAgIHBhY2thZ2VzOiByZGF0YSxcbiAgICAgICAgICAgICAgICAgICAgICBzUGFja2FnZTogY1BhY2thZ2VcbiAgICAgICAgICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICAgICAgICB9KVxuICAgICAgICAgICAgICAgICAgLmNhdGNoKGVycjMgPT4ge1xuICAgICAgICAgICAgICAgICAgICBjb25zb2xlLmxvZyhlcnIzKTtcbiAgICAgICAgICAgICAgICAgICAgcmVqZWN0KHtcbiAgICAgICAgICAgICAgICAgICAgICBlcnI6IGVycjMsXG4gICAgICAgICAgICAgICAgICAgICAgc2F2ZWQ6IHRydWUsXG4gICAgICAgICAgICAgICAgICAgICAgbGlzdGluZzogZmFsc2VcbiAgICAgICAgICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICAgICAgICB9KTtcbiAgICAgICAgICAgICAgfSlcbiAgICAgICAgICAgICAgLmNhdGNoKGZ1bmN0aW9uKGVycikge1xuICAgICAgICAgICAgICAgIHJlc29sdmUoe1xuICAgICAgICAgICAgICAgICAgc2F2ZWQ6IGZhbHNlXG4gICAgICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICAgIH0pO1xuICAgICAgICAgIH0pXG4gICAgICAgICAgLmNhdGNoKGZ1bmN0aW9uKGVycjIpIHtcbiAgICAgICAgICAgIHJlamVjdCh7XG4gICAgICAgICAgICAgIHNhdmVkOiBmYWxzZVxuICAgICAgICAgICAgfSk7XG4gICAgICAgICAgfSk7XG5cbiAgICAgICAgLy9zYXZlIHRoZSBwYWNrYWdlIHRvIHRoZSBwYWNrYWdlIE5TXG4gICAgICB9KS5jYXRjaChlcnIyMzI9PntcbiAgICAgICAgY29uc29sZS5sb2coZXJyMjMyKVxuICAgICAgfSk7XG4gICAgfSk7XG4gIH0gXG4gIGdldE1hbmlmZXN0UGFja2FnZXMoKXtcbiAgICByZXR1cm4gbmV3IFByb21pc2UoKHJlc29sdmUscmVqZWN0KT0+e1xuICAgICAgXG4gICAgICB0aGlzLm15U2VhcmNoLnNlYXJjaChcbiAgICAgICAgYEBtaWQ6WzAgMF1gLFxuICAgICAgICB7IG9mZnNldDogMCwgbnVtYmVyT2ZSZXN1bHRzOiA1MDAwIH0sXG4gICAgICAgIChlcnIsIGRhdGEpID0+IHtcbiAgICAgICAgICB2YXIgcGFja2FnZXMgPSBbXTtcbiAgICAgICAgICBjb25zb2xlLmxvZyhkYXRhKTtcbiAgICAgICAgICBkYXRhLnJlc3VsdHMuZm9yRWFjaChlbGVtZW50ID0+IHtcblxuICAgICAgICAgICAgcGFja2FnZXMucHVzaChlbGVtZW50LmRvYyk7XG4gICAgICAgICAgICByZXNvbHZlKHBhY2thZ2VzKTsgICAgICAgICAgICAgICAgIFxuICAgICAgICB9KTtcbiAgICB9KTtcbiAgICB9KVxuICB9XG4gIGdldFJlY2VpdmVkUGFja2FnZXMocGFnZSxwYWdlU2l6ZSl7XG4gICAgcmV0dXJuIG5ldyBQcm9taXNlKChyZXNvbHZlLHJlamVjdCk9PntcbiAgICAgIFxuICAgICAgdGhpcy5teVNlYXJjaC5zZWFyY2goXG4gICAgICAgIGBAbWlkOlswIDBdYCxcbiAgICAgICAgeyBvZmZzZXQ6IDAsIG51bWJlck9mUmVzdWx0czogNTAwMCB9LFxuICAgICAgICAoZXJyLCBkYXRhKSA9PiB7XG4gICAgICAgICAgdmFyIHBhY2thZ2VzID0gW107XG4gICAgICAgICAgY29uc29sZS5sb2coZGF0YSk7XG4gICAgICAgICAgZGF0YS5yZXN1bHRzLmZvckVhY2goZWxlbWVudCA9PiB7XG5cbiAgICAgICAgICAgIHBhY2thZ2VzLnB1c2goZWxlbWVudC5kb2MpO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIFxuICAgICAgICB9KTtcbiAgICAgICAgcmVzb2x2ZShwYWNrYWdlcyk7IFxuICAgIH0pO1xuICAgIH0pXG4gIH1cbiAgZ2V0Tm9Eb2NzUGFja2Fja2FnZXMocGFnZSxwYWdlU2l6ZSl7XG4gICAgcmV0dXJuIG5ldyBQcm9taXNlKChyZXNvbHZlLHJlamVjdCk9PntcbiAgICAgIFxuICAgICAgdGhpcy5teVNlYXJjaC5zZWFyY2goXG4gICAgICAgIGBAaGFzRG9jczpbMCAwXWAsXG4gICAgICAgIHsgb2Zmc2V0OiAwLCBudW1iZXJPZlJlc3VsdHM6IDUwMDAgfSxcbiAgICAgICAgKGVyciwgZGF0YSkgPT4ge1xuICAgICAgICAgIHZhciBwYWNrYWdlcyA9IFtdO1xuICAgICAgICAgIGNvbnNvbGUubG9nKGRhdGEpO1xuICAgICAgICAgIGRhdGEucmVzdWx0cy5mb3JFYWNoKGVsZW1lbnQgPT4ge1xuXG4gICAgICAgICAgICBwYWNrYWdlcy5wdXNoKGVsZW1lbnQuZG9jKTtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBcbiAgICAgICAgfSk7XG4gICAgICAgIHJlc29sdmUocGFja2FnZXMpOyBcbiAgICB9KTtcbiAgICB9KVxuICB9XG4gIGdldFBhY2thZ2VCeUlkKGlkKXtcbiAgICB2YXIgc3J2ID0gdGhpczsgXG4gICAgcmV0dXJuIG5ldyBQcm9taXNlKChyZXNvbHZlLHJlamVjdCk9PntcbiAgICAgIHRoaXMubXlTZWFyY2guZ2V0RG9jKGlkLChlcnIsZG9jdW1lbnQpPT57XG4gICAgICAgIC8vZ2V0IHRoZSBhd2IgaW5mbyBoZXJlIGFzIHdlbGwgXG4gICAgICAgIHNydi5nZXRBd2IoZG9jdW1lbnQuZG9jLmF3YikudGhlbihhd2JpbmZvPT57XG4gICAgICAgICAgY29uc29sZS5sb2coYXdiaW5mbyk7IFxuICAgICAgICAgIHZhciByZXNwb25zZSA9IHsgXG4gICAgICAgICAgICBhd2IgOiBhd2JpbmZvLmF3YixcbiAgICAgICAgICAgIHBhY2thZ2UgOiBkb2N1bWVudC5kb2NcbiAgICAgICAgICB9XG4gICAgICAgICAgcmVzb2x2ZShyZXNwb25zZSk7IFxuICAgICAgICB9KTsgXG4gICAgICAgIFxuICAgICAgfSlcbiAgICB9KTsgXG4gIH1cbiAgLy91c2luZyB0aGlzIFxuICBcblxuICB1cGRhdGVNYW5pZmVzdFBhY2thZ2VUb0luVHJhbnNpdChtaWQpIHtcbiAgICAvL2dldCBhbGwgdGhlIHBhY2thZ2VzXG4gICAgLy93ZSBuZWVkIHRvIHVwZGF0ZSB0aGUgaW5kZXggYXQgdGhpcyBwb2ludCBhcyB3ZWxsXG4gICAgdmFyIG1zZWFyY2ggPSB0aGlzLm15U2VhcmNoO1xuICAgIHRoaXMubXlTZWFyY2guc2VhcmNoKFxuICAgICAgYEBtaWQ6WyR7bWlkfSAke21pZH1dYCxcbiAgICAgIHsgb2Zmc2V0OiAwLCBudW1iZXJPZlJlc3VsdHM6IDUwMDAgfSxcbiAgICAgIChlcnIsIGRhdGEpID0+IHtcbiAgICAgICAgdmFyIHBhY2thZ2VzID0gW107XG4gICAgICAgIGNvbnNvbGUubG9nKGRhdGEpO1xuICAgICAgICBkYXRhLnJlc3VsdHMuZm9yRWFjaChlbGVtZW50ID0+IHtcbiAgICAgICAgICB2YXIgb2xkRG9jSWQgPSBlbGVtZW50LmRvY0lkO1xuICAgICAgICAgIGVsZW1lbnQuZG9jSWQgPSBlbGVtZW50LmRvY0lkLnJlcGxhY2UoYCR7bWlkfS1gLCBcIlwiKTtcbiAgICAgICAgICBwYWNrYWdlcy5wdXNoKGVsZW1lbnQuZG9jSWQpO1xuICAgICAgICAgIC8vIGkgY291bGQgZGVsZXRlIGhlcmVcbiAgICAgICAgICAvLyBtc2VhcmNoLmRlbERvY3VtZW50KFBLR19JRFgsb2xkRG9jSWQpXG4gICAgICAgICAgLy91cGRhdGUgYWxsIHRoZSBwYWNrYWdlc1xuICAgICAgICB9KTtcbiAgICAgICAgc2V0UGFja2FnZUluVHJhbnNpdChwYWNrYWdlcywgbXNlYXJjaCwgbWlkKS50aGVuKGZ1bmN0aW9uKFxuICAgICAgICAgIHVwZGF0ZWRQYWNrYWdlc1xuICAgICAgICApIHtcbiAgICAgICAgICBjb25zb2xlLmxvZyhcInVwZGF0ZWQgcGFja2FnZXNcIik7XG4gICAgICAgICAgY29uc29sZS5sb2codXBkYXRlZFBhY2thZ2VzKTtcbiAgICAgICAgfSk7XG4gICAgICB9XG4gICAgKTtcbiAgfVxuICByZW1vdmVQYWNrYWdlRnJvbU1hbmlmZXN0KHBhY2thZ2VJZCwgbWlkKSB7XG4gICAgdmFyIG1zZWFyY2ggPSB0aGlzLm15U2VhcmNoO1xuICAgIHJldHVybiBuZXcgUHJvbWlzZSgocmVzb2x2ZSwgcmVqZWN0KSA9PiB7XG4gICAgICB2YXIgbWFuaWZlc3QgPSBtaWQ7XG4gICAgICB2YXIgbWFuaWZlc3RLZXkgPSBcIm1hbmlmZXN0OlwiICsgbWFuaWZlc3QgKyBcIjoqXCI7XG5cbiAgICAgIGxyZWRpcy5kZWwoXCJwYWNrYWdlczpcIiArIHRyYWNraW5nTm8pLnRoZW4oZnVuY3Rpb24ocmVzdWx0KSB7XG4gICAgICAgIGNvbnNvbGUubG9nKHJlc3VsdCk7XG4gICAgICAgIG1zZWFyY2guZGVsRG9jdW1lbnQoUEtHX0lEWCwgYCR7bWlkfS0ke3RyYWNraW5nTm99YCk7XG4gICAgICAgIC8vd2UgbmVlZCB0byByZW1vdmUgZnJvbSB0aGUgaW5kZXggYW5kIGRlYyB0aGUgY291bnRlclxuICAgICAgICBscmVkaXMuY2xpZW50LmRlY3IoXCJtY291bnRlcjpcIiArIG1pZCk7XG4gICAgICAgIC8vclNlcnZpY2VzLnBhY2thZ2VTZXJ2aWNlLnJtUGFja2FnZShtaWQsIHRyYWNraW5nTm8pO1xuICAgICAgICBscmVkaXMuZ2V0S2V5cyhtYW5pZmVzdEtleSkudGhlbihrUmVzdWx0ID0+IHtcbiAgICAgICAgICAvL3RoZSBsaXN0IG9mIGFsbCB0aGUgc2V0cyAuLi53ZSBuZWVkIHRvIHJlbW92ZSB0aGUga2V5IGZyb20gZWFjaCBvbmVcbiAgICAgICAgICB2YXIga2V5c0NvdW50ID0gMDtcblxuICAgICAgICAgIGtSZXN1bHQuZm9yRWFjaChlbGVtZW50ID0+IHtcbiAgICAgICAgICAgIGNvbnNvbGUubG9nKFxuICAgICAgICAgICAgICBgcmVtb3ZpbmcgJHt0cmFja2luZ05vfSBwYWNrYWdlIG1hbmlmZXN0IHNldCAke2VsZW1lbnR9IGBcbiAgICAgICAgICAgICk7XG4gICAgICAgICAgICBscmVkaXMuc3JlbShlbGVtZW50LCB0cmFja2luZ05vKS50aGVuKGZ1bmN0aW9uKHJSZXN1bHQpIHtcbiAgICAgICAgICAgICAgY29uc29sZS5sb2coclJlc3VsdCk7XG4gICAgICAgICAgICAgIGNvbnNvbGUubG9nKFwicmVtb3ZlZFwiKTtcbiAgICAgICAgICAgICAgaWYgKGtleXNDb3VudCA9PSBrUmVzdWx0Lmxlbmd0aCAtIDEpIGtleXNDb3VudCsrO1xuICAgICAgICAgICAgfSk7XG4gICAgICAgICAgfSk7XG4gICAgICAgICAgcmVzb2x2ZSh7XG4gICAgICAgICAgICBkZWxldGVkOiB0cnVlXG4gICAgICAgICAgfSk7XG4gICAgICAgIH0pO1xuXG4gICAgICAgIC8vd2UgYWxzbyBuZWVkIHRvIHJlbW92ZSBmcm9tIGFueSBzZXRzXG4gICAgICB9KTtcbiAgICB9KTtcbiAgfVxuICByZW1vdmVQYWNrYWdlQnlJZChpZCkge1xuICAgIHZhciBtc2VhcmNoID0gdGhpcy5teVNlYXJjaDtcbiAgICByZXR1cm4gbmV3IFByb21pc2UoKHJlc29sdmUsIHJlamVjdCkgPT4ge1xuICAgIFxuICAgICAgcmVkaVNlYXJjaC5kZWxEb2N1bWVudChQS0dfSURYLGlkLChlcnIscmVzcG9uc2UpPT57XG4gICAgICAgIHJlc29sdmUoe2RlbGV0ZWQ6dHJ1ZX0pXG4gICAgICB9KVxuICAgICAgXG4gICAgICAgIFxuICAgICAgXG4gICAgfSk7XG4gIH1cbiAgc3RvcmVQYWNrYWdlRm9yUGlja3VwKHRyYWNraW5nTm8sYmluKXtcbiAgICB2YXIgc2VhcmNoZXIgPSB0aGlzLm15U2VhcmNoO1xuICAgIHJldHVybiBuZXcgUHJvbWlzZSgocmVzb2x2ZSxyZWplY3QpPT57XG4gICAgICAgbHJlZGlzLmhtc2V0KFBLR19QUkVGSVgrdHJhY2tpbmdObyx7c3RhdHVzOjQsbG9jYXRpb246YmlufSkudGhlbigocmVzdWx0KT0+e1xuICAgICAgICAgbHJlZGlzLmdldFBhY2thZ2UodHJhY2tpbmdObykudGhlbigocGtnKT0+e1xuICAgICAgICAgIGFkZFBhY2thZ2VUb0luZGV4KHRyYWNraW5nTm8sc2VhcmNoZXIpIDsgXG4gICAgICAgICAgcmVzb2x2ZShwa2cpOyAgIFxuICAgICAgICAgfSk7XG4gICAgICAgfSkgXG4gICAgfSk7IFxuICB9XG4gIHVwZGF0ZVBhY2thZ2VJbmRleCh0cmFja2luZyl7XG4gICAgICByZXR1cm4gbmV3IFByb21pc2UoKHJlc29sdmUscmVqZWN0KT0+e1xuICAgICAgICAgIHZhciBtc2VhcmNoID0gdGhpcy5teVNlYXJjaDsgXG4gICAgICAgICAgYWRkUGFja2FnZVRvSW5kZXgodHJhY2tpbmcsbXNlYXJjaCk7IFxuICAgICAgICAgcmVzb2x2ZSh7J3VwZGF0ZWQnOnRydWV9KTtcbiAgICAgIH0pXG4gIH1cbiAgZ2V0Q3VzdG9tZXJQYWNrYWdlcyhza3lib3gpIHt9XG4gIGdldE1hbmlmZXN0UGFja2FnZXNCeVN0YXR1cyhtaWQsc3RhdHVzKSB7XG4gICAgICByZXR1cm4gbmV3IFByb21pc2UoKHJlc29sdmUscmVqZWN0KT0+e1xuICAgICAgICAgIGNvbnNvbGUubG9nKGBAbWlkOlske21pZH0gJHttaWR9XSBAc3RhdHVzPVske3N0YXR1c30gJHtzdGF0dXN9XWApXG4gICAgICAgIHRoaXMubXlTZWFyY2guc2VhcmNoKFxuICAgICAgICAgICAgYEBtaWQ6WyR7bWlkfSAke21pZH1dIEBzdGF0dXM6WyR7c3RhdHVzfSAke3N0YXR1c31dYCxcbiAgICAgICAgICAgIHsgb2Zmc2V0OiAwLCBudW1iZXJPZlJlc3VsdHM6IDUwMDAgfSxcbiAgICAgICAgICAgIChlcnIsIGRhdGEpID0+IHtcbiAgICAgICAgICAgICAgdmFyIHBhY2thZ2VzID0gW107XG4gICAgICAgICAgICAgIGNvbnNvbGUubG9nKGRhdGEpO1xuICAgICAgICAgICAgICBkYXRhLnJlc3VsdHMuZm9yRWFjaChlbGVtZW50ID0+IHtcblxuICAgICAgICAgICAgICAgIHBhY2thZ2VzLnB1c2goZWxlbWVudC5kb2MpO1xuICAgICAgICAgICAgICAgIHJlc29sdmUocGFja2FnZXMpOyAgICAgICAgICAgICAgICAgXG4gICAgICAgICAgICB9KTtcbiAgICAgICAgfSk7XG4gICAgICB9KTtcbiAgXG4gIH0gICBcbiAgXG4gIFxuXG4gICAvLyNyZWdpb24gTWFuaWZlc3QgUGFja2FnZSBGdW5jdGlvbnMgXG5cbiAgIGFkZFRvRmxpZ2h0KGFjdGlvbil7XG4gICAgcmV0dXJuIG5ldyBQcm9taXNlKChyZXNvbHZlLHJlamVjdCk9PntcbiAgICAgIHZhciBwYWNrYWdlTm8gPSBnZXRQYWNrYWdlSWRGcm9tQmFyQ29kZShhY3Rpb24uYmFyY29kZSk7IFxuICAgICAgdGhpcy5teVNlYXJjaC51cGRhdGUocGFja2FnZU5vLHttaWQ6YWN0aW9uLm1pZCAsIHN0YXR1czogMiwgbG9jYXRpb246XCJMb2FkZWQgb24gQWlyQ3JhZnRcIn0sKGVycixyZXN1bHQpPT57XG4gICAgICAgIGlmKGVycilcbiAgICAgICAgICByZXNvbHZlKHthZGRlZDpmYWxzZX0pXG4gICAgICAgIFxuICAgICAgICByZXNvbHZlKHthZGRlZDp0cnVlfSlcbiAgICAgIH0pXG4gICAgICAgIFxuICAgIH0pXG4gICB9XG4gICAvL3JlbW92ZSBmcm9tIGZsaWdodCBcbiAgIHJlbW92ZUZyb21GbGlnaHQoYWN0aW9uKXtcbiAgICByZXR1cm4gbmV3IFByb21pc2UoKHJlc29sdmUscmVqZWN0KT0+e1xuICAgICAgICB2YXIgcGFja2FnZU5vID0gZ2V0UGFja2FnZUlkRnJvbUJhckNvZGUoYWN0aW9uLmJhcmNvZGUpOyAgIFxuICAgICAgICB0aGlzLm15U2VhcmNoLnVwZGF0ZShwYWNrYWdlTm8se21pZDphY3Rpb24ubWlkfSwoZXJyLHJlc3VsdCk9PntcbiAgICAgICAgaWYoZXJyKVxuICAgICAgICAgICAgcmVzb2x2ZSh7cmVtb3ZlZDpmYWxzZX0pXG4gICAgICAgICAgXG4gICAgICAgICAgcmVzb2x2ZSh7cmVtb3ZlZDp0cnVlfSlcbiAgICAgICAgfSlcbiAgICB9KVxuICAgfVxuICAgcmVjRnJvbVRydWNrKHRyYWNraW5nTm8pe1xuICAgICByZXR1cm4gbmV3IFByb21pc2UoKHJlc29sdmUscmVqZWN0KT0+e1xuICAgICBcbiAgICAgICAgZGF0YUNvbnRleHQucmVkaXNDbGllbnQuc2V0KFJFQ19QS0crdHJhY2tpbmdObyxtb21lbnQoKS51bml4KCksIChlcnIscmVzdWx0KT0+e1xuICAgICAgICAgIGlmIChlcnIpIHJlc29sdmUoe3NhdmVkOmZhbHNlfSlcbiAgICAgICAgICByZXNvbHZlKHtzYXZlZDp0cnVlfSlcbiAgICAgICAgfSlcbiAgICAgfSlcbiAgIH1cblxuICAgcmVjRnJvbVBsYW5lTmFzKGJhcmNvZGUpe1xuICAgICByZXR1cm4gbmV3IFByb21pc2UoKHJlc29sdmUscmVqZWN0KT0+e1xuICAgICAgIHZhciBzcnYgPSB0aGlzIDsgXG4gICAgICAgdmFyIHBrZ0lkID0gZ2V0UGFja2FnZUlkRnJvbUJhckNvZGUoYmFyY29kZSk7IFxuICAgICAgICBzcnYubXlTZWFyY2guZ2V0RG9jKHBrZ0lkLChlcnIscGtnKT0+e1xuICAgICAgICAgICAgcGtnLmRvYy5zdGF0dXMgPSA0OyBcbiAgICAgICAgICAgIHBrZy5kb2MubG9jYXRpb24gID0gXCJXYXJlaG91c2UgTkFTXCI7IFxuICAgICAgICAgICAgc3J2Lm15U2VhcmNoLnVwZGF0ZShwa2dJZCxwa2cuZG9jLChlcnIsdXBkYXRlUmVzdWx0KT0+e1xuICAgICAgICAgICAgICBpZihlcnIpXG4gICAgICAgICAgICAgICAgcmVqZWN0KHt1cGRhdGVkOmZhbHNlfSlcbiAgICAgICAgICAgICAgcmVzb2x2ZSh7dXBkYXRlZDp0cnVlfSlcbiAgICAgICAgICAgIH0pXG4gICAgICAgIH0pXG4gICAgIH0pXG4gICB9XG4gICAvLyNlbmRyZWdpb25cbn1cblxuZnVuY3Rpb24gZ2V0UGFja2FnZUlkRnJvbUJhckNvZGUoYmFyQ29kZVZhbHVlKXtcbiAgdmFyIHBhcnRzID0gYmFyQ29kZVZhbHVlLnNwbGl0KFwiLVwiKTsgXG4gIGlmIChwYXJ0cy5sZW5ndGggPT0gMylcbiAgICBpZiAodHlwZW9mIHBhcnRzWzJdICE9IFwidW5kZWZpbmVkXCIpXG4gICAgcmV0dXJuIHBhcnRzWzJdLnRyaW0oKTsgXG4gIHJldHVybiBcIlwiXG59XG4iXX0=
