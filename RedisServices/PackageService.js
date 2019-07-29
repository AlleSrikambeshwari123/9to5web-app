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
    trackingNo: tPackage.trackingNo,
    skybox: tPackage.skybox,
    dateRecieved: moment().unix(),
    awb: 0,
    mid: 0,
    volume: getPackageVolumne(tPackage),
    customer: tPackage.customer,
    shipper: tPackage.shipper,
    description: tPackage.description,
    dimenions: tPackage.dimensions,
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
      var _this = this;

      return new Promise(function (resolve, reject) {
        var msearch = _this.mySearch;
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
      var _this2 = this;

      return new Promise(function (resolve, reject) {
        console.log("@mid:[" + mid + " " + mid + "] @status=[" + status + " " + status + "]");
        _this2.mySearch.search("@mid:[" + mid + " " + mid + "] @status:[" + status + " " + status + "]", { offset: 0, numberOfResults: 5000 }, function (err, data) {
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
//# sourceMappingURL=data:application/json;charset=utf8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIlJlZGlzU2VydmljZXMvUGFja2FnZVNlcnZpY2UuZXM2Il0sIm5hbWVzIjpbInJlZGlzIiwicmVxdWlyZSIsImxyZWRpcyIsIm1vbWVudCIsInJlZGlzU2VhcmNoIiwiZnMiLCJQYWNrYWdlVXRpbCIsIlBhY2thZ2VVdGlsaXR5IiwicGFja2FnZVV0aWwiLCJQS0dfSURYIiwiUEtHX0lEX0NPVU5URVIiLCJkYXRhQ29udGV4dCIsIlBLR19QUkVGSVgiLCJQS0dfU1RBVFVTIiwicmVkaVNlYXJjaCIsImNsaWVudE9wdGlvbnMiLCJzZWFyY2hDbGllbnREZXRhaWxzIiwiZ2V0UGFja2FnZVZvbHVtbmUiLCJtUGFja2FnZSIsImNyZWF0ZURvY3VtZW50IiwidFBhY2thZ2UiLCJwYWNrYWdlRG9jdW1lbnQiLCJ0cmFja2luZ05vIiwic2t5Ym94IiwiZGF0ZVJlY2lldmVkIiwidW5peCIsImF3YiIsIm1pZCIsInZvbHVtZSIsImN1c3RvbWVyIiwic2hpcHBlciIsImRlc2NyaXB0aW9uIiwiZGltZW5pb25zIiwiZGltZW5zaW9ucyIsInN0YXR1cyIsInZhbHVlIiwiY29uc29sZSIsImxvZyIsInNldFBhY2thZ2VJblRyYW5zaXQiLCJrZXlzIiwibXNlYXJjaGVyIiwiUHJvbWlzZSIsInJlc29sdmUiLCJyZWplY3QiLCJiYXRjaGVyIiwiY2xpZW50IiwiYmF0Y2giLCJmb3JFYWNoIiwibG9jYXRpb24iLCJlbGVtZW50IiwiaG1zZXQiLCJleGVjIiwiZXJyIiwicmVzdWx0IiwiYWRkUGFja2FnZVRvSW5kZXgiLCJnZXRQYWNrYWdlIiwidGhlbiIsImRlbERvY3VtZW50IiwicGFjayIsImRvbmUiLCJkb2N1bWVudCIsImFkZCIsIlBhY2thZ2VTZXJ2aWNlIiwic2V0dXBJbmRleCIsIm15U2VhcmNoIiwiYm9keSIsImNQYWNrYWdlIiwicmVwbGFjZSIsInRyaW0iLCJ0cmFja2luZyIsImNhcnJpZXIiLCJOdW1iZXIiLCJwaWVjZXMiLCJ3ZWlnaHQiLCJyZWRpc0NsaWVudCIsImluY3IiLCJpZCIsInNldCIsInJlc3BvbnNlIiwic2F2ZWQiLCJpbmRleFBhY2thZ2UiLCJlcnIxIiwiZG9jUmVzdWx0Iiwic2VhcmNoZXIiLCJkdXR5UGVyY2VudCIsImhhc09wdCIsInAiLCJjdXJyZW50Q29udGFpbmVyIiwibXR5cGUiLCJjb250YWluZXIiLCJiYWciLCJzcmVtIiwic2tpZCIsIm1hbmlmZXN0S2V5IiwiY29udGFpbmVyTm8iLCJzZXRBZGQiLCJzUmVzdWx0IiwiZ2V0TWVtYmVycyIsImRhdGEiLCJhbGwiLCJtYXAiLCJyZGF0YSIsInBhY2thZ2VzIiwic1BhY2thZ2UiLCJjYXRjaCIsImVycjMiLCJsaXN0aW5nIiwiZXJyMiIsImVycjIzMiIsIm1zZWFyY2giLCJzZWFyY2giLCJvZmZzZXQiLCJudW1iZXJPZlJlc3VsdHMiLCJyZXN1bHRzIiwib2xkRG9jSWQiLCJkb2NJZCIsInB1c2giLCJ1cGRhdGVkUGFja2FnZXMiLCJtYW5pZmVzdCIsImRlbCIsImRlY3IiLCJnZXRLZXlzIiwia2V5c0NvdW50Iiwia1Jlc3VsdCIsInJSZXN1bHQiLCJsZW5ndGgiLCJkZWxldGVkIiwiYmluIiwicGtnIiwiZG9jIl0sIm1hcHBpbmdzIjoiOzs7Ozs7Ozs7QUFBQTs7Ozs7O0FBR0EsSUFBSUEsUUFBUUMsUUFBUSxPQUFSLENBQVo7QUFDQSxJQUFJQyxTQUFTRCxRQUFRLGVBQVIsQ0FBYjtBQUNBLElBQUlFLFNBQVNGLFFBQVEsUUFBUixDQUFiO0FBQ0EsSUFBSUcsY0FBY0gsUUFBUSxxQkFBUixDQUFsQjtBQUNBLElBQUlJLEtBQUtKLFFBQVEsSUFBUixDQUFUOztBQUVBLElBQUlLLGNBQWNMLFFBQVEscUJBQVIsRUFBK0JNLGNBQWpEO0FBQ0EsSUFBSUMsY0FBYyxJQUFJRixXQUFKLEVBQWxCO0FBQ0EsSUFBTUcsVUFBVSxnQkFBaEI7QUFDQSxJQUFNQyxpQkFBaUIsWUFBdkI7QUFDQSxJQUFJQyxjQUFjVixRQUFRLGVBQVIsQ0FBbEI7QUFDQSxJQUFNVyxhQUFhLFdBQW5CO0FBQ0Es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b0JBLEdBRHBCLG1CQUNxQ08sTUFEckMsU0FDK0NBLE1BRC9DLFFBRUksRUFBRTZFLFFBQVEsQ0FBVixFQUFhQyxpQkFBaUIsSUFBOUIsRUFGSixFQUdJLFVBQUM1RCxHQUFELEVBQU04QyxJQUFOLEVBQWU7QUFDYixjQUFJSSxXQUFXLEVBQWY7QUFDQWxFLGtCQUFRQyxHQUFSLENBQVk2RCxJQUFaO0FBQ0FBLGVBQUtlLE9BQUwsQ0FBYWxFLE9BQWIsQ0FBcUIsbUJBQVc7O0FBRTlCdUQscUJBQVNjLElBQVQsQ0FBY25FLFFBQVFnRixHQUF0QjtBQUNBdkYsb0JBQVE0RCxRQUFSO0FBQ0gsV0FKQztBQUtMLFNBWEQ7QUFZRCxPQWRNLENBQVA7QUFnQkgiLCJmaWxlIjoiUmVkaXNTZXJ2aWNlcy9QYWNrYWdlU2VydmljZS5qcyIsInNvdXJjZXNDb250ZW50IjpbImltcG9ydCB7IGNwdXMgfSBmcm9tIFwib3NcIjtcblxuXG52YXIgcmVkaXMgPSByZXF1aXJlKFwicmVkaXNcIik7XG52YXIgbHJlZGlzID0gcmVxdWlyZShcIi4vcmVkaXMtbG9jYWxcIik7XG52YXIgbW9tZW50ID0gcmVxdWlyZShcIm1vbWVudFwiKTtcbnZhciByZWRpc1NlYXJjaCA9IHJlcXVpcmUoXCIuLi9yZWRpc2VhcmNoY2xpZW50XCIpO1xudmFyIGZzID0gcmVxdWlyZShcImZzXCIpO1xuXG52YXIgUGFja2FnZVV0aWwgPSByZXF1aXJlKFwiLi4vVXRpbC9wYWNrYWdldXRpbFwiKS5QYWNrYWdlVXRpbGl0eTtcbnZhciBwYWNrYWdlVXRpbCA9IG5ldyBQYWNrYWdlVXRpbCgpO1xuY29uc3QgUEtHX0lEWCA9IFwiaW5kZXg6cGFja2FnZXNcIjtcbmNvbnN0IFBLR19JRF9DT1VOVEVSID0gXCJwYWNrYWdlOmlkXCI7XG52YXIgZGF0YUNvbnRleHQgPSByZXF1aXJlKCcuL2RhdGFDb250ZXh0JylcbmNvbnN0IFBLR19QUkVGSVggPSBcInBhY2thZ2VzOlwiO1xuY29uc3QgUEtHX1NUQVRVUyA9IHsgXG4gIDEgOiBcIlJlY2VpdmVkXCIsXG4gIDI6IFwiSW4gVHJhbnNpdFwiLFxuICAzOiBcIlByb2Nlc3NpbmdcIixcbiAgNDogXCJSZWFkeSBmb3IgUGlja3VwIC8gRGVsaXZlcnlcIixcbiAgNTogXCJPdXQgZm9yIERlbGl2ZXJ5XCIsXG4gIDY6IFwiRGVsaXZlcmVkXCJcblxufTsgXG5cbmNvbnN0IHJlZGlTZWFyY2ggPSByZWRpc1NlYXJjaChyZWRpcywgUEtHX0lEWCwge1xuICBjbGllbnRPcHRpb25zOiBscmVkaXMuc2VhcmNoQ2xpZW50RGV0YWlsc1xufSk7XG5mdW5jdGlvbiBnZXRQYWNrYWdlVm9sdW1uZShtUGFja2FnZSl7XG5cbiAgcmV0dXJuIDA7IFxufVxuZnVuY3Rpb24gY3JlYXRlRG9jdW1lbnQodFBhY2thZ2UpIHtcbiAgdmFyIHBhY2thZ2VEb2N1bWVudCA9IHtcbiAgICB0cmFja2luZ05vOiB0UGFja2FnZS50cmFja2luZ05vLFxuICAgIHNreWJveDogdFBhY2thZ2Uuc2t5Ym94LFxuICAgIGRhdGVSZWNpZXZlZCA6IG1vbWVudCgpLnVuaXgoKSwgXG4gICAgYXdiOjAsIFxuICAgIG1pZDowLFxuICAgIHZvbHVtZTogZ2V0UGFja2FnZVZvbHVtbmUodFBhY2thZ2UpLFxuICAgIGN1c3RvbWVyOiB0UGFja2FnZS5jdXN0b21lcixcbiAgICBzaGlwcGVyOiB0UGFja2FnZS5zaGlwcGVyLFxuICAgIGRlc2NyaXB0aW9uOiB0UGFja2FnZS5kZXNjcmlwdGlvbixcbiAgICBkaW1lbmlvbnM6dFBhY2thZ2UuZGltZW5zaW9ucyxcbiAgICAvL3NreWJveFY6IHRQYWNrYWdlLnNreWJveCwgYWRkIGRpbWVuaW9uIFxuICAgIHN0YXR1czogdFBhY2thZ2Uuc3RhdHVzLFxuICAgIG1pZDogdFBhY2thZ2UubWlkLFxuICAgIHZhbHVlOiB0UGFja2FnZS52YWx1ZSxcbiAgICBcbiAgfTtcbiAgY29uc29sZS5sb2coXCJhYm91dCB0byBhZGQgdGhlIHBhY2thZ2UgdG8gdGhlIGluZGV4XCIpO1xuICByZXR1cm4gcGFja2FnZURvY3VtZW50O1xufVxuZnVuY3Rpb24gc2V0UGFja2FnZUluVHJhbnNpdChrZXlzLCBtc2VhcmNoZXIpIHtcbiAgcmV0dXJuIG5ldyBQcm9taXNlKChyZXNvbHZlLCByZWplY3QpID0+IHtcbiAgICB2YXIgYmF0Y2hlciA9IG1zZWFyY2hlci5jbGllbnQuYmF0Y2goKTtcbiAgICBrZXlzLmZvckVhY2goZWxlbWVudCA9PiB7XG4gICAgICB2YXIgdmFsdWUgPSB7XG4gICAgICAgIHN0YXR1czogMixcbiAgICAgICAgbG9jYXRpb246IFwiSW4gVHJhbnNpdFwiXG4gICAgICB9O1xuICAgICAgY29uc29sZS5sb2coZWxlbWVudCArIFwiaXMgdGhlIGVsZW1lbnRcIik7XG5cbiAgICAgIGJhdGNoZXIuaG1zZXQoUEtHX1BSRUZJWCArIGVsZW1lbnQsIHZhbHVlKTtcbiAgICB9KTtcbiAgICBiYXRjaGVyLmV4ZWMoKGVyciwgcmVzdWx0KSA9PiB7XG4gICAgICBjb25zb2xlLmxvZyhyZXN1bHQpO1xuICAgICAgLy9yZWFkZCB0aGUgZG9jdW1lbnRzIGhlcmVcbiAgICAgIGtleXMuZm9yRWFjaChlbGVtZW50ID0+IHtcbiAgICAgICAgYWRkUGFja2FnZVRvSW5kZXgoZWxlbWVudCwgbXNlYXJjaGVyKTtcbiAgICAgIH0pO1xuICAgICAgcmVzb2x2ZShyZXN1bHQpO1xuICAgIH0pO1xuICB9KTtcbn1cblxuZnVuY3Rpb24gYWRkUGFja2FnZVRvSW5kZXgodHJhY2tpbmdObywgbXNlYXJjaGVyKSB7XG4gIGxyZWRpcy5nZXRQYWNrYWdlKHRyYWNraW5nTm8pLnRoZW4ocGFjayA9PiB7XG4gICAgbXNlYXJjaGVyLmRlbERvY3VtZW50KFBLR19JRFgsIGAke3BhY2subWlkfS0ke3RyYWNraW5nTm99YCwgKGVyciwgZG9uZSkgPT4ge1xuICAgICAgdmFyIGRvY3VtZW50ID0gY3JlYXRlRG9jdW1lbnQocGFjayk7XG4gICAgICBjb25zb2xlLmxvZyhcInJlYWRkaW5nIHBhY2thZ2UgdG8gdGhlIGluZGV4IGxpa2UgYSBib3NzIFwiICsgdHJhY2tpbmdObyk7XG4gICAgICBtc2VhcmNoZXIuYWRkKHBhY2subWlkICsgXCItXCIgKyBwYWNrLnRyYWNraW5nTm8sIGRvY3VtZW50KTtcbiAgICB9KTtcbiAgfSk7XG59XG5leHBvcnQgY2xhc3MgUGFja2FnZVNlcnZpY2Uge1xuICBjb25zdHJ1Y3RvcigpIHtcbiAgICB0aGlzLnNldHVwSW5kZXgoKTtcbiAgfVxuICBzZXR1cEluZGV4KCkge1xuICAgIHRoaXMubXlTZWFyY2ggPSByZWRpc1NlYXJjaChyZWRpcywgUEtHX0lEWCwge1xuICAgICAgY2xpZW50T3B0aW9uczogbHJlZGlzLnNlYXJjaENsaWVudERldGFpbHNcbiAgICB9KTtcbiAgfVxuICBzYXZlUGFja2FnZShib2R5KXtcbiAgICByZXR1cm4gbmV3IFByb21pc2UoKHJlc29sdmUscmVqZWN0KT0+e1xuICAgICAgdmFyIGNQYWNrYWdlID0ge1xuICAgICAgICBza3lib3g6IGJvZHkuc2t5Ym94LFxuICAgICAgICBjdXN0b21lcjogYm9keS5jdXN0b21lci5yZXBsYWNlKFwiLVwiLCBcIlwiKS50cmltKCksXG4gICAgICAgIHRyYWNraW5nTm86IGJvZHkudHJhY2tpbmcsXG4gICAgICAgIGRlc2NyaXB0aW9uOiBib2R5LmRlc2NyaXB0aW9uLFxuICAgICAgICBzaGlwcGVyOiBib2R5LnNoaXBwZXIsXG4gICAgICAgIGNhcnJpZXI6Ym9keS5jYXJyaWVyLFxuICAgICAgICB2YWx1ZTogTnVtYmVyKGJvZHkudmFsdWUpLFxuICAgICAgICBwaWVjZXM6IE51bWJlcihib2R5LnBpZWNlcyksXG4gICAgICAgIHdlaWdodDogTnVtYmVyKGJvZHkud2VpZ2h0KSxcbiAgICAgICAgZGltZW5zaW9uczogYm9keS5kaW1lbnNpb25zLFxuICAgICAgICBzdGF0dXM6IDEsXG4gICAgICAgIGxvY2F0aW9uOiBcIkZMTFwiLFxuICAgICAgICBtaWQ6IDAsXG4gICAgICAgIGF3YjowLFxuICAgICAgICAvL2hhc09wdDogdHJ1ZSxcbiAgICAgICAgLy9tdHlwZTogYm9keS5tdHlwZVxuICAgICAgfTtcbiAgICAgIC8vdmFsaWRhdGUgdGhlIHBhY2thZ2UgXG4gICAgICBkYXRhQ29udGV4dC5yZWRpc0NsaWVudC5pbmNyKFBLR19JRF9DT1VOVEVSLChlcnIsaWQpPT57XG4gICAgICAgIGNQYWNrYWdlLmlkID0gaWQ7IFxuICAgICAgICBkYXRhQ29udGV4dC5yZWRpc0NsaWVudC5zZXQoUEtHX1BSRUZJWCtpZCxjUGFja2FnZSwoZXJyLHJlc3BvbnNlKT0+e1xuICAgICAgICAgIGlmIChlcnIpe1xuICAgICAgICAgICAgcmVqZWN0KHtzYXZlZDpmYWxzZSxlcnI6ZXJyfSlcbiAgICAgICAgICB9XG4gICAgICAgICAgIHZhciBpbmRleFBhY2thZ2UgPSAgY3JlYXRlRG9jdW1lbnQoY1BhY2thZ2UpOyBcbiAgICAgICAgICAgY29uc29sZS5sb2coaW5kZXhQYWNrYWdlKTsgXG4gICAgICAgICAgIHJlZGlTZWFyY2guYWRkKGNQYWNrYWdlLmlkLGluZGV4UGFja2FnZSwoZXJyMSxkb2NSZXN1bHQpPT57XG4gICAgICAgICAgICAgY29uc29sZS5sb2coZG9jUmVzdWx0KTsgXG4gICAgICAgICAgICAgaWYoZXJyMSl7XG4gICAgICAgICAgICAgICByZWplY3Qoe3NhdmVkOmZhbHNlLGVycjplcnIxfSlcbiAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgcmVzb2x2ZSh7c2F2ZWQ6dHJ1ZX0pXG4gICAgICAgICAgIH0pXG5cbiAgICAgICAgfSlcbiAgICAgIH0pO1xuICAgIFxuXG5cbiAgICB9KVxuICB9XG4gIHNhdmVQYWNrYWdlT2xkKGJvZHkpIHtcbiAgICBcbiAgICB2YXIgc2VhcmNoZXIgPSB0aGlzLm15U2VhcmNoOyBcbiAgICByZXR1cm4gbmV3IFByb21pc2UoKHJlc29sdmUsIHJlamVjdCkgPT4ge1xuICAgICAgdmFyIGNQYWNrYWdlID0ge1xuICAgICAgICBza3lib3g6IGJvZHkuc2t5Ym94LFxuICAgICAgICBjdXN0b21lcjogYm9keS5jdXN0b21lci5yZXBsYWNlKFwiLVwiLCBcIlwiKS50cmltKCksXG4gICAgICAgIHRyYWNraW5nTm86IGJvZHkudHJhY2tpbmcsXG4gICAgICAgIGR1dHlQZXJjZW50OiAwLjIsXG4gICAgICAgIGRlc2NyaXB0aW9uOiBib2R5LmRlc2NyaXB0aW9uLFxuICAgICAgICBzaGlwcGVyOiBib2R5LnNoaXBwZXIsXG4gICAgICAgIHZhbHVlOiBOdW1iZXIoYm9keS52YWx1ZSksXG4gICAgICAgIHBpZWNlczogTnVtYmVyKGJvZHkucGllY2VzKSxcbiAgICAgICAgd2VpZ2h0OiBOdW1iZXIoYm9keS53ZWlnaHQpLFxuICAgICAgICBzdGF0dXM6IDEsXG4gICAgICAgIGxvY2F0aW9uOiBcIkZMTFwiLFxuICAgICAgICBtaWQ6IGJvZHkubWlkLFxuICAgICAgICBoYXNPcHQ6IHRydWUsXG4gICAgICAgIC8vbXR5cGU6IGJvZHkubXR5cGVcbiAgICAgIH07XG4gICAgICBjb25zb2xlLmxvZyhcImFib3V0IHRvIHNhdmUgdGhlIHBhY2thZ2VcIik7XG4gICAgICBpZiAodHlwZW9mIGNQYWNrYWdlLnNoaXBwZXIgPT09IFwidW5kZWZpbmVkXCIpIGNQYWNrYWdlLnNoaXBwZXIgPSBcIlwiO1xuICAgICAgaWYgKHR5cGVvZiBjUGFja2FnZS5kZXNjcmlwdGlvbiA9PT0gXCJ1bmRlZmluZWRcIilcbiAgICAgICAgY1BhY2thZ2UuZGVzY3JpcHRpb24gPSBcIlwiO1xuICAgICAgY29uc29sZS5sb2coYm9keSk7XG4gICAgICAvLyBpZiAoTnVtYmVyKGJvZHkuaXNCdXNpbmVzcykgPT0gMSkge1xuICAgICAgLy8gICBjUGFja2FnZS5oYXNPcHQgPSBmYWxzZTtcbiAgICAgIC8vIH1cbiAgICAgIC8vY1BhY2thZ2UgPSBwYWNrYWdlVXRpbC5jYWxjdWxhdGVGZWVzKGNQYWNrYWdlKTtcbiAgICAgIGNvbnNvbGUubG9nKFwicGFja2FnZSB3aXRoIGZlZXNcIik7XG5cbiAgICAgIC8vd2UgYWxzbyB3YW50IHRvIGNhbGN1bGF0ZSB0aGUgdGhlIHBhY2thZ2UgZmVlcyBvbmUgdGltZS4uLi4uLlxuICAgICAgLy93ZSBoYXZlIHRoZSBwYWNrYWdlIGRldGFpbHMgaGVyZSAuLiBub3cgd2UgbmVlZCB0byBnZXQgdGhlIGV4aXN0aW5nIHBhY2thZ2VcblxuICAgICBcbiAgICAgIC8vd2UgbmVlZCB0byBjaGVjayB0byBzZWUgb2YgdGhlIG93bmVyIGlzIGEgYnVzaW5lc3MgaGVyZVxuICAgICAgY29uc29sZS5sb2coXCJoZXJlIGFib3V0IHRvIGdldCB0aGUgcGFja2FnZVwiKVxuICAgICAgbHJlZGlzLmdldFBhY2thZ2UoY1BhY2thZ2UudHJhY2tpbmdObykudGhlbihwID0+IHtcbiAgICAgICAgY29uc29sZS5sb2coJ3AgaXMgdGhlICcscCk7IFxuICAgICAgICBpZiAocCkge1xuICAgICAgICAgIHZhciBjdXJyZW50Q29udGFpbmVyID0gYG1hbmlmZXN0OiR7cC5taWR9OiR7cC5tdHlwZX06JHtjb250YWluZXJ9OmA7XG4gICAgICAgICAgY29uc29sZS5sb2coXCJmb3VuZCBwYWNrYWdlIFwiKTtcbiAgICAgICAgICBjb25zb2xlLmxvZyhwKTtcbiAgICAgICAgICBpZiAoY29udGFpbmVyID09IFwiYmFnXCIpIHtcbiAgICAgICAgICAgIC8vY2hlY2sgdG8gc2VlIGlmIHRoZSBiYWNrIG5vIGlzIHRoZSBzYW1lLlxuICAgICAgICAgICAgaWYgKHAuYmFnICE9IGNQYWNrYWdlLmJhZykge1xuICAgICAgICAgICAgICAvL3JlbW92ZSBpdCBmcm9tIHRoZSBvcmlnaW5hbCBsaXN0XG4gICAgICAgICAgICAgIGxyZWRpcy5zcmVtKGN1cnJlbnRDb250YWluZXIgKyBwLmJhZywgcC50cmFja2luZ05vKTtcbiAgICAgICAgICAgICAgY29uc29sZS5sb2coXG4gICAgICAgICAgICAgICAgXCJyZW1vdmUgcGFja2FnZSBmcm9tIGN1cnJlbnQgc2V0IFwiICsgY3VycmVudENvbnRhaW5lclxuICAgICAgICAgICAgICApO1xuICAgICAgICAgICAgfVxuICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAvL2NoZWNrIHRvIHNlZSBpZiB0aGUgc2tpZCBudW1iZXIgaXMgdGhlIHNhbWUuXG4gICAgICAgICAgICBpZiAocC5za2lkICE9IGNQYWNrYWdlLnNraWQpIHtcbiAgICAgICAgICAgICAgLy9yZW1vdmUgaXQgZnJvbSB0aGUgb3JpZ2luYWwgbGlzdFxuICAgICAgICAgICAgICBscmVkaXMuc3JlbShjdXJyZW50Q29udGFpbmVyICsgcC5za2lkLCBwLnRyYWNraW5nTm8pO1xuICAgICAgICAgICAgICBjb25zb2xlLmxvZyhcbiAgICAgICAgICAgICAgICBcInJlbW92ZSBwYWNrYWdlIGZyb20gY3VycmVudCBzZXQgXCIgKyBjdXJyZW50Q29udGFpbmVyXG4gICAgICAgICAgICAgICk7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgfVxuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgIC8vIHRoZSBwYWNrYWdlIGRvZXNuJ3QgZXhpc3QgdXBkYXRlIHRoZSBjb3VudGVyXG4gICAgICAgICAgbHJlZGlzLmNsaWVudC5pbmNyKFwibWNvdW50ZXI6XCIgKyBjUGFja2FnZS5taWQpO1xuICAgICAgICAgIFxuICAgICAgICB9XG5cbiAgICAgICAgbHJlZGlzXG4gICAgICAgICAgLmhtc2V0KFwicGFja2FnZXM6XCIgKyBjUGFja2FnZS50cmFja2luZ05vLCBjUGFja2FnZSlcbiAgICAgICAgICAudGhlbihmdW5jdGlvbihyZXN1bHQpIHtcbiAgICAgICAgICAgIC8vYWRkIHRvIHF1ZXVlIGZvciBwZXJzaXN0ZW50IHByb2Nlc3NpbmdcbiAgICAgICAgICAgIFxuICAgICAgICAgICAgdmFyIG1hbmlmZXN0S2V5ID0gYG1hbmlmZXN0OiR7Y1BhY2thZ2UubWlkfToke1xuICAgICAgICAgICAgICBjUGFja2FnZS5tdHlwZVxuICAgICAgICAgICAgfToke2NvbnRhaW5lcn06JHtjb250YWluZXJOb31gO1xuICAgICAgICAgICAgY29uc29sZS5sb2coXCJhYm91dCB0byBjcmVhdGUgdGhlIGRvY3VtZW50Li4uLlwiKTtcbiAgICAgICAgICAgIGFkZFBhY2thZ2VUb0luZGV4KGNQYWNrYWdlLnRyYWNraW5nTm8sc2VhcmNoZXIpOyBcbiAgICAgICAgICAgIGNvbnNvbGUubG9nKFwiYWRkZWQgdGhlIHBhY2thZ2UgdG8gaW5kZXhcIik7XG4gICAgICAgICAgICBscmVkaXNcbiAgICAgICAgICAgICAgLnNldEFkZChtYW5pZmVzdEtleSwgY1BhY2thZ2UudHJhY2tpbmdObylcbiAgICAgICAgICAgICAgLnRoZW4oZnVuY3Rpb24oc1Jlc3VsdCkge1xuICAgICAgICAgICAgICAgIC8vZ2V0IHRoZSBtZW1iZXJzIG9uZSB0aW1lIGhlcmVcbiAgICAgICAgICAgICAgICBjb25zb2xlLmxvZyhcImFkZGVkIHRoZSBwYWNrYWdlIHRvIHRoZSBzZXRcIik7XG4gICAgICAgICAgICAgICAgY29uc29sZS5sb2cobWFuaWZlc3RLZXkpO1xuICAgICAgICAgICAgICAgIGxyZWRpc1xuICAgICAgICAgICAgICAgICAgLmdldE1lbWJlcnMobWFuaWZlc3RLZXkpXG4gICAgICAgICAgICAgICAgICAudGhlbihkYXRhID0+IHtcbiAgICAgICAgICAgICAgICAgICAgY29uc29sZS5sb2coXCJkYXRhXCIpO1xuICAgICAgICAgICAgICAgICAgICBjb25zb2xlLmxvZyhkYXRhKTtcbiAgICAgICAgICAgICAgICAgICAgUHJvbWlzZS5hbGwoZGF0YS5tYXAobHJlZGlzLmdldFBhY2thZ2UpKTtcbiAgICAgICAgICAgICAgICAgIH0pXG4gICAgICAgICAgICAgICAgICAudGhlbihmdW5jdGlvbihyZGF0YSkge1xuICAgICAgICAgICAgICAgICAgICAvL3dlIG5lZWQgdG8gYWxlcnQgdGhlIHBlcnNvbiB0aGF0IHRoZSBwYWNrYWdlIGlzIGhlcmUgc28gcmVhZCBlbWFpbCBldGMuXG4gICAgICAgICAgICAgICAgICAgIC8vYWRkIHRvIHRoZSBpbmRleFxuICAgICAgICAgICAgICAgICAgICBjb25zb2xlLmxvZyhcImRhdGFcIik7XG4gICAgICAgICAgICAgICAgICAgIGNvbnNvbGUubG9nKHJkYXRhKTtcblxuICAgICAgICAgICAgICAgICAgICByZXNvbHZlKHtcbiAgICAgICAgICAgICAgICAgICAgICBzYXZlZDogdHJ1ZSxcbiAgICAgICAgICAgICAgICAgICAgICBwYWNrYWdlczogcmRhdGEsXG4gICAgICAgICAgICAgICAgICAgICAgc1BhY2thZ2U6IGNQYWNrYWdlXG4gICAgICAgICAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgICAgICAgfSlcbiAgICAgICAgICAgICAgICAgIC5jYXRjaChlcnIzID0+IHtcbiAgICAgICAgICAgICAgICAgICAgY29uc29sZS5sb2coZXJyMyk7XG4gICAgICAgICAgICAgICAgICAgIHJlamVjdCh7XG4gICAgICAgICAgICAgICAgICAgICAgZXJyOiBlcnIzLFxuICAgICAgICAgICAgICAgICAgICAgIHNhdmVkOiB0cnVlLFxuICAgICAgICAgICAgICAgICAgICAgIGxpc3Rpbmc6IGZhbHNlXG4gICAgICAgICAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICAgIH0pXG4gICAgICAgICAgICAgIC5jYXRjaChmdW5jdGlvbihlcnIpIHtcbiAgICAgICAgICAgICAgICByZXNvbHZlKHtcbiAgICAgICAgICAgICAgICAgIHNhdmVkOiBmYWxzZVxuICAgICAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgICB9KTtcbiAgICAgICAgICB9KVxuICAgICAgICAgIC5jYXRjaChmdW5jdGlvbihlcnIyKSB7XG4gICAgICAgICAgICByZWplY3Qoe1xuICAgICAgICAgICAgICBzYXZlZDogZmFsc2VcbiAgICAgICAgICAgIH0pO1xuICAgICAgICAgIH0pO1xuXG4gICAgICAgIC8vc2F2ZSB0aGUgcGFja2FnZSB0byB0aGUgcGFja2FnZSBOU1xuICAgICAgfSkuY2F0Y2goZXJyMjMyPT57XG4gICAgICAgIGNvbnNvbGUubG9nKGVycjIzMilcbiAgICAgIH0pO1xuICAgIH0pO1xuICB9XG5cbiAgdXBkYXRlTWFuaWZlc3RQYWNrYWdlVG9JblRyYW5zaXQobWlkKSB7XG4gICAgLy9nZXQgYWxsIHRoZSBwYWNrYWdlc1xuICAgIC8vd2UgbmVlZCB0byB1cGRhdGUgdGhlIGluZGV4IGF0IHRoaXMgcG9pbnQgYXMgd2VsbFxuICAgIHZhciBtc2VhcmNoID0gdGhpcy5teVNlYXJjaDtcbiAgICB0aGlzLm15U2VhcmNoLnNlYXJjaChcbiAgICAgIGBAbWlkOlske21pZH0gJHttaWR9XWAsXG4gICAgICB7IG9mZnNldDogMCwgbnVtYmVyT2ZSZXN1bHRzOiA1MDAwIH0sXG4gICAgICAoZXJyLCBkYXRhKSA9PiB7XG4gICAgICAgIHZhciBwYWNrYWdlcyA9IFtdO1xuICAgICAgICBjb25zb2xlLmxvZyhkYXRhKTtcbiAgICAgICAgZGF0YS5yZXN1bHRzLmZvckVhY2goZWxlbWVudCA9PiB7XG4gICAgICAgICAgdmFyIG9sZERvY0lkID0gZWxlbWVudC5kb2NJZDtcbiAgICAgICAgICBlbGVtZW50LmRvY0lkID0gZWxlbWVudC5kb2NJZC5yZXBsYWNlKGAke21pZH0tYCwgXCJcIik7XG4gICAgICAgICAgcGFja2FnZXMucHVzaChlbGVtZW50LmRvY0lkKTtcbiAgICAgICAgICAvLyBpIGNvdWxkIGRlbGV0ZSBoZXJlXG4gICAgICAgICAgLy8gbXNlYXJjaC5kZWxEb2N1bWVudChQS0dfSURYLG9sZERvY0lkKVxuICAgICAgICAgIC8vdXBkYXRlIGFsbCB0aGUgcGFja2FnZXNcbiAgICAgICAgfSk7XG4gICAgICAgIHNldFBhY2thZ2VJblRyYW5zaXQocGFja2FnZXMsIG1zZWFyY2gsIG1pZCkudGhlbihmdW5jdGlvbihcbiAgICAgICAgICB1cGRhdGVkUGFja2FnZXNcbiAgICAgICAgKSB7XG4gICAgICAgICAgY29uc29sZS5sb2coXCJ1cGRhdGVkIHBhY2thZ2VzXCIpO1xuICAgICAgICAgIGNvbnNvbGUubG9nKHVwZGF0ZWRQYWNrYWdlcyk7XG4gICAgICAgIH0pO1xuICAgICAgfVxuICAgICk7XG4gIH1cbiAgcmVtb3ZlUGFja2FnZSh0cmFja2luZ05vLCBtaWQpIHtcbiAgICB2YXIgbXNlYXJjaCA9IHRoaXMubXlTZWFyY2g7XG4gICAgcmV0dXJuIG5ldyBQcm9taXNlKChyZXNvbHZlLCByZWplY3QpID0+IHtcbiAgICAgIHZhciBtYW5pZmVzdCA9IG1pZDtcbiAgICAgIHZhciBtYW5pZmVzdEtleSA9IFwibWFuaWZlc3Q6XCIgKyBtYW5pZmVzdCArIFwiOipcIjtcblxuICAgICAgbHJlZGlzLmRlbChcInBhY2thZ2VzOlwiICsgdHJhY2tpbmdObykudGhlbihmdW5jdGlvbihyZXN1bHQpIHtcbiAgICAgICAgY29uc29sZS5sb2cocmVzdWx0KTtcbiAgICAgICAgbXNlYXJjaC5kZWxEb2N1bWVudChQS0dfSURYLCBgJHttaWR9LSR7dHJhY2tpbmdOb31gKTtcbiAgICAgICAgLy93ZSBuZWVkIHRvIHJlbW92ZSBmcm9tIHRoZSBpbmRleCBhbmQgZGVjIHRoZSBjb3VudGVyXG4gICAgICAgIGxyZWRpcy5jbGllbnQuZGVjcihcIm1jb3VudGVyOlwiICsgbWlkKTtcbiAgICAgICAgLy9yU2VydmljZXMucGFja2FnZVNlcnZpY2Uucm1QYWNrYWdlKG1pZCwgdHJhY2tpbmdObyk7XG4gICAgICAgIGxyZWRpcy5nZXRLZXlzKG1hbmlmZXN0S2V5KS50aGVuKGtSZXN1bHQgPT4ge1xuICAgICAgICAgIC8vdGhlIGxpc3Qgb2YgYWxsIHRoZSBzZXRzIC4uLndlIG5lZWQgdG8gcmVtb3ZlIHRoZSBrZXkgZnJvbSBlYWNoIG9uZVxuICAgICAgICAgIHZhciBrZXlzQ291bnQgPSAwO1xuXG4gICAgICAgICAga1Jlc3VsdC5mb3JFYWNoKGVsZW1lbnQgPT4ge1xuICAgICAgICAgICAgY29uc29sZS5sb2coXG4gICAgICAgICAgICAgIGByZW1vdmluZyAke3RyYWNraW5nTm99IHBhY2thZ2UgbWFuaWZlc3Qgc2V0ICR7ZWxlbWVudH0gYFxuICAgICAgICAgICAgKTtcbiAgICAgICAgICAgIGxyZWRpcy5zcmVtKGVsZW1lbnQsIHRyYWNraW5nTm8pLnRoZW4oZnVuY3Rpb24oclJlc3VsdCkge1xuICAgICAgICAgICAgICBjb25zb2xlLmxvZyhyUmVzdWx0KTtcbiAgICAgICAgICAgICAgY29uc29sZS5sb2coXCJyZW1vdmVkXCIpO1xuICAgICAgICAgICAgICBpZiAoa2V5c0NvdW50ID09IGtSZXN1bHQubGVuZ3RoIC0gMSkga2V5c0NvdW50Kys7XG4gICAgICAgICAgICB9KTtcbiAgICAgICAgICB9KTtcbiAgICAgICAgICByZXNvbHZlKHtcbiAgICAgICAgICAgIGRlbGV0ZWQ6IHRydWVcbiAgICAgICAgICB9KTtcbiAgICAgICAgfSk7XG5cbiAgICAgICAgLy93ZSBhbHNvIG5lZWQgdG8gcmVtb3ZlIGZyb20gYW55IHNldHNcbiAgICAgIH0pO1xuICAgIH0pO1xuICB9XG4gIHN0b3JlUGFja2FnZUZvclBpY2t1cCh0cmFja2luZ05vLGJpbil7XG4gICAgdmFyIHNlYXJjaGVyID0gdGhpcy5teVNlYXJjaDtcbiAgICByZXR1cm4gbmV3IFByb21pc2UoKHJlc29sdmUscmVqZWN0KT0+e1xuICAgICAgIGxyZWRpcy5obXNldChQS0dfUFJFRklYK3RyYWNraW5nTm8se3N0YXR1czo0LGxvY2F0aW9uOmJpbn0pLnRoZW4oKHJlc3VsdCk9PntcbiAgICAgICAgIGxyZWRpcy5nZXRQYWNrYWdlKHRyYWNraW5nTm8pLnRoZW4oKHBrZyk9PntcbiAgICAgICAgICBhZGRQYWNrYWdlVG9JbmRleCh0cmFja2luZ05vLHNlYXJjaGVyKSA7IFxuICAgICAgICAgIHJlc29sdmUocGtnKTsgICBcbiAgICAgICAgIH0pO1xuICAgICAgIH0pIFxuICAgIH0pOyBcbiAgfVxuICB1cGRhdGVQYWNrYWdlSW5kZXgodHJhY2tpbmcpe1xuICAgICAgcmV0dXJuIG5ldyBQcm9taXNlKChyZXNvbHZlLHJlamVjdCk9PntcbiAgICAgICAgICB2YXIgbXNlYXJjaCA9IHRoaXMubXlTZWFyY2g7IFxuICAgICAgICAgIGFkZFBhY2thZ2VUb0luZGV4KHRyYWNraW5nLG1zZWFyY2gpOyBcbiAgICAgICAgIHJlc29sdmUoeyd1cGRhdGVkJzp0cnVlfSk7XG4gICAgICB9KVxuICB9XG4gIGdldEN1c3RvbWVyUGFja2FnZXMoc2t5Ym94KSB7fVxuICBnZXRNYW5pZmVzdFBhY2thZ2VzQnlTdGF0dXMobWlkLHN0YXR1cykge1xuICAgICAgcmV0dXJuIG5ldyBQcm9taXNlKChyZXNvbHZlLHJlamVjdCk9PntcbiAgICAgICAgICBjb25zb2xlLmxvZyhgQG1pZDpbJHttaWR9ICR7bWlkfV0gQHN0YXR1cz1bJHtzdGF0dXN9ICR7c3RhdHVzfV1gKVxuICAgICAgICB0aGlzLm15U2VhcmNoLnNlYXJjaChcbiAgICAgICAgICAgIGBAbWlkOlske21pZH0gJHttaWR9XSBAc3RhdHVzOlske3N0YXR1c30gJHtzdGF0dXN9XWAsXG4gICAgICAgICAgICB7IG9mZnNldDogMCwgbnVtYmVyT2ZSZXN1bHRzOiA1MDAwIH0sXG4gICAgICAgICAgICAoZXJyLCBkYXRhKSA9PiB7XG4gICAgICAgICAgICAgIHZhciBwYWNrYWdlcyA9IFtdO1xuICAgICAgICAgICAgICBjb25zb2xlLmxvZyhkYXRhKTtcbiAgICAgICAgICAgICAgZGF0YS5yZXN1bHRzLmZvckVhY2goZWxlbWVudCA9PiB7XG5cbiAgICAgICAgICAgICAgICBwYWNrYWdlcy5wdXNoKGVsZW1lbnQuZG9jKTtcbiAgICAgICAgICAgICAgICByZXNvbHZlKHBhY2thZ2VzKTsgICAgICAgICAgICAgICAgIFxuICAgICAgICAgICAgfSk7XG4gICAgICAgIH0pO1xuICAgICAgfSk7XG4gIFxuICB9ICAgICBcbn1cbiJdfQ==
