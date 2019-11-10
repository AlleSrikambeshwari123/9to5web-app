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
        packageIndex.search("@awb:[" + id + " " + id + "]", { numberOfResults: 5000, offset: 0, sortBy: 'pkgNo' }, function (err, packages) {
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

        packageIndex.search("@awb:[" + id + " " + id + "]", { numberOfResults: 5000, offset: 0, sortBy: "pkgNo" }, function (err, packages) {
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
        awbIndex.search("@status:[1 1] @hasDocs:[0 0]", { offset: 0, numberOfResults: 5000, sortBy: 'id', sortDir: "DESC" }, function (err, awbs) {
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
              awbList = awbList.reverse();
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
        awbIndex.search("@status:[1 1] @hasDocs:[1 1]", { offset: 0, numberOfResults: 5000, sortBy: 'id', sortDir: 'DESC' }, function (err, awbs) {
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
//# sourceMappingURL=data:application/json;charset=utf8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIlJlZGlzU2VydmljZXMvUGFja2FnZVNlcnZpY2UuZXM2Il0sIm5hbWVzIjpbImVtYWlsU2VydmljZSIsInJlcXVpcmUiLCJyZWRpcyIsImxyZWRpcyIsIm1vbWVudCIsInJlZGlzU2VhcmNoIiwiZnMiLCJQYWNrYWdlVXRpbCIsIlBhY2thZ2VVdGlsaXR5IiwicGFja2FnZVV0aWwiLCJQS0dfSURYIiwiUEtHX0lEX0NPVU5URVIiLCJkYXRhQ29udGV4dCIsIlBLR19QUkVGSVgiLCJBV0JfSUQiLCJJTkRFWF9BV0IiLCJSRUNfUEtHIiwidW5pcUlkIiwiQ3VzdG9tZXJTZXJ2aWNlIiwiY3VzdG9tZXJTZXJ2aWNlIiwiUEtHX1NUQVRVUyIsIklOREVYX1NISVBQRVIiLCJhZGRDb21tYW5kIiwiYXdiSW5kZXgiLCJjbGllbnRPcHRpb25zIiwic2VhcmNoQ2xpZW50RGV0YWlscyIsInBhY2thZ2VJbmRleCIsInNoaXBwZXJJbmRleCIsImdldFBhY2thZ2VWb2x1bW5lIiwibVBhY2thZ2UiLCJjcmVhdGVEb2N1bWVudCIsInRQYWNrYWdlIiwicGFja2FnZURvY3VtZW50IiwiaWQiLCJ0cmFja2luZ05vIiwic2t5Ym94IiwiZGF0ZVJlY2lldmVkIiwidW5peCIsImF3YiIsIm1pZCIsInZvbHVtZSIsIndlaWdodCIsInBpZWNlcyIsImN1c3RvbWVyIiwic2hpcHBlciIsImRlc2NyaXB0aW9uIiwiZGltZW5zaW9ucyIsImNhcnJpZXIiLCJzdGF0dXMiLCJ2YWx1ZSIsImNvbnNvbGUiLCJsb2ciLCJzZXRQYWNrYWdlSW5UcmFuc2l0Iiwia2V5cyIsIm1zZWFyY2hlciIsIlByb21pc2UiLCJyZXNvbHZlIiwicmVqZWN0IiwiYmF0Y2hlciIsImNsaWVudCIsImJhdGNoIiwiZm9yRWFjaCIsImxvY2F0aW9uIiwiZWxlbWVudCIsImhtc2V0IiwiZXhlYyIsImVyciIsInJlc3VsdCIsImFkZFBhY2thZ2VUb0luZGV4IiwiZ2V0UGFja2FnZSIsInRoZW4iLCJkZWxEb2N1bWVudCIsInBhY2siLCJkb25lIiwiZG9jdW1lbnQiLCJhZGQiLCJQYWNrYWdlU2VydmljZSIsInNldHVwSW5kZXgiLCJteVNlYXJjaCIsInJlZGlzQ2xpZW50IiwiZXhpc3RzIiwic2V0IiwiaW5pdFJlc3VsdCIsImluY3IiLCJuZXdJZCIsInRvU3RyaW5nIiwidXBkYXRlZF9ieSIsInVzZXJuYW1lIiwiZGF0ZV91cGRhdGVkIiwidXBkYXRlIiwiZXJyMSIsImF3YlJlcyIsInNhdmVkIiwicmVwbHkiLCJpbnZvaWNlIiwiaGFzRG9jcyIsImNyZWF0ZWRfYnkiLCJkYXRlQ3JlYXRlZCIsInNlYXJjaCIsIm51bWJlck9mUmVzdWx0cyIsIm9mZnNldCIsInNvcnRCeSIsInBhY2thZ2VzIiwidG90YWxSZXN1bHRzIiwicmVzdWx0cyIsInBhY2thZ2UxIiwiZG9jIiwiTnVtYmVyIiwiZGF0YSIsInNydiIsInBhY2thZ2VsaXN0IiwiY291bnQiLCJsZW5ndGgiLCJzdWJzdHJpbmciLCJwdXNoIiwic29ydERpciIsImF3YnMiLCJhd2JMaXN0IiwiYWxsIiwibWFwIiwiZ2V0Q3VzdG9tZXIiLCJjdXN0b21lcklkIiwiZ2V0QXdiT3ZlcnZpZXciLCJjdXN0b21lcnMiLCJpIiwiZm9ybWF0IiwiY29uc2lnbmVlIiwibmFtZSIsImRldGFpbHMiLCJwbWIiLCJyZXZlcnNlIiwiY2F0Y2giLCJnZXREb2MiLCJnZXRBd2JEZXRhaWxzIiwidHJhY2tpbmdOdW1iZXIiLCJsb2NhdGlvbl9pZCIsInBhY2thZ2VSZXN1bHQiLCJuZXdQYWNrYWdlIiwic3Jlc3VsdCIsImJveFNpemUiLCJhd2JJbmZvIiwiaXNTZWQiLCJpbnZvaWNlTnVtYmVyIiwiaGF6bWF0Iiwic2F2ZUF3YiIsImNQYWNrYWdlIiwiYXdiUmVzdWx0IiwiaXNDb25zb2xpZGF0ZWQiLCJzYXZlUGFja2FnZVRvQXdiIiwicGtnQmF0Y2giLCJzYWRkIiwicGtnUmVzdWx0IiwicGtnIiwiaG1nZXQiLCJnZXRQYWNrYWdlSWRGcm9tQmFyQ29kZSIsInRvdGFsV2VpZ2h0IiwiaXNOYU4iLCJib2R5IiwicmVwbGFjZSIsInRyaW0iLCJ0cmFja2luZyIsInJlc3BvbnNlIiwiaW5kZXhQYWNrYWdlIiwiZG9jUmVzdWx0IiwicGFnZSIsInBhZ2VTaXplIiwiYmFyY29kZSIsInBrZ0lkIiwiZ2V0QXdiIiwiZ2V0U2hpcHBlciIsImF3YmluZm8iLCJwYWNrYWdlIiwiY2hlY2tpbiIsImxvY2F0aW9uSWQiLCJnZXRQYWNrYWdlQnlEb2NJZCIsInNlbmRBdFN0b3JlRW1haWwiLCJpbmZvIiwidXBkYXRlZCIsInVzZXIiLCJjaGVja291dEJ5IiwiZXJybSIsIm1zZWFyY2giLCJvbGREb2NJZCIsImRvY0lkIiwidXBkYXRlZFBhY2thZ2VzIiwicGFja2FnZUlkIiwibWFuaWZlc3QiLCJtYW5pZmVzdEtleSIsImRlbCIsImRlY3IiLCJnZXRLZXlzIiwia2V5c0NvdW50Iiwia1Jlc3VsdCIsInNyZW0iLCJyUmVzdWx0IiwiZGVsZXRlZCIsImJpbiIsInNlYXJjaGVyIiwiaXNOb0RvYyIsImNvbXBhbnkiLCJhY3Rpb24iLCJwYWNrYWdlTm8iLCJjb21wYXJ0bWVudCIsImFkZGVkIiwiZ2V0RmxpZ2h0Q29tcGFydG1lbnRXZWlnaHQiLCJmcmVzdWx0IiwiYWdncmVnYXRlIiwicmVtb3ZlZCIsInNoaXBtZW50SWQiLCJzaGlwbWVudENvdW50Iiwic2NhcmQiLCJjYXJkIiwicGtnQ291bnQiLCJwa2dJZm5vIiwicHVibGlzaCIsImdldFBhY2thZ2VCeUlkIiwic2VuZE5vRG9jc0VtYWlsIiwicmVmTG9jIiwid2xvYyIsImVyclJlc3AiLCJzZW50IiwidXBkYXRlUmVzdWx0IiwiYmFyQ29kZVZhbHVlIiwicGFydHMiLCJzcGxpdCJdLCJtYXBwaW5ncyI6Ijs7Ozs7Ozs7O0FBQUE7O0FBQ0E7Ozs7OztBQUVBLElBQUlBLGVBQWVDLFFBQVEsc0JBQVIsQ0FBbkI7QUFDQSxJQUFJQyxRQUFRRCxRQUFRLE9BQVIsQ0FBWjtBQUNBLElBQUlFLFNBQVNGLFFBQVEsZUFBUixDQUFiO0FBQ0EsSUFBSUcs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T0FsQk0sQ0FBUDtBQW1CRDs7QUFFRDs7Ozs7OztBQUdILFNBQVN2Qix1QkFBVCxDQUFpQ29FLFlBQWpDLEVBQThDO0FBQzVDLE1BQUlDLFFBQVFELGFBQWFFLEtBQWIsQ0FBbUIsR0FBbkIsQ0FBWjtBQUNBLE1BQUlELE1BQU0vRyxNQUFOLElBQWdCLENBQXBCLEVBQ0UsSUFBSSxPQUFPK0csTUFBTSxDQUFOLENBQVAsSUFBbUIsV0FBdkIsRUFDQSxPQUFPQSxNQUFNLENBQU4sRUFBU2hFLElBQVQsRUFBUDtBQUNGLFNBQU8sRUFBUDtBQUNEIiwiZmlsZSI6IlJlZGlzU2VydmljZXMvUGFja2FnZVNlcnZpY2UuanMiLCJzb3VyY2VzQ29udGVudCI6WyJpbXBvcnQgeyBjcHVzIH0gZnJvbSBcIm9zXCI7XG5pbXBvcnQgeyBwcm9taXNlcyB9IGZyb20gXCJkbnNcIjtcblxudmFyIGVtYWlsU2VydmljZSA9IHJlcXVpcmUoXCIuLi9VdGlsL0VtYWlsU2VydmljZVwiKVxudmFyIHJlZGlzID0gcmVxdWlyZShcInJlZGlzXCIpO1xudmFyIGxyZWRpcyA9IHJlcXVpcmUoXCIuL3JlZGlzLWxvY2FsXCIpO1xudmFyIG1vbWVudCA9IHJlcXVpcmUoXCJtb21lbnRcIik7XG52YXIgcmVkaXNTZWFyY2ggPSByZXF1aXJlKFwiLi4vcmVkaXNlYXJjaGNsaWVudFwiKTtcbnZhciBmcyA9IHJlcXVpcmUoXCJmc1wiKTtcbnZhciBtb21lbnQgPSByZXF1aXJlKCdtb21lbnQnKVxudmFyIFBhY2thZ2VVdGlsID0gcmVxdWlyZShcIi4uL1V0aWwvcGFja2FnZXV0aWxcIikuUGFja2FnZVV0aWxpdHk7XG52YXIgcGFja2FnZVV0aWwgPSBuZXcgUGFja2FnZVV0aWwoKTtcbmNvbnN0IFBLR19JRFggPSBcImluZGV4OnBhY2thZ2VzXCI7XG5jb25zdCBQS0dfSURfQ09VTlRFUiA9IFwicGFja2FnZTppZFwiO1xudmFyIGRhdGFDb250ZXh0ID0gcmVxdWlyZSgnLi9kYXRhQ29udGV4dCcpXG5jb25zdCBQS0dfUFJFRklYID0gXCJwYWNrYWdlczpcIjtcbmNvbnN0IEFXQl9JRCA9IFwiYXdiOmlkXCJcbmNvbnN0IElOREVYX0FXQiA9IFwiaW5kZXg6YXdiXCJcbmNvbnN0IFJFQ19QS0cgPSBcInBrZzpyZWM6XCJcbnZhciB1bmlxSWQgPSByZXF1aXJlKFwidW5pcWlkXCIpOyBcbnZhciBDdXN0b21lclNlcnZpY2UgPSByZXF1aXJlKCcuL0N1c3RvbWVyU2VydmljZScpLkN1c3RvbWVyU2VydmljZTsgXG52YXIgY3VzdG9tZXJTZXJ2aWNlID0gbmV3IEN1c3RvbWVyU2VydmljZSgpXG5jb25zdCBQS0dfU1RBVFVTID0geyBcbiAgMSA6IFwiUmVjZWl2ZWRcIixcbiAgMjogXCJMb2FkZWQgb24gQWlyQ3JhZnRcIixcbiAgMzogXCJJbiBUcmFuc2l0XCIsXG4gIDQ6IFwiUmVjaWV2ZWQgaW4gTkFTXCIsXG4gIDU6IFwiUmVhZHkgZm9yIFBpY2t1cCAvIERlbGl2ZXJ5XCIsXG4gIDY6IFwiRGVsaXZlcmVkXCJcblxufTsgXG5jb25zdCBJTkRFWF9TSElQUEVSID0gXCJpbmRleDpzaGlwcGVyXCJcbnJlZGlzLmFkZENvbW1hbmQoXCJmdC5hZ2dyZWdhdGVcIilcbmNvbnN0IGF3YkluZGV4ID0gcmVkaXNTZWFyY2gocmVkaXMsIElOREVYX0FXQiwge1xuICBjbGllbnRPcHRpb25zOiBscmVkaXMuc2VhcmNoQ2xpZW50RGV0YWlsc1xufSk7XG5jb25zdCBwYWNrYWdlSW5kZXggPSByZWRpc1NlYXJjaChyZWRpcywgUEtHX0lEWCwge1xuICBjbGllbnRPcHRpb25zOiBscmVkaXMuc2VhcmNoQ2xpZW50RGV0YWlsc1xufSk7XG5jb25zdCBzaGlwcGVySW5kZXggPSByZWRpc1NlYXJjaChyZWRpcywgSU5ERVhfU0hJUFBFUiwge1xuICBjbGllbnRPcHRpb25zOiBscmVkaXMuc2VhcmNoQ2xpZW50RGV0YWlsc1xufSk7XG5mdW5jdGlvbiBnZXRQYWNrYWdlVm9sdW1uZShtUGFja2FnZSl7XG5cbiAgcmV0dXJuIDA7IFxufVxuZnVuY3Rpb24gY3JlYXRlRG9jdW1lbnQodFBhY2thZ2UpIHtcbiAgdmFyIHBhY2thZ2VEb2N1bWVudCA9IHtcbiAgICBpZDp0UGFja2FnZS5pZCxcbiAgICB0cmFja2luZ05vOiB0UGFja2FnZS50cmFja2luZ05vLFxuICAgIHNreWJveDogdFBhY2thZ2Uuc2t5Ym94LFxuICAgIGRhdGVSZWNpZXZlZCA6IG1vbWVudCgpLnVuaXgoKSwgXG4gICAgYXdiOjAsIFxuICAgIG1pZDowLFxuICAgIHZvbHVtZTogZ2V0UGFja2FnZVZvbHVtbmUodFBhY2thZ2UpLFxuICAgIHdlaWdodDp0UGFja2FnZS53ZWlnaHQsXG4gICAgcGllY2VzOnRQYWNrYWdlLnBpZWNlcyxcbiAgICBjdXN0b21lcjogdFBhY2thZ2UuY3VzdG9tZXIsXG4gICAgc2hpcHBlcjogdFBhY2thZ2Uuc2hpcHBlcixcbiAgICBkZXNjcmlwdGlvbjogdFBhY2thZ2UuZGVzY3JpcHRpb24sXG4gICAgZGltZW5zaW9uczp0UGFja2FnZS5kaW1lbnNpb25zLFxuICAgIGNhcnJpZXI6dFBhY2thZ2UuY2FycmllcixcbiAgICAvL3NreWJveFY6IHRQYWNrYWdlLnNreWJveCwgYWRkIGRpbWVuaW9uIFxuICAgIHN0YXR1czogdFBhY2thZ2Uuc3RhdHVzLFxuICAgIG1pZDogdFBhY2thZ2UubWlkLFxuICAgIHZhbHVlOiB0UGFja2FnZS52YWx1ZSxcbiAgICBcbiAgfTtcbiAgY29uc29sZS5sb2coXCJhYm91dCB0byBhZGQgdGhlIHBhY2thZ2UgdG8gdGhlIGluZGV4XCIpO1xuICByZXR1cm4gcGFja2FnZURvY3VtZW50O1xufVxuZnVuY3Rpb24gc2V0UGFja2FnZUluVHJhbnNpdChrZXlzLCBtc2VhcmNoZXIpIHtcbiAgcmV0dXJuIG5ldyBQcm9taXNlKChyZXNvbHZlLCByZWplY3QpID0+IHtcbiAgICB2YXIgYmF0Y2hlciA9IG1zZWFyY2hlci5jbGllbnQuYmF0Y2goKTtcbiAgICBrZXlzLmZvckVhY2goZWxlbWVudCA9PiB7XG4gICAgICB2YXIgdmFsdWUgPSB7XG4gICAgICAgIHN0YXR1czogMixcbiAgICAgICAgbG9jYXRpb246IFwiSW4gVHJhbnNpdFwiXG4gICAgICB9O1xuICAgICAgY29uc29sZS5sb2coZWxlbWVudCArIFwiaXMgdGhlIGVsZW1lbnRcIik7XG5cbiAgICAgIGJhdGNoZXIuaG1zZXQoUEtHX1BSRUZJWCArIGVsZW1lbnQsIHZhbHVlKTtcbiAgICB9KTtcbiAgICBiYXRjaGVyLmV4ZWMoKGVyciwgcmVzdWx0KSA9PiB7XG4gICAgICBjb25zb2xlLmxvZyhyZXN1bHQpO1xuICAgICAgLy9yZWFkZCB0aGUgZG9jdW1lbnRzIGhlcmVcbiAgICAgIGtleXMuZm9yRWFjaChlbGVtZW50ID0+IHtcbiAgICAgICAgYWRkUGFja2FnZVRvSW5kZXgoZWxlbWVudCwgbXNlYXJjaGVyKTtcbiAgICAgIH0pO1xuICAgICAgcmVzb2x2ZShyZXN1bHQpO1xuICAgIH0pO1xuICB9KTtcbn1cblxuZnVuY3Rpb24gYWRkUGFja2FnZVRvSW5kZXgodHJhY2tpbmdObywgbXNlYXJjaGVyKSB7XG4gIGxyZWRpcy5nZXRQYWNrYWdlKHRyYWNraW5nTm8pLnRoZW4ocGFjayA9PiB7XG4gICAgbXNlYXJjaGVyLmRlbERvY3VtZW50KFBLR19JRFgsIGAke3BhY2subWlkfS0ke3RyYWNraW5nTm99YCwgKGVyciwgZG9uZSkgPT4ge1xuICAgICAgdmFyIGRvY3VtZW50ID0gY3JlYXRlRG9jdW1lbnQocGFjayk7XG4gICAgICBjb25zb2xlLmxvZyhcInJlYWRkaW5nIHBhY2thZ2UgdG8gdGhlIGluZGV4IGxpa2UgYSBib3NzIFwiICsgdHJhY2tpbmdObyk7XG4gICAgICBtc2VhcmNoZXIuYWRkKHBhY2subWlkICsgXCItXCIgKyBwYWNrLnRyYWNraW5nTm8sIGRvY3VtZW50KTtcbiAgICB9KTtcbiAgfSk7XG59XG5leHBvcnQgY2xhc3MgUGFja2FnZVNlcnZpY2Uge1xuICBjb25zdHJ1Y3RvcigpIHtcbiAgICB0aGlzLnNldHVwSW5kZXgoKTtcbiAgfVxuICBzZXR1cEluZGV4KCkge1xuICAgIHRoaXMubXlTZWFyY2ggPSByZWRpc1NlYXJjaChyZWRpcywgUEtHX0lEWCwge1xuICAgICAgY2xpZW50T3B0aW9uczogbHJlZGlzLnNlYXJjaENsaWVudERldGFpbHNcbiAgICB9KTtcbiAgfVxuICBnZXROZXdBd2IoKXtcbiAgICByZXR1cm4gbmV3IFByb21pc2UoKHJlc29sdmUscmVqZWN0KT0+e1xuICAgICAgZGF0YUNvbnRleHQucmVkaXNDbGllbnQuZXhpc3RzKEFXQl9JRCwoZXJyLHJlc3VsdCk9PntcbiAgICAgICAgY29uc29sZS5sb2cocmVzdWx0KTsgXG4gICAgICAgIGlmIChyZXN1bHQgIT0gXCIxXCIpe1xuICAgICAgICAgIGRhdGFDb250ZXh0LnJlZGlzQ2xpZW50LnNldChBV0JfSUQgPT0gMTAwMDAwLChlcnIsaW5pdFJlc3VsdCk9PntcbiAgICAgICAgICAgIGRhdGFDb250ZXh0LnJlZGlzQ2xpZW50LmluY3IoQVdCX0lELChlcnIsbmV3SWQpPT57XG4gICAgICAgICAgICAgIHJlc29sdmUoe2F3YjpuZXdJZH0pXG4gICAgICAgICAgICB9KVxuICAgICAgICAgIH0pXG4gICAgICAgIH1cbiAgICAgICAgZWxzZSB7XG4gICAgICAgICAgZGF0YUNvbnRleHQucmVkaXNDbGllbnQuaW5jcihBV0JfSUQsKGVycixuZXdJZCk9PntcbiAgICAgICAgICAgIHJlc29sdmUoe2F3YjpuZXdJZH0pXG4gICAgICAgICAgfSlcbiAgICAgICAgfVxuICAgICAgfSlcbiAgICB9KTtcbiAgfVxuICBzYXZlQXdiKGF3Yil7XG4gICAgcmV0dXJuIG5ldyBQcm9taXNlKChyZXNvbHZlLHJlamVjdCk9PntcbiAgICAgIGNvbnNvbGUubG9nKCdzYXZpbmcuLi4nLGF3Yixtb21lbnQoKS50b1N0cmluZyhcImhoOm1tOnNzXCIpKVxuICAgICAgaWYgKGF3Yi5pZCAhPVwiXCIpe1xuICAgICAgICBhd2IudXBkYXRlZF9ieSA9IGF3Yi51c2VybmFtZTsgXG4gICAgICAgIGF3Yi5kYXRlX3VwZGF0ZWQgPSBtb21lbnQoKS51bml4KCk7IFxuICAgICAgICBhd2JJbmRleC51cGRhdGUoYXdiLmlkLGF3YiwoZXJyMSxhd2JSZXMpPT57XG4gICAgICAgICAgaWYgKGVycjEpe1xuICAgICAgICAgICAgY29uc29sZS5sb2coJ3NhdmluZyBlcnInLGVycjEpXG4gICAgICAgICAgICByZXNvbHZlKHtzYXZlZDpmYWxzZX0pXG4gICAgICAgICAgfVxuICAgICAgICAgIHJlc29sdmUoe3NhdmVkOnRydWUsIGlkOmF3Yi5pZH0pXG4gICAgICAgIH0pXG4gICAgICB9XG4gICAgICBlbHNle1xuICAgICAgZGF0YUNvbnRleHQucmVkaXNDbGllbnQuaW5jcihBV0JfSUQsKGVycixyZXBseSk9PntcbiAgICAgICAgYXdiLmlkID0gcmVwbHk7IFxuICAgICAgICBhd2Iuc3RhdHVzID0gMTsgXG4gICAgICAgIGlmIChhd2IuaW52b2ljZSl7XG4gICAgICAgICAgYXdiLmhhc0RvY3MgPSAxXG4gICAgICAgICAgY29uc29sZS5sb2coXCJIQVMgRE9DQ0NDQ1wiKVxuICAgICAgICB9XG4gICAgICAgIGVsc2Uge1xuICAgICAgICAgIGF3Yi5oYXNEb2NzID0gMCA7IFxuICAgICAgICAgIGNvbnNvbGUubG9nKFwiSEFTIE5PIERPQ0NDQ0NcIilcbiAgICAgICAgfVxuXG4gICAgICAgIGF3Yi5jcmVhdGVkX2J5ID0gYXdiLnVzZXJuYW1lOyBcbiAgICAgICAgZGVsZXRlIGF3Yi51c2VybmFtZTtcbiAgICAgICAgYXdiLmRhdGVDcmVhdGVkID0gbW9tZW50KCkudW5peCgpOyBcbiAgICAgICAgICBhd2JJbmRleC5hZGQoYXdiLmlkLGF3YiwoZXJyMSxhd2JSZXMpPT57XG4gICAgICAgICAgICBpZiAoZXJyMSl7XG4gICAgICAgICAgICAgIGNvbnNvbGUubG9nKCdzYXZpbmcgZXJyJyxlcnIxKVxuICAgICAgICAgICAgICByZXNvbHZlKHtzYXZlZDpmYWxzZX0pXG4gICAgICAgICAgICB9XG4gICAgICAgICAgICByZXNvbHZlKHtzYXZlZDp0cnVlLCBpZDpyZXBseX0pXG4gICAgICAgICAgfSlcbiAgICAgIH0pXG4gICAgfVxuICAgICAgXG4gICAgICBcbiAgICB9KVxuICB9XG4gIGdldEF3Yk92ZXJ2aWV3KGlkKXtcbiAgICAvLyBnZXQgdGhlIGF3YiBwYWNrYWdlcyBhbmQgYWRkIGV2ZXJ5dGhpbmcgaW4gXG4gICAgcmV0dXJuIG5ldyBQcm9taXNlKChyZXNvbHZlLHJlamVjdCk9PntcbiAgICAgIHBhY2thZ2VJbmRleC5zZWFyY2goYEBhd2I6WyR7aWR9ICR7aWR9XWAse251bWJlck9mUmVzdWx0czo1MDAwLG9mZnNldDowLHNvcnRCeToncGtnTm8nfSwoZXJyLHBhY2thZ2VzKT0+e1xuICAgICAgICB2YXIgd2VpZ2h0ID0gMCA7IFxuICAgICAgICB2YXIgcGllY2VzID0gcGFja2FnZXMudG90YWxSZXN1bHRzOyBcbiAgICAgICAgdmFyIGRlc2NyaXB0aW9uID0gXCJcIlxuICAgICAgICBwYWNrYWdlcy5yZXN1bHRzLmZvckVhY2gocGFja2FnZTEgPT4ge1xuICAgICAgICAgIGlmIChkZXNjcmlwdGlvbiA9PVwiXCIpXG4gICAgICAgICAgICBkZXNjcmlwdGlvbiA9IHBhY2thZ2UxLmRvYy5kZXNjcmlwdGlvbjsgXG4gICAgICAgICAgd2VpZ2h0ICs9IE51bWJlcihwYWNrYWdlMS5kb2Mud2VpZ2h0KVxuICAgICAgICB9KTtcbiAgICAgICAgdmFyIGRhdGEgID0ge3dlaWdodDp3ZWlnaHQsZGVzY3JpcHRpb246ZGVzY3JpcHRpb24scGllY2VzOnBpZWNlc31cbiAgICAgICAgY29uc29sZS5sb2coZGF0YSxcIkFXQiBERVRBSUxTXCIpOyBcbiAgICAgICAgcmVzb2x2ZSggZGF0YSlcbiAgICAgIH0pXG4gICAgfSlcbiAgIFxuICB9XG4gIGdldEF3YkRldGFpbHMoaWQpe1xuICAgIHZhciBzcnYgPSB0aGlzOyBcbiAgICByZXR1cm4gbmV3IFByb21pc2UoKHJlc29sdmUscmVqZWN0KT0+e1xuICAgICAgY29uc29sZS5sb2coYEBhd2I6WyR7aWR9ICR7aWR9XWApXG4gICAgIFxuICAgICAgcGFja2FnZUluZGV4LnNlYXJjaChgQGF3YjpbJHtpZH0gJHtpZH1dYCx7bnVtYmVyT2ZSZXN1bHRzOjUwMDAsb2Zmc2V0OjAsc29ydEJ5OlwicGtnTm9cIn0sKGVycixwYWNrYWdlcyk9PntcbiAgICAgICAgaWYgKGVycilcbiAgICAgICAgIGNvbnNvbGUubG9nKGVycilcbiAgICAgIFxuICAgICAgICB2YXIgIHBhY2thZ2VsaXN0ICA9IFtdXG4gICAgICAgIHZhciBjb3VudCA9IDE7IFxuICAgICAgICBwYWNrYWdlcy5yZXN1bHRzLmZvckVhY2gocGFja2FnZTEgPT4ge1xuXG4gICAgICAgICAgaWYgKHBhY2thZ2UxLmRvYy50cmFja2luZ05vLmxlbmd0aCA+IDcpe1xuICAgICAgICAgICAgLy9vbmx5IGRpc3BsYXkgdGhlIGxhc3QgNyBcbiAgICAgICAgICAgIHBhY2thZ2UxLmRvYy50cmFja2luZ05vID0gcGFja2FnZTEuZG9jLnRyYWNraW5nTm8uc3Vic3RyaW5nKHBhY2thZ2UxLmRvYy50cmFja2luZ05vLmxlbmd0aCAtNylcbiAgICAgICAgICAgIFxuICAgICAgICAgIH1cbiAgICAgICAgICBwYWNrYWdlMS5kb2MucGFja2FnZUluZGV4ID0gY291bnQ7XG4gICAgICAgICAgY291bnQgKys7IFxuICAgICAgICAgIHBhY2thZ2VsaXN0LnB1c2goIHBhY2thZ2UxLmRvYylcbiAgICAgICAgfSk7XG4gICAgICAgXG4gICAgICAgXG4gICAgICAgIHJlc29sdmUoIHBhY2thZ2VsaXN0KVxuICAgICAgfSlcbiAgICB9KVxuICB9XG4gIGxpc3ROb0RvY3NGbGwoKXtcbiAgICByZXR1cm4gbmV3IFByb21pc2UoKHJlc29sdmUscmVqZWN0KT0+e1xuICAgICAgIGF3YkluZGV4LnNlYXJjaChcIkBzdGF0dXM6WzEgMV0gQGhhc0RvY3M6WzAgMF1cIix7b2Zmc2V0OjAsbnVtYmVyT2ZSZXN1bHRzOjUwMDAsc29ydEJ5OidpZCcsc29ydERpcjpcIkRFU0NcIn0sKGVycixhd2JzKT0+e1xuICAgICAgICAgdmFyIGF3Ykxpc3QgPSBbXTsgXG4gICAgICAgICBQcm9taXNlLmFsbChhd2JzLnJlc3VsdHMubWFwKGF3Yj0+Y3VzdG9tZXJTZXJ2aWNlLmdldEN1c3RvbWVyKGF3Yi5kb2MuY3VzdG9tZXJJZCkpKS50aGVuKGN1c3RvbWVycz0+e1xuICAgICAgICAgICBQcm9taXNlLmFsbChhd2JzLnJlc3VsdHMubWFwKGF3Yj0+dGhpcy5nZXRBd2JPdmVydmlldyhhd2IuZG9jLmlkKSkpLnRoZW4oZGV0YWlscz0+e1xuICAgICAgICAgICAgY29uc29sZS5sb2coXCJnb3QgdGhlIGN1c3RvbWVyc1wiLGN1c3RvbWVycywgYXdicylcbiAgICAgICAgICAgIGZvcih2YXIgaSA9MCA7IGkgPCBhd2JzLnJlc3VsdHMubGVuZ3RoIDsgaSsrICl7XG4gICAgICAgICAgICAgIHZhciBhd2IgPSBhd2JzLnJlc3VsdHNbaV07IFxuICAgICAgICAgICAgICBhd2IuZG9jLmRhdGVDcmVhdGVkID0gbW9tZW50LnVuaXgoYXdiLmRvYy5kYXRlQ3JlYXRlZCkuZm9ybWF0KFwiWVlZWS1NTS1ERCBoaDptbSBBXCIpXG4gICAgICAgICAgICAgIC8vd2UgbmVlZCB0byBnZXQgdGhlIGN1c3RvbWVyIFxuICAgICAgICAgICAgICBhd2IuZG9jLmNvbnNpZ25lZSA9IGN1c3RvbWVyc1tpXS5uYW1lOyBcbiAgICAgICAgICAgICAgYXdiLmRvYy53ZWlnaHQgPSBkZXRhaWxzW2ldLndlaWdodDsgXG4gICAgICAgICAgICAgIGF3Yi5kb2MucG1iID0gY3VzdG9tZXJzW2ldLnBtYjsgXG4gICAgICAgICAgICAgIGF3Yi5kb2MuZGVzY3JpcHRpb24gPSBkZXRhaWxzW2ldLmRlc2NyaXB0aW9uOyBcbiAgICAgICAgICAgICAgYXdiLmRvYy5waWVjZXMgPSBkZXRhaWxzW2ldLnBpZWNlczsgXG4gICAgICAgICAgICAgIGlmIChjdXN0b21lcnNbaV0ucG1iID09ICcnKXtcbiAgICAgICAgICAgICAgICBhd2IuZG9jLnBtYiA9ICc5MDAwJ1xuICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgIGNvbnNvbGUubG9nKCdwdXNoaW5nICcsYXdiKVxuICAgICAgICAgICAgICAvL3dlIG5lZWQgdG8gZ2V0IGFsbCB0aGUgcGFja2FnZXMgXG4gICAgICAgICAgICAgIGF3Ykxpc3QucHVzaChhd2IuZG9jKVxuICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICBhd2JMaXN0ID0gYXdiTGlzdC5yZXZlcnNlKCk7XG4gICAgICAgICAgICAgcmVzb2x2ZSh7YXdiczphd2JMaXN0fSlcbiAgICAgICAgICAgfSlcbiAgICAgICAgICBcbiAgICAgICAgICB9KS5jYXRjaChlcnI9PntcbiAgICAgICAgICAgIGNvbnNvbGUubG9nKGVycik7IFxuICAgICAgICAgIH0pXG4gICAgICAgICBcbiAgICAgICAgLy8gIGF3YnMucmVzdWx0cy5mb3JFYWNoKGF3YiA9PiB7XG4gICAgICAgICAgIFxuICAgICAgICAgIFxuICAgICAgICAvLyAgfSk7XG4gICAgICAgICBcbiAgICAgICB9KVxuICAgIH0pXG4gIH1cblxuICBsaXN0QXdiaW5GbGwoKXtcbiAgICByZXR1cm4gbmV3IFByb21pc2UoKHJlc29sdmUscmVqZWN0KT0+e1xuICAgICAgIGF3YkluZGV4LnNlYXJjaChcIkBzdGF0dXM6WzEgMV0gQGhhc0RvY3M6WzEgMV1cIix7b2Zmc2V0OjAsbnVtYmVyT2ZSZXN1bHRzOjUwMDAsc29ydEJ5OidpZCcsc29ydERpcjonREVTQyd9LChlcnIsYXdicyk9PntcbiAgICAgICAgIHZhciBhd2JMaXN0ID0gW107IFxuICAgICAgICAgUHJvbWlzZS5hbGwoYXdicy5yZXN1bHRzLm1hcChhd2I9PmN1c3RvbWVyU2VydmljZS5nZXRDdXN0b21lcihhd2IuZG9jLmN1c3RvbWVySWQpKSkudGhlbihjdXN0b21lcnM9PntcbiAgICAgICAgICAgUHJvbWlzZS5hbGwoYXdicy5yZXN1bHRzLm1hcChhd2I9PnRoaXMuZ2V0QXdiT3ZlcnZpZXcoYXdiLmRvYy5pZCkpKS50aGVuKGRldGFpbHM9PntcbiAgICAgICAgICAgIGNvbnNvbGUubG9nKFwiZ290IHRoZSBjdXN0b21lcnNcIixjdXN0b21lcnMsIGF3YnMpXG4gICAgICAgICAgICBmb3IodmFyIGkgPTAgOyBpIDwgYXdicy5yZXN1bHRzLmxlbmd0aCA7IGkrKyApe1xuICAgICAgICAgICAgICB2YXIgYXdiID0gYXdicy5yZXN1bHRzW2ldOyBcbiAgICAgICAgICAgICAgYXdiLmRvYy5kYXRlQ3JlYXRlZCA9IG1vbWVudC51bml4KGF3Yi5kb2MuZGF0ZUNyZWF0ZWQpLmZvcm1hdChcIllZWVktTU0tREQgaGg6bW0gQVwiKVxuICAgICAgICAgICAgICAvL3dlIG5lZWQgdG8gZ2V0IHRoZSBjdXN0b21lciBcbiAgICAgICAgICAgICAgYXdiLmRvYy5jb25zaWduZWUgPSBjdXN0b21lcnNbaV0ubmFtZTsgXG4gICAgICAgICAgICAgIGF3Yi5kb2MucG1iID0gY3VzdG9tZXJzW2ldLnBtYjsgXG4gICAgICAgICAgICAgIGF3Yi5kb2Mud2VpZ2h0ID0gZGV0YWlsc1tpXS53ZWlnaHQ7IFxuICAgICAgICAgICAgICBhd2IuZG9jLmRlc2NyaXB0aW9uID0gZGV0YWlsc1tpXS5kZXNjcmlwdGlvbjsgXG4gICAgICAgICAgICAgIGF3Yi5kb2MucGllY2VzID0gZGV0YWlsc1tpXS5waWVjZXM7IFxuICAgICAgICAgICAgICBpZiAoY3VzdG9tZXJzW2ldLnBtYiA9PSAnJyl7XG4gICAgICAgICAgICAgICAgYXdiLmRvYy5wbWIgPSAnOTAwMCdcbiAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICBjb25zb2xlLmxvZygncHVzaGluZyAnLGF3YilcbiAgICAgICAgICAgICAgLy93ZSBuZWVkIHRvIGdldCBhbGwgdGhlIHBhY2thZ2VzIFxuICAgICAgICAgICAgICBhd2JMaXN0LnB1c2goYXdiLmRvYylcbiAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgcmVzb2x2ZSh7YXdiczphd2JMaXN0fSlcbiAgICAgICAgICAgfSlcbiAgICAgICAgICBcbiAgICAgICAgICB9KS5jYXRjaChlcnI9PntcbiAgICAgICAgICAgIGNvbnNvbGUubG9nKGVycik7IFxuICAgICAgICAgIH0pXG4gICAgICAgICBcbiAgICAgICAgLy8gIGF3YnMucmVzdWx0cy5mb3JFYWNoKGF3YiA9PiB7XG4gICAgICAgICAgIFxuICAgICAgICAgIFxuICAgICAgICAvLyAgfSk7XG4gICAgICAgICBcbiAgICAgICB9KVxuICAgIH0pXG4gIH1cbiAgZ2V0QXdiKGlkKXtcbiAgICBjb25zdCBzcnYgPSB0aGlzOyBcbiAgICByZXR1cm4gbmV3IFByb21pc2UoKHJlc29sdmUscmVqZWN0KT0+e1xuICAgICAgYXdiSW5kZXguZ2V0RG9jKGlkLChlcnIsYXdiKT0+e1xuICAgICAgICAvL2dldCB0aGUgY3VzdG9tZXIgXG4gICAgICAgIGN1c3RvbWVyU2VydmljZS5nZXRDdXN0b21lcihhd2IuZG9jLmN1c3RvbWVySWQpLnRoZW4oY3VzdG9tZXI9PntcbiAgICAgICAgICBhd2IuZG9jLmN1c3RvbWVyID0gY3VzdG9tZXI7IFxuICAgICAgICAgIHNydi5nZXRBd2JEZXRhaWxzKGlkKS50aGVuKHBhY2thZ2VzPT57XG4gICAgICAgICAgICAvL2dldCB0aGUgcGFja2FnZXMgZm9yIHRoZSBhd2IgXG4gICAgICAgICAgICBhd2IuZG9jLnBhY2thZ2VzID0gcGFja2FnZXM7IFxuICAgICAgICAgICAgcmVzb2x2ZSh7YXdiOmF3Yi5kb2N9KSAgXG4gICAgICAgICAgfSlcbiAgICAgICAgICBcbiAgICAgICAgfSlcbiAgICAgICAgXG4gICAgICB9KVxuICAgIH0pXG4gIH1cbiAgdXBkYXRlTG9jYXRpb24odHJhY2tpbmdOdW1iZXIsbG9jYXRpb25faWQpe1xuICAgIHJldHVybiBuZXcgUHJvbWlzZSgocmVzb2x2ZSxyZWplY3QpPT57XG4gICAgICBwYWNrYWdlSW5kZXguc2VhcmNoKFwiQHRyYWNraW5nTm86XCIrdHJhY2tpbmdOdW1iZXIse2xvY2F0aW9uOmxvY2F0aW9uX2lkfSwoZXJyLHBhY2thZ2VSZXN1bHQpPT57XG5cbiAgICAgIH0pXG4gICAgfSlcbiAgfVxuICBzYXZlUGFja2FnZVRvQXdiKG5ld1BhY2thZ2Upe1xuICAgIHJldHVybiBuZXcgUHJvbWlzZSgocmVzb2x2ZSxyZXN1bHQpPT57XG4gICAgICBpZiAobmV3UGFja2FnZS5pZCAhPVwiMFwiKXtcbiAgICAgICAgcGFja2FnZUluZGV4LnVwZGF0ZShuZXdQYWNrYWdlLmlkLG5ld1BhY2thZ2UsKGVycixyZXN1bHQpPT57XG4gICAgICAgICAgaWYgKGVycilcbiAgICAgICAgICAgIGNvbnNvbGUubG9nKGVycik7IFxuICAgICAgICAgIHJlc29sdmUoe3NhdmVkOnRydWUsaWQ6bmV3UGFja2FnZS5pZH0pXG4gICAgICAgIH0pXG4gICAgICB9XG4gICAgICBlbHNlIHtcbiAgICAgICAgZGF0YUNvbnRleHQucmVkaXNDbGllbnQuaW5jcihQS0dfSURfQ09VTlRFUiwoZXJyLGlkKT0+e1xuICAgICAgICAgIG5ld1BhY2thZ2UuaWQgPSBpZDsgXG4gICAgICAgICAgcGFja2FnZUluZGV4LmFkZChpZCxuZXdQYWNrYWdlLChlcnIscmVzdWx0KT0+e1xuICAgICAgICAgICAgaWYgKGVycilcbiAgICAgICAgICAgICAgY29uc29sZS5sb2coZXJyKTsgXG4gICAgICAgICAgICByZXNvbHZlKHtzYXZlZDp0cnVlLGlkOmlkfSlcbiAgICAgICAgICB9KVxuICAgICAgICB9KVxuICAgICAgfVxuICAgXG4gICAgfSlcbiAgfVxuICBnZXRTaGlwcGVyKGlkKXtcbiAgICByZXR1cm4gbmV3IFByb21pc2UoKHJlc29sdmUscmVqZWN0KT0+e1xuICAgICBzaGlwcGVySW5kZXguZ2V0RG9jKGlkLChlcnIsc3Jlc3VsdCk9PntcbiAgICAgICBpZiAoZXJyKVxuICAgICAgICByZXNvbHZlKGlkKTtcblxuICAgICAgICByZXNvbHZlKHNyZXN1bHQuZG9jKTsgXG4gICAgIH0pXG4gICAgfSlcbiAgfVxuICBjcmVhdGVDb25zb2xhdGVkKHBhY2thZ2VzLHVzZXJuYW1lLGJveFNpemUpe1xuICAgIHZhciBzcnYgPSB0aGlzOyBcbiAgICByZXR1cm4gbmV3IFByb21pc2UoKHJlc29sdmUscmVqZWN0KT0+e1xuICAgICAgdmFyIGF3YkluZm8gPSB7IFxuICAgICAgICBpZDogXCJcIixcbiAgICAgICAgaXNTZWQ6MCxcbiAgICAgICAgaGFzRG9jczogXCIwXCIsXG4gICAgICAgIGludm9pY2VOdW1iZXI6XCJcIixcbiAgICAgICAgdmFsdWU6XCIwXCIsXG4gICAgICAgIGN1c3RvbWVySWQ6MjQxOTcsXG4gICAgICAgIHNoaXBwZXI6XCI0ODJcIiwgLy8gd2Ugc2hvdWxkIGdldCBhbiBpZCBoZXJlIFxuICAgICAgICBjYXJyaWVyOlwiVVNQU1wiLFxuICAgICAgICBoYXptYXQ6XCJcIixcbiAgICAgICAgdXNlcm5hbWU6ICB1c2VybmFtZVxuICAgICAgIFxuICAgIH07XG4gICAgc3J2LnNhdmVBd2IoYXdiSW5mbykudGhlbihhd2JSZXN1bHQ9PntcbiAgICAgICAvL2FkZCBcbiAgICAgICAgICB2YXIgY1BhY2thZ2UgPSB7XG4gICAgICAgICAgICBpZDowLFxuICAgICAgICAgICAgdHJhY2tpbmdObzogdW5pcUlkKCksXG4gICAgICAgICAgICBkZXNjcmlwdGlvbjogXCJDb25zb2xpZGF0ZWQgUGFja2FnZVwiLFxuICAgICAgICAgICAgd2VpZ2h0OjAsIFxuICAgICAgICAgICAgZGltZW5zaW9uczogIGAke2JveFNpemV9eCR7Ym94U2l6ZX14JHtib3hTaXplfWAsXG4gICAgICAgICAgICBhd2I6YXdiUmVzdWx0LmlkLCBcbiAgICAgICAgICAgIGlzQ29uc29saWRhdGVkOiBcIjFcIiwgXG4gICAgICAgICAgICBjcmVhdGVkX2J5OiB1c2VybmFtZSwgXG4gICAgICAgICAgXG4gICAgICAgIH07IFxuICAgICAgICBzcnYuc2F2ZVBhY2thZ2VUb0F3YihjUGFja2FnZSkudGhlbihwa2dSZXN1bHQ9PntcbiAgICAgICAgICAvLyBnZXQgdGhlIGlkIFxuICAgICAgICAgIC8vXG4gICAgICAgICAgdmFyIGJhdGNoID0gZGF0YUNvbnRleHQucmVkaXNDbGllbnQuYmF0Y2goKTsgXG4gICAgICAgICAgdmFyIHBrZ0JhdGNoID0gZGF0YUNvbnRleHQucmVkaXNDbGllbnQuYmF0Y2goKTsgXG5cbiAgICAgICAgICBwYWNrYWdlcy5mb3JFYWNoKHBrZyA9PiB7XG4gICAgICAgICAgICAvL3RoZXNlIGFyZSBiYXJjb2RlcyBcbiAgICAgICAgICAgIGJhdGNoLnNhZGQoXCJjb25zb2xpZGF0ZWQ6cGtnOlwiK3BrZ1Jlc3VsdC5pZCxwa2cpXG4gICAgICAgICAgICBwa2dCYXRjaC5obWdldChQS0dfUFJFRklYK2dldFBhY2thZ2VJZEZyb21CYXJDb2RlKHBrZyksXCJ3ZWlnaHRcIilcbiAgICAgICAgICB9KTtcbiAgICAgICAgICBiYXRjaC5leGVjKChlcnIscmVzdWx0cyk9PntcbiAgICAgICAgICAgIC8vXG4gICAgICAgICAgICBwa2dCYXRjaC5leGVjKChlcnIxLHJlc3VsdHMpPT57XG4gICAgICAgICAgICAgIHZhciB0b3RhbFdlaWdodCA9IDA7IFxuICAgICAgICAgICAgICByZXN1bHRzLmZvckVhY2god2VpZ2h0ID0+IHtcbiAgICAgICAgICAgICAgICBpZiAoaXNOYU4oTnVtYmVyKHdlaWdodCkpID09IGZhbHNlKVxuICAgICAgICAgICAgICAgICAgdG90YWxXZWlnaHQgKz0gTnVtYmVyKHdlaWdodCk7XG4gICAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgICAvL3dlIG5lZWQgdG8gdXBkYXRlIHRoZSB0b3RhbCB3ZWlnaHQgb2YgdGhlIHBhY2thZ2Ugbm93IFxuICAgICAgICAgICAgICBzcnYucGFja2FnZUluZGV4LnVwZGF0ZShjUGFja2FnZS5pZCx7d2VpZ2h0OnRvdGFsV2VpZ2h0fSlcbiAgICAgICAgICAgIH0pXG4gICAgICAgICAgICBcbiAgICAgICAgICAgIHJlc29sdmUoe3NhdmVkOnRydWUsaWQ6cGtnUmVzdWx0LmlkfSlcbiAgICAgICAgICB9KVxuICAgICAgICB9KVxuICAgICAgICBcbiAgICB9KVxuXG4gICBcbiAgICAgIC8vdmFsaWRhdGUgdGhlIHBhY2thZ2UgXG4gICAgXG5cbiAgICB9KVxuICB9XG4gIHNhdmVQYWNrYWdlKGJvZHkpe1xuICAgIHJldHVybiBuZXcgUHJvbWlzZSgocmVzb2x2ZSxyZWplY3QpPT57XG4gICAgICB2YXIgY1BhY2thZ2UgPSB7XG4gICAgICAgIFxuICAgICAgICBza3lib3g6IGJvZHkuc2t5Ym94LFxuICAgICAgICBjdXN0b21lcjogYm9keS5jdXN0b21lci5yZXBsYWNlKFwiLVwiLCBcIlwiKS50cmltKCksXG4gICAgICAgIHRyYWNraW5nTm86IGJvZHkudHJhY2tpbmcsXG4gICAgICAgIGRlc2NyaXB0aW9uOiBib2R5LmRlc2NyaXB0aW9uLFxuICAgICAgICBzaGlwcGVyOiBib2R5LnNoaXBwZXIsXG4gICAgICAgIGNhcnJpZXI6Ym9keS5jYXJyaWVyLFxuICAgICAgICB2YWx1ZTogTnVtYmVyKGJvZHkudmFsdWUpLFxuICAgICAgICBwaWVjZXM6IE51bWJlcihib2R5LnBpZWNlcyksXG4gICAgICAgIHdlaWdodDogTnVtYmVyKGJvZHkud2VpZ2h0KSxcbiAgICAgICAgZGltZW5zaW9uczogYm9keS5kaW1lbnNpb25zLFxuICAgICAgICBzdGF0dXM6IDEsXG4gICAgICAgIGxvY2F0aW9uOiBcIkZMTFwiLFxuICAgICAgICBtaWQ6IDAsXG4gICAgICAgIGF3YjowLFxuICAgICAgICAvL2hhc09wdDogdHJ1ZSxcbiAgICAgICAgLy9tdHlwZTogYm9keS5tdHlwZVxuICAgICAgfTtcbiAgICAgIC8vdmFsaWRhdGUgdGhlIHBhY2thZ2UgXG4gICAgICBkYXRhQ29udGV4dC5yZWRpc0NsaWVudC5pbmNyKFBLR19JRF9DT1VOVEVSLChlcnIsaWQpPT57XG4gICAgICAgIGNQYWNrYWdlLmlkID0gaWQ7IFxuICAgICAgICBkYXRhQ29udGV4dC5yZWRpc0NsaWVudC5zZXQoUEtHX1BSRUZJWCtpZCxjUGFja2FnZSwoZXJyLHJlc3BvbnNlKT0+e1xuICAgICAgICAgIGlmIChlcnIpe1xuICAgICAgICAgICAgcmVqZWN0KHtzYXZlZDpmYWxzZSxlcnI6ZXJyfSlcbiAgICAgICAgICB9XG4gICAgICAgICAgIHZhciBpbmRleFBhY2thZ2UgPSAgY3JlYXRlRG9jdW1lbnQoY1BhY2thZ2UpOyBcbiAgICAgICAgICAgY29uc29sZS5sb2coaW5kZXhQYWNrYWdlKTsgXG4gICAgICAgICAgIHBhY2thZ2VJbmRleC5hZGQoY1BhY2thZ2UuaWQsaW5kZXhQYWNrYWdlLChlcnIxLGRvY1Jlc3VsdCk9PntcbiAgICAgICAgICAgICBjb25zb2xlLmxvZyhkb2NSZXN1bHQpOyBcbiAgICAgICAgICAgICBpZihlcnIxKXtcbiAgICAgICAgICAgICAgIHJlamVjdCh7c2F2ZWQ6ZmFsc2UsZXJyOmVycjF9KVxuICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICByZXNvbHZlKHtzYXZlZDp0cnVlfSlcbiAgICAgICAgICAgfSlcblxuICAgICAgICB9KVxuICAgICAgfSk7XG4gICAgXG5cblxuICAgIH0pXG4gIH1cblxuICBnZXRNYW5pZmVzdFBhY2thZ2VzKCl7XG4gICAgcmV0dXJuIG5ldyBQcm9taXNlKChyZXNvbHZlLHJlamVjdCk9PntcbiAgICAgIFxuICAgICAgdGhpcy5teVNlYXJjaC5zZWFyY2goXG4gICAgICAgIGBAbWlkOlswIDBdYCxcbiAgICAgICAgeyBvZmZzZXQ6IDAsIG51bWJlck9mUmVzdWx0czogNTAwMCB9LFxuICAgICAgICAoZXJyLCBkYXRhKSA9PiB7XG4gICAgICAgICAgdmFyIHBhY2thZ2VzID0gW107XG4gICAgICAgICAgY29uc29sZS5sb2coZGF0YSk7XG4gICAgICAgICAgZGF0YS5yZXN1bHRzLmZvckVhY2goZWxlbWVudCA9PiB7XG5cbiAgICAgICAgICAgIHBhY2thZ2VzLnB1c2goZWxlbWVudC5kb2MpO1xuICAgICAgICAgICAgcmVzb2x2ZShwYWNrYWdlcyk7ICAgICAgICAgICAgICAgICBcbiAgICAgICAgfSk7XG4gICAgfSk7XG4gICAgfSlcbiAgfVxuICBnZXRSZWNlaXZlZFBhY2thZ2VzKHBhZ2UscGFnZVNpemUpe1xuICAgIHJldHVybiBuZXcgUHJvbWlzZSgocmVzb2x2ZSxyZWplY3QpPT57XG4gICAgICBcbiAgICAgIHRoaXMubXlTZWFyY2guc2VhcmNoKFxuICAgICAgICBgQG1pZDpbMCAwXWAsXG4gICAgICAgIHsgb2Zmc2V0OiAwLCBudW1iZXJPZlJlc3VsdHM6IDUwMDAgfSxcbiAgICAgICAgKGVyciwgZGF0YSkgPT4ge1xuICAgICAgICAgIHZhciBwYWNrYWdlcyA9IFtdO1xuICAgICAgICAgIGNvbnNvbGUubG9nKGRhdGEpO1xuICAgICAgICAgIGRhdGEucmVzdWx0cy5mb3JFYWNoKGVsZW1lbnQgPT4ge1xuXG4gICAgICAgICAgICBwYWNrYWdlcy5wdXNoKGVsZW1lbnQuZG9jKTtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBcbiAgICAgICAgfSk7XG4gICAgICAgIHJlc29sdmUocGFja2FnZXMpOyBcbiAgICB9KTtcbiAgICB9KVxuICB9XG4gIGdldE5vRG9jc1BhY2thY2thZ2VzKHBhZ2UscGFnZVNpemUpe1xuICAgIHJldHVybiBuZXcgUHJvbWlzZSgocmVzb2x2ZSxyZWplY3QpPT57XG4gICAgICBcbiAgICAgIHRoaXMubXlTZWFyY2guc2VhcmNoKFxuICAgICAgICBgQGhhc0RvY3M6WzAgMF1gLFxuICAgICAgICB7IG9mZnNldDogMCwgbnVtYmVyT2ZSZXN1bHRzOiA1MDAwIH0sXG4gICAgICAgIChlcnIsIGRhdGEpID0+IHtcbiAgICAgICAgICB2YXIgcGFja2FnZXMgPSBbXTtcbiAgICAgICAgICBjb25zb2xlLmxvZyhkYXRhKTtcbiAgICAgICAgICBkYXRhLnJlc3VsdHMuZm9yRWFjaChlbGVtZW50ID0+IHtcblxuICAgICAgICAgICAgcGFja2FnZXMucHVzaChlbGVtZW50LmRvYyk7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgXG4gICAgICAgIH0pO1xuICAgICAgICByZXNvbHZlKHBhY2thZ2VzKTsgXG4gICAgfSk7XG4gICAgfSlcbiAgfVxuICBnZXRwYWNrYWdlYnlSZWRpc0lkKGlkKXtcbiAgICByZXR1cm4gbmV3IFByb21pc2UoKHJlc29sdmUscmVqZWN0KT0+e1xuICAgICAgcGFja2FnZUluZGV4LmdldERvYyhpZCwoZXJyLGRvY3VtZW50KT0+e1xuICAgICAgICByZXNvbHZlKGRvY3VtZW50LmRvYyk7IFxuICAgICAgfSlcbiAgICB9KVxuICB9XG4gIGdldFBhY2thZ2VCeUlkKGJhcmNvZGUpe1xuICAgIHZhciBzcnYgPSB0aGlzOyBcbiAgICB2YXIgcGtnSWQgPSBnZXRQYWNrYWdlSWRGcm9tQmFyQ29kZShiYXJjb2RlKTsgXG4gICAgcmV0dXJuIG5ldyBQcm9taXNlKChyZXNvbHZlLHJlamVjdCk9PntcbiAgICAgIHRoaXMubXlTZWFyY2guZ2V0RG9jKHBrZ0lkLChlcnIsZG9jdW1lbnQpPT57XG4gICAgICAgIC8vZ2V0IHRoZSBhd2IgaW5mbyBoZXJlIGFzIHdlbGwgXG4gICAgICAgIHNydi5nZXRBd2IoZG9jdW1lbnQuZG9jLmF3YikudGhlbihhd2JpbmZvPT57XG4gICAgICAgICAgc3J2LmdldFNoaXBwZXIoYXdiaW5mby5hd2Iuc2hpcHBlcikudGhlbihzaGlwcGVyPT57XG4gICAgICAgICAgICBjb25zb2xlLmxvZyhhd2JpbmZvKTsgXG4gICAgICAgICAgICBhd2JpbmZvLmF3Yi5zaGlwcGVyID0gc2hpcHBlci5uYW1lO1xuICAgICAgICAgICAgdmFyIHJlc3BvbnNlID0geyBcbiAgICAgICAgICAgICAgYXdiIDogYXdiaW5mby5hd2IsXG4gICAgICAgICAgICAgIHBhY2thZ2UgOiBkb2N1bWVudC5kb2NcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIHJlc29sdmUocmVzcG9uc2UpOyBcbiAgICAgICAgICB9KVxuICAgICAgICAgXG4gICAgICAgIH0pOyBcbiAgICAgICAgXG4gICAgICB9KVxuICAgIH0pOyBcbiAgfVxuICB1cGRhdGVTdG9yZUxvY2F0aW9uKGNoZWNraW4pe1xuICAgIHZhciBzcnYgPSB0aGlzOyBcbiAgICByZXR1cm4gbmV3IFByb21pc2UgKChyZXNvbHZlLHJlamVjdCk9PntcbiAgICAgIHZhciBpZCA9IGdldFBhY2thZ2VJZEZyb21CYXJDb2RlKGNoZWNraW4uYmFyY29kZSk7IFxuICAgICAgcGFja2FnZUluZGV4LmdldERvYyhpZCwoZXJyLHBrZyk9PntcbiAgICAgICAgcGtnLmRvYy5sb2NhdGlvbklkID0gY2hlY2tpbi5sb2NhdGlvbklkOyBcbiAgICAgICAgcGtnLmRvYy5sb2NhdGlvbiA9IGNoZWNraW4ubG9jYXRpb247IFxuICAgICAgICBwa2cuZG9jLnN0YXR1cyA9IDU7IFxuICAgICAgICAgcGFja2FnZUluZGV4LnVwZGF0ZShpZCxwa2csKGVycixyZXN1bHQpPT57XG4gICAgICAgICAgIC8vd2UgbmVlZCB0byBzZW5kIHRoZSBlbWFpbCBoZXJlIGZvciB0aGUgcGFja2FnZSBcbiAgICAgICAgICAgc3J2LmdldFBhY2thZ2VCeURvY0lkKGlkKS50aGVuKGluZm89PntcbiAgICAgICAgICAgICAgZW1haWxTZXJ2aWNlLnNlbmRBdFN0b3JlRW1haWwoY2hlY2tpbi5sb2NhdGlvbixpbmZvKTtcbiAgICAgICAgICAgICAgcmVzb2x2ZSh7dXBkYXRlZDp0cnVlfSk7IFxuICAgICAgICAgICB9KVxuICAgICAgICAgXG4gICAgICAgICB9KTtcbiAgICAgIH0pXG4gICAgfSlcbiAgfVxuICBjaGVja091dFRvQ3VzdG9tZXIoYmFyY29kZSx1c2VyKXtcbiAgICB2YXIgc3J2ID0gdGhpczsgXG4gICAgcmV0dXJuIG5ldyBQcm9taXNlICgocmVzb2x2ZSxyZWplY3QpPT57XG4gICAgICAvL3dlIHdhbnQgdG8gY2hlY2sgb3V0IHNldCB0aGUgc2F0YXR1cyBcbiAgICAgIHZhciBpZCA9IGdldFBhY2thZ2VJZEZyb21CYXJDb2RlKGJhcmNvZGUpOyBcbiAgICAgIHNydi5nZXRQYWNrYWdlQnlEb2NJZChpZCkudGhlbihwa2c9PntcbiAgICAgICAgY29uc29sZS5sb2cocGtnLFwiVEhFIFBLR1wiKVxuICAgICAgICBwa2cucGFja2FnZS5zdGF0dXMgPSA2IC8vY2hlY2tlZCBvdXQgdG8gY3VzdG9tZXIgXG4gICAgICAgIHBrZy5wYWNrYWdlLmNoZWNrb3V0QnkgPSB1c2VyO1xuICAgICAgICBwYWNrYWdlSW5kZXgudXBkYXRlKHBrZy5wYWNrYWdlLmlkLCBwa2cucGFja2FnZSwoZXJybSxyZXBseSk9PntcbiAgICAgICAgICBpZihlcnJtKVxuICAgICAgICAgICB7XG4gICAgICAgICAgICAgY29uc29sZS5sb2coZXJybSlcbiAgICAgICAgICAgIHJlc29sdmUoe3VwZGF0ZWQ6ZmFsc2V9KVxuICAgICAgICAgICB9IFxuICAgICAgICAgIHJlc29sdmUoe3VwZGF0ZWQ6dHJ1ZX0pXG4gICAgICAgIH0pXG4gICAgICB9KSBcblxuICAgIH0pXG4gIH1cbiAgZ2V0UGFja2FnZUJ5RG9jSWQocGtnSWQpe1xuICAgIHZhciBzcnYgPSB0aGlzOyBcbiAgICByZXR1cm4gbmV3IFByb21pc2UoKHJlc29sdmUscmVqZWN0KT0+e1xuICAgICAgdGhpcy5teVNlYXJjaC5nZXREb2MocGtnSWQsKGVycixkb2N1bWVudCk9PntcbiAgICAgICAgLy9nZXQgdGhlIGF3YiBpbmZvIGhlcmUgYXMgd2VsbCBcbiAgICAgICAgc3J2LmdldEF3Yihkb2N1bWVudC5kb2MuYXdiKS50aGVuKGF3YmluZm89PntcbiAgICAgICAgICBjb25zb2xlLmxvZyhhd2JpbmZvKTsgXG4gICAgICAgICAgdmFyIHJlc3BvbnNlID0geyBcbiAgICAgICAgICAgIGF3YiA6IGF3YmluZm8uYXdiLFxuICAgICAgICAgICAgcGFja2FnZSA6IGRvY3VtZW50LmRvY1xuICAgICAgICAgIH1cbiAgICAgICAgICByZXNvbHZlKHJlc3BvbnNlKTsgXG4gICAgICAgIH0pOyBcbiAgICAgICAgXG4gICAgICB9KVxuICAgIH0pOyBcbiAgfVxuICBcbiAgLy91c2luZyB0aGlzIFxuICBcblxuICB1cGRhdGVNYW5pZmVzdFBhY2thZ2VUb0luVHJhbnNpdChtaWQpIHtcbiAgICAvL2dldCBhbGwgdGhlIHBhY2thZ2VzXG4gICAgLy93ZSBuZWVkIHRvIHVwZGF0ZSB0aGUgaW5kZXggYXQgdGhpcyBwb2ludCBhcyB3ZWxsXG4gICAgdmFyIG1zZWFyY2ggPSB0aGlzLm15U2VhcmNoO1xuICAgIHRoaXMubXlTZWFyY2guc2VhcmNoKFxuICAgICAgYEBtaWQ6WyR7bWlkfSAke21pZH1dYCxcbiAgICAgIHsgb2Zmc2V0OiAwLCBudW1iZXJPZlJlc3VsdHM6IDUwMDAgfSxcbiAgICAgIChlcnIsIGRhdGEpID0+IHtcbiAgICAgICAgdmFyIHBhY2thZ2VzID0gW107XG4gICAgICAgIGNvbnNvbGUubG9nKGRhdGEpO1xuICAgICAgICBkYXRhLnJlc3VsdHMuZm9yRWFjaChlbGVtZW50ID0+IHtcbiAgICAgICAgICB2YXIgb2xkRG9jSWQgPSBlbGVtZW50LmRvY0lkO1xuICAgICAgICAgIGVsZW1lbnQuZG9jSWQgPSBlbGVtZW50LmRvY0lkLnJlcGxhY2UoYCR7bWlkfS1gLCBcIlwiKTtcbiAgICAgICAgICBwYWNrYWdlcy5wdXNoKGVsZW1lbnQuZG9jSWQpO1xuICAgICAgICAgIC8vIGkgY291bGQgZGVsZXRlIGhlcmVcbiAgICAgICAgICAvLyBtc2VhcmNoLmRlbERvY3VtZW50KFBLR19JRFgsb2xkRG9jSWQpXG4gICAgICAgICAgLy91cGRhdGUgYWxsIHRoZSBwYWNrYWdlc1xuICAgICAgICB9KTtcbiAgICAgICAgc2V0UGFja2FnZUluVHJhbnNpdChwYWNrYWdlcywgbXNlYXJjaCwgbWlkKS50aGVuKGZ1bmN0aW9uKFxuICAgICAgICAgIHVwZGF0ZWRQYWNrYWdlc1xuICAgICAgICApIHtcbiAgICAgICAgICBjb25zb2xlLmxvZyhcInVwZGF0ZWQgcGFja2FnZXNcIik7XG4gICAgICAgICAgY29uc29sZS5sb2codXBkYXRlZFBhY2thZ2VzKTtcbiAgICAgICAgfSk7XG4gICAgICB9XG4gICAgKTtcbiAgfVxuICByZW1vdmVQYWNrYWdlRnJvbU1hbmlmZXN0KHBhY2thZ2VJZCwgbWlkKSB7XG4gICAgdmFyIG1zZWFyY2ggPSB0aGlzLm15U2VhcmNoO1xuICAgIHJldHVybiBuZXcgUHJvbWlzZSgocmVzb2x2ZSwgcmVqZWN0KSA9PiB7XG4gICAgICB2YXIgbWFuaWZlc3QgPSBtaWQ7XG4gICAgICB2YXIgbWFuaWZlc3RLZXkgPSBcIm1hbmlmZXN0OlwiICsgbWFuaWZlc3QgKyBcIjoqXCI7XG5cbiAgICAgIGxyZWRpcy5kZWwoXCJwYWNrYWdlczpcIiArIHRyYWNraW5nTm8pLnRoZW4oZnVuY3Rpb24ocmVzdWx0KSB7XG4gICAgICAgIGNvbnNvbGUubG9nKHJlc3VsdCk7XG4gICAgICAgIG1zZWFyY2guZGVsRG9jdW1lbnQoUEtHX0lEWCwgYCR7bWlkfS0ke3RyYWNraW5nTm99YCk7XG4gICAgICAgIC8vd2UgbmVlZCB0byByZW1vdmUgZnJvbSB0aGUgaW5kZXggYW5kIGRlYyB0aGUgY291bnRlclxuICAgICAgICBscmVkaXMuY2xpZW50LmRlY3IoXCJtY291bnRlcjpcIiArIG1pZCk7XG4gICAgICAgIC8vclNlcnZpY2VzLnBhY2thZ2VTZXJ2aWNlLnJtUGFja2FnZShtaWQsIHRyYWNraW5nTm8pO1xuICAgICAgICBscmVkaXMuZ2V0S2V5cyhtYW5pZmVzdEtleSkudGhlbihrUmVzdWx0ID0+IHtcbiAgICAgICAgICAvL3RoZSBsaXN0IG9mIGFsbCB0aGUgc2V0cyAuLi53ZSBuZWVkIHRvIHJlbW92ZSB0aGUga2V5IGZyb20gZWFjaCBvbmVcbiAgICAgICAgICB2YXIga2V5c0NvdW50ID0gMDtcblxuICAgICAgICAgIGtSZXN1bHQuZm9yRWFjaChlbGVtZW50ID0+IHtcbiAgICAgICAgICAgIGNvbnNvbGUubG9nKFxuICAgICAgICAgICAgICBgcmVtb3ZpbmcgJHt0cmFja2luZ05vfSBwYWNrYWdlIG1hbmlmZXN0IHNldCAke2VsZW1lbnR9IGBcbiAgICAgICAgICAgICk7XG4gICAgICAgICAgICBscmVkaXMuc3JlbShlbGVtZW50LCB0cmFja2luZ05vKS50aGVuKGZ1bmN0aW9uKHJSZXN1bHQpIHtcbiAgICAgICAgICAgICAgY29uc29sZS5sb2coclJlc3VsdCk7XG4gICAgICAgICAgICAgIGNvbnNvbGUubG9nKFwicmVtb3ZlZFwiKTtcbiAgICAgICAgICAgICAgaWYgKGtleXNDb3VudCA9PSBrUmVzdWx0Lmxlbmd0aCAtIDEpIGtleXNDb3VudCsrO1xuICAgICAgICAgICAgfSk7XG4gICAgICAgICAgfSk7XG4gICAgICAgICAgcmVzb2x2ZSh7XG4gICAgICAgICAgICBkZWxldGVkOiB0cnVlXG4gICAgICAgICAgfSk7XG4gICAgICAgIH0pO1xuXG4gICAgICAgIC8vd2UgYWxzbyBuZWVkIHRvIHJlbW92ZSBmcm9tIGFueSBzZXRzXG4gICAgICB9KTtcbiAgICB9KTtcbiAgfVxuICByZW1vdmVQYWNrYWdlQnlJZChpZCkge1xuICAgIHZhciBtc2VhcmNoID0gdGhpcy5teVNlYXJjaDtcbiAgICByZXR1cm4gbmV3IFByb21pc2UoKHJlc29sdmUsIHJlamVjdCkgPT4ge1xuICAgICAgXG4gICAgICBwYWNrYWdlSW5kZXguZGVsRG9jdW1lbnQoUEtHX0lEWCxpZCwoZXJyLHJlc3BvbnNlKT0+e1xuICAgICAgICBpZiAoZXJyKVxuICAgICAgICAgIGNvbnNvbGUubG9nKGVycik7IFxuICAgICAgICBjb25zb2xlLmxvZyhyZXNwb25zZSk7IFxuICAgICAgICByZXNvbHZlKHtkZWxldGVkOnRydWV9KVxuICAgICAgfSlcbiAgICAgIFxuICAgICAgICBcbiAgICAgIFxuICAgIH0pO1xuICB9XG4gIHN0b3JlUGFja2FnZUZvclBpY2t1cCh0cmFja2luZ05vLGJpbil7XG4gICAgdmFyIHNlYXJjaGVyID0gdGhpcy5teVNlYXJjaDtcbiAgICByZXR1cm4gbmV3IFByb21pc2UoKHJlc29sdmUscmVqZWN0KT0+e1xuICAgICAgIGxyZWRpcy5obXNldChQS0dfUFJFRklYK3RyYWNraW5nTm8se3N0YXR1czo0LGxvY2F0aW9uOmJpbn0pLnRoZW4oKHJlc3VsdCk9PntcbiAgICAgICAgIGxyZWRpcy5nZXRQYWNrYWdlKHRyYWNraW5nTm8pLnRoZW4oKHBrZyk9PntcbiAgICAgICAgICBhZGRQYWNrYWdlVG9JbmRleCh0cmFja2luZ05vLHNlYXJjaGVyKSA7IFxuICAgICAgICAgIHJlc29sdmUocGtnKTsgICBcbiAgICAgICAgIH0pO1xuICAgICAgIH0pIFxuICAgIH0pOyBcbiAgfVxuICB1cGRhdGVQYWNrYWdlSW5kZXgodHJhY2tpbmcpe1xuICAgICAgcmV0dXJuIG5ldyBQcm9taXNlKChyZXNvbHZlLHJlamVjdCk9PntcbiAgICAgICAgICB2YXIgbXNlYXJjaCA9IHRoaXMubXlTZWFyY2g7IFxuICAgICAgICAgIGFkZFBhY2thZ2VUb0luZGV4KHRyYWNraW5nLG1zZWFyY2gpOyBcbiAgICAgICAgIHJlc29sdmUoeyd1cGRhdGVkJzp0cnVlfSk7XG4gICAgICB9KVxuICB9XG4gIGdldEN1c3RvbWVyUGFja2FnZXMoc2t5Ym94KSB7fVxuXG5cbiAgLy9ubyBtb3JlIHNreWJveFxuICBnZXRNYW5pZmVzdFBhY2thZ2VzQnlTdGF0dXMobWlkLHN0YXR1cykge1xuICAgICAgcmV0dXJuIG5ldyBQcm9taXNlKChyZXNvbHZlLHJlamVjdCk9PntcbiAgICAgICAgICBjb25zb2xlLmxvZyhgQG1pZDpbJHttaWR9ICR7bWlkfV1gKVxuICAgICAgICB0aGlzLm15U2VhcmNoLnNlYXJjaChcbiAgICAgICAgICAgIGBAbWlkOlske21pZH0gJHttaWR9XWAsXG4gICAgICAgICAgICB7IG9mZnNldDogMCwgbnVtYmVyT2ZSZXN1bHRzOiA1MDAwIH0sXG4gICAgICAgICAgICAoZXJyLCBkYXRhKSA9PiB7XG4gICAgICAgICAgICAgIHZhciBwYWNrYWdlcyA9IFtdO1xuICAgICAgICAgICAgICBjb25zb2xlLmxvZyhkYXRhKTtcbiAgICAgICAgICAgICAgZGF0YS5yZXN1bHRzLmZvckVhY2goZWxlbWVudCA9PiB7XG5cbiAgICAgICAgICAgICAgICBwYWNrYWdlcy5wdXNoKGVsZW1lbnQuZG9jKTtcbiAgICAgICAgICAgICAgICByZXNvbHZlKHBhY2thZ2VzKTsgICAgICAgICAgICAgICAgIFxuICAgICAgICAgICAgfSk7XG4gICAgICAgIH0pO1xuICAgICAgfSk7XG4gIFxuICB9ICAgXG4gIFxuICAvLyNyZWdpb24gUGFrY2FnZSBGaWx0ZXJzICBcbiAgZ2V0UGFja2FnZXNOYXNXYXJlaG91c2UoaXNOb0RvYyxjb21wYW55KXtcbiAgICB2YXIgc3J2ID0gdGhpczsgXG4gICAgcmV0dXJuIG5ldyBQcm9taXNlKChyZXNvbHZlLHJlamVjdCk9PntcbiAgICAgICAgcGFja2FnZUluZGV4LnNlYXJjaChgQHN0YXR1czpbNCA0XSBAY29tcGFueToke2NvbXBhbnl9IEBoYXNEb2NzOlske2lzTm9Eb2N9ICR7aXNOb0RvY31dYCx7fSwoZXJyLHJlcGx5KT0+e1xuICAgICAgICAgIGNvbnNvbGUubG9nKHJlcGx5LnJlc3VsdHMpOyBcbiAgICAgICAgICBQcm9taXNlLmFsbChyZXBseS5yZXN1bHRzLm1hcChwa2cgPT4gc3J2LmdldFBhY2thZ2VCeURvY0lkKHBrZy5kb2NJZCkpKS50aGVuKHBhY2thZ2VzPT57XG4gICAgICAgICAgICByZXNvbHZlKHBhY2thZ2VzKTsgXG4gICAgICAgICAgfSlcblxuICAgICAgICB9KVxuICAgIH0pXG4gIH1cblxuICAvLyNlbmRyZWdpb25cbiAgXG5cbiAgIC8vI3JlZ2lvbiBNYW5pZmVzdCBQYWNrYWdlIEZ1bmN0aW9ucyBcblxuICAgYWRkVG9GbGlnaHQoYWN0aW9uKXtcbiAgICAgdmFyIHNydiA9IHRoaXM7IFxuICAgIHJldHVybiBuZXcgUHJvbWlzZSgocmVzb2x2ZSxyZWplY3QpPT57XG4gICAgICB2YXIgcGFja2FnZU5vID0gZ2V0UGFja2FnZUlkRnJvbUJhckNvZGUoYWN0aW9uLmJhcmNvZGUpOyBcbiAgICAgIGNvbnNvbGUubG9nKGFjdGlvbik7IFxuICAgICAgdGhpcy5teVNlYXJjaC51cGRhdGUocGFja2FnZU5vLHttaWQ6YWN0aW9uLm1pZCAsIHN0YXR1czogMiwgbG9jYXRpb246XCJMb2FkZWQgb24gQWlyQ3JhZnRcIixjb21wYXJ0bWVudDphY3Rpb24uY29tcGFydG1lbnR9LChlcnIscmVzdWx0KT0+e1xuICAgICAgICBpZihlcnIpXG4gICAgICAgICAgcmVzb2x2ZSh7YWRkZWQ6ZmFsc2V9KVxuICAgICAgICBzcnYuZ2V0RmxpZ2h0Q29tcGFydG1lbnRXZWlnaHQoYWN0aW9uLm1pZCxhY3Rpb24uY29tcGFydG1lbnQpLnRoZW4oZnJlc3VsdD0+e1xuICAgICAgICAgIGZyZXN1bHQuYWRkZWQgPSB0cnVlOyBcbiAgICAgICAgICByZXNvbHZlKGZyZXN1bHQpXG4gICAgICAgIH0pXG4gICAgICAgXG4gICAgICB9KVxuICAgICAgICBcbiAgICB9KVxuICAgfVxuICAgLy9nZXQgdGhlIGNvbXBhcnRtZW50IHdlaWdodCBcbiAgIGdldEZsaWdodENvbXBhcnRtZW50V2VpZ2h0KG1pZCxjb21wYXJ0bWVudCl7XG4gICAgIHJldHVybiBuZXcgUHJvbWlzZSgocmVzb2x2ZSxyZWplY3QpPT57XG4gICAgICBcbiAgICAgIHRoaXMubXlTZWFyY2guYWdncmVnYXRlKGBAbWlkOlske21pZH0gJHttaWR9XSBAY29tcGFydG1lbnQ6JHtjb21wYXJ0bWVudH1gLCB7fSwoZXJyLHJlcGx5KT0+e1xuICAgICAgICAgaWYgKGVycilcbiAgICAgICAgIGNvbnNvbGUubG9nKGVycik7IFxuICAgICAgICAgY29uc29sZS5sb2cocmVwbHksXCJUT1RBTCBTRUNUSU9OIFdlaWdodFwiKVxuICAgICAgICAgaWYgKHJlcGx5WzFdKXtcbiAgICAgICAgICAgdmFyIHJlc3VsdCA9IHJlcGx5WzFdO1xuICAgICAgICAgICB2YXIgY29tcGFydG1lbnQgPSByZXN1bHRbM107IFxuICAgICAgICAgICB2YXIgd2VpZ2h0ID0gcmVzdWx0WzVdOyBcbiAgICAgICAgIH1cbiAgICAgICAgIHJlc29sdmUoe2NvbXBhcnRtZW50OmNvbXBhcnRtZW50LHdlaWdodDp3ZWlnaHR9KVxuICAgICAgIH0pXG4gICAgIH0pXG4gICB9XG4gICAvL3JlbW92ZSBmcm9tIGZsaWdodCBcbiAgIHJlbW92ZUZyb21GbGlnaHQoYWN0aW9uKXtcbiAgICByZXR1cm4gbmV3IFByb21pc2UoKHJlc29sdmUscmVqZWN0KT0+e1xuICAgICAgICB2YXIgcGFja2FnZU5vID0gZ2V0UGFja2FnZUlkRnJvbUJhckNvZGUoYWN0aW9uLmJhcmNvZGUpOyAgIFxuICAgICAgICB0aGlzLm15U2VhcmNoLnVwZGF0ZShwYWNrYWdlTm8se21pZDphY3Rpb24ubWlkfSwoZXJyLHJlc3VsdCk9PntcbiAgICAgICAgaWYoZXJyKVxuICAgICAgICAgICAgcmVzb2x2ZSh7cmVtb3ZlZDpmYWxzZX0pXG4gICAgICAgICAgXG4gICAgICAgICAgcmVzb2x2ZSh7cmVtb3ZlZDp0cnVlfSlcbiAgICAgICAgfSlcbiAgICB9KVxuICAgfVxuICAgcmVjRnJvbVRydWNrKHRyYWNraW5nTm8sdXNlcm5hbWUsc2hpcG1lbnRJZCl7XG4gICAgIHJldHVybiBuZXcgUHJvbWlzZSgocmVzb2x2ZSxyZWplY3QpPT57XG4gICAgICAgIGRhdGFDb250ZXh0LnJlZGlzQ2xpZW50LnNhZGQoXCJzaGlwbWVudDppZDpcIitzaGlwbWVudElkLHRyYWNraW5nTm8sKGVycixyZXBseSk9PntcbiAgICAgICAgICBkYXRhQ29udGV4dC5yZWRpc0NsaWVudC5zZXQoUkVDX1BLRyt0cmFja2luZ05vLG1vbWVudCgpLnVuaXgoKSwgKGVycixyZXN1bHQpPT57XG4gICAgICAgICAgICBpZiAoZXJyKSByZXNvbHZlKHtzYXZlZDpmYWxzZX0pXG4gICAgICAgICAgICAvL3NoaXBtZW50IGNvdW50IFxuICAgICAgICAgICAgdmFyIHNoaXBtZW50Q291bnQgPSAxO1xuICAgICAgICAgICAgZGF0YUNvbnRleHQucmVkaXNDbGllbnQuc2NhcmQoXCJzaGlwbWVudDppZDpcIitzaGlwbWVudElkLChlcnIsY2FyZCk9PntcbiAgICAgICAgICAgICAgcmVzb2x2ZSh7c2F2ZWQ6dHJ1ZSxwa2dDb3VudDpjYXJkfSlcbiAgICAgICAgICAgIH0pO1xuICAgICAgICAgICBcbiAgICAgICAgICB9KVxuICAgICAgICB9KVxuICAgICAgICBcbiAgICAgfSlcbiAgIH1cbiAgIHByb2Nzc2Vzc1BhY2thZ2UocGtnSWZubyx1c2VybmFtZSl7XG4gICAgdmFyIHNydiA9IHRoaXM7ICBcbiAgICByZXR1cm4gbmV3IFByb21pc2UoKHJlc29sdmUscmVqZWN0KT0+e1xuICAgICAgIC8vd2UgYWxzbyBuZWVkIHRvIHNldCB0aGUgd2FyZWhvdXNlIGxvY2F0aW9uIGhlcmUgXG4gICAgICAgZGF0YUNvbnRleHQucmVkaXNDbGllbnQuaG1zZXQoXCJmZWVzOmF3YjpcIitwa2dJZm5vLmF3Yixwa2dJZm5vLChlcnIscmVzdWx0KT0+e1xuICAgICAgICAgaWYgKGVycilcbiAgICAgICAgICBjb25zb2xlLmxvZyhlcnIpOyBcblxuXG5cbiAgICAgICAgICBjb25zb2xlLmxvZyhyZXN1bHQpOyBcbiAgICAgICAgICBjb25zb2xlLmxvZyhcInByaW50OmZlZXM6XCIrdXNlcm5hbWUsdXNlcm5hbWUpOyBcbiAgICAgICAgIGRhdGFDb250ZXh0LnJlZGlzQ2xpZW50LnB1Ymxpc2goXCJwcmludDpmZWVzOlwiK3VzZXJuYW1lLHBrZ0lmbm8uYXdiKTsgXG4gICAgICAgICBcbiAgICAgICAgICBzcnYuZ2V0UGFja2FnZUJ5SWQocGtnSWZuby5iYXJjb2RlKS50aGVuKHBrZz0+e1xuICAgICAgICAgICAgZW1haWxTZXJ2aWNlLnNlbmROb0RvY3NFbWFpbChwa2cpXG4gICAgICAgICAgICBpZiAocGtnSWZuby5yZWZMb2Mpe1xuICAgICAgICAgICAgICBwa2cucGFja2FnZS53bG9jID0gcGtnSWZuby5yZWZMb2M7IFxuICAgICAgICAgICAgICBcbiAgICAgICAgICAgICAgICBwa2cucGFja2FnZS5oYXNEb2NzID0gcGtnSWZuby5oYXNEb2NzIDsgXG4gICAgICAgICAgICAgICAgcGtnLnBhY2thZ2Uuc3RhdHVzID0gNDsgXG5cbiAgICAgICAgICAgICAgICAvL3NldCB0aGVvbXBhbnkgXG4gICAgICAgICAgICAgICAgaWYgKE51bWJlcihwa2cuYXdiLmN1c3RvbWVyLnBtYikgPiA5MDAwKXtcbiAgICAgICAgICAgICAgICAgIHBrZy5wYWNrYWdlLmNvbXBhbnkgPSBcIjBcIlxuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICBlbHNlIFxuICAgICAgICAgICAgICAgICAgcGtnLnBhY2thZ2UuY29tcGFueSA9IFwiMVwiXG4gICAgICAgICAgICAgICAgY29uc29sZS5sb2coJ3VwZGF0aW5nIHdpdGggJyxwa2cucGFja2FnZSlcbiAgICAgICAgICAgICAgICBcbiAgICAgICAgICAgICAgcGFja2FnZUluZGV4LnVwZGF0ZShwa2cucGFja2FnZS5pZCxwa2cucGFja2FnZSwoZXJyUmVzcCxyZXNwb25zZSk9PntcbiAgICAgICAgICAgICAgICBcbiAgICAgICAgICAgICAgICBpZihlcnJSZXNwKVxuICAgICAgICAgICAgICAgIGNvbnNvbGUubG9nKGVyclJlc3ApXG4gICAgICAgICAgICAgIH0pXG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBcbiAgICAgICAgICB9KVxuICAgICAgICAgcmVzb2x2ZSh7c2VudDp0cnVlfSlcbiAgICAgICB9KVxuICAgICB9KVxuICAgfVxuICAgcmVjRnJvbVBsYW5lTmFzKGJhcmNvZGUpe1xuICAgICByZXR1cm4gbmV3IFByb21pc2UoKHJlc29sdmUscmVqZWN0KT0+e1xuICAgICAgIHZhciBzcnYgPSB0aGlzIDsgXG4gICAgICAgdmFyIHBrZ0lkID0gZ2V0UGFja2FnZUlkRnJvbUJhckNvZGUoYmFyY29kZSk7IFxuICAgICAgICBzcnYubXlTZWFyY2guZ2V0RG9jKHBrZ0lkLChlcnIscGtnKT0+e1xuICAgICAgICAgICAgcGtnLmRvYy5zdGF0dXMgPSA0OyBcbiAgICAgICAgICAgIHBrZy5kb2MubG9jYXRpb24gID0gXCJXYXJlaG91c2UgTkFTXCI7IFxuICAgICAgICAgICAgaWYgKHBrZy5kb2MuaGFzRG9jcyA9PSBcInVuZGVmaW5lZFwiKVxuICAgICAgICAgICAgICBwa2cuZG9jLmhhc0RvY3MgPSAwIDsgXG4gICAgICAgICAgICBzcnYubXlTZWFyY2gudXBkYXRlKHBrZ0lkLHBrZy5kb2MsKGVycix1cGRhdGVSZXN1bHQpPT57XG4gICAgICAgICAgICAgIFxuICAgICAgICAgICAgICBpZihlcnIpXG4gICAgICAgICAgICAgeyAgXG4gICAgICAgICAgICAgICBjb25zb2xlLmxvZyhlcnIpXG4gICAgICAgICAgICAgIHJlamVjdCh7dXBkYXRlZDpmYWxzZX0pIFxuICAgICAgICAgICAgIH0gXG4gICAgICAgICAgICAgIHJlc29sdmUoe3VwZGF0ZWQ6dHJ1ZX0pXG4gICAgICAgICAgICB9KVxuICAgICAgICB9KVxuICAgICB9KVxuICAgfVxuXG4gICAvLyNlbmRyZWdpb25cbn1cblxuZnVuY3Rpb24gZ2V0UGFja2FnZUlkRnJvbUJhckNvZGUoYmFyQ29kZVZhbHVlKXtcbiAgdmFyIHBhcnRzID0gYmFyQ29kZVZhbHVlLnNwbGl0KFwiLVwiKTsgXG4gIGlmIChwYXJ0cy5sZW5ndGggPT0gMylcbiAgICBpZiAodHlwZW9mIHBhcnRzWzJdICE9IFwidW5kZWZpbmVkXCIpXG4gICAgcmV0dXJuIHBhcnRzWzJdLnRyaW0oKTsgXG4gIHJldHVybiBcIlwiXG59XG4iXX0=
