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
//# sourceMappingURL=data:application/json;charset=utf8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIlJlZGlzU2VydmljZXMvUGFja2FnZVNlcnZpY2UuZXM2Il0sIm5hbWVzIjpbInJlZGlzIiwicmVxdWlyZSIsImxyZWRpcyIsIm1vbWVudCIsInJlZGlzU2VhcmNoIiwiZnMiLCJQYWNrYWdlVXRpbCIsIlBhY2thZ2VVdGlsaXR5IiwicGFja2FnZVV0aWwiLCJQS0dfSURYIiwiUEtHX0lEX0NPVU5URVIiLCJkYXRhQ29udGV4dCIsIlBLR19QUkVGSVgiLCJBV0JfSUQiLCJJTkRFWF9BV0IiLCJSRUNfUEtHIiwiQ3VzdG9tZXJTZXJ2aWNlIiwiY3VzdG9tZXJTZXJ2aWNlIiwiUEtHX1NUQVRVUyIsImF3YkluZGV4IiwiY2xpZW50T3B0aW9ucyIsInNlYXJjaENsaWVudERldGFpbHMiLCJwYWNrYWdlSW5kZXgiLCJnZXRQYWNrYWdlVm9sdW1uZSIsIm1QYWNrYWdlIiwiY3JlYXRlRG9jdW1lbnQiLCJ0UGFja2FnZSIsInBhY2thZ2VEb2N1bWVudCIsImlkIiwidHJhY2tpbmdObyIsInNreWJveCIsImRhdGVSZWNpZXZlZCIsInVuaXgiLCJhd2IiLCJtaWQiLCJ2b2x1bWUiLCJ3ZWlnaHQiLCJwaWVjZXMiLCJjdXN0b21lciIsInNoaXBwZXIiLCJkZXNjcmlwdGlvbiIsImRpbWVuc2lvbnMiLCJjYXJyaWVyIiwic3RhdHVzIiwidmFsdWUiLCJjb25zb2xlIiwibG9nIiwic2V0UGFja2FnZUluVHJhbnNpdCIsImtleXMiLCJtc2VhcmNoZXIiLCJQcm9taXNlIiwicmVzb2x2ZSIsInJlamVjdCIsImJhdGNoZXIiLCJjbGllbnQiLCJiYXRjaCIsImZvckVhY2giLCJsb2NhdGlvbiIsImVsZW1lbnQiLCJobXNldCIsImV4ZWMiLCJlcnIiLCJyZXN1bHQiLCJhZGRQYWNrYWdlVG9JbmRleCIsImdldFBhY2thZ2UiLCJ0aGVuIiwiZGVsRG9jdW1lbnQiLCJwYWNrIiwiZG9uZSIsImRvY3VtZW50IiwiYWRkIiwiUGFja2FnZVNlcnZpY2UiLCJzZXR1cEluZGV4IiwibXlTZWFyY2giLCJyZWRpc0NsaWVudCIsImV4aXN0cyIsInNldCIsImluaXRSZXN1bHQiLCJpbmNyIiwibmV3SWQiLCJ0b1N0cmluZyIsInVwZGF0ZSIsImVycjEiLCJhd2JSZXMiLCJzYXZlZCIsInJlcGx5IiwiaW52b2ljZSIsImhhc0RvY3MiLCJkYXRlQ3JlYXRlZCIsInNlYXJjaCIsIm51bWJlck9mUmVzdWx0cyIsIm9mZnNldCIsInBhY2thZ2VzIiwidG90YWxSZXN1bHRzIiwicmVzdWx0cyIsInBhY2thZ2UxIiwiZG9jIiwiTnVtYmVyIiwiZGF0YSIsInNydiIsInBhY2thZ2VsaXN0IiwiY291bnQiLCJsZW5ndGgiLCJzdWJzdHJpbmciLCJwdXNoIiwic29ydEJ5IiwiYXdicyIsImF3Ykxpc3QiLCJhbGwiLCJtYXAiLCJnZXRDdXN0b21lciIsImN1c3RvbWVySWQiLCJnZXRBd2JPdmVydmlldyIsImN1c3RvbWVycyIsImkiLCJmb3JtYXQiLCJjb25zaWduZWUiLCJuYW1lIiwiZGV0YWlscyIsInBtYiIsImNhdGNoIiwiZ2V0RG9jIiwiZ2V0QXdiRGV0YWlscyIsInRyYWNraW5nTnVtYmVyIiwibG9jYXRpb25faWQiLCJwYWNrYWdlUmVzdWx0IiwibmV3UGFja2FnZSIsImJvZHkiLCJjUGFja2FnZSIsInJlcGxhY2UiLCJ0cmltIiwidHJhY2tpbmciLCJyZXNwb25zZSIsImluZGV4UGFja2FnZSIsImRvY1Jlc3VsdCIsInNlYXJjaGVyIiwiZHV0eVBlcmNlbnQiLCJoYXNPcHQiLCJwIiwiY3VycmVudENvbnRhaW5lciIsIm10eXBlIiwiY29udGFpbmVyIiwiYmFnIiwic3JlbSIsInNraWQiLCJtYW5pZmVzdEtleSIsImNvbnRhaW5lck5vIiwic2V0QWRkIiwic1Jlc3VsdCIsImdldE1lbWJlcnMiLCJyZGF0YSIsInNQYWNrYWdlIiwiZXJyMyIsImxpc3RpbmciLCJlcnIyIiwiZXJyMjMyIiwicGFnZSIsInBhZ2VTaXplIiwiYmFyY29kZSIsInBrZ0lkIiwiZ2V0UGFja2FnZUlkRnJvbUJhckNvZGUiLCJnZXRBd2IiLCJhd2JpbmZvIiwicGFja2FnZSIsIm1zZWFyY2giLCJvbGREb2NJZCIsImRvY0lkIiwidXBkYXRlZFBhY2thZ2VzIiwicGFja2FnZUlkIiwibWFuaWZlc3QiLCJkZWwiLCJkZWNyIiwiZ2V0S2V5cyIsImtleXNDb3VudCIsImtSZXN1bHQiLCJyUmVzdWx0IiwiZGVsZXRlZCIsInJlZGlTZWFyY2giLCJiaW4iLCJwa2ciLCJhY3Rpb24iLCJwYWNrYWdlTm8iLCJhZGRlZCIsInJlbW92ZWQiLCJwa2dJZm5vIiwidXNlcm5hbWUiLCJwa2dpbmZvIiwicHVibGlzaCIsInNlbnQiLCJ1cGRhdGVSZXN1bHQiLCJ1cGRhdGVkIiwiYmFyQ29kZVZhbHVlIiwicGFydHMiLCJzcGxpdCJdLCJtYXBwaW5ncyI6Ijs7Ozs7Ozs7O0FBQUE7O0FBQ0E7Ozs7OztBQUdBLElBQUlBLFFBQVFDLFFBQVEsT0FBUixDQUFaO0FBQ0EsSUFBSUMsU0FBU0QsUUFBUSxlQUFSLENBQWI7QUFDQSxJQUFJRSxTQUFTRixRQUFRLFFBQVIsQ0FBYjtBQUNBLElBQUlHLGNBQWNILFFBQVEscUJBQVIsQ0FBbEI7QUFDQSxJQUFJSSxLQUFLSixRQUFRLElBQVIsQ0FBVDtBQUNBLElBQUlFLFNBQVNGLFFBQVEsUUFBUixDQUFiO0FBQ0EsSUFBSUssY0FBY0wsUUFBUSxxQkFBUixFQUErQk0sY0FBakQ7QUFDQSxJQUFJQyxjQUFjLElBQUlGLFdBQUosRUFBbEI7QUFDQSxJQUFNRyxVQUFVLGdCQUFoQjtBQUNBLElBQU1DLGlCQUFpQixZQUF2QjtBQUNBLElBQUlDLGNBQWNWLFFBQVEsZUFBUixDQUFsQjtBQUNBLElBQU1XLGFBQWEsV0FBbkI7QUFDQSxJQUFNQyxTQUFTLFFBQWY7QUFDQSxJQUFNQyxZQUFZLFdBQWxCO0FBQ0EsSUFBTUMsVUFBVSxVQUFoQjtBQUNBLElBQUlDLGtCQUFrQmYsUUFBUSxtQkFBUixFQUE2QmUsZUFBbkQ7QUFDQSxJQUFJQyxrQkFBa0IsSUFBSUQsZUFBSixFQUF0QjtBQUNBLElBQU1FLGFBQWE7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O0FBQzVDLE1BQUlDLFFBQVFELGFBQWFFLEtBQWIsQ0FBbUIsR0FBbkIsQ0FBWjtBQUNBLE1BQUlELE1BQU0xRixNQUFOLElBQWdCLENBQXBCLEVBQ0UsSUFBSSxPQUFPMEYsTUFBTSxDQUFOLENBQVAsSUFBbUIsV0FBdkIsRUFDQSxPQUFPQSxNQUFNLENBQU4sRUFBUzlELElBQVQsRUFBUDtBQUNGLFNBQU8sRUFBUDtBQUNEIiwiZmlsZSI6IlJlZGlzU2VydmljZXMvUGFja2FnZVNlcnZpY2UuanMiLCJzb3VyY2VzQ29udGVudCI6WyJpbXBvcnQgeyBjcHVzIH0gZnJvbSBcIm9zXCI7XG5pbXBvcnQgeyBwcm9taXNlcyB9IGZyb20gXCJkbnNcIjtcblxuXG52YXIgcmVkaXMgPSByZXF1aXJlKFwicmVkaXNcIik7XG52YXIgbHJlZGlzID0gcmVxdWlyZShcIi4vcmVkaXMtbG9jYWxcIik7XG52YXIgbW9tZW50ID0gcmVxdWlyZShcIm1vbWVudFwiKTtcbnZhciByZWRpc1NlYXJjaCA9IHJlcXVpcmUoXCIuLi9yZWRpc2VhcmNoY2xpZW50XCIpO1xudmFyIGZzID0gcmVxdWlyZShcImZzXCIpO1xudmFyIG1vbWVudCA9IHJlcXVpcmUoJ21vbWVudCcpXG52YXIgUGFja2FnZVV0aWwgPSByZXF1aXJlKFwiLi4vVXRpbC9wYWNrYWdldXRpbFwiKS5QYWNrYWdlVXRpbGl0eTtcbnZhciBwYWNrYWdlVXRpbCA9IG5ldyBQYWNrYWdlVXRpbCgpO1xuY29uc3QgUEtHX0lEWCA9IFwiaW5kZXg6cGFja2FnZXNcIjtcbmNvbnN0IFBLR19JRF9DT1VOVEVSID0gXCJwYWNrYWdlOmlkXCI7XG52YXIgZGF0YUNvbnRleHQgPSByZXF1aXJlKCcuL2RhdGFDb250ZXh0JylcbmNvbnN0IFBLR19QUkVGSVggPSBcInBhY2thZ2VzOlwiO1xuY29uc3QgQVdCX0lEID0gXCJhd2I6aWRcIlxuY29uc3QgSU5ERVhfQVdCID0gXCJpbmRleDphd2JcIlxuY29uc3QgUkVDX1BLRyA9IFwicGtnOnJlYzpcIlxudmFyIEN1c3RvbWVyU2VydmljZSA9IHJlcXVpcmUoJy4vQ3VzdG9tZXJTZXJ2aWNlJykuQ3VzdG9tZXJTZXJ2aWNlOyBcbnZhciBjdXN0b21lclNlcnZpY2UgPSBuZXcgQ3VzdG9tZXJTZXJ2aWNlKClcbmNvbnN0IFBLR19TVEFUVVMgPSB7IFxuICAxIDogXCJSZWNlaXZlZFwiLFxuICAyOiBcIkxvYWRlZCBvbiBBaXJDcmFmdFwiLFxuICAzOiBcIkluIFRyYW5zaXRcIixcbiAgNDogXCJSZWNpZXZlZCBpbiBOQVNcIixcbiAgNTogXCJSZWFkeSBmb3IgUGlja3VwIC8gRGVsaXZlcnlcIixcbiAgNjogXCJEZWxpdmVyZWRcIlxuXG59OyBcblxuY29uc3QgYXdiSW5kZXggPSByZWRpc1NlYXJjaChyZWRpcywgSU5ERVhfQVdCLCB7XG4gIGNsaWVudE9wdGlvbnM6IGxyZWRpcy5zZWFyY2hDbGllbnREZXRhaWxzXG59KTtcbmNvbnN0IHBhY2thZ2VJbmRleCA9IHJlZGlzU2VhcmNoKHJlZGlzLCBQS0dfSURYLCB7XG4gIGNsaWVudE9wdGlvbnM6IGxyZWRpcy5zZWFyY2hDbGllbnREZXRhaWxzXG59KTtcbmZ1bmN0aW9uIGdldFBhY2thZ2VWb2x1bW5lKG1QYWNrYWdlKXtcblxuICByZXR1cm4gMDsgXG59XG5mdW5jdGlvbiBjcmVhdGVEb2N1bWVudCh0UGFja2FnZSkge1xuICB2YXIgcGFja2FnZURvY3VtZW50ID0ge1xuICAgIGlkOnRQYWNrYWdlLmlkLFxuICAgIHRyYWNraW5nTm86IHRQYWNrYWdlLnRyYWNraW5nTm8sXG4gICAgc2t5Ym94OiB0UGFja2FnZS5za3lib3gsXG4gICAgZGF0ZVJlY2lldmVkIDogbW9tZW50KCkudW5peCgpLCBcbiAgICBhd2I6MCwgXG4gICAgbWlkOjAsXG4gICAgdm9sdW1lOiBnZXRQYWNrYWdlVm9sdW1uZSh0UGFja2FnZSksXG4gICAgd2VpZ2h0OnRQYWNrYWdlLndlaWdodCxcbiAgICBwaWVjZXM6dFBhY2thZ2UucGllY2VzLFxuICAgIGN1c3RvbWVyOiB0UGFja2FnZS5jdXN0b21lcixcbiAgICBzaGlwcGVyOiB0UGFja2FnZS5zaGlwcGVyLFxuICAgIGRlc2NyaXB0aW9uOiB0UGFja2FnZS5kZXNjcmlwdGlvbixcbiAgICBkaW1lbnNpb25zOnRQYWNrYWdlLmRpbWVuc2lvbnMsXG4gICAgY2Fycmllcjp0UGFja2FnZS5jYXJyaWVyLFxuICAgIC8vc2t5Ym94VjogdFBhY2thZ2Uuc2t5Ym94LCBhZGQgZGltZW5pb24gXG4gICAgc3RhdHVzOiB0UGFja2FnZS5zdGF0dXMsXG4gICAgbWlkOiB0UGFja2FnZS5taWQsXG4gICAgdmFsdWU6IHRQYWNrYWdlLnZhbHVlLFxuICAgIFxuICB9O1xuICBjb25zb2xlLmxvZyhcImFib3V0IHRvIGFkZCB0aGUgcGFja2FnZSB0byB0aGUgaW5kZXhcIik7XG4gIHJldHVybiBwYWNrYWdlRG9jdW1lbnQ7XG59XG5mdW5jdGlvbiBzZXRQYWNrYWdlSW5UcmFuc2l0KGtleXMsIG1zZWFyY2hlcikge1xuICByZXR1cm4gbmV3IFByb21pc2UoKHJlc29sdmUsIHJlamVjdCkgPT4ge1xuICAgIHZhciBiYXRjaGVyID0gbXNlYXJjaGVyLmNsaWVudC5iYXRjaCgpO1xuICAgIGtleXMuZm9yRWFjaChlbGVtZW50ID0+IHtcbiAgICAgIHZhciB2YWx1ZSA9IHtcbiAgICAgICAgc3RhdHVzOiAyLFxuICAgICAgICBsb2NhdGlvbjogXCJJbiBUcmFuc2l0XCJcbiAgICAgIH07XG4gICAgICBjb25zb2xlLmxvZyhlbGVtZW50ICsgXCJpcyB0aGUgZWxlbWVudFwiKTtcblxuICAgICAgYmF0Y2hlci5obXNldChQS0dfUFJFRklYICsgZWxlbWVudCwgdmFsdWUpO1xuICAgIH0pO1xuICAgIGJhdGNoZXIuZXhlYygoZXJyLCByZXN1bHQpID0+IHtcbiAgICAgIGNvbnNvbGUubG9nKHJlc3VsdCk7XG4gICAgICAvL3JlYWRkIHRoZSBkb2N1bWVudHMgaGVyZVxuICAgICAga2V5cy5mb3JFYWNoKGVsZW1lbnQgPT4ge1xuICAgICAgICBhZGRQYWNrYWdlVG9JbmRleChlbGVtZW50LCBtc2VhcmNoZXIpO1xuICAgICAgfSk7XG4gICAgICByZXNvbHZlKHJlc3VsdCk7XG4gICAgfSk7XG4gIH0pO1xufVxuXG5mdW5jdGlvbiBhZGRQYWNrYWdlVG9JbmRleCh0cmFja2luZ05vLCBtc2VhcmNoZXIpIHtcbiAgbHJlZGlzLmdldFBhY2thZ2UodHJhY2tpbmdObykudGhlbihwYWNrID0+IHtcbiAgICBtc2VhcmNoZXIuZGVsRG9jdW1lbnQoUEtHX0lEWCwgYCR7cGFjay5taWR9LSR7dHJhY2tpbmdOb31gLCAoZXJyLCBkb25lKSA9PiB7XG4gICAgICB2YXIgZG9jdW1lbnQgPSBjcmVhdGVEb2N1bWVudChwYWNrKTtcbiAgICAgIGNvbnNvbGUubG9nKFwicmVhZGRpbmcgcGFja2FnZSB0byB0aGUgaW5kZXggbGlrZSBhIGJvc3MgXCIgKyB0cmFja2luZ05vKTtcbiAgICAgIG1zZWFyY2hlci5hZGQocGFjay5taWQgKyBcIi1cIiArIHBhY2sudHJhY2tpbmdObywgZG9jdW1lbnQpO1xuICAgIH0pO1xuICB9KTtcbn1cbmV4cG9ydCBjbGFzcyBQYWNrYWdlU2VydmljZSB7XG4gIGNvbnN0cnVjdG9yKCkge1xuICAgIHRoaXMuc2V0dXBJbmRleCgpO1xuICB9XG4gIHNldHVwSW5kZXgoKSB7XG4gICAgdGhpcy5teVNlYXJjaCA9IHJlZGlzU2VhcmNoKHJlZGlzLCBQS0dfSURYLCB7XG4gICAgICBjbGllbnRPcHRpb25zOiBscmVkaXMuc2VhcmNoQ2xpZW50RGV0YWlsc1xuICAgIH0pO1xuICB9XG4gIGdldE5ld0F3Yigpe1xuICAgIHJldHVybiBuZXcgUHJvbWlzZSgocmVzb2x2ZSxyZWplY3QpPT57XG4gICAgICBkYXRhQ29udGV4dC5yZWRpc0NsaWVudC5leGlzdHMoQVdCX0lELChlcnIscmVzdWx0KT0+e1xuICAgICAgICBjb25zb2xlLmxvZyhyZXN1bHQpOyBcbiAgICAgICAgaWYgKHJlc3VsdCAhPSBcIjFcIil7XG4gICAgICAgICAgZGF0YUNvbnRleHQucmVkaXNDbGllbnQuc2V0KEFXQl9JRCA9PSAxMDAwMDAsKGVycixpbml0UmVzdWx0KT0+e1xuICAgICAgICAgICAgZGF0YUNvbnRleHQucmVkaXNDbGllbnQuaW5jcihBV0JfSUQsKGVycixuZXdJZCk9PntcbiAgICAgICAgICAgICAgcmVzb2x2ZSh7YXdiOm5ld0lkfSlcbiAgICAgICAgICAgIH0pXG4gICAgICAgICAgfSlcbiAgICAgICAgfVxuICAgICAgICBlbHNlIHtcbiAgICAgICAgICBkYXRhQ29udGV4dC5yZWRpc0NsaWVudC5pbmNyKEFXQl9JRCwoZXJyLG5ld0lkKT0+e1xuICAgICAgICAgICAgcmVzb2x2ZSh7YXdiOm5ld0lkfSlcbiAgICAgICAgICB9KVxuICAgICAgICB9XG4gICAgICB9KVxuICAgIH0pO1xuICB9XG4gIHNhdmVBd2IoYXdiKXtcbiAgICByZXR1cm4gbmV3IFByb21pc2UoKHJlc29sdmUscmVqZWN0KT0+e1xuICAgICAgY29uc29sZS5sb2coJ3NhdmluZy4uLicsYXdiLG1vbWVudCgpLnRvU3RyaW5nKFwiaGg6bW06c3NcIikpXG4gICAgICBpZiAoYXdiLmlkICE9XCJcIil7XG4gICAgICAgIGF3YkluZGV4LnVwZGF0ZShhd2IuaWQsYXdiLChlcnIxLGF3YlJlcyk9PntcbiAgICAgICAgICBpZiAoZXJyMSl7XG4gICAgICAgICAgICBjb25zb2xlLmxvZygnc2F2aW5nIGVycicsZXJyMSlcbiAgICAgICAgICAgIHJlc29sdmUoe3NhdmVkOmZhbHNlfSlcbiAgICAgICAgICB9XG4gICAgICAgICAgcmVzb2x2ZSh7c2F2ZWQ6dHJ1ZSwgaWQ6YXdiLmlkfSlcbiAgICAgICAgfSlcbiAgICAgIH1cbiAgICAgIGVsc2V7XG4gICAgICBkYXRhQ29udGV4dC5yZWRpc0NsaWVudC5pbmNyKEFXQl9JRCwoZXJyLHJlcGx5KT0+e1xuICAgICAgICBhd2IuaWQgPSByZXBseTsgXG4gICAgICAgIGF3Yi5zdGF0dXMgPSAxOyBcbiAgICAgICAgaWYgKGF3Yi5pbnZvaWNlKXtcbiAgICAgICAgICBhd2IuaGFzRG9jcyA9IDFcbiAgICAgICAgICBjb25zb2xlLmxvZyhcIkhBUyBET0NDQ0NDXCIpXG4gICAgICAgIH1cbiAgICAgICAgZWxzZSB7XG4gICAgICAgICAgYXdiLmhhc0RvY3MgPSAwIDsgXG4gICAgICAgICAgY29uc29sZS5sb2coXCJIQVMgTk8gRE9DQ0NDQ1wiKVxuICAgICAgICB9XG4gICAgICAgIFxuICAgICAgICBhd2IuZGF0ZUNyZWF0ZWQgPSBtb21lbnQoKS51bml4KCk7IFxuICAgICAgICAgIGF3YkluZGV4LmFkZChhd2IuaWQsYXdiLChlcnIxLGF3YlJlcyk9PntcbiAgICAgICAgICAgIGlmIChlcnIxKXtcbiAgICAgICAgICAgICAgY29uc29sZS5sb2coJ3NhdmluZyBlcnInLGVycjEpXG4gICAgICAgICAgICAgIHJlc29sdmUoe3NhdmVkOmZhbHNlfSlcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIHJlc29sdmUoe3NhdmVkOnRydWUsIGlkOnJlcGx5fSlcbiAgICAgICAgICB9KVxuICAgICAgfSlcbiAgICB9XG4gICAgICBcbiAgICAgIFxuICAgIH0pXG4gIH1cbiAgZ2V0QXdiT3ZlcnZpZXcoaWQpe1xuICAgIC8vIGdldCB0aGUgYXdiIHBhY2thZ2VzIGFuZCBhZGQgZXZlcnl0aGluZyBpbiBcbiAgICByZXR1cm4gbmV3IFByb21pc2UoKHJlc29sdmUscmVqZWN0KT0+e1xuICAgICAgcGFja2FnZUluZGV4LnNlYXJjaChgQGF3YjpbJHtpZH0gJHtpZH1dYCx7bnVtYmVyT2ZSZXN1bHRzOjUwMDAsb2Zmc2V0OjB9LChlcnIscGFja2FnZXMpPT57XG4gICAgICAgIHZhciB3ZWlnaHQgPSAwIDsgXG4gICAgICAgIHZhciBwaWVjZXMgPSBwYWNrYWdlcy50b3RhbFJlc3VsdHM7IFxuICAgICAgICB2YXIgZGVzY3JpcHRpb24gPSBcIlwiXG4gICAgICAgIHBhY2thZ2VzLnJlc3VsdHMuZm9yRWFjaChwYWNrYWdlMSA9PiB7XG4gICAgICAgICAgaWYgKGRlc2NyaXB0aW9uID09XCJcIilcbiAgICAgICAgICAgIGRlc2NyaXB0aW9uID0gcGFja2FnZTEuZG9jLmRlc2NyaXB0aW9uOyBcbiAgICAgICAgICB3ZWlnaHQgKz0gTnVtYmVyKHBhY2thZ2UxLmRvYy53ZWlnaHQpXG4gICAgICAgIH0pO1xuICAgICAgICB2YXIgZGF0YSAgPSB7d2VpZ2h0OndlaWdodCxkZXNjcmlwdGlvbjpkZXNjcmlwdGlvbixwaWVjZXM6cGllY2VzfVxuICAgICAgICBjb25zb2xlLmxvZyhkYXRhLFwiQVdCIERFVEFJTFNcIik7IFxuICAgICAgICByZXNvbHZlKCBkYXRhKVxuICAgICAgfSlcbiAgICB9KVxuICAgXG4gIH1cbiAgZ2V0QXdiRGV0YWlscyhpZCl7XG4gICAgdmFyIHNydiA9IHRoaXM7IFxuICAgIHJldHVybiBuZXcgUHJvbWlzZSgocmVzb2x2ZSxyZWplY3QpPT57XG4gICAgICBjb25zb2xlLmxvZyhgQGF3YjpbJHtpZH0gJHtpZH1dYClcbiAgICAgXG4gICAgICBwYWNrYWdlSW5kZXguc2VhcmNoKGBAYXdiOlske2lkfSAke2lkfV1gLHtudW1iZXJPZlJlc3VsdHM6NTAwMCxvZmZzZXQ6MH0sKGVycixwYWNrYWdlcyk9PntcbiAgICAgICAgaWYgKGVycilcbiAgICAgICAgIGNvbnNvbGUubG9nKGVycilcbiAgICAgIFxuICAgICAgICB2YXIgIHBhY2thZ2VsaXN0ICA9IFtdXG4gICAgICAgIHZhciBjb3VudCA9IDE7IFxuICAgICAgICBwYWNrYWdlcy5yZXN1bHRzLmZvckVhY2gocGFja2FnZTEgPT4ge1xuXG4gICAgICAgICAgaWYgKHBhY2thZ2UxLmRvYy50cmFja2luZ05vLmxlbmd0aCA+IDcpe1xuICAgICAgICAgICAgLy9vbmx5IGRpc3BsYXkgdGhlIGxhc3QgNyBcbiAgICAgICAgICAgIHBhY2thZ2UxLmRvYy50cmFja2luZ05vID0gcGFja2FnZTEuZG9jLnRyYWNraW5nTm8uc3Vic3RyaW5nKHBhY2thZ2UxLmRvYy50cmFja2luZ05vLmxlbmd0aCAtNylcbiAgICAgICAgICAgIFxuICAgICAgICAgIH1cbiAgICAgICAgICBwYWNrYWdlMS5kb2MucGFja2FnZUluZGV4ID0gY291bnQ7XG4gICAgICAgICAgY291bnQgKys7IFxuICAgICAgICAgIHBhY2thZ2VsaXN0LnB1c2goIHBhY2thZ2UxLmRvYylcbiAgICAgICAgfSk7XG4gICAgICAgXG4gICAgICAgXG4gICAgICAgIHJlc29sdmUoIHBhY2thZ2VsaXN0KVxuICAgICAgfSlcbiAgICB9KVxuICB9XG4gIGxpc3ROb0RvY3NGbGwoKXtcbiAgICByZXR1cm4gbmV3IFByb21pc2UoKHJlc29sdmUscmVqZWN0KT0+e1xuICAgICAgIGF3YkluZGV4LnNlYXJjaChcIkBzdGF0dXM6WzEgMV0gQGhhc0RvY3M6WzAgMF1cIix7b2Zmc2V0OjAsbnVtYmVyT2ZSZXN1bHRzOjUwMDAsc29ydEJ5OidpZCd9LChlcnIsYXdicyk9PntcbiAgICAgICAgIHZhciBhd2JMaXN0ID0gW107IFxuICAgICAgICAgUHJvbWlzZS5hbGwoYXdicy5yZXN1bHRzLm1hcChhd2I9PmN1c3RvbWVyU2VydmljZS5nZXRDdXN0b21lcihhd2IuZG9jLmN1c3RvbWVySWQpKSkudGhlbihjdXN0b21lcnM9PntcbiAgICAgICAgICAgUHJvbWlzZS5hbGwoYXdicy5yZXN1bHRzLm1hcChhd2I9PnRoaXMuZ2V0QXdiT3ZlcnZpZXcoYXdiLmRvYy5pZCkpKS50aGVuKGRldGFpbHM9PntcbiAgICAgICAgICAgIGNvbnNvbGUubG9nKFwiZ290IHRoZSBjdXN0b21lcnNcIixjdXN0b21lcnMsIGF3YnMpXG4gICAgICAgICAgICBmb3IodmFyIGkgPTAgOyBpIDwgYXdicy5yZXN1bHRzLmxlbmd0aCA7IGkrKyApe1xuICAgICAgICAgICAgICB2YXIgYXdiID0gYXdicy5yZXN1bHRzW2ldOyBcbiAgICAgICAgICAgICAgYXdiLmRvYy5kYXRlQ3JlYXRlZCA9IG1vbWVudC51bml4KGF3Yi5kb2MuZGF0ZUNyZWF0ZWQpLmZvcm1hdChcIllZWVktTU0tREQgaGg6bW0gQVwiKVxuICAgICAgICAgICAgICAvL3dlIG5lZWQgdG8gZ2V0IHRoZSBjdXN0b21lciBcbiAgICAgICAgICAgICAgYXdiLmRvYy5jb25zaWduZWUgPSBjdXN0b21lcnNbaV0ubmFtZTsgXG4gICAgICAgICAgICAgIGF3Yi5kb2Mud2VpZ2h0ID0gZGV0YWlsc1tpXS53ZWlnaHQ7IFxuICAgICAgICAgICAgICBhd2IuZG9jLnBtYiA9IGN1c3RvbWVyc1tpXS5wbWI7IFxuICAgICAgICAgICAgICBhd2IuZG9jLmRlc2NyaXB0aW9uID0gZGV0YWlsc1tpXS5kZXNjcmlwdGlvbjsgXG4gICAgICAgICAgICAgIGF3Yi5kb2MucGllY2VzID0gZGV0YWlsc1tpXS5waWVjZXM7IFxuICAgICAgICAgICAgICBpZiAoY3VzdG9tZXJzW2ldLnBtYiA9PSAnJyl7XG4gICAgICAgICAgICAgICAgYXdiLmRvYy5wbWIgPSAnOTAwMCdcbiAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICBjb25zb2xlLmxvZygncHVzaGluZyAnLGF3YilcbiAgICAgICAgICAgICAgLy93ZSBuZWVkIHRvIGdldCBhbGwgdGhlIHBhY2thZ2VzIFxuICAgICAgICAgICAgICBhd2JMaXN0LnB1c2goYXdiLmRvYylcbiAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgcmVzb2x2ZSh7YXdiczphd2JMaXN0fSlcbiAgICAgICAgICAgfSlcbiAgICAgICAgICBcbiAgICAgICAgICB9KS5jYXRjaChlcnI9PntcbiAgICAgICAgICAgIGNvbnNvbGUubG9nKGVycik7IFxuICAgICAgICAgIH0pXG4gICAgICAgICBcbiAgICAgICAgLy8gIGF3YnMucmVzdWx0cy5mb3JFYWNoKGF3YiA9PiB7XG4gICAgICAgICAgIFxuICAgICAgICAgIFxuICAgICAgICAvLyAgfSk7XG4gICAgICAgICBcbiAgICAgICB9KVxuICAgIH0pXG4gIH1cblxuICBsaXN0QXdiaW5GbGwoKXtcbiAgICByZXR1cm4gbmV3IFByb21pc2UoKHJlc29sdmUscmVqZWN0KT0+e1xuICAgICAgIGF3YkluZGV4LnNlYXJjaChcIkBzdGF0dXM6WzEgMV0gQGhhc0RvY3M6WzEgMV1cIix7b2Zmc2V0OjAsbnVtYmVyT2ZSZXN1bHRzOjUwMDAsc29ydEJ5OidpZCd9LChlcnIsYXdicyk9PntcbiAgICAgICAgIHZhciBhd2JMaXN0ID0gW107IFxuICAgICAgICAgUHJvbWlzZS5hbGwoYXdicy5yZXN1bHRzLm1hcChhd2I9PmN1c3RvbWVyU2VydmljZS5nZXRDdXN0b21lcihhd2IuZG9jLmN1c3RvbWVySWQpKSkudGhlbihjdXN0b21lcnM9PntcbiAgICAgICAgICAgUHJvbWlzZS5hbGwoYXdicy5yZXN1bHRzLm1hcChhd2I9PnRoaXMuZ2V0QXdiT3ZlcnZpZXcoYXdiLmRvYy5pZCkpKS50aGVuKGRldGFpbHM9PntcbiAgICAgICAgICAgIGNvbnNvbGUubG9nKFwiZ290IHRoZSBjdXN0b21lcnNcIixjdXN0b21lcnMsIGF3YnMpXG4gICAgICAgICAgICBmb3IodmFyIGkgPTAgOyBpIDwgYXdicy5yZXN1bHRzLmxlbmd0aCA7IGkrKyApe1xuICAgICAgICAgICAgICB2YXIgYXdiID0gYXdicy5yZXN1bHRzW2ldOyBcbiAgICAgICAgICAgICAgYXdiLmRvYy5kYXRlQ3JlYXRlZCA9IG1vbWVudC51bml4KGF3Yi5kb2MuZGF0ZUNyZWF0ZWQpLmZvcm1hdChcIllZWVktTU0tREQgaGg6bW0gQVwiKVxuICAgICAgICAgICAgICAvL3dlIG5lZWQgdG8gZ2V0IHRoZSBjdXN0b21lciBcbiAgICAgICAgICAgICAgYXdiLmRvYy5jb25zaWduZWUgPSBjdXN0b21lcnNbaV0ubmFtZTsgXG4gICAgICAgICAgICAgIGF3Yi5kb2MucG1iID0gY3VzdG9tZXJzW2ldLnBtYjsgXG4gICAgICAgICAgICAgIGF3Yi5kb2Mud2VpZ2h0ID0gZGV0YWlsc1tpXS53ZWlnaHQ7IFxuICAgICAgICAgICAgICBhd2IuZG9jLmRlc2NyaXB0aW9uID0gZGV0YWlsc1tpXS5kZXNjcmlwdGlvbjsgXG4gICAgICAgICAgICAgIGF3Yi5kb2MucGllY2VzID0gZGV0YWlsc1tpXS5waWVjZXM7IFxuICAgICAgICAgICAgICBpZiAoY3VzdG9tZXJzW2ldLnBtYiA9PSAnJyl7XG4gICAgICAgICAgICAgICAgYXdiLmRvYy5wbWIgPSAnOTAwMCdcbiAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICBjb25zb2xlLmxvZygncHVzaGluZyAnLGF3YilcbiAgICAgICAgICAgICAgLy93ZSBuZWVkIHRvIGdldCBhbGwgdGhlIHBhY2thZ2VzIFxuICAgICAgICAgICAgICBhd2JMaXN0LnB1c2goYXdiLmRvYylcbiAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgcmVzb2x2ZSh7YXdiczphd2JMaXN0fSlcbiAgICAgICAgICAgfSlcbiAgICAgICAgICBcbiAgICAgICAgICB9KS5jYXRjaChlcnI9PntcbiAgICAgICAgICAgIGNvbnNvbGUubG9nKGVycik7IFxuICAgICAgICAgIH0pXG4gICAgICAgICBcbiAgICAgICAgLy8gIGF3YnMucmVzdWx0cy5mb3JFYWNoKGF3YiA9PiB7XG4gICAgICAgICAgIFxuICAgICAgICAgIFxuICAgICAgICAvLyAgfSk7XG4gICAgICAgICBcbiAgICAgICB9KVxuICAgIH0pXG4gIH1cbiAgZ2V0QXdiKGlkKXtcbiAgICBjb25zdCBzcnYgPSB0aGlzOyBcbiAgICByZXR1cm4gbmV3IFByb21pc2UoKHJlc29sdmUscmVqZWN0KT0+e1xuICAgICAgYXdiSW5kZXguZ2V0RG9jKGlkLChlcnIsYXdiKT0+e1xuICAgICAgICAvL2dldCB0aGUgY3VzdG9tZXIgXG4gICAgICAgIGN1c3RvbWVyU2VydmljZS5nZXRDdXN0b21lcihhd2IuZG9jLmN1c3RvbWVySWQpLnRoZW4oY3VzdG9tZXI9PntcbiAgICAgICAgICBhd2IuZG9jLmN1c3RvbWVyID0gY3VzdG9tZXI7IFxuICAgICAgICAgIHNydi5nZXRBd2JEZXRhaWxzKGlkKS50aGVuKHBhY2thZ2VzPT57XG4gICAgICAgICAgICAvL2dldCB0aGUgcGFja2FnZXMgZm9yIHRoZSBhd2IgXG4gICAgICAgICAgICBhd2IuZG9jLnBhY2thZ2VzID0gcGFja2FnZXM7IFxuICAgICAgICAgICAgcmVzb2x2ZSh7YXdiOmF3Yi5kb2N9KSAgXG4gICAgICAgICAgfSlcbiAgICAgICAgICBcbiAgICAgICAgfSlcbiAgICAgICAgXG4gICAgICB9KVxuICAgIH0pXG4gIH1cbiAgdXBkYXRlTG9jYXRpb24odHJhY2tpbmdOdW1iZXIsbG9jYXRpb25faWQpe1xuICAgIHJldHVybiBuZXcgUHJvbWlzZSgocmVzb2x2ZSxyZWplY3QpPT57XG4gICAgICBwYWNrYWdlSW5kZXguc2VhcmNoKFwiQHRyYWNraW5nTm86XCIrdHJhY2tpbmdOdW1iZXIse2xvY2F0aW9uOmxvY2F0aW9uX2lkfSwoZXJyLHBhY2thZ2VSZXN1bHQpPT57XG5cbiAgICAgIH0pXG4gICAgfSlcbiAgfVxuICBzYXZlUGFja2FnZVRvQXdiKG5ld1BhY2thZ2Upe1xuICAgIHJldHVybiBuZXcgUHJvbWlzZSgocmVzb2x2ZSxyZXN1bHQpPT57XG4gICAgICBkYXRhQ29udGV4dC5yZWRpc0NsaWVudC5pbmNyKFBLR19JRF9DT1VOVEVSLChlcnIsaWQpPT57XG4gICAgICAgIG5ld1BhY2thZ2UuaWQgPSBpZDsgXG4gICAgICAgIHBhY2thZ2VJbmRleC5hZGQoaWQsbmV3UGFja2FnZSwoZXJyLHJlc3VsdCk9PntcbiAgICAgICAgICBpZiAoZXJyKVxuICAgICAgICAgICAgY29uc29sZS5sb2coZXJyKTsgXG4gICAgICAgICAgcmVzb2x2ZSh7c2F2ZWQ6dHJ1ZSxpZDppZH0pXG4gICAgICAgIH0pXG4gICAgICB9KVxuICAgIH0pXG4gIH1cbiAgc2F2ZVBhY2thZ2UoYm9keSl7XG4gICAgcmV0dXJuIG5ldyBQcm9taXNlKChyZXNvbHZlLHJlamVjdCk9PntcbiAgICAgIHZhciBjUGFja2FnZSA9IHtcbiAgICAgICAgXG4gICAgICAgIHNreWJveDogYm9keS5za3lib3gsXG4gICAgICAgIGN1c3RvbWVyOiBib2R5LmN1c3RvbWVyLnJlcGxhY2UoXCItXCIsIFwiXCIpLnRyaW0oKSxcbiAgICAgICAgdHJhY2tpbmdObzogYm9keS50cmFja2luZyxcbiAgICAgICAgZGVzY3JpcHRpb246IGJvZHkuZGVzY3JpcHRpb24sXG4gICAgICAgIHNoaXBwZXI6IGJvZHkuc2hpcHBlcixcbiAgICAgICAgY2Fycmllcjpib2R5LmNhcnJpZXIsXG4gICAgICAgIHZhbHVlOiBOdW1iZXIoYm9keS52YWx1ZSksXG4gICAgICAgIHBpZWNlczogTnVtYmVyKGJvZHkucGllY2VzKSxcbiAgICAgICAgd2VpZ2h0OiBOdW1iZXIoYm9keS53ZWlnaHQpLFxuICAgICAgICBkaW1lbnNpb25zOiBib2R5LmRpbWVuc2lvbnMsXG4gICAgICAgIHN0YXR1czogMSxcbiAgICAgICAgbG9jYXRpb246IFwiRkxMXCIsXG4gICAgICAgIG1pZDogMCxcbiAgICAgICAgYXdiOjAsXG4gICAgICAgIC8vaGFzT3B0OiB0cnVlLFxuICAgICAgICAvL210eXBlOiBib2R5Lm10eXBlXG4gICAgICB9O1xuICAgICAgLy92YWxpZGF0ZSB0aGUgcGFja2FnZSBcbiAgICAgIGRhdGFDb250ZXh0LnJlZGlzQ2xpZW50LmluY3IoUEtHX0lEX0NPVU5URVIsKGVycixpZCk9PntcbiAgICAgICAgY1BhY2thZ2UuaWQgPSBpZDsgXG4gICAgICAgIGRhdGFDb250ZXh0LnJlZGlzQ2xpZW50LnNldChQS0dfUFJFRklYK2lkLGNQYWNrYWdlLChlcnIscmVzcG9uc2UpPT57XG4gICAgICAgICAgaWYgKGVycil7XG4gICAgICAgICAgICByZWplY3Qoe3NhdmVkOmZhbHNlLGVycjplcnJ9KVxuICAgICAgICAgIH1cbiAgICAgICAgICAgdmFyIGluZGV4UGFja2FnZSA9ICBjcmVhdGVEb2N1bWVudChjUGFja2FnZSk7IFxuICAgICAgICAgICBjb25zb2xlLmxvZyhpbmRleFBhY2thZ2UpOyBcbiAgICAgICAgICAgcGFja2FnZUluZGV4LmFkZChjUGFja2FnZS5pZCxpbmRleFBhY2thZ2UsKGVycjEsZG9jUmVzdWx0KT0+e1xuICAgICAgICAgICAgIGNvbnNvbGUubG9nKGRvY1Jlc3VsdCk7IFxuICAgICAgICAgICAgIGlmKGVycjEpe1xuICAgICAgICAgICAgICAgcmVqZWN0KHtzYXZlZDpmYWxzZSxlcnI6ZXJyMX0pXG4gICAgICAgICAgICAgfVxuICAgICAgICAgICAgIHJlc29sdmUoe3NhdmVkOnRydWV9KVxuICAgICAgICAgICB9KVxuXG4gICAgICAgIH0pXG4gICAgICB9KTtcbiAgICBcblxuXG4gICAgfSlcbiAgfVxuICBzYXZlUGFja2FnZU9sZChib2R5KSB7XG4gICAgXG4gICAgdmFyIHNlYXJjaGVyID0gdGhpcy5teVNlYXJjaDsgXG4gICAgcmV0dXJuIG5ldyBQcm9taXNlKChyZXNvbHZlLCByZWplY3QpID0+IHtcbiAgICAgIHZhciBjUGFja2FnZSA9IHtcbiAgICAgICAgc2t5Ym94OiBib2R5LnNreWJveCxcbiAgICAgICAgY3VzdG9tZXI6IGJvZHkuY3VzdG9tZXIucmVwbGFjZShcIi1cIiwgXCJcIikudHJpbSgpLFxuICAgICAgICB0cmFja2luZ05vOiBib2R5LnRyYWNraW5nLFxuICAgICAgICBkdXR5UGVyY2VudDogMC4yLFxuICAgICAgICBkZXNjcmlwdGlvbjogYm9keS5kZXNjcmlwdGlvbixcbiAgICAgICAgc2hpcHBlcjogYm9keS5zaGlwcGVyLFxuICAgICAgICB2YWx1ZTogTnVtYmVyKGJvZHkudmFsdWUpLFxuICAgICAgICBwaWVjZXM6IE51bWJlcihib2R5LnBpZWNlcyksXG4gICAgICAgIHdlaWdodDogTnVtYmVyKGJvZHkud2VpZ2h0KSxcbiAgICAgICAgc3RhdHVzOiAxLFxuICAgICAgICBsb2NhdGlvbjogXCJGTExcIixcbiAgICAgICAgbWlkOiBib2R5Lm1pZCxcbiAgICAgICAgaGFzT3B0OiB0cnVlLFxuICAgICAgICAvL210eXBlOiBib2R5Lm10eXBlXG4gICAgICB9O1xuICAgICAgY29uc29sZS5sb2coXCJhYm91dCB0byBzYXZlIHRoZSBwYWNrYWdlXCIpO1xuICAgICAgaWYgKHR5cGVvZiBjUGFja2FnZS5zaGlwcGVyID09PSBcInVuZGVmaW5lZFwiKSBjUGFja2FnZS5zaGlwcGVyID0gXCJcIjtcbiAgICAgIGlmICh0eXBlb2YgY1BhY2thZ2UuZGVzY3JpcHRpb24gPT09IFwidW5kZWZpbmVkXCIpXG4gICAgICAgIGNQYWNrYWdlLmRlc2NyaXB0aW9uID0gXCJcIjtcbiAgICAgIGNvbnNvbGUubG9nKGJvZHkpO1xuICAgICAgLy8gaWYgKE51bWJlcihib2R5LmlzQnVzaW5lc3MpID09IDEpIHtcbiAgICAgIC8vICAgY1BhY2thZ2UuaGFzT3B0ID0gZmFsc2U7XG4gICAgICAvLyB9XG4gICAgICAvL2NQYWNrYWdlID0gcGFja2FnZVV0aWwuY2FsY3VsYXRlRmVlcyhjUGFja2FnZSk7XG4gICAgICBjb25zb2xlLmxvZyhcInBhY2thZ2Ugd2l0aCBmZWVzXCIpO1xuXG4gICAgICAvL3dlIGFsc28gd2FudCB0byBjYWxjdWxhdGUgdGhlIHRoZSBwYWNrYWdlIGZlZXMgb25lIHRpbWUuLi4uLi5cbiAgICAgIC8vd2UgaGF2ZSB0aGUgcGFja2FnZSBkZXRhaWxzIGhlcmUgLi4gbm93IHdlIG5lZWQgdG8gZ2V0IHRoZSBleGlzdGluZyBwYWNrYWdlXG5cbiAgICAgXG4gICAgICAvL3dlIG5lZWQgdG8gY2hlY2sgdG8gc2VlIG9mIHRoZSBvd25lciBpcyBhIGJ1c2luZXNzIGhlcmVcbiAgICAgIGNvbnNvbGUubG9nKFwiaGVyZSBhYm91dCB0byBnZXQgdGhlIHBhY2thZ2VcIilcbiAgICAgIGxyZWRpcy5nZXRQYWNrYWdlKGNQYWNrYWdlLnRyYWNraW5nTm8pLnRoZW4ocCA9PiB7XG4gICAgICAgIGNvbnNvbGUubG9nKCdwIGlzIHRoZSAnLHApOyBcbiAgICAgICAgaWYgKHApIHtcbiAgICAgICAgICB2YXIgY3VycmVudENvbnRhaW5lciA9IGBtYW5pZmVzdDoke3AubWlkfToke3AubXR5cGV9OiR7Y29udGFpbmVyfTpgO1xuICAgICAgICAgIGNvbnNvbGUubG9nKFwiZm91bmQgcGFja2FnZSBcIik7XG4gICAgICAgICAgY29uc29sZS5sb2cocCk7XG4gICAgICAgICAgaWYgKGNvbnRhaW5lciA9PSBcImJhZ1wiKSB7XG4gICAgICAgICAgICAvL2NoZWNrIHRvIHNlZSBpZiB0aGUgYmFjayBubyBpcyB0aGUgc2FtZS5cbiAgICAgICAgICAgIGlmIChwLmJhZyAhPSBjUGFja2FnZS5iYWcpIHtcbiAgICAgICAgICAgICAgLy9yZW1vdmUgaXQgZnJvbSB0aGUgb3JpZ2luYWwgbGlzdFxuICAgICAgICAgICAgICBscmVkaXMuc3JlbShjdXJyZW50Q29udGFpbmVyICsgcC5iYWcsIHAudHJhY2tpbmdObyk7XG4gICAgICAgICAgICAgIGNvbnNvbGUubG9nKFxuICAgICAgICAgICAgICAgIFwicmVtb3ZlIHBhY2thZ2UgZnJvbSBjdXJyZW50IHNldCBcIiArIGN1cnJlbnRDb250YWluZXJcbiAgICAgICAgICAgICAgKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgLy9jaGVjayB0byBzZWUgaWYgdGhlIHNraWQgbnVtYmVyIGlzIHRoZSBzYW1lLlxuICAgICAgICAgICAgaWYgKHAuc2tpZCAhPSBjUGFja2FnZS5za2lkKSB7XG4gICAgICAgICAgICAgIC8vcmVtb3ZlIGl0IGZyb20gdGhlIG9yaWdpbmFsIGxpc3RcbiAgICAgICAgICAgICAgbHJlZGlzLnNyZW0oY3VycmVudENvbnRhaW5lciArIHAuc2tpZCwgcC50cmFja2luZ05vKTtcbiAgICAgICAgICAgICAgY29uc29sZS5sb2coXG4gICAgICAgICAgICAgICAgXCJyZW1vdmUgcGFja2FnZSBmcm9tIGN1cnJlbnQgc2V0IFwiICsgY3VycmVudENvbnRhaW5lclxuICAgICAgICAgICAgICApO1xuICAgICAgICAgICAgfVxuICAgICAgICAgIH1cbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAvLyB0aGUgcGFja2FnZSBkb2Vzbid0IGV4aXN0IHVwZGF0ZSB0aGUgY291bnRlclxuICAgICAgICAgIGxyZWRpcy5jbGllbnQuaW5jcihcIm1jb3VudGVyOlwiICsgY1BhY2thZ2UubWlkKTtcbiAgICAgICAgICBcbiAgICAgICAgfVxuXG4gICAgICAgIGxyZWRpc1xuICAgICAgICAgIC5obXNldChcInBhY2thZ2VzOlwiICsgY1BhY2thZ2UudHJhY2tpbmdObywgY1BhY2thZ2UpXG4gICAgICAgICAgLnRoZW4oZnVuY3Rpb24ocmVzdWx0KSB7XG4gICAgICAgICAgICAvL2FkZCB0byBxdWV1ZSBmb3IgcGVyc2lzdGVudCBwcm9jZXNzaW5nXG4gICAgICAgICAgICBcbiAgICAgICAgICAgIHZhciBtYW5pZmVzdEtleSA9IGBtYW5pZmVzdDoke2NQYWNrYWdlLm1pZH06JHtcbiAgICAgICAgICAgICAgY1BhY2thZ2UubXR5cGVcbiAgICAgICAgICAgIH06JHtjb250YWluZXJ9OiR7Y29udGFpbmVyTm99YDtcbiAgICAgICAgICAgIGNvbnNvbGUubG9nKFwiYWJvdXQgdG8gY3JlYXRlIHRoZSBkb2N1bWVudC4uLi5cIik7XG4gICAgICAgICAgICBhZGRQYWNrYWdlVG9JbmRleChjUGFja2FnZS50cmFja2luZ05vLHNlYXJjaGVyKTsgXG4gICAgICAgICAgICBjb25zb2xlLmxvZyhcImFkZGVkIHRoZSBwYWNrYWdlIHRvIGluZGV4XCIpO1xuICAgICAgICAgICAgbHJlZGlzXG4gICAgICAgICAgICAgIC5zZXRBZGQobWFuaWZlc3RLZXksIGNQYWNrYWdlLnRyYWNraW5nTm8pXG4gICAgICAgICAgICAgIC50aGVuKGZ1bmN0aW9uKHNSZXN1bHQpIHtcbiAgICAgICAgICAgICAgICAvL2dldCB0aGUgbWVtYmVycyBvbmUgdGltZSBoZXJlXG4gICAgICAgICAgICAgICAgY29uc29sZS5sb2coXCJhZGRlZCB0aGUgcGFja2FnZSB0byB0aGUgc2V0XCIpO1xuICAgICAgICAgICAgICAgIGNvbnNvbGUubG9nKG1hbmlmZXN0S2V5KTtcbiAgICAgICAgICAgICAgICBscmVkaXNcbiAgICAgICAgICAgICAgICAgIC5nZXRNZW1iZXJzKG1hbmlmZXN0S2V5KVxuICAgICAgICAgICAgICAgICAgLnRoZW4oZGF0YSA9PiB7XG4gICAgICAgICAgICAgICAgICAgIGNvbnNvbGUubG9nKFwiZGF0YVwiKTtcbiAgICAgICAgICAgICAgICAgICAgY29uc29sZS5sb2coZGF0YSk7XG4gICAgICAgICAgICAgICAgICAgIFByb21pc2UuYWxsKGRhdGEubWFwKGxyZWRpcy5nZXRQYWNrYWdlKSk7XG4gICAgICAgICAgICAgICAgICB9KVxuICAgICAgICAgICAgICAgICAgLnRoZW4oZnVuY3Rpb24ocmRhdGEpIHtcbiAgICAgICAgICAgICAgICAgICAgLy93ZSBuZWVkIHRvIGFsZXJ0IHRoZSBwZXJzb24gdGhhdCB0aGUgcGFja2FnZSBpcyBoZXJlIHNvIHJlYWQgZW1haWwgZXRjLlxuICAgICAgICAgICAgICAgICAgICAvL2FkZCB0byB0aGUgaW5kZXhcbiAgICAgICAgICAgICAgICAgICAgY29uc29sZS5sb2coXCJkYXRhXCIpO1xuICAgICAgICAgICAgICAgICAgICBjb25zb2xlLmxvZyhyZGF0YSk7XG5cbiAgICAgICAgICAgICAgICAgICAgcmVzb2x2ZSh7XG4gICAgICAgICAgICAgICAgICAgICAgc2F2ZWQ6IHRydWUsXG4gICAgICAgICAgICAgICAgICAgICAgcGFja2FnZXM6IHJkYXRhLFxuICAgICAgICAgICAgICAgICAgICAgIHNQYWNrYWdlOiBjUGFja2FnZVxuICAgICAgICAgICAgICAgICAgICB9KTtcbiAgICAgICAgICAgICAgICAgIH0pXG4gICAgICAgICAgICAgICAgICAuY2F0Y2goZXJyMyA9PiB7XG4gICAgICAgICAgICAgICAgICAgIGNvbnNvbGUubG9nKGVycjMpO1xuICAgICAgICAgICAgICAgICAgICByZWplY3Qoe1xuICAgICAgICAgICAgICAgICAgICAgIGVycjogZXJyMyxcbiAgICAgICAgICAgICAgICAgICAgICBzYXZlZDogdHJ1ZSxcbiAgICAgICAgICAgICAgICAgICAgICBsaXN0aW5nOiBmYWxzZVxuICAgICAgICAgICAgICAgICAgICB9KTtcbiAgICAgICAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgICB9KVxuICAgICAgICAgICAgICAuY2F0Y2goZnVuY3Rpb24oZXJyKSB7XG4gICAgICAgICAgICAgICAgcmVzb2x2ZSh7XG4gICAgICAgICAgICAgICAgICBzYXZlZDogZmFsc2VcbiAgICAgICAgICAgICAgICB9KTtcbiAgICAgICAgICAgICAgfSk7XG4gICAgICAgICAgfSlcbiAgICAgICAgICAuY2F0Y2goZnVuY3Rpb24oZXJyMikge1xuICAgICAgICAgICAgcmVqZWN0KHtcbiAgICAgICAgICAgICAgc2F2ZWQ6IGZhbHNlXG4gICAgICAgICAgICB9KTtcbiAgICAgICAgICB9KTtcblxuICAgICAgICAvL3NhdmUgdGhlIHBhY2thZ2UgdG8gdGhlIHBhY2thZ2UgTlNcbiAgICAgIH0pLmNhdGNoKGVycjIzMj0+e1xuICAgICAgICBjb25zb2xlLmxvZyhlcnIyMzIpXG4gICAgICB9KTtcbiAgICB9KTtcbiAgfSBcbiAgZ2V0TWFuaWZlc3RQYWNrYWdlcygpe1xuICAgIHJldHVybiBuZXcgUHJvbWlzZSgocmVzb2x2ZSxyZWplY3QpPT57XG4gICAgICBcbiAgICAgIHRoaXMubXlTZWFyY2guc2VhcmNoKFxuICAgICAgICBgQG1pZDpbMCAwXWAsXG4gICAgICAgIHsgb2Zmc2V0OiAwLCBudW1iZXJPZlJlc3VsdHM6IDUwMDAgfSxcbiAgICAgICAgKGVyciwgZGF0YSkgPT4ge1xuICAgICAgICAgIHZhciBwYWNrYWdlcyA9IFtdO1xuICAgICAgICAgIGNvbnNvbGUubG9nKGRhdGEpO1xuICAgICAgICAgIGRhdGEucmVzdWx0cy5mb3JFYWNoKGVsZW1lbnQgPT4ge1xuXG4gICAgICAgICAgICBwYWNrYWdlcy5wdXNoKGVsZW1lbnQuZG9jKTtcbiAgICAgICAgICAgIHJlc29sdmUocGFja2FnZXMpOyAgICAgICAgICAgICAgICAgXG4gICAgICAgIH0pO1xuICAgIH0pO1xuICAgIH0pXG4gIH1cbiAgZ2V0UmVjZWl2ZWRQYWNrYWdlcyhwYWdlLHBhZ2VTaXplKXtcbiAgICByZXR1cm4gbmV3IFByb21pc2UoKHJlc29sdmUscmVqZWN0KT0+e1xuICAgICAgXG4gICAgICB0aGlzLm15U2VhcmNoLnNlYXJjaChcbiAgICAgICAgYEBtaWQ6WzAgMF1gLFxuICAgICAgICB7IG9mZnNldDogMCwgbnVtYmVyT2ZSZXN1bHRzOiA1MDAwIH0sXG4gICAgICAgIChlcnIsIGRhdGEpID0+IHtcbiAgICAgICAgICB2YXIgcGFja2FnZXMgPSBbXTtcbiAgICAgICAgICBjb25zb2xlLmxvZyhkYXRhKTtcbiAgICAgICAgICBkYXRhLnJlc3VsdHMuZm9yRWFjaChlbGVtZW50ID0+IHtcblxuICAgICAgICAgICAgcGFja2FnZXMucHVzaChlbGVtZW50LmRvYyk7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgXG4gICAgICAgIH0pO1xuICAgICAgICByZXNvbHZlKHBhY2thZ2VzKTsgXG4gICAgfSk7XG4gICAgfSlcbiAgfVxuICBnZXROb0RvY3NQYWNrYWNrYWdlcyhwYWdlLHBhZ2VTaXplKXtcbiAgICByZXR1cm4gbmV3IFByb21pc2UoKHJlc29sdmUscmVqZWN0KT0+e1xuICAgICAgXG4gICAgICB0aGlzLm15U2VhcmNoLnNlYXJjaChcbiAgICAgICAgYEBoYXNEb2NzOlswIDBdYCxcbiAgICAgICAgeyBvZmZzZXQ6IDAsIG51bWJlck9mUmVzdWx0czogNTAwMCB9LFxuICAgICAgICAoZXJyLCBkYXRhKSA9PiB7XG4gICAgICAgICAgdmFyIHBhY2thZ2VzID0gW107XG4gICAgICAgICAgY29uc29sZS5sb2coZGF0YSk7XG4gICAgICAgICAgZGF0YS5yZXN1bHRzLmZvckVhY2goZWxlbWVudCA9PiB7XG5cbiAgICAgICAgICAgIHBhY2thZ2VzLnB1c2goZWxlbWVudC5kb2MpO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIFxuICAgICAgICB9KTtcbiAgICAgICAgcmVzb2x2ZShwYWNrYWdlcyk7IFxuICAgIH0pO1xuICAgIH0pXG4gIH1cbiAgZ2V0UGFja2FnZUJ5SWQoYmFyY29kZSl7XG4gICAgdmFyIHNydiA9IHRoaXM7IFxuICAgIHZhciBwa2dJZCA9IGdldFBhY2thZ2VJZEZyb21CYXJDb2RlKGJhcmNvZGUpOyBcbiAgICByZXR1cm4gbmV3IFByb21pc2UoKHJlc29sdmUscmVqZWN0KT0+e1xuICAgICAgdGhpcy5teVNlYXJjaC5nZXREb2MocGtnSWQsKGVycixkb2N1bWVudCk9PntcbiAgICAgICAgLy9nZXQgdGhlIGF3YiBpbmZvIGhlcmUgYXMgd2VsbCBcbiAgICAgICAgc3J2LmdldEF3Yihkb2N1bWVudC5kb2MuYXdiKS50aGVuKGF3YmluZm89PntcbiAgICAgICAgICBjb25zb2xlLmxvZyhhd2JpbmZvKTsgXG4gICAgICAgICAgdmFyIHJlc3BvbnNlID0geyBcbiAgICAgICAgICAgIGF3YiA6IGF3YmluZm8uYXdiLFxuICAgICAgICAgICAgcGFja2FnZSA6IGRvY3VtZW50LmRvY1xuICAgICAgICAgIH1cbiAgICAgICAgICByZXNvbHZlKHJlc3BvbnNlKTsgXG4gICAgICAgIH0pOyBcbiAgICAgICAgXG4gICAgICB9KVxuICAgIH0pOyBcbiAgfVxuICAvL3VzaW5nIHRoaXMgXG4gIFxuXG4gIHVwZGF0ZU1hbmlmZXN0UGFja2FnZVRvSW5UcmFuc2l0KG1pZCkge1xuICAgIC8vZ2V0IGFsbCB0aGUgcGFja2FnZXNcbiAgICAvL3dlIG5lZWQgdG8gdXBkYXRlIHRoZSBpbmRleCBhdCB0aGlzIHBvaW50IGFzIHdlbGxcbiAgICB2YXIgbXNlYXJjaCA9IHRoaXMubXlTZWFyY2g7XG4gICAgdGhpcy5teVNlYXJjaC5zZWFyY2goXG4gICAgICBgQG1pZDpbJHttaWR9ICR7bWlkfV1gLFxuICAgICAgeyBvZmZzZXQ6IDAsIG51bWJlck9mUmVzdWx0czogNTAwMCB9LFxuICAgICAgKGVyciwgZGF0YSkgPT4ge1xuICAgICAgICB2YXIgcGFja2FnZXMgPSBbXTtcbiAgICAgICAgY29uc29sZS5sb2coZGF0YSk7XG4gICAgICAgIGRhdGEucmVzdWx0cy5mb3JFYWNoKGVsZW1lbnQgPT4ge1xuICAgICAgICAgIHZhciBvbGREb2NJZCA9IGVsZW1lbnQuZG9jSWQ7XG4gICAgICAgICAgZWxlbWVudC5kb2NJZCA9IGVsZW1lbnQuZG9jSWQucmVwbGFjZShgJHttaWR9LWAsIFwiXCIpO1xuICAgICAgICAgIHBhY2thZ2VzLnB1c2goZWxlbWVudC5kb2NJZCk7XG4gICAgICAgICAgLy8gaSBjb3VsZCBkZWxldGUgaGVyZVxuICAgICAgICAgIC8vIG1zZWFyY2guZGVsRG9jdW1lbnQoUEtHX0lEWCxvbGREb2NJZClcbiAgICAgICAgICAvL3VwZGF0ZSBhbGwgdGhlIHBhY2thZ2VzXG4gICAgICAgIH0pO1xuICAgICAgICBzZXRQYWNrYWdlSW5UcmFuc2l0KHBhY2thZ2VzLCBtc2VhcmNoLCBtaWQpLnRoZW4oZnVuY3Rpb24oXG4gICAgICAgICAgdXBkYXRlZFBhY2thZ2VzXG4gICAgICAgICkge1xuICAgICAgICAgIGNvbnNvbGUubG9nKFwidXBkYXRlZCBwYWNrYWdlc1wiKTtcbiAgICAgICAgICBjb25zb2xlLmxvZyh1cGRhdGVkUGFja2FnZXMpO1xuICAgICAgICB9KTtcbiAgICAgIH1cbiAgICApO1xuICB9XG4gIHJlbW92ZVBhY2thZ2VGcm9tTWFuaWZlc3QocGFja2FnZUlkLCBtaWQpIHtcbiAgICB2YXIgbXNlYXJjaCA9IHRoaXMubXlTZWFyY2g7XG4gICAgcmV0dXJuIG5ldyBQcm9taXNlKChyZXNvbHZlLCByZWplY3QpID0+IHtcbiAgICAgIHZhciBtYW5pZmVzdCA9IG1pZDtcbiAgICAgIHZhciBtYW5pZmVzdEtleSA9IFwibWFuaWZlc3Q6XCIgKyBtYW5pZmVzdCArIFwiOipcIjtcblxuICAgICAgbHJlZGlzLmRlbChcInBhY2thZ2VzOlwiICsgdHJhY2tpbmdObykudGhlbihmdW5jdGlvbihyZXN1bHQpIHtcbiAgICAgICAgY29uc29sZS5sb2cocmVzdWx0KTtcbiAgICAgICAgbXNlYXJjaC5kZWxEb2N1bWVudChQS0dfSURYLCBgJHttaWR9LSR7dHJhY2tpbmdOb31gKTtcbiAgICAgICAgLy93ZSBuZWVkIHRvIHJlbW92ZSBmcm9tIHRoZSBpbmRleCBhbmQgZGVjIHRoZSBjb3VudGVyXG4gICAgICAgIGxyZWRpcy5jbGllbnQuZGVjcihcIm1jb3VudGVyOlwiICsgbWlkKTtcbiAgICAgICAgLy9yU2VydmljZXMucGFja2FnZVNlcnZpY2Uucm1QYWNrYWdlKG1pZCwgdHJhY2tpbmdObyk7XG4gICAgICAgIGxyZWRpcy5nZXRLZXlzKG1hbmlmZXN0S2V5KS50aGVuKGtSZXN1bHQgPT4ge1xuICAgICAgICAgIC8vdGhlIGxpc3Qgb2YgYWxsIHRoZSBzZXRzIC4uLndlIG5lZWQgdG8gcmVtb3ZlIHRoZSBrZXkgZnJvbSBlYWNoIG9uZVxuICAgICAgICAgIHZhciBrZXlzQ291bnQgPSAwO1xuXG4gICAgICAgICAga1Jlc3VsdC5mb3JFYWNoKGVsZW1lbnQgPT4ge1xuICAgICAgICAgICAgY29uc29sZS5sb2coXG4gICAgICAgICAgICAgIGByZW1vdmluZyAke3RyYWNraW5nTm99IHBhY2thZ2UgbWFuaWZlc3Qgc2V0ICR7ZWxlbWVudH0gYFxuICAgICAgICAgICAgKTtcbiAgICAgICAgICAgIGxyZWRpcy5zcmVtKGVsZW1lbnQsIHRyYWNraW5nTm8pLnRoZW4oZnVuY3Rpb24oclJlc3VsdCkge1xuICAgICAgICAgICAgICBjb25zb2xlLmxvZyhyUmVzdWx0KTtcbiAgICAgICAgICAgICAgY29uc29sZS5sb2coXCJyZW1vdmVkXCIpO1xuICAgICAgICAgICAgICBpZiAoa2V5c0NvdW50ID09IGtSZXN1bHQubGVuZ3RoIC0gMSkga2V5c0NvdW50Kys7XG4gICAgICAgICAgICB9KTtcbiAgICAgICAgICB9KTtcbiAgICAgICAgICByZXNvbHZlKHtcbiAgICAgICAgICAgIGRlbGV0ZWQ6IHRydWVcbiAgICAgICAgICB9KTtcbiAgICAgICAgfSk7XG5cbiAgICAgICAgLy93ZSBhbHNvIG5lZWQgdG8gcmVtb3ZlIGZyb20gYW55IHNldHNcbiAgICAgIH0pO1xuICAgIH0pO1xuICB9XG4gIHJlbW92ZVBhY2thZ2VCeUlkKGlkKSB7XG4gICAgdmFyIG1zZWFyY2ggPSB0aGlzLm15U2VhcmNoO1xuICAgIHJldHVybiBuZXcgUHJvbWlzZSgocmVzb2x2ZSwgcmVqZWN0KSA9PiB7XG4gICAgXG4gICAgICByZWRpU2VhcmNoLmRlbERvY3VtZW50KFBLR19JRFgsaWQsKGVycixyZXNwb25zZSk9PntcbiAgICAgICAgcmVzb2x2ZSh7ZGVsZXRlZDp0cnVlfSlcbiAgICAgIH0pXG4gICAgICBcbiAgICAgICAgXG4gICAgICBcbiAgICB9KTtcbiAgfVxuICBzdG9yZVBhY2thZ2VGb3JQaWNrdXAodHJhY2tpbmdObyxiaW4pe1xuICAgIHZhciBzZWFyY2hlciA9IHRoaXMubXlTZWFyY2g7XG4gICAgcmV0dXJuIG5ldyBQcm9taXNlKChyZXNvbHZlLHJlamVjdCk9PntcbiAgICAgICBscmVkaXMuaG1zZXQoUEtHX1BSRUZJWCt0cmFja2luZ05vLHtzdGF0dXM6NCxsb2NhdGlvbjpiaW59KS50aGVuKChyZXN1bHQpPT57XG4gICAgICAgICBscmVkaXMuZ2V0UGFja2FnZSh0cmFja2luZ05vKS50aGVuKChwa2cpPT57XG4gICAgICAgICAgYWRkUGFja2FnZVRvSW5kZXgodHJhY2tpbmdObyxzZWFyY2hlcikgOyBcbiAgICAgICAgICByZXNvbHZlKHBrZyk7ICAgXG4gICAgICAgICB9KTtcbiAgICAgICB9KSBcbiAgICB9KTsgXG4gIH1cbiAgdXBkYXRlUGFja2FnZUluZGV4KHRyYWNraW5nKXtcbiAgICAgIHJldHVybiBuZXcgUHJvbWlzZSgocmVzb2x2ZSxyZWplY3QpPT57XG4gICAgICAgICAgdmFyIG1zZWFyY2ggPSB0aGlzLm15U2VhcmNoOyBcbiAgICAgICAgICBhZGRQYWNrYWdlVG9JbmRleCh0cmFja2luZyxtc2VhcmNoKTsgXG4gICAgICAgICByZXNvbHZlKHsndXBkYXRlZCc6dHJ1ZX0pO1xuICAgICAgfSlcbiAgfVxuICBnZXRDdXN0b21lclBhY2thZ2VzKHNreWJveCkge31cbiAgZ2V0TWFuaWZlc3RQYWNrYWdlc0J5U3RhdHVzKG1pZCxzdGF0dXMpIHtcbiAgICAgIHJldHVybiBuZXcgUHJvbWlzZSgocmVzb2x2ZSxyZWplY3QpPT57XG4gICAgICAgICAgY29uc29sZS5sb2coYEBtaWQ6WyR7bWlkfSAke21pZH1dYClcbiAgICAgICAgdGhpcy5teVNlYXJjaC5zZWFyY2goXG4gICAgICAgICAgICBgQG1pZDpbJHttaWR9ICR7bWlkfV1gLFxuICAgICAgICAgICAgeyBvZmZzZXQ6IDAsIG51bWJlck9mUmVzdWx0czogNTAwMCB9LFxuICAgICAgICAgICAgKGVyciwgZGF0YSkgPT4ge1xuICAgICAgICAgICAgICB2YXIgcGFja2FnZXMgPSBbXTtcbiAgICAgICAgICAgICAgY29uc29sZS5sb2coZGF0YSk7XG4gICAgICAgICAgICAgIGRhdGEucmVzdWx0cy5mb3JFYWNoKGVsZW1lbnQgPT4ge1xuXG4gICAgICAgICAgICAgICAgcGFja2FnZXMucHVzaChlbGVtZW50LmRvYyk7XG4gICAgICAgICAgICAgICAgcmVzb2x2ZShwYWNrYWdlcyk7ICAgICAgICAgICAgICAgICBcbiAgICAgICAgICAgIH0pO1xuICAgICAgICB9KTtcbiAgICAgIH0pO1xuICBcbiAgfSAgIFxuICBcbiAgXG5cbiAgIC8vI3JlZ2lvbiBNYW5pZmVzdCBQYWNrYWdlIEZ1bmN0aW9ucyBcblxuICAgYWRkVG9GbGlnaHQoYWN0aW9uKXtcbiAgICByZXR1cm4gbmV3IFByb21pc2UoKHJlc29sdmUscmVqZWN0KT0+e1xuICAgICAgdmFyIHBhY2thZ2VObyA9IGdldFBhY2thZ2VJZEZyb21CYXJDb2RlKGFjdGlvbi5iYXJjb2RlKTsgXG4gICAgICBjb25zb2xlLmxvZyhhY3Rpb24pOyBcbiAgICAgIHRoaXMubXlTZWFyY2gudXBkYXRlKHBhY2thZ2VObyx7bWlkOmFjdGlvbi5taWQgLCBzdGF0dXM6IDIsIGxvY2F0aW9uOlwiTG9hZGVkIG9uIEFpckNyYWZ0XCJ9LChlcnIscmVzdWx0KT0+e1xuICAgICAgICBpZihlcnIpXG4gICAgICAgICAgcmVzb2x2ZSh7YWRkZWQ6ZmFsc2V9KVxuICAgICAgICBcbiAgICAgICAgcmVzb2x2ZSh7YWRkZWQ6dHJ1ZX0pXG4gICAgICB9KVxuICAgICAgICBcbiAgICB9KVxuICAgfVxuICAgLy9yZW1vdmUgZnJvbSBmbGlnaHQgXG4gICByZW1vdmVGcm9tRmxpZ2h0KGFjdGlvbil7XG4gICAgcmV0dXJuIG5ldyBQcm9taXNlKChyZXNvbHZlLHJlamVjdCk9PntcbiAgICAgICAgdmFyIHBhY2thZ2VObyA9IGdldFBhY2thZ2VJZEZyb21CYXJDb2RlKGFjdGlvbi5iYXJjb2RlKTsgICBcbiAgICAgICAgdGhpcy5teVNlYXJjaC51cGRhdGUocGFja2FnZU5vLHttaWQ6YWN0aW9uLm1pZH0sKGVycixyZXN1bHQpPT57XG4gICAgICAgIGlmKGVycilcbiAgICAgICAgICAgIHJlc29sdmUoe3JlbW92ZWQ6ZmFsc2V9KVxuICAgICAgICAgIFxuICAgICAgICAgIHJlc29sdmUoe3JlbW92ZWQ6dHJ1ZX0pXG4gICAgICAgIH0pXG4gICAgfSlcbiAgIH1cbiAgIHJlY0Zyb21UcnVjayh0cmFja2luZ05vKXtcbiAgICAgcmV0dXJuIG5ldyBQcm9taXNlKChyZXNvbHZlLHJlamVjdCk9PntcbiAgICAgXG4gICAgICAgIGRhdGFDb250ZXh0LnJlZGlzQ2xpZW50LnNldChSRUNfUEtHK3RyYWNraW5nTm8sbW9tZW50KCkudW5peCgpLCAoZXJyLHJlc3VsdCk9PntcbiAgICAgICAgICBpZiAoZXJyKSByZXNvbHZlKHtzYXZlZDpmYWxzZX0pXG4gICAgICAgICAgcmVzb2x2ZSh7c2F2ZWQ6dHJ1ZX0pXG4gICAgICAgIH0pXG4gICAgIH0pXG4gICB9XG4gICBwcm9jc3Nlc3NQYWNrYWdlKHBrZ0lmbm8sdXNlcm5hbWUpe1xuICAgICByZXR1cm4gbmV3IFByb21pc2UoKHJlc29sdmUscmVqZWN0KT0+e1xuICAgICAgIGRhdGFDb250ZXh0LnJlZGlzQ2xpZW50Lmhtc2V0KFwiZmVlczphd2I6XCIrcGtnSWZuby5hd2IscGtnaW5mbywoZXJyLHJlc3VsdCk9PntcbiAgICAgICAgIGRhdGFDb250ZXh0LnJlZGlzQ2xpZW50LnB1Ymxpc2goXCJwcmludDpmZWVzOlwiK3VzZXJuYW1lLHBrZ0lmbm8uYXdiKTsgXG4gICAgICAgICByZXNvbHZlKHtzZW50OnRydWV9KVxuICAgICAgIH0pXG4gICAgIH0pXG4gICB9XG4gICByZWNGcm9tUGxhbmVOYXMoYmFyY29kZSl7XG4gICAgIHJldHVybiBuZXcgUHJvbWlzZSgocmVzb2x2ZSxyZWplY3QpPT57XG4gICAgICAgdmFyIHNydiA9IHRoaXMgOyBcbiAgICAgICB2YXIgcGtnSWQgPSBnZXRQYWNrYWdlSWRGcm9tQmFyQ29kZShiYXJjb2RlKTsgXG4gICAgICAgIHNydi5teVNlYXJjaC5nZXREb2MocGtnSWQsKGVycixwa2cpPT57XG4gICAgICAgICAgICBwa2cuZG9jLnN0YXR1cyA9IDQ7IFxuICAgICAgICAgICAgcGtnLmRvYy5sb2NhdGlvbiAgPSBcIldhcmVob3VzZSBOQVNcIjsgXG4gICAgICAgICAgICBzcnYubXlTZWFyY2gudXBkYXRlKHBrZ0lkLHBrZy5kb2MsKGVycix1cGRhdGVSZXN1bHQpPT57XG4gICAgICAgICAgICAgIGlmKGVycilcbiAgICAgICAgICAgICAgICByZWplY3Qoe3VwZGF0ZWQ6ZmFsc2V9KVxuICAgICAgICAgICAgICByZXNvbHZlKHt1cGRhdGVkOnRydWV9KVxuICAgICAgICAgICAgfSlcbiAgICAgICAgfSlcbiAgICAgfSlcbiAgIH1cbiAgIC8vI2VuZHJlZ2lvblxufVxuXG5mdW5jdGlvbiBnZXRQYWNrYWdlSWRGcm9tQmFyQ29kZShiYXJDb2RlVmFsdWUpe1xuICB2YXIgcGFydHMgPSBiYXJDb2RlVmFsdWUuc3BsaXQoXCItXCIpOyBcbiAgaWYgKHBhcnRzLmxlbmd0aCA9PSAzKVxuICAgIGlmICh0eXBlb2YgcGFydHNbMl0gIT0gXCJ1bmRlZmluZWRcIilcbiAgICByZXR1cm4gcGFydHNbMl0udHJpbSgpOyBcbiAgcmV0dXJuIFwiXCJcbn1cbiJdfQ==
