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
                            if (!m.doc.flightDate) {
                                manifest.flightDate = "";
                            } else manifest.flightDate = moment.unix(m.doc.flightDate).format("MMM DD,YYYY hh:mm A");
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
//# sourceMappingURL=data:application/json;charset=utf8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIlJlZGlzU2VydmljZXMvTWFuaWZlc3RTZXJ2aWNlLmVzNiJdLCJuYW1lcyI6WyJyZWRpcyIsInJlcXVpcmUiLCJscmVkaXMiLCJtb21lbnQiLCJkYXRhQ29udGV4dCIsInJlZGlzU2VhcmNoIiwiTUlEX0NPVU5URVIiLCJNSURfUFJFRklYIiwiTUlEX0lOREVYIiwiT1BFTl9NQU5JRkVTVCIsIkNMT1NFRF9NQU5JRkVTVCIsIlNISVBQRURfTUFOSUZFU1QiLCJNSURfUEFDS0FHRVMiLCJWRVJJRklFRF9NQU5JRkVTVCIsIlBsYW5lU2VydmljZSIsInBsYW5lU2VydmljZSIsIm1hbmlmZXN0VHlwZXMiLCJhaXIiLCJpZCIsInRpdGxlIiwicHJlZml4Iiwib2NlYW4iLCJoYXptYXQiLCJtYW5pZmVzdFN0YWdlcyIsIm9wZW4iLCJjbG9zZWQiLCJzaGlwcGVkIiwidmVyaWZpZWQiLCJNYW5pZmVzdFNlcnZpY2UiLCJyZWRpc0NsaWVudCIsImNsaWVudCIsIm10eXBlcyIsIm1zdGFnZXMiLCJjaGVja1NldHVwIiwic2V0dXBJbmRleCIsIm15U2VhcmNoIiwiY2xpZW50T3B0aW9ucyIsInNlYXJjaENsaWVudERldGFpbHMiLCJleGlzdHMiLCJlcnIiLCJyZXMiLCJzZXQiLCJteXR5cGVzIiwiZGV0YWlscyIsIlByb21pc2UiLCJyZXNvbHZlIiwicmVqZWN0IiwiY29uc29sZSIsImxvZyIsInVwZGF0ZSIsInJlc3VsdCIsImhtc2V0IiwidXBkYXRlZCIsInR5cGVJZCIsInNlYXJjaCIsIm9mZnNldCIsIm51bWJlck9mUmVzdWx0cyIsInNvcnRCeSIsImRpciIsInIxIiwiZGF0YSIsInRvdGFsUmVzdWx0cyIsIm1hbmlmZXN0TGlzdCIsImFsbCIsInJlc3VsdHMiLCJtYXAiLCJsaXN0Q29tcGFydG1lbnRzIiwibWFuIiwiZG9jIiwicGxhbmVJZCIsInRoZW4iLCJwbGFuZVJlc3Vsc3QiLCJpIiwibGVuZ3RoIiwibSIsIm1hbmlmZXN0IiwicGxhbmUiLCJtaWQiLCJ0YWlsTnVtIiwiZmxpZ2h0RGF0ZSIsInVuaXgiLCJmb3JtYXQiLCJwdXNoIiwibWFuaWZlc3RzIiwiY2F0Y2giLCJlcnJhbGwiLCJ0eXBlIiwidXNlciIsInNydiIsImdldE9wZW5NYW5pZmVzdCIsIm9wZW5Db3VudCIsIm11bHRpIiwiaW5jciIsImV4ZWMiLCJyZXNwIiwiZGF0ZUNyZWF0ZWQiLCJtdHlwZUlkIiwic3RhZ2VJZCIsInN0YWdlIiwiY3JlYXRlZEJ5Iiwic2FkZCIsImFkZCIsInNlcnIiLCJyZXN1Iiwic3RhZ2VzIiwiZ2V0U3RhZ2VCeUlkIiwicmVzdWx0MiIsImhnZXRhbGwiLCJ1TWFuaWZlc3QiLCJkZWxEb2N1bWVudCIsInJlc3VsdDEiLCJhd2IiLCJzaGlwRGF0ZSIsInNoaXBwZWRCeSIsInNyZXN1bHQiLCJjaGFuZ2VTdGFnZSIsInBhZ2UiLCJwYWdlU2l6ZSIsIm9mZnNldFZhbCIsImZvckVhY2giLCJtYW5pZmVzdFJlc3VsdCIsInBhZ2VkRGF0YSIsIlRvdGFsUGFnZXMiLCJkZWwiLCJzcmVtIiwiZGVsZXRlZCIsIm1zZWFyY2giXSwibWFwcGluZ3MiOiI7Ozs7Ozs7OztBQUFBOzs7O0FBRUEsSUFBSUEsUUFBUUMsUUFBUSxPQUFSLENBQVo7QUFDQSxJQUFJQyxTQUFTRCxRQUFRLGVBQVIsQ0FBYjtBQUNBLElBQUlFLFNBQVNGLFFBQVEsUUFBUixDQUFiO0FBQ0EsSUFBSUcsY0FBY0gsUUFBUSxlQUFSLENBQWxCO0FBQ0EsSUFBSUksY0FBY0osUUFBUSxxQkFBUixDQUFsQjtBQUNBLElBQU1LLGNBQWMsbUJBQXBCO0FBQ0EsSUFBTUMsYUFBYSxXQUFuQjtBQUNBLElBQU1DLFlBQVksZ0JBQWxCO0FBQ0EsSUFBTUMsZ0JBQWdCLGVBQXRCO0FBQ0EsSUFBTUMsa0JBQWtCLGlCQUF4QjtBQUNBLElBQU1DLG1CQUFtQixrQkFBekI7QUFDQSxJQUFNQyxlQUFlLG9CQUFyQjtBQUNBLElBQU1DLG9CQUFvQixtQkFBMUIsQyxDQUErQztBQUMvQyxJQUFJQyxlQUFlYixRQUFRLGdCQUFS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T0YsY0FBY0ssS0FBckI7QUFDSDtBQUNELGdCQUFJSCxNQUFNLENBQVYsRUFBWTtBQUNSLHVCQUFPRixjQUFjTSxNQUFyQjtBQUNIO0FBQ0QsbUJBQU9OLGNBQWNDLEdBQXJCO0FBQ0g7OztxQ0FDWUMsRSxFQUFHO0FBQ1osZ0JBQUlBLE1BQU0sQ0FBVixFQUFZO0FBQ1IsdUJBQU9LLGVBQWVDLElBQXRCO0FBQ0g7QUFDRCxnQkFBSU4sTUFBTSxDQUFWLEVBQVk7QUFDUix1QkFBT0ssZUFBZUUsTUFBdEI7QUFDSDtBQUNELGdCQUFJUCxNQUFNLENBQVYsRUFBWTtBQUNSLHVCQUFPSyxlQUFlRyxPQUF0QjtBQUNIO0FBQ0QsZ0JBQUlSLE1BQU0sQ0FBVixFQUFZO0FBQ1IsdUJBQU9LLGVBQWVJLFFBQXRCO0FBQ0g7QUFDRCxtQkFBT0osZUFBZUMsSUFBdEI7QUFDSDs7QUFFRDtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBIiwiZmlsZSI6IlJlZGlzU2VydmljZXMvTWFuaWZlc3RTZXJ2aWNlLmpzIiwic291cmNlc0NvbnRlbnQiOlsiaW1wb3J0IHsgcHJvbWlzZXMgfSBmcm9tICdmcyc7XG5cbnZhciByZWRpcyA9IHJlcXVpcmUoJ3JlZGlzJyk7XG52YXIgbHJlZGlzID0gcmVxdWlyZSgnLi9yZWRpcy1sb2NhbCcpO1xudmFyIG1vbWVudCA9IHJlcXVpcmUoJ21vbWVudCcpO1xudmFyIGRhdGFDb250ZXh0ID0gcmVxdWlyZSgnLi9kYXRhQ29udGV4dCcpXG52YXIgcmVkaXNTZWFyY2ggPSByZXF1aXJlKCcuLi9yZWRpc2VhcmNoY2xpZW50Jyk7XG5jb25zdCBNSURfQ09VTlRFUiA9IFwiZ2xvYmFsOm1pZENvdW50ZXJcIjtcbmNvbnN0IE1JRF9QUkVGSVggPSBcIm1hbmlmZXN0OlwiO1xuY29uc3QgTUlEX0lOREVYID0gXCJpbmRleDptYW5pZmVzdFwiO1xuY29uc3QgT1BFTl9NQU5JRkVTVCA9IFwibWFuaWZlc3Q6b3BlblwiO1xuY29uc3QgQ0xPU0VEX01BTklGRVNUID0gXCJtYW5pZmVzdDpjbG9zZWRcIlxuY29uc3QgU0hJUFBFRF9NQU5JRkVTVCA9IFwibWFuaWZlc3Q6c2hpcHBlZFwiXG5jb25zdCBNSURfUEFDS0FHRVMgPSBcIm1hbmlmZXN0OnBhY2thZ2VzOlwiXG5jb25zdCBWRVJJRklFRF9NQU5JRkVTVCA9IFwibWFuaWZlc3Q6dmVyaWZpZWRcIjsgLy8gbWFuaWZlc3QgdGhhdCBoYXZlIGR1dGllcyB2ZXJpZmllZFxudmFyIFBsYW5lU2VydmljZSA9IHJlcXVpcmUoJy4vUGxhbmVTZXJ2aWNlJykuUGxhbmVTZXJ2aWNlOyBcbnZhciBwbGFuZVNlcnZpY2UgPSBuZXcgUGxhbmVTZXJ2aWNlKCk7IFxudmFyIG1hbmlmZXN0VHlwZXMgPSB7XG4gICAgYWlyOiB7XG4gICAgICAgIGlkOiAxLFxuICAgICAgICB0aXRsZTogXCJBaXIgQ2FyZ29cIixcbiAgICAgICAgcHJlZml4OiBcIk0tXCJcbiAgICB9LFxuICAgIG9jZWFuOiB7XG4gICAgICAgIGlkOiAyLFxuICAgICAgICB0aXRsZTogXCJPY2VhblwiLFxuICAgICAgICBwcmVmaXg6IFwiUy1cIlxuICAgIH0sXG4gICAgaGF6bWF0OiB7XG4gICAgICAgIGlkOiAzLFxuICAgICAgICB0aXRsZTogXCJIQVpNQVRcIixcbiAgICAgICAgcHJlZml4OiBcIkgtXCJcbiAgICB9XG59XG52YXIgbWFuaWZlc3RTdGFnZXMgPSB7XG4gICAgb3Blbjoge1xuICAgICAgICBpZDogMSxcbiAgICAgICAgdGl0bGU6ICdPcGVuJ1xuICAgIH0sXG4gICAgY2xvc2VkOiB7XG4gICAgICAgIGlkOiAyLFxuICAgICAgICB0aXRsZTogJ0Nsb3NlZCdcbiAgICB9LFxuICAgIHNoaXBwZWQ6IHtcbiAgICAgICAgaWQ6IDMsXG4gICAgICAgIHRpdGxlOiAnU2hpcHBlZCdcbiAgICB9LFxuICAgIHZlcmlmaWVkOiB7XG4gICAgICAgIGlkOiA0LFxuICAgICAgICB0aXRsZTogJ1ZlcmlmaWVkJ1xuICAgIH1cblxufVxuXG5leHBvcnQgY2xhc3MgTWFuaWZlc3RTZXJ2aWNlIHtcblxuICAgIGNvbnN0cnVjdG9yKCkgeyAgICAgICAgXG4gICAgICAgIHRoaXMucmVkaXNDbGllbnQgPSBscmVkaXMuY2xpZW50O1xuICAgICAgICB0aGlzLm10eXBlcyA9IG1hbmlmZXN0VHlwZXM7XG4gICAgICAgIHRoaXMubXN0YWdlcyA9IG1hbmlmZXN0U3RhZ2VzO1xuICAgICAgICAvL2NoZWNrIHRvIGVuc3VyZSB3ZSBoYXZlIHRoZSBtYW5pZmVzdCBjb3VudGVyIFxuICAgICAgICB0aGlzLmNoZWNrU2V0dXAoKTsgXG4gICAgICAgIHRoaXMuc2V0dXBJbmRleCgpXG4gICAgfVxuICAgIHNldHVwSW5kZXgoKXtcbiAgICAgICAgdGhpcy5teVNlYXJjaCA9IHJlZGlzU2VhcmNoKHJlZGlzLCAnaW5kZXg6bWFuaWZlc3QnLCB7XG4gICAgICAgICAgICBjbGllbnRPcHRpb25zOmxyZWRpcy5zZWFyY2hDbGllbnREZXRhaWxzXG4gICAgICAgIH0pO1xuICAgIH1cbiAgICBjaGVja1NldHVwKCl7XG4gICAgICAgIHRoaXMucmVkaXNDbGllbnQuZXhpc3RzKE1JRF9DT1VOVEVSLCAoZXJyLCByZXMpID0+IHtcbiAgICAgICAgICAgIGlmIChyZXMgPT0gMCkge1xuICAgICAgICAgICAgICAgIC8vY3JlYXRlIHRoZSBtYW5pZmVzdCBcbiAgICAgICAgICAgICAgICBscmVkaXMuc2V0KE1JRF9DT1VOVEVSLCAxMDApO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgXG4gICAgICAgIH0pO1xuICAgIH1cblxuICAgIGdldFR5cGVzKCkge1xuICAgICAgICByZXR1cm4gdGhpcy5teXR5cGVzXG4gICAgfVxuICAgIGdldFN0YWdlcygpIHtcbiAgICAgICAgcmV0dXJuIHRoaXMubWFuaWZlc3RTdGFnZXM7XG4gICAgfVxuICAgIHVwZGF0ZU1hbmlmZXN0RGV0YWlscyhkZXRhaWxzKXtcbiAgICAgICAgcmV0dXJuIG5ldyBQcm9taXNlKChyZXNvbHZlLHJlamVjdCk9PntcbiAgICAgICAgICAgIGNvbnNvbGUubG9nKCdzYXZpbmcgZGV0YWlscycsIGRldGFpbHMpOyBcbiAgICAgICAgICAgIHRoaXMubXlTZWFyY2gudXBkYXRlKGRldGFpbHMuaWQsZGV0YWlscywoZXJyLHJlc3VsdCk9PntcbiAgICAgICAgICAgICAgICBpZiAoZXJyKVxuICAgICAgICAgICAgICAgICAgICBjb25zb2xlLmxvZyhlcnIpOyBcbiAgICAgICAgICAgICAgICBscmVkaXMuaG1zZXQoTUlEX1BSRUZJWCtkZXRhaWxzLmlkLGRldGFpbHMpXG4gICAgICAgICAgICAgICAgcmVzb2x2ZSh7dXBkYXRlZDp0cnVlfSlcbiAgICAgICAgICAgIH0pXG4gICAgICAgIH0pXG4gICAgfVxuICAgIGdldE9wZW5NYW5pZmVzdCh0eXBlSWQpe1xuICAgICAgICBcbiAgICAgICAgcmV0dXJuIG5ldyBQcm9taXNlKChyZXNvbHZlLHJlamVjdCk9PntcbiAgICAgICAgICAgY29uc29sZS5sb2coIGBAc3RhZ2VJZDpbJHt0eXBlSWR9ICR7dHlwZUlkfV0gQG10eXBlSWQ6JHt0eXBlSWR9YCk7XG4gICAgICAgICAgICB0aGlzLm15U2VhcmNoLnNlYXJjaChgQHN0YWdlSWQ6WzEgMV0gQG10eXBlSWQ6JHt0eXBlSWR9YCwge1xuICAgICAgICAgICAgICAgIG9mZnNldDowLFxuICAgICAgICAgICAgICAgIG51bWJlck9mUmVzdWx0czogMTAwLFxuICAgICAgICAgICAgICAgIHNvcnRCeTogXCJtaWRcIixcbiAgICAgICAgICAgICAgICBkaXI6IFwiREVTQ1wiXG4gICAgICAgICAgICB9LCAocjEsIGRhdGEpID0+IHtcbiAgICAgICAgICAgICAgICBpZiAocjEpXG4gICAgICAgICAgICAgICAgIHtcbiAgICAgICAgICAgICAgICAgICAgIGNvbnNvbGUubG9nKCd3ZSBoYWQgYW4gZXJyb3InKVxuICAgICAgICAgICAgICAgICAgICBjb25zb2xlLmxvZyhyMSk7XG4gICAgICAgICAgICAgICAgICAgIFxuICAgICAgICAgICAgICAgICB9ICAgXG4gICAgICAgICAgICAgICAgIGNvbnNvbGUubG9nKCdubyBlcnJvcnMgZGV0ZWN0ZWQgaGVyZSAuLi4nKVxuICAgICAgICAgICAgICAgICAvL2NvbnNvbGUubG9nKG1hbmlmZXN0TGlzdCk7XG4gICAgICAgICAgICAgICAgIGNvbnNvbGUubG9nKGRhdGEpO1xuICAgICAgICAgICAgICAgIFxuICAgICAgICAgICAgICAgIHJlc29sdmUoZGF0YS50b3RhbFJlc3VsdHMpO1xuICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICBcbiAgICAgICAgfSk7XG4gICAgICAgIFxuICAgIH1cbiAgICBnZXRPcGVuTWFuaWZlc3RMaXN0KHR5cGVJZCl7XG4gICAgICAgIFxuICAgICAgICByZXR1cm4gbmV3IFByb21pc2UoKHJlc29sdmUscmVqZWN0KT0+e1xuICAgICAgICAgICBjb25zb2xlLmxvZyggYEBzdGFnZUlkOlske3R5cGVJZH0gJHt0eXBlSWR9XSBAbXR5cGVJZDoke3R5cGVJZH1gKTtcbiAgICAgICAgICAgIHRoaXMubXlTZWFyY2guc2VhcmNoKGBAc3RhZ2VJZDpbMSAxXSBAbXR5cGVJZDoke3R5cGVJZH1gLCB7XG4gICAgICAgICAgICAgICAgb2Zmc2V0OjAsXG4gICAgICAgICAgICAgICAgbnVtYmVyT2ZSZXN1bHRzOiAxMDAsXG4gICAgICAgICAgICAgICAgc29ydEJ5OiBcIm1pZFwiLFxuICAgICAgICAgICAgICAgIGRpcjogXCJERVNDXCJcbiAgICAgICAgICAgIH0sIChyMSwgZGF0YSkgPT4ge1xuICAgICAgICAgICAgICAgIGlmIChyMSlcbiAgICAgICAgICAgICAgICAge1xuICAgICAgICAgICAgICAgICAgICAgY29uc29sZS5sb2coJ3dlIGhhZCBhbiBlcnJvcicpXG4gICAgICAgICAgICAgICAgICAgIGNvbnNvbGUubG9nKHIxKTtcbiAgICAgICAgICAgICAgICAgICAgXG4gICAgICAgICAgICAgICAgIH0gICBcbiAgICAgICAgICAgICAgICAgY29uc29sZS5sb2coJ25vIGVycm9ycyBkZXRlY3RlZCBoZXJlIC4uLicpXG4gICAgICAgICAgICAgICAgIC8vY29uc29sZS5sb2cobWFuaWZlc3RMaXN0KTtcbiAgICAgICAgICAgICAgICAgY29uc29sZS5sb2coZGF0YSk7XG4gICAgICAgICAgICAgICAgIHZhciBtYW5pZmVzdExpc3QgID0gW107IFxuXG4gICAgICAgICAgICAgICAgICAgICBQcm9taXNlLmFsbChkYXRhLnJlc3VsdHMubWFwKG1hbj0+cGxhbmVTZXJ2aWNlLmxpc3RDb21wYXJ0bWVudHMobWFuLmRvYy5wbGFuZUlkKSkpLnRoZW4ocGxhbmVSZXN1bHN0PT57XG4gICAgICAgICAgICAgICAgICAgICAgICAgY29uc29sZS5sb2cocGxhbmVSZXN1bHN0KTsgXG4gICAgICAgICAgICAgICAgICAgICAgICAgZm9yIChsZXQgaSA9IDA7IGkgPCBwbGFuZVJlc3Vsc3QubGVuZ3RoOyBpKyspIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgdmFyIG0gPSBkYXRhLnJlc3VsdHNbaV07IFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICB2YXIgbWFuaWZlc3QgPSB7fVxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICBcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgbWFuaWZlc3QucGxhbmUgPSBwbGFuZVJlc3Vsc3RbaV0ucGxhbmVcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgbWFuaWZlc3QubWlkID0gbS5kb2MubWlkOyBcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgbWFuaWZlc3QudGl0bGUgPSBtLmRvYy50aXRsZTsgXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgIC8vY29uc29sZS5sb2cobS5kb2MuZmxpZ2h0RGF0ZSxtb21lbnQudW5peChtLmRvYy5mbGlnaHREYXRlKS5mb3JtYXQoXCJNTU0gREQsWVlZWSBoaDptbSBBXCIpKVxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICBpZiAoIW0uZG9jLnRhaWxOdW0pXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIG0uZG9jLnRhaWxOdW0gPSBcIlwiOyBcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgaWYgKCFtLmRvYy5mbGlnaHREYXRlKXtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIG1hbmlmZXN0LmZsaWdodERhdGUgPSBcIlwiXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgZWxzZVxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBtYW5pZmVzdC5mbGlnaHREYXRlID0gbW9tZW50LnVuaXgobS5kb2MuZmxpZ2h0RGF0ZSkuZm9ybWF0KFwiTU1NIERELFlZWVkgaGg6bW0gQVwiKTsgXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgIG1hbmlmZXN0TGlzdC5wdXNoKG1hbmlmZXN0KVxuICAgICAgICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgICAgICBcbiAgICAgICAgICAgICAgICAgICAgICAgICByZXNvbHZlKHttYW5pZmVzdHM6bWFuaWZlc3RMaXN0fSk7XG4gICAgICAgICAgICAgICBcbiAgICAgICAgICAgICAgICAgICAgXG4gICAgICAgICAgICAgICAgIH0pLmNhdGNoKGVycmFsbD0+e1xuICAgICAgICAgICAgICAgICAgICAgY29uc29sZS5sb2coZXJyYWxsKVxuICAgICAgICAgICAgICAgICB9KTtcbiAgICAgICAgICAgICAgICBcbiAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgXG4gICAgICAgIH0pO1xuICAgICAgICBcbiAgICB9XG4gICAgY3JlYXRlTmV3TWFuaWZlc3QodHlwZSwgdXNlcikge1xuICAgICAgICAvL3dlIGhhdmUgc29tZSBydWxlcyB0byBmb2xsb3cgaGVyZSBcbiAgICAgICAgLy8xLiBhIG5ldyBtYW5pZmVzdCBjYW5ub3QgYmUgY3JlYXRlZCBpZiB0aGUgcHJldmlvdXMgbWFuaWZlc3QgaXMgbm90IGNsb3NlZCBcbiAgICAgICAgLy9jaGVjayBmb3Igb3BlbiBtYW5pZmVzdCBmaXJzdCBcbiAgICAgICAgdmFyIHNydiA9IHRoaXM7IFxuICAgICAgICByZXR1cm4gbmV3IFByb21pc2UoKHJlc29sdmUsIHJlamVjdCkgPT4ge1xuICAgICAgICAgICAgdGhpcy5nZXRPcGVuTWFuaWZlc3QodHlwZS5pZCkudGhlbigob3BlbkNvdW50KSA9PiB7XG4gICAgICAgICAgICAgIFxuICAgICAgICAgICAgICAgIGNvbnNvbGUubG9nKHR5cGUpOyBcbiAgICAgICAgICAgICAgICAvLyBpZiAob3BlbkNvdW50PjApIHtcbiAgICAgICAgICAgICAgICAvLyAgICAgLy93ZSBjYW4ndCBhZGQgdGhlIG1hbmlmZXN0IHJlamVjdCBcbiAgICAgICAgICAgICAgICAvLyAgICAgcmVqZWN0KHtcbiAgICAgICAgICAgICAgICAvLyAgICAgICAgIFwibWVzc2FnZVwiOiBcIlRoZXJlIGlzIGFuIG9wZW4gbWFuaWZlc3QgUGxlYXNlIGNsb3NlIGl0IGJlZm9yZSBjcmVhdGluZyBhIG5ldyBtYW5pZmVzdC5cIlxuICAgICAgICAgICAgICAgIC8vICAgICB9KTtcblxuICAgICAgICAgICAgICAgIC8vIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgICAgIHRoaXMucmVkaXNDbGllbnQubXVsdGkoKVxuICAgICAgICAgICAgICAgICAgICAgICAgLmluY3IoTUlEX0NPVU5URVIpXG4gICAgICAgICAgICAgICAgICAgICAgICAuZXhlYygoZXJyLCByZXNwKSA9PiB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgY29uc29sZS5sb2cocmVzcCk7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgdmFyIG1hbmlmZXN0ID0ge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBtaWQ6IHJlc3BbMF0sXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHRpdGxlOiB0eXBlLnByZWZpeCtyZXNwWzBdLFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBkYXRlQ3JlYXRlZDogbW9tZW50KCkudW5peCgpLC8vZm9ybWF0KFwiWVlZWS1NTS1ERFwiKSxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgbXR5cGVJZDogdHlwZS5pZCxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgc3RhZ2VJZDogbWFuaWZlc3RTdGFnZXMub3Blbi5pZCxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgc3RhZ2U6IG1hbmlmZXN0U3RhZ2VzLm9wZW4udGl0bGUsXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGNyZWF0ZWRCeTogdXNlclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIH07XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgY29uc29sZS5sb2cobWFuaWZlc3QpXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgc3J2LnJlZGlzQ2xpZW50Lm11bHRpKClcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgLmhtc2V0KE1JRF9QUkVGSVggKyBtYW5pZmVzdC5taWQsIG1hbmlmZXN0KVxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAuc2FkZChPUEVOX01BTklGRVNULCBtYW5pZmVzdC5taWQpXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIC5leGVjKChlcnIsIHJlc3VsdHMpID0+IHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHNydi5teVNlYXJjaC5hZGQobWFuaWZlc3QubWlkLG1hbmlmZXN0LChzZXJyLHJlc3UpPT57XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgaWYgKHNlcnIpXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGNvbnNvbGUubG9nKHNlcnIpXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgY29uc29sZS5sb2cocmVzdSlcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgLy9hbHNvIGFkZCB0byB0aGUgaW5kZXggaGVyZSBvbmUgdGltZSBcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGlmIChlcnIpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICByZWplY3QoZXJyKTtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgcmVzb2x2ZShtYW5pZmVzdClcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICAgICAgICAgICAgICB9KTtcbiAgICAgICAgICAgICAgICAvL31cblxuICAgICAgICAgICAgfSkuY2F0Y2goKGVycik9PntcbiAgICAgICAgICAgICAgICBjb25zb2xlLmxvZyhcImVyciBkZXRlY3RlZFwiKTsgXG4gICAgICAgICAgICAgICAgY29uc29sZS5sb2coZXJyKTtcbiAgICAgICAgICAgIH0pO1xuXG4gICAgICAgIH0pO1xuXG4gICAgfVxuICAgIGNoYW5nZVN0YWdlKG1pZCwgc3RhZ2VzKSB7XG4gICAgICAgIHJldHVybiBuZXcgUHJvbWlzZSgocmVzb2x2ZSwgcmVqZWN0KSA9PiB7XG4gICAgICAgICAgICBcbiAgICAgICAgICAgIGxyZWRpcy5jbGllbnQuaG1zZXQoTUlEX1BSRUZJWCttaWQsXCJzdGFnZUlkXCIsc3RhZ2VzLChlcnIscmVzdWx0KT0+e1xuICAgICAgICAgICAgICAgIHZhciBzdGFnZSA9IHRoaXMuZ2V0U3RhZ2VCeUlkKHN0YWdlcyk7IFxuICAgICAgICAgICAgICAgIGNvbnNvbGUubG9nKCdsb29rZWQgdXAgdGhlIHN0YWdlICcrc3RhZ2UudGl0bGUpO1xuICAgICAgICAgICAgICAgIGxyZWRpcy5jbGllbnQuaG1zZXQoTUlEX1BSRUZJWCttaWQsXCJzdGFnZVwiLHN0YWdlLnRpdGxlLChlcnIscmVzdWx0Mik9Pnt9KTsgXG4gICAgICAgICAgICAgICAgbHJlZGlzLmhnZXRhbGwoTUlEX1BSRUZJWCttaWQpLnRoZW4oKHVNYW5pZmVzdCk9PntcbiAgICAgICAgICAgICAgICAgICAgdGhpcy5teVNlYXJjaC5kZWxEb2N1bWVudChcImluZGV4Om1hbmlmZXN0XCIsbWlkLChlcnIscmVzdWx0MSk9PntcbiAgICAgICAgICAgICAgICAgICAgICAgIGNvbnNvbGUubG9nKCdjaGFuZ2luZyBkb2N1bWVudCcpO1xuICAgICAgICAgICAgICAgICAgICAgICAgY29uc29sZS5sb2coZXJyKTtcbiAgICAgICAgICAgICAgICAgICAgICAgIGNvbnNvbGUubG9nKHJlc3VsdDEpIFxuICAgICAgICAgICAgICAgICAgICAgICAgdGhpcy5teVNlYXJjaC5hZGQodU1hbmlmZXN0Lm1pZCx1TWFuaWZlc3QpOyBcbiAgICAgICAgICAgICAgICAgICAgICAgIHJlc29sdmUocmVzdWx0KTsgXG4gICAgICAgICAgICAgICAgICAgIH0pOyBcbiAgICAgICAgICAgICAgICAgICBcbiAgICAgICAgICAgICAgICB9KTtcbiAgICAgICAgICAgICAgIFxuICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICAvL3dlIGFsc28gbmVlZCB0byB0byB1cGRhdGUgdGhlIGRvY3VtZW50IFxuXG4gICAgICAgICAgICBcbiAgICAgICAgfSlcbiAgICB9XG4gICAgc2hpcE1hbmlmZXN0KG1pZCxhd2IsdXNlcil7XG4gICAgICAgIHJldHVybiBuZXcgUHJvbWlzZSgocmVzb2x2ZSxyZWplY3QpPT57XG4gICAgICAgICAgICBscmVkaXMuaG1zZXQoTUlEX1BSRUZJWCttaWQsIHthd2I6YXdiLHNoaXBEYXRlOm1vbWVudCgpLmZvcm1hdChcIllZWVktTU0tRERcIiksc2hpcHBlZEJ5OnVzZXJ9KS50aGVuKChzcmVzdWx0KT0+e1xuICAgICAgICAgICAgICAgIGNvbnNvbGUubG9nKHNyZXN1bHQpO1xuICAgICAgICAgICAgICAgIHRoaXMuY2hhbmdlU3RhZ2UobWlkLDMpLnRoZW4oKHJlc3UpPT57XG4gICAgICAgICAgICAgICAgICAgIHJlc29sdmUoc3Jlc3VsdCk7XG4gICAgICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICAgICAgXG4gICAgICAgICAgICB9KVxuICAgICAgICB9KVxuICAgIH1cbiAgICBsaXN0TWFuaWZlc3QodHlwZSxwYWdlLHBhZ2VTaXplKXtcbiAgICAgICAgcmV0dXJuIG5ldyBQcm9taXNlKChyZXNvbHZlLHJlamVjdCk9PntcbiAgICAgICAgICAgIHZhciBvZmZzZXRWYWwgPSAocGFnZSAtIDEpICogcGFnZVNpemU7XG4gICAgICAgICAgICBjb25zb2xlLmxvZygnb2Zmc2V0ICcrb2Zmc2V0VmFsKTtcbiAgICAgICAgICAgIFxuICAgICAgICAgICAgdGhpcy5teVNlYXJjaC5zZWFyY2goXCJAbXR5cGVJZDpcIit0eXBlLCB7XG4gICAgICAgICAgICAgICAgb2Zmc2V0Om9mZnNldFZhbCxcbiAgICAgICAgICAgICAgICBudW1iZXJPZlJlc3VsdHM6IHBhZ2VTaXplLFxuICAgICAgICAgICAgICAgIHNvcnRCeTogXCJtaWRcIixcbiAgICAgICAgICAgICAgICBkaXI6IFwiREVTQ1wiXG4gICAgICAgICAgICB9LCAocjEsIGRhdGEpID0+IHtcbiAgICAgICAgICAgICAgICBpZiAocjEpXG4gICAgICAgICAgICAgICAgICAgIGNvbnNvbGUubG9nKHIxKTtcbiAgICAgICAgICAgICAgICAgdmFyIG1hbmlmZXN0TGlzdCA9IFtdOyBcbiAgICAgICAgICAgICAgICAgZGF0YS5yZXN1bHRzLmZvckVhY2gobWFuaWZlc3RSZXN1bHQgPT4ge1xuICAgICAgICAgICAgICAgICAgICBtYW5pZmVzdExpc3QucHVzaChtYW5pZmVzdFJlc3VsdC5kb2MpOyAgICBcbiAgICAgICAgICAgICAgICAgICAgXG4gICAgICAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgICAgICAvL2NvbnNvbGUubG9nKG1hbmlmZXN0TGlzdCk7XG4gICAgICAgICAgICAgICAgIHZhciBwYWdlZERhdGEgPSB7XG4gICAgICAgICAgICAgICAgICAgIG1hbmlmZXN0czptYW5pZmVzdExpc3QsXG4gICAgICAgICAgICAgICAgICAgIHRvdGFsUmVzdWx0cyA6IGRhdGEudG90YWxSZXN1bHRzLFxuICAgICAgICAgICAgICAgICAgICBwYWdlIDogcGFnZSxcbiAgICAgICAgICAgICAgICAgICAgcGFnZVNpemU6IHBhZ2VTaXplLCBcbiAgICAgICAgICAgICAgICAgICAgVG90YWxQYWdlcyA6IChkYXRhLnRvdGFsUmVzdWx0cy9wYWdlU2l6ZSlcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgcmVzb2x2ZShwYWdlZERhdGEpO1xuICAgICAgICAgICAgICAgIGNvbnNvbGUubG9nKG1hbmlmZXN0TGlzdCk7XG4gICAgICAgICAgICAgICAgXG4gICAgICAgICAgICB9KTtcbiAgICAgICAgfSk7XG4gICAgfVxuICAgIGdldE1hbmlmZXN0KG1pZCkge1xuICAgICAgICByZXR1cm4gbHJlZGlzLmhnZXRhbGwoTUlEX1BSRUZJWCttaWQpXG4gICAgfVxuICAgIGRlbGV0ZU1hbmlmZXN0KG1pZCl7XG4gICAgICAgcmV0dXJuIG5ldyBQcm9taXNlKChyZXNvbHZlLHJlamVjdCk9PntcbiAgICAgICAgbHJlZGlzLmNsaWVudC5kZWwoTUlEX1BSRUZJWCttaWQsKGVycixyZXNwKT0+e1xuICAgICAgICAgICAgY29uc29sZS5sb2cocmVzcCk7IFxuICAgICAgICAgICAgdGhpcy5teVNlYXJjaC5kZWxEb2N1bWVudChcImluZGV4Om1hbmlmZXN0XCIsbWlkLChlcnIscmVzdWx0KT0+e1xuICAgICAgICAgICAgICAgIGNvbnNvbGUubG9nKFwiZGVsZXRpbmcgbWlkXCIpOyBcbiAgICAgICAgICAgICAgICBjb25zb2xlLmxvZyhlcnIpOyBcbiAgICAgICAgICAgICAgICBjb25zb2xlLmxvZyhyZXN1bHQpO1xuICAgICAgICAgICAgfSk7IFxuICAgICAgICAgICAgbHJlZGlzLnNyZW0oT1BFTl9NQU5JRkVTVCxtaWQpO1xuICAgICAgICAgICAgcmVzb2x2ZSh7ZGVsZXRlZDp0cnVlfSkgICAgXG4gICAgICAgIH0pXG5cbiAgICAgICB9KTsgXG4gICAgICAgIFxuICAgICAgICBcbiAgICB9XG4gICAgZ2V0TWFuaWZlc3RQcm9jZXNzaW5nKCl7XG4gICAgICAgIHZhciBtc2VhcmNoID0gdGhpcy5teVNlYXJjaDsgXG4gICAgICAgIHJldHVybiBuZXcgUHJvbWlzZSgocmVzb2x2ZSxyZWplY3QpPT57XG4gICAgICAgICAgICB2YXIgb2Zmc2V0VmFsID0wO1xuICAgICAgICAgICAgdmFyIHBhZ2VTaXplID0gMjA7IFxuICAgICAgICAgICAgY29uc29sZS5sb2coJ29mZnNldCAnK29mZnNldFZhbCk7XG4gICAgICAgICAgICB2YXIgbWFuaWZlc3RMaXN0ID0gW107IFxuICAgICAgICAgICAgbXNlYXJjaC5zZWFyY2goYEBzdGFnZUlkOlszIDRdYCwge1xuICAgICAgICAgICAgICAgIG9mZnNldDpvZmZzZXRWYWwsXG4gICAgICAgICAgICAgICAgbnVtYmVyT2ZSZXN1bHRzOiBwYWdlU2l6ZSxcbiAgICAgICAgICAgICAgICBzb3J0Qnk6IFwibWlkXCIsXG4gICAgICAgICAgICAgICAgZGlyOiBcIkRFU0NcIlxuICAgICAgICAgICAgfSwgKHIxLCBkYXRhKSA9PiB7XG4gICAgICAgICAgICAgICAgaWYgKHIxKVxuICAgICAgICAgICAgICAgICAgICBjb25zb2xlLmxvZyhyMSk7XG4gICAgICAgICAgICAgICAgIFxuICAgICAgICAgICAgICAgICBkYXRhLnJlc3VsdHMuZm9yRWFjaChtYW5pZmVzdFJlc3VsdCA9PiB7XG4gICAgICAgICAgICAgICAgICAgIG1hbmlmZXN0TGlzdC5wdXNoKG1hbmlmZXN0UmVzdWx0LmRvYyk7ICAgIFxuICAgICAgICAgICAgICAgICAgICBcbiAgICAgICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICAgICAgIC8vY29uc29sZS5sb2cobWFuaWZlc3RMaXN0KTtcbiAgICAgICAgICAgICAgICAgdmFyIHBhZ2VkRGF0YSA9IHtcbiAgICAgICAgICAgICAgICAgICAgbWFuaWZlc3RzOm1hbmlmZXN0TGlzdCxcbiAgICAgICAgICAgICAgICAgICAgdG90YWxSZXN1bHRzIDogZGF0YS50b3RhbFJlc3VsdHMsXG4gICAgICAgICAgICAgICAgICAgIHBhZ2UgOiAxLFxuICAgICAgICAgICAgICAgICAgICBwYWdlU2l6ZTogcGFnZVNpemUsIFxuICAgICAgICAgICAgICAgICAgICBUb3RhbFBhZ2VzIDogKGRhdGEudG90YWxSZXN1bHRzL3BhZ2VTaXplKVxuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICByZXNvbHZlKHBhZ2VkRGF0YSk7XG4gICAgICAgICAgICAgICAgY29uc29sZS5sb2cobWFuaWZlc3RMaXN0KTtcbiAgICAgICAgICAgICAgICBcbiAgICAgICAgICAgIH0pO1xuICAgICAgICB9KTtcbiAgICB9XG4gICAgXG4gICAgZ2V0VHlwZWJ5SWQgKGlkKXtcbiAgICAgICAgaWYgKGlkID09IDEpe1xuICAgICAgICAgICAgcmV0dXJuIG1hbmlmZXN0VHlwZXMuYWlyO1xuICAgICAgICB9XG4gICAgICAgIGlmIChpZCA9PSAyKXtcbiAgICAgICAgICAgIHJldHVybiBtYW5pZmVzdFR5cGVzLm9jZWFuO1xuICAgICAgICB9XG4gICAgICAgIGlmIChpZCA9PSAzKXtcbiAgICAgICAgICAgIHJldHVybiBtYW5pZmVzdFR5cGVzLmhhem1hdDtcbiAgICAgICAgfVxuICAgICAgICByZXR1cm4gbWFuaWZlc3RUeXBlcy5haXI7IFxuICAgIH1cbiAgICBnZXRTdGFnZUJ5SWQoaWQpe1xuICAgICAgICBpZiAoaWQgPT0gMSl7XG4gICAgICAgICAgICByZXR1cm4gbWFuaWZlc3RTdGFnZXMub3BlbjtcbiAgICAgICAgfVxuICAgICAgICBpZiAoaWQgPT0gMil7XG4gICAgICAgICAgICByZXR1cm4gbWFuaWZlc3RTdGFnZXMuY2xvc2VkO1xuICAgICAgICB9XG4gICAgICAgIGlmIChpZCA9PSAzKXtcbiAgICAgICAgICAgIHJldHVybiBtYW5pZmVzdFN0YWdlcy5zaGlwcGVkO1xuICAgICAgICB9XG4gICAgICAgIGlmIChpZCA9PSA0KXtcbiAgICAgICAgICAgIHJldHVybiBtYW5pZmVzdFN0YWdlcy52ZXJpZmllZDtcbiAgICAgICAgfVxuICAgICAgICByZXR1cm4gbWFuaWZlc3RTdGFnZXMub3BlbjsgXG4gICAgfVxuXG4gICAgLy8gYWRkUGFja2FnZVRvTWFuaWZlc3QocGFja2FnZUJhckNvZGUsIG1pZCl7XG4gICAgLy8gICAgIC8vd2Ugc2hvdWxkIGp1c3QgdXBkYXRlIHRoZSBwYWNrYWdlIGluIHRoZSBpbmRleC4gXG4gICAgLy8gICAgIHJldHVybiBuZXcgUHJvbWlzZSgocmVzb2x2ZSxyZWplY3QpPT57XG4gICAgLy8gICAgICAgICBkYXRhQ29udGV4dC5yZWRpc0NsaWVudC5zYWRkKE1JRF9QQUNLQUdFUyttaWQscGFja2FnZUJhckNvZGUsKGVycixyZXN1bHQpPT57XG4gICAgLy8gICAgICAgICAgICAgcmVzb2x2ZSh7YWRkZWQ6dHJ1ZX0pXG4gICAgLy8gICAgICAgICB9KTsgXG4gICAgLy8gICAgIH0pXG4gICAgLy8gfVxuICAgIC8vIHJlbW92ZVBhY2thZ2VGcm9tTWFuaWZlc3QocGFja2FnZUJhckNvZGUsbWlkKXtcbiAgICAvLyAgICAgcmV0dXJuIG5ldyBQcm9taXNlKChyZXNvbHZlLHJlamVjdCk9PntcbiAgICAvLyAgICAgICAgIGRhdGFDb250ZXh0LnJlZGlzQ2xpZW50LnNyZW0oTUlEX1BBQ0tBR0VTX21pZCxwYWNrYWdlQmFyQ29kZSwoZXJyLHJlc3VsdCk9PntcbiAgICAvLyAgICAgICAgICAgICByZXNvbHZlKHtyZW1vdmU6dHJ1ZX0pXG4gICAgLy8gICAgICAgICB9KVxuICAgIC8vICAgICB9KVxuICAgIC8vIH1cbiAgICAvLyBnZXRNYW5pZmVzdFBhY2thZ2VzKG1pZCl7XG4gICAgLy8gICAgIHJldHVybiBuZXcgUHJvbWlzZSgocmVzb2x2ZSxyZWplY3QpPT57XG4gICAgLy8gICAgICAgICBkYXRhQ29udGV4dC5yZWRpc0NsaWVudC5zbWVtYmVycyhNSURfUEFDS0FHRVMrbWlkLChlcnIpKVxuICAgIC8vICAgICB9KVxuICAgIC8vIH1cbn0iXX0=
