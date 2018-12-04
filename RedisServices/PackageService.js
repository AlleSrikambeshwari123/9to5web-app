"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.PackageService = undefined;

var _createClass = function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; }();

var _redisLocal = require("../DataServices/redis-local");

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

var redis = require("redis");
var lredis = require("../DataServices/redis-local");
var moment = require("moment");
var redisSearch = require("../redisearchclient");
var fs = require("fs");

var PackageUtil = require("../Util/packageutil").PackageUtility;
var packageUtil = new PackageUtil();
var PKG_IDX = "index:packages";
var PKG_PREFIX = "packages:";
function createDocument(tPackage) {
  var packageDocument = {
    trackingNo: tPackage.trackingNo,
    skybox: tPackage.skybox,
    customer: tPackage.customer,
    shipper: tPackage.shipper,
    description: tPackage.description,
    skyboxV: tPackage.skybox,
    status: tPackage.status,
    mid: tPackage.mid,
    value: tPackage.ttvalue
  };
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
        clientOptions: {
          host: "redis-14897.c2822.us-east-1-mz.ec2.cloud.rlrcp.com",
          port: "14897",
          auth_pass: "t5atRuWQlOW7Vp2uhZpQivcIotDmTPpl"
        }
      });
    }
  }, {
    key: "savePackage",
    value: function savePackage(body) {

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
          location: "Miami",
          mid: body.mid,
          hasOpt: true,
          mtype: body.mtype
        };
        console.log("about to save the package");
        if (typeof cPackage.shipper === "undefined") cPackage.shipper = "";
        if (typeof cPackage.description === "undefined") cPackage.description = "";
        console.log(body);
        if (Number(body.isBusiness) == 1) {
          cPackage.hasOpt = false;
        }
        cPackage = packageUtil.calculateFees(cPackage);
        console.log("package with fees");

        //we also want to calculate the the package fees one time......
        //we have the package details here .. now we need to get the existing package

        var container = "";
        var containerNo = "";
        if (typeof body.bag != "undefined") {
          cPackage.bag = body.bag;
          container = "bag";
          containerNo = cPackage.bag;
        }
        if (typeof body.skid != "undefined") {
          cPackage.skid = body.skid;
          container = "skid";
          containerNo = cPackage.skid;
        }
        //we need to check to see of the owner is a business here

        lredis.getPackage(cPackage.trackingNo).then(function (p) {
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
//# sourceMappingURL=data:application/json;charset=utf8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIlJlZGlzU2VydmljZXMvUGFja2FnZVNlcnZpY2UuZXM2Il0sIm5hbWVzIjpbInJlZGlzIiwicmVxdWlyZSIsImxyZWRpcyIsIm1vbWVudCIsInJlZGlzU2VhcmNoIiwiZnMiLCJQYWNrYWdlVXRpbCIsIlBhY2thZ2VVdGlsaXR5IiwicGFja2FnZVV0aWwiLCJQS0dfSURYIiwiUEtHX1BSRUZJWCIsImNyZWF0ZURvY3VtZW50IiwidFBhY2thZ2UiLCJwYWNrYWdlRG9jdW1lbnQiLCJ0cmFja2luZ05vIiwic2t5Ym94IiwiY3VzdG9tZXIiLCJzaGlwcGVyIiwiZGVzY3JpcHRpb24iLCJza3lib3hWIiwic3RhdHVzIiwibWlkIiwidmFsdWUiLCJ0dHZhbHVlIiwiY29uc29sZSIsImxvZyIsInNldFBhY2thZ2VJblRyYW5zaXQiLCJrZXlzIiwibXNlYXJjaGVyIiwiUHJvbWlzZSIsInJlc29sdmUiLCJyZWplY3QiLCJiYXRjaGVyIiwiY2xpZW50IiwiYmF0Y2giLCJmb3JFYWNoIiwibG9jYXRpb24iLCJlbGVtZW50IiwiaG1zZXQiLCJleGVjIiwiZXJyIiwicmVzdWx0IiwiYWRkUGFja2FnZVRvSW5kZXgiLCJnZXRQYWNrYWdlIiwidGhlbiIsImRlbERvY3VtZW50IiwicGFjayIsImRvbmUiLCJkb2N1bWVudCIsImFkZCIsIlBhY2thZ2VTZXJ2aWNlIiwic2V0dXBJbmRleCIsIm15U2VhcmNoIiwiY2xpZW50T3B0aW9ucyIsImhvc3QiLCJwb3J0IiwiYXV0aF9wYXNzIiwiYm9keSIsInNlYXJjaGVyIiwiY1BhY2thZ2UiLCJyZXBsYWNlIiwidHJpbSIsInRyYWNraW5nIiwiZHV0eVBlcmNlbnQiLCJOdW1iZXIiLCJwaWVjZXMiLCJ3ZWlnaHQiLCJoYXNPcHQiLCJtdHlwZSIsImlzQnVzaW5lc3MiLCJjYWxjdWxhdGVGZWVzIiwiY29udGFpbmVyIiwiY29udGFpbmVyTm8iLCJiYWciLCJza2lkIiwicCIsImN1cnJlbnRDb250YWluZXIiLCJzcmVtIiwiaW5jciIsIm1hbmlmZXN0S2V5Iiwic2V0QWRkIiwic1Jlc3VsdCIsImdldE1lbWJlcnMiLCJkYXRhIiwiYWxsIiwibWFwIiwicmRhdGEiLCJzYXZlZCIsInBhY2thZ2VzIiwic1BhY2thZ2UiLCJjYXRjaCIsImVycjMiLCJsaXN0aW5nIiwiZXJyMiIsIm1zZWFyY2giLCJzZWFyY2giLCJvZmZzZXQiLCJudW1iZXJPZlJlc3VsdHMiLCJyZXN1bHRzIiwib2xkRG9jSWQiLCJkb2NJZCIsInB1c2giLCJ1cGRhdGVkUGFja2FnZXMiLCJtYW5pZmVzdCIsImRlbCIsImRlY3IiLCJnZXRLZXlzIiwia2V5c0NvdW50Iiwia1Jlc3VsdCIsInJSZXN1bHQiLCJsZW5ndGgiLCJkZWxldGVkIiwiZG9jIl0sIm1hcHBpbmdzIjoiOzs7Ozs7Ozs7QUFBQTs7OztBQUVBLElBQUlBLFFBQVFDLFFBQVEsT0FBUixDQUFaO0FBQ0EsSUFBSUMsU0FBU0QsUUFBUSw2QkFBUixDQUFiO0FBQ0EsSUFBSUUsU0FBU0YsUUFBUSxRQUFSLENBQWI7QUFDQSxJQUFJRyxjQUFjSCxRQUFRLHFCQUFSLENBQWxCO0FBQ0EsSUFBSUksS0FBS0osUUFBUSxJQUFSLENBQVQ7O0FBRUEsSUFBSUssY0FBY0wsUUFBUSxxQkFBUixFQUErQk0sY0FBakQ7QUFDQSxJQUFJQyxjQUFjLElBQUlGLFdBQUosRUFBbEI7QUFDQSxJQUFNRyxVQUFVLGdCQUFoQjtBQUNBLElBQU1DLGFBQWEsV0FBbkI7QUFDQSxTQUFTQyxjQUFULENBQXdCQyxRQUF4QixFQUFrQztBQUNoQyxNQUFJQyxrQkFBa0I7QUFDcEJDLGdCQUFZRixTQUFTRSxVQUREO0FBRXBCQyxZQUFRSCxTQUFTRyxNQUZHO0FBR3BCQyxjQUFVSixTQUFTSSxRQUhDO0FBSXBCQyxhQUFTTCxTQUFTSyxPQUpFO0FBS3BCQyxpQkFBYU4sU0FBU00sV0FMRjtBQU1wQkMsYUFBU1AsU0FBU0csTUFORTtBQU9wQkssWUFBUVIsU0FBU1EsTUFQRztBQVFwQkMsU0FBS1QsU0FBU1MsR0FSTTtBQVNwQkMsV0FBT1Ys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RUFBYUMsaUJBQWlCLElBQTlCLEVBRkosRUFHSSxVQUFDekQsR0FBRCxFQUFNMkMsSUFBTixFQUFlO0FBQ2IsY0FBSUssV0FBVyxFQUFmO0FBQ0FoRSxrQkFBUUMsR0FBUixDQUFZMEQsSUFBWjtBQUNBQSxlQUFLZSxPQUFMLENBQWEvRCxPQUFiLENBQXFCLG1CQUFXOztBQUU5QnFELHFCQUFTYSxJQUFULENBQWNoRSxRQUFRMkUsR0FBdEI7QUFDQWxGLG9CQUFRMEQsUUFBUjtBQUNILFdBSkM7QUFLTCxTQVhEO0FBWUQsT0FkTSxDQUFQO0FBZ0JIIiwiZmlsZSI6IlJlZGlzU2VydmljZXMvUGFja2FnZVNlcnZpY2UuanMiLCJzb3VyY2VzQ29udGVudCI6WyJpbXBvcnQgeyBjbGllbnQgfSBmcm9tIFwiLi4vRGF0YVNlcnZpY2VzL3JlZGlzLWxvY2FsXCI7XHJcblxyXG52YXIgcmVkaXMgPSByZXF1aXJlKFwicmVkaXNcIik7XHJcbnZhciBscmVkaXMgPSByZXF1aXJlKFwiLi4vRGF0YVNlcnZpY2VzL3JlZGlzLWxvY2FsXCIpO1xyXG52YXIgbW9tZW50ID0gcmVxdWlyZShcIm1vbWVudFwiKTtcclxudmFyIHJlZGlzU2VhcmNoID0gcmVxdWlyZShcIi4uL3JlZGlzZWFyY2hjbGllbnRcIik7XHJcbnZhciBmcyA9IHJlcXVpcmUoXCJmc1wiKTtcclxuXHJcbnZhciBQYWNrYWdlVXRpbCA9IHJlcXVpcmUoXCIuLi9VdGlsL3BhY2thZ2V1dGlsXCIpLlBhY2thZ2VVdGlsaXR5O1xyXG52YXIgcGFja2FnZVV0aWwgPSBuZXcgUGFja2FnZVV0aWwoKTtcclxuY29uc3QgUEtHX0lEWCA9IFwiaW5kZXg6cGFja2FnZXNcIjtcclxuY29uc3QgUEtHX1BSRUZJWCA9IFwicGFja2FnZXM6XCI7XHJcbmZ1bmN0aW9uIGNyZWF0ZURvY3VtZW50KHRQYWNrYWdlKSB7XHJcbiAgdmFyIHBhY2thZ2VEb2N1bWVudCA9IHtcclxuICAgIHRyYWNraW5nTm86IHRQYWNrYWdlLnRyYWNraW5nTm8sXHJcbiAgICBza3lib3g6IHRQYWNrYWdlLnNreWJveCxcclxuICAgIGN1c3RvbWVyOiB0UGFja2FnZS5jdXN0b21lcixcclxuICAgIHNoaXBwZXI6IHRQYWNrYWdlLnNoaXBwZXIsXHJcbiAgICBkZXNjcmlwdGlvbjogdFBhY2thZ2UuZGVzY3JpcHRpb24sXHJcbiAgICBza3lib3hWOiB0UGFja2FnZS5za3lib3gsXHJcbiAgICBzdGF0dXM6IHRQYWNrYWdlLnN0YXR1cyxcclxuICAgIG1pZDogdFBhY2thZ2UubWlkLFxyXG4gICAgdmFsdWU6IHRQYWNrYWdlLnR0dmFsdWVcclxuICB9O1xyXG4gIGNvbnNvbGUubG9nKFwiYWJvdXQgdG8gYWRkIHRoZSBwYWNrYWdlIHRvIHRoZSBpbmRleFwiKTtcclxuICByZXR1cm4gcGFja2FnZURvY3VtZW50O1xyXG59XHJcbmZ1bmN0aW9uIHNldFBhY2thZ2VJblRyYW5zaXQoa2V5cywgbXNlYXJjaGVyKSB7XHJcbiAgcmV0dXJuIG5ldyBQcm9taXNlKChyZXNvbHZlLCByZWplY3QpID0+IHtcclxuICAgIHZhciBiYXRjaGVyID0gbXNlYXJjaGVyLmNsaWVudC5iYXRjaCgpO1xyXG4gICAga2V5cy5mb3JFYWNoKGVsZW1lbnQgPT4ge1xyXG4gICAgICB2YXIgdmFsdWUgPSB7XHJcbiAgICAgICAgc3RhdHVzOiAyLFxyXG4gICAgICAgIGxvY2F0aW9uOiBcIkluIFRyYW5zaXRcIlxyXG4gICAgICB9O1xyXG4gICAgICBjb25zb2xlLmxvZyhlbGVtZW50ICsgXCJpcyB0aGUgZWxlbWVudFwiKTtcclxuXHJcbiAgICAgIGJhdGNoZXIuaG1zZXQoUEtHX1BSRUZJWCArIGVsZW1lbnQsIHZhbHVlKTtcclxuICAgIH0pO1xyXG4gICAgYmF0Y2hlci5leGVjKChlcnIsIHJlc3VsdCkgPT4ge1xyXG4gICAgICBjb25zb2xlLmxvZyhyZXN1bHQpO1xyXG4gICAgICAvL3JlYWRkIHRoZSBkb2N1bWVudHMgaGVyZVxyXG4gICAgICBrZXlzLmZvckVhY2goZWxlbWVudCA9PiB7XHJcbiAgICAgICAgYWRkUGFja2FnZVRvSW5kZXgoZWxlbWVudCwgbXNlYXJjaGVyKTtcclxuICAgICAgfSk7XHJcbiAgICAgIHJlc29sdmUocmVzdWx0KTtcclxuICAgIH0pO1xyXG4gIH0pO1xyXG59XHJcblxyXG5mdW5jdGlvbiBhZGRQYWNrYWdlVG9JbmRleCh0cmFja2luZ05vLCBtc2VhcmNoZXIpIHtcclxuICBscmVkaXMuZ2V0UGFja2FnZSh0cmFja2luZ05vKS50aGVuKHBhY2sgPT4ge1xyXG4gICAgbXNlYXJjaGVyLmRlbERvY3VtZW50KFBLR19JRFgsIGAke3BhY2subWlkfS0ke3RyYWNraW5nTm99YCwgKGVyciwgZG9uZSkgPT4ge1xyXG4gICAgICB2YXIgZG9jdW1lbnQgPSBjcmVhdGVEb2N1bWVudChwYWNrKTtcclxuICAgICAgY29uc29sZS5sb2coXCJyZWFkZGluZyBwYWNrYWdlIHRvIHRoZSBpbmRleCBsaWtlIGEgYm9zcyBcIiArIHRyYWNraW5nTm8pO1xyXG4gICAgICBtc2VhcmNoZXIuYWRkKHBhY2subWlkICsgXCItXCIgKyBwYWNrLnRyYWNraW5nTm8sIGRvY3VtZW50KTtcclxuICAgIH0pO1xyXG4gIH0pO1xyXG59XHJcbmV4cG9ydCBjbGFzcyBQYWNrYWdlU2VydmljZSB7XHJcbiAgY29uc3RydWN0b3IoKSB7XHJcbiAgICB0aGlzLnNldHVwSW5kZXgoKTtcclxuICB9XHJcbiAgc2V0dXBJbmRleCgpIHtcclxuICAgIHRoaXMubXlTZWFyY2ggPSByZWRpc1NlYXJjaChyZWRpcywgUEtHX0lEWCwge1xyXG4gICAgICBjbGllbnRPcHRpb25zOiB7XHJcbiAgICAgICAgaG9zdDogXCJyZWRpcy0xNDg5Ny5jMjgyMi51cy1lYXN0LTEtbXouZWMyLmNsb3VkLnJscmNwLmNvbVwiLFxyXG4gICAgICAgIHBvcnQ6IFwiMTQ4OTdcIixcclxuICAgICAgICBhdXRoX3Bhc3M6IFwidDVhdFJ1V1FsT1c3VnAydWhacFFpdmNJb3REbVRQcGxcIlxyXG4gICAgICB9XHJcbiAgICB9KTtcclxuICB9XHJcbiAgc2F2ZVBhY2thZ2UoYm9keSkge1xyXG4gICAgXHJcbiAgICB2YXIgc2VhcmNoZXIgPSB0aGlzLm15U2VhcmNoOyBcclxuICAgIHJldHVybiBuZXcgUHJvbWlzZSgocmVzb2x2ZSwgcmVqZWN0KSA9PiB7XHJcbiAgICAgIHZhciBjUGFja2FnZSA9IHtcclxuICAgICAgICBza3lib3g6IGJvZHkuc2t5Ym94LFxyXG4gICAgICAgIGN1c3RvbWVyOiBib2R5LmN1c3RvbWVyLnJlcGxhY2UoXCItXCIsIFwiXCIpLnRyaW0oKSxcclxuICAgICAgICB0cmFja2luZ05vOiBib2R5LnRyYWNraW5nLFxyXG4gICAgICAgIGR1dHlQZXJjZW50OiAwLjIsXHJcbiAgICAgICAgZGVzY3JpcHRpb246IGJvZHkuZGVzY3JpcHRpb24sXHJcbiAgICAgICAgc2hpcHBlcjogYm9keS5zaGlwcGVyLFxyXG4gICAgICAgIHZhbHVlOiBOdW1iZXIoYm9keS52YWx1ZSksXHJcbiAgICAgICAgcGllY2VzOiBOdW1iZXIoYm9keS5waWVjZXMpLFxyXG4gICAgICAgIHdlaWdodDogTnVtYmVyKGJvZHkud2VpZ2h0KSxcclxuICAgICAgICBzdGF0dXM6IDEsXHJcbiAgICAgICAgbG9jYXRpb246IFwiTWlhbWlcIixcclxuICAgICAgICBtaWQ6IGJvZHkubWlkLFxyXG4gICAgICAgIGhhc09wdDogdHJ1ZSxcclxuICAgICAgICBtdHlwZTogYm9keS5tdHlwZVxyXG4gICAgICB9O1xyXG4gICAgICBjb25zb2xlLmxvZyhcImFib3V0IHRvIHNhdmUgdGhlIHBhY2thZ2VcIik7XHJcbiAgICAgIGlmICh0eXBlb2YgY1BhY2thZ2Uuc2hpcHBlciA9PT0gXCJ1bmRlZmluZWRcIikgY1BhY2thZ2Uuc2hpcHBlciA9IFwiXCI7XHJcbiAgICAgIGlmICh0eXBlb2YgY1BhY2thZ2UuZGVzY3JpcHRpb24gPT09IFwidW5kZWZpbmVkXCIpXHJcbiAgICAgICAgY1BhY2thZ2UuZGVzY3JpcHRpb24gPSBcIlwiO1xyXG4gICAgICBjb25zb2xlLmxvZyhib2R5KTtcclxuICAgICAgaWYgKE51bWJlcihib2R5LmlzQnVzaW5lc3MpID09IDEpIHtcclxuICAgICAgICBjUGFja2FnZS5oYXNPcHQgPSBmYWxzZTtcclxuICAgICAgfVxyXG4gICAgICBjUGFja2FnZSA9IHBhY2thZ2VVdGlsLmNhbGN1bGF0ZUZlZXMoY1BhY2thZ2UpO1xyXG4gICAgICBjb25zb2xlLmxvZyhcInBhY2thZ2Ugd2l0aCBmZWVzXCIpO1xyXG5cclxuICAgICAgLy93ZSBhbHNvIHdhbnQgdG8gY2FsY3VsYXRlIHRoZSB0aGUgcGFja2FnZSBmZWVzIG9uZSB0aW1lLi4uLi4uXHJcbiAgICAgIC8vd2UgaGF2ZSB0aGUgcGFja2FnZSBkZXRhaWxzIGhlcmUgLi4gbm93IHdlIG5lZWQgdG8gZ2V0IHRoZSBleGlzdGluZyBwYWNrYWdlXHJcblxyXG4gICAgICB2YXIgY29udGFpbmVyID0gXCJcIjtcclxuICAgICAgdmFyIGNvbnRhaW5lck5vID0gXCJcIjtcclxuICAgICAgaWYgKHR5cGVvZiBib2R5LmJhZyAhPSBcInVuZGVmaW5lZFwiKSB7XHJcbiAgICAgICAgY1BhY2thZ2UuYmFnID0gYm9keS5iYWc7XHJcbiAgICAgICAgY29udGFpbmVyID0gXCJiYWdcIjtcclxuICAgICAgICBjb250YWluZXJObyA9IGNQYWNrYWdlLmJhZztcclxuICAgICAgfVxyXG4gICAgICBpZiAodHlwZW9mIGJvZHkuc2tpZCAhPSBcInVuZGVmaW5lZFwiKSB7XHJcbiAgICAgICAgY1BhY2thZ2Uuc2tpZCA9IGJvZHkuc2tpZDtcclxuICAgICAgICBjb250YWluZXIgPSBcInNraWRcIjtcclxuICAgICAgICBjb250YWluZXJObyA9IGNQYWNrYWdlLnNraWQ7XHJcbiAgICAgIH1cclxuICAgICAgLy93ZSBuZWVkIHRvIGNoZWNrIHRvIHNlZSBvZiB0aGUgb3duZXIgaXMgYSBidXNpbmVzcyBoZXJlXHJcblxyXG4gICAgICBscmVkaXMuZ2V0UGFja2FnZShjUGFja2FnZS50cmFja2luZ05vKS50aGVuKHAgPT4ge1xyXG4gICAgICAgIGlmIChwKSB7XHJcbiAgICAgICAgICB2YXIgY3VycmVudENvbnRhaW5lciA9IGBtYW5pZmVzdDoke3AubWlkfToke3AubXR5cGV9OiR7Y29udGFpbmVyfTpgO1xyXG4gICAgICAgICAgY29uc29sZS5sb2coXCJmb3VuZCBwYWNrYWdlIFwiKTtcclxuICAgICAgICAgIGNvbnNvbGUubG9nKHApO1xyXG4gICAgICAgICAgaWYgKGNvbnRhaW5lciA9PSBcImJhZ1wiKSB7XHJcbiAgICAgICAgICAgIC8vY2hlY2sgdG8gc2VlIGlmIHRoZSBiYWNrIG5vIGlzIHRoZSBzYW1lLlxyXG4gICAgICAgICAgICBpZiAocC5iYWcgIT0gY1BhY2thZ2UuYmFnKSB7XHJcbiAgICAgICAgICAgICAgLy9yZW1vdmUgaXQgZnJvbSB0aGUgb3JpZ2luYWwgbGlzdFxyXG4gICAgICAgICAgICAgIGxyZWRpcy5zcmVtKGN1cnJlbnRDb250YWluZXIgKyBwLmJhZywgcC50cmFja2luZ05vKTtcclxuICAgICAgICAgICAgICBjb25zb2xlLmxvZyhcclxuICAgICAgICAgICAgICAgIFwicmVtb3ZlIHBhY2thZ2UgZnJvbSBjdXJyZW50IHNldCBcIiArIGN1cnJlbnRDb250YWluZXJcclxuICAgICAgICAgICAgICApO1xyXG4gICAgICAgICAgICB9XHJcbiAgICAgICAgICB9IGVsc2Uge1xyXG4gICAgICAgICAgICAvL2NoZWNrIHRvIHNlZSBpZiB0aGUgc2tpZCBudW1iZXIgaXMgdGhlIHNhbWUuXHJcbiAgICAgICAgICAgIGlmIChwLnNraWQgIT0gY1BhY2thZ2Uuc2tpZCkge1xyXG4gICAgICAgICAgICAgIC8vcmVtb3ZlIGl0IGZyb20gdGhlIG9yaWdpbmFsIGxpc3RcclxuICAgICAgICAgICAgICBscmVkaXMuc3JlbShjdXJyZW50Q29udGFpbmVyICsgcC5za2lkLCBwLnRyYWNraW5nTm8pO1xyXG4gICAgICAgICAgICAgIGNvbnNvbGUubG9nKFxyXG4gICAgICAgICAgICAgICAgXCJyZW1vdmUgcGFja2FnZSBmcm9tIGN1cnJlbnQgc2V0IFwiICsgY3VycmVudENvbnRhaW5lclxyXG4gICAgICAgICAgICAgICk7XHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICAgIH1cclxuICAgICAgICB9IGVsc2Uge1xyXG4gICAgICAgICAgLy8gdGhlIHBhY2thZ2UgZG9lc24ndCBleGlzdCB1cGRhdGUgdGhlIGNvdW50ZXJcclxuICAgICAgICAgIGxyZWRpcy5jbGllbnQuaW5jcihcIm1jb3VudGVyOlwiICsgY1BhY2thZ2UubWlkKTtcclxuICAgICAgICAgIFxyXG4gICAgICAgIH1cclxuXHJcbiAgICAgICAgbHJlZGlzXHJcbiAgICAgICAgICAuaG1zZXQoXCJwYWNrYWdlczpcIiArIGNQYWNrYWdlLnRyYWNraW5nTm8sIGNQYWNrYWdlKVxyXG4gICAgICAgICAgLnRoZW4oZnVuY3Rpb24ocmVzdWx0KSB7XHJcbiAgICAgICAgICAgIC8vYWRkIHRvIHF1ZXVlIGZvciBwZXJzaXN0ZW50IHByb2Nlc3NpbmdcclxuICAgICAgICAgICAgXHJcbiAgICAgICAgICAgIHZhciBtYW5pZmVzdEtleSA9IGBtYW5pZmVzdDoke2NQYWNrYWdlLm1pZH06JHtcclxuICAgICAgICAgICAgICBjUGFja2FnZS5tdHlwZVxyXG4gICAgICAgICAgICB9OiR7Y29udGFpbmVyfToke2NvbnRhaW5lck5vfWA7XHJcbiAgICAgICAgICAgIGNvbnNvbGUubG9nKFwiYWJvdXQgdG8gY3JlYXRlIHRoZSBkb2N1bWVudC4uLi5cIik7XHJcbiAgICAgICAgICAgIGFkZFBhY2thZ2VUb0luZGV4KGNQYWNrYWdlLnRyYWNraW5nTm8sc2VhcmNoZXIpOyBcclxuICAgICAgICAgICAgY29uc29sZS5sb2coXCJhZGRlZCB0aGUgcGFja2FnZSB0byBpbmRleFwiKTtcclxuICAgICAgICAgICAgbHJlZGlzXHJcbiAgICAgICAgICAgICAgLnNldEFkZChtYW5pZmVzdEtleSwgY1BhY2thZ2UudHJhY2tpbmdObylcclxuICAgICAgICAgICAgICAudGhlbihmdW5jdGlvbihzUmVzdWx0KSB7XHJcbiAgICAgICAgICAgICAgICAvL2dldCB0aGUgbWVtYmVycyBvbmUgdGltZSBoZXJlXHJcbiAgICAgICAgICAgICAgICBjb25zb2xlLmxvZyhcImFkZGVkIHRoZSBwYWNrYWdlIHRvIHRoZSBzZXRcIik7XHJcbiAgICAgICAgICAgICAgICBjb25zb2xlLmxvZyhtYW5pZmVzdEtleSk7XHJcbiAgICAgICAgICAgICAgICBscmVkaXNcclxuICAgICAgICAgICAgICAgICAgLmdldE1lbWJlcnMobWFuaWZlc3RLZXkpXHJcbiAgICAgICAgICAgICAgICAgIC50aGVuKGRhdGEgPT4ge1xyXG4gICAgICAgICAgICAgICAgICAgIGNvbnNvbGUubG9nKFwiZGF0YVwiKTtcclxuICAgICAgICAgICAgICAgICAgICBjb25zb2xlLmxvZyhkYXRhKTtcclxuICAgICAgICAgICAgICAgICAgICBQcm9taXNlLmFsbChkYXRhLm1hcChscmVkaXMuZ2V0UGFja2FnZSkpO1xyXG4gICAgICAgICAgICAgICAgICB9KVxyXG4gICAgICAgICAgICAgICAgICAudGhlbihmdW5jdGlvbihyZGF0YSkge1xyXG4gICAgICAgICAgICAgICAgICAgIC8vd2UgbmVlZCB0byBhbGVydCB0aGUgcGVyc29uIHRoYXQgdGhlIHBhY2thZ2UgaXMgaGVyZSBzbyByZWFkIGVtYWlsIGV0Yy5cclxuICAgICAgICAgICAgICAgICAgICAvL2FkZCB0byB0aGUgaW5kZXhcclxuICAgICAgICAgICAgICAgICAgICBjb25zb2xlLmxvZyhcImRhdGFcIik7XHJcbiAgICAgICAgICAgICAgICAgICAgY29uc29sZS5sb2cocmRhdGEpO1xyXG5cclxuICAgICAgICAgICAgICAgICAgICByZXNvbHZlKHtcclxuICAgICAgICAgICAgICAgICAgICAgIHNhdmVkOiB0cnVlLFxyXG4gICAgICAgICAgICAgICAgICAgICAgcGFja2FnZXM6IHJkYXRhLFxyXG4gICAgICAgICAgICAgICAgICAgICAgc1BhY2thZ2U6IGNQYWNrYWdlXHJcbiAgICAgICAgICAgICAgICAgICAgfSk7XHJcbiAgICAgICAgICAgICAgICAgIH0pXHJcbiAgICAgICAgICAgICAgICAgIC5jYXRjaChlcnIzID0+IHtcclxuICAgICAgICAgICAgICAgICAgICBjb25zb2xlLmxvZyhlcnIzKTtcclxuICAgICAgICAgICAgICAgICAgICByZWplY3Qoe1xyXG4gICAgICAgICAgICAgICAgICAgICAgZXJyOiBlcnIzLFxyXG4gICAgICAgICAgICAgICAgICAgICAgc2F2ZWQ6IHRydWUsXHJcbiAgICAgICAgICAgICAgICAgICAgICBsaXN0aW5nOiBmYWxzZVxyXG4gICAgICAgICAgICAgICAgICAgIH0pO1xyXG4gICAgICAgICAgICAgICAgICB9KTtcclxuICAgICAgICAgICAgICB9KVxyXG4gICAgICAgICAgICAgIC5jYXRjaChmdW5jdGlvbihlcnIpIHtcclxuICAgICAgICAgICAgICAgIHJlc29sdmUoe1xyXG4gICAgICAgICAgICAgICAgICBzYXZlZDogZmFsc2VcclxuICAgICAgICAgICAgICAgIH0pO1xyXG4gICAgICAgICAgICAgIH0pO1xyXG4gICAgICAgICAgfSlcclxuICAgICAgICAgIC5jYXRjaChmdW5jdGlvbihlcnIyKSB7XHJcbiAgICAgICAgICAgIHJlamVjdCh7XHJcbiAgICAgICAgICAgICAgc2F2ZWQ6IGZhbHNlXHJcbiAgICAgICAgICAgIH0pO1xyXG4gICAgICAgICAgfSk7XHJcblxyXG4gICAgICAgIC8vc2F2ZSB0aGUgcGFja2FnZSB0byB0aGUgcGFja2FnZSBOU1xyXG4gICAgICB9KTtcclxuICAgIH0pO1xyXG4gIH1cclxuXHJcbiAgdXBkYXRlTWFuaWZlc3RQYWNrYWdlVG9JblRyYW5zaXQobWlkKSB7XHJcbiAgICAvL2dldCBhbGwgdGhlIHBhY2thZ2VzXHJcbiAgICAvL3dlIG5lZWQgdG8gdXBkYXRlIHRoZSBpbmRleCBhdCB0aGlzIHBvaW50IGFzIHdlbGxcclxuICAgIHZhciBtc2VhcmNoID0gdGhpcy5teVNlYXJjaDtcclxuICAgIHRoaXMubXlTZWFyY2guc2VhcmNoKFxyXG4gICAgICBgQG1pZDpbJHttaWR9ICR7bWlkfV1gLFxyXG4gICAgICB7IG9mZnNldDogMCwgbnVtYmVyT2ZSZXN1bHRzOiA1MDAwIH0sXHJcbiAgICAgIChlcnIsIGRhdGEpID0+IHtcclxuICAgICAgICB2YXIgcGFja2FnZXMgPSBbXTtcclxuICAgICAgICBjb25zb2xlLmxvZyhkYXRhKTtcclxuICAgICAgICBkYXRhLnJlc3VsdHMuZm9yRWFjaChlbGVtZW50ID0+IHtcclxuICAgICAgICAgIHZhciBvbGREb2NJZCA9IGVsZW1lbnQuZG9jSWQ7XHJcbiAgICAgICAgICBlbGVtZW50LmRvY0lkID0gZWxlbWVudC5kb2NJZC5yZXBsYWNlKGAke21pZH0tYCwgXCJcIik7XHJcbiAgICAgICAgICBwYWNrYWdlcy5wdXNoKGVsZW1lbnQuZG9jSWQpO1xyXG4gICAgICAgICAgLy8gaSBjb3VsZCBkZWxldGUgaGVyZVxyXG4gICAgICAgICAgLy8gbXNlYXJjaC5kZWxEb2N1bWVudChQS0dfSURYLG9sZERvY0lkKVxyXG4gICAgICAgICAgLy91cGRhdGUgYWxsIHRoZSBwYWNrYWdlc1xyXG4gICAgICAgIH0pO1xyXG4gICAgICAgIHNldFBhY2thZ2VJblRyYW5zaXQocGFja2FnZXMsIG1zZWFyY2gsIG1pZCkudGhlbihmdW5jdGlvbihcclxuICAgICAgICAgIHVwZGF0ZWRQYWNrYWdlc1xyXG4gICAgICAgICkge1xyXG4gICAgICAgICAgY29uc29sZS5sb2coXCJ1cGRhdGVkIHBhY2thZ2VzXCIpO1xyXG4gICAgICAgICAgY29uc29sZS5sb2codXBkYXRlZFBhY2thZ2VzKTtcclxuICAgICAgICB9KTtcclxuICAgICAgfVxyXG4gICAgKTtcclxuICB9XHJcbiAgcmVtb3ZlUGFja2FnZSh0cmFja2luZ05vLCBtaWQpIHtcclxuICAgIHZhciBtc2VhcmNoID0gdGhpcy5teVNlYXJjaDtcclxuICAgIHJldHVybiBuZXcgUHJvbWlzZSgocmVzb2x2ZSwgcmVqZWN0KSA9PiB7XHJcbiAgICAgIHZhciBtYW5pZmVzdCA9IG1pZDtcclxuICAgICAgdmFyIG1hbmlmZXN0S2V5ID0gXCJtYW5pZmVzdDpcIiArIG1hbmlmZXN0ICsgXCI6KlwiO1xyXG5cclxuICAgICAgbHJlZGlzLmRlbChcInBhY2thZ2VzOlwiICsgdHJhY2tpbmdObykudGhlbihmdW5jdGlvbihyZXN1bHQpIHtcclxuICAgICAgICBjb25zb2xlLmxvZyhyZXN1bHQpO1xyXG4gICAgICAgIG1zZWFyY2guZGVsRG9jdW1lbnQoUEtHX0lEWCwgYCR7bWlkfS0ke3RyYWNraW5nTm99YCk7XHJcbiAgICAgICAgLy93ZSBuZWVkIHRvIHJlbW92ZSBmcm9tIHRoZSBpbmRleCBhbmQgZGVjIHRoZSBjb3VudGVyXHJcbiAgICAgICAgbHJlZGlzLmNsaWVudC5kZWNyKFwibWNvdW50ZXI6XCIgKyBtaWQpO1xyXG4gICAgICAgIC8vclNlcnZpY2VzLnBhY2thZ2VTZXJ2aWNlLnJtUGFja2FnZShtaWQsIHRyYWNraW5nTm8pO1xyXG4gICAgICAgIGxyZWRpcy5nZXRLZXlzKG1hbmlmZXN0S2V5KS50aGVuKGtSZXN1bHQgPT4ge1xyXG4gICAgICAgICAgLy90aGUgbGlzdCBvZiBhbGwgdGhlIHNldHMgLi4ud2UgbmVlZCB0byByZW1vdmUgdGhlIGtleSBmcm9tIGVhY2ggb25lXHJcbiAgICAgICAgICB2YXIga2V5c0NvdW50ID0gMDtcclxuXHJcbiAgICAgICAgICBrUmVzdWx0LmZvckVhY2goZWxlbWVudCA9PiB7XHJcbiAgICAgICAgICAgIGNvbnNvbGUubG9nKFxyXG4gICAgICAgICAgICAgIGByZW1vdmluZyAke3RyYWNraW5nTm99IHBhY2thZ2UgbWFuaWZlc3Qgc2V0ICR7ZWxlbWVudH0gYFxyXG4gICAgICAgICAgICApO1xyXG4gICAgICAgICAgICBscmVkaXMuc3JlbShlbGVtZW50LCB0cmFja2luZ05vKS50aGVuKGZ1bmN0aW9uKHJSZXN1bHQpIHtcclxuICAgICAgICAgICAgICBjb25zb2xlLmxvZyhyUmVzdWx0KTtcclxuICAgICAgICAgICAgICBjb25zb2xlLmxvZyhcInJlbW92ZWRcIik7XHJcbiAgICAgICAgICAgICAgaWYgKGtleXNDb3VudCA9PSBrUmVzdWx0Lmxlbmd0aCAtIDEpIGtleXNDb3VudCsrO1xyXG4gICAgICAgICAgICB9KTtcclxuICAgICAgICAgIH0pO1xyXG4gICAgICAgICAgcmVzb2x2ZSh7XHJcbiAgICAgICAgICAgIGRlbGV0ZWQ6IHRydWVcclxuICAgICAgICAgIH0pO1xyXG4gICAgICAgIH0pO1xyXG5cclxuICAgICAgICAvL3dlIGFsc28gbmVlZCB0byByZW1vdmUgZnJvbSBhbnkgc2V0c1xyXG4gICAgICB9KTtcclxuICAgIH0pO1xyXG4gIH1cclxuICB1cGRhdGVQYWNrYWdlSW5kZXgodHJhY2tpbmcpe1xyXG4gICAgICByZXR1cm4gbmV3IFByb21pc2UoKHJlc29sdmUscmVqZWN0KT0+e1xyXG4gICAgICAgICAgdmFyIG1zZWFyY2ggPSB0aGlzLm15U2VhcmNoOyBcclxuICAgICAgICAgIGFkZFBhY2thZ2VUb0luZGV4KHRyYWNraW5nLG1zZWFyY2gpOyBcclxuICAgICAgICAgcmVzb2x2ZSh7J3VwZGF0ZWQnOnRydWV9KTtcclxuICAgICAgfSlcclxuICB9XHJcbiAgZ2V0Q3VzdG9tZXJQYWNrYWdlcyhza3lib3gpIHt9XHJcbiAgZ2V0TWFuaWZlc3RQYWNrYWdlc0J5U3RhdHVzKG1pZCxzdGF0dXMpIHtcclxuICAgICAgcmV0dXJuIG5ldyBQcm9taXNlKChyZXNvbHZlLHJlamVjdCk9PntcclxuICAgICAgICAgIGNvbnNvbGUubG9nKGBAbWlkOlske21pZH0gJHttaWR9XSBAc3RhdHVzPVske3N0YXR1c30gJHtzdGF0dXN9XWApXHJcbiAgICAgICAgdGhpcy5teVNlYXJjaC5zZWFyY2goXHJcbiAgICAgICAgICAgIGBAbWlkOlske21pZH0gJHttaWR9XSBAc3RhdHVzOlske3N0YXR1c30gJHtzdGF0dXN9XWAsXHJcbiAgICAgICAgICAgIHsgb2Zmc2V0OiAwLCBudW1iZXJPZlJlc3VsdHM6IDUwMDAgfSxcclxuICAgICAgICAgICAgKGVyciwgZGF0YSkgPT4ge1xyXG4gICAgICAgICAgICAgIHZhciBwYWNrYWdlcyA9IFtdO1xyXG4gICAgICAgICAgICAgIGNvbnNvbGUubG9nKGRhdGEpO1xyXG4gICAgICAgICAgICAgIGRhdGEucmVzdWx0cy5mb3JFYWNoKGVsZW1lbnQgPT4ge1xyXG5cclxuICAgICAgICAgICAgICAgIHBhY2thZ2VzLnB1c2goZWxlbWVudC5kb2MpO1xyXG4gICAgICAgICAgICAgICAgcmVzb2x2ZShwYWNrYWdlcyk7ICAgICAgICAgICAgICAgICBcclxuICAgICAgICAgICAgfSk7XHJcbiAgICAgICAgfSk7XHJcbiAgICAgIH0pO1xyXG4gIFxyXG4gIH0gICAgIFxyXG59XHJcbiJdfQ==
