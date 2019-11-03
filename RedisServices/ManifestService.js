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
            return lredis.hgetall(MID_PREFIX + mid);
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

        // addPackageToManifest(packageBarCode, mid){
        //     //we should just update the package in the index. 
        //     return new Promise((resolve,reject)=>{
        //         dataContext.redisClient.sadd(MID_PACKAGES+mid,packageBarCode,(err,result)=>{
        //             resolve({added:true})
        //         }); 
        //     })
        // }
        // removePackageFromManifest(packageBarCode,mid){
        //     return new Promise((resolve,reject)=>{
        //         dataContext.redisClient.srem(MID_PACKAGES_mid,packageBarCode,(err,result)=>{
        //             resolve({remove:true})
        //         })
        //     })
        // }
        // getManifestPackages(mid){
        //     return new Promise((resolve,reject)=>{
        //         dataContext.redisClient.smembers(MID_PACKAGES+mid,(err))
        //     })
        // }

    }]);

    return ManifestService;
}();
//# sourceMappingURL=data:application/json;charset=utf8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIlJlZGlzU2VydmljZXMvTWFuaWZlc3RTZXJ2aWNlLmVzNiJdLCJuYW1lcyI6WyJyZWRpcyIsInJlcXVpcmUiLCJscmVkaXMiLCJtb21lbnQiLCJkYXRhQ29udGV4dCIsInJlZGlzU2VhcmNoIiwiTUlEX0NPVU5URVIiLCJNSURfUFJFRklYIiwiTUlEX0lOREVYIiwiT1BFTl9NQU5JRkVTVCIsIkNMT1NFRF9NQU5JRkVTVCIsIlNISVBQRURfTUFOSUZFU1QiLCJNSURfUEFDS0FHRVMiLCJWRVJJRklFRF9NQU5JRkVTVCIsIlBsYW5lU2VydmljZSIsInBsYW5lU2VydmljZSIsIm1hbmlmZXN0VHlwZXMiLCJhaXIiLCJpZCIsInRpdGxlIiwicHJlZml4Iiwib2NlYW4iLCJoYXptYXQiLCJtYW5pZmVzdFN0YWdlcyIsIm9wZW4iLCJjbG9zZWQiLCJzaGlwcGVkIiwidmVyaWZpZWQiLCJNYW5pZmVzdFNlcnZpY2UiLCJyZWRpc0NsaWVudCIsImNsaWVudCIsIm10eXBlcyIsIm1zdGFnZXMiLCJjaGVja1NldHVwIiwic2V0dXBJbmRleCIsIm15U2VhcmNoIiwiY2xpZW50T3B0aW9ucyIsInNlYXJjaENsaWVudERldGFpbHMiLCJleGlzdHMiLCJlcnIiLCJyZXMiLCJzZXQiLCJteXR5cGVzIiwiZGV0YWlscyIsIlByb21pc2UiLCJyZXNvbHZlIiwicmVqZWN0IiwiY29uc29sZSIsImxvZyIsInVwZGF0ZSIsInJlc3VsdCIsImhtc2V0IiwidXBkYXRlZCIsInR5cGVJZCIsInNlYXJjaCIsIm9mZnNldCIsIm51bWJlck9mUmVzdWx0cyIsInNvcnRCeSIsImRpciIsInIxIiwiZGF0YSIsInRvdGFsUmVzdWx0cyIsIm1hbmlmZXN0TGlzdCIsImFsbCIsInJlc3VsdHMiLCJtYXAiLCJsaXN0Q29tcGFydG1lbnRzIiwibWFuIiwiZG9jIiwicGxhbmVJZCIsInRoZW4iLCJwbGFuZVJlc3Vsc3QiLCJpIiwibGVuZ3RoIiwibSIsIm1hbmlmZXN0IiwicGxhbmUiLCJtaWQiLCJ0YWlsTnVtIiwic2hpcERhdGUiLCJ1bml4IiwiZm9ybWF0IiwicHVzaCIsIm1hbmlmZXN0cyIsImNhdGNoIiwiZXJyYWxsIiwidHlwZSIsInVzZXIiLCJzcnYiLCJnZXRPcGVuTWFuaWZlc3QiLCJvcGVuQ291bnQiLCJtdWx0aSIsImluY3IiLCJleGVjIiwicmVzcCIsImRhdGVDcmVhdGVkIiwibXR5cGVJZCIsInN0YWdlSWQiLCJzdGFnZSIsImNyZWF0ZWRCeSIsInNhZGQiLCJhZGQiLCJzZXJyIiwicmVzdSIsInN0YWdlcyIsImdldFN0YWdlQnlJZCIsInJlc3VsdDIiLCJoZ2V0YWxsIiwidU1hbmlmZXN0IiwiZGVsRG9jdW1lbnQiLCJyZXN1bHQxIiwiYXdiIiwic2hpcHBlZEJ5Iiwic3Jlc3VsdCIsImNoYW5nZVN0YWdlIiwicGFnZSIsInBhZ2VTaXplIiwib2Zmc2V0VmFsIiwiZm9yRWFjaCIsIm1hbmlmZXN0UmVzdWx0IiwicGFnZWREYXRhIiwiVG90YWxQYWdlcyIsImRlbCIsInNyZW0iLCJkZWxldGVkIiwibXNlYXJjaCJdLCJtYXBwaW5ncyI6Ijs7Ozs7Ozs7O0FBQUE7Ozs7QUFFQSxJQUFJQSxRQUFRQyxRQUFRLE9BQVIsQ0FBWjtBQUNBLElBQUlDLFNBQVNELFFBQVEsZUFBUixDQUFiO0FBQ0EsSUFBSUUsU0FBU0YsUUFBUSxRQUFSLENBQWI7QUFDQSxJQUFJRyxjQUFjSCxRQUFRLGVBQVIsQ0FBbEI7QUFDQSxJQUFJSSxjQUFjSixRQUFRLHFCQUFSLENBQWxCO0FBQ0EsSUFBTUssY0FBYyxtQkFBcEI7QUFDQSxJQUFNQyxhQUFhLFdBQW5CO0FBQ0EsSUFBTUMsWUFBWSxnQkFBbEI7QUFDQSxJQUFNQyxnQkFBZ0IsZUFBdEI7QUFDQSxJQUFNQyxrQkFBa0IsaUJBQXhCO0FBQ0EsSUFBTUMsbUJBQW1CLGtCQUF6QjtBQUNBLElBQU1DLGVBQWUsb0JBQXJCO0FBQ0EsSUFBTUMsb0JBQW9CLG1CQUExQixDLENBQStDO0FBQy9DLElBQUlDLGVBQWViLFFBQVEsZ0JBQVIsRUFBMEJhLFlBQTdD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ckI7QUFDSDtBQUNELGdCQUFJSCxNQUFNLENBQVYsRUFBWTtBQUNSLHVCQUFPRixjQUFjTSxNQUFyQjtBQUNIO0FBQ0QsbUJBQU9OLGNBQWNDLEdBQXJCO0FBQ0g7OztxQ0FDWUMsRSxFQUFHO0FBQ1osZ0JBQUlBLE1BQU0sQ0FBVixFQUFZO0FBQ1IsdUJBQU9LLGVBQWVDLElBQXRCO0FBQ0g7QUFDRCxnQkFBSU4sTUFBTSxDQUFWLEVBQVk7QUFDUix1QkFBT0ssZUFBZUUsTUFBdEI7QUFDSDtBQUNELGdCQUFJUCxNQUFNLENBQVYsRUFBWTtBQUNSLHVCQUFPSyxlQUFlRyxPQUF0QjtBQUNIO0FBQ0QsZ0JBQUlSLE1BQU0sQ0FBVixFQUFZO0FBQ1IsdUJBQU9LLGVBQWVJLFFBQXRCO0FBQ0g7QUFDRCxtQkFBT0osZUFBZUMsSUFBdEI7QUFDSDs7QUFFRDtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBIiwiZmlsZSI6IlJlZGlzU2VydmljZXMvTWFuaWZlc3RTZXJ2aWNlLmpzIiwic291cmNlc0NvbnRlbnQiOlsiaW1wb3J0IHsgcHJvbWlzZXMgfSBmcm9tICdmcyc7XG5cbnZhciByZWRpcyA9IHJlcXVpcmUoJ3JlZGlzJyk7XG52YXIgbHJlZGlzID0gcmVxdWlyZSgnLi9yZWRpcy1sb2NhbCcpO1xudmFyIG1vbWVudCA9IHJlcXVpcmUoJ21vbWVudCcpO1xudmFyIGRhdGFDb250ZXh0ID0gcmVxdWlyZSgnLi9kYXRhQ29udGV4dCcpXG52YXIgcmVkaXNTZWFyY2ggPSByZXF1aXJlKCcuLi9yZWRpc2VhcmNoY2xpZW50Jyk7XG5jb25zdCBNSURfQ09VTlRFUiA9IFwiZ2xvYmFsOm1pZENvdW50ZXJcIjtcbmNvbnN0IE1JRF9QUkVGSVggPSBcIm1hbmlmZXN0OlwiO1xuY29uc3QgTUlEX0lOREVYID0gXCJpbmRleDptYW5pZmVzdFwiO1xuY29uc3QgT1BFTl9NQU5JRkVTVCA9IFwibWFuaWZlc3Q6b3BlblwiO1xuY29uc3QgQ0xPU0VEX01BTklGRVNUID0gXCJtYW5pZmVzdDpjbG9zZWRcIlxuY29uc3QgU0hJUFBFRF9NQU5JRkVTVCA9IFwibWFuaWZlc3Q6c2hpcHBlZFwiXG5jb25zdCBNSURfUEFDS0FHRVMgPSBcIm1hbmlmZXN0OnBhY2thZ2VzOlwiXG5jb25zdCBWRVJJRklFRF9NQU5JRkVTVCA9IFwibWFuaWZlc3Q6dmVyaWZpZWRcIjsgLy8gbWFuaWZlc3QgdGhhdCBoYXZlIGR1dGllcyB2ZXJpZmllZFxudmFyIFBsYW5lU2VydmljZSA9IHJlcXVpcmUoJy4vUGxhbmVTZXJ2aWNlJykuUGxhbmVTZXJ2aWNlOyBcbnZhciBwbGFuZVNlcnZpY2UgPSBuZXcgUGxhbmVTZXJ2aWNlKCk7IFxudmFyIG1hbmlmZXN0VHlwZXMgPSB7XG4gICAgYWlyOiB7XG4gICAgICAgIGlkOiAxLFxuICAgICAgICB0aXRsZTogXCJBaXIgQ2FyZ29cIixcbiAgICAgICAgcHJlZml4OiBcIk0tXCJcbiAgICB9LFxuICAgIG9jZWFuOiB7XG4gICAgICAgIGlkOiAyLFxuICAgICAgICB0aXRsZTogXCJPY2VhblwiLFxuICAgICAgICBwcmVmaXg6IFwiUy1cIlxuICAgIH0sXG4gICAgaGF6bWF0OiB7XG4gICAgICAgIGlkOiAzLFxuICAgICAgICB0aXRsZTogXCJIQVpNQVRcIixcbiAgICAgICAgcHJlZml4OiBcIkgtXCJcbiAgICB9XG59XG52YXIgbWFuaWZlc3RTdGFnZXMgPSB7XG4gICAgb3Blbjoge1xuICAgICAgICBpZDogMSxcbiAgICAgICAgdGl0bGU6ICdPcGVuJ1xuICAgIH0sXG4gICAgY2xvc2VkOiB7XG4gICAgICAgIGlkOiAyLFxuICAgICAgICB0aXRsZTogJ0Nsb3NlZCdcbiAgICB9LFxuICAgIHNoaXBwZWQ6IHtcbiAgICAgICAgaWQ6IDMsXG4gICAgICAgIHRpdGxlOiAnU2hpcHBlZCdcbiAgICB9LFxuICAgIHZlcmlmaWVkOiB7XG4gICAgICAgIGlkOiA0LFxuICAgICAgICB0aXRsZTogJ1ZlcmlmaWVkJ1xuICAgIH1cblxufVxuXG5leHBvcnQgY2xhc3MgTWFuaWZlc3RTZXJ2aWNlIHtcblxuICAgIGNvbnN0cnVjdG9yKCkgeyAgICAgICAgXG4gICAgICAgIHRoaXMucmVkaXNDbGllbnQgPSBscmVkaXMuY2xpZW50O1xuICAgICAgICB0aGlzLm10eXBlcyA9IG1hbmlmZXN0VHlwZXM7XG4gICAgICAgIHRoaXMubXN0YWdlcyA9IG1hbmlmZXN0U3RhZ2VzO1xuICAgICAgICAvL2NoZWNrIHRvIGVuc3VyZSB3ZSBoYXZlIHRoZSBtYW5pZmVzdCBjb3VudGVyIFxuICAgICAgICB0aGlzLmNoZWNrU2V0dXAoKTsgXG4gICAgICAgIHRoaXMuc2V0dXBJbmRleCgpXG4gICAgfVxuICAgIHNldHVwSW5kZXgoKXtcbiAgICAgICAgdGhpcy5teVNlYXJjaCA9IHJlZGlzU2VhcmNoKHJlZGlzLCAnaW5kZXg6bWFuaWZlc3QnLCB7XG4gICAgICAgICAgICBjbGllbnRPcHRpb25zOmxyZWRpcy5zZWFyY2hDbGllbnREZXRhaWxzXG4gICAgICAgIH0pO1xuICAgIH1cbiAgICBjaGVja1NldHVwKCl7XG4gICAgICAgIHRoaXMucmVkaXNDbGllbnQuZXhpc3RzKE1JRF9DT1VOVEVSLCAoZXJyLCByZXMpID0+IHtcbiAgICAgICAgICAgIGlmIChyZXMgPT0gMCkge1xuICAgICAgICAgICAgICAgIC8vY3JlYXRlIHRoZSBtYW5pZmVzdCBcbiAgICAgICAgICAgICAgICBscmVkaXMuc2V0KE1JRF9DT1VOVEVSLCAxMDApO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgXG4gICAgICAgIH0pO1xuICAgIH1cblxuICAgIGdldFR5cGVzKCkge1xuICAgICAgICByZXR1cm4gdGhpcy5teXR5cGVzXG4gICAgfVxuICAgIGdldFN0YWdlcygpIHtcbiAgICAgICAgcmV0dXJuIHRoaXMubWFuaWZlc3RTdGFnZXM7XG4gICAgfVxuICAgIHVwZGF0ZU1hbmlmZXN0RGV0YWlscyhkZXRhaWxzKXtcbiAgICAgICAgcmV0dXJuIG5ldyBQcm9taXNlKChyZXNvbHZlLHJlamVjdCk9PntcbiAgICAgICAgICAgIGNvbnNvbGUubG9nKCdzYXZpbmcgZGV0YWlscycsIGRldGFpbHMpOyBcbiAgICAgICAgICAgIHRoaXMubXlTZWFyY2gudXBkYXRlKGRldGFpbHMuaWQsZGV0YWlscywoZXJyLHJlc3VsdCk9PntcbiAgICAgICAgICAgICAgICBpZiAoZXJyKVxuICAgICAgICAgICAgICAgICAgICBjb25zb2xlLmxvZyhlcnIpOyBcbiAgICAgICAgICAgICAgICBscmVkaXMuaG1zZXQoTUlEX1BSRUZJWCtkZXRhaWxzLmlkLGRldGFpbHMpXG4gICAgICAgICAgICAgICAgcmVzb2x2ZSh7dXBkYXRlZDp0cnVlfSlcbiAgICAgICAgICAgIH0pXG4gICAgICAgIH0pXG4gICAgfVxuICAgIGdldE9wZW5NYW5pZmVzdCh0eXBlSWQpe1xuICAgICAgICBcbiAgICAgICAgcmV0dXJuIG5ldyBQcm9taXNlKChyZXNvbHZlLHJlamVjdCk9PntcbiAgICAgICAgICAgY29uc29sZS5sb2coIGBAc3RhZ2VJZDpbJHt0eXBlSWR9ICR7dHlwZUlkfV0gQG10eXBlSWQ6JHt0eXBlSWR9YCk7XG4gICAgICAgICAgICB0aGlzLm15U2VhcmNoLnNlYXJjaChgQHN0YWdlSWQ6WzEgMV0gQG10eXBlSWQ6JHt0eXBlSWR9YCwge1xuICAgICAgICAgICAgICAgIG9mZnNldDowLFxuICAgICAgICAgICAgICAgIG51bWJlck9mUmVzdWx0czogMTAwLFxuICAgICAgICAgICAgICAgIHNvcnRCeTogXCJtaWRcIixcbiAgICAgICAgICAgICAgICBkaXI6IFwiREVTQ1wiXG4gICAgICAgICAgICB9LCAocjEsIGRhdGEpID0+IHtcbiAgICAgICAgICAgICAgICBpZiAocjEpXG4gICAgICAgICAgICAgICAgIHtcbiAgICAgICAgICAgICAgICAgICAgIGNvbnNvbGUubG9nKCd3ZSBoYWQgYW4gZXJyb3InKVxuICAgICAgICAgICAgICAgICAgICBjb25zb2xlLmxvZyhyMSk7XG4gICAgICAgICAgICAgICAgICAgIFxuICAgICAgICAgICAgICAgICB9ICAgXG4gICAgICAgICAgICAgICAgIGNvbnNvbGUubG9nKCdubyBlcnJvcnMgZGV0ZWN0ZWQgaGVyZSAuLi4nKVxuICAgICAgICAgICAgICAgICAvL2NvbnNvbGUubG9nKG1hbmlmZXN0TGlzdCk7XG4gICAgICAgICAgICAgICAgIGNvbnNvbGUubG9nKGRhdGEpO1xuICAgICAgICAgICAgICAgIFxuICAgICAgICAgICAgICAgIHJlc29sdmUoZGF0YS50b3RhbFJlc3VsdHMpO1xuICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICBcbiAgICAgICAgfSk7XG4gICAgICAgIFxuICAgIH1cbiAgICBnZXRPcGVuTWFuaWZlc3RMaXN0KHR5cGVJZCl7XG4gICAgICAgIFxuICAgICAgICByZXR1cm4gbmV3IFByb21pc2UoKHJlc29sdmUscmVqZWN0KT0+e1xuICAgICAgICAgICBjb25zb2xlLmxvZyggYEBzdGFnZUlkOlske3R5cGVJZH0gJHt0eXBlSWR9XSBAbXR5cGVJZDoke3R5cGVJZH1gKTtcbiAgICAgICAgICAgIHRoaXMubXlTZWFyY2guc2VhcmNoKGBAc3RhZ2VJZDpbMSAxXSBAbXR5cGVJZDoke3R5cGVJZH1gLCB7XG4gICAgICAgICAgICAgICAgb2Zmc2V0OjAsXG4gICAgICAgICAgICAgICAgbnVtYmVyT2ZSZXN1bHRzOiAxMDAsXG4gICAgICAgICAgICAgICAgc29ydEJ5OiBcIm1pZFwiLFxuICAgICAgICAgICAgICAgIGRpcjogXCJERVNDXCJcbiAgICAgICAgICAgIH0sIChyMSwgZGF0YSkgPT4ge1xuICAgICAgICAgICAgICAgIGlmIChyMSlcbiAgICAgICAgICAgICAgICAge1xuICAgICAgICAgICAgICAgICAgICAgY29uc29sZS5sb2coJ3dlIGhhZCBhbiBlcnJvcicpXG4gICAgICAgICAgICAgICAgICAgIGNvbnNvbGUubG9nKHIxKTtcbiAgICAgICAgICAgICAgICAgICAgXG4gICAgICAgICAgICAgICAgIH0gICBcbiAgICAgICAgICAgICAgICAgY29uc29sZS5sb2coJ25vIGVycm9ycyBkZXRlY3RlZCBoZXJlIC4uLicpXG4gICAgICAgICAgICAgICAgIC8vY29uc29sZS5sb2cobWFuaWZlc3RMaXN0KTtcbiAgICAgICAgICAgICAgICAgY29uc29sZS5sb2coZGF0YSk7XG4gICAgICAgICAgICAgICAgIHZhciBtYW5pZmVzdExpc3QgID0gW107IFxuXG4gICAgICAgICAgICAgICAgICAgICBQcm9taXNlLmFsbChkYXRhLnJlc3VsdHMubWFwKG1hbj0+cGxhbmVTZXJ2aWNlLmxpc3RDb21wYXJ0bWVudHMobWFuLmRvYy5wbGFuZUlkKSkpLnRoZW4ocGxhbmVSZXN1bHN0PT57XG4gICAgICAgICAgICAgICAgICAgICAgICAgY29uc29sZS5sb2cocGxhbmVSZXN1bHN0KTsgXG4gICAgICAgICAgICAgICAgICAgICAgICAgZm9yIChsZXQgaSA9IDA7IGkgPCBwbGFuZVJlc3Vsc3QubGVuZ3RoOyBpKyspIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgdmFyIG0gPSBkYXRhLnJlc3VsdHNbaV07IFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICB2YXIgbWFuaWZlc3QgPSB7fVxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICBcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgbWFuaWZlc3QucGxhbmUgPSBwbGFuZVJlc3Vsc3RbaV0ucGxhbmVcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgbWFuaWZlc3QubWlkID0gbS5kb2MubWlkOyBcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgbWFuaWZlc3QudGl0bGUgPSBtLmRvYy50aXRsZTsgXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgIC8vY29uc29sZS5sb2cobS5kb2MuZmxpZ2h0RGF0ZSxtb21lbnQudW5peChtLmRvYy5mbGlnaHREYXRlKS5mb3JtYXQoXCJNTU0gREQsWVlZWSBoaDptbSBBXCIpKVxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICBpZiAoIW0uZG9jLnRhaWxOdW0pXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIG0uZG9jLnRhaWxOdW0gPSBcIlwiOyBcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgaWYgKCFtLmRvYy5zaGlwRGF0ZSl7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBtYW5pZmVzdC5zaGlwRGF0ZSA9IFwiXCJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICBlbHNlXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIG1hbmlmZXN0LnNoaXBEYXRlID0gbW9tZW50LnVuaXgobS5kb2Muc2hpcERhdGUpLmZvcm1hdChcIk1NTSBERCxZWVlZIGhoOm1tIEFcIik7IFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICBtYW5pZmVzdExpc3QucHVzaChtYW5pZmVzdClcbiAgICAgICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgICAgICAgXG4gICAgICAgICAgICAgICAgICAgICAgICAgcmVzb2x2ZSh7bWFuaWZlc3RzOm1hbmlmZXN0TGlzdH0pO1xuICAgICAgICAgICAgICAgXG4gICAgICAgICAgICAgICAgICAgIFxuICAgICAgICAgICAgICAgICB9KS5jYXRjaChlcnJhbGw9PntcbiAgICAgICAgICAgICAgICAgICAgIGNvbnNvbGUubG9nKGVycmFsbClcbiAgICAgICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICAgICAgXG4gICAgICAgICAgICB9KTtcbiAgICAgICAgICAgIFxuICAgICAgICB9KTtcbiAgICAgICAgXG4gICAgfVxuICAgIGNyZWF0ZU5ld01hbmlmZXN0KHR5cGUsIHVzZXIpIHtcbiAgICAgICAgLy93ZSBoYXZlIHNvbWUgcnVsZXMgdG8gZm9sbG93IGhlcmUgXG4gICAgICAgIC8vMS4gYSBuZXcgbWFuaWZlc3QgY2Fubm90IGJlIGNyZWF0ZWQgaWYgdGhlIHByZXZpb3VzIG1hbmlmZXN0IGlzIG5vdCBjbG9zZWQgXG4gICAgICAgIC8vY2hlY2sgZm9yIG9wZW4gbWFuaWZlc3QgZmlyc3QgXG4gICAgICAgIHZhciBzcnYgPSB0aGlzOyBcbiAgICAgICAgcmV0dXJuIG5ldyBQcm9taXNlKChyZXNvbHZlLCByZWplY3QpID0+IHtcbiAgICAgICAgICAgIHRoaXMuZ2V0T3Blbk1hbmlmZXN0KHR5cGUuaWQpLnRoZW4oKG9wZW5Db3VudCkgPT4ge1xuICAgICAgICAgICAgICBcbiAgICAgICAgICAgICAgICBjb25zb2xlLmxvZyh0eXBlKTsgXG4gICAgICAgICAgICAgICAgLy8gaWYgKG9wZW5Db3VudD4wKSB7XG4gICAgICAgICAgICAgICAgLy8gICAgIC8vd2UgY2FuJ3QgYWRkIHRoZSBtYW5pZmVzdCByZWplY3QgXG4gICAgICAgICAgICAgICAgLy8gICAgIHJlamVjdCh7XG4gICAgICAgICAgICAgICAgLy8gICAgICAgICBcIm1lc3NhZ2VcIjogXCJUaGVyZSBpcyBhbiBvcGVuIG1hbmlmZXN0IFBsZWFzZSBjbG9zZSBpdCBiZWZvcmUgY3JlYXRpbmcgYSBuZXcgbWFuaWZlc3QuXCJcbiAgICAgICAgICAgICAgICAvLyAgICAgfSk7XG5cbiAgICAgICAgICAgICAgICAvLyB9IGVsc2Uge1xuICAgICAgICAgICAgICAgICAgICB0aGlzLnJlZGlzQ2xpZW50Lm11bHRpKClcbiAgICAgICAgICAgICAgICAgICAgICAgIC5pbmNyKE1JRF9DT1VOVEVSKVxuICAgICAgICAgICAgICAgICAgICAgICAgLmV4ZWMoKGVyciwgcmVzcCkgPT4ge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGNvbnNvbGUubG9nKHJlc3ApO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHZhciBtYW5pZmVzdCA9IHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgbWlkOiByZXNwWzBdLFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB0aXRsZTogdHlwZS5wcmVmaXgrcmVzcFswXSxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgZGF0ZUNyZWF0ZWQ6IG1vbWVudCgpLnVuaXgoKSwvL2Zvcm1hdChcIllZWVktTU0tRERcIiksXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIG10eXBlSWQ6IHR5cGUuaWQsXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHN0YWdlSWQ6IG1hbmlmZXN0U3RhZ2VzLm9wZW4uaWQsXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHN0YWdlOiBtYW5pZmVzdFN0YWdlcy5vcGVuLnRpdGxlLFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBjcmVhdGVkQnk6IHVzZXJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICB9O1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGNvbnNvbGUubG9nKG1hbmlmZXN0KVxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHNydi5yZWRpc0NsaWVudC5tdWx0aSgpXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIC5obXNldChNSURfUFJFRklYICsgbWFuaWZlc3QubWlkLCBtYW5pZmVzdClcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgLnNhZGQoT1BFTl9NQU5JRkVTVCwgbWFuaWZlc3QubWlkKVxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAuZXhlYygoZXJyLCByZXN1bHRzKSA9PiB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBzcnYubXlTZWFyY2guYWRkKG1hbmlmZXN0Lm1pZCxtYW5pZmVzdCwoc2VycixyZXN1KT0+e1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGlmIChzZXJyKVxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBjb25zb2xlLmxvZyhzZXJyKVxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGNvbnNvbGUubG9nKHJlc3UpXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB9KTtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIC8vYWxzbyBhZGQgdG8gdGhlIGluZGV4IGhlcmUgb25lIHRpbWUgXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBpZiAoZXJyKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgcmVqZWN0KGVycik7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHJlc29sdmUobWFuaWZlc3QpXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICAgICAgLy99XG5cbiAgICAgICAgICAgIH0pLmNhdGNoKChlcnIpPT57XG4gICAgICAgICAgICAgICAgY29uc29sZS5sb2coXCJlcnIgZGV0ZWN0ZWRcIik7IFxuICAgICAgICAgICAgICAgIGNvbnNvbGUubG9nKGVycik7XG4gICAgICAgICAgICB9KTtcblxuICAgICAgICB9KTtcblxuICAgIH1cbiAgICBjaGFuZ2VTdGFnZShtaWQsIHN0YWdlcykge1xuICAgICAgICByZXR1cm4gbmV3IFByb21pc2UoKHJlc29sdmUsIHJlamVjdCkgPT4ge1xuICAgICAgICAgICAgXG4gICAgICAgICAgICBscmVkaXMuY2xpZW50Lmhtc2V0KE1JRF9QUkVGSVgrbWlkLFwic3RhZ2VJZFwiLHN0YWdlcywoZXJyLHJlc3VsdCk9PntcbiAgICAgICAgICAgICAgICB2YXIgc3RhZ2UgPSB0aGlzLmdldFN0YWdlQnlJZChzdGFnZXMpOyBcbiAgICAgICAgICAgICAgICBjb25zb2xlLmxvZygnbG9va2VkIHVwIHRoZSBzdGFnZSAnK3N0YWdlLnRpdGxlKTtcbiAgICAgICAgICAgICAgICBscmVkaXMuY2xpZW50Lmhtc2V0KE1JRF9QUkVGSVgrbWlkLFwic3RhZ2VcIixzdGFnZS50aXRsZSwoZXJyLHJlc3VsdDIpPT57fSk7IFxuICAgICAgICAgICAgICAgIGxyZWRpcy5oZ2V0YWxsKE1JRF9QUkVGSVgrbWlkKS50aGVuKCh1TWFuaWZlc3QpPT57XG4gICAgICAgICAgICAgICAgICAgIHRoaXMubXlTZWFyY2guZGVsRG9jdW1lbnQoXCJpbmRleDptYW5pZmVzdFwiLG1pZCwoZXJyLHJlc3VsdDEpPT57XG4gICAgICAgICAgICAgICAgICAgICAgICBjb25zb2xlLmxvZygnY2hhbmdpbmcgZG9jdW1lbnQnKTtcbiAgICAgICAgICAgICAgICAgICAgICAgIGNvbnNvbGUubG9nKGVycik7XG4gICAgICAgICAgICAgICAgICAgICAgICBjb25zb2xlLmxvZyhyZXN1bHQxKSBcbiAgICAgICAgICAgICAgICAgICAgICAgIHRoaXMubXlTZWFyY2guYWRkKHVNYW5pZmVzdC5taWQsdU1hbmlmZXN0KTsgXG4gICAgICAgICAgICAgICAgICAgICAgICByZXNvbHZlKHJlc3VsdCk7IFxuICAgICAgICAgICAgICAgICAgICB9KTsgXG4gICAgICAgICAgICAgICAgICAgXG4gICAgICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICAgICBcbiAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgLy93ZSBhbHNvIG5lZWQgdG8gdG8gdXBkYXRlIHRoZSBkb2N1bWVudCBcblxuICAgICAgICAgICAgXG4gICAgICAgIH0pXG4gICAgfVxuICAgIHNoaXBNYW5pZmVzdChtaWQsYXdiLHVzZXIpe1xuICAgICAgICByZXR1cm4gbmV3IFByb21pc2UoKHJlc29sdmUscmVqZWN0KT0+e1xuICAgICAgICAgICAgbHJlZGlzLmhtc2V0KE1JRF9QUkVGSVgrbWlkLCB7YXdiOmF3YixzaGlwRGF0ZTptb21lbnQoKS5mb3JtYXQoXCJZWVlZLU1NLUREXCIpLHNoaXBwZWRCeTp1c2VyfSkudGhlbigoc3Jlc3VsdCk9PntcbiAgICAgICAgICAgICAgICBjb25zb2xlLmxvZyhzcmVzdWx0KTtcbiAgICAgICAgICAgICAgICB0aGlzLmNoYW5nZVN0YWdlKG1pZCwzKS50aGVuKChyZXN1KT0+e1xuICAgICAgICAgICAgICAgICAgICByZXNvbHZlKHNyZXN1bHQpO1xuICAgICAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgICAgIFxuICAgICAgICAgICAgfSlcbiAgICAgICAgfSlcbiAgICB9XG4gICAgbGlzdE1hbmlmZXN0KHR5cGUscGFnZSxwYWdlU2l6ZSl7XG4gICAgICAgIHJldHVybiBuZXcgUHJvbWlzZSgocmVzb2x2ZSxyZWplY3QpPT57XG4gICAgICAgICAgICB2YXIgb2Zmc2V0VmFsID0gKHBhZ2UgLSAxKSAqIHBhZ2VTaXplO1xuICAgICAgICAgICAgY29uc29sZS5sb2coJ29mZnNldCAnK29mZnNldFZhbCk7XG4gICAgICAgICAgICBcbiAgICAgICAgICAgIHRoaXMubXlTZWFyY2guc2VhcmNoKFwiQG10eXBlSWQ6XCIrdHlwZSwge1xuICAgICAgICAgICAgICAgIG9mZnNldDpvZmZzZXRWYWwsXG4gICAgICAgICAgICAgICAgbnVtYmVyT2ZSZXN1bHRzOiBwYWdlU2l6ZSxcbiAgICAgICAgICAgICAgICBzb3J0Qnk6IFwibWlkXCIsXG4gICAgICAgICAgICAgICAgZGlyOiBcIkRFU0NcIlxuICAgICAgICAgICAgfSwgKHIxLCBkYXRhKSA9PiB7XG4gICAgICAgICAgICAgICAgaWYgKHIxKVxuICAgICAgICAgICAgICAgICAgICBjb25zb2xlLmxvZyhyMSk7XG4gICAgICAgICAgICAgICAgIHZhciBtYW5pZmVzdExpc3QgPSBbXTsgXG4gICAgICAgICAgICAgICAgIGRhdGEucmVzdWx0cy5mb3JFYWNoKG1hbmlmZXN0UmVzdWx0ID0+IHtcbiAgICAgICAgICAgICAgICAgICAgbWFuaWZlc3RMaXN0LnB1c2gobWFuaWZlc3RSZXN1bHQuZG9jKTsgICAgXG4gICAgICAgICAgICAgICAgICAgIFxuICAgICAgICAgICAgICAgICB9KTtcbiAgICAgICAgICAgICAgICAgLy9jb25zb2xlLmxvZyhtYW5pZmVzdExpc3QpO1xuICAgICAgICAgICAgICAgICB2YXIgcGFnZWREYXRhID0ge1xuICAgICAgICAgICAgICAgICAgICBtYW5pZmVzdHM6bWFuaWZlc3RMaXN0LFxuICAgICAgICAgICAgICAgICAgICB0b3RhbFJlc3VsdHMgOiBkYXRhLnRvdGFsUmVzdWx0cyxcbiAgICAgICAgICAgICAgICAgICAgcGFnZSA6IHBhZ2UsXG4gICAgICAgICAgICAgICAgICAgIHBhZ2VTaXplOiBwYWdlU2l6ZSwgXG4gICAgICAgICAgICAgICAgICAgIFRvdGFsUGFnZXMgOiAoZGF0YS50b3RhbFJlc3VsdHMvcGFnZVNpemUpXG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIHJlc29sdmUocGFnZWREYXRhKTtcbiAgICAgICAgICAgICAgICBjb25zb2xlLmxvZyhtYW5pZmVzdExpc3QpO1xuICAgICAgICAgICAgICAgIFxuICAgICAgICAgICAgfSk7XG4gICAgICAgIH0pO1xuICAgIH1cbiAgICBnZXRNYW5pZmVzdChtaWQpIHtcbiAgICAgICAgcmV0dXJuIGxyZWRpcy5oZ2V0YWxsKE1JRF9QUkVGSVgrbWlkKVxuICAgIH1cbiAgICBkZWxldGVNYW5pZmVzdChtaWQpe1xuICAgICAgIHJldHVybiBuZXcgUHJvbWlzZSgocmVzb2x2ZSxyZWplY3QpPT57XG4gICAgICAgIGxyZWRpcy5jbGllbnQuZGVsKE1JRF9QUkVGSVgrbWlkLChlcnIscmVzcCk9PntcbiAgICAgICAgICAgIGNvbnNvbGUubG9nKHJlc3ApOyBcbiAgICAgICAgICAgIHRoaXMubXlTZWFyY2guZGVsRG9jdW1lbnQoXCJpbmRleDptYW5pZmVzdFwiLG1pZCwoZXJyLHJlc3VsdCk9PntcbiAgICAgICAgICAgICAgICBjb25zb2xlLmxvZyhcImRlbGV0aW5nIG1pZFwiKTsgXG4gICAgICAgICAgICAgICAgY29uc29sZS5sb2coZXJyKTsgXG4gICAgICAgICAgICAgICAgY29uc29sZS5sb2cocmVzdWx0KTtcbiAgICAgICAgICAgIH0pOyBcbiAgICAgICAgICAgIGxyZWRpcy5zcmVtKE9QRU5fTUFOSUZFU1QsbWlkKTtcbiAgICAgICAgICAgIHJlc29sdmUoe2RlbGV0ZWQ6dHJ1ZX0pICAgIFxuICAgICAgICB9KVxuXG4gICAgICAgfSk7IFxuICAgICAgICBcbiAgICAgICAgXG4gICAgfVxuICAgIGdldE1hbmlmZXN0UHJvY2Vzc2luZygpe1xuICAgICAgICB2YXIgbXNlYXJjaCA9IHRoaXMubXlTZWFyY2g7IFxuICAgICAgICByZXR1cm4gbmV3IFByb21pc2UoKHJlc29sdmUscmVqZWN0KT0+e1xuICAgICAgICAgICAgdmFyIG9mZnNldFZhbCA9MDtcbiAgICAgICAgICAgIHZhciBwYWdlU2l6ZSA9IDIwOyBcbiAgICAgICAgICAgIGNvbnNvbGUubG9nKCdvZmZzZXQgJytvZmZzZXRWYWwpO1xuICAgICAgICAgICAgdmFyIG1hbmlmZXN0TGlzdCA9IFtdOyBcbiAgICAgICAgICAgIG1zZWFyY2guc2VhcmNoKGBAc3RhZ2VJZDpbMyA0XWAsIHtcbiAgICAgICAgICAgICAgICBvZmZzZXQ6b2Zmc2V0VmFsLFxuICAgICAgICAgICAgICAgIG51bWJlck9mUmVzdWx0czogcGFnZVNpemUsXG4gICAgICAgICAgICAgICAgc29ydEJ5OiBcIm1pZFwiLFxuICAgICAgICAgICAgICAgIGRpcjogXCJERVNDXCJcbiAgICAgICAgICAgIH0sIChyMSwgZGF0YSkgPT4ge1xuICAgICAgICAgICAgICAgIGlmIChyMSlcbiAgICAgICAgICAgICAgICAgICAgY29uc29sZS5sb2cocjEpO1xuICAgICAgICAgICAgICAgICBcbiAgICAgICAgICAgICAgICAgZGF0YS5yZXN1bHRzLmZvckVhY2gobWFuaWZlc3RSZXN1bHQgPT4ge1xuICAgICAgICAgICAgICAgICAgICBtYW5pZmVzdExpc3QucHVzaChtYW5pZmVzdFJlc3VsdC5kb2MpOyAgICBcbiAgICAgICAgICAgICAgICAgICAgXG4gICAgICAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgICAgICAvL2NvbnNvbGUubG9nKG1hbmlmZXN0TGlzdCk7XG4gICAgICAgICAgICAgICAgIHZhciBwYWdlZERhdGEgPSB7XG4gICAgICAgICAgICAgICAgICAgIG1hbmlmZXN0czptYW5pZmVzdExpc3QsXG4gICAgICAgICAgICAgICAgICAgIHRvdGFsUmVzdWx0cyA6IGRhdGEudG90YWxSZXN1bHRzLFxuICAgICAgICAgICAgICAgICAgICBwYWdlIDogMSxcbiAgICAgICAgICAgICAgICAgICAgcGFnZVNpemU6IHBhZ2VTaXplLCBcbiAgICAgICAgICAgICAgICAgICAgVG90YWxQYWdlcyA6IChkYXRhLnRvdGFsUmVzdWx0cy9wYWdlU2l6ZSlcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgcmVzb2x2ZShwYWdlZERhdGEpO1xuICAgICAgICAgICAgICAgIGNvbnNvbGUubG9nKG1hbmlmZXN0TGlzdCk7XG4gICAgICAgICAgICAgICAgXG4gICAgICAgICAgICB9KTtcbiAgICAgICAgfSk7XG4gICAgfVxuICAgIFxuICAgIGdldFR5cGVieUlkIChpZCl7XG4gICAgICAgIGlmIChpZCA9PSAxKXtcbiAgICAgICAgICAgIHJldHVybiBtYW5pZmVzdFR5cGVzLmFpcjtcbiAgICAgICAgfVxuICAgICAgICBpZiAoaWQgPT0gMil7XG4gICAgICAgICAgICByZXR1cm4gbWFuaWZlc3RUeXBlcy5vY2VhbjtcbiAgICAgICAgfVxuICAgICAgICBpZiAoaWQgPT0gMyl7XG4gICAgICAgICAgICByZXR1cm4gbWFuaWZlc3RUeXBlcy5oYXptYXQ7XG4gICAgICAgIH1cbiAgICAgICAgcmV0dXJuIG1hbmlmZXN0VHlwZXMuYWlyOyBcbiAgICB9XG4gICAgZ2V0U3RhZ2VCeUlkKGlkKXtcbiAgICAgICAgaWYgKGlkID09IDEpe1xuICAgICAgICAgICAgcmV0dXJuIG1hbmlmZXN0U3RhZ2VzLm9wZW47XG4gICAgICAgIH1cbiAgICAgICAgaWYgKGlkID09IDIpe1xuICAgICAgICAgICAgcmV0dXJuIG1hbmlmZXN0U3RhZ2VzLmNsb3NlZDtcbiAgICAgICAgfVxuICAgICAgICBpZiAoaWQgPT0gMyl7XG4gICAgICAgICAgICByZXR1cm4gbWFuaWZlc3RTdGFnZXMuc2hpcHBlZDtcbiAgICAgICAgfVxuICAgICAgICBpZiAoaWQgPT0gNCl7XG4gICAgICAgICAgICByZXR1cm4gbWFuaWZlc3RTdGFnZXMudmVyaWZpZWQ7XG4gICAgICAgIH1cbiAgICAgICAgcmV0dXJuIG1hbmlmZXN0U3RhZ2VzLm9wZW47IFxuICAgIH1cblxuICAgIC8vIGFkZFBhY2thZ2VUb01hbmlmZXN0KHBhY2thZ2VCYXJDb2RlLCBtaWQpe1xuICAgIC8vICAgICAvL3dlIHNob3VsZCBqdXN0IHVwZGF0ZSB0aGUgcGFja2FnZSBpbiB0aGUgaW5kZXguIFxuICAgIC8vICAgICByZXR1cm4gbmV3IFByb21pc2UoKHJlc29sdmUscmVqZWN0KT0+e1xuICAgIC8vICAgICAgICAgZGF0YUNvbnRleHQucmVkaXNDbGllbnQuc2FkZChNSURfUEFDS0FHRVMrbWlkLHBhY2thZ2VCYXJDb2RlLChlcnIscmVzdWx0KT0+e1xuICAgIC8vICAgICAgICAgICAgIHJlc29sdmUoe2FkZGVkOnRydWV9KVxuICAgIC8vICAgICAgICAgfSk7IFxuICAgIC8vICAgICB9KVxuICAgIC8vIH1cbiAgICAvLyByZW1vdmVQYWNrYWdlRnJvbU1hbmlmZXN0KHBhY2thZ2VCYXJDb2RlLG1pZCl7XG4gICAgLy8gICAgIHJldHVybiBuZXcgUHJvbWlzZSgocmVzb2x2ZSxyZWplY3QpPT57XG4gICAgLy8gICAgICAgICBkYXRhQ29udGV4dC5yZWRpc0NsaWVudC5zcmVtKE1JRF9QQUNLQUdFU19taWQscGFja2FnZUJhckNvZGUsKGVycixyZXN1bHQpPT57XG4gICAgLy8gICAgICAgICAgICAgcmVzb2x2ZSh7cmVtb3ZlOnRydWV9KVxuICAgIC8vICAgICAgICAgfSlcbiAgICAvLyAgICAgfSlcbiAgICAvLyB9XG4gICAgLy8gZ2V0TWFuaWZlc3RQYWNrYWdlcyhtaWQpe1xuICAgIC8vICAgICByZXR1cm4gbmV3IFByb21pc2UoKHJlc29sdmUscmVqZWN0KT0+e1xuICAgIC8vICAgICAgICAgZGF0YUNvbnRleHQucmVkaXNDbGllbnQuc21lbWJlcnMoTUlEX1BBQ0tBR0VTK21pZCwoZXJyKSlcbiAgICAvLyAgICAgfSlcbiAgICAvLyB9XG59Il19
