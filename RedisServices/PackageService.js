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
        dataContext.redisClient.hmset("fees:awb:" + pkgIfno.awb, pkginfo, function (err, result) {
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
//# sourceMappingURL=data:application/json;charset=utf8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIlJlZGlzU2VydmljZXMvUGFja2FnZVNlcnZpY2UuZXM2Il0sIm5hbWVzIjpbInJlZGlzIiwicmVxdWlyZSIsImxyZWRpcyIsIm1vbWVudCIsInJlZGlzU2VhcmNoIiwiZnMiLCJQYWNrYWdlVXRpbCIsIlBhY2thZ2VVdGlsaXR5IiwicGFja2FnZVV0aWwiLCJQS0dfSURYIiwiUEtHX0lEX0NPVU5URVIiLCJkYXRhQ29udGV4dCIsIlBLR19QUkVGSVgiLCJBV0JfSUQiLCJJTkRFWF9BV0IiLCJSRUNfUEtHIiwiQ3VzdG9tZXJTZXJ2aWNlIiwiY3VzdG9tZXJTZXJ2aWNlIiwiUEtHX1NUQVRVUyIsImF3YkluZGV4IiwiY2xpZW50T3B0aW9ucyIsInNlYXJjaENsaWVudERldGFpbHMiLCJwYWNrYWdlSW5kZXgiLCJnZXRQYWNrYWdlVm9sdW1uZSIsIm1QYWNrYWdlIiwiY3JlYXRlRG9jdW1lbnQiLCJ0UGFja2FnZSIsInBhY2thZ2VEb2N1bWVudCIsImlkIiwidHJhY2tpbmdObyIsInNreWJveCIsImRhdGVSZWNpZXZlZCIsInVuaXgiLCJhd2IiLCJtaWQiLCJ2b2x1bWUiLCJ3ZWlnaHQiLCJwaWVjZXMiLCJjdXN0b21lciIsInNoaXBwZXIiLCJkZXNjcmlwdGlvbiIsImRpbWVuc2lvbnMiLCJjYXJyaWVyIiwic3RhdHVzIiwidmFsdWUiLCJjb25zb2xlIiwibG9nIiwic2V0UGFja2FnZUluVHJhbnNpdCIsImtleXMiLCJtc2VhcmNoZXIiLCJQcm9taXNlIiwicmVzb2x2ZSIsInJlamVjdCIsImJhdGNoZXIiLCJjbGllbnQiLCJiYXRjaCIsImZvckVhY2giLCJsb2NhdGlvbiIsImVsZW1lbnQiLCJobXNldCIsImV4ZWMiLCJlcnIiLCJyZXN1bHQiLCJhZGRQYWNrYWdlVG9JbmRleCIsImdldFBhY2thZ2UiLCJ0aGVuIiwiZGVsRG9jdW1lbnQiLCJwYWNrIiwiZG9uZSIsImRvY3VtZW50IiwiYWRkIiwiUGFja2FnZVNlcnZpY2UiLCJzZXR1cEluZGV4IiwibXlTZWFyY2giLCJyZWRpc0NsaWVudCIsImV4aXN0cyIsInNldCIsImluaXRSZXN1bHQiLCJpbmNyIiwibmV3SWQiLCJ0b1N0cmluZyIsInVwZGF0ZSIsImVycjEiLCJhd2JSZXMiLCJzYXZlZCIsInJlcGx5IiwiaW52b2ljZSIsImhhc0RvY3MiLCJkYXRlQ3JlYXRlZCIsInNlYXJjaCIsIm51bWJlck9mUmVzdWx0cyIsIm9mZnNldCIsInBhY2thZ2VzIiwidG90YWxSZXN1bHRzIiwicmVzdWx0cyIsInBhY2thZ2UxIiwiZG9jIiwiTnVtYmVyIiwiZGF0YSIsInNydiIsInBhY2thZ2VsaXN0IiwiY291bnQiLCJsZW5ndGgiLCJzdWJzdHJpbmciLCJwdXNoIiwic29ydEJ5IiwiYXdicyIsImF3Ykxpc3QiLCJhbGwiLCJtYXAiLCJnZXRDdXN0b21lciIsImN1c3RvbWVySWQiLCJnZXRBd2JPdmVydmlldyIsImN1c3RvbWVycyIsImkiLCJmb3JtYXQiLCJjb25zaWduZWUiLCJuYW1lIiwiZGV0YWlscyIsInBtYiIsImNhdGNoIiwiZ2V0RG9jIiwiZ2V0QXdiRGV0YWlscyIsInRyYWNraW5nTnVtYmVyIiwibG9jYXRpb25faWQiLCJwYWNrYWdlUmVzdWx0IiwibmV3UGFja2FnZSIsImJvZHkiLCJjUGFja2FnZSIsInJlcGxhY2UiLCJ0cmltIiwidHJhY2tpbmciLCJyZXNwb25zZSIsImluZGV4UGFja2FnZSIsImRvY1Jlc3VsdCIsInNlYXJjaGVyIiwiZHV0eVBlcmNlbnQiLCJoYXNPcHQiLCJwIiwiY3VycmVudENvbnRhaW5lciIsIm10eXBlIiwiY29udGFpbmVyIiwiYmFnIiwic3JlbSIsInNraWQiLCJtYW5pZmVzdEtleSIsImNvbnRhaW5lck5vIiwic2V0QWRkIiwic1Jlc3VsdCIsImdldE1lbWJlcnMiLCJyZGF0YSIsInNQYWNrYWdlIiwiZXJyMyIsImxpc3RpbmciLCJlcnIyIiwiZXJyMjMyIiwicGFnZSIsInBhZ2VTaXplIiwiYmFyY29kZSIsInBrZ0lkIiwiZ2V0UGFja2FnZUlkRnJvbUJhckNvZGUiLCJnZXRBd2IiLCJhd2JpbmZvIiwicGFja2FnZSIsIm1zZWFyY2giLCJvbGREb2NJZCIsImRvY0lkIiwidXBkYXRlZFBhY2thZ2VzIiwicGFja2FnZUlkIiwibWFuaWZlc3QiLCJkZWwiLCJkZWNyIiwiZ2V0S2V5cyIsImtleXNDb3VudCIsImtSZXN1bHQiLCJyUmVzdWx0IiwiZGVsZXRlZCIsInJlZGlTZWFyY2giLCJiaW4iLCJwa2ciLCJhY3Rpb24iLCJwYWNrYWdlTm8iLCJhZGRlZCIsInJlbW92ZWQiLCJwa2dJZm5vIiwidXNlcm5hbWUiLCJwa2dpbmZvIiwicHVibGlzaCIsInNlbnQiLCJ1cGRhdGVSZXN1bHQiLCJ1cGRhdGVkIiwiYmFyQ29kZVZhbHVlIiwicGFydHMiLCJzcGxpdCJdLCJtYXBwaW5ncyI6Ijs7Ozs7Ozs7O0FBQUE7O0FBQ0E7Ozs7OztBQUdBLElBQUlBLFFBQVFDLFFBQVEsT0FBUixDQUFaO0FBQ0EsSUFBSUMsU0FBU0QsUUFBUSxlQUFSLENBQWI7QUFDQSxJQUFJRSxTQUFTRixRQUFRLFFBQVIsQ0FBYjtBQUNBLElBQUlHLGNBQWNILFFBQVEscUJBQVIsQ0FBbEI7QUFDQSxJQUFJSSxLQUFLSixRQUFRLElBQVIsQ0FBVDtBQUNBLElBQUlFLFNBQVNGLFFBQVEsUUFBUixDQUFiO0FBQ0EsSUFBSUssY0FBY0wsUUFBUSxxQkFBUixFQUErQk0sY0FBakQ7QUFDQSxJQUFJQyxjQUFjLElBQUlGLFdBQUosRUFBbEI7QUFDQSxJQUFNRyxVQUFVLGdCQUFoQjtBQUNBLElBQU1DLGlCQUFpQixZQUF2QjtBQUNBLElBQUlDLGNBQWNWLFFBQVEsZUFBUixDQUFsQjtBQUNBLElBQU1XLGFBQWEsV0FBbkI7QUFDQSxJQUFNQyxTQUFTLFFBQWY7QUFDQSxJQUFNQyxZQUFZLFdBQWxCO0FBQ0EsSUFBTUMsVUFBVSxVQUFoQjtBQUNBLElBQUlDLGtCQUFrQmYsUUFBUSxtQkFBUixFQUE2QmUsZUFBbkQ7QUFDQSxJQUFJQyxrQkFBa0IsSUFBSUQsZUFBSixFQUF0QjtBQUNBLElBQU1FLGFBQWE7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S0gsU0FSRDtBQVNGLE9BWk0sQ0FBUDtBQWFEO0FBQ0Q7Ozs7Ozs7QUFHSCxTQUFTOUIsdUJBQVQsQ0FBaUMrQixZQUFqQyxFQUE4QztBQUM1QyxNQUFJQyxRQUFRRCxhQUFhRSxLQUFiLENBQW1CLEdBQW5CLENBQVo7QUFDQSxNQUFJRCxNQUFNMUYsTUFBTixJQUFnQixDQUFwQixFQUNFLElBQUksT0FBTzBGLE1BQU0sQ0FBTixDQUFQLElBQW1CLFdBQXZCLEVBQ0EsT0FBT0EsTUFBTSxDQUFOLEVBQVM5RCxJQUFULEVBQVA7QUFDRixTQUFPLEVBQVA7QUFDRCIsImZpbGUiOiJSZWRpc1NlcnZpY2VzL1BhY2thZ2VTZXJ2aWNlLmpzIiwic291cmNlc0NvbnRlbnQiOlsiaW1wb3J0IHsgY3B1cyB9IGZyb20gXCJvc1wiO1xuaW1wb3J0IHsgcHJvbWlzZXMgfSBmcm9tIFwiZG5zXCI7XG5cblxudmFyIHJlZGlzID0gcmVxdWlyZShcInJlZGlzXCIpO1xudmFyIGxyZWRpcyA9IHJlcXVpcmUoXCIuL3JlZGlzLWxvY2FsXCIpO1xudmFyIG1vbWVudCA9IHJlcXVpcmUoXCJtb21lbnRcIik7XG52YXIgcmVkaXNTZWFyY2ggPSByZXF1aXJlKFwiLi4vcmVkaXNlYXJjaGNsaWVudFwiKTtcbnZhciBmcyA9IHJlcXVpcmUoXCJmc1wiKTtcbnZhciBtb21lbnQgPSByZXF1aXJlKCdtb21lbnQnKVxudmFyIFBhY2thZ2VVdGlsID0gcmVxdWlyZShcIi4uL1V0aWwvcGFja2FnZXV0aWxcIikuUGFja2FnZVV0aWxpdHk7XG52YXIgcGFja2FnZVV0aWwgPSBuZXcgUGFja2FnZVV0aWwoKTtcbmNvbnN0IFBLR19JRFggPSBcImluZGV4OnBhY2thZ2VzXCI7XG5jb25zdCBQS0dfSURfQ09VTlRFUiA9IFwicGFja2FnZTppZFwiO1xudmFyIGRhdGFDb250ZXh0ID0gcmVxdWlyZSgnLi9kYXRhQ29udGV4dCcpXG5jb25zdCBQS0dfUFJFRklYID0gXCJwYWNrYWdlczpcIjtcbmNvbnN0IEFXQl9JRCA9IFwiYXdiOmlkXCJcbmNvbnN0IElOREVYX0FXQiA9IFwiaW5kZXg6YXdiXCJcbmNvbnN0IFJFQ19QS0cgPSBcInBrZzpyZWM6XCJcbnZhciBDdXN0b21lclNlcnZpY2UgPSByZXF1aXJlKCcuL0N1c3RvbWVyU2VydmljZScpLkN1c3RvbWVyU2VydmljZTsgXG52YXIgY3VzdG9tZXJTZXJ2aWNlID0gbmV3IEN1c3RvbWVyU2VydmljZSgpXG5jb25zdCBQS0dfU1RBVFVTID0geyBcbiAgMSA6IFwiUmVjZWl2ZWRcIixcbiAgMjogXCJMb2FkZWQgb24gQWlyQ3JhZnRcIixcbiAgMzogXCJJbiBUcmFuc2l0XCIsXG4gIDQ6IFwiUmVjaWV2ZWQgaW4gTkFTXCIsXG4gIDU6IFwiUmVhZHkgZm9yIFBpY2t1cCAvIERlbGl2ZXJ5XCIsXG4gIDY6IFwiRGVsaXZlcmVkXCJcblxufTsgXG5cbmNvbnN0IGF3YkluZGV4ID0gcmVkaXNTZWFyY2gocmVkaXMsIElOREVYX0FXQiwge1xuICBjbGllbnRPcHRpb25zOiBscmVkaXMuc2VhcmNoQ2xpZW50RGV0YWlsc1xufSk7XG5jb25zdCBwYWNrYWdlSW5kZXggPSByZWRpc1NlYXJjaChyZWRpcywgUEtHX0lEWCwge1xuICBjbGllbnRPcHRpb25zOiBscmVkaXMuc2VhcmNoQ2xpZW50RGV0YWlsc1xufSk7XG5mdW5jdGlvbiBnZXRQYWNrYWdlVm9sdW1uZShtUGFja2FnZSl7XG5cbiAgcmV0dXJuIDA7IFxufVxuZnVuY3Rpb24gY3JlYXRlRG9jdW1lbnQodFBhY2thZ2UpIHtcbiAgdmFyIHBhY2thZ2VEb2N1bWVudCA9IHtcbiAgICBpZDp0UGFja2FnZS5pZCxcbiAgICB0cmFja2luZ05vOiB0UGFja2FnZS50cmFja2luZ05vLFxuICAgIHNreWJveDogdFBhY2thZ2Uuc2t5Ym94LFxuICAgIGRhdGVSZWNpZXZlZCA6IG1vbWVudCgpLnVuaXgoKSwgXG4gICAgYXdiOjAsIFxuICAgIG1pZDowLFxuICAgIHZvbHVtZTogZ2V0UGFja2FnZVZvbHVtbmUodFBhY2thZ2UpLFxuICAgIHdlaWdodDp0UGFja2FnZS53ZWlnaHQsXG4gICAgcGllY2VzOnRQYWNrYWdlLnBpZWNlcyxcbiAgICBjdXN0b21lcjogdFBhY2thZ2UuY3VzdG9tZXIsXG4gICAgc2hpcHBlcjogdFBhY2thZ2Uuc2hpcHBlcixcbiAgICBkZXNjcmlwdGlvbjogdFBhY2thZ2UuZGVzY3JpcHRpb24sXG4gICAgZGltZW5zaW9uczp0UGFja2FnZS5kaW1lbnNpb25zLFxuICAgIGNhcnJpZXI6dFBhY2thZ2UuY2FycmllcixcbiAgICAvL3NreWJveFY6IHRQYWNrYWdlLnNreWJveCwgYWRkIGRpbWVuaW9uIFxuICAgIHN0YXR1czogdFBhY2thZ2Uuc3RhdHVzLFxuICAgIG1pZDogdFBhY2thZ2UubWlkLFxuICAgIHZhbHVlOiB0UGFja2FnZS52YWx1ZSxcbiAgICBcbiAgfTtcbiAgY29uc29sZS5sb2coXCJhYm91dCB0byBhZGQgdGhlIHBhY2thZ2UgdG8gdGhlIGluZGV4XCIpO1xuICByZXR1cm4gcGFja2FnZURvY3VtZW50O1xufVxuZnVuY3Rpb24gc2V0UGFja2FnZUluVHJhbnNpdChrZXlzLCBtc2VhcmNoZXIpIHtcbiAgcmV0dXJuIG5ldyBQcm9taXNlKChyZXNvbHZlLCByZWplY3QpID0+IHtcbiAgICB2YXIgYmF0Y2hlciA9IG1zZWFyY2hlci5jbGllbnQuYmF0Y2goKTtcbiAgICBrZXlzLmZvckVhY2goZWxlbWVudCA9PiB7XG4gICAgICB2YXIgdmFsdWUgPSB7XG4gICAgICAgIHN0YXR1czogMixcbiAgICAgICAgbG9jYXRpb246IFwiSW4gVHJhbnNpdFwiXG4gICAgICB9O1xuICAgICAgY29uc29sZS5sb2coZWxlbWVudCArIFwiaXMgdGhlIGVsZW1lbnRcIik7XG5cbiAgICAgIGJhdGNoZXIuaG1zZXQoUEtHX1BSRUZJWCArIGVsZW1lbnQsIHZhbHVlKTtcbiAgICB9KTtcbiAgICBiYXRjaGVyLmV4ZWMoKGVyciwgcmVzdWx0KSA9PiB7XG4gICAgICBjb25zb2xlLmxvZyhyZXN1bHQpO1xuICAgICAgLy9yZWFkZCB0aGUgZG9jdW1lbnRzIGhlcmVcbiAgICAgIGtleXMuZm9yRWFjaChlbGVtZW50ID0+IHtcbiAgICAgICAgYWRkUGFja2FnZVRvSW5kZXgoZWxlbWVudCwgbXNlYXJjaGVyKTtcbiAgICAgIH0pO1xuICAgICAgcmVzb2x2ZShyZXN1bHQpO1xuICAgIH0pO1xuICB9KTtcbn1cblxuZnVuY3Rpb24gYWRkUGFja2FnZVRvSW5kZXgodHJhY2tpbmdObywgbXNlYXJjaGVyKSB7XG4gIGxyZWRpcy5nZXRQYWNrYWdlKHRyYWNraW5nTm8pLnRoZW4ocGFjayA9PiB7XG4gICAgbXNlYXJjaGVyLmRlbERvY3VtZW50KFBLR19JRFgsIGAke3BhY2subWlkfS0ke3RyYWNraW5nTm99YCwgKGVyciwgZG9uZSkgPT4ge1xuICAgICAgdmFyIGRvY3VtZW50ID0gY3JlYXRlRG9jdW1lbnQocGFjayk7XG4gICAgICBjb25zb2xlLmxvZyhcInJlYWRkaW5nIHBhY2thZ2UgdG8gdGhlIGluZGV4IGxpa2UgYSBib3NzIFwiICsgdHJhY2tpbmdObyk7XG4gICAgICBtc2VhcmNoZXIuYWRkKHBhY2subWlkICsgXCItXCIgKyBwYWNrLnRyYWNraW5nTm8sIGRvY3VtZW50KTtcbiAgICB9KTtcbiAgfSk7XG59XG5leHBvcnQgY2xhc3MgUGFja2FnZVNlcnZpY2Uge1xuICBjb25zdHJ1Y3RvcigpIHtcbiAgICB0aGlzLnNldHVwSW5kZXgoKTtcbiAgfVxuICBzZXR1cEluZGV4KCkge1xuICAgIHRoaXMubXlTZWFyY2ggPSByZWRpc1NlYXJjaChyZWRpcywgUEtHX0lEWCwge1xuICAgICAgY2xpZW50T3B0aW9uczogbHJlZGlzLnNlYXJjaENsaWVudERldGFpbHNcbiAgICB9KTtcbiAgfVxuICBnZXROZXdBd2IoKXtcbiAgICByZXR1cm4gbmV3IFByb21pc2UoKHJlc29sdmUscmVqZWN0KT0+e1xuICAgICAgZGF0YUNvbnRleHQucmVkaXNDbGllbnQuZXhpc3RzKEFXQl9JRCwoZXJyLHJlc3VsdCk9PntcbiAgICAgICAgY29uc29sZS5sb2cocmVzdWx0KTsgXG4gICAgICAgIGlmIChyZXN1bHQgIT0gXCIxXCIpe1xuICAgICAgICAgIGRhdGFDb250ZXh0LnJlZGlzQ2xpZW50LnNldChBV0JfSUQgPT0gMTAwMDAwLChlcnIsaW5pdFJlc3VsdCk9PntcbiAgICAgICAgICAgIGRhdGFDb250ZXh0LnJlZGlzQ2xpZW50LmluY3IoQVdCX0lELChlcnIsbmV3SWQpPT57XG4gICAgICAgICAgICAgIHJlc29sdmUoe2F3YjpuZXdJZH0pXG4gICAgICAgICAgICB9KVxuICAgICAgICAgIH0pXG4gICAgICAgIH1cbiAgICAgICAgZWxzZSB7XG4gICAgICAgICAgZGF0YUNvbnRleHQucmVkaXNDbGllbnQuaW5jcihBV0JfSUQsKGVycixuZXdJZCk9PntcbiAgICAgICAgICAgIHJlc29sdmUoe2F3YjpuZXdJZH0pXG4gICAgICAgICAgfSlcbiAgICAgICAgfVxuICAgICAgfSlcbiAgICB9KTtcbiAgfVxuICBzYXZlQXdiKGF3Yil7XG4gICAgcmV0dXJuIG5ldyBQcm9taXNlKChyZXNvbHZlLHJlamVjdCk9PntcbiAgICAgIGNvbnNvbGUubG9nKCdzYXZpbmcuLi4nLGF3Yixtb21lbnQoKS50b1N0cmluZyhcImhoOm1tOnNzXCIpKVxuICAgICAgaWYgKGF3Yi5pZCAhPVwiXCIpe1xuICAgICAgICBhd2JJbmRleC51cGRhdGUoYXdiLmlkLGF3YiwoZXJyMSxhd2JSZXMpPT57XG4gICAgICAgICAgaWYgKGVycjEpe1xuICAgICAgICAgICAgY29uc29sZS5sb2coJ3NhdmluZyBlcnInLGVycjEpXG4gICAgICAgICAgICByZXNvbHZlKHtzYXZlZDpmYWxzZX0pXG4gICAgICAgICAgfVxuICAgICAgICAgIHJlc29sdmUoe3NhdmVkOnRydWUsIGlkOmF3Yi5pZH0pXG4gICAgICAgIH0pXG4gICAgICB9XG4gICAgICBlbHNle1xuICAgICAgZGF0YUNvbnRleHQucmVkaXNDbGllbnQuaW5jcihBV0JfSUQsKGVycixyZXBseSk9PntcbiAgICAgICAgYXdiLmlkID0gcmVwbHk7IFxuICAgICAgICBhd2Iuc3RhdHVzID0gMTsgXG4gICAgICAgIGlmIChhd2IuaW52b2ljZSl7XG4gICAgICAgICAgYXdiLmhhc0RvY3MgPSAxXG4gICAgICAgICAgY29uc29sZS5sb2coXCJIQVMgRE9DQ0NDQ1wiKVxuICAgICAgICB9XG4gICAgICAgIGVsc2Uge1xuICAgICAgICAgIGF3Yi5oYXNEb2NzID0gMCA7IFxuICAgICAgICAgIGNvbnNvbGUubG9nKFwiSEFTIE5PIERPQ0NDQ0NcIilcbiAgICAgICAgfVxuICAgICAgICBcbiAgICAgICAgYXdiLmRhdGVDcmVhdGVkID0gbW9tZW50KCkudW5peCgpOyBcbiAgICAgICAgICBhd2JJbmRleC5hZGQoYXdiLmlkLGF3YiwoZXJyMSxhd2JSZXMpPT57XG4gICAgICAgICAgICBpZiAoZXJyMSl7XG4gICAgICAgICAgICAgIGNvbnNvbGUubG9nKCdzYXZpbmcgZXJyJyxlcnIxKVxuICAgICAgICAgICAgICByZXNvbHZlKHtzYXZlZDpmYWxzZX0pXG4gICAgICAgICAgICB9XG4gICAgICAgICAgICByZXNvbHZlKHtzYXZlZDp0cnVlLCBpZDpyZXBseX0pXG4gICAgICAgICAgfSlcbiAgICAgIH0pXG4gICAgfVxuICAgICAgXG4gICAgICBcbiAgICB9KVxuICB9XG4gIGdldEF3Yk92ZXJ2aWV3KGlkKXtcbiAgICAvLyBnZXQgdGhlIGF3YiBwYWNrYWdlcyBhbmQgYWRkIGV2ZXJ5dGhpbmcgaW4gXG4gICAgcmV0dXJuIG5ldyBQcm9taXNlKChyZXNvbHZlLHJlamVjdCk9PntcbiAgICAgIHBhY2thZ2VJbmRleC5zZWFyY2goYEBhd2I6WyR7aWR9ICR7aWR9XWAse251bWJlck9mUmVzdWx0czo1MDAwLG9mZnNldDowfSwoZXJyLHBhY2thZ2VzKT0+e1xuICAgICAgICB2YXIgd2VpZ2h0ID0gMCA7IFxuICAgICAgICB2YXIgcGllY2VzID0gcGFja2FnZXMudG90YWxSZXN1bHRzOyBcbiAgICAgICAgdmFyIGRlc2NyaXB0aW9uID0gXCJcIlxuICAgICAgICBwYWNrYWdlcy5yZXN1bHRzLmZvckVhY2gocGFja2FnZTEgPT4ge1xuICAgICAgICAgIGlmIChkZXNjcmlwdGlvbiA9PVwiXCIpXG4gICAgICAgICAgICBkZXNjcmlwdGlvbiA9IHBhY2thZ2UxLmRvYy5kZXNjcmlwdGlvbjsgXG4gICAgICAgICAgd2VpZ2h0ICs9IE51bWJlcihwYWNrYWdlMS5kb2Mud2VpZ2h0KVxuICAgICAgICB9KTtcbiAgICAgICAgdmFyIGRhdGEgID0ge3dlaWdodDp3ZWlnaHQsZGVzY3JpcHRpb246ZGVzY3JpcHRpb24scGllY2VzOnBpZWNlc31cbiAgICAgICAgY29uc29sZS5sb2coZGF0YSxcIkFXQiBERVRBSUxTXCIpOyBcbiAgICAgICAgcmVzb2x2ZSggZGF0YSlcbiAgICAgIH0pXG4gICAgfSlcbiAgIFxuICB9XG4gIGdldEF3YkRldGFpbHMoaWQpe1xuICAgIHZhciBzcnYgPSB0aGlzOyBcbiAgICByZXR1cm4gbmV3IFByb21pc2UoKHJlc29sdmUscmVqZWN0KT0+e1xuICAgICAgY29uc29sZS5sb2coYEBhd2I6WyR7aWR9ICR7aWR9XWApXG4gICAgIFxuICAgICAgcGFja2FnZUluZGV4LnNlYXJjaChgQGF3YjpbJHtpZH0gJHtpZH1dYCx7bnVtYmVyT2ZSZXN1bHRzOjUwMDAsb2Zmc2V0OjB9LChlcnIscGFja2FnZXMpPT57XG4gICAgICAgIGlmIChlcnIpXG4gICAgICAgICBjb25zb2xlLmxvZyhlcnIpXG4gICAgICBcbiAgICAgICAgdmFyICBwYWNrYWdlbGlzdCAgPSBbXVxuICAgICAgICB2YXIgY291bnQgPSAxOyBcbiAgICAgICAgcGFja2FnZXMucmVzdWx0cy5mb3JFYWNoKHBhY2thZ2UxID0+IHtcblxuICAgICAgICAgIGlmIChwYWNrYWdlMS5kb2MudHJhY2tpbmdOby5sZW5ndGggPiA3KXtcbiAgICAgICAgICAgIC8vb25seSBkaXNwbGF5IHRoZSBsYXN0IDcgXG4gICAgICAgICAgICBwYWNrYWdlMS5kb2MudHJhY2tpbmdObyA9IHBhY2thZ2UxLmRvYy50cmFja2luZ05vLnN1YnN0cmluZyhwYWNrYWdlMS5kb2MudHJhY2tpbmdOby5sZW5ndGggLTcpXG4gICAgICAgICAgICBcbiAgICAgICAgICB9XG4gICAgICAgICAgcGFja2FnZTEuZG9jLnBhY2thZ2VJbmRleCA9IGNvdW50O1xuICAgICAgICAgIGNvdW50ICsrOyBcbiAgICAgICAgICBwYWNrYWdlbGlzdC5wdXNoKCBwYWNrYWdlMS5kb2MpXG4gICAgICAgIH0pO1xuICAgICAgIFxuICAgICAgIFxuICAgICAgICByZXNvbHZlKCBwYWNrYWdlbGlzdClcbiAgICAgIH0pXG4gICAgfSlcbiAgfVxuICBsaXN0Tm9Eb2NzRmxsKCl7XG4gICAgcmV0dXJuIG5ldyBQcm9taXNlKChyZXNvbHZlLHJlamVjdCk9PntcbiAgICAgICBhd2JJbmRleC5zZWFyY2goXCJAc3RhdHVzOlsxIDFdIEBoYXNEb2NzOlswIDBdXCIse29mZnNldDowLG51bWJlck9mUmVzdWx0czo1MDAwLHNvcnRCeTonaWQnfSwoZXJyLGF3YnMpPT57XG4gICAgICAgICB2YXIgYXdiTGlzdCA9IFtdOyBcbiAgICAgICAgIFByb21pc2UuYWxsKGF3YnMucmVzdWx0cy5tYXAoYXdiPT5jdXN0b21lclNlcnZpY2UuZ2V0Q3VzdG9tZXIoYXdiLmRvYy5jdXN0b21lcklkKSkpLnRoZW4oY3VzdG9tZXJzPT57XG4gICAgICAgICAgIFByb21pc2UuYWxsKGF3YnMucmVzdWx0cy5tYXAoYXdiPT50aGlzLmdldEF3Yk92ZXJ2aWV3KGF3Yi5kb2MuaWQpKSkudGhlbihkZXRhaWxzPT57XG4gICAgICAgICAgICBjb25zb2xlLmxvZyhcImdvdCB0aGUgY3VzdG9tZXJzXCIsY3VzdG9tZXJzLCBhd2JzKVxuICAgICAgICAgICAgZm9yKHZhciBpID0wIDsgaSA8IGF3YnMucmVzdWx0cy5sZW5ndGggOyBpKysgKXtcbiAgICAgICAgICAgICAgdmFyIGF3YiA9IGF3YnMucmVzdWx0c1tpXTsgXG4gICAgICAgICAgICAgIGF3Yi5kb2MuZGF0ZUNyZWF0ZWQgPSBtb21lbnQudW5peChhd2IuZG9jLmRhdGVDcmVhdGVkKS5mb3JtYXQoXCJZWVlZLU1NLUREIGhoOm1tIEFcIilcbiAgICAgICAgICAgICAgLy93ZSBuZWVkIHRvIGdldCB0aGUgY3VzdG9tZXIgXG4gICAgICAgICAgICAgIGF3Yi5kb2MuY29uc2lnbmVlID0gY3VzdG9tZXJzW2ldLm5hbWU7IFxuICAgICAgICAgICAgICBhd2IuZG9jLndlaWdodCA9IGRldGFpbHNbaV0ud2VpZ2h0OyBcbiAgICAgICAgICAgICAgYXdiLmRvYy5wbWIgPSBjdXN0b21lcnNbaV0ucG1iOyBcbiAgICAgICAgICAgICAgYXdiLmRvYy5kZXNjcmlwdGlvbiA9IGRldGFpbHNbaV0uZGVzY3JpcHRpb247IFxuICAgICAgICAgICAgICBhd2IuZG9jLnBpZWNlcyA9IGRldGFpbHNbaV0ucGllY2VzOyBcbiAgICAgICAgICAgICAgaWYgKGN1c3RvbWVyc1tpXS5wbWIgPT0gJycpe1xuICAgICAgICAgICAgICAgIGF3Yi5kb2MucG1iID0gJzkwMDAnXG4gICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgY29uc29sZS5sb2coJ3B1c2hpbmcgJyxhd2IpXG4gICAgICAgICAgICAgIC8vd2UgbmVlZCB0byBnZXQgYWxsIHRoZSBwYWNrYWdlcyBcbiAgICAgICAgICAgICAgYXdiTGlzdC5wdXNoKGF3Yi5kb2MpXG4gICAgICAgICAgICAgfVxuICAgICAgICAgICAgIHJlc29sdmUoe2F3YnM6YXdiTGlzdH0pXG4gICAgICAgICAgIH0pXG4gICAgICAgICAgXG4gICAgICAgICAgfSkuY2F0Y2goZXJyPT57XG4gICAgICAgICAgICBjb25zb2xlLmxvZyhlcnIpOyBcbiAgICAgICAgICB9KVxuICAgICAgICAgXG4gICAgICAgIC8vICBhd2JzLnJlc3VsdHMuZm9yRWFjaChhd2IgPT4ge1xuICAgICAgICAgICBcbiAgICAgICAgICBcbiAgICAgICAgLy8gIH0pO1xuICAgICAgICAgXG4gICAgICAgfSlcbiAgICB9KVxuICB9XG5cbiAgbGlzdEF3YmluRmxsKCl7XG4gICAgcmV0dXJuIG5ldyBQcm9taXNlKChyZXNvbHZlLHJlamVjdCk9PntcbiAgICAgICBhd2JJbmRleC5zZWFyY2goXCJAc3RhdHVzOlsxIDFdIEBoYXNEb2NzOlsxIDFdXCIse29mZnNldDowLG51bWJlck9mUmVzdWx0czo1MDAwLHNvcnRCeTonaWQnfSwoZXJyLGF3YnMpPT57XG4gICAgICAgICB2YXIgYXdiTGlzdCA9IFtdOyBcbiAgICAgICAgIFByb21pc2UuYWxsKGF3YnMucmVzdWx0cy5tYXAoYXdiPT5jdXN0b21lclNlcnZpY2UuZ2V0Q3VzdG9tZXIoYXdiLmRvYy5jdXN0b21lcklkKSkpLnRoZW4oY3VzdG9tZXJzPT57XG4gICAgICAgICAgIFByb21pc2UuYWxsKGF3YnMucmVzdWx0cy5tYXAoYXdiPT50aGlzLmdldEF3Yk92ZXJ2aWV3KGF3Yi5kb2MuaWQpKSkudGhlbihkZXRhaWxzPT57XG4gICAgICAgICAgICBjb25zb2xlLmxvZyhcImdvdCB0aGUgY3VzdG9tZXJzXCIsY3VzdG9tZXJzLCBhd2JzKVxuICAgICAgICAgICAgZm9yKHZhciBpID0wIDsgaSA8IGF3YnMucmVzdWx0cy5sZW5ndGggOyBpKysgKXtcbiAgICAgICAgICAgICAgdmFyIGF3YiA9IGF3YnMucmVzdWx0c1tpXTsgXG4gICAgICAgICAgICAgIGF3Yi5kb2MuZGF0ZUNyZWF0ZWQgPSBtb21lbnQudW5peChhd2IuZG9jLmRhdGVDcmVhdGVkKS5mb3JtYXQoXCJZWVlZLU1NLUREIGhoOm1tIEFcIilcbiAgICAgICAgICAgICAgLy93ZSBuZWVkIHRvIGdldCB0aGUgY3VzdG9tZXIgXG4gICAgICAgICAgICAgIGF3Yi5kb2MuY29uc2lnbmVlID0gY3VzdG9tZXJzW2ldLm5hbWU7IFxuICAgICAgICAgICAgICBhd2IuZG9jLnBtYiA9IGN1c3RvbWVyc1tpXS5wbWI7IFxuICAgICAgICAgICAgICBhd2IuZG9jLndlaWdodCA9IGRldGFpbHNbaV0ud2VpZ2h0OyBcbiAgICAgICAgICAgICAgYXdiLmRvYy5kZXNjcmlwdGlvbiA9IGRldGFpbHNbaV0uZGVzY3JpcHRpb247IFxuICAgICAgICAgICAgICBhd2IuZG9jLnBpZWNlcyA9IGRldGFpbHNbaV0ucGllY2VzOyBcbiAgICAgICAgICAgICAgaWYgKGN1c3RvbWVyc1tpXS5wbWIgPT0gJycpe1xuICAgICAgICAgICAgICAgIGF3Yi5kb2MucG1iID0gJzkwMDAnXG4gICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgY29uc29sZS5sb2coJ3B1c2hpbmcgJyxhd2IpXG4gICAgICAgICAgICAgIC8vd2UgbmVlZCB0byBnZXQgYWxsIHRoZSBwYWNrYWdlcyBcbiAgICAgICAgICAgICAgYXdiTGlzdC5wdXNoKGF3Yi5kb2MpXG4gICAgICAgICAgICAgfVxuICAgICAgICAgICAgIHJlc29sdmUoe2F3YnM6YXdiTGlzdH0pXG4gICAgICAgICAgIH0pXG4gICAgICAgICAgXG4gICAgICAgICAgfSkuY2F0Y2goZXJyPT57XG4gICAgICAgICAgICBjb25zb2xlLmxvZyhlcnIpOyBcbiAgICAgICAgICB9KVxuICAgICAgICAgXG4gICAgICAgIC8vICBhd2JzLnJlc3VsdHMuZm9yRWFjaChhd2IgPT4ge1xuICAgICAgICAgICBcbiAgICAgICAgICBcbiAgICAgICAgLy8gIH0pO1xuICAgICAgICAgXG4gICAgICAgfSlcbiAgICB9KVxuICB9XG4gIGdldEF3YihpZCl7XG4gICAgY29uc3Qgc3J2ID0gdGhpczsgXG4gICAgcmV0dXJuIG5ldyBQcm9taXNlKChyZXNvbHZlLHJlamVjdCk9PntcbiAgICAgIGF3YkluZGV4LmdldERvYyhpZCwoZXJyLGF3Yik9PntcbiAgICAgICAgLy9nZXQgdGhlIGN1c3RvbWVyIFxuICAgICAgICBjdXN0b21lclNlcnZpY2UuZ2V0Q3VzdG9tZXIoYXdiLmRvYy5jdXN0b21lcklkKS50aGVuKGN1c3RvbWVyPT57XG4gICAgICAgICAgYXdiLmRvYy5jdXN0b21lciA9IGN1c3RvbWVyOyBcbiAgICAgICAgICBzcnYuZ2V0QXdiRGV0YWlscyhpZCkudGhlbihwYWNrYWdlcz0+e1xuICAgICAgICAgICAgLy9nZXQgdGhlIHBhY2thZ2VzIGZvciB0aGUgYXdiIFxuICAgICAgICAgICAgYXdiLmRvYy5wYWNrYWdlcyA9IHBhY2thZ2VzOyBcbiAgICAgICAgICAgIHJlc29sdmUoe2F3Yjphd2IuZG9jfSkgIFxuICAgICAgICAgIH0pXG4gICAgICAgICAgXG4gICAgICAgIH0pXG4gICAgICAgIFxuICAgICAgfSlcbiAgICB9KVxuICB9XG4gIHVwZGF0ZUxvY2F0aW9uKHRyYWNraW5nTnVtYmVyLGxvY2F0aW9uX2lkKXtcbiAgICByZXR1cm4gbmV3IFByb21pc2UoKHJlc29sdmUscmVqZWN0KT0+e1xuICAgICAgcGFja2FnZUluZGV4LnNlYXJjaChcIkB0cmFja2luZ05vOlwiK3RyYWNraW5nTnVtYmVyLHtsb2NhdGlvbjpsb2NhdGlvbl9pZH0sKGVycixwYWNrYWdlUmVzdWx0KT0+e1xuXG4gICAgICB9KVxuICAgIH0pXG4gIH1cbiAgc2F2ZVBhY2thZ2VUb0F3YihuZXdQYWNrYWdlKXtcbiAgICByZXR1cm4gbmV3IFByb21pc2UoKHJlc29sdmUscmVzdWx0KT0+e1xuICAgICAgZGF0YUNvbnRleHQucmVkaXNDbGllbnQuaW5jcihQS0dfSURfQ09VTlRFUiwoZXJyLGlkKT0+e1xuICAgICAgICBuZXdQYWNrYWdlLmlkID0gaWQ7IFxuICAgICAgICBwYWNrYWdlSW5kZXguYWRkKGlkLG5ld1BhY2thZ2UsKGVycixyZXN1bHQpPT57XG4gICAgICAgICAgaWYgKGVycilcbiAgICAgICAgICAgIGNvbnNvbGUubG9nKGVycik7IFxuICAgICAgICAgIHJlc29sdmUoe3NhdmVkOnRydWUsaWQ6aWR9KVxuICAgICAgICB9KVxuICAgICAgfSlcbiAgICB9KVxuICB9XG4gIHNhdmVQYWNrYWdlKGJvZHkpe1xuICAgIHJldHVybiBuZXcgUHJvbWlzZSgocmVzb2x2ZSxyZWplY3QpPT57XG4gICAgICB2YXIgY1BhY2thZ2UgPSB7XG4gICAgICAgIFxuICAgICAgICBza3lib3g6IGJvZHkuc2t5Ym94LFxuICAgICAgICBjdXN0b21lcjogYm9keS5jdXN0b21lci5yZXBsYWNlKFwiLVwiLCBcIlwiKS50cmltKCksXG4gICAgICAgIHRyYWNraW5nTm86IGJvZHkudHJhY2tpbmcsXG4gICAgICAgIGRlc2NyaXB0aW9uOiBib2R5LmRlc2NyaXB0aW9uLFxuICAgICAgICBzaGlwcGVyOiBib2R5LnNoaXBwZXIsXG4gICAgICAgIGNhcnJpZXI6Ym9keS5jYXJyaWVyLFxuICAgICAgICB2YWx1ZTogTnVtYmVyKGJvZHkudmFsdWUpLFxuICAgICAgICBwaWVjZXM6IE51bWJlcihib2R5LnBpZWNlcyksXG4gICAgICAgIHdlaWdodDogTnVtYmVyKGJvZHkud2VpZ2h0KSxcbiAgICAgICAgZGltZW5zaW9uczogYm9keS5kaW1lbnNpb25zLFxuICAgICAgICBzdGF0dXM6IDEsXG4gICAgICAgIGxvY2F0aW9uOiBcIkZMTFwiLFxuICAgICAgICBtaWQ6IDAsXG4gICAgICAgIGF3YjowLFxuICAgICAgICAvL2hhc09wdDogdHJ1ZSxcbiAgICAgICAgLy9tdHlwZTogYm9keS5tdHlwZVxuICAgICAgfTtcbiAgICAgIC8vdmFsaWRhdGUgdGhlIHBhY2thZ2UgXG4gICAgICBkYXRhQ29udGV4dC5yZWRpc0NsaWVudC5pbmNyKFBLR19JRF9DT1VOVEVSLChlcnIsaWQpPT57XG4gICAgICAgIGNQYWNrYWdlLmlkID0gaWQ7IFxuICAgICAgICBkYXRhQ29udGV4dC5yZWRpc0NsaWVudC5zZXQoUEtHX1BSRUZJWCtpZCxjUGFja2FnZSwoZXJyLHJlc3BvbnNlKT0+e1xuICAgICAgICAgIGlmIChlcnIpe1xuICAgICAgICAgICAgcmVqZWN0KHtzYXZlZDpmYWxzZSxlcnI6ZXJyfSlcbiAgICAgICAgICB9XG4gICAgICAgICAgIHZhciBpbmRleFBhY2thZ2UgPSAgY3JlYXRlRG9jdW1lbnQoY1BhY2thZ2UpOyBcbiAgICAgICAgICAgY29uc29sZS5sb2coaW5kZXhQYWNrYWdlKTsgXG4gICAgICAgICAgIHBhY2thZ2VJbmRleC5hZGQoY1BhY2thZ2UuaWQsaW5kZXhQYWNrYWdlLChlcnIxLGRvY1Jlc3VsdCk9PntcbiAgICAgICAgICAgICBjb25zb2xlLmxvZyhkb2NSZXN1bHQpOyBcbiAgICAgICAgICAgICBpZihlcnIxKXtcbiAgICAgICAgICAgICAgIHJlamVjdCh7c2F2ZWQ6ZmFsc2UsZXJyOmVycjF9KVxuICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICByZXNvbHZlKHtzYXZlZDp0cnVlfSlcbiAgICAgICAgICAgfSlcblxuICAgICAgICB9KVxuICAgICAgfSk7XG4gICAgXG5cblxuICAgIH0pXG4gIH1cbiAgc2F2ZVBhY2thZ2VPbGQoYm9keSkge1xuICAgIFxuICAgIHZhciBzZWFyY2hlciA9IHRoaXMubXlTZWFyY2g7IFxuICAgIHJldHVybiBuZXcgUHJvbWlzZSgocmVzb2x2ZSwgcmVqZWN0KSA9PiB7XG4gICAgICB2YXIgY1BhY2thZ2UgPSB7XG4gICAgICAgIHNreWJveDogYm9keS5za3lib3gsXG4gICAgICAgIGN1c3RvbWVyOiBib2R5LmN1c3RvbWVyLnJlcGxhY2UoXCItXCIsIFwiXCIpLnRyaW0oKSxcbiAgICAgICAgdHJhY2tpbmdObzogYm9keS50cmFja2luZyxcbiAgICAgICAgZHV0eVBlcmNlbnQ6IDAuMixcbiAgICAgICAgZGVzY3JpcHRpb246IGJvZHkuZGVzY3JpcHRpb24sXG4gICAgICAgIHNoaXBwZXI6IGJvZHkuc2hpcHBlcixcbiAgICAgICAgdmFsdWU6IE51bWJlcihib2R5LnZhbHVlKSxcbiAgICAgICAgcGllY2VzOiBOdW1iZXIoYm9keS5waWVjZXMpLFxuICAgICAgICB3ZWlnaHQ6IE51bWJlcihib2R5LndlaWdodCksXG4gICAgICAgIHN0YXR1czogMSxcbiAgICAgICAgbG9jYXRpb246IFwiRkxMXCIsXG4gICAgICAgIG1pZDogYm9keS5taWQsXG4gICAgICAgIGhhc09wdDogdHJ1ZSxcbiAgICAgICAgLy9tdHlwZTogYm9keS5tdHlwZVxuICAgICAgfTtcbiAgICAgIGNvbnNvbGUubG9nKFwiYWJvdXQgdG8gc2F2ZSB0aGUgcGFja2FnZVwiKTtcbiAgICAgIGlmICh0eXBlb2YgY1BhY2thZ2Uuc2hpcHBlciA9PT0gXCJ1bmRlZmluZWRcIikgY1BhY2thZ2Uuc2hpcHBlciA9IFwiXCI7XG4gICAgICBpZiAodHlwZW9mIGNQYWNrYWdlLmRlc2NyaXB0aW9uID09PSBcInVuZGVmaW5lZFwiKVxuICAgICAgICBjUGFja2FnZS5kZXNjcmlwdGlvbiA9IFwiXCI7XG4gICAgICBjb25zb2xlLmxvZyhib2R5KTtcbiAgICAgIC8vIGlmIChOdW1iZXIoYm9keS5pc0J1c2luZXNzKSA9PSAxKSB7XG4gICAgICAvLyAgIGNQYWNrYWdlLmhhc09wdCA9IGZhbHNlO1xuICAgICAgLy8gfVxuICAgICAgLy9jUGFja2FnZSA9IHBhY2thZ2VVdGlsLmNhbGN1bGF0ZUZlZXMoY1BhY2thZ2UpO1xuICAgICAgY29uc29sZS5sb2coXCJwYWNrYWdlIHdpdGggZmVlc1wiKTtcblxuICAgICAgLy93ZSBhbHNvIHdhbnQgdG8gY2FsY3VsYXRlIHRoZSB0aGUgcGFja2FnZSBmZWVzIG9uZSB0aW1lLi4uLi4uXG4gICAgICAvL3dlIGhhdmUgdGhlIHBhY2thZ2UgZGV0YWlscyBoZXJlIC4uIG5vdyB3ZSBuZWVkIHRvIGdldCB0aGUgZXhpc3RpbmcgcGFja2FnZVxuXG4gICAgIFxuICAgICAgLy93ZSBuZWVkIHRvIGNoZWNrIHRvIHNlZSBvZiB0aGUgb3duZXIgaXMgYSBidXNpbmVzcyBoZXJlXG4gICAgICBjb25zb2xlLmxvZyhcImhlcmUgYWJvdXQgdG8gZ2V0IHRoZSBwYWNrYWdlXCIpXG4gICAgICBscmVkaXMuZ2V0UGFja2FnZShjUGFja2FnZS50cmFja2luZ05vKS50aGVuKHAgPT4ge1xuICAgICAgICBjb25zb2xlLmxvZygncCBpcyB0aGUgJyxwKTsgXG4gICAgICAgIGlmIChwKSB7XG4gICAgICAgICAgdmFyIGN1cnJlbnRDb250YWluZXIgPSBgbWFuaWZlc3Q6JHtwLm1pZH06JHtwLm10eXBlfToke2NvbnRhaW5lcn06YDtcbiAgICAgICAgICBjb25zb2xlLmxvZyhcImZvdW5kIHBhY2thZ2UgXCIpO1xuICAgICAgICAgIGNvbnNvbGUubG9nKHApO1xuICAgICAgICAgIGlmIChjb250YWluZXIgPT0gXCJiYWdcIikge1xuICAgICAgICAgICAgLy9jaGVjayB0byBzZWUgaWYgdGhlIGJhY2sgbm8gaXMgdGhlIHNhbWUuXG4gICAgICAgICAgICBpZiAocC5iYWcgIT0gY1BhY2thZ2UuYmFnKSB7XG4gICAgICAgICAgICAgIC8vcmVtb3ZlIGl0IGZyb20gdGhlIG9yaWdpbmFsIGxpc3RcbiAgICAgICAgICAgICAgbHJlZGlzLnNyZW0oY3VycmVudENvbnRhaW5lciArIHAuYmFnLCBwLnRyYWNraW5nTm8pO1xuICAgICAgICAgICAgICBjb25zb2xlLmxvZyhcbiAgICAgICAgICAgICAgICBcInJlbW92ZSBwYWNrYWdlIGZyb20gY3VycmVudCBzZXQgXCIgKyBjdXJyZW50Q29udGFpbmVyXG4gICAgICAgICAgICAgICk7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgIC8vY2hlY2sgdG8gc2VlIGlmIHRoZSBza2lkIG51bWJlciBpcyB0aGUgc2FtZS5cbiAgICAgICAgICAgIGlmIChwLnNraWQgIT0gY1BhY2thZ2Uuc2tpZCkge1xuICAgICAgICAgICAgICAvL3JlbW92ZSBpdCBmcm9tIHRoZSBvcmlnaW5hbCBsaXN0XG4gICAgICAgICAgICAgIGxyZWRpcy5zcmVtKGN1cnJlbnRDb250YWluZXIgKyBwLnNraWQsIHAudHJhY2tpbmdObyk7XG4gICAgICAgICAgICAgIGNvbnNvbGUubG9nKFxuICAgICAgICAgICAgICAgIFwicmVtb3ZlIHBhY2thZ2UgZnJvbSBjdXJyZW50IHNldCBcIiArIGN1cnJlbnRDb250YWluZXJcbiAgICAgICAgICAgICAgKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICB9XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgLy8gdGhlIHBhY2thZ2UgZG9lc24ndCBleGlzdCB1cGRhdGUgdGhlIGNvdW50ZXJcbiAgICAgICAgICBscmVkaXMuY2xpZW50LmluY3IoXCJtY291bnRlcjpcIiArIGNQYWNrYWdlLm1pZCk7XG4gICAgICAgICAgXG4gICAgICAgIH1cblxuICAgICAgICBscmVkaXNcbiAgICAgICAgICAuaG1zZXQoXCJwYWNrYWdlczpcIiArIGNQYWNrYWdlLnRyYWNraW5nTm8sIGNQYWNrYWdlKVxuICAgICAgICAgIC50aGVuKGZ1bmN0aW9uKHJlc3VsdCkge1xuICAgICAgICAgICAgLy9hZGQgdG8gcXVldWUgZm9yIHBlcnNpc3RlbnQgcHJvY2Vzc2luZ1xuICAgICAgICAgICAgXG4gICAgICAgICAgICB2YXIgbWFuaWZlc3RLZXkgPSBgbWFuaWZlc3Q6JHtjUGFja2FnZS5taWR9OiR7XG4gICAgICAgICAgICAgIGNQYWNrYWdlLm10eXBlXG4gICAgICAgICAgICB9OiR7Y29udGFpbmVyfToke2NvbnRhaW5lck5vfWA7XG4gICAgICAgICAgICBjb25zb2xlLmxvZyhcImFib3V0IHRvIGNyZWF0ZSB0aGUgZG9jdW1lbnQuLi4uXCIpO1xuICAgICAgICAgICAgYWRkUGFja2FnZVRvSW5kZXgoY1BhY2thZ2UudHJhY2tpbmdObyxzZWFyY2hlcik7IFxuICAgICAgICAgICAgY29uc29sZS5sb2coXCJhZGRlZCB0aGUgcGFja2FnZSB0byBpbmRleFwiKTtcbiAgICAgICAgICAgIGxyZWRpc1xuICAgICAgICAgICAgICAuc2V0QWRkKG1hbmlmZXN0S2V5LCBjUGFja2FnZS50cmFja2luZ05vKVxuICAgICAgICAgICAgICAudGhlbihmdW5jdGlvbihzUmVzdWx0KSB7XG4gICAgICAgICAgICAgICAgLy9nZXQgdGhlIG1lbWJlcnMgb25lIHRpbWUgaGVyZVxuICAgICAgICAgICAgICAgIGNvbnNvbGUubG9nKFwiYWRkZWQgdGhlIHBhY2thZ2UgdG8gdGhlIHNldFwiKTtcbiAgICAgICAgICAgICAgICBjb25zb2xlLmxvZyhtYW5pZmVzdEtleSk7XG4gICAgICAgICAgICAgICAgbHJlZGlzXG4gICAgICAgICAgICAgICAgICAuZ2V0TWVtYmVycyhtYW5pZmVzdEtleSlcbiAgICAgICAgICAgICAgICAgIC50aGVuKGRhdGEgPT4ge1xuICAgICAgICAgICAgICAgICAgICBjb25zb2xlLmxvZyhcImRhdGFcIik7XG4gICAgICAgICAgICAgICAgICAgIGNvbnNvbGUubG9nKGRhdGEpO1xuICAgICAgICAgICAgICAgICAgICBQcm9taXNlLmFsbChkYXRhLm1hcChscmVkaXMuZ2V0UGFja2FnZSkpO1xuICAgICAgICAgICAgICAgICAgfSlcbiAgICAgICAgICAgICAgICAgIC50aGVuKGZ1bmN0aW9uKHJkYXRhKSB7XG4gICAgICAgICAgICAgICAgICAgIC8vd2UgbmVlZCB0byBhbGVydCB0aGUgcGVyc29uIHRoYXQgdGhlIHBhY2thZ2UgaXMgaGVyZSBzbyByZWFkIGVtYWlsIGV0Yy5cbiAgICAgICAgICAgICAgICAgICAgLy9hZGQgdG8gdGhlIGluZGV4XG4gICAgICAgICAgICAgICAgICAgIGNvbnNvbGUubG9nKFwiZGF0YVwiKTtcbiAgICAgICAgICAgICAgICAgICAgY29uc29sZS5sb2cocmRhdGEpO1xuXG4gICAgICAgICAgICAgICAgICAgIHJlc29sdmUoe1xuICAgICAgICAgICAgICAgICAgICAgIHNhdmVkOiB0cnVlLFxuICAgICAgICAgICAgICAgICAgICAgIHBhY2thZ2VzOiByZGF0YSxcbiAgICAgICAgICAgICAgICAgICAgICBzUGFja2FnZTogY1BhY2thZ2VcbiAgICAgICAgICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICAgICAgICB9KVxuICAgICAgICAgICAgICAgICAgLmNhdGNoKGVycjMgPT4ge1xuICAgICAgICAgICAgICAgICAgICBjb25zb2xlLmxvZyhlcnIzKTtcbiAgICAgICAgICAgICAgICAgICAgcmVqZWN0KHtcbiAgICAgICAgICAgICAgICAgICAgICBlcnI6IGVycjMsXG4gICAgICAgICAgICAgICAgICAgICAgc2F2ZWQ6IHRydWUsXG4gICAgICAgICAgICAgICAgICAgICAgbGlzdGluZzogZmFsc2VcbiAgICAgICAgICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICAgICAgICB9KTtcbiAgICAgICAgICAgICAgfSlcbiAgICAgICAgICAgICAgLmNhdGNoKGZ1bmN0aW9uKGVycikge1xuICAgICAgICAgICAgICAgIHJlc29sdmUoe1xuICAgICAgICAgICAgICAgICAgc2F2ZWQ6IGZhbHNlXG4gICAgICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICAgIH0pO1xuICAgICAgICAgIH0pXG4gICAgICAgICAgLmNhdGNoKGZ1bmN0aW9uKGVycjIpIHtcbiAgICAgICAgICAgIHJlamVjdCh7XG4gICAgICAgICAgICAgIHNhdmVkOiBmYWxzZVxuICAgICAgICAgICAgfSk7XG4gICAgICAgICAgfSk7XG5cbiAgICAgICAgLy9zYXZlIHRoZSBwYWNrYWdlIHRvIHRoZSBwYWNrYWdlIE5TXG4gICAgICB9KS5jYXRjaChlcnIyMzI9PntcbiAgICAgICAgY29uc29sZS5sb2coZXJyMjMyKVxuICAgICAgfSk7XG4gICAgfSk7XG4gIH0gXG4gIGdldE1hbmlmZXN0UGFja2FnZXMoKXtcbiAgICByZXR1cm4gbmV3IFByb21pc2UoKHJlc29sdmUscmVqZWN0KT0+e1xuICAgICAgXG4gICAgICB0aGlzLm15U2VhcmNoLnNlYXJjaChcbiAgICAgICAgYEBtaWQ6WzAgMF1gLFxuICAgICAgICB7IG9mZnNldDogMCwgbnVtYmVyT2ZSZXN1bHRzOiA1MDAwIH0sXG4gICAgICAgIChlcnIsIGRhdGEpID0+IHtcbiAgICAgICAgICB2YXIgcGFja2FnZXMgPSBbXTtcbiAgICAgICAgICBjb25zb2xlLmxvZyhkYXRhKTtcbiAgICAgICAgICBkYXRhLnJlc3VsdHMuZm9yRWFjaChlbGVtZW50ID0+IHtcblxuICAgICAgICAgICAgcGFja2FnZXMucHVzaChlbGVtZW50LmRvYyk7XG4gICAgICAgICAgICByZXNvbHZlKHBhY2thZ2VzKTsgICAgICAgICAgICAgICAgIFxuICAgICAgICB9KTtcbiAgICB9KTtcbiAgICB9KVxuICB9XG4gIGdldFJlY2VpdmVkUGFja2FnZXMocGFnZSxwYWdlU2l6ZSl7XG4gICAgcmV0dXJuIG5ldyBQcm9taXNlKChyZXNvbHZlLHJlamVjdCk9PntcbiAgICAgIFxuICAgICAgdGhpcy5teVNlYXJjaC5zZWFyY2goXG4gICAgICAgIGBAbWlkOlswIDBdYCxcbiAgICAgICAgeyBvZmZzZXQ6IDAsIG51bWJlck9mUmVzdWx0czogNTAwMCB9LFxuICAgICAgICAoZXJyLCBkYXRhKSA9PiB7XG4gICAgICAgICAgdmFyIHBhY2thZ2VzID0gW107XG4gICAgICAgICAgY29uc29sZS5sb2coZGF0YSk7XG4gICAgICAgICAgZGF0YS5yZXN1bHRzLmZvckVhY2goZWxlbWVudCA9PiB7XG5cbiAgICAgICAgICAgIHBhY2thZ2VzLnB1c2goZWxlbWVudC5kb2MpO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIFxuICAgICAgICB9KTtcbiAgICAgICAgcmVzb2x2ZShwYWNrYWdlcyk7IFxuICAgIH0pO1xuICAgIH0pXG4gIH1cbiAgZ2V0Tm9Eb2NzUGFja2Fja2FnZXMocGFnZSxwYWdlU2l6ZSl7XG4gICAgcmV0dXJuIG5ldyBQcm9taXNlKChyZXNvbHZlLHJlamVjdCk9PntcbiAgICAgIFxuICAgICAgdGhpcy5teVNlYXJjaC5zZWFyY2goXG4gICAgICAgIGBAaGFzRG9jczpbMCAwXWAsXG4gICAgICAgIHsgb2Zmc2V0OiAwLCBudW1iZXJPZlJlc3VsdHM6IDUwMDAgfSxcbiAgICAgICAgKGVyciwgZGF0YSkgPT4ge1xuICAgICAgICAgIHZhciBwYWNrYWdlcyA9IFtdO1xuICAgICAgICAgIGNvbnNvbGUubG9nKGRhdGEpO1xuICAgICAgICAgIGRhdGEucmVzdWx0cy5mb3JFYWNoKGVsZW1lbnQgPT4ge1xuXG4gICAgICAgICAgICBwYWNrYWdlcy5wdXNoKGVsZW1lbnQuZG9jKTtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBcbiAgICAgICAgfSk7XG4gICAgICAgIHJlc29sdmUocGFja2FnZXMpOyBcbiAgICB9KTtcbiAgICB9KVxuICB9XG4gIGdldFBhY2thZ2VCeUlkKGJhcmNvZGUpe1xuICAgIHZhciBzcnYgPSB0aGlzOyBcbiAgICB2YXIgcGtnSWQgPSBnZXRQYWNrYWdlSWRGcm9tQmFyQ29kZShiYXJjb2RlKTsgXG4gICAgcmV0dXJuIG5ldyBQcm9taXNlKChyZXNvbHZlLHJlamVjdCk9PntcbiAgICAgIHRoaXMubXlTZWFyY2guZ2V0RG9jKHBrZ0lkLChlcnIsZG9jdW1lbnQpPT57XG4gICAgICAgIC8vZ2V0IHRoZSBhd2IgaW5mbyBoZXJlIGFzIHdlbGwgXG4gICAgICAgIHNydi5nZXRBd2IoZG9jdW1lbnQuZG9jLmF3YikudGhlbihhd2JpbmZvPT57XG4gICAgICAgICAgY29uc29sZS5sb2coYXdiaW5mbyk7IFxuICAgICAgICAgIHZhciByZXNwb25zZSA9IHsgXG4gICAgICAgICAgICBhd2IgOiBhd2JpbmZvLmF3YixcbiAgICAgICAgICAgIHBhY2thZ2UgOiBkb2N1bWVudC5kb2NcbiAgICAgICAgICB9XG4gICAgICAgICAgcmVzb2x2ZShyZXNwb25zZSk7IFxuICAgICAgICB9KTsgXG4gICAgICAgIFxuICAgICAgfSlcbiAgICB9KTsgXG4gIH1cbiAgLy91c2luZyB0aGlzIFxuICBcblxuICB1cGRhdGVNYW5pZmVzdFBhY2thZ2VUb0luVHJhbnNpdChtaWQpIHtcbiAgICAvL2dldCBhbGwgdGhlIHBhY2thZ2VzXG4gICAgLy93ZSBuZWVkIHRvIHVwZGF0ZSB0aGUgaW5kZXggYXQgdGhpcyBwb2ludCBhcyB3ZWxsXG4gICAgdmFyIG1zZWFyY2ggPSB0aGlzLm15U2VhcmNoO1xuICAgIHRoaXMubXlTZWFyY2guc2VhcmNoKFxuICAgICAgYEBtaWQ6WyR7bWlkfSAke21pZH1dYCxcbiAgICAgIHsgb2Zmc2V0OiAwLCBudW1iZXJPZlJlc3VsdHM6IDUwMDAgfSxcbiAgICAgIChlcnIsIGRhdGEpID0+IHtcbiAgICAgICAgdmFyIHBhY2thZ2VzID0gW107XG4gICAgICAgIGNvbnNvbGUubG9nKGRhdGEpO1xuICAgICAgICBkYXRhLnJlc3VsdHMuZm9yRWFjaChlbGVtZW50ID0+IHtcbiAgICAgICAgICB2YXIgb2xkRG9jSWQgPSBlbGVtZW50LmRvY0lkO1xuICAgICAgICAgIGVsZW1lbnQuZG9jSWQgPSBlbGVtZW50LmRvY0lkLnJlcGxhY2UoYCR7bWlkfS1gLCBcIlwiKTtcbiAgICAgICAgICBwYWNrYWdlcy5wdXNoKGVsZW1lbnQuZG9jSWQpO1xuICAgICAgICAgIC8vIGkgY291bGQgZGVsZXRlIGhlcmVcbiAgICAgICAgICAvLyBtc2VhcmNoLmRlbERvY3VtZW50KFBLR19JRFgsb2xkRG9jSWQpXG4gICAgICAgICAgLy91cGRhdGUgYWxsIHRoZSBwYWNrYWdlc1xuICAgICAgICB9KTtcbiAgICAgICAgc2V0UGFja2FnZUluVHJhbnNpdChwYWNrYWdlcywgbXNlYXJjaCwgbWlkKS50aGVuKGZ1bmN0aW9uKFxuICAgICAgICAgIHVwZGF0ZWRQYWNrYWdlc1xuICAgICAgICApIHtcbiAgICAgICAgICBjb25zb2xlLmxvZyhcInVwZGF0ZWQgcGFja2FnZXNcIik7XG4gICAgICAgICAgY29uc29sZS5sb2codXBkYXRlZFBhY2thZ2VzKTtcbiAgICAgICAgfSk7XG4gICAgICB9XG4gICAgKTtcbiAgfVxuICByZW1vdmVQYWNrYWdlRnJvbU1hbmlmZXN0KHBhY2thZ2VJZCwgbWlkKSB7XG4gICAgdmFyIG1zZWFyY2ggPSB0aGlzLm15U2VhcmNoO1xuICAgIHJldHVybiBuZXcgUHJvbWlzZSgocmVzb2x2ZSwgcmVqZWN0KSA9PiB7XG4gICAgICB2YXIgbWFuaWZlc3QgPSBtaWQ7XG4gICAgICB2YXIgbWFuaWZlc3RLZXkgPSBcIm1hbmlmZXN0OlwiICsgbWFuaWZlc3QgKyBcIjoqXCI7XG5cbiAgICAgIGxyZWRpcy5kZWwoXCJwYWNrYWdlczpcIiArIHRyYWNraW5nTm8pLnRoZW4oZnVuY3Rpb24ocmVzdWx0KSB7XG4gICAgICAgIGNvbnNvbGUubG9nKHJlc3VsdCk7XG4gICAgICAgIG1zZWFyY2guZGVsRG9jdW1lbnQoUEtHX0lEWCwgYCR7bWlkfS0ke3RyYWNraW5nTm99YCk7XG4gICAgICAgIC8vd2UgbmVlZCB0byByZW1vdmUgZnJvbSB0aGUgaW5kZXggYW5kIGRlYyB0aGUgY291bnRlclxuICAgICAgICBscmVkaXMuY2xpZW50LmRlY3IoXCJtY291bnRlcjpcIiArIG1pZCk7XG4gICAgICAgIC8vclNlcnZpY2VzLnBhY2thZ2VTZXJ2aWNlLnJtUGFja2FnZShtaWQsIHRyYWNraW5nTm8pO1xuICAgICAgICBscmVkaXMuZ2V0S2V5cyhtYW5pZmVzdEtleSkudGhlbihrUmVzdWx0ID0+IHtcbiAgICAgICAgICAvL3RoZSBsaXN0IG9mIGFsbCB0aGUgc2V0cyAuLi53ZSBuZWVkIHRvIHJlbW92ZSB0aGUga2V5IGZyb20gZWFjaCBvbmVcbiAgICAgICAgICB2YXIga2V5c0NvdW50ID0gMDtcblxuICAgICAgICAgIGtSZXN1bHQuZm9yRWFjaChlbGVtZW50ID0+IHtcbiAgICAgICAgICAgIGNvbnNvbGUubG9nKFxuICAgICAgICAgICAgICBgcmVtb3ZpbmcgJHt0cmFja2luZ05vfSBwYWNrYWdlIG1hbmlmZXN0IHNldCAke2VsZW1lbnR9IGBcbiAgICAgICAgICAgICk7XG4gICAgICAgICAgICBscmVkaXMuc3JlbShlbGVtZW50LCB0cmFja2luZ05vKS50aGVuKGZ1bmN0aW9uKHJSZXN1bHQpIHtcbiAgICAgICAgICAgICAgY29uc29sZS5sb2coclJlc3VsdCk7XG4gICAgICAgICAgICAgIGNvbnNvbGUubG9nKFwicmVtb3ZlZFwiKTtcbiAgICAgICAgICAgICAgaWYgKGtleXNDb3VudCA9PSBrUmVzdWx0Lmxlbmd0aCAtIDEpIGtleXNDb3VudCsrO1xuICAgICAgICAgICAgfSk7XG4gICAgICAgICAgfSk7XG4gICAgICAgICAgcmVzb2x2ZSh7XG4gICAgICAgICAgICBkZWxldGVkOiB0cnVlXG4gICAgICAgICAgfSk7XG4gICAgICAgIH0pO1xuXG4gICAgICAgIC8vd2UgYWxzbyBuZWVkIHRvIHJlbW92ZSBmcm9tIGFueSBzZXRzXG4gICAgICB9KTtcbiAgICB9KTtcbiAgfVxuICByZW1vdmVQYWNrYWdlQnlJZChpZCkge1xuICAgIHZhciBtc2VhcmNoID0gdGhpcy5teVNlYXJjaDtcbiAgICByZXR1cm4gbmV3IFByb21pc2UoKHJlc29sdmUsIHJlamVjdCkgPT4ge1xuICAgIFxuICAgICAgcmVkaVNlYXJjaC5kZWxEb2N1bWVudChQS0dfSURYLGlkLChlcnIscmVzcG9uc2UpPT57XG4gICAgICAgIHJlc29sdmUoe2RlbGV0ZWQ6dHJ1ZX0pXG4gICAgICB9KVxuICAgICAgXG4gICAgICAgIFxuICAgICAgXG4gICAgfSk7XG4gIH1cbiAgc3RvcmVQYWNrYWdlRm9yUGlja3VwKHRyYWNraW5nTm8sYmluKXtcbiAgICB2YXIgc2VhcmNoZXIgPSB0aGlzLm15U2VhcmNoO1xuICAgIHJldHVybiBuZXcgUHJvbWlzZSgocmVzb2x2ZSxyZWplY3QpPT57XG4gICAgICAgbHJlZGlzLmhtc2V0KFBLR19QUkVGSVgrdHJhY2tpbmdObyx7c3RhdHVzOjQsbG9jYXRpb246YmlufSkudGhlbigocmVzdWx0KT0+e1xuICAgICAgICAgbHJlZGlzLmdldFBhY2thZ2UodHJhY2tpbmdObykudGhlbigocGtnKT0+e1xuICAgICAgICAgIGFkZFBhY2thZ2VUb0luZGV4KHRyYWNraW5nTm8sc2VhcmNoZXIpIDsgXG4gICAgICAgICAgcmVzb2x2ZShwa2cpOyAgIFxuICAgICAgICAgfSk7XG4gICAgICAgfSkgXG4gICAgfSk7IFxuICB9XG4gIHVwZGF0ZVBhY2thZ2VJbmRleCh0cmFja2luZyl7XG4gICAgICByZXR1cm4gbmV3IFByb21pc2UoKHJlc29sdmUscmVqZWN0KT0+e1xuICAgICAgICAgIHZhciBtc2VhcmNoID0gdGhpcy5teVNlYXJjaDsgXG4gICAgICAgICAgYWRkUGFja2FnZVRvSW5kZXgodHJhY2tpbmcsbXNlYXJjaCk7IFxuICAgICAgICAgcmVzb2x2ZSh7J3VwZGF0ZWQnOnRydWV9KTtcbiAgICAgIH0pXG4gIH1cbiAgZ2V0Q3VzdG9tZXJQYWNrYWdlcyhza3lib3gpIHt9XG4gIGdldE1hbmlmZXN0UGFja2FnZXNCeVN0YXR1cyhtaWQsc3RhdHVzKSB7XG4gICAgICByZXR1cm4gbmV3IFByb21pc2UoKHJlc29sdmUscmVqZWN0KT0+e1xuICAgICAgICAgIGNvbnNvbGUubG9nKGBAbWlkOlske21pZH0gJHttaWR9XWApXG4gICAgICAgIHRoaXMubXlTZWFyY2guc2VhcmNoKFxuICAgICAgICAgICAgYEBtaWQ6WyR7bWlkfSAke21pZH1dYCxcbiAgICAgICAgICAgIHsgb2Zmc2V0OiAwLCBudW1iZXJPZlJlc3VsdHM6IDUwMDAgfSxcbiAgICAgICAgICAgIChlcnIsIGRhdGEpID0+IHtcbiAgICAgICAgICAgICAgdmFyIHBhY2thZ2VzID0gW107XG4gICAgICAgICAgICAgIGNvbnNvbGUubG9nKGRhdGEpO1xuICAgICAgICAgICAgICBkYXRhLnJlc3VsdHMuZm9yRWFjaChlbGVtZW50ID0+IHtcblxuICAgICAgICAgICAgICAgIHBhY2thZ2VzLnB1c2goZWxlbWVudC5kb2MpO1xuICAgICAgICAgICAgICAgIHJlc29sdmUocGFja2FnZXMpOyAgICAgICAgICAgICAgICAgXG4gICAgICAgICAgICB9KTtcbiAgICAgICAgfSk7XG4gICAgICB9KTtcbiAgXG4gIH0gICBcbiAgXG4gIFxuXG4gICAvLyNyZWdpb24gTWFuaWZlc3QgUGFja2FnZSBGdW5jdGlvbnMgXG5cbiAgIGFkZFRvRmxpZ2h0KGFjdGlvbil7XG4gICAgcmV0dXJuIG5ldyBQcm9taXNlKChyZXNvbHZlLHJlamVjdCk9PntcbiAgICAgIHZhciBwYWNrYWdlTm8gPSBnZXRQYWNrYWdlSWRGcm9tQmFyQ29kZShhY3Rpb24uYmFyY29kZSk7IFxuICAgICAgY29uc29sZS5sb2coYWN0aW9uKTsgXG4gICAgICB0aGlzLm15U2VhcmNoLnVwZGF0ZShwYWNrYWdlTm8se21pZDphY3Rpb24ubWlkICwgc3RhdHVzOiAyLCBsb2NhdGlvbjpcIkxvYWRlZCBvbiBBaXJDcmFmdFwifSwoZXJyLHJlc3VsdCk9PntcbiAgICAgICAgaWYoZXJyKVxuICAgICAgICAgIHJlc29sdmUoe2FkZGVkOmZhbHNlfSlcbiAgICAgICAgXG4gICAgICAgIHJlc29sdmUoe2FkZGVkOnRydWV9KVxuICAgICAgfSlcbiAgICAgICAgXG4gICAgfSlcbiAgIH1cbiAgIC8vcmVtb3ZlIGZyb20gZmxpZ2h0IFxuICAgcmVtb3ZlRnJvbUZsaWdodChhY3Rpb24pe1xuICAgIHJldHVybiBuZXcgUHJvbWlzZSgocmVzb2x2ZSxyZWplY3QpPT57XG4gICAgICAgIHZhciBwYWNrYWdlTm8gPSBnZXRQYWNrYWdlSWRGcm9tQmFyQ29kZShhY3Rpb24uYmFyY29kZSk7ICAgXG4gICAgICAgIHRoaXMubXlTZWFyY2gudXBkYXRlKHBhY2thZ2VObyx7bWlkOmFjdGlvbi5taWR9LChlcnIscmVzdWx0KT0+e1xuICAgICAgICBpZihlcnIpXG4gICAgICAgICAgICByZXNvbHZlKHtyZW1vdmVkOmZhbHNlfSlcbiAgICAgICAgICBcbiAgICAgICAgICByZXNvbHZlKHtyZW1vdmVkOnRydWV9KVxuICAgICAgICB9KVxuICAgIH0pXG4gICB9XG4gICByZWNGcm9tVHJ1Y2sodHJhY2tpbmdObyl7XG4gICAgIHJldHVybiBuZXcgUHJvbWlzZSgocmVzb2x2ZSxyZWplY3QpPT57XG4gICAgIFxuICAgICAgICBkYXRhQ29udGV4dC5yZWRpc0NsaWVudC5zZXQoUkVDX1BLRyt0cmFja2luZ05vLG1vbWVudCgpLnVuaXgoKSwgKGVycixyZXN1bHQpPT57XG4gICAgICAgICAgaWYgKGVycikgcmVzb2x2ZSh7c2F2ZWQ6ZmFsc2V9KVxuICAgICAgICAgIHJlc29sdmUoe3NhdmVkOnRydWV9KVxuICAgICAgICB9KVxuICAgICB9KVxuICAgfVxuICAgcHJvY3NzZXNzUGFja2FnZShwa2dJZm5vLHVzZXJuYW1lKXtcbiAgICAgcmV0dXJuIG5ldyBQcm9taXNlKChyZXNvbHZlLHJlamVjdCk9PntcbiAgICAgICBkYXRhQ29udGV4dC5yZWRpc0NsaWVudC5obXNldChcImZlZXM6YXdiOlwiK3BrZ0lmbm8uYXdiLHBrZ2luZm8sKGVycixyZXN1bHQpPT57XG4gICAgICAgICBpZiAoZXJyKVxuICAgICAgICAgIGNvbnNvbGUubG9nKGVycik7IFxuICAgICAgICAgIGNvbnNvbGUubG9nKHJlc3VsdCk7IFxuICAgICAgICAgZGF0YUNvbnRleHQucmVkaXNDbGllbnQucHVibGlzaChcInByaW50OmZlZXM6XCIrdXNlcm5hbWUscGtnSWZuby5hd2IpOyBcbiAgICAgICAgIHJlc29sdmUoe3NlbnQ6dHJ1ZX0pXG4gICAgICAgfSlcbiAgICAgfSlcbiAgIH1cbiAgIHJlY0Zyb21QbGFuZU5hcyhiYXJjb2RlKXtcbiAgICAgcmV0dXJuIG5ldyBQcm9taXNlKChyZXNvbHZlLHJlamVjdCk9PntcbiAgICAgICB2YXIgc3J2ID0gdGhpcyA7IFxuICAgICAgIHZhciBwa2dJZCA9IGdldFBhY2thZ2VJZEZyb21CYXJDb2RlKGJhcmNvZGUpOyBcbiAgICAgICAgc3J2Lm15U2VhcmNoLmdldERvYyhwa2dJZCwoZXJyLHBrZyk9PntcbiAgICAgICAgICAgIHBrZy5kb2Muc3RhdHVzID0gNDsgXG4gICAgICAgICAgICBwa2cuZG9jLmxvY2F0aW9uICA9IFwiV2FyZWhvdXNlIE5BU1wiOyBcbiAgICAgICAgICAgIHNydi5teVNlYXJjaC51cGRhdGUocGtnSWQscGtnLmRvYywoZXJyLHVwZGF0ZVJlc3VsdCk9PntcbiAgICAgICAgICAgICAgaWYoZXJyKVxuICAgICAgICAgICAgICAgIHJlamVjdCh7dXBkYXRlZDpmYWxzZX0pXG4gICAgICAgICAgICAgIHJlc29sdmUoe3VwZGF0ZWQ6dHJ1ZX0pXG4gICAgICAgICAgICB9KVxuICAgICAgICB9KVxuICAgICB9KVxuICAgfVxuICAgLy8jZW5kcmVnaW9uXG59XG5cbmZ1bmN0aW9uIGdldFBhY2thZ2VJZEZyb21CYXJDb2RlKGJhckNvZGVWYWx1ZSl7XG4gIHZhciBwYXJ0cyA9IGJhckNvZGVWYWx1ZS5zcGxpdChcIi1cIik7IFxuICBpZiAocGFydHMubGVuZ3RoID09IDMpXG4gICAgaWYgKHR5cGVvZiBwYXJ0c1syXSAhPSBcInVuZGVmaW5lZFwiKVxuICAgIHJldHVybiBwYXJ0c1syXS50cmltKCk7IFxuICByZXR1cm4gXCJcIlxufVxuIl19
