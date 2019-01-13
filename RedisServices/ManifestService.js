'use strict';

Object.defineProperty(exports, "__esModule", {
    value: true
});

var _createClass = function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; }();

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

var redis = require('redis');
var lredis = require('../DataServices/redis-local');
var moment = require('moment');
var redisSearch = require('../redisearchclient');
var MID_COUNTER = "global:midCounter";
var MID_PREFIX = "tew:manifest:";
var MID_INDEX = "index:manifest";
var OPEN_MANIFEST = "manifest:open";
var CLOSED_MANIFEST = "manifest:closed";
var SHIPPED_MANIFEST = "manifest:shipped";
var VERIFIED_MANIFEST = "manifest:verified"; // manifest that have duties verified

var manifestTypes = {
    air: {
        id: 1,
        title: "Air Cargo",
        prefix: "M-"
    },
    ocean: {
        id: 2,
        title: "Ocean",
        prefix: "S-"
    },
    hazmat: {
        id: 3,
        title: "HAZMAT",
        prefix: "H-"
    }
};
var manifestStages = {
    open: {
        id: 1,
        title: 'Open'
    },
    closed: {
        id: 2,
        title: 'Closed'
    },
    shipped: {
        id: 3,
        title: 'Shipped'
    },
    verified: {
        id: 4,
        title: 'Verified'
    }

};

