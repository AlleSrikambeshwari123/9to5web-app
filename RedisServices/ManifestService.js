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
        key: 'updateManifestDetails',
        value: function updateManifestDetails(details) {
            var _this = this;

            return new Promise(function (resolve, reject) {
                _this.mySearch.update(details.id, details, function (err, result) {
                    lredis.hmset(MID_PREFIX + details.id, details);
                    resolve({ updated: true });
                });
            });
        }
    }, {
        key: 'getOpenManifest',
        value: function getOpenManifest(typeId) {
            var _this2 = this;

            return new Promise(function (resolve, reject) {
                console.log('@stageId:[' + typeId + ' ' + typeId + '] @mtypeId:' + typeId);
                _this2.mySearch.search('@stageId:[1 1] @mtypeId:' + typeId, {
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
            var _this3 = this;

            //we have some rules to follow here 
            //1. a new manifest cannot be created if the previous manifest is not closed 
            //check for open manifest first 
            var srv = this;
            return new Promise(function (resolve, reject) {
                _this3.getOpenManifest(type.id).then(function (openCount) {

                    console.log(type);
                    // if (openCount>0) {
                    //     //we can't add the manifest reject 
                    //     reject({
                    //         "message": "There is an open manifest Please close it before creating a new manifest."
                    //     });

                    // } else {
                    _this3.redisClient.multi().incr(MID_COUNTER).exec(function (err, resp) {
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
            var _this4 = this;

            return new Promise(function (resolve, reject) {

                lredis.client.hmset(MID_PREFIX + mid, "stageId", stages, function (err, result) {
                    var stage = _this4.getStageById(stages);
                    console.log('looked up the stage ' + stage.title);
                    lredis.client.hmset(MID_PREFIX + mid, "stage", stage.title, function (err, result2) {});
                    lredis.hgetall(MID_PREFIX + mid).then(function (uManifest) {
                        _this4.mySearch.delDocument("index:manifest", mid, function (err, result1) {
                            console.log('changing document');
                            console.log(err);
                            console.log(result1);
                            _this4.mySearch.add(uManifest.mid, uManifest);
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
            var _this5 = this;

            return new Promise(function (resolve, reject) {
                lredis.hmset(MID_PREFIX + mid, { awb: awb, shipDate: moment().format("YYYY-MM-DD"), shippedBy: user }).then(function (sresult) {
                    console.log(sresult);
                    _this5.changeStage(mid, 3).then(function (resu) {
                        resolve(sresult);
                    });
                });
            });
        }
    }, {
        key: 'listManifest',
        value: function listManifest(type, page, pageSize) {
            var _this6 = this;

            return new Promise(function (resolve, reject) {
                var offsetVal = (page - 1) * pageSize;
                console.log('offset ' + offsetVal);

                _this6.mySearch.search("@mtypeId:" + type, {
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
            var _this7 = this;

            return new Promise(function (resolve, reject) {
                lredis.client.del(MID_PREFIX + mid, function (err, resp) {
                    console.log(resp);
                    _this7.mySearch.delDocument("index:manifest", mid, function (err, result) {
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
//# sourceMappingURL=data:application/json;charset=utf8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIlJlZGlzU2VydmljZXMvTWFuaWZlc3RTZXJ2aWNlLmVzNiJdLCJuYW1lcyI6WyJyZWRpcyIsInJlcXVpcmUiLCJscmVkaXMiLCJtb21lbnQiLCJyZWRpc1NlYXJjaCIsIk1JRF9DT1VOVEVSIiwiTUlEX1BSRUZJWCIsIk1JRF9JTkRFWCIsIk9QRU5fTUFOSUZFU1QiLCJDTE9TRURfTUFOSUZFU1QiLCJTSElQUEVEX01BTklGRVNUIiwiVkVSSUZJRURfTUFOSUZFU1QiLCJtYW5pZmVzdFR5cGVzIiwiYWlyIiwiaWQiLCJ0aXRsZSIsInByZWZpeCIsIm9jZWFuIiwiaGF6bWF0IiwibWFuaWZlc3RTdGFnZXMiLCJvcGVuIiwiY2xvc2VkIiwic2hpcHBlZCIsInZlcmlmaWVkIiwiTWFuaWZlc3RTZXJ2aWNlIiwicmVkaXNDbGllbnQiLCJjbGllbnQiLCJtdHlwZXMiLCJtc3RhZ2VzIiwiY2hlY2tTZXR1cCIsInNldHVwSW5kZXgiLCJteVNlYXJjaCIsImNsaWVudE9wdGlvbnMiLCJzZWFyY2hDbGllbnREZXRhaWxzIiwiZXhpc3RzIiwiZXJyIiwicmVzIiwic2V0IiwibXl0eXBlcyIsImRldGFpbHMiLCJQcm9taXNlIiwicmVzb2x2ZSIsInJlamVjdCIsInVwZGF0ZSIsInJlc3VsdCIsImhtc2V0IiwidXBkYXRlZCIsInR5cGVJZCIsImNvbnNvbGUiLCJsb2ciLCJzZWFyY2giLCJvZmZzZXQiLCJudW1iZXJPZlJlc3VsdHMiLCJzb3J0QnkiLCJkaXIiLCJyMSIsImRhdGEiLCJ0b3RhbFJlc3VsdHMiLCJ0eXBlIiwidXNlciIsInNydiIsImdldE9wZW5NYW5pZmVzdCIsInRoZW4iLCJvcGVuQ291bnQiLCJtdWx0aSIsImluY3IiLCJleGVjIiwicmVzcCIsIm1hbmlmZXN0IiwibWlkIiwiZGF0ZUNyZWF0ZWQiLCJ1bml4IiwibXR5cGVJZCIsInN0YWdlSWQiLCJzdGFnZSIsImNyZWF0ZWRCeSIsInNhZGQiLCJyZXN1bHRzIiwiYWRkIiwic2VyciIsInJlc3UiLCJjYXRjaCIsInN0YWdlcyIsImdldFN0YWdlQnlJZCIsInJlc3VsdDIiLCJoZ2V0YWxsIiwidU1hbmlmZXN0IiwiZGVsRG9jdW1lbnQiLCJyZXN1bHQxIiwiYXdiIiwic2hpcERhdGUiLCJmb3JtYXQiLCJzaGlwcGVkQnkiLCJzcmVzdWx0IiwiY2hhbmdlU3RhZ2UiLCJwYWdlIiwicGFnZVNpemUiLCJvZmZzZXRWYWwiLCJtYW5pZmVzdExpc3QiLCJmb3JFYWNoIiwicHVzaCIsIm1hbmlmZXN0UmVzdWx0IiwiZG9jIiwicGFnZWREYXRhIiwibWFuaWZlc3RzIiwiVG90YWxQYWdlcyIsImRlbCIsInNyZW0iLCJkZWxldGVkIiwibXNlYXJjaCJdLCJtYXBwaW5ncyI6Ijs7Ozs7Ozs7OztBQUFBLElBQUlBLFFBQVFDLFFBQVEsT0FBUixDQUFaO0FBQ0EsSUFBSUMsU0FBU0QsUUFBUSxlQUFSLENBQWI7QUFDQSxJQUFJRSxTQUFTRixRQUFRLFFBQVIsQ0FBYjtBQUNBLElBQUlHLGNBQWNILFFBQVEscUJBQVIsQ0FBbEI7QUFDQSxJQUFNSSxjQUFjLG1CQUFwQjtBQUNBLElBQU1DLGFBQWEsV0FBbkI7QUFDQSxJQUFNQyxZQUFZLGdCQUFsQjtBQUNBLElBQU1DLGdCQUFnQixlQUF0QjtBQUNBLElBQU1DLGtCQUFrQixpQkFBeEI7QUFDQSxJQUFNQyxtQkFBbUIsa0JBQXpCO0FBQ0EsSUFBTUMsb0JBQW9CLG1CQUExQixDLENBQStDOztBQUUvQyxJQUFJQyxnQkFBZ0I7QUFDaEJDLFNBQUs7QUFDREMsWUFBSSxDQURIO0FBRURDLGVBQU8sV0FGTjtBQUdEQyxnQkFBUTtBQUhQLEtBRFc7QUFNaEJDLFdBQU87QUFDSEgsWUFBSSxDQUREO0FBRUhDLGVBQU8sT0FGSjtBQUdIQyxnQkFBUTtBQUhMLEtBTlM7QUFXaEJFLFlBQVE7QUFDSkosWUFBSSxDQURBO0FBRUpDLGVBQU8sUUFGSDtBQUdKQyxnQkFBUTtBQUhKO0FBWFEsQ0FBcEI7QUFpQkEsSUFBSUcsaUJBQWlCO0FBQ2pCQyxVQUFNO0FBQ0ZOLFlBQUksQ0FERjtBQUVGQyxlQUFPO0FBRkwsS0FEVztBQUtqQk0sWUFBUTtBQUNKUCxZQUFJLENBREE7QUFFSkMsZUFBTztBQUZILEtBTFM7QUFTakJPLGFBQVM7QUFDTFIsWUFBSSxDQURDO0FBRUxDLGVBQU87QUFGRixLQVRRO0FBYWpCUSxjQUFVO0FBQ05ULFlBQUksQ0FERTtBQUVOQyxlQUFPO0FBRkQ7O0FBYk8sQ0FBckI7O0lBb0JhUyxlLFdBQUFBLGU7QUFFVCwrQkFBYztBQUFBOztBQUNWLGFBQUtDLFdBQUwsR0FBbUJ2QixPQUFPd0IsTUFBMUI7QUFDQSxhQUFLQyxNQUFMLEdBQWNmLGFBQWQ7QUFDQSxhQUFLZ0IsT0FBTCxHQUFlVCxjQUFmO0FBQ0E7QUFDQSxhQUFLVSxVQUFMO0FBQ0EsYUFBS0MsVUFBTDtBQUNIOzs7O3FDQUNXO0FBQ1IsaUJBQUtDLFFBQUwsR0FBZ0IzQixZQUFZSixLQUFaLEVBQW1CLGdCQUFuQixFQUFxQztBQUNqRGdDLCtCQUFjOUIsT0FBTytCO0FBRDRCLGFBQXJDLENBQWhCO0FBR0g7OztxQ0FDVztBQUNSLGlCQUFLUixXQUFMLENBQWlCUyxNQUFqQixDQUF3QjdCLFdBQXhCLEVBQXFDLFVBQUM4QixHQUFELEVBQU1DLEdBQU4sRUFBYztBQUMvQyxvQkFBSUEsT0FBTyxDQUFYLEVBQWM7QUFDVjtBQUNBbEMsMkJBQU9tQyxHQUFQLENBQVdoQyxXQUFYLEVBQXdCLEdBQXhCO0FBQ0g7QUFFSixhQU5EO0FBT0g7OzttQ0FFVTtBQUNQLG1CQUFPLEtBQUtpQyxPQUFaO0FBQ0g7OztvQ0FDVztBQUNSLG1CQUFPLEtBQUtuQixjQUFaO0FBQ0g7Ozs4Q0FDcUJvQixPLEVBQVE7QUFBQTs7QUFDMUIsbUJBQU8sSUFBSUMsT0FBSixDQUFZLFVBQUNDLE9BQUQsRUFBU0MsTUFBVCxFQUFrQjtBQUNqQyxzQkFBS1gsUUFBTCxDQUFjWSxNQUFkLENBQXFCSixRQUFRekIsRUFBN0IsRUFBZ0N5QixPQUFoQyxFQUF3QyxVQUFDSixHQUFELEVBQUtTLE1BQUwsRUFBYztBQUNsRDFDLDJCQUFPMkMsS0FBUCxDQUFhdkMsYUFBV2lDLFFBQVF6QixFQUFoQyxFQUFtQ3lCLE9BQW5DO0FBQ0FFLDRCQUFRLEVBQUNLLFNBQVEsSUFBVCxFQUFSO0FBQ0gsaUJBSEQ7QUFJSCxhQUxNLENBQVA7QUFNSDs7O3dDQUNlQyxNLEVBQU87QUFBQTs7QUFFbkIsbUJBQU8sSUFBSVAsT0FBSixDQUFZLFVBQUNDLE9BQUQsRUFBU0MsTUFBVCxFQUFrQjtBQUNsQ00sd0JBQVFDLEdBQVIsZ0JBQTBCRixNQUExQixTQUFvQ0EsTUFBcEMsbUJBQXdEQSxNQUF4RDtBQUNDLHVCQUFLaEIsUUFBTCxDQUFjbUIsTUFBZCw4QkFBZ0RILE1BQWhELEVBQTBEO0FBQ3RESSw0QkFBTyxDQUQrQztBQUV0REMscUNBQWlCLEdBRnFDO0FBR3REQyw0QkFBUSxLQUg4QztBQUl0REMseUJBQUs7QUFKaUQsaUJBQTFELEVBS0csVUFBQ0MsRUFBRCxFQUFLQyxJQUFMLEVBQWM7QUFDYix3QkFBSUQsRUFBSixFQUNDO0FBQ0lQLGdDQUFRQyxHQUFSLENBQVksaUJBQVo7QUFDREQsZ0NBQVFDLEdBQVIsQ0FBWU0sRUFBWjtBQUVGO0FBQ0RQLDRCQUFRQyxHQUFSLENBQVksNkJBQVo7QUFDQTtBQUNBRCw0QkFBUUMsR0FBUixDQUFZTyxJQUFaO0FBQ0RmLDRCQUFRZSxLQUFLQyxZQUFiO0FBQ0gsaUJBaEJEO0FBa0JILGFBcEJNLENBQVA7QUFzQkg7OzswQ0FDaUJDLEksRUFBTUMsSSxFQUFNO0FBQUE7O0FBQzFCO0FBQ0E7QUFDQTtBQUNBLGdCQUFJQyxNQUFNLElBQVY7QUFDQSxtQkFBTyxJQUFJcEIsT0FBSixDQUFZLFVBQUNDLE9BQUQsRUFBVUMsTUFBVixFQUFxQjtBQUNwQyx1QkFBS21CLGVBQUwsQ0FBcUJILEtBQUs1QyxFQUExQixFQUE4QmdELElBQTlCLENBQW1DLFVBQUNDLFNBQUQsRUFBZTs7QUFFOUNmLDRCQUFRQyxHQUFSLENBQVlTLElBQVo7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQUVBO0FBQ0ksMkJBQUtqQyxXQUFMLENBQWlCdUMsS0FBakIsR0FDS0MsSUFETCxDQUNVNUQsV0FEVixFQUVLNkQsSUFGTCxDQUVVLFVBQUMvQixHQUFELEVBQU1nQyxJQUFOLEVBQWU7QUFDakJuQixnQ0FBUUMsR0FBUixDQUFZa0IsSUFBWjtBQUNBLDRCQUFJQyxXQUFXO0FBQ1hDLGlDQUFLRixLQUFLLENBQUwsQ0FETTtBQUVYcEQsbUNBQU8yQyxLQUFLMUMsTUFBTCxHQUFZbUQsS0FBSyxDQUFMLENBRlI7QUFHWEcseUNBQWFuRSxTQUFTb0UsSUFBVCxFQUhGLEVBR2tCO0FBQzdCQyxxQ0FBU2QsS0FBSzVDLEVBSkg7QUFLWDJELHFDQUFTdEQsZUFBZUMsSUFBZixDQUFvQk4sRUFMbEI7QUFNWDRELG1DQUFPdkQsZUFBZUMsSUFBZixDQUFvQkwsS0FOaEI7QUFPWDRELHVDQUFXaEI7QUFQQSx5QkFBZjtBQVNBWCxnQ0FBUUMsR0FBUixDQUFZbUIsUUFBWjtBQUNBUiw0QkFBSW5DLFdBQUosQ0FBZ0J1QyxLQUFoQixHQUNLbkIsS0FETCxDQUNXdkMsYUFBYThELFNBQVNDLEdBRGpDLEVBQ3NDRCxRQUR0QyxFQUVLUSxJQUZMLENBRVVwRSxhQUZWLEVBRXlCNEQsU0FBU0MsR0FGbEMsRUFHS0gsSUFITCxDQUdVLFVBQUMvQixHQUFELEVBQU0wQyxPQUFOLEVBQWtCO0FBQ3BCakIsZ0NBQUk3QixRQUFKLENBQWErQyxHQUFiLENBQWlCVixTQUFTQyxHQUExQixFQUE4QkQsUUFBOUIsRUFBdUMsVUFBQ1csSUFBRCxFQUFNQyxJQUFOLEVBQWE7QUFDaEQsb0NBQUlELElBQUosRUFDQy9CLFFBQVFDLEdBQVIsQ0FBWThCLElBQVo7QUFDSi9CLHdDQUFRQyxHQUFSLENBQVkrQixJQUFaO0FBQ0EsNkJBSkQ7QUFLQTtBQUNBLGdDQUFJN0MsR0FBSixFQUFTO0FBQ0xPLHVDQUFPUCxHQUFQO0FBQ0gsNkJBRkQsTUFFTztBQUNITSx3Q0FBUTJCLFFBQVI7QUFDSDtBQUNKLHlCQWZMO0FBZ0JILHFCQTlCTDtBQStCSjtBQUVILGlCQTNDRCxFQTJDR2EsS0EzQ0gsQ0EyQ1MsVUFBQzlDLEdBQUQsRUFBTztBQUNaYSw0QkFBUUMsR0FBUixDQUFZLGNBQVo7QUFDQUQsNEJBQVFDLEdBQVIsQ0FBWWQsR0FBWjtBQUNILGlCQTlDRDtBQWdESCxhQWpETSxDQUFQO0FBbURIOzs7b0NBQ1drQyxHLEVBQUthLE0sRUFBUTtBQUFBOztBQUNyQixtQkFBTyxJQUFJMUMsT0FBSixDQUFZLFVBQUNDLE9BQUQsRUFBVUMsTUFBVixFQUFxQjs7QUFFcEN4Qyx1QkFBT3dCLE1BQVAsQ0FBY21CLEtBQWQsQ0FBb0J2QyxhQUFXK0QsR0FBL0IsRUFBbUMsU0FBbkMsRUFBNkNhLE1BQTdDLEVBQW9ELFVBQUMvQyxHQUFELEVBQUtTLE1BQUwsRUFBYztBQUM5RCx3QkFBSThCLFFBQVEsT0FBS1MsWUFBTCxDQUFrQkQsTUFBbEIsQ0FBWjtBQUNBbEMsNEJBQVFDLEdBQVIsQ0FBWSx5QkFBdUJ5QixNQUFNM0QsS0FBekM7QUFDQWIsMkJBQU93QixNQUFQLENBQWNtQixLQUFkLENBQW9CdkMsYUFBVytELEdBQS9CLEVBQW1DLE9BQW5DLEVBQTJDSyxNQUFNM0QsS0FBakQsRUFBdUQsVUFBQ29CLEdBQUQsRUFBS2lELE9BQUwsRUFBZSxDQUFFLENBQXhFO0FBQ0FsRiwyQkFBT21GLE9BQVAsQ0FBZS9FLGFBQVcrRCxHQUExQixFQUErQlAsSUFBL0IsQ0FBb0MsVUFBQ3dCLFNBQUQsRUFBYTtBQUM3QywrQkFBS3ZELFFBQUwsQ0FBY3dELFdBQWQsQ0FBMEIsZ0JBQTFCLEVBQTJDbEIsR0FBM0MsRUFBK0MsVUFBQ2xDLEdBQUQsRUFBS3FELE9BQUwsRUFBZTtBQUMxRHhDLG9DQUFRQyxHQUFSLENBQVksbUJBQVo7QUFDQUQsb0NBQVFDLEdBQVIsQ0FBWWQsR0FBWjtBQUNBYSxvQ0FBUUMsR0FBUixDQUFZdUMsT0FBWjtBQUNBLG1DQUFLekQsUUFBTCxDQUFjK0MsR0FBZCxDQUFrQlEsVUFBVWpCLEdBQTVCLEVBQWdDaUIsU0FBaEM7QUFDQTdDLG9DQUFRRyxNQUFSO0FBQ0gseUJBTkQ7QUFRSCxxQkFURDtBQVdILGlCQWZEO0FBZ0JBOztBQUdILGFBckJNLENBQVA7QUFzQkg7OztxQ0FDWXlCLEcsRUFBSW9CLEcsRUFBSTlCLEksRUFBSztBQUFBOztBQUN0QixtQkFBTyxJQUFJbkIsT0FBSixDQUFZLFVBQUNDLE9BQUQsRUFBU0MsTUFBVCxFQUFrQjtBQUNqQ3hDLHVCQUFPMkMsS0FBUCxDQUFhdkMsYUFBVytELEdBQXhCLEVBQTZCLEVBQUNvQixLQUFJQSxHQUFMLEVBQVNDLFVBQVN2RixTQUFTd0YsTUFBVCxDQUFnQixZQUFoQixDQUFsQixFQUFnREMsV0FBVWpDLElBQTFELEVBQTdCLEVBQThGRyxJQUE5RixDQUFtRyxVQUFDK0IsT0FBRCxFQUFXO0FBQzFHN0MsNEJBQVFDLEdBQVIsQ0FBWTRDLE9BQVo7QUFDQSwyQkFBS0MsV0FBTCxDQUFpQnpCLEdBQWpCLEVBQXFCLENBQXJCLEVBQXdCUCxJQUF4QixDQUE2QixVQUFDa0IsSUFBRCxFQUFRO0FBQ2pDdkMsZ0NBQVFvRCxPQUFSO0FBQ0gscUJBRkQ7QUFJSCxpQkFORDtBQU9ILGFBUk0sQ0FBUDtBQVNIOzs7cUNBQ1luQyxJLEVBQUtxQyxJLEVBQUtDLFEsRUFBUztBQUFBOztBQUM1QixtQkFBTyxJQUFJeEQsT0FBSixDQUFZLFVBQUNDLE9BQUQsRUFBU0MsTUFBVCxFQUFrQjtBQUNqQyxvQkFBSXVELFlBQVksQ0FBQ0YsT0FBTyxDQUFSLElBQWFDLFFBQTdCO0FBQ0FoRCx3QkFBUUMsR0FBUixDQUFZLFlBQVVnRCxTQUF0Qjs7QUFFQSx1QkFBS2xFLFFBQUwsQ0FBY21CLE1BQWQsQ0FBcUIsY0FBWVEsSUFBakMsRUFBdUM7QUFDbkNQLDRCQUFPOEMsU0FENEI7QUFFbkM3QyxxQ0FBaUI0QyxRQUZrQjtBQUduQzNDLDRCQUFRLEtBSDJCO0FBSW5DQyx5QkFBSztBQUo4QixpQkFBdkMsRUFLRyxVQUFDQyxFQUFELEVBQUtDLElBQUwsRUFBYztBQUNiLHdCQUFJRCxFQUFKLEVBQ0lQLFFBQVFDLEdBQVIsQ0FBWU0sRUFBWjtBQUNILHdCQUFJMkMsZUFBZSxFQUFuQjtBQUNBMUMseUJBQUtxQixPQUFMLENBQWFzQixPQUFiLENBQXFCLDBCQUFrQjtBQUNwQ0QscUNBQWFFLElBQWIsQ0FBa0JDLGVBQWVDLEdBQWpDO0FBRUYscUJBSEQ7QUFJQTtBQUNBLHdCQUFJQyxZQUFZO0FBQ2JDLG1DQUFVTixZQURHO0FBRWJ6QyxzQ0FBZUQsS0FBS0MsWUFGUDtBQUdic0MsOEJBQU9BLElBSE07QUFJYkMsa0NBQVVBLFFBSkc7QUFLYlMsb0NBQWNqRCxLQUFLQyxZQUFMLEdBQWtCdUM7QUFMbkIscUJBQWhCO0FBT0R2RCw0QkFBUThELFNBQVI7QUFDQXZELDRCQUFRQyxHQUFSLENBQVlpRCxZQUFaO0FBRUgsaUJBeEJEO0FBeUJILGFBN0JNLENBQVA7QUE4Qkg7OztvQ0FDVzdCLEcsRUFBSztBQUNiLG1CQUFPbkUsT0FBT21GLE9BQVAsQ0FBZS9FLGFBQVcrRCxHQUExQixDQUFQO0FBQ0g7Ozt1Q0FDY0EsRyxFQUFJO0FBQUE7O0FBQ2hCLG1CQUFPLElBQUk3QixPQUFKLENBQVksVUFBQ0MsT0FBRCxFQUFTQyxNQUFULEVBQWtCO0FBQ3BDeEMsdUJBQU93QixNQUFQLENBQWNnRixHQUFkLENBQWtCcEcsYUFBVytELEdBQTdCLEVBQWlDLFVBQUNsQyxHQUFELEVBQUtnQyxJQUFMLEVBQVk7QUFDekNuQiw0QkFBUUMsR0FBUixDQUFZa0IsSUFBWjtBQUNBLDJCQUFLcEMsUUFBTCxDQUFjd0QsV0FBZCxDQUEwQixnQkFBMUIsRUFBMkNsQixHQUEzQyxFQUErQyxVQUFDbEMsR0FBRCxFQUFLUyxNQUFMLEVBQWM7QUFDekRJLGdDQUFRQyxHQUFSLENBQVksY0FBWjtBQUNBRCxnQ0FBUUMsR0FBUixDQUFZZCxHQUFaO0FBQ0FhLGdDQUFRQyxHQUFSLENBQVlMLE1BQVo7QUFDSCxxQkFKRDtBQUtBMUMsMkJBQU95RyxJQUFQLENBQVluRyxhQUFaLEVBQTBCNkQsR0FBMUI7QUFDQTVCLDRCQUFRLEVBQUNtRSxTQUFRLElBQVQsRUFBUjtBQUNILGlCQVREO0FBV0EsYUFaTSxDQUFQO0FBZUY7OztnREFDc0I7QUFDbkIsZ0JBQUlDLFVBQVUsS0FBSzlFLFFBQW5CO0FBQ0EsbUJBQU8sSUFBSVMsT0FBSixDQUFZLFVBQUNDLE9BQUQsRUFBU0MsTUFBVCxFQUFrQjtBQUNqQyxvQkFBSXVELFlBQVcsQ0FBZjtBQUNBLG9CQUFJRCxXQUFXLEVBQWY7QUFDQWhELHdCQUFRQyxHQUFSLENBQVksWUFBVWdELFNBQXRCO0FBQ0Esb0JBQUlDLGVBQWUsRUFBbkI7QUFDQVcsd0JBQVEzRCxNQUFSLG1CQUFpQztBQUM3QkMsNEJBQU84QyxTQURzQjtBQUU3QjdDLHFDQUFpQjRDLFFBRlk7QUFHN0IzQyw0QkFBUSxLQUhxQjtBQUk3QkMseUJBQUs7QUFKd0IsaUJBQWpDLEVBS0csVUFBQ0MsRUFBRCxFQUFLQyxJQUFMLEVBQWM7QUFDYix3QkFBSUQsRUFBSixFQUNJUCxRQUFRQyxHQUFSLENBQVlNLEVBQVo7O0FBRUhDLHlCQUFLcUIsT0FBTCxDQUFhc0IsT0FBYixDQUFxQiwwQkFBa0I7QUFDcENELHFDQUFhRSxJQUFiLENBQWtCQyxlQUFlQyxHQUFqQztBQUVGLHFCQUhEO0FBSUE7QUFDQSx3QkFBSUMsWUFBWTtBQUNiQyxtQ0FBVU4sWUFERztBQUViekMsc0NBQWVELEtBQUtDLFlBRlA7QUFHYnNDLDhCQUFPLENBSE07QUFJYkMsa0NBQVVBLFFBSkc7QUFLYlMsb0NBQWNqRCxLQUFLQyxZQUFMLEdBQWtCdUM7QUFMbkIscUJBQWhCO0FBT0R2RCw0QkFBUThELFNBQVI7QUFDQXZELDRCQUFRQyxHQUFSLENBQVlpRCxZQUFaO0FBRUgsaUJBeEJEO0FBeUJILGFBOUJNLENBQVA7QUErQkg7OztvQ0FFWXBGLEUsRUFBRztBQUNaLGdCQUFJQSxNQUFNLENBQVYsRUFBWTtBQUNSLHVCQUFPRixjQUFjQyxHQUFyQjtBQUNIO0FBQ0QsZ0JBQUlDLE1BQU0sQ0FBVixFQUFZO0FBQ1IsdUJBQU9GLGNBQWNLLEtBQXJCO0FBQ0g7QUFDRCxnQkFBSUgsTUFBTSxDQUFWLEVBQVk7QUFDUix1QkFBT0YsY0FBY00sTUFBckI7QUFDSDtBQUNELG1CQUFPTixjQUFjQyxHQUFyQjtBQUNIOzs7cUNBQ1lDLEUsRUFBRztBQUNaLGdCQUFJQSxNQUFNLENBQVYsRUFBWTtBQUNSLHVCQUFPSyxlQUFlQyxJQUF0QjtBQUNIO0FBQ0QsZ0JBQUlOLE1BQU0sQ0FBVixFQUFZO0FBQ1IsdUJBQU9LLGVBQWVFLE1BQXRCO0FBQ0g7QUFDRCxnQkFBSVAsTUFBTSxDQUFWLEVBQVk7QUFDUix1QkFBT0ssZUFBZUcsT0FBdEI7QUFDSDtBQUNELGdCQUFJUixNQUFNLENBQVYsRUFBWTtBQUNSLHVCQUFPSyxlQUFlSSxRQUF0QjtBQUNIO0FBQ0QsbUJBQU9KLGVBQWVDLElBQXRCO0FBQ0giLCJmaWxlIjoiUmVkaXNTZXJ2aWNlcy9NYW5pZmVzdFNlcnZpY2UuanMiLCJzb3VyY2VzQ29udGVudCI6WyJ2YXIgcmVkaXMgPSByZXF1aXJlKCdyZWRpcycpO1xudmFyIGxyZWRpcyA9IHJlcXVpcmUoJy4vcmVkaXMtbG9jYWwnKTtcbnZhciBtb21lbnQgPSByZXF1aXJlKCdtb21lbnQnKTtcbnZhciByZWRpc1NlYXJjaCA9IHJlcXVpcmUoJy4uL3JlZGlzZWFyY2hjbGllbnQnKTtcbmNvbnN0IE1JRF9DT1VOVEVSID0gXCJnbG9iYWw6bWlkQ291bnRlclwiO1xuY29uc3QgTUlEX1BSRUZJWCA9IFwibWFuaWZlc3Q6XCI7XG5jb25zdCBNSURfSU5ERVggPSBcImluZGV4Om1hbmlmZXN0XCI7XG5jb25zdCBPUEVOX01BTklGRVNUID0gXCJtYW5pZmVzdDpvcGVuXCI7XG5jb25zdCBDTE9TRURfTUFOSUZFU1QgPSBcIm1hbmlmZXN0OmNsb3NlZFwiXG5jb25zdCBTSElQUEVEX01BTklGRVNUID0gXCJtYW5pZmVzdDpzaGlwcGVkXCJcbmNvbnN0IFZFUklGSUVEX01BTklGRVNUID0gXCJtYW5pZmVzdDp2ZXJpZmllZFwiOyAvLyBtYW5pZmVzdCB0aGF0IGhhdmUgZHV0aWVzIHZlcmlmaWVkXG5cbnZhciBtYW5pZmVzdFR5cGVzID0ge1xuICAgIGFpcjoge1xuICAgICAgICBpZDogMSxcbiAgICAgICAgdGl0bGU6IFwiQWlyIENhcmdvXCIsXG4gICAgICAgIHByZWZpeDogXCJNLVwiXG4gICAgfSxcbiAgICBvY2Vhbjoge1xuICAgICAgICBpZDogMixcbiAgICAgICAgdGl0bGU6IFwiT2NlYW5cIixcbiAgICAgICAgcHJlZml4OiBcIlMtXCJcbiAgICB9LFxuICAgIGhhem1hdDoge1xuICAgICAgICBpZDogMyxcbiAgICAgICAgdGl0bGU6IFwiSEFaTUFUXCIsXG4gICAgICAgIHByZWZpeDogXCJILVwiXG4gICAgfVxufVxudmFyIG1hbmlmZXN0U3RhZ2VzID0ge1xuICAgIG9wZW46IHtcbiAgICAgICAgaWQ6IDEsXG4gICAgICAgIHRpdGxlOiAnT3BlbidcbiAgICB9LFxuICAgIGNsb3NlZDoge1xuICAgICAgICBpZDogMixcbiAgICAgICAgdGl0bGU6ICdDbG9zZWQnXG4gICAgfSxcbiAgICBzaGlwcGVkOiB7XG4gICAgICAgIGlkOiAzLFxuICAgICAgICB0aXRsZTogJ1NoaXBwZWQnXG4gICAgfSxcbiAgICB2ZXJpZmllZDoge1xuICAgICAgICBpZDogNCxcbiAgICAgICAgdGl0bGU6ICdWZXJpZmllZCdcbiAgICB9XG5cbn1cblxuZXhwb3J0IGNsYXNzIE1hbmlmZXN0U2VydmljZSB7XG5cbiAgICBjb25zdHJ1Y3RvcigpIHsgICAgICAgIFxuICAgICAgICB0aGlzLnJlZGlzQ2xpZW50ID0gbHJlZGlzLmNsaWVudDtcbiAgICAgICAgdGhpcy5tdHlwZXMgPSBtYW5pZmVzdFR5cGVzO1xuICAgICAgICB0aGlzLm1zdGFnZXMgPSBtYW5pZmVzdFN0YWdlcztcbiAgICAgICAgLy9jaGVjayB0byBlbnN1cmUgd2UgaGF2ZSB0aGUgbWFuaWZlc3QgY291bnRlciBcbiAgICAgICAgdGhpcy5jaGVja1NldHVwKCk7IFxuICAgICAgICB0aGlzLnNldHVwSW5kZXgoKVxuICAgIH1cbiAgICBzZXR1cEluZGV4KCl7XG4gICAgICAgIHRoaXMubXlTZWFyY2ggPSByZWRpc1NlYXJjaChyZWRpcywgJ2luZGV4Om1hbmlmZXN0Jywge1xuICAgICAgICAgICAgY2xpZW50T3B0aW9uczpscmVkaXMuc2VhcmNoQ2xpZW50RGV0YWlsc1xuICAgICAgICB9KTtcbiAgICB9XG4gICAgY2hlY2tTZXR1cCgpe1xuICAgICAgICB0aGlzLnJlZGlzQ2xpZW50LmV4aXN0cyhNSURfQ09VTlRFUiwgKGVyciwgcmVzKSA9PiB7XG4gICAgICAgICAgICBpZiAocmVzID09IDApIHtcbiAgICAgICAgICAgICAgICAvL2NyZWF0ZSB0aGUgbWFuaWZlc3QgXG4gICAgICAgICAgICAgICAgbHJlZGlzLnNldChNSURfQ09VTlRFUiwgMTAwKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIFxuICAgICAgICB9KTtcbiAgICB9XG5cbiAgICBnZXRUeXBlcygpIHtcbiAgICAgICAgcmV0dXJuIHRoaXMubXl0eXBlc1xuICAgIH1cbiAgICBnZXRTdGFnZXMoKSB7XG4gICAgICAgIHJldHVybiB0aGlzLm1hbmlmZXN0U3RhZ2VzO1xuICAgIH1cbiAgICB1cGRhdGVNYW5pZmVzdERldGFpbHMoZGV0YWlscyl7XG4gICAgICAgIHJldHVybiBuZXcgUHJvbWlzZSgocmVzb2x2ZSxyZWplY3QpPT57XG4gICAgICAgICAgICB0aGlzLm15U2VhcmNoLnVwZGF0ZShkZXRhaWxzLmlkLGRldGFpbHMsKGVycixyZXN1bHQpPT57XG4gICAgICAgICAgICAgICAgbHJlZGlzLmhtc2V0KE1JRF9QUkVGSVgrZGV0YWlscy5pZCxkZXRhaWxzKVxuICAgICAgICAgICAgICAgIHJlc29sdmUoe3VwZGF0ZWQ6dHJ1ZX0pXG4gICAgICAgICAgICB9KVxuICAgICAgICB9KVxuICAgIH1cbiAgICBnZXRPcGVuTWFuaWZlc3QodHlwZUlkKXtcbiAgICAgICAgXG4gICAgICAgIHJldHVybiBuZXcgUHJvbWlzZSgocmVzb2x2ZSxyZWplY3QpPT57XG4gICAgICAgICAgIGNvbnNvbGUubG9nKCBgQHN0YWdlSWQ6WyR7dHlwZUlkfSAke3R5cGVJZH1dIEBtdHlwZUlkOiR7dHlwZUlkfWApO1xuICAgICAgICAgICAgdGhpcy5teVNlYXJjaC5zZWFyY2goYEBzdGFnZUlkOlsxIDFdIEBtdHlwZUlkOiR7dHlwZUlkfWAsIHtcbiAgICAgICAgICAgICAgICBvZmZzZXQ6MCxcbiAgICAgICAgICAgICAgICBudW1iZXJPZlJlc3VsdHM6IDEwMCxcbiAgICAgICAgICAgICAgICBzb3J0Qnk6IFwibWlkXCIsXG4gICAgICAgICAgICAgICAgZGlyOiBcIkRFU0NcIlxuICAgICAgICAgICAgfSwgKHIxLCBkYXRhKSA9PiB7XG4gICAgICAgICAgICAgICAgaWYgKHIxKVxuICAgICAgICAgICAgICAgICB7XG4gICAgICAgICAgICAgICAgICAgICBjb25zb2xlLmxvZygnd2UgaGFkIGFuIGVycm9yJylcbiAgICAgICAgICAgICAgICAgICAgY29uc29sZS5sb2cocjEpO1xuICAgICAgICAgICAgICAgICAgICBcbiAgICAgICAgICAgICAgICAgfSAgIFxuICAgICAgICAgICAgICAgICBjb25zb2xlLmxvZygnbm8gZXJyb3JzIGRldGVjdGVkIGhlcmUgLi4uJylcbiAgICAgICAgICAgICAgICAgLy9jb25zb2xlLmxvZyhtYW5pZmVzdExpc3QpO1xuICAgICAgICAgICAgICAgICBjb25zb2xlLmxvZyhkYXRhKTtcbiAgICAgICAgICAgICAgICByZXNvbHZlKGRhdGEudG90YWxSZXN1bHRzKTtcbiAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgXG4gICAgICAgIH0pO1xuICAgICAgICBcbiAgICB9XG4gICAgY3JlYXRlTmV3TWFuaWZlc3QodHlwZSwgdXNlcikge1xuICAgICAgICAvL3dlIGhhdmUgc29tZSBydWxlcyB0byBmb2xsb3cgaGVyZSBcbiAgICAgICAgLy8xLiBhIG5ldyBtYW5pZmVzdCBjYW5ub3QgYmUgY3JlYXRlZCBpZiB0aGUgcHJldmlvdXMgbWFuaWZlc3QgaXMgbm90IGNsb3NlZCBcbiAgICAgICAgLy9jaGVjayBmb3Igb3BlbiBtYW5pZmVzdCBmaXJzdCBcbiAgICAgICAgdmFyIHNydiA9IHRoaXM7IFxuICAgICAgICByZXR1cm4gbmV3IFByb21pc2UoKHJlc29sdmUsIHJlamVjdCkgPT4ge1xuICAgICAgICAgICAgdGhpcy5nZXRPcGVuTWFuaWZlc3QodHlwZS5pZCkudGhlbigob3BlbkNvdW50KSA9PiB7XG4gICAgICAgICAgICAgIFxuICAgICAgICAgICAgICAgIGNvbnNvbGUubG9nKHR5cGUpOyBcbiAgICAgICAgICAgICAgICAvLyBpZiAob3BlbkNvdW50PjApIHtcbiAgICAgICAgICAgICAgICAvLyAgICAgLy93ZSBjYW4ndCBhZGQgdGhlIG1hbmlmZXN0IHJlamVjdCBcbiAgICAgICAgICAgICAgICAvLyAgICAgcmVqZWN0KHtcbiAgICAgICAgICAgICAgICAvLyAgICAgICAgIFwibWVzc2FnZVwiOiBcIlRoZXJlIGlzIGFuIG9wZW4gbWFuaWZlc3QgUGxlYXNlIGNsb3NlIGl0IGJlZm9yZSBjcmVhdGluZyBhIG5ldyBtYW5pZmVzdC5cIlxuICAgICAgICAgICAgICAgIC8vICAgICB9KTtcblxuICAgICAgICAgICAgICAgIC8vIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgICAgIHRoaXMucmVkaXNDbGllbnQubXVsdGkoKVxuICAgICAgICAgICAgICAgICAgICAgICAgLmluY3IoTUlEX0NPVU5URVIpXG4gICAgICAgICAgICAgICAgICAgICAgICAuZXhlYygoZXJyLCByZXNwKSA9PiB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgY29uc29sZS5sb2cocmVzcCk7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgdmFyIG1hbmlmZXN0ID0ge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBtaWQ6IHJlc3BbMF0sXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHRpdGxlOiB0eXBlLnByZWZpeCtyZXNwWzBdLFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBkYXRlQ3JlYXRlZDogbW9tZW50KCkudW5peCgpLC8vZm9ybWF0KFwiWVlZWS1NTS1ERFwiKSxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgbXR5cGVJZDogdHlwZS5pZCxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgc3RhZ2VJZDogbWFuaWZlc3RTdGFnZXMub3Blbi5pZCxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgc3RhZ2U6IG1hbmlmZXN0U3RhZ2VzLm9wZW4udGl0bGUsXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGNyZWF0ZWRCeTogdXNlclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIH07XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgY29uc29sZS5sb2cobWFuaWZlc3QpXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgc3J2LnJlZGlzQ2xpZW50Lm11bHRpKClcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgLmhtc2V0KE1JRF9QUkVGSVggKyBtYW5pZmVzdC5taWQsIG1hbmlmZXN0KVxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAuc2FkZChPUEVOX01BTklGRVNULCBtYW5pZmVzdC5taWQpXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIC5leGVjKChlcnIsIHJlc3VsdHMpID0+IHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHNydi5teVNlYXJjaC5hZGQobWFuaWZlc3QubWlkLG1hbmlmZXN0LChzZXJyLHJlc3UpPT57XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgaWYgKHNlcnIpXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGNvbnNvbGUubG9nKHNlcnIpXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgY29uc29sZS5sb2cocmVzdSlcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgLy9hbHNvIGFkZCB0byB0aGUgaW5kZXggaGVyZSBvbmUgdGltZSBcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGlmIChlcnIpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICByZWplY3QoZXJyKTtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgcmVzb2x2ZShtYW5pZmVzdClcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICAgICAgICAgICAgICB9KTtcbiAgICAgICAgICAgICAgICAvL31cblxuICAgICAgICAgICAgfSkuY2F0Y2goKGVycik9PntcbiAgICAgICAgICAgICAgICBjb25zb2xlLmxvZyhcImVyciBkZXRlY3RlZFwiKTsgXG4gICAgICAgICAgICAgICAgY29uc29sZS5sb2coZXJyKTtcbiAgICAgICAgICAgIH0pO1xuXG4gICAgICAgIH0pO1xuXG4gICAgfVxuICAgIGNoYW5nZVN0YWdlKG1pZCwgc3RhZ2VzKSB7XG4gICAgICAgIHJldHVybiBuZXcgUHJvbWlzZSgocmVzb2x2ZSwgcmVqZWN0KSA9PiB7XG4gICAgICAgICAgICBcbiAgICAgICAgICAgIGxyZWRpcy5jbGllbnQuaG1zZXQoTUlEX1BSRUZJWCttaWQsXCJzdGFnZUlkXCIsc3RhZ2VzLChlcnIscmVzdWx0KT0+e1xuICAgICAgICAgICAgICAgIHZhciBzdGFnZSA9IHRoaXMuZ2V0U3RhZ2VCeUlkKHN0YWdlcyk7IFxuICAgICAgICAgICAgICAgIGNvbnNvbGUubG9nKCdsb29rZWQgdXAgdGhlIHN0YWdlICcrc3RhZ2UudGl0bGUpO1xuICAgICAgICAgICAgICAgIGxyZWRpcy5jbGllbnQuaG1zZXQoTUlEX1BSRUZJWCttaWQsXCJzdGFnZVwiLHN0YWdlLnRpdGxlLChlcnIscmVzdWx0Mik9Pnt9KTsgXG4gICAgICAgICAgICAgICAgbHJlZGlzLmhnZXRhbGwoTUlEX1BSRUZJWCttaWQpLnRoZW4oKHVNYW5pZmVzdCk9PntcbiAgICAgICAgICAgICAgICAgICAgdGhpcy5teVNlYXJjaC5kZWxEb2N1bWVudChcImluZGV4Om1hbmlmZXN0XCIsbWlkLChlcnIscmVzdWx0MSk9PntcbiAgICAgICAgICAgICAgICAgICAgICAgIGNvbnNvbGUubG9nKCdjaGFuZ2luZyBkb2N1bWVudCcpO1xuICAgICAgICAgICAgICAgICAgICAgICAgY29uc29sZS5sb2coZXJyKTtcbiAgICAgICAgICAgICAgICAgICAgICAgIGNvbnNvbGUubG9nKHJlc3VsdDEpIFxuICAgICAgICAgICAgICAgICAgICAgICAgdGhpcy5teVNlYXJjaC5hZGQodU1hbmlmZXN0Lm1pZCx1TWFuaWZlc3QpOyBcbiAgICAgICAgICAgICAgICAgICAgICAgIHJlc29sdmUocmVzdWx0KTsgXG4gICAgICAgICAgICAgICAgICAgIH0pOyBcbiAgICAgICAgICAgICAgICAgICBcbiAgICAgICAgICAgICAgICB9KTtcbiAgICAgICAgICAgICAgIFxuICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICAvL3dlIGFsc28gbmVlZCB0byB0byB1cGRhdGUgdGhlIGRvY3VtZW50IFxuXG4gICAgICAgICAgICBcbiAgICAgICAgfSlcbiAgICB9XG4gICAgc2hpcE1hbmlmZXN0KG1pZCxhd2IsdXNlcil7XG4gICAgICAgIHJldHVybiBuZXcgUHJvbWlzZSgocmVzb2x2ZSxyZWplY3QpPT57XG4gICAgICAgICAgICBscmVkaXMuaG1zZXQoTUlEX1BSRUZJWCttaWQsIHthd2I6YXdiLHNoaXBEYXRlOm1vbWVudCgpLmZvcm1hdChcIllZWVktTU0tRERcIiksc2hpcHBlZEJ5OnVzZXJ9KS50aGVuKChzcmVzdWx0KT0+e1xuICAgICAgICAgICAgICAgIGNvbnNvbGUubG9nKHNyZXN1bHQpO1xuICAgICAgICAgICAgICAgIHRoaXMuY2hhbmdlU3RhZ2UobWlkLDMpLnRoZW4oKHJlc3UpPT57XG4gICAgICAgICAgICAgICAgICAgIHJlc29sdmUoc3Jlc3VsdCk7XG4gICAgICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICAgICAgXG4gICAgICAgICAgICB9KVxuICAgICAgICB9KVxuICAgIH1cbiAgICBsaXN0TWFuaWZlc3QodHlwZSxwYWdlLHBhZ2VTaXplKXtcbiAgICAgICAgcmV0dXJuIG5ldyBQcm9taXNlKChyZXNvbHZlLHJlamVjdCk9PntcbiAgICAgICAgICAgIHZhciBvZmZzZXRWYWwgPSAocGFnZSAtIDEpICogcGFnZVNpemU7XG4gICAgICAgICAgICBjb25zb2xlLmxvZygnb2Zmc2V0ICcrb2Zmc2V0VmFsKTtcbiAgICAgICAgICAgIFxuICAgICAgICAgICAgdGhpcy5teVNlYXJjaC5zZWFyY2goXCJAbXR5cGVJZDpcIit0eXBlLCB7XG4gICAgICAgICAgICAgICAgb2Zmc2V0Om9mZnNldFZhbCxcbiAgICAgICAgICAgICAgICBudW1iZXJPZlJlc3VsdHM6IHBhZ2VTaXplLFxuICAgICAgICAgICAgICAgIHNvcnRCeTogXCJtaWRcIixcbiAgICAgICAgICAgICAgICBkaXI6IFwiREVTQ1wiXG4gICAgICAgICAgICB9LCAocjEsIGRhdGEpID0+IHtcbiAgICAgICAgICAgICAgICBpZiAocjEpXG4gICAgICAgICAgICAgICAgICAgIGNvbnNvbGUubG9nKHIxKTtcbiAgICAgICAgICAgICAgICAgdmFyIG1hbmlmZXN0TGlzdCA9IFtdOyBcbiAgICAgICAgICAgICAgICAgZGF0YS5yZXN1bHRzLmZvckVhY2gobWFuaWZlc3RSZXN1bHQgPT4ge1xuICAgICAgICAgICAgICAgICAgICBtYW5pZmVzdExpc3QucHVzaChtYW5pZmVzdFJlc3VsdC5kb2MpOyAgICBcbiAgICAgICAgICAgICAgICAgICAgXG4gICAgICAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgICAgICAvL2NvbnNvbGUubG9nKG1hbmlmZXN0TGlzdCk7XG4gICAgICAgICAgICAgICAgIHZhciBwYWdlZERhdGEgPSB7XG4gICAgICAgICAgICAgICAgICAgIG1hbmlmZXN0czptYW5pZmVzdExpc3QsXG4gICAgICAgICAgICAgICAgICAgIHRvdGFsUmVzdWx0cyA6IGRhdGEudG90YWxSZXN1bHRzLFxuICAgICAgICAgICAgICAgICAgICBwYWdlIDogcGFnZSxcbiAgICAgICAgICAgICAgICAgICAgcGFnZVNpemU6IHBhZ2VTaXplLCBcbiAgICAgICAgICAgICAgICAgICAgVG90YWxQYWdlcyA6IChkYXRhLnRvdGFsUmVzdWx0cy9wYWdlU2l6ZSlcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgcmVzb2x2ZShwYWdlZERhdGEpO1xuICAgICAgICAgICAgICAgIGNvbnNvbGUubG9nKG1hbmlmZXN0TGlzdCk7XG4gICAgICAgICAgICAgICAgXG4gICAgICAgICAgICB9KTtcbiAgICAgICAgfSk7XG4gICAgfVxuICAgIGdldE1hbmlmZXN0KG1pZCkge1xuICAgICAgICByZXR1cm4gbHJlZGlzLmhnZXRhbGwoTUlEX1BSRUZJWCttaWQpXG4gICAgfVxuICAgIGRlbGV0ZU1hbmlmZXN0KG1pZCl7XG4gICAgICAgcmV0dXJuIG5ldyBQcm9taXNlKChyZXNvbHZlLHJlamVjdCk9PntcbiAgICAgICAgbHJlZGlzLmNsaWVudC5kZWwoTUlEX1BSRUZJWCttaWQsKGVycixyZXNwKT0+e1xuICAgICAgICAgICAgY29uc29sZS5sb2cocmVzcCk7IFxuICAgICAgICAgICAgdGhpcy5teVNlYXJjaC5kZWxEb2N1bWVudChcImluZGV4Om1hbmlmZXN0XCIsbWlkLChlcnIscmVzdWx0KT0+e1xuICAgICAgICAgICAgICAgIGNvbnNvbGUubG9nKFwiZGVsZXRpbmcgbWlkXCIpOyBcbiAgICAgICAgICAgICAgICBjb25zb2xlLmxvZyhlcnIpOyBcbiAgICAgICAgICAgICAgICBjb25zb2xlLmxvZyhyZXN1bHQpO1xuICAgICAgICAgICAgfSk7IFxuICAgICAgICAgICAgbHJlZGlzLnNyZW0oT1BFTl9NQU5JRkVTVCxtaWQpO1xuICAgICAgICAgICAgcmVzb2x2ZSh7ZGVsZXRlZDp0cnVlfSkgICAgXG4gICAgICAgIH0pXG5cbiAgICAgICB9KTsgXG4gICAgICAgIFxuICAgICAgICBcbiAgICB9XG4gICAgZ2V0TWFuaWZlc3RQcm9jZXNzaW5nKCl7XG4gICAgICAgIHZhciBtc2VhcmNoID0gdGhpcy5teVNlYXJjaDsgXG4gICAgICAgIHJldHVybiBuZXcgUHJvbWlzZSgocmVzb2x2ZSxyZWplY3QpPT57XG4gICAgICAgICAgICB2YXIgb2Zmc2V0VmFsID0wO1xuICAgICAgICAgICAgdmFyIHBhZ2VTaXplID0gMjA7IFxuICAgICAgICAgICAgY29uc29sZS5sb2coJ29mZnNldCAnK29mZnNldFZhbCk7XG4gICAgICAgICAgICB2YXIgbWFuaWZlc3RMaXN0ID0gW107IFxuICAgICAgICAgICAgbXNlYXJjaC5zZWFyY2goYEBzdGFnZUlkOlszIDRdYCwge1xuICAgICAgICAgICAgICAgIG9mZnNldDpvZmZzZXRWYWwsXG4gICAgICAgICAgICAgICAgbnVtYmVyT2ZSZXN1bHRzOiBwYWdlU2l6ZSxcbiAgICAgICAgICAgICAgICBzb3J0Qnk6IFwibWlkXCIsXG4gICAgICAgICAgICAgICAgZGlyOiBcIkRFU0NcIlxuICAgICAgICAgICAgfSwgKHIxLCBkYXRhKSA9PiB7XG4gICAgICAgICAgICAgICAgaWYgKHIxKVxuICAgICAgICAgICAgICAgICAgICBjb25zb2xlLmxvZyhyMSk7XG4gICAgICAgICAgICAgICAgIFxuICAgICAgICAgICAgICAgICBkYXRhLnJlc3VsdHMuZm9yRWFjaChtYW5pZmVzdFJlc3VsdCA9PiB7XG4gICAgICAgICAgICAgICAgICAgIG1hbmlmZXN0TGlzdC5wdXNoKG1hbmlmZXN0UmVzdWx0LmRvYyk7ICAgIFxuICAgICAgICAgICAgICAgICAgICBcbiAgICAgICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICAgICAgIC8vY29uc29sZS5sb2cobWFuaWZlc3RMaXN0KTtcbiAgICAgICAgICAgICAgICAgdmFyIHBhZ2VkRGF0YSA9IHtcbiAgICAgICAgICAgICAgICAgICAgbWFuaWZlc3RzOm1hbmlmZXN0TGlzdCxcbiAgICAgICAgICAgICAgICAgICAgdG90YWxSZXN1bHRzIDogZGF0YS50b3RhbFJlc3VsdHMsXG4gICAgICAgICAgICAgICAgICAgIHBhZ2UgOiAxLFxuICAgICAgICAgICAgICAgICAgICBwYWdlU2l6ZTogcGFnZVNpemUsIFxuICAgICAgICAgICAgICAgICAgICBUb3RhbFBhZ2VzIDogKGRhdGEudG90YWxSZXN1bHRzL3BhZ2VTaXplKVxuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICByZXNvbHZlKHBhZ2VkRGF0YSk7XG4gICAgICAgICAgICAgICAgY29uc29sZS5sb2cobWFuaWZlc3RMaXN0KTtcbiAgICAgICAgICAgICAgICBcbiAgICAgICAgICAgIH0pO1xuICAgICAgICB9KTtcbiAgICB9XG4gICAgXG4gICAgZ2V0VHlwZWJ5SWQgKGlkKXtcbiAgICAgICAgaWYgKGlkID09IDEpe1xuICAgICAgICAgICAgcmV0dXJuIG1hbmlmZXN0VHlwZXMuYWlyO1xuICAgICAgICB9XG4gICAgICAgIGlmIChpZCA9PSAyKXtcbiAgICAgICAgICAgIHJldHVybiBtYW5pZmVzdFR5cGVzLm9jZWFuO1xuICAgICAgICB9XG4gICAgICAgIGlmIChpZCA9PSAzKXtcbiAgICAgICAgICAgIHJldHVybiBtYW5pZmVzdFR5cGVzLmhhem1hdDtcbiAgICAgICAgfVxuICAgICAgICByZXR1cm4gbWFuaWZlc3RUeXBlcy5haXI7IFxuICAgIH1cbiAgICBnZXRTdGFnZUJ5SWQoaWQpe1xuICAgICAgICBpZiAoaWQgPT0gMSl7XG4gICAgICAgICAgICByZXR1cm4gbWFuaWZlc3RTdGFnZXMub3BlbjtcbiAgICAgICAgfVxuICAgICAgICBpZiAoaWQgPT0gMil7XG4gICAgICAgICAgICByZXR1cm4gbWFuaWZlc3RTdGFnZXMuY2xvc2VkO1xuICAgICAgICB9XG4gICAgICAgIGlmIChpZCA9PSAzKXtcbiAgICAgICAgICAgIHJldHVybiBtYW5pZmVzdFN0YWdlcy5zaGlwcGVkO1xuICAgICAgICB9XG4gICAgICAgIGlmIChpZCA9PSA0KXtcbiAgICAgICAgICAgIHJldHVybiBtYW5pZmVzdFN0YWdlcy52ZXJpZmllZDtcbiAgICAgICAgfVxuICAgICAgICByZXR1cm4gbWFuaWZlc3RTdGFnZXMub3BlbjsgXG4gICAgfVxufSJdfQ==
