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
//# sourceMappingURL=data:application/json;charset=utf8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIlJlZGlzU2VydmljZXMvUGFja2FnZVNlcnZpY2UuZXM2Il0sIm5hbWVzIjpbInJlZGlzIiwicmVxdWlyZSIsImxyZWRpcyIsIm1vbWVudCIsInJlZGlzU2VhcmNoIiwiZnMiLCJQYWNrYWdlVXRpbCIsIlBhY2thZ2VVdGlsaXR5IiwicGFja2FnZVV0aWwiLCJQS0dfSURYIiwiUEtHX1BSRUZJWCIsImNyZWF0ZURvY3VtZW50IiwidFBhY2thZ2UiLCJwYWNrYWdlRG9jdW1lbnQiLCJ0cmFja2luZ05vIiwic2t5Ym94IiwiY3VzdG9tZXIiLCJzaGlwcGVyIiwiZGVzY3JpcHRpb24iLCJza3lib3hWIiwic3RhdHVzIiwibWlkIiwidmFsdWUiLCJ0dHZhbHVlIiwiY29uc29sZSIsImxvZyIsInNldFBhY2thZ2VJblRyYW5zaXQiLCJrZXlzIiwibXNlYXJjaGVyIiwiUHJvbWlzZSIsInJlc29sdmUiLCJyZWplY3QiLCJiYXRjaGVyIiwiY2xpZW50IiwiYmF0Y2giLCJmb3JFYWNoIiwibG9jYXRpb24iLCJlbGVtZW50IiwiaG1zZXQiLCJleGVjIiwiZXJyIiwicmVzdWx0IiwiYWRkUGFja2FnZVRvSW5kZXgiLCJnZXRQYWNrYWdlIiwidGhlbiIsImRlbERvY3VtZW50IiwicGFjayIsImRvbmUiLCJkb2N1bWVudCIsImFkZCIsIlBhY2thZ2VTZXJ2aWNlIiwic2V0dXBJbmRleCIsIm15U2VhcmNoIiwiY2xpZW50T3B0aW9ucyIsInNlYXJjaENsaWVudERldGFpbHMiLCJib2R5Iiwic2VhcmNoZXIiLCJjUGFja2FnZSIsInJlcGxhY2UiLCJ0cmltIiwidHJhY2tpbmciLCJkdXR5UGVyY2VudCIsIk51bWJlciIsInBpZWNlcyIsIndlaWdodCIsImhhc09wdCIsIm10eXBlIiwiaXNCdXNpbmVzcyIsImNhbGN1bGF0ZUZlZXMiLCJjb250YWluZXIiLCJjb250YWluZXJObyIsImJhZyIsInNraWQiLCJwIiwiY3VycmVudENvbnRhaW5lciIsInNyZW0iLCJpbmNyIiwibWFuaWZlc3RLZXkiLCJzZXRBZGQiLCJzUmVzdWx0IiwiZ2V0TWVtYmVycyIsImRhdGEiLCJhbGwiLCJtYXAiLCJyZGF0YSIsInNhdmVkIiwicGFja2FnZXMiLCJzUGFja2FnZSIsImNhdGNoIiwiZXJyMyIsImxpc3RpbmciLCJlcnIyIiwibXNlYXJjaCIsInNlYXJjaCIsIm9mZnNldCIsIm51bWJlck9mUmVzdWx0cyIsInJlc3VsdHMiLCJvbGREb2NJZCIsImRvY0lkIiwicHVzaCIsInVwZGF0ZWRQYWNrYWdlcyIsIm1hbmlmZXN0IiwiZGVsIiwiZGVjciIsImdldEtleXMiLCJrZXlzQ291bnQiLCJrUmVzdWx0IiwiclJlc3VsdCIsImxlbmd0aCIsImRlbGV0ZWQiLCJiaW4iLCJwa2ciLCJkb2MiXSwibWFwcGluZ3MiOiI7Ozs7Ozs7OztBQUFBOzs7O0FBRUEsSUFBSUEsUUFBUUMsUUFBUSxPQUFSLENBQVo7QUFDQSxJQUFJQyxTQUFTRCxRQUFRLDZCQUFSLENBQWI7QUFDQSxJQUFJRSxTQUFTRixRQUFRLFFBQVIsQ0FBYjtBQUNBLElBQUlHLGNBQWNILFFBQVEscUJBQVIsQ0FBbEI7QUFDQSxJQUFJSSxLQUFLSixRQUFRLElBQVIsQ0FBVDs7QUFFQSxJQUFJSyxjQUFjTCxRQUFRLHFCQUFSLEVBQStCTSxjQUFqRDtBQUNBLElBQUlDLGNBQWMsSUFBSUYsV0FBSixFQUFsQjtBQUNBLElBQU1HLFVBQVUsZ0JBQWhCO0FBQ0EsSUFBTUMsYUFBYSxXQUFuQjtBQUNBLFNBQVNDLGNBQVQsQ0FBd0JDLFFBQXhCLEVBQWtDO0FBQ2hDLE1BQUlDLGtCQUFrQjtBQUNwQkMsZ0JBQVlGLFNBQVNFLFVBREQ7QUFFcEJDLFlBQVFILFNBQVNHLE1BRkc7QUFHcEJDLGNBQVVKLFNBQVNJLFFBSEM7QUFJcEJDLGFBQVNMLFNBQVNLLE9BSkU7QUFLcEJDLGlCQUFhTixTQUFTTSxXQUxGO0FBTXBCQyxhQUFTUCxTQUFTRyxNQU5FO0FBT3BCSyxZQUFRUixTQUFTUSxNQVBHO0FBUXBCQyxTQUFLVCxTQUFTUyxHQVJNO0FBU3BC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QVYsMEJBQWtCa0IsUUFBbEIsRUFBMkJnQyxPQUEzQjtBQUNEOUQsZ0JBQVEsRUFBQyxXQUFVLElBQVgsRUFBUjtBQUNGLE9BSk0sQ0FBUDtBQUtIOzs7d0NBQ21CZixNLEVBQVEsQ0FBRTs7O2dEQUNGTSxHLEVBQUlELE0sRUFBUTtBQUFBOztBQUNwQyxhQUFPLElBQUlTLE9BQUosQ0FBWSxVQUFDQyxPQUFELEVBQVNDLE1BQVQsRUFBa0I7QUFDakNQLGdCQUFRQyxHQUFSLFlBQXFCSixHQUFyQixTQUE0QkEsR0FBNUIsbUJBQTZDRCxNQUE3QyxTQUF1REEsTUFBdkQ7QUFDRixlQUFLZ0MsUUFBTCxDQUFjeUMsTUFBZCxZQUNheEUsR0FEYixTQUNvQkEsR0FEcEIsbUJBQ3FDRCxNQURyQyxTQUMrQ0EsTUFEL0MsUUFFSSxFQUFFMEUsUUFBUSxDQUFWLEVBQWFDLGlCQUFpQixJQUE5QixFQUZKLEVBR0ksVUFBQ3ZELEdBQUQsRUFBTXlDLElBQU4sRUFBZTtBQUNiLGNBQUlLLFdBQVcsRUFBZjtBQUNBOUQsa0JBQVFDLEdBQVIsQ0FBWXdELElBQVo7QUFDQUEsZUFBS2UsT0FBTCxDQUFhN0QsT0FBYixDQUFxQixtQkFBVzs7QUFFOUJtRCxxQkFBU2EsSUFBVCxDQUFjOUQsUUFBUTJFLEdBQXRCO0FBQ0FsRixvQkFBUXdELFFBQVI7QUFDSCxXQUpDO0FBS0wsU0FYRDtBQVlELE9BZE0sQ0FBUDtBQWdCSCIsImZpbGUiOiJSZWRpc1NlcnZpY2VzL1BhY2thZ2VTZXJ2aWNlLmpzIiwic291cmNlc0NvbnRlbnQiOlsiaW1wb3J0IHsgY2xpZW50IH0gZnJvbSBcIi4uL0RhdGFTZXJ2aWNlcy9yZWRpcy1sb2NhbFwiO1xyXG5cclxudmFyIHJlZGlzID0gcmVxdWlyZShcInJlZGlzXCIpO1xyXG52YXIgbHJlZGlzID0gcmVxdWlyZShcIi4uL0RhdGFTZXJ2aWNlcy9yZWRpcy1sb2NhbFwiKTtcclxudmFyIG1vbWVudCA9IHJlcXVpcmUoXCJtb21lbnRcIik7XHJcbnZhciByZWRpc1NlYXJjaCA9IHJlcXVpcmUoXCIuLi9yZWRpc2VhcmNoY2xpZW50XCIpO1xyXG52YXIgZnMgPSByZXF1aXJlKFwiZnNcIik7XHJcblxyXG52YXIgUGFja2FnZVV0aWwgPSByZXF1aXJlKFwiLi4vVXRpbC9wYWNrYWdldXRpbFwiKS5QYWNrYWdlVXRpbGl0eTtcclxudmFyIHBhY2thZ2VVdGlsID0gbmV3IFBhY2thZ2VVdGlsKCk7XHJcbmNvbnN0IFBLR19JRFggPSBcImluZGV4OnBhY2thZ2VzXCI7XHJcbmNvbnN0IFBLR19QUkVGSVggPSBcInBhY2thZ2VzOlwiO1xyXG5mdW5jdGlvbiBjcmVhdGVEb2N1bWVudCh0UGFja2FnZSkge1xyXG4gIHZhciBwYWNrYWdlRG9jdW1lbnQgPSB7XHJcbiAgICB0cmFja2luZ05vOiB0UGFja2FnZS50cmFja2luZ05vLFxyXG4gICAgc2t5Ym94OiB0UGFja2FnZS5za3lib3gsXHJcbiAgICBjdXN0b21lcjogdFBhY2thZ2UuY3VzdG9tZXIsXHJcbiAgICBzaGlwcGVyOiB0UGFja2FnZS5zaGlwcGVyLFxyXG4gICAgZGVzY3JpcHRpb246IHRQYWNrYWdlLmRlc2NyaXB0aW9uLFxyXG4gICAgc2t5Ym94VjogdFBhY2thZ2Uuc2t5Ym94LFxyXG4gICAgc3RhdHVzOiB0UGFja2FnZS5zdGF0dXMsXHJcbiAgICBtaWQ6IHRQYWNrYWdlLm1pZCxcclxuICAgIHZhbHVlOiB0UGFja2FnZS50dHZhbHVlXHJcbiAgfTtcclxuICBjb25zb2xlLmxvZyhcImFib3V0IHRvIGFkZCB0aGUgcGFja2FnZSB0byB0aGUgaW5kZXhcIik7XHJcbiAgcmV0dXJuIHBhY2thZ2VEb2N1bWVudDtcclxufVxyXG5mdW5jdGlvbiBzZXRQYWNrYWdlSW5UcmFuc2l0KGtleXMsIG1zZWFyY2hlcikge1xyXG4gIHJldHVybiBuZXcgUHJvbWlzZSgocmVzb2x2ZSwgcmVqZWN0KSA9PiB7XHJcbiAgICB2YXIgYmF0Y2hlciA9IG1zZWFyY2hlci5jbGllbnQuYmF0Y2goKTtcclxuICAgIGtleXMuZm9yRWFjaChlbGVtZW50ID0+IHtcclxuICAgICAgdmFyIHZhbHVlID0ge1xyXG4gICAgICAgIHN0YXR1czogMixcclxuICAgICAgICBsb2NhdGlvbjogXCJJbiBUcmFuc2l0XCJcclxuICAgICAgfTtcclxuICAgICAgY29uc29sZS5sb2coZWxlbWVudCArIFwiaXMgdGhlIGVsZW1lbnRcIik7XHJcblxyXG4gICAgICBiYXRjaGVyLmhtc2V0KFBLR19QUkVGSVggKyBlbGVtZW50LCB2YWx1ZSk7XHJcbiAgICB9KTtcclxuICAgIGJhdGNoZXIuZXhlYygoZXJyLCByZXN1bHQpID0+IHtcclxuICAgICAgY29uc29sZS5sb2cocmVzdWx0KTtcclxuICAgICAgLy9yZWFkZCB0aGUgZG9jdW1lbnRzIGhlcmVcclxuICAgICAga2V5cy5mb3JFYWNoKGVsZW1lbnQgPT4ge1xyXG4gICAgICAgIGFkZFBhY2thZ2VUb0luZGV4KGVsZW1lbnQsIG1zZWFyY2hlcik7XHJcbiAgICAgIH0pO1xyXG4gICAgICByZXNvbHZlKHJlc3VsdCk7XHJcbiAgICB9KTtcclxuICB9KTtcclxufVxyXG5cclxuZnVuY3Rpb24gYWRkUGFja2FnZVRvSW5kZXgodHJhY2tpbmdObywgbXNlYXJjaGVyKSB7XHJcbiAgbHJlZGlzLmdldFBhY2thZ2UodHJhY2tpbmdObykudGhlbihwYWNrID0+IHtcclxuICAgIG1zZWFyY2hlci5kZWxEb2N1bWVudChQS0dfSURYLCBgJHtwYWNrLm1pZH0tJHt0cmFja2luZ05vfWAsIChlcnIsIGRvbmUpID0+IHtcclxuICAgICAgdmFyIGRvY3VtZW50ID0gY3JlYXRlRG9jdW1lbnQocGFjayk7XHJcbiAgICAgIGNvbnNvbGUubG9nKFwicmVhZGRpbmcgcGFja2FnZSB0byB0aGUgaW5kZXggbGlrZSBhIGJvc3MgXCIgKyB0cmFja2luZ05vKTtcclxuICAgICAgbXNlYXJjaGVyLmFkZChwYWNrLm1pZCArIFwiLVwiICsgcGFjay50cmFja2luZ05vLCBkb2N1bWVudCk7XHJcbiAgICB9KTtcclxuICB9KTtcclxufVxyXG5leHBvcnQgY2xhc3MgUGFja2FnZVNlcnZpY2Uge1xyXG4gIGNvbnN0cnVjdG9yKCkge1xyXG4gICAgdGhpcy5zZXR1cEluZGV4KCk7XHJcbiAgfVxyXG4gIHNldHVwSW5kZXgoKSB7XHJcbiAgICB0aGlzLm15U2VhcmNoID0gcmVkaXNTZWFyY2gocmVkaXMsIFBLR19JRFgsIHtcclxuICAgICAgY2xpZW50T3B0aW9uczogbHJlZGlzLnNlYXJjaENsaWVudERldGFpbHNcclxuICAgIH0pO1xyXG4gIH1cclxuICBzYXZlUGFja2FnZShib2R5KSB7XHJcbiAgICBcclxuICAgIHZhciBzZWFyY2hlciA9IHRoaXMubXlTZWFyY2g7IFxyXG4gICAgcmV0dXJuIG5ldyBQcm9taXNlKChyZXNvbHZlLCByZWplY3QpID0+IHtcclxuICAgICAgdmFyIGNQYWNrYWdlID0ge1xyXG4gICAgICAgIHNreWJveDogYm9keS5za3lib3gsXHJcbiAgICAgICAgY3VzdG9tZXI6IGJvZHkuY3VzdG9tZXIucmVwbGFjZShcIi1cIiwgXCJcIikudHJpbSgpLFxyXG4gICAgICAgIHRyYWNraW5nTm86IGJvZHkudHJhY2tpbmcsXHJcbiAgICAgICAgZHV0eVBlcmNlbnQ6IDAuMixcclxuICAgICAgICBkZXNjcmlwdGlvbjogYm9keS5kZXNjcmlwdGlvbixcclxuICAgICAgICBzaGlwcGVyOiBib2R5LnNoaXBwZXIsXHJcbiAgICAgICAgdmFsdWU6IE51bWJlcihib2R5LnZhbHVlKSxcclxuICAgICAgICBwaWVjZXM6IE51bWJlcihib2R5LnBpZWNlcyksXHJcbiAgICAgICAgd2VpZ2h0OiBOdW1iZXIoYm9keS53ZWlnaHQpLFxyXG4gICAgICAgIHN0YXR1czogMSxcclxuICAgICAgICBsb2NhdGlvbjogXCJNaWFtaVwiLFxyXG4gICAgICAgIG1pZDogYm9keS5taWQsXHJcbiAgICAgICAgaGFzT3B0OiB0cnVlLFxyXG4gICAgICAgIG10eXBlOiBib2R5Lm10eXBlXHJcbiAgICAgIH07XHJcbiAgICAgIGNvbnNvbGUubG9nKFwiYWJvdXQgdG8gc2F2ZSB0aGUgcGFja2FnZVwiKTtcclxuICAgICAgaWYgKHR5cGVvZiBjUGFja2FnZS5zaGlwcGVyID09PSBcInVuZGVmaW5lZFwiKSBjUGFja2FnZS5zaGlwcGVyID0gXCJcIjtcclxuICAgICAgaWYgKHR5cGVvZiBjUGFja2FnZS5kZXNjcmlwdGlvbiA9PT0gXCJ1bmRlZmluZWRcIilcclxuICAgICAgICBjUGFja2FnZS5kZXNjcmlwdGlvbiA9IFwiXCI7XHJcbiAgICAgIGNvbnNvbGUubG9nKGJvZHkpO1xyXG4gICAgICBpZiAoTnVtYmVyKGJvZHkuaXNCdXNpbmVzcykgPT0gMSkge1xyXG4gICAgICAgIGNQYWNrYWdlLmhhc09wdCA9IGZhbHNlO1xyXG4gICAgICB9XHJcbiAgICAgIGNQYWNrYWdlID0gcGFja2FnZVV0aWwuY2FsY3VsYXRlRmVlcyhjUGFja2FnZSk7XHJcbiAgICAgIGNvbnNvbGUubG9nKFwicGFja2FnZSB3aXRoIGZlZXNcIik7XHJcblxyXG4gICAgICAvL3dlIGFsc28gd2FudCB0byBjYWxjdWxhdGUgdGhlIHRoZSBwYWNrYWdlIGZlZXMgb25lIHRpbWUuLi4uLi5cclxuICAgICAgLy93ZSBoYXZlIHRoZSBwYWNrYWdlIGRldGFpbHMgaGVyZSAuLiBub3cgd2UgbmVlZCB0byBnZXQgdGhlIGV4aXN0aW5nIHBhY2thZ2VcclxuXHJcbiAgICAgIHZhciBjb250YWluZXIgPSBcIlwiO1xyXG4gICAgICB2YXIgY29udGFpbmVyTm8gPSBcIlwiO1xyXG4gICAgICBpZiAodHlwZW9mIGJvZHkuYmFnICE9IFwidW5kZWZpbmVkXCIpIHtcclxuICAgICAgICBjUGFja2FnZS5iYWcgPSBib2R5LmJhZztcclxuICAgICAgICBjb250YWluZXIgPSBcImJhZ1wiO1xyXG4gICAgICAgIGNvbnRhaW5lck5vID0gY1BhY2thZ2UuYmFnO1xyXG4gICAgICB9XHJcbiAgICAgIGlmICh0eXBlb2YgYm9keS5za2lkICE9IFwidW5kZWZpbmVkXCIpIHtcclxuICAgICAgICBjUGFja2FnZS5za2lkID0gYm9keS5za2lkO1xyXG4gICAgICAgIGNvbnRhaW5lciA9IFwic2tpZFwiO1xyXG4gICAgICAgIGNvbnRhaW5lck5vID0gY1BhY2thZ2Uuc2tpZDtcclxuICAgICAgfVxyXG4gICAgICAvL3dlIG5lZWQgdG8gY2hlY2sgdG8gc2VlIG9mIHRoZSBvd25lciBpcyBhIGJ1c2luZXNzIGhlcmVcclxuXHJcbiAgICAgIGxyZWRpcy5nZXRQYWNrYWdlKGNQYWNrYWdlLnRyYWNraW5nTm8pLnRoZW4ocCA9PiB7XHJcbiAgICAgICAgaWYgKHApIHtcclxuICAgICAgICAgIHZhciBjdXJyZW50Q29udGFpbmVyID0gYG1hbmlmZXN0OiR7cC5taWR9OiR7cC5tdHlwZX06JHtjb250YWluZXJ9OmA7XHJcbiAgICAgICAgICBjb25zb2xlLmxvZyhcImZvdW5kIHBhY2thZ2UgXCIpO1xyXG4gICAgICAgICAgY29uc29sZS5sb2cocCk7XHJcbiAgICAgICAgICBpZiAoY29udGFpbmVyID09IFwiYmFnXCIpIHtcclxuICAgICAgICAgICAgLy9jaGVjayB0byBzZWUgaWYgdGhlIGJhY2sgbm8gaXMgdGhlIHNhbWUuXHJcbiAgICAgICAgICAgIGlmIChwLmJhZyAhPSBjUGFja2FnZS5iYWcpIHtcclxuICAgICAgICAgICAgICAvL3JlbW92ZSBpdCBmcm9tIHRoZSBvcmlnaW5hbCBsaXN0XHJcbiAgICAgICAgICAgICAgbHJlZGlzLnNyZW0oY3VycmVudENvbnRhaW5lciArIHAuYmFnLCBwLnRyYWNraW5nTm8pO1xyXG4gICAgICAgICAgICAgIGNvbnNvbGUubG9nKFxyXG4gICAgICAgICAgICAgICAgXCJyZW1vdmUgcGFja2FnZSBmcm9tIGN1cnJlbnQgc2V0IFwiICsgY3VycmVudENvbnRhaW5lclxyXG4gICAgICAgICAgICAgICk7XHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICAgIH0gZWxzZSB7XHJcbiAgICAgICAgICAgIC8vY2hlY2sgdG8gc2VlIGlmIHRoZSBza2lkIG51bWJlciBpcyB0aGUgc2FtZS5cclxuICAgICAgICAgICAgaWYgKHAuc2tpZCAhPSBjUGFja2FnZS5za2lkKSB7XHJcbiAgICAgICAgICAgICAgLy9yZW1vdmUgaXQgZnJvbSB0aGUgb3JpZ2luYWwgbGlzdFxyXG4gICAgICAgICAgICAgIGxyZWRpcy5zcmVtKGN1cnJlbnRDb250YWluZXIgKyBwLnNraWQsIHAudHJhY2tpbmdObyk7XHJcbiAgICAgICAgICAgICAgY29uc29sZS5sb2coXHJcbiAgICAgICAgICAgICAgICBcInJlbW92ZSBwYWNrYWdlIGZyb20gY3VycmVudCBzZXQgXCIgKyBjdXJyZW50Q29udGFpbmVyXHJcbiAgICAgICAgICAgICAgKTtcclxuICAgICAgICAgICAgfVxyXG4gICAgICAgICAgfVxyXG4gICAgICAgIH0gZWxzZSB7XHJcbiAgICAgICAgICAvLyB0aGUgcGFja2FnZSBkb2Vzbid0IGV4aXN0IHVwZGF0ZSB0aGUgY291bnRlclxyXG4gICAgICAgICAgbHJlZGlzLmNsaWVudC5pbmNyKFwibWNvdW50ZXI6XCIgKyBjUGFja2FnZS5taWQpO1xyXG4gICAgICAgICAgXHJcbiAgICAgICAgfVxyXG5cclxuICAgICAgICBscmVkaXNcclxuICAgICAgICAgIC5obXNldChcInBhY2thZ2VzOlwiICsgY1BhY2thZ2UudHJhY2tpbmdObywgY1BhY2thZ2UpXHJcbiAgICAgICAgICAudGhlbihmdW5jdGlvbihyZXN1bHQpIHtcclxuICAgICAgICAgICAgLy9hZGQgdG8gcXVldWUgZm9yIHBlcnNpc3RlbnQgcHJvY2Vzc2luZ1xyXG4gICAgICAgICAgICBcclxuICAgICAgICAgICAgdmFyIG1hbmlmZXN0S2V5ID0gYG1hbmlmZXN0OiR7Y1BhY2thZ2UubWlkfToke1xyXG4gICAgICAgICAgICAgIGNQYWNrYWdlLm10eXBlXHJcbiAgICAgICAgICAgIH06JHtjb250YWluZXJ9OiR7Y29udGFpbmVyTm99YDtcclxuICAgICAgICAgICAgY29uc29sZS5sb2coXCJhYm91dCB0byBjcmVhdGUgdGhlIGRvY3VtZW50Li4uLlwiKTtcclxuICAgICAgICAgICAgYWRkUGFja2FnZVRvSW5kZXgoY1BhY2thZ2UudHJhY2tpbmdObyxzZWFyY2hlcik7IFxyXG4gICAgICAgICAgICBjb25zb2xlLmxvZyhcImFkZGVkIHRoZSBwYWNrYWdlIHRvIGluZGV4XCIpO1xyXG4gICAgICAgICAgICBscmVkaXNcclxuICAgICAgICAgICAgICAuc2V0QWRkKG1hbmlmZXN0S2V5LCBjUGFja2FnZS50cmFja2luZ05vKVxyXG4gICAgICAgICAgICAgIC50aGVuKGZ1bmN0aW9uKHNSZXN1bHQpIHtcclxuICAgICAgICAgICAgICAgIC8vZ2V0IHRoZSBtZW1iZXJzIG9uZSB0aW1lIGhlcmVcclxuICAgICAgICAgICAgICAgIGNvbnNvbGUubG9nKFwiYWRkZWQgdGhlIHBhY2thZ2UgdG8gdGhlIHNldFwiKTtcclxuICAgICAgICAgICAgICAgIGNvbnNvbGUubG9nKG1hbmlmZXN0S2V5KTtcclxuICAgICAgICAgICAgICAgIGxyZWRpc1xyXG4gICAgICAgICAgICAgICAgICAuZ2V0TWVtYmVycyhtYW5pZmVzdEtleSlcclxuICAgICAgICAgICAgICAgICAgLnRoZW4oZGF0YSA9PiB7XHJcbiAgICAgICAgICAgICAgICAgICAgY29uc29sZS5sb2coXCJkYXRhXCIpO1xyXG4gICAgICAgICAgICAgICAgICAgIGNvbnNvbGUubG9nKGRhdGEpO1xyXG4gICAgICAgICAgICAgICAgICAgIFByb21pc2UuYWxsKGRhdGEubWFwKGxyZWRpcy5nZXRQYWNrYWdlKSk7XHJcbiAgICAgICAgICAgICAgICAgIH0pXHJcbiAgICAgICAgICAgICAgICAgIC50aGVuKGZ1bmN0aW9uKHJkYXRhKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgLy93ZSBuZWVkIHRvIGFsZXJ0IHRoZSBwZXJzb24gdGhhdCB0aGUgcGFja2FnZSBpcyBoZXJlIHNvIHJlYWQgZW1haWwgZXRjLlxyXG4gICAgICAgICAgICAgICAgICAgIC8vYWRkIHRvIHRoZSBpbmRleFxyXG4gICAgICAgICAgICAgICAgICAgIGNvbnNvbGUubG9nKFwiZGF0YVwiKTtcclxuICAgICAgICAgICAgICAgICAgICBjb25zb2xlLmxvZyhyZGF0YSk7XHJcblxyXG4gICAgICAgICAgICAgICAgICAgIHJlc29sdmUoe1xyXG4gICAgICAgICAgICAgICAgICAgICAgc2F2ZWQ6IHRydWUsXHJcbiAgICAgICAgICAgICAgICAgICAgICBwYWNrYWdlczogcmRhdGEsXHJcbiAgICAgICAgICAgICAgICAgICAgICBzUGFja2FnZTogY1BhY2thZ2VcclxuICAgICAgICAgICAgICAgICAgICB9KTtcclxuICAgICAgICAgICAgICAgICAgfSlcclxuICAgICAgICAgICAgICAgICAgLmNhdGNoKGVycjMgPT4ge1xyXG4gICAgICAgICAgICAgICAgICAgIGNvbnNvbGUubG9nKGVycjMpO1xyXG4gICAgICAgICAgICAgICAgICAgIHJlamVjdCh7XHJcbiAgICAgICAgICAgICAgICAgICAgICBlcnI6IGVycjMsXHJcbiAgICAgICAgICAgICAgICAgICAgICBzYXZlZDogdHJ1ZSxcclxuICAgICAgICAgICAgICAgICAgICAgIGxpc3Rpbmc6IGZhbHNlXHJcbiAgICAgICAgICAgICAgICAgICAgfSk7XHJcbiAgICAgICAgICAgICAgICAgIH0pO1xyXG4gICAgICAgICAgICAgIH0pXHJcbiAgICAgICAgICAgICAgLmNhdGNoKGZ1bmN0aW9uKGVycikge1xyXG4gICAgICAgICAgICAgICAgcmVzb2x2ZSh7XHJcbiAgICAgICAgICAgICAgICAgIHNhdmVkOiBmYWxzZVxyXG4gICAgICAgICAgICAgICAgfSk7XHJcbiAgICAgICAgICAgICAgfSk7XHJcbiAgICAgICAgICB9KVxyXG4gICAgICAgICAgLmNhdGNoKGZ1bmN0aW9uKGVycjIpIHtcclxuICAgICAgICAgICAgcmVqZWN0KHtcclxuICAgICAgICAgICAgICBzYXZlZDogZmFsc2VcclxuICAgICAgICAgICAgfSk7XHJcbiAgICAgICAgICB9KTtcclxuXHJcbiAgICAgICAgLy9zYXZlIHRoZSBwYWNrYWdlIHRvIHRoZSBwYWNrYWdlIE5TXHJcbiAgICAgIH0pO1xyXG4gICAgfSk7XHJcbiAgfVxyXG5cclxuICB1cGRhdGVNYW5pZmVzdFBhY2thZ2VUb0luVHJhbnNpdChtaWQpIHtcclxuICAgIC8vZ2V0IGFsbCB0aGUgcGFja2FnZXNcclxuICAgIC8vd2UgbmVlZCB0byB1cGRhdGUgdGhlIGluZGV4IGF0IHRoaXMgcG9pbnQgYXMgd2VsbFxyXG4gICAgdmFyIG1zZWFyY2ggPSB0aGlzLm15U2VhcmNoO1xyXG4gICAgdGhpcy5teVNlYXJjaC5zZWFyY2goXHJcbiAgICAgIGBAbWlkOlske21pZH0gJHttaWR9XWAsXHJcbiAgICAgIHsgb2Zmc2V0OiAwLCBudW1iZXJPZlJlc3VsdHM6IDUwMDAgfSxcclxuICAgICAgKGVyciwgZGF0YSkgPT4ge1xyXG4gICAgICAgIHZhciBwYWNrYWdlcyA9IFtdO1xyXG4gICAgICAgIGNvbnNvbGUubG9nKGRhdGEpO1xyXG4gICAgICAgIGRhdGEucmVzdWx0cy5mb3JFYWNoKGVsZW1lbnQgPT4ge1xyXG4gICAgICAgICAgdmFyIG9sZERvY0lkID0gZWxlbWVudC5kb2NJZDtcclxuICAgICAgICAgIGVsZW1lbnQuZG9jSWQgPSBlbGVtZW50LmRvY0lkLnJlcGxhY2UoYCR7bWlkfS1gLCBcIlwiKTtcclxuICAgICAgICAgIHBhY2thZ2VzLnB1c2goZWxlbWVudC5kb2NJZCk7XHJcbiAgICAgICAgICAvLyBpIGNvdWxkIGRlbGV0ZSBoZXJlXHJcbiAgICAgICAgICAvLyBtc2VhcmNoLmRlbERvY3VtZW50KFBLR19JRFgsb2xkRG9jSWQpXHJcbiAgICAgICAgICAvL3VwZGF0ZSBhbGwgdGhlIHBhY2thZ2VzXHJcbiAgICAgICAgfSk7XHJcbiAgICAgICAgc2V0UGFja2FnZUluVHJhbnNpdChwYWNrYWdlcywgbXNlYXJjaCwgbWlkKS50aGVuKGZ1bmN0aW9uKFxyXG4gICAgICAgICAgdXBkYXRlZFBhY2thZ2VzXHJcbiAgICAgICAgKSB7XHJcbiAgICAgICAgICBjb25zb2xlLmxvZyhcInVwZGF0ZWQgcGFja2FnZXNcIik7XHJcbiAgICAgICAgICBjb25zb2xlLmxvZyh1cGRhdGVkUGFja2FnZXMpO1xyXG4gICAgICAgIH0pO1xyXG4gICAgICB9XHJcbiAgICApO1xyXG4gIH1cclxuICByZW1vdmVQYWNrYWdlKHRyYWNraW5nTm8sIG1pZCkge1xyXG4gICAgdmFyIG1zZWFyY2ggPSB0aGlzLm15U2VhcmNoO1xyXG4gICAgcmV0dXJuIG5ldyBQcm9taXNlKChyZXNvbHZlLCByZWplY3QpID0+IHtcclxuICAgICAgdmFyIG1hbmlmZXN0ID0gbWlkO1xyXG4gICAgICB2YXIgbWFuaWZlc3RLZXkgPSBcIm1hbmlmZXN0OlwiICsgbWFuaWZlc3QgKyBcIjoqXCI7XHJcblxyXG4gICAgICBscmVkaXMuZGVsKFwicGFja2FnZXM6XCIgKyB0cmFja2luZ05vKS50aGVuKGZ1bmN0aW9uKHJlc3VsdCkge1xyXG4gICAgICAgIGNvbnNvbGUubG9nKHJlc3VsdCk7XHJcbiAgICAgICAgbXNlYXJjaC5kZWxEb2N1bWVudChQS0dfSURYLCBgJHttaWR9LSR7dHJhY2tpbmdOb31gKTtcclxuICAgICAgICAvL3dlIG5lZWQgdG8gcmVtb3ZlIGZyb20gdGhlIGluZGV4IGFuZCBkZWMgdGhlIGNvdW50ZXJcclxuICAgICAgICBscmVkaXMuY2xpZW50LmRlY3IoXCJtY291bnRlcjpcIiArIG1pZCk7XHJcbiAgICAgICAgLy9yU2VydmljZXMucGFja2FnZVNlcnZpY2Uucm1QYWNrYWdlKG1pZCwgdHJhY2tpbmdObyk7XHJcbiAgICAgICAgbHJlZGlzLmdldEtleXMobWFuaWZlc3RLZXkpLnRoZW4oa1Jlc3VsdCA9PiB7XHJcbiAgICAgICAgICAvL3RoZSBsaXN0IG9mIGFsbCB0aGUgc2V0cyAuLi53ZSBuZWVkIHRvIHJlbW92ZSB0aGUga2V5IGZyb20gZWFjaCBvbmVcclxuICAgICAgICAgIHZhciBrZXlzQ291bnQgPSAwO1xyXG5cclxuICAgICAgICAgIGtSZXN1bHQuZm9yRWFjaChlbGVtZW50ID0+IHtcclxuICAgICAgICAgICAgY29uc29sZS5sb2coXHJcbiAgICAgICAgICAgICAgYHJlbW92aW5nICR7dHJhY2tpbmdOb30gcGFja2FnZSBtYW5pZmVzdCBzZXQgJHtlbGVtZW50fSBgXHJcbiAgICAgICAgICAgICk7XHJcbiAgICAgICAgICAgIGxyZWRpcy5zcmVtKGVsZW1lbnQsIHRyYWNraW5nTm8pLnRoZW4oZnVuY3Rpb24oclJlc3VsdCkge1xyXG4gICAgICAgICAgICAgIGNvbnNvbGUubG9nKHJSZXN1bHQpO1xyXG4gICAgICAgICAgICAgIGNvbnNvbGUubG9nKFwicmVtb3ZlZFwiKTtcclxuICAgICAgICAgICAgICBpZiAoa2V5c0NvdW50ID09IGtSZXN1bHQubGVuZ3RoIC0gMSkga2V5c0NvdW50Kys7XHJcbiAgICAgICAgICAgIH0pO1xyXG4gICAgICAgICAgfSk7XHJcbiAgICAgICAgICByZXNvbHZlKHtcclxuICAgICAgICAgICAgZGVsZXRlZDogdHJ1ZVxyXG4gICAgICAgICAgfSk7XHJcbiAgICAgICAgfSk7XHJcblxyXG4gICAgICAgIC8vd2UgYWxzbyBuZWVkIHRvIHJlbW92ZSBmcm9tIGFueSBzZXRzXHJcbiAgICAgIH0pO1xyXG4gICAgfSk7XHJcbiAgfVxyXG4gIHN0b3JlUGFja2FnZUZvclBpY2t1cCh0cmFja2luZ05vLGJpbil7XHJcbiAgICB2YXIgc2VhcmNoZXIgPSB0aGlzLm15U2VhcmNoO1xyXG4gICAgcmV0dXJuIG5ldyBQcm9taXNlKChyZXNvbHZlLHJlamVjdCk9PntcclxuICAgICAgIGxyZWRpcy5obXNldChQS0dfUFJFRklYK3RyYWNraW5nTm8se3N0YXR1czo0LGxvY2F0aW9uOmJpbn0pLnRoZW4oKHJlc3VsdCk9PntcclxuICAgICAgICAgbHJlZGlzLmdldFBhY2thZ2UodHJhY2tpbmdObykudGhlbigocGtnKT0+e1xyXG4gICAgICAgICAgYWRkUGFja2FnZVRvSW5kZXgodHJhY2tpbmdObyxzZWFyY2hlcikgOyBcclxuICAgICAgICAgIHJlc29sdmUocGtnKTsgICBcclxuICAgICAgICAgfSk7XHJcbiAgICAgICB9KSBcclxuICAgIH0pOyBcclxuICB9XHJcbiAgdXBkYXRlUGFja2FnZUluZGV4KHRyYWNraW5nKXtcclxuICAgICAgcmV0dXJuIG5ldyBQcm9taXNlKChyZXNvbHZlLHJlamVjdCk9PntcclxuICAgICAgICAgIHZhciBtc2VhcmNoID0gdGhpcy5teVNlYXJjaDsgXHJcbiAgICAgICAgICBhZGRQYWNrYWdlVG9JbmRleCh0cmFja2luZyxtc2VhcmNoKTsgXHJcbiAgICAgICAgIHJlc29sdmUoeyd1cGRhdGVkJzp0cnVlfSk7XHJcbiAgICAgIH0pXHJcbiAgfVxyXG4gIGdldEN1c3RvbWVyUGFja2FnZXMoc2t5Ym94KSB7fVxyXG4gIGdldE1hbmlmZXN0UGFja2FnZXNCeVN0YXR1cyhtaWQsc3RhdHVzKSB7XHJcbiAgICAgIHJldHVybiBuZXcgUHJvbWlzZSgocmVzb2x2ZSxyZWplY3QpPT57XHJcbiAgICAgICAgICBjb25zb2xlLmxvZyhgQG1pZDpbJHttaWR9ICR7bWlkfV0gQHN0YXR1cz1bJHtzdGF0dXN9ICR7c3RhdHVzfV1gKVxyXG4gICAgICAgIHRoaXMubXlTZWFyY2guc2VhcmNoKFxyXG4gICAgICAgICAgICBgQG1pZDpbJHttaWR9ICR7bWlkfV0gQHN0YXR1czpbJHtzdGF0dXN9ICR7c3RhdHVzfV1gLFxyXG4gICAgICAgICAgICB7IG9mZnNldDogMCwgbnVtYmVyT2ZSZXN1bHRzOiA1MDAwIH0sXHJcbiAgICAgICAgICAgIChlcnIsIGRhdGEpID0+IHtcclxuICAgICAgICAgICAgICB2YXIgcGFja2FnZXMgPSBbXTtcclxuICAgICAgICAgICAgICBjb25zb2xlLmxvZyhkYXRhKTtcclxuICAgICAgICAgICAgICBkYXRhLnJlc3VsdHMuZm9yRWFjaChlbGVtZW50ID0+IHtcclxuXHJcbiAgICAgICAgICAgICAgICBwYWNrYWdlcy5wdXNoKGVsZW1lbnQuZG9jKTtcclxuICAgICAgICAgICAgICAgIHJlc29sdmUocGFja2FnZXMpOyAgICAgICAgICAgICAgICAgXHJcbiAgICAgICAgICAgIH0pO1xyXG4gICAgICAgIH0pO1xyXG4gICAgICB9KTtcclxuICBcclxuICB9ICAgICBcclxufVxyXG4iXX0=
