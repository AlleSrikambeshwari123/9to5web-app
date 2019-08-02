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
var PKG_STATUS = {
  1: "Received",
  2: "In Transit",
  3: "Processing",
  4: "Ready for Pickup / Delivery",
  5: "Out for Delivery",
  6: "Delivered"

};

var rediSearch = redisSearch(redis, PKG_IDX, {
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
            rediSearch.add(cPackage.id, indexPackage, function (err1, docResult) {
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
//# sourceMappingURL=data:application/json;charset=utf8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIlJlZGlzU2VydmljZXMvUGFja2FnZVNlcnZpY2UuZXM2Il0sIm5hbWVzIjpbInJlZGlzIiwicmVxdWlyZSIsImxyZWRpcyIsIm1vbWVudCIsInJlZGlzU2VhcmNoIiwiZnMiLCJQYWNrYWdlVXRpbCIsIlBhY2thZ2VVdGlsaXR5IiwicGFja2FnZVV0aWwiLCJQS0dfSURYIiwiUEtHX0lEX0NPVU5URVIiLCJkYXRhQ29udGV4dCIsIlBLR19QUkVGSVgiLCJBV0JfSUQiLCJQS0dfU1RBVFVTIiwicmVkaVNlYXJjaCIsImNsaWVudE9wdGlvbnMiLCJzZWFyY2hDbGllbnREZXRhaWxzIiwiZ2V0UGFja2FnZVZvbHVtbmUiLCJtUGFja2FnZSIsImNyZWF0ZURvY3VtZW50IiwidFBhY2thZ2UiLCJwYWNrYWdlRG9jdW1lbnQiLCJpZCIsInRyYWNraW5nTm8iLCJza3lib3giLCJkYXRlUmVjaWV2ZWQiLCJ1bml4IiwiYXdiIiwibWlkIiwidm9sdW1lIiwid2VpZ2h0IiwicGllY2VzIiwiY3VzdG9tZXIiLCJzaGlwcGVyIiwiZGVzY3JpcHRpb24iLCJkaW1lbnNpb25zIiwiY2FycmllciIsInN0YXR1cyIsInZhbHVlIiwiY29uc29sZSIsImxvZyIsInNldFBhY2thZ2VJblRyYW5zaXQiLCJrZXlzIiwibXNlYXJjaGVyIiwiUHJvbWlzZSIsInJlc29sdmUiLCJyZWplY3QiLCJiYXRjaGVyIiwiY2xpZW50IiwiYmF0Y2giLCJmb3JFYWNoIiwibG9jYXRpb24iLCJlbGVtZW50IiwiaG1zZXQiLCJleGVjIiwiZXJyIiwicmVzdWx0IiwiYWRkUGFja2FnZVRvSW5kZXgiLCJnZXRQYWNrYWdlIiwidGhlbiIsImRlbERvY3VtZW50IiwicGFjayIsImRvbmUiLCJkb2N1bWVudCIsImFkZCIsIlBhY2thZ2VTZXJ2aWNlIiwic2V0dXBJbmRleCIsIm15U2VhcmNoIiwicmVkaXNDbGllbnQiLCJleGlzdHMiLCJzZXQiLCJpbml0UmVzdWx0IiwiaW5jciIsIm5ld0lkIiwiYm9keSIsImNQYWNrYWdlIiwicmVwbGFjZSIsInRyaW0iLCJ0cmFja2luZyIsIk51bWJlciIsInJlc3BvbnNlIiwic2F2ZWQiLCJpbmRleFBhY2thZ2UiLCJlcnIxIiwiZG9jUmVzdWx0Iiwic2VhcmNoZXIiLCJkdXR5UGVyY2VudCIsImhhc09wdCIsInAiLCJjdXJyZW50Q29udGFpbmVyIiwibXR5cGUiLCJjb250YWluZXIiLCJiYWciLCJzcmVtIiwic2tpZCIsIm1hbmlmZXN0S2V5IiwiY29udGFpbmVyTm8iLCJzZXRBZGQiLCJzUmVzdWx0IiwiZ2V0TWVtYmVycyIsImRhdGEiLCJhbGwiLCJtYXAiLCJyZGF0YSIsInBhY2thZ2VzIiwic1BhY2thZ2UiLCJjYXRjaCIsImVycjMiLCJsaXN0aW5nIiwiZXJyMiIsImVycjIzMiIsInNlYXJjaCIsIm9mZnNldCIsIm51bWJlck9mUmVzdWx0cyIsInJlc3VsdHMiLCJwdXNoIiwiZG9jIiwicGFnZSIsInBhZ2VTaXplIiwiZ2V0RG9jIiwibXNlYXJjaCIsIm9sZERvY0lkIiwiZG9jSWQiLCJ1cGRhdGVkUGFja2FnZXMiLCJtYW5pZmVzdCIsImRlbCIsImRlY3IiLCJnZXRLZXlzIiwia2V5c0NvdW50Iiwia1Jlc3VsdCIsInJSZXN1bHQiLCJsZW5ndGgiLCJkZWxldGVkIiwiYmluIiwicGtnIl0sIm1hcHBpbmdzIjoiOzs7Ozs7Ozs7QUFBQTs7Ozs7O0FBR0EsSUFBSUEsUUFBUUMsUUFBUSxPQUFSLENBQVo7QUFDQSxJQUFJQyxTQUFTRCxRQUFRLGVBQVIsQ0FBYjtBQUNBLElBQUlFLFNBQVNGLFFBQVEsUUFBUixDQUFiO0FBQ0EsSUFBSUcsY0FBY0gsUUFBUSxxQkFBUixDQUFsQjtBQUNBLElBQUlJLEtBQUtKLFFBQVEsSUFBUixDQUFUOztBQUVBLElBQUlLLGNBQWNMLFFBQVEscUJBQVIsRUFBK0JNLGNBQWpEO0FBQ0EsSUFBSUMsY0FBYyxJQUFJRixXQUFKLEVBQWxCO0FBQ0EsSUFBTUcsVUFBVSxnQkFBaEI7QUFDQSxJQUFNQyxpQkFBaUIsWUFBdkI7QUFDQSxJ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QUNILFdBSkM7QUFLTCxTQVhEO0FBWUQsT0FkTSxDQUFQO0FBZ0JIIiwiZmlsZSI6IlJlZGlzU2VydmljZXMvUGFja2FnZVNlcnZpY2UuanMiLCJzb3VyY2VzQ29udGVudCI6WyJpbXBvcnQgeyBjcHVzIH0gZnJvbSBcIm9zXCI7XG5cblxudmFyIHJlZGlzID0gcmVxdWlyZShcInJlZGlzXCIpO1xudmFyIGxyZWRpcyA9IHJlcXVpcmUoXCIuL3JlZGlzLWxvY2FsXCIpO1xudmFyIG1vbWVudCA9IHJlcXVpcmUoXCJtb21lbnRcIik7XG52YXIgcmVkaXNTZWFyY2ggPSByZXF1aXJlKFwiLi4vcmVkaXNlYXJjaGNsaWVudFwiKTtcbnZhciBmcyA9IHJlcXVpcmUoXCJmc1wiKTtcblxudmFyIFBhY2thZ2VVdGlsID0gcmVxdWlyZShcIi4uL1V0aWwvcGFja2FnZXV0aWxcIikuUGFja2FnZVV0aWxpdHk7XG52YXIgcGFja2FnZVV0aWwgPSBuZXcgUGFja2FnZVV0aWwoKTtcbmNvbnN0IFBLR19JRFggPSBcImluZGV4OnBhY2thZ2VzXCI7XG5jb25zdCBQS0dfSURfQ09VTlRFUiA9IFwicGFja2FnZTppZFwiO1xudmFyIGRhdGFDb250ZXh0ID0gcmVxdWlyZSgnLi9kYXRhQ29udGV4dCcpXG5jb25zdCBQS0dfUFJFRklYID0gXCJwYWNrYWdlczpcIjtcbmNvbnN0IEFXQl9JRCA9IFwiYXdiOmlkXCJcbmNvbnN0IFBLR19TVEFUVVMgPSB7IFxuICAxIDogXCJSZWNlaXZlZFwiLFxuICAyOiBcIkluIFRyYW5zaXRcIixcbiAgMzogXCJQcm9jZXNzaW5nXCIsXG4gIDQ6IFwiUmVhZHkgZm9yIFBpY2t1cCAvIERlbGl2ZXJ5XCIsXG4gIDU6IFwiT3V0IGZvciBEZWxpdmVyeVwiLFxuICA2OiBcIkRlbGl2ZXJlZFwiXG5cbn07IFxuXG5jb25zdCByZWRpU2VhcmNoID0gcmVkaXNTZWFyY2gocmVkaXMsIFBLR19JRFgsIHtcbiAgY2xpZW50T3B0aW9uczogbHJlZGlzLnNlYXJjaENsaWVudERldGFpbHNcbn0pO1xuZnVuY3Rpb24gZ2V0UGFja2FnZVZvbHVtbmUobVBhY2thZ2Upe1xuXG4gIHJldHVybiAwOyBcbn1cbmZ1bmN0aW9uIGNyZWF0ZURvY3VtZW50KHRQYWNrYWdlKSB7XG4gIHZhciBwYWNrYWdlRG9jdW1lbnQgPSB7XG4gICAgaWQ6dFBhY2thZ2UuaWQsXG4gICAgdHJhY2tpbmdObzogdFBhY2thZ2UudHJhY2tpbmdObyxcbiAgICBza3lib3g6IHRQYWNrYWdlLnNreWJveCxcbiAgICBkYXRlUmVjaWV2ZWQgOiBtb21lbnQoKS51bml4KCksIFxuICAgIGF3YjowLCBcbiAgICBtaWQ6MCxcbiAgICB2b2x1bWU6IGdldFBhY2thZ2VWb2x1bW5lKHRQYWNrYWdlKSxcbiAgICB3ZWlnaHQ6dFBhY2thZ2Uud2VpZ2h0LFxuICAgIHBpZWNlczp0UGFja2FnZS5waWVjZXMsXG4gICAgY3VzdG9tZXI6IHRQYWNrYWdlLmN1c3RvbWVyLFxuICAgIHNoaXBwZXI6IHRQYWNrYWdlLnNoaXBwZXIsXG4gICAgZGVzY3JpcHRpb246IHRQYWNrYWdlLmRlc2NyaXB0aW9uLFxuICAgIGRpbWVuc2lvbnM6dFBhY2thZ2UuZGltZW5zaW9ucyxcbiAgICBjYXJyaWVyOnRQYWNrYWdlLmNhcnJpZXIsXG4gICAgLy9za3lib3hWOiB0UGFja2FnZS5za3lib3gsIGFkZCBkaW1lbmlvbiBcbiAgICBzdGF0dXM6IHRQYWNrYWdlLnN0YXR1cyxcbiAgICBtaWQ6IHRQYWNrYWdlLm1pZCxcbiAgICB2YWx1ZTogdFBhY2thZ2UudmFsdWUsXG4gICAgXG4gIH07XG4gIGNvbnNvbGUubG9nKFwiYWJvdXQgdG8gYWRkIHRoZSBwYWNrYWdlIHRvIHRoZSBpbmRleFwiKTtcbiAgcmV0dXJuIHBhY2thZ2VEb2N1bWVudDtcbn1cbmZ1bmN0aW9uIHNldFBhY2thZ2VJblRyYW5zaXQoa2V5cywgbXNlYXJjaGVyKSB7XG4gIHJldHVybiBuZXcgUHJvbWlzZSgocmVzb2x2ZSwgcmVqZWN0KSA9PiB7XG4gICAgdmFyIGJhdGNoZXIgPSBtc2VhcmNoZXIuY2xpZW50LmJhdGNoKCk7XG4gICAga2V5cy5mb3JFYWNoKGVsZW1lbnQgPT4ge1xuICAgICAgdmFyIHZhbHVlID0ge1xuICAgICAgICBzdGF0dXM6IDIsXG4gICAgICAgIGxvY2F0aW9uOiBcIkluIFRyYW5zaXRcIlxuICAgICAgfTtcbiAgICAgIGNvbnNvbGUubG9nKGVsZW1lbnQgKyBcImlzIHRoZSBlbGVtZW50XCIpO1xuXG4gICAgICBiYXRjaGVyLmhtc2V0KFBLR19QUkVGSVggKyBlbGVtZW50LCB2YWx1ZSk7XG4gICAgfSk7XG4gICAgYmF0Y2hlci5leGVjKChlcnIsIHJlc3VsdCkgPT4ge1xuICAgICAgY29uc29sZS5sb2cocmVzdWx0KTtcbiAgICAgIC8vcmVhZGQgdGhlIGRvY3VtZW50cyBoZXJlXG4gICAgICBrZXlzLmZvckVhY2goZWxlbWVudCA9PiB7XG4gICAgICAgIGFkZFBhY2thZ2VUb0luZGV4KGVsZW1lbnQsIG1zZWFyY2hlcik7XG4gICAgICB9KTtcbiAgICAgIHJlc29sdmUocmVzdWx0KTtcbiAgICB9KTtcbiAgfSk7XG59XG5cbmZ1bmN0aW9uIGFkZFBhY2thZ2VUb0luZGV4KHRyYWNraW5nTm8sIG1zZWFyY2hlcikge1xuICBscmVkaXMuZ2V0UGFja2FnZSh0cmFja2luZ05vKS50aGVuKHBhY2sgPT4ge1xuICAgIG1zZWFyY2hlci5kZWxEb2N1bWVudChQS0dfSURYLCBgJHtwYWNrLm1pZH0tJHt0cmFja2luZ05vfWAsIChlcnIsIGRvbmUpID0+IHtcbiAgICAgIHZhciBkb2N1bWVudCA9IGNyZWF0ZURvY3VtZW50KHBhY2spO1xuICAgICAgY29uc29sZS5sb2coXCJyZWFkZGluZyBwYWNrYWdlIHRvIHRoZSBpbmRleCBsaWtlIGEgYm9zcyBcIiArIHRyYWNraW5nTm8pO1xuICAgICAgbXNlYXJjaGVyLmFkZChwYWNrLm1pZCArIFwiLVwiICsgcGFjay50cmFja2luZ05vLCBkb2N1bWVudCk7XG4gICAgfSk7XG4gIH0pO1xufVxuZXhwb3J0IGNsYXNzIFBhY2thZ2VTZXJ2aWNlIHtcbiAgY29uc3RydWN0b3IoKSB7XG4gICAgdGhpcy5zZXR1cEluZGV4KCk7XG4gIH1cbiAgc2V0dXBJbmRleCgpIHtcbiAgICB0aGlzLm15U2VhcmNoID0gcmVkaXNTZWFyY2gocmVkaXMsIFBLR19JRFgsIHtcbiAgICAgIGNsaWVudE9wdGlvbnM6IGxyZWRpcy5zZWFyY2hDbGllbnREZXRhaWxzXG4gICAgfSk7XG4gIH1cbiAgZ2V0TmV3QXdiKCl7XG4gICAgcmV0dXJuIG5ldyBQcm9taXNlKChyZXNvbHZlLHJlamVjdCk9PntcbiAgICAgIGRhdGFDb250ZXh0LnJlZGlzQ2xpZW50LmV4aXN0cyhBV0JfSUQsKGVycixyZXN1bHQpPT57XG4gICAgICAgIGNvbnNvbGUubG9nKHJlc3VsdCk7IFxuICAgICAgICBpZiAocmVzdWx0ICE9IFwiMVwiKXtcbiAgICAgICAgICBkYXRhQ29udGV4dC5yZWRpc0NsaWVudC5zZXQoQVdCX0lEID09IDEwMDAwMCwoZXJyLGluaXRSZXN1bHQpPT57XG4gICAgICAgICAgICBkYXRhQ29udGV4dC5yZWRpc0NsaWVudC5pbmNyKEFXQl9JRCwoZXJyLG5ld0lkKT0+e1xuICAgICAgICAgICAgICByZXNvbHZlKHthd2I6bmV3SWR9KVxuICAgICAgICAgICAgfSlcbiAgICAgICAgICB9KVxuICAgICAgICB9XG4gICAgICAgIGVsc2Uge1xuICAgICAgICAgIGRhdGFDb250ZXh0LnJlZGlzQ2xpZW50LmluY3IoQVdCX0lELChlcnIsbmV3SWQpPT57XG4gICAgICAgICAgICByZXNvbHZlKHthd2I6bmV3SWR9KVxuICAgICAgICAgIH0pXG4gICAgICAgIH1cbiAgICAgIH0pXG4gICAgfSk7XG4gIH1cbiAgc2F2ZVBhY2thZ2UoYm9keSl7XG4gICAgcmV0dXJuIG5ldyBQcm9taXNlKChyZXNvbHZlLHJlamVjdCk9PntcbiAgICAgIHZhciBjUGFja2FnZSA9IHtcbiAgICAgICAgXG4gICAgICAgIHNreWJveDogYm9keS5za3lib3gsXG4gICAgICAgIGN1c3RvbWVyOiBib2R5LmN1c3RvbWVyLnJlcGxhY2UoXCItXCIsIFwiXCIpLnRyaW0oKSxcbiAgICAgICAgdHJhY2tpbmdObzogYm9keS50cmFja2luZyxcbiAgICAgICAgZGVzY3JpcHRpb246IGJvZHkuZGVzY3JpcHRpb24sXG4gICAgICAgIHNoaXBwZXI6IGJvZHkuc2hpcHBlcixcbiAgICAgICAgY2Fycmllcjpib2R5LmNhcnJpZXIsXG4gICAgICAgIHZhbHVlOiBOdW1iZXIoYm9keS52YWx1ZSksXG4gICAgICAgIHBpZWNlczogTnVtYmVyKGJvZHkucGllY2VzKSxcbiAgICAgICAgd2VpZ2h0OiBOdW1iZXIoYm9keS53ZWlnaHQpLFxuICAgICAgICBkaW1lbnNpb25zOiBib2R5LmRpbWVuc2lvbnMsXG4gICAgICAgIHN0YXR1czogMSxcbiAgICAgICAgbG9jYXRpb246IFwiRkxMXCIsXG4gICAgICAgIG1pZDogMCxcbiAgICAgICAgYXdiOjAsXG4gICAgICAgIC8vaGFzT3B0OiB0cnVlLFxuICAgICAgICAvL210eXBlOiBib2R5Lm10eXBlXG4gICAgICB9O1xuICAgICAgLy92YWxpZGF0ZSB0aGUgcGFja2FnZSBcbiAgICAgIGRhdGFDb250ZXh0LnJlZGlzQ2xpZW50LmluY3IoUEtHX0lEX0NPVU5URVIsKGVycixpZCk9PntcbiAgICAgICAgY1BhY2thZ2UuaWQgPSBpZDsgXG4gICAgICAgIGRhdGFDb250ZXh0LnJlZGlzQ2xpZW50LnNldChQS0dfUFJFRklYK2lkLGNQYWNrYWdlLChlcnIscmVzcG9uc2UpPT57XG4gICAgICAgICAgaWYgKGVycil7XG4gICAgICAgICAgICByZWplY3Qoe3NhdmVkOmZhbHNlLGVycjplcnJ9KVxuICAgICAgICAgIH1cbiAgICAgICAgICAgdmFyIGluZGV4UGFja2FnZSA9ICBjcmVhdGVEb2N1bWVudChjUGFja2FnZSk7IFxuICAgICAgICAgICBjb25zb2xlLmxvZyhpbmRleFBhY2thZ2UpOyBcbiAgICAgICAgICAgcmVkaVNlYXJjaC5hZGQoY1BhY2thZ2UuaWQsaW5kZXhQYWNrYWdlLChlcnIxLGRvY1Jlc3VsdCk9PntcbiAgICAgICAgICAgICBjb25zb2xlLmxvZyhkb2NSZXN1bHQpOyBcbiAgICAgICAgICAgICBpZihlcnIxKXtcbiAgICAgICAgICAgICAgIHJlamVjdCh7c2F2ZWQ6ZmFsc2UsZXJyOmVycjF9KVxuICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICByZXNvbHZlKHtzYXZlZDp0cnVlfSlcbiAgICAgICAgICAgfSlcblxuICAgICAgICB9KVxuICAgICAgfSk7XG4gICAgXG5cblxuICAgIH0pXG4gIH1cbiAgc2F2ZVBhY2thZ2VPbGQoYm9keSkge1xuICAgIFxuICAgIHZhciBzZWFyY2hlciA9IHRoaXMubXlTZWFyY2g7IFxuICAgIHJldHVybiBuZXcgUHJvbWlzZSgocmVzb2x2ZSwgcmVqZWN0KSA9PiB7XG4gICAgICB2YXIgY1BhY2thZ2UgPSB7XG4gICAgICAgIHNreWJveDogYm9keS5za3lib3gsXG4gICAgICAgIGN1c3RvbWVyOiBib2R5LmN1c3RvbWVyLnJlcGxhY2UoXCItXCIsIFwiXCIpLnRyaW0oKSxcbiAgICAgICAgdHJhY2tpbmdObzogYm9keS50cmFja2luZyxcbiAgICAgICAgZHV0eVBlcmNlbnQ6IDAuMixcbiAgICAgICAgZGVzY3JpcHRpb246IGJvZHkuZGVzY3JpcHRpb24sXG4gICAgICAgIHNoaXBwZXI6IGJvZHkuc2hpcHBlcixcbiAgICAgICAgdmFsdWU6IE51bWJlcihib2R5LnZhbHVlKSxcbiAgICAgICAgcGllY2VzOiBOdW1iZXIoYm9keS5waWVjZXMpLFxuICAgICAgICB3ZWlnaHQ6IE51bWJlcihib2R5LndlaWdodCksXG4gICAgICAgIHN0YXR1czogMSxcbiAgICAgICAgbG9jYXRpb246IFwiRkxMXCIsXG4gICAgICAgIG1pZDogYm9keS5taWQsXG4gICAgICAgIGhhc09wdDogdHJ1ZSxcbiAgICAgICAgLy9tdHlwZTogYm9keS5tdHlwZVxuICAgICAgfTtcbiAgICAgIGNvbnNvbGUubG9nKFwiYWJvdXQgdG8gc2F2ZSB0aGUgcGFja2FnZVwiKTtcbiAgICAgIGlmICh0eXBlb2YgY1BhY2thZ2Uuc2hpcHBlciA9PT0gXCJ1bmRlZmluZWRcIikgY1BhY2thZ2Uuc2hpcHBlciA9IFwiXCI7XG4gICAgICBpZiAodHlwZW9mIGNQYWNrYWdlLmRlc2NyaXB0aW9uID09PSBcInVuZGVmaW5lZFwiKVxuICAgICAgICBjUGFja2FnZS5kZXNjcmlwdGlvbiA9IFwiXCI7XG4gICAgICBjb25zb2xlLmxvZyhib2R5KTtcbiAgICAgIC8vIGlmIChOdW1iZXIoYm9keS5pc0J1c2luZXNzKSA9PSAxKSB7XG4gICAgICAvLyAgIGNQYWNrYWdlLmhhc09wdCA9IGZhbHNlO1xuICAgICAgLy8gfVxuICAgICAgLy9jUGFja2FnZSA9IHBhY2thZ2VVdGlsLmNhbGN1bGF0ZUZlZXMoY1BhY2thZ2UpO1xuICAgICAgY29uc29sZS5sb2coXCJwYWNrYWdlIHdpdGggZmVlc1wiKTtcblxuICAgICAgLy93ZSBhbHNvIHdhbnQgdG8gY2FsY3VsYXRlIHRoZSB0aGUgcGFja2FnZSBmZWVzIG9uZSB0aW1lLi4uLi4uXG4gICAgICAvL3dlIGhhdmUgdGhlIHBhY2thZ2UgZGV0YWlscyBoZXJlIC4uIG5vdyB3ZSBuZWVkIHRvIGdldCB0aGUgZXhpc3RpbmcgcGFja2FnZVxuXG4gICAgIFxuICAgICAgLy93ZSBuZWVkIHRvIGNoZWNrIHRvIHNlZSBvZiB0aGUgb3duZXIgaXMgYSBidXNpbmVzcyBoZXJlXG4gICAgICBjb25zb2xlLmxvZyhcImhlcmUgYWJvdXQgdG8gZ2V0IHRoZSBwYWNrYWdlXCIpXG4gICAgICBscmVkaXMuZ2V0UGFja2FnZShjUGFja2FnZS50cmFja2luZ05vKS50aGVuKHAgPT4ge1xuICAgICAgICBjb25zb2xlLmxvZygncCBpcyB0aGUgJyxwKTsgXG4gICAgICAgIGlmIChwKSB7XG4gICAgICAgICAgdmFyIGN1cnJlbnRDb250YWluZXIgPSBgbWFuaWZlc3Q6JHtwLm1pZH06JHtwLm10eXBlfToke2NvbnRhaW5lcn06YDtcbiAgICAgICAgICBjb25zb2xlLmxvZyhcImZvdW5kIHBhY2thZ2UgXCIpO1xuICAgICAgICAgIGNvbnNvbGUubG9nKHApO1xuICAgICAgICAgIGlmIChjb250YWluZXIgPT0gXCJiYWdcIikge1xuICAgICAgICAgICAgLy9jaGVjayB0byBzZWUgaWYgdGhlIGJhY2sgbm8gaXMgdGhlIHNhbWUuXG4gICAgICAgICAgICBpZiAocC5iYWcgIT0gY1BhY2thZ2UuYmFnKSB7XG4gICAgICAgICAgICAgIC8vcmVtb3ZlIGl0IGZyb20gdGhlIG9yaWdpbmFsIGxpc3RcbiAgICAgICAgICAgICAgbHJlZGlzLnNyZW0oY3VycmVudENvbnRhaW5lciArIHAuYmFnLCBwLnRyYWNraW5nTm8pO1xuICAgICAgICAgICAgICBjb25zb2xlLmxvZyhcbiAgICAgICAgICAgICAgICBcInJlbW92ZSBwYWNrYWdlIGZyb20gY3VycmVudCBzZXQgXCIgKyBjdXJyZW50Q29udGFpbmVyXG4gICAgICAgICAgICAgICk7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgIC8vY2hlY2sgdG8gc2VlIGlmIHRoZSBza2lkIG51bWJlciBpcyB0aGUgc2FtZS5cbiAgICAgICAgICAgIGlmIChwLnNraWQgIT0gY1BhY2thZ2Uuc2tpZCkge1xuICAgICAgICAgICAgICAvL3JlbW92ZSBpdCBmcm9tIHRoZSBvcmlnaW5hbCBsaXN0XG4gICAgICAgICAgICAgIGxyZWRpcy5zcmVtKGN1cnJlbnRDb250YWluZXIgKyBwLnNraWQsIHAudHJhY2tpbmdObyk7XG4gICAgICAgICAgICAgIGNvbnNvbGUubG9nKFxuICAgICAgICAgICAgICAgIFwicmVtb3ZlIHBhY2thZ2UgZnJvbSBjdXJyZW50IHNldCBcIiArIGN1cnJlbnRDb250YWluZXJcbiAgICAgICAgICAgICAgKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICB9XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgLy8gdGhlIHBhY2thZ2UgZG9lc24ndCBleGlzdCB1cGRhdGUgdGhlIGNvdW50ZXJcbiAgICAgICAgICBscmVkaXMuY2xpZW50LmluY3IoXCJtY291bnRlcjpcIiArIGNQYWNrYWdlLm1pZCk7XG4gICAgICAgICAgXG4gICAgICAgIH1cblxuICAgICAgICBscmVkaXNcbiAgICAgICAgICAuaG1zZXQoXCJwYWNrYWdlczpcIiArIGNQYWNrYWdlLnRyYWNraW5nTm8sIGNQYWNrYWdlKVxuICAgICAgICAgIC50aGVuKGZ1bmN0aW9uKHJlc3VsdCkge1xuICAgICAgICAgICAgLy9hZGQgdG8gcXVldWUgZm9yIHBlcnNpc3RlbnQgcHJvY2Vzc2luZ1xuICAgICAgICAgICAgXG4gICAgICAgICAgICB2YXIgbWFuaWZlc3RLZXkgPSBgbWFuaWZlc3Q6JHtjUGFja2FnZS5taWR9OiR7XG4gICAgICAgICAgICAgIGNQYWNrYWdlLm10eXBlXG4gICAgICAgICAgICB9OiR7Y29udGFpbmVyfToke2NvbnRhaW5lck5vfWA7XG4gICAgICAgICAgICBjb25zb2xlLmxvZyhcImFib3V0IHRvIGNyZWF0ZSB0aGUgZG9jdW1lbnQuLi4uXCIpO1xuICAgICAgICAgICAgYWRkUGFja2FnZVRvSW5kZXgoY1BhY2thZ2UudHJhY2tpbmdObyxzZWFyY2hlcik7IFxuICAgICAgICAgICAgY29uc29sZS5sb2coXCJhZGRlZCB0aGUgcGFja2FnZSB0byBpbmRleFwiKTtcbiAgICAgICAgICAgIGxyZWRpc1xuICAgICAgICAgICAgICAuc2V0QWRkKG1hbmlmZXN0S2V5LCBjUGFja2FnZS50cmFja2luZ05vKVxuICAgICAgICAgICAgICAudGhlbihmdW5jdGlvbihzUmVzdWx0KSB7XG4gICAgICAgICAgICAgICAgLy9nZXQgdGhlIG1lbWJlcnMgb25lIHRpbWUgaGVyZVxuICAgICAgICAgICAgICAgIGNvbnNvbGUubG9nKFwiYWRkZWQgdGhlIHBhY2thZ2UgdG8gdGhlIHNldFwiKTtcbiAgICAgICAgICAgICAgICBjb25zb2xlLmxvZyhtYW5pZmVzdEtleSk7XG4gICAgICAgICAgICAgICAgbHJlZGlzXG4gICAgICAgICAgICAgICAgICAuZ2V0TWVtYmVycyhtYW5pZmVzdEtleSlcbiAgICAgICAgICAgICAgICAgIC50aGVuKGRhdGEgPT4ge1xuICAgICAgICAgICAgICAgICAgICBjb25zb2xlLmxvZyhcImRhdGFcIik7XG4gICAgICAgICAgICAgICAgICAgIGNvbnNvbGUubG9nKGRhdGEpO1xuICAgICAgICAgICAgICAgICAgICBQcm9taXNlLmFsbChkYXRhLm1hcChscmVkaXMuZ2V0UGFja2FnZSkpO1xuICAgICAgICAgICAgICAgICAgfSlcbiAgICAgICAgICAgICAgICAgIC50aGVuKGZ1bmN0aW9uKHJkYXRhKSB7XG4gICAgICAgICAgICAgICAgICAgIC8vd2UgbmVlZCB0byBhbGVydCB0aGUgcGVyc29uIHRoYXQgdGhlIHBhY2thZ2UgaXMgaGVyZSBzbyByZWFkIGVtYWlsIGV0Yy5cbiAgICAgICAgICAgICAgICAgICAgLy9hZGQgdG8gdGhlIGluZGV4XG4gICAgICAgICAgICAgICAgICAgIGNvbnNvbGUubG9nKFwiZGF0YVwiKTtcbiAgICAgICAgICAgICAgICAgICAgY29uc29sZS5sb2cocmRhdGEpO1xuXG4gICAgICAgICAgICAgICAgICAgIHJlc29sdmUoe1xuICAgICAgICAgICAgICAgICAgICAgIHNhdmVkOiB0cnVlLFxuICAgICAgICAgICAgICAgICAgICAgIHBhY2thZ2VzOiByZGF0YSxcbiAgICAgICAgICAgICAgICAgICAgICBzUGFja2FnZTogY1BhY2thZ2VcbiAgICAgICAgICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICAgICAgICB9KVxuICAgICAgICAgICAgICAgICAgLmNhdGNoKGVycjMgPT4ge1xuICAgICAgICAgICAgICAgICAgICBjb25zb2xlLmxvZyhlcnIzKTtcbiAgICAgICAgICAgICAgICAgICAgcmVqZWN0KHtcbiAgICAgICAgICAgICAgICAgICAgICBlcnI6IGVycjMsXG4gICAgICAgICAgICAgICAgICAgICAgc2F2ZWQ6IHRydWUsXG4gICAgICAgICAgICAgICAgICAgICAgbGlzdGluZzogZmFsc2VcbiAgICAgICAgICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICAgICAgICB9KTtcbiAgICAgICAgICAgICAgfSlcbiAgICAgICAgICAgICAgLmNhdGNoKGZ1bmN0aW9uKGVycikge1xuICAgICAgICAgICAgICAgIHJlc29sdmUoe1xuICAgICAgICAgICAgICAgICAgc2F2ZWQ6IGZhbHNlXG4gICAgICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICAgIH0pO1xuICAgICAgICAgIH0pXG4gICAgICAgICAgLmNhdGNoKGZ1bmN0aW9uKGVycjIpIHtcbiAgICAgICAgICAgIHJlamVjdCh7XG4gICAgICAgICAgICAgIHNhdmVkOiBmYWxzZVxuICAgICAgICAgICAgfSk7XG4gICAgICAgICAgfSk7XG5cbiAgICAgICAgLy9zYXZlIHRoZSBwYWNrYWdlIHRvIHRoZSBwYWNrYWdlIE5TXG4gICAgICB9KS5jYXRjaChlcnIyMzI9PntcbiAgICAgICAgY29uc29sZS5sb2coZXJyMjMyKVxuICAgICAgfSk7XG4gICAgfSk7XG4gIH0gXG4gIGdldE1hbmlmZXN0UGFja2FnZXMoKXtcbiAgICByZXR1cm4gbmV3IFByb21pc2UoKHJlc29sdmUscmVqZWN0KT0+e1xuICAgICAgXG4gICAgICB0aGlzLm15U2VhcmNoLnNlYXJjaChcbiAgICAgICAgYEBtaWQ6WzAgMF1gLFxuICAgICAgICB7IG9mZnNldDogMCwgbnVtYmVyT2ZSZXN1bHRzOiA1MDAwIH0sXG4gICAgICAgIChlcnIsIGRhdGEpID0+IHtcbiAgICAgICAgICB2YXIgcGFja2FnZXMgPSBbXTtcbiAgICAgICAgICBjb25zb2xlLmxvZyhkYXRhKTtcbiAgICAgICAgICBkYXRhLnJlc3VsdHMuZm9yRWFjaChlbGVtZW50ID0+IHtcblxuICAgICAgICAgICAgcGFja2FnZXMucHVzaChlbGVtZW50LmRvYyk7XG4gICAgICAgICAgICByZXNvbHZlKHBhY2thZ2VzKTsgICAgICAgICAgICAgICAgIFxuICAgICAgICB9KTtcbiAgICB9KTtcbiAgICB9KVxuICB9XG4gIGdldFJlY2VpdmVkUGFja2FnZXMocGFnZSxwYWdlU2l6ZSl7XG4gICAgcmV0dXJuIG5ldyBQcm9taXNlKChyZXNvbHZlLHJlamVjdCk9PntcbiAgICAgIFxuICAgICAgdGhpcy5teVNlYXJjaC5zZWFyY2goXG4gICAgICAgIGBAbWlkOlswIDBdYCxcbiAgICAgICAgeyBvZmZzZXQ6IDAsIG51bWJlck9mUmVzdWx0czogNTAwMCB9LFxuICAgICAgICAoZXJyLCBkYXRhKSA9PiB7XG4gICAgICAgICAgdmFyIHBhY2thZ2VzID0gW107XG4gICAgICAgICAgY29uc29sZS5sb2coZGF0YSk7XG4gICAgICAgICAgZGF0YS5yZXN1bHRzLmZvckVhY2goZWxlbWVudCA9PiB7XG5cbiAgICAgICAgICAgIHBhY2thZ2VzLnB1c2goZWxlbWVudC5kb2MpO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIFxuICAgICAgICB9KTtcbiAgICAgICAgcmVzb2x2ZShwYWNrYWdlcyk7IFxuICAgIH0pO1xuICAgIH0pXG4gIH1cbiAgZ2V0Tm9Eb2NzUGFja2Fja2FnZXMocGFnZSxwYWdlU2l6ZSl7XG4gICAgcmV0dXJuIG5ldyBQcm9taXNlKChyZXNvbHZlLHJlamVjdCk9PntcbiAgICAgIFxuICAgICAgdGhpcy5teVNlYXJjaC5zZWFyY2goXG4gICAgICAgIGBAaGFzRG9jczpbMCAwXWAsXG4gICAgICAgIHsgb2Zmc2V0OiAwLCBudW1iZXJPZlJlc3VsdHM6IDUwMDAgfSxcbiAgICAgICAgKGVyciwgZGF0YSkgPT4ge1xuICAgICAgICAgIHZhciBwYWNrYWdlcyA9IFtdO1xuICAgICAgICAgIGNvbnNvbGUubG9nKGRhdGEpO1xuICAgICAgICAgIGRhdGEucmVzdWx0cy5mb3JFYWNoKGVsZW1lbnQgPT4ge1xuXG4gICAgICAgICAgICBwYWNrYWdlcy5wdXNoKGVsZW1lbnQuZG9jKTtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBcbiAgICAgICAgfSk7XG4gICAgICAgIHJlc29sdmUocGFja2FnZXMpOyBcbiAgICB9KTtcbiAgICB9KVxuICB9XG4gIGdldFBhY2thZ2VCeUlkKGlkKXtcbiAgICByZXR1cm4gbmV3IFByb21pc2UoKHJlc29sdmUscmVqZWN0KT0+e1xuICAgICAgcmVkaVNlYXJjaC5nZXREb2MoaWQsKGVycixkb2N1bWVudCk9PntcbiAgICAgICAgcmVzb2x2ZShkb2N1bWVudC5kb2MpOyBcbiAgICAgIH0pXG4gICAgfSk7IFxuICB9XG4gIHVwZGF0ZU1hbmlmZXN0UGFja2FnZVRvSW5UcmFuc2l0KG1pZCkge1xuICAgIC8vZ2V0IGFsbCB0aGUgcGFja2FnZXNcbiAgICAvL3dlIG5lZWQgdG8gdXBkYXRlIHRoZSBpbmRleCBhdCB0aGlzIHBvaW50IGFzIHdlbGxcbiAgICB2YXIgbXNlYXJjaCA9IHRoaXMubXlTZWFyY2g7XG4gICAgdGhpcy5teVNlYXJjaC5zZWFyY2goXG4gICAgICBgQG1pZDpbJHttaWR9ICR7bWlkfV1gLFxuICAgICAgeyBvZmZzZXQ6IDAsIG51bWJlck9mUmVzdWx0czogNTAwMCB9LFxuICAgICAgKGVyciwgZGF0YSkgPT4ge1xuICAgICAgICB2YXIgcGFja2FnZXMgPSBbXTtcbiAgICAgICAgY29uc29sZS5sb2coZGF0YSk7XG4gICAgICAgIGRhdGEucmVzdWx0cy5mb3JFYWNoKGVsZW1lbnQgPT4ge1xuICAgICAgICAgIHZhciBvbGREb2NJZCA9IGVsZW1lbnQuZG9jSWQ7XG4gICAgICAgICAgZWxlbWVudC5kb2NJZCA9IGVsZW1lbnQuZG9jSWQucmVwbGFjZShgJHttaWR9LWAsIFwiXCIpO1xuICAgICAgICAgIHBhY2thZ2VzLnB1c2goZWxlbWVudC5kb2NJZCk7XG4gICAgICAgICAgLy8gaSBjb3VsZCBkZWxldGUgaGVyZVxuICAgICAgICAgIC8vIG1zZWFyY2guZGVsRG9jdW1lbnQoUEtHX0lEWCxvbGREb2NJZClcbiAgICAgICAgICAvL3VwZGF0ZSBhbGwgdGhlIHBhY2thZ2VzXG4gICAgICAgIH0pO1xuICAgICAgICBzZXRQYWNrYWdlSW5UcmFuc2l0KHBhY2thZ2VzLCBtc2VhcmNoLCBtaWQpLnRoZW4oZnVuY3Rpb24oXG4gICAgICAgICAgdXBkYXRlZFBhY2thZ2VzXG4gICAgICAgICkge1xuICAgICAgICAgIGNvbnNvbGUubG9nKFwidXBkYXRlZCBwYWNrYWdlc1wiKTtcbiAgICAgICAgICBjb25zb2xlLmxvZyh1cGRhdGVkUGFja2FnZXMpO1xuICAgICAgICB9KTtcbiAgICAgIH1cbiAgICApO1xuICB9XG4gIHJlbW92ZVBhY2thZ2UodHJhY2tpbmdObywgbWlkKSB7XG4gICAgdmFyIG1zZWFyY2ggPSB0aGlzLm15U2VhcmNoO1xuICAgIHJldHVybiBuZXcgUHJvbWlzZSgocmVzb2x2ZSwgcmVqZWN0KSA9PiB7XG4gICAgICB2YXIgbWFuaWZlc3QgPSBtaWQ7XG4gICAgICB2YXIgbWFuaWZlc3RLZXkgPSBcIm1hbmlmZXN0OlwiICsgbWFuaWZlc3QgKyBcIjoqXCI7XG5cbiAgICAgIGxyZWRpcy5kZWwoXCJwYWNrYWdlczpcIiArIHRyYWNraW5nTm8pLnRoZW4oZnVuY3Rpb24ocmVzdWx0KSB7XG4gICAgICAgIGNvbnNvbGUubG9nKHJlc3VsdCk7XG4gICAgICAgIG1zZWFyY2guZGVsRG9jdW1lbnQoUEtHX0lEWCwgYCR7bWlkfS0ke3RyYWNraW5nTm99YCk7XG4gICAgICAgIC8vd2UgbmVlZCB0byByZW1vdmUgZnJvbSB0aGUgaW5kZXggYW5kIGRlYyB0aGUgY291bnRlclxuICAgICAgICBscmVkaXMuY2xpZW50LmRlY3IoXCJtY291bnRlcjpcIiArIG1pZCk7XG4gICAgICAgIC8vclNlcnZpY2VzLnBhY2thZ2VTZXJ2aWNlLnJtUGFja2FnZShtaWQsIHRyYWNraW5nTm8pO1xuICAgICAgICBscmVkaXMuZ2V0S2V5cyhtYW5pZmVzdEtleSkudGhlbihrUmVzdWx0ID0+IHtcbiAgICAgICAgICAvL3RoZSBsaXN0IG9mIGFsbCB0aGUgc2V0cyAuLi53ZSBuZWVkIHRvIHJlbW92ZSB0aGUga2V5IGZyb20gZWFjaCBvbmVcbiAgICAgICAgICB2YXIga2V5c0NvdW50ID0gMDtcblxuICAgICAgICAgIGtSZXN1bHQuZm9yRWFjaChlbGVtZW50ID0+IHtcbiAgICAgICAgICAgIGNvbnNvbGUubG9nKFxuICAgICAgICAgICAgICBgcmVtb3ZpbmcgJHt0cmFja2luZ05vfSBwYWNrYWdlIG1hbmlmZXN0IHNldCAke2VsZW1lbnR9IGBcbiAgICAgICAgICAgICk7XG4gICAgICAgICAgICBscmVkaXMuc3JlbShlbGVtZW50LCB0cmFja2luZ05vKS50aGVuKGZ1bmN0aW9uKHJSZXN1bHQpIHtcbiAgICAgICAgICAgICAgY29uc29sZS5sb2coclJlc3VsdCk7XG4gICAgICAgICAgICAgIGNvbnNvbGUubG9nKFwicmVtb3ZlZFwiKTtcbiAgICAgICAgICAgICAgaWYgKGtleXNDb3VudCA9PSBrUmVzdWx0Lmxlbmd0aCAtIDEpIGtleXNDb3VudCsrO1xuICAgICAgICAgICAgfSk7XG4gICAgICAgICAgfSk7XG4gICAgICAgICAgcmVzb2x2ZSh7XG4gICAgICAgICAgICBkZWxldGVkOiB0cnVlXG4gICAgICAgICAgfSk7XG4gICAgICAgIH0pO1xuXG4gICAgICAgIC8vd2UgYWxzbyBuZWVkIHRvIHJlbW92ZSBmcm9tIGFueSBzZXRzXG4gICAgICB9KTtcbiAgICB9KTtcbiAgfVxuICByZW1vdmVQYWNrYWdlQnlJZChpZCkge1xuICAgIHZhciBtc2VhcmNoID0gdGhpcy5teVNlYXJjaDtcbiAgICByZXR1cm4gbmV3IFByb21pc2UoKHJlc29sdmUsIHJlamVjdCkgPT4ge1xuICAgIFxuICAgICAgcmVkaVNlYXJjaC5kZWxEb2N1bWVudChQS0dfSURYLGlkLChlcnIscmVzcG9uc2UpPT57XG4gICAgICAgIHJlc29sdmUoe2RlbGV0ZWQ6dHJ1ZX0pXG4gICAgICB9KVxuICAgICAgXG4gICAgICAgIFxuICAgICAgXG4gICAgfSk7XG4gIH1cbiAgc3RvcmVQYWNrYWdlRm9yUGlja3VwKHRyYWNraW5nTm8sYmluKXtcbiAgICB2YXIgc2VhcmNoZXIgPSB0aGlzLm15U2VhcmNoO1xuICAgIHJldHVybiBuZXcgUHJvbWlzZSgocmVzb2x2ZSxyZWplY3QpPT57XG4gICAgICAgbHJlZGlzLmhtc2V0KFBLR19QUkVGSVgrdHJhY2tpbmdObyx7c3RhdHVzOjQsbG9jYXRpb246YmlufSkudGhlbigocmVzdWx0KT0+e1xuICAgICAgICAgbHJlZGlzLmdldFBhY2thZ2UodHJhY2tpbmdObykudGhlbigocGtnKT0+e1xuICAgICAgICAgIGFkZFBhY2thZ2VUb0luZGV4KHRyYWNraW5nTm8sc2VhcmNoZXIpIDsgXG4gICAgICAgICAgcmVzb2x2ZShwa2cpOyAgIFxuICAgICAgICAgfSk7XG4gICAgICAgfSkgXG4gICAgfSk7IFxuICB9XG4gIHVwZGF0ZVBhY2thZ2VJbmRleCh0cmFja2luZyl7XG4gICAgICByZXR1cm4gbmV3IFByb21pc2UoKHJlc29sdmUscmVqZWN0KT0+e1xuICAgICAgICAgIHZhciBtc2VhcmNoID0gdGhpcy5teVNlYXJjaDsgXG4gICAgICAgICAgYWRkUGFja2FnZVRvSW5kZXgodHJhY2tpbmcsbXNlYXJjaCk7IFxuICAgICAgICAgcmVzb2x2ZSh7J3VwZGF0ZWQnOnRydWV9KTtcbiAgICAgIH0pXG4gIH1cbiAgZ2V0Q3VzdG9tZXJQYWNrYWdlcyhza3lib3gpIHt9XG4gIGdldE1hbmlmZXN0UGFja2FnZXNCeVN0YXR1cyhtaWQsc3RhdHVzKSB7XG4gICAgICByZXR1cm4gbmV3IFByb21pc2UoKHJlc29sdmUscmVqZWN0KT0+e1xuICAgICAgICAgIGNvbnNvbGUubG9nKGBAbWlkOlske21pZH0gJHttaWR9XSBAc3RhdHVzPVske3N0YXR1c30gJHtzdGF0dXN9XWApXG4gICAgICAgIHRoaXMubXlTZWFyY2guc2VhcmNoKFxuICAgICAgICAgICAgYEBtaWQ6WyR7bWlkfSAke21pZH1dIEBzdGF0dXM6WyR7c3RhdHVzfSAke3N0YXR1c31dYCxcbiAgICAgICAgICAgIHsgb2Zmc2V0OiAwLCBudW1iZXJPZlJlc3VsdHM6IDUwMDAgfSxcbiAgICAgICAgICAgIChlcnIsIGRhdGEpID0+IHtcbiAgICAgICAgICAgICAgdmFyIHBhY2thZ2VzID0gW107XG4gICAgICAgICAgICAgIGNvbnNvbGUubG9nKGRhdGEpO1xuICAgICAgICAgICAgICBkYXRhLnJlc3VsdHMuZm9yRWFjaChlbGVtZW50ID0+IHtcblxuICAgICAgICAgICAgICAgIHBhY2thZ2VzLnB1c2goZWxlbWVudC5kb2MpO1xuICAgICAgICAgICAgICAgIHJlc29sdmUocGFja2FnZXMpOyAgICAgICAgICAgICAgICAgXG4gICAgICAgICAgICB9KTtcbiAgICAgICAgfSk7XG4gICAgICB9KTtcbiAgXG4gIH0gICAgIFxufVxuIl19
