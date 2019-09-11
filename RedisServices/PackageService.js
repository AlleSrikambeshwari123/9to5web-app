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
//# sourceMappingURL=data:application/json;charset=utf8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIlJlZGlzU2VydmljZXMvUGFja2FnZVNlcnZpY2UuZXM2Il0sIm5hbWVzIjpbInJlZGlzIiwicmVxdWlyZSIsImxyZWRpcyIsIm1vbWVudCIsInJlZGlzU2VhcmNoIiwiZnMiLCJQYWNrYWdlVXRpbCIsIlBhY2thZ2VVdGlsaXR5IiwicGFja2FnZVV0aWwiLCJQS0dfSURYIiwiUEtHX0lEX0NPVU5URVIiLCJkYXRhQ29udGV4dCIsIlBLR19QUkVGSVgiLCJBV0JfSUQiLCJJTkRFWF9BV0IiLCJQS0dfU1RBVFVTIiwiYXdiSW5kZXgiLCJjbGllbnRPcHRpb25zIiwic2VhcmNoQ2xpZW50RGV0YWlscyIsInBhY2thZ2VJbmRleCIsImdldFBhY2thZ2VWb2x1bW5lIiwibVBhY2thZ2UiLCJjcmVhdGVEb2N1bWVudCIsInRQYWNrYWdlIiwicGFja2FnZURvY3VtZW50IiwiaWQiLCJ0cmFja2luZ05vIiwic2t5Ym94IiwiZGF0ZVJlY2lldmVkIiwidW5peCIsImF3YiIsIm1pZCIsInZvbHVtZSIsIndlaWdodCIsInBpZWNlcyIsImN1c3RvbWVyIiwic2hpcHBlciIsImRlc2NyaXB0aW9uIiwiZGltZW5zaW9ucyIsImNhcnJpZXIiLCJzdGF0dXMiLCJ2YWx1ZSIsImNvbnNvbGUiLCJsb2ciLCJzZXRQYWNrYWdlSW5UcmFuc2l0Iiwia2V5cyIsIm1zZWFyY2hlciIsIlByb21pc2UiLCJyZXNvbHZlIiwicmVqZWN0IiwiYmF0Y2hlciIsImNsaWVudCIsImJhdGNoIiwiZm9yRWFjaCIsImxvY2F0aW9uIiwiZWxlbWVudCIsImhtc2V0IiwiZXhlYyIsImVyciIsInJlc3VsdCIsImFkZFBhY2thZ2VUb0luZGV4IiwiZ2V0UGFja2FnZSIsInRoZW4iLCJkZWxEb2N1bWVudCIsInBhY2siLCJkb25lIiwiZG9jdW1lbnQiLCJhZGQiLCJQYWNrYWdlU2VydmljZSIsInNldHVwSW5kZXgiLCJteVNlYXJjaCIsInJlZGlzQ2xpZW50IiwiZXhpc3RzIiwic2V0IiwiaW5pdFJlc3VsdCIsImluY3IiLCJuZXdJZCIsInJlcGx5IiwiZXJyMSIsImF3YlJlcyIsInNhdmVkIiwic2VhcmNoIiwib2Zmc2V0IiwibnVtYmVyT2ZSZXN1bHRzIiwic29ydEJ5IiwiYXdicyIsImF3Ykxpc3QiLCJyZXN1bHRzIiwicHVzaCIsImRvYyIsImdldERvYyIsInRyYWNraW5nTnVtYmVyIiwibG9jYXRpb25faWQiLCJwYWNrYWdlUmVzdWx0IiwibmV3UGFja2FnZSIsImJvZHkiLCJjUGFja2FnZSIsInJlcGxhY2UiLCJ0cmltIiwidHJhY2tpbmciLCJOdW1iZXIiLCJyZXNwb25zZSIsImluZGV4UGFja2FnZSIsImRvY1Jlc3VsdCIsInNlYXJjaGVyIiwiZHV0eVBlcmNlbnQiLCJoYXNPcHQiLCJwIiwiY3VycmVudENvbnRhaW5lciIsIm10eXBlIiwiY29udGFpbmVyIiwiYmFnIiwic3JlbSIsInNraWQiLCJtYW5pZmVzdEtleSIsImNvbnRhaW5lck5vIiwic2V0QWRkIiwic1Jlc3VsdCIsImdldE1lbWJlcnMiLCJkYXRhIiwiYWxsIiwibWFwIiwicmRhdGEiLCJwYWNrYWdlcyIsInNQYWNrYWdlIiwiY2F0Y2giLCJlcnIzIiwibGlzdGluZyIsImVycjIiLCJlcnIyMzIiLCJwYWdlIiwicGFnZVNpemUiLCJyZWRpU2VhcmNoIiwibXNlYXJjaCIsIm9sZERvY0lkIiwiZG9jSWQiLCJ1cGRhdGVkUGFja2FnZXMiLCJtYW5pZmVzdCIsImRlbCIsImRlY3IiLCJnZXRLZXlzIiwia2V5c0NvdW50Iiwia1Jlc3VsdCIsInJSZXN1bHQiLCJsZW5ndGgiLCJkZWxldGVkIiwiYmluIiwicGtnIl0sIm1hcHBpbmdzIjoiOzs7Ozs7Ozs7QUFBQTs7Ozs7O0FBR0EsSUFBSUEsUUFBUUMsUUFBUSxPQUFSLENBQVo7QUFDQSxJQUFJQyxTQUFTRCxRQUFRLGVBQVIsQ0FBYjtBQUNBLElBQUlFLFNBQVNGLFFBQVEsUUFBUixDQUFiO0FBQ0EsSUFBSUcsY0FBY0gsUUFBUSxxQkFBUixDQUFsQjtBQUNBLElBQUlJLEtBQUtKLFFB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QUFDQWpGLGtCQUFRQyxHQUFSLENBQVk0RSxJQUFaO0FBQ0FBLGVBQUtoQyxPQUFMLENBQWFsQyxPQUFiLENBQXFCLG1CQUFXOztBQUU5QnNFLHFCQUFTbkMsSUFBVCxDQUFjakMsUUFBUWtDLEdBQXRCO0FBQ0F6QyxvQkFBUTJFLFFBQVI7QUFDSCxXQUpDO0FBS0wsU0FYRDtBQVlELE9BZE0sQ0FBUDtBQWdCSCIsImZpbGUiOiJSZWRpc1NlcnZpY2VzL1BhY2thZ2VTZXJ2aWNlLmpzIiwic291cmNlc0NvbnRlbnQiOlsiaW1wb3J0IHsgY3B1cyB9IGZyb20gXCJvc1wiO1xuXG5cbnZhciByZWRpcyA9IHJlcXVpcmUoXCJyZWRpc1wiKTtcbnZhciBscmVkaXMgPSByZXF1aXJlKFwiLi9yZWRpcy1sb2NhbFwiKTtcbnZhciBtb21lbnQgPSByZXF1aXJlKFwibW9tZW50XCIpO1xudmFyIHJlZGlzU2VhcmNoID0gcmVxdWlyZShcIi4uL3JlZGlzZWFyY2hjbGllbnRcIik7XG52YXIgZnMgPSByZXF1aXJlKFwiZnNcIik7XG5cbnZhciBQYWNrYWdlVXRpbCA9IHJlcXVpcmUoXCIuLi9VdGlsL3BhY2thZ2V1dGlsXCIpLlBhY2thZ2VVdGlsaXR5O1xudmFyIHBhY2thZ2VVdGlsID0gbmV3IFBhY2thZ2VVdGlsKCk7XG5jb25zdCBQS0dfSURYID0gXCJpbmRleDpwYWNrYWdlc1wiO1xuY29uc3QgUEtHX0lEX0NPVU5URVIgPSBcInBhY2thZ2U6aWRcIjtcbnZhciBkYXRhQ29udGV4dCA9IHJlcXVpcmUoJy4vZGF0YUNvbnRleHQnKVxuY29uc3QgUEtHX1BSRUZJWCA9IFwicGFja2FnZXM6XCI7XG5jb25zdCBBV0JfSUQgPSBcImF3YjppZFwiXG5jb25zdCBJTkRFWF9BV0IgPSBcImluZGV4OmF3YlwiXG5jb25zdCBQS0dfU1RBVFVTID0geyBcbiAgMSA6IFwiUmVjZWl2ZWRcIixcbiAgMjogXCJJbiBUcmFuc2l0XCIsXG4gIDM6IFwiUHJvY2Vzc2luZ1wiLFxuICA0OiBcIlJlYWR5IGZvciBQaWNrdXAgLyBEZWxpdmVyeVwiLFxuICA1OiBcIk91dCBmb3IgRGVsaXZlcnlcIixcbiAgNjogXCJEZWxpdmVyZWRcIlxuXG59OyBcblxuY29uc3QgYXdiSW5kZXggPSByZWRpc1NlYXJjaChyZWRpcywgSU5ERVhfQVdCLCB7XG4gIGNsaWVudE9wdGlvbnM6IGxyZWRpcy5zZWFyY2hDbGllbnREZXRhaWxzXG59KTtcbmNvbnN0IHBhY2thZ2VJbmRleCA9IHJlZGlzU2VhcmNoKHJlZGlzLCBQS0dfSURYLCB7XG4gIGNsaWVudE9wdGlvbnM6IGxyZWRpcy5zZWFyY2hDbGllbnREZXRhaWxzXG59KTtcbmZ1bmN0aW9uIGdldFBhY2thZ2VWb2x1bW5lKG1QYWNrYWdlKXtcblxuICByZXR1cm4gMDsgXG59XG5mdW5jdGlvbiBjcmVhdGVEb2N1bWVudCh0UGFja2FnZSkge1xuICB2YXIgcGFja2FnZURvY3VtZW50ID0ge1xuICAgIGlkOnRQYWNrYWdlLmlkLFxuICAgIHRyYWNraW5nTm86IHRQYWNrYWdlLnRyYWNraW5nTm8sXG4gICAgc2t5Ym94OiB0UGFja2FnZS5za3lib3gsXG4gICAgZGF0ZVJlY2lldmVkIDogbW9tZW50KCkudW5peCgpLCBcbiAgICBhd2I6MCwgXG4gICAgbWlkOjAsXG4gICAgdm9sdW1lOiBnZXRQYWNrYWdlVm9sdW1uZSh0UGFja2FnZSksXG4gICAgd2VpZ2h0OnRQYWNrYWdlLndlaWdodCxcbiAgICBwaWVjZXM6dFBhY2thZ2UucGllY2VzLFxuICAgIGN1c3RvbWVyOiB0UGFja2FnZS5jdXN0b21lcixcbiAgICBzaGlwcGVyOiB0UGFja2FnZS5zaGlwcGVyLFxuICAgIGRlc2NyaXB0aW9uOiB0UGFja2FnZS5kZXNjcmlwdGlvbixcbiAgICBkaW1lbnNpb25zOnRQYWNrYWdlLmRpbWVuc2lvbnMsXG4gICAgY2Fycmllcjp0UGFja2FnZS5jYXJyaWVyLFxuICAgIC8vc2t5Ym94VjogdFBhY2thZ2Uuc2t5Ym94LCBhZGQgZGltZW5pb24gXG4gICAgc3RhdHVzOiB0UGFja2FnZS5zdGF0dXMsXG4gICAgbWlkOiB0UGFja2FnZS5taWQsXG4gICAgdmFsdWU6IHRQYWNrYWdlLnZhbHVlLFxuICAgIFxuICB9O1xuICBjb25zb2xlLmxvZyhcImFib3V0IHRvIGFkZCB0aGUgcGFja2FnZSB0byB0aGUgaW5kZXhcIik7XG4gIHJldHVybiBwYWNrYWdlRG9jdW1lbnQ7XG59XG5mdW5jdGlvbiBzZXRQYWNrYWdlSW5UcmFuc2l0KGtleXMsIG1zZWFyY2hlcikge1xuICByZXR1cm4gbmV3IFByb21pc2UoKHJlc29sdmUsIHJlamVjdCkgPT4ge1xuICAgIHZhciBiYXRjaGVyID0gbXNlYXJjaGVyLmNsaWVudC5iYXRjaCgpO1xuICAgIGtleXMuZm9yRWFjaChlbGVtZW50ID0+IHtcbiAgICAgIHZhciB2YWx1ZSA9IHtcbiAgICAgICAgc3RhdHVzOiAyLFxuICAgICAgICBsb2NhdGlvbjogXCJJbiBUcmFuc2l0XCJcbiAgICAgIH07XG4gICAgICBjb25zb2xlLmxvZyhlbGVtZW50ICsgXCJpcyB0aGUgZWxlbWVudFwiKTtcblxuICAgICAgYmF0Y2hlci5obXNldChQS0dfUFJFRklYICsgZWxlbWVudCwgdmFsdWUpO1xuICAgIH0pO1xuICAgIGJhdGNoZXIuZXhlYygoZXJyLCByZXN1bHQpID0+IHtcbiAgICAgIGNvbnNvbGUubG9nKHJlc3VsdCk7XG4gICAgICAvL3JlYWRkIHRoZSBkb2N1bWVudHMgaGVyZVxuICAgICAga2V5cy5mb3JFYWNoKGVsZW1lbnQgPT4ge1xuICAgICAgICBhZGRQYWNrYWdlVG9JbmRleChlbGVtZW50LCBtc2VhcmNoZXIpO1xuICAgICAgfSk7XG4gICAgICByZXNvbHZlKHJlc3VsdCk7XG4gICAgfSk7XG4gIH0pO1xufVxuXG5mdW5jdGlvbiBhZGRQYWNrYWdlVG9JbmRleCh0cmFja2luZ05vLCBtc2VhcmNoZXIpIHtcbiAgbHJlZGlzLmdldFBhY2thZ2UodHJhY2tpbmdObykudGhlbihwYWNrID0+IHtcbiAgICBtc2VhcmNoZXIuZGVsRG9jdW1lbnQoUEtHX0lEWCwgYCR7cGFjay5taWR9LSR7dHJhY2tpbmdOb31gLCAoZXJyLCBkb25lKSA9PiB7XG4gICAgICB2YXIgZG9jdW1lbnQgPSBjcmVhdGVEb2N1bWVudChwYWNrKTtcbiAgICAgIGNvbnNvbGUubG9nKFwicmVhZGRpbmcgcGFja2FnZSB0byB0aGUgaW5kZXggbGlrZSBhIGJvc3MgXCIgKyB0cmFja2luZ05vKTtcbiAgICAgIG1zZWFyY2hlci5hZGQocGFjay5taWQgKyBcIi1cIiArIHBhY2sudHJhY2tpbmdObywgZG9jdW1lbnQpO1xuICAgIH0pO1xuICB9KTtcbn1cbmV4cG9ydCBjbGFzcyBQYWNrYWdlU2VydmljZSB7XG4gIGNvbnN0cnVjdG9yKCkge1xuICAgIHRoaXMuc2V0dXBJbmRleCgpO1xuICB9XG4gIHNldHVwSW5kZXgoKSB7XG4gICAgdGhpcy5teVNlYXJjaCA9IHJlZGlzU2VhcmNoKHJlZGlzLCBQS0dfSURYLCB7XG4gICAgICBjbGllbnRPcHRpb25zOiBscmVkaXMuc2VhcmNoQ2xpZW50RGV0YWlsc1xuICAgIH0pO1xuICB9XG4gIGdldE5ld0F3Yigpe1xuICAgIHJldHVybiBuZXcgUHJvbWlzZSgocmVzb2x2ZSxyZWplY3QpPT57XG4gICAgICBkYXRhQ29udGV4dC5yZWRpc0NsaWVudC5leGlzdHMoQVdCX0lELChlcnIscmVzdWx0KT0+e1xuICAgICAgICBjb25zb2xlLmxvZyhyZXN1bHQpOyBcbiAgICAgICAgaWYgKHJlc3VsdCAhPSBcIjFcIil7XG4gICAgICAgICAgZGF0YUNvbnRleHQucmVkaXNDbGllbnQuc2V0KEFXQl9JRCA9PSAxMDAwMDAsKGVycixpbml0UmVzdWx0KT0+e1xuICAgICAgICAgICAgZGF0YUNvbnRleHQucmVkaXNDbGllbnQuaW5jcihBV0JfSUQsKGVycixuZXdJZCk9PntcbiAgICAgICAgICAgICAgcmVzb2x2ZSh7YXdiOm5ld0lkfSlcbiAgICAgICAgICAgIH0pXG4gICAgICAgICAgfSlcbiAgICAgICAgfVxuICAgICAgICBlbHNlIHtcbiAgICAgICAgICBkYXRhQ29udGV4dC5yZWRpc0NsaWVudC5pbmNyKEFXQl9JRCwoZXJyLG5ld0lkKT0+e1xuICAgICAgICAgICAgcmVzb2x2ZSh7YXdiOm5ld0lkfSlcbiAgICAgICAgICB9KVxuICAgICAgICB9XG4gICAgICB9KVxuICAgIH0pO1xuICB9XG4gIHNhdmVBd2IoYXdiKXtcbiAgICByZXR1cm4gbmV3IFByb21pc2UoKHJlc29sdmUscmVqZWN0KT0+e1xuICAgICAgY29uc29sZS5sb2coYXdiKTsgXG4gICAgICBkYXRhQ29udGV4dC5yZWRpc0NsaWVudC5pbmNyKEFXQl9JRCwoZXJyLHJlcGx5KT0+e1xuICAgICAgICBhd2IuaWQgPSByZXBseTsgXG4gICAgICAgICAgYXdiSW5kZXguYWRkKGF3Yi5pZCxhd2IsKGVycjEsYXdiUmVzKT0+e1xuICAgICAgICAgICAgaWYgKGVycjEpe1xuICAgICAgICAgICAgICBjb25zb2xlLmxvZygnc2F2aW5nIGVycicsZXJyMSlcbiAgICAgICAgICAgICAgcmVzb2x2ZSh7c2F2ZWQ6ZmFsc2V9KVxuICAgICAgICAgICAgfVxuICAgICAgICAgICAgcmVzb2x2ZSh7c2F2ZWQ6dHJ1ZSwgaWQ6cmVwbHl9KVxuICAgICAgICAgIH0pXG4gICAgICB9KVxuICAgICAgIFxuICAgICAgXG4gICAgICBcbiAgICB9KVxuICB9XG4gIGxpc3RBd2JpbkZsbCgpe1xuICAgIHJldHVybiBuZXcgUHJvbWlzZSgocmVzb2x2ZSxyZWplY3QpPT57XG4gICAgICAgYXdiSW5kZXguc2VhcmNoKFwiQHN0YXR1czpbMSAxXVwiLHtvZmZzZXQ6MCxudW1iZXJPZlJlc3VsdHM6NTAwMCxzb3J0Qnk6J2lkJ30sKGVycixhd2JzKT0+e1xuICAgICAgICAgdmFyIGF3Ykxpc3QgPSBbXTsgXG4gICAgICAgICBhd2JzLnJlc3VsdHMuZm9yRWFjaChhd2IgPT4ge1xuICAgICAgICAgICBhd2JMaXN0LnB1c2goYXdiLmRvYylcbiAgICAgICAgIH0pO1xuICAgICAgICAgcmVzb2x2ZSh7YXdiczphd2JMaXN0fSlcbiAgICAgICB9KVxuICAgIH0pXG4gIH1cbiAgZ2V0QXdiKGlkKXtcbiAgICByZXR1cm4gbmV3IFByb21pc2UoKHJlc29sdmUscmVqZWN0KT0+e1xuICAgICAgYXdiSW5kZXguZ2V0RG9jKGlkLChlcnIsYXdiKT0+e1xuICAgICAgICByZXNvbHZlKHthd2I6YXdiLmRvY30pXG4gICAgICB9KVxuICAgIH0pXG4gIH1cbiAgdXBkYXRlTG9jYXRpb24odHJhY2tpbmdOdW1iZXIsbG9jYXRpb25faWQpe1xuICAgIHJldHVybiBuZXcgUHJvbWlzZSgocmVzb2x2ZSxyZWplY3QpPT57XG4gICAgICBwYWNrYWdlSW5kZXguc2VhcmNoKFwiQHRyYWNraW5nTm86XCIrdHJhY2tpbmdOdW1iZXIse2xvY2F0aW9uOmxvY2F0aW9uX2lkfSwoZXJyLHBhY2thZ2VSZXN1bHQpPT57XG5cbiAgICAgIH0pXG4gICAgfSlcbiAgfVxuICBzYXZlUGFja2FnZVRvQXdiKG5ld1BhY2thZ2Upe1xuICAgIHJldHVybiBuZXcgUHJvbWlzZSgocmVzb2x2ZSxyZXN1bHQpPT57XG4gICAgICBkYXRhQ29udGV4dC5yZWRpc0NsaWVudC5pbmNyKFBLR19JRF9DT1VOVEVSLChlcnIsaWQpPT57XG4gICAgICAgIG5ld1BhY2thZ2UuaWQgPSBpZDsgXG4gICAgICAgIHBhY2thZ2VJbmRleC5hZGQoaWQsbmV3UGFja2FnZSwoZXJyLHJlc3VsdCk9PntcbiAgICAgICAgICByZXNvbHZlKHtzYXZlZDp0cnVlLGlkOmlkfSlcbiAgICAgICAgfSlcbiAgICAgIH0pXG4gICAgfSlcbiAgfVxuICBzYXZlUGFja2FnZShib2R5KXtcbiAgICByZXR1cm4gbmV3IFByb21pc2UoKHJlc29sdmUscmVqZWN0KT0+e1xuICAgICAgdmFyIGNQYWNrYWdlID0ge1xuICAgICAgICBcbiAgICAgICAgc2t5Ym94OiBib2R5LnNreWJveCxcbiAgICAgICAgY3VzdG9tZXI6IGJvZHkuY3VzdG9tZXIucmVwbGFjZShcIi1cIiwgXCJcIikudHJpbSgpLFxuICAgICAgICB0cmFja2luZ05vOiBib2R5LnRyYWNraW5nLFxuICAgICAgICBkZXNjcmlwdGlvbjogYm9keS5kZXNjcmlwdGlvbixcbiAgICAgICAgc2hpcHBlcjogYm9keS5zaGlwcGVyLFxuICAgICAgICBjYXJyaWVyOmJvZHkuY2FycmllcixcbiAgICAgICAgdmFsdWU6IE51bWJlcihib2R5LnZhbHVlKSxcbiAgICAgICAgcGllY2VzOiBOdW1iZXIoYm9keS5waWVjZXMpLFxuICAgICAgICB3ZWlnaHQ6IE51bWJlcihib2R5LndlaWdodCksXG4gICAgICAgIGRpbWVuc2lvbnM6IGJvZHkuZGltZW5zaW9ucyxcbiAgICAgICAgc3RhdHVzOiAxLFxuICAgICAgICBsb2NhdGlvbjogXCJGTExcIixcbiAgICAgICAgbWlkOiAwLFxuICAgICAgICBhd2I6MCxcbiAgICAgICAgLy9oYXNPcHQ6IHRydWUsXG4gICAgICAgIC8vbXR5cGU6IGJvZHkubXR5cGVcbiAgICAgIH07XG4gICAgICAvL3ZhbGlkYXRlIHRoZSBwYWNrYWdlIFxuICAgICAgZGF0YUNvbnRleHQucmVkaXNDbGllbnQuaW5jcihQS0dfSURfQ09VTlRFUiwoZXJyLGlkKT0+e1xuICAgICAgICBjUGFja2FnZS5pZCA9IGlkOyBcbiAgICAgICAgZGF0YUNvbnRleHQucmVkaXNDbGllbnQuc2V0KFBLR19QUkVGSVgraWQsY1BhY2thZ2UsKGVycixyZXNwb25zZSk9PntcbiAgICAgICAgICBpZiAoZXJyKXtcbiAgICAgICAgICAgIHJlamVjdCh7c2F2ZWQ6ZmFsc2UsZXJyOmVycn0pXG4gICAgICAgICAgfVxuICAgICAgICAgICB2YXIgaW5kZXhQYWNrYWdlID0gIGNyZWF0ZURvY3VtZW50KGNQYWNrYWdlKTsgXG4gICAgICAgICAgIGNvbnNvbGUubG9nKGluZGV4UGFja2FnZSk7IFxuICAgICAgICAgICBwYWNrYWdlSW5kZXguYWRkKGNQYWNrYWdlLmlkLGluZGV4UGFja2FnZSwoZXJyMSxkb2NSZXN1bHQpPT57XG4gICAgICAgICAgICAgY29uc29sZS5sb2coZG9jUmVzdWx0KTsgXG4gICAgICAgICAgICAgaWYoZXJyMSl7XG4gICAgICAgICAgICAgICByZWplY3Qoe3NhdmVkOmZhbHNlLGVycjplcnIxfSlcbiAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgcmVzb2x2ZSh7c2F2ZWQ6dHJ1ZX0pXG4gICAgICAgICAgIH0pXG5cbiAgICAgICAgfSlcbiAgICAgIH0pO1xuICAgIFxuXG5cbiAgICB9KVxuICB9XG4gIHNhdmVQYWNrYWdlT2xkKGJvZHkpIHtcbiAgICBcbiAgICB2YXIgc2VhcmNoZXIgPSB0aGlzLm15U2VhcmNoOyBcbiAgICByZXR1cm4gbmV3IFByb21pc2UoKHJlc29sdmUsIHJlamVjdCkgPT4ge1xuICAgICAgdmFyIGNQYWNrYWdlID0ge1xuICAgICAgICBza3lib3g6IGJvZHkuc2t5Ym94LFxuICAgICAgICBjdXN0b21lcjogYm9keS5jdXN0b21lci5yZXBsYWNlKFwiLVwiLCBcIlwiKS50cmltKCksXG4gICAgICAgIHRyYWNraW5nTm86IGJvZHkudHJhY2tpbmcsXG4gICAgICAgIGR1dHlQZXJjZW50OiAwLjIsXG4gICAgICAgIGRlc2NyaXB0aW9uOiBib2R5LmRlc2NyaXB0aW9uLFxuICAgICAgICBzaGlwcGVyOiBib2R5LnNoaXBwZXIsXG4gICAgICAgIHZhbHVlOiBOdW1iZXIoYm9keS52YWx1ZSksXG4gICAgICAgIHBpZWNlczogTnVtYmVyKGJvZHkucGllY2VzKSxcbiAgICAgICAgd2VpZ2h0OiBOdW1iZXIoYm9keS53ZWlnaHQpLFxuICAgICAgICBzdGF0dXM6IDEsXG4gICAgICAgIGxvY2F0aW9uOiBcIkZMTFwiLFxuICAgICAgICBtaWQ6IGJvZHkubWlkLFxuICAgICAgICBoYXNPcHQ6IHRydWUsXG4gICAgICAgIC8vbXR5cGU6IGJvZHkubXR5cGVcbiAgICAgIH07XG4gICAgICBjb25zb2xlLmxvZyhcImFib3V0IHRvIHNhdmUgdGhlIHBhY2thZ2VcIik7XG4gICAgICBpZiAodHlwZW9mIGNQYWNrYWdlLnNoaXBwZXIgPT09IFwidW5kZWZpbmVkXCIpIGNQYWNrYWdlLnNoaXBwZXIgPSBcIlwiO1xuICAgICAgaWYgKHR5cGVvZiBjUGFja2FnZS5kZXNjcmlwdGlvbiA9PT0gXCJ1bmRlZmluZWRcIilcbiAgICAgICAgY1BhY2thZ2UuZGVzY3JpcHRpb24gPSBcIlwiO1xuICAgICAgY29uc29sZS5sb2coYm9keSk7XG4gICAgICAvLyBpZiAoTnVtYmVyKGJvZHkuaXNCdXNpbmVzcykgPT0gMSkge1xuICAgICAgLy8gICBjUGFja2FnZS5oYXNPcHQgPSBmYWxzZTtcbiAgICAgIC8vIH1cbiAgICAgIC8vY1BhY2thZ2UgPSBwYWNrYWdlVXRpbC5jYWxjdWxhdGVGZWVzKGNQYWNrYWdlKTtcbiAgICAgIGNvbnNvbGUubG9nKFwicGFja2FnZSB3aXRoIGZlZXNcIik7XG5cbiAgICAgIC8vd2UgYWxzbyB3YW50IHRvIGNhbGN1bGF0ZSB0aGUgdGhlIHBhY2thZ2UgZmVlcyBvbmUgdGltZS4uLi4uLlxuICAgICAgLy93ZSBoYXZlIHRoZSBwYWNrYWdlIGRldGFpbHMgaGVyZSAuLiBub3cgd2UgbmVlZCB0byBnZXQgdGhlIGV4aXN0aW5nIHBhY2thZ2VcblxuICAgICBcbiAgICAgIC8vd2UgbmVlZCB0byBjaGVjayB0byBzZWUgb2YgdGhlIG93bmVyIGlzIGEgYnVzaW5lc3MgaGVyZVxuICAgICAgY29uc29sZS5sb2coXCJoZXJlIGFib3V0IHRvIGdldCB0aGUgcGFja2FnZVwiKVxuICAgICAgbHJlZGlzLmdldFBhY2thZ2UoY1BhY2thZ2UudHJhY2tpbmdObykudGhlbihwID0+IHtcbiAgICAgICAgY29uc29sZS5sb2coJ3AgaXMgdGhlICcscCk7IFxuICAgICAgICBpZiAocCkge1xuICAgICAgICAgIHZhciBjdXJyZW50Q29udGFpbmVyID0gYG1hbmlmZXN0OiR7cC5taWR9OiR7cC5tdHlwZX06JHtjb250YWluZXJ9OmA7XG4gICAgICAgICAgY29uc29sZS5sb2coXCJmb3VuZCBwYWNrYWdlIFwiKTtcbiAgICAgICAgICBjb25zb2xlLmxvZyhwKTtcbiAgICAgICAgICBpZiAoY29udGFpbmVyID09IFwiYmFnXCIpIHtcbiAgICAgICAgICAgIC8vY2hlY2sgdG8gc2VlIGlmIHRoZSBiYWNrIG5vIGlzIHRoZSBzYW1lLlxuICAgICAgICAgICAgaWYgKHAuYmFnICE9IGNQYWNrYWdlLmJhZykge1xuICAgICAgICAgICAgICAvL3JlbW92ZSBpdCBmcm9tIHRoZSBvcmlnaW5hbCBsaXN0XG4gICAgICAgICAgICAgIGxyZWRpcy5zcmVtKGN1cnJlbnRDb250YWluZXIgKyBwLmJhZywgcC50cmFja2luZ05vKTtcbiAgICAgICAgICAgICAgY29uc29sZS5sb2coXG4gICAgICAgICAgICAgICAgXCJyZW1vdmUgcGFja2FnZSBmcm9tIGN1cnJlbnQgc2V0IFwiICsgY3VycmVudENvbnRhaW5lclxuICAgICAgICAgICAgICApO1xuICAgICAgICAgICAgfVxuICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAvL2NoZWNrIHRvIHNlZSBpZiB0aGUgc2tpZCBudW1iZXIgaXMgdGhlIHNhbWUuXG4gICAgICAgICAgICBpZiAocC5za2lkICE9IGNQYWNrYWdlLnNraWQpIHtcbiAgICAgICAgICAgICAgLy9yZW1vdmUgaXQgZnJvbSB0aGUgb3JpZ2luYWwgbGlzdFxuICAgICAgICAgICAgICBscmVkaXMuc3JlbShjdXJyZW50Q29udGFpbmVyICsgcC5za2lkLCBwLnRyYWNraW5nTm8pO1xuICAgICAgICAgICAgICBjb25zb2xlLmxvZyhcbiAgICAgICAgICAgICAgICBcInJlbW92ZSBwYWNrYWdlIGZyb20gY3VycmVudCBzZXQgXCIgKyBjdXJyZW50Q29udGFpbmVyXG4gICAgICAgICAgICAgICk7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgfVxuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgIC8vIHRoZSBwYWNrYWdlIGRvZXNuJ3QgZXhpc3QgdXBkYXRlIHRoZSBjb3VudGVyXG4gICAgICAgICAgbHJlZGlzLmNsaWVudC5pbmNyKFwibWNvdW50ZXI6XCIgKyBjUGFja2FnZS5taWQpO1xuICAgICAgICAgIFxuICAgICAgICB9XG5cbiAgICAgICAgbHJlZGlzXG4gICAgICAgICAgLmhtc2V0KFwicGFja2FnZXM6XCIgKyBjUGFja2FnZS50cmFja2luZ05vLCBjUGFja2FnZSlcbiAgICAgICAgICAudGhlbihmdW5jdGlvbihyZXN1bHQpIHtcbiAgICAgICAgICAgIC8vYWRkIHRvIHF1ZXVlIGZvciBwZXJzaXN0ZW50IHByb2Nlc3NpbmdcbiAgICAgICAgICAgIFxuICAgICAgICAgICAgdmFyIG1hbmlmZXN0S2V5ID0gYG1hbmlmZXN0OiR7Y1BhY2thZ2UubWlkfToke1xuICAgICAgICAgICAgICBjUGFja2FnZS5tdHlwZVxuICAgICAgICAgICAgfToke2NvbnRhaW5lcn06JHtjb250YWluZXJOb31gO1xuICAgICAgICAgICAgY29uc29sZS5sb2coXCJhYm91dCB0byBjcmVhdGUgdGhlIGRvY3VtZW50Li4uLlwiKTtcbiAgICAgICAgICAgIGFkZFBhY2thZ2VUb0luZGV4KGNQYWNrYWdlLnRyYWNraW5nTm8sc2VhcmNoZXIpOyBcbiAgICAgICAgICAgIGNvbnNvbGUubG9nKFwiYWRkZWQgdGhlIHBhY2thZ2UgdG8gaW5kZXhcIik7XG4gICAgICAgICAgICBscmVkaXNcbiAgICAgICAgICAgICAgLnNldEFkZChtYW5pZmVzdEtleSwgY1BhY2thZ2UudHJhY2tpbmdObylcbiAgICAgICAgICAgICAgLnRoZW4oZnVuY3Rpb24oc1Jlc3VsdCkge1xuICAgICAgICAgICAgICAgIC8vZ2V0IHRoZSBtZW1iZXJzIG9uZSB0aW1lIGhlcmVcbiAgICAgICAgICAgICAgICBjb25zb2xlLmxvZyhcImFkZGVkIHRoZSBwYWNrYWdlIHRvIHRoZSBzZXRcIik7XG4gICAgICAgICAgICAgICAgY29uc29sZS5sb2cobWFuaWZlc3RLZXkpO1xuICAgICAgICAgICAgICAgIGxyZWRpc1xuICAgICAgICAgICAgICAgICAgLmdldE1lbWJlcnMobWFuaWZlc3RLZXkpXG4gICAgICAgICAgICAgICAgICAudGhlbihkYXRhID0+IHtcbiAgICAgICAgICAgICAgICAgICAgY29uc29sZS5sb2coXCJkYXRhXCIpO1xuICAgICAgICAgICAgICAgICAgICBjb25zb2xlLmxvZyhkYXRhKTtcbiAgICAgICAgICAgICAgICAgICAgUHJvbWlzZS5hbGwoZGF0YS5tYXAobHJlZGlzLmdldFBhY2thZ2UpKTtcbiAgICAgICAgICAgICAgICAgIH0pXG4gICAgICAgICAgICAgICAgICAudGhlbihmdW5jdGlvbihyZGF0YSkge1xuICAgICAgICAgICAgICAgICAgICAvL3dlIG5lZWQgdG8gYWxlcnQgdGhlIHBlcnNvbiB0aGF0IHRoZSBwYWNrYWdlIGlzIGhlcmUgc28gcmVhZCBlbWFpbCBldGMuXG4gICAgICAgICAgICAgICAgICAgIC8vYWRkIHRvIHRoZSBpbmRleFxuICAgICAgICAgICAgICAgICAgICBjb25zb2xlLmxvZyhcImRhdGFcIik7XG4gICAgICAgICAgICAgICAgICAgIGNvbnNvbGUubG9nKHJkYXRhKTtcblxuICAgICAgICAgICAgICAgICAgICByZXNvbHZlKHtcbiAgICAgICAgICAgICAgICAgICAgICBzYXZlZDogdHJ1ZSxcbiAgICAgICAgICAgICAgICAgICAgICBwYWNrYWdlczogcmRhdGEsXG4gICAgICAgICAgICAgICAgICAgICAgc1BhY2thZ2U6IGNQYWNrYWdlXG4gICAgICAgICAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgICAgICAgfSlcbiAgICAgICAgICAgICAgICAgIC5jYXRjaChlcnIzID0+IHtcbiAgICAgICAgICAgICAgICAgICAgY29uc29sZS5sb2coZXJyMyk7XG4gICAgICAgICAgICAgICAgICAgIHJlamVjdCh7XG4gICAgICAgICAgICAgICAgICAgICAgZXJyOiBlcnIzLFxuICAgICAgICAgICAgICAgICAgICAgIHNhdmVkOiB0cnVlLFxuICAgICAgICAgICAgICAgICAgICAgIGxpc3Rpbmc6IGZhbHNlXG4gICAgICAgICAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICAgIH0pXG4gICAgICAgICAgICAgIC5jYXRjaChmdW5jdGlvbihlcnIpIHtcbiAgICAgICAgICAgICAgICByZXNvbHZlKHtcbiAgICAgICAgICAgICAgICAgIHNhdmVkOiBmYWxzZVxuICAgICAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgICB9KTtcbiAgICAgICAgICB9KVxuICAgICAgICAgIC5jYXRjaChmdW5jdGlvbihlcnIyKSB7XG4gICAgICAgICAgICByZWplY3Qoe1xuICAgICAgICAgICAgICBzYXZlZDogZmFsc2VcbiAgICAgICAgICAgIH0pO1xuICAgICAgICAgIH0pO1xuXG4gICAgICAgIC8vc2F2ZSB0aGUgcGFja2FnZSB0byB0aGUgcGFja2FnZSBOU1xuICAgICAgfSkuY2F0Y2goZXJyMjMyPT57XG4gICAgICAgIGNvbnNvbGUubG9nKGVycjIzMilcbiAgICAgIH0pO1xuICAgIH0pO1xuICB9IFxuICBnZXRNYW5pZmVzdFBhY2thZ2VzKCl7XG4gICAgcmV0dXJuIG5ldyBQcm9taXNlKChyZXNvbHZlLHJlamVjdCk9PntcbiAgICAgIFxuICAgICAgdGhpcy5teVNlYXJjaC5zZWFyY2goXG4gICAgICAgIGBAbWlkOlswIDBdYCxcbiAgICAgICAgeyBvZmZzZXQ6IDAsIG51bWJlck9mUmVzdWx0czogNTAwMCB9LFxuICAgICAgICAoZXJyLCBkYXRhKSA9PiB7XG4gICAgICAgICAgdmFyIHBhY2thZ2VzID0gW107XG4gICAgICAgICAgY29uc29sZS5sb2coZGF0YSk7XG4gICAgICAgICAgZGF0YS5yZXN1bHRzLmZvckVhY2goZWxlbWVudCA9PiB7XG5cbiAgICAgICAgICAgIHBhY2thZ2VzLnB1c2goZWxlbWVudC5kb2MpO1xuICAgICAgICAgICAgcmVzb2x2ZShwYWNrYWdlcyk7ICAgICAgICAgICAgICAgICBcbiAgICAgICAgfSk7XG4gICAgfSk7XG4gICAgfSlcbiAgfVxuICBnZXRSZWNlaXZlZFBhY2thZ2VzKHBhZ2UscGFnZVNpemUpe1xuICAgIHJldHVybiBuZXcgUHJvbWlzZSgocmVzb2x2ZSxyZWplY3QpPT57XG4gICAgICBcbiAgICAgIHRoaXMubXlTZWFyY2guc2VhcmNoKFxuICAgICAgICBgQG1pZDpbMCAwXWAsXG4gICAgICAgIHsgb2Zmc2V0OiAwLCBudW1iZXJPZlJlc3VsdHM6IDUwMDAgfSxcbiAgICAgICAgKGVyciwgZGF0YSkgPT4ge1xuICAgICAgICAgIHZhciBwYWNrYWdlcyA9IFtdO1xuICAgICAgICAgIGNvbnNvbGUubG9nKGRhdGEpO1xuICAgICAgICAgIGRhdGEucmVzdWx0cy5mb3JFYWNoKGVsZW1lbnQgPT4ge1xuXG4gICAgICAgICAgICBwYWNrYWdlcy5wdXNoKGVsZW1lbnQuZG9jKTtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBcbiAgICAgICAgfSk7XG4gICAgICAgIHJlc29sdmUocGFja2FnZXMpOyBcbiAgICB9KTtcbiAgICB9KVxuICB9XG4gIGdldE5vRG9jc1BhY2thY2thZ2VzKHBhZ2UscGFnZVNpemUpe1xuICAgIHJldHVybiBuZXcgUHJvbWlzZSgocmVzb2x2ZSxyZWplY3QpPT57XG4gICAgICBcbiAgICAgIHRoaXMubXlTZWFyY2guc2VhcmNoKFxuICAgICAgICBgQGhhc0RvY3M6WzAgMF1gLFxuICAgICAgICB7IG9mZnNldDogMCwgbnVtYmVyT2ZSZXN1bHRzOiA1MDAwIH0sXG4gICAgICAgIChlcnIsIGRhdGEpID0+IHtcbiAgICAgICAgICB2YXIgcGFja2FnZXMgPSBbXTtcbiAgICAgICAgICBjb25zb2xlLmxvZyhkYXRhKTtcbiAgICAgICAgICBkYXRhLnJlc3VsdHMuZm9yRWFjaChlbGVtZW50ID0+IHtcblxuICAgICAgICAgICAgcGFja2FnZXMucHVzaChlbGVtZW50LmRvYyk7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgXG4gICAgICAgIH0pO1xuICAgICAgICByZXNvbHZlKHBhY2thZ2VzKTsgXG4gICAgfSk7XG4gICAgfSlcbiAgfVxuICBnZXRQYWNrYWdlQnlJZChpZCl7XG4gICAgcmV0dXJuIG5ldyBQcm9taXNlKChyZXNvbHZlLHJlamVjdCk9PntcbiAgICAgIHJlZGlTZWFyY2guZ2V0RG9jKGlkLChlcnIsZG9jdW1lbnQpPT57XG4gICAgICAgIHJlc29sdmUoZG9jdW1lbnQuZG9jKTsgXG4gICAgICB9KVxuICAgIH0pOyBcbiAgfVxuICB1cGRhdGVNYW5pZmVzdFBhY2thZ2VUb0luVHJhbnNpdChtaWQpIHtcbiAgICAvL2dldCBhbGwgdGhlIHBhY2thZ2VzXG4gICAgLy93ZSBuZWVkIHRvIHVwZGF0ZSB0aGUgaW5kZXggYXQgdGhpcyBwb2ludCBhcyB3ZWxsXG4gICAgdmFyIG1zZWFyY2ggPSB0aGlzLm15U2VhcmNoO1xuICAgIHRoaXMubXlTZWFyY2guc2VhcmNoKFxuICAgICAgYEBtaWQ6WyR7bWlkfSAke21pZH1dYCxcbiAgICAgIHsgb2Zmc2V0OiAwLCBudW1iZXJPZlJlc3VsdHM6IDUwMDAgfSxcbiAgICAgIChlcnIsIGRhdGEpID0+IHtcbiAgICAgICAgdmFyIHBhY2thZ2VzID0gW107XG4gICAgICAgIGNvbnNvbGUubG9nKGRhdGEpO1xuICAgICAgICBkYXRhLnJlc3VsdHMuZm9yRWFjaChlbGVtZW50ID0+IHtcbiAgICAgICAgICB2YXIgb2xkRG9jSWQgPSBlbGVtZW50LmRvY0lkO1xuICAgICAgICAgIGVsZW1lbnQuZG9jSWQgPSBlbGVtZW50LmRvY0lkLnJlcGxhY2UoYCR7bWlkfS1gLCBcIlwiKTtcbiAgICAgICAgICBwYWNrYWdlcy5wdXNoKGVsZW1lbnQuZG9jSWQpO1xuICAgICAgICAgIC8vIGkgY291bGQgZGVsZXRlIGhlcmVcbiAgICAgICAgICAvLyBtc2VhcmNoLmRlbERvY3VtZW50KFBLR19JRFgsb2xkRG9jSWQpXG4gICAgICAgICAgLy91cGRhdGUgYWxsIHRoZSBwYWNrYWdlc1xuICAgICAgICB9KTtcbiAgICAgICAgc2V0UGFja2FnZUluVHJhbnNpdChwYWNrYWdlcywgbXNlYXJjaCwgbWlkKS50aGVuKGZ1bmN0aW9uKFxuICAgICAgICAgIHVwZGF0ZWRQYWNrYWdlc1xuICAgICAgICApIHtcbiAgICAgICAgICBjb25zb2xlLmxvZyhcInVwZGF0ZWQgcGFja2FnZXNcIik7XG4gICAgICAgICAgY29uc29sZS5sb2codXBkYXRlZFBhY2thZ2VzKTtcbiAgICAgICAgfSk7XG4gICAgICB9XG4gICAgKTtcbiAgfVxuICByZW1vdmVQYWNrYWdlKHRyYWNraW5nTm8sIG1pZCkge1xuICAgIHZhciBtc2VhcmNoID0gdGhpcy5teVNlYXJjaDtcbiAgICByZXR1cm4gbmV3IFByb21pc2UoKHJlc29sdmUsIHJlamVjdCkgPT4ge1xuICAgICAgdmFyIG1hbmlmZXN0ID0gbWlkO1xuICAgICAgdmFyIG1hbmlmZXN0S2V5ID0gXCJtYW5pZmVzdDpcIiArIG1hbmlmZXN0ICsgXCI6KlwiO1xuXG4gICAgICBscmVkaXMuZGVsKFwicGFja2FnZXM6XCIgKyB0cmFja2luZ05vKS50aGVuKGZ1bmN0aW9uKHJlc3VsdCkge1xuICAgICAgICBjb25zb2xlLmxvZyhyZXN1bHQpO1xuICAgICAgICBtc2VhcmNoLmRlbERvY3VtZW50KFBLR19JRFgsIGAke21pZH0tJHt0cmFja2luZ05vfWApO1xuICAgICAgICAvL3dlIG5lZWQgdG8gcmVtb3ZlIGZyb20gdGhlIGluZGV4IGFuZCBkZWMgdGhlIGNvdW50ZXJcbiAgICAgICAgbHJlZGlzLmNsaWVudC5kZWNyKFwibWNvdW50ZXI6XCIgKyBtaWQpO1xuICAgICAgICAvL3JTZXJ2aWNlcy5wYWNrYWdlU2VydmljZS5ybVBhY2thZ2UobWlkLCB0cmFja2luZ05vKTtcbiAgICAgICAgbHJlZGlzLmdldEtleXMobWFuaWZlc3RLZXkpLnRoZW4oa1Jlc3VsdCA9PiB7XG4gICAgICAgICAgLy90aGUgbGlzdCBvZiBhbGwgdGhlIHNldHMgLi4ud2UgbmVlZCB0byByZW1vdmUgdGhlIGtleSBmcm9tIGVhY2ggb25lXG4gICAgICAgICAgdmFyIGtleXNDb3VudCA9IDA7XG5cbiAgICAgICAgICBrUmVzdWx0LmZvckVhY2goZWxlbWVudCA9PiB7XG4gICAgICAgICAgICBjb25zb2xlLmxvZyhcbiAgICAgICAgICAgICAgYHJlbW92aW5nICR7dHJhY2tpbmdOb30gcGFja2FnZSBtYW5pZmVzdCBzZXQgJHtlbGVtZW50fSBgXG4gICAgICAgICAgICApO1xuICAgICAgICAgICAgbHJlZGlzLnNyZW0oZWxlbWVudCwgdHJhY2tpbmdObykudGhlbihmdW5jdGlvbihyUmVzdWx0KSB7XG4gICAgICAgICAgICAgIGNvbnNvbGUubG9nKHJSZXN1bHQpO1xuICAgICAgICAgICAgICBjb25zb2xlLmxvZyhcInJlbW92ZWRcIik7XG4gICAgICAgICAgICAgIGlmIChrZXlzQ291bnQgPT0ga1Jlc3VsdC5sZW5ndGggLSAxKSBrZXlzQ291bnQrKztcbiAgICAgICAgICAgIH0pO1xuICAgICAgICAgIH0pO1xuICAgICAgICAgIHJlc29sdmUoe1xuICAgICAgICAgICAgZGVsZXRlZDogdHJ1ZVxuICAgICAgICAgIH0pO1xuICAgICAgICB9KTtcblxuICAgICAgICAvL3dlIGFsc28gbmVlZCB0byByZW1vdmUgZnJvbSBhbnkgc2V0c1xuICAgICAgfSk7XG4gICAgfSk7XG4gIH1cbiAgcmVtb3ZlUGFja2FnZUJ5SWQoaWQpIHtcbiAgICB2YXIgbXNlYXJjaCA9IHRoaXMubXlTZWFyY2g7XG4gICAgcmV0dXJuIG5ldyBQcm9taXNlKChyZXNvbHZlLCByZWplY3QpID0+IHtcbiAgICBcbiAgICAgIHJlZGlTZWFyY2guZGVsRG9jdW1lbnQoUEtHX0lEWCxpZCwoZXJyLHJlc3BvbnNlKT0+e1xuICAgICAgICByZXNvbHZlKHtkZWxldGVkOnRydWV9KVxuICAgICAgfSlcbiAgICAgIFxuICAgICAgICBcbiAgICAgIFxuICAgIH0pO1xuICB9XG4gIHN0b3JlUGFja2FnZUZvclBpY2t1cCh0cmFja2luZ05vLGJpbil7XG4gICAgdmFyIHNlYXJjaGVyID0gdGhpcy5teVNlYXJjaDtcbiAgICByZXR1cm4gbmV3IFByb21pc2UoKHJlc29sdmUscmVqZWN0KT0+e1xuICAgICAgIGxyZWRpcy5obXNldChQS0dfUFJFRklYK3RyYWNraW5nTm8se3N0YXR1czo0LGxvY2F0aW9uOmJpbn0pLnRoZW4oKHJlc3VsdCk9PntcbiAgICAgICAgIGxyZWRpcy5nZXRQYWNrYWdlKHRyYWNraW5nTm8pLnRoZW4oKHBrZyk9PntcbiAgICAgICAgICBhZGRQYWNrYWdlVG9JbmRleCh0cmFja2luZ05vLHNlYXJjaGVyKSA7IFxuICAgICAgICAgIHJlc29sdmUocGtnKTsgICBcbiAgICAgICAgIH0pO1xuICAgICAgIH0pIFxuICAgIH0pOyBcbiAgfVxuICB1cGRhdGVQYWNrYWdlSW5kZXgodHJhY2tpbmcpe1xuICAgICAgcmV0dXJuIG5ldyBQcm9taXNlKChyZXNvbHZlLHJlamVjdCk9PntcbiAgICAgICAgICB2YXIgbXNlYXJjaCA9IHRoaXMubXlTZWFyY2g7IFxuICAgICAgICAgIGFkZFBhY2thZ2VUb0luZGV4KHRyYWNraW5nLG1zZWFyY2gpOyBcbiAgICAgICAgIHJlc29sdmUoeyd1cGRhdGVkJzp0cnVlfSk7XG4gICAgICB9KVxuICB9XG4gIGdldEN1c3RvbWVyUGFja2FnZXMoc2t5Ym94KSB7fVxuICBnZXRNYW5pZmVzdFBhY2thZ2VzQnlTdGF0dXMobWlkLHN0YXR1cykge1xuICAgICAgcmV0dXJuIG5ldyBQcm9taXNlKChyZXNvbHZlLHJlamVjdCk9PntcbiAgICAgICAgICBjb25zb2xlLmxvZyhgQG1pZDpbJHttaWR9ICR7bWlkfV0gQHN0YXR1cz1bJHtzdGF0dXN9ICR7c3RhdHVzfV1gKVxuICAgICAgICB0aGlzLm15U2VhcmNoLnNlYXJjaChcbiAgICAgICAgICAgIGBAbWlkOlske21pZH0gJHttaWR9XSBAc3RhdHVzOlske3N0YXR1c30gJHtzdGF0dXN9XWAsXG4gICAgICAgICAgICB7IG9mZnNldDogMCwgbnVtYmVyT2ZSZXN1bHRzOiA1MDAwIH0sXG4gICAgICAgICAgICAoZXJyLCBkYXRhKSA9PiB7XG4gICAgICAgICAgICAgIHZhciBwYWNrYWdlcyA9IFtdO1xuICAgICAgICAgICAgICBjb25zb2xlLmxvZyhkYXRhKTtcbiAgICAgICAgICAgICAgZGF0YS5yZXN1bHRzLmZvckVhY2goZWxlbWVudCA9PiB7XG5cbiAgICAgICAgICAgICAgICBwYWNrYWdlcy5wdXNoKGVsZW1lbnQuZG9jKTtcbiAgICAgICAgICAgICAgICByZXNvbHZlKHBhY2thZ2VzKTsgICAgICAgICAgICAgICAgIFxuICAgICAgICAgICAgfSk7XG4gICAgICAgIH0pO1xuICAgICAgfSk7XG4gIFxuICB9ICAgICBcbn1cbiJdfQ==