var ManifestService = exports.ManifestService = function () {
    function ManifestService() {
        _classCallCheck(this, ManifestService);

        this.redisClient = lredis.client;
        this.mtypes = manifestTypes;
        this.mstages = manifestStages;
        //check to ensure we have the manifest counter 
        this.checkSetup();
        this.setupIndex();
    }

    _createClass(ManifestService, [{
        key: 'setupIndex',
        value: function setupIndex() {
            this.mySearch = redisSearch(redis, 'index:manifest', {
                clientOptions: lredis.searchClientDetails
            });
        }
    }, {
        key: 'checkSetup',
        value: function checkSetup() {
            this.redisClient.exists(MID_COUNTER, function (err, res) {
                if (res == 0) {
                    //create the manifest 
                    lredis.set(MID_COUNTER, 100);
                }
            });
        }
    }, {
        key: 'getTypes',
        value: function getTypes() {
            return this.mytypes;
        }
    }, {
        key: 'getStages',
        value: function getStages() {
            return this.manifestStages;
        }
    }, {
        key: 'getOpenManifest',
        value: function getOpenManifest(typeId) {
            var _this = this;

            return new Promise(function (resolve, reject) {
                console.log('@stageId:[' + typeId + ' ' + typeId + '] @mtypeId:' + typeId);
                _this.mySearch.search('@stageId:[1 1] @mtypeId:' + typeId, {
                    offset: 0,
                    numberOfResults: 100,
                    sortBy: "mid",
                    dir: "DESC"
                }, function (r1, data) {
                    if (r1) {
                        console.log('we had an error');
                        console.log(r1);
                    }
                    console.log('no errors detected here ...');
                    //console.log(manifestList);
                    console.log(data);
                    resolve(data.totalResults);
                });
            });
        }
    }, {
        key: 'createNewManifest',
        value: function createNewManifest(type, user) {
            var _this2 = this;

            //we have some rules to follow here 
            //1. a new manifest cannot be created if the previous manifest is not closed 
            //check for open manifest first 
            return new Promise(function (resolve, reject) {
                _this2.getOpenManifest(type.id).then(function (openCount) {

                    console.log(type);
                    if (openCount > 0) {
                        //we can't add the manifest reject 
                        reject({
                            "message": "There is an open manifest Please close it before creating a new manifest."
                        });
                    } else {
                        _this2.redisClient.multi().incr(MID_COUNTER).exec(function (err, resp) {
                            console.log(resp);
                            var manifest = {
                                mid: resp[0],
                                title: type.prefix + resp[0],
                                dateCreated: moment().format("YYYY-MM-DD"),
                                mtypeId: type.id,
                                stageId: manifestStages.open.id,
                                stage: manifestStages.open.title,
                                createdBy: user
                            };
                            _this2.redisClient.multi().hmset(MID_PREFIX + manifest.mid, manifest).sadd(OPEN_MANIFEST, manifest.mid).exec(function (err, results) {
                                _this2.mySearch.add(manifest.mid, manifest);
                                //also add to the index here one time 
                                if (err) {
                                    reject(err);
                                } else {
                                    resolve(manifest);
                                }
                            });
                        });
                    }
                }).catch(function (err) {
                    console.log("err detected");
                    console.log(err);
                });
            });
        }
    }, {
        key: 'changeStage',
        value: function changeStage(mid, stages) {
            var _this3 = this;

            return new Promise(function (resolve, reject) {

                lredis.client.hmset(MID_PREFIX + mid, "stageId", stages, function (err, result) {
                    var stage = _this3.getStageById(stages);
                    console.log('looked up the stage ' + stage.title);
                    lredis.client.hmset(MID_PREFIX + mid, "stage", stage.title, function (err, result2) {});
                    lredis.hgetall(MID_PREFIX + mid).then(function (uManifest) {
                        _this3.mySearch.delDocument("index:manifest", mid, function (err, result1) {
                            console.log('changing document');
                            console.log(err);
                            console.log(result1);
                            _this3.mySearch.add(uManifest.mid, uManifest);
                            resolve(result);
                        });
                    });
                });
                //we also need to to update the document 

            });
        }
    }, {
        key: 'shipManifest',
        value: function shipManifest(mid, awb, user) {
            var _this4 = this;

            return new Promise(function (resolve, reject) {
                lredis.hmset(MID_PREFIX + mid, { awb: awb, shipDate: moment().format("YYYY-MM-DD"), shippedBy: user }).then(function (sresult) {
                    console.log(sresult);
                    _this4.changeStage(mid, 3).then(function (resu) {
                        resolve(sresult);
                    });
                });
            });
        }
    }, {
        key: 'listManifest',
        value: function listManifest(type, page, pageSize) {
            var _this5 = this;

            return new Promise(function (resolve, reject) {
                var offsetVal = (page - 1) * pageSize;
                console.log('offset ' + offsetVal);

                _this5.mySearch.search("@mtypeId:" + type, {
                    offset: offsetVal,
                    numberOfResults: pageSize,
                    sortBy: "mid",
                    dir: "DESC"
                }, function (r1, data) {
                    if (r1) console.log(r1);
                    var manifestList = [];
                    data.results.forEach(function (manifestResult) {
                        manifestList.push(manifestResult.doc);
                    });
                    //console.log(manifestList);
                    var pagedData = {
                        manifests: manifestList,
                        totalResults: data.totalResults,
                        page: page,
                        pageSize: pageSize,
                        TotalPages: data.totalResults / pageSize
                    };
                    resolve(pagedData);
                    console.log(manifestList);
                });
            });
        }
    }, {
        key: 'getManifest',
        value: function getManifest(mid) {
            return lredis.hgetall(MID_PREFIX + mid);
        }
    }, {
        key: 'deleteManifest',
        value: function deleteManifest(mid) {
            var _this6 = this;

            return new Promise(function (resolve, reject) {
                lredis.client.del(MID_PREFIX + mid, function (err, resp) {
                    console.log(resp);
                    _this6.mySearch.delDocument("index:manifest", mid, function (err, result) {
                        console.log("deleting mid");
                        console.log(err);
                        console.log(result);
                    });
                    lredis.srem(OPEN_MANIFEST, mid);
                    resolve({ deleted: true });
                });
            });
        }
    }, {
        key: 'getManifestProcessing',
        value: function getManifestProcessing() {
            var msearch = this.mySearch;
            return new Promise(function (resolve, reject) {
                var offsetVal = 0;
                var pageSize = 20;
                console.log('offset ' + offsetVal);
                var manifestList = [];
                msearch.search('@stageId:[3 4]', {
                    offset: offsetVal,
                    numberOfResults: pageSize,
                    sortBy: "mid",
                    dir: "DESC"
                }, function (r1, data) {
                    if (r1) console.log(r1);

                    data.results.forEach(function (manifestResult) {
                        manifestList.push(manifestResult.doc);
                    });
                    //console.log(manifestList);
                    var pagedData = {
                        manifests: manifestList,
                        totalResults: data.totalResults,
                        page: 1,
                        pageSize: pageSize,
                        TotalPages: data.totalResults / pageSize
                    };
                    resolve(pagedData);
                    console.log(manifestList);
                });
            });
        }
    }, {
        key: 'getTypebyId',
        value: function getTypebyId(id) {
            if (id == 1) {
                return manifestTypes.air;
            }
            if (id == 2) {
                return manifestTypes.ocean;
            }
            if (id == 3) {
                return manifestTypes.hazmat;
            }
            return manifestTypes.air;
        }
    }, {
        key: 'getStageById',
        value: function getStageById(id) {
            if (id == 1) {
                return manifestStages.open;
            }
            if (id == 2) {
                return manifestStages.closed;
            }
            if (id == 3) {
                return manifestStages.shipped;
            }
            if (id == 4) {
                return manifestStages.verified;
            }
            return manifestStages.open;
        }
    }]);

    return ManifestService;
}();
//# sourceMappingURL=data:application/json;charset=utf8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIlJlZGlzU2VydmljZXMvTWFuaWZlc3RTZXJ2aWNlLmVzNiJdLCJuYW1lcyI6WyJyZWRpcyIsInJlcXVpcmUiLCJscmVkaXMiLCJtb21lbnQiLCJyZWRpc1NlYXJjaCIsIk1JRF9DT1VOVEVSIiwiTUlEX1BSRUZJWCIsIk1JRF9JTkRFWCIsIk9QRU5fTUFOSUZFU1QiLCJDTE9TRURfTUFOSUZFU1QiLCJTSElQUEVEX01BTklGRVNUIiwiVkVSSUZJRURfTUFOSUZFU1QiLCJtYW5pZmVzdFR5cGVzIiwiYWlyIiwiaWQiLCJ0aXRsZSIsInByZWZpeCIsIm9jZWFuIiwiaGF6bWF0IiwibWFuaWZlc3RTdGFnZXMiLCJvcGVuIiwiY2xvc2VkIiwic2hpcHBlZCIsInZlcmlmaWVkIiwiTWFuaWZlc3RTZXJ2aWNlIiwicmVkaXNDbGllbnQiLCJjbGllbnQiLCJtdHlwZXMiLCJtc3RhZ2VzIiwiY2hlY2tTZXR1cCIsInNldHVwSW5kZXgiLCJteVNlYXJjaCIsImNsaWVudE9wdGlvbnMiLCJzZWFyY2hDbGllbnREZXRhaWxzIiwiZXhpc3RzIiwiZXJyIiwicmVzIiwic2V0IiwibXl0eXBlcyIsInR5cGVJZCIsIlByb21pc2UiLCJyZXNvbHZlIiwicmVqZWN0IiwiY29uc29sZSIsImxvZyIsInNlYXJjaCIsIm9mZnNldCIsIm51bWJlck9mUmVzdWx0cyIsInNvcnRCeSIsImRpciIsInIxIiwiZGF0YSIsInRvdGFsUmVzdWx0cyIsInR5cGUiLCJ1c2VyIiwiZ2V0T3Blbk1hbmlmZXN0IiwidGhlbiIsIm9wZW5Db3VudCIsIm11bHRpIiwiaW5jciIsImV4ZWMiLCJyZXNwIiwibWFuaWZlc3QiLCJtaWQiLCJkYXRlQ3JlYXRlZCIsImZvcm1hdCIsIm10eXBlSWQiLCJzdGFnZUlkIiwic3RhZ2UiLCJjcmVhdGVkQnkiLCJobXNldCIsInNhZGQiLCJyZXN1bHRzIiwiYWRkIiwiY2F0Y2giLCJzdGFnZXMiLCJyZXN1bHQiLCJnZXRTdGFnZUJ5SWQiLCJyZXN1bHQyIiwiaGdldGFsbCIsInVNYW5pZmVzdCIsImRlbERvY3VtZW50IiwicmVzdWx0MSIsImF3YiIsInNoaXBEYXRlIiwic2hpcHBlZEJ5Iiwic3Jlc3VsdCIsImNoYW5nZVN0YWdlIiwicmVzdSIsInBhZ2UiLCJwYWdlU2l6ZSIsIm9mZnNldFZhbCIsIm1hbmlmZXN0TGlzdCIsImZvckVhY2giLCJwdXNoIiwibWFuaWZlc3RSZXN1bHQiLCJkb2MiLCJwYWdlZERhdGEiLCJtYW5pZmVzdHMiLCJUb3RhbFBhZ2VzIiwiZGVsIiwic3JlbSIsImRlbGV0ZWQiLCJtc2VhcmNoIl0sIm1hcHBpbmdzIjoiOzs7Ozs7Ozs7O0FBQUEsSUFBSUEsUUFBUUMsUUFBUSxPQUFSLENBQVo7QUFDQSxJQUFJQyxTQUFTRCxRQUFRLDZCQUFSLENBQWI7QUFDQSxJQUFJRSxTQUFTRixRQUFRLFFBQVIsQ0FBYjtBQUNBLElBQUlHLGNBQWNILFFBQVEscUJBQVIsQ0FBbEI7QUFDQSxJQUFNSSxjQUFjLG1CQUFwQjtBQUNBLElBQU1DLGFBQWEsZUFBbkI7QUFDQSxJQUFNQyxZQUFZLGdCQUFsQjtBQUNBLElBQU1DLGdCQUFnQixlQUF0QjtBQUNBLElBQU1DLGtCQUFrQixpQkFBeEI7QUFDQSxJQUFNQyxtQkFBbUIsa0JBQXpCO0FBQ0EsSUFBTUMsb0JBQW9CLG1CQUExQixDLENBQStDOztBQUUvQyxJQUFJQyxnQkFBZ0I7QUFDaEJDLFNBQUs7QUFDREMsWUFBSSxDQURIO0FBRURDLGVBQU8sV0FGTjtBQUdEQyxnQkFBUTtBQUhQLEtBRFc7QUFNaEJDLFdBQU87QUFDSEgsWUFBSSxDQUREO0FBRUhDLGVBQU8sT0FGSjtBQUdIQyxnQkFBUTtBQUhMLEtBTlM7QUFXaEJFLFlBQVE7QUFDSkosWUFBSSxDQURBO0FBRUpDLGVBQU8sUUFGSDtBQUdKQyxnQkFBUTtBQUhKO0FBWFEsQ0FBcEI7QUFpQkEsSUFBSUcsaUJBQWlCO0FBQ2pCQyxVQUFNO0FBQ0ZOLFlBQUksQ0FERjtBQUVGQyxlQUFPO0FBRkwsS0FEVztBQUtqQk0sWUFBUTtBQUNKUCxZQUFJLENB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QWFFLElBQWIsQ0FBa0JDLGVBQWVDLEdBQWpDO0FBRUYscUJBSEQ7QUFJQTtBQUNBLHdCQUFJQyxZQUFZO0FBQ2JDLG1DQUFVTixZQURHO0FBRWJ4QyxzQ0FBZUQsS0FBS0MsWUFGUDtBQUdicUMsOEJBQU8sQ0FITTtBQUliQyxrQ0FBVUEsUUFKRztBQUtiUyxvQ0FBY2hELEtBQUtDLFlBQUwsR0FBa0JzQztBQUxuQixxQkFBaEI7QUFPRGpELDRCQUFRd0QsU0FBUjtBQUNBdEQsNEJBQVFDLEdBQVIsQ0FBWWdELFlBQVo7QUFFSCxpQkF4QkQ7QUF5QkgsYUE5Qk0sQ0FBUDtBQStCSDs7O29DQUVZOUUsRSxFQUFHO0FBQ1osZ0JBQUlBLE1BQU0sQ0FBVixFQUFZO0FBQ1IsdUJBQU9GLGNBQWNDLEdBQXJCO0FBQ0g7QUFDRCxnQkFBSUMsTUFBTSxDQUFWLEVBQVk7QUFDUix1QkFBT0YsY0FBY0ssS0FBckI7QUFDSDtBQUNELGdCQUFJSCxNQUFNLENBQVYsRUFBWTtBQUNSLHVCQUFPRixjQUFjTSxNQUFyQjtBQUNIO0FBQ0QsbUJBQU9OLGNBQWNDLEdBQXJCO0FBQ0g7OztxQ0FDWUMsRSxFQUFHO0FBQ1osZ0JBQUlBLE1BQU0sQ0FBVixFQUFZO0FBQ1IsdUJBQU9LLGVBQWVDLElBQXRCO0FBQ0g7QUFDRCxnQkFBSU4sTUFBTSxDQUFWLEVBQVk7QUFDUix1QkFBT0ssZUFBZUUsTUFBdEI7QUFDSDtBQUNELGdCQUFJUCxNQUFNLENBQVYsRUFBWTtBQUNSLHVCQUFPSyxlQUFlRyxPQUF0QjtBQUNIO0FBQ0QsZ0JBQUlSLE1BQU0sQ0FBVixFQUFZO0FBQ1IsdUJBQU9LLGVBQWVJLFFBQXRCO0FBQ0g7QUFDRCxtQkFBT0osZUFBZUMsSUFBdEI7QUFDSCIsImZpbGUiOiJSZWRpc1NlcnZpY2VzL01hbmlmZXN0U2VydmljZS5qcyIsInNvdXJjZXNDb250ZW50IjpbInZhciByZWRpcyA9IHJlcXVpcmUoJ3JlZGlzJyk7XHJcbnZhciBscmVkaXMgPSByZXF1aXJlKCcuLi9EYXRhU2VydmljZXMvcmVkaXMtbG9jYWwnKTtcclxudmFyIG1vbWVudCA9IHJlcXVpcmUoJ21vbWVudCcpO1xyXG52YXIgcmVkaXNTZWFyY2ggPSByZXF1aXJlKCcuLi9yZWRpc2VhcmNoY2xpZW50Jyk7XHJcbmNvbnN0IE1JRF9DT1VOVEVSID0gXCJnbG9iYWw6bWlkQ291bnRlclwiO1xyXG5jb25zdCBNSURfUFJFRklYID0gXCJ0ZXc6bWFuaWZlc3Q6XCI7XHJcbmNvbnN0IE1JRF9JTkRFWCA9IFwiaW5kZXg6bWFuaWZlc3RcIjtcclxuY29uc3QgT1BFTl9NQU5JRkVTVCA9IFwibWFuaWZlc3Q6b3BlblwiO1xyXG5jb25zdCBDTE9TRURfTUFOSUZFU1QgPSBcIm1hbmlmZXN0OmNsb3NlZFwiXHJcbmNvbnN0IFNISVBQRURfTUFOSUZFU1QgPSBcIm1hbmlmZXN0OnNoaXBwZWRcIlxyXG5jb25zdCBWRVJJRklFRF9NQU5JRkVTVCA9IFwibWFuaWZlc3Q6dmVyaWZpZWRcIjsgLy8gbWFuaWZlc3QgdGhhdCBoYXZlIGR1dGllcyB2ZXJpZmllZFxyXG5cclxudmFyIG1hbmlmZXN0VHlwZXMgPSB7XHJcbiAgICBhaXI6IHtcclxuICAgICAgICBpZDogMSxcclxuICAgICAgICB0aXRsZTogXCJBaXIgQ2FyZ29cIixcclxuICAgICAgICBwcmVmaXg6IFwiTS1cIlxyXG4gICAgfSxcclxuICAgIG9jZWFuOiB7XHJcbiAgICAgICAgaWQ6IDIsXHJcbiAgICAgICAgdGl0bGU6IFwiT2NlYW5cIixcclxuICAgICAgICBwcmVmaXg6IFwiUy1cIlxyXG4gICAgfSxcclxuICAgIGhhem1hdDoge1xyXG4gICAgICAgIGlkOiAzLFxyXG4gICAgICAgIHRpdGxlOiBcIkhBWk1BVFwiLFxyXG4gICAgICAgIHByZWZpeDogXCJILVwiXHJcbiAgICB9XHJcbn1cclxudmFyIG1hbmlmZXN0U3RhZ2VzID0ge1xyXG4gICAgb3Blbjoge1xyXG4gICAgICAgIGlkOiAxLFxyXG4gICAgICAgIHRpdGxlOiAnT3BlbidcclxuICAgIH0sXHJcbiAgICBjbG9zZWQ6IHtcclxuICAgICAgICBpZDogMixcclxuICAgICAgICB0aXRsZTogJ0Nsb3NlZCdcclxuICAgIH0sXHJcbiAgICBzaGlwcGVkOiB7XHJcbiAgICAgICAgaWQ6IDMsXHJcbiAgICAgICAgdGl0bGU6ICdTaGlwcGVkJ1xyXG4gICAgfSxcclxuICAgIHZlcmlmaWVkOiB7XHJcbiAgICAgICAgaWQ6IDQsXHJcbiAgICAgICAgdGl0bGU6ICdWZXJpZmllZCdcclxuICAgIH1cclxuXHJcbn1cclxuXHJcbmV4cG9ydCBjbGFzcyBNYW5pZmVzdFNlcnZpY2Uge1xyXG5cclxuICAgIGNvbnN0cnVjdG9yKCkgeyAgICAgICAgXHJcbiAgICAgICAgdGhpcy5yZWRpc0NsaWVudCA9IGxyZWRpcy5jbGllbnQ7XHJcbiAgICAgICAgdGhpcy5tdHlwZXMgPSBtYW5pZmVzdFR5cGVzO1xyXG4gICAgICAgIHRoaXMubXN0YWdlcyA9IG1hbmlmZXN0U3RhZ2VzO1xyXG4gICAgICAgIC8vY2hlY2sgdG8gZW5zdXJlIHdlIGhhdmUgdGhlIG1hbmlmZXN0IGNvdW50ZXIgXHJcbiAgICAgICAgdGhpcy5jaGVja1NldHVwKCk7IFxyXG4gICAgICAgIHRoaXMuc2V0dXBJbmRleCgpXHJcbiAgICB9XHJcbiAgICBzZXR1cEluZGV4KCl7XHJcbiAgICAgICAgdGhpcy5teVNlYXJjaCA9IHJlZGlzU2VhcmNoKHJlZGlzLCAnaW5kZXg6bWFuaWZlc3QnLCB7XHJcbiAgICAgICAgICAgIGNsaWVudE9wdGlvbnM6bHJlZGlzLnNlYXJjaENsaWVudERldGFpbHNcclxuICAgICAgICB9KTtcclxuICAgIH1cclxuICAgIGNoZWNrU2V0dXAoKXtcclxuICAgICAgICB0aGlzLnJlZGlzQ2xpZW50LmV4aXN0cyhNSURfQ09VTlRFUiwgKGVyciwgcmVzKSA9PiB7XHJcbiAgICAgICAgICAgIGlmIChyZXMgPT0gMCkge1xyXG4gICAgICAgICAgICAgICAgLy9jcmVhdGUgdGhlIG1hbmlmZXN0IFxyXG4gICAgICAgICAgICAgICAgbHJlZGlzLnNldChNSURfQ09VTlRFUiwgMTAwKTtcclxuICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICBcclxuICAgICAgICB9KTtcclxuICAgIH1cclxuXHJcbiAgICBnZXRUeXBlcygpIHtcclxuICAgICAgICByZXR1cm4gdGhpcy5teXR5cGVzXHJcbiAgICB9XHJcbiAgICBnZXRTdGFnZXMoKSB7XHJcbiAgICAgICAgcmV0dXJuIHRoaXMubWFuaWZlc3RTdGFnZXM7XHJcbiAgICB9XHJcblxyXG4gICAgZ2V0T3Blbk1hbmlmZXN0KHR5cGVJZCl7XHJcbiAgICAgICAgXHJcbiAgICAgICAgcmV0dXJuIG5ldyBQcm9taXNlKChyZXNvbHZlLHJlamVjdCk9PntcclxuICAgICAgICAgICBjb25zb2xlLmxvZyggYEBzdGFnZUlkOlske3R5cGVJZH0gJHt0eXBlSWR9XSBAbXR5cGVJZDoke3R5cGVJZH1gKTtcclxuICAgICAgICAgICAgdGhpcy5teVNlYXJjaC5zZWFyY2goYEBzdGFnZUlkOlsxIDFdIEBtdHlwZUlkOiR7dHlwZUlkfWAsIHtcclxuICAgICAgICAgICAgICAgIG9mZnNldDowLFxyXG4gICAgICAgICAgICAgICAgbnVtYmVyT2ZSZXN1bHRzOiAxMDAsXHJcbiAgICAgICAgICAgICAgICBzb3J0Qnk6IFwibWlkXCIsXHJcbiAgICAgICAgICAgICAgICBkaXI6IFwiREVTQ1wiXHJcbiAgICAgICAgICAgIH0sIChyMSwgZGF0YSkgPT4ge1xyXG4gICAgICAgICAgICAgICAgaWYgKHIxKVxyXG4gICAgICAgICAgICAgICAgIHtcclxuICAgICAgICAgICAgICAgICAgICAgY29uc29sZS5sb2coJ3dlIGhhZCBhbiBlcnJvcicpXHJcbiAgICAgICAgICAgICAgICAgICAgY29uc29sZS5sb2cocjEpO1xyXG4gICAgICAgICAgICAgICAgICAgIFxyXG4gICAgICAgICAgICAgICAgIH0gICBcclxuICAgICAgICAgICAgICAgICBjb25zb2xlLmxvZygnbm8gZXJyb3JzIGRldGVjdGVkIGhlcmUgLi4uJylcclxuICAgICAgICAgICAgICAgICAvL2NvbnNvbGUubG9nKG1hbmlmZXN0TGlzdCk7XHJcbiAgICAgICAgICAgICAgICAgY29uc29sZS5sb2coZGF0YSk7XHJcbiAgICAgICAgICAgICAgICByZXNvbHZlKGRhdGEudG90YWxSZXN1bHRzKTtcclxuICAgICAgICAgICAgfSk7XHJcbiAgICAgICAgICAgIFxyXG4gICAgICAgIH0pO1xyXG4gICAgICAgIFxyXG4gICAgfVxyXG4gICAgY3JlYXRlTmV3TWFuaWZlc3QodHlwZSwgdXNlcikge1xyXG4gICAgICAgIC8vd2UgaGF2ZSBzb21lIHJ1bGVzIHRvIGZvbGxvdyBoZXJlIFxyXG4gICAgICAgIC8vMS4gYSBuZXcgbWFuaWZlc3QgY2Fubm90IGJlIGNyZWF0ZWQgaWYgdGhlIHByZXZpb3VzIG1hbmlmZXN0IGlzIG5vdCBjbG9zZWQgXHJcbiAgICAgICAgLy9jaGVjayBmb3Igb3BlbiBtYW5pZmVzdCBmaXJzdCBcclxuICAgICAgICByZXR1cm4gbmV3IFByb21pc2UoKHJlc29sdmUsIHJlamVjdCkgPT4ge1xyXG4gICAgICAgICAgICB0aGlzLmdldE9wZW5NYW5pZmVzdCh0eXBlLmlkKS50aGVuKChvcGVuQ291bnQpID0+IHtcclxuICAgICAgICAgICAgICBcclxuICAgICAgICAgICAgICAgIGNvbnNvbGUubG9nKHR5cGUpOyBcclxuICAgICAgICAgICAgICAgIGlmIChvcGVuQ291bnQ+MCkge1xyXG4gICAgICAgICAgICAgICAgICAgIC8vd2UgY2FuJ3QgYWRkIHRoZSBtYW5pZmVzdCByZWplY3QgXHJcbiAgICAgICAgICAgICAgICAgICAgcmVqZWN0KHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgXCJtZXNzYWdlXCI6IFwiVGhlcmUgaXMgYW4gb3BlbiBtYW5pZmVzdCBQbGVhc2UgY2xvc2UgaXQgYmVmb3JlIGNyZWF0aW5nIGEgbmV3IG1hbmlmZXN0LlwiXHJcbiAgICAgICAgICAgICAgICAgICAgfSk7XHJcblxyXG4gICAgICAgICAgICAgICAgfSBlbHNlIHtcclxuICAgICAgICAgICAgICAgICAgICB0aGlzLnJlZGlzQ2xpZW50Lm11bHRpKClcclxuICAgICAgICAgICAgICAgICAgICAgICAgLmluY3IoTUlEX0NPVU5URVIpXHJcbiAgICAgICAgICAgICAgICAgICAgICAgIC5leGVjKChlcnIsIHJlc3ApID0+IHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGNvbnNvbGUubG9nKHJlc3ApO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgdmFyIG1hbmlmZXN0ID0ge1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIG1pZDogcmVzcFswXSxcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB0aXRsZTogdHlwZS5wcmVmaXgrcmVzcFswXSxcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBkYXRlQ3JlYXRlZDogbW9tZW50KCkuZm9ybWF0KFwiWVlZWS1NTS1ERFwiKSxcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBtdHlwZUlkOiB0eXBlLmlkLFxyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHN0YWdlSWQ6IG1hbmlmZXN0U3RhZ2VzLm9wZW4uaWQsXHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgc3RhZ2U6IG1hbmlmZXN0U3RhZ2VzLm9wZW4udGl0bGUsXHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgY3JlYXRlZEJ5OiB1c2VyXHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICB9O1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgdGhpcy5yZWRpc0NsaWVudC5tdWx0aSgpXHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgLmhtc2V0KE1JRF9QUkVGSVggKyBtYW5pZmVzdC5taWQsIG1hbmlmZXN0KVxyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIC5zYWRkKE9QRU5fTUFOSUZFU1QsIG1hbmlmZXN0Lm1pZClcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAuZXhlYygoZXJyLCByZXN1bHRzKSA9PiB7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHRoaXMubXlTZWFyY2guYWRkKG1hbmlmZXN0Lm1pZCxtYW5pZmVzdCk7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIC8vYWxzbyBhZGQgdG8gdGhlIGluZGV4IGhlcmUgb25lIHRpbWUgXHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGlmIChlcnIpIHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHJlamVjdChlcnIpO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB9IGVsc2Uge1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgcmVzb2x2ZShtYW5pZmVzdClcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIH0pO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICB9KTtcclxuICAgICAgICAgICAgICAgIH1cclxuXHJcbiAgICAgICAgICAgIH0pLmNhdGNoKChlcnIpPT57XHJcbiAgICAgICAgICAgICAgICBjb25zb2xlLmxvZyhcImVyciBkZXRlY3RlZFwiKTsgXHJcbiAgICAgICAgICAgICAgICBjb25zb2xlLmxvZyhlcnIpO1xyXG4gICAgICAgICAgICB9KTtcclxuXHJcbiAgICAgICAgfSk7XHJcblxyXG4gICAgfVxyXG4gICAgY2hhbmdlU3RhZ2UobWlkLCBzdGFnZXMpIHtcclxuICAgICAgICByZXR1cm4gbmV3IFByb21pc2UoKHJlc29sdmUsIHJlamVjdCkgPT4ge1xyXG4gICAgICAgICAgICBcclxuICAgICAgICAgICAgbHJlZGlzLmNsaWVudC5obXNldChNSURfUFJFRklYK21pZCxcInN0YWdlSWRcIixzdGFnZXMsKGVycixyZXN1bHQpPT57XHJcbiAgICAgICAgICAgICAgICB2YXIgc3RhZ2UgPSB0aGlzLmdldFN0YWdlQnlJZChzdGFnZXMpOyBcclxuICAgICAgICAgICAgICAgIGNvbnNvbGUubG9nKCdsb29rZWQgdXAgdGhlIHN0YWdlICcrc3RhZ2UudGl0bGUpO1xyXG4gICAgICAgICAgICAgICAgbHJlZGlzLmNsaWVudC5obXNldChNSURfUFJFRklYK21pZCxcInN0YWdlXCIsc3RhZ2UudGl0bGUsKGVycixyZXN1bHQyKT0+e30pOyBcclxuICAgICAgICAgICAgICAgIGxyZWRpcy5oZ2V0YWxsKE1JRF9QUkVGSVgrbWlkKS50aGVuKCh1TWFuaWZlc3QpPT57XHJcbiAgICAgICAgICAgICAgICAgICAgdGhpcy5teVNlYXJjaC5kZWxEb2N1bWVudChcImluZGV4Om1hbmlmZXN0XCIsbWlkLChlcnIscmVzdWx0MSk9PntcclxuICAgICAgICAgICAgICAgICAgICAgICAgY29uc29sZS5sb2coJ2NoYW5naW5nIGRvY3VtZW50Jyk7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIGNvbnNvbGUubG9nKGVycik7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIGNvbnNvbGUubG9nKHJlc3VsdDEpIFxyXG4gICAgICAgICAgICAgICAgICAgICAgICB0aGlzLm15U2VhcmNoLmFkZCh1TWFuaWZlc3QubWlkLHVNYW5pZmVzdCk7IFxyXG4gICAgICAgICAgICAgICAgICAgICAgICByZXNvbHZlKHJlc3VsdCk7IFxyXG4gICAgICAgICAgICAgICAgICAgIH0pOyBcclxuICAgICAgICAgICAgICAgICAgIFxyXG4gICAgICAgICAgICAgICAgfSk7XHJcbiAgICAgICAgICAgICAgIFxyXG4gICAgICAgICAgICB9KTtcclxuICAgICAgICAgICAgLy93ZSBhbHNvIG5lZWQgdG8gdG8gdXBkYXRlIHRoZSBkb2N1bWVudCBcclxuXHJcbiAgICAgICAgICAgIFxyXG4gICAgICAgIH0pXHJcbiAgICB9XHJcbiAgICBzaGlwTWFuaWZlc3QobWlkLGF3Yix1c2VyKXtcclxuICAgICAgICByZXR1cm4gbmV3IFByb21pc2UoKHJlc29sdmUscmVqZWN0KT0+e1xyXG4gICAgICAgICAgICBscmVkaXMuaG1zZXQoTUlEX1BSRUZJWCttaWQsIHthd2I6YXdiLHNoaXBEYXRlOm1vbWVudCgpLmZvcm1hdChcIllZWVktTU0tRERcIiksc2hpcHBlZEJ5OnVzZXJ9KS50aGVuKChzcmVzdWx0KT0+e1xyXG4gICAgICAgICAgICAgICAgY29uc29sZS5sb2coc3Jlc3VsdCk7XHJcbiAgICAgICAgICAgICAgICB0aGlzLmNoYW5nZVN0YWdlKG1pZCwzKS50aGVuKChyZXN1KT0+e1xyXG4gICAgICAgICAgICAgICAgICAgIHJlc29sdmUoc3Jlc3VsdCk7XHJcbiAgICAgICAgICAgICAgICB9KTtcclxuICAgICAgICAgICAgICAgIFxyXG4gICAgICAgICAgICB9KVxyXG4gICAgICAgIH0pXHJcbiAgICB9XHJcbiAgICBsaXN0TWFuaWZlc3QodHlwZSxwYWdlLHBhZ2VTaXplKXtcclxuICAgICAgICByZXR1cm4gbmV3IFByb21pc2UoKHJlc29sdmUscmVqZWN0KT0+e1xyXG4gICAgICAgICAgICB2YXIgb2Zmc2V0VmFsID0gKHBhZ2UgLSAxKSAqIHBhZ2VTaXplO1xyXG4gICAgICAgICAgICBjb25zb2xlLmxvZygnb2Zmc2V0ICcrb2Zmc2V0VmFsKTtcclxuICAgICAgICAgICAgXHJcbiAgICAgICAgICAgIHRoaXMubXlTZWFyY2guc2VhcmNoKFwiQG10eXBlSWQ6XCIrdHlwZSwge1xyXG4gICAgICAgICAgICAgICAgb2Zmc2V0Om9mZnNldFZhbCxcclxuICAgICAgICAgICAgICAgIG51bWJlck9mUmVzdWx0czogcGFnZVNpemUsXHJcbiAgICAgICAgICAgICAgICBzb3J0Qnk6IFwibWlkXCIsXHJcbiAgICAgICAgICAgICAgICBkaXI6IFwiREVTQ1wiXHJcbiAgICAgICAgICAgIH0sIChyMSwgZGF0YSkgPT4ge1xyXG4gICAgICAgICAgICAgICAgaWYgKHIxKVxyXG4gICAgICAgICAgICAgICAgICAgIGNvbnNvbGUubG9nKHIxKTtcclxuICAgICAgICAgICAgICAgICB2YXIgbWFuaWZlc3RMaXN0ID0gW107IFxyXG4gICAgICAgICAgICAgICAgIGRhdGEucmVzdWx0cy5mb3JFYWNoKG1hbmlmZXN0UmVzdWx0ID0+IHtcclxuICAgICAgICAgICAgICAgICAgICBtYW5pZmVzdExpc3QucHVzaChtYW5pZmVzdFJlc3VsdC5kb2MpOyAgICBcclxuICAgICAgICAgICAgICAgICAgICBcclxuICAgICAgICAgICAgICAgICB9KTtcclxuICAgICAgICAgICAgICAgICAvL2NvbnNvbGUubG9nKG1hbmlmZXN0TGlzdCk7XHJcbiAgICAgICAgICAgICAgICAgdmFyIHBhZ2VkRGF0YSA9IHtcclxuICAgICAgICAgICAgICAgICAgICBtYW5pZmVzdHM6bWFuaWZlc3RMaXN0LFxyXG4gICAgICAgICAgICAgICAgICAgIHRvdGFsUmVzdWx0cyA6IGRhdGEudG90YWxSZXN1bHRzLFxyXG4gICAgICAgICAgICAgICAgICAgIHBhZ2UgOiBwYWdlLFxyXG4gICAgICAgICAgICAgICAgICAgIHBhZ2VTaXplOiBwYWdlU2l6ZSwgXHJcbiAgICAgICAgICAgICAgICAgICAgVG90YWxQYWdlcyA6IChkYXRhLnRvdGFsUmVzdWx0cy9wYWdlU2l6ZSlcclxuICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgICAgIHJlc29sdmUocGFnZWREYXRhKTtcclxuICAgICAgICAgICAgICAgIGNvbnNvbGUubG9nKG1hbmlmZXN0TGlzdCk7XHJcbiAgICAgICAgICAgICAgICBcclxuICAgICAgICAgICAgfSk7XHJcbiAgICAgICAgfSk7XHJcbiAgICB9XHJcbiAgICBnZXRNYW5pZmVzdChtaWQpIHtcclxuICAgICAgICByZXR1cm4gbHJlZGlzLmhnZXRhbGwoTUlEX1BSRUZJWCttaWQpXHJcbiAgICB9XHJcbiAgICBkZWxldGVNYW5pZmVzdChtaWQpe1xyXG4gICAgICAgcmV0dXJuIG5ldyBQcm9taXNlKChyZXNvbHZlLHJlamVjdCk9PntcclxuICAgICAgICBscmVkaXMuY2xpZW50LmRlbChNSURfUFJFRklYK21pZCwoZXJyLHJlc3ApPT57XHJcbiAgICAgICAgICAgIGNvbnNvbGUubG9nKHJlc3ApOyBcclxuICAgICAgICAgICAgdGhpcy5teVNlYXJjaC5kZWxEb2N1bWVudChcImluZGV4Om1hbmlmZXN0XCIsbWlkLChlcnIscmVzdWx0KT0+e1xyXG4gICAgICAgICAgICAgICAgY29uc29sZS5sb2coXCJkZWxldGluZyBtaWRcIik7IFxyXG4gICAgICAgICAgICAgICAgY29uc29sZS5sb2coZXJyKTsgXHJcbiAgICAgICAgICAgICAgICBjb25zb2xlLmxvZyhyZXN1bHQpO1xyXG4gICAgICAgICAgICB9KTsgXHJcbiAgICAgICAgICAgIGxyZWRpcy5zcmVtKE9QRU5fTUFOSUZFU1QsbWlkKTtcclxuICAgICAgICAgICAgcmVzb2x2ZSh7ZGVsZXRlZDp0cnVlfSkgICAgXHJcbiAgICAgICAgfSlcclxuXHJcbiAgICAgICB9KTsgXHJcbiAgICAgICAgXHJcbiAgICAgICAgXHJcbiAgICB9XHJcbiAgICBnZXRNYW5pZmVzdFByb2Nlc3NpbmcoKXtcclxuICAgICAgICB2YXIgbXNlYXJjaCA9IHRoaXMubXlTZWFyY2g7IFxyXG4gICAgICAgIHJldHVybiBuZXcgUHJvbWlzZSgocmVzb2x2ZSxyZWplY3QpPT57XHJcbiAgICAgICAgICAgIHZhciBvZmZzZXRWYWwgPTA7XHJcbiAgICAgICAgICAgIHZhciBwYWdlU2l6ZSA9IDIwOyBcclxuICAgICAgICAgICAgY29uc29sZS5sb2coJ29mZnNldCAnK29mZnNldFZhbCk7XHJcbiAgICAgICAgICAgIHZhciBtYW5pZmVzdExpc3QgPSBbXTsgXHJcbiAgICAgICAgICAgIG1zZWFyY2guc2VhcmNoKGBAc3RhZ2VJZDpbMyA0XWAsIHtcclxuICAgICAgICAgICAgICAgIG9mZnNldDpvZmZzZXRWYWwsXHJcbiAgICAgICAgICAgICAgICBudW1iZXJPZlJlc3VsdHM6IHBhZ2VTaXplLFxyXG4gICAgICAgICAgICAgICAgc29ydEJ5OiBcIm1pZFwiLFxyXG4gICAgICAgICAgICAgICAgZGlyOiBcIkRFU0NcIlxyXG4gICAgICAgICAgICB9LCAocjEsIGRhdGEpID0+IHtcclxuICAgICAgICAgICAgICAgIGlmIChyMSlcclxuICAgICAgICAgICAgICAgICAgICBjb25zb2xlLmxvZyhyMSk7XHJcbiAgICAgICAgICAgICAgICAgXHJcbiAgICAgICAgICAgICAgICAgZGF0YS5yZXN1bHRzLmZvckVhY2gobWFuaWZlc3RSZXN1bHQgPT4ge1xyXG4gICAgICAgICAgICAgICAgICAgIG1hbmlmZXN0TGlzdC5wdXNoKG1hbmlmZXN0UmVzdWx0LmRvYyk7ICAgIFxyXG4gICAgICAgICAgICAgICAgICAgIFxyXG4gICAgICAgICAgICAgICAgIH0pO1xyXG4gICAgICAgICAgICAgICAgIC8vY29uc29sZS5sb2cobWFuaWZlc3RMaXN0KTtcclxuICAgICAgICAgICAgICAgICB2YXIgcGFnZWREYXRhID0ge1xyXG4gICAgICAgICAgICAgICAgICAgIG1hbmlmZXN0czptYW5pZmVzdExpc3QsXHJcbiAgICAgICAgICAgICAgICAgICAgdG90YWxSZXN1bHRzIDogZGF0YS50b3RhbFJlc3VsdHMsXHJcbiAgICAgICAgICAgICAgICAgICAgcGFnZSA6IDEsXHJcbiAgICAgICAgICAgICAgICAgICAgcGFnZVNpemU6IHBhZ2VTaXplLCBcclxuICAgICAgICAgICAgICAgICAgICBUb3RhbFBhZ2VzIDogKGRhdGEudG90YWxSZXN1bHRzL3BhZ2VTaXplKVxyXG4gICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICAgICAgcmVzb2x2ZShwYWdlZERhdGEpO1xyXG4gICAgICAgICAgICAgICAgY29uc29sZS5sb2cobWFuaWZlc3RMaXN0KTtcclxuICAgICAgICAgICAgICAgIFxyXG4gICAgICAgICAgICB9KTtcclxuICAgICAgICB9KTtcclxuICAgIH1cclxuICAgIFxyXG4gICAgZ2V0VHlwZWJ5SWQgKGlkKXtcclxuICAgICAgICBpZiAoaWQgPT0gMSl7XHJcbiAgICAgICAgICAgIHJldHVybiBtYW5pZmVzdFR5cGVzLmFpcjtcclxuICAgICAgICB9XHJcbiAgICAgICAgaWYgKGlkID09IDIpe1xyXG4gICAgICAgICAgICByZXR1cm4gbWFuaWZlc3RUeXBlcy5vY2VhbjtcclxuICAgICAgICB9XHJcbiAgICAgICAgaWYgKGlkID09IDMpe1xyXG4gICAgICAgICAgICByZXR1cm4gbWFuaWZlc3RUeXBlcy5oYXptYXQ7XHJcbiAgICAgICAgfVxyXG4gICAgICAgIHJldHVybiBtYW5pZmVzdFR5cGVzLmFpcjsgXHJcbiAgICB9XHJcbiAgICBnZXRTdGFnZUJ5SWQoaWQpe1xyXG4gICAgICAgIGlmIChpZCA9PSAxKXtcclxuICAgICAgICAgICAgcmV0dXJuIG1hbmlmZXN0U3RhZ2VzLm9wZW47XHJcbiAgICAgICAgfVxyXG4gICAgICAgIGlmIChpZCA9PSAyKXtcclxuICAgICAgICAgICAgcmV0dXJuIG1hbmlmZXN0U3RhZ2VzLmNsb3NlZDtcclxuICAgICAgICB9XHJcbiAgICAgICAgaWYgKGlkID09IDMpe1xyXG4gICAgICAgICAgICByZXR1cm4gbWFuaWZlc3RTdGFnZXMuc2hpcHBlZDtcclxuICAgICAgICB9XHJcbiAgICAgICAgaWYgKGlkID09IDQpe1xyXG4gICAgICAgICAgICByZXR1cm4gbWFuaWZlc3RTdGFnZXMudmVyaWZpZWQ7XHJcbiAgICAgICAgfVxyXG4gICAgICAgIHJldHVybiBtYW5pZmVzdFN0YWdlcy5vcGVuOyBcclxuICAgIH1cclxufSJdfQ==
