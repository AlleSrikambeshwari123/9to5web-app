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
//# sourceMappingURL=data:application/json;charset=utf8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIlJlZGlzU2VydmljZXMvUGFja2FnZVNlcnZpY2UuZXM2Il0sIm5hbWVzIjpbImVtYWlsU2VydmljZSIsInJlcXVpcmUiLCJyZWRpcyIsImxyZWRpcyIsIm1vbWVudCIsInJlZGlzU2VhcmNoIiwiZnMiLCJQYWNrYWdlVXRpbCIsIlBhY2thZ2VVdGlsaXR5IiwicGFja2FnZVV0aWwiLCJQS0dfSURYIiwiUEtHX0lEX0NPVU5URVIiLCJkYXRhQ29udGV4dCIsIlBLR19QUkVGSVgiLCJBV0JfSUQiLCJJTkRFWF9BV0IiLCJSRUNfUEtHIiwidW5pcUlkIiwiQ3VzdG9tZXJTZXJ2aWNlIiwiY3VzdG9tZXJTZXJ2aWNlIiwiUEtHX1NUQVRVUyIsIklOREVYX1NISVBQRVIiLCJhZGRDb21tYW5kIiwiYXdiSW5kZXgiLCJjbGllbnRPcHRpb25zIiwic2VhcmNoQ2xpZW50RGV0YWlscyIsInBhY2thZ2VJbmRleCIsInNoaXBwZXJJbmRleCIsImdldFBhY2thZ2VWb2x1bW5lIiwibVBhY2thZ2UiLCJjcmVhdGVEb2N1bWVudCIsInRQYWNrYWdlIiwicGFja2FnZURvY3VtZW50IiwiaWQiLCJ0cmFja2luZ05vIiwic2t5Ym94IiwiZGF0ZVJlY2lldmVkIiwidW5peCIsImF3YiIsIm1pZCIsInZvbHVtZSIsIndlaWdodCIsInBpZWNlcyIsImN1c3RvbWVyIiwic2hpcHBlciIsImRlc2NyaXB0aW9uIiwiZGltZW5zaW9ucyIsImNhcnJpZXIiLCJzdGF0dXMiLCJ2YWx1ZSIsImNvbnNvbGUiLCJsb2ciLCJzZXRQYWNrYWdlSW5UcmFuc2l0Iiwia2V5cyIsIm1zZWFyY2hlciIsIlByb21pc2UiLCJyZXNvbHZlIiwicmVqZWN0IiwiYmF0Y2hlciIsImNsaWVudCIsImJhdGNoIiwiZm9yRWFjaCIsImxvY2F0aW9uIiwiZWxlbWVudCIsImhtc2V0IiwiZXhlYyIsImVyciIsInJlc3VsdCIsImFkZFBhY2thZ2VUb0luZGV4IiwiZ2V0UGFja2FnZSIsInRoZW4iLCJkZWxEb2N1bWVudCIsInBhY2siLCJkb25lIiwiZG9jdW1lbnQiLCJhZGQiLCJQYWNrYWdlU2VydmljZSIsInNldHVwSW5kZXgiLCJteVNlYXJjaCIsInJlZGlzQ2xpZW50IiwiZXhpc3RzIiwic2V0IiwiaW5pdFJlc3VsdCIsImluY3IiLCJuZXdJZCIsInRvU3RyaW5nIiwidXBkYXRlZF9ieSIsInVzZXJuYW1lIiwiZGF0ZV91cGRhdGVkIiwidXBkYXRlIiwiZXJyMSIsImF3YlJlcyIsInNhdmVkIiwicmVwbHkiLCJpbnZvaWNlIiwiaGFzRG9jcyIsImNyZWF0ZWRfYnkiLCJkYXRlQ3JlYXRlZCIsInNlYXJjaCIsIm51bWJlck9mUmVzdWx0cyIsIm9mZnNldCIsInBhY2thZ2VzIiwidG90YWxSZXN1bHRzIiwicmVzdWx0cyIsInBhY2thZ2UxIiwiZG9jIiwiTnVtYmVyIiwiZGF0YSIsInNydiIsInBhY2thZ2VsaXN0IiwiY291bnQiLCJsZW5ndGgiLCJzdWJzdHJpbmciLCJwdXNoIiwic29ydEJ5IiwiYXdicyIsImF3Ykxpc3QiLCJhbGwiLCJtYXAiLCJnZXRDdXN0b21lciIsImN1c3RvbWVySWQiLCJnZXRBd2JPdmVydmlldyIsImN1c3RvbWVycyIsImkiLCJmb3JtYXQiLCJjb25zaWduZWUiLCJuYW1lIiwiZGV0YWlscyIsInBtYiIsImNhdGNoIiwiZ2V0RG9jIiwiZ2V0QXdiRGV0YWlscyIsInRyYWNraW5nTnVtYmVyIiwibG9jYXRpb25faWQiLCJwYWNrYWdlUmVzdWx0IiwibmV3UGFja2FnZSIsInNyZXN1bHQiLCJib3hTaXplIiwiYXdiSW5mbyIsImlzU2VkIiwiaW52b2ljZU51bWJlciIsImhhem1hdCIsInNhdmVBd2IiLCJjUGFja2FnZSIsImF3YlJlc3VsdCIsImlzQ29uc29saWRhdGVkIiwic2F2ZVBhY2thZ2VUb0F3YiIsInBrZ0JhdGNoIiwic2FkZCIsInBrZ1Jlc3VsdCIsInBrZyIsImhtZ2V0IiwiZ2V0UGFja2FnZUlkRnJvbUJhckNvZGUiLCJ0b3RhbFdlaWdodCIsImlzTmFOIiwiYm9keSIsInJlcGxhY2UiLCJ0cmltIiwidHJhY2tpbmciLCJyZXNwb25zZSIsImluZGV4UGFja2FnZSIsImRvY1Jlc3VsdCIsInBhZ2UiLCJwYWdlU2l6ZSIsImJhcmNvZGUiLCJwa2dJZCIsImdldEF3YiIsImdldFNoaXBwZXIiLCJhd2JpbmZvIiwicGFja2FnZSIsImNoZWNraW4iLCJsb2NhdGlvbklkIiwiZ2V0UGFja2FnZUJ5RG9jSWQiLCJzZW5kQXRTdG9yZUVtYWlsIiwiaW5mbyIsInVwZGF0ZWQiLCJtc2VhcmNoIiwib2xkRG9jSWQiLCJkb2NJZCIsInVwZGF0ZWRQYWNrYWdlcyIsInBhY2thZ2VJZCIsIm1hbmlmZXN0IiwibWFuaWZlc3RLZXkiLCJkZWwiLCJkZWNyIiwiZ2V0S2V5cyIsImtleXNDb3VudCIsImtSZXN1bHQiLCJzcmVtIiwiclJlc3VsdCIsImRlbGV0ZWQiLCJiaW4iLCJzZWFyY2hlciIsImlzTm9Eb2MiLCJjb21wYW55IiwiYWN0aW9uIiwicGFja2FnZU5vIiwiY29tcGFydG1lbnQiLCJhZGRlZCIsImdldEZsaWdodENvbXBhcnRtZW50V2VpZ2h0IiwiZnJlc3VsdCIsImFnZ3JlZ2F0ZSIsInJlbW92ZWQiLCJzaGlwbWVudElkIiwic2hpcG1lbnRDb3VudCIsInNjYXJkIiwiY2FyZCIsInBrZ0NvdW50IiwicGtnSWZubyIsInB1Ymxpc2giLCJnZXRQYWNrYWdlQnlJZCIsInNlbmROb0RvY3NFbWFpbCIsInJlZkxvYyIsIndsb2MiLCJlcnJSZXNwIiwic2VudCIsInVwZGF0ZVJlc3VsdCIsImJhckNvZGVWYWx1ZSIsInBhcnRzIiwic3BsaXQiXSwibWFwcGluZ3MiOiI7Ozs7Ozs7OztBQUFBOztBQUNBOzs7Ozs7QUFFQSxJQUFJQSxlQUFlQyxRQUFRLHNCQUFSLENBQW5CO0FBQ0EsSUFBSUMsUUFBUUQsUUFBUSxPQUFSLENBQVo7QUFDQSxJQUFJRSxTQUFTRixRQUFRLGVBQVIsQ0FBYjtBQUNBLElBQUlHLFNBQVNILFFBQVEsUUFBUixDQUFiO0FBQ0EsSUFBSUksY0FBY0osUUFBUSxxQkFB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QixzQkFBUUMsR0FBUixDQUFZZSxHQUFaO0FBQ0RULHFCQUFPLEVBQUNzSCxTQUFRLEtBQVQsRUFBUDtBQUNBO0FBQ0F2SCxvQkFBUSxFQUFDdUgsU0FBUSxJQUFULEVBQVI7QUFDRCxXQVJEO0FBU0gsU0FkRDtBQWVGLE9BbEJNLENBQVA7QUFtQkQ7O0FBRUQ7Ozs7Ozs7QUFHSCxTQUFTdkIsdUJBQVQsQ0FBaUNpRSxZQUFqQyxFQUE4QztBQUM1QyxNQUFJQyxRQUFRRCxhQUFhRSxLQUFiLENBQW1CLEdBQW5CLENBQVo7QUFDQSxNQUFJRCxNQUFNM0csTUFBTixJQUFnQixDQUFwQixFQUNFLElBQUksT0FBTzJHLE1BQU0sQ0FBTixDQUFQLElBQW1CLFdBQXZCLEVBQ0EsT0FBT0EsTUFBTSxDQUFOLEVBQVM3RCxJQUFULEVBQVA7QUFDRixTQUFPLEVBQVA7QUFDRCIsImZpbGUiOiJSZWRpc1NlcnZpY2VzL1BhY2thZ2VTZXJ2aWNlLmpzIiwic291cmNlc0NvbnRlbnQiOlsiaW1wb3J0IHsgY3B1cyB9IGZyb20gXCJvc1wiO1xuaW1wb3J0IHsgcHJvbWlzZXMgfSBmcm9tIFwiZG5zXCI7XG5cbnZhciBlbWFpbFNlcnZpY2UgPSByZXF1aXJlKFwiLi4vVXRpbC9FbWFpbFNlcnZpY2VcIilcbnZhciByZWRpcyA9IHJlcXVpcmUoXCJyZWRpc1wiKTtcbnZhciBscmVkaXMgPSByZXF1aXJlKFwiLi9yZWRpcy1sb2NhbFwiKTtcbnZhciBtb21lbnQgPSByZXF1aXJlKFwibW9tZW50XCIpO1xudmFyIHJlZGlzU2VhcmNoID0gcmVxdWlyZShcIi4uL3JlZGlzZWFyY2hjbGllbnRcIik7XG52YXIgZnMgPSByZXF1aXJlKFwiZnNcIik7XG52YXIgbW9tZW50ID0gcmVxdWlyZSgnbW9tZW50JylcbnZhciBQYWNrYWdlVXRpbCA9IHJlcXVpcmUoXCIuLi9VdGlsL3BhY2thZ2V1dGlsXCIpLlBhY2thZ2VVdGlsaXR5O1xudmFyIHBhY2thZ2VVdGlsID0gbmV3IFBhY2thZ2VVdGlsKCk7XG5jb25zdCBQS0dfSURYID0gXCJpbmRleDpwYWNrYWdlc1wiO1xuY29uc3QgUEtHX0lEX0NPVU5URVIgPSBcInBhY2thZ2U6aWRcIjtcbnZhciBkYXRhQ29udGV4dCA9IHJlcXVpcmUoJy4vZGF0YUNvbnRleHQnKVxuY29uc3QgUEtHX1BSRUZJWCA9IFwicGFja2FnZXM6XCI7XG5jb25zdCBBV0JfSUQgPSBcImF3YjppZFwiXG5jb25zdCBJTkRFWF9BV0IgPSBcImluZGV4OmF3YlwiXG5jb25zdCBSRUNfUEtHID0gXCJwa2c6cmVjOlwiXG52YXIgdW5pcUlkID0gcmVxdWlyZShcInVuaXFpZFwiKTsgXG52YXIgQ3VzdG9tZXJTZXJ2aWNlID0gcmVxdWlyZSgnLi9DdXN0b21lclNlcnZpY2UnKS5DdXN0b21lclNlcnZpY2U7IFxudmFyIGN1c3RvbWVyU2VydmljZSA9IG5ldyBDdXN0b21lclNlcnZpY2UoKVxuY29uc3QgUEtHX1NUQVRVUyA9IHsgXG4gIDEgOiBcIlJlY2VpdmVkXCIsXG4gIDI6IFwiTG9hZGVkIG9uIEFpckNyYWZ0XCIsXG4gIDM6IFwiSW4gVHJhbnNpdFwiLFxuICA0OiBcIlJlY2lldmVkIGluIE5BU1wiLFxuICA1OiBcIlJlYWR5IGZvciBQaWNrdXAgLyBEZWxpdmVyeVwiLFxuICA2OiBcIkRlbGl2ZXJlZFwiXG5cbn07IFxuY29uc3QgSU5ERVhfU0hJUFBFUiA9IFwiaW5kZXg6c2hpcHBlclwiXG5yZWRpcy5hZGRDb21tYW5kKFwiZnQuYWdncmVnYXRlXCIpXG5jb25zdCBhd2JJbmRleCA9IHJlZGlzU2VhcmNoKHJlZGlzLCBJTkRFWF9BV0IsIHtcbiAgY2xpZW50T3B0aW9uczogbHJlZGlzLnNlYXJjaENsaWVudERldGFpbHNcbn0pO1xuY29uc3QgcGFja2FnZUluZGV4ID0gcmVkaXNTZWFyY2gocmVkaXMsIFBLR19JRFgsIHtcbiAgY2xpZW50T3B0aW9uczogbHJlZGlzLnNlYXJjaENsaWVudERldGFpbHNcbn0pO1xuY29uc3Qgc2hpcHBlckluZGV4ID0gcmVkaXNTZWFyY2gocmVkaXMsIElOREVYX1NISVBQRVIsIHtcbiAgY2xpZW50T3B0aW9uczogbHJlZGlzLnNlYXJjaENsaWVudERldGFpbHNcbn0pO1xuZnVuY3Rpb24gZ2V0UGFja2FnZVZvbHVtbmUobVBhY2thZ2Upe1xuXG4gIHJldHVybiAwOyBcbn1cbmZ1bmN0aW9uIGNyZWF0ZURvY3VtZW50KHRQYWNrYWdlKSB7XG4gIHZhciBwYWNrYWdlRG9jdW1lbnQgPSB7XG4gICAgaWQ6dFBhY2thZ2UuaWQsXG4gICAgdHJhY2tpbmdObzogdFBhY2thZ2UudHJhY2tpbmdObyxcbiAgICBza3lib3g6IHRQYWNrYWdlLnNreWJveCxcbiAgICBkYXRlUmVjaWV2ZWQgOiBtb21lbnQoKS51bml4KCksIFxuICAgIGF3YjowLCBcbiAgICBtaWQ6MCxcbiAgICB2b2x1bWU6IGdldFBhY2thZ2VWb2x1bW5lKHRQYWNrYWdlKSxcbiAgICB3ZWlnaHQ6dFBhY2thZ2Uud2VpZ2h0LFxuICAgIHBpZWNlczp0UGFja2FnZS5waWVjZXMsXG4gICAgY3VzdG9tZXI6IHRQYWNrYWdlLmN1c3RvbWVyLFxuICAgIHNoaXBwZXI6IHRQYWNrYWdlLnNoaXBwZXIsXG4gICAgZGVzY3JpcHRpb246IHRQYWNrYWdlLmRlc2NyaXB0aW9uLFxuICAgIGRpbWVuc2lvbnM6dFBhY2thZ2UuZGltZW5zaW9ucyxcbiAgICBjYXJyaWVyOnRQYWNrYWdlLmNhcnJpZXIsXG4gICAgLy9za3lib3hWOiB0UGFja2FnZS5za3lib3gsIGFkZCBkaW1lbmlvbiBcbiAgICBzdGF0dXM6IHRQYWNrYWdlLnN0YXR1cyxcbiAgICBtaWQ6IHRQYWNrYWdlLm1pZCxcbiAgICB2YWx1ZTogdFBhY2thZ2UudmFsdWUsXG4gICAgXG4gIH07XG4gIGNvbnNvbGUubG9nKFwiYWJvdXQgdG8gYWRkIHRoZSBwYWNrYWdlIHRvIHRoZSBpbmRleFwiKTtcbiAgcmV0dXJuIHBhY2thZ2VEb2N1bWVudDtcbn1cbmZ1bmN0aW9uIHNldFBhY2thZ2VJblRyYW5zaXQoa2V5cywgbXNlYXJjaGVyKSB7XG4gIHJldHVybiBuZXcgUHJvbWlzZSgocmVzb2x2ZSwgcmVqZWN0KSA9PiB7XG4gICAgdmFyIGJhdGNoZXIgPSBtc2VhcmNoZXIuY2xpZW50LmJhdGNoKCk7XG4gICAga2V5cy5mb3JFYWNoKGVsZW1lbnQgPT4ge1xuICAgICAgdmFyIHZhbHVlID0ge1xuICAgICAgICBzdGF0dXM6IDIsXG4gICAgICAgIGxvY2F0aW9uOiBcIkluIFRyYW5zaXRcIlxuICAgICAgfTtcbiAgICAgIGNvbnNvbGUubG9nKGVsZW1lbnQgKyBcImlzIHRoZSBlbGVtZW50XCIpO1xuXG4gICAgICBiYXRjaGVyLmhtc2V0KFBLR19QUkVGSVggKyBlbGVtZW50LCB2YWx1ZSk7XG4gICAgfSk7XG4gICAgYmF0Y2hlci5leGVjKChlcnIsIHJlc3VsdCkgPT4ge1xuICAgICAgY29uc29sZS5sb2cocmVzdWx0KTtcbiAgICAgIC8vcmVhZGQgdGhlIGRvY3VtZW50cyBoZXJlXG4gICAgICBrZXlzLmZvckVhY2goZWxlbWVudCA9PiB7XG4gICAgICAgIGFkZFBhY2thZ2VUb0luZGV4KGVsZW1lbnQsIG1zZWFyY2hlcik7XG4gICAgICB9KTtcbiAgICAgIHJlc29sdmUocmVzdWx0KTtcbiAgICB9KTtcbiAgfSk7XG59XG5cbmZ1bmN0aW9uIGFkZFBhY2thZ2VUb0luZGV4KHRyYWNraW5nTm8sIG1zZWFyY2hlcikge1xuICBscmVkaXMuZ2V0UGFja2FnZSh0cmFja2luZ05vKS50aGVuKHBhY2sgPT4ge1xuICAgIG1zZWFyY2hlci5kZWxEb2N1bWVudChQS0dfSURYLCBgJHtwYWNrLm1pZH0tJHt0cmFja2luZ05vfWAsIChlcnIsIGRvbmUpID0+IHtcbiAgICAgIHZhciBkb2N1bWVudCA9IGNyZWF0ZURvY3VtZW50KHBhY2spO1xuICAgICAgY29uc29sZS5sb2coXCJyZWFkZGluZyBwYWNrYWdlIHRvIHRoZSBpbmRleCBsaWtlIGEgYm9zcyBcIiArIHRyYWNraW5nTm8pO1xuICAgICAgbXNlYXJjaGVyLmFkZChwYWNrLm1pZCArIFwiLVwiICsgcGFjay50cmFja2luZ05vLCBkb2N1bWVudCk7XG4gICAgfSk7XG4gIH0pO1xufVxuZXhwb3J0IGNsYXNzIFBhY2thZ2VTZXJ2aWNlIHtcbiAgY29uc3RydWN0b3IoKSB7XG4gICAgdGhpcy5zZXR1cEluZGV4KCk7XG4gIH1cbiAgc2V0dXBJbmRleCgpIHtcbiAgICB0aGlzLm15U2VhcmNoID0gcmVkaXNTZWFyY2gocmVkaXMsIFBLR19JRFgsIHtcbiAgICAgIGNsaWVudE9wdGlvbnM6IGxyZWRpcy5zZWFyY2hDbGllbnREZXRhaWxzXG4gICAgfSk7XG4gIH1cbiAgZ2V0TmV3QXdiKCl7XG4gICAgcmV0dXJuIG5ldyBQcm9taXNlKChyZXNvbHZlLHJlamVjdCk9PntcbiAgICAgIGRhdGFDb250ZXh0LnJlZGlzQ2xpZW50LmV4aXN0cyhBV0JfSUQsKGVycixyZXN1bHQpPT57XG4gICAgICAgIGNvbnNvbGUubG9nKHJlc3VsdCk7IFxuICAgICAgICBpZiAocmVzdWx0ICE9IFwiMVwiKXtcbiAgICAgICAgICBkYXRhQ29udGV4dC5yZWRpc0NsaWVudC5zZXQoQVdCX0lEID09IDEwMDAwMCwoZXJyLGluaXRSZXN1bHQpPT57XG4gICAgICAgICAgICBkYXRhQ29udGV4dC5yZWRpc0NsaWVudC5pbmNyKEFXQl9JRCwoZXJyLG5ld0lkKT0+e1xuICAgICAgICAgICAgICByZXNvbHZlKHthd2I6bmV3SWR9KVxuICAgICAgICAgICAgfSlcbiAgICAgICAgICB9KVxuICAgICAgICB9XG4gICAgICAgIGVsc2Uge1xuICAgICAgICAgIGRhdGFDb250ZXh0LnJlZGlzQ2xpZW50LmluY3IoQVdCX0lELChlcnIsbmV3SWQpPT57XG4gICAgICAgICAgICByZXNvbHZlKHthd2I6bmV3SWR9KVxuICAgICAgICAgIH0pXG4gICAgICAgIH1cbiAgICAgIH0pXG4gICAgfSk7XG4gIH1cbiAgc2F2ZUF3Yihhd2Ipe1xuICAgIHJldHVybiBuZXcgUHJvbWlzZSgocmVzb2x2ZSxyZWplY3QpPT57XG4gICAgICBjb25zb2xlLmxvZygnc2F2aW5nLi4uJyxhd2IsbW9tZW50KCkudG9TdHJpbmcoXCJoaDptbTpzc1wiKSlcbiAgICAgIGlmIChhd2IuaWQgIT1cIlwiKXtcbiAgICAgICAgYXdiLnVwZGF0ZWRfYnkgPSBhd2IudXNlcm5hbWU7IFxuICAgICAgICBhd2IuZGF0ZV91cGRhdGVkID0gbW9tZW50KCkudW5peCgpOyBcbiAgICAgICAgYXdiSW5kZXgudXBkYXRlKGF3Yi5pZCxhd2IsKGVycjEsYXdiUmVzKT0+e1xuICAgICAgICAgIGlmIChlcnIxKXtcbiAgICAgICAgICAgIGNvbnNvbGUubG9nKCdzYXZpbmcgZXJyJyxlcnIxKVxuICAgICAgICAgICAgcmVzb2x2ZSh7c2F2ZWQ6ZmFsc2V9KVxuICAgICAgICAgIH1cbiAgICAgICAgICByZXNvbHZlKHtzYXZlZDp0cnVlLCBpZDphd2IuaWR9KVxuICAgICAgICB9KVxuICAgICAgfVxuICAgICAgZWxzZXtcbiAgICAgIGRhdGFDb250ZXh0LnJlZGlzQ2xpZW50LmluY3IoQVdCX0lELChlcnIscmVwbHkpPT57XG4gICAgICAgIGF3Yi5pZCA9IHJlcGx5OyBcbiAgICAgICAgYXdiLnN0YXR1cyA9IDE7IFxuICAgICAgICBpZiAoYXdiLmludm9pY2Upe1xuICAgICAgICAgIGF3Yi5oYXNEb2NzID0gMVxuICAgICAgICAgIGNvbnNvbGUubG9nKFwiSEFTIERPQ0NDQ0NcIilcbiAgICAgICAgfVxuICAgICAgICBlbHNlIHtcbiAgICAgICAgICBhd2IuaGFzRG9jcyA9IDAgOyBcbiAgICAgICAgICBjb25zb2xlLmxvZyhcIkhBUyBOTyBET0NDQ0NDXCIpXG4gICAgICAgIH1cblxuICAgICAgICBhd2IuY3JlYXRlZF9ieSA9IGF3Yi51c2VybmFtZTsgXG4gICAgICAgIGRlbGV0ZSBhd2IudXNlcm5hbWU7XG4gICAgICAgIGF3Yi5kYXRlQ3JlYXRlZCA9IG1vbWVudCgpLnVuaXgoKTsgXG4gICAgICAgICAgYXdiSW5kZXguYWRkKGF3Yi5pZCxhd2IsKGVycjEsYXdiUmVzKT0+e1xuICAgICAgICAgICAgaWYgKGVycjEpe1xuICAgICAgICAgICAgICBjb25zb2xlLmxvZygnc2F2aW5nIGVycicsZXJyMSlcbiAgICAgICAgICAgICAgcmVzb2x2ZSh7c2F2ZWQ6ZmFsc2V9KVxuICAgICAgICAgICAgfVxuICAgICAgICAgICAgcmVzb2x2ZSh7c2F2ZWQ6dHJ1ZSwgaWQ6cmVwbHl9KVxuICAgICAgICAgIH0pXG4gICAgICB9KVxuICAgIH1cbiAgICAgIFxuICAgICAgXG4gICAgfSlcbiAgfVxuICBnZXRBd2JPdmVydmlldyhpZCl7XG4gICAgLy8gZ2V0IHRoZSBhd2IgcGFja2FnZXMgYW5kIGFkZCBldmVyeXRoaW5nIGluIFxuICAgIHJldHVybiBuZXcgUHJvbWlzZSgocmVzb2x2ZSxyZWplY3QpPT57XG4gICAgICBwYWNrYWdlSW5kZXguc2VhcmNoKGBAYXdiOlske2lkfSAke2lkfV1gLHtudW1iZXJPZlJlc3VsdHM6NTAwMCxvZmZzZXQ6MH0sKGVycixwYWNrYWdlcyk9PntcbiAgICAgICAgdmFyIHdlaWdodCA9IDAgOyBcbiAgICAgICAgdmFyIHBpZWNlcyA9IHBhY2thZ2VzLnRvdGFsUmVzdWx0czsgXG4gICAgICAgIHZhciBkZXNjcmlwdGlvbiA9IFwiXCJcbiAgICAgICAgcGFja2FnZXMucmVzdWx0cy5mb3JFYWNoKHBhY2thZ2UxID0+IHtcbiAgICAgICAgICBpZiAoZGVzY3JpcHRpb24gPT1cIlwiKVxuICAgICAgICAgICAgZGVzY3JpcHRpb24gPSBwYWNrYWdlMS5kb2MuZGVzY3JpcHRpb247IFxuICAgICAgICAgIHdlaWdodCArPSBOdW1iZXIocGFja2FnZTEuZG9jLndlaWdodClcbiAgICAgICAgfSk7XG4gICAgICAgIHZhciBkYXRhICA9IHt3ZWlnaHQ6d2VpZ2h0LGRlc2NyaXB0aW9uOmRlc2NyaXB0aW9uLHBpZWNlczpwaWVjZXN9XG4gICAgICAgIGNvbnNvbGUubG9nKGRhdGEsXCJBV0IgREVUQUlMU1wiKTsgXG4gICAgICAgIHJlc29sdmUoIGRhdGEpXG4gICAgICB9KVxuICAgIH0pXG4gICBcbiAgfVxuICBnZXRBd2JEZXRhaWxzKGlkKXtcbiAgICB2YXIgc3J2ID0gdGhpczsgXG4gICAgcmV0dXJuIG5ldyBQcm9taXNlKChyZXNvbHZlLHJlamVjdCk9PntcbiAgICAgIGNvbnNvbGUubG9nKGBAYXdiOlske2lkfSAke2lkfV1gKVxuICAgICBcbiAgICAgIHBhY2thZ2VJbmRleC5zZWFyY2goYEBhd2I6WyR7aWR9ICR7aWR9XWAse251bWJlck9mUmVzdWx0czo1MDAwLG9mZnNldDowfSwoZXJyLHBhY2thZ2VzKT0+e1xuICAgICAgICBpZiAoZXJyKVxuICAgICAgICAgY29uc29sZS5sb2coZXJyKVxuICAgICAgXG4gICAgICAgIHZhciAgcGFja2FnZWxpc3QgID0gW11cbiAgICAgICAgdmFyIGNvdW50ID0gMTsgXG4gICAgICAgIHBhY2thZ2VzLnJlc3VsdHMuZm9yRWFjaChwYWNrYWdlMSA9PiB7XG5cbiAgICAgICAgICBpZiAocGFja2FnZTEuZG9jLnRyYWNraW5nTm8ubGVuZ3RoID4gNyl7XG4gICAgICAgICAgICAvL29ubHkgZGlzcGxheSB0aGUgbGFzdCA3IFxuICAgICAgICAgICAgcGFja2FnZTEuZG9jLnRyYWNraW5nTm8gPSBwYWNrYWdlMS5kb2MudHJhY2tpbmdOby5zdWJzdHJpbmcocGFja2FnZTEuZG9jLnRyYWNraW5nTm8ubGVuZ3RoIC03KVxuICAgICAgICAgICAgXG4gICAgICAgICAgfVxuICAgICAgICAgIHBhY2thZ2UxLmRvYy5wYWNrYWdlSW5kZXggPSBjb3VudDtcbiAgICAgICAgICBjb3VudCArKzsgXG4gICAgICAgICAgcGFja2FnZWxpc3QucHVzaCggcGFja2FnZTEuZG9jKVxuICAgICAgICB9KTtcbiAgICAgICBcbiAgICAgICBcbiAgICAgICAgcmVzb2x2ZSggcGFja2FnZWxpc3QpXG4gICAgICB9KVxuICAgIH0pXG4gIH1cbiAgbGlzdE5vRG9jc0ZsbCgpe1xuICAgIHJldHVybiBuZXcgUHJvbWlzZSgocmVzb2x2ZSxyZWplY3QpPT57XG4gICAgICAgYXdiSW5kZXguc2VhcmNoKFwiQHN0YXR1czpbMSAxXSBAaGFzRG9jczpbMCAwXVwiLHtvZmZzZXQ6MCxudW1iZXJPZlJlc3VsdHM6NTAwMCxzb3J0Qnk6J2lkJ30sKGVycixhd2JzKT0+e1xuICAgICAgICAgdmFyIGF3Ykxpc3QgPSBbXTsgXG4gICAgICAgICBQcm9taXNlLmFsbChhd2JzLnJlc3VsdHMubWFwKGF3Yj0+Y3VzdG9tZXJTZXJ2aWNlLmdldEN1c3RvbWVyKGF3Yi5kb2MuY3VzdG9tZXJJZCkpKS50aGVuKGN1c3RvbWVycz0+e1xuICAgICAgICAgICBQcm9taXNlLmFsbChhd2JzLnJlc3VsdHMubWFwKGF3Yj0+dGhpcy5nZXRBd2JPdmVydmlldyhhd2IuZG9jLmlkKSkpLnRoZW4oZGV0YWlscz0+e1xuICAgICAgICAgICAgY29uc29sZS5sb2coXCJnb3QgdGhlIGN1c3RvbWVyc1wiLGN1c3RvbWVycywgYXdicylcbiAgICAgICAgICAgIGZvcih2YXIgaSA9MCA7IGkgPCBhd2JzLnJlc3VsdHMubGVuZ3RoIDsgaSsrICl7XG4gICAgICAgICAgICAgIHZhciBhd2IgPSBhd2JzLnJlc3VsdHNbaV07IFxuICAgICAgICAgICAgICBhd2IuZG9jLmRhdGVDcmVhdGVkID0gbW9tZW50LnVuaXgoYXdiLmRvYy5kYXRlQ3JlYXRlZCkuZm9ybWF0KFwiWVlZWS1NTS1ERCBoaDptbSBBXCIpXG4gICAgICAgICAgICAgIC8vd2UgbmVlZCB0byBnZXQgdGhlIGN1c3RvbWVyIFxuICAgICAgICAgICAgICBhd2IuZG9jLmNvbnNpZ25lZSA9IGN1c3RvbWVyc1tpXS5uYW1lOyBcbiAgICAgICAgICAgICAgYXdiLmRvYy53ZWlnaHQgPSBkZXRhaWxzW2ldLndlaWdodDsgXG4gICAgICAgICAgICAgIGF3Yi5kb2MucG1iID0gY3VzdG9tZXJzW2ldLnBtYjsgXG4gICAgICAgICAgICAgIGF3Yi5kb2MuZGVzY3JpcHRpb24gPSBkZXRhaWxzW2ldLmRlc2NyaXB0aW9uOyBcbiAgICAgICAgICAgICAgYXdiLmRvYy5waWVjZXMgPSBkZXRhaWxzW2ldLnBpZWNlczsgXG4gICAgICAgICAgICAgIGlmIChjdXN0b21lcnNbaV0ucG1iID09ICcnKXtcbiAgICAgICAgICAgICAgICBhd2IuZG9jLnBtYiA9ICc5MDAwJ1xuICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgIGNvbnNvbGUubG9nKCdwdXNoaW5nICcsYXdiKVxuICAgICAgICAgICAgICAvL3dlIG5lZWQgdG8gZ2V0IGFsbCB0aGUgcGFja2FnZXMgXG4gICAgICAgICAgICAgIGF3Ykxpc3QucHVzaChhd2IuZG9jKVxuICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICByZXNvbHZlKHthd2JzOmF3Ykxpc3R9KVxuICAgICAgICAgICB9KVxuICAgICAgICAgIFxuICAgICAgICAgIH0pLmNhdGNoKGVycj0+e1xuICAgICAgICAgICAgY29uc29sZS5sb2coZXJyKTsgXG4gICAgICAgICAgfSlcbiAgICAgICAgIFxuICAgICAgICAvLyAgYXdicy5yZXN1bHRzLmZvckVhY2goYXdiID0+IHtcbiAgICAgICAgICAgXG4gICAgICAgICAgXG4gICAgICAgIC8vICB9KTtcbiAgICAgICAgIFxuICAgICAgIH0pXG4gICAgfSlcbiAgfVxuXG4gIGxpc3RBd2JpbkZsbCgpe1xuICAgIHJldHVybiBuZXcgUHJvbWlzZSgocmVzb2x2ZSxyZWplY3QpPT57XG4gICAgICAgYXdiSW5kZXguc2VhcmNoKFwiQHN0YXR1czpbMSAxXSBAaGFzRG9jczpbMSAxXVwiLHtvZmZzZXQ6MCxudW1iZXJPZlJlc3VsdHM6NTAwMCxzb3J0Qnk6J2lkJ30sKGVycixhd2JzKT0+e1xuICAgICAgICAgdmFyIGF3Ykxpc3QgPSBbXTsgXG4gICAgICAgICBQcm9taXNlLmFsbChhd2JzLnJlc3VsdHMubWFwKGF3Yj0+Y3VzdG9tZXJTZXJ2aWNlLmdldEN1c3RvbWVyKGF3Yi5kb2MuY3VzdG9tZXJJZCkpKS50aGVuKGN1c3RvbWVycz0+e1xuICAgICAgICAgICBQcm9taXNlLmFsbChhd2JzLnJlc3VsdHMubWFwKGF3Yj0+dGhpcy5nZXRBd2JPdmVydmlldyhhd2IuZG9jLmlkKSkpLnRoZW4oZGV0YWlscz0+e1xuICAgICAgICAgICAgY29uc29sZS5sb2coXCJnb3QgdGhlIGN1c3RvbWVyc1wiLGN1c3RvbWVycywgYXdicylcbiAgICAgICAgICAgIGZvcih2YXIgaSA9MCA7IGkgPCBhd2JzLnJlc3VsdHMubGVuZ3RoIDsgaSsrICl7XG4gICAgICAgICAgICAgIHZhciBhd2IgPSBhd2JzLnJlc3VsdHNbaV07IFxuICAgICAgICAgICAgICBhd2IuZG9jLmRhdGVDcmVhdGVkID0gbW9tZW50LnVuaXgoYXdiLmRvYy5kYXRlQ3JlYXRlZCkuZm9ybWF0KFwiWVlZWS1NTS1ERCBoaDptbSBBXCIpXG4gICAgICAgICAgICAgIC8vd2UgbmVlZCB0byBnZXQgdGhlIGN1c3RvbWVyIFxuICAgICAgICAgICAgICBhd2IuZG9jLmNvbnNpZ25lZSA9IGN1c3RvbWVyc1tpXS5uYW1lOyBcbiAgICAgICAgICAgICAgYXdiLmRvYy5wbWIgPSBjdXN0b21lcnNbaV0ucG1iOyBcbiAgICAgICAgICAgICAgYXdiLmRvYy53ZWlnaHQgPSBkZXRhaWxzW2ldLndlaWdodDsgXG4gICAgICAgICAgICAgIGF3Yi5kb2MuZGVzY3JpcHRpb24gPSBkZXRhaWxzW2ldLmRlc2NyaXB0aW9uOyBcbiAgICAgICAgICAgICAgYXdiLmRvYy5waWVjZXMgPSBkZXRhaWxzW2ldLnBpZWNlczsgXG4gICAgICAgICAgICAgIGlmIChjdXN0b21lcnNbaV0ucG1iID09ICcnKXtcbiAgICAgICAgICAgICAgICBhd2IuZG9jLnBtYiA9ICc5MDAwJ1xuICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgIGNvbnNvbGUubG9nKCdwdXNoaW5nICcsYXdiKVxuICAgICAgICAgICAgICAvL3dlIG5lZWQgdG8gZ2V0IGFsbCB0aGUgcGFja2FnZXMgXG4gICAgICAgICAgICAgIGF3Ykxpc3QucHVzaChhd2IuZG9jKVxuICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICByZXNvbHZlKHthd2JzOmF3Ykxpc3R9KVxuICAgICAgICAgICB9KVxuICAgICAgICAgIFxuICAgICAgICAgIH0pLmNhdGNoKGVycj0+e1xuICAgICAgICAgICAgY29uc29sZS5sb2coZXJyKTsgXG4gICAgICAgICAgfSlcbiAgICAgICAgIFxuICAgICAgICAvLyAgYXdicy5yZXN1bHRzLmZvckVhY2goYXdiID0+IHtcbiAgICAgICAgICAgXG4gICAgICAgICAgXG4gICAgICAgIC8vICB9KTtcbiAgICAgICAgIFxuICAgICAgIH0pXG4gICAgfSlcbiAgfVxuICBnZXRBd2IoaWQpe1xuICAgIGNvbnN0IHNydiA9IHRoaXM7IFxuICAgIHJldHVybiBuZXcgUHJvbWlzZSgocmVzb2x2ZSxyZWplY3QpPT57XG4gICAgICBhd2JJbmRleC5nZXREb2MoaWQsKGVycixhd2IpPT57XG4gICAgICAgIC8vZ2V0IHRoZSBjdXN0b21lciBcbiAgICAgICAgY3VzdG9tZXJTZXJ2aWNlLmdldEN1c3RvbWVyKGF3Yi5kb2MuY3VzdG9tZXJJZCkudGhlbihjdXN0b21lcj0+e1xuICAgICAgICAgIGF3Yi5kb2MuY3VzdG9tZXIgPSBjdXN0b21lcjsgXG4gICAgICAgICAgc3J2LmdldEF3YkRldGFpbHMoaWQpLnRoZW4ocGFja2FnZXM9PntcbiAgICAgICAgICAgIC8vZ2V0IHRoZSBwYWNrYWdlcyBmb3IgdGhlIGF3YiBcbiAgICAgICAgICAgIGF3Yi5kb2MucGFja2FnZXMgPSBwYWNrYWdlczsgXG4gICAgICAgICAgICByZXNvbHZlKHthd2I6YXdiLmRvY30pICBcbiAgICAgICAgICB9KVxuICAgICAgICAgIFxuICAgICAgICB9KVxuICAgICAgICBcbiAgICAgIH0pXG4gICAgfSlcbiAgfVxuICB1cGRhdGVMb2NhdGlvbih0cmFja2luZ051bWJlcixsb2NhdGlvbl9pZCl7XG4gICAgcmV0dXJuIG5ldyBQcm9taXNlKChyZXNvbHZlLHJlamVjdCk9PntcbiAgICAgIHBhY2thZ2VJbmRleC5zZWFyY2goXCJAdHJhY2tpbmdObzpcIit0cmFja2luZ051bWJlcix7bG9jYXRpb246bG9jYXRpb25faWR9LChlcnIscGFja2FnZVJlc3VsdCk9PntcblxuICAgICAgfSlcbiAgICB9KVxuICB9XG4gIHNhdmVQYWNrYWdlVG9Bd2IobmV3UGFja2FnZSl7XG4gICAgcmV0dXJuIG5ldyBQcm9taXNlKChyZXNvbHZlLHJlc3VsdCk9PntcbiAgICAgIGlmIChuZXdQYWNrYWdlLmlkICE9XCIwXCIpe1xuICAgICAgICBwYWNrYWdlSW5kZXgudXBkYXRlKG5ld1BhY2thZ2UuaWQsbmV3UGFja2FnZSwoZXJyLHJlc3VsdCk9PntcbiAgICAgICAgICBpZiAoZXJyKVxuICAgICAgICAgICAgY29uc29sZS5sb2coZXJyKTsgXG4gICAgICAgICAgcmVzb2x2ZSh7c2F2ZWQ6dHJ1ZSxpZDpuZXdQYWNrYWdlLmlkfSlcbiAgICAgICAgfSlcbiAgICAgIH1cbiAgICAgIGVsc2Uge1xuICAgICAgICBkYXRhQ29udGV4dC5yZWRpc0NsaWVudC5pbmNyKFBLR19JRF9DT1VOVEVSLChlcnIsaWQpPT57XG4gICAgICAgICAgbmV3UGFja2FnZS5pZCA9IGlkOyBcbiAgICAgICAgICBwYWNrYWdlSW5kZXguYWRkKGlkLG5ld1BhY2thZ2UsKGVycixyZXN1bHQpPT57XG4gICAgICAgICAgICBpZiAoZXJyKVxuICAgICAgICAgICAgICBjb25zb2xlLmxvZyhlcnIpOyBcbiAgICAgICAgICAgIHJlc29sdmUoe3NhdmVkOnRydWUsaWQ6aWR9KVxuICAgICAgICAgIH0pXG4gICAgICAgIH0pXG4gICAgICB9XG4gICBcbiAgICB9KVxuICB9XG4gIGdldFNoaXBwZXIoaWQpe1xuICAgIHJldHVybiBuZXcgUHJvbWlzZSgocmVzb2x2ZSxyZWplY3QpPT57XG4gICAgIHNoaXBwZXJJbmRleC5nZXREb2MoaWQsKGVycixzcmVzdWx0KT0+e1xuICAgICAgIGlmIChlcnIpXG4gICAgICAgIHJlc29sdmUoaWQpO1xuXG4gICAgICAgIHJlc29sdmUoc3Jlc3VsdC5kb2MpOyBcbiAgICAgfSlcbiAgICB9KVxuICB9XG4gIGNyZWF0ZUNvbnNvbGF0ZWQocGFja2FnZXMsdXNlcm5hbWUsYm94U2l6ZSl7XG4gICAgdmFyIHNydiA9IHRoaXM7IFxuICAgIHJldHVybiBuZXcgUHJvbWlzZSgocmVzb2x2ZSxyZWplY3QpPT57XG4gICAgICB2YXIgYXdiSW5mbyA9IHsgXG4gICAgICAgIGlkOiBcIlwiLFxuICAgICAgICBpc1NlZDowLFxuICAgICAgICBoYXNEb2NzOiBcIjBcIixcbiAgICAgICAgaW52b2ljZU51bWJlcjpcIlwiLFxuICAgICAgICB2YWx1ZTpcIjBcIixcbiAgICAgICAgY3VzdG9tZXJJZDoyNDE5NyxcbiAgICAgICAgc2hpcHBlcjpcIjQ4MlwiLCAvLyB3ZSBzaG91bGQgZ2V0IGFuIGlkIGhlcmUgXG4gICAgICAgIGNhcnJpZXI6XCJVU1BTXCIsXG4gICAgICAgIGhhem1hdDpcIlwiLFxuICAgICAgICB1c2VybmFtZTogIHVzZXJuYW1lXG4gICAgICAgXG4gICAgfTtcbiAgICBzcnYuc2F2ZUF3Yihhd2JJbmZvKS50aGVuKGF3YlJlc3VsdD0+e1xuICAgICAgIC8vYWRkIFxuICAgICAgICAgIHZhciBjUGFja2FnZSA9IHtcbiAgICAgICAgICAgIGlkOjAsXG4gICAgICAgICAgICB0cmFja2luZ05vOiB1bmlxSWQoKSxcbiAgICAgICAgICAgIGRlc2NyaXB0aW9uOiBcIkNvbnNvbGlkYXRlZCBQYWNrYWdlXCIsXG4gICAgICAgICAgICB3ZWlnaHQ6MCwgXG4gICAgICAgICAgICBkaW1lbnNpb25zOiAgYCR7Ym94U2l6ZX14JHtib3hTaXplfXgke2JveFNpemV9YCxcbiAgICAgICAgICAgIGF3Yjphd2JSZXN1bHQuaWQsIFxuICAgICAgICAgICAgaXNDb25zb2xpZGF0ZWQ6IFwiMVwiLCBcbiAgICAgICAgICAgIGNyZWF0ZWRfYnk6IHVzZXJuYW1lLCBcbiAgICAgICAgICBcbiAgICAgICAgfTsgXG4gICAgICAgIHNydi5zYXZlUGFja2FnZVRvQXdiKGNQYWNrYWdlKS50aGVuKHBrZ1Jlc3VsdD0+e1xuICAgICAgICAgIC8vIGdldCB0aGUgaWQgXG4gICAgICAgICAgLy9cbiAgICAgICAgICB2YXIgYmF0Y2ggPSBkYXRhQ29udGV4dC5yZWRpc0NsaWVudC5iYXRjaCgpOyBcbiAgICAgICAgICB2YXIgcGtnQmF0Y2ggPSBkYXRhQ29udGV4dC5yZWRpc0NsaWVudC5iYXRjaCgpOyBcblxuICAgICAgICAgIHBhY2thZ2VzLmZvckVhY2gocGtnID0+IHtcbiAgICAgICAgICAgIC8vdGhlc2UgYXJlIGJhcmNvZGVzIFxuICAgICAgICAgICAgYmF0Y2guc2FkZChcImNvbnNvbGlkYXRlZDpwa2c6XCIrcGtnUmVzdWx0LmlkLHBrZylcbiAgICAgICAgICAgIHBrZ0JhdGNoLmhtZ2V0KFBLR19QUkVGSVgrZ2V0UGFja2FnZUlkRnJvbUJhckNvZGUocGtnKSxcIndlaWdodFwiKVxuICAgICAgICAgIH0pO1xuICAgICAgICAgIGJhdGNoLmV4ZWMoKGVycixyZXN1bHRzKT0+e1xuICAgICAgICAgICAgLy9cbiAgICAgICAgICAgIHBrZ0JhdGNoLmV4ZWMoKGVycjEscmVzdWx0cyk9PntcbiAgICAgICAgICAgICAgdmFyIHRvdGFsV2VpZ2h0ID0gMDsgXG4gICAgICAgICAgICAgIHJlc3VsdHMuZm9yRWFjaCh3ZWlnaHQgPT4ge1xuICAgICAgICAgICAgICAgIGlmIChpc05hTihOdW1iZXIod2VpZ2h0KSkgPT0gZmFsc2UpXG4gICAgICAgICAgICAgICAgICB0b3RhbFdlaWdodCArPSBOdW1iZXIod2VpZ2h0KTtcbiAgICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICAgIC8vd2UgbmVlZCB0byB1cGRhdGUgdGhlIHRvdGFsIHdlaWdodCBvZiB0aGUgcGFja2FnZSBub3cgXG4gICAgICAgICAgICAgIHNydi5wYWNrYWdlSW5kZXgudXBkYXRlKGNQYWNrYWdlLmlkLHt3ZWlnaHQ6dG90YWxXZWlnaHR9KVxuICAgICAgICAgICAgfSlcbiAgICAgICAgICAgIFxuICAgICAgICAgICAgcmVzb2x2ZSh7c2F2ZWQ6dHJ1ZSxpZDpwa2dSZXN1bHQuaWR9KVxuICAgICAgICAgIH0pXG4gICAgICAgIH0pXG4gICAgICAgIFxuICAgIH0pXG5cbiAgIFxuICAgICAgLy92YWxpZGF0ZSB0aGUgcGFja2FnZSBcbiAgICBcblxuICAgIH0pXG4gIH1cbiAgc2F2ZVBhY2thZ2UoYm9keSl7XG4gICAgcmV0dXJuIG5ldyBQcm9taXNlKChyZXNvbHZlLHJlamVjdCk9PntcbiAgICAgIHZhciBjUGFja2FnZSA9IHtcbiAgICAgICAgXG4gICAgICAgIHNreWJveDogYm9keS5za3lib3gsXG4gICAgICAgIGN1c3RvbWVyOiBib2R5LmN1c3RvbWVyLnJlcGxhY2UoXCItXCIsIFwiXCIpLnRyaW0oKSxcbiAgICAgICAgdHJhY2tpbmdObzogYm9keS50cmFja2luZyxcbiAgICAgICAgZGVzY3JpcHRpb246IGJvZHkuZGVzY3JpcHRpb24sXG4gICAgICAgIHNoaXBwZXI6IGJvZHkuc2hpcHBlcixcbiAgICAgICAgY2Fycmllcjpib2R5LmNhcnJpZXIsXG4gICAgICAgIHZhbHVlOiBOdW1iZXIoYm9keS52YWx1ZSksXG4gICAgICAgIHBpZWNlczogTnVtYmVyKGJvZHkucGllY2VzKSxcbiAgICAgICAgd2VpZ2h0OiBOdW1iZXIoYm9keS53ZWlnaHQpLFxuICAgICAgICBkaW1lbnNpb25zOiBib2R5LmRpbWVuc2lvbnMsXG4gICAgICAgIHN0YXR1czogMSxcbiAgICAgICAgbG9jYXRpb246IFwiRkxMXCIsXG4gICAgICAgIG1pZDogMCxcbiAgICAgICAgYXdiOjAsXG4gICAgICAgIC8vaGFzT3B0OiB0cnVlLFxuICAgICAgICAvL210eXBlOiBib2R5Lm10eXBlXG4gICAgICB9O1xuICAgICAgLy92YWxpZGF0ZSB0aGUgcGFja2FnZSBcbiAgICAgIGRhdGFDb250ZXh0LnJlZGlzQ2xpZW50LmluY3IoUEtHX0lEX0NPVU5URVIsKGVycixpZCk9PntcbiAgICAgICAgY1BhY2thZ2UuaWQgPSBpZDsgXG4gICAgICAgIGRhdGFDb250ZXh0LnJlZGlzQ2xpZW50LnNldChQS0dfUFJFRklYK2lkLGNQYWNrYWdlLChlcnIscmVzcG9uc2UpPT57XG4gICAgICAgICAgaWYgKGVycil7XG4gICAgICAgICAgICByZWplY3Qoe3NhdmVkOmZhbHNlLGVycjplcnJ9KVxuICAgICAgICAgIH1cbiAgICAgICAgICAgdmFyIGluZGV4UGFja2FnZSA9ICBjcmVhdGVEb2N1bWVudChjUGFja2FnZSk7IFxuICAgICAgICAgICBjb25zb2xlLmxvZyhpbmRleFBhY2thZ2UpOyBcbiAgICAgICAgICAgcGFja2FnZUluZGV4LmFkZChjUGFja2FnZS5pZCxpbmRleFBhY2thZ2UsKGVycjEsZG9jUmVzdWx0KT0+e1xuICAgICAgICAgICAgIGNvbnNvbGUubG9nKGRvY1Jlc3VsdCk7IFxuICAgICAgICAgICAgIGlmKGVycjEpe1xuICAgICAgICAgICAgICAgcmVqZWN0KHtzYXZlZDpmYWxzZSxlcnI6ZXJyMX0pXG4gICAgICAgICAgICAgfVxuICAgICAgICAgICAgIHJlc29sdmUoe3NhdmVkOnRydWV9KVxuICAgICAgICAgICB9KVxuXG4gICAgICAgIH0pXG4gICAgICB9KTtcbiAgICBcblxuXG4gICAgfSlcbiAgfVxuXG4gIGdldE1hbmlmZXN0UGFja2FnZXMoKXtcbiAgICByZXR1cm4gbmV3IFByb21pc2UoKHJlc29sdmUscmVqZWN0KT0+e1xuICAgICAgXG4gICAgICB0aGlzLm15U2VhcmNoLnNlYXJjaChcbiAgICAgICAgYEBtaWQ6WzAgMF1gLFxuICAgICAgICB7IG9mZnNldDogMCwgbnVtYmVyT2ZSZXN1bHRzOiA1MDAwIH0sXG4gICAgICAgIChlcnIsIGRhdGEpID0+IHtcbiAgICAgICAgICB2YXIgcGFja2FnZXMgPSBbXTtcbiAgICAgICAgICBjb25zb2xlLmxvZyhkYXRhKTtcbiAgICAgICAgICBkYXRhLnJlc3VsdHMuZm9yRWFjaChlbGVtZW50ID0+IHtcblxuICAgICAgICAgICAgcGFja2FnZXMucHVzaChlbGVtZW50LmRvYyk7XG4gICAgICAgICAgICByZXNvbHZlKHBhY2thZ2VzKTsgICAgICAgICAgICAgICAgIFxuICAgICAgICB9KTtcbiAgICB9KTtcbiAgICB9KVxuICB9XG4gIGdldFJlY2VpdmVkUGFja2FnZXMocGFnZSxwYWdlU2l6ZSl7XG4gICAgcmV0dXJuIG5ldyBQcm9taXNlKChyZXNvbHZlLHJlamVjdCk9PntcbiAgICAgIFxuICAgICAgdGhpcy5teVNlYXJjaC5zZWFyY2goXG4gICAgICAgIGBAbWlkOlswIDBdYCxcbiAgICAgICAgeyBvZmZzZXQ6IDAsIG51bWJlck9mUmVzdWx0czogNTAwMCB9LFxuICAgICAgICAoZXJyLCBkYXRhKSA9PiB7XG4gICAgICAgICAgdmFyIHBhY2thZ2VzID0gW107XG4gICAgICAgICAgY29uc29sZS5sb2coZGF0YSk7XG4gICAgICAgICAgZGF0YS5yZXN1bHRzLmZvckVhY2goZWxlbWVudCA9PiB7XG5cbiAgICAgICAgICAgIHBhY2thZ2VzLnB1c2goZWxlbWVudC5kb2MpO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIFxuICAgICAgICB9KTtcbiAgICAgICAgcmVzb2x2ZShwYWNrYWdlcyk7IFxuICAgIH0pO1xuICAgIH0pXG4gIH1cbiAgZ2V0Tm9Eb2NzUGFja2Fja2FnZXMocGFnZSxwYWdlU2l6ZSl7XG4gICAgcmV0dXJuIG5ldyBQcm9taXNlKChyZXNvbHZlLHJlamVjdCk9PntcbiAgICAgIFxuICAgICAgdGhpcy5teVNlYXJjaC5zZWFyY2goXG4gICAgICAgIGBAaGFzRG9jczpbMCAwXWAsXG4gICAgICAgIHsgb2Zmc2V0OiAwLCBudW1iZXJPZlJlc3VsdHM6IDUwMDAgfSxcbiAgICAgICAgKGVyciwgZGF0YSkgPT4ge1xuICAgICAgICAgIHZhciBwYWNrYWdlcyA9IFtdO1xuICAgICAgICAgIGNvbnNvbGUubG9nKGRhdGEpO1xuICAgICAgICAgIGRhdGEucmVzdWx0cy5mb3JFYWNoKGVsZW1lbnQgPT4ge1xuXG4gICAgICAgICAgICBwYWNrYWdlcy5wdXNoKGVsZW1lbnQuZG9jKTtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBcbiAgICAgICAgfSk7XG4gICAgICAgIHJlc29sdmUocGFja2FnZXMpOyBcbiAgICB9KTtcbiAgICB9KVxuICB9XG4gIGdldHBhY2thZ2VieVJlZGlzSWQoaWQpe1xuICAgIHJldHVybiBuZXcgUHJvbWlzZSgocmVzb2x2ZSxyZWplY3QpPT57XG4gICAgICBwYWNrYWdlSW5kZXguZ2V0RG9jKGlkLChlcnIsZG9jdW1lbnQpPT57XG4gICAgICAgIHJlc29sdmUoZG9jdW1lbnQuZG9jKTsgXG4gICAgICB9KVxuICAgIH0pXG4gIH1cbiAgZ2V0UGFja2FnZUJ5SWQoYmFyY29kZSl7XG4gICAgdmFyIHNydiA9IHRoaXM7IFxuICAgIHZhciBwa2dJZCA9IGdldFBhY2thZ2VJZEZyb21CYXJDb2RlKGJhcmNvZGUpOyBcbiAgICByZXR1cm4gbmV3IFByb21pc2UoKHJlc29sdmUscmVqZWN0KT0+e1xuICAgICAgdGhpcy5teVNlYXJjaC5nZXREb2MocGtnSWQsKGVycixkb2N1bWVudCk9PntcbiAgICAgICAgLy9nZXQgdGhlIGF3YiBpbmZvIGhlcmUgYXMgd2VsbCBcbiAgICAgICAgc3J2LmdldEF3Yihkb2N1bWVudC5kb2MuYXdiKS50aGVuKGF3YmluZm89PntcbiAgICAgICAgICBzcnYuZ2V0U2hpcHBlcihhd2JpbmZvLmF3Yi5zaGlwcGVyKS50aGVuKHNoaXBwZXI9PntcbiAgICAgICAgICAgIGNvbnNvbGUubG9nKGF3YmluZm8pOyBcbiAgICAgICAgICAgIGF3YmluZm8uYXdiLnNoaXBwZXIgPSBzaGlwcGVyLm5hbWU7XG4gICAgICAgICAgICB2YXIgcmVzcG9uc2UgPSB7IFxuICAgICAgICAgICAgICBhd2IgOiBhd2JpbmZvLmF3YixcbiAgICAgICAgICAgICAgcGFja2FnZSA6IGRvY3VtZW50LmRvY1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgcmVzb2x2ZShyZXNwb25zZSk7IFxuICAgICAgICAgIH0pXG4gICAgICAgICBcbiAgICAgICAgfSk7IFxuICAgICAgICBcbiAgICAgIH0pXG4gICAgfSk7IFxuICB9XG4gIHVwZGF0ZVN0b3JlTG9jYXRpb24oY2hlY2tpbil7XG4gICAgdmFyIHNydiA9IHRoaXM7IFxuICAgIHJldHVybiBuZXcgUHJvbWlzZSAoKHJlc29sdmUscmVqZWN0KT0+e1xuICAgICAgdmFyIGlkID0gZ2V0UGFja2FnZUlkRnJvbUJhckNvZGUoY2hlY2tpbi5iYXJjb2RlKTsgXG4gICAgICBwYWNrYWdlSW5kZXguZ2V0RG9jKGlkLChlcnIscGtnKT0+e1xuICAgICAgICBwa2cuZG9jLmxvY2F0aW9uSWQgPSBjaGVja2luLmxvY2F0aW9uSWQ7IFxuICAgICAgICBwa2cuZG9jLmxvY2F0aW9uID0gY2hlY2tpbi5sb2NhdGlvbjsgXG4gICAgICAgIHBrZy5kb2Muc3RhdHVzID0gNTsgXG4gICAgICAgICBwYWNrYWdlSW5kZXgudXBkYXRlKGlkLHBrZywoZXJyLHJlc3VsdCk9PntcbiAgICAgICAgICAgLy93ZSBuZWVkIHRvIHNlbmQgdGhlIGVtYWlsIGhlcmUgZm9yIHRoZSBwYWNrYWdlIFxuICAgICAgICAgICBzcnYuZ2V0UGFja2FnZUJ5RG9jSWQoaWQpLnRoZW4oaW5mbz0+e1xuICAgICAgICAgICAgICBlbWFpbFNlcnZpY2Uuc2VuZEF0U3RvcmVFbWFpbChjaGVja2luLmxvY2F0aW9uLGluZm8pO1xuICAgICAgICAgICAgICByZXNvbHZlKHt1cGRhdGVkOnRydWV9KTsgXG4gICAgICAgICAgIH0pXG4gICAgICAgICBcbiAgICAgICAgIH0pO1xuICAgICAgfSlcbiAgICB9KVxuICB9XG4gIGdldFBhY2thZ2VCeURvY0lkKHBrZ0lkKXtcbiAgICB2YXIgc3J2ID0gdGhpczsgXG4gICAgcmV0dXJuIG5ldyBQcm9taXNlKChyZXNvbHZlLHJlamVjdCk9PntcbiAgICAgIHRoaXMubXlTZWFyY2guZ2V0RG9jKHBrZ0lkLChlcnIsZG9jdW1lbnQpPT57XG4gICAgICAgIC8vZ2V0IHRoZSBhd2IgaW5mbyBoZXJlIGFzIHdlbGwgXG4gICAgICAgIHNydi5nZXRBd2IoZG9jdW1lbnQuZG9jLmF3YikudGhlbihhd2JpbmZvPT57XG4gICAgICAgICAgY29uc29sZS5sb2coYXdiaW5mbyk7IFxuICAgICAgICAgIHZhciByZXNwb25zZSA9IHsgXG4gICAgICAgICAgICBhd2IgOiBhd2JpbmZvLmF3YixcbiAgICAgICAgICAgIHBhY2thZ2UgOiBkb2N1bWVudC5kb2NcbiAgICAgICAgICB9XG4gICAgICAgICAgcmVzb2x2ZShyZXNwb25zZSk7IFxuICAgICAgICB9KTsgXG4gICAgICAgIFxuICAgICAgfSlcbiAgICB9KTsgXG4gIH1cbiAgLy91c2luZyB0aGlzIFxuICBcblxuICB1cGRhdGVNYW5pZmVzdFBhY2thZ2VUb0luVHJhbnNpdChtaWQpIHtcbiAgICAvL2dldCBhbGwgdGhlIHBhY2thZ2VzXG4gICAgLy93ZSBuZWVkIHRvIHVwZGF0ZSB0aGUgaW5kZXggYXQgdGhpcyBwb2ludCBhcyB3ZWxsXG4gICAgdmFyIG1zZWFyY2ggPSB0aGlzLm15U2VhcmNoO1xuICAgIHRoaXMubXlTZWFyY2guc2VhcmNoKFxuICAgICAgYEBtaWQ6WyR7bWlkfSAke21pZH1dYCxcbiAgICAgIHsgb2Zmc2V0OiAwLCBudW1iZXJPZlJlc3VsdHM6IDUwMDAgfSxcbiAgICAgIChlcnIsIGRhdGEpID0+IHtcbiAgICAgICAgdmFyIHBhY2thZ2VzID0gW107XG4gICAgICAgIGNvbnNvbGUubG9nKGRhdGEpO1xuICAgICAgICBkYXRhLnJlc3VsdHMuZm9yRWFjaChlbGVtZW50ID0+IHtcbiAgICAgICAgICB2YXIgb2xkRG9jSWQgPSBlbGVtZW50LmRvY0lkO1xuICAgICAgICAgIGVsZW1lbnQuZG9jSWQgPSBlbGVtZW50LmRvY0lkLnJlcGxhY2UoYCR7bWlkfS1gLCBcIlwiKTtcbiAgICAgICAgICBwYWNrYWdlcy5wdXNoKGVsZW1lbnQuZG9jSWQpO1xuICAgICAgICAgIC8vIGkgY291bGQgZGVsZXRlIGhlcmVcbiAgICAgICAgICAvLyBtc2VhcmNoLmRlbERvY3VtZW50KFBLR19JRFgsb2xkRG9jSWQpXG4gICAgICAgICAgLy91cGRhdGUgYWxsIHRoZSBwYWNrYWdlc1xuICAgICAgICB9KTtcbiAgICAgICAgc2V0UGFja2FnZUluVHJhbnNpdChwYWNrYWdlcywgbXNlYXJjaCwgbWlkKS50aGVuKGZ1bmN0aW9uKFxuICAgICAgICAgIHVwZGF0ZWRQYWNrYWdlc1xuICAgICAgICApIHtcbiAgICAgICAgICBjb25zb2xlLmxvZyhcInVwZGF0ZWQgcGFja2FnZXNcIik7XG4gICAgICAgICAgY29uc29sZS5sb2codXBkYXRlZFBhY2thZ2VzKTtcbiAgICAgICAgfSk7XG4gICAgICB9XG4gICAgKTtcbiAgfVxuICByZW1vdmVQYWNrYWdlRnJvbU1hbmlmZXN0KHBhY2thZ2VJZCwgbWlkKSB7XG4gICAgdmFyIG1zZWFyY2ggPSB0aGlzLm15U2VhcmNoO1xuICAgIHJldHVybiBuZXcgUHJvbWlzZSgocmVzb2x2ZSwgcmVqZWN0KSA9PiB7XG4gICAgICB2YXIgbWFuaWZlc3QgPSBtaWQ7XG4gICAgICB2YXIgbWFuaWZlc3RLZXkgPSBcIm1hbmlmZXN0OlwiICsgbWFuaWZlc3QgKyBcIjoqXCI7XG5cbiAgICAgIGxyZWRpcy5kZWwoXCJwYWNrYWdlczpcIiArIHRyYWNraW5nTm8pLnRoZW4oZnVuY3Rpb24ocmVzdWx0KSB7XG4gICAgICAgIGNvbnNvbGUubG9nKHJlc3VsdCk7XG4gICAgICAgIG1zZWFyY2guZGVsRG9jdW1lbnQoUEtHX0lEWCwgYCR7bWlkfS0ke3RyYWNraW5nTm99YCk7XG4gICAgICAgIC8vd2UgbmVlZCB0byByZW1vdmUgZnJvbSB0aGUgaW5kZXggYW5kIGRlYyB0aGUgY291bnRlclxuICAgICAgICBscmVkaXMuY2xpZW50LmRlY3IoXCJtY291bnRlcjpcIiArIG1pZCk7XG4gICAgICAgIC8vclNlcnZpY2VzLnBhY2thZ2VTZXJ2aWNlLnJtUGFja2FnZShtaWQsIHRyYWNraW5nTm8pO1xuICAgICAgICBscmVkaXMuZ2V0S2V5cyhtYW5pZmVzdEtleSkudGhlbihrUmVzdWx0ID0+IHtcbiAgICAgICAgICAvL3RoZSBsaXN0IG9mIGFsbCB0aGUgc2V0cyAuLi53ZSBuZWVkIHRvIHJlbW92ZSB0aGUga2V5IGZyb20gZWFjaCBvbmVcbiAgICAgICAgICB2YXIga2V5c0NvdW50ID0gMDtcblxuICAgICAgICAgIGtSZXN1bHQuZm9yRWFjaChlbGVtZW50ID0+IHtcbiAgICAgICAgICAgIGNvbnNvbGUubG9nKFxuICAgICAgICAgICAgICBgcmVtb3ZpbmcgJHt0cmFja2luZ05vfSBwYWNrYWdlIG1hbmlmZXN0IHNldCAke2VsZW1lbnR9IGBcbiAgICAgICAgICAgICk7XG4gICAgICAgICAgICBscmVkaXMuc3JlbShlbGVtZW50LCB0cmFja2luZ05vKS50aGVuKGZ1bmN0aW9uKHJSZXN1bHQpIHtcbiAgICAgICAgICAgICAgY29uc29sZS5sb2coclJlc3VsdCk7XG4gICAgICAgICAgICAgIGNvbnNvbGUubG9nKFwicmVtb3ZlZFwiKTtcbiAgICAgICAgICAgICAgaWYgKGtleXNDb3VudCA9PSBrUmVzdWx0Lmxlbmd0aCAtIDEpIGtleXNDb3VudCsrO1xuICAgICAgICAgICAgfSk7XG4gICAgICAgICAgfSk7XG4gICAgICAgICAgcmVzb2x2ZSh7XG4gICAgICAgICAgICBkZWxldGVkOiB0cnVlXG4gICAgICAgICAgfSk7XG4gICAgICAgIH0pO1xuXG4gICAgICAgIC8vd2UgYWxzbyBuZWVkIHRvIHJlbW92ZSBmcm9tIGFueSBzZXRzXG4gICAgICB9KTtcbiAgICB9KTtcbiAgfVxuICByZW1vdmVQYWNrYWdlQnlJZChpZCkge1xuICAgIHZhciBtc2VhcmNoID0gdGhpcy5teVNlYXJjaDtcbiAgICByZXR1cm4gbmV3IFByb21pc2UoKHJlc29sdmUsIHJlamVjdCkgPT4ge1xuICAgICAgXG4gICAgICBwYWNrYWdlSW5kZXguZGVsRG9jdW1lbnQoUEtHX0lEWCxpZCwoZXJyLHJlc3BvbnNlKT0+e1xuICAgICAgICBpZiAoZXJyKVxuICAgICAgICAgIGNvbnNvbGUubG9nKGVycik7IFxuICAgICAgICBjb25zb2xlLmxvZyhyZXNwb25zZSk7IFxuICAgICAgICByZXNvbHZlKHtkZWxldGVkOnRydWV9KVxuICAgICAgfSlcbiAgICAgIFxuICAgICAgICBcbiAgICAgIFxuICAgIH0pO1xuICB9XG4gIHN0b3JlUGFja2FnZUZvclBpY2t1cCh0cmFja2luZ05vLGJpbil7XG4gICAgdmFyIHNlYXJjaGVyID0gdGhpcy5teVNlYXJjaDtcbiAgICByZXR1cm4gbmV3IFByb21pc2UoKHJlc29sdmUscmVqZWN0KT0+e1xuICAgICAgIGxyZWRpcy5obXNldChQS0dfUFJFRklYK3RyYWNraW5nTm8se3N0YXR1czo0LGxvY2F0aW9uOmJpbn0pLnRoZW4oKHJlc3VsdCk9PntcbiAgICAgICAgIGxyZWRpcy5nZXRQYWNrYWdlKHRyYWNraW5nTm8pLnRoZW4oKHBrZyk9PntcbiAgICAgICAgICBhZGRQYWNrYWdlVG9JbmRleCh0cmFja2luZ05vLHNlYXJjaGVyKSA7IFxuICAgICAgICAgIHJlc29sdmUocGtnKTsgICBcbiAgICAgICAgIH0pO1xuICAgICAgIH0pIFxuICAgIH0pOyBcbiAgfVxuICB1cGRhdGVQYWNrYWdlSW5kZXgodHJhY2tpbmcpe1xuICAgICAgcmV0dXJuIG5ldyBQcm9taXNlKChyZXNvbHZlLHJlamVjdCk9PntcbiAgICAgICAgICB2YXIgbXNlYXJjaCA9IHRoaXMubXlTZWFyY2g7IFxuICAgICAgICAgIGFkZFBhY2thZ2VUb0luZGV4KHRyYWNraW5nLG1zZWFyY2gpOyBcbiAgICAgICAgIHJlc29sdmUoeyd1cGRhdGVkJzp0cnVlfSk7XG4gICAgICB9KVxuICB9XG4gIGdldEN1c3RvbWVyUGFja2FnZXMoc2t5Ym94KSB7fVxuXG5cbiAgLy9ubyBtb3JlIHNreWJveFxuICBnZXRNYW5pZmVzdFBhY2thZ2VzQnlTdGF0dXMobWlkLHN0YXR1cykge1xuICAgICAgcmV0dXJuIG5ldyBQcm9taXNlKChyZXNvbHZlLHJlamVjdCk9PntcbiAgICAgICAgICBjb25zb2xlLmxvZyhgQG1pZDpbJHttaWR9ICR7bWlkfV1gKVxuICAgICAgICB0aGlzLm15U2VhcmNoLnNlYXJjaChcbiAgICAgICAgICAgIGBAbWlkOlske21pZH0gJHttaWR9XWAsXG4gICAgICAgICAgICB7IG9mZnNldDogMCwgbnVtYmVyT2ZSZXN1bHRzOiA1MDAwIH0sXG4gICAgICAgICAgICAoZXJyLCBkYXRhKSA9PiB7XG4gICAgICAgICAgICAgIHZhciBwYWNrYWdlcyA9IFtdO1xuICAgICAgICAgICAgICBjb25zb2xlLmxvZyhkYXRhKTtcbiAgICAgICAgICAgICAgZGF0YS5yZXN1bHRzLmZvckVhY2goZWxlbWVudCA9PiB7XG5cbiAgICAgICAgICAgICAgICBwYWNrYWdlcy5wdXNoKGVsZW1lbnQuZG9jKTtcbiAgICAgICAgICAgICAgICByZXNvbHZlKHBhY2thZ2VzKTsgICAgICAgICAgICAgICAgIFxuICAgICAgICAgICAgfSk7XG4gICAgICAgIH0pO1xuICAgICAgfSk7XG4gIFxuICB9ICAgXG4gIFxuICAvLyNyZWdpb24gUGFrY2FnZSBGaWx0ZXJzICBcbiAgZ2V0UGFja2FnZXNOYXNXYXJlaG91c2UoaXNOb0RvYyxjb21wYW55KXtcbiAgICB2YXIgc3J2ID0gdGhpczsgXG4gICAgcmV0dXJuIG5ldyBQcm9taXNlKChyZXNvbHZlLHJlamVjdCk9PntcbiAgICAgICAgcGFja2FnZUluZGV4LnNlYXJjaChgQHN0YXR1czpbNCA0XSBAY29tcGFueToke2NvbXBhbnl9IEBoYXNEb2NzOlske2lzTm9Eb2N9ICR7aXNOb0RvY31dYCx7fSwoZXJyLHJlcGx5KT0+e1xuICAgICAgICAgIGNvbnNvbGUubG9nKHJlcGx5LnJlc3VsdHMpOyBcbiAgICAgICAgICBQcm9taXNlLmFsbChyZXBseS5yZXN1bHRzLm1hcChwa2cgPT4gc3J2LmdldFBhY2thZ2VCeURvY0lkKHBrZy5kb2NJZCkpKS50aGVuKHBhY2thZ2VzPT57XG4gICAgICAgICAgICByZXNvbHZlKHBhY2thZ2VzKTsgXG4gICAgICAgICAgfSlcblxuICAgICAgICB9KVxuICAgIH0pXG4gIH1cblxuICAvLyNlbmRyZWdpb25cbiAgXG5cbiAgIC8vI3JlZ2lvbiBNYW5pZmVzdCBQYWNrYWdlIEZ1bmN0aW9ucyBcblxuICAgYWRkVG9GbGlnaHQoYWN0aW9uKXtcbiAgICAgdmFyIHNydiA9IHRoaXM7IFxuICAgIHJldHVybiBuZXcgUHJvbWlzZSgocmVzb2x2ZSxyZWplY3QpPT57XG4gICAgICB2YXIgcGFja2FnZU5vID0gZ2V0UGFja2FnZUlkRnJvbUJhckNvZGUoYWN0aW9uLmJhcmNvZGUpOyBcbiAgICAgIGNvbnNvbGUubG9nKGFjdGlvbik7IFxuICAgICAgdGhpcy5teVNlYXJjaC51cGRhdGUocGFja2FnZU5vLHttaWQ6YWN0aW9uLm1pZCAsIHN0YXR1czogMiwgbG9jYXRpb246XCJMb2FkZWQgb24gQWlyQ3JhZnRcIixjb21wYXJ0bWVudDphY3Rpb24uY29tcGFydG1lbnR9LChlcnIscmVzdWx0KT0+e1xuICAgICAgICBpZihlcnIpXG4gICAgICAgICAgcmVzb2x2ZSh7YWRkZWQ6ZmFsc2V9KVxuICAgICAgICBzcnYuZ2V0RmxpZ2h0Q29tcGFydG1lbnRXZWlnaHQoYWN0aW9uLm1pZCxhY3Rpb24uY29tcGFydG1lbnQpLnRoZW4oZnJlc3VsdD0+e1xuICAgICAgICAgIGZyZXN1bHQuYWRkZWQgPSB0cnVlOyBcbiAgICAgICAgICByZXNvbHZlKGZyZXN1bHQpXG4gICAgICAgIH0pXG4gICAgICAgXG4gICAgICB9KVxuICAgICAgICBcbiAgICB9KVxuICAgfVxuICAgLy9nZXQgdGhlIGNvbXBhcnRtZW50IHdlaWdodCBcbiAgIGdldEZsaWdodENvbXBhcnRtZW50V2VpZ2h0KG1pZCxjb21wYXJ0bWVudCl7XG4gICAgIHJldHVybiBuZXcgUHJvbWlzZSgocmVzb2x2ZSxyZWplY3QpPT57XG4gICAgICBcbiAgICAgIHRoaXMubXlTZWFyY2guYWdncmVnYXRlKGBAbWlkOlske21pZH0gJHttaWR9XSBAY29tcGFydG1lbnQ6JHtjb21wYXJ0bWVudH1gLCB7fSwoZXJyLHJlcGx5KT0+e1xuICAgICAgICAgaWYgKGVycilcbiAgICAgICAgIGNvbnNvbGUubG9nKGVycik7IFxuICAgICAgICAgY29uc29sZS5sb2cocmVwbHksXCJUT1RBTCBTRUNUSU9OIFdlaWdodFwiKVxuICAgICAgICAgaWYgKHJlcGx5WzFdKXtcbiAgICAgICAgICAgdmFyIHJlc3VsdCA9IHJlcGx5WzFdO1xuICAgICAgICAgICB2YXIgY29tcGFydG1lbnQgPSByZXN1bHRbM107IFxuICAgICAgICAgICB2YXIgd2VpZ2h0ID0gcmVzdWx0WzVdOyBcbiAgICAgICAgIH1cbiAgICAgICAgIHJlc29sdmUoe2NvbXBhcnRtZW50OmNvbXBhcnRtZW50LHdlaWdodDp3ZWlnaHR9KVxuICAgICAgIH0pXG4gICAgIH0pXG4gICB9XG4gICAvL3JlbW92ZSBmcm9tIGZsaWdodCBcbiAgIHJlbW92ZUZyb21GbGlnaHQoYWN0aW9uKXtcbiAgICByZXR1cm4gbmV3IFByb21pc2UoKHJlc29sdmUscmVqZWN0KT0+e1xuICAgICAgICB2YXIgcGFja2FnZU5vID0gZ2V0UGFja2FnZUlkRnJvbUJhckNvZGUoYWN0aW9uLmJhcmNvZGUpOyAgIFxuICAgICAgICB0aGlzLm15U2VhcmNoLnVwZGF0ZShwYWNrYWdlTm8se21pZDphY3Rpb24ubWlkfSwoZXJyLHJlc3VsdCk9PntcbiAgICAgICAgaWYoZXJyKVxuICAgICAgICAgICAgcmVzb2x2ZSh7cmVtb3ZlZDpmYWxzZX0pXG4gICAgICAgICAgXG4gICAgICAgICAgcmVzb2x2ZSh7cmVtb3ZlZDp0cnVlfSlcbiAgICAgICAgfSlcbiAgICB9KVxuICAgfVxuICAgcmVjRnJvbVRydWNrKHRyYWNraW5nTm8sdXNlcm5hbWUsc2hpcG1lbnRJZCl7XG4gICAgIHJldHVybiBuZXcgUHJvbWlzZSgocmVzb2x2ZSxyZWplY3QpPT57XG4gICAgICAgIGRhdGFDb250ZXh0LnJlZGlzQ2xpZW50LnNhZGQoXCJzaGlwbWVudDppZDpcIitzaGlwbWVudElkLHRyYWNraW5nTm8sKGVycixyZXBseSk9PntcbiAgICAgICAgICBkYXRhQ29udGV4dC5yZWRpc0NsaWVudC5zZXQoUkVDX1BLRyt0cmFja2luZ05vLG1vbWVudCgpLnVuaXgoKSwgKGVycixyZXN1bHQpPT57XG4gICAgICAgICAgICBpZiAoZXJyKSByZXNvbHZlKHtzYXZlZDpmYWxzZX0pXG4gICAgICAgICAgICAvL3NoaXBtZW50IGNvdW50IFxuICAgICAgICAgICAgdmFyIHNoaXBtZW50Q291bnQgPSAxO1xuICAgICAgICAgICAgZGF0YUNvbnRleHQucmVkaXNDbGllbnQuc2NhcmQoXCJzaGlwbWVudDppZDpcIitzaGlwbWVudElkLChlcnIsY2FyZCk9PntcbiAgICAgICAgICAgICAgcmVzb2x2ZSh7c2F2ZWQ6dHJ1ZSxwa2dDb3VudDpjYXJkfSlcbiAgICAgICAgICAgIH0pO1xuICAgICAgICAgICBcbiAgICAgICAgICB9KVxuICAgICAgICB9KVxuICAgICAgICBcbiAgICAgfSlcbiAgIH1cbiAgIHByb2Nzc2Vzc1BhY2thZ2UocGtnSWZubyx1c2VybmFtZSl7XG4gICAgdmFyIHNydiA9IHRoaXM7ICBcbiAgICByZXR1cm4gbmV3IFByb21pc2UoKHJlc29sdmUscmVqZWN0KT0+e1xuICAgICAgIC8vd2UgYWxzbyBuZWVkIHRvIHNldCB0aGUgd2FyZWhvdXNlIGxvY2F0aW9uIGhlcmUgXG4gICAgICAgZGF0YUNvbnRleHQucmVkaXNDbGllbnQuaG1zZXQoXCJmZWVzOmF3YjpcIitwa2dJZm5vLmF3Yixwa2dJZm5vLChlcnIscmVzdWx0KT0+e1xuICAgICAgICAgaWYgKGVycilcbiAgICAgICAgICBjb25zb2xlLmxvZyhlcnIpOyBcblxuXG5cbiAgICAgICAgICBjb25zb2xlLmxvZyhyZXN1bHQpOyBcbiAgICAgICAgICBjb25zb2xlLmxvZyhcInByaW50OmZlZXM6XCIrdXNlcm5hbWUsdXNlcm5hbWUpOyBcbiAgICAgICAgIGRhdGFDb250ZXh0LnJlZGlzQ2xpZW50LnB1Ymxpc2goXCJwcmludDpmZWVzOlwiK3VzZXJuYW1lLHBrZ0lmbm8uYXdiKTsgXG4gICAgICAgICBcbiAgICAgICAgICBzcnYuZ2V0UGFja2FnZUJ5SWQocGtnSWZuby5iYXJjb2RlKS50aGVuKHBrZz0+e1xuICAgICAgICAgICAgZW1haWxTZXJ2aWNlLnNlbmROb0RvY3NFbWFpbChwa2cpXG4gICAgICAgICAgICBpZiAocGtnSWZuby5yZWZMb2Mpe1xuICAgICAgICAgICAgICBwa2cucGFja2FnZS53bG9jID0gcGtnSWZuby5yZWZMb2M7IFxuICAgICAgICAgICAgICBcbiAgICAgICAgICAgICAgICBwa2cucGFja2FnZS5oYXNEb2NzID0gcGtnSWZuby5oYXNEb2NzIDsgXG4gICAgICAgICAgICAgICAgcGtnLnBhY2thZ2Uuc3RhdHVzID0gNDsgXG5cbiAgICAgICAgICAgICAgICAvL3NldCB0aGVvbXBhbnkgXG4gICAgICAgICAgICAgICAgaWYgKE51bWJlcihwa2cuYXdiLmN1c3RvbWVyLnBtYikgPiA5MDAwKXtcbiAgICAgICAgICAgICAgICAgIHBrZy5wYWNrYWdlLmNvbXBhbnkgPSBcIjBcIlxuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICBlbHNlIFxuICAgICAgICAgICAgICAgICAgcGtnLnBhY2thZ2UuY29tcGFueSA9IFwiMVwiXG4gICAgICAgICAgICAgICAgY29uc29sZS5sb2coJ3VwZGF0aW5nIHdpdGggJyxwa2cucGFja2FnZSlcbiAgICAgICAgICAgICAgICBcbiAgICAgICAgICAgICAgcGFja2FnZUluZGV4LnVwZGF0ZShwa2cucGFja2FnZS5pZCxwa2cucGFja2FnZSwoZXJyUmVzcCxyZXNwb25zZSk9PntcbiAgICAgICAgICAgICAgICBcbiAgICAgICAgICAgICAgICBpZihlcnJSZXNwKVxuICAgICAgICAgICAgICAgIGNvbnNvbGUubG9nKGVyclJlc3ApXG4gICAgICAgICAgICAgIH0pXG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBcbiAgICAgICAgICB9KVxuICAgICAgICAgcmVzb2x2ZSh7c2VudDp0cnVlfSlcbiAgICAgICB9KVxuICAgICB9KVxuICAgfVxuICAgcmVjRnJvbVBsYW5lTmFzKGJhcmNvZGUpe1xuICAgICByZXR1cm4gbmV3IFByb21pc2UoKHJlc29sdmUscmVqZWN0KT0+e1xuICAgICAgIHZhciBzcnYgPSB0aGlzIDsgXG4gICAgICAgdmFyIHBrZ0lkID0gZ2V0UGFja2FnZUlkRnJvbUJhckNvZGUoYmFyY29kZSk7IFxuICAgICAgICBzcnYubXlTZWFyY2guZ2V0RG9jKHBrZ0lkLChlcnIscGtnKT0+e1xuICAgICAgICAgICAgcGtnLmRvYy5zdGF0dXMgPSA0OyBcbiAgICAgICAgICAgIHBrZy5kb2MubG9jYXRpb24gID0gXCJXYXJlaG91c2UgTkFTXCI7IFxuICAgICAgICAgICAgaWYgKHBrZy5kb2MuaGFzRG9jcyA9PSBcInVuZGVmaW5lZFwiKVxuICAgICAgICAgICAgICBwa2cuZG9jLmhhc0RvY3MgPSAwIDsgXG4gICAgICAgICAgICBzcnYubXlTZWFyY2gudXBkYXRlKHBrZ0lkLHBrZy5kb2MsKGVycix1cGRhdGVSZXN1bHQpPT57XG4gICAgICAgICAgICAgIFxuICAgICAgICAgICAgICBpZihlcnIpXG4gICAgICAgICAgICAgeyAgXG4gICAgICAgICAgICAgICBjb25zb2xlLmxvZyhlcnIpXG4gICAgICAgICAgICAgIHJlamVjdCh7dXBkYXRlZDpmYWxzZX0pIFxuICAgICAgICAgICAgIH0gXG4gICAgICAgICAgICAgIHJlc29sdmUoe3VwZGF0ZWQ6dHJ1ZX0pXG4gICAgICAgICAgICB9KVxuICAgICAgICB9KVxuICAgICB9KVxuICAgfVxuXG4gICAvLyNlbmRyZWdpb25cbn1cblxuZnVuY3Rpb24gZ2V0UGFja2FnZUlkRnJvbUJhckNvZGUoYmFyQ29kZVZhbHVlKXtcbiAgdmFyIHBhcnRzID0gYmFyQ29kZVZhbHVlLnNwbGl0KFwiLVwiKTsgXG4gIGlmIChwYXJ0cy5sZW5ndGggPT0gMylcbiAgICBpZiAodHlwZW9mIHBhcnRzWzJdICE9IFwidW5kZWZpbmVkXCIpXG4gICAgcmV0dXJuIHBhcnRzWzJdLnRyaW0oKTsgXG4gIHJldHVybiBcIlwiXG59XG4iXX0=
