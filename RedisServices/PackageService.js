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
//# sourceMappingURL=data:application/json;charset=utf8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIlJlZGlzU2VydmljZXMvUGFja2FnZVNlcnZpY2UuZXM2Il0sIm5hbWVzIjpbInJlZGlzIiwicmVxdWlyZSIsImxyZWRpcyIsIm1vbWVudCIsInJlZGlzU2VhcmNoIiwiZnMiLCJQYWNrYWdlVXRpbCIsIlBhY2thZ2VVdGlsaXR5IiwicGFja2FnZVV0aWwiLCJQS0dfSURYIiwiUEtHX1BSRUZJWCIsImNyZWF0ZURvY3VtZW50IiwidFBhY2thZ2UiLCJwYWNrYWdlRG9jdW1lbnQiLCJ0cmFja2luZ05vIiwic2t5Ym94IiwiY3VzdG9tZXIiLCJzaGlwcGVyIiwiZGVzY3JpcHRpb24iLCJza3lib3hWIiwic3RhdHVzIiwibWlkIiwidmFsdWUiLCJ0dHZhbHVlIiwiY29uc29sZSIsImxvZyIsInNldFBhY2thZ2VJblRyYW5zaXQiLCJrZXlzIiwibXNlYXJjaGVyIiwiUHJvbWlzZSIsInJlc29sdmUiLCJyZWplY3QiLCJiYXRjaGVyIiwiY2xpZW50IiwiYmF0Y2giLCJmb3JFYWNoIiwibG9jYXRpb24iLCJlbGVtZW50IiwiaG1zZXQiLCJleGVjIiwiZXJyIiwicmVzdWx0IiwiYWRkUGFja2FnZVRvSW5kZXgiLCJnZXRQYWNrYWdlIiwidGhlbiIsImRlbERvY3VtZW50IiwicGFjayIsImRvbmUiLCJkb2N1bWVudCIsImFkZCIsIlBhY2thZ2VTZXJ2aWNlIiwic2V0dXBJbmRleCIsIm15U2VhcmNoIiwiY2xpZW50T3B0aW9ucyIsImhvc3QiLCJwb3J0IiwiYXV0aF9wYXNzIiwiYm9keSIsInNlYXJjaGVyIiwiY1BhY2thZ2UiLCJyZXBsYWNlIiwidHJpbSIsInRyYWNraW5nIiwiZHV0eVBlcmNlbnQiLCJOdW1iZXIiLCJwaWVjZXMiLCJ3ZWlnaHQiLCJoYXNPcHQiLCJtdHlwZSIsImlzQnVzaW5lc3MiLCJjYWxjdWxhdGVGZWVzIiwiY29udGFpbmVyIiwiY29udGFpbmVyTm8iLCJiYWciLCJza2lkIiwicCIsImN1cnJlbnRDb250YWluZXIiLCJzcmVtIiwiaW5jciIsIm1hbmlmZXN0S2V5Iiwic2V0QWRkIiwic1Jlc3VsdCIsImdldE1lbWJlcnMiLCJkYXRhIiwiYWxsIiwibWFwIiwicmRhdGEiLCJzYXZlZCIsInBhY2thZ2VzIiwic1BhY2thZ2UiLCJjYXRjaCIsImVycjMiLCJsaXN0aW5nIiwiZXJyMiIsIm1zZWFyY2giLCJzZWFyY2giLCJvZmZzZXQiLCJudW1iZXJPZlJlc3VsdHMiLCJyZXN1bHRzIiwib2xkRG9jSWQiLCJkb2NJZCIsInB1c2giLCJ1cGRhdGVkUGFja2FnZXMiLCJtYW5pZmVzdCIsImRlbCIsImRlY3IiLCJnZXRLZXlzIiwia2V5c0NvdW50Iiwia1Jlc3VsdCIsInJSZXN1bHQiLCJsZW5ndGgiLCJkZWxldGVkIiwiYmluIiwicGtnIiwiZG9jIl0sIm1hcHBpbmdzIjoiOzs7Ozs7Ozs7QUFBQTs7OztBQUVBLElBQUlBLFFBQVFDLFFBQVEsT0FBUixDQUFaO0FBQ0EsSUFBSUMsU0FBU0QsUUFBUSw2QkFBUixDQUFiO0FBQ0EsSUFBSUUsU0FBU0YsUUFBUSxRQUFSLENBQWI7QUFDQSxJQUFJRyxjQUFjSCxRQUFRLHFCQUFSLENBQWxCO0FBQ0EsSUFBSUksS0FBS0osUUFBUSxJQUFSLENBQVQ7O0FBRUEsSUFBSUssY0FBY0wsUUFBUSxxQkFBUixFQUErQk0sY0FBakQ7QUFDQSxJQUFJQyxjQUFjLElBQUlGLFdBQUosRUFBbEI7QUFDQSxJQUFNRyxVQUFVLGdCQUFoQjtBQUNBLElBQU1DLGFBQWEsV0FBbkI7QUFDQSxTQUFTQyxjQUFULENBQXdCQyxRQUF4QixFQUFrQztBQUNoQyxNQUFJQyxrQkFBa0I7QUFDcEJDLGdCQUFZRixTQUFTRSxVQUREO0FBRXBCQyxZQUFRSCxTQUFTRyxNQUZHO0FBR3BCQyxjQUFVSixTQUFTSSxRQUhDO0FBSXBCQyxhQUFTTCxTQUFTSyxPQUpFO0FBS3BCQyxpQkFBYU4sU0FBU00sV0FMRjtBQU1wQkMsYUFBU1AsU0FBU0csTUFORTtBQU9wQkssWUFBUVIsU0FBU1EsTUFQRztBQVFwQkMsU0FBS1QsU0FBU1MsR0FSTTtB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QVNDLE1BQVQsRUFBa0I7QUFDakMsWUFBSStELFVBQVUsTUFBSzFDLFFBQW5CO0FBQ0FWLDBCQUFrQm9CLFFBQWxCLEVBQTJCZ0MsT0FBM0I7QUFDRGhFLGdCQUFRLEVBQUMsV0FBVSxJQUFYLEVBQVI7QUFDRixPQUpNLENBQVA7QUFLSDs7O3dDQUNtQmYsTSxFQUFRLENBQUU7OztnREFDRk0sRyxFQUFJRCxNLEVBQVE7QUFBQTs7QUFDcEMsYUFBTyxJQUFJUyxPQUFKLENBQVksVUFBQ0MsT0FBRCxFQUFTQyxNQUFULEVBQWtCO0FBQ2pDUCxnQkFBUUMsR0FBUixZQUFxQkosR0FBckIsU0FBNEJBLEdBQTVCLG1CQUE2Q0QsTUFBN0MsU0FBdURBLE1BQXZEO0FBQ0YsZUFBS2dDLFFBQUwsQ0FBYzJDLE1BQWQsWUFDYTFFLEdBRGIsU0FDb0JBLEdBRHBCLG1CQUNxQ0QsTUFEckMsU0FDK0NBLE1BRC9DLFFBRUksRUFBRTRFLFFBQVEsQ0FBVixFQUFhQyxpQkFBaUIsSUFBOUIsRUFGSixFQUdJLFVBQUN6RCxHQUFELEVBQU0yQyxJQUFOLEVBQWU7QUFDYixjQUFJSyxXQUFXLEVBQWY7QUFDQWhFLGtCQUFRQyxHQUFSLENBQVkwRCxJQUFaO0FBQ0FBLGVBQUtlLE9BQUwsQ0FBYS9ELE9BQWIsQ0FBcUIsbUJBQVc7O0FBRTlCcUQscUJBQVNhLElBQVQsQ0FBY2hFLFFBQVE2RSxHQUF0QjtBQUNBcEYsb0JBQVEwRCxRQUFSO0FBQ0gsV0FKQztBQUtMLFNBWEQ7QUFZRCxPQWRNLENBQVA7QUFnQkgiLCJmaWxlIjoiUmVkaXNTZXJ2aWNlcy9QYWNrYWdlU2VydmljZS5qcyIsInNvdXJjZXNDb250ZW50IjpbImltcG9ydCB7IGNsaWVudCB9IGZyb20gXCIuLi9EYXRhU2VydmljZXMvcmVkaXMtbG9jYWxcIjtcclxuXHJcbnZhciByZWRpcyA9IHJlcXVpcmUoXCJyZWRpc1wiKTtcclxudmFyIGxyZWRpcyA9IHJlcXVpcmUoXCIuLi9EYXRhU2VydmljZXMvcmVkaXMtbG9jYWxcIik7XHJcbnZhciBtb21lbnQgPSByZXF1aXJlKFwibW9tZW50XCIpO1xyXG52YXIgcmVkaXNTZWFyY2ggPSByZXF1aXJlKFwiLi4vcmVkaXNlYXJjaGNsaWVudFwiKTtcclxudmFyIGZzID0gcmVxdWlyZShcImZzXCIpO1xyXG5cclxudmFyIFBhY2thZ2VVdGlsID0gcmVxdWlyZShcIi4uL1V0aWwvcGFja2FnZXV0aWxcIikuUGFja2FnZVV0aWxpdHk7XHJcbnZhciBwYWNrYWdlVXRpbCA9IG5ldyBQYWNrYWdlVXRpbCgpO1xyXG5jb25zdCBQS0dfSURYID0gXCJpbmRleDpwYWNrYWdlc1wiO1xyXG5jb25zdCBQS0dfUFJFRklYID0gXCJwYWNrYWdlczpcIjtcclxuZnVuY3Rpb24gY3JlYXRlRG9jdW1lbnQodFBhY2thZ2UpIHtcclxuICB2YXIgcGFja2FnZURvY3VtZW50ID0ge1xyXG4gICAgdHJhY2tpbmdObzogdFBhY2thZ2UudHJhY2tpbmdObyxcclxuICAgIHNreWJveDogdFBhY2thZ2Uuc2t5Ym94LFxyXG4gICAgY3VzdG9tZXI6IHRQYWNrYWdlLmN1c3RvbWVyLFxyXG4gICAgc2hpcHBlcjogdFBhY2thZ2Uuc2hpcHBlcixcclxuICAgIGRlc2NyaXB0aW9uOiB0UGFja2FnZS5kZXNjcmlwdGlvbixcclxuICAgIHNreWJveFY6IHRQYWNrYWdlLnNreWJveCxcclxuICAgIHN0YXR1czogdFBhY2thZ2Uuc3RhdHVzLFxyXG4gICAgbWlkOiB0UGFja2FnZS5taWQsXHJcbiAgICB2YWx1ZTogdFBhY2thZ2UudHR2YWx1ZVxyXG4gIH07XHJcbiAgY29uc29sZS5sb2coXCJhYm91dCB0byBhZGQgdGhlIHBhY2thZ2UgdG8gdGhlIGluZGV4XCIpO1xyXG4gIHJldHVybiBwYWNrYWdlRG9jdW1lbnQ7XHJcbn1cclxuZnVuY3Rpb24gc2V0UGFja2FnZUluVHJhbnNpdChrZXlzLCBtc2VhcmNoZXIpIHtcclxuICByZXR1cm4gbmV3IFByb21pc2UoKHJlc29sdmUsIHJlamVjdCkgPT4ge1xyXG4gICAgdmFyIGJhdGNoZXIgPSBtc2VhcmNoZXIuY2xpZW50LmJhdGNoKCk7XHJcbiAgICBrZXlzLmZvckVhY2goZWxlbWVudCA9PiB7XHJcbiAgICAgIHZhciB2YWx1ZSA9IHtcclxuICAgICAgICBzdGF0dXM6IDIsXHJcbiAgICAgICAgbG9jYXRpb246IFwiSW4gVHJhbnNpdFwiXHJcbiAgICAgIH07XHJcbiAgICAgIGNvbnNvbGUubG9nKGVsZW1lbnQgKyBcImlzIHRoZSBlbGVtZW50XCIpO1xyXG5cclxuICAgICAgYmF0Y2hlci5obXNldChQS0dfUFJFRklYICsgZWxlbWVudCwgdmFsdWUpO1xyXG4gICAgfSk7XHJcbiAgICBiYXRjaGVyLmV4ZWMoKGVyciwgcmVzdWx0KSA9PiB7XHJcbiAgICAgIGNvbnNvbGUubG9nKHJlc3VsdCk7XHJcbiAgICAgIC8vcmVhZGQgdGhlIGRvY3VtZW50cyBoZXJlXHJcbiAgICAgIGtleXMuZm9yRWFjaChlbGVtZW50ID0+IHtcclxuICAgICAgICBhZGRQYWNrYWdlVG9JbmRleChlbGVtZW50LCBtc2VhcmNoZXIpO1xyXG4gICAgICB9KTtcclxuICAgICAgcmVzb2x2ZShyZXN1bHQpO1xyXG4gICAgfSk7XHJcbiAgfSk7XHJcbn1cclxuXHJcbmZ1bmN0aW9uIGFkZFBhY2thZ2VUb0luZGV4KHRyYWNraW5nTm8sIG1zZWFyY2hlcikge1xyXG4gIGxyZWRpcy5nZXRQYWNrYWdlKHRyYWNraW5nTm8pLnRoZW4ocGFjayA9PiB7XHJcbiAgICBtc2VhcmNoZXIuZGVsRG9jdW1lbnQoUEtHX0lEWCwgYCR7cGFjay5taWR9LSR7dHJhY2tpbmdOb31gLCAoZXJyLCBkb25lKSA9PiB7XHJcbiAgICAgIHZhciBkb2N1bWVudCA9IGNyZWF0ZURvY3VtZW50KHBhY2spO1xyXG4gICAgICBjb25zb2xlLmxvZyhcInJlYWRkaW5nIHBhY2thZ2UgdG8gdGhlIGluZGV4IGxpa2UgYSBib3NzIFwiICsgdHJhY2tpbmdObyk7XHJcbiAgICAgIG1zZWFyY2hlci5hZGQocGFjay5taWQgKyBcIi1cIiArIHBhY2sudHJhY2tpbmdObywgZG9jdW1lbnQpO1xyXG4gICAgfSk7XHJcbiAgfSk7XHJcbn1cclxuZXhwb3J0IGNsYXNzIFBhY2thZ2VTZXJ2aWNlIHtcclxuICBjb25zdHJ1Y3RvcigpIHtcclxuICAgIHRoaXMuc2V0dXBJbmRleCgpO1xyXG4gIH1cclxuICBzZXR1cEluZGV4KCkge1xyXG4gICAgdGhpcy5teVNlYXJjaCA9IHJlZGlzU2VhcmNoKHJlZGlzLCBQS0dfSURYLCB7XHJcbiAgICAgIGNsaWVudE9wdGlvbnM6IHtcclxuICAgICAgICBob3N0OiBcInJlZGlzLTE0ODk3LmMyODIyLnVzLWVhc3QtMS1tei5lYzIuY2xvdWQucmxyY3AuY29tXCIsXHJcbiAgICAgICAgcG9ydDogXCIxNDg5N1wiLFxyXG4gICAgICAgIGF1dGhfcGFzczogXCJ0NWF0UnVXUWxPVzdWcDJ1aFpwUWl2Y0lvdERtVFBwbFwiXHJcbiAgICAgIH1cclxuICAgIH0pO1xyXG4gIH1cclxuICBzYXZlUGFja2FnZShib2R5KSB7XHJcbiAgICBcclxuICAgIHZhciBzZWFyY2hlciA9IHRoaXMubXlTZWFyY2g7IFxyXG4gICAgcmV0dXJuIG5ldyBQcm9taXNlKChyZXNvbHZlLCByZWplY3QpID0+IHtcclxuICAgICAgdmFyIGNQYWNrYWdlID0ge1xyXG4gICAgICAgIHNreWJveDogYm9keS5za3lib3gsXHJcbiAgICAgICAgY3VzdG9tZXI6IGJvZHkuY3VzdG9tZXIucmVwbGFjZShcIi1cIiwgXCJcIikudHJpbSgpLFxyXG4gICAgICAgIHRyYWNraW5nTm86IGJvZHkudHJhY2tpbmcsXHJcbiAgICAgICAgZHV0eVBlcmNlbnQ6IDAuMixcclxuICAgICAgICBkZXNjcmlwdGlvbjogYm9keS5kZXNjcmlwdGlvbixcclxuICAgICAgICBzaGlwcGVyOiBib2R5LnNoaXBwZXIsXHJcbiAgICAgICAgdmFsdWU6IE51bWJlcihib2R5LnZhbHVlKSxcclxuICAgICAgICBwaWVjZXM6IE51bWJlcihib2R5LnBpZWNlcyksXHJcbiAgICAgICAgd2VpZ2h0OiBOdW1iZXIoYm9keS53ZWlnaHQpLFxyXG4gICAgICAgIHN0YXR1czogMSxcclxuICAgICAgICBsb2NhdGlvbjogXCJNaWFtaVwiLFxyXG4gICAgICAgIG1pZDogYm9keS5taWQsXHJcbiAgICAgICAgaGFzT3B0OiB0cnVlLFxyXG4gICAgICAgIG10eXBlOiBib2R5Lm10eXBlXHJcbiAgICAgIH07XHJcbiAgICAgIGNvbnNvbGUubG9nKFwiYWJvdXQgdG8gc2F2ZSB0aGUgcGFja2FnZVwiKTtcclxuICAgICAgaWYgKHR5cGVvZiBjUGFja2FnZS5zaGlwcGVyID09PSBcInVuZGVmaW5lZFwiKSBjUGFja2FnZS5zaGlwcGVyID0gXCJcIjtcclxuICAgICAgaWYgKHR5cGVvZiBjUGFja2FnZS5kZXNjcmlwdGlvbiA9PT0gXCJ1bmRlZmluZWRcIilcclxuICAgICAgICBjUGFja2FnZS5kZXNjcmlwdGlvbiA9IFwiXCI7XHJcbiAgICAgIGNvbnNvbGUubG9nKGJvZHkpO1xyXG4gICAgICBpZiAoTnVtYmVyKGJvZHkuaXNCdXNpbmVzcykgPT0gMSkge1xyXG4gICAgICAgIGNQYWNrYWdlLmhhc09wdCA9IGZhbHNlO1xyXG4gICAgICB9XHJcbiAgICAgIGNQYWNrYWdlID0gcGFja2FnZVV0aWwuY2FsY3VsYXRlRmVlcyhjUGFja2FnZSk7XHJcbiAgICAgIGNvbnNvbGUubG9nKFwicGFja2FnZSB3aXRoIGZlZXNcIik7XHJcblxyXG4gICAgICAvL3dlIGFsc28gd2FudCB0byBjYWxjdWxhdGUgdGhlIHRoZSBwYWNrYWdlIGZlZXMgb25lIHRpbWUuLi4uLi5cclxuICAgICAgLy93ZSBoYXZlIHRoZSBwYWNrYWdlIGRldGFpbHMgaGVyZSAuLiBub3cgd2UgbmVlZCB0byBnZXQgdGhlIGV4aXN0aW5nIHBhY2thZ2VcclxuXHJcbiAgICAgIHZhciBjb250YWluZXIgPSBcIlwiO1xyXG4gICAgICB2YXIgY29udGFpbmVyTm8gPSBcIlwiO1xyXG4gICAgICBpZiAodHlwZW9mIGJvZHkuYmFnICE9IFwidW5kZWZpbmVkXCIpIHtcclxuICAgICAgICBjUGFja2FnZS5iYWcgPSBib2R5LmJhZztcclxuICAgICAgICBjb250YWluZXIgPSBcImJhZ1wiO1xyXG4gICAgICAgIGNvbnRhaW5lck5vID0gY1BhY2thZ2UuYmFnO1xyXG4gICAgICB9XHJcbiAgICAgIGlmICh0eXBlb2YgYm9keS5za2lkICE9IFwidW5kZWZpbmVkXCIpIHtcclxuICAgICAgICBjUGFja2FnZS5za2lkID0gYm9keS5za2lkO1xyXG4gICAgICAgIGNvbnRhaW5lciA9IFwic2tpZFwiO1xyXG4gICAgICAgIGNvbnRhaW5lck5vID0gY1BhY2thZ2Uuc2tpZDtcclxuICAgICAgfVxyXG4gICAgICAvL3dlIG5lZWQgdG8gY2hlY2sgdG8gc2VlIG9mIHRoZSBvd25lciBpcyBhIGJ1c2luZXNzIGhlcmVcclxuXHJcbiAgICAgIGxyZWRpcy5nZXRQYWNrYWdlKGNQYWNrYWdlLnRyYWNraW5nTm8pLnRoZW4ocCA9PiB7XHJcbiAgICAgICAgaWYgKHApIHtcclxuICAgICAgICAgIHZhciBjdXJyZW50Q29udGFpbmVyID0gYG1hbmlmZXN0OiR7cC5taWR9OiR7cC5tdHlwZX06JHtjb250YWluZXJ9OmA7XHJcbiAgICAgICAgICBjb25zb2xlLmxvZyhcImZvdW5kIHBhY2thZ2UgXCIpO1xyXG4gICAgICAgICAgY29uc29sZS5sb2cocCk7XHJcbiAgICAgICAgICBpZiAoY29udGFpbmVyID09IFwiYmFnXCIpIHtcclxuICAgICAgICAgICAgLy9jaGVjayB0byBzZWUgaWYgdGhlIGJhY2sgbm8gaXMgdGhlIHNhbWUuXHJcbiAgICAgICAgICAgIGlmIChwLmJhZyAhPSBjUGFja2FnZS5iYWcpIHtcclxuICAgICAgICAgICAgICAvL3JlbW92ZSBpdCBmcm9tIHRoZSBvcmlnaW5hbCBsaXN0XHJcbiAgICAgICAgICAgICAgbHJlZGlzLnNyZW0oY3VycmVudENvbnRhaW5lciArIHAuYmFnLCBwLnRyYWNraW5nTm8pO1xyXG4gICAgICAgICAgICAgIGNvbnNvbGUubG9nKFxyXG4gICAgICAgICAgICAgICAgXCJyZW1vdmUgcGFja2FnZSBmcm9tIGN1cnJlbnQgc2V0IFwiICsgY3VycmVudENvbnRhaW5lclxyXG4gICAgICAgICAgICAgICk7XHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICAgIH0gZWxzZSB7XHJcbiAgICAgICAgICAgIC8vY2hlY2sgdG8gc2VlIGlmIHRoZSBza2lkIG51bWJlciBpcyB0aGUgc2FtZS5cclxuICAgICAgICAgICAgaWYgKHAuc2tpZCAhPSBjUGFja2FnZS5za2lkKSB7XHJcbiAgICAgICAgICAgICAgLy9yZW1vdmUgaXQgZnJvbSB0aGUgb3JpZ2luYWwgbGlzdFxyXG4gICAgICAgICAgICAgIGxyZWRpcy5zcmVtKGN1cnJlbnRDb250YWluZXIgKyBwLnNraWQsIHAudHJhY2tpbmdObyk7XHJcbiAgICAgICAgICAgICAgY29uc29sZS5sb2coXHJcbiAgICAgICAgICAgICAgICBcInJlbW92ZSBwYWNrYWdlIGZyb20gY3VycmVudCBzZXQgXCIgKyBjdXJyZW50Q29udGFpbmVyXHJcbiAgICAgICAgICAgICAgKTtcclxuICAgICAgICAgICAgfVxyXG4gICAgICAgICAgfVxyXG4gICAgICAgIH0gZWxzZSB7XHJcbiAgICAgICAgICAvLyB0aGUgcGFja2FnZSBkb2Vzbid0IGV4aXN0IHVwZGF0ZSB0aGUgY291bnRlclxyXG4gICAgICAgICAgbHJlZGlzLmNsaWVudC5pbmNyKFwibWNvdW50ZXI6XCIgKyBjUGFja2FnZS5taWQpO1xyXG4gICAgICAgICAgXHJcbiAgICAgICAgfVxyXG5cclxuICAgICAgICBscmVkaXNcclxuICAgICAgICAgIC5obXNldChcInBhY2thZ2VzOlwiICsgY1BhY2thZ2UudHJhY2tpbmdObywgY1BhY2thZ2UpXHJcbiAgICAgICAgICAudGhlbihmdW5jdGlvbihyZXN1bHQpIHtcclxuICAgICAgICAgICAgLy9hZGQgdG8gcXVldWUgZm9yIHBlcnNpc3RlbnQgcHJvY2Vzc2luZ1xyXG4gICAgICAgICAgICBcclxuICAgICAgICAgICAgdmFyIG1hbmlmZXN0S2V5ID0gYG1hbmlmZXN0OiR7Y1BhY2thZ2UubWlkfToke1xyXG4gICAgICAgICAgICAgIGNQYWNrYWdlLm10eXBlXHJcbiAgICAgICAgICAgIH06JHtjb250YWluZXJ9OiR7Y29udGFpbmVyTm99YDtcclxuICAgICAgICAgICAgY29uc29sZS5sb2coXCJhYm91dCB0byBjcmVhdGUgdGhlIGRvY3VtZW50Li4uLlwiKTtcclxuICAgICAgICAgICAgYWRkUGFja2FnZVRvSW5kZXgoY1BhY2thZ2UudHJhY2tpbmdObyxzZWFyY2hlcik7IFxyXG4gICAgICAgICAgICBjb25zb2xlLmxvZyhcImFkZGVkIHRoZSBwYWNrYWdlIHRvIGluZGV4XCIpO1xyXG4gICAgICAgICAgICBscmVkaXNcclxuICAgICAgICAgICAgICAuc2V0QWRkKG1hbmlmZXN0S2V5LCBjUGFja2FnZS50cmFja2luZ05vKVxyXG4gICAgICAgICAgICAgIC50aGVuKGZ1bmN0aW9uKHNSZXN1bHQpIHtcclxuICAgICAgICAgICAgICAgIC8vZ2V0IHRoZSBtZW1iZXJzIG9uZSB0aW1lIGhlcmVcclxuICAgICAgICAgICAgICAgIGNvbnNvbGUubG9nKFwiYWRkZWQgdGhlIHBhY2thZ2UgdG8gdGhlIHNldFwiKTtcclxuICAgICAgICAgICAgICAgIGNvbnNvbGUubG9nKG1hbmlmZXN0S2V5KTtcclxuICAgICAgICAgICAgICAgIGxyZWRpc1xyXG4gICAgICAgICAgICAgICAgICAuZ2V0TWVtYmVycyhtYW5pZmVzdEtleSlcclxuICAgICAgICAgICAgICAgICAgLnRoZW4oZGF0YSA9PiB7XHJcbiAgICAgICAgICAgICAgICAgICAgY29uc29sZS5sb2coXCJkYXRhXCIpO1xyXG4gICAgICAgICAgICAgICAgICAgIGNvbnNvbGUubG9nKGRhdGEpO1xyXG4gICAgICAgICAgICAgICAgICAgIFByb21pc2UuYWxsKGRhdGEubWFwKGxyZWRpcy5nZXRQYWNrYWdlKSk7XHJcbiAgICAgICAgICAgICAgICAgIH0pXHJcbiAgICAgICAgICAgICAgICAgIC50aGVuKGZ1bmN0aW9uKHJkYXRhKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgLy93ZSBuZWVkIHRvIGFsZXJ0IHRoZSBwZXJzb24gdGhhdCB0aGUgcGFja2FnZSBpcyBoZXJlIHNvIHJlYWQgZW1haWwgZXRjLlxyXG4gICAgICAgICAgICAgICAgICAgIC8vYWRkIHRvIHRoZSBpbmRleFxyXG4gICAgICAgICAgICAgICAgICAgIGNvbnNvbGUubG9nKFwiZGF0YVwiKTtcclxuICAgICAgICAgICAgICAgICAgICBjb25zb2xlLmxvZyhyZGF0YSk7XHJcblxyXG4gICAgICAgICAgICAgICAgICAgIHJlc29sdmUoe1xyXG4gICAgICAgICAgICAgICAgICAgICAgc2F2ZWQ6IHRydWUsXHJcbiAgICAgICAgICAgICAgICAgICAgICBwYWNrYWdlczogcmRhdGEsXHJcbiAgICAgICAgICAgICAgICAgICAgICBzUGFja2FnZTogY1BhY2thZ2VcclxuICAgICAgICAgICAgICAgICAgICB9KTtcclxuICAgICAgICAgICAgICAgICAgfSlcclxuICAgICAgICAgICAgICAgICAgLmNhdGNoKGVycjMgPT4ge1xyXG4gICAgICAgICAgICAgICAgICAgIGNvbnNvbGUubG9nKGVycjMpO1xyXG4gICAgICAgICAgICAgICAgICAgIHJlamVjdCh7XHJcbiAgICAgICAgICAgICAgICAgICAgICBlcnI6IGVycjMsXHJcbiAgICAgICAgICAgICAgICAgICAgICBzYXZlZDogdHJ1ZSxcclxuICAgICAgICAgICAgICAgICAgICAgIGxpc3Rpbmc6IGZhbHNlXHJcbiAgICAgICAgICAgICAgICAgICAgfSk7XHJcbiAgICAgICAgICAgICAgICAgIH0pO1xyXG4gICAgICAgICAgICAgIH0pXHJcbiAgICAgICAgICAgICAgLmNhdGNoKGZ1bmN0aW9uKGVycikge1xyXG4gICAgICAgICAgICAgICAgcmVzb2x2ZSh7XHJcbiAgICAgICAgICAgICAgICAgIHNhdmVkOiBmYWxzZVxyXG4gICAgICAgICAgICAgICAgfSk7XHJcbiAgICAgICAgICAgICAgfSk7XHJcbiAgICAgICAgICB9KVxyXG4gICAgICAgICAgLmNhdGNoKGZ1bmN0aW9uKGVycjIpIHtcclxuICAgICAgICAgICAgcmVqZWN0KHtcclxuICAgICAgICAgICAgICBzYXZlZDogZmFsc2VcclxuICAgICAgICAgICAgfSk7XHJcbiAgICAgICAgICB9KTtcclxuXHJcbiAgICAgICAgLy9zYXZlIHRoZSBwYWNrYWdlIHRvIHRoZSBwYWNrYWdlIE5TXHJcbiAgICAgIH0pO1xyXG4gICAgfSk7XHJcbiAgfVxyXG5cclxuICB1cGRhdGVNYW5pZmVzdFBhY2thZ2VUb0luVHJhbnNpdChtaWQpIHtcclxuICAgIC8vZ2V0IGFsbCB0aGUgcGFja2FnZXNcclxuICAgIC8vd2UgbmVlZCB0byB1cGRhdGUgdGhlIGluZGV4IGF0IHRoaXMgcG9pbnQgYXMgd2VsbFxyXG4gICAgdmFyIG1zZWFyY2ggPSB0aGlzLm15U2VhcmNoO1xyXG4gICAgdGhpcy5teVNlYXJjaC5zZWFyY2goXHJcbiAgICAgIGBAbWlkOlske21pZH0gJHttaWR9XWAsXHJcbiAgICAgIHsgb2Zmc2V0OiAwLCBudW1iZXJPZlJlc3VsdHM6IDUwMDAgfSxcclxuICAgICAgKGVyciwgZGF0YSkgPT4ge1xyXG4gICAgICAgIHZhciBwYWNrYWdlcyA9IFtdO1xyXG4gICAgICAgIGNvbnNvbGUubG9nKGRhdGEpO1xyXG4gICAgICAgIGRhdGEucmVzdWx0cy5mb3JFYWNoKGVsZW1lbnQgPT4ge1xyXG4gICAgICAgICAgdmFyIG9sZERvY0lkID0gZWxlbWVudC5kb2NJZDtcclxuICAgICAgICAgIGVsZW1lbnQuZG9jSWQgPSBlbGVtZW50LmRvY0lkLnJlcGxhY2UoYCR7bWlkfS1gLCBcIlwiKTtcclxuICAgICAgICAgIHBhY2thZ2VzLnB1c2goZWxlbWVudC5kb2NJZCk7XHJcbiAgICAgICAgICAvLyBpIGNvdWxkIGRlbGV0ZSBoZXJlXHJcbiAgICAgICAgICAvLyBtc2VhcmNoLmRlbERvY3VtZW50KFBLR19JRFgsb2xkRG9jSWQpXHJcbiAgICAgICAgICAvL3VwZGF0ZSBhbGwgdGhlIHBhY2thZ2VzXHJcbiAgICAgICAgfSk7XHJcbiAgICAgICAgc2V0UGFja2FnZUluVHJhbnNpdChwYWNrYWdlcywgbXNlYXJjaCwgbWlkKS50aGVuKGZ1bmN0aW9uKFxyXG4gICAgICAgICAgdXBkYXRlZFBhY2thZ2VzXHJcbiAgICAgICAgKSB7XHJcbiAgICAgICAgICBjb25zb2xlLmxvZyhcInVwZGF0ZWQgcGFja2FnZXNcIik7XHJcbiAgICAgICAgICBjb25zb2xlLmxvZyh1cGRhdGVkUGFja2FnZXMpO1xyXG4gICAgICAgIH0pO1xyXG4gICAgICB9XHJcbiAgICApO1xyXG4gIH1cclxuICByZW1vdmVQYWNrYWdlKHRyYWNraW5nTm8sIG1pZCkge1xyXG4gICAgdmFyIG1zZWFyY2ggPSB0aGlzLm15U2VhcmNoO1xyXG4gICAgcmV0dXJuIG5ldyBQcm9taXNlKChyZXNvbHZlLCByZWplY3QpID0+IHtcclxuICAgICAgdmFyIG1hbmlmZXN0ID0gbWlkO1xyXG4gICAgICB2YXIgbWFuaWZlc3RLZXkgPSBcIm1hbmlmZXN0OlwiICsgbWFuaWZlc3QgKyBcIjoqXCI7XHJcblxyXG4gICAgICBscmVkaXMuZGVsKFwicGFja2FnZXM6XCIgKyB0cmFja2luZ05vKS50aGVuKGZ1bmN0aW9uKHJlc3VsdCkge1xyXG4gICAgICAgIGNvbnNvbGUubG9nKHJlc3VsdCk7XHJcbiAgICAgICAgbXNlYXJjaC5kZWxEb2N1bWVudChQS0dfSURYLCBgJHttaWR9LSR7dHJhY2tpbmdOb31gKTtcclxuICAgICAgICAvL3dlIG5lZWQgdG8gcmVtb3ZlIGZyb20gdGhlIGluZGV4IGFuZCBkZWMgdGhlIGNvdW50ZXJcclxuICAgICAgICBscmVkaXMuY2xpZW50LmRlY3IoXCJtY291bnRlcjpcIiArIG1pZCk7XHJcbiAgICAgICAgLy9yU2VydmljZXMucGFja2FnZVNlcnZpY2Uucm1QYWNrYWdlKG1pZCwgdHJhY2tpbmdObyk7XHJcbiAgICAgICAgbHJlZGlzLmdldEtleXMobWFuaWZlc3RLZXkpLnRoZW4oa1Jlc3VsdCA9PiB7XHJcbiAgICAgICAgICAvL3RoZSBsaXN0IG9mIGFsbCB0aGUgc2V0cyAuLi53ZSBuZWVkIHRvIHJlbW92ZSB0aGUga2V5IGZyb20gZWFjaCBvbmVcclxuICAgICAgICAgIHZhciBrZXlzQ291bnQgPSAwO1xyXG5cclxuICAgICAgICAgIGtSZXN1bHQuZm9yRWFjaChlbGVtZW50ID0+IHtcclxuICAgICAgICAgICAgY29uc29sZS5sb2coXHJcbiAgICAgICAgICAgICAgYHJlbW92aW5nICR7dHJhY2tpbmdOb30gcGFja2FnZSBtYW5pZmVzdCBzZXQgJHtlbGVtZW50fSBgXHJcbiAgICAgICAgICAgICk7XHJcbiAgICAgICAgICAgIGxyZWRpcy5zcmVtKGVsZW1lbnQsIHRyYWNraW5nTm8pLnRoZW4oZnVuY3Rpb24oclJlc3VsdCkge1xyXG4gICAgICAgICAgICAgIGNvbnNvbGUubG9nKHJSZXN1bHQpO1xyXG4gICAgICAgICAgICAgIGNvbnNvbGUubG9nKFwicmVtb3ZlZFwiKTtcclxuICAgICAgICAgICAgICBpZiAoa2V5c0NvdW50ID09IGtSZXN1bHQubGVuZ3RoIC0gMSkga2V5c0NvdW50Kys7XHJcbiAgICAgICAgICAgIH0pO1xyXG4gICAgICAgICAgfSk7XHJcbiAgICAgICAgICByZXNvbHZlKHtcclxuICAgICAgICAgICAgZGVsZXRlZDogdHJ1ZVxyXG4gICAgICAgICAgfSk7XHJcbiAgICAgICAgfSk7XHJcblxyXG4gICAgICAgIC8vd2UgYWxzbyBuZWVkIHRvIHJlbW92ZSBmcm9tIGFueSBzZXRzXHJcbiAgICAgIH0pO1xyXG4gICAgfSk7XHJcbiAgfVxyXG4gIHN0b3JlUGFja2FnZUZvclBpY2t1cCh0cmFja2luZ05vLGJpbil7XHJcbiAgICB2YXIgc2VhcmNoZXIgPSB0aGlzLm15U2VhcmNoO1xyXG4gICAgcmV0dXJuIG5ldyBQcm9taXNlKChyZXNvbHZlLHJlamVjdCk9PntcclxuICAgICAgIGxyZWRpcy5obXNldChQS0dfUFJFRklYK3RyYWNraW5nTm8se3N0YXR1czo0LGxvY2F0aW9uOmJpbn0pLnRoZW4oKHJlc3VsdCk9PntcclxuICAgICAgICAgbHJlZGlzLmdldFBhY2thZ2UodHJhY2tpbmdObykudGhlbigocGtnKT0+e1xyXG4gICAgICAgICAgYWRkUGFja2FnZVRvSW5kZXgodHJhY2tpbmdObyxzZWFyY2hlcikgOyBcclxuICAgICAgICAgIHJlc29sdmUocGtnKTsgICBcclxuICAgICAgICAgfSk7XHJcbiAgICAgICB9KSBcclxuICAgIH0pOyBcclxuICB9XHJcbiAgdXBkYXRlUGFja2FnZUluZGV4KHRyYWNraW5nKXtcclxuICAgICAgcmV0dXJuIG5ldyBQcm9taXNlKChyZXNvbHZlLHJlamVjdCk9PntcclxuICAgICAgICAgIHZhciBtc2VhcmNoID0gdGhpcy5teVNlYXJjaDsgXHJcbiAgICAgICAgICBhZGRQYWNrYWdlVG9JbmRleCh0cmFja2luZyxtc2VhcmNoKTsgXHJcbiAgICAgICAgIHJlc29sdmUoeyd1cGRhdGVkJzp0cnVlfSk7XHJcbiAgICAgIH0pXHJcbiAgfVxyXG4gIGdldEN1c3RvbWVyUGFja2FnZXMoc2t5Ym94KSB7fVxyXG4gIGdldE1hbmlmZXN0UGFja2FnZXNCeVN0YXR1cyhtaWQsc3RhdHVzKSB7XHJcbiAgICAgIHJldHVybiBuZXcgUHJvbWlzZSgocmVzb2x2ZSxyZWplY3QpPT57XHJcbiAgICAgICAgICBjb25zb2xlLmxvZyhgQG1pZDpbJHttaWR9ICR7bWlkfV0gQHN0YXR1cz1bJHtzdGF0dXN9ICR7c3RhdHVzfV1gKVxyXG4gICAgICAgIHRoaXMubXlTZWFyY2guc2VhcmNoKFxyXG4gICAgICAgICAgICBgQG1pZDpbJHttaWR9ICR7bWlkfV0gQHN0YXR1czpbJHtzdGF0dXN9ICR7c3RhdHVzfV1gLFxyXG4gICAgICAgICAgICB7IG9mZnNldDogMCwgbnVtYmVyT2ZSZXN1bHRzOiA1MDAwIH0sXHJcbiAgICAgICAgICAgIChlcnIsIGRhdGEpID0+IHtcclxuICAgICAgICAgICAgICB2YXIgcGFja2FnZXMgPSBbXTtcclxuICAgICAgICAgICAgICBjb25zb2xlLmxvZyhkYXRhKTtcclxuICAgICAgICAgICAgICBkYXRhLnJlc3VsdHMuZm9yRWFjaChlbGVtZW50ID0+IHtcclxuXHJcbiAgICAgICAgICAgICAgICBwYWNrYWdlcy5wdXNoKGVsZW1lbnQuZG9jKTtcclxuICAgICAgICAgICAgICAgIHJlc29sdmUocGFja2FnZXMpOyAgICAgICAgICAgICAgICAgXHJcbiAgICAgICAgICAgIH0pO1xyXG4gICAgICAgIH0pO1xyXG4gICAgICB9KTtcclxuICBcclxuICB9ICAgICBcclxufVxyXG4iXX0=
