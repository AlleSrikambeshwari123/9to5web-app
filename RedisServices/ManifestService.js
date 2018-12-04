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
                clientOptions: {
                    'host': 'redis-14897.c2822.us-east-1-mz.ec2.cloud.rlrcp.com',
                    'port': '14897',
                    auth_pass: 't5atRuWQlOW7Vp2uhZpQivcIotDmTPpl'
                }
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
//# sourceMappingURL=data:application/json;charset=utf8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIlJlZGlzU2VydmljZXMvTWFuaWZlc3RTZXJ2aWNlLmVzNiJdLCJuYW1lcyI6WyJyZWRpcyIsInJlcXVpcmUiLCJscmVkaXMiLCJtb21lbnQiLCJyZWRpc1NlYXJjaCIsIk1JRF9DT1VOVEVSIiwiTUlEX1BSRUZJWCIsIk1JRF9JTkRFWCIsIk9QRU5fTUFOSUZFU1QiLCJDTE9TRURfTUFOSUZFU1QiLCJTSElQUEVEX01BTklGRVNUIiwiVkVSSUZJRURfTUFOSUZFU1QiLCJtYW5pZmVzdFR5cGVzIiwiYWlyIiwiaWQiLCJ0aXRsZSIsInByZWZpeCIsIm9jZWFuIiwiaGF6bWF0IiwibWFuaWZlc3RTdGFnZXMiLCJvcGVuIiwiY2xvc2VkIiwic2hpcHBlZCIsInZlcmlmaWVkIiwiTWFuaWZlc3RTZXJ2aWNlIiwicmVkaXNDbGllbnQiLCJjbGllbnQiLCJtdHlwZXMiLCJtc3RhZ2VzIiwiY2hlY2tTZXR1cCIsInNldHVwSW5kZXgiLCJteVNlYXJjaCIsImNsaWVudE9wdGlvbnMiLCJhdXRoX3Bhc3MiLCJleGlzdHMiLCJlcnIiLCJyZXMiLCJzZXQiLCJteXR5cGVzIiwidHlwZUlkIiwiUHJvbWlzZSIsInJlc29sdmUiLCJyZWplY3QiLCJjb25zb2xlIiwibG9nIiwic2VhcmNoIiwib2Zmc2V0IiwibnVtYmVyT2ZSZXN1bHRzIiwic29ydEJ5IiwiZGlyIiwicjEiLCJkYXRhIiwidG90YWxSZXN1bHRzIiwidHlwZSIsInVzZXIiLCJnZXRPcGVuTWFuaWZlc3QiLCJ0aGVuIiwib3BlbkNvdW50IiwibXVsdGkiLCJpbmNyIiwiZXhlYyIsInJlc3AiLCJtYW5pZmVzdCIsIm1pZCIsImRhdGVDcmVhdGVkIiwiZm9ybWF0IiwibXR5cGVJZCIsInN0YWdlSWQiLCJzdGFnZSIsImNyZWF0ZWRCeSIsImhtc2V0Iiwic2FkZCIsInJlc3VsdHMiLCJhZGQiLCJjYXRjaCIsInN0YWdlcyIsInJlc3VsdCIsImdldFN0YWdlQnlJZCIsInJlc3VsdDIiLCJoZ2V0YWxsIiwidU1hbmlmZXN0IiwiZGVsRG9jdW1lbnQiLCJyZXN1bHQxIiwiYXdiIiwic2hpcERhdGUiLCJzaGlwcGVkQnkiLCJzcmVzdWx0IiwiY2hhbmdlU3RhZ2UiLCJyZXN1IiwicGFnZSIsInBhZ2VTaXplIiwib2Zmc2V0VmFsIiwibWFuaWZlc3RMaXN0IiwiZm9yRWFjaCIsInB1c2giLCJtYW5pZmVzdFJlc3VsdCIsImRvYyIsInBhZ2VkRGF0YSIsIm1hbmlmZXN0cyIsIlRvdGFsUGFnZXMiLCJkZWwiLCJzcmVtIiwiZGVsZXRlZCIsIm1zZWFyY2giXSwibWFwcGluZ3MiOiI7Ozs7Ozs7Ozs7QUFBQSxJQUFJQSxRQUFRQyxRQUFRLE9BQVIsQ0FBWjtBQUNBLElBQUlDLFNBQVNELFFBQVEsNkJBQVIsQ0FBYjtBQUNBLElBQUlFLFNBQVNGLFFBQVEsUUFBUixDQUFiO0FBQ0EsSUFBSUcsY0FBY0gsUUFBUSxxQkFBUixDQUFsQjtBQUNBLElBQU1JLGNBQWMsbUJBQXBCO0FBQ0EsSUFBTUMsYUFBYSxlQUFuQjtBQUNBLElBQU1DLFlBQVksZ0JBQWxCO0FBQ0EsSUFBTUMsZ0JBQWdCLGVBQXRCO0FBQ0EsSUFBTUMsa0JBQWtCLGlCQUF4QjtBQUNBLElBQU1DLG1CQUFtQixrQkFBekI7QUFDQSxJQUFNQyxvQkFBb0IsbUJBQTFCLEMsQ0FBK0M7O0FBRS9DLElBQUlDLGdCQUFnQjtBQUNoQkMsU0FBSztBQUNEQyxZQUFJLENBREg7QUFFREMsZUFBTyxXQUZOO0FBR0RDLGdCQUFRO0FBSFAsS0FEVztBQU1oQkMsV0FBTztBQUNISCxZQUFJLENBREQ7QUFFSEMsZUFBTyxPQUZKO0FBR0hDLGdCQUFRO0FBSEwsS0FOUztBQVdoQkUsWUFBUTtBQUNKSixZQUFJLENBREE7QUFFSkMsZUFBTyxRQUZIO0FBR0pDLGdCQUFRO0FBSEo7QUFYUSxDQUFwQjtBQWlCQSxJQUFJRyxpQkFBaUI7QUFDakJDLFVBQU07QUFDRk4sWUFBSSxDQURGO0FBRUZDLGVBQU87QUFGTCxLQURXO0FBS2pCTSxZQUFRO0FBQ0pQLFlBQUksQ0FEQTtBQUVKQyxl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cUIsT0FBYixDQUFxQiwwQkFBa0I7QUFDcENELHFDQUFhRSxJQUFiLENBQWtCQyxlQUFlQyxHQUFqQztBQUVGLHFCQUhEO0FBSUE7QUFDQSx3QkFBSUMsWUFBWTtBQUNiQyxtQ0FBVU4sWUFERztBQUVieEMsc0NBQWVELEtBQUtDLFlBRlA7QUFHYnFDLDhCQUFPLENBSE07QUFJYkMsa0NBQVVBLFFBSkc7QUFLYlMsb0NBQWNoRCxLQUFLQyxZQUFMLEdBQWtCc0M7QUFMbkIscUJBQWhCO0FBT0RqRCw0QkFBUXdELFNBQVI7QUFDQXRELDRCQUFRQyxHQUFSLENBQVlnRCxZQUFaO0FBRUgsaUJBeEJEO0FBeUJILGFBOUJNLENBQVA7QUErQkg7OztvQ0FFWTlFLEUsRUFBRztBQUNaLGdCQUFJQSxNQUFNLENBQVYsRUFBWTtBQUNSLHVCQUFPRixjQUFjQyxHQUFyQjtBQUNIO0FBQ0QsZ0JBQUlDLE1BQU0sQ0FBVixFQUFZO0FBQ1IsdUJBQU9GLGNBQWNLLEtBQXJCO0FBQ0g7QUFDRCxnQkFBSUgsTUFBTSxDQUFWLEVBQVk7QUFDUix1QkFBT0YsY0FBY00sTUFBckI7QUFDSDtBQUNELG1CQUFPTixjQUFjQyxHQUFyQjtBQUNIOzs7cUNBQ1lDLEUsRUFBRztBQUNaLGdCQUFJQSxNQUFNLENBQVYsRUFBWTtBQUNSLHVCQUFPSyxlQUFlQyxJQUF0QjtBQUNIO0FBQ0QsZ0JBQUlOLE1BQU0sQ0FBVixFQUFZO0FBQ1IsdUJBQU9LLGVBQWVFLE1BQXRCO0FBQ0g7QUFDRCxnQkFBSVAsTUFBTSxDQUFWLEVBQVk7QUFDUix1QkFBT0ssZUFBZUcsT0FBdEI7QUFDSDtBQUNELGdCQUFJUixNQUFNLENBQVYsRUFBWTtBQUNSLHVCQUFPSyxlQUFlSSxRQUF0QjtBQUNIO0FBQ0QsbUJBQU9KLGVBQWVDLElBQXRCO0FBQ0giLCJmaWxlIjoiUmVkaXNTZXJ2aWNlcy9NYW5pZmVzdFNlcnZpY2UuanMiLCJzb3VyY2VzQ29udGVudCI6WyJ2YXIgcmVkaXMgPSByZXF1aXJlKCdyZWRpcycpO1xyXG52YXIgbHJlZGlzID0gcmVxdWlyZSgnLi4vRGF0YVNlcnZpY2VzL3JlZGlzLWxvY2FsJyk7XHJcbnZhciBtb21lbnQgPSByZXF1aXJlKCdtb21lbnQnKTtcclxudmFyIHJlZGlzU2VhcmNoID0gcmVxdWlyZSgnLi4vcmVkaXNlYXJjaGNsaWVudCcpO1xyXG5jb25zdCBNSURfQ09VTlRFUiA9IFwiZ2xvYmFsOm1pZENvdW50ZXJcIjtcclxuY29uc3QgTUlEX1BSRUZJWCA9IFwidGV3Om1hbmlmZXN0OlwiO1xyXG5jb25zdCBNSURfSU5ERVggPSBcImluZGV4Om1hbmlmZXN0XCI7XHJcbmNvbnN0IE9QRU5fTUFOSUZFU1QgPSBcIm1hbmlmZXN0Om9wZW5cIjtcclxuY29uc3QgQ0xPU0VEX01BTklGRVNUID0gXCJtYW5pZmVzdDpjbG9zZWRcIlxyXG5jb25zdCBTSElQUEVEX01BTklGRVNUID0gXCJtYW5pZmVzdDpzaGlwcGVkXCJcclxuY29uc3QgVkVSSUZJRURfTUFOSUZFU1QgPSBcIm1hbmlmZXN0OnZlcmlmaWVkXCI7IC8vIG1hbmlmZXN0IHRoYXQgaGF2ZSBkdXRpZXMgdmVyaWZpZWRcclxuXHJcbnZhciBtYW5pZmVzdFR5cGVzID0ge1xyXG4gICAgYWlyOiB7XHJcbiAgICAgICAgaWQ6IDEsXHJcbiAgICAgICAgdGl0bGU6IFwiQWlyIENhcmdvXCIsXHJcbiAgICAgICAgcHJlZml4OiBcIk0tXCJcclxuICAgIH0sXHJcbiAgICBvY2Vhbjoge1xyXG4gICAgICAgIGlkOiAyLFxyXG4gICAgICAgIHRpdGxlOiBcIk9jZWFuXCIsXHJcbiAgICAgICAgcHJlZml4OiBcIlMtXCJcclxuICAgIH0sXHJcbiAgICBoYXptYXQ6IHtcclxuICAgICAgICBpZDogMyxcclxuICAgICAgICB0aXRsZTogXCJIQVpNQVRcIixcclxuICAgICAgICBwcmVmaXg6IFwiSC1cIlxyXG4gICAgfVxyXG59XHJcbnZhciBtYW5pZmVzdFN0YWdlcyA9IHtcclxuICAgIG9wZW46IHtcclxuICAgICAgICBpZDogMSxcclxuICAgICAgICB0aXRsZTogJ09wZW4nXHJcbiAgICB9LFxyXG4gICAgY2xvc2VkOiB7XHJcbiAgICAgICAgaWQ6IDIsXHJcbiAgICAgICAgdGl0bGU6ICdDbG9zZWQnXHJcbiAgICB9LFxyXG4gICAgc2hpcHBlZDoge1xyXG4gICAgICAgIGlkOiAzLFxyXG4gICAgICAgIHRpdGxlOiAnU2hpcHBlZCdcclxuICAgIH0sXHJcbiAgICB2ZXJpZmllZDoge1xyXG4gICAgICAgIGlkOiA0LFxyXG4gICAgICAgIHRpdGxlOiAnVmVyaWZpZWQnXHJcbiAgICB9XHJcblxyXG59XHJcblxyXG5leHBvcnQgY2xhc3MgTWFuaWZlc3RTZXJ2aWNlIHtcclxuXHJcbiAgICBjb25zdHJ1Y3RvcigpIHsgICAgICAgIFxyXG4gICAgICAgIHRoaXMucmVkaXNDbGllbnQgPSBscmVkaXMuY2xpZW50O1xyXG4gICAgICAgIHRoaXMubXR5cGVzID0gbWFuaWZlc3RUeXBlcztcclxuICAgICAgICB0aGlzLm1zdGFnZXMgPSBtYW5pZmVzdFN0YWdlcztcclxuICAgICAgICAvL2NoZWNrIHRvIGVuc3VyZSB3ZSBoYXZlIHRoZSBtYW5pZmVzdCBjb3VudGVyIFxyXG4gICAgICAgIHRoaXMuY2hlY2tTZXR1cCgpOyBcclxuICAgICAgICB0aGlzLnNldHVwSW5kZXgoKVxyXG4gICAgfVxyXG4gICAgc2V0dXBJbmRleCgpe1xyXG4gICAgICAgIHRoaXMubXlTZWFyY2ggPSByZWRpc1NlYXJjaChyZWRpcywgJ2luZGV4Om1hbmlmZXN0Jywge1xyXG4gICAgICAgICAgICBjbGllbnRPcHRpb25zOiB7XHJcbiAgICAgICAgICAgICAgICAnaG9zdCc6ICdyZWRpcy0xNDg5Ny5jMjgyMi51cy1lYXN0LTEtbXouZWMyLmNsb3VkLnJscmNwLmNvbScsXHJcbiAgICAgICAgICAgICAgICAncG9ydCc6ICcxNDg5NycsXHJcbiAgICAgICAgICAgICAgICBhdXRoX3Bhc3M6ICd0NWF0UnVXUWxPVzdWcDJ1aFpwUWl2Y0lvdERtVFBwbCdcclxuICAgICAgICAgICAgfVxyXG4gICAgICAgIH0pO1xyXG4gICAgfVxyXG4gICAgY2hlY2tTZXR1cCgpe1xyXG4gICAgICAgIHRoaXMucmVkaXNDbGllbnQuZXhpc3RzKE1JRF9DT1VOVEVSLCAoZXJyLCByZXMpID0+IHtcclxuICAgICAgICAgICAgaWYgKHJlcyA9PSAwKSB7XHJcbiAgICAgICAgICAgICAgICAvL2NyZWF0ZSB0aGUgbWFuaWZlc3QgXHJcbiAgICAgICAgICAgICAgICBscmVkaXMuc2V0KE1JRF9DT1VOVEVSLCAxMDApO1xyXG4gICAgICAgICAgICB9XHJcbiAgICAgICAgICAgIFxyXG4gICAgICAgIH0pO1xyXG4gICAgfVxyXG5cclxuICAgIGdldFR5cGVzKCkge1xyXG4gICAgICAgIHJldHVybiB0aGlzLm15dHlwZXNcclxuICAgIH1cclxuICAgIGdldFN0YWdlcygpIHtcclxuICAgICAgICByZXR1cm4gdGhpcy5tYW5pZmVzdFN0YWdlcztcclxuICAgIH1cclxuXHJcbiAgICBnZXRPcGVuTWFuaWZlc3QodHlwZUlkKXtcclxuICAgICAgICBcclxuICAgICAgICByZXR1cm4gbmV3IFByb21pc2UoKHJlc29sdmUscmVqZWN0KT0+e1xyXG4gICAgICAgICAgIGNvbnNvbGUubG9nKCBgQHN0YWdlSWQ6WyR7dHlwZUlkfSAke3R5cGVJZH1dIEBtdHlwZUlkOiR7dHlwZUlkfWApO1xyXG4gICAgICAgICAgICB0aGlzLm15U2VhcmNoLnNlYXJjaChgQHN0YWdlSWQ6WzEgMV0gQG10eXBlSWQ6JHt0eXBlSWR9YCwge1xyXG4gICAgICAgICAgICAgICAgb2Zmc2V0OjAsXHJcbiAgICAgICAgICAgICAgICBudW1iZXJPZlJlc3VsdHM6IDEwMCxcclxuICAgICAgICAgICAgICAgIHNvcnRCeTogXCJtaWRcIixcclxuICAgICAgICAgICAgICAgIGRpcjogXCJERVNDXCJcclxuICAgICAgICAgICAgfSwgKHIxLCBkYXRhKSA9PiB7XHJcbiAgICAgICAgICAgICAgICBpZiAocjEpXHJcbiAgICAgICAgICAgICAgICAge1xyXG4gICAgICAgICAgICAgICAgICAgICBjb25zb2xlLmxvZygnd2UgaGFkIGFuIGVycm9yJylcclxuICAgICAgICAgICAgICAgICAgICBjb25zb2xlLmxvZyhyMSk7XHJcbiAgICAgICAgICAgICAgICAgICAgXHJcbiAgICAgICAgICAgICAgICAgfSAgIFxyXG4gICAgICAgICAgICAgICAgIGNvbnNvbGUubG9nKCdubyBlcnJvcnMgZGV0ZWN0ZWQgaGVyZSAuLi4nKVxyXG4gICAgICAgICAgICAgICAgIC8vY29uc29sZS5sb2cobWFuaWZlc3RMaXN0KTtcclxuICAgICAgICAgICAgICAgICBjb25zb2xlLmxvZyhkYXRhKTtcclxuICAgICAgICAgICAgICAgIHJlc29sdmUoZGF0YS50b3RhbFJlc3VsdHMpO1xyXG4gICAgICAgICAgICB9KTtcclxuICAgICAgICAgICAgXHJcbiAgICAgICAgfSk7XHJcbiAgICAgICAgXHJcbiAgICB9XHJcbiAgICBjcmVhdGVOZXdNYW5pZmVzdCh0eXBlLCB1c2VyKSB7XHJcbiAgICAgICAgLy93ZSBoYXZlIHNvbWUgcnVsZXMgdG8gZm9sbG93IGhlcmUgXHJcbiAgICAgICAgLy8xLiBhIG5ldyBtYW5pZmVzdCBjYW5ub3QgYmUgY3JlYXRlZCBpZiB0aGUgcHJldmlvdXMgbWFuaWZlc3QgaXMgbm90IGNsb3NlZCBcclxuICAgICAgICAvL2NoZWNrIGZvciBvcGVuIG1hbmlmZXN0IGZpcnN0IFxyXG4gICAgICAgIHJldHVybiBuZXcgUHJvbWlzZSgocmVzb2x2ZSwgcmVqZWN0KSA9PiB7XHJcbiAgICAgICAgICAgIHRoaXMuZ2V0T3Blbk1hbmlmZXN0KHR5cGUuaWQpLnRoZW4oKG9wZW5Db3VudCkgPT4ge1xyXG4gICAgICAgICAgICAgIFxyXG4gICAgICAgICAgICAgICAgY29uc29sZS5sb2codHlwZSk7IFxyXG4gICAgICAgICAgICAgICAgaWYgKG9wZW5Db3VudD4wKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgLy93ZSBjYW4ndCBhZGQgdGhlIG1hbmlmZXN0IHJlamVjdCBcclxuICAgICAgICAgICAgICAgICAgICByZWplY3Qoe1xyXG4gICAgICAgICAgICAgICAgICAgICAgICBcIm1lc3NhZ2VcIjogXCJUaGVyZSBpcyBhbiBvcGVuIG1hbmlmZXN0IFBsZWFzZSBjbG9zZSBpdCBiZWZvcmUgY3JlYXRpbmcgYSBuZXcgbWFuaWZlc3QuXCJcclxuICAgICAgICAgICAgICAgICAgICB9KTtcclxuXHJcbiAgICAgICAgICAgICAgICB9IGVsc2Uge1xyXG4gICAgICAgICAgICAgICAgICAgIHRoaXMucmVkaXNDbGllbnQubXVsdGkoKVxyXG4gICAgICAgICAgICAgICAgICAgICAgICAuaW5jcihNSURfQ09VTlRFUilcclxuICAgICAgICAgICAgICAgICAgICAgICAgLmV4ZWMoKGVyciwgcmVzcCkgPT4ge1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgY29uc29sZS5sb2cocmVzcCk7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICB2YXIgbWFuaWZlc3QgPSB7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgbWlkOiByZXNwWzBdLFxyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHRpdGxlOiB0eXBlLnByZWZpeCtyZXNwWzBdLFxyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGRhdGVDcmVhdGVkOiBtb21lbnQoKS5mb3JtYXQoXCJZWVlZLU1NLUREXCIpLFxyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIG10eXBlSWQ6IHR5cGUuaWQsXHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgc3RhZ2VJZDogbWFuaWZlc3RTdGFnZXMub3Blbi5pZCxcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBzdGFnZTogbWFuaWZlc3RTdGFnZXMub3Blbi50aXRsZSxcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBjcmVhdGVkQnk6IHVzZXJcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIH07XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICB0aGlzLnJlZGlzQ2xpZW50Lm11bHRpKClcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAuaG1zZXQoTUlEX1BSRUZJWCArIG1hbmlmZXN0Lm1pZCwgbWFuaWZlc3QpXHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgLnNhZGQoT1BFTl9NQU5JRkVTVCwgbWFuaWZlc3QubWlkKVxyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIC5leGVjKChlcnIsIHJlc3VsdHMpID0+IHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgdGhpcy5teVNlYXJjaC5hZGQobWFuaWZlc3QubWlkLG1hbmlmZXN0KTtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgLy9hbHNvIGFkZCB0byB0aGUgaW5kZXggaGVyZSBvbmUgdGltZSBcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgaWYgKGVycikge1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgcmVqZWN0KGVycik7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIH0gZWxzZSB7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICByZXNvbHZlKG1hbmlmZXN0KVxyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgfSk7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIH0pO1xyXG4gICAgICAgICAgICAgICAgfVxyXG5cclxuICAgICAgICAgICAgfSkuY2F0Y2goKGVycik9PntcclxuICAgICAgICAgICAgICAgIGNvbnNvbGUubG9nKFwiZXJyIGRldGVjdGVkXCIpOyBcclxuICAgICAgICAgICAgICAgIGNvbnNvbGUubG9nKGVycik7XHJcbiAgICAgICAgICAgIH0pO1xyXG5cclxuICAgICAgICB9KTtcclxuXHJcbiAgICB9XHJcbiAgICBjaGFuZ2VTdGFnZShtaWQsIHN0YWdlcykge1xyXG4gICAgICAgIHJldHVybiBuZXcgUHJvbWlzZSgocmVzb2x2ZSwgcmVqZWN0KSA9PiB7XHJcbiAgICAgICAgICAgIFxyXG4gICAgICAgICAgICBscmVkaXMuY2xpZW50Lmhtc2V0KE1JRF9QUkVGSVgrbWlkLFwic3RhZ2VJZFwiLHN0YWdlcywoZXJyLHJlc3VsdCk9PntcclxuICAgICAgICAgICAgICAgIHZhciBzdGFnZSA9IHRoaXMuZ2V0U3RhZ2VCeUlkKHN0YWdlcyk7IFxyXG4gICAgICAgICAgICAgICAgY29uc29sZS5sb2coJ2xvb2tlZCB1cCB0aGUgc3RhZ2UgJytzdGFnZS50aXRsZSk7XHJcbiAgICAgICAgICAgICAgICBscmVkaXMuY2xpZW50Lmhtc2V0KE1JRF9QUkVGSVgrbWlkLFwic3RhZ2VcIixzdGFnZS50aXRsZSwoZXJyLHJlc3VsdDIpPT57fSk7IFxyXG4gICAgICAgICAgICAgICAgbHJlZGlzLmhnZXRhbGwoTUlEX1BSRUZJWCttaWQpLnRoZW4oKHVNYW5pZmVzdCk9PntcclxuICAgICAgICAgICAgICAgICAgICB0aGlzLm15U2VhcmNoLmRlbERvY3VtZW50KFwiaW5kZXg6bWFuaWZlc3RcIixtaWQsKGVycixyZXN1bHQxKT0+e1xyXG4gICAgICAgICAgICAgICAgICAgICAgICBjb25zb2xlLmxvZygnY2hhbmdpbmcgZG9jdW1lbnQnKTtcclxuICAgICAgICAgICAgICAgICAgICAgICAgY29uc29sZS5sb2coZXJyKTtcclxuICAgICAgICAgICAgICAgICAgICAgICAgY29uc29sZS5sb2cocmVzdWx0MSkgXHJcbiAgICAgICAgICAgICAgICAgICAgICAgIHRoaXMubXlTZWFyY2guYWRkKHVNYW5pZmVzdC5taWQsdU1hbmlmZXN0KTsgXHJcbiAgICAgICAgICAgICAgICAgICAgICAgIHJlc29sdmUocmVzdWx0KTsgXHJcbiAgICAgICAgICAgICAgICAgICAgfSk7IFxyXG4gICAgICAgICAgICAgICAgICAgXHJcbiAgICAgICAgICAgICAgICB9KTtcclxuICAgICAgICAgICAgICAgXHJcbiAgICAgICAgICAgIH0pO1xyXG4gICAgICAgICAgICAvL3dlIGFsc28gbmVlZCB0byB0byB1cGRhdGUgdGhlIGRvY3VtZW50IFxyXG5cclxuICAgICAgICAgICAgXHJcbiAgICAgICAgfSlcclxuICAgIH1cclxuICAgIHNoaXBNYW5pZmVzdChtaWQsYXdiLHVzZXIpe1xyXG4gICAgICAgIHJldHVybiBuZXcgUHJvbWlzZSgocmVzb2x2ZSxyZWplY3QpPT57XHJcbiAgICAgICAgICAgIGxyZWRpcy5obXNldChNSURfUFJFRklYK21pZCwge2F3Yjphd2Isc2hpcERhdGU6bW9tZW50KCkuZm9ybWF0KFwiWVlZWS1NTS1ERFwiKSxzaGlwcGVkQnk6dXNlcn0pLnRoZW4oKHNyZXN1bHQpPT57XHJcbiAgICAgICAgICAgICAgICBjb25zb2xlLmxvZyhzcmVzdWx0KTtcclxuICAgICAgICAgICAgICAgIHRoaXMuY2hhbmdlU3RhZ2UobWlkLDMpLnRoZW4oKHJlc3UpPT57XHJcbiAgICAgICAgICAgICAgICAgICAgcmVzb2x2ZShzcmVzdWx0KTtcclxuICAgICAgICAgICAgICAgIH0pO1xyXG4gICAgICAgICAgICAgICAgXHJcbiAgICAgICAgICAgIH0pXHJcbiAgICAgICAgfSlcclxuICAgIH1cclxuICAgIGxpc3RNYW5pZmVzdCh0eXBlLHBhZ2UscGFnZVNpemUpe1xyXG4gICAgICAgIHJldHVybiBuZXcgUHJvbWlzZSgocmVzb2x2ZSxyZWplY3QpPT57XHJcbiAgICAgICAgICAgIHZhciBvZmZzZXRWYWwgPSAocGFnZSAtIDEpICogcGFnZVNpemU7XHJcbiAgICAgICAgICAgIGNvbnNvbGUubG9nKCdvZmZzZXQgJytvZmZzZXRWYWwpO1xyXG4gICAgICAgICAgICBcclxuICAgICAgICAgICAgdGhpcy5teVNlYXJjaC5zZWFyY2goXCJAbXR5cGVJZDpcIit0eXBlLCB7XHJcbiAgICAgICAgICAgICAgICBvZmZzZXQ6b2Zmc2V0VmFsLFxyXG4gICAgICAgICAgICAgICAgbnVtYmVyT2ZSZXN1bHRzOiBwYWdlU2l6ZSxcclxuICAgICAgICAgICAgICAgIHNvcnRCeTogXCJtaWRcIixcclxuICAgICAgICAgICAgICAgIGRpcjogXCJERVNDXCJcclxuICAgICAgICAgICAgfSwgKHIxLCBkYXRhKSA9PiB7XHJcbiAgICAgICAgICAgICAgICBpZiAocjEpXHJcbiAgICAgICAgICAgICAgICAgICAgY29uc29sZS5sb2cocjEpO1xyXG4gICAgICAgICAgICAgICAgIHZhciBtYW5pZmVzdExpc3QgPSBbXTsgXHJcbiAgICAgICAgICAgICAgICAgZGF0YS5yZXN1bHRzLmZvckVhY2gobWFuaWZlc3RSZXN1bHQgPT4ge1xyXG4gICAgICAgICAgICAgICAgICAgIG1hbmlmZXN0TGlzdC5wdXNoKG1hbmlmZXN0UmVzdWx0LmRvYyk7ICAgIFxyXG4gICAgICAgICAgICAgICAgICAgIFxyXG4gICAgICAgICAgICAgICAgIH0pO1xyXG4gICAgICAgICAgICAgICAgIC8vY29uc29sZS5sb2cobWFuaWZlc3RMaXN0KTtcclxuICAgICAgICAgICAgICAgICB2YXIgcGFnZWREYXRhID0ge1xyXG4gICAgICAgICAgICAgICAgICAgIG1hbmlmZXN0czptYW5pZmVzdExpc3QsXHJcbiAgICAgICAgICAgICAgICAgICAgdG90YWxSZXN1bHRzIDogZGF0YS50b3RhbFJlc3VsdHMsXHJcbiAgICAgICAgICAgICAgICAgICAgcGFnZSA6IHBhZ2UsXHJcbiAgICAgICAgICAgICAgICAgICAgcGFnZVNpemU6IHBhZ2VTaXplLCBcclxuICAgICAgICAgICAgICAgICAgICBUb3RhbFBhZ2VzIDogKGRhdGEudG90YWxSZXN1bHRzL3BhZ2VTaXplKVxyXG4gICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICAgICAgcmVzb2x2ZShwYWdlZERhdGEpO1xyXG4gICAgICAgICAgICAgICAgY29uc29sZS5sb2cobWFuaWZlc3RMaXN0KTtcclxuICAgICAgICAgICAgICAgIFxyXG4gICAgICAgICAgICB9KTtcclxuICAgICAgICB9KTtcclxuICAgIH1cclxuICAgIGdldE1hbmlmZXN0KG1pZCkge1xyXG4gICAgICAgIHJldHVybiBscmVkaXMuaGdldGFsbChNSURfUFJFRklYK21pZClcclxuICAgIH1cclxuICAgIGRlbGV0ZU1hbmlmZXN0KG1pZCl7XHJcbiAgICAgICByZXR1cm4gbmV3IFByb21pc2UoKHJlc29sdmUscmVqZWN0KT0+e1xyXG4gICAgICAgIGxyZWRpcy5jbGllbnQuZGVsKE1JRF9QUkVGSVgrbWlkLChlcnIscmVzcCk9PntcclxuICAgICAgICAgICAgY29uc29sZS5sb2cocmVzcCk7IFxyXG4gICAgICAgICAgICB0aGlzLm15U2VhcmNoLmRlbERvY3VtZW50KFwiaW5kZXg6bWFuaWZlc3RcIixtaWQsKGVycixyZXN1bHQpPT57XHJcbiAgICAgICAgICAgICAgICBjb25zb2xlLmxvZyhcImRlbGV0aW5nIG1pZFwiKTsgXHJcbiAgICAgICAgICAgICAgICBjb25zb2xlLmxvZyhlcnIpOyBcclxuICAgICAgICAgICAgICAgIGNvbnNvbGUubG9nKHJlc3VsdCk7XHJcbiAgICAgICAgICAgIH0pOyBcclxuICAgICAgICAgICAgbHJlZGlzLnNyZW0oT1BFTl9NQU5JRkVTVCxtaWQpO1xyXG4gICAgICAgICAgICByZXNvbHZlKHtkZWxldGVkOnRydWV9KSAgICBcclxuICAgICAgICB9KVxyXG5cclxuICAgICAgIH0pOyBcclxuICAgICAgICBcclxuICAgICAgICBcclxuICAgIH1cclxuICAgIGdldE1hbmlmZXN0UHJvY2Vzc2luZygpe1xyXG4gICAgICAgIHZhciBtc2VhcmNoID0gdGhpcy5teVNlYXJjaDsgXHJcbiAgICAgICAgcmV0dXJuIG5ldyBQcm9taXNlKChyZXNvbHZlLHJlamVjdCk9PntcclxuICAgICAgICAgICAgdmFyIG9mZnNldFZhbCA9MDtcclxuICAgICAgICAgICAgdmFyIHBhZ2VTaXplID0gMjA7IFxyXG4gICAgICAgICAgICBjb25zb2xlLmxvZygnb2Zmc2V0ICcrb2Zmc2V0VmFsKTtcclxuICAgICAgICAgICAgdmFyIG1hbmlmZXN0TGlzdCA9IFtdOyBcclxuICAgICAgICAgICAgbXNlYXJjaC5zZWFyY2goYEBzdGFnZUlkOlszIDRdYCwge1xyXG4gICAgICAgICAgICAgICAgb2Zmc2V0Om9mZnNldFZhbCxcclxuICAgICAgICAgICAgICAgIG51bWJlck9mUmVzdWx0czogcGFnZVNpemUsXHJcbiAgICAgICAgICAgICAgICBzb3J0Qnk6IFwibWlkXCIsXHJcbiAgICAgICAgICAgICAgICBkaXI6IFwiREVTQ1wiXHJcbiAgICAgICAgICAgIH0sIChyMSwgZGF0YSkgPT4ge1xyXG4gICAgICAgICAgICAgICAgaWYgKHIxKVxyXG4gICAgICAgICAgICAgICAgICAgIGNvbnNvbGUubG9nKHIxKTtcclxuICAgICAgICAgICAgICAgICBcclxuICAgICAgICAgICAgICAgICBkYXRhLnJlc3VsdHMuZm9yRWFjaChtYW5pZmVzdFJlc3VsdCA9PiB7XHJcbiAgICAgICAgICAgICAgICAgICAgbWFuaWZlc3RMaXN0LnB1c2gobWFuaWZlc3RSZXN1bHQuZG9jKTsgICAgXHJcbiAgICAgICAgICAgICAgICAgICAgXHJcbiAgICAgICAgICAgICAgICAgfSk7XHJcbiAgICAgICAgICAgICAgICAgLy9jb25zb2xlLmxvZyhtYW5pZmVzdExpc3QpO1xyXG4gICAgICAgICAgICAgICAgIHZhciBwYWdlZERhdGEgPSB7XHJcbiAgICAgICAgICAgICAgICAgICAgbWFuaWZlc3RzOm1hbmlmZXN0TGlzdCxcclxuICAgICAgICAgICAgICAgICAgICB0b3RhbFJlc3VsdHMgOiBkYXRhLnRvdGFsUmVzdWx0cyxcclxuICAgICAgICAgICAgICAgICAgICBwYWdlIDogMSxcclxuICAgICAgICAgICAgICAgICAgICBwYWdlU2l6ZTogcGFnZVNpemUsIFxyXG4gICAgICAgICAgICAgICAgICAgIFRvdGFsUGFnZXMgOiAoZGF0YS50b3RhbFJlc3VsdHMvcGFnZVNpemUpXHJcbiAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgICAgICByZXNvbHZlKHBhZ2VkRGF0YSk7XHJcbiAgICAgICAgICAgICAgICBjb25zb2xlLmxvZyhtYW5pZmVzdExpc3QpO1xyXG4gICAgICAgICAgICAgICAgXHJcbiAgICAgICAgICAgIH0pO1xyXG4gICAgICAgIH0pO1xyXG4gICAgfVxyXG4gICAgXHJcbiAgICBnZXRUeXBlYnlJZCAoaWQpe1xyXG4gICAgICAgIGlmIChpZCA9PSAxKXtcclxuICAgICAgICAgICAgcmV0dXJuIG1hbmlmZXN0VHlwZXMuYWlyO1xyXG4gICAgICAgIH1cclxuICAgICAgICBpZiAoaWQgPT0gMil7XHJcbiAgICAgICAgICAgIHJldHVybiBtYW5pZmVzdFR5cGVzLm9jZWFuO1xyXG4gICAgICAgIH1cclxuICAgICAgICBpZiAoaWQgPT0gMyl7XHJcbiAgICAgICAgICAgIHJldHVybiBtYW5pZmVzdFR5cGVzLmhhem1hdDtcclxuICAgICAgICB9XHJcbiAgICAgICAgcmV0dXJuIG1hbmlmZXN0VHlwZXMuYWlyOyBcclxuICAgIH1cclxuICAgIGdldFN0YWdlQnlJZChpZCl7XHJcbiAgICAgICAgaWYgKGlkID09IDEpe1xyXG4gICAgICAgICAgICByZXR1cm4gbWFuaWZlc3RTdGFnZXMub3BlbjtcclxuICAgICAgICB9XHJcbiAgICAgICAgaWYgKGlkID09IDIpe1xyXG4gICAgICAgICAgICByZXR1cm4gbWFuaWZlc3RTdGFnZXMuY2xvc2VkO1xyXG4gICAgICAgIH1cclxuICAgICAgICBpZiAoaWQgPT0gMyl7XHJcbiAgICAgICAgICAgIHJldHVybiBtYW5pZmVzdFN0YWdlcy5zaGlwcGVkO1xyXG4gICAgICAgIH1cclxuICAgICAgICBpZiAoaWQgPT0gNCl7XHJcbiAgICAgICAgICAgIHJldHVybiBtYW5pZmVzdFN0YWdlcy52ZXJpZmllZDtcclxuICAgICAgICB9XHJcbiAgICAgICAgcmV0dXJuIG1hbmlmZXN0U3RhZ2VzLm9wZW47IFxyXG4gICAgfVxyXG59Il19
