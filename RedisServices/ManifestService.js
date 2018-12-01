'use strict';

Object.defineProperty(exports, "__esModule", {
    value: true
});

var _createClass = function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; }();

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

var redis = require('redis');
var lredis = require('../DataServices/redis-local');
var moment = require('moment');
var redisSearch = require('redisearchclient');
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
                        console.log('trying to create the manifest........');
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
        key: 'listManifest',
        value: function listManifest(type, page, pageSize) {
            var _this4 = this;

            return new Promise(function (resolve, reject) {
                var offsetVal = (page - 1) * pageSize;
                console.log('offset ' + offsetVal);

                _this4.mySearch.search("@mtypeId:" + type, {
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
            var _this5 = this;

            return new Promise(function (resolve, reject) {
                lredis.client.del(MID_PREFIX + mid, function (err, resp) {
                    console.log(resp);
                    _this5.mySearch.delDocument("index:manifest", mid, function (err, result) {
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
//# sourceMappingURL=data:application/json;charset=utf8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIlJlZGlzU2VydmljZXMvTWFuaWZlc3RTZXJ2aWNlLmVzNiJdLCJuYW1lcyI6WyJyZWRpcyIsInJlcXVpcmUiLCJscmVkaXMiLCJtb21lbnQiLCJyZWRpc1NlYXJjaCIsIk1JRF9DT1VOVEVSIiwiTUlEX1BSRUZJWCIsIk1JRF9JTkRFWCIsIk9QRU5fTUFOSUZFU1QiLCJDTE9TRURfTUFOSUZFU1QiLCJTSElQUEVEX01BTklGRVNUIiwiVkVSSUZJRURfTUFOSUZFU1QiLCJtYW5pZmVzdFR5cGVzIiwiYWlyIiwiaWQiLCJ0aXRsZSIsInByZWZpeCIsIm9jZWFuIiwiaGF6bWF0IiwibWFuaWZlc3RTdGFnZXMiLCJvcGVuIiwiY2xvc2VkIiwic2hpcHBlZCIsInZlcmlmaWVkIiwiTWFuaWZlc3RTZXJ2aWNlIiwicmVkaXNDbGllbnQiLCJjbGllbnQiLCJtdHlwZXMiLCJtc3RhZ2VzIiwiY2hlY2tTZXR1cCIsInNldHVwSW5kZXgiLCJteVNlYXJjaCIsImNsaWVudE9wdGlvbnMiLCJhdXRoX3Bhc3MiLCJleGlzdHMiLCJlcnIiLCJyZXMiLCJzZXQiLCJteXR5cGVzIiwidHlwZUlkIiwiUHJvbWlzZSIsInJlc29sdmUiLCJyZWplY3QiLCJjb25zb2xlIiwibG9nIiwic2VhcmNoIiwib2Zmc2V0IiwibnVtYmVyT2ZSZXN1bHRzIiwic29ydEJ5IiwiZGlyIiwicjEiLCJkYXRhIiwidG90YWxSZXN1bHRzIiwidHlwZSIsInVzZXIiLCJnZXRPcGVuTWFuaWZlc3QiLCJ0aGVuIiwib3BlbkNvdW50IiwibXVsdGkiLCJpbmNyIiwiZXhlYyIsInJlc3AiLCJtYW5pZmVzdCIsIm1pZCIsImRhdGVDcmVhdGVkIiwiZm9ybWF0IiwibXR5cGVJZCIsInN0YWdlSWQiLCJzdGFnZSIsImNyZWF0ZWRCeSIsImhtc2V0Iiwic2FkZCIsInJlc3VsdHMiLCJhZGQiLCJjYXRjaCIsInN0YWdlcyIsInJlc3VsdCIsImdldFN0YWdlQnlJZCIsInJlc3VsdDIiLCJoZ2V0YWxsIiwidU1hbmlmZXN0IiwiZGVsRG9jdW1lbnQiLCJyZXN1bHQxIiwicGFnZSIsInBhZ2VTaXplIiwib2Zmc2V0VmFsIiwibWFuaWZlc3RMaXN0IiwiZm9yRWFjaCIsInB1c2giLCJtYW5pZmVzdFJlc3VsdCIsImRvYyIsInBhZ2VkRGF0YSIsIm1hbmlmZXN0cyIsIlRvdGFsUGFnZXMiLCJkZWwiLCJzcmVtIiwiZGVsZXRlZCJdLCJtYXBwaW5ncyI6Ijs7Ozs7Ozs7OztBQUFBLElBQUlBLFFBQVFDLFFBQVEsT0FBUixDQUFaO0FBQ0EsSUFBSUMsU0FBU0QsUUFBUSw2QkFBUixDQUFiO0FBQ0EsSUFBSUUsU0FBU0YsUUFBUSxRQUFSLENBQWI7QUFDQSxJQUFJRyxjQUFjSCxRQUFRLGtCQUFSLENBQWxCO0FBQ0EsSUFBTUksY0FBYyxtQkFBcEI7QUFDQSxJQUFNQyxhQUFhLGVBQW5CO0FBQ0EsSUFBTUMsWUFBWSxnQkFBbEI7QUFDQSxJQUFNQyxnQkFBZ0IsZUFBdEI7QUFDQSxJQUFNQyxrQkFBa0IsaUJBQXhCO0FBQ0EsSUFBTUMsbUJBQW1CLGtCQUF6QjtBQUNBLElBQU1DLG9CQUFvQixtQkFBMUIsQyxDQUErQzs7QUFFL0MsSUFBSUMsZ0JBQWdCO0FBQ2hCQyxTQUFLO0FBQ0RDLFlBQUksQ0FESDtBQUVEQyxlQUFPLFdBRk47QUFHREMsZ0JBQVE7QUFIUCxLQURXO0FBTWhCQyxXQUFPO0FBQ0hILFlBQUksQ0FERDtBQUVIQyxlQUFPLE9BRko7QUFHSEMsZ0JBQVE7QUFITCxLQU5TO0FBV2hCRSxZQUFRO0FBQ0pKLFlBQUksQ0FEQTtBQUVKQyxlQUFPLFFBRkg7QUFHSkMsZ0JBQVE7QUFISjtBQVhRLENBQXBCO0FBaUJBLElBQUlHLGlCQUFpQjtBQUNqQkMsVUFBTTtBQUNGTixZQUFJLENBREY7QUFFRkMsZUFBTztBQUZMLEtBRFc7QUFLakJNLFlBQVE7QUFDSlAsWUFBSSxDQURBO0FBRUpDLGVBQU87QUFGSCxLQUxTO0FBU2pCTyxhQUFTO0FBQ0xSLFlBQUksQ0FEQztBQUVMQyxlQUFPO0FBRkYsS0FUUTtBQWFqQlEs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OztvQ0FDWWxGLEUsRUFBRztBQUNaLGdCQUFJQSxNQUFNLENBQVYsRUFBWTtBQUNSLHVCQUFPRixjQUFjQyxHQUFyQjtBQUNIO0FBQ0QsZ0JBQUlDLE1BQU0sQ0FBVixFQUFZO0FBQ1IsdUJBQU9GLGNBQWNLLEtBQXJCO0FBQ0g7QUFDRCxnQkFBSUgsTUFBTSxDQUFWLEVBQVk7QUFDUix1QkFBT0YsY0FBY00sTUFBckI7QUFDSDtBQUNELG1CQUFPTixjQUFjQyxHQUFyQjtBQUNIOzs7cUNBQ1lDLEUsRUFBRztBQUNaLGdCQUFJQSxNQUFNLENBQVYsRUFBWTtBQUNSLHVCQUFPSyxlQUFlQyxJQUF0QjtBQUNIO0FBQ0QsZ0JBQUlOLE1BQU0sQ0FBVixFQUFZO0FBQ1IsdUJBQU9LLGVBQWVFLE1BQXRCO0FBQ0g7QUFDRCxnQkFBSVAsTUFBTSxDQUFWLEVBQVk7QUFDUix1QkFBT0ssZUFBZUcsT0FBdEI7QUFDSDtBQUNELGdCQUFJUixNQUFNLENBQVYsRUFBWTtBQUNSLHVCQUFPSyxlQUFlSSxRQUF0QjtBQUNIO0FBQ0QsbUJBQU9KLGVBQWVDLElBQXRCO0FBQ0giLCJmaWxlIjoiUmVkaXNTZXJ2aWNlcy9NYW5pZmVzdFNlcnZpY2UuanMiLCJzb3VyY2VzQ29udGVudCI6WyJ2YXIgcmVkaXMgPSByZXF1aXJlKCdyZWRpcycpO1xyXG52YXIgbHJlZGlzID0gcmVxdWlyZSgnLi4vRGF0YVNlcnZpY2VzL3JlZGlzLWxvY2FsJyk7XHJcbnZhciBtb21lbnQgPSByZXF1aXJlKCdtb21lbnQnKTtcclxudmFyIHJlZGlzU2VhcmNoID0gcmVxdWlyZSgncmVkaXNlYXJjaGNsaWVudCcpO1xyXG5jb25zdCBNSURfQ09VTlRFUiA9IFwiZ2xvYmFsOm1pZENvdW50ZXJcIjtcclxuY29uc3QgTUlEX1BSRUZJWCA9IFwidGV3Om1hbmlmZXN0OlwiO1xyXG5jb25zdCBNSURfSU5ERVggPSBcImluZGV4Om1hbmlmZXN0XCI7XHJcbmNvbnN0IE9QRU5fTUFOSUZFU1QgPSBcIm1hbmlmZXN0Om9wZW5cIjtcclxuY29uc3QgQ0xPU0VEX01BTklGRVNUID0gXCJtYW5pZmVzdDpjbG9zZWRcIlxyXG5jb25zdCBTSElQUEVEX01BTklGRVNUID0gXCJtYW5pZmVzdDpzaGlwcGVkXCJcclxuY29uc3QgVkVSSUZJRURfTUFOSUZFU1QgPSBcIm1hbmlmZXN0OnZlcmlmaWVkXCI7IC8vIG1hbmlmZXN0IHRoYXQgaGF2ZSBkdXRpZXMgdmVyaWZpZWRcclxuXHJcbnZhciBtYW5pZmVzdFR5cGVzID0ge1xyXG4gICAgYWlyOiB7XHJcbiAgICAgICAgaWQ6IDEsXHJcbiAgICAgICAgdGl0bGU6IFwiQWlyIENhcmdvXCIsXHJcbiAgICAgICAgcHJlZml4OiBcIk0tXCJcclxuICAgIH0sXHJcbiAgICBvY2Vhbjoge1xyXG4gICAgICAgIGlkOiAyLFxyXG4gICAgICAgIHRpdGxlOiBcIk9jZWFuXCIsXHJcbiAgICAgICAgcHJlZml4OiBcIlMtXCJcclxuICAgIH0sXHJcbiAgICBoYXptYXQ6IHtcclxuICAgICAgICBpZDogMyxcclxuICAgICAgICB0aXRsZTogXCJIQVpNQVRcIixcclxuICAgICAgICBwcmVmaXg6IFwiSC1cIlxyXG4gICAgfVxyXG59XHJcbnZhciBtYW5pZmVzdFN0YWdlcyA9IHtcclxuICAgIG9wZW46IHtcclxuICAgICAgICBpZDogMSxcclxuICAgICAgICB0aXRsZTogJ09wZW4nXHJcbiAgICB9LFxyXG4gICAgY2xvc2VkOiB7XHJcbiAgICAgICAgaWQ6IDIsXHJcbiAgICAgICAgdGl0bGU6ICdDbG9zZWQnXHJcbiAgICB9LFxyXG4gICAgc2hpcHBlZDoge1xyXG4gICAgICAgIGlkOiAzLFxyXG4gICAgICAgIHRpdGxlOiAnU2hpcHBlZCdcclxuICAgIH0sXHJcbiAgICB2ZXJpZmllZDoge1xyXG4gICAgICAgIGlkOiA0LFxyXG4gICAgICAgIHRpdGxlOiAnVmVyaWZpZWQnXHJcbiAgICB9XHJcblxyXG59XHJcblxyXG5leHBvcnQgY2xhc3MgTWFuaWZlc3RTZXJ2aWNlIHtcclxuXHJcbiAgICBjb25zdHJ1Y3RvcigpIHtcclxuICAgICAgICBcclxuICAgICAgICB0aGlzLnJlZGlzQ2xpZW50ID0gbHJlZGlzLmNsaWVudDtcclxuICAgICAgICB0aGlzLm10eXBlcyA9IG1hbmlmZXN0VHlwZXM7XHJcbiAgICAgICAgdGhpcy5tc3RhZ2VzID0gbWFuaWZlc3RTdGFnZXM7XHJcbiAgICAgICAgLy9jaGVjayB0byBlbnN1cmUgd2UgaGF2ZSB0aGUgbWFuaWZlc3QgY291bnRlciBcclxuICAgICAgICB0aGlzLmNoZWNrU2V0dXAoKTsgXHJcbiAgICAgICAgdGhpcy5zZXR1cEluZGV4KClcclxuICAgIH1cclxuICAgIHNldHVwSW5kZXgoKXtcclxuICAgICAgICB0aGlzLm15U2VhcmNoID0gcmVkaXNTZWFyY2gocmVkaXMsICdpbmRleDptYW5pZmVzdCcsIHtcclxuICAgICAgICAgICAgY2xpZW50T3B0aW9uczoge1xyXG4gICAgICAgICAgICAgICAgJ2hvc3QnOiAncmVkaXMtMTQ4OTcuYzI4MjIudXMtZWFzdC0xLW16LmVjMi5jbG91ZC5ybHJjcC5jb20nLFxyXG4gICAgICAgICAgICAgICAgJ3BvcnQnOiAnMTQ4OTcnLFxyXG4gICAgICAgICAgICAgICAgYXV0aF9wYXNzOiAndDVhdFJ1V1FsT1c3VnAydWhacFFpdmNJb3REbVRQcGwnXHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICB9KTtcclxuICAgIH1cclxuICAgIGNoZWNrU2V0dXAoKXtcclxuICAgICAgICB0aGlzLnJlZGlzQ2xpZW50LmV4aXN0cyhNSURfQ09VTlRFUiwgKGVyciwgcmVzKSA9PiB7XHJcbiAgICAgICAgICAgIGlmIChyZXMgPT0gMCkge1xyXG4gICAgICAgICAgICAgICAgLy9jcmVhdGUgdGhlIG1hbmlmZXN0IFxyXG4gICAgICAgICAgICAgICAgbHJlZGlzLnNldChNSURfQ09VTlRFUiwgMTAwKTtcclxuICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICBcclxuICAgICAgICB9KTtcclxuICAgIH1cclxuXHJcbiAgICBnZXRUeXBlcygpIHtcclxuICAgICAgICByZXR1cm4gdGhpcy5teXR5cGVzXHJcbiAgICB9XHJcbiAgICBnZXRTdGFnZXMoKSB7XHJcbiAgICAgICAgcmV0dXJuIHRoaXMubWFuaWZlc3RTdGFnZXM7XHJcbiAgICB9XHJcblxyXG4gICAgZ2V0T3Blbk1hbmlmZXN0KHR5cGVJZCl7XHJcbiAgICAgICAgXHJcbiAgICAgICAgcmV0dXJuIG5ldyBQcm9taXNlKChyZXNvbHZlLHJlamVjdCk9PntcclxuICAgICAgICAgICBjb25zb2xlLmxvZyggYEBzdGFnZUlkOlske3R5cGVJZH0gJHt0eXBlSWR9XSBAbXR5cGVJZDoke3R5cGVJZH1gKTtcclxuICAgICAgICAgICAgdGhpcy5teVNlYXJjaC5zZWFyY2goYEBzdGFnZUlkOlsxIDFdIEBtdHlwZUlkOiR7dHlwZUlkfWAsIHtcclxuICAgICAgICAgICAgICAgIG9mZnNldDowLFxyXG4gICAgICAgICAgICAgICAgbnVtYmVyT2ZSZXN1bHRzOiAxMDAsXHJcbiAgICAgICAgICAgICAgICBzb3J0Qnk6IFwibWlkXCIsXHJcbiAgICAgICAgICAgICAgICBkaXI6IFwiREVTQ1wiXHJcbiAgICAgICAgICAgIH0sIChyMSwgZGF0YSkgPT4ge1xyXG4gICAgICAgICAgICAgICAgaWYgKHIxKVxyXG4gICAgICAgICAgICAgICAgIHtcclxuICAgICAgICAgICAgICAgICAgICAgY29uc29sZS5sb2coJ3dlIGhhZCBhbiBlcnJvcicpXHJcbiAgICAgICAgICAgICAgICAgICAgY29uc29sZS5sb2cocjEpO1xyXG4gICAgICAgICAgICAgICAgICAgIFxyXG4gICAgICAgICAgICAgICAgIH0gICBcclxuICAgICAgICAgICAgICAgICBjb25zb2xlLmxvZygnbm8gZXJyb3JzIGRldGVjdGVkIGhlcmUgLi4uJylcclxuICAgICAgICAgICAgICAgICAvL2NvbnNvbGUubG9nKG1hbmlmZXN0TGlzdCk7XHJcbiAgICAgICAgICAgICAgICAgY29uc29sZS5sb2coZGF0YSk7XHJcbiAgICAgICAgICAgICAgICByZXNvbHZlKGRhdGEudG90YWxSZXN1bHRzKTtcclxuICAgICAgICAgICAgICAgIFxyXG4gICAgICAgICAgICAgICAgXHJcbiAgICAgICAgICAgIH0pO1xyXG4gICAgICAgICAgICBcclxuICAgICAgICB9KTtcclxuICAgICAgICBcclxuICAgIH1cclxuICAgIGNyZWF0ZU5ld01hbmlmZXN0KHR5cGUsIHVzZXIpIHtcclxuICAgICAgICAvL3dlIGhhdmUgc29tZSBydWxlcyB0byBmb2xsb3cgaGVyZSBcclxuICAgICAgICAvLzEuIGEgbmV3IG1hbmlmZXN0IGNhbm5vdCBiZSBjcmVhdGVkIGlmIHRoZSBwcmV2aW91cyBtYW5pZmVzdCBpcyBub3QgY2xvc2VkIFxyXG4gICAgICAgIC8vY2hlY2sgZm9yIG9wZW4gbWFuaWZlc3QgZmlyc3QgXHJcbiAgICAgICAgcmV0dXJuIG5ldyBQcm9taXNlKChyZXNvbHZlLCByZWplY3QpID0+IHtcclxuICAgICAgICAgICAgdGhpcy5nZXRPcGVuTWFuaWZlc3QodHlwZS5pZCkudGhlbigob3BlbkNvdW50KSA9PiB7XHJcbiAgICAgICAgICAgICAgXHJcbiAgICAgICAgICAgICAgICBjb25zb2xlLmxvZyh0eXBlKTsgXHJcbiAgICAgICAgICAgICAgICBpZiAob3BlbkNvdW50PjApIHtcclxuICAgICAgICAgICAgICAgICAgICAvL3dlIGNhbid0IGFkZCB0aGUgbWFuaWZlc3QgcmVqZWN0IFxyXG4gICAgICAgICAgICAgICAgICAgIHJlamVjdCh7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIFwibWVzc2FnZVwiOiBcIlRoZXJlIGlzIGFuIG9wZW4gbWFuaWZlc3QgUGxlYXNlIGNsb3NlIGl0IGJlZm9yZSBjcmVhdGluZyBhIG5ldyBtYW5pZmVzdC5cIlxyXG4gICAgICAgICAgICAgICAgICAgIH0pO1xyXG5cclxuICAgICAgICAgICAgICAgIH0gZWxzZSB7XHJcbiAgICAgICAgICAgICAgICAgICAgY29uc29sZS5sb2coJ3RyeWluZyB0byBjcmVhdGUgdGhlIG1hbmlmZXN0Li4uLi4uLi4nKVxyXG4gICAgICAgICAgICAgICAgICAgIHRoaXMucmVkaXNDbGllbnQubXVsdGkoKVxyXG4gICAgICAgICAgICAgICAgICAgICAgICAuaW5jcihNSURfQ09VTlRFUilcclxuICAgICAgICAgICAgICAgICAgICAgICAgLmV4ZWMoKGVyciwgcmVzcCkgPT4ge1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgY29uc29sZS5sb2cocmVzcCk7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICB2YXIgbWFuaWZlc3QgPSB7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgbWlkOiByZXNwWzBdLFxyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHRpdGxlOiB0eXBlLnByZWZpeCtyZXNwWzBdLFxyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGRhdGVDcmVhdGVkOiBtb21lbnQoKS5mb3JtYXQoXCJZWVlZLU1NLUREXCIpLFxyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIG10eXBlSWQ6IHR5cGUuaWQsXHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgc3RhZ2VJZDogbWFuaWZlc3RTdGFnZXMub3Blbi5pZCxcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBzdGFnZTogbWFuaWZlc3RTdGFnZXMub3Blbi50aXRsZSxcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBjcmVhdGVkQnk6IHVzZXJcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIH07XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICB0aGlzLnJlZGlzQ2xpZW50Lm11bHRpKClcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAuaG1zZXQoTUlEX1BSRUZJWCArIG1hbmlmZXN0Lm1pZCwgbWFuaWZlc3QpXHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgLnNhZGQoT1BFTl9NQU5JRkVTVCwgbWFuaWZlc3QubWlkKVxyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIC5leGVjKChlcnIsIHJlc3VsdHMpID0+IHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgdGhpcy5teVNlYXJjaC5hZGQobWFuaWZlc3QubWlkLG1hbmlmZXN0KTtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgLy9hbHNvIGFkZCB0byB0aGUgaW5kZXggaGVyZSBvbmUgdGltZSBcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgaWYgKGVycikge1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgcmVqZWN0KGVycik7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIH0gZWxzZSB7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICByZXNvbHZlKG1hbmlmZXN0KVxyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgfSk7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIH0pO1xyXG4gICAgICAgICAgICAgICAgfVxyXG5cclxuICAgICAgICAgICAgfSkuY2F0Y2goKGVycik9PntcclxuICAgICAgICAgICAgICAgIGNvbnNvbGUubG9nKFwiZXJyIGRldGVjdGVkXCIpOyBcclxuICAgICAgICAgICAgICAgIGNvbnNvbGUubG9nKGVycik7XHJcbiAgICAgICAgICAgIH0pO1xyXG5cclxuICAgICAgICB9KTtcclxuXHJcbiAgICB9XHJcbiAgICBjaGFuZ2VTdGFnZShtaWQsIHN0YWdlcykge1xyXG4gICAgICAgIHJldHVybiBuZXcgUHJvbWlzZSgocmVzb2x2ZSwgcmVqZWN0KSA9PiB7XHJcbiAgICAgICAgICAgIFxyXG4gICAgICAgICAgICBscmVkaXMuY2xpZW50Lmhtc2V0KE1JRF9QUkVGSVgrbWlkLFwic3RhZ2VJZFwiLHN0YWdlcywoZXJyLHJlc3VsdCk9PntcclxuICAgICAgICAgICAgICAgIHZhciBzdGFnZSA9IHRoaXMuZ2V0U3RhZ2VCeUlkKHN0YWdlcyk7IFxyXG4gICAgICAgICAgICAgICAgY29uc29sZS5sb2coJ2xvb2tlZCB1cCB0aGUgc3RhZ2UgJytzdGFnZS50aXRsZSk7XHJcbiAgICAgICAgICAgICAgICBscmVkaXMuY2xpZW50Lmhtc2V0KE1JRF9QUkVGSVgrbWlkLFwic3RhZ2VcIixzdGFnZS50aXRsZSwoZXJyLHJlc3VsdDIpPT57fSk7IFxyXG4gICAgICAgICAgICAgICAgbHJlZGlzLmhnZXRhbGwoTUlEX1BSRUZJWCttaWQpLnRoZW4oKHVNYW5pZmVzdCk9PntcclxuICAgICAgICAgICAgICAgICAgICB0aGlzLm15U2VhcmNoLmRlbERvY3VtZW50KFwiaW5kZXg6bWFuaWZlc3RcIixtaWQsKGVycixyZXN1bHQxKT0+e1xyXG4gICAgICAgICAgICAgICAgICAgICAgICBjb25zb2xlLmxvZygnY2hhbmdpbmcgZG9jdW1lbnQnKTtcclxuICAgICAgICAgICAgICAgICAgICAgICAgY29uc29sZS5sb2coZXJyKTtcclxuICAgICAgICAgICAgICAgICAgICAgICAgY29uc29sZS5sb2cocmVzdWx0MSkgXHJcbiAgICAgICAgICAgICAgICAgICAgICAgIHRoaXMubXlTZWFyY2guYWRkKHVNYW5pZmVzdC5taWQsdU1hbmlmZXN0KTsgXHJcbiAgICAgICAgICAgICAgICAgICAgICAgIHJlc29sdmUocmVzdWx0KTsgXHJcbiAgICAgICAgICAgICAgICAgICAgfSk7IFxyXG4gICAgICAgICAgICAgICAgICAgXHJcbiAgICAgICAgICAgICAgICB9KTtcclxuICAgICAgICAgICAgICAgXHJcbiAgICAgICAgICAgIH0pO1xyXG4gICAgICAgICAgICAvL3dlIGFsc28gbmVlZCB0byB0byB1cGRhdGUgdGhlIGRvY3VtZW50IFxyXG5cclxuICAgICAgICAgICAgXHJcbiAgICAgICAgfSlcclxuICAgIH1cclxuICAgIGxpc3RNYW5pZmVzdCh0eXBlLHBhZ2UscGFnZVNpemUpe1xyXG4gICAgICAgIHJldHVybiBuZXcgUHJvbWlzZSgocmVzb2x2ZSxyZWplY3QpPT57XHJcbiAgICAgICAgICAgIHZhciBvZmZzZXRWYWwgPSAocGFnZSAtIDEpICogcGFnZVNpemU7XHJcbiAgICAgICAgICAgIGNvbnNvbGUubG9nKCdvZmZzZXQgJytvZmZzZXRWYWwpO1xyXG4gICAgICAgICAgICBcclxuICAgICAgICAgICAgdGhpcy5teVNlYXJjaC5zZWFyY2goXCJAbXR5cGVJZDpcIit0eXBlLCB7XHJcbiAgICAgICAgICAgICAgICBvZmZzZXQ6b2Zmc2V0VmFsLFxyXG4gICAgICAgICAgICAgICAgbnVtYmVyT2ZSZXN1bHRzOiBwYWdlU2l6ZSxcclxuICAgICAgICAgICAgICAgIHNvcnRCeTogXCJtaWRcIixcclxuICAgICAgICAgICAgICAgIGRpcjogXCJERVNDXCJcclxuICAgICAgICAgICAgfSwgKHIxLCBkYXRhKSA9PiB7XHJcbiAgICAgICAgICAgICAgICBpZiAocjEpXHJcbiAgICAgICAgICAgICAgICAgICAgY29uc29sZS5sb2cocjEpO1xyXG4gICAgICAgICAgICAgICAgIHZhciBtYW5pZmVzdExpc3QgPSBbXTsgXHJcbiAgICAgICAgICAgICAgICAgZGF0YS5yZXN1bHRzLmZvckVhY2gobWFuaWZlc3RSZXN1bHQgPT4ge1xyXG4gICAgICAgICAgICAgICAgICAgIG1hbmlmZXN0TGlzdC5wdXNoKG1hbmlmZXN0UmVzdWx0LmRvYyk7ICAgIFxyXG4gICAgICAgICAgICAgICAgICAgIFxyXG4gICAgICAgICAgICAgICAgIH0pO1xyXG4gICAgICAgICAgICAgICAgIC8vY29uc29sZS5sb2cobWFuaWZlc3RMaXN0KTtcclxuICAgICAgICAgICAgICAgICB2YXIgcGFnZWREYXRhID0ge1xyXG4gICAgICAgICAgICAgICAgICAgIG1hbmlmZXN0czptYW5pZmVzdExpc3QsXHJcbiAgICAgICAgICAgICAgICAgICAgdG90YWxSZXN1bHRzIDogZGF0YS50b3RhbFJlc3VsdHMsXHJcbiAgICAgICAgICAgICAgICAgICAgcGFnZSA6IHBhZ2UsXHJcbiAgICAgICAgICAgICAgICAgICAgcGFnZVNpemU6IHBhZ2VTaXplLCBcclxuICAgICAgICAgICAgICAgICAgICBUb3RhbFBhZ2VzIDogKGRhdGEudG90YWxSZXN1bHRzL3BhZ2VTaXplKVxyXG4gICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICAgICAgcmVzb2x2ZShwYWdlZERhdGEpO1xyXG4gICAgICAgICAgICAgICAgY29uc29sZS5sb2cobWFuaWZlc3RMaXN0KTtcclxuICAgICAgICAgICAgICAgIFxyXG4gICAgICAgICAgICB9KTtcclxuICAgICAgICB9KTtcclxuICAgIH1cclxuICAgIGdldE1hbmlmZXN0KG1pZCkge1xyXG4gICAgICAgIHJldHVybiBscmVkaXMuaGdldGFsbChNSURfUFJFRklYK21pZClcclxuICAgIH1cclxuICAgIGRlbGV0ZU1hbmlmZXN0KG1pZCl7XHJcbiAgICAgICByZXR1cm4gbmV3IFByb21pc2UoKHJlc29sdmUscmVqZWN0KT0+e1xyXG4gICAgICAgIGxyZWRpcy5jbGllbnQuZGVsKE1JRF9QUkVGSVgrbWlkLChlcnIscmVzcCk9PntcclxuICAgICAgICAgICAgY29uc29sZS5sb2cocmVzcCk7IFxyXG4gICAgICAgICAgICB0aGlzLm15U2VhcmNoLmRlbERvY3VtZW50KFwiaW5kZXg6bWFuaWZlc3RcIixtaWQsKGVycixyZXN1bHQpPT57XHJcbiAgICAgICAgICAgICAgICBjb25zb2xlLmxvZyhcImRlbGV0aW5nIG1pZFwiKTsgXHJcbiAgICAgICAgICAgICAgICBjb25zb2xlLmxvZyhlcnIpOyBcclxuICAgICAgICAgICAgICAgIGNvbnNvbGUubG9nKHJlc3VsdCk7XHJcbiAgICAgICAgICAgIH0pOyBcclxuICAgICAgICAgICAgbHJlZGlzLnNyZW0oT1BFTl9NQU5JRkVTVCxtaWQpO1xyXG4gICAgICAgICAgICByZXNvbHZlKHtkZWxldGVkOnRydWV9KSAgICBcclxuICAgICAgICB9KVxyXG5cclxuICAgICAgIH0pOyBcclxuICAgICAgICBcclxuICAgICAgICBcclxuICAgIH1cclxuICAgIGdldFR5cGVieUlkIChpZCl7XHJcbiAgICAgICAgaWYgKGlkID09IDEpe1xyXG4gICAgICAgICAgICByZXR1cm4gbWFuaWZlc3RUeXBlcy5haXI7XHJcbiAgICAgICAgfVxyXG4gICAgICAgIGlmIChpZCA9PSAyKXtcclxuICAgICAgICAgICAgcmV0dXJuIG1hbmlmZXN0VHlwZXMub2NlYW47XHJcbiAgICAgICAgfVxyXG4gICAgICAgIGlmIChpZCA9PSAzKXtcclxuICAgICAgICAgICAgcmV0dXJuIG1hbmlmZXN0VHlwZXMuaGF6bWF0O1xyXG4gICAgICAgIH1cclxuICAgICAgICByZXR1cm4gbWFuaWZlc3RUeXBlcy5haXI7IFxyXG4gICAgfVxyXG4gICAgZ2V0U3RhZ2VCeUlkKGlkKXtcclxuICAgICAgICBpZiAoaWQgPT0gMSl7XHJcbiAgICAgICAgICAgIHJldHVybiBtYW5pZmVzdFN0YWdlcy5vcGVuO1xyXG4gICAgICAgIH1cclxuICAgICAgICBpZiAoaWQgPT0gMil7XHJcbiAgICAgICAgICAgIHJldHVybiBtYW5pZmVzdFN0YWdlcy5jbG9zZWQ7XHJcbiAgICAgICAgfVxyXG4gICAgICAgIGlmIChpZCA9PSAzKXtcclxuICAgICAgICAgICAgcmV0dXJuIG1hbmlmZXN0U3RhZ2VzLnNoaXBwZWQ7XHJcbiAgICAgICAgfVxyXG4gICAgICAgIGlmIChpZCA9PSA0KXtcclxuICAgICAgICAgICAgcmV0dXJuIG1hbmlmZXN0U3RhZ2VzLnZlcmlmaWVkO1xyXG4gICAgICAgIH1cclxuICAgICAgICByZXR1cm4gbWFuaWZlc3RTdGFnZXMub3BlbjsgXHJcbiAgICB9XHJcbn0iXX0=
