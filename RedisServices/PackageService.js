"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});

var _createClass = function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; }();

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

var redis = require("redis");
var lredis = require("./redis-local");
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
        clientOptions: lredis.searchClientDetails
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
//# sourceMappingURL=data:application/json;charset=utf8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIlJlZGlzU2VydmljZXMvUGFja2FnZVNlcnZpY2UuZXM2Il0sIm5hbWVzIjpbInJlZGlzIiwicmVxdWlyZSIsImxyZWRpcyIsIm1vbWVudCIsInJlZGlzU2VhcmNoIiwiZnMiLCJQYWNrYWdlVXRpbCIsIlBhY2thZ2VVdGlsaXR5IiwicGFja2FnZVV0aWwiLCJQS0dfSURYIiwiUEtHX1BSRUZJWCIsImNyZWF0ZURvY3VtZW50IiwidFBhY2thZ2UiLCJwYWNrYWdlRG9jdW1lbnQiLCJ0cmFja2luZ05vIiwic2t5Ym94IiwiY3VzdG9tZXIiLCJzaGlwcGVyIiwiZGVzY3JpcHRpb24iLCJza3lib3hWIiwic3RhdHVzIiwibWlkIiwidmFsdWUiLCJ0dHZhbHVlIiwiY29uc29sZSIsImxvZyIsInNldFBhY2thZ2VJblRyYW5zaXQiLCJrZXlzIiwibXNlYXJjaGVyIiwiUHJvbWlzZSIsInJlc29sdmUiLCJyZWplY3QiLCJiYXRjaGVyIiwiY2xpZW50IiwiYmF0Y2giLCJmb3JFYWNoIiwibG9jYXRpb24iLCJlbGVtZW50IiwiaG1zZXQiLCJleGVjIiwiZXJyIiwicmVzdWx0IiwiYWRkUGFja2FnZVRvSW5kZXgiLCJnZXRQYWNrYWdlIiwidGhlbiIsImRlbERvY3VtZW50IiwicGFjayIsImRvbmUiLCJkb2N1bWVudCIsImFkZCIsIlBhY2thZ2VTZXJ2aWNlIiwic2V0dXBJbmRleCIsIm15U2VhcmNoIiwiY2xpZW50T3B0aW9ucyIsInNlYXJjaENsaWVudERldGFpbHMiLCJib2R5Iiwic2VhcmNoZXIiLCJjUGFja2FnZSIsInJlcGxhY2UiLCJ0cmltIiwidHJhY2tpbmciLCJkdXR5UGVyY2VudCIsIk51bWJlciIsInBpZWNlcyIsIndlaWdodCIsImhhc09wdCIsIm10eXBlIiwiaXNCdXNpbmVzcyIsImNhbGN1bGF0ZUZlZXMiLCJjb250YWluZXIiLCJjb250YWluZXJObyIsImJhZyIsInNraWQiLCJwIiwiY3VycmVudENvbnRhaW5lciIsInNyZW0iLCJpbmNyIiwibWFuaWZlc3RLZXkiLCJzZXRBZGQiLCJzUmVzdWx0IiwiZ2V0TWVtYmVycyIsImRhdGEiLCJhbGwiLCJtYXAiLCJyZGF0YSIsInNhdmVkIiwicGFja2FnZXMiLCJzUGFja2FnZSIsImNhdGNoIiwiZXJyMyIsImxpc3RpbmciLCJlcnIyIiwibXNlYXJjaCIsInNlYXJjaCIsIm9mZnNldCIsIm51bWJlck9mUmVzdWx0cyIsInJlc3VsdHMiLCJvbGREb2NJZCIsImRvY0lkIiwicHVzaCIsInVwZGF0ZWRQYWNrYWdlcyIsIm1hbmlmZXN0IiwiZGVsIiwiZGVjciIsImdldEtleXMiLCJrZXlzQ291bnQiLCJrUmVzdWx0IiwiclJlc3VsdCIsImxlbmd0aCIsImRlbGV0ZWQiLCJiaW4iLCJwa2ciLCJkb2MiXSwibWFwcGluZ3MiOiI7Ozs7Ozs7Ozs7QUFFQSxJQUFJQSxRQUFRQyxRQUFRLE9BQVIsQ0FBWjtBQUNBLElBQUlDLFNBQVNELFFBQVEsZUFBUixDQUFiO0FBQ0EsSUFBSUUsU0FBU0YsUUFBUSxRQUFSLENBQWI7QUFDQSxJQUFJRyxjQUFjSCxRQUFRLHFCQUFSLENBQWxCO0FBQ0EsSUFBSUksS0FBS0osUUFBUSxJQUFSLENBQVQ7O0FBRUEsSUFBSUssY0FBY0wsUUFBUSxxQkFBUixFQUErQk0sY0FBakQ7QUFDQSxJQUFJQyxjQUFjLElBQUlGLFdBQUosRUFBbEI7QUFDQSxJQUFNRyxVQUFVLGdCQUFoQjtBQUNBLElBQU1DLGFBQWEsV0FBbkI7QUFDQSxTQUFTQyxjQUFULENBQXdCQyxRQUF4QixFQUFrQztBQUNoQyxNQUFJQyxrQkFBa0I7QUFDcEJDLGdCQUFZRixTQUFTRSxVQUREO0FBRXBCQyxZQUFRSCxTQUFTRyxNQUZHO0FBR3BCQyxjQUFVSixTQUFTSSxRQUhDO0FBSXBCQyxhQUFTTCxTQUFTSyxPQUpFO0FBS3BCQyxpQkFBYU4sU0FBU00sV0FMRjtBQU1wQkMsYUFBU1AsU0FBU0csTUFORTtBQU9wQkssWUFBUVIsU0FBU1EsTUFQRztBQVFwQkMsU0FBS1QsU0FBU1MsR0FSTTtBQVNwQkMsV0FBT1Ys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QmtCLFFBQWxCLEVBQTJCZ0MsT0FBM0I7QUFDRDlELGdCQUFRLEVBQUMsV0FBVSxJQUFYLEVBQVI7QUFDRixPQUpNLENBQVA7QUFLSDs7O3dDQUNtQmYsTSxFQUFRLENBQUU7OztnREFDRk0sRyxFQUFJRCxNLEVBQVE7QUFBQTs7QUFDcEMsYUFBTyxJQUFJUyxPQUFKLENBQVksVUFBQ0MsT0FBRCxFQUFTQyxNQUFULEVBQWtCO0FBQ2pDUCxnQkFBUUMsR0FBUixZQUFxQkosR0FBckIsU0FBNEJBLEdBQTVCLG1CQUE2Q0QsTUFBN0MsU0FBdURBLE1BQXZEO0FBQ0YsZUFBS2dDLFFBQUwsQ0FBY3lDLE1BQWQsWUFDYXhFLEdBRGIsU0FDb0JBLEdBRHBCLG1CQUNxQ0QsTUFEckMsU0FDK0NBLE1BRC9DLFFBRUksRUFBRTBFLFFBQVEsQ0FBVixFQUFhQyxpQkFBaUIsSUFBOUIsRUFGSixFQUdJLFVBQUN2RCxHQUFELEVBQU15QyxJQUFOLEVBQWU7QUFDYixjQUFJSyxXQUFXLEVBQWY7QUFDQTlELGtCQUFRQyxHQUFSLENBQVl3RCxJQUFaO0FBQ0FBLGVBQUtlLE9BQUwsQ0FBYTdELE9BQWIsQ0FBcUIsbUJBQVc7O0FBRTlCbUQscUJBQVNhLElBQVQsQ0FBYzlELFFBQVEyRSxHQUF0QjtBQUNBbEYsb0JBQVF3RCxRQUFSO0FBQ0gsV0FKQztBQUtMLFNBWEQ7QUFZRCxPQWRNLENBQVA7QUFnQkgiLCJmaWxlIjoiUmVkaXNTZXJ2aWNlcy9QYWNrYWdlU2VydmljZS5qcyIsInNvdXJjZXNDb250ZW50IjpbIlxuXG52YXIgcmVkaXMgPSByZXF1aXJlKFwicmVkaXNcIik7XG52YXIgbHJlZGlzID0gcmVxdWlyZShcIi4vcmVkaXMtbG9jYWxcIik7XG52YXIgbW9tZW50ID0gcmVxdWlyZShcIm1vbWVudFwiKTtcbnZhciByZWRpc1NlYXJjaCA9IHJlcXVpcmUoXCIuLi9yZWRpc2VhcmNoY2xpZW50XCIpO1xudmFyIGZzID0gcmVxdWlyZShcImZzXCIpO1xuXG52YXIgUGFja2FnZVV0aWwgPSByZXF1aXJlKFwiLi4vVXRpbC9wYWNrYWdldXRpbFwiKS5QYWNrYWdlVXRpbGl0eTtcbnZhciBwYWNrYWdlVXRpbCA9IG5ldyBQYWNrYWdlVXRpbCgpO1xuY29uc3QgUEtHX0lEWCA9IFwiaW5kZXg6cGFja2FnZXNcIjtcbmNvbnN0IFBLR19QUkVGSVggPSBcInBhY2thZ2VzOlwiO1xuZnVuY3Rpb24gY3JlYXRlRG9jdW1lbnQodFBhY2thZ2UpIHtcbiAgdmFyIHBhY2thZ2VEb2N1bWVudCA9IHtcbiAgICB0cmFja2luZ05vOiB0UGFja2FnZS50cmFja2luZ05vLFxuICAgIHNreWJveDogdFBhY2thZ2Uuc2t5Ym94LFxuICAgIGN1c3RvbWVyOiB0UGFja2FnZS5jdXN0b21lcixcbiAgICBzaGlwcGVyOiB0UGFja2FnZS5zaGlwcGVyLFxuICAgIGRlc2NyaXB0aW9uOiB0UGFja2FnZS5kZXNjcmlwdGlvbixcbiAgICBza3lib3hWOiB0UGFja2FnZS5za3lib3gsXG4gICAgc3RhdHVzOiB0UGFja2FnZS5zdGF0dXMsXG4gICAgbWlkOiB0UGFja2FnZS5taWQsXG4gICAgdmFsdWU6IHRQYWNrYWdlLnR0dmFsdWVcbiAgfTtcbiAgY29uc29sZS5sb2coXCJhYm91dCB0byBhZGQgdGhlIHBhY2thZ2UgdG8gdGhlIGluZGV4XCIpO1xuICByZXR1cm4gcGFja2FnZURvY3VtZW50O1xufVxuZnVuY3Rpb24gc2V0UGFja2FnZUluVHJhbnNpdChrZXlzLCBtc2VhcmNoZXIpIHtcbiAgcmV0dXJuIG5ldyBQcm9taXNlKChyZXNvbHZlLCByZWplY3QpID0+IHtcbiAgICB2YXIgYmF0Y2hlciA9IG1zZWFyY2hlci5jbGllbnQuYmF0Y2goKTtcbiAgICBrZXlzLmZvckVhY2goZWxlbWVudCA9PiB7XG4gICAgICB2YXIgdmFsdWUgPSB7XG4gICAgICAgIHN0YXR1czogMixcbiAgICAgICAgbG9jYXRpb246IFwiSW4gVHJhbnNpdFwiXG4gICAgICB9O1xuICAgICAgY29uc29sZS5sb2coZWxlbWVudCArIFwiaXMgdGhlIGVsZW1lbnRcIik7XG5cbiAgICAgIGJhdGNoZXIuaG1zZXQoUEtHX1BSRUZJWCArIGVsZW1lbnQsIHZhbHVlKTtcbiAgICB9KTtcbiAgICBiYXRjaGVyLmV4ZWMoKGVyciwgcmVzdWx0KSA9PiB7XG4gICAgICBjb25zb2xlLmxvZyhyZXN1bHQpO1xuICAgICAgLy9yZWFkZCB0aGUgZG9jdW1lbnRzIGhlcmVcbiAgICAgIGtleXMuZm9yRWFjaChlbGVtZW50ID0+IHtcbiAgICAgICAgYWRkUGFja2FnZVRvSW5kZXgoZWxlbWVudCwgbXNlYXJjaGVyKTtcbiAgICAgIH0pO1xuICAgICAgcmVzb2x2ZShyZXN1bHQpO1xuICAgIH0pO1xuICB9KTtcbn1cblxuZnVuY3Rpb24gYWRkUGFja2FnZVRvSW5kZXgodHJhY2tpbmdObywgbXNlYXJjaGVyKSB7XG4gIGxyZWRpcy5nZXRQYWNrYWdlKHRyYWNraW5nTm8pLnRoZW4ocGFjayA9PiB7XG4gICAgbXNlYXJjaGVyLmRlbERvY3VtZW50KFBLR19JRFgsIGAke3BhY2subWlkfS0ke3RyYWNraW5nTm99YCwgKGVyciwgZG9uZSkgPT4ge1xuICAgICAgdmFyIGRvY3VtZW50ID0gY3JlYXRlRG9jdW1lbnQocGFjayk7XG4gICAgICBjb25zb2xlLmxvZyhcInJlYWRkaW5nIHBhY2thZ2UgdG8gdGhlIGluZGV4IGxpa2UgYSBib3NzIFwiICsgdHJhY2tpbmdObyk7XG4gICAgICBtc2VhcmNoZXIuYWRkKHBhY2subWlkICsgXCItXCIgKyBwYWNrLnRyYWNraW5nTm8sIGRvY3VtZW50KTtcbiAgICB9KTtcbiAgfSk7XG59XG5leHBvcnQgY2xhc3MgUGFja2FnZVNlcnZpY2Uge1xuICBjb25zdHJ1Y3RvcigpIHtcbiAgICB0aGlzLnNldHVwSW5kZXgoKTtcbiAgfVxuICBzZXR1cEluZGV4KCkge1xuICAgIHRoaXMubXlTZWFyY2ggPSByZWRpc1NlYXJjaChyZWRpcywgUEtHX0lEWCwge1xuICAgICAgY2xpZW50T3B0aW9uczogbHJlZGlzLnNlYXJjaENsaWVudERldGFpbHNcbiAgICB9KTtcbiAgfVxuICBzYXZlUGFja2FnZShib2R5KSB7XG4gICAgXG4gICAgdmFyIHNlYXJjaGVyID0gdGhpcy5teVNlYXJjaDsgXG4gICAgcmV0dXJuIG5ldyBQcm9taXNlKChyZXNvbHZlLCByZWplY3QpID0+IHtcbiAgICAgIHZhciBjUGFja2FnZSA9IHtcbiAgICAgICAgc2t5Ym94OiBib2R5LnNreWJveCxcbiAgICAgICAgY3VzdG9tZXI6IGJvZHkuY3VzdG9tZXIucmVwbGFjZShcIi1cIiwgXCJcIikudHJpbSgpLFxuICAgICAgICB0cmFja2luZ05vOiBib2R5LnRyYWNraW5nLFxuICAgICAgICBkdXR5UGVyY2VudDogMC4yLFxuICAgICAgICBkZXNjcmlwdGlvbjogYm9keS5kZXNjcmlwdGlvbixcbiAgICAgICAgc2hpcHBlcjogYm9keS5zaGlwcGVyLFxuICAgICAgICB2YWx1ZTogTnVtYmVyKGJvZHkudmFsdWUpLFxuICAgICAgICBwaWVjZXM6IE51bWJlcihib2R5LnBpZWNlcyksXG4gICAgICAgIHdlaWdodDogTnVtYmVyKGJvZHkud2VpZ2h0KSxcbiAgICAgICAgc3RhdHVzOiAxLFxuICAgICAgICBsb2NhdGlvbjogXCJNaWFtaVwiLFxuICAgICAgICBtaWQ6IGJvZHkubWlkLFxuICAgICAgICBoYXNPcHQ6IHRydWUsXG4gICAgICAgIG10eXBlOiBib2R5Lm10eXBlXG4gICAgICB9O1xuICAgICAgY29uc29sZS5sb2coXCJhYm91dCB0byBzYXZlIHRoZSBwYWNrYWdlXCIpO1xuICAgICAgaWYgKHR5cGVvZiBjUGFja2FnZS5zaGlwcGVyID09PSBcInVuZGVmaW5lZFwiKSBjUGFja2FnZS5zaGlwcGVyID0gXCJcIjtcbiAgICAgIGlmICh0eXBlb2YgY1BhY2thZ2UuZGVzY3JpcHRpb24gPT09IFwidW5kZWZpbmVkXCIpXG4gICAgICAgIGNQYWNrYWdlLmRlc2NyaXB0aW9uID0gXCJcIjtcbiAgICAgIGNvbnNvbGUubG9nKGJvZHkpO1xuICAgICAgaWYgKE51bWJlcihib2R5LmlzQnVzaW5lc3MpID09IDEpIHtcbiAgICAgICAgY1BhY2thZ2UuaGFzT3B0ID0gZmFsc2U7XG4gICAgICB9XG4gICAgICBjUGFja2FnZSA9IHBhY2thZ2VVdGlsLmNhbGN1bGF0ZUZlZXMoY1BhY2thZ2UpO1xuICAgICAgY29uc29sZS5sb2coXCJwYWNrYWdlIHdpdGggZmVlc1wiKTtcblxuICAgICAgLy93ZSBhbHNvIHdhbnQgdG8gY2FsY3VsYXRlIHRoZSB0aGUgcGFja2FnZSBmZWVzIG9uZSB0aW1lLi4uLi4uXG4gICAgICAvL3dlIGhhdmUgdGhlIHBhY2thZ2UgZGV0YWlscyBoZXJlIC4uIG5vdyB3ZSBuZWVkIHRvIGdldCB0aGUgZXhpc3RpbmcgcGFja2FnZVxuXG4gICAgICB2YXIgY29udGFpbmVyID0gXCJcIjtcbiAgICAgIHZhciBjb250YWluZXJObyA9IFwiXCI7XG4gICAgICBpZiAodHlwZW9mIGJvZHkuYmFnICE9IFwidW5kZWZpbmVkXCIpIHtcbiAgICAgICAgY1BhY2thZ2UuYmFnID0gYm9keS5iYWc7XG4gICAgICAgIGNvbnRhaW5lciA9IFwiYmFnXCI7XG4gICAgICAgIGNvbnRhaW5lck5vID0gY1BhY2thZ2UuYmFnO1xuICAgICAgfVxuICAgICAgaWYgKHR5cGVvZiBib2R5LnNraWQgIT0gXCJ1bmRlZmluZWRcIikge1xuICAgICAgICBjUGFja2FnZS5za2lkID0gYm9keS5za2lkO1xuICAgICAgICBjb250YWluZXIgPSBcInNraWRcIjtcbiAgICAgICAgY29udGFpbmVyTm8gPSBjUGFja2FnZS5za2lkO1xuICAgICAgfVxuICAgICAgLy93ZSBuZWVkIHRvIGNoZWNrIHRvIHNlZSBvZiB0aGUgb3duZXIgaXMgYSBidXNpbmVzcyBoZXJlXG5cbiAgICAgIGxyZWRpcy5nZXRQYWNrYWdlKGNQYWNrYWdlLnRyYWNraW5nTm8pLnRoZW4ocCA9PiB7XG4gICAgICAgIGlmIChwKSB7XG4gICAgICAgICAgdmFyIGN1cnJlbnRDb250YWluZXIgPSBgbWFuaWZlc3Q6JHtwLm1pZH06JHtwLm10eXBlfToke2NvbnRhaW5lcn06YDtcbiAgICAgICAgICBjb25zb2xlLmxvZyhcImZvdW5kIHBhY2thZ2UgXCIpO1xuICAgICAgICAgIGNvbnNvbGUubG9nKHApO1xuICAgICAgICAgIGlmIChjb250YWluZXIgPT0gXCJiYWdcIikge1xuICAgICAgICAgICAgLy9jaGVjayB0byBzZWUgaWYgdGhlIGJhY2sgbm8gaXMgdGhlIHNhbWUuXG4gICAgICAgICAgICBpZiAocC5iYWcgIT0gY1BhY2thZ2UuYmFnKSB7XG4gICAgICAgICAgICAgIC8vcmVtb3ZlIGl0IGZyb20gdGhlIG9yaWdpbmFsIGxpc3RcbiAgICAgICAgICAgICAgbHJlZGlzLnNyZW0oY3VycmVudENvbnRhaW5lciArIHAuYmFnLCBwLnRyYWNraW5nTm8pO1xuICAgICAgICAgICAgICBjb25zb2xlLmxvZyhcbiAgICAgICAgICAgICAgICBcInJlbW92ZSBwYWNrYWdlIGZyb20gY3VycmVudCBzZXQgXCIgKyBjdXJyZW50Q29udGFpbmVyXG4gICAgICAgICAgICAgICk7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgIC8vY2hlY2sgdG8gc2VlIGlmIHRoZSBza2lkIG51bWJlciBpcyB0aGUgc2FtZS5cbiAgICAgICAgICAgIGlmIChwLnNraWQgIT0gY1BhY2thZ2Uuc2tpZCkge1xuICAgICAgICAgICAgICAvL3JlbW92ZSBpdCBmcm9tIHRoZSBvcmlnaW5hbCBsaXN0XG4gICAgICAgICAgICAgIGxyZWRpcy5zcmVtKGN1cnJlbnRDb250YWluZXIgKyBwLnNraWQsIHAudHJhY2tpbmdObyk7XG4gICAgICAgICAgICAgIGNvbnNvbGUubG9nKFxuICAgICAgICAgICAgICAgIFwicmVtb3ZlIHBhY2thZ2UgZnJvbSBjdXJyZW50IHNldCBcIiArIGN1cnJlbnRDb250YWluZXJcbiAgICAgICAgICAgICAgKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICB9XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgLy8gdGhlIHBhY2thZ2UgZG9lc24ndCBleGlzdCB1cGRhdGUgdGhlIGNvdW50ZXJcbiAgICAgICAgICBscmVkaXMuY2xpZW50LmluY3IoXCJtY291bnRlcjpcIiArIGNQYWNrYWdlLm1pZCk7XG4gICAgICAgICAgXG4gICAgICAgIH1cblxuICAgICAgICBscmVkaXNcbiAgICAgICAgICAuaG1zZXQoXCJwYWNrYWdlczpcIiArIGNQYWNrYWdlLnRyYWNraW5nTm8sIGNQYWNrYWdlKVxuICAgICAgICAgIC50aGVuKGZ1bmN0aW9uKHJlc3VsdCkge1xuICAgICAgICAgICAgLy9hZGQgdG8gcXVldWUgZm9yIHBlcnNpc3RlbnQgcHJvY2Vzc2luZ1xuICAgICAgICAgICAgXG4gICAgICAgICAgICB2YXIgbWFuaWZlc3RLZXkgPSBgbWFuaWZlc3Q6JHtjUGFja2FnZS5taWR9OiR7XG4gICAgICAgICAgICAgIGNQYWNrYWdlLm10eXBlXG4gICAgICAgICAgICB9OiR7Y29udGFpbmVyfToke2NvbnRhaW5lck5vfWA7XG4gICAgICAgICAgICBjb25zb2xlLmxvZyhcImFib3V0IHRvIGNyZWF0ZSB0aGUgZG9jdW1lbnQuLi4uXCIpO1xuICAgICAgICAgICAgYWRkUGFja2FnZVRvSW5kZXgoY1BhY2thZ2UudHJhY2tpbmdObyxzZWFyY2hlcik7IFxuICAgICAgICAgICAgY29uc29sZS5sb2coXCJhZGRlZCB0aGUgcGFja2FnZSB0byBpbmRleFwiKTtcbiAgICAgICAgICAgIGxyZWRpc1xuICAgICAgICAgICAgICAuc2V0QWRkKG1hbmlmZXN0S2V5LCBjUGFja2FnZS50cmFja2luZ05vKVxuICAgICAgICAgICAgICAudGhlbihmdW5jdGlvbihzUmVzdWx0KSB7XG4gICAgICAgICAgICAgICAgLy9nZXQgdGhlIG1lbWJlcnMgb25lIHRpbWUgaGVyZVxuICAgICAgICAgICAgICAgIGNvbnNvbGUubG9nKFwiYWRkZWQgdGhlIHBhY2thZ2UgdG8gdGhlIHNldFwiKTtcbiAgICAgICAgICAgICAgICBjb25zb2xlLmxvZyhtYW5pZmVzdEtleSk7XG4gICAgICAgICAgICAgICAgbHJlZGlzXG4gICAgICAgICAgICAgICAgICAuZ2V0TWVtYmVycyhtYW5pZmVzdEtleSlcbiAgICAgICAgICAgICAgICAgIC50aGVuKGRhdGEgPT4ge1xuICAgICAgICAgICAgICAgICAgICBjb25zb2xlLmxvZyhcImRhdGFcIik7XG4gICAgICAgICAgICAgICAgICAgIGNvbnNvbGUubG9nKGRhdGEpO1xuICAgICAgICAgICAgICAgICAgICBQcm9taXNlLmFsbChkYXRhLm1hcChscmVkaXMuZ2V0UGFja2FnZSkpO1xuICAgICAgICAgICAgICAgICAgfSlcbiAgICAgICAgICAgICAgICAgIC50aGVuKGZ1bmN0aW9uKHJkYXRhKSB7XG4gICAgICAgICAgICAgICAgICAgIC8vd2UgbmVlZCB0byBhbGVydCB0aGUgcGVyc29uIHRoYXQgdGhlIHBhY2thZ2UgaXMgaGVyZSBzbyByZWFkIGVtYWlsIGV0Yy5cbiAgICAgICAgICAgICAgICAgICAgLy9hZGQgdG8gdGhlIGluZGV4XG4gICAgICAgICAgICAgICAgICAgIGNvbnNvbGUubG9nKFwiZGF0YVwiKTtcbiAgICAgICAgICAgICAgICAgICAgY29uc29sZS5sb2cocmRhdGEpO1xuXG4gICAgICAgICAgICAgICAgICAgIHJlc29sdmUoe1xuICAgICAgICAgICAgICAgICAgICAgIHNhdmVkOiB0cnVlLFxuICAgICAgICAgICAgICAgICAgICAgIHBhY2thZ2VzOiByZGF0YSxcbiAgICAgICAgICAgICAgICAgICAgICBzUGFja2FnZTogY1BhY2thZ2VcbiAgICAgICAgICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICAgICAgICB9KVxuICAgICAgICAgICAgICAgICAgLmNhdGNoKGVycjMgPT4ge1xuICAgICAgICAgICAgICAgICAgICBjb25zb2xlLmxvZyhlcnIzKTtcbiAgICAgICAgICAgICAgICAgICAgcmVqZWN0KHtcbiAgICAgICAgICAgICAgICAgICAgICBlcnI6IGVycjMsXG4gICAgICAgICAgICAgICAgICAgICAgc2F2ZWQ6IHRydWUsXG4gICAgICAgICAgICAgICAgICAgICAgbGlzdGluZzogZmFsc2VcbiAgICAgICAgICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICAgICAgICB9KTtcbiAgICAgICAgICAgICAgfSlcbiAgICAgICAgICAgICAgLmNhdGNoKGZ1bmN0aW9uKGVycikge1xuICAgICAgICAgICAgICAgIHJlc29sdmUoe1xuICAgICAgICAgICAgICAgICAgc2F2ZWQ6IGZhbHNlXG4gICAgICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICAgIH0pO1xuICAgICAgICAgIH0pXG4gICAgICAgICAgLmNhdGNoKGZ1bmN0aW9uKGVycjIpIHtcbiAgICAgICAgICAgIHJlamVjdCh7XG4gICAgICAgICAgICAgIHNhdmVkOiBmYWxzZVxuICAgICAgICAgICAgfSk7XG4gICAgICAgICAgfSk7XG5cbiAgICAgICAgLy9zYXZlIHRoZSBwYWNrYWdlIHRvIHRoZSBwYWNrYWdlIE5TXG4gICAgICB9KTtcbiAgICB9KTtcbiAgfVxuXG4gIHVwZGF0ZU1hbmlmZXN0UGFja2FnZVRvSW5UcmFuc2l0KG1pZCkge1xuICAgIC8vZ2V0IGFsbCB0aGUgcGFja2FnZXNcbiAgICAvL3dlIG5lZWQgdG8gdXBkYXRlIHRoZSBpbmRleCBhdCB0aGlzIHBvaW50IGFzIHdlbGxcbiAgICB2YXIgbXNlYXJjaCA9IHRoaXMubXlTZWFyY2g7XG4gICAgdGhpcy5teVNlYXJjaC5zZWFyY2goXG4gICAgICBgQG1pZDpbJHttaWR9ICR7bWlkfV1gLFxuICAgICAgeyBvZmZzZXQ6IDAsIG51bWJlck9mUmVzdWx0czogNTAwMCB9LFxuICAgICAgKGVyciwgZGF0YSkgPT4ge1xuICAgICAgICB2YXIgcGFja2FnZXMgPSBbXTtcbiAgICAgICAgY29uc29sZS5sb2coZGF0YSk7XG4gICAgICAgIGRhdGEucmVzdWx0cy5mb3JFYWNoKGVsZW1lbnQgPT4ge1xuICAgICAgICAgIHZhciBvbGREb2NJZCA9IGVsZW1lbnQuZG9jSWQ7XG4gICAgICAgICAgZWxlbWVudC5kb2NJZCA9IGVsZW1lbnQuZG9jSWQucmVwbGFjZShgJHttaWR9LWAsIFwiXCIpO1xuICAgICAgICAgIHBhY2thZ2VzLnB1c2goZWxlbWVudC5kb2NJZCk7XG4gICAgICAgICAgLy8gaSBjb3VsZCBkZWxldGUgaGVyZVxuICAgICAgICAgIC8vIG1zZWFyY2guZGVsRG9jdW1lbnQoUEtHX0lEWCxvbGREb2NJZClcbiAgICAgICAgICAvL3VwZGF0ZSBhbGwgdGhlIHBhY2thZ2VzXG4gICAgICAgIH0pO1xuICAgICAgICBzZXRQYWNrYWdlSW5UcmFuc2l0KHBhY2thZ2VzLCBtc2VhcmNoLCBtaWQpLnRoZW4oZnVuY3Rpb24oXG4gICAgICAgICAgdXBkYXRlZFBhY2thZ2VzXG4gICAgICAgICkge1xuICAgICAgICAgIGNvbnNvbGUubG9nKFwidXBkYXRlZCBwYWNrYWdlc1wiKTtcbiAgICAgICAgICBjb25zb2xlLmxvZyh1cGRhdGVkUGFja2FnZXMpO1xuICAgICAgICB9KTtcbiAgICAgIH1cbiAgICApO1xuICB9XG4gIHJlbW92ZVBhY2thZ2UodHJhY2tpbmdObywgbWlkKSB7XG4gICAgdmFyIG1zZWFyY2ggPSB0aGlzLm15U2VhcmNoO1xuICAgIHJldHVybiBuZXcgUHJvbWlzZSgocmVzb2x2ZSwgcmVqZWN0KSA9PiB7XG4gICAgICB2YXIgbWFuaWZlc3QgPSBtaWQ7XG4gICAgICB2YXIgbWFuaWZlc3RLZXkgPSBcIm1hbmlmZXN0OlwiICsgbWFuaWZlc3QgKyBcIjoqXCI7XG5cbiAgICAgIGxyZWRpcy5kZWwoXCJwYWNrYWdlczpcIiArIHRyYWNraW5nTm8pLnRoZW4oZnVuY3Rpb24ocmVzdWx0KSB7XG4gICAgICAgIGNvbnNvbGUubG9nKHJlc3VsdCk7XG4gICAgICAgIG1zZWFyY2guZGVsRG9jdW1lbnQoUEtHX0lEWCwgYCR7bWlkfS0ke3RyYWNraW5nTm99YCk7XG4gICAgICAgIC8vd2UgbmVlZCB0byByZW1vdmUgZnJvbSB0aGUgaW5kZXggYW5kIGRlYyB0aGUgY291bnRlclxuICAgICAgICBscmVkaXMuY2xpZW50LmRlY3IoXCJtY291bnRlcjpcIiArIG1pZCk7XG4gICAgICAgIC8vclNlcnZpY2VzLnBhY2thZ2VTZXJ2aWNlLnJtUGFja2FnZShtaWQsIHRyYWNraW5nTm8pO1xuICAgICAgICBscmVkaXMuZ2V0S2V5cyhtYW5pZmVzdEtleSkudGhlbihrUmVzdWx0ID0+IHtcbiAgICAgICAgICAvL3RoZSBsaXN0IG9mIGFsbCB0aGUgc2V0cyAuLi53ZSBuZWVkIHRvIHJlbW92ZSB0aGUga2V5IGZyb20gZWFjaCBvbmVcbiAgICAgICAgICB2YXIga2V5c0NvdW50ID0gMDtcblxuICAgICAgICAgIGtSZXN1bHQuZm9yRWFjaChlbGVtZW50ID0+IHtcbiAgICAgICAgICAgIGNvbnNvbGUubG9nKFxuICAgICAgICAgICAgICBgcmVtb3ZpbmcgJHt0cmFja2luZ05vfSBwYWNrYWdlIG1hbmlmZXN0IHNldCAke2VsZW1lbnR9IGBcbiAgICAgICAgICAgICk7XG4gICAgICAgICAgICBscmVkaXMuc3JlbShlbGVtZW50LCB0cmFja2luZ05vKS50aGVuKGZ1bmN0aW9uKHJSZXN1bHQpIHtcbiAgICAgICAgICAgICAgY29uc29sZS5sb2coclJlc3VsdCk7XG4gICAgICAgICAgICAgIGNvbnNvbGUubG9nKFwicmVtb3ZlZFwiKTtcbiAgICAgICAgICAgICAgaWYgKGtleXNDb3VudCA9PSBrUmVzdWx0Lmxlbmd0aCAtIDEpIGtleXNDb3VudCsrO1xuICAgICAgICAgICAgfSk7XG4gICAgICAgICAgfSk7XG4gICAgICAgICAgcmVzb2x2ZSh7XG4gICAgICAgICAgICBkZWxldGVkOiB0cnVlXG4gICAgICAgICAgfSk7XG4gICAgICAgIH0pO1xuXG4gICAgICAgIC8vd2UgYWxzbyBuZWVkIHRvIHJlbW92ZSBmcm9tIGFueSBzZXRzXG4gICAgICB9KTtcbiAgICB9KTtcbiAgfVxuICBzdG9yZVBhY2thZ2VGb3JQaWNrdXAodHJhY2tpbmdObyxiaW4pe1xuICAgIHZhciBzZWFyY2hlciA9IHRoaXMubXlTZWFyY2g7XG4gICAgcmV0dXJuIG5ldyBQcm9taXNlKChyZXNvbHZlLHJlamVjdCk9PntcbiAgICAgICBscmVkaXMuaG1zZXQoUEtHX1BSRUZJWCt0cmFja2luZ05vLHtzdGF0dXM6NCxsb2NhdGlvbjpiaW59KS50aGVuKChyZXN1bHQpPT57XG4gICAgICAgICBscmVkaXMuZ2V0UGFja2FnZSh0cmFja2luZ05vKS50aGVuKChwa2cpPT57XG4gICAgICAgICAgYWRkUGFja2FnZVRvSW5kZXgodHJhY2tpbmdObyxzZWFyY2hlcikgOyBcbiAgICAgICAgICByZXNvbHZlKHBrZyk7ICAgXG4gICAgICAgICB9KTtcbiAgICAgICB9KSBcbiAgICB9KTsgXG4gIH1cbiAgdXBkYXRlUGFja2FnZUluZGV4KHRyYWNraW5nKXtcbiAgICAgIHJldHVybiBuZXcgUHJvbWlzZSgocmVzb2x2ZSxyZWplY3QpPT57XG4gICAgICAgICAgdmFyIG1zZWFyY2ggPSB0aGlzLm15U2VhcmNoOyBcbiAgICAgICAgICBhZGRQYWNrYWdlVG9JbmRleCh0cmFja2luZyxtc2VhcmNoKTsgXG4gICAgICAgICByZXNvbHZlKHsndXBkYXRlZCc6dHJ1ZX0pO1xuICAgICAgfSlcbiAgfVxuICBnZXRDdXN0b21lclBhY2thZ2VzKHNreWJveCkge31cbiAgZ2V0TWFuaWZlc3RQYWNrYWdlc0J5U3RhdHVzKG1pZCxzdGF0dXMpIHtcbiAgICAgIHJldHVybiBuZXcgUHJvbWlzZSgocmVzb2x2ZSxyZWplY3QpPT57XG4gICAgICAgICAgY29uc29sZS5sb2coYEBtaWQ6WyR7bWlkfSAke21pZH1dIEBzdGF0dXM9WyR7c3RhdHVzfSAke3N0YXR1c31dYClcbiAgICAgICAgdGhpcy5teVNlYXJjaC5zZWFyY2goXG4gICAgICAgICAgICBgQG1pZDpbJHttaWR9ICR7bWlkfV0gQHN0YXR1czpbJHtzdGF0dXN9ICR7c3RhdHVzfV1gLFxuICAgICAgICAgICAgeyBvZmZzZXQ6IDAsIG51bWJlck9mUmVzdWx0czogNTAwMCB9LFxuICAgICAgICAgICAgKGVyciwgZGF0YSkgPT4ge1xuICAgICAgICAgICAgICB2YXIgcGFja2FnZXMgPSBbXTtcbiAgICAgICAgICAgICAgY29uc29sZS5sb2coZGF0YSk7XG4gICAgICAgICAgICAgIGRhdGEucmVzdWx0cy5mb3JFYWNoKGVsZW1lbnQgPT4ge1xuXG4gICAgICAgICAgICAgICAgcGFja2FnZXMucHVzaChlbGVtZW50LmRvYyk7XG4gICAgICAgICAgICAgICAgcmVzb2x2ZShwYWNrYWdlcyk7ICAgICAgICAgICAgICAgICBcbiAgICAgICAgICAgIH0pO1xuICAgICAgICB9KTtcbiAgICAgIH0pO1xuICBcbiAgfSAgICAgXG59XG4iXX0=
