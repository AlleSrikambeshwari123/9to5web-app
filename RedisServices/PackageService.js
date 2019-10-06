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
  2: "In Transit",
  3: "Processing",
  4: "Ready for Pickup / Delivery",
  5: "Out for Delivery",
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
        _this8.mySearch.update(packageNo, { mid: action.mid }, function (err, result) {
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
    //#endregion

  }]);

  return PackageService;
}();

function getPackageIdFromBarCode(barCodeValue) {
  var parts = barCodeValue.split("-");
  if (parts.length == 3) if (typeof parts[2] != "undefined") return parts[2].trim();
  return "";
}
//# sourceMappingURL=data:application/json;charset=utf8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIlJlZGlzU2VydmljZXMvUGFja2FnZVNlcnZpY2UuZXM2Il0sIm5hbWVzIjpbInJlZGlzIiwicmVxdWlyZSIsImxyZWRpcyIsIm1vbWVudCIsInJlZGlzU2VhcmNoIiwiZnMiLCJQYWNrYWdlVXRpbCIsIlBhY2thZ2VVdGlsaXR5IiwicGFja2FnZVV0aWwiLCJQS0dfSURYIiwiUEtHX0lEX0NPVU5URVIiLCJkYXRhQ29udGV4dCIsIlBLR19QUkVGSVgiLCJBV0JfSUQiLCJJTkRFWF9BV0IiLCJSRUNfUEtHIiwiQ3VzdG9tZXJTZXJ2aWNlIiwiY3VzdG9tZXJTZXJ2aWNlIiwiUEtHX1NUQVRVUyIsImF3YkluZGV4IiwiY2xpZW50T3B0aW9ucyIsInNlYXJjaENsaWVudERldGFpbHMiLCJwYWNrYWdlSW5kZXgiLCJnZXRQYWNrYWdlVm9sdW1uZSIsIm1QYWNrYWdlIiwiY3JlYXRlRG9jdW1lbnQiLCJ0UGFja2FnZSIsInBhY2thZ2VEb2N1bWVudCIsImlkIiwidHJhY2tpbmdObyIsInNreWJveCIsImRhdGVSZWNpZXZlZCIsInVuaXgiLCJhd2IiLCJtaWQiLCJ2b2x1bWUiLCJ3ZWlnaHQiLCJwaWVjZXMiLCJjdXN0b21lciIsInNoaXBwZXIiLCJkZXNjcmlwdGlvbiIsImRpbWVuc2lvbnMiLCJjYXJyaWVyIiwic3RhdHVzIiwidmFsdWUiLCJjb25zb2xlIiwibG9nIiwic2V0UGFja2FnZUluVHJhbnNpdCIsImtleXMiLCJtc2VhcmNoZXIiLCJQcm9taXNlIiwicmVzb2x2ZSIsInJlamVjdCIsImJhdGNoZXIiLCJjbGllbnQiLCJiYXRjaCIsImZvckVhY2giLCJsb2NhdGlvbiIsImVsZW1lbnQiLCJobXNldCIsImV4ZWMiLCJlcnIiLCJyZXN1bHQiLCJhZGRQYWNrYWdlVG9JbmRleCIsImdldFBhY2thZ2UiLCJ0aGVuIiwiZGVsRG9jdW1lbnQiLCJwYWNrIiwiZG9uZSIsImRvY3VtZW50IiwiYWRkIiwiUGFja2FnZVNlcnZpY2UiLCJzZXR1cEluZGV4IiwibXlTZWFyY2giLCJyZWRpc0NsaWVudCIsImV4aXN0cyIsInNldCIsImluaXRSZXN1bHQiLCJpbmNyIiwibmV3SWQiLCJ0b1N0cmluZyIsInJlcGx5IiwiaW52b2ljZSIsImhhc0RvY3MiLCJkYXRlQ3JlYXRlZCIsImVycjEiLCJhd2JSZXMiLCJzYXZlZCIsInNlYXJjaCIsIm51bWJlck9mUmVzdWx0cyIsIm9mZnNldCIsInBhY2thZ2VzIiwidG90YWxSZXN1bHRzIiwicmVzdWx0cyIsInBhY2thZ2UxIiwiZG9jIiwiTnVtYmVyIiwiZGF0YSIsInNydiIsInBhY2thZ2VsaXN0IiwiY291bnQiLCJsZW5ndGgiLCJzdWJzdHJpbmciLCJwdXNoIiwic29ydEJ5IiwiYXdicyIsImF3Ykxpc3QiLCJhbGwiLCJtYXAiLCJnZXRDdXN0b21lciIsImN1c3RvbWVySWQiLCJnZXRBd2JPdmVydmlldyIsImN1c3RvbWVycyIsImkiLCJmb3JtYXQiLCJjb25zaWduZWUiLCJuYW1lIiwiZGV0YWlscyIsInBtYiIsImNhdGNoIiwiZ2V0RG9jIiwiZ2V0QXdiRGV0YWlscyIsInRyYWNraW5nTnVtYmVyIiwibG9jYXRpb25faWQiLCJwYWNrYWdlUmVzdWx0IiwibmV3UGFja2FnZSIsImJvZHkiLCJjUGFja2FnZSIsInJlcGxhY2UiLCJ0cmltIiwidHJhY2tpbmciLCJyZXNwb25zZSIsImluZGV4UGFja2FnZSIsImRvY1Jlc3VsdCIsInNlYXJjaGVyIiwiZHV0eVBlcmNlbnQiLCJoYXNPcHQiLCJwIiwiY3VycmVudENvbnRhaW5lciIsIm10eXBlIiwiY29udGFpbmVyIiwiYmFnIiwic3JlbSIsInNraWQiLCJtYW5pZmVzdEtleSIsImNvbnRhaW5lck5vIiwic2V0QWRkIiwic1Jlc3VsdCIsImdldE1lbWJlcnMiLCJyZGF0YSIsInNQYWNrYWdlIiwiZXJyMyIsImxpc3RpbmciLCJlcnIyIiwiZXJyMjMyIiwicGFnZSIsInBhZ2VTaXplIiwicmVkaVNlYXJjaCIsIm1zZWFyY2giLCJvbGREb2NJZCIsImRvY0lkIiwidXBkYXRlZFBhY2thZ2VzIiwicGFja2FnZUlkIiwibWFuaWZlc3QiLCJkZWwiLCJkZWNyIiwiZ2V0S2V5cyIsImtleXNDb3VudCIsImtSZXN1bHQiLCJyUmVzdWx0IiwiZGVsZXRlZCIsImJpbiIsInBrZyIsImFjdGlvbiIsInBhY2thZ2VObyIsImdldFBhY2thZ2VJZEZyb21CYXJDb2RlIiwiYmFyY29kZSIsInVwZGF0ZSIsImFkZGVkIiwicmVtb3ZlZCIsImJhckNvZGVWYWx1ZSIsInBhcnRzIiwic3BsaXQiXSwibWFwcGluZ3MiOiI7Ozs7Ozs7OztBQUFBOztBQUNBOzs7Ozs7QUFHQSxJQUFJQSxRQUFRQyxRQUFRLE9BQVIsQ0FBWjtBQUNBLElBQUlDLFNBQVNELFFBQVEsZUFBUixDQUFiO0FBQ0EsSUFBSUUsU0FBU0YsUUFBUSxRQUFSLENBQWI7QUFDQSxJQUFJRyxjQUFjSCxRQUFRLHFCQUFSLENBQWxCO0FBQ0EsSUFBSUksS0FBS0osUUFBUSxJQUFSLENBQVQ7QUFDQSxJQUFJRSxTQUFTRixRQUFRLFFBQVIsQ0FBYjtBQUNBLElBQUlLLGNBQWNMLFFBQVEscUJBQVIsRUFBK0JNLGNBQWpEO0FBQ0EsSUFBSUMsY0FBYyxJQUFJRixXQUFKLEVBQWxCO0FBQ0EsSUFBTUcsVUFBVSxnQkFBaEI7QUFDQSxJQUFNQyxpQkFBaUIsWUFBdkI7QUFDQSxJQUFJQyxjQUFjVixRQUFRLGVBQVIsQ0FBbEI7QUFDQSxJQUFNVyxhQUFhLFdBQW5CO0FBQ0EsSUFBTUMsU0FBUyxRQUFmO0FBQ0EsSUFBTUMsWUFBWSxXQUFsQjtBQUNBLElBQU1DLFVBQVUsVUFBaEI7QUFDQSxJQUFJQyxrQkFBa0JmLFFBQVEsbUJBQVIsRUFBNkJlLGVBQW5EO0FBQ0EsSUFBSUMsa0JBQWtCLElBQUlELGVBQUosRUFBdEI7QUFDQSxJQUFNRSxhQUFhO0FBQ2pCLEtBQUksVUFEYTtBQUVqQixLQUFHLFlBRmM7QUFHakIsS0FBRyxZQUhjO0FBSWpCLEtBQUcsNkJBSmM7QUFLakIsS0FBRyxrQkFMYztBQU1qQixLQUFHOztBQU5jLENBQW5COztBQVVBLElBQU1DLFdBQVdmLFlBQVlKLEtBQVosRUFBbUJjLFNBQW5CLEVBQThCO0FBQzdDTSxpQkFBZWxCLE9BQU9tQjtBQUR1QixDQUE5QixDQUFqQjtBQUdBLElBQU1DLGVBQWVsQixZQUFZSixLQUFaLEVBQW1CUyxPQUFuQixFQUE0QjtBQUMvQ1csaUJBQWVsQixPQUFPbUI7QUFEeUIsQ0FBNUIsQ0FBckI7QUFHQSxTQUFTRSxpQkFBVCxDQUEyQkMsUUFBM0IsRUFBb0M7O0FBRWxDLFNBQU8sQ0FBUDtBQUNEO0FBQ0QsU0FBU0MsY0FBVCxDQUF3QkMsUUFBeEIsRUFBa0M7QUFBQTs7QUFDaEMsTUFBSUM7QUFDRkMsUUFBR0YsU0FBU0UsRUFEVjtBQUVGQyxnQkFBWUgsU0FBU0csVUFGbkI7QUFHRkMsWUFBUUosU0FBU0ksTUFIZjtBQUlGQyxrQkFBZTVCLFNBQVM2QixJQUFULEVBSmI7QUFLRkMsU0FBSSxDQUxGO0FBTUZDLFNBQUksQ0FORjtBQU9GQyxZQUFRWixrQkFBa0JHLFFBQWxCLENBUE47QUFRRlUsWUFBT1YsU0FBU1UsTUFSZDtBQVNGQyxZQUFPWCxTQUFTVyxNQVRkO0FBVUZDLGNBQVVaLFNBQVNZLFFBVmpCO0FBV0ZDLGFBQVNiLFNBQVNhLE9BWGhCO0FBWUZDLGlCQUFhZCxTQUFTYyxXQVpwQjtBQWFGQyxnQkFBV2YsU0FBU2UsVUFibEI7QUFjRkMsYUFBUWhCLFNBQVNnQixPQWRmO0FBZUY7QUFDQUMsWUFBUWpCLFNBQVNpQjtBQWhCZiw4Q0FpQkdqQixTQUFTUSxHQWpCWiw4Q0FrQktSLFNBQVNrQixLQWxCZCxvQkFBSjtBQXFCQUMsVUFBUUMsR0FBUixDQUFZLHVDQUFaO0FBQ0EsU0FBT25CLGVBQVA7QUFDRDtBQUNELFNBQVNvQixtQkFBVCxDQUE2QkMsSUFBN0IsRUFBbUNDLFNBQW5DLEVBQThDO0FBQzVDLFNBQU8sSUFBSUMsT0FBSixDQUFZLFVBQUNDLE9BQUQsRUFBVUMsTUFBVixFQUFxQjtBQUN0QyxRQUFJQyxVQUFVSixVQUFVSyxNQUFWLENBQWlCQyxLQUFqQixFQUFkO0FBQ0FQLFNBQUtRLE9BQUwsQ0FBYSxtQkFBVztBQUN0QixVQUFJWixRQUFRO0FBQ1ZELGdCQUFRLENBREU7QUFFVmMsa0JBQVU7QUFGQSxPQUFaO0FBSUFaLGNBQVFDLEdBQVIsQ0FBWVksVUFBVSxnQkFBdEI7O0FBRUFMLGNBQVFNLEtBQVIsQ0FBYy9DLGFBQWE4QyxPQUEzQixFQUFvQ2QsS0FBcEM7QUFDRCxLQVJEO0FBU0FTLFlBQVFPLElBQVIsQ0FBYSxVQUFDQyxHQUFELEVBQU1DLE1BQU4sRUFBaUI7QUFDNUJqQixjQUFRQyxHQUFSLENBQVlnQixNQUFaO0FBQ0E7QUFDQWQsV0FBS1EsT0FBTCxDQUFhLG1CQUFXO0FBQ3RCTywwQkFBa0JMLE9BQWxCLEVBQTJCVCxTQUEzQjtBQUNELE9BRkQ7QUFHQUUsY0FBUVcsTUFBUjtBQUNELEtBUEQ7QUFRRCxHQW5CTSxDQUFQO0FBb0JEOztBQUVELFNBQVNDLGlCQUFULENBQTJCbEMsVUFBM0IsRUFBdUNvQixTQUF2QyxFQUFrRDtBQUNoRC9DLFNBQU84RCxVQUFQLENBQWtCbkMsVUFBbEIsRUFBOEJvQyxJQUE5QixDQUFtQyxnQkFBUTtBQUN6Q2hCLGNBQVVpQixXQUFWLENBQXNCekQsT0FBdEIsRUFBa0MwRCxLQUFLakMsR0FBdkMsU0FBOENMLFVBQTlDLEVBQTRELFVBQUNnQyxHQUFELEVBQU1PLElBQU4sRUFBZTtBQUN6RSxVQUFJQyxXQUFXNUMsZUFBZTBDLElBQWYsQ0FBZjtBQUNBdEIsY0FBUUMsR0FBUixDQUFZLCtDQUErQ2pCLFVBQTNEO0FBQ0FvQixnQkFBVXFCLEdBQVYsQ0FBY0gsS0FBS2pDLEdBQUwsR0FBVyxHQUFYLEdBQWlCaUMsS0FBS3RDLFVBQXBDLEVBQWdEd0MsUUFBaEQ7QUFDRCxLQUpEO0FBS0QsR0FORDtBQU9EOztJQUNZRSxjLFdBQUFBLGM7QUFDWCw0QkFBYztBQUFBOztBQUNaLFNBQUtDLFVBQUw7QUFDRDs7OztpQ0FDWTtBQUNYLFdBQUtDLFFBQUwsR0FBZ0JyRSxZQUFZSixLQUFaLEVBQW1CUyxPQUFuQixFQUE0QjtBQUMxQ1csdUJBQWVsQixPQUFPbUI7QUFEb0IsT0FBNUIsQ0FBaEI7QUFHRDs7O2dDQUNVO0FBQ1QsYUFBTyxJQUFJNkIsT0FBSixDQUFZLFVBQUNDLE9BQUQsRUFBU0MsTUFBVCxFQUFrQjtBQUNuQ3pDLG9CQUFZK0QsV0FBWixDQUF3QkMsTUFBeEIsQ0FBK0I5RCxNQUEvQixFQUFzQyxVQUFDZ0QsR0FBRCxFQUFLQyxNQUFMLEVBQWM7QUFDbERqQixrQkFBUUMsR0FBUixDQUFZZ0IsTUFBWjtBQUNBLGNBQUlBLFVBQVUsR0FBZCxFQUFrQjtBQUNoQm5ELHdCQUFZK0QsV0FBWixDQUF3QkUsR0FBeEIsQ0FBNEIvRCxVQUFVLE1BQXRDLEVBQTZDLFVBQUNnRCxHQUFELEVBQUtnQixVQUFMLEVBQWtCO0FBQzdEbEUsMEJBQVkrRCxXQUFaLENBQXdCSSxJQUF4QixDQUE2QmpFLE1BQTdCLEVBQW9DLFVBQUNnRCxHQUFELEVBQUtrQixLQUFMLEVBQWE7QUFDL0M1Qix3QkFBUSxFQUFDbEIsS0FBSThDLEtBQUwsRUFBUjtBQUNELGVBRkQ7QUFHRCxhQUpEO0FBS0QsV0FORCxNQU9LO0FBQ0hwRSx3QkFBWStELFdBQVosQ0FBd0JJLElBQXhCLENBQTZCakUsTUFBN0IsRUFBb0MsVUFBQ2dELEdBQUQsRUFBS2tCLEtBQUwsRUFBYTtBQUMvQzVCLHNCQUFRLEVBQUNsQixLQUFJOEMsS0FBTCxFQUFSO0FBQ0QsYUFGRDtBQUdEO0FBQ0YsU0FkRDtBQWVELE9BaEJNLENBQVA7QUFpQkQ7Ozs0QkFDTzlDLEcsRUFBSTtBQUNWLGFBQU8sSUFBSWlCLE9BQUosQ0FBWSxVQUFDQyxPQUFELEVBQVNDLE1BQVQsRUFBa0I7QUFDbkNQLGdCQUFRQyxHQUFSLENBQVksV0FBWixFQUF3QmIsR0FBeEIsRUFBNEI5QixTQUFTNkUsUUFBVCxDQUFrQixVQUFsQixDQUE1QjtBQUNBckUsb0JBQVkrRCxXQUFaLENBQXdCSSxJQUF4QixDQUE2QmpFLE1BQTdCLEVBQW9DLFVBQUNnRCxHQUFELEVBQUtvQixLQUFMLEVBQWE7QUFDL0NoRCxjQUFJTCxFQUFKLEdBQVNxRCxLQUFUO0FBQ0FoRCxjQUFJVSxNQUFKLEdBQWEsQ0FBYjtBQUNBLGNBQUlWLElBQUlpRCxPQUFSLEVBQWdCO0FBQ2RqRCxnQkFBSWtELE9BQUosR0FBYyxDQUFkO0FBQ0F0QyxvQkFBUUMsR0FBUixDQUFZLGFBQVo7QUFDRCxXQUhELE1BSUs7QUFDSGIsZ0JBQUlrRCxPQUFKLEdBQWMsQ0FBZDtBQUNBdEMsb0JBQVFDLEdBQVIsQ0FBWSxnQkFBWjtBQUNEOztBQUVEYixjQUFJbUQsV0FBSixHQUFrQmpGLFNBQVM2QixJQUFULEVBQWxCO0FBQ0ViLG1CQUFTbUQsR0FBVCxDQUFhckMsSUFBSUwsRUFBakIsRUFBb0JLLEdBQXBCLEVBQXdCLFVBQUNvRCxJQUFELEVBQU1DLE1BQU4sRUFBZTtBQUNyQyxnQkFBSUQsSUFBSixFQUFTO0FBQ1B4QyxzQkFBUUMsR0FBUixDQUFZLFlBQVosRUFBeUJ1QyxJQUF6QjtBQUNBbEMsc0JBQVEsRUFBQ29DLE9BQU0sS0FBUCxFQUFSO0FBQ0Q7QUFDRHBDLG9CQUFRLEVBQUNvQyxPQUFNLElBQVAsRUFBYTNELElBQUdxRCxLQUFoQixFQUFSO0FBQ0QsV0FORDtBQU9ILFNBcEJEO0FBd0JELE9BMUJNLENBQVA7QUEyQkQ7OzttQ0FDY3JELEUsRUFBRztBQUNoQjtBQUNBLGFBQU8sSUFBSXNCLE9BQUosQ0FBWSxVQUFDQyxPQUFELEVBQVNDLE1BQVQsRUFBa0I7QUFDbkM5QixxQkFBYWtFLE1BQWIsWUFBNkI1RCxFQUE3QixTQUFtQ0EsRUFBbkMsUUFBeUMsRUFBQzZELGlCQUFnQixJQUFqQixFQUFzQkMsUUFBTyxDQUE3QixFQUF6QyxFQUF5RSxVQUFDN0IsR0FBRCxFQUFLOEIsUUFBTCxFQUFnQjtBQUN2RixjQUFJdkQsU0FBUyxDQUFiO0FBQ0EsY0FBSUMsU0FBU3NELFNBQVNDLFlBQXRCO0FBQ0EsY0FBSXBELGNBQWMsRUFBbEI7QUFDQW1ELG1CQUFTRSxPQUFULENBQWlCckMsT0FBakIsQ0FBeUIsb0JBQVk7QUFDbkMsZ0JBQUloQixlQUFjLEVBQWxCLEVBQ0VBLGNBQWNzRCxTQUFTQyxHQUFULENBQWF2RCxXQUEzQjtBQUNGSixzQkFBVTRELE9BQU9GLFNBQVNDLEdBQVQsQ0FBYTNELE1BQXBCLENBQVY7QUFDRCxXQUpEO0FBS0EsY0FBSTZELE9BQVEsRUFBQzdELFFBQU9BLE1BQVIsRUFBZUksYUFBWUEsV0FBM0IsRUFBdUNILFFBQU9BLE1BQTlDLEVBQVo7QUFDQVEsa0JBQVFDLEdBQVIsQ0FBWW1ELElBQVosRUFBaUIsYUFBakI7QUFDQTlDLGtCQUFTOEMsSUFBVDtBQUNELFNBWkQ7QUFhRCxPQWRNLENBQVA7QUFnQkQ7OztrQ0FDYXJFLEUsRUFBRztBQUNmLFVBQUlzRSxNQUFNLElBQVY7QUFDQSxhQUFPLElBQUloRCxPQUFKLENBQVksVUFBQ0MsT0FBRCxFQUFTQyxNQUFULEVBQWtCO0FBQ25DUCxnQkFBUUMsR0FBUixZQUFxQmxCLEVBQXJCLFNBQTJCQSxFQUEzQjs7QUFFQU4scUJBQWFrRSxNQUFiLFlBQTZCNUQsRUFBN0IsU0FBbUNBLEVBQW5DLFFBQXlDLEVBQUM2RCxpQkFBZ0IsSUFBakIsRUFBc0JDLFFBQU8sQ0FBN0IsRUFBekMsRUFBeUUsVUFBQzdCLEdBQUQsRUFBSzhCLFFBQUwsRUFBZ0I7QUFDdkYsY0FBSTlCLEdBQUosRUFDQ2hCLFFBQVFDLEdBQVIsQ0FBWWUsR0FBWjs7QUFFRCxjQUFLc0MsY0FBZSxFQUFwQjtBQUNBLGNBQUlDLFFBQVEsQ0FBWjtBQUNBVCxtQkFBU0UsT0FBVCxDQUFpQnJDLE9BQWpCLENBQXlCLG9CQUFZOztBQUVuQyxnQkFBSXNDLFNBQVNDLEdBQVQsQ0FBYWxFLFVBQWIsQ0FBd0J3RSxNQUF4QixHQUFpQyxDQUFyQyxFQUF1QztBQUNyQztBQUNBUCx1QkFBU0MsR0FBVCxDQUFhbEUsVUFBYixHQUEwQmlFLFNBQVNDLEdBQVQsQ0FBYWxFLFVBQWIsQ0FBd0J5RSxTQUF4QixDQUFrQ1IsU0FBU0MsR0FBVCxDQUFhbEUsVUFBYixDQUF3QndFLE1BQXhCLEdBQWdDLENBQWxFLENBQTFCO0FBRUQ7QUFDRFAscUJBQVNDLEdBQVQsQ0FBYXpFLFlBQWIsR0FBNEI4RSxLQUE1QjtBQUNBQTtBQUNBRCx3QkFBWUksSUFBWixDQUFrQlQsU0FBU0MsR0FBM0I7QUFDRCxXQVZEOztBQWFBNUMsa0JBQVNnRCxXQUFUO0FBQ0QsU0FwQkQ7QUFxQkQsT0F4Qk0sQ0FBUDtBQXlCRDs7O29DQUNjO0FBQUE7O0FBQ2IsYUFBTyxJQUFJakQsT0FBSixDQUFZLFVBQUNDLE9BQUQsRUFBU0MsTUFBVCxFQUFrQjtBQUNsQ2pDLGlCQUFTcUUsTUFBVCxDQUFnQiw4QkFBaEIsRUFBK0MsRUFBQ0UsUUFBTyxDQUFSLEVBQVVELGlCQUFnQixJQUExQixFQUErQmUsUUFBTyxJQUF0QyxFQUEvQyxFQUEyRixVQUFDM0MsR0FBRCxFQUFLNEMsSUFBTCxFQUFZO0FBQ3JHLGNBQUlDLFVBQVUsRUFBZDtBQUNBeEQsa0JBQVF5RCxHQUFSLENBQVlGLEtBQUtaLE9BQUwsQ0FBYWUsR0FBYixDQUFpQjtBQUFBLG1CQUFLM0YsZ0JBQWdCNEYsV0FBaEIsQ0FBNEI1RSxJQUFJOEQsR0FBSixDQUFRZSxVQUFwQyxDQUFMO0FBQUEsV0FBakIsQ0FBWixFQUFvRjdDLElBQXBGLENBQXlGLHFCQUFXO0FBQ2xHZixvQkFBUXlELEdBQVIsQ0FBWUYsS0FBS1osT0FBTCxDQUFhZSxHQUFiLENBQWlCO0FBQUEscUJBQUssTUFBS0csY0FBTCxDQUFvQjlFLElBQUk4RCxHQUFKLENBQVFuRSxFQUE1QixDQUFMO0FBQUEsYUFBakIsQ0FBWixFQUFvRXFDLElBQXBFLENBQXlFLG1CQUFTO0FBQ2pGcEIsc0JBQVFDLEdBQVIsQ0FBWSxtQkFBWixFQUFnQ2tFLFNBQWhDLEVBQTJDUCxJQUEzQztBQUNBLG1CQUFJLElBQUlRLElBQUcsQ0FBWCxFQUFlQSxJQUFJUixLQUFLWixPQUFMLENBQWFRLE1BQWhDLEVBQXlDWSxHQUF6QyxFQUE4QztBQUM1QyxvQkFBSWhGLE1BQU13RSxLQUFLWixPQUFMLENBQWFvQixDQUFiLENBQVY7QUFDQWhGLG9CQUFJOEQsR0FBSixDQUFRWCxXQUFSLEdBQXNCakYsT0FBTzZCLElBQVAsQ0FBWUMsSUFBSThELEdBQUosQ0FBUVgsV0FBcEIsRUFBaUM4QixNQUFqQyxDQUF3QyxvQkFBeEMsQ0FBdEI7QUFDQTtBQUNBakYsb0JBQUk4RCxHQUFKLENBQVFvQixTQUFSLEdBQW9CSCxVQUFVQyxDQUFWLEVBQWFHLElBQWpDO0FBQ0FuRixvQkFBSThELEdBQUosQ0FBUTNELE1BQVIsR0FBaUJpRixRQUFRSixDQUFSLEVBQVc3RSxNQUE1QjtBQUNBSCxvQkFBSThELEdBQUosQ0FBUXVCLEdBQVIsR0FBY04sVUFBVUMsQ0FBVixFQUFhSyxHQUEzQjtBQUNBckYsb0JBQUk4RCxHQUFKLENBQVF2RCxXQUFSLEdBQXNCNkUsUUFBUUosQ0FBUixFQUFXekUsV0FBakM7QUFDQVAsb0JBQUk4RCxHQUFKLENBQVExRCxNQUFSLEdBQWlCZ0YsUUFBUUosQ0FBUixFQUFXNUUsTUFBNUI7QUFDQSxvQkFBSTJFLFVBQVVDLENBQVYsRUFBYUssR0FBYixJQUFvQixFQUF4QixFQUEyQjtBQUN6QnJGLHNCQUFJOEQsR0FBSixDQUFRdUIsR0FBUixHQUFjLE1BQWQ7QUFDRDtBQUNEekUsd0JBQVFDLEdBQVIsQ0FBWSxVQUFaLEVBQXVCYixHQUF2QjtBQUNBO0FBQ0F5RSx3QkFBUUgsSUFBUixDQUFhdEUsSUFBSThELEdBQWpCO0FBQ0E7QUFDRDVDLHNCQUFRLEVBQUNzRCxNQUFLQyxPQUFOLEVBQVI7QUFDRCxhQW5CRDtBQXFCQSxXQXRCRixFQXNCSWEsS0F0QkosQ0FzQlUsZUFBSztBQUNaMUUsb0JBQVFDLEdBQVIsQ0FBWWUsR0FBWjtBQUNELFdBeEJGOztBQTBCRDs7O0FBR0E7QUFFQSxTQWpDRDtBQWtDRixPQW5DTSxDQUFQO0FBb0NEOzs7bUNBRWE7QUFBQTs7QUFDWixhQUFPLElBQUlYLE9BQUosQ0FBWSxVQUFDQyxPQUFELEVBQVNDLE1BQVQsRUFBa0I7QUFDbENqQyxpQkFBU3FFLE1BQVQsQ0FBZ0IsOEJBQWhCLEVBQStDLEVBQUNFLFFBQU8sQ0FBUixFQUFVRCxpQkFBZ0IsSUFBMUIsRUFBK0JlLFFBQU8sSUFBdEMsRUFBL0MsRUFBMkYsVUFBQzNDLEdBQUQsRUFBSzRDLElBQUwsRUFBWTtBQUNyRyxjQUFJQyxVQUFVLEVBQWQ7QUFDQXhELGtCQUFReUQsR0FBUixDQUFZRixLQUFLWixPQUFMLENBQWFlLEdBQWIsQ0FBaUI7QUFBQSxtQkFBSzNGLGdCQUFnQjRGLFdBQWhCLENBQTRCNUUsSUFBSThELEdBQUosQ0FBUWUsVUFBcEMsQ0FBTDtBQUFBLFdBQWpCLENBQVosRUFBb0Y3QyxJQUFwRixDQUF5RixxQkFBVztBQUNsR2Ysb0JBQVF5RCxHQUFSLENBQVlGLEtBQUtaLE9BQUwsQ0FBYWUsR0FBYixDQUFpQjtBQUFBLHFCQUFLLE9BQUtHLGNBQUwsQ0FBb0I5RSxJQUFJOEQsR0FBSixDQUFRbkUsRUFBNUIsQ0FBTDtBQUFBLGFBQWpCLENBQVosRUFBb0VxQyxJQUFwRSxDQUF5RSxtQkFBUztBQUNqRnBCLHNCQUFRQyxHQUFSLENBQVksbUJBQVosRUFBZ0NrRSxTQUFoQyxFQUEyQ1AsSUFBM0M7QUFDQSxtQkFBSSxJQUFJUSxJQUFHLENBQVgsRUFBZUEsSUFBSVIsS0FBS1osT0FBTCxDQUFhUSxNQUFoQyxFQUF5Q1ksR0FBekMsRUFBOEM7QUFDNUMsb0JBQUloRixNQUFNd0UsS0FBS1osT0FBTCxDQUFhb0IsQ0FBYixDQUFWO0FBQ0FoRixvQkFBSThELEdBQUosQ0FBUVgsV0FBUixHQUFzQmpGLE9BQU82QixJQUFQLENBQVlDLElBQUk4RCxHQUFKLENBQVFYLFdBQXBCLEVBQWlDOEIsTUFBakMsQ0FBd0Msb0JBQXhDLENBQXRCO0FBQ0E7QUFDQWpGLG9CQUFJOEQsR0FBSixDQUFRb0IsU0FBUixHQUFvQkgsVUFBVUMsQ0FBVixFQUFhRyxJQUFqQztBQUNBbkYsb0JBQUk4RCxHQUFKLENBQVF1QixHQUFSLEdBQWNOLFVBQVVDLENBQVYsRUFBYUssR0FBM0I7QUFDQXJGLG9CQUFJOEQsR0FBSixDQUFRM0QsTUFBUixHQUFpQmlGLFFBQVFKLENBQVIsRUFBVzdFLE1BQTVCO0FBQ0FILG9CQUFJOEQsR0FBSixDQUFRdkQsV0FBUixHQUFzQjZFLFFBQVFKLENBQVIsRUFBV3pFLFdBQWpDO0FBQ0FQLG9CQUFJOEQsR0FBSixDQUFRMUQsTUFBUixHQUFpQmdGLFFBQVFKLENBQVIsRUFBVzVFLE1BQTVCO0FBQ0Esb0JBQUkyRSxVQUFVQyxDQUFWLEVBQWFLLEdBQWIsSUFBb0IsRUFBeEIsRUFBMkI7QUFDekJyRixzQkFBSThELEdBQUosQ0FBUXVCLEdBQVIsR0FBYyxNQUFkO0FBQ0Q7QUFDRHpFLHdCQUFRQyxHQUFSLENBQVksVUFBWixFQUF1QmIsR0FBdkI7QUFDQTtBQUNBeUUsd0JBQVFILElBQVIsQ0FBYXRFLElBQUk4RCxHQUFqQjtBQUNBO0FBQ0Q1QyxzQkFBUSxFQUFDc0QsTUFBS0MsT0FBTixFQUFSO0FBQ0QsYUFuQkQ7QUFxQkEsV0F0QkYsRUFzQklhLEtBdEJKLENBc0JVLGVBQUs7QUFDWjFFLG9CQUFRQyxHQUFSLENBQVllLEdBQVo7QUFDRCxXQXhCRjs7QUEwQkQ7OztBQUdBO0FBRUEsU0FqQ0Q7QUFrQ0YsT0FuQ00sQ0FBUDtBQW9DRDs7OzJCQUNNakMsRSxFQUFHO0FBQ1IsVUFBTXNFLE1BQU0sSUFBWjtBQUNBLGFBQU8sSUFBSWhELE9BQUosQ0FBWSxVQUFDQyxPQUFELEVBQVNDLE1BQVQsRUFBa0I7QUFDbkNqQyxpQkFBU3FHLE1BQVQsQ0FBZ0I1RixFQUFoQixFQUFtQixVQUFDaUMsR0FBRCxFQUFLNUIsR0FBTCxFQUFXO0FBQzVCO0FBQ0FoQiwwQkFBZ0I0RixXQUFoQixDQUE0QjVFLElBQUk4RCxHQUFKLENBQVFlLFVBQXBDLEVBQWdEN0MsSUFBaEQsQ0FBcUQsb0JBQVU7QUFDN0RoQyxnQkFBSThELEdBQUosQ0FBUXpELFFBQVIsR0FBbUJBLFFBQW5CO0FBQ0E0RCxnQkFBSXVCLGFBQUosQ0FBa0I3RixFQUFsQixFQUFzQnFDLElBQXRCLENBQTJCLG9CQUFVO0FBQ25DO0FBQ0FoQyxrQkFBSThELEdBQUosQ0FBUUosUUFBUixHQUFtQkEsUUFBbkI7QUFDQXhDLHNCQUFRLEVBQUNsQixLQUFJQSxJQUFJOEQsR0FBVCxFQUFSO0FBQ0QsYUFKRDtBQU1ELFdBUkQ7QUFVRCxTQVpEO0FBYUQsT0FkTSxDQUFQO0FBZUQ7OzttQ0FDYzJCLGMsRUFBZUMsVyxFQUFZO0FBQ3hDLGFBQU8sSUFBSXpFLE9BQUosQ0FBWSxVQUFDQyxPQUFELEVBQVNDLE1BQVQsRUFBa0I7QUFDbkM5QixxQkFBYWtFLE1BQWIsQ0FBb0IsaUJBQWVrQyxjQUFuQyxFQUFrRCxFQUFDakUsVUFBU2tFLFdBQVYsRUFBbEQsRUFBeUUsVUFBQzlELEdBQUQsRUFBSytELGFBQUwsRUFBcUIsQ0FFN0YsQ0FGRDtBQUdELE9BSk0sQ0FBUDtBQUtEOzs7cUNBQ2dCQyxVLEVBQVc7QUFDMUIsYUFBTyxJQUFJM0UsT0FBSixDQUFZLFVBQUNDLE9BQUQsRUFBU1csTUFBVCxFQUFrQjtBQUNuQ25ELG9CQUFZK0QsV0FBWixDQUF3QkksSUFBeEIsQ0FBNkJwRSxjQUE3QixFQUE0QyxVQUFDbUQsR0FBRCxFQUFLakMsRUFBTCxFQUFVO0FBQ3BEaUcscUJBQVdqRyxFQUFYLEdBQWdCQSxFQUFoQjtBQUNBTix1QkFBYWdELEdBQWIsQ0FBaUIxQyxFQUFqQixFQUFvQmlHLFVBQXBCLEVBQStCLFVBQUNoRSxHQUFELEVBQUtDLE1BQUwsRUFBYztBQUMzQyxnQkFBSUQsR0FBSixFQUNFaEIsUUFBUUMsR0FBUixDQUFZZSxHQUFaO0FBQ0ZWLG9CQUFRLEVBQUNvQyxPQUFNLElBQVAsRUFBWTNELElBQUdBLEVBQWYsRUFBUjtBQUNELFdBSkQ7QUFLRCxTQVBEO0FBUUQsT0FUTSxDQUFQO0FBVUQ7OztnQ0FDV2tHLEksRUFBSztBQUNmLGFBQU8sSUFBSTVFLE9BQUosQ0FBWSxVQUFDQyxPQUFELEVBQVNDLE1BQVQsRUFBa0I7QUFDbkMsWUFBSTJFLFdBQVc7O0FBRWJqRyxrQkFBUWdHLEtBQUtoRyxNQUZBO0FBR2JRLG9CQUFVd0YsS0FBS3hGLFFBQUwsQ0FBYzBGLE9BQWQsQ0FBc0IsR0FBdEIsRUFBMkIsRUFBM0IsRUFBK0JDLElBQS9CLEVBSEc7QUFJYnBHLHNCQUFZaUcsS0FBS0ksUUFKSjtBQUtiMUYsdUJBQWFzRixLQUFLdEYsV0FMTDtBQU1iRCxtQkFBU3VGLEtBQUt2RixPQU5EO0FBT2JHLG1CQUFRb0YsS0FBS3BGLE9BUEE7QUFRYkUsaUJBQU9vRCxPQUFPOEIsS0FBS2xGLEtBQVosQ0FSTTtBQVNiUCxrQkFBUTJELE9BQU84QixLQUFLekYsTUFBWixDQVRLO0FBVWJELGtCQUFRNEQsT0FBTzhCLEtBQUsxRixNQUFaLENBVks7QUFXYkssc0JBQVlxRixLQUFLckYsVUFYSjtBQVliRSxrQkFBUSxDQVpLO0FBYWJjLG9CQUFVLEtBYkc7QUFjYnZCLGVBQUssQ0FkUTtBQWViRCxlQUFJO0FBQ0o7QUFDQTtBQWpCYSxTQUFmO0FBbUJBO0FBQ0F0QixvQkFBWStELFdBQVosQ0FBd0JJLElBQXhCLENBQTZCcEUsY0FBN0IsRUFBNEMsVUFBQ21ELEdBQUQsRUFBS2pDLEVBQUwsRUFBVTtBQUNwRG1HLG1CQUFTbkcsRUFBVCxHQUFjQSxFQUFkO0FBQ0FqQixzQkFBWStELFdBQVosQ0FBd0JFLEdBQXhCLENBQTRCaEUsYUFBV2dCLEVBQXZDLEVBQTBDbUcsUUFBMUMsRUFBbUQsVUFBQ2xFLEdBQUQsRUFBS3NFLFFBQUwsRUFBZ0I7QUFDakUsZ0JBQUl0RSxHQUFKLEVBQVE7QUFDTlQscUJBQU8sRUFBQ21DLE9BQU0sS0FBUCxFQUFhMUIsS0FBSUEsR0FBakIsRUFBUDtBQUNEO0FBQ0EsZ0JBQUl1RSxlQUFnQjNHLGVBQWVzRyxRQUFmLENBQXBCO0FBQ0FsRixvQkFBUUMsR0FBUixDQUFZc0YsWUFBWjtBQUNBOUcseUJBQWFnRCxHQUFiLENBQWlCeUQsU0FBU25HLEVBQTFCLEVBQTZCd0csWUFBN0IsRUFBMEMsVUFBQy9DLElBQUQsRUFBTWdELFNBQU4sRUFBa0I7QUFDMUR4RixzQkFBUUMsR0FBUixDQUFZdUYsU0FBWjtBQUNBLGtCQUFHaEQsSUFBSCxFQUFRO0FBQ05qQyx1QkFBTyxFQUFDbUMsT0FBTSxLQUFQLEVBQWExQixLQUFJd0IsSUFBakIsRUFBUDtBQUNEO0FBQ0RsQyxzQkFBUSxFQUFDb0MsT0FBTSxJQUFQLEVBQVI7QUFDRCxhQU5EO0FBUUYsV0FkRDtBQWVELFNBakJEO0FBcUJELE9BMUNNLENBQVA7QUEyQ0Q7OzttQ0FDY3VDLEksRUFBTTs7QUFFbkIsVUFBSVEsV0FBVyxLQUFLN0QsUUFBcEI7QUFDQSxhQUFPLElBQUl2QixPQUFKLENBQVksVUFBQ0MsT0FBRCxFQUFVQyxNQUFWLEVBQXFCO0FBQ3RDLFlBQUkyRSxXQUFXO0FBQ2JqRyxrQkFBUWdHLEtBQUtoRyxNQURBO0FBRWJRLG9CQUFVd0YsS0FBS3hGLFFBQUwsQ0FBYzBGLE9BQWQsQ0FBc0IsR0FBdEIsRUFBMkIsRUFBM0IsRUFBK0JDLElBQS9CLEVBRkc7QUFHYnBHLHNCQUFZaUcsS0FBS0ksUUFISjtBQUliSyx1QkFBYSxHQUpBO0FBS2IvRix1QkFBYXNGLEtBQUt0RixXQUxMO0FBTWJELG1CQUFTdUYsS0FBS3ZGLE9BTkQ7QUFPYkssaUJBQU9vRCxPQUFPOEIsS0FBS2xGLEtBQVosQ0FQTTtBQVFiUCxrQkFBUTJELE9BQU84QixLQUFLekYsTUFBWixDQVJLO0FBU2JELGtCQUFRNEQsT0FBTzhCLEtBQUsxRixNQUFaLENBVEs7QUFVYk8sa0JBQVEsQ0FWSztBQVdiYyxvQkFBVSxLQVhHO0FBWWJ2QixlQUFLNEYsS0FBSzVGLEdBWkc7QUFhYnNHLGtCQUFRO0FBQ1I7QUFkYSxTQUFmO0FBZ0JBM0YsZ0JBQVFDLEdBQVIsQ0FBWSwyQkFBWjtBQUNBLFlBQUksT0FBT2lGLFNBQVN4RixPQUFoQixLQUE0QixXQUFoQyxFQUE2Q3dGLFNBQVN4RixPQUFULEdBQW1CLEVBQW5CO0FBQzdDLFlBQUksT0FBT3dGLFNBQVN2RixXQUFoQixLQUFnQyxXQUFwQyxFQUNFdUYsU0FBU3ZGLFdBQVQsR0FBdUIsRUFBdkI7QUFDRkssZ0JBQVFDLEdBQVIsQ0FBWWdGLElBQVo7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBakYsZ0JBQVFDLEdBQVIsQ0FBWSxtQkFBWjs7QUFFQTtBQUNBOzs7QUFHQTtBQUNBRCxnQkFBUUMsR0FBUixDQUFZLCtCQUFaO0FBQ0E1QyxlQUFPOEQsVUFBUCxDQUFrQitELFNBQVNsRyxVQUEzQixFQUF1Q29DLElBQXZDLENBQTRDLGFBQUs7QUFDL0NwQixrQkFBUUMsR0FBUixDQUFZLFdBQVosRUFBd0IyRixDQUF4QjtBQUNBLGNBQUlBLENBQUosRUFBTztBQUNMLGdCQUFJQyxpQ0FBK0JELEVBQUV2RyxHQUFqQyxTQUF3Q3VHLEVBQUVFLEtBQTFDLFNBQW1EQyxTQUFuRCxNQUFKO0FBQ0EvRixvQkFBUUMsR0FBUixDQUFZLGdCQUFaO0FBQ0FELG9CQUFRQyxHQUFSLENBQVkyRixDQUFaO0FBQ0EsZ0JBQUlHLGFBQWEsS0FBakIsRUFBd0I7QUFDdEI7QUFDQSxrQkFBSUgsRUFBRUksR0FBRixJQUFTZCxTQUFTYyxHQUF0QixFQUEyQjtBQUN6QjtBQUNBM0ksdUJBQU80SSxJQUFQLENBQVlKLG1CQUFtQkQsRUFBRUksR0FBakMsRUFBc0NKLEVBQUU1RyxVQUF4QztBQUNBZ0Isd0JBQVFDLEdBQVIsQ0FDRSxxQ0FBcUM0RixnQkFEdkM7QUFHRDtBQUNGLGFBVEQsTUFTTztBQUNMO0FBQ0Esa0JBQUlELEVBQUVNLElBQUYsSUFBVWhCLFNBQVNnQixJQUF2QixFQUE2QjtBQUMzQjtBQUNBN0ksdUJBQU80SSxJQUFQLENBQVlKLG1CQUFtQkQsRUFBRU0sSUFBakMsRUFBdUNOLEVBQUU1RyxVQUF6QztBQUNBZ0Isd0JBQVFDLEdBQVIsQ0FDRSxxQ0FBcUM0RixnQkFEdkM7QUFHRDtBQUNGO0FBQ0YsV0F2QkQsTUF1Qk87QUFDTDtBQUNBeEksbUJBQU9vRCxNQUFQLENBQWN3QixJQUFkLENBQW1CLGNBQWNpRCxTQUFTN0YsR0FBMUM7QUFFRDs7QUFFRGhDLGlCQUNHeUQsS0FESCxDQUNTLGNBQWNvRSxTQUFTbEcsVUFEaEMsRUFDNENrRyxRQUQ1QyxFQUVHOUQsSUFGSCxDQUVRLFVBQVNILE1BQVQsRUFBaUI7QUFDckI7O0FBRUEsZ0JBQUlrRiw0QkFBMEJqQixTQUFTN0YsR0FBbkMsU0FDRjZGLFNBQVNZLEtBRFAsU0FFQUMsU0FGQSxTQUVhSyxXQUZqQjtBQUdBcEcsb0JBQVFDLEdBQVIsQ0FBWSxrQ0FBWjtBQUNBaUIsOEJBQWtCZ0UsU0FBU2xHLFVBQTNCLEVBQXNDeUcsUUFBdEM7QUFDQXpGLG9CQUFRQyxHQUFSLENBQVksNEJBQVo7QUFDQTVDLG1CQUNHZ0osTUFESCxDQUNVRixXQURWLEVBQ3VCakIsU0FBU2xHLFVBRGhDLEVBRUdvQyxJQUZILENBRVEsVUFBU2tGLE9BQVQsRUFBa0I7QUFDdEI7QUFDQXRHLHNCQUFRQyxHQUFSLENBQVksOEJBQVo7QUFDQUQsc0JBQVFDLEdBQVIsQ0FBWWtHLFdBQVo7QUFDQTlJLHFCQUNHa0osVUFESCxDQUNjSixXQURkLEVBRUcvRSxJQUZILENBRVEsZ0JBQVE7QUFDWnBCLHdCQUFRQyxHQUFSLENBQVksTUFBWjtBQUNBRCx3QkFBUUMsR0FBUixDQUFZbUQsSUFBWjtBQUNBL0Msd0JBQVF5RCxHQUFSLENBQVlWLEtBQUtXLEdBQUwsQ0FBUzFHLE9BQU84RCxVQUFoQixDQUFaO0FBQ0QsZUFOSCxFQU9HQyxJQVBILENBT1EsVUFBU29GLEtBQVQsRUFBZ0I7QUFDcEI7QUFDQTtBQUNBeEcsd0JBQVFDLEdBQVIsQ0FBWSxNQUFaO0FBQ0FELHdCQUFRQyxHQUFSLENBQVl1RyxLQUFaOztBQUVBbEcsd0JBQVE7QUFDTm9DLHlCQUFPLElBREQ7QUFFTkksNEJBQVUwRCxLQUZKO0FBR05DLDRCQUFVdkI7QUFISixpQkFBUjtBQUtELGVBbEJILEVBbUJHUixLQW5CSCxDQW1CUyxnQkFBUTtBQUNiMUUsd0JBQVFDLEdBQVIsQ0FBWXlHLElBQVo7QUFDQW5HLHVCQUFPO0FBQ0xTLHVCQUFLMEYsSUFEQTtBQUVMaEUseUJBQU8sSUFGRjtBQUdMaUUsMkJBQVM7QUFISixpQkFBUDtBQUtELGVBMUJIO0FBMkJELGFBakNILEVBa0NHakMsS0FsQ0gsQ0FrQ1MsVUFBUzFELEdBQVQsRUFBYztBQUNuQlYsc0JBQVE7QUFDTm9DLHVCQUFPO0FBREQsZUFBUjtBQUdELGFBdENIO0FBdUNELFdBbERILEVBbURHZ0MsS0FuREgsQ0FtRFMsVUFBU2tDLElBQVQsRUFBZTtBQUNwQnJHLG1CQUFPO0FBQ0xtQyxxQkFBTztBQURGLGFBQVA7QUFHRCxXQXZESDs7QUF5REE7QUFDRCxTQXpGRCxFQXlGR2dDLEtBekZILENBeUZTLGtCQUFRO0FBQ2YxRSxrQkFBUUMsR0FBUixDQUFZNEcsTUFBWjtBQUNELFNBM0ZEO0FBNEZELE9BOUhNLENBQVA7QUErSEQ7OzswQ0FDb0I7QUFBQTs7QUFDbkIsYUFBTyxJQUFJeEcsT0FBSixDQUFZLFVBQUNDLE9BQUQsRUFBU0MsTUFBVCxFQUFrQjs7QUFFbkMsZUFBS3FCLFFBQUwsQ0FBY2UsTUFBZCxlQUVFLEVBQUVFLFFBQVEsQ0FBVixFQUFhRCxpQkFBaUIsSUFBOUIsRUFGRixFQUdFLFVBQUM1QixHQUFELEVBQU1vQyxJQUFOLEVBQWU7QUFDYixjQUFJTixXQUFXLEVBQWY7QUFDQTlDLGtCQUFRQyxHQUFSLENBQVltRCxJQUFaO0FBQ0FBLGVBQUtKLE9BQUwsQ0FBYXJDLE9BQWIsQ0FBcUIsbUJBQVc7O0FBRTlCbUMscUJBQVNZLElBQVQsQ0FBYzdDLFFBQVFxQyxHQUF0QjtBQUNBNUMsb0JBQVF3QyxRQUFSO0FBQ0gsV0FKQztBQUtMLFNBWEM7QUFZRCxPQWRNLENBQVA7QUFlRDs7O3dDQUNtQmdFLEksRUFBS0MsUSxFQUFTO0FBQUE7O0FBQ2hDLGFBQU8sSUFBSTFHLE9BQUosQ0FBWSxVQUFDQyxPQUFELEVBQVNDLE1BQVQsRUFBa0I7O0FBRW5DLGVBQUtxQixRQUFMLENBQWNlLE1BQWQsZUFFRSxFQUFFRSxRQUFRLENBQVYsRUFBYUQsaUJBQWlCLElBQTlCLEVBRkYsRUFHRSxVQUFDNUIsR0FBRCxFQUFNb0MsSUFBTixFQUFlO0FBQ2IsY0FBSU4sV0FBVyxFQUFmO0FBQ0E5QyxrQkFBUUMsR0FBUixDQUFZbUQsSUFBWjtBQUNBQSxlQUFLSixPQUFMLENBQWFyQyxPQUFiLENBQXFCLG1CQUFXOztBQUU5Qm1DLHFCQUFTWSxJQUFULENBQWM3QyxRQUFRcUMsR0FBdEI7QUFFSCxXQUpDO0FBS0Y1QyxrQkFBUXdDLFFBQVI7QUFDSCxTQVpDO0FBYUQsT0FmTSxDQUFQO0FBZ0JEOzs7eUNBQ29CZ0UsSSxFQUFLQyxRLEVBQVM7QUFBQTs7QUFDakMsYUFBTyxJQUFJMUcsT0FBSixDQUFZLFVBQUNDLE9BQUQsRUFBU0MsTUFBVCxFQUFrQjs7QUFFbkMsZUFBS3FCLFFBQUwsQ0FBY2UsTUFBZCxtQkFFRSxFQUFFRSxRQUFRLENBQVYsRUFBYUQsaUJBQWlCLElBQTlCLEVBRkYsRUFHRSxVQUFDNUIsR0FBRCxFQUFNb0MsSUFBTixFQUFlO0FBQ2IsY0FBSU4sV0FBVyxFQUFmO0FBQ0E5QyxrQkFBUUMsR0FBUixDQUFZbUQsSUFBWjtBQUNBQSxlQUFLSixPQUFMLENBQWFyQyxPQUFiLENBQXFCLG1CQUFXOztBQUU5Qm1DLHFCQUFTWSxJQUFULENBQWM3QyxRQUFRcUMsR0FBdEI7QUFFSCxXQUpDO0FBS0Y1QyxrQkFBUXdDLFFBQVI7QUFDSCxTQVpDO0FBYUQsT0FmTSxDQUFQO0FBZ0JEOzs7bUNBQ2MvRCxFLEVBQUc7QUFDaEIsYUFBTyxJQUFJc0IsT0FBSixDQUFZLFVBQUNDLE9BQUQsRUFBU0MsTUFBVCxFQUFrQjtBQUNuQ3lHLG1CQUFXckMsTUFBWCxDQUFrQjVGLEVBQWxCLEVBQXFCLFVBQUNpQyxHQUFELEVBQUtRLFFBQUwsRUFBZ0I7QUFDbkNsQixrQkFBUWtCLFNBQVMwQixHQUFqQjtBQUNELFNBRkQ7QUFHRCxPQUpNLENBQVA7QUFLRDs7O3FEQUNnQzdELEcsRUFBSztBQUNwQztBQUNBO0FBQ0EsVUFBSTRILFVBQVUsS0FBS3JGLFFBQW5CO0FBQ0EsV0FBS0EsUUFBTCxDQUFjZSxNQUFkLFlBQ1d0RCxHQURYLFNBQ2tCQSxHQURsQixRQUVFLEVBQUV3RCxRQUFRLENBQVYsRUFBYUQsaUJBQWlCLElBQTlCLEVBRkYsRUFHRSxVQUFDNUIsR0FBRCxFQUFNb0MsSUFBTixFQUFlO0FBQ2IsWUFBSU4sV0FBVyxFQUFmO0FBQ0E5QyxnQkFBUUMsR0FBUixDQUFZbUQsSUFBWjtBQUNBQSxhQUFLSixPQUFMLENBQWFyQyxPQUFiLENBQXFCLG1CQUFXO0FBQzlCLGNBQUl1RyxXQUFXckcsUUFBUXNHLEtBQXZCO0FBQ0F0RyxrQkFBUXNHLEtBQVIsR0FBZ0J0RyxRQUFRc0csS0FBUixDQUFjaEMsT0FBZCxDQUF5QjlGLEdBQXpCLFFBQWlDLEVBQWpDLENBQWhCO0FBQ0F5RCxtQkFBU1ksSUFBVCxDQUFjN0MsUUFBUXNHLEtBQXRCO0FBQ0E7QUFDQTtBQUNBO0FBQ0QsU0FQRDtBQVFBakgsNEJBQW9CNEMsUUFBcEIsRUFBOEJtRSxPQUE5QixFQUF1QzVILEdBQXZDLEVBQTRDK0IsSUFBNUMsQ0FBaUQsVUFDL0NnRyxlQUQrQyxFQUUvQztBQUNBcEgsa0JBQVFDLEdBQVIsQ0FBWSxrQkFBWjtBQUNBRCxrQkFBUUMsR0FBUixDQUFZbUgsZUFBWjtBQUNELFNBTEQ7QUFNRCxPQXBCSDtBQXNCRDs7OzhDQUN5QkMsUyxFQUFXaEksRyxFQUFLO0FBQ3hDLFVBQUk0SCxVQUFVLEtBQUtyRixRQUFuQjtBQUNBLGFBQU8sSUFBSXZCLE9BQUosQ0FBWSxVQUFDQyxPQUFELEVBQVVDLE1BQVYsRUFBcUI7QUFDdEMsWUFBSStHLFdBQVdqSSxHQUFmO0FBQ0EsWUFBSThHLGNBQWMsY0FBY21CLFFBQWQsR0FBeUIsSUFBM0M7O0FBRUFqSyxlQUFPa0ssR0FBUCxDQUFXLGNBQWN2SSxVQUF6QixFQUFxQ29DLElBQXJDLENBQTBDLFVBQVNILE1BQVQsRUFBaUI7QUFDekRqQixrQkFBUUMsR0FBUixDQUFZZ0IsTUFBWjtBQUNBZ0csa0JBQVE1RixXQUFSLENBQW9CekQsT0FBcEIsRUFBZ0N5QixHQUFoQyxTQUF1Q0wsVUFBdkM7QUFDQTtBQUNBM0IsaUJBQU9vRCxNQUFQLENBQWMrRyxJQUFkLENBQW1CLGNBQWNuSSxHQUFqQztBQUNBO0FBQ0FoQyxpQkFBT29LLE9BQVAsQ0FBZXRCLFdBQWYsRUFBNEIvRSxJQUE1QixDQUFpQyxtQkFBVztBQUMxQztBQUNBLGdCQUFJc0csWUFBWSxDQUFoQjs7QUFFQUMsb0JBQVFoSCxPQUFSLENBQWdCLG1CQUFXO0FBQ3pCWCxzQkFBUUMsR0FBUixlQUNjakIsVUFEZCw4QkFDaUQ2QixPQURqRDtBQUdBeEQscUJBQU80SSxJQUFQLENBQVlwRixPQUFaLEVBQXFCN0IsVUFBckIsRUFBaUNvQyxJQUFqQyxDQUFzQyxVQUFTd0csT0FBVCxFQUFrQjtBQUN0RDVILHdCQUFRQyxHQUFSLENBQVkySCxPQUFaO0FBQ0E1SCx3QkFBUUMsR0FBUixDQUFZLFNBQVo7QUFDQSxvQkFBSXlILGFBQWFDLFFBQVFuRSxNQUFSLEdBQWlCLENBQWxDLEVBQXFDa0U7QUFDdEMsZUFKRDtBQUtELGFBVEQ7QUFVQXBILG9CQUFRO0FBQ051SCx1QkFBUztBQURILGFBQVI7QUFHRCxXQWpCRDs7QUFtQkE7QUFDRCxTQTFCRDtBQTJCRCxPQS9CTSxDQUFQO0FBZ0NEOzs7c0NBQ2lCOUksRSxFQUFJO0FBQ3BCLFVBQUlrSSxVQUFVLEtBQUtyRixRQUFuQjtBQUNBLGFBQU8sSUFBSXZCLE9BQUosQ0FBWSxVQUFDQyxPQUFELEVBQVVDLE1BQVYsRUFBcUI7O0FBRXRDeUcsbUJBQVczRixXQUFYLENBQXVCekQsT0FBdkIsRUFBK0JtQixFQUEvQixFQUFrQyxVQUFDaUMsR0FBRCxFQUFLc0UsUUFBTCxFQUFnQjtBQUNoRGhGLGtCQUFRLEVBQUN1SCxTQUFRLElBQVQsRUFBUjtBQUNELFNBRkQ7QUFNRCxPQVJNLENBQVA7QUFTRDs7OzBDQUNxQjdJLFUsRUFBVzhJLEcsRUFBSTtBQUNuQyxVQUFJckMsV0FBVyxLQUFLN0QsUUFBcEI7QUFDQSxhQUFPLElBQUl2QixPQUFKLENBQVksVUFBQ0MsT0FBRCxFQUFTQyxNQUFULEVBQWtCO0FBQ2xDbEQsZUFBT3lELEtBQVAsQ0FBYS9DLGFBQVdpQixVQUF4QixFQUFtQyxFQUFDYyxRQUFPLENBQVIsRUFBVWMsVUFBU2tILEdBQW5CLEVBQW5DLEVBQTREMUcsSUFBNUQsQ0FBaUUsVUFBQ0gsTUFBRCxFQUFVO0FBQ3pFNUQsaUJBQU84RCxVQUFQLENBQWtCbkMsVUFBbEIsRUFBOEJvQyxJQUE5QixDQUFtQyxVQUFDMkcsR0FBRCxFQUFPO0FBQ3pDN0csOEJBQWtCbEMsVUFBbEIsRUFBNkJ5RyxRQUE3QjtBQUNBbkYsb0JBQVF5SCxHQUFSO0FBQ0EsV0FIRDtBQUlELFNBTEQ7QUFNRixPQVBNLENBQVA7QUFRRDs7O3VDQUNrQjFDLFEsRUFBUztBQUFBOztBQUN4QixhQUFPLElBQUloRixPQUFKLENBQVksVUFBQ0MsT0FBRCxFQUFTQyxNQUFULEVBQWtCO0FBQ2pDLFlBQUkwRyxVQUFVLE9BQUtyRixRQUFuQjtBQUNBViwwQkFBa0JtRSxRQUFsQixFQUEyQjRCLE9BQTNCO0FBQ0QzRyxnQkFBUSxFQUFDLFdBQVUsSUFBWCxFQUFSO0FBQ0YsT0FKTSxDQUFQO0FBS0g7Ozt3Q0FDbUJyQixNLEVBQVEsQ0FBRTs7O2dEQUNGSSxHLEVBQUlTLE0sRUFBUTtBQUFBOztBQUNwQyxhQUFPLElBQUlPLE9BQUosQ0FBWSxVQUFDQyxPQUFELEVBQVNDLE1BQVQsRUFBa0I7QUFDakNQLGdCQUFRQyxHQUFSLFlBQXFCWixHQUFyQixTQUE0QkEsR0FBNUIsbUJBQTZDUyxNQUE3QyxTQUF1REEsTUFBdkQ7QUFDRixlQUFLOEIsUUFBTCxDQUFjZSxNQUFkLFlBQ2F0RCxHQURiLFNBQ29CQSxHQURwQixtQkFDcUNTLE1BRHJDLFNBQytDQSxNQUQvQyxRQUVJLEVBQUUrQyxRQUFRLENBQVYsRUFBYUQsaUJBQWlCLElBQTlCLEVBRkosRUFHSSxVQUFDNUIsR0FBRCxFQUFNb0MsSUFBTixFQUFlO0FBQ2IsY0FBSU4sV0FBVyxFQUFmO0FBQ0E5QyxrQkFBUUMsR0FBUixDQUFZbUQsSUFBWjtBQUNBQSxlQUFLSixPQUFMLENBQWFyQyxPQUFiLENBQXFCLG1CQUFXOztBQUU5Qm1DLHFCQUFTWSxJQUFULENBQWM3QyxRQUFRcUMsR0FBdEI7QUFDQTVDLG9CQUFRd0MsUUFBUjtBQUNILFdBSkM7QUFLTCxTQVhEO0FBWUQsT0FkTSxDQUFQO0FBZ0JIOztBQUlBOzs7O2dDQUVZa0YsTSxFQUFPO0FBQUE7O0FBQ2xCLGFBQU8sSUFBSTNILE9BQUosQ0FBWSxVQUFDQyxPQUFELEVBQVNDLE1BQVQsRUFBa0I7QUFDbkMsWUFBSTBILFlBQVlDLHdCQUF3QkYsT0FBT0csT0FBL0IsQ0FBaEI7QUFDQSxlQUFLdkcsUUFBTCxDQUFjd0csTUFBZCxDQUFxQkgsU0FBckIsRUFBK0IsRUFBQzVJLEtBQUkySSxPQUFPM0ksR0FBWixFQUEvQixFQUFnRCxVQUFDMkIsR0FBRCxFQUFLQyxNQUFMLEVBQWM7QUFDNUQsY0FBR0QsR0FBSCxFQUNFVixRQUFRLEVBQUMrSCxPQUFNLEtBQVAsRUFBUjs7QUFFRi9ILGtCQUFRLEVBQUMrSCxPQUFNLElBQVAsRUFBUjtBQUNELFNBTEQ7QUFPRCxPQVRNLENBQVA7QUFVQTs7O3FDQUNnQkwsTSxFQUFPO0FBQUE7O0FBQ3ZCLGFBQU8sSUFBSTNILE9BQUosQ0FBWSxVQUFDQyxPQUFELEVBQVNDLE1BQVQsRUFBa0I7QUFDakMsWUFBSTBILFlBQVlDLHdCQUF3QkYsT0FBT0csT0FBL0IsQ0FBaEI7QUFDQSxlQUFLdkcsUUFBTCxDQUFjd0csTUFBZCxDQUFxQkgsU0FBckIsRUFBK0IsRUFBQzVJLEtBQUkySSxPQUFPM0ksR0FBWixFQUEvQixFQUFnRCxVQUFDMkIsR0FBRCxFQUFLQyxNQUFMLEVBQWM7QUFDOUQsY0FBR0QsR0FBSCxFQUNJVixRQUFRLEVBQUNnSSxTQUFRLEtBQVQsRUFBUjs7QUFFRmhJLGtCQUFRLEVBQUNnSSxTQUFRLElBQVQsRUFBUjtBQUNELFNBTEQ7QUFNSCxPQVJNLENBQVA7QUFTQTs7O2lDQUNZdEosVSxFQUFXO0FBQ3RCLGFBQU8sSUFBSXFCLE9BQUosQ0FBWSxVQUFDQyxPQUFELEVBQVNDLE1BQVQsRUFBa0I7O0FBRWxDekMsb0JBQVkrRCxXQUFaLENBQXdCRSxHQUF4QixDQUE0QjdELFVBQVFjLFVBQXBDLEVBQStDMUIsU0FBUzZCLElBQVQsRUFBL0MsRUFBZ0UsVUFBQzZCLEdBQUQsRUFBS0MsTUFBTCxFQUFjO0FBQzVFLGNBQUlELEdBQUosRUFBU1YsUUFBUSxFQUFDb0MsT0FBTSxLQUFQLEVBQVI7QUFDVHBDLGtCQUFRLEVBQUNvQyxPQUFNLElBQVAsRUFBUjtBQUNELFNBSEQ7QUFJRixPQU5NLENBQVA7QUFPRDtBQUNEOzs7Ozs7O0FBR0gsU0FBU3dGLHVCQUFULENBQWlDSyxZQUFqQyxFQUE4QztBQUM1QyxNQUFJQyxRQUFRRCxhQUFhRSxLQUFiLENBQW1CLEdBQW5CLENBQVo7QUFDQSxNQUFJRCxNQUFNaEYsTUFBTixJQUFnQixDQUFwQixFQUNFLElBQUksT0FBT2dGLE1BQU0sQ0FBTixDQUFQLElBQW1CLFdBQXZCLEVBQ0EsT0FBT0EsTUFBTSxDQUFOLEVBQVNwRCxJQUFULEVBQVA7QUFDRixTQUFPLEVBQVA7QUFDRCIsImZpbGUiOiJSZWRpc1NlcnZpY2VzL1BhY2thZ2VTZXJ2aWNlLmpzIiwic291cmNlc0NvbnRlbnQiOlsiaW1wb3J0IHsgY3B1cyB9IGZyb20gXCJvc1wiO1xuaW1wb3J0IHsgcHJvbWlzZXMgfSBmcm9tIFwiZG5zXCI7XG5cblxudmFyIHJlZGlzID0gcmVxdWlyZShcInJlZGlzXCIpO1xudmFyIGxyZWRpcyA9IHJlcXVpcmUoXCIuL3JlZGlzLWxvY2FsXCIpO1xudmFyIG1vbWVudCA9IHJlcXVpcmUoXCJtb21lbnRcIik7XG52YXIgcmVkaXNTZWFyY2ggPSByZXF1aXJlKFwiLi4vcmVkaXNlYXJjaGNsaWVudFwiKTtcbnZhciBmcyA9IHJlcXVpcmUoXCJmc1wiKTtcbnZhciBtb21lbnQgPSByZXF1aXJlKCdtb21lbnQnKVxudmFyIFBhY2thZ2VVdGlsID0gcmVxdWlyZShcIi4uL1V0aWwvcGFja2FnZXV0aWxcIikuUGFja2FnZVV0aWxpdHk7XG52YXIgcGFja2FnZVV0aWwgPSBuZXcgUGFja2FnZVV0aWwoKTtcbmNvbnN0IFBLR19JRFggPSBcImluZGV4OnBhY2thZ2VzXCI7XG5jb25zdCBQS0dfSURfQ09VTlRFUiA9IFwicGFja2FnZTppZFwiO1xudmFyIGRhdGFDb250ZXh0ID0gcmVxdWlyZSgnLi9kYXRhQ29udGV4dCcpXG5jb25zdCBQS0dfUFJFRklYID0gXCJwYWNrYWdlczpcIjtcbmNvbnN0IEFXQl9JRCA9IFwiYXdiOmlkXCJcbmNvbnN0IElOREVYX0FXQiA9IFwiaW5kZXg6YXdiXCJcbmNvbnN0IFJFQ19QS0cgPSBcInBrZzpyZWM6XCJcbnZhciBDdXN0b21lclNlcnZpY2UgPSByZXF1aXJlKCcuL0N1c3RvbWVyU2VydmljZScpLkN1c3RvbWVyU2VydmljZTsgXG52YXIgY3VzdG9tZXJTZXJ2aWNlID0gbmV3IEN1c3RvbWVyU2VydmljZSgpXG5jb25zdCBQS0dfU1RBVFVTID0geyBcbiAgMSA6IFwiUmVjZWl2ZWRcIixcbiAgMjogXCJJbiBUcmFuc2l0XCIsXG4gIDM6IFwiUHJvY2Vzc2luZ1wiLFxuICA0OiBcIlJlYWR5IGZvciBQaWNrdXAgLyBEZWxpdmVyeVwiLFxuICA1OiBcIk91dCBmb3IgRGVsaXZlcnlcIixcbiAgNjogXCJEZWxpdmVyZWRcIlxuXG59OyBcblxuY29uc3QgYXdiSW5kZXggPSByZWRpc1NlYXJjaChyZWRpcywgSU5ERVhfQVdCLCB7XG4gIGNsaWVudE9wdGlvbnM6IGxyZWRpcy5zZWFyY2hDbGllbnREZXRhaWxzXG59KTtcbmNvbnN0IHBhY2thZ2VJbmRleCA9IHJlZGlzU2VhcmNoKHJlZGlzLCBQS0dfSURYLCB7XG4gIGNsaWVudE9wdGlvbnM6IGxyZWRpcy5zZWFyY2hDbGllbnREZXRhaWxzXG59KTtcbmZ1bmN0aW9uIGdldFBhY2thZ2VWb2x1bW5lKG1QYWNrYWdlKXtcblxuICByZXR1cm4gMDsgXG59XG5mdW5jdGlvbiBjcmVhdGVEb2N1bWVudCh0UGFja2FnZSkge1xuICB2YXIgcGFja2FnZURvY3VtZW50ID0ge1xuICAgIGlkOnRQYWNrYWdlLmlkLFxuICAgIHRyYWNraW5nTm86IHRQYWNrYWdlLnRyYWNraW5nTm8sXG4gICAgc2t5Ym94OiB0UGFja2FnZS5za3lib3gsXG4gICAgZGF0ZVJlY2lldmVkIDogbW9tZW50KCkudW5peCgpLCBcbiAgICBhd2I6MCwgXG4gICAgbWlkOjAsXG4gICAgdm9sdW1lOiBnZXRQYWNrYWdlVm9sdW1uZSh0UGFja2FnZSksXG4gICAgd2VpZ2h0OnRQYWNrYWdlLndlaWdodCxcbiAgICBwaWVjZXM6dFBhY2thZ2UucGllY2VzLFxuICAgIGN1c3RvbWVyOiB0UGFja2FnZS5jdXN0b21lcixcbiAgICBzaGlwcGVyOiB0UGFja2FnZS5zaGlwcGVyLFxuICAgIGRlc2NyaXB0aW9uOiB0UGFja2FnZS5kZXNjcmlwdGlvbixcbiAgICBkaW1lbnNpb25zOnRQYWNrYWdlLmRpbWVuc2lvbnMsXG4gICAgY2Fycmllcjp0UGFja2FnZS5jYXJyaWVyLFxuICAgIC8vc2t5Ym94VjogdFBhY2thZ2Uuc2t5Ym94LCBhZGQgZGltZW5pb24gXG4gICAgc3RhdHVzOiB0UGFja2FnZS5zdGF0dXMsXG4gICAgbWlkOiB0UGFja2FnZS5taWQsXG4gICAgdmFsdWU6IHRQYWNrYWdlLnZhbHVlLFxuICAgIFxuICB9O1xuICBjb25zb2xlLmxvZyhcImFib3V0IHRvIGFkZCB0aGUgcGFja2FnZSB0byB0aGUgaW5kZXhcIik7XG4gIHJldHVybiBwYWNrYWdlRG9jdW1lbnQ7XG59XG5mdW5jdGlvbiBzZXRQYWNrYWdlSW5UcmFuc2l0KGtleXMsIG1zZWFyY2hlcikge1xuICByZXR1cm4gbmV3IFByb21pc2UoKHJlc29sdmUsIHJlamVjdCkgPT4ge1xuICAgIHZhciBiYXRjaGVyID0gbXNlYXJjaGVyLmNsaWVudC5iYXRjaCgpO1xuICAgIGtleXMuZm9yRWFjaChlbGVtZW50ID0+IHtcbiAgICAgIHZhciB2YWx1ZSA9IHtcbiAgICAgICAgc3RhdHVzOiAyLFxuICAgICAgICBsb2NhdGlvbjogXCJJbiBUcmFuc2l0XCJcbiAgICAgIH07XG4gICAgICBjb25zb2xlLmxvZyhlbGVtZW50ICsgXCJpcyB0aGUgZWxlbWVudFwiKTtcblxuICAgICAgYmF0Y2hlci5obXNldChQS0dfUFJFRklYICsgZWxlbWVudCwgdmFsdWUpO1xuICAgIH0pO1xuICAgIGJhdGNoZXIuZXhlYygoZXJyLCByZXN1bHQpID0+IHtcbiAgICAgIGNvbnNvbGUubG9nKHJlc3VsdCk7XG4gICAgICAvL3JlYWRkIHRoZSBkb2N1bWVudHMgaGVyZVxuICAgICAga2V5cy5mb3JFYWNoKGVsZW1lbnQgPT4ge1xuICAgICAgICBhZGRQYWNrYWdlVG9JbmRleChlbGVtZW50LCBtc2VhcmNoZXIpO1xuICAgICAgfSk7XG4gICAgICByZXNvbHZlKHJlc3VsdCk7XG4gICAgfSk7XG4gIH0pO1xufVxuXG5mdW5jdGlvbiBhZGRQYWNrYWdlVG9JbmRleCh0cmFja2luZ05vLCBtc2VhcmNoZXIpIHtcbiAgbHJlZGlzLmdldFBhY2thZ2UodHJhY2tpbmdObykudGhlbihwYWNrID0+IHtcbiAgICBtc2VhcmNoZXIuZGVsRG9jdW1lbnQoUEtHX0lEWCwgYCR7cGFjay5taWR9LSR7dHJhY2tpbmdOb31gLCAoZXJyLCBkb25lKSA9PiB7XG4gICAgICB2YXIgZG9jdW1lbnQgPSBjcmVhdGVEb2N1bWVudChwYWNrKTtcbiAgICAgIGNvbnNvbGUubG9nKFwicmVhZGRpbmcgcGFja2FnZSB0byB0aGUgaW5kZXggbGlrZSBhIGJvc3MgXCIgKyB0cmFja2luZ05vKTtcbiAgICAgIG1zZWFyY2hlci5hZGQocGFjay5taWQgKyBcIi1cIiArIHBhY2sudHJhY2tpbmdObywgZG9jdW1lbnQpO1xuICAgIH0pO1xuICB9KTtcbn1cbmV4cG9ydCBjbGFzcyBQYWNrYWdlU2VydmljZSB7XG4gIGNvbnN0cnVjdG9yKCkge1xuICAgIHRoaXMuc2V0dXBJbmRleCgpO1xuICB9XG4gIHNldHVwSW5kZXgoKSB7XG4gICAgdGhpcy5teVNlYXJjaCA9IHJlZGlzU2VhcmNoKHJlZGlzLCBQS0dfSURYLCB7XG4gICAgICBjbGllbnRPcHRpb25zOiBscmVkaXMuc2VhcmNoQ2xpZW50RGV0YWlsc1xuICAgIH0pO1xuICB9XG4gIGdldE5ld0F3Yigpe1xuICAgIHJldHVybiBuZXcgUHJvbWlzZSgocmVzb2x2ZSxyZWplY3QpPT57XG4gICAgICBkYXRhQ29udGV4dC5yZWRpc0NsaWVudC5leGlzdHMoQVdCX0lELChlcnIscmVzdWx0KT0+e1xuICAgICAgICBjb25zb2xlLmxvZyhyZXN1bHQpOyBcbiAgICAgICAgaWYgKHJlc3VsdCAhPSBcIjFcIil7XG4gICAgICAgICAgZGF0YUNvbnRleHQucmVkaXNDbGllbnQuc2V0KEFXQl9JRCA9PSAxMDAwMDAsKGVycixpbml0UmVzdWx0KT0+e1xuICAgICAgICAgICAgZGF0YUNvbnRleHQucmVkaXNDbGllbnQuaW5jcihBV0JfSUQsKGVycixuZXdJZCk9PntcbiAgICAgICAgICAgICAgcmVzb2x2ZSh7YXdiOm5ld0lkfSlcbiAgICAgICAgICAgIH0pXG4gICAgICAgICAgfSlcbiAgICAgICAgfVxuICAgICAgICBlbHNlIHtcbiAgICAgICAgICBkYXRhQ29udGV4dC5yZWRpc0NsaWVudC5pbmNyKEFXQl9JRCwoZXJyLG5ld0lkKT0+e1xuICAgICAgICAgICAgcmVzb2x2ZSh7YXdiOm5ld0lkfSlcbiAgICAgICAgICB9KVxuICAgICAgICB9XG4gICAgICB9KVxuICAgIH0pO1xuICB9XG4gIHNhdmVBd2IoYXdiKXtcbiAgICByZXR1cm4gbmV3IFByb21pc2UoKHJlc29sdmUscmVqZWN0KT0+e1xuICAgICAgY29uc29sZS5sb2coJ3NhdmluZy4uLicsYXdiLG1vbWVudCgpLnRvU3RyaW5nKFwiaGg6bW06c3NcIikpXG4gICAgICBkYXRhQ29udGV4dC5yZWRpc0NsaWVudC5pbmNyKEFXQl9JRCwoZXJyLHJlcGx5KT0+e1xuICAgICAgICBhd2IuaWQgPSByZXBseTsgXG4gICAgICAgIGF3Yi5zdGF0dXMgPSAxOyBcbiAgICAgICAgaWYgKGF3Yi5pbnZvaWNlKXtcbiAgICAgICAgICBhd2IuaGFzRG9jcyA9IDFcbiAgICAgICAgICBjb25zb2xlLmxvZyhcIkhBUyBET0NDQ0NDXCIpXG4gICAgICAgIH1cbiAgICAgICAgZWxzZSB7XG4gICAgICAgICAgYXdiLmhhc0RvY3MgPSAwIDsgXG4gICAgICAgICAgY29uc29sZS5sb2coXCJIQVMgTk8gRE9DQ0NDQ1wiKVxuICAgICAgICB9XG4gICAgICAgIFxuICAgICAgICBhd2IuZGF0ZUNyZWF0ZWQgPSBtb21lbnQoKS51bml4KCk7IFxuICAgICAgICAgIGF3YkluZGV4LmFkZChhd2IuaWQsYXdiLChlcnIxLGF3YlJlcyk9PntcbiAgICAgICAgICAgIGlmIChlcnIxKXtcbiAgICAgICAgICAgICAgY29uc29sZS5sb2coJ3NhdmluZyBlcnInLGVycjEpXG4gICAgICAgICAgICAgIHJlc29sdmUoe3NhdmVkOmZhbHNlfSlcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIHJlc29sdmUoe3NhdmVkOnRydWUsIGlkOnJlcGx5fSlcbiAgICAgICAgICB9KVxuICAgICAgfSlcbiAgICAgICBcbiAgICAgIFxuICAgICAgXG4gICAgfSlcbiAgfVxuICBnZXRBd2JPdmVydmlldyhpZCl7XG4gICAgLy8gZ2V0IHRoZSBhd2IgcGFja2FnZXMgYW5kIGFkZCBldmVyeXRoaW5nIGluIFxuICAgIHJldHVybiBuZXcgUHJvbWlzZSgocmVzb2x2ZSxyZWplY3QpPT57XG4gICAgICBwYWNrYWdlSW5kZXguc2VhcmNoKGBAYXdiOlske2lkfSAke2lkfV1gLHtudW1iZXJPZlJlc3VsdHM6NTAwMCxvZmZzZXQ6MH0sKGVycixwYWNrYWdlcyk9PntcbiAgICAgICAgdmFyIHdlaWdodCA9IDAgOyBcbiAgICAgICAgdmFyIHBpZWNlcyA9IHBhY2thZ2VzLnRvdGFsUmVzdWx0czsgXG4gICAgICAgIHZhciBkZXNjcmlwdGlvbiA9IFwiXCJcbiAgICAgICAgcGFja2FnZXMucmVzdWx0cy5mb3JFYWNoKHBhY2thZ2UxID0+IHtcbiAgICAgICAgICBpZiAoZGVzY3JpcHRpb24gPT1cIlwiKVxuICAgICAgICAgICAgZGVzY3JpcHRpb24gPSBwYWNrYWdlMS5kb2MuZGVzY3JpcHRpb247IFxuICAgICAgICAgIHdlaWdodCArPSBOdW1iZXIocGFja2FnZTEuZG9jLndlaWdodClcbiAgICAgICAgfSk7XG4gICAgICAgIHZhciBkYXRhICA9IHt3ZWlnaHQ6d2VpZ2h0LGRlc2NyaXB0aW9uOmRlc2NyaXB0aW9uLHBpZWNlczpwaWVjZXN9XG4gICAgICAgIGNvbnNvbGUubG9nKGRhdGEsXCJBV0IgREVUQUlMU1wiKTsgXG4gICAgICAgIHJlc29sdmUoIGRhdGEpXG4gICAgICB9KVxuICAgIH0pXG4gICBcbiAgfVxuICBnZXRBd2JEZXRhaWxzKGlkKXtcbiAgICB2YXIgc3J2ID0gdGhpczsgXG4gICAgcmV0dXJuIG5ldyBQcm9taXNlKChyZXNvbHZlLHJlamVjdCk9PntcbiAgICAgIGNvbnNvbGUubG9nKGBAYXdiOlske2lkfSAke2lkfV1gKVxuICAgICBcbiAgICAgIHBhY2thZ2VJbmRleC5zZWFyY2goYEBhd2I6WyR7aWR9ICR7aWR9XWAse251bWJlck9mUmVzdWx0czo1MDAwLG9mZnNldDowfSwoZXJyLHBhY2thZ2VzKT0+e1xuICAgICAgICBpZiAoZXJyKVxuICAgICAgICAgY29uc29sZS5sb2coZXJyKVxuICAgICAgXG4gICAgICAgIHZhciAgcGFja2FnZWxpc3QgID0gW11cbiAgICAgICAgdmFyIGNvdW50ID0gMTsgXG4gICAgICAgIHBhY2thZ2VzLnJlc3VsdHMuZm9yRWFjaChwYWNrYWdlMSA9PiB7XG5cbiAgICAgICAgICBpZiAocGFja2FnZTEuZG9jLnRyYWNraW5nTm8ubGVuZ3RoID4gNyl7XG4gICAgICAgICAgICAvL29ubHkgZGlzcGxheSB0aGUgbGFzdCA3IFxuICAgICAgICAgICAgcGFja2FnZTEuZG9jLnRyYWNraW5nTm8gPSBwYWNrYWdlMS5kb2MudHJhY2tpbmdOby5zdWJzdHJpbmcocGFja2FnZTEuZG9jLnRyYWNraW5nTm8ubGVuZ3RoIC03KVxuICAgICAgICAgICAgXG4gICAgICAgICAgfVxuICAgICAgICAgIHBhY2thZ2UxLmRvYy5wYWNrYWdlSW5kZXggPSBjb3VudDtcbiAgICAgICAgICBjb3VudCArKzsgXG4gICAgICAgICAgcGFja2FnZWxpc3QucHVzaCggcGFja2FnZTEuZG9jKVxuICAgICAgICB9KTtcbiAgICAgICBcbiAgICAgICBcbiAgICAgICAgcmVzb2x2ZSggcGFja2FnZWxpc3QpXG4gICAgICB9KVxuICAgIH0pXG4gIH1cbiAgbGlzdE5vRG9jc0ZsbCgpe1xuICAgIHJldHVybiBuZXcgUHJvbWlzZSgocmVzb2x2ZSxyZWplY3QpPT57XG4gICAgICAgYXdiSW5kZXguc2VhcmNoKFwiQHN0YXR1czpbMSAxXSBAaGFzRG9jczpbMCAwXVwiLHtvZmZzZXQ6MCxudW1iZXJPZlJlc3VsdHM6NTAwMCxzb3J0Qnk6J2lkJ30sKGVycixhd2JzKT0+e1xuICAgICAgICAgdmFyIGF3Ykxpc3QgPSBbXTsgXG4gICAgICAgICBQcm9taXNlLmFsbChhd2JzLnJlc3VsdHMubWFwKGF3Yj0+Y3VzdG9tZXJTZXJ2aWNlLmdldEN1c3RvbWVyKGF3Yi5kb2MuY3VzdG9tZXJJZCkpKS50aGVuKGN1c3RvbWVycz0+e1xuICAgICAgICAgICBQcm9taXNlLmFsbChhd2JzLnJlc3VsdHMubWFwKGF3Yj0+dGhpcy5nZXRBd2JPdmVydmlldyhhd2IuZG9jLmlkKSkpLnRoZW4oZGV0YWlscz0+e1xuICAgICAgICAgICAgY29uc29sZS5sb2coXCJnb3QgdGhlIGN1c3RvbWVyc1wiLGN1c3RvbWVycywgYXdicylcbiAgICAgICAgICAgIGZvcih2YXIgaSA9MCA7IGkgPCBhd2JzLnJlc3VsdHMubGVuZ3RoIDsgaSsrICl7XG4gICAgICAgICAgICAgIHZhciBhd2IgPSBhd2JzLnJlc3VsdHNbaV07IFxuICAgICAgICAgICAgICBhd2IuZG9jLmRhdGVDcmVhdGVkID0gbW9tZW50LnVuaXgoYXdiLmRvYy5kYXRlQ3JlYXRlZCkuZm9ybWF0KFwiWVlZWS1NTS1ERCBoaDptbSBBXCIpXG4gICAgICAgICAgICAgIC8vd2UgbmVlZCB0byBnZXQgdGhlIGN1c3RvbWVyIFxuICAgICAgICAgICAgICBhd2IuZG9jLmNvbnNpZ25lZSA9IGN1c3RvbWVyc1tpXS5uYW1lOyBcbiAgICAgICAgICAgICAgYXdiLmRvYy53ZWlnaHQgPSBkZXRhaWxzW2ldLndlaWdodDsgXG4gICAgICAgICAgICAgIGF3Yi5kb2MucG1iID0gY3VzdG9tZXJzW2ldLnBtYjsgXG4gICAgICAgICAgICAgIGF3Yi5kb2MuZGVzY3JpcHRpb24gPSBkZXRhaWxzW2ldLmRlc2NyaXB0aW9uOyBcbiAgICAgICAgICAgICAgYXdiLmRvYy5waWVjZXMgPSBkZXRhaWxzW2ldLnBpZWNlczsgXG4gICAgICAgICAgICAgIGlmIChjdXN0b21lcnNbaV0ucG1iID09ICcnKXtcbiAgICAgICAgICAgICAgICBhd2IuZG9jLnBtYiA9ICc5MDAwJ1xuICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgIGNvbnNvbGUubG9nKCdwdXNoaW5nICcsYXdiKVxuICAgICAgICAgICAgICAvL3dlIG5lZWQgdG8gZ2V0IGFsbCB0aGUgcGFja2FnZXMgXG4gICAgICAgICAgICAgIGF3Ykxpc3QucHVzaChhd2IuZG9jKVxuICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICByZXNvbHZlKHthd2JzOmF3Ykxpc3R9KVxuICAgICAgICAgICB9KVxuICAgICAgICAgIFxuICAgICAgICAgIH0pLmNhdGNoKGVycj0+e1xuICAgICAgICAgICAgY29uc29sZS5sb2coZXJyKTsgXG4gICAgICAgICAgfSlcbiAgICAgICAgIFxuICAgICAgICAvLyAgYXdicy5yZXN1bHRzLmZvckVhY2goYXdiID0+IHtcbiAgICAgICAgICAgXG4gICAgICAgICAgXG4gICAgICAgIC8vICB9KTtcbiAgICAgICAgIFxuICAgICAgIH0pXG4gICAgfSlcbiAgfVxuXG4gIGxpc3RBd2JpbkZsbCgpe1xuICAgIHJldHVybiBuZXcgUHJvbWlzZSgocmVzb2x2ZSxyZWplY3QpPT57XG4gICAgICAgYXdiSW5kZXguc2VhcmNoKFwiQHN0YXR1czpbMSAxXSBAaGFzRG9jczpbMSAxXVwiLHtvZmZzZXQ6MCxudW1iZXJPZlJlc3VsdHM6NTAwMCxzb3J0Qnk6J2lkJ30sKGVycixhd2JzKT0+e1xuICAgICAgICAgdmFyIGF3Ykxpc3QgPSBbXTsgXG4gICAgICAgICBQcm9taXNlLmFsbChhd2JzLnJlc3VsdHMubWFwKGF3Yj0+Y3VzdG9tZXJTZXJ2aWNlLmdldEN1c3RvbWVyKGF3Yi5kb2MuY3VzdG9tZXJJZCkpKS50aGVuKGN1c3RvbWVycz0+e1xuICAgICAgICAgICBQcm9taXNlLmFsbChhd2JzLnJlc3VsdHMubWFwKGF3Yj0+dGhpcy5nZXRBd2JPdmVydmlldyhhd2IuZG9jLmlkKSkpLnRoZW4oZGV0YWlscz0+e1xuICAgICAgICAgICAgY29uc29sZS5sb2coXCJnb3QgdGhlIGN1c3RvbWVyc1wiLGN1c3RvbWVycywgYXdicylcbiAgICAgICAgICAgIGZvcih2YXIgaSA9MCA7IGkgPCBhd2JzLnJlc3VsdHMubGVuZ3RoIDsgaSsrICl7XG4gICAgICAgICAgICAgIHZhciBhd2IgPSBhd2JzLnJlc3VsdHNbaV07IFxuICAgICAgICAgICAgICBhd2IuZG9jLmRhdGVDcmVhdGVkID0gbW9tZW50LnVuaXgoYXdiLmRvYy5kYXRlQ3JlYXRlZCkuZm9ybWF0KFwiWVlZWS1NTS1ERCBoaDptbSBBXCIpXG4gICAgICAgICAgICAgIC8vd2UgbmVlZCB0byBnZXQgdGhlIGN1c3RvbWVyIFxuICAgICAgICAgICAgICBhd2IuZG9jLmNvbnNpZ25lZSA9IGN1c3RvbWVyc1tpXS5uYW1lOyBcbiAgICAgICAgICAgICAgYXdiLmRvYy5wbWIgPSBjdXN0b21lcnNbaV0ucG1iOyBcbiAgICAgICAgICAgICAgYXdiLmRvYy53ZWlnaHQgPSBkZXRhaWxzW2ldLndlaWdodDsgXG4gICAgICAgICAgICAgIGF3Yi5kb2MuZGVzY3JpcHRpb24gPSBkZXRhaWxzW2ldLmRlc2NyaXB0aW9uOyBcbiAgICAgICAgICAgICAgYXdiLmRvYy5waWVjZXMgPSBkZXRhaWxzW2ldLnBpZWNlczsgXG4gICAgICAgICAgICAgIGlmIChjdXN0b21lcnNbaV0ucG1iID09ICcnKXtcbiAgICAgICAgICAgICAgICBhd2IuZG9jLnBtYiA9ICc5MDAwJ1xuICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgIGNvbnNvbGUubG9nKCdwdXNoaW5nICcsYXdiKVxuICAgICAgICAgICAgICAvL3dlIG5lZWQgdG8gZ2V0IGFsbCB0aGUgcGFja2FnZXMgXG4gICAgICAgICAgICAgIGF3Ykxpc3QucHVzaChhd2IuZG9jKVxuICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICByZXNvbHZlKHthd2JzOmF3Ykxpc3R9KVxuICAgICAgICAgICB9KVxuICAgICAgICAgIFxuICAgICAgICAgIH0pLmNhdGNoKGVycj0+e1xuICAgICAgICAgICAgY29uc29sZS5sb2coZXJyKTsgXG4gICAgICAgICAgfSlcbiAgICAgICAgIFxuICAgICAgICAvLyAgYXdicy5yZXN1bHRzLmZvckVhY2goYXdiID0+IHtcbiAgICAgICAgICAgXG4gICAgICAgICAgXG4gICAgICAgIC8vICB9KTtcbiAgICAgICAgIFxuICAgICAgIH0pXG4gICAgfSlcbiAgfVxuICBnZXRBd2IoaWQpe1xuICAgIGNvbnN0IHNydiA9IHRoaXM7IFxuICAgIHJldHVybiBuZXcgUHJvbWlzZSgocmVzb2x2ZSxyZWplY3QpPT57XG4gICAgICBhd2JJbmRleC5nZXREb2MoaWQsKGVycixhd2IpPT57XG4gICAgICAgIC8vZ2V0IHRoZSBjdXN0b21lciBcbiAgICAgICAgY3VzdG9tZXJTZXJ2aWNlLmdldEN1c3RvbWVyKGF3Yi5kb2MuY3VzdG9tZXJJZCkudGhlbihjdXN0b21lcj0+e1xuICAgICAgICAgIGF3Yi5kb2MuY3VzdG9tZXIgPSBjdXN0b21lcjsgXG4gICAgICAgICAgc3J2LmdldEF3YkRldGFpbHMoaWQpLnRoZW4ocGFja2FnZXM9PntcbiAgICAgICAgICAgIC8vZ2V0IHRoZSBwYWNrYWdlcyBmb3IgdGhlIGF3YiBcbiAgICAgICAgICAgIGF3Yi5kb2MucGFja2FnZXMgPSBwYWNrYWdlczsgXG4gICAgICAgICAgICByZXNvbHZlKHthd2I6YXdiLmRvY30pICBcbiAgICAgICAgICB9KVxuICAgICAgICAgIFxuICAgICAgICB9KVxuICAgICAgICBcbiAgICAgIH0pXG4gICAgfSlcbiAgfVxuICB1cGRhdGVMb2NhdGlvbih0cmFja2luZ051bWJlcixsb2NhdGlvbl9pZCl7XG4gICAgcmV0dXJuIG5ldyBQcm9taXNlKChyZXNvbHZlLHJlamVjdCk9PntcbiAgICAgIHBhY2thZ2VJbmRleC5zZWFyY2goXCJAdHJhY2tpbmdObzpcIit0cmFja2luZ051bWJlcix7bG9jYXRpb246bG9jYXRpb25faWR9LChlcnIscGFja2FnZVJlc3VsdCk9PntcblxuICAgICAgfSlcbiAgICB9KVxuICB9XG4gIHNhdmVQYWNrYWdlVG9Bd2IobmV3UGFja2FnZSl7XG4gICAgcmV0dXJuIG5ldyBQcm9taXNlKChyZXNvbHZlLHJlc3VsdCk9PntcbiAgICAgIGRhdGFDb250ZXh0LnJlZGlzQ2xpZW50LmluY3IoUEtHX0lEX0NPVU5URVIsKGVycixpZCk9PntcbiAgICAgICAgbmV3UGFja2FnZS5pZCA9IGlkOyBcbiAgICAgICAgcGFja2FnZUluZGV4LmFkZChpZCxuZXdQYWNrYWdlLChlcnIscmVzdWx0KT0+e1xuICAgICAgICAgIGlmIChlcnIpXG4gICAgICAgICAgICBjb25zb2xlLmxvZyhlcnIpOyBcbiAgICAgICAgICByZXNvbHZlKHtzYXZlZDp0cnVlLGlkOmlkfSlcbiAgICAgICAgfSlcbiAgICAgIH0pXG4gICAgfSlcbiAgfVxuICBzYXZlUGFja2FnZShib2R5KXtcbiAgICByZXR1cm4gbmV3IFByb21pc2UoKHJlc29sdmUscmVqZWN0KT0+e1xuICAgICAgdmFyIGNQYWNrYWdlID0ge1xuICAgICAgICBcbiAgICAgICAgc2t5Ym94OiBib2R5LnNreWJveCxcbiAgICAgICAgY3VzdG9tZXI6IGJvZHkuY3VzdG9tZXIucmVwbGFjZShcIi1cIiwgXCJcIikudHJpbSgpLFxuICAgICAgICB0cmFja2luZ05vOiBib2R5LnRyYWNraW5nLFxuICAgICAgICBkZXNjcmlwdGlvbjogYm9keS5kZXNjcmlwdGlvbixcbiAgICAgICAgc2hpcHBlcjogYm9keS5zaGlwcGVyLFxuICAgICAgICBjYXJyaWVyOmJvZHkuY2FycmllcixcbiAgICAgICAgdmFsdWU6IE51bWJlcihib2R5LnZhbHVlKSxcbiAgICAgICAgcGllY2VzOiBOdW1iZXIoYm9keS5waWVjZXMpLFxuICAgICAgICB3ZWlnaHQ6IE51bWJlcihib2R5LndlaWdodCksXG4gICAgICAgIGRpbWVuc2lvbnM6IGJvZHkuZGltZW5zaW9ucyxcbiAgICAgICAgc3RhdHVzOiAxLFxuICAgICAgICBsb2NhdGlvbjogXCJGTExcIixcbiAgICAgICAgbWlkOiAwLFxuICAgICAgICBhd2I6MCxcbiAgICAgICAgLy9oYXNPcHQ6IHRydWUsXG4gICAgICAgIC8vbXR5cGU6IGJvZHkubXR5cGVcbiAgICAgIH07XG4gICAgICAvL3ZhbGlkYXRlIHRoZSBwYWNrYWdlIFxuICAgICAgZGF0YUNvbnRleHQucmVkaXNDbGllbnQuaW5jcihQS0dfSURfQ09VTlRFUiwoZXJyLGlkKT0+e1xuICAgICAgICBjUGFja2FnZS5pZCA9IGlkOyBcbiAgICAgICAgZGF0YUNvbnRleHQucmVkaXNDbGllbnQuc2V0KFBLR19QUkVGSVgraWQsY1BhY2thZ2UsKGVycixyZXNwb25zZSk9PntcbiAgICAgICAgICBpZiAoZXJyKXtcbiAgICAgICAgICAgIHJlamVjdCh7c2F2ZWQ6ZmFsc2UsZXJyOmVycn0pXG4gICAgICAgICAgfVxuICAgICAgICAgICB2YXIgaW5kZXhQYWNrYWdlID0gIGNyZWF0ZURvY3VtZW50KGNQYWNrYWdlKTsgXG4gICAgICAgICAgIGNvbnNvbGUubG9nKGluZGV4UGFja2FnZSk7IFxuICAgICAgICAgICBwYWNrYWdlSW5kZXguYWRkKGNQYWNrYWdlLmlkLGluZGV4UGFja2FnZSwoZXJyMSxkb2NSZXN1bHQpPT57XG4gICAgICAgICAgICAgY29uc29sZS5sb2coZG9jUmVzdWx0KTsgXG4gICAgICAgICAgICAgaWYoZXJyMSl7XG4gICAgICAgICAgICAgICByZWplY3Qoe3NhdmVkOmZhbHNlLGVycjplcnIxfSlcbiAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgcmVzb2x2ZSh7c2F2ZWQ6dHJ1ZX0pXG4gICAgICAgICAgIH0pXG5cbiAgICAgICAgfSlcbiAgICAgIH0pO1xuICAgIFxuXG5cbiAgICB9KVxuICB9XG4gIHNhdmVQYWNrYWdlT2xkKGJvZHkpIHtcbiAgICBcbiAgICB2YXIgc2VhcmNoZXIgPSB0aGlzLm15U2VhcmNoOyBcbiAgICByZXR1cm4gbmV3IFByb21pc2UoKHJlc29sdmUsIHJlamVjdCkgPT4ge1xuICAgICAgdmFyIGNQYWNrYWdlID0ge1xuICAgICAgICBza3lib3g6IGJvZHkuc2t5Ym94LFxuICAgICAgICBjdXN0b21lcjogYm9keS5jdXN0b21lci5yZXBsYWNlKFwiLVwiLCBcIlwiKS50cmltKCksXG4gICAgICAgIHRyYWNraW5nTm86IGJvZHkudHJhY2tpbmcsXG4gICAgICAgIGR1dHlQZXJjZW50OiAwLjIsXG4gICAgICAgIGRlc2NyaXB0aW9uOiBib2R5LmRlc2NyaXB0aW9uLFxuICAgICAgICBzaGlwcGVyOiBib2R5LnNoaXBwZXIsXG4gICAgICAgIHZhbHVlOiBOdW1iZXIoYm9keS52YWx1ZSksXG4gICAgICAgIHBpZWNlczogTnVtYmVyKGJvZHkucGllY2VzKSxcbiAgICAgICAgd2VpZ2h0OiBOdW1iZXIoYm9keS53ZWlnaHQpLFxuICAgICAgICBzdGF0dXM6IDEsXG4gICAgICAgIGxvY2F0aW9uOiBcIkZMTFwiLFxuICAgICAgICBtaWQ6IGJvZHkubWlkLFxuICAgICAgICBoYXNPcHQ6IHRydWUsXG4gICAgICAgIC8vbXR5cGU6IGJvZHkubXR5cGVcbiAgICAgIH07XG4gICAgICBjb25zb2xlLmxvZyhcImFib3V0IHRvIHNhdmUgdGhlIHBhY2thZ2VcIik7XG4gICAgICBpZiAodHlwZW9mIGNQYWNrYWdlLnNoaXBwZXIgPT09IFwidW5kZWZpbmVkXCIpIGNQYWNrYWdlLnNoaXBwZXIgPSBcIlwiO1xuICAgICAgaWYgKHR5cGVvZiBjUGFja2FnZS5kZXNjcmlwdGlvbiA9PT0gXCJ1bmRlZmluZWRcIilcbiAgICAgICAgY1BhY2thZ2UuZGVzY3JpcHRpb24gPSBcIlwiO1xuICAgICAgY29uc29sZS5sb2coYm9keSk7XG4gICAgICAvLyBpZiAoTnVtYmVyKGJvZHkuaXNCdXNpbmVzcykgPT0gMSkge1xuICAgICAgLy8gICBjUGFja2FnZS5oYXNPcHQgPSBmYWxzZTtcbiAgICAgIC8vIH1cbiAgICAgIC8vY1BhY2thZ2UgPSBwYWNrYWdlVXRpbC5jYWxjdWxhdGVGZWVzKGNQYWNrYWdlKTtcbiAgICAgIGNvbnNvbGUubG9nKFwicGFja2FnZSB3aXRoIGZlZXNcIik7XG5cbiAgICAgIC8vd2UgYWxzbyB3YW50IHRvIGNhbGN1bGF0ZSB0aGUgdGhlIHBhY2thZ2UgZmVlcyBvbmUgdGltZS4uLi4uLlxuICAgICAgLy93ZSBoYXZlIHRoZSBwYWNrYWdlIGRldGFpbHMgaGVyZSAuLiBub3cgd2UgbmVlZCB0byBnZXQgdGhlIGV4aXN0aW5nIHBhY2thZ2VcblxuICAgICBcbiAgICAgIC8vd2UgbmVlZCB0byBjaGVjayB0byBzZWUgb2YgdGhlIG93bmVyIGlzIGEgYnVzaW5lc3MgaGVyZVxuICAgICAgY29uc29sZS5sb2coXCJoZXJlIGFib3V0IHRvIGdldCB0aGUgcGFja2FnZVwiKVxuICAgICAgbHJlZGlzLmdldFBhY2thZ2UoY1BhY2thZ2UudHJhY2tpbmdObykudGhlbihwID0+IHtcbiAgICAgICAgY29uc29sZS5sb2coJ3AgaXMgdGhlICcscCk7IFxuICAgICAgICBpZiAocCkge1xuICAgICAgICAgIHZhciBjdXJyZW50Q29udGFpbmVyID0gYG1hbmlmZXN0OiR7cC5taWR9OiR7cC5tdHlwZX06JHtjb250YWluZXJ9OmA7XG4gICAgICAgICAgY29uc29sZS5sb2coXCJmb3VuZCBwYWNrYWdlIFwiKTtcbiAgICAgICAgICBjb25zb2xlLmxvZyhwKTtcbiAgICAgICAgICBpZiAoY29udGFpbmVyID09IFwiYmFnXCIpIHtcbiAgICAgICAgICAgIC8vY2hlY2sgdG8gc2VlIGlmIHRoZSBiYWNrIG5vIGlzIHRoZSBzYW1lLlxuICAgICAgICAgICAgaWYgKHAuYmFnICE9IGNQYWNrYWdlLmJhZykge1xuICAgICAgICAgICAgICAvL3JlbW92ZSBpdCBmcm9tIHRoZSBvcmlnaW5hbCBsaXN0XG4gICAgICAgICAgICAgIGxyZWRpcy5zcmVtKGN1cnJlbnRDb250YWluZXIgKyBwLmJhZywgcC50cmFja2luZ05vKTtcbiAgICAgICAgICAgICAgY29uc29sZS5sb2coXG4gICAgICAgICAgICAgICAgXCJyZW1vdmUgcGFja2FnZSBmcm9tIGN1cnJlbnQgc2V0IFwiICsgY3VycmVudENvbnRhaW5lclxuICAgICAgICAgICAgICApO1xuICAgICAgICAgICAgfVxuICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAvL2NoZWNrIHRvIHNlZSBpZiB0aGUgc2tpZCBudW1iZXIgaXMgdGhlIHNhbWUuXG4gICAgICAgICAgICBpZiAocC5za2lkICE9IGNQYWNrYWdlLnNraWQpIHtcbiAgICAgICAgICAgICAgLy9yZW1vdmUgaXQgZnJvbSB0aGUgb3JpZ2luYWwgbGlzdFxuICAgICAgICAgICAgICBscmVkaXMuc3JlbShjdXJyZW50Q29udGFpbmVyICsgcC5za2lkLCBwLnRyYWNraW5nTm8pO1xuICAgICAgICAgICAgICBjb25zb2xlLmxvZyhcbiAgICAgICAgICAgICAgICBcInJlbW92ZSBwYWNrYWdlIGZyb20gY3VycmVudCBzZXQgXCIgKyBjdXJyZW50Q29udGFpbmVyXG4gICAgICAgICAgICAgICk7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgfVxuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgIC8vIHRoZSBwYWNrYWdlIGRvZXNuJ3QgZXhpc3QgdXBkYXRlIHRoZSBjb3VudGVyXG4gICAgICAgICAgbHJlZGlzLmNsaWVudC5pbmNyKFwibWNvdW50ZXI6XCIgKyBjUGFja2FnZS5taWQpO1xuICAgICAgICAgIFxuICAgICAgICB9XG5cbiAgICAgICAgbHJlZGlzXG4gICAgICAgICAgLmhtc2V0KFwicGFja2FnZXM6XCIgKyBjUGFja2FnZS50cmFja2luZ05vLCBjUGFja2FnZSlcbiAgICAgICAgICAudGhlbihmdW5jdGlvbihyZXN1bHQpIHtcbiAgICAgICAgICAgIC8vYWRkIHRvIHF1ZXVlIGZvciBwZXJzaXN0ZW50IHByb2Nlc3NpbmdcbiAgICAgICAgICAgIFxuICAgICAgICAgICAgdmFyIG1hbmlmZXN0S2V5ID0gYG1hbmlmZXN0OiR7Y1BhY2thZ2UubWlkfToke1xuICAgICAgICAgICAgICBjUGFja2FnZS5tdHlwZVxuICAgICAgICAgICAgfToke2NvbnRhaW5lcn06JHtjb250YWluZXJOb31gO1xuICAgICAgICAgICAgY29uc29sZS5sb2coXCJhYm91dCB0byBjcmVhdGUgdGhlIGRvY3VtZW50Li4uLlwiKTtcbiAgICAgICAgICAgIGFkZFBhY2thZ2VUb0luZGV4KGNQYWNrYWdlLnRyYWNraW5nTm8sc2VhcmNoZXIpOyBcbiAgICAgICAgICAgIGNvbnNvbGUubG9nKFwiYWRkZWQgdGhlIHBhY2thZ2UgdG8gaW5kZXhcIik7XG4gICAgICAgICAgICBscmVkaXNcbiAgICAgICAgICAgICAgLnNldEFkZChtYW5pZmVzdEtleSwgY1BhY2thZ2UudHJhY2tpbmdObylcbiAgICAgICAgICAgICAgLnRoZW4oZnVuY3Rpb24oc1Jlc3VsdCkge1xuICAgICAgICAgICAgICAgIC8vZ2V0IHRoZSBtZW1iZXJzIG9uZSB0aW1lIGhlcmVcbiAgICAgICAgICAgICAgICBjb25zb2xlLmxvZyhcImFkZGVkIHRoZSBwYWNrYWdlIHRvIHRoZSBzZXRcIik7XG4gICAgICAgICAgICAgICAgY29uc29sZS5sb2cobWFuaWZlc3RLZXkpO1xuICAgICAgICAgICAgICAgIGxyZWRpc1xuICAgICAgICAgICAgICAgICAgLmdldE1lbWJlcnMobWFuaWZlc3RLZXkpXG4gICAgICAgICAgICAgICAgICAudGhlbihkYXRhID0+IHtcbiAgICAgICAgICAgICAgICAgICAgY29uc29sZS5sb2coXCJkYXRhXCIpO1xuICAgICAgICAgICAgICAgICAgICBjb25zb2xlLmxvZyhkYXRhKTtcbiAgICAgICAgICAgICAgICAgICAgUHJvbWlzZS5hbGwoZGF0YS5tYXAobHJlZGlzLmdldFBhY2thZ2UpKTtcbiAgICAgICAgICAgICAgICAgIH0pXG4gICAgICAgICAgICAgICAgICAudGhlbihmdW5jdGlvbihyZGF0YSkge1xuICAgICAgICAgICAgICAgICAgICAvL3dlIG5lZWQgdG8gYWxlcnQgdGhlIHBlcnNvbiB0aGF0IHRoZSBwYWNrYWdlIGlzIGhlcmUgc28gcmVhZCBlbWFpbCBldGMuXG4gICAgICAgICAgICAgICAgICAgIC8vYWRkIHRvIHRoZSBpbmRleFxuICAgICAgICAgICAgICAgICAgICBjb25zb2xlLmxvZyhcImRhdGFcIik7XG4gICAgICAgICAgICAgICAgICAgIGNvbnNvbGUubG9nKHJkYXRhKTtcblxuICAgICAgICAgICAgICAgICAgICByZXNvbHZlKHtcbiAgICAgICAgICAgICAgICAgICAgICBzYXZlZDogdHJ1ZSxcbiAgICAgICAgICAgICAgICAgICAgICBwYWNrYWdlczogcmRhdGEsXG4gICAgICAgICAgICAgICAgICAgICAgc1BhY2thZ2U6IGNQYWNrYWdlXG4gICAgICAgICAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgICAgICAgfSlcbiAgICAgICAgICAgICAgICAgIC5jYXRjaChlcnIzID0+IHtcbiAgICAgICAgICAgICAgICAgICAgY29uc29sZS5sb2coZXJyMyk7XG4gICAgICAgICAgICAgICAgICAgIHJlamVjdCh7XG4gICAgICAgICAgICAgICAgICAgICAgZXJyOiBlcnIzLFxuICAgICAgICAgICAgICAgICAgICAgIHNhdmVkOiB0cnVlLFxuICAgICAgICAgICAgICAgICAgICAgIGxpc3Rpbmc6IGZhbHNlXG4gICAgICAgICAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICAgIH0pXG4gICAgICAgICAgICAgIC5jYXRjaChmdW5jdGlvbihlcnIpIHtcbiAgICAgICAgICAgICAgICByZXNvbHZlKHtcbiAgICAgICAgICAgICAgICAgIHNhdmVkOiBmYWxzZVxuICAgICAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgICB9KTtcbiAgICAgICAgICB9KVxuICAgICAgICAgIC5jYXRjaChmdW5jdGlvbihlcnIyKSB7XG4gICAgICAgICAgICByZWplY3Qoe1xuICAgICAgICAgICAgICBzYXZlZDogZmFsc2VcbiAgICAgICAgICAgIH0pO1xuICAgICAgICAgIH0pO1xuXG4gICAgICAgIC8vc2F2ZSB0aGUgcGFja2FnZSB0byB0aGUgcGFja2FnZSBOU1xuICAgICAgfSkuY2F0Y2goZXJyMjMyPT57XG4gICAgICAgIGNvbnNvbGUubG9nKGVycjIzMilcbiAgICAgIH0pO1xuICAgIH0pO1xuICB9IFxuICBnZXRNYW5pZmVzdFBhY2thZ2VzKCl7XG4gICAgcmV0dXJuIG5ldyBQcm9taXNlKChyZXNvbHZlLHJlamVjdCk9PntcbiAgICAgIFxuICAgICAgdGhpcy5teVNlYXJjaC5zZWFyY2goXG4gICAgICAgIGBAbWlkOlswIDBdYCxcbiAgICAgICAgeyBvZmZzZXQ6IDAsIG51bWJlck9mUmVzdWx0czogNTAwMCB9LFxuICAgICAgICAoZXJyLCBkYXRhKSA9PiB7XG4gICAgICAgICAgdmFyIHBhY2thZ2VzID0gW107XG4gICAgICAgICAgY29uc29sZS5sb2coZGF0YSk7XG4gICAgICAgICAgZGF0YS5yZXN1bHRzLmZvckVhY2goZWxlbWVudCA9PiB7XG5cbiAgICAgICAgICAgIHBhY2thZ2VzLnB1c2goZWxlbWVudC5kb2MpO1xuICAgICAgICAgICAgcmVzb2x2ZShwYWNrYWdlcyk7ICAgICAgICAgICAgICAgICBcbiAgICAgICAgfSk7XG4gICAgfSk7XG4gICAgfSlcbiAgfVxuICBnZXRSZWNlaXZlZFBhY2thZ2VzKHBhZ2UscGFnZVNpemUpe1xuICAgIHJldHVybiBuZXcgUHJvbWlzZSgocmVzb2x2ZSxyZWplY3QpPT57XG4gICAgICBcbiAgICAgIHRoaXMubXlTZWFyY2guc2VhcmNoKFxuICAgICAgICBgQG1pZDpbMCAwXWAsXG4gICAgICAgIHsgb2Zmc2V0OiAwLCBudW1iZXJPZlJlc3VsdHM6IDUwMDAgfSxcbiAgICAgICAgKGVyciwgZGF0YSkgPT4ge1xuICAgICAgICAgIHZhciBwYWNrYWdlcyA9IFtdO1xuICAgICAgICAgIGNvbnNvbGUubG9nKGRhdGEpO1xuICAgICAgICAgIGRhdGEucmVzdWx0cy5mb3JFYWNoKGVsZW1lbnQgPT4ge1xuXG4gICAgICAgICAgICBwYWNrYWdlcy5wdXNoKGVsZW1lbnQuZG9jKTtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBcbiAgICAgICAgfSk7XG4gICAgICAgIHJlc29sdmUocGFja2FnZXMpOyBcbiAgICB9KTtcbiAgICB9KVxuICB9XG4gIGdldE5vRG9jc1BhY2thY2thZ2VzKHBhZ2UscGFnZVNpemUpe1xuICAgIHJldHVybiBuZXcgUHJvbWlzZSgocmVzb2x2ZSxyZWplY3QpPT57XG4gICAgICBcbiAgICAgIHRoaXMubXlTZWFyY2guc2VhcmNoKFxuICAgICAgICBgQGhhc0RvY3M6WzAgMF1gLFxuICAgICAgICB7IG9mZnNldDogMCwgbnVtYmVyT2ZSZXN1bHRzOiA1MDAwIH0sXG4gICAgICAgIChlcnIsIGRhdGEpID0+IHtcbiAgICAgICAgICB2YXIgcGFja2FnZXMgPSBbXTtcbiAgICAgICAgICBjb25zb2xlLmxvZyhkYXRhKTtcbiAgICAgICAgICBkYXRhLnJlc3VsdHMuZm9yRWFjaChlbGVtZW50ID0+IHtcblxuICAgICAgICAgICAgcGFja2FnZXMucHVzaChlbGVtZW50LmRvYyk7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgXG4gICAgICAgIH0pO1xuICAgICAgICByZXNvbHZlKHBhY2thZ2VzKTsgXG4gICAgfSk7XG4gICAgfSlcbiAgfVxuICBnZXRQYWNrYWdlQnlJZChpZCl7XG4gICAgcmV0dXJuIG5ldyBQcm9taXNlKChyZXNvbHZlLHJlamVjdCk9PntcbiAgICAgIHJlZGlTZWFyY2guZ2V0RG9jKGlkLChlcnIsZG9jdW1lbnQpPT57XG4gICAgICAgIHJlc29sdmUoZG9jdW1lbnQuZG9jKTsgXG4gICAgICB9KVxuICAgIH0pOyBcbiAgfVxuICB1cGRhdGVNYW5pZmVzdFBhY2thZ2VUb0luVHJhbnNpdChtaWQpIHtcbiAgICAvL2dldCBhbGwgdGhlIHBhY2thZ2VzXG4gICAgLy93ZSBuZWVkIHRvIHVwZGF0ZSB0aGUgaW5kZXggYXQgdGhpcyBwb2ludCBhcyB3ZWxsXG4gICAgdmFyIG1zZWFyY2ggPSB0aGlzLm15U2VhcmNoO1xuICAgIHRoaXMubXlTZWFyY2guc2VhcmNoKFxuICAgICAgYEBtaWQ6WyR7bWlkfSAke21pZH1dYCxcbiAgICAgIHsgb2Zmc2V0OiAwLCBudW1iZXJPZlJlc3VsdHM6IDUwMDAgfSxcbiAgICAgIChlcnIsIGRhdGEpID0+IHtcbiAgICAgICAgdmFyIHBhY2thZ2VzID0gW107XG4gICAgICAgIGNvbnNvbGUubG9nKGRhdGEpO1xuICAgICAgICBkYXRhLnJlc3VsdHMuZm9yRWFjaChlbGVtZW50ID0+IHtcbiAgICAgICAgICB2YXIgb2xkRG9jSWQgPSBlbGVtZW50LmRvY0lkO1xuICAgICAgICAgIGVsZW1lbnQuZG9jSWQgPSBlbGVtZW50LmRvY0lkLnJlcGxhY2UoYCR7bWlkfS1gLCBcIlwiKTtcbiAgICAgICAgICBwYWNrYWdlcy5wdXNoKGVsZW1lbnQuZG9jSWQpO1xuICAgICAgICAgIC8vIGkgY291bGQgZGVsZXRlIGhlcmVcbiAgICAgICAgICAvLyBtc2VhcmNoLmRlbERvY3VtZW50KFBLR19JRFgsb2xkRG9jSWQpXG4gICAgICAgICAgLy91cGRhdGUgYWxsIHRoZSBwYWNrYWdlc1xuICAgICAgICB9KTtcbiAgICAgICAgc2V0UGFja2FnZUluVHJhbnNpdChwYWNrYWdlcywgbXNlYXJjaCwgbWlkKS50aGVuKGZ1bmN0aW9uKFxuICAgICAgICAgIHVwZGF0ZWRQYWNrYWdlc1xuICAgICAgICApIHtcbiAgICAgICAgICBjb25zb2xlLmxvZyhcInVwZGF0ZWQgcGFja2FnZXNcIik7XG4gICAgICAgICAgY29uc29sZS5sb2codXBkYXRlZFBhY2thZ2VzKTtcbiAgICAgICAgfSk7XG4gICAgICB9XG4gICAgKTtcbiAgfVxuICByZW1vdmVQYWNrYWdlRnJvbU1hbmlmZXN0KHBhY2thZ2VJZCwgbWlkKSB7XG4gICAgdmFyIG1zZWFyY2ggPSB0aGlzLm15U2VhcmNoO1xuICAgIHJldHVybiBuZXcgUHJvbWlzZSgocmVzb2x2ZSwgcmVqZWN0KSA9PiB7XG4gICAgICB2YXIgbWFuaWZlc3QgPSBtaWQ7XG4gICAgICB2YXIgbWFuaWZlc3RLZXkgPSBcIm1hbmlmZXN0OlwiICsgbWFuaWZlc3QgKyBcIjoqXCI7XG5cbiAgICAgIGxyZWRpcy5kZWwoXCJwYWNrYWdlczpcIiArIHRyYWNraW5nTm8pLnRoZW4oZnVuY3Rpb24ocmVzdWx0KSB7XG4gICAgICAgIGNvbnNvbGUubG9nKHJlc3VsdCk7XG4gICAgICAgIG1zZWFyY2guZGVsRG9jdW1lbnQoUEtHX0lEWCwgYCR7bWlkfS0ke3RyYWNraW5nTm99YCk7XG4gICAgICAgIC8vd2UgbmVlZCB0byByZW1vdmUgZnJvbSB0aGUgaW5kZXggYW5kIGRlYyB0aGUgY291bnRlclxuICAgICAgICBscmVkaXMuY2xpZW50LmRlY3IoXCJtY291bnRlcjpcIiArIG1pZCk7XG4gICAgICAgIC8vclNlcnZpY2VzLnBhY2thZ2VTZXJ2aWNlLnJtUGFja2FnZShtaWQsIHRyYWNraW5nTm8pO1xuICAgICAgICBscmVkaXMuZ2V0S2V5cyhtYW5pZmVzdEtleSkudGhlbihrUmVzdWx0ID0+IHtcbiAgICAgICAgICAvL3RoZSBsaXN0IG9mIGFsbCB0aGUgc2V0cyAuLi53ZSBuZWVkIHRvIHJlbW92ZSB0aGUga2V5IGZyb20gZWFjaCBvbmVcbiAgICAgICAgICB2YXIga2V5c0NvdW50ID0gMDtcblxuICAgICAgICAgIGtSZXN1bHQuZm9yRWFjaChlbGVtZW50ID0+IHtcbiAgICAgICAgICAgIGNvbnNvbGUubG9nKFxuICAgICAgICAgICAgICBgcmVtb3ZpbmcgJHt0cmFja2luZ05vfSBwYWNrYWdlIG1hbmlmZXN0IHNldCAke2VsZW1lbnR9IGBcbiAgICAgICAgICAgICk7XG4gICAgICAgICAgICBscmVkaXMuc3JlbShlbGVtZW50LCB0cmFja2luZ05vKS50aGVuKGZ1bmN0aW9uKHJSZXN1bHQpIHtcbiAgICAgICAgICAgICAgY29uc29sZS5sb2coclJlc3VsdCk7XG4gICAgICAgICAgICAgIGNvbnNvbGUubG9nKFwicmVtb3ZlZFwiKTtcbiAgICAgICAgICAgICAgaWYgKGtleXNDb3VudCA9PSBrUmVzdWx0Lmxlbmd0aCAtIDEpIGtleXNDb3VudCsrO1xuICAgICAgICAgICAgfSk7XG4gICAgICAgICAgfSk7XG4gICAgICAgICAgcmVzb2x2ZSh7XG4gICAgICAgICAgICBkZWxldGVkOiB0cnVlXG4gICAgICAgICAgfSk7XG4gICAgICAgIH0pO1xuXG4gICAgICAgIC8vd2UgYWxzbyBuZWVkIHRvIHJlbW92ZSBmcm9tIGFueSBzZXRzXG4gICAgICB9KTtcbiAgICB9KTtcbiAgfVxuICByZW1vdmVQYWNrYWdlQnlJZChpZCkge1xuICAgIHZhciBtc2VhcmNoID0gdGhpcy5teVNlYXJjaDtcbiAgICByZXR1cm4gbmV3IFByb21pc2UoKHJlc29sdmUsIHJlamVjdCkgPT4ge1xuICAgIFxuICAgICAgcmVkaVNlYXJjaC5kZWxEb2N1bWVudChQS0dfSURYLGlkLChlcnIscmVzcG9uc2UpPT57XG4gICAgICAgIHJlc29sdmUoe2RlbGV0ZWQ6dHJ1ZX0pXG4gICAgICB9KVxuICAgICAgXG4gICAgICAgIFxuICAgICAgXG4gICAgfSk7XG4gIH1cbiAgc3RvcmVQYWNrYWdlRm9yUGlja3VwKHRyYWNraW5nTm8sYmluKXtcbiAgICB2YXIgc2VhcmNoZXIgPSB0aGlzLm15U2VhcmNoO1xuICAgIHJldHVybiBuZXcgUHJvbWlzZSgocmVzb2x2ZSxyZWplY3QpPT57XG4gICAgICAgbHJlZGlzLmhtc2V0KFBLR19QUkVGSVgrdHJhY2tpbmdObyx7c3RhdHVzOjQsbG9jYXRpb246YmlufSkudGhlbigocmVzdWx0KT0+e1xuICAgICAgICAgbHJlZGlzLmdldFBhY2thZ2UodHJhY2tpbmdObykudGhlbigocGtnKT0+e1xuICAgICAgICAgIGFkZFBhY2thZ2VUb0luZGV4KHRyYWNraW5nTm8sc2VhcmNoZXIpIDsgXG4gICAgICAgICAgcmVzb2x2ZShwa2cpOyAgIFxuICAgICAgICAgfSk7XG4gICAgICAgfSkgXG4gICAgfSk7IFxuICB9XG4gIHVwZGF0ZVBhY2thZ2VJbmRleCh0cmFja2luZyl7XG4gICAgICByZXR1cm4gbmV3IFByb21pc2UoKHJlc29sdmUscmVqZWN0KT0+e1xuICAgICAgICAgIHZhciBtc2VhcmNoID0gdGhpcy5teVNlYXJjaDsgXG4gICAgICAgICAgYWRkUGFja2FnZVRvSW5kZXgodHJhY2tpbmcsbXNlYXJjaCk7IFxuICAgICAgICAgcmVzb2x2ZSh7J3VwZGF0ZWQnOnRydWV9KTtcbiAgICAgIH0pXG4gIH1cbiAgZ2V0Q3VzdG9tZXJQYWNrYWdlcyhza3lib3gpIHt9XG4gIGdldE1hbmlmZXN0UGFja2FnZXNCeVN0YXR1cyhtaWQsc3RhdHVzKSB7XG4gICAgICByZXR1cm4gbmV3IFByb21pc2UoKHJlc29sdmUscmVqZWN0KT0+e1xuICAgICAgICAgIGNvbnNvbGUubG9nKGBAbWlkOlske21pZH0gJHttaWR9XSBAc3RhdHVzPVske3N0YXR1c30gJHtzdGF0dXN9XWApXG4gICAgICAgIHRoaXMubXlTZWFyY2guc2VhcmNoKFxuICAgICAgICAgICAgYEBtaWQ6WyR7bWlkfSAke21pZH1dIEBzdGF0dXM6WyR7c3RhdHVzfSAke3N0YXR1c31dYCxcbiAgICAgICAgICAgIHsgb2Zmc2V0OiAwLCBudW1iZXJPZlJlc3VsdHM6IDUwMDAgfSxcbiAgICAgICAgICAgIChlcnIsIGRhdGEpID0+IHtcbiAgICAgICAgICAgICAgdmFyIHBhY2thZ2VzID0gW107XG4gICAgICAgICAgICAgIGNvbnNvbGUubG9nKGRhdGEpO1xuICAgICAgICAgICAgICBkYXRhLnJlc3VsdHMuZm9yRWFjaChlbGVtZW50ID0+IHtcblxuICAgICAgICAgICAgICAgIHBhY2thZ2VzLnB1c2goZWxlbWVudC5kb2MpO1xuICAgICAgICAgICAgICAgIHJlc29sdmUocGFja2FnZXMpOyAgICAgICAgICAgICAgICAgXG4gICAgICAgICAgICB9KTtcbiAgICAgICAgfSk7XG4gICAgICB9KTtcbiAgXG4gIH0gICBcbiAgXG4gIFxuXG4gICAvLyNyZWdpb24gTWFuaWZlc3QgUGFja2FnZSBGdW5jdGlvbnMgXG5cbiAgIGFkZFRvRmxpZ2h0KGFjdGlvbil7XG4gICAgcmV0dXJuIG5ldyBQcm9taXNlKChyZXNvbHZlLHJlamVjdCk9PntcbiAgICAgIHZhciBwYWNrYWdlTm8gPSBnZXRQYWNrYWdlSWRGcm9tQmFyQ29kZShhY3Rpb24uYmFyY29kZSk7IFxuICAgICAgdGhpcy5teVNlYXJjaC51cGRhdGUocGFja2FnZU5vLHttaWQ6YWN0aW9uLm1pZH0sKGVycixyZXN1bHQpPT57XG4gICAgICAgIGlmKGVycilcbiAgICAgICAgICByZXNvbHZlKHthZGRlZDpmYWxzZX0pXG4gICAgICAgIFxuICAgICAgICByZXNvbHZlKHthZGRlZDp0cnVlfSlcbiAgICAgIH0pXG4gICAgICAgIFxuICAgIH0pXG4gICB9XG4gICByZW1vdmVGcm9tRmxpZ2h0KGFjdGlvbil7XG4gICAgcmV0dXJuIG5ldyBQcm9taXNlKChyZXNvbHZlLHJlamVjdCk9PntcbiAgICAgICAgdmFyIHBhY2thZ2VObyA9IGdldFBhY2thZ2VJZEZyb21CYXJDb2RlKGFjdGlvbi5iYXJjb2RlKTsgICBcbiAgICAgICAgdGhpcy5teVNlYXJjaC51cGRhdGUocGFja2FnZU5vLHttaWQ6YWN0aW9uLm1pZH0sKGVycixyZXN1bHQpPT57XG4gICAgICAgIGlmKGVycilcbiAgICAgICAgICAgIHJlc29sdmUoe3JlbW92ZWQ6ZmFsc2V9KVxuICAgICAgICAgIFxuICAgICAgICAgIHJlc29sdmUoe3JlbW92ZWQ6dHJ1ZX0pXG4gICAgICAgIH0pXG4gICAgfSlcbiAgIH1cbiAgIHJlY0Zyb21UcnVjayh0cmFja2luZ05vKXtcbiAgICAgcmV0dXJuIG5ldyBQcm9taXNlKChyZXNvbHZlLHJlamVjdCk9PntcbiAgICAgXG4gICAgICAgIGRhdGFDb250ZXh0LnJlZGlzQ2xpZW50LnNldChSRUNfUEtHK3RyYWNraW5nTm8sbW9tZW50KCkudW5peCgpLCAoZXJyLHJlc3VsdCk9PntcbiAgICAgICAgICBpZiAoZXJyKSByZXNvbHZlKHtzYXZlZDpmYWxzZX0pXG4gICAgICAgICAgcmVzb2x2ZSh7c2F2ZWQ6dHJ1ZX0pXG4gICAgICAgIH0pXG4gICAgIH0pXG4gICB9XG4gICAvLyNlbmRyZWdpb25cbn1cblxuZnVuY3Rpb24gZ2V0UGFja2FnZUlkRnJvbUJhckNvZGUoYmFyQ29kZVZhbHVlKXtcbiAgdmFyIHBhcnRzID0gYmFyQ29kZVZhbHVlLnNwbGl0KFwiLVwiKTsgXG4gIGlmIChwYXJ0cy5sZW5ndGggPT0gMylcbiAgICBpZiAodHlwZW9mIHBhcnRzWzJdICE9IFwidW5kZWZpbmVkXCIpXG4gICAgcmV0dXJuIHBhcnRzWzJdLnRyaW0oKTsgXG4gIHJldHVybiBcIlwiXG59XG4iXX0=
