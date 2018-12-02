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
//# sourceMappingURL=data:application/json;charset=utf8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIlJlZGlzU2VydmljZXMvTWFuaWZlc3RTZXJ2aWNlLmVzNiJdLCJuYW1lcyI6WyJyZWRpcyIsInJlcXVpcmUiLCJscmVkaXMiLCJtb21lbnQiLCJyZWRpc1NlYXJjaCIsIk1JRF9DT1VOVEVSIiwiTUlEX1BSRUZJWCIsIk1JRF9JTkRFWCIsIk9QRU5fTUFOSUZFU1QiLCJDTE9TRURfTUFOSUZFU1QiLCJTSElQUEVEX01BTklGRVNUIiwiVkVSSUZJRURfTUFOSUZFU1QiLCJtYW5pZmVzdFR5cGVzIiwiYWlyIiwiaWQiLCJ0aXRsZSIsInByZWZpeCIsIm9jZWFuIiwiaGF6bWF0IiwibWFuaWZlc3RTdGFnZXMiLCJvcGVuIiwiY2xvc2VkIiwic2hpcHBlZCIsInZlcmlmaWVkIiwiTWFuaWZlc3RTZXJ2aWNlIiwicmVkaXNDbGllbnQiLCJjbGllbnQiLCJtdHlwZXMiLCJtc3RhZ2VzIiwiY2hlY2tTZXR1cCIsInNldHVwSW5kZXgiLCJteVNlYXJjaCIsImNsaWVudE9wdGlvbnMiLCJhdXRoX3Bhc3MiLCJleGlzdHMiLCJlcnIiLCJyZXMiLCJzZXQiLCJteXR5cGVzIiwidHlwZUlkIiwiUHJvbWlzZSIsInJlc29sdmUiLCJyZWplY3QiLCJjb25zb2xlIiwibG9nIiwic2VhcmNoIiwib2Zmc2V0IiwibnVtYmVyT2ZSZXN1bHRzIiwic29ydEJ5IiwiZGlyIiwicjEiLCJkYXRhIiwidG90YWxSZXN1bHRzIiwidHlwZSIsInVzZXIiLCJnZXRPcGVuTWFuaWZlc3QiLCJ0aGVuIiwib3BlbkNvdW50IiwibXVsdGkiLCJpbmNyIiwiZXhlYyIsInJlc3AiLCJtYW5pZmVzdCIsIm1pZCIsImRhdGVDcmVhdGVkIiwiZm9ybWF0IiwibXR5cGVJZCIsInN0YWdlSWQiLCJzdGFnZSIsImNyZWF0ZWRCeSIsImhtc2V0Iiwic2FkZCIsInJlc3VsdHMiLCJhZGQiLCJjYXRjaCIsInN0YWdlcyIsInJlc3VsdCIsImdldFN0YWdlQnlJZCIsInJlc3VsdDIiLCJoZ2V0YWxsIiwidU1hbmlmZXN0IiwiZGVsRG9jdW1lbnQiLCJyZXN1bHQxIiwiYXdiIiwic2hpcERhdGUiLCJzaGlwcGVkQnkiLCJzcmVzdWx0IiwiY2hhbmdlU3RhZ2UiLCJyZXN1IiwicGFnZSIsInBhZ2VTaXplIiwib2Zmc2V0VmFsIiwibWFuaWZlc3RMaXN0IiwiZm9yRWFjaCIsInB1c2giLCJtYW5pZmVzdFJlc3VsdCIsImRvYyIsInBhZ2VkRGF0YSIsIm1hbmlmZXN0cyIsIlRvdGFsUGFnZXMiLCJkZWwiLCJzcmVtIiwiZGVsZXRlZCJdLCJtYXBwaW5ncyI6Ijs7Ozs7Ozs7OztBQUFBLElBQUlBLFFBQVFDLFFBQVEsT0FBUixDQUFaO0FBQ0EsSUFBSUMsU0FBU0QsUUFBUSw2QkFBUixDQUFiO0FBQ0EsSUFBSUUsU0FBU0YsUUFBUSxRQUFSLENBQWI7QUFDQSxJQUFJRyxjQUFjSCxRQUFRLHFCQUFSLENBQWxCO0FBQ0EsSUFBTUksY0FBYyxtQkFBcEI7QUFDQSxJQUFNQyxhQUFhLGVBQW5CO0FBQ0EsSUFBTUMsWUFBWSxnQkFBbEI7QUFDQSxJQUFNQyxnQkFBZ0IsZUFBdEI7QUFDQSxJQUFNQyxrQkFBa0IsaUJBQXhCO0FBQ0EsSUFBTUMsbUJBQW1CLGtCQUF6QjtBQUNBLElBQU1DLG9CQUFvQixtQkFBMUIsQyxDQUErQzs7QUFFL0MsSUFBSUMsZ0JBQWdCO0FBQ2hCQyxTQUFLO0FBQ0RDLFlBQUksQ0FESDtBQUVEQyxlQUFPLFdBRk47QUFHREMsZ0JBQVE7QUFIUCxLQURXO0FBTWhCQyxXQUFPO0FBQ0hILFlBQUksQ0FERDtBQUVIQyxlQUFPLE9BRko7QUFHSEMsZ0JBQVE7QUFITCxLQU5TO0FBV2hCRSxZQUFRO0FBQ0pKLFlBQUksQ0FEQTtBQUVKQyxlQUFPLFFBRkg7QUFHSkMsZ0JBQVE7QUFISjtBQVhRLENBQXBCO0FBaUJBLElBQUlHLGlCQUFpQjtBQUNqQkMsVUFBTTtBQUNGTixZQUFJLENBREY7QUFFRkMsZUFBTztBQUZMLEtBRFc7QUFLakJNLFlBQVE7QUFDSlAsWUFBSSxDQURBO0FBRUpDLGVBQU87QUFGSCxL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QUFDRCxnQkFBSVIsTUFBTSxDQUFWLEVBQVk7QUFDUix1QkFBT0ssZUFBZUksUUFBdEI7QUFDSDtBQUNELG1CQUFPSixlQUFlQyxJQUF0QjtBQUNIIiwiZmlsZSI6IlJlZGlzU2VydmljZXMvTWFuaWZlc3RTZXJ2aWNlLmpzIiwic291cmNlc0NvbnRlbnQiOlsidmFyIHJlZGlzID0gcmVxdWlyZSgncmVkaXMnKTtcclxudmFyIGxyZWRpcyA9IHJlcXVpcmUoJy4uL0RhdGFTZXJ2aWNlcy9yZWRpcy1sb2NhbCcpO1xyXG52YXIgbW9tZW50ID0gcmVxdWlyZSgnbW9tZW50Jyk7XHJcbnZhciByZWRpc1NlYXJjaCA9IHJlcXVpcmUoJy4uL3JlZGlzZWFyY2hjbGllbnQnKTtcclxuY29uc3QgTUlEX0NPVU5URVIgPSBcImdsb2JhbDptaWRDb3VudGVyXCI7XHJcbmNvbnN0IE1JRF9QUkVGSVggPSBcInRldzptYW5pZmVzdDpcIjtcclxuY29uc3QgTUlEX0lOREVYID0gXCJpbmRleDptYW5pZmVzdFwiO1xyXG5jb25zdCBPUEVOX01BTklGRVNUID0gXCJtYW5pZmVzdDpvcGVuXCI7XHJcbmNvbnN0IENMT1NFRF9NQU5JRkVTVCA9IFwibWFuaWZlc3Q6Y2xvc2VkXCJcclxuY29uc3QgU0hJUFBFRF9NQU5JRkVTVCA9IFwibWFuaWZlc3Q6c2hpcHBlZFwiXHJcbmNvbnN0IFZFUklGSUVEX01BTklGRVNUID0gXCJtYW5pZmVzdDp2ZXJpZmllZFwiOyAvLyBtYW5pZmVzdCB0aGF0IGhhdmUgZHV0aWVzIHZlcmlmaWVkXHJcblxyXG52YXIgbWFuaWZlc3RUeXBlcyA9IHtcclxuICAgIGFpcjoge1xyXG4gICAgICAgIGlkOiAxLFxyXG4gICAgICAgIHRpdGxlOiBcIkFpciBDYXJnb1wiLFxyXG4gICAgICAgIHByZWZpeDogXCJNLVwiXHJcbiAgICB9LFxyXG4gICAgb2NlYW46IHtcclxuICAgICAgICBpZDogMixcclxuICAgICAgICB0aXRsZTogXCJPY2VhblwiLFxyXG4gICAgICAgIHByZWZpeDogXCJTLVwiXHJcbiAgICB9LFxyXG4gICAgaGF6bWF0OiB7XHJcbiAgICAgICAgaWQ6IDMsXHJcbiAgICAgICAgdGl0bGU6IFwiSEFaTUFUXCIsXHJcbiAgICAgICAgcHJlZml4OiBcIkgtXCJcclxuICAgIH1cclxufVxyXG52YXIgbWFuaWZlc3RTdGFnZXMgPSB7XHJcbiAgICBvcGVuOiB7XHJcbiAgICAgICAgaWQ6IDEsXHJcbiAgICAgICAgdGl0bGU6ICdPcGVuJ1xyXG4gICAgfSxcclxuICAgIGNsb3NlZDoge1xyXG4gICAgICAgIGlkOiAyLFxyXG4gICAgICAgIHRpdGxlOiAnQ2xvc2VkJ1xyXG4gICAgfSxcclxuICAgIHNoaXBwZWQ6IHtcclxuICAgICAgICBpZDogMyxcclxuICAgICAgICB0aXRsZTogJ1NoaXBwZWQnXHJcbiAgICB9LFxyXG4gICAgdmVyaWZpZWQ6IHtcclxuICAgICAgICBpZDogNCxcclxuICAgICAgICB0aXRsZTogJ1ZlcmlmaWVkJ1xyXG4gICAgfVxyXG5cclxufVxyXG5cclxuZXhwb3J0IGNsYXNzIE1hbmlmZXN0U2VydmljZSB7XHJcblxyXG4gICAgY29uc3RydWN0b3IoKSB7ICAgICAgICBcclxuICAgICAgICB0aGlzLnJlZGlzQ2xpZW50ID0gbHJlZGlzLmNsaWVudDtcclxuICAgICAgICB0aGlzLm10eXBlcyA9IG1hbmlmZXN0VHlwZXM7XHJcbiAgICAgICAgdGhpcy5tc3RhZ2VzID0gbWFuaWZlc3RTdGFnZXM7XHJcbiAgICAgICAgLy9jaGVjayB0byBlbnN1cmUgd2UgaGF2ZSB0aGUgbWFuaWZlc3QgY291bnRlciBcclxuICAgICAgICB0aGlzLmNoZWNrU2V0dXAoKTsgXHJcbiAgICAgICAgdGhpcy5zZXR1cEluZGV4KClcclxuICAgIH1cclxuICAgIHNldHVwSW5kZXgoKXtcclxuICAgICAgICB0aGlzLm15U2VhcmNoID0gcmVkaXNTZWFyY2gocmVkaXMsICdpbmRleDptYW5pZmVzdCcsIHtcclxuICAgICAgICAgICAgY2xpZW50T3B0aW9uczoge1xyXG4gICAgICAgICAgICAgICAgJ2hvc3QnOiAncmVkaXMtMTQ4OTcuYzI4MjIudXMtZWFzdC0xLW16LmVjMi5jbG91ZC5ybHJjcC5jb20nLFxyXG4gICAgICAgICAgICAgICAgJ3BvcnQnOiAnMTQ4OTcnLFxyXG4gICAgICAgICAgICAgICAgYXV0aF9wYXNzOiAndDVhdFJ1V1FsT1c3VnAydWhacFFpdmNJb3REbVRQcGwnXHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICB9KTtcclxuICAgIH1cclxuICAgIGNoZWNrU2V0dXAoKXtcclxuICAgICAgICB0aGlzLnJlZGlzQ2xpZW50LmV4aXN0cyhNSURfQ09VTlRFUiwgKGVyciwgcmVzKSA9PiB7XHJcbiAgICAgICAgICAgIGlmIChyZXMgPT0gMCkge1xyXG4gICAgICAgICAgICAgICAgLy9jcmVhdGUgdGhlIG1hbmlmZXN0IFxyXG4gICAgICAgICAgICAgICAgbHJlZGlzLnNldChNSURfQ09VTlRFUiwgMTAwKTtcclxuICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICBcclxuICAgICAgICB9KTtcclxuICAgIH1cclxuXHJcbiAgICBnZXRUeXBlcygpIHtcclxuICAgICAgICByZXR1cm4gdGhpcy5teXR5cGVzXHJcbiAgICB9XHJcbiAgICBnZXRTdGFnZXMoKSB7XHJcbiAgICAgICAgcmV0dXJuIHRoaXMubWFuaWZlc3RTdGFnZXM7XHJcbiAgICB9XHJcblxyXG4gICAgZ2V0T3Blbk1hbmlmZXN0KHR5cGVJZCl7XHJcbiAgICAgICAgXHJcbiAgICAgICAgcmV0dXJuIG5ldyBQcm9taXNlKChyZXNvbHZlLHJlamVjdCk9PntcclxuICAgICAgICAgICBjb25zb2xlLmxvZyggYEBzdGFnZUlkOlske3R5cGVJZH0gJHt0eXBlSWR9XSBAbXR5cGVJZDoke3R5cGVJZH1gKTtcclxuICAgICAgICAgICAgdGhpcy5teVNlYXJjaC5zZWFyY2goYEBzdGFnZUlkOlsxIDFdIEBtdHlwZUlkOiR7dHlwZUlkfWAsIHtcclxuICAgICAgICAgICAgICAgIG9mZnNldDowLFxyXG4gICAgICAgICAgICAgICAgbnVtYmVyT2ZSZXN1bHRzOiAxMDAsXHJcbiAgICAgICAgICAgICAgICBzb3J0Qnk6IFwibWlkXCIsXHJcbiAgICAgICAgICAgICAgICBkaXI6IFwiREVTQ1wiXHJcbiAgICAgICAgICAgIH0sIChyMSwgZGF0YSkgPT4ge1xyXG4gICAgICAgICAgICAgICAgaWYgKHIxKVxyXG4gICAgICAgICAgICAgICAgIHtcclxuICAgICAgICAgICAgICAgICAgICAgY29uc29sZS5sb2coJ3dlIGhhZCBhbiBlcnJvcicpXHJcbiAgICAgICAgICAgICAgICAgICAgY29uc29sZS5sb2cocjEpO1xyXG4gICAgICAgICAgICAgICAgICAgIFxyXG4gICAgICAgICAgICAgICAgIH0gICBcclxuICAgICAgICAgICAgICAgICBjb25zb2xlLmxvZygnbm8gZXJyb3JzIGRldGVjdGVkIGhlcmUgLi4uJylcclxuICAgICAgICAgICAgICAgICAvL2NvbnNvbGUubG9nKG1hbmlmZXN0TGlzdCk7XHJcbiAgICAgICAgICAgICAgICAgY29uc29sZS5sb2coZGF0YSk7XHJcbiAgICAgICAgICAgICAgICByZXNvbHZlKGRhdGEudG90YWxSZXN1bHRzKTtcclxuICAgICAgICAgICAgICAgIFxyXG4gICAgICAgICAgICAgICAgXHJcbiAgICAgICAgICAgIH0pO1xyXG4gICAgICAgICAgICBcclxuICAgICAgICB9KTtcclxuICAgICAgICBcclxuICAgIH1cclxuICAgIGNyZWF0ZU5ld01hbmlmZXN0KHR5cGUsIHVzZXIpIHtcclxuICAgICAgICAvL3dlIGhhdmUgc29tZSBydWxlcyB0byBmb2xsb3cgaGVyZSBcclxuICAgICAgICAvLzEuIGEgbmV3IG1hbmlmZXN0IGNhbm5vdCBiZSBjcmVhdGVkIGlmIHRoZSBwcmV2aW91cyBtYW5pZmVzdCBpcyBub3QgY2xvc2VkIFxyXG4gICAgICAgIC8vY2hlY2sgZm9yIG9wZW4gbWFuaWZlc3QgZmlyc3QgXHJcbiAgICAgICAgcmV0dXJuIG5ldyBQcm9taXNlKChyZXNvbHZlLCByZWplY3QpID0+IHtcclxuICAgICAgICAgICAgdGhpcy5nZXRPcGVuTWFuaWZlc3QodHlwZS5pZCkudGhlbigob3BlbkNvdW50KSA9PiB7XHJcbiAgICAgICAgICAgICAgXHJcbiAgICAgICAgICAgICAgICBjb25zb2xlLmxvZyh0eXBlKTsgXHJcbiAgICAgICAgICAgICAgICBpZiAob3BlbkNvdW50PjApIHtcclxuICAgICAgICAgICAgICAgICAgICAvL3dlIGNhbid0IGFkZCB0aGUgbWFuaWZlc3QgcmVqZWN0IFxyXG4gICAgICAgICAgICAgICAgICAgIHJlamVjdCh7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIFwibWVzc2FnZVwiOiBcIlRoZXJlIGlzIGFuIG9wZW4gbWFuaWZlc3QgUGxlYXNlIGNsb3NlIGl0IGJlZm9yZSBjcmVhdGluZyBhIG5ldyBtYW5pZmVzdC5cIlxyXG4gICAgICAgICAgICAgICAgICAgIH0pO1xyXG5cclxuICAgICAgICAgICAgICAgIH0gZWxzZSB7XHJcbiAgICAgICAgICAgICAgICAgICAgY29uc29sZS5sb2coJ3RyeWluZyB0byBjcmVhdGUgdGhlIG1hbmlmZXN0Li4uLi4uLi4nKVxyXG4gICAgICAgICAgICAgICAgICAgIHRoaXMucmVkaXNDbGllbnQubXVsdGkoKVxyXG4gICAgICAgICAgICAgICAgICAgICAgICAuaW5jcihNSURfQ09VTlRFUilcclxuICAgICAgICAgICAgICAgICAgICAgICAgLmV4ZWMoKGVyciwgcmVzcCkgPT4ge1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgY29uc29sZS5sb2cocmVzcCk7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICB2YXIgbWFuaWZlc3QgPSB7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgbWlkOiByZXNwWzBdLFxyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHRpdGxlOiB0eXBlLnByZWZpeCtyZXNwWzBdLFxyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGRhdGVDcmVhdGVkOiBtb21lbnQoKS5mb3JtYXQoXCJZWVlZLU1NLUREXCIpLFxyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIG10eXBlSWQ6IHR5cGUuaWQsXHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgc3RhZ2VJZDogbWFuaWZlc3RTdGFnZXMub3Blbi5pZCxcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBzdGFnZTogbWFuaWZlc3RTdGFnZXMub3Blbi50aXRsZSxcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBjcmVhdGVkQnk6IHVzZXJcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIH07XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICB0aGlzLnJlZGlzQ2xpZW50Lm11bHRpKClcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAuaG1zZXQoTUlEX1BSRUZJWCArIG1hbmlmZXN0Lm1pZCwgbWFuaWZlc3QpXHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgLnNhZGQoT1BFTl9NQU5JRkVTVCwgbWFuaWZlc3QubWlkKVxyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIC5leGVjKChlcnIsIHJlc3VsdHMpID0+IHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgdGhpcy5teVNlYXJjaC5hZGQobWFuaWZlc3QubWlkLG1hbmlmZXN0KTtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgLy9hbHNvIGFkZCB0byB0aGUgaW5kZXggaGVyZSBvbmUgdGltZSBcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgaWYgKGVycikge1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgcmVqZWN0KGVycik7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIH0gZWxzZSB7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICByZXNvbHZlKG1hbmlmZXN0KVxyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgfSk7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIH0pO1xyXG4gICAgICAgICAgICAgICAgfVxyXG5cclxuICAgICAgICAgICAgfSkuY2F0Y2goKGVycik9PntcclxuICAgICAgICAgICAgICAgIGNvbnNvbGUubG9nKFwiZXJyIGRldGVjdGVkXCIpOyBcclxuICAgICAgICAgICAgICAgIGNvbnNvbGUubG9nKGVycik7XHJcbiAgICAgICAgICAgIH0pO1xyXG5cclxuICAgICAgICB9KTtcclxuXHJcbiAgICB9XHJcbiAgICBjaGFuZ2VTdGFnZShtaWQsIHN0YWdlcykge1xyXG4gICAgICAgIHJldHVybiBuZXcgUHJvbWlzZSgocmVzb2x2ZSwgcmVqZWN0KSA9PiB7XHJcbiAgICAgICAgICAgIFxyXG4gICAgICAgICAgICBscmVkaXMuY2xpZW50Lmhtc2V0KE1JRF9QUkVGSVgrbWlkLFwic3RhZ2VJZFwiLHN0YWdlcywoZXJyLHJlc3VsdCk9PntcclxuICAgICAgICAgICAgICAgIHZhciBzdGFnZSA9IHRoaXMuZ2V0U3RhZ2VCeUlkKHN0YWdlcyk7IFxyXG4gICAgICAgICAgICAgICAgY29uc29sZS5sb2coJ2xvb2tlZCB1cCB0aGUgc3RhZ2UgJytzdGFnZS50aXRsZSk7XHJcbiAgICAgICAgICAgICAgICBscmVkaXMuY2xpZW50Lmhtc2V0KE1JRF9QUkVGSVgrbWlkLFwic3RhZ2VcIixzdGFnZS50aXRsZSwoZXJyLHJlc3VsdDIpPT57fSk7IFxyXG4gICAgICAgICAgICAgICAgbHJlZGlzLmhnZXRhbGwoTUlEX1BSRUZJWCttaWQpLnRoZW4oKHVNYW5pZmVzdCk9PntcclxuICAgICAgICAgICAgICAgICAgICB0aGlzLm15U2VhcmNoLmRlbERvY3VtZW50KFwiaW5kZXg6bWFuaWZlc3RcIixtaWQsKGVycixyZXN1bHQxKT0+e1xyXG4gICAgICAgICAgICAgICAgICAgICAgICBjb25zb2xlLmxvZygnY2hhbmdpbmcgZG9jdW1lbnQnKTtcclxuICAgICAgICAgICAgICAgICAgICAgICAgY29uc29sZS5sb2coZXJyKTtcclxuICAgICAgICAgICAgICAgICAgICAgICAgY29uc29sZS5sb2cocmVzdWx0MSkgXHJcbiAgICAgICAgICAgICAgICAgICAgICAgIHRoaXMubXlTZWFyY2guYWRkKHVNYW5pZmVzdC5taWQsdU1hbmlmZXN0KTsgXHJcbiAgICAgICAgICAgICAgICAgICAgICAgIHJlc29sdmUocmVzdWx0KTsgXHJcbiAgICAgICAgICAgICAgICAgICAgfSk7IFxyXG4gICAgICAgICAgICAgICAgICAgXHJcbiAgICAgICAgICAgICAgICB9KTtcclxuICAgICAgICAgICAgICAgXHJcbiAgICAgICAgICAgIH0pO1xyXG4gICAgICAgICAgICAvL3dlIGFsc28gbmVlZCB0byB0byB1cGRhdGUgdGhlIGRvY3VtZW50IFxyXG5cclxuICAgICAgICAgICAgXHJcbiAgICAgICAgfSlcclxuICAgIH1cclxuICAgIHNoaXBNYW5pZmVzdChtaWQsYXdiLHVzZXIpe1xyXG4gICAgICAgIHJldHVybiBuZXcgUHJvbWlzZSgocmVzb2x2ZSxyZWplY3QpPT57XHJcbiAgICAgICAgICAgIGxyZWRpcy5obXNldChNSURfUFJFRklYK21pZCwge2F3Yjphd2Isc2hpcERhdGU6bW9tZW50KCkuZm9ybWF0KFwiWVlZWS1NTS1ERFwiKSxzaGlwcGVkQnk6dXNlcn0pLnRoZW4oKHNyZXN1bHQpPT57XHJcbiAgICAgICAgICAgICAgICBjb25zb2xlLmxvZyhzcmVzdWx0KTtcclxuICAgICAgICAgICAgICAgIHRoaXMuY2hhbmdlU3RhZ2UobWlkLDMpLnRoZW4oKHJlc3UpPT57XHJcbiAgICAgICAgICAgICAgICAgICAgcmVzb2x2ZShzcmVzdWx0KTtcclxuICAgICAgICAgICAgICAgIH0pO1xyXG4gICAgICAgICAgICAgICAgXHJcbiAgICAgICAgICAgIH0pXHJcbiAgICAgICAgfSlcclxuICAgIH1cclxuICAgIGxpc3RNYW5pZmVzdCh0eXBlLHBhZ2UscGFnZVNpemUpe1xyXG4gICAgICAgIHJldHVybiBuZXcgUHJvbWlzZSgocmVzb2x2ZSxyZWplY3QpPT57XHJcbiAgICAgICAgICAgIHZhciBvZmZzZXRWYWwgPSAocGFnZSAtIDEpICogcGFnZVNpemU7XHJcbiAgICAgICAgICAgIGNvbnNvbGUubG9nKCdvZmZzZXQgJytvZmZzZXRWYWwpO1xyXG4gICAgICAgICAgICBcclxuICAgICAgICAgICAgdGhpcy5teVNlYXJjaC5zZWFyY2goXCJAbXR5cGVJZDpcIit0eXBlLCB7XHJcbiAgICAgICAgICAgICAgICBvZmZzZXQ6b2Zmc2V0VmFsLFxyXG4gICAgICAgICAgICAgICAgbnVtYmVyT2ZSZXN1bHRzOiBwYWdlU2l6ZSxcclxuICAgICAgICAgICAgICAgIHNvcnRCeTogXCJtaWRcIixcclxuICAgICAgICAgICAgICAgIGRpcjogXCJERVNDXCJcclxuICAgICAgICAgICAgfSwgKHIxLCBkYXRhKSA9PiB7XHJcbiAgICAgICAgICAgICAgICBpZiAocjEpXHJcbiAgICAgICAgICAgICAgICAgICAgY29uc29sZS5sb2cocjEpO1xyXG4gICAgICAgICAgICAgICAgIHZhciBtYW5pZmVzdExpc3QgPSBbXTsgXHJcbiAgICAgICAgICAgICAgICAgZGF0YS5yZXN1bHRzLmZvckVhY2gobWFuaWZlc3RSZXN1bHQgPT4ge1xyXG4gICAgICAgICAgICAgICAgICAgIG1hbmlmZXN0TGlzdC5wdXNoKG1hbmlmZXN0UmVzdWx0LmRvYyk7ICAgIFxyXG4gICAgICAgICAgICAgICAgICAgIFxyXG4gICAgICAgICAgICAgICAgIH0pO1xyXG4gICAgICAgICAgICAgICAgIC8vY29uc29sZS5sb2cobWFuaWZlc3RMaXN0KTtcclxuICAgICAgICAgICAgICAgICB2YXIgcGFnZWREYXRhID0ge1xyXG4gICAgICAgICAgICAgICAgICAgIG1hbmlmZXN0czptYW5pZmVzdExpc3QsXHJcbiAgICAgICAgICAgICAgICAgICAgdG90YWxSZXN1bHRzIDogZGF0YS50b3RhbFJlc3VsdHMsXHJcbiAgICAgICAgICAgICAgICAgICAgcGFnZSA6IHBhZ2UsXHJcbiAgICAgICAgICAgICAgICAgICAgcGFnZVNpemU6IHBhZ2VTaXplLCBcclxuICAgICAgICAgICAgICAgICAgICBUb3RhbFBhZ2VzIDogKGRhdGEudG90YWxSZXN1bHRzL3BhZ2VTaXplKVxyXG4gICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICAgICAgcmVzb2x2ZShwYWdlZERhdGEpO1xyXG4gICAgICAgICAgICAgICAgY29uc29sZS5sb2cobWFuaWZlc3RMaXN0KTtcclxuICAgICAgICAgICAgICAgIFxyXG4gICAgICAgICAgICB9KTtcclxuICAgICAgICB9KTtcclxuICAgIH1cclxuICAgIGdldE1hbmlmZXN0KG1pZCkge1xyXG4gICAgICAgIHJldHVybiBscmVkaXMuaGdldGFsbChNSURfUFJFRklYK21pZClcclxuICAgIH1cclxuICAgIGRlbGV0ZU1hbmlmZXN0KG1pZCl7XHJcbiAgICAgICByZXR1cm4gbmV3IFByb21pc2UoKHJlc29sdmUscmVqZWN0KT0+e1xyXG4gICAgICAgIGxyZWRpcy5jbGllbnQuZGVsKE1JRF9QUkVGSVgrbWlkLChlcnIscmVzcCk9PntcclxuICAgICAgICAgICAgY29uc29sZS5sb2cocmVzcCk7IFxyXG4gICAgICAgICAgICB0aGlzLm15U2VhcmNoLmRlbERvY3VtZW50KFwiaW5kZXg6bWFuaWZlc3RcIixtaWQsKGVycixyZXN1bHQpPT57XHJcbiAgICAgICAgICAgICAgICBjb25zb2xlLmxvZyhcImRlbGV0aW5nIG1pZFwiKTsgXHJcbiAgICAgICAgICAgICAgICBjb25zb2xlLmxvZyhlcnIpOyBcclxuICAgICAgICAgICAgICAgIGNvbnNvbGUubG9nKHJlc3VsdCk7XHJcbiAgICAgICAgICAgIH0pOyBcclxuICAgICAgICAgICAgbHJlZGlzLnNyZW0oT1BFTl9NQU5JRkVTVCxtaWQpO1xyXG4gICAgICAgICAgICByZXNvbHZlKHtkZWxldGVkOnRydWV9KSAgICBcclxuICAgICAgICB9KVxyXG5cclxuICAgICAgIH0pOyBcclxuICAgICAgICBcclxuICAgICAgICBcclxuICAgIH1cclxuICAgIGdldFR5cGVieUlkIChpZCl7XHJcbiAgICAgICAgaWYgKGlkID09IDEpe1xyXG4gICAgICAgICAgICByZXR1cm4gbWFuaWZlc3RUeXBlcy5haXI7XHJcbiAgICAgICAgfVxyXG4gICAgICAgIGlmIChpZCA9PSAyKXtcclxuICAgICAgICAgICAgcmV0dXJuIG1hbmlmZXN0VHlwZXMub2NlYW47XHJcbiAgICAgICAgfVxyXG4gICAgICAgIGlmIChpZCA9PSAzKXtcclxuICAgICAgICAgICAgcmV0dXJuIG1hbmlmZXN0VHlwZXMuaGF6bWF0O1xyXG4gICAgICAgIH1cclxuICAgICAgICByZXR1cm4gbWFuaWZlc3RUeXBlcy5haXI7IFxyXG4gICAgfVxyXG4gICAgZ2V0U3RhZ2VCeUlkKGlkKXtcclxuICAgICAgICBpZiAoaWQgPT0gMSl7XHJcbiAgICAgICAgICAgIHJldHVybiBtYW5pZmVzdFN0YWdlcy5vcGVuO1xyXG4gICAgICAgIH1cclxuICAgICAgICBpZiAoaWQgPT0gMil7XHJcbiAgICAgICAgICAgIHJldHVybiBtYW5pZmVzdFN0YWdlcy5jbG9zZWQ7XHJcbiAgICAgICAgfVxyXG4gICAgICAgIGlmIChpZCA9PSAzKXtcclxuICAgICAgICAgICAgcmV0dXJuIG1hbmlmZXN0U3RhZ2VzLnNoaXBwZWQ7XHJcbiAgICAgICAgfVxyXG4gICAgICAgIGlmIChpZCA9PSA0KXtcclxuICAgICAgICAgICAgcmV0dXJuIG1hbmlmZXN0U3RhZ2VzLnZlcmlmaWVkO1xyXG4gICAgICAgIH1cclxuICAgICAgICByZXR1cm4gbWFuaWZlc3RTdGFnZXMub3BlbjsgXHJcbiAgICB9XHJcbn0iXX0=
