"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.PackageService = undefined;

var _createClass = function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; }();

var _os = require("os");

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
    key: "listAwbinFll",
    value: function listAwbinFll() {
      return new Promise(function (resolve, reject) {
        awbIndex.search("@status:[1 1]", { offset: 0, numberOfResults: 5000, sortBy: 'id' }, function (err, awbs) {
          var awbList = [];
          awbs.results.forEach(function (awb) {
            awbList.push(awb.doc);
          });
          resolve({ awbs: awbList });
        });
      });
    }
  }, {
    key: "getAwb",
    value: function getAwb(id) {
      return new Promise(function (resolve, reject) {
        awbIndex.getDoc(id, function (err, awb) {
          resolve({ awb: awb.doc });
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
      var _this = this;

      return new Promise(function (resolve, reject) {

        _this.mySearch.search("@mid:[0 0]", { offset: 0, numberOfResults: 5000 }, function (err, data) {
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
      var _this2 = this;

      return new Promise(function (resolve, reject) {

        _this2.mySearch.search("@mid:[0 0]", { offset: 0, numberOfResults: 5000 }, function (err, data) {
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
      var _this3 = this;

      return new Promise(function (resolve, reject) {

        _this3.mySearch.search("@hasDocs:[0 0]", { offset: 0, numberOfResults: 5000 }, function (err, data) {
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
    key: "removePackage",
    value: function removePackage(trackingNo, mid) {
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
      var _this4 = this;

      return new Promise(function (resolve, reject) {
        var msearch = _this4.mySearch;
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
      var _this5 = this;

      return new Promise(function (resolve, reject) {
        console.log("@mid:[" + mid + " " + mid + "] @status=[" + status + " " + status + "]");
        _this5.mySearch.search("@mid:[" + mid + " " + mid + "] @status:[" + status + " " + status + "]", { offset: 0, numberOfResults: 5000 }, function (err, data) {
          var packages = [];
          console.log(data);
          data.results.forEach(function (element) {

            packages.push(element.doc);
            resolve(packages);
          });
        });
      });
    }
  }]);

  return PackageService;
}();
//# sourceMappingURL=data:application/json;charset=utf8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIlJlZGlzU2VydmljZXMvUGFja2FnZVNlcnZpY2UuZXM2Il0sIm5hbWVzIjpbInJlZGlzIiwicmVxdWlyZSIsImxyZWRpcyIsIm1vbWVudCIsInJlZGlzU2VhcmNoIiwiZnMiLCJQYWNrYWdlVXRpbCIsIlBhY2thZ2VVdGlsaXR5IiwicGFja2FnZVV0aWwiLCJQS0dfSURYIiwiUEtHX0lEX0NPVU5URVIiLCJkYXRhQ29udGV4dCIsIlBLR19QUkVGSVgiLCJBV0JfSUQiLCJJTkRFWF9BV0IiLCJQS0dfU1RBVFVTIiwiYXdiSW5kZXgiLCJjbGllbnRPcHRpb25zIiwic2VhcmNoQ2xpZW50RGV0YWlscyIsInBhY2thZ2VJbmRleCIsImdldFBhY2thZ2VWb2x1bW5lIiwibVBhY2thZ2UiLCJjcmVhdGVEb2N1bWVudCIsInRQYWNrYWdlIiwicGFja2FnZURvY3VtZW50IiwiaWQiLCJ0cmFja2luZ05vIiwic2t5Ym94IiwiZGF0ZVJlY2lldmVkIiwidW5peCIsImF3YiIsIm1pZCIsInZvbHVtZSIsIndlaWdodCIsInBpZWNlcyIsImN1c3RvbWVyIiwic2hpcHBlciIsImRlc2NyaXB0aW9uIiwiZGltZW5zaW9ucyIsImNhcnJpZXIiLCJzdGF0dXMiLCJ2YWx1ZSIsImNvbnNvbGUiLCJsb2ciLCJzZXRQYWNrYWdlSW5UcmFuc2l0Iiwia2V5cyIsIm1zZWFyY2hlciIsIlByb21pc2UiLCJyZXNvbHZlIiwicmVqZWN0IiwiYmF0Y2hlciIsImNsaWVudCIsImJhdGNoIiwiZm9yRWFjaCIsImxvY2F0aW9uIiwiZWxlbWVudCIsImhtc2V0IiwiZXhlYyIsImVyciIsInJlc3VsdCIsImFkZFBhY2thZ2VUb0luZGV4IiwiZ2V0UGFja2FnZSIsInRoZW4iLCJkZWxEb2N1bWVudCIsInBhY2siLCJkb25lIiwiZG9jdW1lbnQiLCJhZGQiLCJQYWNrYWdlU2VydmljZSIsInNldHVwSW5kZXgiLCJteVNlYXJjaCIsInJlZGlzQ2xpZW50IiwiZXhpc3RzIiwic2V0IiwiaW5pdFJlc3VsdCIsImluY3IiLCJuZXdJZCIsInRvU3RyaW5nIiwicmVwbHkiLCJlcnIxIiwiYXdiUmVzIiwic2F2ZWQiLCJzZWFyY2giLCJvZmZzZXQiLCJudW1iZXJPZlJlc3VsdHMiLCJzb3J0QnkiLCJhd2JzIiwiYXdiTGlzdCIsInJlc3VsdHMiLCJwdXNoIiwiZG9jIiwiZ2V0RG9jIiwidHJhY2tpbmdOdW1iZXIiLCJsb2NhdGlvbl9pZCIsInBhY2thZ2VSZXN1bHQiLCJuZXdQYWNrYWdlIiwiYm9keSIsImNQYWNrYWdlIiwicmVwbGFjZSIsInRyaW0iLCJ0cmFja2luZyIsIk51bWJlciIsInJlc3BvbnNlIiwiaW5kZXhQYWNrYWdlIiwiZG9jUmVzdWx0Iiwic2VhcmNoZXIiLCJkdXR5UGVyY2VudCIsImhhc09wdCIsInAiLCJjdXJyZW50Q29udGFpbmVyIiwibXR5cGUiLCJjb250YWluZXIiLCJiYWciLCJzcmVtIiwic2tpZCIsIm1hbmlmZXN0S2V5IiwiY29udGFpbmVyTm8iLCJzZXRBZGQiLCJzUmVzdWx0IiwiZ2V0TWVtYmVycyIsImRhdGEiLCJhbGwiLCJtYXAiLCJyZGF0YSIsInBhY2thZ2VzIiwic1BhY2thZ2UiLCJjYXRjaCIsImVycjMiLCJsaXN0aW5nIiwiZXJyMiIsImVycjIzMiIsInBhZ2UiLCJwYWdlU2l6ZSIsInJlZGlTZWFyY2giLCJtc2VhcmNoIiwib2xkRG9jSWQiLCJkb2NJZCIsInVwZGF0ZWRQYWNrYWdlcyIsIm1hbmlmZXN0IiwiZGVsIiwiZGVjciIsImdldEtleXMiLCJrZXlzQ291bnQiLCJrUmVzdWx0IiwiclJlc3VsdCIsImxlbmd0aCIsImRlbGV0ZWQiLCJiaW4iLCJwa2ciXSwibWFwcGluZ3MiOiI7Ozs7Ozs7OztBQUFBOzs7Ozs7QUFHQSxJQUFJQSxRQUFRQyxRQUFRLE9BQVIsQ0FBWjtBQUNBLElBQUlDLFNBQVNELFFBQVEsZUFBUixDQUFiO0FBQ0EsSUFBSUUsU0FBU0YsUUFBUSxRQUFSLENBQWI7QUFDQSxJQUFJRyxjQUFjSCxRQUFRLHFCQUFSLENBQWxCO0FBQ0EsSUFB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QUNvQkEsR0FEcEIsbUJBQ3FDUyxNQURyQyxTQUMrQ0EsTUFEL0MsUUFFSSxFQUFFMkMsUUFBUSxDQUFWLEVBQWFDLGlCQUFpQixJQUE5QixFQUZKLEVBR0ksVUFBQzFCLEdBQUQsRUFBTThELElBQU4sRUFBZTtBQUNiLGNBQUlJLFdBQVcsRUFBZjtBQUNBbEYsa0JBQVFDLEdBQVIsQ0FBWTZFLElBQVo7QUFDQUEsZUFBS2hDLE9BQUwsQ0FBYW5DLE9BQWIsQ0FBcUIsbUJBQVc7O0FBRTlCdUUscUJBQVNuQyxJQUFULENBQWNsQyxRQUFRbUMsR0FBdEI7QUFDQTFDLG9CQUFRNEUsUUFBUjtBQUNILFdBSkM7QUFLTCxTQVhEO0FBWUQsT0FkTSxDQUFQO0FBZ0JIIiwiZmlsZSI6IlJlZGlzU2VydmljZXMvUGFja2FnZVNlcnZpY2UuanMiLCJzb3VyY2VzQ29udGVudCI6WyJpbXBvcnQgeyBjcHVzIH0gZnJvbSBcIm9zXCI7XG5cblxudmFyIHJlZGlzID0gcmVxdWlyZShcInJlZGlzXCIpO1xudmFyIGxyZWRpcyA9IHJlcXVpcmUoXCIuL3JlZGlzLWxvY2FsXCIpO1xudmFyIG1vbWVudCA9IHJlcXVpcmUoXCJtb21lbnRcIik7XG52YXIgcmVkaXNTZWFyY2ggPSByZXF1aXJlKFwiLi4vcmVkaXNlYXJjaGNsaWVudFwiKTtcbnZhciBmcyA9IHJlcXVpcmUoXCJmc1wiKTtcbnZhciBtb21lbnQgPSByZXF1aXJlKCdtb21lbnQnKVxudmFyIFBhY2thZ2VVdGlsID0gcmVxdWlyZShcIi4uL1V0aWwvcGFja2FnZXV0aWxcIikuUGFja2FnZVV0aWxpdHk7XG52YXIgcGFja2FnZVV0aWwgPSBuZXcgUGFja2FnZVV0aWwoKTtcbmNvbnN0IFBLR19JRFggPSBcImluZGV4OnBhY2thZ2VzXCI7XG5jb25zdCBQS0dfSURfQ09VTlRFUiA9IFwicGFja2FnZTppZFwiO1xudmFyIGRhdGFDb250ZXh0ID0gcmVxdWlyZSgnLi9kYXRhQ29udGV4dCcpXG5jb25zdCBQS0dfUFJFRklYID0gXCJwYWNrYWdlczpcIjtcbmNvbnN0IEFXQl9JRCA9IFwiYXdiOmlkXCJcbmNvbnN0IElOREVYX0FXQiA9IFwiaW5kZXg6YXdiXCJcbmNvbnN0IFBLR19TVEFUVVMgPSB7IFxuICAxIDogXCJSZWNlaXZlZFwiLFxuICAyOiBcIkluIFRyYW5zaXRcIixcbiAgMzogXCJQcm9jZXNzaW5nXCIsXG4gIDQ6IFwiUmVhZHkgZm9yIFBpY2t1cCAvIERlbGl2ZXJ5XCIsXG4gIDU6IFwiT3V0IGZvciBEZWxpdmVyeVwiLFxuICA2OiBcIkRlbGl2ZXJlZFwiXG5cbn07IFxuXG5jb25zdCBhd2JJbmRleCA9IHJlZGlzU2VhcmNoKHJlZGlzLCBJTkRFWF9BV0IsIHtcbiAgY2xpZW50T3B0aW9uczogbHJlZGlzLnNlYXJjaENsaWVudERldGFpbHNcbn0pO1xuY29uc3QgcGFja2FnZUluZGV4ID0gcmVkaXNTZWFyY2gocmVkaXMsIFBLR19JRFgsIHtcbiAgY2xpZW50T3B0aW9uczogbHJlZGlzLnNlYXJjaENsaWVudERldGFpbHNcbn0pO1xuZnVuY3Rpb24gZ2V0UGFja2FnZVZvbHVtbmUobVBhY2thZ2Upe1xuXG4gIHJldHVybiAwOyBcbn1cbmZ1bmN0aW9uIGNyZWF0ZURvY3VtZW50KHRQYWNrYWdlKSB7XG4gIHZhciBwYWNrYWdlRG9jdW1lbnQgPSB7XG4gICAgaWQ6dFBhY2thZ2UuaWQsXG4gICAgdHJhY2tpbmdObzogdFBhY2thZ2UudHJhY2tpbmdObyxcbiAgICBza3lib3g6IHRQYWNrYWdlLnNreWJveCxcbiAgICBkYXRlUmVjaWV2ZWQgOiBtb21lbnQoKS51bml4KCksIFxuICAgIGF3YjowLCBcbiAgICBtaWQ6MCxcbiAgICB2b2x1bWU6IGdldFBhY2thZ2VWb2x1bW5lKHRQYWNrYWdlKSxcbiAgICB3ZWlnaHQ6dFBhY2thZ2Uud2VpZ2h0LFxuICAgIHBpZWNlczp0UGFja2FnZS5waWVjZXMsXG4gICAgY3VzdG9tZXI6IHRQYWNrYWdlLmN1c3RvbWVyLFxuICAgIHNoaXBwZXI6IHRQYWNrYWdlLnNoaXBwZXIsXG4gICAgZGVzY3JpcHRpb246IHRQYWNrYWdlLmRlc2NyaXB0aW9uLFxuICAgIGRpbWVuc2lvbnM6dFBhY2thZ2UuZGltZW5zaW9ucyxcbiAgICBjYXJyaWVyOnRQYWNrYWdlLmNhcnJpZXIsXG4gICAgLy9za3lib3hWOiB0UGFja2FnZS5za3lib3gsIGFkZCBkaW1lbmlvbiBcbiAgICBzdGF0dXM6IHRQYWNrYWdlLnN0YXR1cyxcbiAgICBtaWQ6IHRQYWNrYWdlLm1pZCxcbiAgICB2YWx1ZTogdFBhY2thZ2UudmFsdWUsXG4gICAgXG4gIH07XG4gIGNvbnNvbGUubG9nKFwiYWJvdXQgdG8gYWRkIHRoZSBwYWNrYWdlIHRvIHRoZSBpbmRleFwiKTtcbiAgcmV0dXJuIHBhY2thZ2VEb2N1bWVudDtcbn1cbmZ1bmN0aW9uIHNldFBhY2thZ2VJblRyYW5zaXQoa2V5cywgbXNlYXJjaGVyKSB7XG4gIHJldHVybiBuZXcgUHJvbWlzZSgocmVzb2x2ZSwgcmVqZWN0KSA9PiB7XG4gICAgdmFyIGJhdGNoZXIgPSBtc2VhcmNoZXIuY2xpZW50LmJhdGNoKCk7XG4gICAga2V5cy5mb3JFYWNoKGVsZW1lbnQgPT4ge1xuICAgICAgdmFyIHZhbHVlID0ge1xuICAgICAgICBzdGF0dXM6IDIsXG4gICAgICAgIGxvY2F0aW9uOiBcIkluIFRyYW5zaXRcIlxuICAgICAgfTtcbiAgICAgIGNvbnNvbGUubG9nKGVsZW1lbnQgKyBcImlzIHRoZSBlbGVtZW50XCIpO1xuXG4gICAgICBiYXRjaGVyLmhtc2V0KFBLR19QUkVGSVggKyBlbGVtZW50LCB2YWx1ZSk7XG4gICAgfSk7XG4gICAgYmF0Y2hlci5leGVjKChlcnIsIHJlc3VsdCkgPT4ge1xuICAgICAgY29uc29sZS5sb2cocmVzdWx0KTtcbiAgICAgIC8vcmVhZGQgdGhlIGRvY3VtZW50cyBoZXJlXG4gICAgICBrZXlzLmZvckVhY2goZWxlbWVudCA9PiB7XG4gICAgICAgIGFkZFBhY2thZ2VUb0luZGV4KGVsZW1lbnQsIG1zZWFyY2hlcik7XG4gICAgICB9KTtcbiAgICAgIHJlc29sdmUocmVzdWx0KTtcbiAgICB9KTtcbiAgfSk7XG59XG5cbmZ1bmN0aW9uIGFkZFBhY2thZ2VUb0luZGV4KHRyYWNraW5nTm8sIG1zZWFyY2hlcikge1xuICBscmVkaXMuZ2V0UGFja2FnZSh0cmFja2luZ05vKS50aGVuKHBhY2sgPT4ge1xuICAgIG1zZWFyY2hlci5kZWxEb2N1bWVudChQS0dfSURYLCBgJHtwYWNrLm1pZH0tJHt0cmFja2luZ05vfWAsIChlcnIsIGRvbmUpID0+IHtcbiAgICAgIHZhciBkb2N1bWVudCA9IGNyZWF0ZURvY3VtZW50KHBhY2spO1xuICAgICAgY29uc29sZS5sb2coXCJyZWFkZGluZyBwYWNrYWdlIHRvIHRoZSBpbmRleCBsaWtlIGEgYm9zcyBcIiArIHRyYWNraW5nTm8pO1xuICAgICAgbXNlYXJjaGVyLmFkZChwYWNrLm1pZCArIFwiLVwiICsgcGFjay50cmFja2luZ05vLCBkb2N1bWVudCk7XG4gICAgfSk7XG4gIH0pO1xufVxuZXhwb3J0IGNsYXNzIFBhY2thZ2VTZXJ2aWNlIHtcbiAgY29uc3RydWN0b3IoKSB7XG4gICAgdGhpcy5zZXR1cEluZGV4KCk7XG4gIH1cbiAgc2V0dXBJbmRleCgpIHtcbiAgICB0aGlzLm15U2VhcmNoID0gcmVkaXNTZWFyY2gocmVkaXMsIFBLR19JRFgsIHtcbiAgICAgIGNsaWVudE9wdGlvbnM6IGxyZWRpcy5zZWFyY2hDbGllbnREZXRhaWxzXG4gICAgfSk7XG4gIH1cbiAgZ2V0TmV3QXdiKCl7XG4gICAgcmV0dXJuIG5ldyBQcm9taXNlKChyZXNvbHZlLHJlamVjdCk9PntcbiAgICAgIGRhdGFDb250ZXh0LnJlZGlzQ2xpZW50LmV4aXN0cyhBV0JfSUQsKGVycixyZXN1bHQpPT57XG4gICAgICAgIGNvbnNvbGUubG9nKHJlc3VsdCk7IFxuICAgICAgICBpZiAocmVzdWx0ICE9IFwiMVwiKXtcbiAgICAgICAgICBkYXRhQ29udGV4dC5yZWRpc0NsaWVudC5zZXQoQVdCX0lEID09IDEwMDAwMCwoZXJyLGluaXRSZXN1bHQpPT57XG4gICAgICAgICAgICBkYXRhQ29udGV4dC5yZWRpc0NsaWVudC5pbmNyKEFXQl9JRCwoZXJyLG5ld0lkKT0+e1xuICAgICAgICAgICAgICByZXNvbHZlKHthd2I6bmV3SWR9KVxuICAgICAgICAgICAgfSlcbiAgICAgICAgICB9KVxuICAgICAgICB9XG4gICAgICAgIGVsc2Uge1xuICAgICAgICAgIGRhdGFDb250ZXh0LnJlZGlzQ2xpZW50LmluY3IoQVdCX0lELChlcnIsbmV3SWQpPT57XG4gICAgICAgICAgICByZXNvbHZlKHthd2I6bmV3SWR9KVxuICAgICAgICAgIH0pXG4gICAgICAgIH1cbiAgICAgIH0pXG4gICAgfSk7XG4gIH1cbiAgc2F2ZUF3Yihhd2Ipe1xuICAgIHJldHVybiBuZXcgUHJvbWlzZSgocmVzb2x2ZSxyZWplY3QpPT57XG4gICAgICBjb25zb2xlLmxvZygnc2F2aW5nLi4uJyxhd2IsbW9tZW50KCkudG9TdHJpbmcoXCJoaDptbTpzc1wiKSlcbiAgICAgIGRhdGFDb250ZXh0LnJlZGlzQ2xpZW50LmluY3IoQVdCX0lELChlcnIscmVwbHkpPT57XG4gICAgICAgIGF3Yi5pZCA9IHJlcGx5OyBcblxuICAgICAgICAgIGF3YkluZGV4LmFkZChhd2IuaWQsYXdiLChlcnIxLGF3YlJlcyk9PntcbiAgICAgICAgICAgIGlmIChlcnIxKXtcbiAgICAgICAgICAgICAgY29uc29sZS5sb2coJ3NhdmluZyBlcnInLGVycjEpXG4gICAgICAgICAgICAgIHJlc29sdmUoe3NhdmVkOmZhbHNlfSlcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIHJlc29sdmUoe3NhdmVkOnRydWUsIGlkOnJlcGx5fSlcbiAgICAgICAgICB9KVxuICAgICAgfSlcbiAgICAgICBcbiAgICAgIFxuICAgICAgXG4gICAgfSlcbiAgfVxuICBsaXN0QXdiaW5GbGwoKXtcbiAgICByZXR1cm4gbmV3IFByb21pc2UoKHJlc29sdmUscmVqZWN0KT0+e1xuICAgICAgIGF3YkluZGV4LnNlYXJjaChcIkBzdGF0dXM6WzEgMV1cIix7b2Zmc2V0OjAsbnVtYmVyT2ZSZXN1bHRzOjUwMDAsc29ydEJ5OidpZCd9LChlcnIsYXdicyk9PntcbiAgICAgICAgIHZhciBhd2JMaXN0ID0gW107IFxuICAgICAgICAgYXdicy5yZXN1bHRzLmZvckVhY2goYXdiID0+IHtcbiAgICAgICAgICAgYXdiTGlzdC5wdXNoKGF3Yi5kb2MpXG4gICAgICAgICB9KTtcbiAgICAgICAgIHJlc29sdmUoe2F3YnM6YXdiTGlzdH0pXG4gICAgICAgfSlcbiAgICB9KVxuICB9XG4gIGdldEF3YihpZCl7XG4gICAgcmV0dXJuIG5ldyBQcm9taXNlKChyZXNvbHZlLHJlamVjdCk9PntcbiAgICAgIGF3YkluZGV4LmdldERvYyhpZCwoZXJyLGF3Yik9PntcbiAgICAgICAgcmVzb2x2ZSh7YXdiOmF3Yi5kb2N9KVxuICAgICAgfSlcbiAgICB9KVxuICB9XG4gIHVwZGF0ZUxvY2F0aW9uKHRyYWNraW5nTnVtYmVyLGxvY2F0aW9uX2lkKXtcbiAgICByZXR1cm4gbmV3IFByb21pc2UoKHJlc29sdmUscmVqZWN0KT0+e1xuICAgICAgcGFja2FnZUluZGV4LnNlYXJjaChcIkB0cmFja2luZ05vOlwiK3RyYWNraW5nTnVtYmVyLHtsb2NhdGlvbjpsb2NhdGlvbl9pZH0sKGVycixwYWNrYWdlUmVzdWx0KT0+e1xuXG4gICAgICB9KVxuICAgIH0pXG4gIH1cbiAgc2F2ZVBhY2thZ2VUb0F3YihuZXdQYWNrYWdlKXtcbiAgICByZXR1cm4gbmV3IFByb21pc2UoKHJlc29sdmUscmVzdWx0KT0+e1xuICAgICAgZGF0YUNvbnRleHQucmVkaXNDbGllbnQuaW5jcihQS0dfSURfQ09VTlRFUiwoZXJyLGlkKT0+e1xuICAgICAgICBuZXdQYWNrYWdlLmlkID0gaWQ7IFxuICAgICAgICBwYWNrYWdlSW5kZXguYWRkKGlkLG5ld1BhY2thZ2UsKGVycixyZXN1bHQpPT57XG4gICAgICAgICAgaWYgKGVycilcbiAgICAgICAgICAgIGNvbnNvbGUubG9nKGVycik7IFxuICAgICAgICAgIHJlc29sdmUoe3NhdmVkOnRydWUsaWQ6aWR9KVxuICAgICAgICB9KVxuICAgICAgfSlcbiAgICB9KVxuICB9XG4gIHNhdmVQYWNrYWdlKGJvZHkpe1xuICAgIHJldHVybiBuZXcgUHJvbWlzZSgocmVzb2x2ZSxyZWplY3QpPT57XG4gICAgICB2YXIgY1BhY2thZ2UgPSB7XG4gICAgICAgIFxuICAgICAgICBza3lib3g6IGJvZHkuc2t5Ym94LFxuICAgICAgICBjdXN0b21lcjogYm9keS5jdXN0b21lci5yZXBsYWNlKFwiLVwiLCBcIlwiKS50cmltKCksXG4gICAgICAgIHRyYWNraW5nTm86IGJvZHkudHJhY2tpbmcsXG4gICAgICAgIGRlc2NyaXB0aW9uOiBib2R5LmRlc2NyaXB0aW9uLFxuICAgICAgICBzaGlwcGVyOiBib2R5LnNoaXBwZXIsXG4gICAgICAgIGNhcnJpZXI6Ym9keS5jYXJyaWVyLFxuICAgICAgICB2YWx1ZTogTnVtYmVyKGJvZHkudmFsdWUpLFxuICAgICAgICBwaWVjZXM6IE51bWJlcihib2R5LnBpZWNlcyksXG4gICAgICAgIHdlaWdodDogTnVtYmVyKGJvZHkud2VpZ2h0KSxcbiAgICAgICAgZGltZW5zaW9uczogYm9keS5kaW1lbnNpb25zLFxuICAgICAgICBzdGF0dXM6IDEsXG4gICAgICAgIGxvY2F0aW9uOiBcIkZMTFwiLFxuICAgICAgICBtaWQ6IDAsXG4gICAgICAgIGF3YjowLFxuICAgICAgICAvL2hhc09wdDogdHJ1ZSxcbiAgICAgICAgLy9tdHlwZTogYm9keS5tdHlwZVxuICAgICAgfTtcbiAgICAgIC8vdmFsaWRhdGUgdGhlIHBhY2thZ2UgXG4gICAgICBkYXRhQ29udGV4dC5yZWRpc0NsaWVudC5pbmNyKFBLR19JRF9DT1VOVEVSLChlcnIsaWQpPT57XG4gICAgICAgIGNQYWNrYWdlLmlkID0gaWQ7IFxuICAgICAgICBkYXRhQ29udGV4dC5yZWRpc0NsaWVudC5zZXQoUEtHX1BSRUZJWCtpZCxjUGFja2FnZSwoZXJyLHJlc3BvbnNlKT0+e1xuICAgICAgICAgIGlmIChlcnIpe1xuICAgICAgICAgICAgcmVqZWN0KHtzYXZlZDpmYWxzZSxlcnI6ZXJyfSlcbiAgICAgICAgICB9XG4gICAgICAgICAgIHZhciBpbmRleFBhY2thZ2UgPSAgY3JlYXRlRG9jdW1lbnQoY1BhY2thZ2UpOyBcbiAgICAgICAgICAgY29uc29sZS5sb2coaW5kZXhQYWNrYWdlKTsgXG4gICAgICAgICAgIHBhY2thZ2VJbmRleC5hZGQoY1BhY2thZ2UuaWQsaW5kZXhQYWNrYWdlLChlcnIxLGRvY1Jlc3VsdCk9PntcbiAgICAgICAgICAgICBjb25zb2xlLmxvZyhkb2NSZXN1bHQpOyBcbiAgICAgICAgICAgICBpZihlcnIxKXtcbiAgICAgICAgICAgICAgIHJlamVjdCh7c2F2ZWQ6ZmFsc2UsZXJyOmVycjF9KVxuICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICByZXNvbHZlKHtzYXZlZDp0cnVlfSlcbiAgICAgICAgICAgfSlcblxuICAgICAgICB9KVxuICAgICAgfSk7XG4gICAgXG5cblxuICAgIH0pXG4gIH1cbiAgc2F2ZVBhY2thZ2VPbGQoYm9keSkge1xuICAgIFxuICAgIHZhciBzZWFyY2hlciA9IHRoaXMubXlTZWFyY2g7IFxuICAgIHJldHVybiBuZXcgUHJvbWlzZSgocmVzb2x2ZSwgcmVqZWN0KSA9PiB7XG4gICAgICB2YXIgY1BhY2thZ2UgPSB7XG4gICAgICAgIHNreWJveDogYm9keS5za3lib3gsXG4gICAgICAgIGN1c3RvbWVyOiBib2R5LmN1c3RvbWVyLnJlcGxhY2UoXCItXCIsIFwiXCIpLnRyaW0oKSxcbiAgICAgICAgdHJhY2tpbmdObzogYm9keS50cmFja2luZyxcbiAgICAgICAgZHV0eVBlcmNlbnQ6IDAuMixcbiAgICAgICAgZGVzY3JpcHRpb246IGJvZHkuZGVzY3JpcHRpb24sXG4gICAgICAgIHNoaXBwZXI6IGJvZHkuc2hpcHBlcixcbiAgICAgICAgdmFsdWU6IE51bWJlcihib2R5LnZhbHVlKSxcbiAgICAgICAgcGllY2VzOiBOdW1iZXIoYm9keS5waWVjZXMpLFxuICAgICAgICB3ZWlnaHQ6IE51bWJlcihib2R5LndlaWdodCksXG4gICAgICAgIHN0YXR1czogMSxcbiAgICAgICAgbG9jYXRpb246IFwiRkxMXCIsXG4gICAgICAgIG1pZDogYm9keS5taWQsXG4gICAgICAgIGhhc09wdDogdHJ1ZSxcbiAgICAgICAgLy9tdHlwZTogYm9keS5tdHlwZVxuICAgICAgfTtcbiAgICAgIGNvbnNvbGUubG9nKFwiYWJvdXQgdG8gc2F2ZSB0aGUgcGFja2FnZVwiKTtcbiAgICAgIGlmICh0eXBlb2YgY1BhY2thZ2Uuc2hpcHBlciA9PT0gXCJ1bmRlZmluZWRcIikgY1BhY2thZ2Uuc2hpcHBlciA9IFwiXCI7XG4gICAgICBpZiAodHlwZW9mIGNQYWNrYWdlLmRlc2NyaXB0aW9uID09PSBcInVuZGVmaW5lZFwiKVxuICAgICAgICBjUGFja2FnZS5kZXNjcmlwdGlvbiA9IFwiXCI7XG4gICAgICBjb25zb2xlLmxvZyhib2R5KTtcbiAgICAgIC8vIGlmIChOdW1iZXIoYm9keS5pc0J1c2luZXNzKSA9PSAxKSB7XG4gICAgICAvLyAgIGNQYWNrYWdlLmhhc09wdCA9IGZhbHNlO1xuICAgICAgLy8gfVxuICAgICAgLy9jUGFja2FnZSA9IHBhY2thZ2VVdGlsLmNhbGN1bGF0ZUZlZXMoY1BhY2thZ2UpO1xuICAgICAgY29uc29sZS5sb2coXCJwYWNrYWdlIHdpdGggZmVlc1wiKTtcblxuICAgICAgLy93ZSBhbHNvIHdhbnQgdG8gY2FsY3VsYXRlIHRoZSB0aGUgcGFja2FnZSBmZWVzIG9uZSB0aW1lLi4uLi4uXG4gICAgICAvL3dlIGhhdmUgdGhlIHBhY2thZ2UgZGV0YWlscyBoZXJlIC4uIG5vdyB3ZSBuZWVkIHRvIGdldCB0aGUgZXhpc3RpbmcgcGFja2FnZVxuXG4gICAgIFxuICAgICAgLy93ZSBuZWVkIHRvIGNoZWNrIHRvIHNlZSBvZiB0aGUgb3duZXIgaXMgYSBidXNpbmVzcyBoZXJlXG4gICAgICBjb25zb2xlLmxvZyhcImhlcmUgYWJvdXQgdG8gZ2V0IHRoZSBwYWNrYWdlXCIpXG4gICAgICBscmVkaXMuZ2V0UGFja2FnZShjUGFja2FnZS50cmFja2luZ05vKS50aGVuKHAgPT4ge1xuICAgICAgICBjb25zb2xlLmxvZygncCBpcyB0aGUgJyxwKTsgXG4gICAgICAgIGlmIChwKSB7XG4gICAgICAgICAgdmFyIGN1cnJlbnRDb250YWluZXIgPSBgbWFuaWZlc3Q6JHtwLm1pZH06JHtwLm10eXBlfToke2NvbnRhaW5lcn06YDtcbiAgICAgICAgICBjb25zb2xlLmxvZyhcImZvdW5kIHBhY2thZ2UgXCIpO1xuICAgICAgICAgIGNvbnNvbGUubG9nKHApO1xuICAgICAgICAgIGlmIChjb250YWluZXIgPT0gXCJiYWdcIikge1xuICAgICAgICAgICAgLy9jaGVjayB0byBzZWUgaWYgdGhlIGJhY2sgbm8gaXMgdGhlIHNhbWUuXG4gICAgICAgICAgICBpZiAocC5iYWcgIT0gY1BhY2thZ2UuYmFnKSB7XG4gICAgICAgICAgICAgIC8vcmVtb3ZlIGl0IGZyb20gdGhlIG9yaWdpbmFsIGxpc3RcbiAgICAgICAgICAgICAgbHJlZGlzLnNyZW0oY3VycmVudENvbnRhaW5lciArIHAuYmFnLCBwLnRyYWNraW5nTm8pO1xuICAgICAgICAgICAgICBjb25zb2xlLmxvZyhcbiAgICAgICAgICAgICAgICBcInJlbW92ZSBwYWNrYWdlIGZyb20gY3VycmVudCBzZXQgXCIgKyBjdXJyZW50Q29udGFpbmVyXG4gICAgICAgICAgICAgICk7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgIC8vY2hlY2sgdG8gc2VlIGlmIHRoZSBza2lkIG51bWJlciBpcyB0aGUgc2FtZS5cbiAgICAgICAgICAgIGlmIChwLnNraWQgIT0gY1BhY2thZ2Uuc2tpZCkge1xuICAgICAgICAgICAgICAvL3JlbW92ZSBpdCBmcm9tIHRoZSBvcmlnaW5hbCBsaXN0XG4gICAgICAgICAgICAgIGxyZWRpcy5zcmVtKGN1cnJlbnRDb250YWluZXIgKyBwLnNraWQsIHAudHJhY2tpbmdObyk7XG4gICAgICAgICAgICAgIGNvbnNvbGUubG9nKFxuICAgICAgICAgICAgICAgIFwicmVtb3ZlIHBhY2thZ2UgZnJvbSBjdXJyZW50IHNldCBcIiArIGN1cnJlbnRDb250YWluZXJcbiAgICAgICAgICAgICAgKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICB9XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgLy8gdGhlIHBhY2thZ2UgZG9lc24ndCBleGlzdCB1cGRhdGUgdGhlIGNvdW50ZXJcbiAgICAgICAgICBscmVkaXMuY2xpZW50LmluY3IoXCJtY291bnRlcjpcIiArIGNQYWNrYWdlLm1pZCk7XG4gICAgICAgICAgXG4gICAgICAgIH1cblxuICAgICAgICBscmVkaXNcbiAgICAgICAgICAuaG1zZXQoXCJwYWNrYWdlczpcIiArIGNQYWNrYWdlLnRyYWNraW5nTm8sIGNQYWNrYWdlKVxuICAgICAgICAgIC50aGVuKGZ1bmN0aW9uKHJlc3VsdCkge1xuICAgICAgICAgICAgLy9hZGQgdG8gcXVldWUgZm9yIHBlcnNpc3RlbnQgcHJvY2Vzc2luZ1xuICAgICAgICAgICAgXG4gICAgICAgICAgICB2YXIgbWFuaWZlc3RLZXkgPSBgbWFuaWZlc3Q6JHtjUGFja2FnZS5taWR9OiR7XG4gICAgICAgICAgICAgIGNQYWNrYWdlLm10eXBlXG4gICAgICAgICAgICB9OiR7Y29udGFpbmVyfToke2NvbnRhaW5lck5vfWA7XG4gICAgICAgICAgICBjb25zb2xlLmxvZyhcImFib3V0IHRvIGNyZWF0ZSB0aGUgZG9jdW1lbnQuLi4uXCIpO1xuICAgICAgICAgICAgYWRkUGFja2FnZVRvSW5kZXgoY1BhY2thZ2UudHJhY2tpbmdObyxzZWFyY2hlcik7IFxuICAgICAgICAgICAgY29uc29sZS5sb2coXCJhZGRlZCB0aGUgcGFja2FnZSB0byBpbmRleFwiKTtcbiAgICAgICAgICAgIGxyZWRpc1xuICAgICAgICAgICAgICAuc2V0QWRkKG1hbmlmZXN0S2V5LCBjUGFja2FnZS50cmFja2luZ05vKVxuICAgICAgICAgICAgICAudGhlbihmdW5jdGlvbihzUmVzdWx0KSB7XG4gICAgICAgICAgICAgICAgLy9nZXQgdGhlIG1lbWJlcnMgb25lIHRpbWUgaGVyZVxuICAgICAgICAgICAgICAgIGNvbnNvbGUubG9nKFwiYWRkZWQgdGhlIHBhY2thZ2UgdG8gdGhlIHNldFwiKTtcbiAgICAgICAgICAgICAgICBjb25zb2xlLmxvZyhtYW5pZmVzdEtleSk7XG4gICAgICAgICAgICAgICAgbHJlZGlzXG4gICAgICAgICAgICAgICAgICAuZ2V0TWVtYmVycyhtYW5pZmVzdEtleSlcbiAgICAgICAgICAgICAgICAgIC50aGVuKGRhdGEgPT4ge1xuICAgICAgICAgICAgICAgICAgICBjb25zb2xlLmxvZyhcImRhdGFcIik7XG4gICAgICAgICAgICAgICAgICAgIGNvbnNvbGUubG9nKGRhdGEpO1xuICAgICAgICAgICAgICAgICAgICBQcm9taXNlLmFsbChkYXRhLm1hcChscmVkaXMuZ2V0UGFja2FnZSkpO1xuICAgICAgICAgICAgICAgICAgfSlcbiAgICAgICAgICAgICAgICAgIC50aGVuKGZ1bmN0aW9uKHJkYXRhKSB7XG4gICAgICAgICAgICAgICAgICAgIC8vd2UgbmVlZCB0byBhbGVydCB0aGUgcGVyc29uIHRoYXQgdGhlIHBhY2thZ2UgaXMgaGVyZSBzbyByZWFkIGVtYWlsIGV0Yy5cbiAgICAgICAgICAgICAgICAgICAgLy9hZGQgdG8gdGhlIGluZGV4XG4gICAgICAgICAgICAgICAgICAgIGNvbnNvbGUubG9nKFwiZGF0YVwiKTtcbiAgICAgICAgICAgICAgICAgICAgY29uc29sZS5sb2cocmRhdGEpO1xuXG4gICAgICAgICAgICAgICAgICAgIHJlc29sdmUoe1xuICAgICAgICAgICAgICAgICAgICAgIHNhdmVkOiB0cnVlLFxuICAgICAgICAgICAgICAgICAgICAgIHBhY2thZ2VzOiByZGF0YSxcbiAgICAgICAgICAgICAgICAgICAgICBzUGFja2FnZTogY1BhY2thZ2VcbiAgICAgICAgICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICAgICAgICB9KVxuICAgICAgICAgICAgICAgICAgLmNhdGNoKGVycjMgPT4ge1xuICAgICAgICAgICAgICAgICAgICBjb25zb2xlLmxvZyhlcnIzKTtcbiAgICAgICAgICAgICAgICAgICAgcmVqZWN0KHtcbiAgICAgICAgICAgICAgICAgICAgICBlcnI6IGVycjMsXG4gICAgICAgICAgICAgICAgICAgICAgc2F2ZWQ6IHRydWUsXG4gICAgICAgICAgICAgICAgICAgICAgbGlzdGluZzogZmFsc2VcbiAgICAgICAgICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICAgICAgICB9KTtcbiAgICAgICAgICAgICAgfSlcbiAgICAgICAgICAgICAgLmNhdGNoKGZ1bmN0aW9uKGVycikge1xuICAgICAgICAgICAgICAgIHJlc29sdmUoe1xuICAgICAgICAgICAgICAgICAgc2F2ZWQ6IGZhbHNlXG4gICAgICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICAgIH0pO1xuICAgICAgICAgIH0pXG4gICAgICAgICAgLmNhdGNoKGZ1bmN0aW9uKGVycjIpIHtcbiAgICAgICAgICAgIHJlamVjdCh7XG4gICAgICAgICAgICAgIHNhdmVkOiBmYWxzZVxuICAgICAgICAgICAgfSk7XG4gICAgICAgICAgfSk7XG5cbiAgICAgICAgLy9zYXZlIHRoZSBwYWNrYWdlIHRvIHRoZSBwYWNrYWdlIE5TXG4gICAgICB9KS5jYXRjaChlcnIyMzI9PntcbiAgICAgICAgY29uc29sZS5sb2coZXJyMjMyKVxuICAgICAgfSk7XG4gICAgfSk7XG4gIH0gXG4gIGdldE1hbmlmZXN0UGFja2FnZXMoKXtcbiAgICByZXR1cm4gbmV3IFByb21pc2UoKHJlc29sdmUscmVqZWN0KT0+e1xuICAgICAgXG4gICAgICB0aGlzLm15U2VhcmNoLnNlYXJjaChcbiAgICAgICAgYEBtaWQ6WzAgMF1gLFxuICAgICAgICB7IG9mZnNldDogMCwgbnVtYmVyT2ZSZXN1bHRzOiA1MDAwIH0sXG4gICAgICAgIChlcnIsIGRhdGEpID0+IHtcbiAgICAgICAgICB2YXIgcGFja2FnZXMgPSBbXTtcbiAgICAgICAgICBjb25zb2xlLmxvZyhkYXRhKTtcbiAgICAgICAgICBkYXRhLnJlc3VsdHMuZm9yRWFjaChlbGVtZW50ID0+IHtcblxuICAgICAgICAgICAgcGFja2FnZXMucHVzaChlbGVtZW50LmRvYyk7XG4gICAgICAgICAgICByZXNvbHZlKHBhY2thZ2VzKTsgICAgICAgICAgICAgICAgIFxuICAgICAgICB9KTtcbiAgICB9KTtcbiAgICB9KVxuICB9XG4gIGdldFJlY2VpdmVkUGFja2FnZXMocGFnZSxwYWdlU2l6ZSl7XG4gICAgcmV0dXJuIG5ldyBQcm9taXNlKChyZXNvbHZlLHJlamVjdCk9PntcbiAgICAgIFxuICAgICAgdGhpcy5teVNlYXJjaC5zZWFyY2goXG4gICAgICAgIGBAbWlkOlswIDBdYCxcbiAgICAgICAgeyBvZmZzZXQ6IDAsIG51bWJlck9mUmVzdWx0czogNTAwMCB9LFxuICAgICAgICAoZXJyLCBkYXRhKSA9PiB7XG4gICAgICAgICAgdmFyIHBhY2thZ2VzID0gW107XG4gICAgICAgICAgY29uc29sZS5sb2coZGF0YSk7XG4gICAgICAgICAgZGF0YS5yZXN1bHRzLmZvckVhY2goZWxlbWVudCA9PiB7XG5cbiAgICAgICAgICAgIHBhY2thZ2VzLnB1c2goZWxlbWVudC5kb2MpO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIFxuICAgICAgICB9KTtcbiAgICAgICAgcmVzb2x2ZShwYWNrYWdlcyk7IFxuICAgIH0pO1xuICAgIH0pXG4gIH1cbiAgZ2V0Tm9Eb2NzUGFja2Fja2FnZXMocGFnZSxwYWdlU2l6ZSl7XG4gICAgcmV0dXJuIG5ldyBQcm9taXNlKChyZXNvbHZlLHJlamVjdCk9PntcbiAgICAgIFxuICAgICAgdGhpcy5teVNlYXJjaC5zZWFyY2goXG4gICAgICAgIGBAaGFzRG9jczpbMCAwXWAsXG4gICAgICAgIHsgb2Zmc2V0OiAwLCBudW1iZXJPZlJlc3VsdHM6IDUwMDAgfSxcbiAgICAgICAgKGVyciwgZGF0YSkgPT4ge1xuICAgICAgICAgIHZhciBwYWNrYWdlcyA9IFtdO1xuICAgICAgICAgIGNvbnNvbGUubG9nKGRhdGEpO1xuICAgICAgICAgIGRhdGEucmVzdWx0cy5mb3JFYWNoKGVsZW1lbnQgPT4ge1xuXG4gICAgICAgICAgICBwYWNrYWdlcy5wdXNoKGVsZW1lbnQuZG9jKTtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBcbiAgICAgICAgfSk7XG4gICAgICAgIHJlc29sdmUocGFja2FnZXMpOyBcbiAgICB9KTtcbiAgICB9KVxuICB9XG4gIGdldFBhY2thZ2VCeUlkKGlkKXtcbiAgICByZXR1cm4gbmV3IFByb21pc2UoKHJlc29sdmUscmVqZWN0KT0+e1xuICAgICAgcmVkaVNlYXJjaC5nZXREb2MoaWQsKGVycixkb2N1bWVudCk9PntcbiAgICAgICAgcmVzb2x2ZShkb2N1bWVudC5kb2MpOyBcbiAgICAgIH0pXG4gICAgfSk7IFxuICB9XG4gIHVwZGF0ZU1hbmlmZXN0UGFja2FnZVRvSW5UcmFuc2l0KG1pZCkge1xuICAgIC8vZ2V0IGFsbCB0aGUgcGFja2FnZXNcbiAgICAvL3dlIG5lZWQgdG8gdXBkYXRlIHRoZSBpbmRleCBhdCB0aGlzIHBvaW50IGFzIHdlbGxcbiAgICB2YXIgbXNlYXJjaCA9IHRoaXMubXlTZWFyY2g7XG4gICAgdGhpcy5teVNlYXJjaC5zZWFyY2goXG4gICAgICBgQG1pZDpbJHttaWR9ICR7bWlkfV1gLFxuICAgICAgeyBvZmZzZXQ6IDAsIG51bWJlck9mUmVzdWx0czogNTAwMCB9LFxuICAgICAgKGVyciwgZGF0YSkgPT4ge1xuICAgICAgICB2YXIgcGFja2FnZXMgPSBbXTtcbiAgICAgICAgY29uc29sZS5sb2coZGF0YSk7XG4gICAgICAgIGRhdGEucmVzdWx0cy5mb3JFYWNoKGVsZW1lbnQgPT4ge1xuICAgICAgICAgIHZhciBvbGREb2NJZCA9IGVsZW1lbnQuZG9jSWQ7XG4gICAgICAgICAgZWxlbWVudC5kb2NJZCA9IGVsZW1lbnQuZG9jSWQucmVwbGFjZShgJHttaWR9LWAsIFwiXCIpO1xuICAgICAgICAgIHBhY2thZ2VzLnB1c2goZWxlbWVudC5kb2NJZCk7XG4gICAgICAgICAgLy8gaSBjb3VsZCBkZWxldGUgaGVyZVxuICAgICAgICAgIC8vIG1zZWFyY2guZGVsRG9jdW1lbnQoUEtHX0lEWCxvbGREb2NJZClcbiAgICAgICAgICAvL3VwZGF0ZSBhbGwgdGhlIHBhY2thZ2VzXG4gICAgICAgIH0pO1xuICAgICAgICBzZXRQYWNrYWdlSW5UcmFuc2l0KHBhY2thZ2VzLCBtc2VhcmNoLCBtaWQpLnRoZW4oZnVuY3Rpb24oXG4gICAgICAgICAgdXBkYXRlZFBhY2thZ2VzXG4gICAgICAgICkge1xuICAgICAgICAgIGNvbnNvbGUubG9nKFwidXBkYXRlZCBwYWNrYWdlc1wiKTtcbiAgICAgICAgICBjb25zb2xlLmxvZyh1cGRhdGVkUGFja2FnZXMpO1xuICAgICAgICB9KTtcbiAgICAgIH1cbiAgICApO1xuICB9XG4gIHJlbW92ZVBhY2thZ2UodHJhY2tpbmdObywgbWlkKSB7XG4gICAgdmFyIG1zZWFyY2ggPSB0aGlzLm15U2VhcmNoO1xuICAgIHJldHVybiBuZXcgUHJvbWlzZSgocmVzb2x2ZSwgcmVqZWN0KSA9PiB7XG4gICAgICB2YXIgbWFuaWZlc3QgPSBtaWQ7XG4gICAgICB2YXIgbWFuaWZlc3RLZXkgPSBcIm1hbmlmZXN0OlwiICsgbWFuaWZlc3QgKyBcIjoqXCI7XG5cbiAgICAgIGxyZWRpcy5kZWwoXCJwYWNrYWdlczpcIiArIHRyYWNraW5nTm8pLnRoZW4oZnVuY3Rpb24ocmVzdWx0KSB7XG4gICAgICAgIGNvbnNvbGUubG9nKHJlc3VsdCk7XG4gICAgICAgIG1zZWFyY2guZGVsRG9jdW1lbnQoUEtHX0lEWCwgYCR7bWlkfS0ke3RyYWNraW5nTm99YCk7XG4gICAgICAgIC8vd2UgbmVlZCB0byByZW1vdmUgZnJvbSB0aGUgaW5kZXggYW5kIGRlYyB0aGUgY291bnRlclxuICAgICAgICBscmVkaXMuY2xpZW50LmRlY3IoXCJtY291bnRlcjpcIiArIG1pZCk7XG4gICAgICAgIC8vclNlcnZpY2VzLnBhY2thZ2VTZXJ2aWNlLnJtUGFja2FnZShtaWQsIHRyYWNraW5nTm8pO1xuICAgICAgICBscmVkaXMuZ2V0S2V5cyhtYW5pZmVzdEtleSkudGhlbihrUmVzdWx0ID0+IHtcbiAgICAgICAgICAvL3RoZSBsaXN0IG9mIGFsbCB0aGUgc2V0cyAuLi53ZSBuZWVkIHRvIHJlbW92ZSB0aGUga2V5IGZyb20gZWFjaCBvbmVcbiAgICAgICAgICB2YXIga2V5c0NvdW50ID0gMDtcblxuICAgICAgICAgIGtSZXN1bHQuZm9yRWFjaChlbGVtZW50ID0+IHtcbiAgICAgICAgICAgIGNvbnNvbGUubG9nKFxuICAgICAgICAgICAgICBgcmVtb3ZpbmcgJHt0cmFja2luZ05vfSBwYWNrYWdlIG1hbmlmZXN0IHNldCAke2VsZW1lbnR9IGBcbiAgICAgICAgICAgICk7XG4gICAgICAgICAgICBscmVkaXMuc3JlbShlbGVtZW50LCB0cmFja2luZ05vKS50aGVuKGZ1bmN0aW9uKHJSZXN1bHQpIHtcbiAgICAgICAgICAgICAgY29uc29sZS5sb2coclJlc3VsdCk7XG4gICAgICAgICAgICAgIGNvbnNvbGUubG9nKFwicmVtb3ZlZFwiKTtcbiAgICAgICAgICAgICAgaWYgKGtleXNDb3VudCA9PSBrUmVzdWx0Lmxlbmd0aCAtIDEpIGtleXNDb3VudCsrO1xuICAgICAgICAgICAgfSk7XG4gICAgICAgICAgfSk7XG4gICAgICAgICAgcmVzb2x2ZSh7XG4gICAgICAgICAgICBkZWxldGVkOiB0cnVlXG4gICAgICAgICAgfSk7XG4gICAgICAgIH0pO1xuXG4gICAgICAgIC8vd2UgYWxzbyBuZWVkIHRvIHJlbW92ZSBmcm9tIGFueSBzZXRzXG4gICAgICB9KTtcbiAgICB9KTtcbiAgfVxuICByZW1vdmVQYWNrYWdlQnlJZChpZCkge1xuICAgIHZhciBtc2VhcmNoID0gdGhpcy5teVNlYXJjaDtcbiAgICByZXR1cm4gbmV3IFByb21pc2UoKHJlc29sdmUsIHJlamVjdCkgPT4ge1xuICAgIFxuICAgICAgcmVkaVNlYXJjaC5kZWxEb2N1bWVudChQS0dfSURYLGlkLChlcnIscmVzcG9uc2UpPT57XG4gICAgICAgIHJlc29sdmUoe2RlbGV0ZWQ6dHJ1ZX0pXG4gICAgICB9KVxuICAgICAgXG4gICAgICAgIFxuICAgICAgXG4gICAgfSk7XG4gIH1cbiAgc3RvcmVQYWNrYWdlRm9yUGlja3VwKHRyYWNraW5nTm8sYmluKXtcbiAgICB2YXIgc2VhcmNoZXIgPSB0aGlzLm15U2VhcmNoO1xuICAgIHJldHVybiBuZXcgUHJvbWlzZSgocmVzb2x2ZSxyZWplY3QpPT57XG4gICAgICAgbHJlZGlzLmhtc2V0KFBLR19QUkVGSVgrdHJhY2tpbmdObyx7c3RhdHVzOjQsbG9jYXRpb246YmlufSkudGhlbigocmVzdWx0KT0+e1xuICAgICAgICAgbHJlZGlzLmdldFBhY2thZ2UodHJhY2tpbmdObykudGhlbigocGtnKT0+e1xuICAgICAgICAgIGFkZFBhY2thZ2VUb0luZGV4KHRyYWNraW5nTm8sc2VhcmNoZXIpIDsgXG4gICAgICAgICAgcmVzb2x2ZShwa2cpOyAgIFxuICAgICAgICAgfSk7XG4gICAgICAgfSkgXG4gICAgfSk7IFxuICB9XG4gIHVwZGF0ZVBhY2thZ2VJbmRleCh0cmFja2luZyl7XG4gICAgICByZXR1cm4gbmV3IFByb21pc2UoKHJlc29sdmUscmVqZWN0KT0+e1xuICAgICAgICAgIHZhciBtc2VhcmNoID0gdGhpcy5teVNlYXJjaDsgXG4gICAgICAgICAgYWRkUGFja2FnZVRvSW5kZXgodHJhY2tpbmcsbXNlYXJjaCk7IFxuICAgICAgICAgcmVzb2x2ZSh7J3VwZGF0ZWQnOnRydWV9KTtcbiAgICAgIH0pXG4gIH1cbiAgZ2V0Q3VzdG9tZXJQYWNrYWdlcyhza3lib3gpIHt9XG4gIGdldE1hbmlmZXN0UGFja2FnZXNCeVN0YXR1cyhtaWQsc3RhdHVzKSB7XG4gICAgICByZXR1cm4gbmV3IFByb21pc2UoKHJlc29sdmUscmVqZWN0KT0+e1xuICAgICAgICAgIGNvbnNvbGUubG9nKGBAbWlkOlske21pZH0gJHttaWR9XSBAc3RhdHVzPVske3N0YXR1c30gJHtzdGF0dXN9XWApXG4gICAgICAgIHRoaXMubXlTZWFyY2guc2VhcmNoKFxuICAgICAgICAgICAgYEBtaWQ6WyR7bWlkfSAke21pZH1dIEBzdGF0dXM6WyR7c3RhdHVzfSAke3N0YXR1c31dYCxcbiAgICAgICAgICAgIHsgb2Zmc2V0OiAwLCBudW1iZXJPZlJlc3VsdHM6IDUwMDAgfSxcbiAgICAgICAgICAgIChlcnIsIGRhdGEpID0+IHtcbiAgICAgICAgICAgICAgdmFyIHBhY2thZ2VzID0gW107XG4gICAgICAgICAgICAgIGNvbnNvbGUubG9nKGRhdGEpO1xuICAgICAgICAgICAgICBkYXRhLnJlc3VsdHMuZm9yRWFjaChlbGVtZW50ID0+IHtcblxuICAgICAgICAgICAgICAgIHBhY2thZ2VzLnB1c2goZWxlbWVudC5kb2MpO1xuICAgICAgICAgICAgICAgIHJlc29sdmUocGFja2FnZXMpOyAgICAgICAgICAgICAgICAgXG4gICAgICAgICAgICB9KTtcbiAgICAgICAgfSk7XG4gICAgICB9KTtcbiAgXG4gIH0gICAgIFxufVxuIl19
