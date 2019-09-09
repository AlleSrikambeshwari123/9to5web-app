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
        console.log(awb);
        awbIndex.add(awb.id, awb, function (err1, awbRes) {
          if (err1) {
            console.log('saving err', err1);
            resolve({ saved: false });
          }
          resolve({ saved: true });
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
//# sourceMappingURL=data:application/json;charset=utf8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIlJlZGlzU2VydmljZXMvUGFja2FnZVNlcnZpY2UuZXM2Il0sIm5hbWVzIjpbInJlZGlzIiwicmVxdWlyZSIsImxyZWRpcyIsIm1vbWVudCIsInJlZGlzU2VhcmNoIiwiZnMiLCJQYWNrYWdlVXRpbCIsIlBhY2thZ2VVdGlsaXR5IiwicGFja2FnZVV0aWwiLCJQS0dfSURYIiwiUEtHX0lEX0NPVU5URVIiLCJkYXRhQ29udGV4dCIsIlBLR19QUkVGSVgiLCJBV0JfSUQiLCJJTkRFWF9BV0IiLCJQS0dfU1RBVFVTIiwiYXdiSW5kZXgiLCJjbGllbnRPcHRpb25zIiwic2VhcmNoQ2xpZW50RGV0YWlscyIsInBhY2thZ2VJbmRleCIsImdldFBhY2thZ2VWb2x1bW5lIiwibVBhY2thZ2UiLCJjcmVhdGVEb2N1bWVudCIsInRQYWNrYWdlIiwicGFja2FnZURvY3VtZW50IiwiaWQiLCJ0cmFja2luZ05vIiwic2t5Ym94IiwiZGF0ZVJlY2lldmVkIiwidW5peCIsImF3YiIsIm1pZCIsInZvbHVtZSIsIndlaWdodCIsInBpZWNlcyIsImN1c3RvbWVyIiwic2hpcHBlciIsImRlc2NyaXB0aW9uIiwiZGltZW5zaW9ucyIsImNhcnJpZXIiLCJzdGF0dXMiLCJ2YWx1ZSIsImNvbnNvbGUiLCJsb2ciLCJzZXRQYWNrYWdlSW5UcmFuc2l0Iiwia2V5cyIsIm1zZWFyY2hlciIsIlByb21pc2UiLCJyZXNvbHZlIiwicmVqZWN0IiwiYmF0Y2hlciIsImNsaWVudCIsImJhdGNoIiwiZm9yRWFjaCIsImxvY2F0aW9uIiwiZWxlbWVudCIsImhtc2V0IiwiZXhlYyIsImVyciIsInJlc3VsdCIsImFkZFBhY2thZ2VUb0luZGV4IiwiZ2V0UGFja2FnZSIsInRoZW4iLCJkZWxEb2N1bWVudCIsInBhY2siLCJkb25lIiwiZG9jdW1lbnQiLCJhZGQiLCJQYWNrYWdlU2VydmljZSIsInNldHVwSW5kZXgiLCJteVNlYXJjaCIsInJlZGlzQ2xpZW50IiwiZXhpc3RzIiwic2V0IiwiaW5pdFJlc3VsdCIsImluY3IiLCJuZXdJZCIsImVycjEiLCJhd2JSZXMiLCJzYXZlZCIsInNlYXJjaCIsIm9mZnNldCIsIm51bWJlck9mUmVzdWx0cyIsInNvcnRCeSIsImF3YnMiLCJhd2JMaXN0IiwicmVzdWx0cyIsInB1c2giLCJkb2MiLCJnZXREb2MiLCJib2R5IiwiY1BhY2thZ2UiLCJyZXBsYWNlIiwidHJpbSIsInRyYWNraW5nIiwiTnVtYmVyIiwicmVzcG9uc2UiLCJpbmRleFBhY2thZ2UiLCJkb2NSZXN1bHQiLCJzZWFyY2hlciIsImR1dHlQZXJjZW50IiwiaGFzT3B0IiwicCIsImN1cnJlbnRDb250YWluZXIiLCJtdHlwZSIsImNvbnRhaW5lciIsImJhZyIsInNyZW0iLCJza2lkIiwibWFuaWZlc3RLZXkiLCJjb250YWluZXJObyIsInNldEFkZCIsInNSZXN1bHQiLCJnZXRNZW1iZXJzIiwiZGF0YSIsImFsbCIsIm1hcCIsInJkYXRhIiwicGFja2FnZXMiLCJzUGFja2FnZSIsImNhdGNoIiwiZXJyMyIsImxpc3RpbmciLCJlcnIyIiwiZXJyMjMyIiwicGFnZSIsInBhZ2VTaXplIiwicmVkaVNlYXJjaCIsIm1zZWFyY2giLCJvbGREb2NJZCIsImRvY0lkIiwidXBkYXRlZFBhY2thZ2VzIiwibWFuaWZlc3QiLCJkZWwiLCJkZWNyIiwiZ2V0S2V5cyIsImtleXNDb3VudCIsImtSZXN1bHQiLCJyUmVzdWx0IiwibGVuZ3RoIiwiZGVsZXRlZCIsImJpbiIsInBrZyJdLCJtYXBwaW5ncyI6Ijs7Ozs7Ozs7O0FBQUE7Ozs7OztBQUdBLElBQUlBLFFBQVFDLFFBQVEsT0FBUixDQUFaO0FBQ0EsSUFBSUMsU0FBU0QsUUFBUSxlQUFSLENBQWI7QUFDQSxJQUFJRSxTQUFTRixRQUFRLFFBQVIsQ0FBYjtBQUNBLElBQUlHLGNBQWNILFFBQVEscUJBQVIsQ0FBbEI7QUFDQSxJQUFJSSxLQUFLSixRQUFRLElBQVIsQ0FBVDs7QUFFQSxJQUFJSyxjQUFjTCxRQUFRLHFCQUFSLEVBQStCTSxjQUFqRDtBQUNBLElBQUlDLGNB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QyxRQUVJLEVBQUV5QyxRQUFRLENBQVYsRUFBYUMsaUJBQWlCLElBQTlCLEVBRkosRUFHSSxVQUFDeEIsR0FBRCxFQUFNd0QsSUFBTixFQUFlO0FBQ2IsY0FBSUksV0FBVyxFQUFmO0FBQ0E1RSxrQkFBUUMsR0FBUixDQUFZdUUsSUFBWjtBQUNBQSxlQUFLNUIsT0FBTCxDQUFhakMsT0FBYixDQUFxQixtQkFBVzs7QUFFOUJpRSxxQkFBUy9CLElBQVQsQ0FBY2hDLFFBQVFpQyxHQUF0QjtBQUNBeEMsb0JBQVFzRSxRQUFSO0FBQ0gsV0FKQztBQUtMLFNBWEQ7QUFZRCxPQWRNLENBQVA7QUFnQkgiLCJmaWxlIjoiUmVkaXNTZXJ2aWNlcy9QYWNrYWdlU2VydmljZS5qcyIsInNvdXJjZXNDb250ZW50IjpbImltcG9ydCB7IGNwdXMgfSBmcm9tIFwib3NcIjtcblxuXG52YXIgcmVkaXMgPSByZXF1aXJlKFwicmVkaXNcIik7XG52YXIgbHJlZGlzID0gcmVxdWlyZShcIi4vcmVkaXMtbG9jYWxcIik7XG52YXIgbW9tZW50ID0gcmVxdWlyZShcIm1vbWVudFwiKTtcbnZhciByZWRpc1NlYXJjaCA9IHJlcXVpcmUoXCIuLi9yZWRpc2VhcmNoY2xpZW50XCIpO1xudmFyIGZzID0gcmVxdWlyZShcImZzXCIpO1xuXG52YXIgUGFja2FnZVV0aWwgPSByZXF1aXJlKFwiLi4vVXRpbC9wYWNrYWdldXRpbFwiKS5QYWNrYWdlVXRpbGl0eTtcbnZhciBwYWNrYWdlVXRpbCA9IG5ldyBQYWNrYWdlVXRpbCgpO1xuY29uc3QgUEtHX0lEWCA9IFwiaW5kZXg6cGFja2FnZXNcIjtcbmNvbnN0IFBLR19JRF9DT1VOVEVSID0gXCJwYWNrYWdlOmlkXCI7XG52YXIgZGF0YUNvbnRleHQgPSByZXF1aXJlKCcuL2RhdGFDb250ZXh0JylcbmNvbnN0IFBLR19QUkVGSVggPSBcInBhY2thZ2VzOlwiO1xuY29uc3QgQVdCX0lEID0gXCJhd2I6aWRcIlxuY29uc3QgSU5ERVhfQVdCID0gXCJpbmRleDphd2JcIlxuY29uc3QgUEtHX1NUQVRVUyA9IHsgXG4gIDEgOiBcIlJlY2VpdmVkXCIsXG4gIDI6IFwiSW4gVHJhbnNpdFwiLFxuICAzOiBcIlByb2Nlc3NpbmdcIixcbiAgNDogXCJSZWFkeSBmb3IgUGlja3VwIC8gRGVsaXZlcnlcIixcbiAgNTogXCJPdXQgZm9yIERlbGl2ZXJ5XCIsXG4gIDY6IFwiRGVsaXZlcmVkXCJcblxufTsgXG5cbmNvbnN0IGF3YkluZGV4ID0gcmVkaXNTZWFyY2gocmVkaXMsIElOREVYX0FXQiwge1xuICBjbGllbnRPcHRpb25zOiBscmVkaXMuc2VhcmNoQ2xpZW50RGV0YWlsc1xufSk7XG5jb25zdCBwYWNrYWdlSW5kZXggPSByZWRpc1NlYXJjaChyZWRpcywgUEtHX0lEWCwge1xuICBjbGllbnRPcHRpb25zOiBscmVkaXMuc2VhcmNoQ2xpZW50RGV0YWlsc1xufSk7XG5mdW5jdGlvbiBnZXRQYWNrYWdlVm9sdW1uZShtUGFja2FnZSl7XG5cbiAgcmV0dXJuIDA7IFxufVxuZnVuY3Rpb24gY3JlYXRlRG9jdW1lbnQodFBhY2thZ2UpIHtcbiAgdmFyIHBhY2thZ2VEb2N1bWVudCA9IHtcbiAgICBpZDp0UGFja2FnZS5pZCxcbiAgICB0cmFja2luZ05vOiB0UGFja2FnZS50cmFja2luZ05vLFxuICAgIHNreWJveDogdFBhY2thZ2Uuc2t5Ym94LFxuICAgIGRhdGVSZWNpZXZlZCA6IG1vbWVudCgpLnVuaXgoKSwgXG4gICAgYXdiOjAsIFxuICAgIG1pZDowLFxuICAgIHZvbHVtZTogZ2V0UGFja2FnZVZvbHVtbmUodFBhY2thZ2UpLFxuICAgIHdlaWdodDp0UGFja2FnZS53ZWlnaHQsXG4gICAgcGllY2VzOnRQYWNrYWdlLnBpZWNlcyxcbiAgICBjdXN0b21lcjogdFBhY2thZ2UuY3VzdG9tZXIsXG4gICAgc2hpcHBlcjogdFBhY2thZ2Uuc2hpcHBlcixcbiAgICBkZXNjcmlwdGlvbjogdFBhY2thZ2UuZGVzY3JpcHRpb24sXG4gICAgZGltZW5zaW9uczp0UGFja2FnZS5kaW1lbnNpb25zLFxuICAgIGNhcnJpZXI6dFBhY2thZ2UuY2FycmllcixcbiAgICAvL3NreWJveFY6IHRQYWNrYWdlLnNreWJveCwgYWRkIGRpbWVuaW9uIFxuICAgIHN0YXR1czogdFBhY2thZ2Uuc3RhdHVzLFxuICAgIG1pZDogdFBhY2thZ2UubWlkLFxuICAgIHZhbHVlOiB0UGFja2FnZS52YWx1ZSxcbiAgICBcbiAgfTtcbiAgY29uc29sZS5sb2coXCJhYm91dCB0byBhZGQgdGhlIHBhY2thZ2UgdG8gdGhlIGluZGV4XCIpO1xuICByZXR1cm4gcGFja2FnZURvY3VtZW50O1xufVxuZnVuY3Rpb24gc2V0UGFja2FnZUluVHJhbnNpdChrZXlzLCBtc2VhcmNoZXIpIHtcbiAgcmV0dXJuIG5ldyBQcm9taXNlKChyZXNvbHZlLCByZWplY3QpID0+IHtcbiAgICB2YXIgYmF0Y2hlciA9IG1zZWFyY2hlci5jbGllbnQuYmF0Y2goKTtcbiAgICBrZXlzLmZvckVhY2goZWxlbWVudCA9PiB7XG4gICAgICB2YXIgdmFsdWUgPSB7XG4gICAgICAgIHN0YXR1czogMixcbiAgICAgICAgbG9jYXRpb246IFwiSW4gVHJhbnNpdFwiXG4gICAgICB9O1xuICAgICAgY29uc29sZS5sb2coZWxlbWVudCArIFwiaXMgdGhlIGVsZW1lbnRcIik7XG5cbiAgICAgIGJhdGNoZXIuaG1zZXQoUEtHX1BSRUZJWCArIGVsZW1lbnQsIHZhbHVlKTtcbiAgICB9KTtcbiAgICBiYXRjaGVyLmV4ZWMoKGVyciwgcmVzdWx0KSA9PiB7XG4gICAgICBjb25zb2xlLmxvZyhyZXN1bHQpO1xuICAgICAgLy9yZWFkZCB0aGUgZG9jdW1lbnRzIGhlcmVcbiAgICAgIGtleXMuZm9yRWFjaChlbGVtZW50ID0+IHtcbiAgICAgICAgYWRkUGFja2FnZVRvSW5kZXgoZWxlbWVudCwgbXNlYXJjaGVyKTtcbiAgICAgIH0pO1xuICAgICAgcmVzb2x2ZShyZXN1bHQpO1xuICAgIH0pO1xuICB9KTtcbn1cblxuZnVuY3Rpb24gYWRkUGFja2FnZVRvSW5kZXgodHJhY2tpbmdObywgbXNlYXJjaGVyKSB7XG4gIGxyZWRpcy5nZXRQYWNrYWdlKHRyYWNraW5nTm8pLnRoZW4ocGFjayA9PiB7XG4gICAgbXNlYXJjaGVyLmRlbERvY3VtZW50KFBLR19JRFgsIGAke3BhY2subWlkfS0ke3RyYWNraW5nTm99YCwgKGVyciwgZG9uZSkgPT4ge1xuICAgICAgdmFyIGRvY3VtZW50ID0gY3JlYXRlRG9jdW1lbnQocGFjayk7XG4gICAgICBjb25zb2xlLmxvZyhcInJlYWRkaW5nIHBhY2thZ2UgdG8gdGhlIGluZGV4IGxpa2UgYSBib3NzIFwiICsgdHJhY2tpbmdObyk7XG4gICAgICBtc2VhcmNoZXIuYWRkKHBhY2subWlkICsgXCItXCIgKyBwYWNrLnRyYWNraW5nTm8sIGRvY3VtZW50KTtcbiAgICB9KTtcbiAgfSk7XG59XG5leHBvcnQgY2xhc3MgUGFja2FnZVNlcnZpY2Uge1xuICBjb25zdHJ1Y3RvcigpIHtcbiAgICB0aGlzLnNldHVwSW5kZXgoKTtcbiAgfVxuICBzZXR1cEluZGV4KCkge1xuICAgIHRoaXMubXlTZWFyY2ggPSByZWRpc1NlYXJjaChyZWRpcywgUEtHX0lEWCwge1xuICAgICAgY2xpZW50T3B0aW9uczogbHJlZGlzLnNlYXJjaENsaWVudERldGFpbHNcbiAgICB9KTtcbiAgfVxuICBnZXROZXdBd2IoKXtcbiAgICByZXR1cm4gbmV3IFByb21pc2UoKHJlc29sdmUscmVqZWN0KT0+e1xuICAgICAgZGF0YUNvbnRleHQucmVkaXNDbGllbnQuZXhpc3RzKEFXQl9JRCwoZXJyLHJlc3VsdCk9PntcbiAgICAgICAgY29uc29sZS5sb2cocmVzdWx0KTsgXG4gICAgICAgIGlmIChyZXN1bHQgIT0gXCIxXCIpe1xuICAgICAgICAgIGRhdGFDb250ZXh0LnJlZGlzQ2xpZW50LnNldChBV0JfSUQgPT0gMTAwMDAwLChlcnIsaW5pdFJlc3VsdCk9PntcbiAgICAgICAgICAgIGRhdGFDb250ZXh0LnJlZGlzQ2xpZW50LmluY3IoQVdCX0lELChlcnIsbmV3SWQpPT57XG4gICAgICAgICAgICAgIHJlc29sdmUoe2F3YjpuZXdJZH0pXG4gICAgICAgICAgICB9KVxuICAgICAgICAgIH0pXG4gICAgICAgIH1cbiAgICAgICAgZWxzZSB7XG4gICAgICAgICAgZGF0YUNvbnRleHQucmVkaXNDbGllbnQuaW5jcihBV0JfSUQsKGVycixuZXdJZCk9PntcbiAgICAgICAgICAgIHJlc29sdmUoe2F3YjpuZXdJZH0pXG4gICAgICAgICAgfSlcbiAgICAgICAgfVxuICAgICAgfSlcbiAgICB9KTtcbiAgfVxuICBzYXZlQXdiKGF3Yil7XG4gICAgcmV0dXJuIG5ldyBQcm9taXNlKChyZXNvbHZlLHJlamVjdCk9PntcbiAgICAgIGNvbnNvbGUubG9nKGF3Yik7IFxuICAgICAgICBhd2JJbmRleC5hZGQoYXdiLmlkLGF3YiwoZXJyMSxhd2JSZXMpPT57XG4gICAgICAgICAgaWYgKGVycjEpe1xuICAgICAgICAgICAgY29uc29sZS5sb2coJ3NhdmluZyBlcnInLGVycjEpXG4gICAgICAgICAgICByZXNvbHZlKHtzYXZlZDpmYWxzZX0pXG4gICAgICAgICAgfVxuICAgICAgICAgIHJlc29sdmUoe3NhdmVkOnRydWV9KVxuICAgICAgICB9KVxuICAgICAgXG4gICAgICBcbiAgICB9KVxuICB9XG4gIGxpc3RBd2JpbkZsbCgpe1xuICAgIHJldHVybiBuZXcgUHJvbWlzZSgocmVzb2x2ZSxyZWplY3QpPT57XG4gICAgICAgYXdiSW5kZXguc2VhcmNoKFwiQHN0YXR1czpbMSAxXVwiLHtvZmZzZXQ6MCxudW1iZXJPZlJlc3VsdHM6NTAwMCxzb3J0Qnk6J2lkJ30sKGVycixhd2JzKT0+e1xuICAgICAgICAgdmFyIGF3Ykxpc3QgPSBbXTsgXG4gICAgICAgICBhd2JzLnJlc3VsdHMuZm9yRWFjaChhd2IgPT4ge1xuICAgICAgICAgICBhd2JMaXN0LnB1c2goYXdiLmRvYylcbiAgICAgICAgIH0pO1xuICAgICAgICAgcmVzb2x2ZSh7YXdiczphd2JMaXN0fSlcbiAgICAgICB9KVxuICAgIH0pXG4gIH1cbiAgZ2V0QXdiKGlkKXtcbiAgICByZXR1cm4gbmV3IFByb21pc2UoKHJlc29sdmUscmVqZWN0KT0+e1xuICAgICAgYXdiSW5kZXguZ2V0RG9jKGlkLChlcnIsYXdiKT0+e1xuICAgICAgICByZXNvbHZlKHthd2I6YXdiLmRvY30pXG4gICAgICB9KVxuICAgIH0pXG4gIH1cbiAgc2F2ZVBhY2thZ2UoYm9keSl7XG4gICAgcmV0dXJuIG5ldyBQcm9taXNlKChyZXNvbHZlLHJlamVjdCk9PntcbiAgICAgIHZhciBjUGFja2FnZSA9IHtcbiAgICAgICAgXG4gICAgICAgIHNreWJveDogYm9keS5za3lib3gsXG4gICAgICAgIGN1c3RvbWVyOiBib2R5LmN1c3RvbWVyLnJlcGxhY2UoXCItXCIsIFwiXCIpLnRyaW0oKSxcbiAgICAgICAgdHJhY2tpbmdObzogYm9keS50cmFja2luZyxcbiAgICAgICAgZGVzY3JpcHRpb246IGJvZHkuZGVzY3JpcHRpb24sXG4gICAgICAgIHNoaXBwZXI6IGJvZHkuc2hpcHBlcixcbiAgICAgICAgY2Fycmllcjpib2R5LmNhcnJpZXIsXG4gICAgICAgIHZhbHVlOiBOdW1iZXIoYm9keS52YWx1ZSksXG4gICAgICAgIHBpZWNlczogTnVtYmVyKGJvZHkucGllY2VzKSxcbiAgICAgICAgd2VpZ2h0OiBOdW1iZXIoYm9keS53ZWlnaHQpLFxuICAgICAgICBkaW1lbnNpb25zOiBib2R5LmRpbWVuc2lvbnMsXG4gICAgICAgIHN0YXR1czogMSxcbiAgICAgICAgbG9jYXRpb246IFwiRkxMXCIsXG4gICAgICAgIG1pZDogMCxcbiAgICAgICAgYXdiOjAsXG4gICAgICAgIC8vaGFzT3B0OiB0cnVlLFxuICAgICAgICAvL210eXBlOiBib2R5Lm10eXBlXG4gICAgICB9O1xuICAgICAgLy92YWxpZGF0ZSB0aGUgcGFja2FnZSBcbiAgICAgIGRhdGFDb250ZXh0LnJlZGlzQ2xpZW50LmluY3IoUEtHX0lEX0NPVU5URVIsKGVycixpZCk9PntcbiAgICAgICAgY1BhY2thZ2UuaWQgPSBpZDsgXG4gICAgICAgIGRhdGFDb250ZXh0LnJlZGlzQ2xpZW50LnNldChQS0dfUFJFRklYK2lkLGNQYWNrYWdlLChlcnIscmVzcG9uc2UpPT57XG4gICAgICAgICAgaWYgKGVycil7XG4gICAgICAgICAgICByZWplY3Qoe3NhdmVkOmZhbHNlLGVycjplcnJ9KVxuICAgICAgICAgIH1cbiAgICAgICAgICAgdmFyIGluZGV4UGFja2FnZSA9ICBjcmVhdGVEb2N1bWVudChjUGFja2FnZSk7IFxuICAgICAgICAgICBjb25zb2xlLmxvZyhpbmRleFBhY2thZ2UpOyBcbiAgICAgICAgICAgcGFja2FnZUluZGV4LmFkZChjUGFja2FnZS5pZCxpbmRleFBhY2thZ2UsKGVycjEsZG9jUmVzdWx0KT0+e1xuICAgICAgICAgICAgIGNvbnNvbGUubG9nKGRvY1Jlc3VsdCk7IFxuICAgICAgICAgICAgIGlmKGVycjEpe1xuICAgICAgICAgICAgICAgcmVqZWN0KHtzYXZlZDpmYWxzZSxlcnI6ZXJyMX0pXG4gICAgICAgICAgICAgfVxuICAgICAgICAgICAgIHJlc29sdmUoe3NhdmVkOnRydWV9KVxuICAgICAgICAgICB9KVxuXG4gICAgICAgIH0pXG4gICAgICB9KTtcbiAgICBcblxuXG4gICAgfSlcbiAgfVxuICBzYXZlUGFja2FnZU9sZChib2R5KSB7XG4gICAgXG4gICAgdmFyIHNlYXJjaGVyID0gdGhpcy5teVNlYXJjaDsgXG4gICAgcmV0dXJuIG5ldyBQcm9taXNlKChyZXNvbHZlLCByZWplY3QpID0+IHtcbiAgICAgIHZhciBjUGFja2FnZSA9IHtcbiAgICAgICAgc2t5Ym94OiBib2R5LnNreWJveCxcbiAgICAgICAgY3VzdG9tZXI6IGJvZHkuY3VzdG9tZXIucmVwbGFjZShcIi1cIiwgXCJcIikudHJpbSgpLFxuICAgICAgICB0cmFja2luZ05vOiBib2R5LnRyYWNraW5nLFxuICAgICAgICBkdXR5UGVyY2VudDogMC4yLFxuICAgICAgICBkZXNjcmlwdGlvbjogYm9keS5kZXNjcmlwdGlvbixcbiAgICAgICAgc2hpcHBlcjogYm9keS5zaGlwcGVyLFxuICAgICAgICB2YWx1ZTogTnVtYmVyKGJvZHkudmFsdWUpLFxuICAgICAgICBwaWVjZXM6IE51bWJlcihib2R5LnBpZWNlcyksXG4gICAgICAgIHdlaWdodDogTnVtYmVyKGJvZHkud2VpZ2h0KSxcbiAgICAgICAgc3RhdHVzOiAxLFxuICAgICAgICBsb2NhdGlvbjogXCJGTExcIixcbiAgICAgICAgbWlkOiBib2R5Lm1pZCxcbiAgICAgICAgaGFzT3B0OiB0cnVlLFxuICAgICAgICAvL210eXBlOiBib2R5Lm10eXBlXG4gICAgICB9O1xuICAgICAgY29uc29sZS5sb2coXCJhYm91dCB0byBzYXZlIHRoZSBwYWNrYWdlXCIpO1xuICAgICAgaWYgKHR5cGVvZiBjUGFja2FnZS5zaGlwcGVyID09PSBcInVuZGVmaW5lZFwiKSBjUGFja2FnZS5zaGlwcGVyID0gXCJcIjtcbiAgICAgIGlmICh0eXBlb2YgY1BhY2thZ2UuZGVzY3JpcHRpb24gPT09IFwidW5kZWZpbmVkXCIpXG4gICAgICAgIGNQYWNrYWdlLmRlc2NyaXB0aW9uID0gXCJcIjtcbiAgICAgIGNvbnNvbGUubG9nKGJvZHkpO1xuICAgICAgLy8gaWYgKE51bWJlcihib2R5LmlzQnVzaW5lc3MpID09IDEpIHtcbiAgICAgIC8vICAgY1BhY2thZ2UuaGFzT3B0ID0gZmFsc2U7XG4gICAgICAvLyB9XG4gICAgICAvL2NQYWNrYWdlID0gcGFja2FnZVV0aWwuY2FsY3VsYXRlRmVlcyhjUGFja2FnZSk7XG4gICAgICBjb25zb2xlLmxvZyhcInBhY2thZ2Ugd2l0aCBmZWVzXCIpO1xuXG4gICAgICAvL3dlIGFsc28gd2FudCB0byBjYWxjdWxhdGUgdGhlIHRoZSBwYWNrYWdlIGZlZXMgb25lIHRpbWUuLi4uLi5cbiAgICAgIC8vd2UgaGF2ZSB0aGUgcGFja2FnZSBkZXRhaWxzIGhlcmUgLi4gbm93IHdlIG5lZWQgdG8gZ2V0IHRoZSBleGlzdGluZyBwYWNrYWdlXG5cbiAgICAgXG4gICAgICAvL3dlIG5lZWQgdG8gY2hlY2sgdG8gc2VlIG9mIHRoZSBvd25lciBpcyBhIGJ1c2luZXNzIGhlcmVcbiAgICAgIGNvbnNvbGUubG9nKFwiaGVyZSBhYm91dCB0byBnZXQgdGhlIHBhY2thZ2VcIilcbiAgICAgIGxyZWRpcy5nZXRQYWNrYWdlKGNQYWNrYWdlLnRyYWNraW5nTm8pLnRoZW4ocCA9PiB7XG4gICAgICAgIGNvbnNvbGUubG9nKCdwIGlzIHRoZSAnLHApOyBcbiAgICAgICAgaWYgKHApIHtcbiAgICAgICAgICB2YXIgY3VycmVudENvbnRhaW5lciA9IGBtYW5pZmVzdDoke3AubWlkfToke3AubXR5cGV9OiR7Y29udGFpbmVyfTpgO1xuICAgICAgICAgIGNvbnNvbGUubG9nKFwiZm91bmQgcGFja2FnZSBcIik7XG4gICAgICAgICAgY29uc29sZS5sb2cocCk7XG4gICAgICAgICAgaWYgKGNvbnRhaW5lciA9PSBcImJhZ1wiKSB7XG4gICAgICAgICAgICAvL2NoZWNrIHRvIHNlZSBpZiB0aGUgYmFjayBubyBpcyB0aGUgc2FtZS5cbiAgICAgICAgICAgIGlmIChwLmJhZyAhPSBjUGFja2FnZS5iYWcpIHtcbiAgICAgICAgICAgICAgLy9yZW1vdmUgaXQgZnJvbSB0aGUgb3JpZ2luYWwgbGlzdFxuICAgICAgICAgICAgICBscmVkaXMuc3JlbShjdXJyZW50Q29udGFpbmVyICsgcC5iYWcsIHAudHJhY2tpbmdObyk7XG4gICAgICAgICAgICAgIGNvbnNvbGUubG9nKFxuICAgICAgICAgICAgICAgIFwicmVtb3ZlIHBhY2thZ2UgZnJvbSBjdXJyZW50IHNldCBcIiArIGN1cnJlbnRDb250YWluZXJcbiAgICAgICAgICAgICAgKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgLy9jaGVjayB0byBzZWUgaWYgdGhlIHNraWQgbnVtYmVyIGlzIHRoZSBzYW1lLlxuICAgICAgICAgICAgaWYgKHAuc2tpZCAhPSBjUGFja2FnZS5za2lkKSB7XG4gICAgICAgICAgICAgIC8vcmVtb3ZlIGl0IGZyb20gdGhlIG9yaWdpbmFsIGxpc3RcbiAgICAgICAgICAgICAgbHJlZGlzLnNyZW0oY3VycmVudENvbnRhaW5lciArIHAuc2tpZCwgcC50cmFja2luZ05vKTtcbiAgICAgICAgICAgICAgY29uc29sZS5sb2coXG4gICAgICAgICAgICAgICAgXCJyZW1vdmUgcGFja2FnZSBmcm9tIGN1cnJlbnQgc2V0IFwiICsgY3VycmVudENvbnRhaW5lclxuICAgICAgICAgICAgICApO1xuICAgICAgICAgICAgfVxuICAgICAgICAgIH1cbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAvLyB0aGUgcGFja2FnZSBkb2Vzbid0IGV4aXN0IHVwZGF0ZSB0aGUgY291bnRlclxuICAgICAgICAgIGxyZWRpcy5jbGllbnQuaW5jcihcIm1jb3VudGVyOlwiICsgY1BhY2thZ2UubWlkKTtcbiAgICAgICAgICBcbiAgICAgICAgfVxuXG4gICAgICAgIGxyZWRpc1xuICAgICAgICAgIC5obXNldChcInBhY2thZ2VzOlwiICsgY1BhY2thZ2UudHJhY2tpbmdObywgY1BhY2thZ2UpXG4gICAgICAgICAgLnRoZW4oZnVuY3Rpb24ocmVzdWx0KSB7XG4gICAgICAgICAgICAvL2FkZCB0byBxdWV1ZSBmb3IgcGVyc2lzdGVudCBwcm9jZXNzaW5nXG4gICAgICAgICAgICBcbiAgICAgICAgICAgIHZhciBtYW5pZmVzdEtleSA9IGBtYW5pZmVzdDoke2NQYWNrYWdlLm1pZH06JHtcbiAgICAgICAgICAgICAgY1BhY2thZ2UubXR5cGVcbiAgICAgICAgICAgIH06JHtjb250YWluZXJ9OiR7Y29udGFpbmVyTm99YDtcbiAgICAgICAgICAgIGNvbnNvbGUubG9nKFwiYWJvdXQgdG8gY3JlYXRlIHRoZSBkb2N1bWVudC4uLi5cIik7XG4gICAgICAgICAgICBhZGRQYWNrYWdlVG9JbmRleChjUGFja2FnZS50cmFja2luZ05vLHNlYXJjaGVyKTsgXG4gICAgICAgICAgICBjb25zb2xlLmxvZyhcImFkZGVkIHRoZSBwYWNrYWdlIHRvIGluZGV4XCIpO1xuICAgICAgICAgICAgbHJlZGlzXG4gICAgICAgICAgICAgIC5zZXRBZGQobWFuaWZlc3RLZXksIGNQYWNrYWdlLnRyYWNraW5nTm8pXG4gICAgICAgICAgICAgIC50aGVuKGZ1bmN0aW9uKHNSZXN1bHQpIHtcbiAgICAgICAgICAgICAgICAvL2dldCB0aGUgbWVtYmVycyBvbmUgdGltZSBoZXJlXG4gICAgICAgICAgICAgICAgY29uc29sZS5sb2coXCJhZGRlZCB0aGUgcGFja2FnZSB0byB0aGUgc2V0XCIpO1xuICAgICAgICAgICAgICAgIGNvbnNvbGUubG9nKG1hbmlmZXN0S2V5KTtcbiAgICAgICAgICAgICAgICBscmVkaXNcbiAgICAgICAgICAgICAgICAgIC5nZXRNZW1iZXJzKG1hbmlmZXN0S2V5KVxuICAgICAgICAgICAgICAgICAgLnRoZW4oZGF0YSA9PiB7XG4gICAgICAgICAgICAgICAgICAgIGNvbnNvbGUubG9nKFwiZGF0YVwiKTtcbiAgICAgICAgICAgICAgICAgICAgY29uc29sZS5sb2coZGF0YSk7XG4gICAgICAgICAgICAgICAgICAgIFByb21pc2UuYWxsKGRhdGEubWFwKGxyZWRpcy5nZXRQYWNrYWdlKSk7XG4gICAgICAgICAgICAgICAgICB9KVxuICAgICAgICAgICAgICAgICAgLnRoZW4oZnVuY3Rpb24ocmRhdGEpIHtcbiAgICAgICAgICAgICAgICAgICAgLy93ZSBuZWVkIHRvIGFsZXJ0IHRoZSBwZXJzb24gdGhhdCB0aGUgcGFja2FnZSBpcyBoZXJlIHNvIHJlYWQgZW1haWwgZXRjLlxuICAgICAgICAgICAgICAgICAgICAvL2FkZCB0byB0aGUgaW5kZXhcbiAgICAgICAgICAgICAgICAgICAgY29uc29sZS5sb2coXCJkYXRhXCIpO1xuICAgICAgICAgICAgICAgICAgICBjb25zb2xlLmxvZyhyZGF0YSk7XG5cbiAgICAgICAgICAgICAgICAgICAgcmVzb2x2ZSh7XG4gICAgICAgICAgICAgICAgICAgICAgc2F2ZWQ6IHRydWUsXG4gICAgICAgICAgICAgICAgICAgICAgcGFja2FnZXM6IHJkYXRhLFxuICAgICAgICAgICAgICAgICAgICAgIHNQYWNrYWdlOiBjUGFja2FnZVxuICAgICAgICAgICAgICAgICAgICB9KTtcbiAgICAgICAgICAgICAgICAgIH0pXG4gICAgICAgICAgICAgICAgICAuY2F0Y2goZXJyMyA9PiB7XG4gICAgICAgICAgICAgICAgICAgIGNvbnNvbGUubG9nKGVycjMpO1xuICAgICAgICAgICAgICAgICAgICByZWplY3Qoe1xuICAgICAgICAgICAgICAgICAgICAgIGVycjogZXJyMyxcbiAgICAgICAgICAgICAgICAgICAgICBzYXZlZDogdHJ1ZSxcbiAgICAgICAgICAgICAgICAgICAgICBsaXN0aW5nOiBmYWxzZVxuICAgICAgICAgICAgICAgICAgICB9KTtcbiAgICAgICAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgICB9KVxuICAgICAgICAgICAgICAuY2F0Y2goZnVuY3Rpb24oZXJyKSB7XG4gICAgICAgICAgICAgICAgcmVzb2x2ZSh7XG4gICAgICAgICAgICAgICAgICBzYXZlZDogZmFsc2VcbiAgICAgICAgICAgICAgICB9KTtcbiAgICAgICAgICAgICAgfSk7XG4gICAgICAgICAgfSlcbiAgICAgICAgICAuY2F0Y2goZnVuY3Rpb24oZXJyMikge1xuICAgICAgICAgICAgcmVqZWN0KHtcbiAgICAgICAgICAgICAgc2F2ZWQ6IGZhbHNlXG4gICAgICAgICAgICB9KTtcbiAgICAgICAgICB9KTtcblxuICAgICAgICAvL3NhdmUgdGhlIHBhY2thZ2UgdG8gdGhlIHBhY2thZ2UgTlNcbiAgICAgIH0pLmNhdGNoKGVycjIzMj0+e1xuICAgICAgICBjb25zb2xlLmxvZyhlcnIyMzIpXG4gICAgICB9KTtcbiAgICB9KTtcbiAgfSBcbiAgZ2V0TWFuaWZlc3RQYWNrYWdlcygpe1xuICAgIHJldHVybiBuZXcgUHJvbWlzZSgocmVzb2x2ZSxyZWplY3QpPT57XG4gICAgICBcbiAgICAgIHRoaXMubXlTZWFyY2guc2VhcmNoKFxuICAgICAgICBgQG1pZDpbMCAwXWAsXG4gICAgICAgIHsgb2Zmc2V0OiAwLCBudW1iZXJPZlJlc3VsdHM6IDUwMDAgfSxcbiAgICAgICAgKGVyciwgZGF0YSkgPT4ge1xuICAgICAgICAgIHZhciBwYWNrYWdlcyA9IFtdO1xuICAgICAgICAgIGNvbnNvbGUubG9nKGRhdGEpO1xuICAgICAgICAgIGRhdGEucmVzdWx0cy5mb3JFYWNoKGVsZW1lbnQgPT4ge1xuXG4gICAgICAgICAgICBwYWNrYWdlcy5wdXNoKGVsZW1lbnQuZG9jKTtcbiAgICAgICAgICAgIHJlc29sdmUocGFja2FnZXMpOyAgICAgICAgICAgICAgICAgXG4gICAgICAgIH0pO1xuICAgIH0pO1xuICAgIH0pXG4gIH1cbiAgZ2V0UmVjZWl2ZWRQYWNrYWdlcyhwYWdlLHBhZ2VTaXplKXtcbiAgICByZXR1cm4gbmV3IFByb21pc2UoKHJlc29sdmUscmVqZWN0KT0+e1xuICAgICAgXG4gICAgICB0aGlzLm15U2VhcmNoLnNlYXJjaChcbiAgICAgICAgYEBtaWQ6WzAgMF1gLFxuICAgICAgICB7IG9mZnNldDogMCwgbnVtYmVyT2ZSZXN1bHRzOiA1MDAwIH0sXG4gICAgICAgIChlcnIsIGRhdGEpID0+IHtcbiAgICAgICAgICB2YXIgcGFja2FnZXMgPSBbXTtcbiAgICAgICAgICBjb25zb2xlLmxvZyhkYXRhKTtcbiAgICAgICAgICBkYXRhLnJlc3VsdHMuZm9yRWFjaChlbGVtZW50ID0+IHtcblxuICAgICAgICAgICAgcGFja2FnZXMucHVzaChlbGVtZW50LmRvYyk7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgXG4gICAgICAgIH0pO1xuICAgICAgICByZXNvbHZlKHBhY2thZ2VzKTsgXG4gICAgfSk7XG4gICAgfSlcbiAgfVxuICBnZXROb0RvY3NQYWNrYWNrYWdlcyhwYWdlLHBhZ2VTaXplKXtcbiAgICByZXR1cm4gbmV3IFByb21pc2UoKHJlc29sdmUscmVqZWN0KT0+e1xuICAgICAgXG4gICAgICB0aGlzLm15U2VhcmNoLnNlYXJjaChcbiAgICAgICAgYEBoYXNEb2NzOlswIDBdYCxcbiAgICAgICAgeyBvZmZzZXQ6IDAsIG51bWJlck9mUmVzdWx0czogNTAwMCB9LFxuICAgICAgICAoZXJyLCBkYXRhKSA9PiB7XG4gICAgICAgICAgdmFyIHBhY2thZ2VzID0gW107XG4gICAgICAgICAgY29uc29sZS5sb2coZGF0YSk7XG4gICAgICAgICAgZGF0YS5yZXN1bHRzLmZvckVhY2goZWxlbWVudCA9PiB7XG5cbiAgICAgICAgICAgIHBhY2thZ2VzLnB1c2goZWxlbWVudC5kb2MpO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIFxuICAgICAgICB9KTtcbiAgICAgICAgcmVzb2x2ZShwYWNrYWdlcyk7IFxuICAgIH0pO1xuICAgIH0pXG4gIH1cbiAgZ2V0UGFja2FnZUJ5SWQoaWQpe1xuICAgIHJldHVybiBuZXcgUHJvbWlzZSgocmVzb2x2ZSxyZWplY3QpPT57XG4gICAgICByZWRpU2VhcmNoLmdldERvYyhpZCwoZXJyLGRvY3VtZW50KT0+e1xuICAgICAgICByZXNvbHZlKGRvY3VtZW50LmRvYyk7IFxuICAgICAgfSlcbiAgICB9KTsgXG4gIH1cbiAgdXBkYXRlTWFuaWZlc3RQYWNrYWdlVG9JblRyYW5zaXQobWlkKSB7XG4gICAgLy9nZXQgYWxsIHRoZSBwYWNrYWdlc1xuICAgIC8vd2UgbmVlZCB0byB1cGRhdGUgdGhlIGluZGV4IGF0IHRoaXMgcG9pbnQgYXMgd2VsbFxuICAgIHZhciBtc2VhcmNoID0gdGhpcy5teVNlYXJjaDtcbiAgICB0aGlzLm15U2VhcmNoLnNlYXJjaChcbiAgICAgIGBAbWlkOlske21pZH0gJHttaWR9XWAsXG4gICAgICB7IG9mZnNldDogMCwgbnVtYmVyT2ZSZXN1bHRzOiA1MDAwIH0sXG4gICAgICAoZXJyLCBkYXRhKSA9PiB7XG4gICAgICAgIHZhciBwYWNrYWdlcyA9IFtdO1xuICAgICAgICBjb25zb2xlLmxvZyhkYXRhKTtcbiAgICAgICAgZGF0YS5yZXN1bHRzLmZvckVhY2goZWxlbWVudCA9PiB7XG4gICAgICAgICAgdmFyIG9sZERvY0lkID0gZWxlbWVudC5kb2NJZDtcbiAgICAgICAgICBlbGVtZW50LmRvY0lkID0gZWxlbWVudC5kb2NJZC5yZXBsYWNlKGAke21pZH0tYCwgXCJcIik7XG4gICAgICAgICAgcGFja2FnZXMucHVzaChlbGVtZW50LmRvY0lkKTtcbiAgICAgICAgICAvLyBpIGNvdWxkIGRlbGV0ZSBoZXJlXG4gICAgICAgICAgLy8gbXNlYXJjaC5kZWxEb2N1bWVudChQS0dfSURYLG9sZERvY0lkKVxuICAgICAgICAgIC8vdXBkYXRlIGFsbCB0aGUgcGFja2FnZXNcbiAgICAgICAgfSk7XG4gICAgICAgIHNldFBhY2thZ2VJblRyYW5zaXQocGFja2FnZXMsIG1zZWFyY2gsIG1pZCkudGhlbihmdW5jdGlvbihcbiAgICAgICAgICB1cGRhdGVkUGFja2FnZXNcbiAgICAgICAgKSB7XG4gICAgICAgICAgY29uc29sZS5sb2coXCJ1cGRhdGVkIHBhY2thZ2VzXCIpO1xuICAgICAgICAgIGNvbnNvbGUubG9nKHVwZGF0ZWRQYWNrYWdlcyk7XG4gICAgICAgIH0pO1xuICAgICAgfVxuICAgICk7XG4gIH1cbiAgcmVtb3ZlUGFja2FnZSh0cmFja2luZ05vLCBtaWQpIHtcbiAgICB2YXIgbXNlYXJjaCA9IHRoaXMubXlTZWFyY2g7XG4gICAgcmV0dXJuIG5ldyBQcm9taXNlKChyZXNvbHZlLCByZWplY3QpID0+IHtcbiAgICAgIHZhciBtYW5pZmVzdCA9IG1pZDtcbiAgICAgIHZhciBtYW5pZmVzdEtleSA9IFwibWFuaWZlc3Q6XCIgKyBtYW5pZmVzdCArIFwiOipcIjtcblxuICAgICAgbHJlZGlzLmRlbChcInBhY2thZ2VzOlwiICsgdHJhY2tpbmdObykudGhlbihmdW5jdGlvbihyZXN1bHQpIHtcbiAgICAgICAgY29uc29sZS5sb2cocmVzdWx0KTtcbiAgICAgICAgbXNlYXJjaC5kZWxEb2N1bWVudChQS0dfSURYLCBgJHttaWR9LSR7dHJhY2tpbmdOb31gKTtcbiAgICAgICAgLy93ZSBuZWVkIHRvIHJlbW92ZSBmcm9tIHRoZSBpbmRleCBhbmQgZGVjIHRoZSBjb3VudGVyXG4gICAgICAgIGxyZWRpcy5jbGllbnQuZGVjcihcIm1jb3VudGVyOlwiICsgbWlkKTtcbiAgICAgICAgLy9yU2VydmljZXMucGFja2FnZVNlcnZpY2Uucm1QYWNrYWdlKG1pZCwgdHJhY2tpbmdObyk7XG4gICAgICAgIGxyZWRpcy5nZXRLZXlzKG1hbmlmZXN0S2V5KS50aGVuKGtSZXN1bHQgPT4ge1xuICAgICAgICAgIC8vdGhlIGxpc3Qgb2YgYWxsIHRoZSBzZXRzIC4uLndlIG5lZWQgdG8gcmVtb3ZlIHRoZSBrZXkgZnJvbSBlYWNoIG9uZVxuICAgICAgICAgIHZhciBrZXlzQ291bnQgPSAwO1xuXG4gICAgICAgICAga1Jlc3VsdC5mb3JFYWNoKGVsZW1lbnQgPT4ge1xuICAgICAgICAgICAgY29uc29sZS5sb2coXG4gICAgICAgICAgICAgIGByZW1vdmluZyAke3RyYWNraW5nTm99IHBhY2thZ2UgbWFuaWZlc3Qgc2V0ICR7ZWxlbWVudH0gYFxuICAgICAgICAgICAgKTtcbiAgICAgICAgICAgIGxyZWRpcy5zcmVtKGVsZW1lbnQsIHRyYWNraW5nTm8pLnRoZW4oZnVuY3Rpb24oclJlc3VsdCkge1xuICAgICAgICAgICAgICBjb25zb2xlLmxvZyhyUmVzdWx0KTtcbiAgICAgICAgICAgICAgY29uc29sZS5sb2coXCJyZW1vdmVkXCIpO1xuICAgICAgICAgICAgICBpZiAoa2V5c0NvdW50ID09IGtSZXN1bHQubGVuZ3RoIC0gMSkga2V5c0NvdW50Kys7XG4gICAgICAgICAgICB9KTtcbiAgICAgICAgICB9KTtcbiAgICAgICAgICByZXNvbHZlKHtcbiAgICAgICAgICAgIGRlbGV0ZWQ6IHRydWVcbiAgICAgICAgICB9KTtcbiAgICAgICAgfSk7XG5cbiAgICAgICAgLy93ZSBhbHNvIG5lZWQgdG8gcmVtb3ZlIGZyb20gYW55IHNldHNcbiAgICAgIH0pO1xuICAgIH0pO1xuICB9XG4gIHJlbW92ZVBhY2thZ2VCeUlkKGlkKSB7XG4gICAgdmFyIG1zZWFyY2ggPSB0aGlzLm15U2VhcmNoO1xuICAgIHJldHVybiBuZXcgUHJvbWlzZSgocmVzb2x2ZSwgcmVqZWN0KSA9PiB7XG4gICAgXG4gICAgICByZWRpU2VhcmNoLmRlbERvY3VtZW50KFBLR19JRFgsaWQsKGVycixyZXNwb25zZSk9PntcbiAgICAgICAgcmVzb2x2ZSh7ZGVsZXRlZDp0cnVlfSlcbiAgICAgIH0pXG4gICAgICBcbiAgICAgICAgXG4gICAgICBcbiAgICB9KTtcbiAgfVxuICBzdG9yZVBhY2thZ2VGb3JQaWNrdXAodHJhY2tpbmdObyxiaW4pe1xuICAgIHZhciBzZWFyY2hlciA9IHRoaXMubXlTZWFyY2g7XG4gICAgcmV0dXJuIG5ldyBQcm9taXNlKChyZXNvbHZlLHJlamVjdCk9PntcbiAgICAgICBscmVkaXMuaG1zZXQoUEtHX1BSRUZJWCt0cmFja2luZ05vLHtzdGF0dXM6NCxsb2NhdGlvbjpiaW59KS50aGVuKChyZXN1bHQpPT57XG4gICAgICAgICBscmVkaXMuZ2V0UGFja2FnZSh0cmFja2luZ05vKS50aGVuKChwa2cpPT57XG4gICAgICAgICAgYWRkUGFja2FnZVRvSW5kZXgodHJhY2tpbmdObyxzZWFyY2hlcikgOyBcbiAgICAgICAgICByZXNvbHZlKHBrZyk7ICAgXG4gICAgICAgICB9KTtcbiAgICAgICB9KSBcbiAgICB9KTsgXG4gIH1cbiAgdXBkYXRlUGFja2FnZUluZGV4KHRyYWNraW5nKXtcbiAgICAgIHJldHVybiBuZXcgUHJvbWlzZSgocmVzb2x2ZSxyZWplY3QpPT57XG4gICAgICAgICAgdmFyIG1zZWFyY2ggPSB0aGlzLm15U2VhcmNoOyBcbiAgICAgICAgICBhZGRQYWNrYWdlVG9JbmRleCh0cmFja2luZyxtc2VhcmNoKTsgXG4gICAgICAgICByZXNvbHZlKHsndXBkYXRlZCc6dHJ1ZX0pO1xuICAgICAgfSlcbiAgfVxuICBnZXRDdXN0b21lclBhY2thZ2VzKHNreWJveCkge31cbiAgZ2V0TWFuaWZlc3RQYWNrYWdlc0J5U3RhdHVzKG1pZCxzdGF0dXMpIHtcbiAgICAgIHJldHVybiBuZXcgUHJvbWlzZSgocmVzb2x2ZSxyZWplY3QpPT57XG4gICAgICAgICAgY29uc29sZS5sb2coYEBtaWQ6WyR7bWlkfSAke21pZH1dIEBzdGF0dXM9WyR7c3RhdHVzfSAke3N0YXR1c31dYClcbiAgICAgICAgdGhpcy5teVNlYXJjaC5zZWFyY2goXG4gICAgICAgICAgICBgQG1pZDpbJHttaWR9ICR7bWlkfV0gQHN0YXR1czpbJHtzdGF0dXN9ICR7c3RhdHVzfV1gLFxuICAgICAgICAgICAgeyBvZmZzZXQ6IDAsIG51bWJlck9mUmVzdWx0czogNTAwMCB9LFxuICAgICAgICAgICAgKGVyciwgZGF0YSkgPT4ge1xuICAgICAgICAgICAgICB2YXIgcGFja2FnZXMgPSBbXTtcbiAgICAgICAgICAgICAgY29uc29sZS5sb2coZGF0YSk7XG4gICAgICAgICAgICAgIGRhdGEucmVzdWx0cy5mb3JFYWNoKGVsZW1lbnQgPT4ge1xuXG4gICAgICAgICAgICAgICAgcGFja2FnZXMucHVzaChlbGVtZW50LmRvYyk7XG4gICAgICAgICAgICAgICAgcmVzb2x2ZShwYWNrYWdlcyk7ICAgICAgICAgICAgICAgICBcbiAgICAgICAgICAgIH0pO1xuICAgICAgICB9KTtcbiAgICAgIH0pO1xuICBcbiAgfSAgICAgXG59XG4iXX0=
