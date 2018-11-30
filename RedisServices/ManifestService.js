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
        id: 1,
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
                _this.mySearch.search("@stageId:" + 1 + " @mtypeId:" + typeId, {
                    offset: 0,
                    numberOfResults: 100,
                    sortBy: "mid",
                    dir: "DESC"
                }, function (r1, data) {
                    if (r1) console.log(r1);

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
                getOpenManifest.then(function (members) {
                    console.log("openCount");
                    //we need to do open count by type
                    console.log(members);

                    if (true) {
                        //we can't add the manifest reject 
                        reject({
                            "message": "there is an open manifest please close it"
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
                });
            });
        }
    }, {
        key: 'changeStage',
        value: function changeStage(mid, stages) {
            return new Promise(function (resolve, reject) {
                lredis.client.hset(MID_PREFIX + mid, "stageId", stages.id, function (err, result) {
                    resolve(result);
                });
            });
        }
    }, {
        key: 'listManifest',
        value: function listManifest(type, page, pageSize) {
            var _this3 = this;

            return new Promise(function (resolve, reject) {
                var offsetVal = (page - 1) * pageSize;
                console.log('offset ' + offsetVal);

                _this3.mySearch.search("@mtypeId:" + type, {
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
            var _this4 = this;

            lredis.client.del(MID_PREFIX + mid, function (err, resp) {
                console.log(resp);
                _this4.mySearch.delDocument("index:manifest", mid);
                lredis.srem(OPEN_MANIFEST, mid);
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
    }]);

    return ManifestService;
}();
//# sourceMappingURL=data:application/json;charset=utf8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIlJlZGlzU2VydmljZXMvTWFuaWZlc3RTZXJ2aWNlLmVzNiJdLCJuYW1lcyI6WyJyZWRpcyIsInJlcXVpcmUiLCJscmVkaXMiLCJtb21lbnQiLCJyZWRpc1NlYXJjaCIsIk1JRF9DT1VOVEVSIiwiTUlEX1BSRUZJWCIsIk1JRF9JTkRFWCIsIk9QRU5fTUFOSUZFU1QiLCJDTE9TRURfTUFOSUZFU1QiLCJTSElQUEVEX01BTklGRVNUIiwiVkVSSUZJRURfTUFOSUZFU1QiLCJtYW5pZmVzdFR5cGVzIiwiYWlyIiwiaWQiLCJ0aXRsZSIsInByZWZpeCIsIm9jZWFuIiwiaGF6bWF0IiwibWFuaWZlc3RTdGFnZXMiLCJvcGVuIiwiY2xvc2VkIiwic2hpcHBlZCIsInZlcmlmaWVkIiwiTWFuaWZlc3RTZXJ2aWNlIiwicmVkaXNDbGllbnQiLCJjbGllbnQiLCJtdHlwZXMiLCJtc3RhZ2VzIiwiY2hlY2tTZXR1cCIsInNldHVwSW5kZXgiLCJteVNlYXJjaCIsImNsaWVudE9wdGlvbnMiLCJhdXRoX3Bhc3MiLCJleGlzdHMiLCJlcnIiLCJyZXMiLCJzZXQiLCJteXR5cGVzIiwidHlwZUlkIiwiUHJvbWlzZSIsInJlc29sdmUiLCJyZWplY3QiLCJzZWFyY2giLCJvZmZzZXQiLCJudW1iZXJPZlJlc3VsdHMiLCJzb3J0QnkiLCJkaXIiLCJyMSIsImRhdGEiLCJjb25zb2xlIiwibG9nIiwidG90YWxSZXN1bHRzIiwidHlwZSIsInVzZXIiLCJnZXRPcGVuTWFuaWZlc3QiLCJ0aGVuIiwibWVtYmVycyIsIm11bHRpIiwiaW5jciIsImV4ZWMiLCJyZXNwIiwibWFuaWZlc3QiLCJtaWQiLCJkYXRlQ3JlYXRlZCIsImZvcm1hdCIsIm10eXBlSWQiLCJzdGFnZUlkIiwic3RhZ2UiLCJjcmVhdGVkQnkiLCJobXNldCIsInNhZGQiLCJyZXN1bHRzIiwiYWRkIiwic3RhZ2VzIiwiaHNldCIsInJlc3VsdCIsInBhZ2UiLCJwYWdlU2l6ZSIsIm9mZnNldFZhbCIsIm1hbmlmZXN0TGlzdCIsImZvckVhY2giLCJwdXNoIiwibWFuaWZlc3RSZXN1bHQiLCJkb2MiLCJwYWdlZERhdGEiLCJtYW5pZmVzdHMiLCJUb3RhbFBhZ2VzIiwiaGdldGFsbCIsImRlbCIsImRlbERvY3VtZW50Iiwic3JlbSJdLCJtYXBwaW5ncyI6Ijs7Ozs7Ozs7OztBQUFBLElBQUlBLFFBQVFDLFFBQVEsT0FBUixDQUFaO0FBQ0EsSUFBSUMsU0FBU0QsUUFBUSw2QkFBUixDQUFiO0FBQ0EsSUFBSUUsU0FBU0YsUUFBUSxRQUFSLENBQWI7QUFDQSxJQUFJRyxjQUFjSCxRQUFRLGtCQUFSLENBQWxCO0FBQ0EsSUFBTUksY0FBYyxtQkFBcEI7QUFDQSxJQUFNQyxhQUFhLGVBQW5CO0FBQ0EsSUFBTUMsWUFBWSxnQkFBbEI7QUFDQSxJQUFNQyxnQkFBZ0IsZUFBdEI7QUFDQSxJQUFNQyxrQkFBa0IsaUJBQXhCO0FBQ0EsSUFBTUMsbUJBQW1CLGtCQUF6QjtBQUNBLElBQU1DLG9CQUFvQixtQkFBMUIsQyxDQUErQzs7QUFFL0MsSUFBSUMsZ0JBQWdCO0FBQ2hCQyxTQUFLO0FBQ0RDLFlBQUksQ0FESDtBQUVEQyxlQUFPLFdBRk47QUFHREMsZ0JBQVE7QUFIUCxLQURXO0FBTWhCQyxXQUFPO0FBQ0hILFlBQUksQ0FERDtBQUVIQyxlQUFPLE9BRko7QUFHSEMsZ0JBQVE7QUFITCxLQU5TO0FBV2hCRSxZQUFRO0FBQ0pKLFlBQUksQ0FEQTtBQUVKQyxlQUFPLFFBRkg7QUFHSkMsZ0JBQVE7QUFISjtBQVhRLENBQXBCO0FBaUJBLElBQUlHLGlCQUFpQjtBQUNqQkMsVUFBTTtBQUNGTixZQUFJLENBREY7QUFFRkMsZUFBTztBQUZMLEtBRFc7QUFLakJNLFlBQVE7QUFDSlAsWUFBSSxDQURBO0FBRUpDLGVBQU87QUFGSCxLQUxTO0FBU2pCTyxhQUFTO0FBQ0xSLFlBQUksQ0FEQztBQUVMQyxlQUFPO0FBRkYsS0FUUTtBQWFqQlEsY0FBVTtBQUNOVCxZQUFJLENBREU7QUFFTkMsZUFBTztBQUZEOztBQWJPLENBQXJCOztJQW9CYVMsZSxX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U2VydmljZXMvTWFuaWZlc3RTZXJ2aWNlLmpzIiwic291cmNlc0NvbnRlbnQiOlsidmFyIHJlZGlzID0gcmVxdWlyZSgncmVkaXMnKTtcclxudmFyIGxyZWRpcyA9IHJlcXVpcmUoJy4uL0RhdGFTZXJ2aWNlcy9yZWRpcy1sb2NhbCcpO1xyXG52YXIgbW9tZW50ID0gcmVxdWlyZSgnbW9tZW50Jyk7XHJcbnZhciByZWRpc1NlYXJjaCA9IHJlcXVpcmUoJ3JlZGlzZWFyY2hjbGllbnQnKTtcclxuY29uc3QgTUlEX0NPVU5URVIgPSBcImdsb2JhbDptaWRDb3VudGVyXCI7XHJcbmNvbnN0IE1JRF9QUkVGSVggPSBcInRldzptYW5pZmVzdDpcIjtcclxuY29uc3QgTUlEX0lOREVYID0gXCJpbmRleDptYW5pZmVzdFwiO1xyXG5jb25zdCBPUEVOX01BTklGRVNUID0gXCJtYW5pZmVzdDpvcGVuXCI7XHJcbmNvbnN0IENMT1NFRF9NQU5JRkVTVCA9IFwibWFuaWZlc3Q6Y2xvc2VkXCJcclxuY29uc3QgU0hJUFBFRF9NQU5JRkVTVCA9IFwibWFuaWZlc3Q6c2hpcHBlZFwiXHJcbmNvbnN0IFZFUklGSUVEX01BTklGRVNUID0gXCJtYW5pZmVzdDp2ZXJpZmllZFwiOyAvLyBtYW5pZmVzdCB0aGF0IGhhdmUgZHV0aWVzIHZlcmlmaWVkXHJcblxyXG52YXIgbWFuaWZlc3RUeXBlcyA9IHtcclxuICAgIGFpcjoge1xyXG4gICAgICAgIGlkOiAxLFxyXG4gICAgICAgIHRpdGxlOiBcIkFpciBDYXJnb1wiLFxyXG4gICAgICAgIHByZWZpeDogXCJNLVwiXHJcbiAgICB9LFxyXG4gICAgb2NlYW46IHtcclxuICAgICAgICBpZDogMSxcclxuICAgICAgICB0aXRsZTogXCJPY2VhblwiLFxyXG4gICAgICAgIHByZWZpeDogXCJTLVwiXHJcbiAgICB9LFxyXG4gICAgaGF6bWF0OiB7XHJcbiAgICAgICAgaWQ6IDMsXHJcbiAgICAgICAgdGl0bGU6IFwiSEFaTUFUXCIsXHJcbiAgICAgICAgcHJlZml4OiBcIkgtXCJcclxuICAgIH1cclxufVxyXG52YXIgbWFuaWZlc3RTdGFnZXMgPSB7XHJcbiAgICBvcGVuOiB7XHJcbiAgICAgICAgaWQ6IDEsXHJcbiAgICAgICAgdGl0bGU6ICdPcGVuJ1xyXG4gICAgfSxcclxuICAgIGNsb3NlZDoge1xyXG4gICAgICAgIGlkOiAyLFxyXG4gICAgICAgIHRpdGxlOiAnQ2xvc2VkJ1xyXG4gICAgfSxcclxuICAgIHNoaXBwZWQ6IHtcclxuICAgICAgICBpZDogMyxcclxuICAgICAgICB0aXRsZTogJ1NoaXBwZWQnXHJcbiAgICB9LFxyXG4gICAgdmVyaWZpZWQ6IHtcclxuICAgICAgICBpZDogNCxcclxuICAgICAgICB0aXRsZTogJ1ZlcmlmaWVkJ1xyXG4gICAgfVxyXG5cclxufVxyXG5cclxuZXhwb3J0IGNsYXNzIE1hbmlmZXN0U2VydmljZSB7XHJcblxyXG4gICAgY29uc3RydWN0b3IoKSB7XHJcbiAgICAgICAgXHJcbiAgICAgICAgdGhpcy5yZWRpc0NsaWVudCA9IGxyZWRpcy5jbGllbnQ7XHJcbiAgICAgICAgdGhpcy5tdHlwZXMgPSBtYW5pZmVzdFR5cGVzO1xyXG4gICAgICAgIHRoaXMubXN0YWdlcyA9IG1hbmlmZXN0U3RhZ2VzO1xyXG4gICAgICAgIC8vY2hlY2sgdG8gZW5zdXJlIHdlIGhhdmUgdGhlIG1hbmlmZXN0IGNvdW50ZXIgXHJcbiAgICAgICAgdGhpcy5jaGVja1NldHVwKCk7IFxyXG4gICAgICAgIHRoaXMuc2V0dXBJbmRleCgpXHJcbiAgICB9XHJcbiAgICBzZXR1cEluZGV4KCl7XHJcbiAgICAgICAgdGhpcy5teVNlYXJjaCA9IHJlZGlzU2VhcmNoKHJlZGlzLCAnaW5kZXg6bWFuaWZlc3QnLCB7XHJcbiAgICAgICAgICAgIGNsaWVudE9wdGlvbnM6IHtcclxuICAgICAgICAgICAgICAgICdob3N0JzogJ3JlZGlzLTE0ODk3LmMyODIyLnVzLWVhc3QtMS1tei5lYzIuY2xvdWQucmxyY3AuY29tJyxcclxuICAgICAgICAgICAgICAgICdwb3J0JzogJzE0ODk3JyxcclxuICAgICAgICAgICAgICAgIGF1dGhfcGFzczogJ3Q1YXRSdVdRbE9XN1ZwMnVoWnBRaXZjSW90RG1UUHBsJ1xyXG4gICAgICAgICAgICB9XHJcbiAgICAgICAgfSk7XHJcbiAgICB9XHJcbiAgICBjaGVja1NldHVwKCl7XHJcbiAgICAgICAgdGhpcy5yZWRpc0NsaWVudC5leGlzdHMoTUlEX0NPVU5URVIsIChlcnIsIHJlcykgPT4ge1xyXG4gICAgICAgICAgICBpZiAocmVzID09IDApIHtcclxuICAgICAgICAgICAgICAgIC8vY3JlYXRlIHRoZSBtYW5pZmVzdCBcclxuICAgICAgICAgICAgICAgIGxyZWRpcy5zZXQoTUlEX0NPVU5URVIsIDEwMCk7XHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgXHJcbiAgICAgICAgfSk7XHJcbiAgICB9XHJcblxyXG4gICAgZ2V0VHlwZXMoKSB7XHJcbiAgICAgICAgcmV0dXJuIHRoaXMubXl0eXBlc1xyXG4gICAgfVxyXG4gICAgZ2V0U3RhZ2VzKCkge1xyXG4gICAgICAgIHJldHVybiB0aGlzLm1hbmlmZXN0U3RhZ2VzO1xyXG4gICAgfVxyXG5cclxuICAgIGdldE9wZW5NYW5pZmVzdCh0eXBlSWQpe1xyXG5cclxuICAgICAgICByZXR1cm4gbmV3IFByb21pc2UoKHJlc29sdmUscmVqZWN0KT0+e1xyXG4gICAgICAgICAgICB0aGlzLm15U2VhcmNoLnNlYXJjaChcIkBzdGFnZUlkOlwiKzErXCIgQG10eXBlSWQ6XCIrdHlwZUlkLCB7XHJcbiAgICAgICAgICAgICAgICBvZmZzZXQ6MCxcclxuICAgICAgICAgICAgICAgIG51bWJlck9mUmVzdWx0czogMTAwLFxyXG4gICAgICAgICAgICAgICAgc29ydEJ5OiBcIm1pZFwiLFxyXG4gICAgICAgICAgICAgICAgZGlyOiBcIkRFU0NcIlxyXG4gICAgICAgICAgICB9LCAocjEsIGRhdGEpID0+IHtcclxuICAgICAgICAgICAgICAgIGlmIChyMSlcclxuICAgICAgICAgICAgICAgICAgICBjb25zb2xlLmxvZyhyMSk7XHJcbiAgICAgICAgICAgICAgICAgXHJcbiAgICAgICAgICAgICAgICAgLy9jb25zb2xlLmxvZyhtYW5pZmVzdExpc3QpO1xyXG4gICAgICAgICAgICAgICAgIGNvbnNvbGUubG9nKGRhdGEpO1xyXG4gICAgICAgICAgICAgICAgcmVzb2x2ZShkYXRhLnRvdGFsUmVzdWx0cyk7XHJcbiAgICAgICAgICAgICAgICBcclxuICAgICAgICAgICAgICAgIFxyXG4gICAgICAgICAgICB9KTtcclxuICAgICAgICAgICAgXHJcbiAgICAgICAgfSk7XHJcbiAgICAgICAgXHJcbiAgICB9XHJcbiAgICBjcmVhdGVOZXdNYW5pZmVzdCh0eXBlLCB1c2VyKSB7XHJcbiAgICAgICAgLy93ZSBoYXZlIHNvbWUgcnVsZXMgdG8gZm9sbG93IGhlcmUgXHJcbiAgICAgICAgLy8xLiBhIG5ldyBtYW5pZmVzdCBjYW5ub3QgYmUgY3JlYXRlZCBpZiB0aGUgcHJldmlvdXMgbWFuaWZlc3QgaXMgbm90IGNsb3NlZCBcclxuICAgICAgICAvL2NoZWNrIGZvciBvcGVuIG1hbmlmZXN0IGZpcnN0IFxyXG4gICAgICAgIHJldHVybiBuZXcgUHJvbWlzZSgocmVzb2x2ZSwgcmVqZWN0KSA9PiB7XHJcbiAgICAgICAgICAgIGdldE9wZW5NYW5pZmVzdC50aGVuKChtZW1iZXJzKSA9PiB7XHJcbiAgICAgICAgICAgICAgICBjb25zb2xlLmxvZyhcIm9wZW5Db3VudFwiKVxyXG4gICAgICAgICAgICAgICAgLy93ZSBuZWVkIHRvIGRvIG9wZW4gY291bnQgYnkgdHlwZVxyXG4gICAgICAgICAgICAgICAgY29uc29sZS5sb2cobWVtYmVycyk7XHJcbiAgICAgICAgICAgICAgICBcclxuICAgICAgICAgICAgICAgIGlmICh0cnVlKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgLy93ZSBjYW4ndCBhZGQgdGhlIG1hbmlmZXN0IHJlamVjdCBcclxuICAgICAgICAgICAgICAgICAgICByZWplY3Qoe1xyXG4gICAgICAgICAgICAgICAgICAgICAgICBcIm1lc3NhZ2VcIjogXCJ0aGVyZSBpcyBhbiBvcGVuIG1hbmlmZXN0IHBsZWFzZSBjbG9zZSBpdFwiXHJcbiAgICAgICAgICAgICAgICAgICAgfSk7XHJcblxyXG4gICAgICAgICAgICAgICAgfSBlbHNlIHtcclxuICAgICAgICAgICAgICAgICAgICB0aGlzLnJlZGlzQ2xpZW50Lm11bHRpKClcclxuICAgICAgICAgICAgICAgICAgICAgICAgLmluY3IoTUlEX0NPVU5URVIpXHJcbiAgICAgICAgICAgICAgICAgICAgICAgIC5leGVjKChlcnIsIHJlc3ApID0+IHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGNvbnNvbGUubG9nKHJlc3ApO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgdmFyIG1hbmlmZXN0ID0ge1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIG1pZDogcmVzcFswXSxcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB0aXRsZTogdHlwZS5wcmVmaXgrcmVzcFswXSxcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBkYXRlQ3JlYXRlZDogbW9tZW50KCkuZm9ybWF0KFwiWVlZWS1NTS1ERFwiKSxcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBtdHlwZUlkOiB0eXBlLmlkLFxyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHN0YWdlSWQ6IG1hbmlmZXN0U3RhZ2VzLm9wZW4uaWQsXHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgc3RhZ2U6IG1hbmlmZXN0U3RhZ2VzLm9wZW4udGl0bGUsXHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgY3JlYXRlZEJ5OiB1c2VyXHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICB9O1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgdGhpcy5yZWRpc0NsaWVudC5tdWx0aSgpXHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgLmhtc2V0KE1JRF9QUkVGSVggKyBtYW5pZmVzdC5taWQsIG1hbmlmZXN0KVxyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIC5zYWRkKE9QRU5fTUFOSUZFU1QsIG1hbmlmZXN0Lm1pZClcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAuZXhlYygoZXJyLCByZXN1bHRzKSA9PiB7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHRoaXMubXlTZWFyY2guYWRkKG1hbmlmZXN0Lm1pZCxtYW5pZmVzdCk7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIC8vYWxzbyBhZGQgdG8gdGhlIGluZGV4IGhlcmUgb25lIHRpbWUgXHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGlmIChlcnIpIHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHJlamVjdChlcnIpO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB9IGVsc2Uge1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgcmVzb2x2ZShtYW5pZmVzdClcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIH0pO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICB9KTtcclxuICAgICAgICAgICAgICAgIH1cclxuXHJcbiAgICAgICAgICAgIH0pO1xyXG5cclxuICAgICAgICB9KTtcclxuXHJcbiAgICB9XHJcbiAgICBjaGFuZ2VTdGFnZShtaWQsIHN0YWdlcykge1xyXG4gICAgICAgIHJldHVybiBuZXcgUHJvbWlzZSgocmVzb2x2ZSwgcmVqZWN0KSA9PiB7XHJcbiAgICAgICAgICAgIGxyZWRpcy5jbGllbnRcclxuICAgICAgICAgICAgLmhzZXQoTUlEX1BSRUZJWCttaWQsXCJzdGFnZUlkXCIsc3RhZ2VzLmlkLChlcnIscmVzdWx0KT0+e1xyXG4gICAgICAgICAgICAgICAgcmVzb2x2ZShyZXN1bHQpOyBcclxuICAgICAgICAgICAgfSk7XHJcbiAgICAgICAgICAgIFxyXG4gICAgICAgIH0pXHJcbiAgICB9XHJcbiAgICBsaXN0TWFuaWZlc3QodHlwZSxwYWdlLHBhZ2VTaXplKXtcclxuICAgICAgICByZXR1cm4gbmV3IFByb21pc2UoKHJlc29sdmUscmVqZWN0KT0+e1xyXG4gICAgICAgICAgICB2YXIgb2Zmc2V0VmFsID0gKHBhZ2UgLSAxKSAqIHBhZ2VTaXplO1xyXG4gICAgICAgICAgICBjb25zb2xlLmxvZygnb2Zmc2V0ICcrb2Zmc2V0VmFsKTtcclxuICAgICAgICAgICAgXHJcbiAgICAgICAgICAgIHRoaXMubXlTZWFyY2guc2VhcmNoKFwiQG10eXBlSWQ6XCIrdHlwZSwge1xyXG4gICAgICAgICAgICAgICAgb2Zmc2V0Om9mZnNldFZhbCxcclxuICAgICAgICAgICAgICAgIG51bWJlck9mUmVzdWx0czogcGFnZVNpemUsXHJcbiAgICAgICAgICAgICAgICBzb3J0Qnk6IFwibWlkXCIsXHJcbiAgICAgICAgICAgICAgICBkaXI6IFwiREVTQ1wiXHJcbiAgICAgICAgICAgIH0sIChyMSwgZGF0YSkgPT4ge1xyXG4gICAgICAgICAgICAgICAgaWYgKHIxKVxyXG4gICAgICAgICAgICAgICAgICAgIGNvbnNvbGUubG9nKHIxKTtcclxuICAgICAgICAgICAgICAgICB2YXIgbWFuaWZlc3RMaXN0ID0gW107IFxyXG4gICAgICAgICAgICAgICAgIGRhdGEucmVzdWx0cy5mb3JFYWNoKG1hbmlmZXN0UmVzdWx0ID0+IHtcclxuICAgICAgICAgICAgICAgICAgICBtYW5pZmVzdExpc3QucHVzaChtYW5pZmVzdFJlc3VsdC5kb2MpOyAgICBcclxuICAgICAgICAgICAgICAgICAgICBcclxuICAgICAgICAgICAgICAgICB9KTtcclxuICAgICAgICAgICAgICAgICAvL2NvbnNvbGUubG9nKG1hbmlmZXN0TGlzdCk7XHJcbiAgICAgICAgICAgICAgICAgdmFyIHBhZ2VkRGF0YSA9IHtcclxuICAgICAgICAgICAgICAgICAgICBtYW5pZmVzdHM6bWFuaWZlc3RMaXN0LFxyXG4gICAgICAgICAgICAgICAgICAgIHRvdGFsUmVzdWx0cyA6IGRhdGEudG90YWxSZXN1bHRzLFxyXG4gICAgICAgICAgICAgICAgICAgIHBhZ2UgOiBwYWdlLFxyXG4gICAgICAgICAgICAgICAgICAgIHBhZ2VTaXplOiBwYWdlU2l6ZSwgXHJcbiAgICAgICAgICAgICAgICAgICAgVG90YWxQYWdlcyA6IChkYXRhLnRvdGFsUmVzdWx0cy9wYWdlU2l6ZSlcclxuICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgICAgIHJlc29sdmUocGFnZWREYXRhKTtcclxuICAgICAgICAgICAgICAgIGNvbnNvbGUubG9nKG1hbmlmZXN0TGlzdCk7XHJcbiAgICAgICAgICAgICAgICBcclxuICAgICAgICAgICAgfSk7XHJcbiAgICAgICAgfSk7XHJcbiAgICB9XHJcbiAgICBnZXRNYW5pZmVzdChtaWQpIHtcclxuICAgICAgICByZXR1cm4gbHJlZGlzLmhnZXRhbGwoTUlEX1BSRUZJWCttaWQpXHJcbiAgICB9XHJcbiAgICBkZWxldGVNYW5pZmVzdChtaWQpe1xyXG4gICAgICAgIGxyZWRpcy5jbGllbnQuZGVsKE1JRF9QUkVGSVgrbWlkLChlcnIscmVzcCk9PntcclxuICAgICAgICAgICAgY29uc29sZS5sb2cocmVzcCk7IFxyXG4gICAgICAgICAgICB0aGlzLm15U2VhcmNoLmRlbERvY3VtZW50KFwiaW5kZXg6bWFuaWZlc3RcIixtaWQpOyBcclxuICAgICAgICAgICAgbHJlZGlzLnNyZW0oT1BFTl9NQU5JRkVTVCxtaWQpO1xyXG4gICAgICAgIH0pXHJcbiAgICAgICAgXHJcbiAgICB9XHJcbiAgICBnZXRUeXBlYnlJZCAoaWQpe1xyXG4gICAgICAgIGlmIChpZCA9PSAxKXtcclxuICAgICAgICAgICAgcmV0dXJuIG1hbmlmZXN0VHlwZXMuYWlyO1xyXG4gICAgICAgIH1cclxuICAgICAgICBpZiAoaWQgPT0gMil7XHJcbiAgICAgICAgICAgIHJldHVybiBtYW5pZmVzdFR5cGVzLm9jZWFuO1xyXG4gICAgICAgIH1cclxuICAgICAgICBpZiAoaWQgPT0gMyl7XHJcbiAgICAgICAgICAgIHJldHVybiBtYW5pZmVzdFR5cGVzLmhhem1hdDtcclxuICAgICAgICB9XHJcbiAgICAgICAgcmV0dXJuIG1hbmlmZXN0VHlwZXMuYWlyOyBcclxuICAgIH1cclxufSJdfQ==
