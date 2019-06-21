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
//# sourceMappingURL=data:application/json;charset=utf8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIlJlZGlzU2VydmljZXMvUGFja2FnZVNlcnZpY2UuZXM2Il0sIm5hbWVzIjpbInJlZGlzIiwicmVxdWlyZSIsImxyZWRpcyIsIm1vbWVudCIsInJlZGlzU2VhcmNoIiwiZnMiLCJQYWNrYWdlVXRpbCIsIlBhY2thZ2VVdGlsaXR5IiwicGFja2FnZVV0aWwiLCJQS0dfSURYIiwiUEtHX1BSRUZJWCIsImNyZWF0ZURvY3VtZW50IiwidFBhY2thZ2UiLCJwYWNrYWdlRG9jdW1lbnQiLCJ0cmFja2luZ05vIiwic2t5Ym94IiwiY3VzdG9tZXIiLCJzaGlwcGVyIiwiZGVzY3JpcHRpb24iLCJza3lib3hWIiwic3RhdHVzIiwibWlkIiwidmFsdWUiLCJ0dHZhbHVlIiwiY29uc29sZSIsImxvZyIsInNldFBhY2thZ2VJblRyYW5zaXQiLCJrZXlzIiwibXNlYXJjaGVyIiwiUHJvbWlzZSIsInJlc29sdmUiLCJyZWplY3QiLCJiYXRjaGVyIiwiY2xpZW50IiwiYmF0Y2giLCJmb3JFYWNoIiwibG9jYXRpb24iLCJlbGVtZW50IiwiaG1zZXQiLCJleGVjIiwiZXJyIiwicmVzdWx0IiwiYWRkUGFja2FnZVRvSW5kZXgiLCJnZXRQYWNrYWdlIiwidGhlbiIsImRlbERvY3VtZW50IiwicGFjayIsImRvbmUiLCJkb2N1bWVudCIsImFkZCIsIlBhY2thZ2VTZXJ2aWNlIiwic2V0dXBJbmRleCIsIm15U2VhcmNoIiwiY2xpZW50T3B0aW9ucyIsInNlYXJjaENsaWVudERldGFpbHMiLCJib2R5Iiwic2VhcmNoZXIiLCJjUGFja2FnZSIsInJlcGxhY2UiLCJ0cmltIiwidHJhY2tpbmciLCJkdXR5UGVyY2VudCIsIk51bWJlciIsInBpZWNlcyIsIndlaWdodCIsImhhc09wdCIsIm10eXBlIiwiaXNCdXNpbmVzcyIsImNhbGN1bGF0ZUZlZXMiLCJjb250YWluZXIiLCJjb250YWluZXJObyIsImJhZyIsInNraWQiLCJwIiwiY3VycmVudENvbnRhaW5lciIsInNyZW0iLCJpbmNyIiwibWFuaWZlc3RLZXkiLCJzZXRBZGQiLCJzUmVzdWx0IiwiZ2V0TWVtYmVycyIsImRhdGEiLCJhbGwiLCJtYXAiLCJyZGF0YSIsInNhdmVkIiwicGFja2FnZXMiLCJzUGFja2FnZSIsImNhdGNoIiwiZXJyMyIsImxpc3RpbmciLCJlcnIyIiwibXNlYXJjaCIsInNlYXJjaCIsIm9mZnNldCIsIm51bWJlck9mUmVzdWx0cyIsInJlc3VsdHMiLCJvbGREb2NJZCIsImRvY0lkIiwicHVzaCIsInVwZGF0ZWRQYWNrYWdlcyIsIm1hbmlmZXN0IiwiZGVsIiwiZGVjciIsImdldEtleXMiLCJrZXlzQ291bnQiLCJrUmVzdWx0IiwiclJlc3VsdCIsImxlbmd0aCIsImRlbGV0ZWQiLCJiaW4iLCJwa2ciLCJkb2MiXSwibWFwcGluZ3MiOiI7Ozs7Ozs7OztBQUFBOzs7O0FBRUEsSUFBSUEsUUFBUUMsUUFBUSxPQUFSLENBQVo7QUFDQSxJQUFJQyxTQUFTRCxRQUFRLDZCQUFSLENBQWI7QUFDQSxJQUFJRSxTQUFTRixRQUFRLFFBQVIsQ0FBYjtBQUNBLElBQUlHLGNBQWNILFFBQVEscUJBQVIsQ0FBbEI7QUFDQSxJQUFJSSxLQUFLSixRQUFRLElBQVIsQ0FBVDs7QUFFQSxJQUFJSyxjQUFjTCxRQUFRLHFCQUFSLEVBQStCTSxjQUFqRDtBQUNBLElBQUlDLGNBQWMsSUFBSUYsV0FBSixFQUFsQjtBQUNBLElBQU1HLFVBQVUsZ0JBQWhCO0FBQ0EsSUFBTUMsYUFBYSxXQUFuQjtBQUNBLFNBQVNDLGNBQVQsQ0FBd0JDLFFBQXhCLEVBQWtDO0FBQ2hDLE1BQUlDLGtCQUFrQjtBQUNwQkMsZ0JBQVlGLFNBQVNFLFVBREQ7QUFFcEJDLFlBQVFILFNBQVNHLE1BRkc7QUFHcEJDLGNBQVVKLFNBQVNJLFFBSEM7QUFJcEJDLGFBQVNMLFNBQVNLLE9BSkU7QUFLcEJDLGlCQUFhTixTQUFTTSxXQUxGO0FBTXBCQyxhQUFTUCxTQUFTRyxNQU5FO0FBT3BCSyxZQUFRUixTQUFTUSxNQVBHO0FBUXBCQyxTQUFLVCxTQUFTUyxHQVJNO0FBU3BC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QVYsMEJBQWtCa0IsUUFBbEIsRUFBMkJnQyxPQUEzQjtBQUNEOUQsZ0JBQVEsRUFBQyxXQUFVLElBQVgsRUFBUjtBQUNGLE9BSk0sQ0FBUDtBQUtIOzs7d0NBQ21CZixNLEVBQVEsQ0FBRTs7O2dEQUNGTSxHLEVBQUlELE0sRUFBUTtBQUFBOztBQUNwQyxhQUFPLElBQUlTLE9BQUosQ0FBWSxVQUFDQyxPQUFELEVBQVNDLE1BQVQsRUFBa0I7QUFDakNQLGdCQUFRQyxHQUFSLFlBQXFCSixHQUFyQixTQUE0QkEsR0FBNUIsbUJBQTZDRCxNQUE3QyxTQUF1REEsTUFBdkQ7QUFDRixlQUFLZ0MsUUFBTCxDQUFjeUMsTUFBZCxZQUNheEUsR0FEYixTQUNvQkEsR0FEcEIsbUJBQ3FDRCxNQURyQyxTQUMrQ0EsTUFEL0MsUUFFSSxFQUFFMEUsUUFBUSxDQUFWLEVBQWFDLGlCQUFpQixJQUE5QixFQUZKLEVBR0ksVUFBQ3ZELEdBQUQsRUFBTXlDLElBQU4sRUFBZTtBQUNiLGNBQUlLLFdBQVcsRUFBZjtBQUNBOUQsa0JBQVFDLEdBQVIsQ0FBWXdELElBQVo7QUFDQUEsZUFBS2UsT0FBTCxDQUFhN0QsT0FBYixDQUFxQixtQkFBVzs7QUFFOUJtRCxxQkFBU2EsSUFBVCxDQUFjOUQsUUFBUTJFLEdBQXRCO0FBQ0FsRixvQkFBUXdELFFBQVI7QUFDSCxXQUpDO0FBS0wsU0FYRDtBQVlELE9BZE0sQ0FBUDtBQWdCSCIsImZpbGUiOiJSZWRpc1NlcnZpY2VzL1BhY2thZ2VTZXJ2aWNlLmpzIiwic291cmNlc0NvbnRlbnQiOlsiaW1wb3J0IHsgY2xpZW50IH0gZnJvbSBcIi4uL0RhdGFTZXJ2aWNlcy9yZWRpcy1sb2NhbFwiO1xuXG52YXIgcmVkaXMgPSByZXF1aXJlKFwicmVkaXNcIik7XG52YXIgbHJlZGlzID0gcmVxdWlyZShcIi4uL0RhdGFTZXJ2aWNlcy9yZWRpcy1sb2NhbFwiKTtcbnZhciBtb21lbnQgPSByZXF1aXJlKFwibW9tZW50XCIpO1xudmFyIHJlZGlzU2VhcmNoID0gcmVxdWlyZShcIi4uL3JlZGlzZWFyY2hjbGllbnRcIik7XG52YXIgZnMgPSByZXF1aXJlKFwiZnNcIik7XG5cbnZhciBQYWNrYWdlVXRpbCA9IHJlcXVpcmUoXCIuLi9VdGlsL3BhY2thZ2V1dGlsXCIpLlBhY2thZ2VVdGlsaXR5O1xudmFyIHBhY2thZ2VVdGlsID0gbmV3IFBhY2thZ2VVdGlsKCk7XG5jb25zdCBQS0dfSURYID0gXCJpbmRleDpwYWNrYWdlc1wiO1xuY29uc3QgUEtHX1BSRUZJWCA9IFwicGFja2FnZXM6XCI7XG5mdW5jdGlvbiBjcmVhdGVEb2N1bWVudCh0UGFja2FnZSkge1xuICB2YXIgcGFja2FnZURvY3VtZW50ID0ge1xuICAgIHRyYWNraW5nTm86IHRQYWNrYWdlLnRyYWNraW5nTm8sXG4gICAgc2t5Ym94OiB0UGFja2FnZS5za3lib3gsXG4gICAgY3VzdG9tZXI6IHRQYWNrYWdlLmN1c3RvbWVyLFxuICAgIHNoaXBwZXI6IHRQYWNrYWdlLnNoaXBwZXIsXG4gICAgZGVzY3JpcHRpb246IHRQYWNrYWdlLmRlc2NyaXB0aW9uLFxuICAgIHNreWJveFY6IHRQYWNrYWdlLnNreWJveCxcbiAgICBzdGF0dXM6IHRQYWNrYWdlLnN0YXR1cyxcbiAgICBtaWQ6IHRQYWNrYWdlLm1pZCxcbiAgICB2YWx1ZTogdFBhY2thZ2UudHR2YWx1ZVxuICB9O1xuICBjb25zb2xlLmxvZyhcImFib3V0IHRvIGFkZCB0aGUgcGFja2FnZSB0byB0aGUgaW5kZXhcIik7XG4gIHJldHVybiBwYWNrYWdlRG9jdW1lbnQ7XG59XG5mdW5jdGlvbiBzZXRQYWNrYWdlSW5UcmFuc2l0KGtleXMsIG1zZWFyY2hlcikge1xuICByZXR1cm4gbmV3IFByb21pc2UoKHJlc29sdmUsIHJlamVjdCkgPT4ge1xuICAgIHZhciBiYXRjaGVyID0gbXNlYXJjaGVyLmNsaWVudC5iYXRjaCgpO1xuICAgIGtleXMuZm9yRWFjaChlbGVtZW50ID0+IHtcbiAgICAgIHZhciB2YWx1ZSA9IHtcbiAgICAgICAgc3RhdHVzOiAyLFxuICAgICAgICBsb2NhdGlvbjogXCJJbiBUcmFuc2l0XCJcbiAgICAgIH07XG4gICAgICBjb25zb2xlLmxvZyhlbGVtZW50ICsgXCJpcyB0aGUgZWxlbWVudFwiKTtcblxuICAgICAgYmF0Y2hlci5obXNldChQS0dfUFJFRklYICsgZWxlbWVudCwgdmFsdWUpO1xuICAgIH0pO1xuICAgIGJhdGNoZXIuZXhlYygoZXJyLCByZXN1bHQpID0+IHtcbiAgICAgIGNvbnNvbGUubG9nKHJlc3VsdCk7XG4gICAgICAvL3JlYWRkIHRoZSBkb2N1bWVudHMgaGVyZVxuICAgICAga2V5cy5mb3JFYWNoKGVsZW1lbnQgPT4ge1xuICAgICAgICBhZGRQYWNrYWdlVG9JbmRleChlbGVtZW50LCBtc2VhcmNoZXIpO1xuICAgICAgfSk7XG4gICAgICByZXNvbHZlKHJlc3VsdCk7XG4gICAgfSk7XG4gIH0pO1xufVxuXG5mdW5jdGlvbiBhZGRQYWNrYWdlVG9JbmRleCh0cmFja2luZ05vLCBtc2VhcmNoZXIpIHtcbiAgbHJlZGlzLmdldFBhY2thZ2UodHJhY2tpbmdObykudGhlbihwYWNrID0+IHtcbiAgICBtc2VhcmNoZXIuZGVsRG9jdW1lbnQoUEtHX0lEWCwgYCR7cGFjay5taWR9LSR7dHJhY2tpbmdOb31gLCAoZXJyLCBkb25lKSA9PiB7XG4gICAgICB2YXIgZG9jdW1lbnQgPSBjcmVhdGVEb2N1bWVudChwYWNrKTtcbiAgICAgIGNvbnNvbGUubG9nKFwicmVhZGRpbmcgcGFja2FnZSB0byB0aGUgaW5kZXggbGlrZSBhIGJvc3MgXCIgKyB0cmFja2luZ05vKTtcbiAgICAgIG1zZWFyY2hlci5hZGQocGFjay5taWQgKyBcIi1cIiArIHBhY2sudHJhY2tpbmdObywgZG9jdW1lbnQpO1xuICAgIH0pO1xuICB9KTtcbn1cbmV4cG9ydCBjbGFzcyBQYWNrYWdlU2VydmljZSB7XG4gIGNvbnN0cnVjdG9yKCkge1xuICAgIHRoaXMuc2V0dXBJbmRleCgpO1xuICB9XG4gIHNldHVwSW5kZXgoKSB7XG4gICAgdGhpcy5teVNlYXJjaCA9IHJlZGlzU2VhcmNoKHJlZGlzLCBQS0dfSURYLCB7XG4gICAgICBjbGllbnRPcHRpb25zOiBscmVkaXMuc2VhcmNoQ2xpZW50RGV0YWlsc1xuICAgIH0pO1xuICB9XG4gIHNhdmVQYWNrYWdlKGJvZHkpIHtcbiAgICBcbiAgICB2YXIgc2VhcmNoZXIgPSB0aGlzLm15U2VhcmNoOyBcbiAgICByZXR1cm4gbmV3IFByb21pc2UoKHJlc29sdmUsIHJlamVjdCkgPT4ge1xuICAgICAgdmFyIGNQYWNrYWdlID0ge1xuICAgICAgICBza3lib3g6IGJvZHkuc2t5Ym94LFxuICAgICAgICBjdXN0b21lcjogYm9keS5jdXN0b21lci5yZXBsYWNlKFwiLVwiLCBcIlwiKS50cmltKCksXG4gICAgICAgIHRyYWNraW5nTm86IGJvZHkudHJhY2tpbmcsXG4gICAgICAgIGR1dHlQZXJjZW50OiAwLjIsXG4gICAgICAgIGRlc2NyaXB0aW9uOiBib2R5LmRlc2NyaXB0aW9uLFxuICAgICAgICBzaGlwcGVyOiBib2R5LnNoaXBwZXIsXG4gICAgICAgIHZhbHVlOiBOdW1iZXIoYm9keS52YWx1ZSksXG4gICAgICAgIHBpZWNlczogTnVtYmVyKGJvZHkucGllY2VzKSxcbiAgICAgICAgd2VpZ2h0OiBOdW1iZXIoYm9keS53ZWlnaHQpLFxuICAgICAgICBzdGF0dXM6IDEsXG4gICAgICAgIGxvY2F0aW9uOiBcIk1pYW1pXCIsXG4gICAgICAgIG1pZDogYm9keS5taWQsXG4gICAgICAgIGhhc09wdDogdHJ1ZSxcbiAgICAgICAgbXR5cGU6IGJvZHkubXR5cGVcbiAgICAgIH07XG4gICAgICBjb25zb2xlLmxvZyhcImFib3V0IHRvIHNhdmUgdGhlIHBhY2thZ2VcIik7XG4gICAgICBpZiAodHlwZW9mIGNQYWNrYWdlLnNoaXBwZXIgPT09IFwidW5kZWZpbmVkXCIpIGNQYWNrYWdlLnNoaXBwZXIgPSBcIlwiO1xuICAgICAgaWYgKHR5cGVvZiBjUGFja2FnZS5kZXNjcmlwdGlvbiA9PT0gXCJ1bmRlZmluZWRcIilcbiAgICAgICAgY1BhY2thZ2UuZGVzY3JpcHRpb24gPSBcIlwiO1xuICAgICAgY29uc29sZS5sb2coYm9keSk7XG4gICAgICBpZiAoTnVtYmVyKGJvZHkuaXNCdXNpbmVzcykgPT0gMSkge1xuICAgICAgICBjUGFja2FnZS5oYXNPcHQgPSBmYWxzZTtcbiAgICAgIH1cbiAgICAgIGNQYWNrYWdlID0gcGFja2FnZVV0aWwuY2FsY3VsYXRlRmVlcyhjUGFja2FnZSk7XG4gICAgICBjb25zb2xlLmxvZyhcInBhY2thZ2Ugd2l0aCBmZWVzXCIpO1xuXG4gICAgICAvL3dlIGFsc28gd2FudCB0byBjYWxjdWxhdGUgdGhlIHRoZSBwYWNrYWdlIGZlZXMgb25lIHRpbWUuLi4uLi5cbiAgICAgIC8vd2UgaGF2ZSB0aGUgcGFja2FnZSBkZXRhaWxzIGhlcmUgLi4gbm93IHdlIG5lZWQgdG8gZ2V0IHRoZSBleGlzdGluZyBwYWNrYWdlXG5cbiAgICAgIHZhciBjb250YWluZXIgPSBcIlwiO1xuICAgICAgdmFyIGNvbnRhaW5lck5vID0gXCJcIjtcbiAgICAgIGlmICh0eXBlb2YgYm9keS5iYWcgIT0gXCJ1bmRlZmluZWRcIikge1xuICAgICAgICBjUGFja2FnZS5iYWcgPSBib2R5LmJhZztcbiAgICAgICAgY29udGFpbmVyID0gXCJiYWdcIjtcbiAgICAgICAgY29udGFpbmVyTm8gPSBjUGFja2FnZS5iYWc7XG4gICAgICB9XG4gICAgICBpZiAodHlwZW9mIGJvZHkuc2tpZCAhPSBcInVuZGVmaW5lZFwiKSB7XG4gICAgICAgIGNQYWNrYWdlLnNraWQgPSBib2R5LnNraWQ7XG4gICAgICAgIGNvbnRhaW5lciA9IFwic2tpZFwiO1xuICAgICAgICBjb250YWluZXJObyA9IGNQYWNrYWdlLnNraWQ7XG4gICAgICB9XG4gICAgICAvL3dlIG5lZWQgdG8gY2hlY2sgdG8gc2VlIG9mIHRoZSBvd25lciBpcyBhIGJ1c2luZXNzIGhlcmVcblxuICAgICAgbHJlZGlzLmdldFBhY2thZ2UoY1BhY2thZ2UudHJhY2tpbmdObykudGhlbihwID0+IHtcbiAgICAgICAgaWYgKHApIHtcbiAgICAgICAgICB2YXIgY3VycmVudENvbnRhaW5lciA9IGBtYW5pZmVzdDoke3AubWlkfToke3AubXR5cGV9OiR7Y29udGFpbmVyfTpgO1xuICAgICAgICAgIGNvbnNvbGUubG9nKFwiZm91bmQgcGFja2FnZSBcIik7XG4gICAgICAgICAgY29uc29sZS5sb2cocCk7XG4gICAgICAgICAgaWYgKGNvbnRhaW5lciA9PSBcImJhZ1wiKSB7XG4gICAgICAgICAgICAvL2NoZWNrIHRvIHNlZSBpZiB0aGUgYmFjayBubyBpcyB0aGUgc2FtZS5cbiAgICAgICAgICAgIGlmIChwLmJhZyAhPSBjUGFja2FnZS5iYWcpIHtcbiAgICAgICAgICAgICAgLy9yZW1vdmUgaXQgZnJvbSB0aGUgb3JpZ2luYWwgbGlzdFxuICAgICAgICAgICAgICBscmVkaXMuc3JlbShjdXJyZW50Q29udGFpbmVyICsgcC5iYWcsIHAudHJhY2tpbmdObyk7XG4gICAgICAgICAgICAgIGNvbnNvbGUubG9nKFxuICAgICAgICAgICAgICAgIFwicmVtb3ZlIHBhY2thZ2UgZnJvbSBjdXJyZW50IHNldCBcIiArIGN1cnJlbnRDb250YWluZXJcbiAgICAgICAgICAgICAgKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgLy9jaGVjayB0byBzZWUgaWYgdGhlIHNraWQgbnVtYmVyIGlzIHRoZSBzYW1lLlxuICAgICAgICAgICAgaWYgKHAuc2tpZCAhPSBjUGFja2FnZS5za2lkKSB7XG4gICAgICAgICAgICAgIC8vcmVtb3ZlIGl0IGZyb20gdGhlIG9yaWdpbmFsIGxpc3RcbiAgICAgICAgICAgICAgbHJlZGlzLnNyZW0oY3VycmVudENvbnRhaW5lciArIHAuc2tpZCwgcC50cmFja2luZ05vKTtcbiAgICAgICAgICAgICAgY29uc29sZS5sb2coXG4gICAgICAgICAgICAgICAgXCJyZW1vdmUgcGFja2FnZSBmcm9tIGN1cnJlbnQgc2V0IFwiICsgY3VycmVudENvbnRhaW5lclxuICAgICAgICAgICAgICApO1xuICAgICAgICAgICAgfVxuICAgICAgICAgIH1cbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAvLyB0aGUgcGFja2FnZSBkb2Vzbid0IGV4aXN0IHVwZGF0ZSB0aGUgY291bnRlclxuICAgICAgICAgIGxyZWRpcy5jbGllbnQuaW5jcihcIm1jb3VudGVyOlwiICsgY1BhY2thZ2UubWlkKTtcbiAgICAgICAgICBcbiAgICAgICAgfVxuXG4gICAgICAgIGxyZWRpc1xuICAgICAgICAgIC5obXNldChcInBhY2thZ2VzOlwiICsgY1BhY2thZ2UudHJhY2tpbmdObywgY1BhY2thZ2UpXG4gICAgICAgICAgLnRoZW4oZnVuY3Rpb24ocmVzdWx0KSB7XG4gICAgICAgICAgICAvL2FkZCB0byBxdWV1ZSBmb3IgcGVyc2lzdGVudCBwcm9jZXNzaW5nXG4gICAgICAgICAgICBcbiAgICAgICAgICAgIHZhciBtYW5pZmVzdEtleSA9IGBtYW5pZmVzdDoke2NQYWNrYWdlLm1pZH06JHtcbiAgICAgICAgICAgICAgY1BhY2thZ2UubXR5cGVcbiAgICAgICAgICAgIH06JHtjb250YWluZXJ9OiR7Y29udGFpbmVyTm99YDtcbiAgICAgICAgICAgIGNvbnNvbGUubG9nKFwiYWJvdXQgdG8gY3JlYXRlIHRoZSBkb2N1bWVudC4uLi5cIik7XG4gICAgICAgICAgICBhZGRQYWNrYWdlVG9JbmRleChjUGFja2FnZS50cmFja2luZ05vLHNlYXJjaGVyKTsgXG4gICAgICAgICAgICBjb25zb2xlLmxvZyhcImFkZGVkIHRoZSBwYWNrYWdlIHRvIGluZGV4XCIpO1xuICAgICAgICAgICAgbHJlZGlzXG4gICAgICAgICAgICAgIC5zZXRBZGQobWFuaWZlc3RLZXksIGNQYWNrYWdlLnRyYWNraW5nTm8pXG4gICAgICAgICAgICAgIC50aGVuKGZ1bmN0aW9uKHNSZXN1bHQpIHtcbiAgICAgICAgICAgICAgICAvL2dldCB0aGUgbWVtYmVycyBvbmUgdGltZSBoZXJlXG4gICAgICAgICAgICAgICAgY29uc29sZS5sb2coXCJhZGRlZCB0aGUgcGFja2FnZSB0byB0aGUgc2V0XCIpO1xuICAgICAgICAgICAgICAgIGNvbnNvbGUubG9nKG1hbmlmZXN0S2V5KTtcbiAgICAgICAgICAgICAgICBscmVkaXNcbiAgICAgICAgICAgICAgICAgIC5nZXRNZW1iZXJzKG1hbmlmZXN0S2V5KVxuICAgICAgICAgICAgICAgICAgLnRoZW4oZGF0YSA9PiB7XG4gICAgICAgICAgICAgICAgICAgIGNvbnNvbGUubG9nKFwiZGF0YVwiKTtcbiAgICAgICAgICAgICAgICAgICAgY29uc29sZS5sb2coZGF0YSk7XG4gICAgICAgICAgICAgICAgICAgIFByb21pc2UuYWxsKGRhdGEubWFwKGxyZWRpcy5nZXRQYWNrYWdlKSk7XG4gICAgICAgICAgICAgICAgICB9KVxuICAgICAgICAgICAgICAgICAgLnRoZW4oZnVuY3Rpb24ocmRhdGEpIHtcbiAgICAgICAgICAgICAgICAgICAgLy93ZSBuZWVkIHRvIGFsZXJ0IHRoZSBwZXJzb24gdGhhdCB0aGUgcGFja2FnZSBpcyBoZXJlIHNvIHJlYWQgZW1haWwgZXRjLlxuICAgICAgICAgICAgICAgICAgICAvL2FkZCB0byB0aGUgaW5kZXhcbiAgICAgICAgICAgICAgICAgICAgY29uc29sZS5sb2coXCJkYXRhXCIpO1xuICAgICAgICAgICAgICAgICAgICBjb25zb2xlLmxvZyhyZGF0YSk7XG5cbiAgICAgICAgICAgICAgICAgICAgcmVzb2x2ZSh7XG4gICAgICAgICAgICAgICAgICAgICAgc2F2ZWQ6IHRydWUsXG4gICAgICAgICAgICAgICAgICAgICAgcGFja2FnZXM6IHJkYXRhLFxuICAgICAgICAgICAgICAgICAgICAgIHNQYWNrYWdlOiBjUGFja2FnZVxuICAgICAgICAgICAgICAgICAgICB9KTtcbiAgICAgICAgICAgICAgICAgIH0pXG4gICAgICAgICAgICAgICAgICAuY2F0Y2goZXJyMyA9PiB7XG4gICAgICAgICAgICAgICAgICAgIGNvbnNvbGUubG9nKGVycjMpO1xuICAgICAgICAgICAgICAgICAgICByZWplY3Qoe1xuICAgICAgICAgICAgICAgICAgICAgIGVycjogZXJyMyxcbiAgICAgICAgICAgICAgICAgICAgICBzYXZlZDogdHJ1ZSxcbiAgICAgICAgICAgICAgICAgICAgICBsaXN0aW5nOiBmYWxzZVxuICAgICAgICAgICAgICAgICAgICB9KTtcbiAgICAgICAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgICB9KVxuICAgICAgICAgICAgICAuY2F0Y2goZnVuY3Rpb24oZXJyKSB7XG4gICAgICAgICAgICAgICAgcmVzb2x2ZSh7XG4gICAgICAgICAgICAgICAgICBzYXZlZDogZmFsc2VcbiAgICAgICAgICAgICAgICB9KTtcbiAgICAgICAgICAgICAgfSk7XG4gICAgICAgICAgfSlcbiAgICAgICAgICAuY2F0Y2goZnVuY3Rpb24oZXJyMikge1xuICAgICAgICAgICAgcmVqZWN0KHtcbiAgICAgICAgICAgICAgc2F2ZWQ6IGZhbHNlXG4gICAgICAgICAgICB9KTtcbiAgICAgICAgICB9KTtcblxuICAgICAgICAvL3NhdmUgdGhlIHBhY2thZ2UgdG8gdGhlIHBhY2thZ2UgTlNcbiAgICAgIH0pO1xuICAgIH0pO1xuICB9XG5cbiAgdXBkYXRlTWFuaWZlc3RQYWNrYWdlVG9JblRyYW5zaXQobWlkKSB7XG4gICAgLy9nZXQgYWxsIHRoZSBwYWNrYWdlc1xuICAgIC8vd2UgbmVlZCB0byB1cGRhdGUgdGhlIGluZGV4IGF0IHRoaXMgcG9pbnQgYXMgd2VsbFxuICAgIHZhciBtc2VhcmNoID0gdGhpcy5teVNlYXJjaDtcbiAgICB0aGlzLm15U2VhcmNoLnNlYXJjaChcbiAgICAgIGBAbWlkOlske21pZH0gJHttaWR9XWAsXG4gICAgICB7IG9mZnNldDogMCwgbnVtYmVyT2ZSZXN1bHRzOiA1MDAwIH0sXG4gICAgICAoZXJyLCBkYXRhKSA9PiB7XG4gICAgICAgIHZhciBwYWNrYWdlcyA9IFtdO1xuICAgICAgICBjb25zb2xlLmxvZyhkYXRhKTtcbiAgICAgICAgZGF0YS5yZXN1bHRzLmZvckVhY2goZWxlbWVudCA9PiB7XG4gICAgICAgICAgdmFyIG9sZERvY0lkID0gZWxlbWVudC5kb2NJZDtcbiAgICAgICAgICBlbGVtZW50LmRvY0lkID0gZWxlbWVudC5kb2NJZC5yZXBsYWNlKGAke21pZH0tYCwgXCJcIik7XG4gICAgICAgICAgcGFja2FnZXMucHVzaChlbGVtZW50LmRvY0lkKTtcbiAgICAgICAgICAvLyBpIGNvdWxkIGRlbGV0ZSBoZXJlXG4gICAgICAgICAgLy8gbXNlYXJjaC5kZWxEb2N1bWVudChQS0dfSURYLG9sZERvY0lkKVxuICAgICAgICAgIC8vdXBkYXRlIGFsbCB0aGUgcGFja2FnZXNcbiAgICAgICAgfSk7XG4gICAgICAgIHNldFBhY2thZ2VJblRyYW5zaXQocGFja2FnZXMsIG1zZWFyY2gsIG1pZCkudGhlbihmdW5jdGlvbihcbiAgICAgICAgICB1cGRhdGVkUGFja2FnZXNcbiAgICAgICAgKSB7XG4gICAgICAgICAgY29uc29sZS5sb2coXCJ1cGRhdGVkIHBhY2thZ2VzXCIpO1xuICAgICAgICAgIGNvbnNvbGUubG9nKHVwZGF0ZWRQYWNrYWdlcyk7XG4gICAgICAgIH0pO1xuICAgICAgfVxuICAgICk7XG4gIH1cbiAgcmVtb3ZlUGFja2FnZSh0cmFja2luZ05vLCBtaWQpIHtcbiAgICB2YXIgbXNlYXJjaCA9IHRoaXMubXlTZWFyY2g7XG4gICAgcmV0dXJuIG5ldyBQcm9taXNlKChyZXNvbHZlLCByZWplY3QpID0+IHtcbiAgICAgIHZhciBtYW5pZmVzdCA9IG1pZDtcbiAgICAgIHZhciBtYW5pZmVzdEtleSA9IFwibWFuaWZlc3Q6XCIgKyBtYW5pZmVzdCArIFwiOipcIjtcblxuICAgICAgbHJlZGlzLmRlbChcInBhY2thZ2VzOlwiICsgdHJhY2tpbmdObykudGhlbihmdW5jdGlvbihyZXN1bHQpIHtcbiAgICAgICAgY29uc29sZS5sb2cocmVzdWx0KTtcbiAgICAgICAgbXNlYXJjaC5kZWxEb2N1bWVudChQS0dfSURYLCBgJHttaWR9LSR7dHJhY2tpbmdOb31gKTtcbiAgICAgICAgLy93ZSBuZWVkIHRvIHJlbW92ZSBmcm9tIHRoZSBpbmRleCBhbmQgZGVjIHRoZSBjb3VudGVyXG4gICAgICAgIGxyZWRpcy5jbGllbnQuZGVjcihcIm1jb3VudGVyOlwiICsgbWlkKTtcbiAgICAgICAgLy9yU2VydmljZXMucGFja2FnZVNlcnZpY2Uucm1QYWNrYWdlKG1pZCwgdHJhY2tpbmdObyk7XG4gICAgICAgIGxyZWRpcy5nZXRLZXlzKG1hbmlmZXN0S2V5KS50aGVuKGtSZXN1bHQgPT4ge1xuICAgICAgICAgIC8vdGhlIGxpc3Qgb2YgYWxsIHRoZSBzZXRzIC4uLndlIG5lZWQgdG8gcmVtb3ZlIHRoZSBrZXkgZnJvbSBlYWNoIG9uZVxuICAgICAgICAgIHZhciBrZXlzQ291bnQgPSAwO1xuXG4gICAgICAgICAga1Jlc3VsdC5mb3JFYWNoKGVsZW1lbnQgPT4ge1xuICAgICAgICAgICAgY29uc29sZS5sb2coXG4gICAgICAgICAgICAgIGByZW1vdmluZyAke3RyYWNraW5nTm99IHBhY2thZ2UgbWFuaWZlc3Qgc2V0ICR7ZWxlbWVudH0gYFxuICAgICAgICAgICAgKTtcbiAgICAgICAgICAgIGxyZWRpcy5zcmVtKGVsZW1lbnQsIHRyYWNraW5nTm8pLnRoZW4oZnVuY3Rpb24oclJlc3VsdCkge1xuICAgICAgICAgICAgICBjb25zb2xlLmxvZyhyUmVzdWx0KTtcbiAgICAgICAgICAgICAgY29uc29sZS5sb2coXCJyZW1vdmVkXCIpO1xuICAgICAgICAgICAgICBpZiAoa2V5c0NvdW50ID09IGtSZXN1bHQubGVuZ3RoIC0gMSkga2V5c0NvdW50Kys7XG4gICAgICAgICAgICB9KTtcbiAgICAgICAgICB9KTtcbiAgICAgICAgICByZXNvbHZlKHtcbiAgICAgICAgICAgIGRlbGV0ZWQ6IHRydWVcbiAgICAgICAgICB9KTtcbiAgICAgICAgfSk7XG5cbiAgICAgICAgLy93ZSBhbHNvIG5lZWQgdG8gcmVtb3ZlIGZyb20gYW55IHNldHNcbiAgICAgIH0pO1xuICAgIH0pO1xuICB9XG4gIHN0b3JlUGFja2FnZUZvclBpY2t1cCh0cmFja2luZ05vLGJpbil7XG4gICAgdmFyIHNlYXJjaGVyID0gdGhpcy5teVNlYXJjaDtcbiAgICByZXR1cm4gbmV3IFByb21pc2UoKHJlc29sdmUscmVqZWN0KT0+e1xuICAgICAgIGxyZWRpcy5obXNldChQS0dfUFJFRklYK3RyYWNraW5nTm8se3N0YXR1czo0LGxvY2F0aW9uOmJpbn0pLnRoZW4oKHJlc3VsdCk9PntcbiAgICAgICAgIGxyZWRpcy5nZXRQYWNrYWdlKHRyYWNraW5nTm8pLnRoZW4oKHBrZyk9PntcbiAgICAgICAgICBhZGRQYWNrYWdlVG9JbmRleCh0cmFja2luZ05vLHNlYXJjaGVyKSA7IFxuICAgICAgICAgIHJlc29sdmUocGtnKTsgICBcbiAgICAgICAgIH0pO1xuICAgICAgIH0pIFxuICAgIH0pOyBcbiAgfVxuICB1cGRhdGVQYWNrYWdlSW5kZXgodHJhY2tpbmcpe1xuICAgICAgcmV0dXJuIG5ldyBQcm9taXNlKChyZXNvbHZlLHJlamVjdCk9PntcbiAgICAgICAgICB2YXIgbXNlYXJjaCA9IHRoaXMubXlTZWFyY2g7IFxuICAgICAgICAgIGFkZFBhY2thZ2VUb0luZGV4KHRyYWNraW5nLG1zZWFyY2gpOyBcbiAgICAgICAgIHJlc29sdmUoeyd1cGRhdGVkJzp0cnVlfSk7XG4gICAgICB9KVxuICB9XG4gIGdldEN1c3RvbWVyUGFja2FnZXMoc2t5Ym94KSB7fVxuICBnZXRNYW5pZmVzdFBhY2thZ2VzQnlTdGF0dXMobWlkLHN0YXR1cykge1xuICAgICAgcmV0dXJuIG5ldyBQcm9taXNlKChyZXNvbHZlLHJlamVjdCk9PntcbiAgICAgICAgICBjb25zb2xlLmxvZyhgQG1pZDpbJHttaWR9ICR7bWlkfV0gQHN0YXR1cz1bJHtzdGF0dXN9ICR7c3RhdHVzfV1gKVxuICAgICAgICB0aGlzLm15U2VhcmNoLnNlYXJjaChcbiAgICAgICAgICAgIGBAbWlkOlske21pZH0gJHttaWR9XSBAc3RhdHVzOlske3N0YXR1c30gJHtzdGF0dXN9XWAsXG4gICAgICAgICAgICB7IG9mZnNldDogMCwgbnVtYmVyT2ZSZXN1bHRzOiA1MDAwIH0sXG4gICAgICAgICAgICAoZXJyLCBkYXRhKSA9PiB7XG4gICAgICAgICAgICAgIHZhciBwYWNrYWdlcyA9IFtdO1xuICAgICAgICAgICAgICBjb25zb2xlLmxvZyhkYXRhKTtcbiAgICAgICAgICAgICAgZGF0YS5yZXN1bHRzLmZvckVhY2goZWxlbWVudCA9PiB7XG5cbiAgICAgICAgICAgICAgICBwYWNrYWdlcy5wdXNoKGVsZW1lbnQuZG9jKTtcbiAgICAgICAgICAgICAgICByZXNvbHZlKHBhY2thZ2VzKTsgICAgICAgICAgICAgICAgIFxuICAgICAgICAgICAgfSk7XG4gICAgICAgIH0pO1xuICAgICAgfSk7XG4gIFxuICB9ICAgICBcbn1cbiJdfQ==
