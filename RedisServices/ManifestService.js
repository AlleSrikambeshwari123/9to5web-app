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
                            manifest.flightDate = moment.unix(m.doc.flightDate).format("MMM DD,YYYY hh:mm A");
                            manifestList.push(manifest);
                        }

                        resolve({ manifests: manifestList });
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
//# sourceMappingURL=data:application/json;charset=utf8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIlJlZGlzU2VydmljZXMvTWFuaWZlc3RTZXJ2aWNlLmVzNiJdLCJuYW1lcyI6WyJyZWRpcyIsInJlcXVpcmUiLCJscmVkaXMiLCJtb21lbnQiLCJkYXRhQ29udGV4dCIsInJlZGlzU2VhcmNoIiwiTUlEX0NPVU5URVIiLCJNSURfUFJFRklYIiwiTUlEX0lOREVYIiwiT1BFTl9NQU5JRkVTVCIsIkNMT1NFRF9NQU5JRkVTVCIsIlNISVBQRURfTUFOSUZFU1QiLCJNSURfUEFDS0FHRVMiLCJWRVJJRklFRF9NQU5JRkVTVCIsIlBsYW5lU2VydmljZSIsInBsYW5lU2VydmljZSIsIm1hbmlmZXN0VHlwZXMiLCJhaXIiLCJpZCIsInRpdGxlIiwicHJlZml4Iiwib2NlYW4iLCJoYXptYXQiLCJtYW5pZmVzdFN0YWdlcyIsIm9wZW4iLCJjbG9zZWQiLCJzaGlwcGVkIiwidmVyaWZpZWQiLCJNYW5pZmVzdFNlcnZpY2UiLCJyZWRpc0NsaWVudCIsImNsaWVudCIsIm10eXBlcyIsIm1zdGFnZXMiLCJjaGVja1NldHVwIiwic2V0dXBJbmRleCIsIm15U2VhcmNoIiwiY2xpZW50T3B0aW9ucyIsInNlYXJjaENsaWVudERldGFpbHMiLCJleGlzdHMiLCJlcnIiLCJyZXMiLCJzZXQiLCJteXR5cGVzIiwiZGV0YWlscyIsIlByb21pc2UiLCJyZXNvbHZlIiwicmVqZWN0IiwidXBkYXRlIiwicmVzdWx0IiwiaG1zZXQiLCJ1cGRhdGVkIiwidHlwZUlkIiwiY29uc29sZSIsImxvZyIsInNlYXJjaCIsIm9mZnNldCIsIm51bWJlck9mUmVzdWx0cyIsInNvcnRCeSIsImRpciIsInIxIiwiZGF0YSIsInRvdGFsUmVzdWx0cyIsIm1hbmlmZXN0TGlzdCIsImFsbCIsInJlc3VsdHMiLCJtYXAiLCJsaXN0Q29tcGFydG1lbnRzIiwibWFuIiwiZG9jIiwicGxhbmVJZCIsInRoZW4iLCJwbGFuZVJlc3Vsc3QiLCJpIiwibGVuZ3RoIiwibSIsIm1hbmlmZXN0IiwicGxhbmUiLCJtaWQiLCJmbGlnaHREYXRlIiwidW5peCIsImZvcm1hdCIsInB1c2giLCJtYW5pZmVzdHMiLCJ0eXBlIiwidXNlciIsInNydiIsImdldE9wZW5NYW5pZmVzdCIsIm9wZW5Db3VudCIsIm11bHRpIiwiaW5jciIsImV4ZWMiLCJyZXNwIiwiZGF0ZUNyZWF0ZWQiLCJtdHlwZUlkIiwic3RhZ2VJZCIsInN0YWdlIiwiY3JlYXRlZEJ5Iiwic2FkZCIsImFkZCIsInNlcnIiLCJyZXN1IiwiY2F0Y2giLCJzdGFnZXMiLCJnZXRTdGFnZUJ5SWQiLCJyZXN1bHQyIiwiaGdldGFsbCIsInVNYW5pZmVzdCIsImRlbERvY3VtZW50IiwicmVzdWx0MSIsImF3YiIsInNoaXBEYXRlIiwic2hpcHBlZEJ5Iiwic3Jlc3VsdCIsImNoYW5nZVN0YWdlIiwicGFnZSIsInBhZ2VTaXplIiwib2Zmc2V0VmFsIiwiZm9yRWFjaCIsIm1hbmlmZXN0UmVzdWx0IiwicGFnZWREYXRhIiwiVG90YWxQYWdlcyIsImRlbCIsInNyZW0iLCJkZWxldGVkIiwibXNlYXJjaCJdLCJtYXBwaW5ncyI6Ijs7Ozs7Ozs7O0FBQUE7Ozs7QUFFQSxJQUFJQSxRQUFRQyxRQUFRLE9BQVIsQ0FBWjtBQUNBLElBQUlDLFNBQVNELFFBQVEsZUFBUixDQUFiO0FBQ0EsSUFBSUUsU0FBU0YsUUFBUSxRQUFSLENBQWI7QUFDQSxJQUFJRyxjQUFjSCxRQUFRLGVBQVIsQ0FBbEI7QUFDQSxJQUFJSSxjQUFjSixRQUFRLHFCQUFSLENBQWxCO0FBQ0EsSUFBTUssY0FBYyxtQkFBcEI7QUFDQSxJQUFNQyxhQUFhLFdBQW5CO0FBQ0EsSUFBTUMsWUFBWSxnQkFBbEI7QUFDQSxJQUFNQyxnQkFBZ0IsZUFBdEI7QUFDQSxJQUFNQyxrQkFBa0IsaUJBQXhCO0FBQ0EsSUFBTUMsbUJBQW1CLGtCQUF6QjtBQUNBLElBQU1DLGVBQWUsb0JBQXJCO0FBQ0EsSUFBTUMsb0JBQW9CLG1CQUExQixDLENBQStDO0FBQy9DLElBQUlDLGVBQWViLFFBQVEsZ0JBQVIsRUFBMEJhLFlBQTdDO0FBQ0Es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Q0g7QUFDRCxtQkFBT0osZUFBZUMsSUFBdEI7QUFDSDs7QUFFRDtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBIiwiZmlsZSI6IlJlZGlzU2VydmljZXMvTWFuaWZlc3RTZXJ2aWNlLmpzIiwic291cmNlc0NvbnRlbnQiOlsiaW1wb3J0IHsgcHJvbWlzZXMgfSBmcm9tICdmcyc7XG5cbnZhciByZWRpcyA9IHJlcXVpcmUoJ3JlZGlzJyk7XG52YXIgbHJlZGlzID0gcmVxdWlyZSgnLi9yZWRpcy1sb2NhbCcpO1xudmFyIG1vbWVudCA9IHJlcXVpcmUoJ21vbWVudCcpO1xudmFyIGRhdGFDb250ZXh0ID0gcmVxdWlyZSgnLi9kYXRhQ29udGV4dCcpXG52YXIgcmVkaXNTZWFyY2ggPSByZXF1aXJlKCcuLi9yZWRpc2VhcmNoY2xpZW50Jyk7XG5jb25zdCBNSURfQ09VTlRFUiA9IFwiZ2xvYmFsOm1pZENvdW50ZXJcIjtcbmNvbnN0IE1JRF9QUkVGSVggPSBcIm1hbmlmZXN0OlwiO1xuY29uc3QgTUlEX0lOREVYID0gXCJpbmRleDptYW5pZmVzdFwiO1xuY29uc3QgT1BFTl9NQU5JRkVTVCA9IFwibWFuaWZlc3Q6b3BlblwiO1xuY29uc3QgQ0xPU0VEX01BTklGRVNUID0gXCJtYW5pZmVzdDpjbG9zZWRcIlxuY29uc3QgU0hJUFBFRF9NQU5JRkVTVCA9IFwibWFuaWZlc3Q6c2hpcHBlZFwiXG5jb25zdCBNSURfUEFDS0FHRVMgPSBcIm1hbmlmZXN0OnBhY2thZ2VzOlwiXG5jb25zdCBWRVJJRklFRF9NQU5JRkVTVCA9IFwibWFuaWZlc3Q6dmVyaWZpZWRcIjsgLy8gbWFuaWZlc3QgdGhhdCBoYXZlIGR1dGllcyB2ZXJpZmllZFxudmFyIFBsYW5lU2VydmljZSA9IHJlcXVpcmUoJy4vUGxhbmVTZXJ2aWNlJykuUGxhbmVTZXJ2aWNlOyBcbnZhciBwbGFuZVNlcnZpY2UgPSBuZXcgUGxhbmVTZXJ2aWNlKCk7IFxudmFyIG1hbmlmZXN0VHlwZXMgPSB7XG4gICAgYWlyOiB7XG4gICAgICAgIGlkOiAxLFxuICAgICAgICB0aXRsZTogXCJBaXIgQ2FyZ29cIixcbiAgICAgICAgcHJlZml4OiBcIk0tXCJcbiAgICB9LFxuICAgIG9jZWFuOiB7XG4gICAgICAgIGlkOiAyLFxuICAgICAgICB0aXRsZTogXCJPY2VhblwiLFxuICAgICAgICBwcmVmaXg6IFwiUy1cIlxuICAgIH0sXG4gICAgaGF6bWF0OiB7XG4gICAgICAgIGlkOiAzLFxuICAgICAgICB0aXRsZTogXCJIQVpNQVRcIixcbiAgICAgICAgcHJlZml4OiBcIkgtXCJcbiAgICB9XG59XG52YXIgbWFuaWZlc3RTdGFnZXMgPSB7XG4gICAgb3Blbjoge1xuICAgICAgICBpZDogMSxcbiAgICAgICAgdGl0bGU6ICdPcGVuJ1xuICAgIH0sXG4gICAgY2xvc2VkOiB7XG4gICAgICAgIGlkOiAyLFxuICAgICAgICB0aXRsZTogJ0Nsb3NlZCdcbiAgICB9LFxuICAgIHNoaXBwZWQ6IHtcbiAgICAgICAgaWQ6IDMsXG4gICAgICAgIHRpdGxlOiAnU2hpcHBlZCdcbiAgICB9LFxuICAgIHZlcmlmaWVkOiB7XG4gICAgICAgIGlkOiA0LFxuICAgICAgICB0aXRsZTogJ1ZlcmlmaWVkJ1xuICAgIH1cblxufVxuXG5leHBvcnQgY2xhc3MgTWFuaWZlc3RTZXJ2aWNlIHtcblxuICAgIGNvbnN0cnVjdG9yKCkgeyAgICAgICAgXG4gICAgICAgIHRoaXMucmVkaXNDbGllbnQgPSBscmVkaXMuY2xpZW50O1xuICAgICAgICB0aGlzLm10eXBlcyA9IG1hbmlmZXN0VHlwZXM7XG4gICAgICAgIHRoaXMubXN0YWdlcyA9IG1hbmlmZXN0U3RhZ2VzO1xuICAgICAgICAvL2NoZWNrIHRvIGVuc3VyZSB3ZSBoYXZlIHRoZSBtYW5pZmVzdCBjb3VudGVyIFxuICAgICAgICB0aGlzLmNoZWNrU2V0dXAoKTsgXG4gICAgICAgIHRoaXMuc2V0dXBJbmRleCgpXG4gICAgfVxuICAgIHNldHVwSW5kZXgoKXtcbiAgICAgICAgdGhpcy5teVNlYXJjaCA9IHJlZGlzU2VhcmNoKHJlZGlzLCAnaW5kZXg6bWFuaWZlc3QnLCB7XG4gICAgICAgICAgICBjbGllbnRPcHRpb25zOmxyZWRpcy5zZWFyY2hDbGllbnREZXRhaWxzXG4gICAgICAgIH0pO1xuICAgIH1cbiAgICBjaGVja1NldHVwKCl7XG4gICAgICAgIHRoaXMucmVkaXNDbGllbnQuZXhpc3RzKE1JRF9DT1VOVEVSLCAoZXJyLCByZXMpID0+IHtcbiAgICAgICAgICAgIGlmIChyZXMgPT0gMCkge1xuICAgICAgICAgICAgICAgIC8vY3JlYXRlIHRoZSBtYW5pZmVzdCBcbiAgICAgICAgICAgICAgICBscmVkaXMuc2V0KE1JRF9DT1VOVEVSLCAxMDApO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgXG4gICAgICAgIH0pO1xuICAgIH1cblxuICAgIGdldFR5cGVzKCkge1xuICAgICAgICByZXR1cm4gdGhpcy5teXR5cGVzXG4gICAgfVxuICAgIGdldFN0YWdlcygpIHtcbiAgICAgICAgcmV0dXJuIHRoaXMubWFuaWZlc3RTdGFnZXM7XG4gICAgfVxuICAgIHVwZGF0ZU1hbmlmZXN0RGV0YWlscyhkZXRhaWxzKXtcbiAgICAgICAgcmV0dXJuIG5ldyBQcm9taXNlKChyZXNvbHZlLHJlamVjdCk9PntcbiAgICAgICAgICAgIHRoaXMubXlTZWFyY2gudXBkYXRlKGRldGFpbHMuaWQsZGV0YWlscywoZXJyLHJlc3VsdCk9PntcbiAgICAgICAgICAgICAgICBscmVkaXMuaG1zZXQoTUlEX1BSRUZJWCtkZXRhaWxzLmlkLGRldGFpbHMpXG4gICAgICAgICAgICAgICAgcmVzb2x2ZSh7dXBkYXRlZDp0cnVlfSlcbiAgICAgICAgICAgIH0pXG4gICAgICAgIH0pXG4gICAgfVxuICAgIGdldE9wZW5NYW5pZmVzdCh0eXBlSWQpe1xuICAgICAgICBcbiAgICAgICAgcmV0dXJuIG5ldyBQcm9taXNlKChyZXNvbHZlLHJlamVjdCk9PntcbiAgICAgICAgICAgY29uc29sZS5sb2coIGBAc3RhZ2VJZDpbJHt0eXBlSWR9ICR7dHlwZUlkfV0gQG10eXBlSWQ6JHt0eXBlSWR9YCk7XG4gICAgICAgICAgICB0aGlzLm15U2VhcmNoLnNlYXJjaChgQHN0YWdlSWQ6WzEgMV0gQG10eXBlSWQ6JHt0eXBlSWR9YCwge1xuICAgICAgICAgICAgICAgIG9mZnNldDowLFxuICAgICAgICAgICAgICAgIG51bWJlck9mUmVzdWx0czogMTAwLFxuICAgICAgICAgICAgICAgIHNvcnRCeTogXCJtaWRcIixcbiAgICAgICAgICAgICAgICBkaXI6IFwiREVTQ1wiXG4gICAgICAgICAgICB9LCAocjEsIGRhdGEpID0+IHtcbiAgICAgICAgICAgICAgICBpZiAocjEpXG4gICAgICAgICAgICAgICAgIHtcbiAgICAgICAgICAgICAgICAgICAgIGNvbnNvbGUubG9nKCd3ZSBoYWQgYW4gZXJyb3InKVxuICAgICAgICAgICAgICAgICAgICBjb25zb2xlLmxvZyhyMSk7XG4gICAgICAgICAgICAgICAgICAgIFxuICAgICAgICAgICAgICAgICB9ICAgXG4gICAgICAgICAgICAgICAgIGNvbnNvbGUubG9nKCdubyBlcnJvcnMgZGV0ZWN0ZWQgaGVyZSAuLi4nKVxuICAgICAgICAgICAgICAgICAvL2NvbnNvbGUubG9nKG1hbmlmZXN0TGlzdCk7XG4gICAgICAgICAgICAgICAgIGNvbnNvbGUubG9nKGRhdGEpO1xuICAgICAgICAgICAgICAgIFxuICAgICAgICAgICAgICAgIHJlc29sdmUoZGF0YS50b3RhbFJlc3VsdHMpO1xuICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICBcbiAgICAgICAgfSk7XG4gICAgICAgIFxuICAgIH1cbiAgICBnZXRPcGVuTWFuaWZlc3RMaXN0KHR5cGVJZCl7XG4gICAgICAgIFxuICAgICAgICByZXR1cm4gbmV3IFByb21pc2UoKHJlc29sdmUscmVqZWN0KT0+e1xuICAgICAgICAgICBjb25zb2xlLmxvZyggYEBzdGFnZUlkOlske3R5cGVJZH0gJHt0eXBlSWR9XSBAbXR5cGVJZDoke3R5cGVJZH1gKTtcbiAgICAgICAgICAgIHRoaXMubXlTZWFyY2guc2VhcmNoKGBAc3RhZ2VJZDpbMSAxXSBAbXR5cGVJZDoke3R5cGVJZH1gLCB7XG4gICAgICAgICAgICAgICAgb2Zmc2V0OjAsXG4gICAgICAgICAgICAgICAgbnVtYmVyT2ZSZXN1bHRzOiAxMDAsXG4gICAgICAgICAgICAgICAgc29ydEJ5OiBcIm1pZFwiLFxuICAgICAgICAgICAgICAgIGRpcjogXCJERVNDXCJcbiAgICAgICAgICAgIH0sIChyMSwgZGF0YSkgPT4ge1xuICAgICAgICAgICAgICAgIGlmIChyMSlcbiAgICAgICAgICAgICAgICAge1xuICAgICAgICAgICAgICAgICAgICAgY29uc29sZS5sb2coJ3dlIGhhZCBhbiBlcnJvcicpXG4gICAgICAgICAgICAgICAgICAgIGNvbnNvbGUubG9nKHIxKTtcbiAgICAgICAgICAgICAgICAgICAgXG4gICAgICAgICAgICAgICAgIH0gICBcbiAgICAgICAgICAgICAgICAgY29uc29sZS5sb2coJ25vIGVycm9ycyBkZXRlY3RlZCBoZXJlIC4uLicpXG4gICAgICAgICAgICAgICAgIC8vY29uc29sZS5sb2cobWFuaWZlc3RMaXN0KTtcbiAgICAgICAgICAgICAgICAgY29uc29sZS5sb2coZGF0YSk7XG4gICAgICAgICAgICAgICAgIHZhciBtYW5pZmVzdExpc3QgID0gW107IFxuICAgICAgICAgICAgICAgXG4gICAgICAgICAgICAgICAgICAgICBQcm9taXNlLmFsbChkYXRhLnJlc3VsdHMubWFwKG1hbj0+cGxhbmVTZXJ2aWNlLmxpc3RDb21wYXJ0bWVudHMobWFuLmRvYy5wbGFuZUlkKSkpLnRoZW4ocGxhbmVSZXN1bHN0PT57XG4gICAgICAgICAgICAgICAgICAgICAgICAgY29uc29sZS5sb2cocGxhbmVSZXN1bHN0KTsgXG4gICAgICAgICAgICAgICAgICAgICAgICAgZm9yIChsZXQgaSA9IDA7IGkgPCBwbGFuZVJlc3Vsc3QubGVuZ3RoOyBpKyspIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgdmFyIG0gPSBkYXRhLnJlc3VsdHNbaV07IFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICB2YXIgbWFuaWZlc3QgPSB7fVxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICBcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgbWFuaWZlc3QucGxhbmUgPSBwbGFuZVJlc3Vsc3RbaV0ucGxhbmVcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgbWFuaWZlc3QubWlkID0gbS5kb2MubWlkOyBcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgbWFuaWZlc3QudGl0bGUgPSBtLmRvYy50aXRsZTsgXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgIC8vY29uc29sZS5sb2cobS5kb2MuZmxpZ2h0RGF0ZSxtb21lbnQudW5peChtLmRvYy5mbGlnaHREYXRlKS5mb3JtYXQoXCJNTU0gREQsWVlZWSBoaDptbSBBXCIpKVxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICBtYW5pZmVzdC5mbGlnaHREYXRlID0gbW9tZW50LnVuaXgobS5kb2MuZmxpZ2h0RGF0ZSkuZm9ybWF0KFwiTU1NIERELFlZWVkgaGg6bW0gQVwiKTsgXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgIG1hbmlmZXN0TGlzdC5wdXNoKG1hbmlmZXN0KVxuICAgICAgICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgICAgICBcbiAgICAgICAgICAgICAgICAgICAgICAgICByZXNvbHZlKHttYW5pZmVzdHM6bWFuaWZlc3RMaXN0fSk7XG4gICAgICAgICAgICAgICBcbiAgICAgICAgICAgICAgICAgICAgXG4gICAgICAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgICAgIFxuICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICBcbiAgICAgICAgfSk7XG4gICAgICAgIFxuICAgIH1cbiAgICBjcmVhdGVOZXdNYW5pZmVzdCh0eXBlLCB1c2VyKSB7XG4gICAgICAgIC8vd2UgaGF2ZSBzb21lIHJ1bGVzIHRvIGZvbGxvdyBoZXJlIFxuICAgICAgICAvLzEuIGEgbmV3IG1hbmlmZXN0IGNhbm5vdCBiZSBjcmVhdGVkIGlmIHRoZSBwcmV2aW91cyBtYW5pZmVzdCBpcyBub3QgY2xvc2VkIFxuICAgICAgICAvL2NoZWNrIGZvciBvcGVuIG1hbmlmZXN0IGZpcnN0IFxuICAgICAgICB2YXIgc3J2ID0gdGhpczsgXG4gICAgICAgIHJldHVybiBuZXcgUHJvbWlzZSgocmVzb2x2ZSwgcmVqZWN0KSA9PiB7XG4gICAgICAgICAgICB0aGlzLmdldE9wZW5NYW5pZmVzdCh0eXBlLmlkKS50aGVuKChvcGVuQ291bnQpID0+IHtcbiAgICAgICAgICAgICAgXG4gICAgICAgICAgICAgICAgY29uc29sZS5sb2codHlwZSk7IFxuICAgICAgICAgICAgICAgIC8vIGlmIChvcGVuQ291bnQ+MCkge1xuICAgICAgICAgICAgICAgIC8vICAgICAvL3dlIGNhbid0IGFkZCB0aGUgbWFuaWZlc3QgcmVqZWN0IFxuICAgICAgICAgICAgICAgIC8vICAgICByZWplY3Qoe1xuICAgICAgICAgICAgICAgIC8vICAgICAgICAgXCJtZXNzYWdlXCI6IFwiVGhlcmUgaXMgYW4gb3BlbiBtYW5pZmVzdCBQbGVhc2UgY2xvc2UgaXQgYmVmb3JlIGNyZWF0aW5nIGEgbmV3IG1hbmlmZXN0LlwiXG4gICAgICAgICAgICAgICAgLy8gICAgIH0pO1xuXG4gICAgICAgICAgICAgICAgLy8gfSBlbHNlIHtcbiAgICAgICAgICAgICAgICAgICAgdGhpcy5yZWRpc0NsaWVudC5tdWx0aSgpXG4gICAgICAgICAgICAgICAgICAgICAgICAuaW5jcihNSURfQ09VTlRFUilcbiAgICAgICAgICAgICAgICAgICAgICAgIC5leGVjKChlcnIsIHJlc3ApID0+IHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBjb25zb2xlLmxvZyhyZXNwKTtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICB2YXIgbWFuaWZlc3QgPSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIG1pZDogcmVzcFswXSxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgdGl0bGU6IHR5cGUucHJlZml4K3Jlc3BbMF0sXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGRhdGVDcmVhdGVkOiBtb21lbnQoKS51bml4KCksLy9mb3JtYXQoXCJZWVlZLU1NLUREXCIpLFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBtdHlwZUlkOiB0eXBlLmlkLFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBzdGFnZUlkOiBtYW5pZmVzdFN0YWdlcy5vcGVuLmlkLFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBzdGFnZTogbWFuaWZlc3RTdGFnZXMub3Blbi50aXRsZSxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgY3JlYXRlZEJ5OiB1c2VyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgfTtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBjb25zb2xlLmxvZyhtYW5pZmVzdClcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBzcnYucmVkaXNDbGllbnQubXVsdGkoKVxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAuaG1zZXQoTUlEX1BSRUZJWCArIG1hbmlmZXN0Lm1pZCwgbWFuaWZlc3QpXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIC5zYWRkKE9QRU5fTUFOSUZFU1QsIG1hbmlmZXN0Lm1pZClcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgLmV4ZWMoKGVyciwgcmVzdWx0cykgPT4ge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgc3J2Lm15U2VhcmNoLmFkZChtYW5pZmVzdC5taWQsbWFuaWZlc3QsKHNlcnIscmVzdSk9PntcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBpZiAoc2VycilcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgY29uc29sZS5sb2coc2VycilcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBjb25zb2xlLmxvZyhyZXN1KVxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAvL2Fsc28gYWRkIHRvIHRoZSBpbmRleCBoZXJlIG9uZSB0aW1lIFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgaWYgKGVycikge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHJlamVjdChlcnIpO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICByZXNvbHZlKG1hbmlmZXN0KVxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB9KTtcbiAgICAgICAgICAgICAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgICAgIC8vfVxuXG4gICAgICAgICAgICB9KS5jYXRjaCgoZXJyKT0+e1xuICAgICAgICAgICAgICAgIGNvbnNvbGUubG9nKFwiZXJyIGRldGVjdGVkXCIpOyBcbiAgICAgICAgICAgICAgICBjb25zb2xlLmxvZyhlcnIpO1xuICAgICAgICAgICAgfSk7XG5cbiAgICAgICAgfSk7XG5cbiAgICB9XG4gICAgY2hhbmdlU3RhZ2UobWlkLCBzdGFnZXMpIHtcbiAgICAgICAgcmV0dXJuIG5ldyBQcm9taXNlKChyZXNvbHZlLCByZWplY3QpID0+IHtcbiAgICAgICAgICAgIFxuICAgICAgICAgICAgbHJlZGlzLmNsaWVudC5obXNldChNSURfUFJFRklYK21pZCxcInN0YWdlSWRcIixzdGFnZXMsKGVycixyZXN1bHQpPT57XG4gICAgICAgICAgICAgICAgdmFyIHN0YWdlID0gdGhpcy5nZXRTdGFnZUJ5SWQoc3RhZ2VzKTsgXG4gICAgICAgICAgICAgICAgY29uc29sZS5sb2coJ2xvb2tlZCB1cCB0aGUgc3RhZ2UgJytzdGFnZS50aXRsZSk7XG4gICAgICAgICAgICAgICAgbHJlZGlzLmNsaWVudC5obXNldChNSURfUFJFRklYK21pZCxcInN0YWdlXCIsc3RhZ2UudGl0bGUsKGVycixyZXN1bHQyKT0+e30pOyBcbiAgICAgICAgICAgICAgICBscmVkaXMuaGdldGFsbChNSURfUFJFRklYK21pZCkudGhlbigodU1hbmlmZXN0KT0+e1xuICAgICAgICAgICAgICAgICAgICB0aGlzLm15U2VhcmNoLmRlbERvY3VtZW50KFwiaW5kZXg6bWFuaWZlc3RcIixtaWQsKGVycixyZXN1bHQxKT0+e1xuICAgICAgICAgICAgICAgICAgICAgICAgY29uc29sZS5sb2coJ2NoYW5naW5nIGRvY3VtZW50Jyk7XG4gICAgICAgICAgICAgICAgICAgICAgICBjb25zb2xlLmxvZyhlcnIpO1xuICAgICAgICAgICAgICAgICAgICAgICAgY29uc29sZS5sb2cocmVzdWx0MSkgXG4gICAgICAgICAgICAgICAgICAgICAgICB0aGlzLm15U2VhcmNoLmFkZCh1TWFuaWZlc3QubWlkLHVNYW5pZmVzdCk7IFxuICAgICAgICAgICAgICAgICAgICAgICAgcmVzb2x2ZShyZXN1bHQpOyBcbiAgICAgICAgICAgICAgICAgICAgfSk7IFxuICAgICAgICAgICAgICAgICAgIFxuICAgICAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgICAgXG4gICAgICAgICAgICB9KTtcbiAgICAgICAgICAgIC8vd2UgYWxzbyBuZWVkIHRvIHRvIHVwZGF0ZSB0aGUgZG9jdW1lbnQgXG5cbiAgICAgICAgICAgIFxuICAgICAgICB9KVxuICAgIH1cbiAgICBzaGlwTWFuaWZlc3QobWlkLGF3Yix1c2VyKXtcbiAgICAgICAgcmV0dXJuIG5ldyBQcm9taXNlKChyZXNvbHZlLHJlamVjdCk9PntcbiAgICAgICAgICAgIGxyZWRpcy5obXNldChNSURfUFJFRklYK21pZCwge2F3Yjphd2Isc2hpcERhdGU6bW9tZW50KCkuZm9ybWF0KFwiWVlZWS1NTS1ERFwiKSxzaGlwcGVkQnk6dXNlcn0pLnRoZW4oKHNyZXN1bHQpPT57XG4gICAgICAgICAgICAgICAgY29uc29sZS5sb2coc3Jlc3VsdCk7XG4gICAgICAgICAgICAgICAgdGhpcy5jaGFuZ2VTdGFnZShtaWQsMykudGhlbigocmVzdSk9PntcbiAgICAgICAgICAgICAgICAgICAgcmVzb2x2ZShzcmVzdWx0KTtcbiAgICAgICAgICAgICAgICB9KTtcbiAgICAgICAgICAgICAgICBcbiAgICAgICAgICAgIH0pXG4gICAgICAgIH0pXG4gICAgfVxuICAgIGxpc3RNYW5pZmVzdCh0eXBlLHBhZ2UscGFnZVNpemUpe1xuICAgICAgICByZXR1cm4gbmV3IFByb21pc2UoKHJlc29sdmUscmVqZWN0KT0+e1xuICAgICAgICAgICAgdmFyIG9mZnNldFZhbCA9IChwYWdlIC0gMSkgKiBwYWdlU2l6ZTtcbiAgICAgICAgICAgIGNvbnNvbGUubG9nKCdvZmZzZXQgJytvZmZzZXRWYWwpO1xuICAgICAgICAgICAgXG4gICAgICAgICAgICB0aGlzLm15U2VhcmNoLnNlYXJjaChcIkBtdHlwZUlkOlwiK3R5cGUsIHtcbiAgICAgICAgICAgICAgICBvZmZzZXQ6b2Zmc2V0VmFsLFxuICAgICAgICAgICAgICAgIG51bWJlck9mUmVzdWx0czogcGFnZVNpemUsXG4gICAgICAgICAgICAgICAgc29ydEJ5OiBcIm1pZFwiLFxuICAgICAgICAgICAgICAgIGRpcjogXCJERVNDXCJcbiAgICAgICAgICAgIH0sIChyMSwgZGF0YSkgPT4ge1xuICAgICAgICAgICAgICAgIGlmIChyMSlcbiAgICAgICAgICAgICAgICAgICAgY29uc29sZS5sb2cocjEpO1xuICAgICAgICAgICAgICAgICB2YXIgbWFuaWZlc3RMaXN0ID0gW107IFxuICAgICAgICAgICAgICAgICBkYXRhLnJlc3VsdHMuZm9yRWFjaChtYW5pZmVzdFJlc3VsdCA9PiB7XG4gICAgICAgICAgICAgICAgICAgIG1hbmlmZXN0TGlzdC5wdXNoKG1hbmlmZXN0UmVzdWx0LmRvYyk7ICAgIFxuICAgICAgICAgICAgICAgICAgICBcbiAgICAgICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICAgICAgIC8vY29uc29sZS5sb2cobWFuaWZlc3RMaXN0KTtcbiAgICAgICAgICAgICAgICAgdmFyIHBhZ2VkRGF0YSA9IHtcbiAgICAgICAgICAgICAgICAgICAgbWFuaWZlc3RzOm1hbmlmZXN0TGlzdCxcbiAgICAgICAgICAgICAgICAgICAgdG90YWxSZXN1bHRzIDogZGF0YS50b3RhbFJlc3VsdHMsXG4gICAgICAgICAgICAgICAgICAgIHBhZ2UgOiBwYWdlLFxuICAgICAgICAgICAgICAgICAgICBwYWdlU2l6ZTogcGFnZVNpemUsIFxuICAgICAgICAgICAgICAgICAgICBUb3RhbFBhZ2VzIDogKGRhdGEudG90YWxSZXN1bHRzL3BhZ2VTaXplKVxuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICByZXNvbHZlKHBhZ2VkRGF0YSk7XG4gICAgICAgICAgICAgICAgY29uc29sZS5sb2cobWFuaWZlc3RMaXN0KTtcbiAgICAgICAgICAgICAgICBcbiAgICAgICAgICAgIH0pO1xuICAgICAgICB9KTtcbiAgICB9XG4gICAgZ2V0TWFuaWZlc3QobWlkKSB7XG4gICAgICAgIHJldHVybiBscmVkaXMuaGdldGFsbChNSURfUFJFRklYK21pZClcbiAgICB9XG4gICAgZGVsZXRlTWFuaWZlc3QobWlkKXtcbiAgICAgICByZXR1cm4gbmV3IFByb21pc2UoKHJlc29sdmUscmVqZWN0KT0+e1xuICAgICAgICBscmVkaXMuY2xpZW50LmRlbChNSURfUFJFRklYK21pZCwoZXJyLHJlc3ApPT57XG4gICAgICAgICAgICBjb25zb2xlLmxvZyhyZXNwKTsgXG4gICAgICAgICAgICB0aGlzLm15U2VhcmNoLmRlbERvY3VtZW50KFwiaW5kZXg6bWFuaWZlc3RcIixtaWQsKGVycixyZXN1bHQpPT57XG4gICAgICAgICAgICAgICAgY29uc29sZS5sb2coXCJkZWxldGluZyBtaWRcIik7IFxuICAgICAgICAgICAgICAgIGNvbnNvbGUubG9nKGVycik7IFxuICAgICAgICAgICAgICAgIGNvbnNvbGUubG9nKHJlc3VsdCk7XG4gICAgICAgICAgICB9KTsgXG4gICAgICAgICAgICBscmVkaXMuc3JlbShPUEVOX01BTklGRVNULG1pZCk7XG4gICAgICAgICAgICByZXNvbHZlKHtkZWxldGVkOnRydWV9KSAgICBcbiAgICAgICAgfSlcblxuICAgICAgIH0pOyBcbiAgICAgICAgXG4gICAgICAgIFxuICAgIH1cbiAgICBnZXRNYW5pZmVzdFByb2Nlc3NpbmcoKXtcbiAgICAgICAgdmFyIG1zZWFyY2ggPSB0aGlzLm15U2VhcmNoOyBcbiAgICAgICAgcmV0dXJuIG5ldyBQcm9taXNlKChyZXNvbHZlLHJlamVjdCk9PntcbiAgICAgICAgICAgIHZhciBvZmZzZXRWYWwgPTA7XG4gICAgICAgICAgICB2YXIgcGFnZVNpemUgPSAyMDsgXG4gICAgICAgICAgICBjb25zb2xlLmxvZygnb2Zmc2V0ICcrb2Zmc2V0VmFsKTtcbiAgICAgICAgICAgIHZhciBtYW5pZmVzdExpc3QgPSBbXTsgXG4gICAgICAgICAgICBtc2VhcmNoLnNlYXJjaChgQHN0YWdlSWQ6WzMgNF1gLCB7XG4gICAgICAgICAgICAgICAgb2Zmc2V0Om9mZnNldFZhbCxcbiAgICAgICAgICAgICAgICBudW1iZXJPZlJlc3VsdHM6IHBhZ2VTaXplLFxuICAgICAgICAgICAgICAgIHNvcnRCeTogXCJtaWRcIixcbiAgICAgICAgICAgICAgICBkaXI6IFwiREVTQ1wiXG4gICAgICAgICAgICB9LCAocjEsIGRhdGEpID0+IHtcbiAgICAgICAgICAgICAgICBpZiAocjEpXG4gICAgICAgICAgICAgICAgICAgIGNvbnNvbGUubG9nKHIxKTtcbiAgICAgICAgICAgICAgICAgXG4gICAgICAgICAgICAgICAgIGRhdGEucmVzdWx0cy5mb3JFYWNoKG1hbmlmZXN0UmVzdWx0ID0+IHtcbiAgICAgICAgICAgICAgICAgICAgbWFuaWZlc3RMaXN0LnB1c2gobWFuaWZlc3RSZXN1bHQuZG9jKTsgICAgXG4gICAgICAgICAgICAgICAgICAgIFxuICAgICAgICAgICAgICAgICB9KTtcbiAgICAgICAgICAgICAgICAgLy9jb25zb2xlLmxvZyhtYW5pZmVzdExpc3QpO1xuICAgICAgICAgICAgICAgICB2YXIgcGFnZWREYXRhID0ge1xuICAgICAgICAgICAgICAgICAgICBtYW5pZmVzdHM6bWFuaWZlc3RMaXN0LFxuICAgICAgICAgICAgICAgICAgICB0b3RhbFJlc3VsdHMgOiBkYXRhLnRvdGFsUmVzdWx0cyxcbiAgICAgICAgICAgICAgICAgICAgcGFnZSA6IDEsXG4gICAgICAgICAgICAgICAgICAgIHBhZ2VTaXplOiBwYWdlU2l6ZSwgXG4gICAgICAgICAgICAgICAgICAgIFRvdGFsUGFnZXMgOiAoZGF0YS50b3RhbFJlc3VsdHMvcGFnZVNpemUpXG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIHJlc29sdmUocGFnZWREYXRhKTtcbiAgICAgICAgICAgICAgICBjb25zb2xlLmxvZyhtYW5pZmVzdExpc3QpO1xuICAgICAgICAgICAgICAgIFxuICAgICAgICAgICAgfSk7XG4gICAgICAgIH0pO1xuICAgIH1cbiAgICBcbiAgICBnZXRUeXBlYnlJZCAoaWQpe1xuICAgICAgICBpZiAoaWQgPT0gMSl7XG4gICAgICAgICAgICByZXR1cm4gbWFuaWZlc3RUeXBlcy5haXI7XG4gICAgICAgIH1cbiAgICAgICAgaWYgKGlkID09IDIpe1xuICAgICAgICAgICAgcmV0dXJuIG1hbmlmZXN0VHlwZXMub2NlYW47XG4gICAgICAgIH1cbiAgICAgICAgaWYgKGlkID09IDMpe1xuICAgICAgICAgICAgcmV0dXJuIG1hbmlmZXN0VHlwZXMuaGF6bWF0O1xuICAgICAgICB9XG4gICAgICAgIHJldHVybiBtYW5pZmVzdFR5cGVzLmFpcjsgXG4gICAgfVxuICAgIGdldFN0YWdlQnlJZChpZCl7XG4gICAgICAgIGlmIChpZCA9PSAxKXtcbiAgICAgICAgICAgIHJldHVybiBtYW5pZmVzdFN0YWdlcy5vcGVuO1xuICAgICAgICB9XG4gICAgICAgIGlmIChpZCA9PSAyKXtcbiAgICAgICAgICAgIHJldHVybiBtYW5pZmVzdFN0YWdlcy5jbG9zZWQ7XG4gICAgICAgIH1cbiAgICAgICAgaWYgKGlkID09IDMpe1xuICAgICAgICAgICAgcmV0dXJuIG1hbmlmZXN0U3RhZ2VzLnNoaXBwZWQ7XG4gICAgICAgIH1cbiAgICAgICAgaWYgKGlkID09IDQpe1xuICAgICAgICAgICAgcmV0dXJuIG1hbmlmZXN0U3RhZ2VzLnZlcmlmaWVkO1xuICAgICAgICB9XG4gICAgICAgIHJldHVybiBtYW5pZmVzdFN0YWdlcy5vcGVuOyBcbiAgICB9XG5cbiAgICAvLyBhZGRQYWNrYWdlVG9NYW5pZmVzdChwYWNrYWdlQmFyQ29kZSwgbWlkKXtcbiAgICAvLyAgICAgLy93ZSBzaG91bGQganVzdCB1cGRhdGUgdGhlIHBhY2thZ2UgaW4gdGhlIGluZGV4LiBcbiAgICAvLyAgICAgcmV0dXJuIG5ldyBQcm9taXNlKChyZXNvbHZlLHJlamVjdCk9PntcbiAgICAvLyAgICAgICAgIGRhdGFDb250ZXh0LnJlZGlzQ2xpZW50LnNhZGQoTUlEX1BBQ0tBR0VTK21pZCxwYWNrYWdlQmFyQ29kZSwoZXJyLHJlc3VsdCk9PntcbiAgICAvLyAgICAgICAgICAgICByZXNvbHZlKHthZGRlZDp0cnVlfSlcbiAgICAvLyAgICAgICAgIH0pOyBcbiAgICAvLyAgICAgfSlcbiAgICAvLyB9XG4gICAgLy8gcmVtb3ZlUGFja2FnZUZyb21NYW5pZmVzdChwYWNrYWdlQmFyQ29kZSxtaWQpe1xuICAgIC8vICAgICByZXR1cm4gbmV3IFByb21pc2UoKHJlc29sdmUscmVqZWN0KT0+e1xuICAgIC8vICAgICAgICAgZGF0YUNvbnRleHQucmVkaXNDbGllbnQuc3JlbShNSURfUEFDS0FHRVNfbWlkLHBhY2thZ2VCYXJDb2RlLChlcnIscmVzdWx0KT0+e1xuICAgIC8vICAgICAgICAgICAgIHJlc29sdmUoe3JlbW92ZTp0cnVlfSlcbiAgICAvLyAgICAgICAgIH0pXG4gICAgLy8gICAgIH0pXG4gICAgLy8gfVxuICAgIC8vIGdldE1hbmlmZXN0UGFja2FnZXMobWlkKXtcbiAgICAvLyAgICAgcmV0dXJuIG5ldyBQcm9taXNlKChyZXNvbHZlLHJlamVjdCk9PntcbiAgICAvLyAgICAgICAgIGRhdGFDb250ZXh0LnJlZGlzQ2xpZW50LnNtZW1iZXJzKE1JRF9QQUNLQUdFUyttaWQsKGVycikpXG4gICAgLy8gICAgIH0pXG4gICAgLy8gfVxufSJdfQ==
