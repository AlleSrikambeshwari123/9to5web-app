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

var emailService = require("../Util/EmailService");
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
var INDEX_SHIPPER = "index:shipper";
redis.addCommand("ft.aggregate");
var awbIndex = redisSearch(redis, INDEX_AWB, {
  clientOptions: lredis.searchClientDetails
});
var packageIndex = redisSearch(redis, PKG_IDX, {
  clientOptions: lredis.searchClientDetails
});
var shipperIndex = redisSearch(redis, INDEX_SHIPPER, {
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
    key: "getShipper",
    value: function getShipper(id) {
      return new Promise(function (resolve, reject) {
        shipperIndex.getDoc(id, function (err, sresult) {
          if (err) resolve(id);

          resolve(sresult.doc);
        });
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
            srv.getShipper(awbinfo.awb.shipper).then(function (shipper) {
              console.log(awbinfo);
              awbinfo.awb.shipper = shipper.name;
              var response = {
                awb: awbinfo.awb,
                package: document.doc
              };
              resolve(response);
            });
          });
        });
      });
    }
  }, {
    key: "updateStoreLocation",
    value: function updateStoreLocation(checkin) {
      var srv = this;
      return new Promise(function (resolve, reject) {
        var id = getPackageIdFromBarCode(checkin.barcode);
        packageIndex.getDoc(id, function (err, pkg) {
          pkg.doc.locationId = checkin.locationId;
          pkg.doc.location = checkin.location;
          pkg.doc.status = 5;
          packageIndex.update(id, pkg, function (err, result) {
            //we need to send the email here for the package 
            srv.getPackageByDocId(id).then(function (info) {
              emailService.sendAtStoreEmail(checkin.location, info);
              resolve({ updated: true });
            });
          });
        });
      });
    }
  }, {
    key: "checkOutToCustomer",
    value: function checkOutToCustomer(barcode, user) {
      var srv = this;
      return new Promise(function (resolve, reject) {
        //we want to check out set the satatus 
        var id = getPackageIdFromBarCode(barcode);
        srv.getPackageByDocId(id).then(function (pkg) {
          console.log(pkg, "THE PKG");
          pkg.package.status = 6; //checked out to customer 
          pkg.package.checkoutBy = user;
          packageIndex.update(pkg.package.id, pkg.package, function (errm, reply) {
            if (errm) {
              console.log(errm);
              resolve({ updated: false });
            }
            resolve({ updated: true });
          });
        });
      });
    }
  }, {
    key: "getPackageByDocId",
    value: function getPackageByDocId(pkgId) {
      var _this7 = this;

      var srv = this;
      return new Promise(function (resolve, reject) {
        _this7.mySearch.getDoc(pkgId, function (err, document) {
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
      var _this8 = this;

      return new Promise(function (resolve, reject) {
        var msearch = _this8.mySearch;
        addPackageToIndex(tracking, msearch);
        resolve({ 'updated': true });
      });
    }
  }, {
    key: "getCustomerPackages",
    value: function getCustomerPackages(skybox) {}

    //no more skybox

  }, {
    key: "getManifestPackagesByStatus",
    value: function getManifestPackagesByStatus(mid, status) {
      var _this9 = this;

      return new Promise(function (resolve, reject) {
        console.log("@mid:[" + mid + " " + mid + "]");
        _this9.mySearch.search("@mid:[" + mid + " " + mid + "]", { offset: 0, numberOfResults: 5000 }, function (err, data) {
          var packages = [];
          console.log(data);
          data.results.forEach(function (element) {

            packages.push(element.doc);
            resolve(packages);
          });
        });
      });
    }

    //#region Pakcage Filters  

  }, {
    key: "getPackagesNasWarehouse",
    value: function getPackagesNasWarehouse(isNoDoc, company) {
      var srv = this;
      return new Promise(function (resolve, reject) {
        packageIndex.search("@status:[4 4] @company:" + company + " @hasDocs:[" + isNoDoc + " " + isNoDoc + "]", {}, function (err, reply) {
          console.log(reply.results);
          Promise.all(reply.results.map(function (pkg) {
            return srv.getPackageByDocId(pkg.docId);
          })).then(function (packages) {
            resolve(packages);
          });
        });
      });
    }

    //#endregion


    //#region Manifest Package Functions 

  }, {
    key: "addToFlight",
    value: function addToFlight(action) {
      var _this10 = this;

      var srv = this;
      return new Promise(function (resolve, reject) {
        var packageNo = getPackageIdFromBarCode(action.barcode);
        console.log(action);
        _this10.mySearch.update(packageNo, { mid: action.mid, status: 2, location: "Loaded on AirCraft", compartment: action.compartment }, function (err, result) {
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
      var _this11 = this;

      return new Promise(function (resolve, reject) {

        _this11.mySearch.aggregate("@mid:[" + mid + " " + mid + "] @compartment:" + compartment, {}, function (err, reply) {
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
      var _this12 = this;

      return new Promise(function (resolve, reject) {
        var packageNo = getPackageIdFromBarCode(action.barcode);
        _this12.mySearch.update(packageNo, { mid: action.mid }, function (err, result) {
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
            emailService.sendNoDocsEmail(pkg);
            if (pkgIfno.refLoc) {
              pkg.package.wloc = pkgIfno.refLoc;

              pkg.package.hasDocs = pkgIfno.hasDocs;
              pkg.package.status = 4;

              //set theompany 
              if (Number(pkg.awb.customer.pmb) > 9000) {
                pkg.package.company = "0";
              } else pkg.package.company = "1";
              console.log('updating with ', pkg.package);

              packageIndex.update(pkg.package.id, pkg.package, function (errResp, response) {

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
      var _this13 = this;

      return new Promise(function (resolve, reject) {
        var srv = _this13;
        var pkgId = getPackageIdFromBarCode(barcode);
        srv.mySearch.getDoc(pkgId, function (err, pkg) {
          pkg.doc.status = 4;
          pkg.doc.location = "Warehouse NAS";
          if (pkg.doc.hasDocs == "undefined") pkg.doc.hasDocs = 0;
          srv.mySearch.update(pkgId, pkg.doc, function (err, updateResult) {

            if (err) {
              console.log(err);
              reject({ updated: false });
            }
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
//# sourceMappingURL=data:application/json;charset=utf8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIlJlZGlzU2VydmljZXMvUGFja2FnZVNlcnZpY2UuZXM2Il0sIm5hbWVzIjpbImVtYWlsU2VydmljZSIsInJlcXVpcmUiLCJyZWRpcyIsImxyZWRpcyIsIm1vbWVudCIsInJlZGlzU2VhcmNoIiwiZnMiLCJQYWNrYWdlVXRpbCIsIlBhY2thZ2VVdGlsaXR5IiwicGFja2FnZVV0aWwiLCJQS0dfSURYIiwiUEtHX0lEX0NPVU5URVIiLCJkYXRhQ29udGV4dCIsIlBLR19QUkVGSVgiLCJBV0JfSUQiLCJJTkRFWF9BV0IiLCJSRUNfUEtHIiwidW5pcUlkIiwiQ3VzdG9tZXJTZXJ2aWNlIiwiY3VzdG9tZXJTZXJ2aWNlIiwiUEtHX1NUQVRVUyIsIklOREVYX1NISVBQRVIiLCJhZGRDb21tYW5kIiwiYXdiSW5kZXgiLCJjbGllbnRPcHRpb25zIiwic2VhcmNoQ2xpZW50RGV0YWlscyIsInBhY2thZ2VJbmRleCIsInNoaXBwZXJJbmRleCIsImdldFBhY2thZ2VWb2x1bW5lIiwibVBhY2thZ2UiLCJjcmVhdGVEb2N1bWVudCIsInRQYWNrYWdlIiwicGFja2FnZURvY3VtZW50IiwiaWQiLCJ0cmFja2luZ05vIiwic2t5Ym94IiwiZGF0ZVJlY2lldmVkIiwidW5peCIsImF3YiIsIm1pZCIsInZvbHVtZSIsIndlaWdodCIsInBpZWNlcyIsImN1c3RvbWVyIiwic2hpcHBlciIsImRlc2NyaXB0aW9uIiwiZGltZW5zaW9ucyIsImNhcnJpZXIiLCJzdGF0dXMiLCJ2YWx1ZSIsImNvbnNvbGUiLCJsb2ciLCJzZXRQYWNrYWdlSW5UcmFuc2l0Iiwia2V5cyIsIm1zZWFyY2hlciIsIlByb21pc2UiLCJyZXNvbHZlIiwicmVqZWN0IiwiYmF0Y2hlciIsImNsaWVudCIsImJhdGNoIiwiZm9yRWFjaCIsImxvY2F0aW9uIiwiZWxlbWVudCIsImhtc2V0IiwiZXhlYyIsImVyciIsInJlc3VsdCIsImFkZFBhY2thZ2VUb0luZGV4IiwiZ2V0UGFja2FnZSIsInRoZW4iLCJkZWxEb2N1bWVudCIsInBhY2siLCJkb25lIiwiZG9jdW1lbnQiLCJhZGQiLCJQYWNrYWdlU2VydmljZSIsInNldHVwSW5kZXgiLCJteVNlYXJjaCIsInJlZGlzQ2xpZW50IiwiZXhpc3RzIiwic2V0IiwiaW5pdFJlc3VsdCIsImluY3IiLCJuZXdJZCIsInRvU3RyaW5nIiwidXBkYXRlZF9ieSIsInVzZXJuYW1lIiwiZGF0ZV91cGRhdGVkIiwidXBkYXRlIiwiZXJyMSIsImF3YlJlcyIsInNhdmVkIiwicmVwbHkiLCJpbnZvaWNlIiwiaGFzRG9jcyIsImNyZWF0ZWRfYnkiLCJkYXRlQ3JlYXRlZCIsInNlYXJjaCIsIm51bWJlck9mUmVzdWx0cyIsIm9mZnNldCIsInBhY2thZ2VzIiwidG90YWxSZXN1bHRzIiwicmVzdWx0cyIsInBhY2thZ2UxIiwiZG9jIiwiTnVtYmVyIiwiZGF0YSIsInNydiIsInBhY2thZ2VsaXN0IiwiY291bnQiLCJsZW5ndGgiLCJzdWJzdHJpbmciLCJwdXNoIiwic29ydEJ5IiwiYXdicyIsImF3Ykxpc3QiLCJhbGwiLCJtYXAiLCJnZXRDdXN0b21lciIsImN1c3RvbWVySWQiLCJnZXRBd2JPdmVydmlldyIsImN1c3RvbWVycyIsImkiLCJmb3JtYXQiLCJjb25zaWduZWUiLCJuYW1lIiwiZGV0YWlscyIsInBtYiIsImNhdGNoIiwiZ2V0RG9jIiwiZ2V0QXdiRGV0YWlscyIsInRyYWNraW5nTnVtYmVyIiwibG9jYXRpb25faWQiLCJwYWNrYWdlUmVzdWx0IiwibmV3UGFja2FnZSIsInNyZXN1bHQiLCJib3hTaXplIiwiYXdiSW5mbyIsImlzU2VkIiwiaW52b2ljZU51bWJlciIsImhhem1hdCIsInNhdmVBd2IiLCJjUGFja2FnZSIsImF3YlJlc3VsdCIsImlzQ29uc29saWRhdGVkIiwic2F2ZVBhY2thZ2VUb0F3YiIsInBrZ0JhdGNoIiwic2FkZCIsInBrZ1Jlc3VsdCIsInBrZyIsImhtZ2V0IiwiZ2V0UGFja2FnZUlkRnJvbUJhckNvZGUiLCJ0b3RhbFdlaWdodCIsImlzTmFOIiwiYm9keSIsInJlcGxhY2UiLCJ0cmltIiwidHJhY2tpbmciLCJyZXNwb25zZSIsImluZGV4UGFja2FnZSIsImRvY1Jlc3VsdCIsInBhZ2UiLCJwYWdlU2l6ZSIsImJhcmNvZGUiLCJwa2dJZCIsImdldEF3YiIsImdldFNoaXBwZXIiLCJhd2JpbmZvIiwicGFja2FnZSIsImNoZWNraW4iLCJsb2NhdGlvbklkIiwiZ2V0UGFja2FnZUJ5RG9jSWQiLCJzZW5kQXRTdG9yZUVtYWlsIiwiaW5mbyIsInVwZGF0ZWQiLCJ1c2VyIiwiY2hlY2tvdXRCeSIsImVycm0iLCJtc2VhcmNoIiwib2xkRG9jSWQiLCJkb2NJZCIsInVwZGF0ZWRQYWNrYWdlcyIsInBhY2thZ2VJZCIsIm1hbmlmZXN0IiwibWFuaWZlc3RLZXkiLCJkZWwiLCJkZWNyIiwiZ2V0S2V5cyIsImtleXNDb3VudCIsImtSZXN1bHQiLCJzcmVtIiwiclJlc3VsdCIsImRlbGV0ZWQiLCJiaW4iLCJzZWFyY2hlciIsImlzTm9Eb2MiLCJjb21wYW55IiwiYWN0aW9uIiwicGFja2FnZU5vIiwiY29tcGFydG1lbnQiLCJhZGRlZCIsImdldEZsaWdodENvbXBhcnRtZW50V2VpZ2h0IiwiZnJlc3VsdCIsImFnZ3JlZ2F0ZSIsInJlbW92ZWQiLCJzaGlwbWVudElkIiwic2hpcG1lbnRDb3VudCIsInNjYXJkIiwiY2FyZCIsInBrZ0NvdW50IiwicGtnSWZubyIsInB1Ymxpc2giLCJnZXRQYWNrYWdlQnlJZCIsInNlbmROb0RvY3NFbWFpbCIsInJlZkxvYyIsIndsb2MiLCJlcnJSZXNwIiwic2VudCIsInVwZGF0ZVJlc3VsdCIsImJhckNvZGVWYWx1ZSIsInBhcnRzIiwic3BsaXQiXSwibWFwcGluZ3MiOiI7Ozs7Ozs7OztBQUFBOztBQUNBOzs7Ozs7QUFFQSxJQUFJQSxlQUFlQyxRQUFRLHNCQUFSLENBQW5CO0FBQ0EsSUFBSUMsUUFBUUQsUUFBUSxPQUFSLENBQVo7QUFDQSxJQUFJRSxTQUFTRixRQUFRLGVBQVIsQ0FBYjtBQUNBLElBQUlHLFNBQVNILFFBQVEsUUFBUixDQUFi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SUQsTUFBTTlHLE1BQU4sSUFBZ0IsQ0FBcEIsRUFDRSxJQUFJLE9BQU84RyxNQUFNLENBQU4sQ0FBUCxJQUFtQixXQUF2QixFQUNBLE9BQU9BLE1BQU0sQ0FBTixFQUFTaEUsSUFBVCxFQUFQO0FBQ0YsU0FBTyxFQUFQO0FBQ0QiLCJmaWxlIjoiUmVkaXNTZXJ2aWNlcy9QYWNrYWdlU2VydmljZS5qcyIsInNvdXJjZXNDb250ZW50IjpbImltcG9ydCB7IGNwdXMgfSBmcm9tIFwib3NcIjtcbmltcG9ydCB7IHByb21pc2VzIH0gZnJvbSBcImRuc1wiO1xuXG52YXIgZW1haWxTZXJ2aWNlID0gcmVxdWlyZShcIi4uL1V0aWwvRW1haWxTZXJ2aWNlXCIpXG52YXIgcmVkaXMgPSByZXF1aXJlKFwicmVkaXNcIik7XG52YXIgbHJlZGlzID0gcmVxdWlyZShcIi4vcmVkaXMtbG9jYWxcIik7XG52YXIgbW9tZW50ID0gcmVxdWlyZShcIm1vbWVudFwiKTtcbnZhciByZWRpc1NlYXJjaCA9IHJlcXVpcmUoXCIuLi9yZWRpc2VhcmNoY2xpZW50XCIpO1xudmFyIGZzID0gcmVxdWlyZShcImZzXCIpO1xudmFyIG1vbWVudCA9IHJlcXVpcmUoJ21vbWVudCcpXG52YXIgUGFja2FnZVV0aWwgPSByZXF1aXJlKFwiLi4vVXRpbC9wYWNrYWdldXRpbFwiKS5QYWNrYWdlVXRpbGl0eTtcbnZhciBwYWNrYWdlVXRpbCA9IG5ldyBQYWNrYWdlVXRpbCgpO1xuY29uc3QgUEtHX0lEWCA9IFwiaW5kZXg6cGFja2FnZXNcIjtcbmNvbnN0IFBLR19JRF9DT1VOVEVSID0gXCJwYWNrYWdlOmlkXCI7XG52YXIgZGF0YUNvbnRleHQgPSByZXF1aXJlKCcuL2RhdGFDb250ZXh0JylcbmNvbnN0IFBLR19QUkVGSVggPSBcInBhY2thZ2VzOlwiO1xuY29uc3QgQVdCX0lEID0gXCJhd2I6aWRcIlxuY29uc3QgSU5ERVhfQVdCID0gXCJpbmRleDphd2JcIlxuY29uc3QgUkVDX1BLRyA9IFwicGtnOnJlYzpcIlxudmFyIHVuaXFJZCA9IHJlcXVpcmUoXCJ1bmlxaWRcIik7IFxudmFyIEN1c3RvbWVyU2VydmljZSA9IHJlcXVpcmUoJy4vQ3VzdG9tZXJTZXJ2aWNlJykuQ3VzdG9tZXJTZXJ2aWNlOyBcbnZhciBjdXN0b21lclNlcnZpY2UgPSBuZXcgQ3VzdG9tZXJTZXJ2aWNlKClcbmNvbnN0IFBLR19TVEFUVVMgPSB7IFxuICAxIDogXCJSZWNlaXZlZFwiLFxuICAyOiBcIkxvYWRlZCBvbiBBaXJDcmFmdFwiLFxuICAzOiBcIkluIFRyYW5zaXRcIixcbiAgNDogXCJSZWNpZXZlZCBpbiBOQVNcIixcbiAgNTogXCJSZWFkeSBmb3IgUGlja3VwIC8gRGVsaXZlcnlcIixcbiAgNjogXCJEZWxpdmVyZWRcIlxuXG59OyBcbmNvbnN0IElOREVYX1NISVBQRVIgPSBcImluZGV4OnNoaXBwZXJcIlxucmVkaXMuYWRkQ29tbWFuZChcImZ0LmFnZ3JlZ2F0ZVwiKVxuY29uc3QgYXdiSW5kZXggPSByZWRpc1NlYXJjaChyZWRpcywgSU5ERVhfQVdCLCB7XG4gIGNsaWVudE9wdGlvbnM6IGxyZWRpcy5zZWFyY2hDbGllbnREZXRhaWxzXG59KTtcbmNvbnN0IHBhY2thZ2VJbmRleCA9IHJlZGlzU2VhcmNoKHJlZGlzLCBQS0dfSURYLCB7XG4gIGNsaWVudE9wdGlvbnM6IGxyZWRpcy5zZWFyY2hDbGllbnREZXRhaWxzXG59KTtcbmNvbnN0IHNoaXBwZXJJbmRleCA9IHJlZGlzU2VhcmNoKHJlZGlzLCBJTkRFWF9TSElQUEVSLCB7XG4gIGNsaWVudE9wdGlvbnM6IGxyZWRpcy5zZWFyY2hDbGllbnREZXRhaWxzXG59KTtcbmZ1bmN0aW9uIGdldFBhY2thZ2VWb2x1bW5lKG1QYWNrYWdlKXtcblxuICByZXR1cm4gMDsgXG59XG5mdW5jdGlvbiBjcmVhdGVEb2N1bWVudCh0UGFja2FnZSkge1xuICB2YXIgcGFja2FnZURvY3VtZW50ID0ge1xuICAgIGlkOnRQYWNrYWdlLmlkLFxuICAgIHRyYWNraW5nTm86IHRQYWNrYWdlLnRyYWNraW5nTm8sXG4gICAgc2t5Ym94OiB0UGFja2FnZS5za3lib3gsXG4gICAgZGF0ZVJlY2lldmVkIDogbW9tZW50KCkudW5peCgpLCBcbiAgICBhd2I6MCwgXG4gICAgbWlkOjAsXG4gICAgdm9sdW1lOiBnZXRQYWNrYWdlVm9sdW1uZSh0UGFja2FnZSksXG4gICAgd2VpZ2h0OnRQYWNrYWdlLndlaWdodCxcbiAgICBwaWVjZXM6dFBhY2thZ2UucGllY2VzLFxuICAgIGN1c3RvbWVyOiB0UGFja2FnZS5jdXN0b21lcixcbiAgICBzaGlwcGVyOiB0UGFja2FnZS5zaGlwcGVyLFxuICAgIGRlc2NyaXB0aW9uOiB0UGFja2FnZS5kZXNjcmlwdGlvbixcbiAgICBkaW1lbnNpb25zOnRQYWNrYWdlLmRpbWVuc2lvbnMsXG4gICAgY2Fycmllcjp0UGFja2FnZS5jYXJyaWVyLFxuICAgIC8vc2t5Ym94VjogdFBhY2thZ2Uuc2t5Ym94LCBhZGQgZGltZW5pb24gXG4gICAgc3RhdHVzOiB0UGFja2FnZS5zdGF0dXMsXG4gICAgbWlkOiB0UGFja2FnZS5taWQsXG4gICAgdmFsdWU6IHRQYWNrYWdlLnZhbHVlLFxuICAgIFxuICB9O1xuICBjb25zb2xlLmxvZyhcImFib3V0IHRvIGFkZCB0aGUgcGFja2FnZSB0byB0aGUgaW5kZXhcIik7XG4gIHJldHVybiBwYWNrYWdlRG9jdW1lbnQ7XG59XG5mdW5jdGlvbiBzZXRQYWNrYWdlSW5UcmFuc2l0KGtleXMsIG1zZWFyY2hlcikge1xuICByZXR1cm4gbmV3IFByb21pc2UoKHJlc29sdmUsIHJlamVjdCkgPT4ge1xuICAgIHZhciBiYXRjaGVyID0gbXNlYXJjaGVyLmNsaWVudC5iYXRjaCgpO1xuICAgIGtleXMuZm9yRWFjaChlbGVtZW50ID0+IHtcbiAgICAgIHZhciB2YWx1ZSA9IHtcbiAgICAgICAgc3RhdHVzOiAyLFxuICAgICAgICBsb2NhdGlvbjogXCJJbiBUcmFuc2l0XCJcbiAgICAgIH07XG4gICAgICBjb25zb2xlLmxvZyhlbGVtZW50ICsgXCJpcyB0aGUgZWxlbWVudFwiKTtcblxuICAgICAgYmF0Y2hlci5obXNldChQS0dfUFJFRklYICsgZWxlbWVudCwgdmFsdWUpO1xuICAgIH0pO1xuICAgIGJhdGNoZXIuZXhlYygoZXJyLCByZXN1bHQpID0+IHtcbiAgICAgIGNvbnNvbGUubG9nKHJlc3VsdCk7XG4gICAgICAvL3JlYWRkIHRoZSBkb2N1bWVudHMgaGVyZVxuICAgICAga2V5cy5mb3JFYWNoKGVsZW1lbnQgPT4ge1xuICAgICAgICBhZGRQYWNrYWdlVG9JbmRleChlbGVtZW50LCBtc2VhcmNoZXIpO1xuICAgICAgfSk7XG4gICAgICByZXNvbHZlKHJlc3VsdCk7XG4gICAgfSk7XG4gIH0pO1xufVxuXG5mdW5jdGlvbiBhZGRQYWNrYWdlVG9JbmRleCh0cmFja2luZ05vLCBtc2VhcmNoZXIpIHtcbiAgbHJlZGlzLmdldFBhY2thZ2UodHJhY2tpbmdObykudGhlbihwYWNrID0+IHtcbiAgICBtc2VhcmNoZXIuZGVsRG9jdW1lbnQoUEtHX0lEWCwgYCR7cGFjay5taWR9LSR7dHJhY2tpbmdOb31gLCAoZXJyLCBkb25lKSA9PiB7XG4gICAgICB2YXIgZG9jdW1lbnQgPSBjcmVhdGVEb2N1bWVudChwYWNrKTtcbiAgICAgIGNvbnNvbGUubG9nKFwicmVhZGRpbmcgcGFja2FnZSB0byB0aGUgaW5kZXggbGlrZSBhIGJvc3MgXCIgKyB0cmFja2luZ05vKTtcbiAgICAgIG1zZWFyY2hlci5hZGQocGFjay5taWQgKyBcIi1cIiArIHBhY2sudHJhY2tpbmdObywgZG9jdW1lbnQpO1xuICAgIH0pO1xuICB9KTtcbn1cbmV4cG9ydCBjbGFzcyBQYWNrYWdlU2VydmljZSB7XG4gIGNvbnN0cnVjdG9yKCkge1xuICAgIHRoaXMuc2V0dXBJbmRleCgpO1xuICB9XG4gIHNldHVwSW5kZXgoKSB7XG4gICAgdGhpcy5teVNlYXJjaCA9IHJlZGlzU2VhcmNoKHJlZGlzLCBQS0dfSURYLCB7XG4gICAgICBjbGllbnRPcHRpb25zOiBscmVkaXMuc2VhcmNoQ2xpZW50RGV0YWlsc1xuICAgIH0pO1xuICB9XG4gIGdldE5ld0F3Yigpe1xuICAgIHJldHVybiBuZXcgUHJvbWlzZSgocmVzb2x2ZSxyZWplY3QpPT57XG4gICAgICBkYXRhQ29udGV4dC5yZWRpc0NsaWVudC5leGlzdHMoQVdCX0lELChlcnIscmVzdWx0KT0+e1xuICAgICAgICBjb25zb2xlLmxvZyhyZXN1bHQpOyBcbiAgICAgICAgaWYgKHJlc3VsdCAhPSBcIjFcIil7XG4gICAgICAgICAgZGF0YUNvbnRleHQucmVkaXNDbGllbnQuc2V0KEFXQl9JRCA9PSAxMDAwMDAsKGVycixpbml0UmVzdWx0KT0+e1xuICAgICAgICAgICAgZGF0YUNvbnRleHQucmVkaXNDbGllbnQuaW5jcihBV0JfSUQsKGVycixuZXdJZCk9PntcbiAgICAgICAgICAgICAgcmVzb2x2ZSh7YXdiOm5ld0lkfSlcbiAgICAgICAgICAgIH0pXG4gICAgICAgICAgfSlcbiAgICAgICAgfVxuICAgICAgICBlbHNlIHtcbiAgICAgICAgICBkYXRhQ29udGV4dC5yZWRpc0NsaWVudC5pbmNyKEFXQl9JRCwoZXJyLG5ld0lkKT0+e1xuICAgICAgICAgICAgcmVzb2x2ZSh7YXdiOm5ld0lkfSlcbiAgICAgICAgICB9KVxuICAgICAgICB9XG4gICAgICB9KVxuICAgIH0pO1xuICB9XG4gIHNhdmVBd2IoYXdiKXtcbiAgICByZXR1cm4gbmV3IFByb21pc2UoKHJlc29sdmUscmVqZWN0KT0+e1xuICAgICAgY29uc29sZS5sb2coJ3NhdmluZy4uLicsYXdiLG1vbWVudCgpLnRvU3RyaW5nKFwiaGg6bW06c3NcIikpXG4gICAgICBpZiAoYXdiLmlkICE9XCJcIil7XG4gICAgICAgIGF3Yi51cGRhdGVkX2J5ID0gYXdiLnVzZXJuYW1lOyBcbiAgICAgICAgYXdiLmRhdGVfdXBkYXRlZCA9IG1vbWVudCgpLnVuaXgoKTsgXG4gICAgICAgIGF3YkluZGV4LnVwZGF0ZShhd2IuaWQsYXdiLChlcnIxLGF3YlJlcyk9PntcbiAgICAgICAgICBpZiAoZXJyMSl7XG4gICAgICAgICAgICBjb25zb2xlLmxvZygnc2F2aW5nIGVycicsZXJyMSlcbiAgICAgICAgICAgIHJlc29sdmUoe3NhdmVkOmZhbHNlfSlcbiAgICAgICAgICB9XG4gICAgICAgICAgcmVzb2x2ZSh7c2F2ZWQ6dHJ1ZSwgaWQ6YXdiLmlkfSlcbiAgICAgICAgfSlcbiAgICAgIH1cbiAgICAgIGVsc2V7XG4gICAgICBkYXRhQ29udGV4dC5yZWRpc0NsaWVudC5pbmNyKEFXQl9JRCwoZXJyLHJlcGx5KT0+e1xuICAgICAgICBhd2IuaWQgPSByZXBseTsgXG4gICAgICAgIGF3Yi5zdGF0dXMgPSAxOyBcbiAgICAgICAgaWYgKGF3Yi5pbnZvaWNlKXtcbiAgICAgICAgICBhd2IuaGFzRG9jcyA9IDFcbiAgICAgICAgICBjb25zb2xlLmxvZyhcIkhBUyBET0NDQ0NDXCIpXG4gICAgICAgIH1cbiAgICAgICAgZWxzZSB7XG4gICAgICAgICAgYXdiLmhhc0RvY3MgPSAwIDsgXG4gICAgICAgICAgY29uc29sZS5sb2coXCJIQVMgTk8gRE9DQ0NDQ1wiKVxuICAgICAgICB9XG5cbiAgICAgICAgYXdiLmNyZWF0ZWRfYnkgPSBhd2IudXNlcm5hbWU7IFxuICAgICAgICBkZWxldGUgYXdiLnVzZXJuYW1lO1xuICAgICAgICBhd2IuZGF0ZUNyZWF0ZWQgPSBtb21lbnQoKS51bml4KCk7IFxuICAgICAgICAgIGF3YkluZGV4LmFkZChhd2IuaWQsYXdiLChlcnIxLGF3YlJlcyk9PntcbiAgICAgICAgICAgIGlmIChlcnIxKXtcbiAgICAgICAgICAgICAgY29uc29sZS5sb2coJ3NhdmluZyBlcnInLGVycjEpXG4gICAgICAgICAgICAgIHJlc29sdmUoe3NhdmVkOmZhbHNlfSlcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIHJlc29sdmUoe3NhdmVkOnRydWUsIGlkOnJlcGx5fSlcbiAgICAgICAgICB9KVxuICAgICAgfSlcbiAgICB9XG4gICAgICBcbiAgICAgIFxuICAgIH0pXG4gIH1cbiAgZ2V0QXdiT3ZlcnZpZXcoaWQpe1xuICAgIC8vIGdldCB0aGUgYXdiIHBhY2thZ2VzIGFuZCBhZGQgZXZlcnl0aGluZyBpbiBcbiAgICByZXR1cm4gbmV3IFByb21pc2UoKHJlc29sdmUscmVqZWN0KT0+e1xuICAgICAgcGFja2FnZUluZGV4LnNlYXJjaChgQGF3YjpbJHtpZH0gJHtpZH1dYCx7bnVtYmVyT2ZSZXN1bHRzOjUwMDAsb2Zmc2V0OjB9LChlcnIscGFja2FnZXMpPT57XG4gICAgICAgIHZhciB3ZWlnaHQgPSAwIDsgXG4gICAgICAgIHZhciBwaWVjZXMgPSBwYWNrYWdlcy50b3RhbFJlc3VsdHM7IFxuICAgICAgICB2YXIgZGVzY3JpcHRpb24gPSBcIlwiXG4gICAgICAgIHBhY2thZ2VzLnJlc3VsdHMuZm9yRWFjaChwYWNrYWdlMSA9PiB7XG4gICAgICAgICAgaWYgKGRlc2NyaXB0aW9uID09XCJcIilcbiAgICAgICAgICAgIGRlc2NyaXB0aW9uID0gcGFja2FnZTEuZG9jLmRlc2NyaXB0aW9uOyBcbiAgICAgICAgICB3ZWlnaHQgKz0gTnVtYmVyKHBhY2thZ2UxLmRvYy53ZWlnaHQpXG4gICAgICAgIH0pO1xuICAgICAgICB2YXIgZGF0YSAgPSB7d2VpZ2h0OndlaWdodCxkZXNjcmlwdGlvbjpkZXNjcmlwdGlvbixwaWVjZXM6cGllY2VzfVxuICAgICAgICBjb25zb2xlLmxvZyhkYXRhLFwiQVdCIERFVEFJTFNcIik7IFxuICAgICAgICByZXNvbHZlKCBkYXRhKVxuICAgICAgfSlcbiAgICB9KVxuICAgXG4gIH1cbiAgZ2V0QXdiRGV0YWlscyhpZCl7XG4gICAgdmFyIHNydiA9IHRoaXM7IFxuICAgIHJldHVybiBuZXcgUHJvbWlzZSgocmVzb2x2ZSxyZWplY3QpPT57XG4gICAgICBjb25zb2xlLmxvZyhgQGF3YjpbJHtpZH0gJHtpZH1dYClcbiAgICAgXG4gICAgICBwYWNrYWdlSW5kZXguc2VhcmNoKGBAYXdiOlske2lkfSAke2lkfV1gLHtudW1iZXJPZlJlc3VsdHM6NTAwMCxvZmZzZXQ6MH0sKGVycixwYWNrYWdlcyk9PntcbiAgICAgICAgaWYgKGVycilcbiAgICAgICAgIGNvbnNvbGUubG9nKGVycilcbiAgICAgIFxuICAgICAgICB2YXIgIHBhY2thZ2VsaXN0ICA9IFtdXG4gICAgICAgIHZhciBjb3VudCA9IDE7IFxuICAgICAgICBwYWNrYWdlcy5yZXN1bHRzLmZvckVhY2gocGFja2FnZTEgPT4ge1xuXG4gICAgICAgICAgaWYgKHBhY2thZ2UxLmRvYy50cmFja2luZ05vLmxlbmd0aCA+IDcpe1xuICAgICAgICAgICAgLy9vbmx5IGRpc3BsYXkgdGhlIGxhc3QgNyBcbiAgICAgICAgICAgIHBhY2thZ2UxLmRvYy50cmFja2luZ05vID0gcGFja2FnZTEuZG9jLnRyYWNraW5nTm8uc3Vic3RyaW5nKHBhY2thZ2UxLmRvYy50cmFja2luZ05vLmxlbmd0aCAtNylcbiAgICAgICAgICAgIFxuICAgICAgICAgIH1cbiAgICAgICAgICBwYWNrYWdlMS5kb2MucGFja2FnZUluZGV4ID0gY291bnQ7XG4gICAgICAgICAgY291bnQgKys7IFxuICAgICAgICAgIHBhY2thZ2VsaXN0LnB1c2goIHBhY2thZ2UxLmRvYylcbiAgICAgICAgfSk7XG4gICAgICAgXG4gICAgICAgXG4gICAgICAgIHJlc29sdmUoIHBhY2thZ2VsaXN0KVxuICAgICAgfSlcbiAgICB9KVxuICB9XG4gIGxpc3ROb0RvY3NGbGwoKXtcbiAgICByZXR1cm4gbmV3IFByb21pc2UoKHJlc29sdmUscmVqZWN0KT0+e1xuICAgICAgIGF3YkluZGV4LnNlYXJjaChcIkBzdGF0dXM6WzEgMV0gQGhhc0RvY3M6WzAgMF1cIix7b2Zmc2V0OjAsbnVtYmVyT2ZSZXN1bHRzOjUwMDAsc29ydEJ5OidpZCd9LChlcnIsYXdicyk9PntcbiAgICAgICAgIHZhciBhd2JMaXN0ID0gW107IFxuICAgICAgICAgUHJvbWlzZS5hbGwoYXdicy5yZXN1bHRzLm1hcChhd2I9PmN1c3RvbWVyU2VydmljZS5nZXRDdXN0b21lcihhd2IuZG9jLmN1c3RvbWVySWQpKSkudGhlbihjdXN0b21lcnM9PntcbiAgICAgICAgICAgUHJvbWlzZS5hbGwoYXdicy5yZXN1bHRzLm1hcChhd2I9PnRoaXMuZ2V0QXdiT3ZlcnZpZXcoYXdiLmRvYy5pZCkpKS50aGVuKGRldGFpbHM9PntcbiAgICAgICAgICAgIGNvbnNvbGUubG9nKFwiZ290IHRoZSBjdXN0b21lcnNcIixjdXN0b21lcnMsIGF3YnMpXG4gICAgICAgICAgICBmb3IodmFyIGkgPTAgOyBpIDwgYXdicy5yZXN1bHRzLmxlbmd0aCA7IGkrKyApe1xuICAgICAgICAgICAgICB2YXIgYXdiID0gYXdicy5yZXN1bHRzW2ldOyBcbiAgICAgICAgICAgICAgYXdiLmRvYy5kYXRlQ3JlYXRlZCA9IG1vbWVudC51bml4KGF3Yi5kb2MuZGF0ZUNyZWF0ZWQpLmZvcm1hdChcIllZWVktTU0tREQgaGg6bW0gQVwiKVxuICAgICAgICAgICAgICAvL3dlIG5lZWQgdG8gZ2V0IHRoZSBjdXN0b21lciBcbiAgICAgICAgICAgICAgYXdiLmRvYy5jb25zaWduZWUgPSBjdXN0b21lcnNbaV0ubmFtZTsgXG4gICAgICAgICAgICAgIGF3Yi5kb2Mud2VpZ2h0ID0gZGV0YWlsc1tpXS53ZWlnaHQ7IFxuICAgICAgICAgICAgICBhd2IuZG9jLnBtYiA9IGN1c3RvbWVyc1tpXS5wbWI7IFxuICAgICAgICAgICAgICBhd2IuZG9jLmRlc2NyaXB0aW9uID0gZGV0YWlsc1tpXS5kZXNjcmlwdGlvbjsgXG4gICAgICAgICAgICAgIGF3Yi5kb2MucGllY2VzID0gZGV0YWlsc1tpXS5waWVjZXM7IFxuICAgICAgICAgICAgICBpZiAoY3VzdG9tZXJzW2ldLnBtYiA9PSAnJyl7XG4gICAgICAgICAgICAgICAgYXdiLmRvYy5wbWIgPSAnOTAwMCdcbiAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICBjb25zb2xlLmxvZygncHVzaGluZyAnLGF3YilcbiAgICAgICAgICAgICAgLy93ZSBuZWVkIHRvIGdldCBhbGwgdGhlIHBhY2thZ2VzIFxuICAgICAgICAgICAgICBhd2JMaXN0LnB1c2goYXdiLmRvYylcbiAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgcmVzb2x2ZSh7YXdiczphd2JMaXN0fSlcbiAgICAgICAgICAgfSlcbiAgICAgICAgICBcbiAgICAgICAgICB9KS5jYXRjaChlcnI9PntcbiAgICAgICAgICAgIGNvbnNvbGUubG9nKGVycik7IFxuICAgICAgICAgIH0pXG4gICAgICAgICBcbiAgICAgICAgLy8gIGF3YnMucmVzdWx0cy5mb3JFYWNoKGF3YiA9PiB7XG4gICAgICAgICAgIFxuICAgICAgICAgIFxuICAgICAgICAvLyAgfSk7XG4gICAgICAgICBcbiAgICAgICB9KVxuICAgIH0pXG4gIH1cblxuICBsaXN0QXdiaW5GbGwoKXtcbiAgICByZXR1cm4gbmV3IFByb21pc2UoKHJlc29sdmUscmVqZWN0KT0+e1xuICAgICAgIGF3YkluZGV4LnNlYXJjaChcIkBzdGF0dXM6WzEgMV0gQGhhc0RvY3M6WzEgMV1cIix7b2Zmc2V0OjAsbnVtYmVyT2ZSZXN1bHRzOjUwMDAsc29ydEJ5OidpZCd9LChlcnIsYXdicyk9PntcbiAgICAgICAgIHZhciBhd2JMaXN0ID0gW107IFxuICAgICAgICAgUHJvbWlzZS5hbGwoYXdicy5yZXN1bHRzLm1hcChhd2I9PmN1c3RvbWVyU2VydmljZS5nZXRDdXN0b21lcihhd2IuZG9jLmN1c3RvbWVySWQpKSkudGhlbihjdXN0b21lcnM9PntcbiAgICAgICAgICAgUHJvbWlzZS5hbGwoYXdicy5yZXN1bHRzLm1hcChhd2I9PnRoaXMuZ2V0QXdiT3ZlcnZpZXcoYXdiLmRvYy5pZCkpKS50aGVuKGRldGFpbHM9PntcbiAgICAgICAgICAgIGNvbnNvbGUubG9nKFwiZ290IHRoZSBjdXN0b21lcnNcIixjdXN0b21lcnMsIGF3YnMpXG4gICAgICAgICAgICBmb3IodmFyIGkgPTAgOyBpIDwgYXdicy5yZXN1bHRzLmxlbmd0aCA7IGkrKyApe1xuICAgICAgICAgICAgICB2YXIgYXdiID0gYXdicy5yZXN1bHRzW2ldOyBcbiAgICAgICAgICAgICAgYXdiLmRvYy5kYXRlQ3JlYXRlZCA9IG1vbWVudC51bml4KGF3Yi5kb2MuZGF0ZUNyZWF0ZWQpLmZvcm1hdChcIllZWVktTU0tREQgaGg6bW0gQVwiKVxuICAgICAgICAgICAgICAvL3dlIG5lZWQgdG8gZ2V0IHRoZSBjdXN0b21lciBcbiAgICAgICAgICAgICAgYXdiLmRvYy5jb25zaWduZWUgPSBjdXN0b21lcnNbaV0ubmFtZTsgXG4gICAgICAgICAgICAgIGF3Yi5kb2MucG1iID0gY3VzdG9tZXJzW2ldLnBtYjsgXG4gICAgICAgICAgICAgIGF3Yi5kb2Mud2VpZ2h0ID0gZGV0YWlsc1tpXS53ZWlnaHQ7IFxuICAgICAgICAgICAgICBhd2IuZG9jLmRlc2NyaXB0aW9uID0gZGV0YWlsc1tpXS5kZXNjcmlwdGlvbjsgXG4gICAgICAgICAgICAgIGF3Yi5kb2MucGllY2VzID0gZGV0YWlsc1tpXS5waWVjZXM7IFxuICAgICAgICAgICAgICBpZiAoY3VzdG9tZXJzW2ldLnBtYiA9PSAnJyl7XG4gICAgICAgICAgICAgICAgYXdiLmRvYy5wbWIgPSAnOTAwMCdcbiAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICBjb25zb2xlLmxvZygncHVzaGluZyAnLGF3YilcbiAgICAgICAgICAgICAgLy93ZSBuZWVkIHRvIGdldCBhbGwgdGhlIHBhY2thZ2VzIFxuICAgICAgICAgICAgICBhd2JMaXN0LnB1c2goYXdiLmRvYylcbiAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgcmVzb2x2ZSh7YXdiczphd2JMaXN0fSlcbiAgICAgICAgICAgfSlcbiAgICAgICAgICBcbiAgICAgICAgICB9KS5jYXRjaChlcnI9PntcbiAgICAgICAgICAgIGNvbnNvbGUubG9nKGVycik7IFxuICAgICAgICAgIH0pXG4gICAgICAgICBcbiAgICAgICAgLy8gIGF3YnMucmVzdWx0cy5mb3JFYWNoKGF3YiA9PiB7XG4gICAgICAgICAgIFxuICAgICAgICAgIFxuICAgICAgICAvLyAgfSk7XG4gICAgICAgICBcbiAgICAgICB9KVxuICAgIH0pXG4gIH1cbiAgZ2V0QXdiKGlkKXtcbiAgICBjb25zdCBzcnYgPSB0aGlzOyBcbiAgICByZXR1cm4gbmV3IFByb21pc2UoKHJlc29sdmUscmVqZWN0KT0+e1xuICAgICAgYXdiSW5kZXguZ2V0RG9jKGlkLChlcnIsYXdiKT0+e1xuICAgICAgICAvL2dldCB0aGUgY3VzdG9tZXIgXG4gICAgICAgIGN1c3RvbWVyU2VydmljZS5nZXRDdXN0b21lcihhd2IuZG9jLmN1c3RvbWVySWQpLnRoZW4oY3VzdG9tZXI9PntcbiAgICAgICAgICBhd2IuZG9jLmN1c3RvbWVyID0gY3VzdG9tZXI7IFxuICAgICAgICAgIHNydi5nZXRBd2JEZXRhaWxzKGlkKS50aGVuKHBhY2thZ2VzPT57XG4gICAgICAgICAgICAvL2dldCB0aGUgcGFja2FnZXMgZm9yIHRoZSBhd2IgXG4gICAgICAgICAgICBhd2IuZG9jLnBhY2thZ2VzID0gcGFja2FnZXM7IFxuICAgICAgICAgICAgcmVzb2x2ZSh7YXdiOmF3Yi5kb2N9KSAgXG4gICAgICAgICAgfSlcbiAgICAgICAgICBcbiAgICAgICAgfSlcbiAgICAgICAgXG4gICAgICB9KVxuICAgIH0pXG4gIH1cbiAgdXBkYXRlTG9jYXRpb24odHJhY2tpbmdOdW1iZXIsbG9jYXRpb25faWQpe1xuICAgIHJldHVybiBuZXcgUHJvbWlzZSgocmVzb2x2ZSxyZWplY3QpPT57XG4gICAgICBwYWNrYWdlSW5kZXguc2VhcmNoKFwiQHRyYWNraW5nTm86XCIrdHJhY2tpbmdOdW1iZXIse2xvY2F0aW9uOmxvY2F0aW9uX2lkfSwoZXJyLHBhY2thZ2VSZXN1bHQpPT57XG5cbiAgICAgIH0pXG4gICAgfSlcbiAgfVxuICBzYXZlUGFja2FnZVRvQXdiKG5ld1BhY2thZ2Upe1xuICAgIHJldHVybiBuZXcgUHJvbWlzZSgocmVzb2x2ZSxyZXN1bHQpPT57XG4gICAgICBpZiAobmV3UGFja2FnZS5pZCAhPVwiMFwiKXtcbiAgICAgICAgcGFja2FnZUluZGV4LnVwZGF0ZShuZXdQYWNrYWdlLmlkLG5ld1BhY2thZ2UsKGVycixyZXN1bHQpPT57XG4gICAgICAgICAgaWYgKGVycilcbiAgICAgICAgICAgIGNvbnNvbGUubG9nKGVycik7IFxuICAgICAgICAgIHJlc29sdmUoe3NhdmVkOnRydWUsaWQ6bmV3UGFja2FnZS5pZH0pXG4gICAgICAgIH0pXG4gICAgICB9XG4gICAgICBlbHNlIHtcbiAgICAgICAgZGF0YUNvbnRleHQucmVkaXNDbGllbnQuaW5jcihQS0dfSURfQ09VTlRFUiwoZXJyLGlkKT0+e1xuICAgICAgICAgIG5ld1BhY2thZ2UuaWQgPSBpZDsgXG4gICAgICAgICAgcGFja2FnZUluZGV4LmFkZChpZCxuZXdQYWNrYWdlLChlcnIscmVzdWx0KT0+e1xuICAgICAgICAgICAgaWYgKGVycilcbiAgICAgICAgICAgICAgY29uc29sZS5sb2coZXJyKTsgXG4gICAgICAgICAgICByZXNvbHZlKHtzYXZlZDp0cnVlLGlkOmlkfSlcbiAgICAgICAgICB9KVxuICAgICAgICB9KVxuICAgICAgfVxuICAgXG4gICAgfSlcbiAgfVxuICBnZXRTaGlwcGVyKGlkKXtcbiAgICByZXR1cm4gbmV3IFByb21pc2UoKHJlc29sdmUscmVqZWN0KT0+e1xuICAgICBzaGlwcGVySW5kZXguZ2V0RG9jKGlkLChlcnIsc3Jlc3VsdCk9PntcbiAgICAgICBpZiAoZXJyKVxuICAgICAgICByZXNvbHZlKGlkKTtcblxuICAgICAgICByZXNvbHZlKHNyZXN1bHQuZG9jKTsgXG4gICAgIH0pXG4gICAgfSlcbiAgfVxuICBjcmVhdGVDb25zb2xhdGVkKHBhY2thZ2VzLHVzZXJuYW1lLGJveFNpemUpe1xuICAgIHZhciBzcnYgPSB0aGlzOyBcbiAgICByZXR1cm4gbmV3IFByb21pc2UoKHJlc29sdmUscmVqZWN0KT0+e1xuICAgICAgdmFyIGF3YkluZm8gPSB7IFxuICAgICAgICBpZDogXCJcIixcbiAgICAgICAgaXNTZWQ6MCxcbiAgICAgICAgaGFzRG9jczogXCIwXCIsXG4gICAgICAgIGludm9pY2VOdW1iZXI6XCJcIixcbiAgICAgICAgdmFsdWU6XCIwXCIsXG4gICAgICAgIGN1c3RvbWVySWQ6MjQxOTcsXG4gICAgICAgIHNoaXBwZXI6XCI0ODJcIiwgLy8gd2Ugc2hvdWxkIGdldCBhbiBpZCBoZXJlIFxuICAgICAgICBjYXJyaWVyOlwiVVNQU1wiLFxuICAgICAgICBoYXptYXQ6XCJcIixcbiAgICAgICAgdXNlcm5hbWU6ICB1c2VybmFtZVxuICAgICAgIFxuICAgIH07XG4gICAgc3J2LnNhdmVBd2IoYXdiSW5mbykudGhlbihhd2JSZXN1bHQ9PntcbiAgICAgICAvL2FkZCBcbiAgICAgICAgICB2YXIgY1BhY2thZ2UgPSB7XG4gICAgICAgICAgICBpZDowLFxuICAgICAgICAgICAgdHJhY2tpbmdObzogdW5pcUlkKCksXG4gICAgICAgICAgICBkZXNjcmlwdGlvbjogXCJDb25zb2xpZGF0ZWQgUGFja2FnZVwiLFxuICAgICAgICAgICAgd2VpZ2h0OjAsIFxuICAgICAgICAgICAgZGltZW5zaW9uczogIGAke2JveFNpemV9eCR7Ym94U2l6ZX14JHtib3hTaXplfWAsXG4gICAgICAgICAgICBhd2I6YXdiUmVzdWx0LmlkLCBcbiAgICAgICAgICAgIGlzQ29uc29saWRhdGVkOiBcIjFcIiwgXG4gICAgICAgICAgICBjcmVhdGVkX2J5OiB1c2VybmFtZSwgXG4gICAgICAgICAgXG4gICAgICAgIH07IFxuICAgICAgICBzcnYuc2F2ZVBhY2thZ2VUb0F3YihjUGFja2FnZSkudGhlbihwa2dSZXN1bHQ9PntcbiAgICAgICAgICAvLyBnZXQgdGhlIGlkIFxuICAgICAgICAgIC8vXG4gICAgICAgICAgdmFyIGJhdGNoID0gZGF0YUNvbnRleHQucmVkaXNDbGllbnQuYmF0Y2goKTsgXG4gICAgICAgICAgdmFyIHBrZ0JhdGNoID0gZGF0YUNvbnRleHQucmVkaXNDbGllbnQuYmF0Y2goKTsgXG5cbiAgICAgICAgICBwYWNrYWdlcy5mb3JFYWNoKHBrZyA9PiB7XG4gICAgICAgICAgICAvL3RoZXNlIGFyZSBiYXJjb2RlcyBcbiAgICAgICAgICAgIGJhdGNoLnNhZGQoXCJjb25zb2xpZGF0ZWQ6cGtnOlwiK3BrZ1Jlc3VsdC5pZCxwa2cpXG4gICAgICAgICAgICBwa2dCYXRjaC5obWdldChQS0dfUFJFRklYK2dldFBhY2thZ2VJZEZyb21CYXJDb2RlKHBrZyksXCJ3ZWlnaHRcIilcbiAgICAgICAgICB9KTtcbiAgICAgICAgICBiYXRjaC5leGVjKChlcnIscmVzdWx0cyk9PntcbiAgICAgICAgICAgIC8vXG4gICAgICAgICAgICBwa2dCYXRjaC5leGVjKChlcnIxLHJlc3VsdHMpPT57XG4gICAgICAgICAgICAgIHZhciB0b3RhbFdlaWdodCA9IDA7IFxuICAgICAgICAgICAgICByZXN1bHRzLmZvckVhY2god2VpZ2h0ID0+IHtcbiAgICAgICAgICAgICAgICBpZiAoaXNOYU4oTnVtYmVyKHdlaWdodCkpID09IGZhbHNlKVxuICAgICAgICAgICAgICAgICAgdG90YWxXZWlnaHQgKz0gTnVtYmVyKHdlaWdodCk7XG4gICAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgICAvL3dlIG5lZWQgdG8gdXBkYXRlIHRoZSB0b3RhbCB3ZWlnaHQgb2YgdGhlIHBhY2thZ2Ugbm93IFxuICAgICAgICAgICAgICBzcnYucGFja2FnZUluZGV4LnVwZGF0ZShjUGFja2FnZS5pZCx7d2VpZ2h0OnRvdGFsV2VpZ2h0fSlcbiAgICAgICAgICAgIH0pXG4gICAgICAgICAgICBcbiAgICAgICAgICAgIHJlc29sdmUoe3NhdmVkOnRydWUsaWQ6cGtnUmVzdWx0LmlkfSlcbiAgICAgICAgICB9KVxuICAgICAgICB9KVxuICAgICAgICBcbiAgICB9KVxuXG4gICBcbiAgICAgIC8vdmFsaWRhdGUgdGhlIHBhY2thZ2UgXG4gICAgXG5cbiAgICB9KVxuICB9XG4gIHNhdmVQYWNrYWdlKGJvZHkpe1xuICAgIHJldHVybiBuZXcgUHJvbWlzZSgocmVzb2x2ZSxyZWplY3QpPT57XG4gICAgICB2YXIgY1BhY2thZ2UgPSB7XG4gICAgICAgIFxuICAgICAgICBza3lib3g6IGJvZHkuc2t5Ym94LFxuICAgICAgICBjdXN0b21lcjogYm9keS5jdXN0b21lci5yZXBsYWNlKFwiLVwiLCBcIlwiKS50cmltKCksXG4gICAgICAgIHRyYWNraW5nTm86IGJvZHkudHJhY2tpbmcsXG4gICAgICAgIGRlc2NyaXB0aW9uOiBib2R5LmRlc2NyaXB0aW9uLFxuICAgICAgICBzaGlwcGVyOiBib2R5LnNoaXBwZXIsXG4gICAgICAgIGNhcnJpZXI6Ym9keS5jYXJyaWVyLFxuICAgICAgICB2YWx1ZTogTnVtYmVyKGJvZHkudmFsdWUpLFxuICAgICAgICBwaWVjZXM6IE51bWJlcihib2R5LnBpZWNlcyksXG4gICAgICAgIHdlaWdodDogTnVtYmVyKGJvZHkud2VpZ2h0KSxcbiAgICAgICAgZGltZW5zaW9uczogYm9keS5kaW1lbnNpb25zLFxuICAgICAgICBzdGF0dXM6IDEsXG4gICAgICAgIGxvY2F0aW9uOiBcIkZMTFwiLFxuICAgICAgICBtaWQ6IDAsXG4gICAgICAgIGF3YjowLFxuICAgICAgICAvL2hhc09wdDogdHJ1ZSxcbiAgICAgICAgLy9tdHlwZTogYm9keS5tdHlwZVxuICAgICAgfTtcbiAgICAgIC8vdmFsaWRhdGUgdGhlIHBhY2thZ2UgXG4gICAgICBkYXRhQ29udGV4dC5yZWRpc0NsaWVudC5pbmNyKFBLR19JRF9DT1VOVEVSLChlcnIsaWQpPT57XG4gICAgICAgIGNQYWNrYWdlLmlkID0gaWQ7IFxuICAgICAgICBkYXRhQ29udGV4dC5yZWRpc0NsaWVudC5zZXQoUEtHX1BSRUZJWCtpZCxjUGFja2FnZSwoZXJyLHJlc3BvbnNlKT0+e1xuICAgICAgICAgIGlmIChlcnIpe1xuICAgICAgICAgICAgcmVqZWN0KHtzYXZlZDpmYWxzZSxlcnI6ZXJyfSlcbiAgICAgICAgICB9XG4gICAgICAgICAgIHZhciBpbmRleFBhY2thZ2UgPSAgY3JlYXRlRG9jdW1lbnQoY1BhY2thZ2UpOyBcbiAgICAgICAgICAgY29uc29sZS5sb2coaW5kZXhQYWNrYWdlKTsgXG4gICAgICAgICAgIHBhY2thZ2VJbmRleC5hZGQoY1BhY2thZ2UuaWQsaW5kZXhQYWNrYWdlLChlcnIxLGRvY1Jlc3VsdCk9PntcbiAgICAgICAgICAgICBjb25zb2xlLmxvZyhkb2NSZXN1bHQpOyBcbiAgICAgICAgICAgICBpZihlcnIxKXtcbiAgICAgICAgICAgICAgIHJlamVjdCh7c2F2ZWQ6ZmFsc2UsZXJyOmVycjF9KVxuICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICByZXNvbHZlKHtzYXZlZDp0cnVlfSlcbiAgICAgICAgICAgfSlcblxuICAgICAgICB9KVxuICAgICAgfSk7XG4gICAgXG5cblxuICAgIH0pXG4gIH1cblxuICBnZXRNYW5pZmVzdFBhY2thZ2VzKCl7XG4gICAgcmV0dXJuIG5ldyBQcm9taXNlKChyZXNvbHZlLHJlamVjdCk9PntcbiAgICAgIFxuICAgICAgdGhpcy5teVNlYXJjaC5zZWFyY2goXG4gICAgICAgIGBAbWlkOlswIDBdYCxcbiAgICAgICAgeyBvZmZzZXQ6IDAsIG51bWJlck9mUmVzdWx0czogNTAwMCB9LFxuICAgICAgICAoZXJyLCBkYXRhKSA9PiB7XG4gICAgICAgICAgdmFyIHBhY2thZ2VzID0gW107XG4gICAgICAgICAgY29uc29sZS5sb2coZGF0YSk7XG4gICAgICAgICAgZGF0YS5yZXN1bHRzLmZvckVhY2goZWxlbWVudCA9PiB7XG5cbiAgICAgICAgICAgIHBhY2thZ2VzLnB1c2goZWxlbWVudC5kb2MpO1xuICAgICAgICAgICAgcmVzb2x2ZShwYWNrYWdlcyk7ICAgICAgICAgICAgICAgICBcbiAgICAgICAgfSk7XG4gICAgfSk7XG4gICAgfSlcbiAgfVxuICBnZXRSZWNlaXZlZFBhY2thZ2VzKHBhZ2UscGFnZVNpemUpe1xuICAgIHJldHVybiBuZXcgUHJvbWlzZSgocmVzb2x2ZSxyZWplY3QpPT57XG4gICAgICBcbiAgICAgIHRoaXMubXlTZWFyY2guc2VhcmNoKFxuICAgICAgICBgQG1pZDpbMCAwXWAsXG4gICAgICAgIHsgb2Zmc2V0OiAwLCBudW1iZXJPZlJlc3VsdHM6IDUwMDAgfSxcbiAgICAgICAgKGVyciwgZGF0YSkgPT4ge1xuICAgICAgICAgIHZhciBwYWNrYWdlcyA9IFtdO1xuICAgICAgICAgIGNvbnNvbGUubG9nKGRhdGEpO1xuICAgICAgICAgIGRhdGEucmVzdWx0cy5mb3JFYWNoKGVsZW1lbnQgPT4ge1xuXG4gICAgICAgICAgICBwYWNrYWdlcy5wdXNoKGVsZW1lbnQuZG9jKTtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBcbiAgICAgICAgfSk7XG4gICAgICAgIHJlc29sdmUocGFja2FnZXMpOyBcbiAgICB9KTtcbiAgICB9KVxuICB9XG4gIGdldE5vRG9jc1BhY2thY2thZ2VzKHBhZ2UscGFnZVNpemUpe1xuICAgIHJldHVybiBuZXcgUHJvbWlzZSgocmVzb2x2ZSxyZWplY3QpPT57XG4gICAgICBcbiAgICAgIHRoaXMubXlTZWFyY2guc2VhcmNoKFxuICAgICAgICBgQGhhc0RvY3M6WzAgMF1gLFxuICAgICAgICB7IG9mZnNldDogMCwgbnVtYmVyT2ZSZXN1bHRzOiA1MDAwIH0sXG4gICAgICAgIChlcnIsIGRhdGEpID0+IHtcbiAgICAgICAgICB2YXIgcGFja2FnZXMgPSBbXTtcbiAgICAgICAgICBjb25zb2xlLmxvZyhkYXRhKTtcbiAgICAgICAgICBkYXRhLnJlc3VsdHMuZm9yRWFjaChlbGVtZW50ID0+IHtcblxuICAgICAgICAgICAgcGFja2FnZXMucHVzaChlbGVtZW50LmRvYyk7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgXG4gICAgICAgIH0pO1xuICAgICAgICByZXNvbHZlKHBhY2thZ2VzKTsgXG4gICAgfSk7XG4gICAgfSlcbiAgfVxuICBnZXRwYWNrYWdlYnlSZWRpc0lkKGlkKXtcbiAgICByZXR1cm4gbmV3IFByb21pc2UoKHJlc29sdmUscmVqZWN0KT0+e1xuICAgICAgcGFja2FnZUluZGV4LmdldERvYyhpZCwoZXJyLGRvY3VtZW50KT0+e1xuICAgICAgICByZXNvbHZlKGRvY3VtZW50LmRvYyk7IFxuICAgICAgfSlcbiAgICB9KVxuICB9XG4gIGdldFBhY2thZ2VCeUlkKGJhcmNvZGUpe1xuICAgIHZhciBzcnYgPSB0aGlzOyBcbiAgICB2YXIgcGtnSWQgPSBnZXRQYWNrYWdlSWRGcm9tQmFyQ29kZShiYXJjb2RlKTsgXG4gICAgcmV0dXJuIG5ldyBQcm9taXNlKChyZXNvbHZlLHJlamVjdCk9PntcbiAgICAgIHRoaXMubXlTZWFyY2guZ2V0RG9jKHBrZ0lkLChlcnIsZG9jdW1lbnQpPT57XG4gICAgICAgIC8vZ2V0IHRoZSBhd2IgaW5mbyBoZXJlIGFzIHdlbGwgXG4gICAgICAgIHNydi5nZXRBd2IoZG9jdW1lbnQuZG9jLmF3YikudGhlbihhd2JpbmZvPT57XG4gICAgICAgICAgc3J2LmdldFNoaXBwZXIoYXdiaW5mby5hd2Iuc2hpcHBlcikudGhlbihzaGlwcGVyPT57XG4gICAgICAgICAgICBjb25zb2xlLmxvZyhhd2JpbmZvKTsgXG4gICAgICAgICAgICBhd2JpbmZvLmF3Yi5zaGlwcGVyID0gc2hpcHBlci5uYW1lO1xuICAgICAgICAgICAgdmFyIHJlc3BvbnNlID0geyBcbiAgICAgICAgICAgICAgYXdiIDogYXdiaW5mby5hd2IsXG4gICAgICAgICAgICAgIHBhY2thZ2UgOiBkb2N1bWVudC5kb2NcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIHJlc29sdmUocmVzcG9uc2UpOyBcbiAgICAgICAgICB9KVxuICAgICAgICAgXG4gICAgICAgIH0pOyBcbiAgICAgICAgXG4gICAgICB9KVxuICAgIH0pOyBcbiAgfVxuICB1cGRhdGVTdG9yZUxvY2F0aW9uKGNoZWNraW4pe1xuICAgIHZhciBzcnYgPSB0aGlzOyBcbiAgICByZXR1cm4gbmV3IFByb21pc2UgKChyZXNvbHZlLHJlamVjdCk9PntcbiAgICAgIHZhciBpZCA9IGdldFBhY2thZ2VJZEZyb21CYXJDb2RlKGNoZWNraW4uYmFyY29kZSk7IFxuICAgICAgcGFja2FnZUluZGV4LmdldERvYyhpZCwoZXJyLHBrZyk9PntcbiAgICAgICAgcGtnLmRvYy5sb2NhdGlvbklkID0gY2hlY2tpbi5sb2NhdGlvbklkOyBcbiAgICAgICAgcGtnLmRvYy5sb2NhdGlvbiA9IGNoZWNraW4ubG9jYXRpb247IFxuICAgICAgICBwa2cuZG9jLnN0YXR1cyA9IDU7IFxuICAgICAgICAgcGFja2FnZUluZGV4LnVwZGF0ZShpZCxwa2csKGVycixyZXN1bHQpPT57XG4gICAgICAgICAgIC8vd2UgbmVlZCB0byBzZW5kIHRoZSBlbWFpbCBoZXJlIGZvciB0aGUgcGFja2FnZSBcbiAgICAgICAgICAgc3J2LmdldFBhY2thZ2VCeURvY0lkKGlkKS50aGVuKGluZm89PntcbiAgICAgICAgICAgICAgZW1haWxTZXJ2aWNlLnNlbmRBdFN0b3JlRW1haWwoY2hlY2tpbi5sb2NhdGlvbixpbmZvKTtcbiAgICAgICAgICAgICAgcmVzb2x2ZSh7dXBkYXRlZDp0cnVlfSk7IFxuICAgICAgICAgICB9KVxuICAgICAgICAgXG4gICAgICAgICB9KTtcbiAgICAgIH0pXG4gICAgfSlcbiAgfVxuICBjaGVja091dFRvQ3VzdG9tZXIoYmFyY29kZSx1c2VyKXtcbiAgICB2YXIgc3J2ID0gdGhpczsgXG4gICAgcmV0dXJuIG5ldyBQcm9taXNlICgocmVzb2x2ZSxyZWplY3QpPT57XG4gICAgICAvL3dlIHdhbnQgdG8gY2hlY2sgb3V0IHNldCB0aGUgc2F0YXR1cyBcbiAgICAgIHZhciBpZCA9IGdldFBhY2thZ2VJZEZyb21CYXJDb2RlKGJhcmNvZGUpOyBcbiAgICAgIHNydi5nZXRQYWNrYWdlQnlEb2NJZChpZCkudGhlbihwa2c9PntcbiAgICAgICAgY29uc29sZS5sb2cocGtnLFwiVEhFIFBLR1wiKVxuICAgICAgICBwa2cucGFja2FnZS5zdGF0dXMgPSA2IC8vY2hlY2tlZCBvdXQgdG8gY3VzdG9tZXIgXG4gICAgICAgIHBrZy5wYWNrYWdlLmNoZWNrb3V0QnkgPSB1c2VyO1xuICAgICAgICBwYWNrYWdlSW5kZXgudXBkYXRlKHBrZy5wYWNrYWdlLmlkLCBwa2cucGFja2FnZSwoZXJybSxyZXBseSk9PntcbiAgICAgICAgICBpZihlcnJtKVxuICAgICAgICAgICB7XG4gICAgICAgICAgICAgY29uc29sZS5sb2coZXJybSlcbiAgICAgICAgICAgIHJlc29sdmUoe3VwZGF0ZWQ6ZmFsc2V9KVxuICAgICAgICAgICB9IFxuICAgICAgICAgIHJlc29sdmUoe3VwZGF0ZWQ6dHJ1ZX0pXG4gICAgICAgIH0pXG4gICAgICB9KSBcblxuICAgIH0pXG4gIH1cbiAgZ2V0UGFja2FnZUJ5RG9jSWQocGtnSWQpe1xuICAgIHZhciBzcnYgPSB0aGlzOyBcbiAgICByZXR1cm4gbmV3IFByb21pc2UoKHJlc29sdmUscmVqZWN0KT0+e1xuICAgICAgdGhpcy5teVNlYXJjaC5nZXREb2MocGtnSWQsKGVycixkb2N1bWVudCk9PntcbiAgICAgICAgLy9nZXQgdGhlIGF3YiBpbmZvIGhlcmUgYXMgd2VsbCBcbiAgICAgICAgc3J2LmdldEF3Yihkb2N1bWVudC5kb2MuYXdiKS50aGVuKGF3YmluZm89PntcbiAgICAgICAgICBjb25zb2xlLmxvZyhhd2JpbmZvKTsgXG4gICAgICAgICAgdmFyIHJlc3BvbnNlID0geyBcbiAgICAgICAgICAgIGF3YiA6IGF3YmluZm8uYXdiLFxuICAgICAgICAgICAgcGFja2FnZSA6IGRvY3VtZW50LmRvY1xuICAgICAgICAgIH1cbiAgICAgICAgICByZXNvbHZlKHJlc3BvbnNlKTsgXG4gICAgICAgIH0pOyBcbiAgICAgICAgXG4gICAgICB9KVxuICAgIH0pOyBcbiAgfVxuICBcbiAgLy91c2luZyB0aGlzIFxuICBcblxuICB1cGRhdGVNYW5pZmVzdFBhY2thZ2VUb0luVHJhbnNpdChtaWQpIHtcbiAgICAvL2dldCBhbGwgdGhlIHBhY2thZ2VzXG4gICAgLy93ZSBuZWVkIHRvIHVwZGF0ZSB0aGUgaW5kZXggYXQgdGhpcyBwb2ludCBhcyB3ZWxsXG4gICAgdmFyIG1zZWFyY2ggPSB0aGlzLm15U2VhcmNoO1xuICAgIHRoaXMubXlTZWFyY2guc2VhcmNoKFxuICAgICAgYEBtaWQ6WyR7bWlkfSAke21pZH1dYCxcbiAgICAgIHsgb2Zmc2V0OiAwLCBudW1iZXJPZlJlc3VsdHM6IDUwMDAgfSxcbiAgICAgIChlcnIsIGRhdGEpID0+IHtcbiAgICAgICAgdmFyIHBhY2thZ2VzID0gW107XG4gICAgICAgIGNvbnNvbGUubG9nKGRhdGEpO1xuICAgICAgICBkYXRhLnJlc3VsdHMuZm9yRWFjaChlbGVtZW50ID0+IHtcbiAgICAgICAgICB2YXIgb2xkRG9jSWQgPSBlbGVtZW50LmRvY0lkO1xuICAgICAgICAgIGVsZW1lbnQuZG9jSWQgPSBlbGVtZW50LmRvY0lkLnJlcGxhY2UoYCR7bWlkfS1gLCBcIlwiKTtcbiAgICAgICAgICBwYWNrYWdlcy5wdXNoKGVsZW1lbnQuZG9jSWQpO1xuICAgICAgICAgIC8vIGkgY291bGQgZGVsZXRlIGhlcmVcbiAgICAgICAgICAvLyBtc2VhcmNoLmRlbERvY3VtZW50KFBLR19JRFgsb2xkRG9jSWQpXG4gICAgICAgICAgLy91cGRhdGUgYWxsIHRoZSBwYWNrYWdlc1xuICAgICAgICB9KTtcbiAgICAgICAgc2V0UGFja2FnZUluVHJhbnNpdChwYWNrYWdlcywgbXNlYXJjaCwgbWlkKS50aGVuKGZ1bmN0aW9uKFxuICAgICAgICAgIHVwZGF0ZWRQYWNrYWdlc1xuICAgICAgICApIHtcbiAgICAgICAgICBjb25zb2xlLmxvZyhcInVwZGF0ZWQgcGFja2FnZXNcIik7XG4gICAgICAgICAgY29uc29sZS5sb2codXBkYXRlZFBhY2thZ2VzKTtcbiAgICAgICAgfSk7XG4gICAgICB9XG4gICAgKTtcbiAgfVxuICByZW1vdmVQYWNrYWdlRnJvbU1hbmlmZXN0KHBhY2thZ2VJZCwgbWlkKSB7XG4gICAgdmFyIG1zZWFyY2ggPSB0aGlzLm15U2VhcmNoO1xuICAgIHJldHVybiBuZXcgUHJvbWlzZSgocmVzb2x2ZSwgcmVqZWN0KSA9PiB7XG4gICAgICB2YXIgbWFuaWZlc3QgPSBtaWQ7XG4gICAgICB2YXIgbWFuaWZlc3RLZXkgPSBcIm1hbmlmZXN0OlwiICsgbWFuaWZlc3QgKyBcIjoqXCI7XG5cbiAgICAgIGxyZWRpcy5kZWwoXCJwYWNrYWdlczpcIiArIHRyYWNraW5nTm8pLnRoZW4oZnVuY3Rpb24ocmVzdWx0KSB7XG4gICAgICAgIGNvbnNvbGUubG9nKHJlc3VsdCk7XG4gICAgICAgIG1zZWFyY2guZGVsRG9jdW1lbnQoUEtHX0lEWCwgYCR7bWlkfS0ke3RyYWNraW5nTm99YCk7XG4gICAgICAgIC8vd2UgbmVlZCB0byByZW1vdmUgZnJvbSB0aGUgaW5kZXggYW5kIGRlYyB0aGUgY291bnRlclxuICAgICAgICBscmVkaXMuY2xpZW50LmRlY3IoXCJtY291bnRlcjpcIiArIG1pZCk7XG4gICAgICAgIC8vclNlcnZpY2VzLnBhY2thZ2VTZXJ2aWNlLnJtUGFja2FnZShtaWQsIHRyYWNraW5nTm8pO1xuICAgICAgICBscmVkaXMuZ2V0S2V5cyhtYW5pZmVzdEtleSkudGhlbihrUmVzdWx0ID0+IHtcbiAgICAgICAgICAvL3RoZSBsaXN0IG9mIGFsbCB0aGUgc2V0cyAuLi53ZSBuZWVkIHRvIHJlbW92ZSB0aGUga2V5IGZyb20gZWFjaCBvbmVcbiAgICAgICAgICB2YXIga2V5c0NvdW50ID0gMDtcblxuICAgICAgICAgIGtSZXN1bHQuZm9yRWFjaChlbGVtZW50ID0+IHtcbiAgICAgICAgICAgIGNvbnNvbGUubG9nKFxuICAgICAgICAgICAgICBgcmVtb3ZpbmcgJHt0cmFja2luZ05vfSBwYWNrYWdlIG1hbmlmZXN0IHNldCAke2VsZW1lbnR9IGBcbiAgICAgICAgICAgICk7XG4gICAgICAgICAgICBscmVkaXMuc3JlbShlbGVtZW50LCB0cmFja2luZ05vKS50aGVuKGZ1bmN0aW9uKHJSZXN1bHQpIHtcbiAgICAgICAgICAgICAgY29uc29sZS5sb2coclJlc3VsdCk7XG4gICAgICAgICAgICAgIGNvbnNvbGUubG9nKFwicmVtb3ZlZFwiKTtcbiAgICAgICAgICAgICAgaWYgKGtleXNDb3VudCA9PSBrUmVzdWx0Lmxlbmd0aCAtIDEpIGtleXNDb3VudCsrO1xuICAgICAgICAgICAgfSk7XG4gICAgICAgICAgfSk7XG4gICAgICAgICAgcmVzb2x2ZSh7XG4gICAgICAgICAgICBkZWxldGVkOiB0cnVlXG4gICAgICAgICAgfSk7XG4gICAgICAgIH0pO1xuXG4gICAgICAgIC8vd2UgYWxzbyBuZWVkIHRvIHJlbW92ZSBmcm9tIGFueSBzZXRzXG4gICAgICB9KTtcbiAgICB9KTtcbiAgfVxuICByZW1vdmVQYWNrYWdlQnlJZChpZCkge1xuICAgIHZhciBtc2VhcmNoID0gdGhpcy5teVNlYXJjaDtcbiAgICByZXR1cm4gbmV3IFByb21pc2UoKHJlc29sdmUsIHJlamVjdCkgPT4ge1xuICAgICAgXG4gICAgICBwYWNrYWdlSW5kZXguZGVsRG9jdW1lbnQoUEtHX0lEWCxpZCwoZXJyLHJlc3BvbnNlKT0+e1xuICAgICAgICBpZiAoZXJyKVxuICAgICAgICAgIGNvbnNvbGUubG9nKGVycik7IFxuICAgICAgICBjb25zb2xlLmxvZyhyZXNwb25zZSk7IFxuICAgICAgICByZXNvbHZlKHtkZWxldGVkOnRydWV9KVxuICAgICAgfSlcbiAgICAgIFxuICAgICAgICBcbiAgICAgIFxuICAgIH0pO1xuICB9XG4gIHN0b3JlUGFja2FnZUZvclBpY2t1cCh0cmFja2luZ05vLGJpbil7XG4gICAgdmFyIHNlYXJjaGVyID0gdGhpcy5teVNlYXJjaDtcbiAgICByZXR1cm4gbmV3IFByb21pc2UoKHJlc29sdmUscmVqZWN0KT0+e1xuICAgICAgIGxyZWRpcy5obXNldChQS0dfUFJFRklYK3RyYWNraW5nTm8se3N0YXR1czo0LGxvY2F0aW9uOmJpbn0pLnRoZW4oKHJlc3VsdCk9PntcbiAgICAgICAgIGxyZWRpcy5nZXRQYWNrYWdlKHRyYWNraW5nTm8pLnRoZW4oKHBrZyk9PntcbiAgICAgICAgICBhZGRQYWNrYWdlVG9JbmRleCh0cmFja2luZ05vLHNlYXJjaGVyKSA7IFxuICAgICAgICAgIHJlc29sdmUocGtnKTsgICBcbiAgICAgICAgIH0pO1xuICAgICAgIH0pIFxuICAgIH0pOyBcbiAgfVxuICB1cGRhdGVQYWNrYWdlSW5kZXgodHJhY2tpbmcpe1xuICAgICAgcmV0dXJuIG5ldyBQcm9taXNlKChyZXNvbHZlLHJlamVjdCk9PntcbiAgICAgICAgICB2YXIgbXNlYXJjaCA9IHRoaXMubXlTZWFyY2g7IFxuICAgICAgICAgIGFkZFBhY2thZ2VUb0luZGV4KHRyYWNraW5nLG1zZWFyY2gpOyBcbiAgICAgICAgIHJlc29sdmUoeyd1cGRhdGVkJzp0cnVlfSk7XG4gICAgICB9KVxuICB9XG4gIGdldEN1c3RvbWVyUGFja2FnZXMoc2t5Ym94KSB7fVxuXG5cbiAgLy9ubyBtb3JlIHNreWJveFxuICBnZXRNYW5pZmVzdFBhY2thZ2VzQnlTdGF0dXMobWlkLHN0YXR1cykge1xuICAgICAgcmV0dXJuIG5ldyBQcm9taXNlKChyZXNvbHZlLHJlamVjdCk9PntcbiAgICAgICAgICBjb25zb2xlLmxvZyhgQG1pZDpbJHttaWR9ICR7bWlkfV1gKVxuICAgICAgICB0aGlzLm15U2VhcmNoLnNlYXJjaChcbiAgICAgICAgICAgIGBAbWlkOlske21pZH0gJHttaWR9XWAsXG4gICAgICAgICAgICB7IG9mZnNldDogMCwgbnVtYmVyT2ZSZXN1bHRzOiA1MDAwIH0sXG4gICAgICAgICAgICAoZXJyLCBkYXRhKSA9PiB7XG4gICAgICAgICAgICAgIHZhciBwYWNrYWdlcyA9IFtdO1xuICAgICAgICAgICAgICBjb25zb2xlLmxvZyhkYXRhKTtcbiAgICAgICAgICAgICAgZGF0YS5yZXN1bHRzLmZvckVhY2goZWxlbWVudCA9PiB7XG5cbiAgICAgICAgICAgICAgICBwYWNrYWdlcy5wdXNoKGVsZW1lbnQuZG9jKTtcbiAgICAgICAgICAgICAgICByZXNvbHZlKHBhY2thZ2VzKTsgICAgICAgICAgICAgICAgIFxuICAgICAgICAgICAgfSk7XG4gICAgICAgIH0pO1xuICAgICAgfSk7XG4gIFxuICB9ICAgXG4gIFxuICAvLyNyZWdpb24gUGFrY2FnZSBGaWx0ZXJzICBcbiAgZ2V0UGFja2FnZXNOYXNXYXJlaG91c2UoaXNOb0RvYyxjb21wYW55KXtcbiAgICB2YXIgc3J2ID0gdGhpczsgXG4gICAgcmV0dXJuIG5ldyBQcm9taXNlKChyZXNvbHZlLHJlamVjdCk9PntcbiAgICAgICAgcGFja2FnZUluZGV4LnNlYXJjaChgQHN0YXR1czpbNCA0XSBAY29tcGFueToke2NvbXBhbnl9IEBoYXNEb2NzOlske2lzTm9Eb2N9ICR7aXNOb0RvY31dYCx7fSwoZXJyLHJlcGx5KT0+e1xuICAgICAgICAgIGNvbnNvbGUubG9nKHJlcGx5LnJlc3VsdHMpOyBcbiAgICAgICAgICBQcm9taXNlLmFsbChyZXBseS5yZXN1bHRzLm1hcChwa2cgPT4gc3J2LmdldFBhY2thZ2VCeURvY0lkKHBrZy5kb2NJZCkpKS50aGVuKHBhY2thZ2VzPT57XG4gICAgICAgICAgICByZXNvbHZlKHBhY2thZ2VzKTsgXG4gICAgICAgICAgfSlcblxuICAgICAgICB9KVxuICAgIH0pXG4gIH1cblxuICAvLyNlbmRyZWdpb25cbiAgXG5cbiAgIC8vI3JlZ2lvbiBNYW5pZmVzdCBQYWNrYWdlIEZ1bmN0aW9ucyBcblxuICAgYWRkVG9GbGlnaHQoYWN0aW9uKXtcbiAgICAgdmFyIHNydiA9IHRoaXM7IFxuICAgIHJldHVybiBuZXcgUHJvbWlzZSgocmVzb2x2ZSxyZWplY3QpPT57XG4gICAgICB2YXIgcGFja2FnZU5vID0gZ2V0UGFja2FnZUlkRnJvbUJhckNvZGUoYWN0aW9uLmJhcmNvZGUpOyBcbiAgICAgIGNvbnNvbGUubG9nKGFjdGlvbik7IFxuICAgICAgdGhpcy5teVNlYXJjaC51cGRhdGUocGFja2FnZU5vLHttaWQ6YWN0aW9uLm1pZCAsIHN0YXR1czogMiwgbG9jYXRpb246XCJMb2FkZWQgb24gQWlyQ3JhZnRcIixjb21wYXJ0bWVudDphY3Rpb24uY29tcGFydG1lbnR9LChlcnIscmVzdWx0KT0+e1xuICAgICAgICBpZihlcnIpXG4gICAgICAgICAgcmVzb2x2ZSh7YWRkZWQ6ZmFsc2V9KVxuICAgICAgICBzcnYuZ2V0RmxpZ2h0Q29tcGFydG1lbnRXZWlnaHQoYWN0aW9uLm1pZCxhY3Rpb24uY29tcGFydG1lbnQpLnRoZW4oZnJlc3VsdD0+e1xuICAgICAgICAgIGZyZXN1bHQuYWRkZWQgPSB0cnVlOyBcbiAgICAgICAgICByZXNvbHZlKGZyZXN1bHQpXG4gICAgICAgIH0pXG4gICAgICAgXG4gICAgICB9KVxuICAgICAgICBcbiAgICB9KVxuICAgfVxuICAgLy9nZXQgdGhlIGNvbXBhcnRtZW50IHdlaWdodCBcbiAgIGdldEZsaWdodENvbXBhcnRtZW50V2VpZ2h0KG1pZCxjb21wYXJ0bWVudCl7XG4gICAgIHJldHVybiBuZXcgUHJvbWlzZSgocmVzb2x2ZSxyZWplY3QpPT57XG4gICAgICBcbiAgICAgIHRoaXMubXlTZWFyY2guYWdncmVnYXRlKGBAbWlkOlske21pZH0gJHttaWR9XSBAY29tcGFydG1lbnQ6JHtjb21wYXJ0bWVudH1gLCB7fSwoZXJyLHJlcGx5KT0+e1xuICAgICAgICAgaWYgKGVycilcbiAgICAgICAgIGNvbnNvbGUubG9nKGVycik7IFxuICAgICAgICAgY29uc29sZS5sb2cocmVwbHksXCJUT1RBTCBTRUNUSU9OIFdlaWdodFwiKVxuICAgICAgICAgaWYgKHJlcGx5WzFdKXtcbiAgICAgICAgICAgdmFyIHJlc3VsdCA9IHJlcGx5WzFdO1xuICAgICAgICAgICB2YXIgY29tcGFydG1lbnQgPSByZXN1bHRbM107IFxuICAgICAgICAgICB2YXIgd2VpZ2h0ID0gcmVzdWx0WzVdOyBcbiAgICAgICAgIH1cbiAgICAgICAgIHJlc29sdmUoe2NvbXBhcnRtZW50OmNvbXBhcnRtZW50LHdlaWdodDp3ZWlnaHR9KVxuICAgICAgIH0pXG4gICAgIH0pXG4gICB9XG4gICAvL3JlbW92ZSBmcm9tIGZsaWdodCBcbiAgIHJlbW92ZUZyb21GbGlnaHQoYWN0aW9uKXtcbiAgICByZXR1cm4gbmV3IFByb21pc2UoKHJlc29sdmUscmVqZWN0KT0+e1xuICAgICAgICB2YXIgcGFja2FnZU5vID0gZ2V0UGFja2FnZUlkRnJvbUJhckNvZGUoYWN0aW9uLmJhcmNvZGUpOyAgIFxuICAgICAgICB0aGlzLm15U2VhcmNoLnVwZGF0ZShwYWNrYWdlTm8se21pZDphY3Rpb24ubWlkfSwoZXJyLHJlc3VsdCk9PntcbiAgICAgICAgaWYoZXJyKVxuICAgICAgICAgICAgcmVzb2x2ZSh7cmVtb3ZlZDpmYWxzZX0pXG4gICAgICAgICAgXG4gICAgICAgICAgcmVzb2x2ZSh7cmVtb3ZlZDp0cnVlfSlcbiAgICAgICAgfSlcbiAgICB9KVxuICAgfVxuICAgcmVjRnJvbVRydWNrKHRyYWNraW5nTm8sdXNlcm5hbWUsc2hpcG1lbnRJZCl7XG4gICAgIHJldHVybiBuZXcgUHJvbWlzZSgocmVzb2x2ZSxyZWplY3QpPT57XG4gICAgICAgIGRhdGFDb250ZXh0LnJlZGlzQ2xpZW50LnNhZGQoXCJzaGlwbWVudDppZDpcIitzaGlwbWVudElkLHRyYWNraW5nTm8sKGVycixyZXBseSk9PntcbiAgICAgICAgICBkYXRhQ29udGV4dC5yZWRpc0NsaWVudC5zZXQoUkVDX1BLRyt0cmFja2luZ05vLG1vbWVudCgpLnVuaXgoKSwgKGVycixyZXN1bHQpPT57XG4gICAgICAgICAgICBpZiAoZXJyKSByZXNvbHZlKHtzYXZlZDpmYWxzZX0pXG4gICAgICAgICAgICAvL3NoaXBtZW50IGNvdW50IFxuICAgICAgICAgICAgdmFyIHNoaXBtZW50Q291bnQgPSAxO1xuICAgICAgICAgICAgZGF0YUNvbnRleHQucmVkaXNDbGllbnQuc2NhcmQoXCJzaGlwbWVudDppZDpcIitzaGlwbWVudElkLChlcnIsY2FyZCk9PntcbiAgICAgICAgICAgICAgcmVzb2x2ZSh7c2F2ZWQ6dHJ1ZSxwa2dDb3VudDpjYXJkfSlcbiAgICAgICAgICAgIH0pO1xuICAgICAgICAgICBcbiAgICAgICAgICB9KVxuICAgICAgICB9KVxuICAgICAgICBcbiAgICAgfSlcbiAgIH1cbiAgIHByb2Nzc2Vzc1BhY2thZ2UocGtnSWZubyx1c2VybmFtZSl7XG4gICAgdmFyIHNydiA9IHRoaXM7ICBcbiAgICByZXR1cm4gbmV3IFByb21pc2UoKHJlc29sdmUscmVqZWN0KT0+e1xuICAgICAgIC8vd2UgYWxzbyBuZWVkIHRvIHNldCB0aGUgd2FyZWhvdXNlIGxvY2F0aW9uIGhlcmUgXG4gICAgICAgZGF0YUNvbnRleHQucmVkaXNDbGllbnQuaG1zZXQoXCJmZWVzOmF3YjpcIitwa2dJZm5vLmF3Yixwa2dJZm5vLChlcnIscmVzdWx0KT0+e1xuICAgICAgICAgaWYgKGVycilcbiAgICAgICAgICBjb25zb2xlLmxvZyhlcnIpOyBcblxuXG5cbiAgICAgICAgICBjb25zb2xlLmxvZyhyZXN1bHQpOyBcbiAgICAgICAgICBjb25zb2xlLmxvZyhcInByaW50OmZlZXM6XCIrdXNlcm5hbWUsdXNlcm5hbWUpOyBcbiAgICAgICAgIGRhdGFDb250ZXh0LnJlZGlzQ2xpZW50LnB1Ymxpc2goXCJwcmludDpmZWVzOlwiK3VzZXJuYW1lLHBrZ0lmbm8uYXdiKTsgXG4gICAgICAgICBcbiAgICAgICAgICBzcnYuZ2V0UGFja2FnZUJ5SWQocGtnSWZuby5iYXJjb2RlKS50aGVuKHBrZz0+e1xuICAgICAgICAgICAgZW1haWxTZXJ2aWNlLnNlbmROb0RvY3NFbWFpbChwa2cpXG4gICAgICAgICAgICBpZiAocGtnSWZuby5yZWZMb2Mpe1xuICAgICAgICAgICAgICBwa2cucGFja2FnZS53bG9jID0gcGtnSWZuby5yZWZMb2M7IFxuICAgICAgICAgICAgICBcbiAgICAgICAgICAgICAgICBwa2cucGFja2FnZS5oYXNEb2NzID0gcGtnSWZuby5oYXNEb2NzIDsgXG4gICAgICAgICAgICAgICAgcGtnLnBhY2thZ2Uuc3RhdHVzID0gNDsgXG5cbiAgICAgICAgICAgICAgICAvL3NldCB0aGVvbXBhbnkgXG4gICAgICAgICAgICAgICAgaWYgKE51bWJlcihwa2cuYXdiLmN1c3RvbWVyLnBtYikgPiA5MDAwKXtcbiAgICAgICAgICAgICAgICAgIHBrZy5wYWNrYWdlLmNvbXBhbnkgPSBcIjBcIlxuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICBlbHNlIFxuICAgICAgICAgICAgICAgICAgcGtnLnBhY2thZ2UuY29tcGFueSA9IFwiMVwiXG4gICAgICAgICAgICAgICAgY29uc29sZS5sb2coJ3VwZGF0aW5nIHdpdGggJyxwa2cucGFja2FnZSlcbiAgICAgICAgICAgICAgICBcbiAgICAgICAgICAgICAgcGFja2FnZUluZGV4LnVwZGF0ZShwa2cucGFja2FnZS5pZCxwa2cucGFja2FnZSwoZXJyUmVzcCxyZXNwb25zZSk9PntcbiAgICAgICAgICAgICAgICBcbiAgICAgICAgICAgICAgICBpZihlcnJSZXNwKVxuICAgICAgICAgICAgICAgIGNvbnNvbGUubG9nKGVyclJlc3ApXG4gICAgICAgICAgICAgIH0pXG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBcbiAgICAgICAgICB9KVxuICAgICAgICAgcmVzb2x2ZSh7c2VudDp0cnVlfSlcbiAgICAgICB9KVxuICAgICB9KVxuICAgfVxuICAgcmVjRnJvbVBsYW5lTmFzKGJhcmNvZGUpe1xuICAgICByZXR1cm4gbmV3IFByb21pc2UoKHJlc29sdmUscmVqZWN0KT0+e1xuICAgICAgIHZhciBzcnYgPSB0aGlzIDsgXG4gICAgICAgdmFyIHBrZ0lkID0gZ2V0UGFja2FnZUlkRnJvbUJhckNvZGUoYmFyY29kZSk7IFxuICAgICAgICBzcnYubXlTZWFyY2guZ2V0RG9jKHBrZ0lkLChlcnIscGtnKT0+e1xuICAgICAgICAgICAgcGtnLmRvYy5zdGF0dXMgPSA0OyBcbiAgICAgICAgICAgIHBrZy5kb2MubG9jYXRpb24gID0gXCJXYXJlaG91c2UgTkFTXCI7IFxuICAgICAgICAgICAgaWYgKHBrZy5kb2MuaGFzRG9jcyA9PSBcInVuZGVmaW5lZFwiKVxuICAgICAgICAgICAgICBwa2cuZG9jLmhhc0RvY3MgPSAwIDsgXG4gICAgICAgICAgICBzcnYubXlTZWFyY2gudXBkYXRlKHBrZ0lkLHBrZy5kb2MsKGVycix1cGRhdGVSZXN1bHQpPT57XG4gICAgICAgICAgICAgIFxuICAgICAgICAgICAgICBpZihlcnIpXG4gICAgICAgICAgICAgeyAgXG4gICAgICAgICAgICAgICBjb25zb2xlLmxvZyhlcnIpXG4gICAgICAgICAgICAgIHJlamVjdCh7dXBkYXRlZDpmYWxzZX0pIFxuICAgICAgICAgICAgIH0gXG4gICAgICAgICAgICAgIHJlc29sdmUoe3VwZGF0ZWQ6dHJ1ZX0pXG4gICAgICAgICAgICB9KVxuICAgICAgICB9KVxuICAgICB9KVxuICAgfVxuXG4gICAvLyNlbmRyZWdpb25cbn1cblxuZnVuY3Rpb24gZ2V0UGFja2FnZUlkRnJvbUJhckNvZGUoYmFyQ29kZVZhbHVlKXtcbiAgdmFyIHBhcnRzID0gYmFyQ29kZVZhbHVlLnNwbGl0KFwiLVwiKTsgXG4gIGlmIChwYXJ0cy5sZW5ndGggPT0gMylcbiAgICBpZiAodHlwZW9mIHBhcnRzWzJdICE9IFwidW5kZWZpbmVkXCIpXG4gICAgcmV0dXJuIHBhcnRzWzJdLnRyaW0oKTsgXG4gIHJldHVybiBcIlwiXG59XG4iXX0=
