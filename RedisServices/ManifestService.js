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
                            "message": "There is an open manifest.\nPlease close it before creating a new manifest."
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
                    lredis.client.hmset(MID_PREFIX + mid, "stage", stage.title, function (err, result2) { });
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
//# sourceMappingURL=data:application/json;charset=utf8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIlJlZGlzU2VydmljZXMvTWFuaWZlc3RTZXJ2aWNlLmVzNiJdLCJuYW1lcyI6WyJyZWRpcyIsInJlcXVpcmUiLCJscmVkaXMiLCJtb21lbnQiLCJyZWRpc1NlYXJjaCIsIk1JRF9DT1VOVEVSIiwiTUlEX1BSRUZJWCIsIk1JRF9JTkRFWCIsIk9QRU5fTUFOSUZFU1QiLCJDTE9TRURfTUFOSUZFU1QiLCJTSElQUEVEX01BTklGRVNUIiwiVkVSSUZJRURfTUFOSUZFU1QiLCJtYW5pZmVzdFR5cGVzIiwiYWlyIiwiaWQiLCJ0aXRsZSIsInByZWZpeCIsIm9jZWFuIiwiaGF6bWF0IiwibWFuaWZlc3RTdGFnZXMiLCJvcGVuIiwiY2xvc2VkIiwic2hpcHBlZCIsInZlcmlmaWVkIiwiTWFuaWZlc3RTZXJ2aWNlIiwicmVkaXNDbGllbnQiLCJjbGllbnQiLCJtdHlwZXMiLCJtc3RhZ2VzIiwiY2hlY2tTZXR1cCIsInNldHVwSW5kZXgiLCJteVNlYXJjaCIsImNsaWVudE9wdGlvbnMiLCJzZWFyY2hDbGllbnREZXRhaWxzIiwiZXhpc3RzIiwiZXJyIiwicmVzIiwic2V0IiwibXl0eXBlcyIsInR5cGVJZCIsIlByb21pc2UiLCJyZXNvbHZlIiwicmVqZWN0IiwiY29uc29sZSIsImxvZyIsInNlYXJjaCIsIm9mZnNldCIsIm51bWJlck9mUmVzdWx0cyIsInNvcnRCeSIsImRpciIsInIxIiwiZGF0YSIsInRvdGFsUmVzdWx0cyIsInR5cGUiLCJ1c2VyIiwiZ2V0T3Blbk1hbmlmZXN0IiwidGhlbiIsIm9wZW5Db3VudCIsIm11bHRpIiwiaW5jciIsImV4ZWMiLCJyZXNwIiwibWFuaWZlc3QiLCJtaWQiLCJkYXRlQ3JlYXRlZCIsImZvcm1hdCIsIm10eXBlSWQiLCJzdGFnZUlkIiwic3RhZ2UiLCJjcmVhdGVkQnkiLCJobXNldCIsInNhZGQiLCJyZXN1bHRzIiwiYWRkIiwiY2F0Y2giLCJzdGFnZXMiLCJyZXN1bHQiLCJnZXRTdGFnZUJ5SWQiLCJyZXN1bHQyIiwiaGdldGFsbCIsInVNYW5pZmVzdCIsImRlbERvY3VtZW50IiwicmVzdWx0MSIsImF3YiIsInNoaXBEYXRlIiwic2hpcHBlZEJ5Iiwic3Jlc3VsdCIsImNoYW5nZVN0YWdlIiwicmVzdSIsInBhZ2UiLCJwYWdlU2l6ZSIsIm9mZnNldFZhbCIsIm1hbmlmZXN0TGlzdCIsImZvckVhY2giLCJwdXNoIiwibWFuaWZlc3RSZXN1bHQiLCJkb2MiLCJwYWdlZERhdGEiLCJtYW5pZmVzdHMiLCJUb3RhbFBhZ2VzIiwiZGVsIiwic3JlbSIsImRlbGV0ZWQiLCJtc2VhcmNoIl0sIm1hcHBpbmdzIjoiOzs7Ozs7Ozs7O0FBQUEsSUFBSUEsUUFBUUMsUUFBUSxPQUFSLENBQVo7QUFDQSxJQUFJQyxTQUFTRCxRQUFRLGVBQVIsQ0FBYjtBQUNBLElBQUlFLFNBQVNGLFFBQVEsUUFBUixDQUFiO0FBQ0EsSUFBSUcsY0FBY0gsUUFBUSxxQkFBUixDQUFsQjtBQUNBLElBQU1JLGNBQWMsbUJBQXBCO0FBQ0EsSUFBTUMsYUFBYSxlQUFuQjtBQUNBLElBQU1DLFlBQVksZ0JBQWxCO0FBQ0EsSUFBTUMsZ0JBQWdCLGVBQXRCO0FBQ0EsSUFBTUMsa0JBQWtCLGlCQUF4QjtBQUNBLElBQU1DLG1CQUFtQixrQkFBekI7QUFDQSxJQUFNQyxvQkFBb0IsbUJBQTFCLEMsQ0FBK0M7O0FBRS9DLElBQUlDLGdCQUFnQjtBQUNoQkMsU0FBSztBQUNEQyxZQUFJLENBREg7QUFFREMsZUFBTyxXQUZOO0FBR0RDLGdCQUFRO0FBSFAsS0FEVztBQU1oQkMsV0FBTztBQUNISCxZQUFJLENBREQ7QUFFSEMsZUFBTyxPQUZKO0FBR0hDLGdCQUFRO0FBSEwsS0FOUztBQVdoQkUsWUFBUTtBQUNKSixZQUFJLENBREE7QUFFSkMsZUFBTyxRQUZIO0FBR0pDLGdCQUFRO0FBSEo7QUFYUSxDQUFwQjtBQWlCQSxJQUFJRyxpQkFBaUI7QUFDakJDLFVBQU07QUFDRk4sWUFBSSxDQURGO0FBRUZDLGVBQU87QUFGTCxLQURXO0FBS2pCTSxZQUFRO0FBQ0pQLFlBQUksQ0FE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YUUsSUFBYixDQUFrQkMsZUFBZUMsR0FBakM7QUFFRixxQkFIRDtBQUlBO0FBQ0Esd0JBQUlDLFlBQVk7QUFDYkMsbUNBQVVOLFlBREc7QUFFYnhDLHNDQUFlRCxLQUFLQyxZQUZQO0FBR2JxQyw4QkFBTyxDQUhNO0FBSWJDLGtDQUFVQSxRQUpHO0FBS2JTLG9DQUFjaEQsS0FBS0MsWUFBTCxHQUFrQnNDO0FBTG5CLHFCQUFoQjtBQU9EakQsNEJBQVF3RCxTQUFSO0FBQ0F0RCw0QkFBUUMsR0FBUixDQUFZZ0QsWUFBWjtBQUVILGlCQXhCRDtBQXlCSCxhQTlCTSxDQUFQO0FBK0JIOzs7b0NBRVk5RSxFLEVBQUc7QUFDWixnQkFBSUEsTUFBTSxDQUFWLEVBQVk7QUFDUix1QkFBT0YsY0FBY0MsR0FBckI7QUFDSDtBQUNELGdCQUFJQyxNQUFNLENBQVYsRUFBWTtBQUNSLHVCQUFPRixjQUFjSyxLQUFyQjtBQUNIO0FBQ0QsZ0JBQUlILE1BQU0sQ0FBVixFQUFZO0FBQ1IsdUJBQU9GLGNBQWNNLE1BQXJCO0FBQ0g7QUFDRCxtQkFBT04sY0FBY0MsR0FBckI7QUFDSDs7O3FDQUNZQyxFLEVBQUc7QUFDWixnQkFBSUEsTUFBTSxDQUFWLEVBQVk7QUFDUix1QkFBT0ssZUFBZUMsSUFBdEI7QUFDSDtBQUNELGdCQUFJTixNQUFNLENBQVYsRUFBWTtBQUNSLHVCQUFPSyxlQUFlRSxNQUF0QjtBQUNIO0FBQ0QsZ0JBQUlQLE1BQU0sQ0FBVixFQUFZO0FBQ1IsdUJBQU9LLGVBQWVHLE9BQXRCO0FBQ0g7QUFDRCxnQkFBSVIsTUFBTSxDQUFWLEVBQVk7QUFDUix1QkFBT0ssZUFBZUksUUFBdEI7QUFDSDtBQUNELG1CQUFPSixlQUFlQyxJQUF0QjtBQUNIIiwiZmlsZSI6IlJlZGlzU2VydmljZXMvTWFuaWZlc3RTZXJ2aWNlLmpzIiwic291cmNlc0NvbnRlbnQiOlsidmFyIHJlZGlzID0gcmVxdWlyZSgncmVkaXMnKTtcbnZhciBscmVkaXMgPSByZXF1aXJlKCcuL3JlZGlzLWxvY2FsJyk7XG52YXIgbW9tZW50ID0gcmVxdWlyZSgnbW9tZW50Jyk7XG52YXIgcmVkaXNTZWFyY2ggPSByZXF1aXJlKCcuLi9yZWRpc2VhcmNoY2xpZW50Jyk7XG5jb25zdCBNSURfQ09VTlRFUiA9IFwiZ2xvYmFsOm1pZENvdW50ZXJcIjtcbmNvbnN0IE1JRF9QUkVGSVggPSBcInRldzptYW5pZmVzdDpcIjtcbmNvbnN0IE1JRF9JTkRFWCA9IFwiaW5kZXg6bWFuaWZlc3RcIjtcbmNvbnN0IE9QRU5fTUFOSUZFU1QgPSBcIm1hbmlmZXN0Om9wZW5cIjtcbmNvbnN0IENMT1NFRF9NQU5JRkVTVCA9IFwibWFuaWZlc3Q6Y2xvc2VkXCJcbmNvbnN0IFNISVBQRURfTUFOSUZFU1QgPSBcIm1hbmlmZXN0OnNoaXBwZWRcIlxuY29uc3QgVkVSSUZJRURfTUFOSUZFU1QgPSBcIm1hbmlmZXN0OnZlcmlmaWVkXCI7IC8vIG1hbmlmZXN0IHRoYXQgaGF2ZSBkdXRpZXMgdmVyaWZpZWRcblxudmFyIG1hbmlmZXN0VHlwZXMgPSB7XG4gICAgYWlyOiB7XG4gICAgICAgIGlkOiAxLFxuICAgICAgICB0aXRsZTogXCJBaXIgQ2FyZ29cIixcbiAgICAgICAgcHJlZml4OiBcIk0tXCJcbiAgICB9LFxuICAgIG9jZWFuOiB7XG4gICAgICAgIGlkOiAyLFxuICAgICAgICB0aXRsZTogXCJPY2VhblwiLFxuICAgICAgICBwcmVmaXg6IFwiUy1cIlxuICAgIH0sXG4gICAgaGF6bWF0OiB7XG4gICAgICAgIGlkOiAzLFxuICAgICAgICB0aXRsZTogXCJIQVpNQVRcIixcbiAgICAgICAgcHJlZml4OiBcIkgtXCJcbiAgICB9XG59XG52YXIgbWFuaWZlc3RTdGFnZXMgPSB7XG4gICAgb3Blbjoge1xuICAgICAgICBpZDogMSxcbiAgICAgICAgdGl0bGU6ICdPcGVuJ1xuICAgIH0sXG4gICAgY2xvc2VkOiB7XG4gICAgICAgIGlkOiAyLFxuICAgICAgICB0aXRsZTogJ0Nsb3NlZCdcbiAgICB9LFxuICAgIHNoaXBwZWQ6IHtcbiAgICAgICAgaWQ6IDMsXG4gICAgICAgIHRpdGxlOiAnU2hpcHBlZCdcbiAgICB9LFxuICAgIHZlcmlmaWVkOiB7XG4gICAgICAgIGlkOiA0LFxuICAgICAgICB0aXRsZTogJ1ZlcmlmaWVkJ1xuICAgIH1cblxufVxuXG5leHBvcnQgY2xhc3MgTWFuaWZlc3RTZXJ2aWNlIHtcblxuICAgIGNvbnN0cnVjdG9yKCkgeyAgICAgICAgXG4gICAgICAgIHRoaXMucmVkaXNDbGllbnQgPSBscmVkaXMuY2xpZW50O1xuICAgICAgICB0aGlzLm10eXBlcyA9IG1hbmlmZXN0VHlwZXM7XG4gICAgICAgIHRoaXMubXN0YWdlcyA9IG1hbmlmZXN0U3RhZ2VzO1xuICAgICAgICAvL2NoZWNrIHRvIGVuc3VyZSB3ZSBoYXZlIHRoZSBtYW5pZmVzdCBjb3VudGVyIFxuICAgICAgICB0aGlzLmNoZWNrU2V0dXAoKTsgXG4gICAgICAgIHRoaXMuc2V0dXBJbmRleCgpXG4gICAgfVxuICAgIHNldHVwSW5kZXgoKXtcbiAgICAgICAgdGhpcy5teVNlYXJjaCA9IHJlZGlzU2VhcmNoKHJlZGlzLCAnaW5kZXg6bWFuaWZlc3QnLCB7XG4gICAgICAgICAgICBjbGllbnRPcHRpb25zOmxyZWRpcy5zZWFyY2hDbGllbnREZXRhaWxzXG4gICAgICAgIH0pO1xuICAgIH1cbiAgICBjaGVja1NldHVwKCl7XG4gICAgICAgIHRoaXMucmVkaXNDbGllbnQuZXhpc3RzKE1JRF9DT1VOVEVSLCAoZXJyLCByZXMpID0+IHtcbiAgICAgICAgICAgIGlmIChyZXMgPT0gMCkge1xuICAgICAgICAgICAgICAgIC8vY3JlYXRlIHRoZSBtYW5pZmVzdCBcbiAgICAgICAgICAgICAgICBscmVkaXMuc2V0KE1JRF9DT1VOVEVSLCAxMDApO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgXG4gICAgICAgIH0pO1xuICAgIH1cblxuICAgIGdldFR5cGVzKCkge1xuICAgICAgICByZXR1cm4gdGhpcy5teXR5cGVzXG4gICAgfVxuICAgIGdldFN0YWdlcygpIHtcbiAgICAgICAgcmV0dXJuIHRoaXMubWFuaWZlc3RTdGFnZXM7XG4gICAgfVxuXG4gICAgZ2V0T3Blbk1hbmlmZXN0KHR5cGVJZCl7XG4gICAgICAgIFxuICAgICAgICByZXR1cm4gbmV3IFByb21pc2UoKHJlc29sdmUscmVqZWN0KT0+e1xuICAgICAgICAgICBjb25zb2xlLmxvZyggYEBzdGFnZUlkOlske3R5cGVJZH0gJHt0eXBlSWR9XSBAbXR5cGVJZDoke3R5cGVJZH1gKTtcbiAgICAgICAgICAgIHRoaXMubXlTZWFyY2guc2VhcmNoKGBAc3RhZ2VJZDpbMSAxXSBAbXR5cGVJZDoke3R5cGVJZH1gLCB7XG4gICAgICAgICAgICAgICAgb2Zmc2V0OjAsXG4gICAgICAgICAgICAgICAgbnVtYmVyT2ZSZXN1bHRzOiAxMDAsXG4gICAgICAgICAgICAgICAgc29ydEJ5OiBcIm1pZFwiLFxuICAgICAgICAgICAgICAgIGRpcjogXCJERVNDXCJcbiAgICAgICAgICAgIH0sIChyMSwgZGF0YSkgPT4ge1xuICAgICAgICAgICAgICAgIGlmIChyMSlcbiAgICAgICAgICAgICAgICAge1xuICAgICAgICAgICAgICAgICAgICAgY29uc29sZS5sb2coJ3dlIGhhZCBhbiBlcnJvcicpXG4gICAgICAgICAgICAgICAgICAgIGNvbnNvbGUubG9nKHIxKTtcbiAgICAgICAgICAgICAgICAgICAgXG4gICAgICAgICAgICAgICAgIH0gICBcbiAgICAgICAgICAgICAgICAgY29uc29sZS5sb2coJ25vIGVycm9ycyBkZXRlY3RlZCBoZXJlIC4uLicpXG4gICAgICAgICAgICAgICAgIC8vY29uc29sZS5sb2cobWFuaWZlc3RMaXN0KTtcbiAgICAgICAgICAgICAgICAgY29uc29sZS5sb2coZGF0YSk7XG4gICAgICAgICAgICAgICAgcmVzb2x2ZShkYXRhLnRvdGFsUmVzdWx0cyk7XG4gICAgICAgICAgICB9KTtcbiAgICAgICAgICAgIFxuICAgICAgICB9KTtcbiAgICAgICAgXG4gICAgfVxuICAgIGNyZWF0ZU5ld01hbmlmZXN0KHR5cGUsIHVzZXIpIHtcbiAgICAgICAgLy93ZSBoYXZlIHNvbWUgcnVsZXMgdG8gZm9sbG93IGhlcmUgXG4gICAgICAgIC8vMS4gYSBuZXcgbWFuaWZlc3QgY2Fubm90IGJlIGNyZWF0ZWQgaWYgdGhlIHByZXZpb3VzIG1hbmlmZXN0IGlzIG5vdCBjbG9zZWQgXG4gICAgICAgIC8vY2hlY2sgZm9yIG9wZW4gbWFuaWZlc3QgZmlyc3QgXG4gICAgICAgIHJldHVybiBuZXcgUHJvbWlzZSgocmVzb2x2ZSwgcmVqZWN0KSA9PiB7XG4gICAgICAgICAgICB0aGlzLmdldE9wZW5NYW5pZmVzdCh0eXBlLmlkKS50aGVuKChvcGVuQ291bnQpID0+IHtcbiAgICAgICAgICAgICAgXG4gICAgICAgICAgICAgICAgY29uc29sZS5sb2codHlwZSk7IFxuICAgICAgICAgICAgICAgIGlmIChvcGVuQ291bnQ+MCkge1xuICAgICAgICAgICAgICAgICAgICAvL3dlIGNhbid0IGFkZCB0aGUgbWFuaWZlc3QgcmVqZWN0IFxuICAgICAgICAgICAgICAgICAgICByZWplY3Qoe1xuICAgICAgICAgICAgICAgICAgICAgICAgXCJtZXNzYWdlXCI6IFwiVGhlcmUgaXMgYW4gb3BlbiBtYW5pZmVzdCBQbGVhc2UgY2xvc2UgaXQgYmVmb3JlIGNyZWF0aW5nIGEgbmV3IG1hbmlmZXN0LlwiXG4gICAgICAgICAgICAgICAgICAgIH0pO1xuXG4gICAgICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICAgICAgdGhpcy5yZWRpc0NsaWVudC5tdWx0aSgpXG4gICAgICAgICAgICAgICAgICAgICAgICAuaW5jcihNSURfQ09VTlRFUilcbiAgICAgICAgICAgICAgICAgICAgICAgIC5leGVjKChlcnIsIHJlc3ApID0+IHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBjb25zb2xlLmxvZyhyZXNwKTtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICB2YXIgbWFuaWZlc3QgPSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIG1pZDogcmVzcFswXSxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgdGl0bGU6IHR5cGUucHJlZml4K3Jlc3BbMF0sXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGRhdGVDcmVhdGVkOiBtb21lbnQoKS5mb3JtYXQoXCJZWVlZLU1NLUREXCIpLFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBtdHlwZUlkOiB0eXBlLmlkLFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBzdGFnZUlkOiBtYW5pZmVzdFN0YWdlcy5vcGVuLmlkLFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBzdGFnZTogbWFuaWZlc3RTdGFnZXMub3Blbi50aXRsZSxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgY3JlYXRlZEJ5OiB1c2VyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgfTtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICB0aGlzLnJlZGlzQ2xpZW50Lm11bHRpKClcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgLmhtc2V0KE1JRF9QUkVGSVggKyBtYW5pZmVzdC5taWQsIG1hbmlmZXN0KVxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAuc2FkZChPUEVOX01BTklGRVNULCBtYW5pZmVzdC5taWQpXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIC5leGVjKChlcnIsIHJlc3VsdHMpID0+IHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHRoaXMubXlTZWFyY2guYWRkKG1hbmlmZXN0Lm1pZCxtYW5pZmVzdCk7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAvL2Fsc28gYWRkIHRvIHRoZSBpbmRleCBoZXJlIG9uZSB0aW1lIFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgaWYgKGVycikge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHJlamVjdChlcnIpO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICByZXNvbHZlKG1hbmlmZXN0KVxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB9KTtcbiAgICAgICAgICAgICAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgfSkuY2F0Y2goKGVycik9PntcbiAgICAgICAgICAgICAgICBjb25zb2xlLmxvZyhcImVyciBkZXRlY3RlZFwiKTsgXG4gICAgICAgICAgICAgICAgY29uc29sZS5sb2coZXJyKTtcbiAgICAgICAgICAgIH0pO1xuXG4gICAgICAgIH0pO1xuXG4gICAgfVxuICAgIGNoYW5nZVN0YWdlKG1pZCwgc3RhZ2VzKSB7XG4gICAgICAgIHJldHVybiBuZXcgUHJvbWlzZSgocmVzb2x2ZSwgcmVqZWN0KSA9PiB7XG4gICAgICAgICAgICBcbiAgICAgICAgICAgIGxyZWRpcy5jbGllbnQuaG1zZXQoTUlEX1BSRUZJWCttaWQsXCJzdGFnZUlkXCIsc3RhZ2VzLChlcnIscmVzdWx0KT0+e1xuICAgICAgICAgICAgICAgIHZhciBzdGFnZSA9IHRoaXMuZ2V0U3RhZ2VCeUlkKHN0YWdlcyk7IFxuICAgICAgICAgICAgICAgIGNvbnNvbGUubG9nKCdsb29rZWQgdXAgdGhlIHN0YWdlICcrc3RhZ2UudGl0bGUpO1xuICAgICAgICAgICAgICAgIGxyZWRpcy5jbGllbnQuaG1zZXQoTUlEX1BSRUZJWCttaWQsXCJzdGFnZVwiLHN0YWdlLnRpdGxlLChlcnIscmVzdWx0Mik9Pnt9KTsgXG4gICAgICAgICAgICAgICAgbHJlZGlzLmhnZXRhbGwoTUlEX1BSRUZJWCttaWQpLnRoZW4oKHVNYW5pZmVzdCk9PntcbiAgICAgICAgICAgICAgICAgICAgdGhpcy5teVNlYXJjaC5kZWxEb2N1bWVudChcImluZGV4Om1hbmlmZXN0XCIsbWlkLChlcnIscmVzdWx0MSk9PntcbiAgICAgICAgICAgICAgICAgICAgICAgIGNvbnNvbGUubG9nKCdjaGFuZ2luZyBkb2N1bWVudCcpO1xuICAgICAgICAgICAgICAgICAgICAgICAgY29uc29sZS5sb2coZXJyKTtcbiAgICAgICAgICAgICAgICAgICAgICAgIGNvbnNvbGUubG9nKHJlc3VsdDEpIFxuICAgICAgICAgICAgICAgICAgICAgICAgdGhpcy5teVNlYXJjaC5hZGQodU1hbmlmZXN0Lm1pZCx1TWFuaWZlc3QpOyBcbiAgICAgICAgICAgICAgICAgICAgICAgIHJlc29sdmUocmVzdWx0KTsgXG4gICAgICAgICAgICAgICAgICAgIH0pOyBcbiAgICAgICAgICAgICAgICAgICBcbiAgICAgICAgICAgICAgICB9KTtcbiAgICAgICAgICAgICAgIFxuICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICAvL3dlIGFsc28gbmVlZCB0byB0byB1cGRhdGUgdGhlIGRvY3VtZW50IFxuXG4gICAgICAgICAgICBcbiAgICAgICAgfSlcbiAgICB9XG4gICAgc2hpcE1hbmlmZXN0KG1pZCxhd2IsdXNlcil7XG4gICAgICAgIHJldHVybiBuZXcgUHJvbWlzZSgocmVzb2x2ZSxyZWplY3QpPT57XG4gICAgICAgICAgICBscmVkaXMuaG1zZXQoTUlEX1BSRUZJWCttaWQsIHthd2I6YXdiLHNoaXBEYXRlOm1vbWVudCgpLmZvcm1hdChcIllZWVktTU0tRERcIiksc2hpcHBlZEJ5OnVzZXJ9KS50aGVuKChzcmVzdWx0KT0+e1xuICAgICAgICAgICAgICAgIGNvbnNvbGUubG9nKHNyZXN1bHQpO1xuICAgICAgICAgICAgICAgIHRoaXMuY2hhbmdlU3RhZ2UobWlkLDMpLnRoZW4oKHJlc3UpPT57XG4gICAgICAgICAgICAgICAgICAgIHJlc29sdmUoc3Jlc3VsdCk7XG4gICAgICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICAgICAgXG4gICAgICAgICAgICB9KVxuICAgICAgICB9KVxuICAgIH1cbiAgICBsaXN0TWFuaWZlc3QodHlwZSxwYWdlLHBhZ2VTaXplKXtcbiAgICAgICAgcmV0dXJuIG5ldyBQcm9taXNlKChyZXNvbHZlLHJlamVjdCk9PntcbiAgICAgICAgICAgIHZhciBvZmZzZXRWYWwgPSAocGFnZSAtIDEpICogcGFnZVNpemU7XG4gICAgICAgICAgICBjb25zb2xlLmxvZygnb2Zmc2V0ICcrb2Zmc2V0VmFsKTtcbiAgICAgICAgICAgIFxuICAgICAgICAgICAgdGhpcy5teVNlYXJjaC5zZWFyY2goXCJAbXR5cGVJZDpcIit0eXBlLCB7XG4gICAgICAgICAgICAgICAgb2Zmc2V0Om9mZnNldFZhbCxcbiAgICAgICAgICAgICAgICBudW1iZXJPZlJlc3VsdHM6IHBhZ2VTaXplLFxuICAgICAgICAgICAgICAgIHNvcnRCeTogXCJtaWRcIixcbiAgICAgICAgICAgICAgICBkaXI6IFwiREVTQ1wiXG4gICAgICAgICAgICB9LCAocjEsIGRhdGEpID0+IHtcbiAgICAgICAgICAgICAgICBpZiAocjEpXG4gICAgICAgICAgICAgICAgICAgIGNvbnNvbGUubG9nKHIxKTtcbiAgICAgICAgICAgICAgICAgdmFyIG1hbmlmZXN0TGlzdCA9IFtdOyBcbiAgICAgICAgICAgICAgICAgZGF0YS5yZXN1bHRzLmZvckVhY2gobWFuaWZlc3RSZXN1bHQgPT4ge1xuICAgICAgICAgICAgICAgICAgICBtYW5pZmVzdExpc3QucHVzaChtYW5pZmVzdFJlc3VsdC5kb2MpOyAgICBcbiAgICAgICAgICAgICAgICAgICAgXG4gICAgICAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgICAgICAvL2NvbnNvbGUubG9nKG1hbmlmZXN0TGlzdCk7XG4gICAgICAgICAgICAgICAgIHZhciBwYWdlZERhdGEgPSB7XG4gICAgICAgICAgICAgICAgICAgIG1hbmlmZXN0czptYW5pZmVzdExpc3QsXG4gICAgICAgICAgICAgICAgICAgIHRvdGFsUmVzdWx0cyA6IGRhdGEudG90YWxSZXN1bHRzLFxuICAgICAgICAgICAgICAgICAgICBwYWdlIDogcGFnZSxcbiAgICAgICAgICAgICAgICAgICAgcGFnZVNpemU6IHBhZ2VTaXplLCBcbiAgICAgICAgICAgICAgICAgICAgVG90YWxQYWdlcyA6IChkYXRhLnRvdGFsUmVzdWx0cy9wYWdlU2l6ZSlcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgcmVzb2x2ZShwYWdlZERhdGEpO1xuICAgICAgICAgICAgICAgIGNvbnNvbGUubG9nKG1hbmlmZXN0TGlzdCk7XG4gICAgICAgICAgICAgICAgXG4gICAgICAgICAgICB9KTtcbiAgICAgICAgfSk7XG4gICAgfVxuICAgIGdldE1hbmlmZXN0KG1pZCkge1xuICAgICAgICByZXR1cm4gbHJlZGlzLmhnZXRhbGwoTUlEX1BSRUZJWCttaWQpXG4gICAgfVxuICAgIGRlbGV0ZU1hbmlmZXN0KG1pZCl7XG4gICAgICAgcmV0dXJuIG5ldyBQcm9taXNlKChyZXNvbHZlLHJlamVjdCk9PntcbiAgICAgICAgbHJlZGlzLmNsaWVudC5kZWwoTUlEX1BSRUZJWCttaWQsKGVycixyZXNwKT0+e1xuICAgICAgICAgICAgY29uc29sZS5sb2cocmVzcCk7IFxuICAgICAgICAgICAgdGhpcy5teVNlYXJjaC5kZWxEb2N1bWVudChcImluZGV4Om1hbmlmZXN0XCIsbWlkLChlcnIscmVzdWx0KT0+e1xuICAgICAgICAgICAgICAgIGNvbnNvbGUubG9nKFwiZGVsZXRpbmcgbWlkXCIpOyBcbiAgICAgICAgICAgICAgICBjb25zb2xlLmxvZyhlcnIpOyBcbiAgICAgICAgICAgICAgICBjb25zb2xlLmxvZyhyZXN1bHQpO1xuICAgICAgICAgICAgfSk7IFxuICAgICAgICAgICAgbHJlZGlzLnNyZW0oT1BFTl9NQU5JRkVTVCxtaWQpO1xuICAgICAgICAgICAgcmVzb2x2ZSh7ZGVsZXRlZDp0cnVlfSkgICAgXG4gICAgICAgIH0pXG5cbiAgICAgICB9KTsgXG4gICAgICAgIFxuICAgICAgICBcbiAgICB9XG4gICAgZ2V0TWFuaWZlc3RQcm9jZXNzaW5nKCl7XG4gICAgICAgIHZhciBtc2VhcmNoID0gdGhpcy5teVNlYXJjaDsgXG4gICAgICAgIHJldHVybiBuZXcgUHJvbWlzZSgocmVzb2x2ZSxyZWplY3QpPT57XG4gICAgICAgICAgICB2YXIgb2Zmc2V0VmFsID0wO1xuICAgICAgICAgICAgdmFyIHBhZ2VTaXplID0gMjA7IFxuICAgICAgICAgICAgY29uc29sZS5sb2coJ29mZnNldCAnK29mZnNldFZhbCk7XG4gICAgICAgICAgICB2YXIgbWFuaWZlc3RMaXN0ID0gW107IFxuICAgICAgICAgICAgbXNlYXJjaC5zZWFyY2goYEBzdGFnZUlkOlszIDRdYCwge1xuICAgICAgICAgICAgICAgIG9mZnNldDpvZmZzZXRWYWwsXG4gICAgICAgICAgICAgICAgbnVtYmVyT2ZSZXN1bHRzOiBwYWdlU2l6ZSxcbiAgICAgICAgICAgICAgICBzb3J0Qnk6IFwibWlkXCIsXG4gICAgICAgICAgICAgICAgZGlyOiBcIkRFU0NcIlxuICAgICAgICAgICAgfSwgKHIxLCBkYXRhKSA9PiB7XG4gICAgICAgICAgICAgICAgaWYgKHIxKVxuICAgICAgICAgICAgICAgICAgICBjb25zb2xlLmxvZyhyMSk7XG4gICAgICAgICAgICAgICAgIFxuICAgICAgICAgICAgICAgICBkYXRhLnJlc3VsdHMuZm9yRWFjaChtYW5pZmVzdFJlc3VsdCA9PiB7XG4gICAgICAgICAgICAgICAgICAgIG1hbmlmZXN0TGlzdC5wdXNoKG1hbmlmZXN0UmVzdWx0LmRvYyk7ICAgIFxuICAgICAgICAgICAgICAgICAgICBcbiAgICAgICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICAgICAgIC8vY29uc29sZS5sb2cobWFuaWZlc3RMaXN0KTtcbiAgICAgICAgICAgICAgICAgdmFyIHBhZ2VkRGF0YSA9IHtcbiAgICAgICAgICAgICAgICAgICAgbWFuaWZlc3RzOm1hbmlmZXN0TGlzdCxcbiAgICAgICAgICAgICAgICAgICAgdG90YWxSZXN1bHRzIDogZGF0YS50b3RhbFJlc3VsdHMsXG4gICAgICAgICAgICAgICAgICAgIHBhZ2UgOiAxLFxuICAgICAgICAgICAgICAgICAgICBwYWdlU2l6ZTogcGFnZVNpemUsIFxuICAgICAgICAgICAgICAgICAgICBUb3RhbFBhZ2VzIDogKGRhdGEudG90YWxSZXN1bHRzL3BhZ2VTaXplKVxuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICByZXNvbHZlKHBhZ2VkRGF0YSk7XG4gICAgICAgICAgICAgICAgY29uc29sZS5sb2cobWFuaWZlc3RMaXN0KTtcbiAgICAgICAgICAgICAgICBcbiAgICAgICAgICAgIH0pO1xuICAgICAgICB9KTtcbiAgICB9XG4gICAgXG4gICAgZ2V0VHlwZWJ5SWQgKGlkKXtcbiAgICAgICAgaWYgKGlkID09IDEpe1xuICAgICAgICAgICAgcmV0dXJuIG1hbmlmZXN0VHlwZXMuYWlyO1xuICAgICAgICB9XG4gICAgICAgIGlmIChpZCA9PSAyKXtcbiAgICAgICAgICAgIHJldHVybiBtYW5pZmVzdFR5cGVzLm9jZWFuO1xuICAgICAgICB9XG4gICAgICAgIGlmIChpZCA9PSAzKXtcbiAgICAgICAgICAgIHJldHVybiBtYW5pZmVzdFR5cGVzLmhhem1hdDtcbiAgICAgICAgfVxuICAgICAgICByZXR1cm4gbWFuaWZlc3RUeXBlcy5haXI7IFxuICAgIH1cbiAgICBnZXRTdGFnZUJ5SWQoaWQpe1xuICAgICAgICBpZiAoaWQgPT0gMSl7XG4gICAgICAgICAgICByZXR1cm4gbWFuaWZlc3RTdGFnZXMub3BlbjtcbiAgICAgICAgfVxuICAgICAgICBpZiAoaWQgPT0gMil7XG4gICAgICAgICAgICByZXR1cm4gbWFuaWZlc3RTdGFnZXMuY2xvc2VkO1xuICAgICAgICB9XG4gICAgICAgIGlmIChpZCA9PSAzKXtcbiAgICAgICAgICAgIHJldHVybiBtYW5pZmVzdFN0YWdlcy5zaGlwcGVkO1xuICAgICAgICB9XG4gICAgICAgIGlmIChpZCA9PSA0KXtcbiAgICAgICAgICAgIHJldHVybiBtYW5pZmVzdFN0YWdlcy52ZXJpZmllZDtcbiAgICAgICAgfVxuICAgICAgICByZXR1cm4gbWFuaWZlc3RTdGFnZXMub3BlbjsgXG4gICAgfVxufSJdfQ==
