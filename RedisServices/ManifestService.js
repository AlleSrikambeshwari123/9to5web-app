'use strict';

Object.defineProperty(exports, "__esModule", {
    value: true
});

var _createClass = function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; }();

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

var redis = require('redis');
var lredis = require('./redis-local');
var moment = require('moment');
var redisSearch = require('../redisearchclient');
var MID_COUNTER = "global:midCounter";
var MID_PREFIX = "manifest:";
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
            var srv = this;
            return new Promise(function (resolve, reject) {
                _this2.getOpenManifest(type.id).then(function (openCount) {

                    console.log(type);
                    // if (openCount>0) {
                    //     //we can't add the manifest reject 
                    //     reject({
                    //         "message": "There is an open manifest Please close it before creating a new manifest."
                    //     });

                    // } else {
                    _this2.redisClient.multi().incr(MID_COUNTER).exec(function (err, resp) {
                        console.log(resp);
                        var manifest = {
                            mid: resp[0],
                            title: type.prefix + resp[0],
                            dateCreated: moment().unix(), //format("YYYY-MM-DD"),
                            mtypeId: type.id,
                            stageId: manifestStages.open.id,
                            stage: manifestStages.open.title,
                            createdBy: user
                        };
                        console.log(manifest);
                        srv.redisClient.multi().hmset(MID_PREFIX + manifest.mid, manifest).sadd(OPEN_MANIFEST, manifest.mid).exec(function (err, results) {
                            srv.mySearch.add(manifest.mid, manifest, function (serr, resu) {
                                if (serr) console.log(serr);
                                console.log(resu);
                            });
                            //also add to the index here one time 
                            if (err) {
                                reject(err);
                            } else {
                                resolve(manifest);
                            }
                        });
                    });
                    //}
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
//# sourceMappingURL=data:application/json;charset=utf8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIlJlZGlzU2VydmljZXMvTWFuaWZlc3RTZXJ2aWNlLmVzNiJdLCJuYW1lcyI6WyJyZWRpcyIsInJlcXVpcmUiLCJscmVkaXMiLCJtb21lbnQiLCJyZWRpc1NlYXJjaCIsIk1JRF9DT1VOVEVSIiwiTUlEX1BSRUZJWCIsIk1JRF9JTkRFWCIsIk9QRU5fTUFOSUZFU1QiLCJDTE9TRURfTUFOSUZFU1QiLCJTSElQUEVEX01BTklGRVNUIiwiVkVSSUZJRURfTUFOSUZFU1QiLCJtYW5pZmVzdFR5cGVzIiwiYWlyIiwiaWQiLCJ0aXRsZSIsInByZWZpeCIsIm9jZWFuIiwiaGF6bWF0IiwibWFuaWZlc3RTdGFnZXMiLCJvcGVuIiwiY2xvc2VkIiwic2hpcHBlZCIsInZlcmlmaWVkIiwiTWFuaWZlc3RTZXJ2aWNlIiwicmVkaXNDbGllbnQiLCJjbGllbnQiLCJtdHlwZXMiLCJtc3RhZ2VzIiwiY2hlY2tTZXR1cCIsInNldHVwSW5kZXgiLCJteVNlYXJjaCIsImNsaWVudE9wdGlvbnMiLCJzZWFyY2hDbGllbnREZXRhaWxzIiwiZXhpc3RzIiwiZXJyIiwicmVzIiwic2V0IiwibXl0eXBlcyIsInR5cGVJZCIsIlByb21pc2UiLCJyZXNvbHZlIiwicmVqZWN0IiwiY29uc29sZSIsImxvZyIsInNlYXJjaCIsIm9mZnNldCIsIm51bWJlck9mUmVzdWx0cyIsInNvcnRCeSIsImRpciIsInIxIiwiZGF0YSIsInRvdGFsUmVzdWx0cyIsInR5cGUiLCJ1c2VyIiwic3J2IiwiZ2V0T3Blbk1hbmlmZXN0IiwidGhlbiIsIm9wZW5Db3VudCIsIm11bHRpIiwiaW5jciIsImV4ZWMiLCJyZXNwIiwibWFuaWZlc3QiLCJtaWQiLCJkYXRlQ3JlYXRlZCIsInVuaXgiLCJtdHlwZUlkIiwic3RhZ2VJZCIsInN0YWdlIiwiY3JlYXRlZEJ5IiwiaG1zZXQiLCJzYWRkIiwicmVzdWx0cyIsImFkZCIsInNlcnIiLCJyZXN1IiwiY2F0Y2giLCJzdGFnZXMiLCJyZXN1bHQiLCJnZXRTdGFnZUJ5SWQiLCJyZXN1bHQyIiwiaGdldGFsbCIsInVNYW5pZmVzdCIsImRlbERvY3VtZW50IiwicmVzdWx0MSIsImF3YiIsInNoaXBEYXRlIiwiZm9ybWF0Iiwic2hpcHBlZEJ5Iiwic3Jlc3VsdCIsImNoYW5nZVN0YWdlIiwicGFnZSIsInBhZ2VTaXplIiwib2Zmc2V0VmFsIiwibWFuaWZlc3RMaXN0IiwiZm9yRWFjaCIsInB1c2giLCJtYW5pZmVzdFJlc3VsdCIsImRvYyIsInBhZ2VkRGF0YSIsIm1hbmlmZXN0cyIsIlRvdGFsUGFnZXMiLCJkZWwiLCJzcmVtIiwiZGVsZXRlZCIsIm1zZWFyY2giXSwibWFwcGluZ3MiOiI7Ozs7Ozs7Ozs7QUFBQSxJQUFJQSxRQUFRQyxRQUFRLE9BQVIsQ0FBWjtBQUNBLElBQUlDLFNBQVNELFFBQVEsZUFBUixDQUFiO0FBQ0EsSUFBSUUsU0FBU0YsUUFBUSxRQUFSLENBQWI7QUFDQSxJQUFJRyxjQUFjSCxRQUFRLHFCQUFSLENBQWxCO0FBQ0EsSUFBTUksY0FBYyxtQkFBcEI7QUFDQSxJQUFNQyxhQUFhLFdBQW5CO0FBQ0EsSUFBTUMsWUFBWSxnQkFBbEI7QUFDQSxJQUFNQyxnQkFBZ0IsZUFBdEI7QUFDQSxJQUFNQyxrQkFBa0IsaUJBQXhCO0FBQ0EsSUFBTUMsbUJBQW1CLGtCQUF6QjtBQUNBLElBQU1DLG9CQUFvQixtQkFBMUIsQyxDQUErQzs7QUFFL0MsSUFBSUMsZ0JBQWdCO0FBQ2hCQyxTQUFLO0FBQ0RDLFlBQUksQ0FESDtBQUVEQyxlQUFPLFdBRk47QUFHREMsZ0JBQVE7QUFIUCxLQURXO0FBTWhCQyxXQUFPO0FBQ0hILFlBQUksQ0FERDtBQUVIQyxlQUFPLE9BRko7QUFHSEMsZ0JBQVE7QUFITCxLQU5TO0FBV2hCRSxZQUFRO0FBQ0pKLFlBQUksQ0FEQTtBQUVKQyxlQUFPLFFBRkg7QUFHSkMsZ0JBQVE7QUFISjtBQVhRLENBQXBCO0FBaUJBLElBQUlHLGlCQUFpQjtBQUNqQkMsVUFBTTtBQUNGTixZQUFJLENBREY7QUFFRkMsZUFBTztBQUZMLEtBRFc7QUFLakJN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bGUiOiJSZWRpc1NlcnZpY2VzL01hbmlmZXN0U2VydmljZS5qcyIsInNvdXJjZXNDb250ZW50IjpbInZhciByZWRpcyA9IHJlcXVpcmUoJ3JlZGlzJyk7XG52YXIgbHJlZGlzID0gcmVxdWlyZSgnLi9yZWRpcy1sb2NhbCcpO1xudmFyIG1vbWVudCA9IHJlcXVpcmUoJ21vbWVudCcpO1xudmFyIHJlZGlzU2VhcmNoID0gcmVxdWlyZSgnLi4vcmVkaXNlYXJjaGNsaWVudCcpO1xuY29uc3QgTUlEX0NPVU5URVIgPSBcImdsb2JhbDptaWRDb3VudGVyXCI7XG5jb25zdCBNSURfUFJFRklYID0gXCJtYW5pZmVzdDpcIjtcbmNvbnN0IE1JRF9JTkRFWCA9IFwiaW5kZXg6bWFuaWZlc3RcIjtcbmNvbnN0IE9QRU5fTUFOSUZFU1QgPSBcIm1hbmlmZXN0Om9wZW5cIjtcbmNvbnN0IENMT1NFRF9NQU5JRkVTVCA9IFwibWFuaWZlc3Q6Y2xvc2VkXCJcbmNvbnN0IFNISVBQRURfTUFOSUZFU1QgPSBcIm1hbmlmZXN0OnNoaXBwZWRcIlxuY29uc3QgVkVSSUZJRURfTUFOSUZFU1QgPSBcIm1hbmlmZXN0OnZlcmlmaWVkXCI7IC8vIG1hbmlmZXN0IHRoYXQgaGF2ZSBkdXRpZXMgdmVyaWZpZWRcblxudmFyIG1hbmlmZXN0VHlwZXMgPSB7XG4gICAgYWlyOiB7XG4gICAgICAgIGlkOiAxLFxuICAgICAgICB0aXRsZTogXCJBaXIgQ2FyZ29cIixcbiAgICAgICAgcHJlZml4OiBcIk0tXCJcbiAgICB9LFxuICAgIG9jZWFuOiB7XG4gICAgICAgIGlkOiAyLFxuICAgICAgICB0aXRsZTogXCJPY2VhblwiLFxuICAgICAgICBwcmVmaXg6IFwiUy1cIlxuICAgIH0sXG4gICAgaGF6bWF0OiB7XG4gICAgICAgIGlkOiAzLFxuICAgICAgICB0aXRsZTogXCJIQVpNQVRcIixcbiAgICAgICAgcHJlZml4OiBcIkgtXCJcbiAgICB9XG59XG52YXIgbWFuaWZlc3RTdGFnZXMgPSB7XG4gICAgb3Blbjoge1xuICAgICAgICBpZDogMSxcbiAgICAgICAgdGl0bGU6ICdPcGVuJ1xuICAgIH0sXG4gICAgY2xvc2VkOiB7XG4gICAgICAgIGlkOiAyLFxuICAgICAgICB0aXRsZTogJ0Nsb3NlZCdcbiAgICB9LFxuICAgIHNoaXBwZWQ6IHtcbiAgICAgICAgaWQ6IDMsXG4gICAgICAgIHRpdGxlOiAnU2hpcHBlZCdcbiAgICB9LFxuICAgIHZlcmlmaWVkOiB7XG4gICAgICAgIGlkOiA0LFxuICAgICAgICB0aXRsZTogJ1ZlcmlmaWVkJ1xuICAgIH1cblxufVxuXG5leHBvcnQgY2xhc3MgTWFuaWZlc3RTZXJ2aWNlIHtcblxuICAgIGNvbnN0cnVjdG9yKCkgeyAgICAgICAgXG4gICAgICAgIHRoaXMucmVkaXNDbGllbnQgPSBscmVkaXMuY2xpZW50O1xuICAgICAgICB0aGlzLm10eXBlcyA9IG1hbmlmZXN0VHlwZXM7XG4gICAgICAgIHRoaXMubXN0YWdlcyA9IG1hbmlmZXN0U3RhZ2VzO1xuICAgICAgICAvL2NoZWNrIHRvIGVuc3VyZSB3ZSBoYXZlIHRoZSBtYW5pZmVzdCBjb3VudGVyIFxuICAgICAgICB0aGlzLmNoZWNrU2V0dXAoKTsgXG4gICAgICAgIHRoaXMuc2V0dXBJbmRleCgpXG4gICAgfVxuICAgIHNldHVwSW5kZXgoKXtcbiAgICAgICAgdGhpcy5teVNlYXJjaCA9IHJlZGlzU2VhcmNoKHJlZGlzLCAnaW5kZXg6bWFuaWZlc3QnLCB7XG4gICAgICAgICAgICBjbGllbnRPcHRpb25zOmxyZWRpcy5zZWFyY2hDbGllbnREZXRhaWxzXG4gICAgICAgIH0pO1xuICAgIH1cbiAgICBjaGVja1NldHVwKCl7XG4gICAgICAgIHRoaXMucmVkaXNDbGllbnQuZXhpc3RzKE1JRF9DT1VOVEVSLCAoZXJyLCByZXMpID0+IHtcbiAgICAgICAgICAgIGlmIChyZXMgPT0gMCkge1xuICAgICAgICAgICAgICAgIC8vY3JlYXRlIHRoZSBtYW5pZmVzdCBcbiAgICAgICAgICAgICAgICBscmVkaXMuc2V0KE1JRF9DT1VOVEVSLCAxMDApO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgXG4gICAgICAgIH0pO1xuICAgIH1cblxuICAgIGdldFR5cGVzKCkge1xuICAgICAgICByZXR1cm4gdGhpcy5teXR5cGVzXG4gICAgfVxuICAgIGdldFN0YWdlcygpIHtcbiAgICAgICAgcmV0dXJuIHRoaXMubWFuaWZlc3RTdGFnZXM7XG4gICAgfVxuXG4gICAgZ2V0T3Blbk1hbmlmZXN0KHR5cGVJZCl7XG4gICAgICAgIFxuICAgICAgICByZXR1cm4gbmV3IFByb21pc2UoKHJlc29sdmUscmVqZWN0KT0+e1xuICAgICAgICAgICBjb25zb2xlLmxvZyggYEBzdGFnZUlkOlske3R5cGVJZH0gJHt0eXBlSWR9XSBAbXR5cGVJZDoke3R5cGVJZH1gKTtcbiAgICAgICAgICAgIHRoaXMubXlTZWFyY2guc2VhcmNoKGBAc3RhZ2VJZDpbMSAxXSBAbXR5cGVJZDoke3R5cGVJZH1gLCB7XG4gICAgICAgICAgICAgICAgb2Zmc2V0OjAsXG4gICAgICAgICAgICAgICAgbnVtYmVyT2ZSZXN1bHRzOiAxMDAsXG4gICAgICAgICAgICAgICAgc29ydEJ5OiBcIm1pZFwiLFxuICAgICAgICAgICAgICAgIGRpcjogXCJERVNDXCJcbiAgICAgICAgICAgIH0sIChyMSwgZGF0YSkgPT4ge1xuICAgICAgICAgICAgICAgIGlmIChyMSlcbiAgICAgICAgICAgICAgICAge1xuICAgICAgICAgICAgICAgICAgICAgY29uc29sZS5sb2coJ3dlIGhhZCBhbiBlcnJvcicpXG4gICAgICAgICAgICAgICAgICAgIGNvbnNvbGUubG9nKHIxKTtcbiAgICAgICAgICAgICAgICAgICAgXG4gICAgICAgICAgICAgICAgIH0gICBcbiAgICAgICAgICAgICAgICAgY29uc29sZS5sb2coJ25vIGVycm9ycyBkZXRlY3RlZCBoZXJlIC4uLicpXG4gICAgICAgICAgICAgICAgIC8vY29uc29sZS5sb2cobWFuaWZlc3RMaXN0KTtcbiAgICAgICAgICAgICAgICAgY29uc29sZS5sb2coZGF0YSk7XG4gICAgICAgICAgICAgICAgcmVzb2x2ZShkYXRhLnRvdGFsUmVzdWx0cyk7XG4gICAgICAgICAgICB9KTtcbiAgICAgICAgICAgIFxuICAgICAgICB9KTtcbiAgICAgICAgXG4gICAgfVxuICAgIGNyZWF0ZU5ld01hbmlmZXN0KHR5cGUsIHVzZXIpIHtcbiAgICAgICAgLy93ZSBoYXZlIHNvbWUgcnVsZXMgdG8gZm9sbG93IGhlcmUgXG4gICAgICAgIC8vMS4gYSBuZXcgbWFuaWZlc3QgY2Fubm90IGJlIGNyZWF0ZWQgaWYgdGhlIHByZXZpb3VzIG1hbmlmZXN0IGlzIG5vdCBjbG9zZWQgXG4gICAgICAgIC8vY2hlY2sgZm9yIG9wZW4gbWFuaWZlc3QgZmlyc3QgXG4gICAgICAgIHZhciBzcnYgPSB0aGlzOyBcbiAgICAgICAgcmV0dXJuIG5ldyBQcm9taXNlKChyZXNvbHZlLCByZWplY3QpID0+IHtcbiAgICAgICAgICAgIHRoaXMuZ2V0T3Blbk1hbmlmZXN0KHR5cGUuaWQpLnRoZW4oKG9wZW5Db3VudCkgPT4ge1xuICAgICAgICAgICAgICBcbiAgICAgICAgICAgICAgICBjb25zb2xlLmxvZyh0eXBlKTsgXG4gICAgICAgICAgICAgICAgLy8gaWYgKG9wZW5Db3VudD4wKSB7XG4gICAgICAgICAgICAgICAgLy8gICAgIC8vd2UgY2FuJ3QgYWRkIHRoZSBtYW5pZmVzdCByZWplY3QgXG4gICAgICAgICAgICAgICAgLy8gICAgIHJlamVjdCh7XG4gICAgICAgICAgICAgICAgLy8gICAgICAgICBcIm1lc3NhZ2VcIjogXCJUaGVyZSBpcyBhbiBvcGVuIG1hbmlmZXN0IFBsZWFzZSBjbG9zZSBpdCBiZWZvcmUgY3JlYXRpbmcgYSBuZXcgbWFuaWZlc3QuXCJcbiAgICAgICAgICAgICAgICAvLyAgICAgfSk7XG5cbiAgICAgICAgICAgICAgICAvLyB9IGVsc2Uge1xuICAgICAgICAgICAgICAgICAgICB0aGlzLnJlZGlzQ2xpZW50Lm11bHRpKClcbiAgICAgICAgICAgICAgICAgICAgICAgIC5pbmNyKE1JRF9DT1VOVEVSKVxuICAgICAgICAgICAgICAgICAgICAgICAgLmV4ZWMoKGVyciwgcmVzcCkgPT4ge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGNvbnNvbGUubG9nKHJlc3ApO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHZhciBtYW5pZmVzdCA9IHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgbWlkOiByZXNwWzBdLFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB0aXRsZTogdHlwZS5wcmVmaXgrcmVzcFswXSxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgZGF0ZUNyZWF0ZWQ6IG1vbWVudCgpLnVuaXgoKSwvL2Zvcm1hdChcIllZWVktTU0tRERcIiksXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIG10eXBlSWQ6IHR5cGUuaWQsXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHN0YWdlSWQ6IG1hbmlmZXN0U3RhZ2VzLm9wZW4uaWQsXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHN0YWdlOiBtYW5pZmVzdFN0YWdlcy5vcGVuLnRpdGxlLFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBjcmVhdGVkQnk6IHVzZXJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICB9O1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGNvbnNvbGUubG9nKG1hbmlmZXN0KVxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHNydi5yZWRpc0NsaWVudC5tdWx0aSgpXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIC5obXNldChNSURfUFJFRklYICsgbWFuaWZlc3QubWlkLCBtYW5pZmVzdClcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgLnNhZGQoT1BFTl9NQU5JRkVTVCwgbWFuaWZlc3QubWlkKVxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAuZXhlYygoZXJyLCByZXN1bHRzKSA9PiB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBzcnYubXlTZWFyY2guYWRkKG1hbmlmZXN0Lm1pZCxtYW5pZmVzdCwoc2VycixyZXN1KT0+e1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGlmIChzZXJyKVxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBjb25zb2xlLmxvZyhzZXJyKVxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGNvbnNvbGUubG9nKHJlc3UpXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB9KTtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIC8vYWxzbyBhZGQgdG8gdGhlIGluZGV4IGhlcmUgb25lIHRpbWUgXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBpZiAoZXJyKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgcmVqZWN0KGVycik7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHJlc29sdmUobWFuaWZlc3QpXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICAgICAgLy99XG5cbiAgICAgICAgICAgIH0pLmNhdGNoKChlcnIpPT57XG4gICAgICAgICAgICAgICAgY29uc29sZS5sb2coXCJlcnIgZGV0ZWN0ZWRcIik7IFxuICAgICAgICAgICAgICAgIGNvbnNvbGUubG9nKGVycik7XG4gICAgICAgICAgICB9KTtcblxuICAgICAgICB9KTtcblxuICAgIH1cbiAgICBjaGFuZ2VTdGFnZShtaWQsIHN0YWdlcykge1xuICAgICAgICByZXR1cm4gbmV3IFByb21pc2UoKHJlc29sdmUsIHJlamVjdCkgPT4ge1xuICAgICAgICAgICAgXG4gICAgICAgICAgICBscmVkaXMuY2xpZW50Lmhtc2V0KE1JRF9QUkVGSVgrbWlkLFwic3RhZ2VJZFwiLHN0YWdlcywoZXJyLHJlc3VsdCk9PntcbiAgICAgICAgICAgICAgICB2YXIgc3RhZ2UgPSB0aGlzLmdldFN0YWdlQnlJZChzdGFnZXMpOyBcbiAgICAgICAgICAgICAgICBjb25zb2xlLmxvZygnbG9va2VkIHVwIHRoZSBzdGFnZSAnK3N0YWdlLnRpdGxlKTtcbiAgICAgICAgICAgICAgICBscmVkaXMuY2xpZW50Lmhtc2V0KE1JRF9QUkVGSVgrbWlkLFwic3RhZ2VcIixzdGFnZS50aXRsZSwoZXJyLHJlc3VsdDIpPT57fSk7IFxuICAgICAgICAgICAgICAgIGxyZWRpcy5oZ2V0YWxsKE1JRF9QUkVGSVgrbWlkKS50aGVuKCh1TWFuaWZlc3QpPT57XG4gICAgICAgICAgICAgICAgICAgIHRoaXMubXlTZWFyY2guZGVsRG9jdW1lbnQoXCJpbmRleDptYW5pZmVzdFwiLG1pZCwoZXJyLHJlc3VsdDEpPT57XG4gICAgICAgICAgICAgICAgICAgICAgICBjb25zb2xlLmxvZygnY2hhbmdpbmcgZG9jdW1lbnQnKTtcbiAgICAgICAgICAgICAgICAgICAgICAgIGNvbnNvbGUubG9nKGVycik7XG4gICAgICAgICAgICAgICAgICAgICAgICBjb25zb2xlLmxvZyhyZXN1bHQxKSBcbiAgICAgICAgICAgICAgICAgICAgICAgIHRoaXMubXlTZWFyY2guYWRkKHVNYW5pZmVzdC5taWQsdU1hbmlmZXN0KTsgXG4gICAgICAgICAgICAgICAgICAgICAgICByZXNvbHZlKHJlc3VsdCk7IFxuICAgICAgICAgICAgICAgICAgICB9KTsgXG4gICAgICAgICAgICAgICAgICAgXG4gICAgICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICAgICBcbiAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgLy93ZSBhbHNvIG5lZWQgdG8gdG8gdXBkYXRlIHRoZSBkb2N1bWVudCBcblxuICAgICAgICAgICAgXG4gICAgICAgIH0pXG4gICAgfVxuICAgIHNoaXBNYW5pZmVzdChtaWQsYXdiLHVzZXIpe1xuICAgICAgICByZXR1cm4gbmV3IFByb21pc2UoKHJlc29sdmUscmVqZWN0KT0+e1xuICAgICAgICAgICAgbHJlZGlzLmhtc2V0KE1JRF9QUkVGSVgrbWlkLCB7YXdiOmF3YixzaGlwRGF0ZTptb21lbnQoKS5mb3JtYXQoXCJZWVlZLU1NLUREXCIpLHNoaXBwZWRCeTp1c2VyfSkudGhlbigoc3Jlc3VsdCk9PntcbiAgICAgICAgICAgICAgICBjb25zb2xlLmxvZyhzcmVzdWx0KTtcbiAgICAgICAgICAgICAgICB0aGlzLmNoYW5nZVN0YWdlKG1pZCwzKS50aGVuKChyZXN1KT0+e1xuICAgICAgICAgICAgICAgICAgICByZXNvbHZlKHNyZXN1bHQpO1xuICAgICAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgICAgIFxuICAgICAgICAgICAgfSlcbiAgICAgICAgfSlcbiAgICB9XG4gICAgbGlzdE1hbmlmZXN0KHR5cGUscGFnZSxwYWdlU2l6ZSl7XG4gICAgICAgIHJldHVybiBuZXcgUHJvbWlzZSgocmVzb2x2ZSxyZWplY3QpPT57XG4gICAgICAgICAgICB2YXIgb2Zmc2V0VmFsID0gKHBhZ2UgLSAxKSAqIHBhZ2VTaXplO1xuICAgICAgICAgICAgY29uc29sZS5sb2coJ29mZnNldCAnK29mZnNldFZhbCk7XG4gICAgICAgICAgICBcbiAgICAgICAgICAgIHRoaXMubXlTZWFyY2guc2VhcmNoKFwiQG10eXBlSWQ6XCIrdHlwZSwge1xuICAgICAgICAgICAgICAgIG9mZnNldDpvZmZzZXRWYWwsXG4gICAgICAgICAgICAgICAgbnVtYmVyT2ZSZXN1bHRzOiBwYWdlU2l6ZSxcbiAgICAgICAgICAgICAgICBzb3J0Qnk6IFwibWlkXCIsXG4gICAgICAgICAgICAgICAgZGlyOiBcIkRFU0NcIlxuICAgICAgICAgICAgfSwgKHIxLCBkYXRhKSA9PiB7XG4gICAgICAgICAgICAgICAgaWYgKHIxKVxuICAgICAgICAgICAgICAgICAgICBjb25zb2xlLmxvZyhyMSk7XG4gICAgICAgICAgICAgICAgIHZhciBtYW5pZmVzdExpc3QgPSBbXTsgXG4gICAgICAgICAgICAgICAgIGRhdGEucmVzdWx0cy5mb3JFYWNoKG1hbmlmZXN0UmVzdWx0ID0+IHtcbiAgICAgICAgICAgICAgICAgICAgbWFuaWZlc3RMaXN0LnB1c2gobWFuaWZlc3RSZXN1bHQuZG9jKTsgICAgXG4gICAgICAgICAgICAgICAgICAgIFxuICAgICAgICAgICAgICAgICB9KTtcbiAgICAgICAgICAgICAgICAgLy9jb25zb2xlLmxvZyhtYW5pZmVzdExpc3QpO1xuICAgICAgICAgICAgICAgICB2YXIgcGFnZWREYXRhID0ge1xuICAgICAgICAgICAgICAgICAgICBtYW5pZmVzdHM6bWFuaWZlc3RMaXN0LFxuICAgICAgICAgICAgICAgICAgICB0b3RhbFJlc3VsdHMgOiBkYXRhLnRvdGFsUmVzdWx0cyxcbiAgICAgICAgICAgICAgICAgICAgcGFnZSA6IHBhZ2UsXG4gICAgICAgICAgICAgICAgICAgIHBhZ2VTaXplOiBwYWdlU2l6ZSwgXG4gICAgICAgICAgICAgICAgICAgIFRvdGFsUGFnZXMgOiAoZGF0YS50b3RhbFJlc3VsdHMvcGFnZVNpemUpXG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIHJlc29sdmUocGFnZWREYXRhKTtcbiAgICAgICAgICAgICAgICBjb25zb2xlLmxvZyhtYW5pZmVzdExpc3QpO1xuICAgICAgICAgICAgICAgIFxuICAgICAgICAgICAgfSk7XG4gICAgICAgIH0pO1xuICAgIH1cbiAgICBnZXRNYW5pZmVzdChtaWQpIHtcbiAgICAgICAgcmV0dXJuIGxyZWRpcy5oZ2V0YWxsKE1JRF9QUkVGSVgrbWlkKVxuICAgIH1cbiAgICBkZWxldGVNYW5pZmVzdChtaWQpe1xuICAgICAgIHJldHVybiBuZXcgUHJvbWlzZSgocmVzb2x2ZSxyZWplY3QpPT57XG4gICAgICAgIGxyZWRpcy5jbGllbnQuZGVsKE1JRF9QUkVGSVgrbWlkLChlcnIscmVzcCk9PntcbiAgICAgICAgICAgIGNvbnNvbGUubG9nKHJlc3ApOyBcbiAgICAgICAgICAgIHRoaXMubXlTZWFyY2guZGVsRG9jdW1lbnQoXCJpbmRleDptYW5pZmVzdFwiLG1pZCwoZXJyLHJlc3VsdCk9PntcbiAgICAgICAgICAgICAgICBjb25zb2xlLmxvZyhcImRlbGV0aW5nIG1pZFwiKTsgXG4gICAgICAgICAgICAgICAgY29uc29sZS5sb2coZXJyKTsgXG4gICAgICAgICAgICAgICAgY29uc29sZS5sb2cocmVzdWx0KTtcbiAgICAgICAgICAgIH0pOyBcbiAgICAgICAgICAgIGxyZWRpcy5zcmVtKE9QRU5fTUFOSUZFU1QsbWlkKTtcbiAgICAgICAgICAgIHJlc29sdmUoe2RlbGV0ZWQ6dHJ1ZX0pICAgIFxuICAgICAgICB9KVxuXG4gICAgICAgfSk7IFxuICAgICAgICBcbiAgICAgICAgXG4gICAgfVxuICAgIGdldE1hbmlmZXN0UHJvY2Vzc2luZygpe1xuICAgICAgICB2YXIgbXNlYXJjaCA9IHRoaXMubXlTZWFyY2g7IFxuICAgICAgICByZXR1cm4gbmV3IFByb21pc2UoKHJlc29sdmUscmVqZWN0KT0+e1xuICAgICAgICAgICAgdmFyIG9mZnNldFZhbCA9MDtcbiAgICAgICAgICAgIHZhciBwYWdlU2l6ZSA9IDIwOyBcbiAgICAgICAgICAgIGNvbnNvbGUubG9nKCdvZmZzZXQgJytvZmZzZXRWYWwpO1xuICAgICAgICAgICAgdmFyIG1hbmlmZXN0TGlzdCA9IFtdOyBcbiAgICAgICAgICAgIG1zZWFyY2guc2VhcmNoKGBAc3RhZ2VJZDpbMyA0XWAsIHtcbiAgICAgICAgICAgICAgICBvZmZzZXQ6b2Zmc2V0VmFsLFxuICAgICAgICAgICAgICAgIG51bWJlck9mUmVzdWx0czogcGFnZVNpemUsXG4gICAgICAgICAgICAgICAgc29ydEJ5OiBcIm1pZFwiLFxuICAgICAgICAgICAgICAgIGRpcjogXCJERVNDXCJcbiAgICAgICAgICAgIH0sIChyMSwgZGF0YSkgPT4ge1xuICAgICAgICAgICAgICAgIGlmIChyMSlcbiAgICAgICAgICAgICAgICAgICAgY29uc29sZS5sb2cocjEpO1xuICAgICAgICAgICAgICAgICBcbiAgICAgICAgICAgICAgICAgZGF0YS5yZXN1bHRzLmZvckVhY2gobWFuaWZlc3RSZXN1bHQgPT4ge1xuICAgICAgICAgICAgICAgICAgICBtYW5pZmVzdExpc3QucHVzaChtYW5pZmVzdFJlc3VsdC5kb2MpOyAgICBcbiAgICAgICAgICAgICAgICAgICAgXG4gICAgICAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgICAgICAvL2NvbnNvbGUubG9nKG1hbmlmZXN0TGlzdCk7XG4gICAgICAgICAgICAgICAgIHZhciBwYWdlZERhdGEgPSB7XG4gICAgICAgICAgICAgICAgICAgIG1hbmlmZXN0czptYW5pZmVzdExpc3QsXG4gICAgICAgICAgICAgICAgICAgIHRvdGFsUmVzdWx0cyA6IGRhdGEudG90YWxSZXN1bHRzLFxuICAgICAgICAgICAgICAgICAgICBwYWdlIDogMSxcbiAgICAgICAgICAgICAgICAgICAgcGFnZVNpemU6IHBhZ2VTaXplLCBcbiAgICAgICAgICAgICAgICAgICAgVG90YWxQYWdlcyA6IChkYXRhLnRvdGFsUmVzdWx0cy9wYWdlU2l6ZSlcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgcmVzb2x2ZShwYWdlZERhdGEpO1xuICAgICAgICAgICAgICAgIGNvbnNvbGUubG9nKG1hbmlmZXN0TGlzdCk7XG4gICAgICAgICAgICAgICAgXG4gICAgICAgICAgICB9KTtcbiAgICAgICAgfSk7XG4gICAgfVxuICAgIFxuICAgIGdldFR5cGVieUlkIChpZCl7XG4gICAgICAgIGlmIChpZCA9PSAxKXtcbiAgICAgICAgICAgIHJldHVybiBtYW5pZmVzdFR5cGVzLmFpcjtcbiAgICAgICAgfVxuICAgICAgICBpZiAoaWQgPT0gMil7XG4gICAgICAgICAgICByZXR1cm4gbWFuaWZlc3RUeXBlcy5vY2VhbjtcbiAgICAgICAgfVxuICAgICAgICBpZiAoaWQgPT0gMyl7XG4gICAgICAgICAgICByZXR1cm4gbWFuaWZlc3RUeXBlcy5oYXptYXQ7XG4gICAgICAgIH1cbiAgICAgICAgcmV0dXJuIG1hbmlmZXN0VHlwZXMuYWlyOyBcbiAgICB9XG4gICAgZ2V0U3RhZ2VCeUlkKGlkKXtcbiAgICAgICAgaWYgKGlkID09IDEpe1xuICAgICAgICAgICAgcmV0dXJuIG1hbmlmZXN0U3RhZ2VzLm9wZW47XG4gICAgICAgIH1cbiAgICAgICAgaWYgKGlkID09IDIpe1xuICAgICAgICAgICAgcmV0dXJuIG1hbmlmZXN0U3RhZ2VzLmNsb3NlZDtcbiAgICAgICAgfVxuICAgICAgICBpZiAoaWQgPT0gMyl7XG4gICAgICAgICAgICByZXR1cm4gbWFuaWZlc3RTdGFnZXMuc2hpcHBlZDtcbiAgICAgICAgfVxuICAgICAgICBpZiAoaWQgPT0gNCl7XG4gICAgICAgICAgICByZXR1cm4gbWFuaWZlc3RTdGFnZXMudmVyaWZpZWQ7XG4gICAgICAgIH1cbiAgICAgICAgcmV0dXJuIG1hbmlmZXN0U3RhZ2VzLm9wZW47IFxuICAgIH1cbn0iXX0=
