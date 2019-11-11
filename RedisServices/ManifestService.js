'use strict';

Object.defineProperty(exports, "__esModule", {
    value: true
});
exports.ManifestService = undefined;

var _createClass = function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; }();

var _fs = require('fs');

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

var redis = require('redis');
var lredis = require('./redis-local');
var moment = require('moment');
var dataContext = require('./dataContext');
var redisSearch = require('../redisearchclient');
var MID_COUNTER = "global:midCounter";
var MID_PREFIX = "manifest:";
var MID_INDEX = "index:manifest";
var OPEN_MANIFEST = "manifest:open";
var CLOSED_MANIFEST = "manifest:closed";
var SHIPPED_MANIFEST = "manifest:shipped";
var MID_PACKAGES = "manifest:packages:";
var VERIFIED_MANIFEST = "manifest:verified"; // manifest that have duties verified
var PlaneService = require('./PlaneService').PlaneService;
var planeService = new PlaneService();
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
                console.log('saving details', details);
                _this.mySearch.update(details.id, details, function (err, result) {
                    if (err) console.log(err);
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
        key: 'getOpenManifestList',
        value: function getOpenManifestList(typeId) {
            var _this3 = this;

            return new Promise(function (resolve, reject) {
                console.log('@stageId:[' + typeId + ' ' + typeId + '] @mtypeId:' + typeId);
                _this3.mySearch.search('@stageId:[1 1] @mtypeId:' + typeId, {
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
                    var manifestList = [];

                    Promise.all(data.results.map(function (man) {
                        return planeService.listCompartments(man.doc.planeId);
                    })).then(function (planeResulst) {
                        console.log(planeResulst);
                        for (var i = 0; i < planeResulst.length; i++) {
                            var m = data.results[i];
                            var manifest = {};

                            manifest.plane = planeResulst[i].plane;
                            manifest.mid = m.doc.mid;
                            manifest.title = m.doc.title;
                            manifest.tailNum = m.doc.tailNum;
                            //console.log(m.doc.flightDate,moment.unix(m.doc.flightDate).format("MMM DD,YYYY hh:mm A"))
                            if (!m.doc.tailNum) m.doc.tailNum = "";
                            if (!m.doc.shipDate) {
                                manifest.shipDate = "";
                            } else manifest.shipDate = moment.unix(m.doc.shipDate).format("MMM DD,YYYY hh:mm A");
                            manifestList.push(manifest);
                        }

                        resolve({ manifests: manifestList });
                    }).catch(function (errall) {
                        console.log(errall);
                    });
                });
            });
        }
    }, {
        key: 'createNewManifest',
        value: function createNewManifest(type, user) {
            var _this4 = this;

            //we have some rules to follow here 
            //1. a new manifest cannot be created if the previous manifest is not closed 
            //check for open manifest first 
            var srv = this;
            return new Promise(function (resolve, reject) {
                _this4.getOpenManifest(type.id).then(function (openCount) {

                    console.log(type);
                    // if (openCount>0) {
                    //     //we can't add the manifest reject 
                    //     reject({
                    //         "message": "There is an open manifest Please close it before creating a new manifest."
                    //     });

                    // } else {
                    _this4.redisClient.multi().incr(MID_COUNTER).exec(function (err, resp) {
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
            var _this5 = this;

            return new Promise(function (resolve, reject) {

                lredis.client.hmset(MID_PREFIX + mid, "stageId", stages, function (err, result) {
                    var stage = _this5.getStageById(stages);
                    console.log('looked up the stage ' + stage.title);
                    lredis.client.hmset(MID_PREFIX + mid, "stage", stage.title, function (err, result2) {});
                    lredis.hgetall(MID_PREFIX + mid).then(function (uManifest) {
                        _this5.mySearch.delDocument("index:manifest", mid, function (err, result1) {
                            console.log('changing document');
                            console.log(err);
                            console.log(result1);
                            _this5.mySearch.add(uManifest.mid, uManifest);
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
            var _this6 = this;

            return new Promise(function (resolve, reject) {
                lredis.hmset(MID_PREFIX + mid, { awb: awb, shipDate: moment().format("YYYY-MM-DD"), shippedBy: user }).then(function (sresult) {
                    console.log(sresult);
                    _this6.changeStage(mid, 3).then(function (resu) {
                        resolve(sresult);
                    });
                });
            });
        }
    }, {
        key: 'listManifest',
        value: function listManifest(type, page, pageSize) {
            var _this7 = this;

            return new Promise(function (resolve, reject) {
                var offsetVal = (page - 1) * pageSize;
                console.log('offset ' + offsetVal);

                _this7.mySearch.search("@mtypeId:" + type, {
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
            return new Promise(function (resolve, reject) {
                lredis.hgetall(MID_PREFIX + mid).then(function (manifest) {
                    if (manifest.planeId) {
                        planeService.listCompartments(manifest.planeId).then(function (planeInfo) {
                            manifest.palne = planeInfo.plane;
                            resolve(manifest);
                        });
                    }
                });
            });
        }
    }, {
        key: 'deleteManifest',
        value: function deleteManifest(mid) {
            var _this8 = this;

            return new Promise(function (resolve, reject) {
                lredis.client.del(MID_PREFIX + mid, function (err, resp) {
                    console.log(resp);
                    _this8.mySearch.delDocument("index:manifest", mid, function (err, result) {
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
//# sourceMappingURL=data:application/json;charset=utf8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIlJlZGlzU2VydmljZXMvTWFuaWZlc3RTZXJ2aWNlLmVzNiJdLCJuYW1lcyI6WyJyZWRpcyIsInJlcXVpcmUiLCJscmVkaXMiLCJtb21lbnQiLCJkYXRhQ29udGV4dCIsInJlZGlzU2VhcmNoIiwiTUlEX0NPVU5URVIiLCJNSURfUFJFRklYIiwiTUlEX0lOREVYIiwiT1BFTl9NQU5JRkVTVCIsIkNMT1NFRF9NQU5JRkVTVCIsIlNISVBQRURfTUFOSUZFU1QiLCJNSURfUEFDS0FHRVMiLCJWRVJJRklFRF9NQU5JRkVTVCIsIlBsYW5lU2VydmljZSIsInBsYW5lU2VydmljZSIsIm1hbmlmZXN0VHlwZXMiLCJhaXIiLCJpZCIsInRpdGxlIiwicHJlZml4Iiwib2NlYW4iLCJoYXptYXQiLCJtYW5pZmVzdFN0YWdlcyIsIm9wZW4iLCJjbG9zZWQiLCJzaGlwcGVkIiwidmVyaWZpZWQiLCJNYW5pZmVzdFNlcnZpY2UiLCJyZWRpc0NsaWVudCIsImNsaWVudCIsIm10eXBlcyIsIm1zdGFnZXMiLCJjaGVja1NldHVwIiwic2V0dXBJbmRleCIsIm15U2VhcmNoIiwiY2xpZW50T3B0aW9ucyIsInNlYXJjaENsaWVudERldGFpbHMiLCJleGlzdHMiLCJlcnIiLCJyZXMiLCJzZXQiLCJteXR5cGVzIiwiZGV0YWlscyIsIlByb21pc2UiLCJyZXNvbHZlIiwicmVqZWN0IiwiY29uc29sZSIsImxvZyIsInVwZGF0ZSIsInJlc3VsdCIsImhtc2V0IiwidXBkYXRlZCIsInR5cGVJZCIsInNlYXJjaCIsIm9mZnNldCIsIm51bWJlck9mUmVzdWx0cyIsInNvcnRCeSIsImRpciIsInIxIiwiZGF0YSIsInRvdGFsUmVzdWx0cyIsIm1hbmlmZXN0TGlzdCIsImFsbCIsInJlc3VsdHMiLCJtYXAiLCJsaXN0Q29tcGFydG1lbnRzIiwibWFuIiwiZG9jIiwicGxhbmVJZCIsInRoZW4iLCJwbGFuZVJlc3Vsc3QiLCJpIiwibGVuZ3RoIiwibSIsIm1hbmlmZXN0IiwicGxhbmUiLCJtaWQiLCJ0YWlsTnVtIiwic2hpcERhdGUiLCJ1bml4IiwiZm9ybWF0IiwicHVzaCIsIm1hbmlmZXN0cyIsImNhdGNoIiwiZXJyYWxsIiwidHlwZSIsInVzZXIiLCJzcnYiLCJnZXRPcGVuTWFuaWZlc3QiLCJvcGVuQ291bnQiLCJtdWx0aSIsImluY3IiLCJleGVjIiwicmVzcCIsImRhdGVDcmVhdGVkIiwibXR5cGVJZCIsInN0YWdlSWQiLCJzdGFnZSIsImNyZWF0ZWRCeSIsInNhZGQiLCJhZGQiLCJzZXJyIiwicmVzdSIsInN0YWdlcyIsImdldFN0YWdlQnlJZCIsInJlc3VsdDIiLCJoZ2V0YWxsIiwidU1hbmlmZXN0IiwiZGVsRG9jdW1lbnQiLCJyZXN1bHQxIiwiYXdiIiwic2hpcHBlZEJ5Iiwic3Jlc3VsdCIsImNoYW5nZVN0YWdlIiwicGFnZSIsInBhZ2VTaXplIiwib2Zmc2V0VmFsIiwiZm9yRWFjaCIsIm1hbmlmZXN0UmVzdWx0IiwicGFnZWREYXRhIiwiVG90YWxQYWdlcyIsInBhbG5lIiwicGxhbmVJbmZvIiwiZGVsIiwic3JlbSIsImRlbGV0ZWQiLCJtc2VhcmNoIl0sIm1hcHBpbmdzIjoiOzs7Ozs7Ozs7QUFBQTs7OztBQUVBLElBQUlBLFFBQVFDLFFBQVEsT0FBUixDQUFaO0FBQ0EsSUFBSUMsU0FBU0QsUUFBUSxlQUFSLENBQWI7QUFDQSxJQUFJRSxTQUFTRixRQUFRLFFBQVIsQ0FBYjtBQUNBLElBQUlHLGNBQWNILFFBQVEsZUFBUixDQUFsQjtBQUNBLElBQUlJLGNBQWNKLFFBQVEscUJBQVIsQ0FBbEI7QUFDQSxJQUFNSyxjQUFjLG1CQUFwQjtBQUNBLElBQU1DLGFBQWEsV0FBbkI7QUFDQSxJQUFNQyxZQUFZLGdCQUFsQjtBQUNBLElBQU1DLGdCQUFnQixlQUF0QjtBQUNBLElBQU1DLGtCQUFrQixpQkFBeEI7QUFDQSxJQUFNQyxtQkFBbUIsa0JBQXpCO0FBQ0EsSUFBTUMsZUFBZSxvQkFBckI7QUFDQSxJQUFNQyxvQkFBb0IsbUJBQTFCLEMsQ0FBK0M7QUFDL0MsSUFBSUMsZUFBZWIsUUFB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LFlBQVk7QUFDYnJDLG1DQUFVckIsWUFERztBQUViRCxzQ0FBZUQsS0FBS0MsWUFGUDtBQUdic0QsOEJBQU8sQ0FITTtBQUliQyxrQ0FBVUEsUUFKRztBQUtiSyxvQ0FBYzdELEtBQUtDLFlBQUwsR0FBa0J1RDtBQUxuQixxQkFBaEI7QUFPRHZFLDRCQUFRMkUsU0FBUjtBQUNBekUsNEJBQVFDLEdBQVIsQ0FBWWMsWUFBWjtBQUVILGlCQXhCRDtBQXlCSCxhQTlCTSxDQUFQO0FBK0JIOzs7b0NBRVk1QyxFLEVBQUc7QUFDWixnQkFBSUEsTUFBTSxDQUFWLEVBQVk7QUFDUix1QkFBT0YsY0FBY0MsR0FBckI7QUFDSDtBQUNELGdCQUFJQyxNQUFNLENBQVYsRUFBWTtBQUNSLHVCQUFPRixjQUFjSyxLQUFyQjtBQUNIO0FBQ0QsZ0JBQUlILE1BQU0sQ0FBVixFQUFZO0FBQ1IsdUJBQU9GLGNBQWNNLE1BQXJCO0FBQ0g7QUFDRCxtQkFBT04sY0FBY0MsR0FBckI7QUFDSDs7O3FDQUNZQyxFLEVBQUc7QUFDWixnQkFBSUEsTUFBTSxDQUFWLEVBQVk7QUFDUix1QkFBT0ssZUFBZUMsSUFBdEI7QUFDSDtBQUNELGdCQUFJTixNQUFNLENBQVYsRUFBWTtBQUNSLHVCQUFPSyxlQUFlRSxNQUF0QjtBQUNIO0FBQ0QsZ0JBQUlQLE1BQU0sQ0FBVixFQUFZO0FBQ1IsdUJBQU9LLGVBQWVHLE9BQXRCO0FBQ0g7QUFDRCxnQkFBSVIsTUFBTSxDQUFWLEVBQVk7QUFDUix1QkFBT0ssZUFBZUksUUFBdEI7QUFDSDtBQUNELG1CQUFPSixlQUFlQyxJQUF0QjtBQUNIIiwiZmlsZSI6IlJlZGlzU2VydmljZXMvTWFuaWZlc3RTZXJ2aWNlLmpzIiwic291cmNlc0NvbnRlbnQiOlsiaW1wb3J0IHsgcHJvbWlzZXMgfSBmcm9tICdmcyc7XG5cbnZhciByZWRpcyA9IHJlcXVpcmUoJ3JlZGlzJyk7XG52YXIgbHJlZGlzID0gcmVxdWlyZSgnLi9yZWRpcy1sb2NhbCcpO1xudmFyIG1vbWVudCA9IHJlcXVpcmUoJ21vbWVudCcpO1xudmFyIGRhdGFDb250ZXh0ID0gcmVxdWlyZSgnLi9kYXRhQ29udGV4dCcpXG52YXIgcmVkaXNTZWFyY2ggPSByZXF1aXJlKCcuLi9yZWRpc2VhcmNoY2xpZW50Jyk7XG5jb25zdCBNSURfQ09VTlRFUiA9IFwiZ2xvYmFsOm1pZENvdW50ZXJcIjtcbmNvbnN0IE1JRF9QUkVGSVggPSBcIm1hbmlmZXN0OlwiO1xuY29uc3QgTUlEX0lOREVYID0gXCJpbmRleDptYW5pZmVzdFwiO1xuY29uc3QgT1BFTl9NQU5JRkVTVCA9IFwibWFuaWZlc3Q6b3BlblwiO1xuY29uc3QgQ0xPU0VEX01BTklGRVNUID0gXCJtYW5pZmVzdDpjbG9zZWRcIlxuY29uc3QgU0hJUFBFRF9NQU5JRkVTVCA9IFwibWFuaWZlc3Q6c2hpcHBlZFwiXG5jb25zdCBNSURfUEFDS0FHRVMgPSBcIm1hbmlmZXN0OnBhY2thZ2VzOlwiXG5jb25zdCBWRVJJRklFRF9NQU5JRkVTVCA9IFwibWFuaWZlc3Q6dmVyaWZpZWRcIjsgLy8gbWFuaWZlc3QgdGhhdCBoYXZlIGR1dGllcyB2ZXJpZmllZFxudmFyIFBsYW5lU2VydmljZSA9IHJlcXVpcmUoJy4vUGxhbmVTZXJ2aWNlJykuUGxhbmVTZXJ2aWNlOyBcbnZhciBwbGFuZVNlcnZpY2UgPSBuZXcgUGxhbmVTZXJ2aWNlKCk7IFxudmFyIG1hbmlmZXN0VHlwZXMgPSB7XG4gICAgYWlyOiB7XG4gICAgICAgIGlkOiAxLFxuICAgICAgICB0aXRsZTogXCJBaXIgQ2FyZ29cIixcbiAgICAgICAgcHJlZml4OiBcIk0tXCJcbiAgICB9LFxuICAgIG9jZWFuOiB7XG4gICAgICAgIGlkOiAyLFxuICAgICAgICB0aXRsZTogXCJPY2VhblwiLFxuICAgICAgICBwcmVmaXg6IFwiUy1cIlxuICAgIH0sXG4gICAgaGF6bWF0OiB7XG4gICAgICAgIGlkOiAzLFxuICAgICAgICB0aXRsZTogXCJIQVpNQVRcIixcbiAgICAgICAgcHJlZml4OiBcIkgtXCJcbiAgICB9XG59XG52YXIgbWFuaWZlc3RTdGFnZXMgPSB7XG4gICAgb3Blbjoge1xuICAgICAgICBpZDogMSxcbiAgICAgICAgdGl0bGU6ICdPcGVuJ1xuICAgIH0sXG4gICAgY2xvc2VkOiB7XG4gICAgICAgIGlkOiAyLFxuICAgICAgICB0aXRsZTogJ0Nsb3NlZCdcbiAgICB9LFxuICAgIHNoaXBwZWQ6IHtcbiAgICAgICAgaWQ6IDMsXG4gICAgICAgIHRpdGxlOiAnU2hpcHBlZCdcbiAgICB9LFxuICAgIHZlcmlmaWVkOiB7XG4gICAgICAgIGlkOiA0LFxuICAgICAgICB0aXRsZTogJ1ZlcmlmaWVkJ1xuICAgIH1cblxufVxuXG5leHBvcnQgY2xhc3MgTWFuaWZlc3RTZXJ2aWNlIHtcblxuICAgIGNvbnN0cnVjdG9yKCkgeyAgICAgICAgXG4gICAgICAgIHRoaXMucmVkaXNDbGllbnQgPSBscmVkaXMuY2xpZW50O1xuICAgICAgICB0aGlzLm10eXBlcyA9IG1hbmlmZXN0VHlwZXM7XG4gICAgICAgIHRoaXMubXN0YWdlcyA9IG1hbmlmZXN0U3RhZ2VzO1xuICAgICAgICAvL2NoZWNrIHRvIGVuc3VyZSB3ZSBoYXZlIHRoZSBtYW5pZmVzdCBjb3VudGVyIFxuICAgICAgICB0aGlzLmNoZWNrU2V0dXAoKTsgXG4gICAgICAgIHRoaXMuc2V0dXBJbmRleCgpXG4gICAgfVxuICAgIHNldHVwSW5kZXgoKXtcbiAgICAgICAgdGhpcy5teVNlYXJjaCA9IHJlZGlzU2VhcmNoKHJlZGlzLCAnaW5kZXg6bWFuaWZlc3QnLCB7XG4gICAgICAgICAgICBjbGllbnRPcHRpb25zOmxyZWRpcy5zZWFyY2hDbGllbnREZXRhaWxzXG4gICAgICAgIH0pO1xuICAgIH1cbiAgICBjaGVja1NldHVwKCl7XG4gICAgICAgIHRoaXMucmVkaXNDbGllbnQuZXhpc3RzKE1JRF9DT1VOVEVSLCAoZXJyLCByZXMpID0+IHtcbiAgICAgICAgICAgIGlmIChyZXMgPT0gMCkge1xuICAgICAgICAgICAgICAgIC8vY3JlYXRlIHRoZSBtYW5pZmVzdCBcbiAgICAgICAgICAgICAgICBscmVkaXMuc2V0KE1JRF9DT1VOVEVSLCAxMDApO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgXG4gICAgICAgIH0pO1xuICAgIH1cblxuICAgIGdldFR5cGVzKCkge1xuICAgICAgICByZXR1cm4gdGhpcy5teXR5cGVzXG4gICAgfVxuICAgIGdldFN0YWdlcygpIHtcbiAgICAgICAgcmV0dXJuIHRoaXMubWFuaWZlc3RTdGFnZXM7XG4gICAgfVxuICAgIHVwZGF0ZU1hbmlmZXN0RGV0YWlscyhkZXRhaWxzKXtcbiAgICAgICAgcmV0dXJuIG5ldyBQcm9taXNlKChyZXNvbHZlLHJlamVjdCk9PntcbiAgICAgICAgICAgIGNvbnNvbGUubG9nKCdzYXZpbmcgZGV0YWlscycsIGRldGFpbHMpOyBcbiAgICAgICAgICAgIHRoaXMubXlTZWFyY2gudXBkYXRlKGRldGFpbHMuaWQsZGV0YWlscywoZXJyLHJlc3VsdCk9PntcbiAgICAgICAgICAgICAgICBpZiAoZXJyKVxuICAgICAgICAgICAgICAgICAgICBjb25zb2xlLmxvZyhlcnIpOyBcbiAgICAgICAgICAgICAgICBscmVkaXMuaG1zZXQoTUlEX1BSRUZJWCtkZXRhaWxzLmlkLGRldGFpbHMpXG4gICAgICAgICAgICAgICAgcmVzb2x2ZSh7dXBkYXRlZDp0cnVlfSlcbiAgICAgICAgICAgIH0pXG4gICAgICAgIH0pXG4gICAgfVxuICAgIGdldE9wZW5NYW5pZmVzdCh0eXBlSWQpe1xuICAgICAgICBcbiAgICAgICAgcmV0dXJuIG5ldyBQcm9taXNlKChyZXNvbHZlLHJlamVjdCk9PntcbiAgICAgICAgICAgY29uc29sZS5sb2coIGBAc3RhZ2VJZDpbJHt0eXBlSWR9ICR7dHlwZUlkfV0gQG10eXBlSWQ6JHt0eXBlSWR9YCk7XG4gICAgICAgICAgICB0aGlzLm15U2VhcmNoLnNlYXJjaChgQHN0YWdlSWQ6WzEgMV0gQG10eXBlSWQ6JHt0eXBlSWR9YCwge1xuICAgICAgICAgICAgICAgIG9mZnNldDowLFxuICAgICAgICAgICAgICAgIG51bWJlck9mUmVzdWx0czogMTAwLFxuICAgICAgICAgICAgICAgIHNvcnRCeTogXCJtaWRcIixcbiAgICAgICAgICAgICAgICBkaXI6IFwiREVTQ1wiXG4gICAgICAgICAgICB9LCAocjEsIGRhdGEpID0+IHtcbiAgICAgICAgICAgICAgICBpZiAocjEpXG4gICAgICAgICAgICAgICAgIHtcbiAgICAgICAgICAgICAgICAgICAgIGNvbnNvbGUubG9nKCd3ZSBoYWQgYW4gZXJyb3InKVxuICAgICAgICAgICAgICAgICAgICBjb25zb2xlLmxvZyhyMSk7XG4gICAgICAgICAgICAgICAgICAgIFxuICAgICAgICAgICAgICAgICB9ICAgXG4gICAgICAgICAgICAgICAgIGNvbnNvbGUubG9nKCdubyBlcnJvcnMgZGV0ZWN0ZWQgaGVyZSAuLi4nKVxuICAgICAgICAgICAgICAgICAvL2NvbnNvbGUubG9nKG1hbmlmZXN0TGlzdCk7XG4gICAgICAgICAgICAgICAgIGNvbnNvbGUubG9nKGRhdGEpO1xuICAgICAgICAgICAgICAgIFxuICAgICAgICAgICAgICAgIHJlc29sdmUoZGF0YS50b3RhbFJlc3VsdHMpO1xuICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICBcbiAgICAgICAgfSk7XG4gICAgICAgIFxuICAgIH1cbiAgICBnZXRPcGVuTWFuaWZlc3RMaXN0KHR5cGVJZCl7XG4gICAgICAgIFxuICAgICAgICByZXR1cm4gbmV3IFByb21pc2UoKHJlc29sdmUscmVqZWN0KT0+e1xuICAgICAgICAgICBjb25zb2xlLmxvZyggYEBzdGFnZUlkOlske3R5cGVJZH0gJHt0eXBlSWR9XSBAbXR5cGVJZDoke3R5cGVJZH1gKTtcbiAgICAgICAgICAgIHRoaXMubXlTZWFyY2guc2VhcmNoKGBAc3RhZ2VJZDpbMSAxXSBAbXR5cGVJZDoke3R5cGVJZH1gLCB7XG4gICAgICAgICAgICAgICAgb2Zmc2V0OjAsXG4gICAgICAgICAgICAgICAgbnVtYmVyT2ZSZXN1bHRzOiAxMDAsXG4gICAgICAgICAgICAgICAgc29ydEJ5OiBcIm1pZFwiLFxuICAgICAgICAgICAgICAgIGRpcjogXCJERVNDXCJcbiAgICAgICAgICAgIH0sIChyMSwgZGF0YSkgPT4ge1xuICAgICAgICAgICAgICAgIGlmIChyMSlcbiAgICAgICAgICAgICAgICAge1xuICAgICAgICAgICAgICAgICAgICAgY29uc29sZS5sb2coJ3dlIGhhZCBhbiBlcnJvcicpXG4gICAgICAgICAgICAgICAgICAgIGNvbnNvbGUubG9nKHIxKTtcbiAgICAgICAgICAgICAgICAgICAgXG4gICAgICAgICAgICAgICAgIH0gICBcbiAgICAgICAgICAgICAgICAgY29uc29sZS5sb2coJ25vIGVycm9ycyBkZXRlY3RlZCBoZXJlIC4uLicpXG4gICAgICAgICAgICAgICAgIC8vY29uc29sZS5sb2cobWFuaWZlc3RMaXN0KTtcbiAgICAgICAgICAgICAgICAgY29uc29sZS5sb2coZGF0YSk7XG4gICAgICAgICAgICAgICAgIHZhciBtYW5pZmVzdExpc3QgID0gW107IFxuXG4gICAgICAgICAgICAgICAgICAgICBQcm9taXNlLmFsbChkYXRhLnJlc3VsdHMubWFwKG1hbj0+cGxhbmVTZXJ2aWNlLmxpc3RDb21wYXJ0bWVudHMobWFuLmRvYy5wbGFuZUlkKSkpLnRoZW4ocGxhbmVSZXN1bHN0PT57XG4gICAgICAgICAgICAgICAgICAgICAgICAgY29uc29sZS5sb2cocGxhbmVSZXN1bHN0KTsgXG4gICAgICAgICAgICAgICAgICAgICAgICAgZm9yIChsZXQgaSA9IDA7IGkgPCBwbGFuZVJlc3Vsc3QubGVuZ3RoOyBpKyspIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgdmFyIG0gPSBkYXRhLnJlc3VsdHNbaV07IFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICB2YXIgbWFuaWZlc3QgPSB7fVxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICBcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgbWFuaWZlc3QucGxhbmUgPSBwbGFuZVJlc3Vsc3RbaV0ucGxhbmVcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgbWFuaWZlc3QubWlkID0gbS5kb2MubWlkOyBcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgbWFuaWZlc3QudGl0bGUgPSBtLmRvYy50aXRsZTsgXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgIG1hbmlmZXN0LnRhaWxOdW0gPSBtLmRvYy50YWlsTnVtXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgIC8vY29uc29sZS5sb2cobS5kb2MuZmxpZ2h0RGF0ZSxtb21lbnQudW5peChtLmRvYy5mbGlnaHREYXRlKS5mb3JtYXQoXCJNTU0gREQsWVlZWSBoaDptbSBBXCIpKVxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICBpZiAoIW0uZG9jLnRhaWxOdW0pXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIG0uZG9jLnRhaWxOdW0gPSBcIlwiOyBcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgaWYgKCFtLmRvYy5zaGlwRGF0ZSl7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBtYW5pZmVzdC5zaGlwRGF0ZSA9IFwiXCJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICBlbHNlXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIG1hbmlmZXN0LnNoaXBEYXRlID0gbW9tZW50LnVuaXgobS5kb2Muc2hpcERhdGUpLmZvcm1hdChcIk1NTSBERCxZWVlZIGhoOm1tIEFcIik7IFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICBtYW5pZmVzdExpc3QucHVzaChtYW5pZmVzdClcbiAgICAgICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgICAgICAgXG4gICAgICAgICAgICAgICAgICAgICAgICAgcmVzb2x2ZSh7bWFuaWZlc3RzOm1hbmlmZXN0TGlzdH0pO1xuICAgICAgICAgICAgICAgXG4gICAgICAgICAgICAgICAgICAgIFxuICAgICAgICAgICAgICAgICB9KS5jYXRjaChlcnJhbGw9PntcbiAgICAgICAgICAgICAgICAgICAgIGNvbnNvbGUubG9nKGVycmFsbClcbiAgICAgICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICAgICAgXG4gICAgICAgICAgICB9KTtcbiAgICAgICAgICAgIFxuICAgICAgICB9KTtcbiAgICAgICAgXG4gICAgfVxuICAgIGNyZWF0ZU5ld01hbmlmZXN0KHR5cGUsIHVzZXIpIHtcbiAgICAgICAgLy93ZSBoYXZlIHNvbWUgcnVsZXMgdG8gZm9sbG93IGhlcmUgXG4gICAgICAgIC8vMS4gYSBuZXcgbWFuaWZlc3QgY2Fubm90IGJlIGNyZWF0ZWQgaWYgdGhlIHByZXZpb3VzIG1hbmlmZXN0IGlzIG5vdCBjbG9zZWQgXG4gICAgICAgIC8vY2hlY2sgZm9yIG9wZW4gbWFuaWZlc3QgZmlyc3QgXG4gICAgICAgIHZhciBzcnYgPSB0aGlzOyBcbiAgICAgICAgcmV0dXJuIG5ldyBQcm9taXNlKChyZXNvbHZlLCByZWplY3QpID0+IHtcbiAgICAgICAgICAgIHRoaXMuZ2V0T3Blbk1hbmlmZXN0KHR5cGUuaWQpLnRoZW4oKG9wZW5Db3VudCkgPT4ge1xuICAgICAgICAgICAgICBcbiAgICAgICAgICAgICAgICBjb25zb2xlLmxvZyh0eXBlKTsgXG4gICAgICAgICAgICAgICAgLy8gaWYgKG9wZW5Db3VudD4wKSB7XG4gICAgICAgICAgICAgICAgLy8gICAgIC8vd2UgY2FuJ3QgYWRkIHRoZSBtYW5pZmVzdCByZWplY3QgXG4gICAgICAgICAgICAgICAgLy8gICAgIHJlamVjdCh7XG4gICAgICAgICAgICAgICAgLy8gICAgICAgICBcIm1lc3NhZ2VcIjogXCJUaGVyZSBpcyBhbiBvcGVuIG1hbmlmZXN0IFBsZWFzZSBjbG9zZSBpdCBiZWZvcmUgY3JlYXRpbmcgYSBuZXcgbWFuaWZlc3QuXCJcbiAgICAgICAgICAgICAgICAvLyAgICAgfSk7XG5cbiAgICAgICAgICAgICAgICAvLyB9IGVsc2Uge1xuICAgICAgICAgICAgICAgICAgICB0aGlzLnJlZGlzQ2xpZW50Lm11bHRpKClcbiAgICAgICAgICAgICAgICAgICAgICAgIC5pbmNyKE1JRF9DT1VOVEVSKVxuICAgICAgICAgICAgICAgICAgICAgICAgLmV4ZWMoKGVyciwgcmVzcCkgPT4ge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGNvbnNvbGUubG9nKHJlc3ApO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHZhciBtYW5pZmVzdCA9IHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgbWlkOiByZXNwWzBdLFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB0aXRsZTogdHlwZS5wcmVmaXgrcmVzcFswXSxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgZGF0ZUNyZWF0ZWQ6IG1vbWVudCgpLnVuaXgoKSwvL2Zvcm1hdChcIllZWVktTU0tRERcIiksXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIG10eXBlSWQ6IHR5cGUuaWQsXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHN0YWdlSWQ6IG1hbmlmZXN0U3RhZ2VzLm9wZW4uaWQsXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHN0YWdlOiBtYW5pZmVzdFN0YWdlcy5vcGVuLnRpdGxlLFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBjcmVhdGVkQnk6IHVzZXJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICB9O1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGNvbnNvbGUubG9nKG1hbmlmZXN0KVxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHNydi5yZWRpc0NsaWVudC5tdWx0aSgpXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIC5obXNldChNSURfUFJFRklYICsgbWFuaWZlc3QubWlkLCBtYW5pZmVzdClcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgLnNhZGQoT1BFTl9NQU5JRkVTVCwgbWFuaWZlc3QubWlkKVxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAuZXhlYygoZXJyLCByZXN1bHRzKSA9PiB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBzcnYubXlTZWFyY2guYWRkKG1hbmlmZXN0Lm1pZCxtYW5pZmVzdCwoc2VycixyZXN1KT0+e1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGlmIChzZXJyKVxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBjb25zb2xlLmxvZyhzZXJyKVxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGNvbnNvbGUubG9nKHJlc3UpXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB9KTtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIC8vYWxzbyBhZGQgdG8gdGhlIGluZGV4IGhlcmUgb25lIHRpbWUgXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBpZiAoZXJyKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgcmVqZWN0KGVycik7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHJlc29sdmUobWFuaWZlc3QpXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICAgICAgLy99XG5cbiAgICAgICAgICAgIH0pLmNhdGNoKChlcnIpPT57XG4gICAgICAgICAgICAgICAgY29uc29sZS5sb2coXCJlcnIgZGV0ZWN0ZWRcIik7IFxuICAgICAgICAgICAgICAgIGNvbnNvbGUubG9nKGVycik7XG4gICAgICAgICAgICB9KTtcblxuICAgICAgICB9KTtcblxuICAgIH1cbiAgICBjaGFuZ2VTdGFnZShtaWQsIHN0YWdlcykge1xuICAgICAgICByZXR1cm4gbmV3IFByb21pc2UoKHJlc29sdmUsIHJlamVjdCkgPT4ge1xuICAgICAgICAgICAgXG4gICAgICAgICAgICBscmVkaXMuY2xpZW50Lmhtc2V0KE1JRF9QUkVGSVgrbWlkLFwic3RhZ2VJZFwiLHN0YWdlcywoZXJyLHJlc3VsdCk9PntcbiAgICAgICAgICAgICAgICB2YXIgc3RhZ2UgPSB0aGlzLmdldFN0YWdlQnlJZChzdGFnZXMpOyBcbiAgICAgICAgICAgICAgICBjb25zb2xlLmxvZygnbG9va2VkIHVwIHRoZSBzdGFnZSAnK3N0YWdlLnRpdGxlKTtcbiAgICAgICAgICAgICAgICBscmVkaXMuY2xpZW50Lmhtc2V0KE1JRF9QUkVGSVgrbWlkLFwic3RhZ2VcIixzdGFnZS50aXRsZSwoZXJyLHJlc3VsdDIpPT57fSk7IFxuICAgICAgICAgICAgICAgIGxyZWRpcy5oZ2V0YWxsKE1JRF9QUkVGSVgrbWlkKS50aGVuKCh1TWFuaWZlc3QpPT57XG4gICAgICAgICAgICAgICAgICAgIHRoaXMubXlTZWFyY2guZGVsRG9jdW1lbnQoXCJpbmRleDptYW5pZmVzdFwiLG1pZCwoZXJyLHJlc3VsdDEpPT57XG4gICAgICAgICAgICAgICAgICAgICAgICBjb25zb2xlLmxvZygnY2hhbmdpbmcgZG9jdW1lbnQnKTtcbiAgICAgICAgICAgICAgICAgICAgICAgIGNvbnNvbGUubG9nKGVycik7XG4gICAgICAgICAgICAgICAgICAgICAgICBjb25zb2xlLmxvZyhyZXN1bHQxKSBcbiAgICAgICAgICAgICAgICAgICAgICAgIHRoaXMubXlTZWFyY2guYWRkKHVNYW5pZmVzdC5taWQsdU1hbmlmZXN0KTsgXG4gICAgICAgICAgICAgICAgICAgICAgICByZXNvbHZlKHJlc3VsdCk7IFxuICAgICAgICAgICAgICAgICAgICB9KTsgXG4gICAgICAgICAgICAgICAgICAgXG4gICAgICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICAgICBcbiAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgLy93ZSBhbHNvIG5lZWQgdG8gdG8gdXBkYXRlIHRoZSBkb2N1bWVudCBcblxuICAgICAgICAgICAgXG4gICAgICAgIH0pXG4gICAgfVxuICAgIHNoaXBNYW5pZmVzdChtaWQsYXdiLHVzZXIpe1xuICAgICAgICByZXR1cm4gbmV3IFByb21pc2UoKHJlc29sdmUscmVqZWN0KT0+e1xuICAgICAgICAgICAgbHJlZGlzLmhtc2V0KE1JRF9QUkVGSVgrbWlkLCB7YXdiOmF3YixzaGlwRGF0ZTptb21lbnQoKS5mb3JtYXQoXCJZWVlZLU1NLUREXCIpLHNoaXBwZWRCeTp1c2VyfSkudGhlbigoc3Jlc3VsdCk9PntcbiAgICAgICAgICAgICAgICBjb25zb2xlLmxvZyhzcmVzdWx0KTtcbiAgICAgICAgICAgICAgICB0aGlzLmNoYW5nZVN0YWdlKG1pZCwzKS50aGVuKChyZXN1KT0+e1xuICAgICAgICAgICAgICAgICAgICByZXNvbHZlKHNyZXN1bHQpO1xuICAgICAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgICAgIFxuICAgICAgICAgICAgfSlcbiAgICAgICAgfSlcbiAgICB9XG4gICAgbGlzdE1hbmlmZXN0KHR5cGUscGFnZSxwYWdlU2l6ZSl7XG4gICAgICAgIHJldHVybiBuZXcgUHJvbWlzZSgocmVzb2x2ZSxyZWplY3QpPT57XG4gICAgICAgICAgICB2YXIgb2Zmc2V0VmFsID0gKHBhZ2UgLSAxKSAqIHBhZ2VTaXplO1xuICAgICAgICAgICAgY29uc29sZS5sb2coJ29mZnNldCAnK29mZnNldFZhbCk7XG4gICAgICAgICAgICBcbiAgICAgICAgICAgIHRoaXMubXlTZWFyY2guc2VhcmNoKFwiQG10eXBlSWQ6XCIrdHlwZSwge1xuICAgICAgICAgICAgICAgIG9mZnNldDpvZmZzZXRWYWwsXG4gICAgICAgICAgICAgICAgbnVtYmVyT2ZSZXN1bHRzOiBwYWdlU2l6ZSxcbiAgICAgICAgICAgICAgICBzb3J0Qnk6IFwibWlkXCIsXG4gICAgICAgICAgICAgICAgZGlyOiBcIkRFU0NcIlxuICAgICAgICAgICAgfSwgKHIxLCBkYXRhKSA9PiB7XG4gICAgICAgICAgICAgICAgaWYgKHIxKVxuICAgICAgICAgICAgICAgICAgICBjb25zb2xlLmxvZyhyMSk7XG4gICAgICAgICAgICAgICAgIHZhciBtYW5pZmVzdExpc3QgPSBbXTsgXG4gICAgICAgICAgICAgICAgIGRhdGEucmVzdWx0cy5mb3JFYWNoKG1hbmlmZXN0UmVzdWx0ID0+IHtcbiAgICAgICAgICAgICAgICAgICAgbWFuaWZlc3RMaXN0LnB1c2gobWFuaWZlc3RSZXN1bHQuZG9jKTsgICAgXG4gICAgICAgICAgICAgICAgICAgIFxuICAgICAgICAgICAgICAgICB9KTtcbiAgICAgICAgICAgICAgICAgLy9jb25zb2xlLmxvZyhtYW5pZmVzdExpc3QpO1xuICAgICAgICAgICAgICAgICB2YXIgcGFnZWREYXRhID0ge1xuICAgICAgICAgICAgICAgICAgICBtYW5pZmVzdHM6bWFuaWZlc3RMaXN0LFxuICAgICAgICAgICAgICAgICAgICB0b3RhbFJlc3VsdHMgOiBkYXRhLnRvdGFsUmVzdWx0cyxcbiAgICAgICAgICAgICAgICAgICAgcGFnZSA6IHBhZ2UsXG4gICAgICAgICAgICAgICAgICAgIHBhZ2VTaXplOiBwYWdlU2l6ZSwgXG4gICAgICAgICAgICAgICAgICAgIFRvdGFsUGFnZXMgOiAoZGF0YS50b3RhbFJlc3VsdHMvcGFnZVNpemUpXG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIHJlc29sdmUocGFnZWREYXRhKTtcbiAgICAgICAgICAgICAgICBjb25zb2xlLmxvZyhtYW5pZmVzdExpc3QpO1xuICAgICAgICAgICAgICAgIFxuICAgICAgICAgICAgfSk7XG4gICAgICAgIH0pO1xuICAgIH1cbiAgICBnZXRNYW5pZmVzdChtaWQpIHtcbiAgICAgICAgcmV0dXJuIG5ldyBQcm9taXNlKChyZXNvbHZlLHJlamVjdCk9PntcbiAgICAgICAgICAgIGxyZWRpcy5oZ2V0YWxsKE1JRF9QUkVGSVgrbWlkKS50aGVuKG1hbmlmZXN0PT57XG4gICAgICAgICAgICAgICAgaWYgKG1hbmlmZXN0LnBsYW5lSWQpe1xuICAgICAgICAgICAgICAgICAgICBwbGFuZVNlcnZpY2UubGlzdENvbXBhcnRtZW50cyhtYW5pZmVzdC5wbGFuZUlkKS50aGVuKHBsYW5lSW5mbz0+e1xuICAgICAgICAgICAgICAgICAgICAgICAgbWFuaWZlc3QucGFsbmUgPSBwbGFuZUluZm8ucGxhbmU7IFxuICAgICAgICAgICAgICAgICAgICAgICAgcmVzb2x2ZShtYW5pZmVzdCk7XG4gICAgICAgICAgICAgICAgICAgIH0pXG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICBcbiAgICAgICAgICAgIH0pICAgIFxuICAgICAgICB9KVxuICAgICAgICBcbiAgICB9XG4gICAgZGVsZXRlTWFuaWZlc3QobWlkKXtcbiAgICAgICByZXR1cm4gbmV3IFByb21pc2UoKHJlc29sdmUscmVqZWN0KT0+e1xuICAgICAgICBscmVkaXMuY2xpZW50LmRlbChNSURfUFJFRklYK21pZCwoZXJyLHJlc3ApPT57XG4gICAgICAgICAgICBjb25zb2xlLmxvZyhyZXNwKTsgXG4gICAgICAgICAgICB0aGlzLm15U2VhcmNoLmRlbERvY3VtZW50KFwiaW5kZXg6bWFuaWZlc3RcIixtaWQsKGVycixyZXN1bHQpPT57XG4gICAgICAgICAgICAgICAgY29uc29sZS5sb2coXCJkZWxldGluZyBtaWRcIik7IFxuICAgICAgICAgICAgICAgIGNvbnNvbGUubG9nKGVycik7IFxuICAgICAgICAgICAgICAgIGNvbnNvbGUubG9nKHJlc3VsdCk7XG4gICAgICAgICAgICB9KTsgXG4gICAgICAgICAgICBscmVkaXMuc3JlbShPUEVOX01BTklGRVNULG1pZCk7XG4gICAgICAgICAgICByZXNvbHZlKHtkZWxldGVkOnRydWV9KSAgICBcbiAgICAgICAgfSlcblxuICAgICAgIH0pOyBcbiAgICAgICAgXG4gICAgICAgIFxuICAgIH1cbiAgICBnZXRNYW5pZmVzdFByb2Nlc3NpbmcoKXtcbiAgICAgICAgdmFyIG1zZWFyY2ggPSB0aGlzLm15U2VhcmNoOyBcbiAgICAgICAgcmV0dXJuIG5ldyBQcm9taXNlKChyZXNvbHZlLHJlamVjdCk9PntcbiAgICAgICAgICAgIHZhciBvZmZzZXRWYWwgPTA7XG4gICAgICAgICAgICB2YXIgcGFnZVNpemUgPSAyMDsgXG4gICAgICAgICAgICBjb25zb2xlLmxvZygnb2Zmc2V0ICcrb2Zmc2V0VmFsKTtcbiAgICAgICAgICAgIHZhciBtYW5pZmVzdExpc3QgPSBbXTsgXG4gICAgICAgICAgICBtc2VhcmNoLnNlYXJjaChgQHN0YWdlSWQ6WzMgNF1gLCB7XG4gICAgICAgICAgICAgICAgb2Zmc2V0Om9mZnNldFZhbCxcbiAgICAgICAgICAgICAgICBudW1iZXJPZlJlc3VsdHM6IHBhZ2VTaXplLFxuICAgICAgICAgICAgICAgIHNvcnRCeTogXCJtaWRcIixcbiAgICAgICAgICAgICAgICBkaXI6IFwiREVTQ1wiXG4gICAgICAgICAgICB9LCAocjEsIGRhdGEpID0+IHtcbiAgICAgICAgICAgICAgICBpZiAocjEpXG4gICAgICAgICAgICAgICAgICAgIGNvbnNvbGUubG9nKHIxKTtcbiAgICAgICAgICAgICAgICAgXG4gICAgICAgICAgICAgICAgIGRhdGEucmVzdWx0cy5mb3JFYWNoKG1hbmlmZXN0UmVzdWx0ID0+IHtcbiAgICAgICAgICAgICAgICAgICAgbWFuaWZlc3RMaXN0LnB1c2gobWFuaWZlc3RSZXN1bHQuZG9jKTsgICAgXG4gICAgICAgICAgICAgICAgICAgIFxuICAgICAgICAgICAgICAgICB9KTtcbiAgICAgICAgICAgICAgICAgLy9jb25zb2xlLmxvZyhtYW5pZmVzdExpc3QpO1xuICAgICAgICAgICAgICAgICB2YXIgcGFnZWREYXRhID0ge1xuICAgICAgICAgICAgICAgICAgICBtYW5pZmVzdHM6bWFuaWZlc3RMaXN0LFxuICAgICAgICAgICAgICAgICAgICB0b3RhbFJlc3VsdHMgOiBkYXRhLnRvdGFsUmVzdWx0cyxcbiAgICAgICAgICAgICAgICAgICAgcGFnZSA6IDEsXG4gICAgICAgICAgICAgICAgICAgIHBhZ2VTaXplOiBwYWdlU2l6ZSwgXG4gICAgICAgICAgICAgICAgICAgIFRvdGFsUGFnZXMgOiAoZGF0YS50b3RhbFJlc3VsdHMvcGFnZVNpemUpXG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIHJlc29sdmUocGFnZWREYXRhKTtcbiAgICAgICAgICAgICAgICBjb25zb2xlLmxvZyhtYW5pZmVzdExpc3QpO1xuICAgICAgICAgICAgICAgIFxuICAgICAgICAgICAgfSk7XG4gICAgICAgIH0pO1xuICAgIH1cbiAgICBcbiAgICBnZXRUeXBlYnlJZCAoaWQpe1xuICAgICAgICBpZiAoaWQgPT0gMSl7XG4gICAgICAgICAgICByZXR1cm4gbWFuaWZlc3RUeXBlcy5haXI7XG4gICAgICAgIH1cbiAgICAgICAgaWYgKGlkID09IDIpe1xuICAgICAgICAgICAgcmV0dXJuIG1hbmlmZXN0VHlwZXMub2NlYW47XG4gICAgICAgIH1cbiAgICAgICAgaWYgKGlkID09IDMpe1xuICAgICAgICAgICAgcmV0dXJuIG1hbmlmZXN0VHlwZXMuaGF6bWF0O1xuICAgICAgICB9XG4gICAgICAgIHJldHVybiBtYW5pZmVzdFR5cGVzLmFpcjsgXG4gICAgfVxuICAgIGdldFN0YWdlQnlJZChpZCl7XG4gICAgICAgIGlmIChpZCA9PSAxKXtcbiAgICAgICAgICAgIHJldHVybiBtYW5pZmVzdFN0YWdlcy5vcGVuO1xuICAgICAgICB9XG4gICAgICAgIGlmIChpZCA9PSAyKXtcbiAgICAgICAgICAgIHJldHVybiBtYW5pZmVzdFN0YWdlcy5jbG9zZWQ7XG4gICAgICAgIH1cbiAgICAgICAgaWYgKGlkID09IDMpe1xuICAgICAgICAgICAgcmV0dXJuIG1hbmlmZXN0U3RhZ2VzLnNoaXBwZWQ7XG4gICAgICAgIH1cbiAgICAgICAgaWYgKGlkID09IDQpe1xuICAgICAgICAgICAgcmV0dXJuIG1hbmlmZXN0U3RhZ2VzLnZlcmlmaWVkO1xuICAgICAgICB9XG4gICAgICAgIHJldHVybiBtYW5pZmVzdFN0YWdlcy5vcGVuOyBcbiAgICB9XG5cbn0iXX0=
