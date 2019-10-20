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
//# sourceMappingURL=data:application/json;charset=utf8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIlJlZGlzU2VydmljZXMvUGFja2FnZVNlcnZpY2UuZXM2Il0sIm5hbWVzIjpbInJlZGlzIiwicmVxdWlyZSIsImxyZWRpcyIsIm1vbWVudCIsInJlZGlzU2VhcmNoIiwiZnMiLCJQYWNrYWdlVXRpbCIsIlBhY2thZ2VVdGlsaXR5IiwicGFja2FnZVV0aWwiLCJQS0dfSURYIiwiUEtHX0lEX0NPVU5URVIiLCJkYXRhQ29udGV4dCIsIlBLR19QUkVGSVgiLCJBV0JfSUQiLCJJTkRFWF9BV0IiLCJSRUNfUEtHIiwiQ3VzdG9tZXJTZXJ2aWNlIiwiY3VzdG9tZXJTZXJ2aWNlIiwiUEtHX1NUQVRVUyIsImF3YkluZGV4IiwiY2xpZW50T3B0aW9ucyIsInNlYXJjaENsaWVudERldGFpbHMiLCJwYWNrYWdlSW5kZXgiLCJnZXRQYWNrYWdlVm9sdW1uZSIsIm1QYWNrYWdlIiwiY3JlYXRlRG9jdW1lbnQiLCJ0UGFja2FnZSIsInBhY2thZ2VEb2N1bWVudCIsImlkIiwidHJhY2tpbmdObyIsInNreWJveCIsImRhdGVSZWNpZXZlZCIsInVuaXgiLCJhd2IiLCJtaWQiLCJ2b2x1bWUiLCJ3ZWlnaHQiLCJwaWVjZXMiLCJjdXN0b21lciIsInNoaXBwZXIiLCJkZXNjcmlwdGlvbiIsImRpbWVuc2lvbnMiLCJjYXJyaWVyIiwic3RhdHVzIiwidmFsdWUiLCJjb25zb2xlIiwibG9nIiwic2V0UGFja2FnZUluVHJhbnNpdCIsImtleXMiLCJtc2VhcmNoZXIiLCJQcm9taXNlIiwicmVzb2x2ZSIsInJlamVjdCIsImJhdGNoZXIiLCJjbGllbnQiLCJiYXRjaCIsImZvckVhY2giLCJsb2NhdGlvbiIsImVsZW1lbnQiLCJobXNldCIsImV4ZWMiLCJlcnIiLCJyZXN1bHQiLCJhZGRQYWNrYWdlVG9JbmRleCIsImdldFBhY2thZ2UiLCJ0aGVuIiwiZGVsRG9jdW1lbnQiLCJwYWNrIiwiZG9uZSIsImRvY3VtZW50IiwiYWRkIiwiUGFja2FnZVNlcnZpY2UiLCJzZXR1cEluZGV4IiwibXlTZWFyY2giLCJyZWRpc0NsaWVudCIsImV4aXN0cyIsInNldCIsImluaXRSZXN1bHQiLCJpbmNyIiwibmV3SWQiLCJ0b1N0cmluZyIsInJlcGx5IiwiaW52b2ljZSIsImhhc0RvY3MiLCJkYXRlQ3JlYXRlZCIsImVycjEiLCJhd2JSZXMiLCJzYXZlZCIsInNlYXJjaCIsIm51bWJlck9mUmVzdWx0cyIsIm9mZnNldCIsInBhY2thZ2VzIiwidG90YWxSZXN1bHRzIiwicmVzdWx0cyIsInBhY2thZ2UxIiwiZG9jIiwiTnVtYmVyIiwiZGF0YSIsInNydiIsInBhY2thZ2VsaXN0IiwiY291bnQiLCJsZW5ndGgiLCJzdWJzdHJpbmciLCJwdXNoIiwic29ydEJ5IiwiYXdicyIsImF3Ykxpc3QiLCJhbGwiLCJtYXAiLCJnZXRDdXN0b21lciIsImN1c3RvbWVySWQiLCJnZXRBd2JPdmVydmlldyIsImN1c3RvbWVycyIsImkiLCJmb3JtYXQiLCJjb25zaWduZWUiLCJuYW1lIiwiZGV0YWlscyIsInBtYiIsImNhdGNoIiwiZ2V0RG9jIiwiZ2V0QXdiRGV0YWlscyIsInRyYWNraW5nTnVtYmVyIiwibG9jYXRpb25faWQiLCJwYWNrYWdlUmVzdWx0IiwibmV3UGFja2FnZSIsImJvZHkiLCJjUGFja2FnZSIsInJlcGxhY2UiLCJ0cmltIiwidHJhY2tpbmciLCJyZXNwb25zZSIsImluZGV4UGFja2FnZSIsImRvY1Jlc3VsdCIsInNlYXJjaGVyIiwiZHV0eVBlcmNlbnQiLCJoYXNPcHQiLCJwIiwiY3VycmVudENvbnRhaW5lciIsIm10eXBlIiwiY29udGFpbmVyIiwiYmFnIiwic3JlbSIsInNraWQiLCJtYW5pZmVzdEtleSIsImNvbnRhaW5lck5vIiwic2V0QWRkIiwic1Jlc3VsdCIsImdldE1lbWJlcnMiLCJyZGF0YSIsInNQYWNrYWdlIiwiZXJyMyIsImxpc3RpbmciLCJlcnIyIiwiZXJyMjMyIiwicGFnZSIsInBhZ2VTaXplIiwiYmFyY29kZSIsInBrZ0lkIiwiZ2V0UGFja2FnZUlkRnJvbUJhckNvZGUiLCJnZXRBd2IiLCJhd2JpbmZvIiwicGFja2FnZSIsIm1zZWFyY2giLCJvbGREb2NJZCIsImRvY0lkIiwidXBkYXRlZFBhY2thZ2VzIiwicGFja2FnZUlkIiwibWFuaWZlc3QiLCJkZWwiLCJkZWNyIiwiZ2V0S2V5cyIsImtleXNDb3VudCIsImtSZXN1bHQiLCJyUmVzdWx0IiwiZGVsZXRlZCIsInJlZGlTZWFyY2giLCJiaW4iLCJwa2ciLCJhY3Rpb24iLCJwYWNrYWdlTm8iLCJ1cGRhdGUiLCJhZGRlZCIsInJlbW92ZWQiLCJ1cGRhdGVSZXN1bHQiLCJ1cGRhdGVkIiwiYmFyQ29kZVZhbHVlIiwicGFydHMiLCJzcGxpdCJdLCJtYXBwaW5ncyI6Ijs7Ozs7Ozs7O0FBQUE7O0FBQ0E7Ozs7OztBQUdBLElBQUlBLFFBQVFDLFFBQVEsT0FBUixDQUFaO0FBQ0EsSUFBSUMsU0FBU0QsUUFBUSxlQUFSLENBQWI7QUFDQSxJQUFJRSxTQUFTRixRQUFRLFFBQVIsQ0FBYjtBQUNBLElBQUlHLGNBQWNILFFBQVEscUJBQVIsQ0FBbEI7QUFDQSxJQUFJSSxLQUFLSixRQUFRLElBQVIsQ0FBVDtBQUNBLElBQUlFLFNBQVNGLFFBQVEsUUFBUixDQUFiO0FBQ0EsSUFBSUssY0FBY0wsUUFBUSxxQkFBUixFQUErQk0sY0FBakQ7QUFDQSxJQUFJQyxjQUFjLElBQUlGLFdBQUosRUFBbEI7QUFDQSxJQUFNRyxVQUFVLGdCQUFoQjtBQUNBLElBQU1DLGlCQUFpQixZQUF2QjtBQUNBLElBQUlDLGNBQWNWLFFBQVEsZUFBUixDQUFsQjtBQUNBLElBQU1XLGFBQWEsV0FBbkI7QUFDQSxJQUFNQyxTQUFTLFFBQWY7QUFDQSxJQUFNQyxZQUFZLFdBQWxCO0FBQ0EsSUFBTUMsVUFBVSxVQUFoQjtBQUNBLElBQUlDLGtCQUFrQmYsUUFBUSxtQkFBUixFQUE2QmUsZUFBbkQ7QUFDQSxJQUFJQyxrQkFBa0IsSUFBSUQsZUFBSixFQUF0QjtBQUNBLElBQU1FLGFBQWE7QUFDakIsS0FBSSxVQURhO0FBRWpCLEtBQUcsb0JBRmM7QUFHakIsS0FBRyxZQUhj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R0FBOUIsRUFBa0MsVUFBQ2xDLEdBQUQsRUFBSzJILFlBQUwsRUFBb0I7QUFDcEQsZ0JBQUczSCxHQUFILEVBQ0VULE9BQU8sRUFBQ3FJLFNBQVEsS0FBVCxFQUFQO0FBQ0Z0SSxvQkFBUSxFQUFDc0ksU0FBUSxJQUFULEVBQVI7QUFDRCxXQUpEO0FBS0gsU0FSRDtBQVNGLE9BWk0sQ0FBUDtBQWFEO0FBQ0Q7Ozs7Ozs7QUFHSCxTQUFTMUIsdUJBQVQsQ0FBaUMyQixZQUFqQyxFQUE4QztBQUM1QyxNQUFJQyxRQUFRRCxhQUFhRSxLQUFiLENBQW1CLEdBQW5CLENBQVo7QUFDQSxNQUFJRCxNQUFNdEYsTUFBTixJQUFnQixDQUFwQixFQUNFLElBQUksT0FBT3NGLE1BQU0sQ0FBTixDQUFQLElBQW1CLFdBQXZCLEVBQ0EsT0FBT0EsTUFBTSxDQUFOLEVBQVMxRCxJQUFULEVBQVA7QUFDRixTQUFPLEVBQVA7QUFDRCIsImZpbGUiOiJSZWRpc1NlcnZpY2VzL1BhY2thZ2VTZXJ2aWNlLmpzIiwic291cmNlc0NvbnRlbnQiOlsiaW1wb3J0IHsgY3B1cyB9IGZyb20gXCJvc1wiO1xuaW1wb3J0IHsgcHJvbWlzZXMgfSBmcm9tIFwiZG5zXCI7XG5cblxudmFyIHJlZGlzID0gcmVxdWlyZShcInJlZGlzXCIpO1xudmFyIGxyZWRpcyA9IHJlcXVpcmUoXCIuL3JlZGlzLWxvY2FsXCIpO1xudmFyIG1vbWVudCA9IHJlcXVpcmUoXCJtb21lbnRcIik7XG52YXIgcmVkaXNTZWFyY2ggPSByZXF1aXJlKFwiLi4vcmVkaXNlYXJjaGNsaWVudFwiKTtcbnZhciBmcyA9IHJlcXVpcmUoXCJmc1wiKTtcbnZhciBtb21lbnQgPSByZXF1aXJlKCdtb21lbnQnKVxudmFyIFBhY2thZ2VVdGlsID0gcmVxdWlyZShcIi4uL1V0aWwvcGFja2FnZXV0aWxcIikuUGFja2FnZVV0aWxpdHk7XG52YXIgcGFja2FnZVV0aWwgPSBuZXcgUGFja2FnZVV0aWwoKTtcbmNvbnN0IFBLR19JRFggPSBcImluZGV4OnBhY2thZ2VzXCI7XG5jb25zdCBQS0dfSURfQ09VTlRFUiA9IFwicGFja2FnZTppZFwiO1xudmFyIGRhdGFDb250ZXh0ID0gcmVxdWlyZSgnLi9kYXRhQ29udGV4dCcpXG5jb25zdCBQS0dfUFJFRklYID0gXCJwYWNrYWdlczpcIjtcbmNvbnN0IEFXQl9JRCA9IFwiYXdiOmlkXCJcbmNvbnN0IElOREVYX0FXQiA9IFwiaW5kZXg6YXdiXCJcbmNvbnN0IFJFQ19QS0cgPSBcInBrZzpyZWM6XCJcbnZhciBDdXN0b21lclNlcnZpY2UgPSByZXF1aXJlKCcuL0N1c3RvbWVyU2VydmljZScpLkN1c3RvbWVyU2VydmljZTsgXG52YXIgY3VzdG9tZXJTZXJ2aWNlID0gbmV3IEN1c3RvbWVyU2VydmljZSgpXG5jb25zdCBQS0dfU1RBVFVTID0geyBcbiAgMSA6IFwiUmVjZWl2ZWRcIixcbiAgMjogXCJMb2FkZWQgb24gQWlyQ3JhZnRcIixcbiAgMzogXCJJbiBUcmFuc2l0XCIsXG4gIDQ6IFwiUmVjaWV2ZWQgaW4gTkFTXCIsXG4gIDU6IFwiUmVhZHkgZm9yIFBpY2t1cCAvIERlbGl2ZXJ5XCIsXG4gIDY6IFwiRGVsaXZlcmVkXCJcblxufTsgXG5cbmNvbnN0IGF3YkluZGV4ID0gcmVkaXNTZWFyY2gocmVkaXMsIElOREVYX0FXQiwge1xuICBjbGllbnRPcHRpb25zOiBscmVkaXMuc2VhcmNoQ2xpZW50RGV0YWlsc1xufSk7XG5jb25zdCBwYWNrYWdlSW5kZXggPSByZWRpc1NlYXJjaChyZWRpcywgUEtHX0lEWCwge1xuICBjbGllbnRPcHRpb25zOiBscmVkaXMuc2VhcmNoQ2xpZW50RGV0YWlsc1xufSk7XG5mdW5jdGlvbiBnZXRQYWNrYWdlVm9sdW1uZShtUGFja2FnZSl7XG5cbiAgcmV0dXJuIDA7IFxufVxuZnVuY3Rpb24gY3JlYXRlRG9jdW1lbnQodFBhY2thZ2UpIHtcbiAgdmFyIHBhY2thZ2VEb2N1bWVudCA9IHtcbiAgICBpZDp0UGFja2FnZS5pZCxcbiAgICB0cmFja2luZ05vOiB0UGFja2FnZS50cmFja2luZ05vLFxuICAgIHNreWJveDogdFBhY2thZ2Uuc2t5Ym94LFxuICAgIGRhdGVSZWNpZXZlZCA6IG1vbWVudCgpLnVuaXgoKSwgXG4gICAgYXdiOjAsIFxuICAgIG1pZDowLFxuICAgIHZvbHVtZTogZ2V0UGFja2FnZVZvbHVtbmUodFBhY2thZ2UpLFxuICAgIHdlaWdodDp0UGFja2FnZS53ZWlnaHQsXG4gICAgcGllY2VzOnRQYWNrYWdlLnBpZWNlcyxcbiAgICBjdXN0b21lcjogdFBhY2thZ2UuY3VzdG9tZXIsXG4gICAgc2hpcHBlcjogdFBhY2thZ2Uuc2hpcHBlcixcbiAgICBkZXNjcmlwdGlvbjogdFBhY2thZ2UuZGVzY3JpcHRpb24sXG4gICAgZGltZW5zaW9uczp0UGFja2FnZS5kaW1lbnNpb25zLFxuICAgIGNhcnJpZXI6dFBhY2thZ2UuY2FycmllcixcbiAgICAvL3NreWJveFY6IHRQYWNrYWdlLnNreWJveCwgYWRkIGRpbWVuaW9uIFxuICAgIHN0YXR1czogdFBhY2thZ2Uuc3RhdHVzLFxuICAgIG1pZDogdFBhY2thZ2UubWlkLFxuICAgIHZhbHVlOiB0UGFja2FnZS52YWx1ZSxcbiAgICBcbiAgfTtcbiAgY29uc29sZS5sb2coXCJhYm91dCB0byBhZGQgdGhlIHBhY2thZ2UgdG8gdGhlIGluZGV4XCIpO1xuICByZXR1cm4gcGFja2FnZURvY3VtZW50O1xufVxuZnVuY3Rpb24gc2V0UGFja2FnZUluVHJhbnNpdChrZXlzLCBtc2VhcmNoZXIpIHtcbiAgcmV0dXJuIG5ldyBQcm9taXNlKChyZXNvbHZlLCByZWplY3QpID0+IHtcbiAgICB2YXIgYmF0Y2hlciA9IG1zZWFyY2hlci5jbGllbnQuYmF0Y2goKTtcbiAgICBrZXlzLmZvckVhY2goZWxlbWVudCA9PiB7XG4gICAgICB2YXIgdmFsdWUgPSB7XG4gICAgICAgIHN0YXR1czogMixcbiAgICAgICAgbG9jYXRpb246IFwiSW4gVHJhbnNpdFwiXG4gICAgICB9O1xuICAgICAgY29uc29sZS5sb2coZWxlbWVudCArIFwiaXMgdGhlIGVsZW1lbnRcIik7XG5cbiAgICAgIGJhdGNoZXIuaG1zZXQoUEtHX1BSRUZJWCArIGVsZW1lbnQsIHZhbHVlKTtcbiAgICB9KTtcbiAgICBiYXRjaGVyLmV4ZWMoKGVyciwgcmVzdWx0KSA9PiB7XG4gICAgICBjb25zb2xlLmxvZyhyZXN1bHQpO1xuICAgICAgLy9yZWFkZCB0aGUgZG9jdW1lbnRzIGhlcmVcbiAgICAgIGtleXMuZm9yRWFjaChlbGVtZW50ID0+IHtcbiAgICAgICAgYWRkUGFja2FnZVRvSW5kZXgoZWxlbWVudCwgbXNlYXJjaGVyKTtcbiAgICAgIH0pO1xuICAgICAgcmVzb2x2ZShyZXN1bHQpO1xuICAgIH0pO1xuICB9KTtcbn1cblxuZnVuY3Rpb24gYWRkUGFja2FnZVRvSW5kZXgodHJhY2tpbmdObywgbXNlYXJjaGVyKSB7XG4gIGxyZWRpcy5nZXRQYWNrYWdlKHRyYWNraW5nTm8pLnRoZW4ocGFjayA9PiB7XG4gICAgbXNlYXJjaGVyLmRlbERvY3VtZW50KFBLR19JRFgsIGAke3BhY2subWlkfS0ke3RyYWNraW5nTm99YCwgKGVyciwgZG9uZSkgPT4ge1xuICAgICAgdmFyIGRvY3VtZW50ID0gY3JlYXRlRG9jdW1lbnQocGFjayk7XG4gICAgICBjb25zb2xlLmxvZyhcInJlYWRkaW5nIHBhY2thZ2UgdG8gdGhlIGluZGV4IGxpa2UgYSBib3NzIFwiICsgdHJhY2tpbmdObyk7XG4gICAgICBtc2VhcmNoZXIuYWRkKHBhY2subWlkICsgXCItXCIgKyBwYWNrLnRyYWNraW5nTm8sIGRvY3VtZW50KTtcbiAgICB9KTtcbiAgfSk7XG59XG5leHBvcnQgY2xhc3MgUGFja2FnZVNlcnZpY2Uge1xuICBjb25zdHJ1Y3RvcigpIHtcbiAgICB0aGlzLnNldHVwSW5kZXgoKTtcbiAgfVxuICBzZXR1cEluZGV4KCkge1xuICAgIHRoaXMubXlTZWFyY2ggPSByZWRpc1NlYXJjaChyZWRpcywgUEtHX0lEWCwge1xuICAgICAgY2xpZW50T3B0aW9uczogbHJlZGlzLnNlYXJjaENsaWVudERldGFpbHNcbiAgICB9KTtcbiAgfVxuICBnZXROZXdBd2IoKXtcbiAgICByZXR1cm4gbmV3IFByb21pc2UoKHJlc29sdmUscmVqZWN0KT0+e1xuICAgICAgZGF0YUNvbnRleHQucmVkaXNDbGllbnQuZXhpc3RzKEFXQl9JRCwoZXJyLHJlc3VsdCk9PntcbiAgICAgICAgY29uc29sZS5sb2cocmVzdWx0KTsgXG4gICAgICAgIGlmIChyZXN1bHQgIT0gXCIxXCIpe1xuICAgICAgICAgIGRhdGFDb250ZXh0LnJlZGlzQ2xpZW50LnNldChBV0JfSUQgPT0gMTAwMDAwLChlcnIsaW5pdFJlc3VsdCk9PntcbiAgICAgICAgICAgIGRhdGFDb250ZXh0LnJlZGlzQ2xpZW50LmluY3IoQVdCX0lELChlcnIsbmV3SWQpPT57XG4gICAgICAgICAgICAgIHJlc29sdmUoe2F3YjpuZXdJZH0pXG4gICAgICAgICAgICB9KVxuICAgICAgICAgIH0pXG4gICAgICAgIH1cbiAgICAgICAgZWxzZSB7XG4gICAgICAgICAgZGF0YUNvbnRleHQucmVkaXNDbGllbnQuaW5jcihBV0JfSUQsKGVycixuZXdJZCk9PntcbiAgICAgICAgICAgIHJlc29sdmUoe2F3YjpuZXdJZH0pXG4gICAgICAgICAgfSlcbiAgICAgICAgfVxuICAgICAgfSlcbiAgICB9KTtcbiAgfVxuICBzYXZlQXdiKGF3Yil7XG4gICAgcmV0dXJuIG5ldyBQcm9taXNlKChyZXNvbHZlLHJlamVjdCk9PntcbiAgICAgIGNvbnNvbGUubG9nKCdzYXZpbmcuLi4nLGF3Yixtb21lbnQoKS50b1N0cmluZyhcImhoOm1tOnNzXCIpKVxuICAgICAgZGF0YUNvbnRleHQucmVkaXNDbGllbnQuaW5jcihBV0JfSUQsKGVycixyZXBseSk9PntcbiAgICAgICAgYXdiLmlkID0gcmVwbHk7IFxuICAgICAgICBhd2Iuc3RhdHVzID0gMTsgXG4gICAgICAgIGlmIChhd2IuaW52b2ljZSl7XG4gICAgICAgICAgYXdiLmhhc0RvY3MgPSAxXG4gICAgICAgICAgY29uc29sZS5sb2coXCJIQVMgRE9DQ0NDQ1wiKVxuICAgICAgICB9XG4gICAgICAgIGVsc2Uge1xuICAgICAgICAgIGF3Yi5oYXNEb2NzID0gMCA7IFxuICAgICAgICAgIGNvbnNvbGUubG9nKFwiSEFTIE5PIERPQ0NDQ0NcIilcbiAgICAgICAgfVxuICAgICAgICBcbiAgICAgICAgYXdiLmRhdGVDcmVhdGVkID0gbW9tZW50KCkudW5peCgpOyBcbiAgICAgICAgICBhd2JJbmRleC5hZGQoYXdiLmlkLGF3YiwoZXJyMSxhd2JSZXMpPT57XG4gICAgICAgICAgICBpZiAoZXJyMSl7XG4gICAgICAgICAgICAgIGNvbnNvbGUubG9nKCdzYXZpbmcgZXJyJyxlcnIxKVxuICAgICAgICAgICAgICByZXNvbHZlKHtzYXZlZDpmYWxzZX0pXG4gICAgICAgICAgICB9XG4gICAgICAgICAgICByZXNvbHZlKHtzYXZlZDp0cnVlLCBpZDpyZXBseX0pXG4gICAgICAgICAgfSlcbiAgICAgIH0pXG4gICAgICAgXG4gICAgICBcbiAgICAgIFxuICAgIH0pXG4gIH1cbiAgZ2V0QXdiT3ZlcnZpZXcoaWQpe1xuICAgIC8vIGdldCB0aGUgYXdiIHBhY2thZ2VzIGFuZCBhZGQgZXZlcnl0aGluZyBpbiBcbiAgICByZXR1cm4gbmV3IFByb21pc2UoKHJlc29sdmUscmVqZWN0KT0+e1xuICAgICAgcGFja2FnZUluZGV4LnNlYXJjaChgQGF3YjpbJHtpZH0gJHtpZH1dYCx7bnVtYmVyT2ZSZXN1bHRzOjUwMDAsb2Zmc2V0OjB9LChlcnIscGFja2FnZXMpPT57XG4gICAgICAgIHZhciB3ZWlnaHQgPSAwIDsgXG4gICAgICAgIHZhciBwaWVjZXMgPSBwYWNrYWdlcy50b3RhbFJlc3VsdHM7IFxuICAgICAgICB2YXIgZGVzY3JpcHRpb24gPSBcIlwiXG4gICAgICAgIHBhY2thZ2VzLnJlc3VsdHMuZm9yRWFjaChwYWNrYWdlMSA9PiB7XG4gICAgICAgICAgaWYgKGRlc2NyaXB0aW9uID09XCJcIilcbiAgICAgICAgICAgIGRlc2NyaXB0aW9uID0gcGFja2FnZTEuZG9jLmRlc2NyaXB0aW9uOyBcbiAgICAgICAgICB3ZWlnaHQgKz0gTnVtYmVyKHBhY2thZ2UxLmRvYy53ZWlnaHQpXG4gICAgICAgIH0pO1xuICAgICAgICB2YXIgZGF0YSAgPSB7d2VpZ2h0OndlaWdodCxkZXNjcmlwdGlvbjpkZXNjcmlwdGlvbixwaWVjZXM6cGllY2VzfVxuICAgICAgICBjb25zb2xlLmxvZyhkYXRhLFwiQVdCIERFVEFJTFNcIik7IFxuICAgICAgICByZXNvbHZlKCBkYXRhKVxuICAgICAgfSlcbiAgICB9KVxuICAgXG4gIH1cbiAgZ2V0QXdiRGV0YWlscyhpZCl7XG4gICAgdmFyIHNydiA9IHRoaXM7IFxuICAgIHJldHVybiBuZXcgUHJvbWlzZSgocmVzb2x2ZSxyZWplY3QpPT57XG4gICAgICBjb25zb2xlLmxvZyhgQGF3YjpbJHtpZH0gJHtpZH1dYClcbiAgICAgXG4gICAgICBwYWNrYWdlSW5kZXguc2VhcmNoKGBAYXdiOlske2lkfSAke2lkfV1gLHtudW1iZXJPZlJlc3VsdHM6NTAwMCxvZmZzZXQ6MH0sKGVycixwYWNrYWdlcyk9PntcbiAgICAgICAgaWYgKGVycilcbiAgICAgICAgIGNvbnNvbGUubG9nKGVycilcbiAgICAgIFxuICAgICAgICB2YXIgIHBhY2thZ2VsaXN0ICA9IFtdXG4gICAgICAgIHZhciBjb3VudCA9IDE7IFxuICAgICAgICBwYWNrYWdlcy5yZXN1bHRzLmZvckVhY2gocGFja2FnZTEgPT4ge1xuXG4gICAgICAgICAgaWYgKHBhY2thZ2UxLmRvYy50cmFja2luZ05vLmxlbmd0aCA+IDcpe1xuICAgICAgICAgICAgLy9vbmx5IGRpc3BsYXkgdGhlIGxhc3QgNyBcbiAgICAgICAgICAgIHBhY2thZ2UxLmRvYy50cmFja2luZ05vID0gcGFja2FnZTEuZG9jLnRyYWNraW5nTm8uc3Vic3RyaW5nKHBhY2thZ2UxLmRvYy50cmFja2luZ05vLmxlbmd0aCAtNylcbiAgICAgICAgICAgIFxuICAgICAgICAgIH1cbiAgICAgICAgICBwYWNrYWdlMS5kb2MucGFja2FnZUluZGV4ID0gY291bnQ7XG4gICAgICAgICAgY291bnQgKys7IFxuICAgICAgICAgIHBhY2thZ2VsaXN0LnB1c2goIHBhY2thZ2UxLmRvYylcbiAgICAgICAgfSk7XG4gICAgICAgXG4gICAgICAgXG4gICAgICAgIHJlc29sdmUoIHBhY2thZ2VsaXN0KVxuICAgICAgfSlcbiAgICB9KVxuICB9XG4gIGxpc3ROb0RvY3NGbGwoKXtcbiAgICByZXR1cm4gbmV3IFByb21pc2UoKHJlc29sdmUscmVqZWN0KT0+e1xuICAgICAgIGF3YkluZGV4LnNlYXJjaChcIkBzdGF0dXM6WzEgMV0gQGhhc0RvY3M6WzAgMF1cIix7b2Zmc2V0OjAsbnVtYmVyT2ZSZXN1bHRzOjUwMDAsc29ydEJ5OidpZCd9LChlcnIsYXdicyk9PntcbiAgICAgICAgIHZhciBhd2JMaXN0ID0gW107IFxuICAgICAgICAgUHJvbWlzZS5hbGwoYXdicy5yZXN1bHRzLm1hcChhd2I9PmN1c3RvbWVyU2VydmljZS5nZXRDdXN0b21lcihhd2IuZG9jLmN1c3RvbWVySWQpKSkudGhlbihjdXN0b21lcnM9PntcbiAgICAgICAgICAgUHJvbWlzZS5hbGwoYXdicy5yZXN1bHRzLm1hcChhd2I9PnRoaXMuZ2V0QXdiT3ZlcnZpZXcoYXdiLmRvYy5pZCkpKS50aGVuKGRldGFpbHM9PntcbiAgICAgICAgICAgIGNvbnNvbGUubG9nKFwiZ290IHRoZSBjdXN0b21lcnNcIixjdXN0b21lcnMsIGF3YnMpXG4gICAgICAgICAgICBmb3IodmFyIGkgPTAgOyBpIDwgYXdicy5yZXN1bHRzLmxlbmd0aCA7IGkrKyApe1xuICAgICAgICAgICAgICB2YXIgYXdiID0gYXdicy5yZXN1bHRzW2ldOyBcbiAgICAgICAgICAgICAgYXdiLmRvYy5kYXRlQ3JlYXRlZCA9IG1vbWVudC51bml4KGF3Yi5kb2MuZGF0ZUNyZWF0ZWQpLmZvcm1hdChcIllZWVktTU0tREQgaGg6bW0gQVwiKVxuICAgICAgICAgICAgICAvL3dlIG5lZWQgdG8gZ2V0IHRoZSBjdXN0b21lciBcbiAgICAgICAgICAgICAgYXdiLmRvYy5jb25zaWduZWUgPSBjdXN0b21lcnNbaV0ubmFtZTsgXG4gICAgICAgICAgICAgIGF3Yi5kb2Mud2VpZ2h0ID0gZGV0YWlsc1tpXS53ZWlnaHQ7IFxuICAgICAgICAgICAgICBhd2IuZG9jLnBtYiA9IGN1c3RvbWVyc1tpXS5wbWI7IFxuICAgICAgICAgICAgICBhd2IuZG9jLmRlc2NyaXB0aW9uID0gZGV0YWlsc1tpXS5kZXNjcmlwdGlvbjsgXG4gICAgICAgICAgICAgIGF3Yi5kb2MucGllY2VzID0gZGV0YWlsc1tpXS5waWVjZXM7IFxuICAgICAgICAgICAgICBpZiAoY3VzdG9tZXJzW2ldLnBtYiA9PSAnJyl7XG4gICAgICAgICAgICAgICAgYXdiLmRvYy5wbWIgPSAnOTAwMCdcbiAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICBjb25zb2xlLmxvZygncHVzaGluZyAnLGF3YilcbiAgICAgICAgICAgICAgLy93ZSBuZWVkIHRvIGdldCBhbGwgdGhlIHBhY2thZ2VzIFxuICAgICAgICAgICAgICBhd2JMaXN0LnB1c2goYXdiLmRvYylcbiAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgcmVzb2x2ZSh7YXdiczphd2JMaXN0fSlcbiAgICAgICAgICAgfSlcbiAgICAgICAgICBcbiAgICAgICAgICB9KS5jYXRjaChlcnI9PntcbiAgICAgICAgICAgIGNvbnNvbGUubG9nKGVycik7IFxuICAgICAgICAgIH0pXG4gICAgICAgICBcbiAgICAgICAgLy8gIGF3YnMucmVzdWx0cy5mb3JFYWNoKGF3YiA9PiB7XG4gICAgICAgICAgIFxuICAgICAgICAgIFxuICAgICAgICAvLyAgfSk7XG4gICAgICAgICBcbiAgICAgICB9KVxuICAgIH0pXG4gIH1cblxuICBsaXN0QXdiaW5GbGwoKXtcbiAgICByZXR1cm4gbmV3IFByb21pc2UoKHJlc29sdmUscmVqZWN0KT0+e1xuICAgICAgIGF3YkluZGV4LnNlYXJjaChcIkBzdGF0dXM6WzEgMV0gQGhhc0RvY3M6WzEgMV1cIix7b2Zmc2V0OjAsbnVtYmVyT2ZSZXN1bHRzOjUwMDAsc29ydEJ5OidpZCd9LChlcnIsYXdicyk9PntcbiAgICAgICAgIHZhciBhd2JMaXN0ID0gW107IFxuICAgICAgICAgUHJvbWlzZS5hbGwoYXdicy5yZXN1bHRzLm1hcChhd2I9PmN1c3RvbWVyU2VydmljZS5nZXRDdXN0b21lcihhd2IuZG9jLmN1c3RvbWVySWQpKSkudGhlbihjdXN0b21lcnM9PntcbiAgICAgICAgICAgUHJvbWlzZS5hbGwoYXdicy5yZXN1bHRzLm1hcChhd2I9PnRoaXMuZ2V0QXdiT3ZlcnZpZXcoYXdiLmRvYy5pZCkpKS50aGVuKGRldGFpbHM9PntcbiAgICAgICAgICAgIGNvbnNvbGUubG9nKFwiZ290IHRoZSBjdXN0b21lcnNcIixjdXN0b21lcnMsIGF3YnMpXG4gICAgICAgICAgICBmb3IodmFyIGkgPTAgOyBpIDwgYXdicy5yZXN1bHRzLmxlbmd0aCA7IGkrKyApe1xuICAgICAgICAgICAgICB2YXIgYXdiID0gYXdicy5yZXN1bHRzW2ldOyBcbiAgICAgICAgICAgICAgYXdiLmRvYy5kYXRlQ3JlYXRlZCA9IG1vbWVudC51bml4KGF3Yi5kb2MuZGF0ZUNyZWF0ZWQpLmZvcm1hdChcIllZWVktTU0tREQgaGg6bW0gQVwiKVxuICAgICAgICAgICAgICAvL3dlIG5lZWQgdG8gZ2V0IHRoZSBjdXN0b21lciBcbiAgICAgICAgICAgICAgYXdiLmRvYy5jb25zaWduZWUgPSBjdXN0b21lcnNbaV0ubmFtZTsgXG4gICAgICAgICAgICAgIGF3Yi5kb2MucG1iID0gY3VzdG9tZXJzW2ldLnBtYjsgXG4gICAgICAgICAgICAgIGF3Yi5kb2Mud2VpZ2h0ID0gZGV0YWlsc1tpXS53ZWlnaHQ7IFxuICAgICAgICAgICAgICBhd2IuZG9jLmRlc2NyaXB0aW9uID0gZGV0YWlsc1tpXS5kZXNjcmlwdGlvbjsgXG4gICAgICAgICAgICAgIGF3Yi5kb2MucGllY2VzID0gZGV0YWlsc1tpXS5waWVjZXM7IFxuICAgICAgICAgICAgICBpZiAoY3VzdG9tZXJzW2ldLnBtYiA9PSAnJyl7XG4gICAgICAgICAgICAgICAgYXdiLmRvYy5wbWIgPSAnOTAwMCdcbiAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICBjb25zb2xlLmxvZygncHVzaGluZyAnLGF3YilcbiAgICAgICAgICAgICAgLy93ZSBuZWVkIHRvIGdldCBhbGwgdGhlIHBhY2thZ2VzIFxuICAgICAgICAgICAgICBhd2JMaXN0LnB1c2goYXdiLmRvYylcbiAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgcmVzb2x2ZSh7YXdiczphd2JMaXN0fSlcbiAgICAgICAgICAgfSlcbiAgICAgICAgICBcbiAgICAgICAgICB9KS5jYXRjaChlcnI9PntcbiAgICAgICAgICAgIGNvbnNvbGUubG9nKGVycik7IFxuICAgICAgICAgIH0pXG4gICAgICAgICBcbiAgICAgICAgLy8gIGF3YnMucmVzdWx0cy5mb3JFYWNoKGF3YiA9PiB7XG4gICAgICAgICAgIFxuICAgICAgICAgIFxuICAgICAgICAvLyAgfSk7XG4gICAgICAgICBcbiAgICAgICB9KVxuICAgIH0pXG4gIH1cbiAgZ2V0QXdiKGlkKXtcbiAgICBjb25zdCBzcnYgPSB0aGlzOyBcbiAgICByZXR1cm4gbmV3IFByb21pc2UoKHJlc29sdmUscmVqZWN0KT0+e1xuICAgICAgYXdiSW5kZXguZ2V0RG9jKGlkLChlcnIsYXdiKT0+e1xuICAgICAgICAvL2dldCB0aGUgY3VzdG9tZXIgXG4gICAgICAgIGN1c3RvbWVyU2VydmljZS5nZXRDdXN0b21lcihhd2IuZG9jLmN1c3RvbWVySWQpLnRoZW4oY3VzdG9tZXI9PntcbiAgICAgICAgICBhd2IuZG9jLmN1c3RvbWVyID0gY3VzdG9tZXI7IFxuICAgICAgICAgIHNydi5nZXRBd2JEZXRhaWxzKGlkKS50aGVuKHBhY2thZ2VzPT57XG4gICAgICAgICAgICAvL2dldCB0aGUgcGFja2FnZXMgZm9yIHRoZSBhd2IgXG4gICAgICAgICAgICBhd2IuZG9jLnBhY2thZ2VzID0gcGFja2FnZXM7IFxuICAgICAgICAgICAgcmVzb2x2ZSh7YXdiOmF3Yi5kb2N9KSAgXG4gICAgICAgICAgfSlcbiAgICAgICAgICBcbiAgICAgICAgfSlcbiAgICAgICAgXG4gICAgICB9KVxuICAgIH0pXG4gIH1cbiAgdXBkYXRlTG9jYXRpb24odHJhY2tpbmdOdW1iZXIsbG9jYXRpb25faWQpe1xuICAgIHJldHVybiBuZXcgUHJvbWlzZSgocmVzb2x2ZSxyZWplY3QpPT57XG4gICAgICBwYWNrYWdlSW5kZXguc2VhcmNoKFwiQHRyYWNraW5nTm86XCIrdHJhY2tpbmdOdW1iZXIse2xvY2F0aW9uOmxvY2F0aW9uX2lkfSwoZXJyLHBhY2thZ2VSZXN1bHQpPT57XG5cbiAgICAgIH0pXG4gICAgfSlcbiAgfVxuICBzYXZlUGFja2FnZVRvQXdiKG5ld1BhY2thZ2Upe1xuICAgIHJldHVybiBuZXcgUHJvbWlzZSgocmVzb2x2ZSxyZXN1bHQpPT57XG4gICAgICBkYXRhQ29udGV4dC5yZWRpc0NsaWVudC5pbmNyKFBLR19JRF9DT1VOVEVSLChlcnIsaWQpPT57XG4gICAgICAgIG5ld1BhY2thZ2UuaWQgPSBpZDsgXG4gICAgICAgIHBhY2thZ2VJbmRleC5hZGQoaWQsbmV3UGFja2FnZSwoZXJyLHJlc3VsdCk9PntcbiAgICAgICAgICBpZiAoZXJyKVxuICAgICAgICAgICAgY29uc29sZS5sb2coZXJyKTsgXG4gICAgICAgICAgcmVzb2x2ZSh7c2F2ZWQ6dHJ1ZSxpZDppZH0pXG4gICAgICAgIH0pXG4gICAgICB9KVxuICAgIH0pXG4gIH1cbiAgc2F2ZVBhY2thZ2UoYm9keSl7XG4gICAgcmV0dXJuIG5ldyBQcm9taXNlKChyZXNvbHZlLHJlamVjdCk9PntcbiAgICAgIHZhciBjUGFja2FnZSA9IHtcbiAgICAgICAgXG4gICAgICAgIHNreWJveDogYm9keS5za3lib3gsXG4gICAgICAgIGN1c3RvbWVyOiBib2R5LmN1c3RvbWVyLnJlcGxhY2UoXCItXCIsIFwiXCIpLnRyaW0oKSxcbiAgICAgICAgdHJhY2tpbmdObzogYm9keS50cmFja2luZyxcbiAgICAgICAgZGVzY3JpcHRpb246IGJvZHkuZGVzY3JpcHRpb24sXG4gICAgICAgIHNoaXBwZXI6IGJvZHkuc2hpcHBlcixcbiAgICAgICAgY2Fycmllcjpib2R5LmNhcnJpZXIsXG4gICAgICAgIHZhbHVlOiBOdW1iZXIoYm9keS52YWx1ZSksXG4gICAgICAgIHBpZWNlczogTnVtYmVyKGJvZHkucGllY2VzKSxcbiAgICAgICAgd2VpZ2h0OiBOdW1iZXIoYm9keS53ZWlnaHQpLFxuICAgICAgICBkaW1lbnNpb25zOiBib2R5LmRpbWVuc2lvbnMsXG4gICAgICAgIHN0YXR1czogMSxcbiAgICAgICAgbG9jYXRpb246IFwiRkxMXCIsXG4gICAgICAgIG1pZDogMCxcbiAgICAgICAgYXdiOjAsXG4gICAgICAgIC8vaGFzT3B0OiB0cnVlLFxuICAgICAgICAvL210eXBlOiBib2R5Lm10eXBlXG4gICAgICB9O1xuICAgICAgLy92YWxpZGF0ZSB0aGUgcGFja2FnZSBcbiAgICAgIGRhdGFDb250ZXh0LnJlZGlzQ2xpZW50LmluY3IoUEtHX0lEX0NPVU5URVIsKGVycixpZCk9PntcbiAgICAgICAgY1BhY2thZ2UuaWQgPSBpZDsgXG4gICAgICAgIGRhdGFDb250ZXh0LnJlZGlzQ2xpZW50LnNldChQS0dfUFJFRklYK2lkLGNQYWNrYWdlLChlcnIscmVzcG9uc2UpPT57XG4gICAgICAgICAgaWYgKGVycil7XG4gICAgICAgICAgICByZWplY3Qoe3NhdmVkOmZhbHNlLGVycjplcnJ9KVxuICAgICAgICAgIH1cbiAgICAgICAgICAgdmFyIGluZGV4UGFja2FnZSA9ICBjcmVhdGVEb2N1bWVudChjUGFja2FnZSk7IFxuICAgICAgICAgICBjb25zb2xlLmxvZyhpbmRleFBhY2thZ2UpOyBcbiAgICAgICAgICAgcGFja2FnZUluZGV4LmFkZChjUGFja2FnZS5pZCxpbmRleFBhY2thZ2UsKGVycjEsZG9jUmVzdWx0KT0+e1xuICAgICAgICAgICAgIGNvbnNvbGUubG9nKGRvY1Jlc3VsdCk7IFxuICAgICAgICAgICAgIGlmKGVycjEpe1xuICAgICAgICAgICAgICAgcmVqZWN0KHtzYXZlZDpmYWxzZSxlcnI6ZXJyMX0pXG4gICAgICAgICAgICAgfVxuICAgICAgICAgICAgIHJlc29sdmUoe3NhdmVkOnRydWV9KVxuICAgICAgICAgICB9KVxuXG4gICAgICAgIH0pXG4gICAgICB9KTtcbiAgICBcblxuXG4gICAgfSlcbiAgfVxuICBzYXZlUGFja2FnZU9sZChib2R5KSB7XG4gICAgXG4gICAgdmFyIHNlYXJjaGVyID0gdGhpcy5teVNlYXJjaDsgXG4gICAgcmV0dXJuIG5ldyBQcm9taXNlKChyZXNvbHZlLCByZWplY3QpID0+IHtcbiAgICAgIHZhciBjUGFja2FnZSA9IHtcbiAgICAgICAgc2t5Ym94OiBib2R5LnNreWJveCxcbiAgICAgICAgY3VzdG9tZXI6IGJvZHkuY3VzdG9tZXIucmVwbGFjZShcIi1cIiwgXCJcIikudHJpbSgpLFxuICAgICAgICB0cmFja2luZ05vOiBib2R5LnRyYWNraW5nLFxuICAgICAgICBkdXR5UGVyY2VudDogMC4yLFxuICAgICAgICBkZXNjcmlwdGlvbjogYm9keS5kZXNjcmlwdGlvbixcbiAgICAgICAgc2hpcHBlcjogYm9keS5zaGlwcGVyLFxuICAgICAgICB2YWx1ZTogTnVtYmVyKGJvZHkudmFsdWUpLFxuICAgICAgICBwaWVjZXM6IE51bWJlcihib2R5LnBpZWNlcyksXG4gICAgICAgIHdlaWdodDogTnVtYmVyKGJvZHkud2VpZ2h0KSxcbiAgICAgICAgc3RhdHVzOiAxLFxuICAgICAgICBsb2NhdGlvbjogXCJGTExcIixcbiAgICAgICAgbWlkOiBib2R5Lm1pZCxcbiAgICAgICAgaGFzT3B0OiB0cnVlLFxuICAgICAgICAvL210eXBlOiBib2R5Lm10eXBlXG4gICAgICB9O1xuICAgICAgY29uc29sZS5sb2coXCJhYm91dCB0byBzYXZlIHRoZSBwYWNrYWdlXCIpO1xuICAgICAgaWYgKHR5cGVvZiBjUGFja2FnZS5zaGlwcGVyID09PSBcInVuZGVmaW5lZFwiKSBjUGFja2FnZS5zaGlwcGVyID0gXCJcIjtcbiAgICAgIGlmICh0eXBlb2YgY1BhY2thZ2UuZGVzY3JpcHRpb24gPT09IFwidW5kZWZpbmVkXCIpXG4gICAgICAgIGNQYWNrYWdlLmRlc2NyaXB0aW9uID0gXCJcIjtcbiAgICAgIGNvbnNvbGUubG9nKGJvZHkpO1xuICAgICAgLy8gaWYgKE51bWJlcihib2R5LmlzQnVzaW5lc3MpID09IDEpIHtcbiAgICAgIC8vICAgY1BhY2thZ2UuaGFzT3B0ID0gZmFsc2U7XG4gICAgICAvLyB9XG4gICAgICAvL2NQYWNrYWdlID0gcGFja2FnZVV0aWwuY2FsY3VsYXRlRmVlcyhjUGFja2FnZSk7XG4gICAgICBjb25zb2xlLmxvZyhcInBhY2thZ2Ugd2l0aCBmZWVzXCIpO1xuXG4gICAgICAvL3dlIGFsc28gd2FudCB0byBjYWxjdWxhdGUgdGhlIHRoZSBwYWNrYWdlIGZlZXMgb25lIHRpbWUuLi4uLi5cbiAgICAgIC8vd2UgaGF2ZSB0aGUgcGFja2FnZSBkZXRhaWxzIGhlcmUgLi4gbm93IHdlIG5lZWQgdG8gZ2V0IHRoZSBleGlzdGluZyBwYWNrYWdlXG5cbiAgICAgXG4gICAgICAvL3dlIG5lZWQgdG8gY2hlY2sgdG8gc2VlIG9mIHRoZSBvd25lciBpcyBhIGJ1c2luZXNzIGhlcmVcbiAgICAgIGNvbnNvbGUubG9nKFwiaGVyZSBhYm91dCB0byBnZXQgdGhlIHBhY2thZ2VcIilcbiAgICAgIGxyZWRpcy5nZXRQYWNrYWdlKGNQYWNrYWdlLnRyYWNraW5nTm8pLnRoZW4ocCA9PiB7XG4gICAgICAgIGNvbnNvbGUubG9nKCdwIGlzIHRoZSAnLHApOyBcbiAgICAgICAgaWYgKHApIHtcbiAgICAgICAgICB2YXIgY3VycmVudENvbnRhaW5lciA9IGBtYW5pZmVzdDoke3AubWlkfToke3AubXR5cGV9OiR7Y29udGFpbmVyfTpgO1xuICAgICAgICAgIGNvbnNvbGUubG9nKFwiZm91bmQgcGFja2FnZSBcIik7XG4gICAgICAgICAgY29uc29sZS5sb2cocCk7XG4gICAgICAgICAgaWYgKGNvbnRhaW5lciA9PSBcImJhZ1wiKSB7XG4gICAgICAgICAgICAvL2NoZWNrIHRvIHNlZSBpZiB0aGUgYmFjayBubyBpcyB0aGUgc2FtZS5cbiAgICAgICAgICAgIGlmIChwLmJhZyAhPSBjUGFja2FnZS5iYWcpIHtcbiAgICAgICAgICAgICAgLy9yZW1vdmUgaXQgZnJvbSB0aGUgb3JpZ2luYWwgbGlzdFxuICAgICAgICAgICAgICBscmVkaXMuc3JlbShjdXJyZW50Q29udGFpbmVyICsgcC5iYWcsIHAudHJhY2tpbmdObyk7XG4gICAgICAgICAgICAgIGNvbnNvbGUubG9nKFxuICAgICAgICAgICAgICAgIFwicmVtb3ZlIHBhY2thZ2UgZnJvbSBjdXJyZW50IHNldCBcIiArIGN1cnJlbnRDb250YWluZXJcbiAgICAgICAgICAgICAgKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgLy9jaGVjayB0byBzZWUgaWYgdGhlIHNraWQgbnVtYmVyIGlzIHRoZSBzYW1lLlxuICAgICAgICAgICAgaWYgKHAuc2tpZCAhPSBjUGFja2FnZS5za2lkKSB7XG4gICAgICAgICAgICAgIC8vcmVtb3ZlIGl0IGZyb20gdGhlIG9yaWdpbmFsIGxpc3RcbiAgICAgICAgICAgICAgbHJlZGlzLnNyZW0oY3VycmVudENvbnRhaW5lciArIHAuc2tpZCwgcC50cmFja2luZ05vKTtcbiAgICAgICAgICAgICAgY29uc29sZS5sb2coXG4gICAgICAgICAgICAgICAgXCJyZW1vdmUgcGFja2FnZSBmcm9tIGN1cnJlbnQgc2V0IFwiICsgY3VycmVudENvbnRhaW5lclxuICAgICAgICAgICAgICApO1xuICAgICAgICAgICAgfVxuICAgICAgICAgIH1cbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAvLyB0aGUgcGFja2FnZSBkb2Vzbid0IGV4aXN0IHVwZGF0ZSB0aGUgY291bnRlclxuICAgICAgICAgIGxyZWRpcy5jbGllbnQuaW5jcihcIm1jb3VudGVyOlwiICsgY1BhY2thZ2UubWlkKTtcbiAgICAgICAgICBcbiAgICAgICAgfVxuXG4gICAgICAgIGxyZWRpc1xuICAgICAgICAgIC5obXNldChcInBhY2thZ2VzOlwiICsgY1BhY2thZ2UudHJhY2tpbmdObywgY1BhY2thZ2UpXG4gICAgICAgICAgLnRoZW4oZnVuY3Rpb24ocmVzdWx0KSB7XG4gICAgICAgICAgICAvL2FkZCB0byBxdWV1ZSBmb3IgcGVyc2lzdGVudCBwcm9jZXNzaW5nXG4gICAgICAgICAgICBcbiAgICAgICAgICAgIHZhciBtYW5pZmVzdEtleSA9IGBtYW5pZmVzdDoke2NQYWNrYWdlLm1pZH06JHtcbiAgICAgICAgICAgICAgY1BhY2thZ2UubXR5cGVcbiAgICAgICAgICAgIH06JHtjb250YWluZXJ9OiR7Y29udGFpbmVyTm99YDtcbiAgICAgICAgICAgIGNvbnNvbGUubG9nKFwiYWJvdXQgdG8gY3JlYXRlIHRoZSBkb2N1bWVudC4uLi5cIik7XG4gICAgICAgICAgICBhZGRQYWNrYWdlVG9JbmRleChjUGFja2FnZS50cmFja2luZ05vLHNlYXJjaGVyKTsgXG4gICAgICAgICAgICBjb25zb2xlLmxvZyhcImFkZGVkIHRoZSBwYWNrYWdlIHRvIGluZGV4XCIpO1xuICAgICAgICAgICAgbHJlZGlzXG4gICAgICAgICAgICAgIC5zZXRBZGQobWFuaWZlc3RLZXksIGNQYWNrYWdlLnRyYWNraW5nTm8pXG4gICAgICAgICAgICAgIC50aGVuKGZ1bmN0aW9uKHNSZXN1bHQpIHtcbiAgICAgICAgICAgICAgICAvL2dldCB0aGUgbWVtYmVycyBvbmUgdGltZSBoZXJlXG4gICAgICAgICAgICAgICAgY29uc29sZS5sb2coXCJhZGRlZCB0aGUgcGFja2FnZSB0byB0aGUgc2V0XCIpO1xuICAgICAgICAgICAgICAgIGNvbnNvbGUubG9nKG1hbmlmZXN0S2V5KTtcbiAgICAgICAgICAgICAgICBscmVkaXNcbiAgICAgICAgICAgICAgICAgIC5nZXRNZW1iZXJzKG1hbmlmZXN0S2V5KVxuICAgICAgICAgICAgICAgICAgLnRoZW4oZGF0YSA9PiB7XG4gICAgICAgICAgICAgICAgICAgIGNvbnNvbGUubG9nKFwiZGF0YVwiKTtcbiAgICAgICAgICAgICAgICAgICAgY29uc29sZS5sb2coZGF0YSk7XG4gICAgICAgICAgICAgICAgICAgIFByb21pc2UuYWxsKGRhdGEubWFwKGxyZWRpcy5nZXRQYWNrYWdlKSk7XG4gICAgICAgICAgICAgICAgICB9KVxuICAgICAgICAgICAgICAgICAgLnRoZW4oZnVuY3Rpb24ocmRhdGEpIHtcbiAgICAgICAgICAgICAgICAgICAgLy93ZSBuZWVkIHRvIGFsZXJ0IHRoZSBwZXJzb24gdGhhdCB0aGUgcGFja2FnZSBpcyBoZXJlIHNvIHJlYWQgZW1haWwgZXRjLlxuICAgICAgICAgICAgICAgICAgICAvL2FkZCB0byB0aGUgaW5kZXhcbiAgICAgICAgICAgICAgICAgICAgY29uc29sZS5sb2coXCJkYXRhXCIpO1xuICAgICAgICAgICAgICAgICAgICBjb25zb2xlLmxvZyhyZGF0YSk7XG5cbiAgICAgICAgICAgICAgICAgICAgcmVzb2x2ZSh7XG4gICAgICAgICAgICAgICAgICAgICAgc2F2ZWQ6IHRydWUsXG4gICAgICAgICAgICAgICAgICAgICAgcGFja2FnZXM6IHJkYXRhLFxuICAgICAgICAgICAgICAgICAgICAgIHNQYWNrYWdlOiBjUGFja2FnZVxuICAgICAgICAgICAgICAgICAgICB9KTtcbiAgICAgICAgICAgICAgICAgIH0pXG4gICAgICAgICAgICAgICAgICAuY2F0Y2goZXJyMyA9PiB7XG4gICAgICAgICAgICAgICAgICAgIGNvbnNvbGUubG9nKGVycjMpO1xuICAgICAgICAgICAgICAgICAgICByZWplY3Qoe1xuICAgICAgICAgICAgICAgICAgICAgIGVycjogZXJyMyxcbiAgICAgICAgICAgICAgICAgICAgICBzYXZlZDogdHJ1ZSxcbiAgICAgICAgICAgICAgICAgICAgICBsaXN0aW5nOiBmYWxzZVxuICAgICAgICAgICAgICAgICAgICB9KTtcbiAgICAgICAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgICB9KVxuICAgICAgICAgICAgICAuY2F0Y2goZnVuY3Rpb24oZXJyKSB7XG4gICAgICAgICAgICAgICAgcmVzb2x2ZSh7XG4gICAgICAgICAgICAgICAgICBzYXZlZDogZmFsc2VcbiAgICAgICAgICAgICAgICB9KTtcbiAgICAgICAgICAgICAgfSk7XG4gICAgICAgICAgfSlcbiAgICAgICAgICAuY2F0Y2goZnVuY3Rpb24oZXJyMikge1xuICAgICAgICAgICAgcmVqZWN0KHtcbiAgICAgICAgICAgICAgc2F2ZWQ6IGZhbHNlXG4gICAgICAgICAgICB9KTtcbiAgICAgICAgICB9KTtcblxuICAgICAgICAvL3NhdmUgdGhlIHBhY2thZ2UgdG8gdGhlIHBhY2thZ2UgTlNcbiAgICAgIH0pLmNhdGNoKGVycjIzMj0+e1xuICAgICAgICBjb25zb2xlLmxvZyhlcnIyMzIpXG4gICAgICB9KTtcbiAgICB9KTtcbiAgfSBcbiAgZ2V0TWFuaWZlc3RQYWNrYWdlcygpe1xuICAgIHJldHVybiBuZXcgUHJvbWlzZSgocmVzb2x2ZSxyZWplY3QpPT57XG4gICAgICBcbiAgICAgIHRoaXMubXlTZWFyY2guc2VhcmNoKFxuICAgICAgICBgQG1pZDpbMCAwXWAsXG4gICAgICAgIHsgb2Zmc2V0OiAwLCBudW1iZXJPZlJlc3VsdHM6IDUwMDAgfSxcbiAgICAgICAgKGVyciwgZGF0YSkgPT4ge1xuICAgICAgICAgIHZhciBwYWNrYWdlcyA9IFtdO1xuICAgICAgICAgIGNvbnNvbGUubG9nKGRhdGEpO1xuICAgICAgICAgIGRhdGEucmVzdWx0cy5mb3JFYWNoKGVsZW1lbnQgPT4ge1xuXG4gICAgICAgICAgICBwYWNrYWdlcy5wdXNoKGVsZW1lbnQuZG9jKTtcbiAgICAgICAgICAgIHJlc29sdmUocGFja2FnZXMpOyAgICAgICAgICAgICAgICAgXG4gICAgICAgIH0pO1xuICAgIH0pO1xuICAgIH0pXG4gIH1cbiAgZ2V0UmVjZWl2ZWRQYWNrYWdlcyhwYWdlLHBhZ2VTaXplKXtcbiAgICByZXR1cm4gbmV3IFByb21pc2UoKHJlc29sdmUscmVqZWN0KT0+e1xuICAgICAgXG4gICAgICB0aGlzLm15U2VhcmNoLnNlYXJjaChcbiAgICAgICAgYEBtaWQ6WzAgMF1gLFxuICAgICAgICB7IG9mZnNldDogMCwgbnVtYmVyT2ZSZXN1bHRzOiA1MDAwIH0sXG4gICAgICAgIChlcnIsIGRhdGEpID0+IHtcbiAgICAgICAgICB2YXIgcGFja2FnZXMgPSBbXTtcbiAgICAgICAgICBjb25zb2xlLmxvZyhkYXRhKTtcbiAgICAgICAgICBkYXRhLnJlc3VsdHMuZm9yRWFjaChlbGVtZW50ID0+IHtcblxuICAgICAgICAgICAgcGFja2FnZXMucHVzaChlbGVtZW50LmRvYyk7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgXG4gICAgICAgIH0pO1xuICAgICAgICByZXNvbHZlKHBhY2thZ2VzKTsgXG4gICAgfSk7XG4gICAgfSlcbiAgfVxuICBnZXROb0RvY3NQYWNrYWNrYWdlcyhwYWdlLHBhZ2VTaXplKXtcbiAgICByZXR1cm4gbmV3IFByb21pc2UoKHJlc29sdmUscmVqZWN0KT0+e1xuICAgICAgXG4gICAgICB0aGlzLm15U2VhcmNoLnNlYXJjaChcbiAgICAgICAgYEBoYXNEb2NzOlswIDBdYCxcbiAgICAgICAgeyBvZmZzZXQ6IDAsIG51bWJlck9mUmVzdWx0czogNTAwMCB9LFxuICAgICAgICAoZXJyLCBkYXRhKSA9PiB7XG4gICAgICAgICAgdmFyIHBhY2thZ2VzID0gW107XG4gICAgICAgICAgY29uc29sZS5sb2coZGF0YSk7XG4gICAgICAgICAgZGF0YS5yZXN1bHRzLmZvckVhY2goZWxlbWVudCA9PiB7XG5cbiAgICAgICAgICAgIHBhY2thZ2VzLnB1c2goZWxlbWVudC5kb2MpO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIFxuICAgICAgICB9KTtcbiAgICAgICAgcmVzb2x2ZShwYWNrYWdlcyk7IFxuICAgIH0pO1xuICAgIH0pXG4gIH1cbiAgZ2V0UGFja2FnZUJ5SWQoYmFyY29kZSl7XG4gICAgdmFyIHNydiA9IHRoaXM7IFxuICAgIHZhciBwa2dJZCA9IGdldFBhY2thZ2VJZEZyb21CYXJDb2RlKGJhcmNvZGUpOyBcbiAgICByZXR1cm4gbmV3IFByb21pc2UoKHJlc29sdmUscmVqZWN0KT0+e1xuICAgICAgdGhpcy5teVNlYXJjaC5nZXREb2MocGtnSWQsKGVycixkb2N1bWVudCk9PntcbiAgICAgICAgLy9nZXQgdGhlIGF3YiBpbmZvIGhlcmUgYXMgd2VsbCBcbiAgICAgICAgc3J2LmdldEF3Yihkb2N1bWVudC5kb2MuYXdiKS50aGVuKGF3YmluZm89PntcbiAgICAgICAgICBjb25zb2xlLmxvZyhhd2JpbmZvKTsgXG4gICAgICAgICAgdmFyIHJlc3BvbnNlID0geyBcbiAgICAgICAgICAgIGF3YiA6IGF3YmluZm8uYXdiLFxuICAgICAgICAgICAgcGFja2FnZSA6IGRvY3VtZW50LmRvY1xuICAgICAgICAgIH1cbiAgICAgICAgICByZXNvbHZlKHJlc3BvbnNlKTsgXG4gICAgICAgIH0pOyBcbiAgICAgICAgXG4gICAgICB9KVxuICAgIH0pOyBcbiAgfVxuICAvL3VzaW5nIHRoaXMgXG4gIFxuXG4gIHVwZGF0ZU1hbmlmZXN0UGFja2FnZVRvSW5UcmFuc2l0KG1pZCkge1xuICAgIC8vZ2V0IGFsbCB0aGUgcGFja2FnZXNcbiAgICAvL3dlIG5lZWQgdG8gdXBkYXRlIHRoZSBpbmRleCBhdCB0aGlzIHBvaW50IGFzIHdlbGxcbiAgICB2YXIgbXNlYXJjaCA9IHRoaXMubXlTZWFyY2g7XG4gICAgdGhpcy5teVNlYXJjaC5zZWFyY2goXG4gICAgICBgQG1pZDpbJHttaWR9ICR7bWlkfV1gLFxuICAgICAgeyBvZmZzZXQ6IDAsIG51bWJlck9mUmVzdWx0czogNTAwMCB9LFxuICAgICAgKGVyciwgZGF0YSkgPT4ge1xuICAgICAgICB2YXIgcGFja2FnZXMgPSBbXTtcbiAgICAgICAgY29uc29sZS5sb2coZGF0YSk7XG4gICAgICAgIGRhdGEucmVzdWx0cy5mb3JFYWNoKGVsZW1lbnQgPT4ge1xuICAgICAgICAgIHZhciBvbGREb2NJZCA9IGVsZW1lbnQuZG9jSWQ7XG4gICAgICAgICAgZWxlbWVudC5kb2NJZCA9IGVsZW1lbnQuZG9jSWQucmVwbGFjZShgJHttaWR9LWAsIFwiXCIpO1xuICAgICAgICAgIHBhY2thZ2VzLnB1c2goZWxlbWVudC5kb2NJZCk7XG4gICAgICAgICAgLy8gaSBjb3VsZCBkZWxldGUgaGVyZVxuICAgICAgICAgIC8vIG1zZWFyY2guZGVsRG9jdW1lbnQoUEtHX0lEWCxvbGREb2NJZClcbiAgICAgICAgICAvL3VwZGF0ZSBhbGwgdGhlIHBhY2thZ2VzXG4gICAgICAgIH0pO1xuICAgICAgICBzZXRQYWNrYWdlSW5UcmFuc2l0KHBhY2thZ2VzLCBtc2VhcmNoLCBtaWQpLnRoZW4oZnVuY3Rpb24oXG4gICAgICAgICAgdXBkYXRlZFBhY2thZ2VzXG4gICAgICAgICkge1xuICAgICAgICAgIGNvbnNvbGUubG9nKFwidXBkYXRlZCBwYWNrYWdlc1wiKTtcbiAgICAgICAgICBjb25zb2xlLmxvZyh1cGRhdGVkUGFja2FnZXMpO1xuICAgICAgICB9KTtcbiAgICAgIH1cbiAgICApO1xuICB9XG4gIHJlbW92ZVBhY2thZ2VGcm9tTWFuaWZlc3QocGFja2FnZUlkLCBtaWQpIHtcbiAgICB2YXIgbXNlYXJjaCA9IHRoaXMubXlTZWFyY2g7XG4gICAgcmV0dXJuIG5ldyBQcm9taXNlKChyZXNvbHZlLCByZWplY3QpID0+IHtcbiAgICAgIHZhciBtYW5pZmVzdCA9IG1pZDtcbiAgICAgIHZhciBtYW5pZmVzdEtleSA9IFwibWFuaWZlc3Q6XCIgKyBtYW5pZmVzdCArIFwiOipcIjtcblxuICAgICAgbHJlZGlzLmRlbChcInBhY2thZ2VzOlwiICsgdHJhY2tpbmdObykudGhlbihmdW5jdGlvbihyZXN1bHQpIHtcbiAgICAgICAgY29uc29sZS5sb2cocmVzdWx0KTtcbiAgICAgICAgbXNlYXJjaC5kZWxEb2N1bWVudChQS0dfSURYLCBgJHttaWR9LSR7dHJhY2tpbmdOb31gKTtcbiAgICAgICAgLy93ZSBuZWVkIHRvIHJlbW92ZSBmcm9tIHRoZSBpbmRleCBhbmQgZGVjIHRoZSBjb3VudGVyXG4gICAgICAgIGxyZWRpcy5jbGllbnQuZGVjcihcIm1jb3VudGVyOlwiICsgbWlkKTtcbiAgICAgICAgLy9yU2VydmljZXMucGFja2FnZVNlcnZpY2Uucm1QYWNrYWdlKG1pZCwgdHJhY2tpbmdObyk7XG4gICAgICAgIGxyZWRpcy5nZXRLZXlzKG1hbmlmZXN0S2V5KS50aGVuKGtSZXN1bHQgPT4ge1xuICAgICAgICAgIC8vdGhlIGxpc3Qgb2YgYWxsIHRoZSBzZXRzIC4uLndlIG5lZWQgdG8gcmVtb3ZlIHRoZSBrZXkgZnJvbSBlYWNoIG9uZVxuICAgICAgICAgIHZhciBrZXlzQ291bnQgPSAwO1xuXG4gICAgICAgICAga1Jlc3VsdC5mb3JFYWNoKGVsZW1lbnQgPT4ge1xuICAgICAgICAgICAgY29uc29sZS5sb2coXG4gICAgICAgICAgICAgIGByZW1vdmluZyAke3RyYWNraW5nTm99IHBhY2thZ2UgbWFuaWZlc3Qgc2V0ICR7ZWxlbWVudH0gYFxuICAgICAgICAgICAgKTtcbiAgICAgICAgICAgIGxyZWRpcy5zcmVtKGVsZW1lbnQsIHRyYWNraW5nTm8pLnRoZW4oZnVuY3Rpb24oclJlc3VsdCkge1xuICAgICAgICAgICAgICBjb25zb2xlLmxvZyhyUmVzdWx0KTtcbiAgICAgICAgICAgICAgY29uc29sZS5sb2coXCJyZW1vdmVkXCIpO1xuICAgICAgICAgICAgICBpZiAoa2V5c0NvdW50ID09IGtSZXN1bHQubGVuZ3RoIC0gMSkga2V5c0NvdW50Kys7XG4gICAgICAgICAgICB9KTtcbiAgICAgICAgICB9KTtcbiAgICAgICAgICByZXNvbHZlKHtcbiAgICAgICAgICAgIGRlbGV0ZWQ6IHRydWVcbiAgICAgICAgICB9KTtcbiAgICAgICAgfSk7XG5cbiAgICAgICAgLy93ZSBhbHNvIG5lZWQgdG8gcmVtb3ZlIGZyb20gYW55IHNldHNcbiAgICAgIH0pO1xuICAgIH0pO1xuICB9XG4gIHJlbW92ZVBhY2thZ2VCeUlkKGlkKSB7XG4gICAgdmFyIG1zZWFyY2ggPSB0aGlzLm15U2VhcmNoO1xuICAgIHJldHVybiBuZXcgUHJvbWlzZSgocmVzb2x2ZSwgcmVqZWN0KSA9PiB7XG4gICAgXG4gICAgICByZWRpU2VhcmNoLmRlbERvY3VtZW50KFBLR19JRFgsaWQsKGVycixyZXNwb25zZSk9PntcbiAgICAgICAgcmVzb2x2ZSh7ZGVsZXRlZDp0cnVlfSlcbiAgICAgIH0pXG4gICAgICBcbiAgICAgICAgXG4gICAgICBcbiAgICB9KTtcbiAgfVxuICBzdG9yZVBhY2thZ2VGb3JQaWNrdXAodHJhY2tpbmdObyxiaW4pe1xuICAgIHZhciBzZWFyY2hlciA9IHRoaXMubXlTZWFyY2g7XG4gICAgcmV0dXJuIG5ldyBQcm9taXNlKChyZXNvbHZlLHJlamVjdCk9PntcbiAgICAgICBscmVkaXMuaG1zZXQoUEtHX1BSRUZJWCt0cmFja2luZ05vLHtzdGF0dXM6NCxsb2NhdGlvbjpiaW59KS50aGVuKChyZXN1bHQpPT57XG4gICAgICAgICBscmVkaXMuZ2V0UGFja2FnZSh0cmFja2luZ05vKS50aGVuKChwa2cpPT57XG4gICAgICAgICAgYWRkUGFja2FnZVRvSW5kZXgodHJhY2tpbmdObyxzZWFyY2hlcikgOyBcbiAgICAgICAgICByZXNvbHZlKHBrZyk7ICAgXG4gICAgICAgICB9KTtcbiAgICAgICB9KSBcbiAgICB9KTsgXG4gIH1cbiAgdXBkYXRlUGFja2FnZUluZGV4KHRyYWNraW5nKXtcbiAgICAgIHJldHVybiBuZXcgUHJvbWlzZSgocmVzb2x2ZSxyZWplY3QpPT57XG4gICAgICAgICAgdmFyIG1zZWFyY2ggPSB0aGlzLm15U2VhcmNoOyBcbiAgICAgICAgICBhZGRQYWNrYWdlVG9JbmRleCh0cmFja2luZyxtc2VhcmNoKTsgXG4gICAgICAgICByZXNvbHZlKHsndXBkYXRlZCc6dHJ1ZX0pO1xuICAgICAgfSlcbiAgfVxuICBnZXRDdXN0b21lclBhY2thZ2VzKHNreWJveCkge31cbiAgZ2V0TWFuaWZlc3RQYWNrYWdlc0J5U3RhdHVzKG1pZCxzdGF0dXMpIHtcbiAgICAgIHJldHVybiBuZXcgUHJvbWlzZSgocmVzb2x2ZSxyZWplY3QpPT57XG4gICAgICAgICAgY29uc29sZS5sb2coYEBtaWQ6WyR7bWlkfSAke21pZH1dIEBzdGF0dXM9WyR7c3RhdHVzfSAke3N0YXR1c31dYClcbiAgICAgICAgdGhpcy5teVNlYXJjaC5zZWFyY2goXG4gICAgICAgICAgICBgQG1pZDpbJHttaWR9ICR7bWlkfV0gQHN0YXR1czpbJHtzdGF0dXN9ICR7c3RhdHVzfV1gLFxuICAgICAgICAgICAgeyBvZmZzZXQ6IDAsIG51bWJlck9mUmVzdWx0czogNTAwMCB9LFxuICAgICAgICAgICAgKGVyciwgZGF0YSkgPT4ge1xuICAgICAgICAgICAgICB2YXIgcGFja2FnZXMgPSBbXTtcbiAgICAgICAgICAgICAgY29uc29sZS5sb2coZGF0YSk7XG4gICAgICAgICAgICAgIGRhdGEucmVzdWx0cy5mb3JFYWNoKGVsZW1lbnQgPT4ge1xuXG4gICAgICAgICAgICAgICAgcGFja2FnZXMucHVzaChlbGVtZW50LmRvYyk7XG4gICAgICAgICAgICAgICAgcmVzb2x2ZShwYWNrYWdlcyk7ICAgICAgICAgICAgICAgICBcbiAgICAgICAgICAgIH0pO1xuICAgICAgICB9KTtcbiAgICAgIH0pO1xuICBcbiAgfSAgIFxuICBcbiAgXG5cbiAgIC8vI3JlZ2lvbiBNYW5pZmVzdCBQYWNrYWdlIEZ1bmN0aW9ucyBcblxuICAgYWRkVG9GbGlnaHQoYWN0aW9uKXtcbiAgICByZXR1cm4gbmV3IFByb21pc2UoKHJlc29sdmUscmVqZWN0KT0+e1xuICAgICAgdmFyIHBhY2thZ2VObyA9IGdldFBhY2thZ2VJZEZyb21CYXJDb2RlKGFjdGlvbi5iYXJjb2RlKTsgXG4gICAgICB0aGlzLm15U2VhcmNoLnVwZGF0ZShwYWNrYWdlTm8se21pZDphY3Rpb24ubWlkICwgc3RhdHVzOiAyLCBsb2NhdGlvbjpcIkxvYWRlZCBvbiBBaXJDcmFmdFwifSwoZXJyLHJlc3VsdCk9PntcbiAgICAgICAgaWYoZXJyKVxuICAgICAgICAgIHJlc29sdmUoe2FkZGVkOmZhbHNlfSlcbiAgICAgICAgXG4gICAgICAgIHJlc29sdmUoe2FkZGVkOnRydWV9KVxuICAgICAgfSlcbiAgICAgICAgXG4gICAgfSlcbiAgIH1cbiAgIC8vcmVtb3ZlIGZyb20gZmxpZ2h0IFxuICAgcmVtb3ZlRnJvbUZsaWdodChhY3Rpb24pe1xuICAgIHJldHVybiBuZXcgUHJvbWlzZSgocmVzb2x2ZSxyZWplY3QpPT57XG4gICAgICAgIHZhciBwYWNrYWdlTm8gPSBnZXRQYWNrYWdlSWRGcm9tQmFyQ29kZShhY3Rpb24uYmFyY29kZSk7ICAgXG4gICAgICAgIHRoaXMubXlTZWFyY2gudXBkYXRlKHBhY2thZ2VObyx7bWlkOmFjdGlvbi5taWR9LChlcnIscmVzdWx0KT0+e1xuICAgICAgICBpZihlcnIpXG4gICAgICAgICAgICByZXNvbHZlKHtyZW1vdmVkOmZhbHNlfSlcbiAgICAgICAgICBcbiAgICAgICAgICByZXNvbHZlKHtyZW1vdmVkOnRydWV9KVxuICAgICAgICB9KVxuICAgIH0pXG4gICB9XG4gICByZWNGcm9tVHJ1Y2sodHJhY2tpbmdObyl7XG4gICAgIHJldHVybiBuZXcgUHJvbWlzZSgocmVzb2x2ZSxyZWplY3QpPT57XG4gICAgIFxuICAgICAgICBkYXRhQ29udGV4dC5yZWRpc0NsaWVudC5zZXQoUkVDX1BLRyt0cmFja2luZ05vLG1vbWVudCgpLnVuaXgoKSwgKGVycixyZXN1bHQpPT57XG4gICAgICAgICAgaWYgKGVycikgcmVzb2x2ZSh7c2F2ZWQ6ZmFsc2V9KVxuICAgICAgICAgIHJlc29sdmUoe3NhdmVkOnRydWV9KVxuICAgICAgICB9KVxuICAgICB9KVxuICAgfVxuXG4gICByZWNGcm9tUGxhbmVOYXMoYmFyY29kZSl7XG4gICAgIHJldHVybiBuZXcgUHJvbWlzZSgocmVzb2x2ZSxyZWplY3QpPT57XG4gICAgICAgdmFyIHNydiA9IHRoaXMgOyBcbiAgICAgICB2YXIgcGtnSWQgPSBnZXRQYWNrYWdlSWRGcm9tQmFyQ29kZShiYXJjb2RlKTsgXG4gICAgICAgIHNydi5teVNlYXJjaC5nZXREb2MocGtnSWQsKGVycixwa2cpPT57XG4gICAgICAgICAgICBwa2cuZG9jLnN0YXR1cyA9IDQ7IFxuICAgICAgICAgICAgcGtnLmRvYy5sb2NhdGlvbiAgPSBcIldhcmVob3VzZSBOQVNcIjsgXG4gICAgICAgICAgICBzcnYubXlTZWFyY2gudXBkYXRlKHBrZ0lkLHBrZy5kb2MsKGVycix1cGRhdGVSZXN1bHQpPT57XG4gICAgICAgICAgICAgIGlmKGVycilcbiAgICAgICAgICAgICAgICByZWplY3Qoe3VwZGF0ZWQ6ZmFsc2V9KVxuICAgICAgICAgICAgICByZXNvbHZlKHt1cGRhdGVkOnRydWV9KVxuICAgICAgICAgICAgfSlcbiAgICAgICAgfSlcbiAgICAgfSlcbiAgIH1cbiAgIC8vI2VuZHJlZ2lvblxufVxuXG5mdW5jdGlvbiBnZXRQYWNrYWdlSWRGcm9tQmFyQ29kZShiYXJDb2RlVmFsdWUpe1xuICB2YXIgcGFydHMgPSBiYXJDb2RlVmFsdWUuc3BsaXQoXCItXCIpOyBcbiAgaWYgKHBhcnRzLmxlbmd0aCA9PSAzKVxuICAgIGlmICh0eXBlb2YgcGFydHNbMl0gIT0gXCJ1bmRlZmluZWRcIilcbiAgICByZXR1cm4gcGFydHNbMl0udHJpbSgpOyBcbiAgcmV0dXJuIFwiXCJcbn1cbiJdfQ==
