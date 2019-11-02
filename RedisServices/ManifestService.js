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
//# sourceMappingURL=data:application/json;charset=utf8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIlJlZGlzU2VydmljZXMvTWFuaWZlc3RTZXJ2aWNlLmVzNiJdLCJuYW1lcyI6WyJyZWRpcyIsInJlcXVpcmUiLCJscmVkaXMiLCJtb21lbnQiLCJkYXRhQ29udGV4dCIsInJlZGlzU2VhcmNoIiwiTUlEX0NPVU5URVIiLCJNSURfUFJFRklYIiwiTUlEX0lOREVYIiwiT1BFTl9NQU5JRkVTVCIsIkNMT1NFRF9NQU5JRkVTVCIsIlNISVBQRURfTUFOSUZFU1QiLCJNSURfUEFDS0FHRVMiLCJWRVJJRklFRF9NQU5JRkVTVCIsIlBsYW5lU2VydmljZSIsInBsYW5lU2VydmljZSIsIm1hbmlmZXN0VHlwZXMiLCJhaXIiLCJpZCIsInRpdGxlIiwicHJlZml4Iiwib2NlYW4iLCJoYXptYXQiLCJtYW5pZmVzdFN0YWdlcyIsIm9wZW4iLCJjbG9zZWQiLCJzaGlwcGVkIiwidmVyaWZpZWQiLCJNYW5pZmVzdFNlcnZpY2UiLCJyZWRpc0NsaWVudCIsImNsaWVudCIsIm10eXBlcyIsIm1zdGFnZXMiLCJjaGVja1NldHVwIiwic2V0dXBJbmRleCIsIm15U2VhcmNoIiwiY2xpZW50T3B0aW9ucyIsInNlYXJjaENsaWVudERldGFpbHMiLCJleGlzdHMiLCJlcnIiLCJyZXMiLCJzZXQiLCJteXR5cGVzIiwiZGV0YWlscyIsIlByb21pc2UiLCJyZXNvbHZlIiwicmVqZWN0IiwiY29uc29sZSIsImxvZyIsInVwZGF0ZSIsInJlc3VsdCIsImhtc2V0IiwidXBkYXRlZCIsInR5cGVJZCIsInNlYXJjaCIsIm9mZnNldCIsIm51bWJlck9mUmVzdWx0cyIsInNvcnRCeSIsImRpciIsInIxIiwiZGF0YSIsInRvdGFsUmVzdWx0cyIsIm1hbmlmZXN0TGlzdCIsImFsbCIsInJlc3VsdHMiLCJtYXAiLCJsaXN0Q29tcGFydG1lbnRzIiwibWFuIiwiZG9jIiwicGxhbmVJZCIsInRoZW4iLCJwbGFuZVJlc3Vsc3QiLCJpIiwibGVuZ3RoIiwibSIsIm1hbmlmZXN0IiwicGxhbmUiLCJtaWQiLCJ0YWlsTnVtIiwiZmxpZ2h0RGF0ZSIsInVuaXgiLCJmb3JtYXQiLCJwdXNoIiwibWFuaWZlc3RzIiwidHlwZSIsInVzZXIiLCJzcnYiLCJnZXRPcGVuTWFuaWZlc3QiLCJvcGVuQ291bnQiLCJtdWx0aSIsImluY3IiLCJleGVjIiwicmVzcCIsImRhdGVDcmVhdGVkIiwibXR5cGVJZCIsInN0YWdlSWQiLCJzdGFnZSIsImNyZWF0ZWRCeSIsInNhZGQiLCJhZGQiLCJzZXJyIiwicmVzdSIsImNhdGNoIiwic3RhZ2VzIiwiZ2V0U3RhZ2VCeUlkIiwicmVzdWx0MiIsImhnZXRhbGwiLCJ1TWFuaWZlc3QiLCJkZWxEb2N1bWVudCIsInJlc3VsdDEiLCJhd2IiLCJzaGlwRGF0ZSIsInNoaXBwZWRCeSIsInNyZXN1bHQiLCJjaGFuZ2VTdGFnZSIsInBhZ2UiLCJwYWdlU2l6ZSIsIm9mZnNldFZhbCIsImZvckVhY2giLCJtYW5pZmVzdFJlc3VsdCIsInBhZ2VkRGF0YSIsIlRvdGFsUGFnZXMiLCJkZWwiLCJzcmVtIiwiZGVsZXRlZCIsIm1zZWFyY2giXSwibWFwcGluZ3MiOiI7Ozs7Ozs7OztBQUFBOzs7O0FBRUEsSUFBSUEsUUFBUUMsUUFBUSxPQUFSLENBQVo7QUFDQSxJQUFJQyxTQUFTRCxRQUFRLGVBQVIsQ0FBYjtBQUNBLElBQUlFLFNBQVNGLFFBQVEsUUFBUixDQUFiO0FBQ0EsSUFBSUcsY0FBY0gsUUFBUSxlQUFSLENBQWxCO0FBQ0EsSUFBSUksY0FBY0osUUFBUSxxQkFBUixDQUFsQjtBQUNBLElBQU1LLGNBQWMsbUJBQXBCO0FBQ0EsSUFBTUMsYUFBYSxXQUFuQjtBQUNBLElBQU1DLFlBQVksZ0JBQWxCO0FBQ0EsSUFBTUMsZ0JBQWdCLGVBQXRCO0FBQ0EsSUFBTUMsa0JBQWtCLGlCQUF4QjtBQUNBLElBQU1DLG1CQUFtQixrQkFBekI7QUFDQSxJQUFNQyxlQUFlLG9CQUFyQjtBQUNBLElBQU1DLG9CQUFvQixtQkFBMUIsQyxDQUErQztBQUMvQyxJQUFJQyxlQUFlYixRQUFRLGdCQUFSLEVBQTBCYSxZ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LG1CQUFPTixjQUFjQyxHQUFyQjtBQUNIOzs7cUNBQ1lDLEUsRUFBRztBQUNaLGdCQUFJQSxNQUFNLENBQVYsRUFBWTtBQUNSLHVCQUFPSyxlQUFlQyxJQUF0QjtBQUNIO0FBQ0QsZ0JBQUlOLE1BQU0sQ0FBVixFQUFZO0FBQ1IsdUJBQU9LLGVBQWVFLE1BQXRCO0FBQ0g7QUFDRCxnQkFBSVAsTUFBTSxDQUFWLEVBQVk7QUFDUix1QkFBT0ssZUFBZUcsT0FBdEI7QUFDSDtBQUNELGdCQUFJUixNQUFNLENBQVYsRUFBWTtBQUNSLHVCQUFPSyxlQUFlSSxRQUF0QjtBQUNIO0FBQ0QsbUJBQU9KLGVBQWVDLElBQXRCO0FBQ0g7O0FBRUQ7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQSIsImZpbGUiOiJSZWRpc1NlcnZpY2VzL01hbmlmZXN0U2VydmljZS5qcyIsInNvdXJjZXNDb250ZW50IjpbImltcG9ydCB7IHByb21pc2VzIH0gZnJvbSAnZnMnO1xuXG52YXIgcmVkaXMgPSByZXF1aXJlKCdyZWRpcycpO1xudmFyIGxyZWRpcyA9IHJlcXVpcmUoJy4vcmVkaXMtbG9jYWwnKTtcbnZhciBtb21lbnQgPSByZXF1aXJlKCdtb21lbnQnKTtcbnZhciBkYXRhQ29udGV4dCA9IHJlcXVpcmUoJy4vZGF0YUNvbnRleHQnKVxudmFyIHJlZGlzU2VhcmNoID0gcmVxdWlyZSgnLi4vcmVkaXNlYXJjaGNsaWVudCcpO1xuY29uc3QgTUlEX0NPVU5URVIgPSBcImdsb2JhbDptaWRDb3VudGVyXCI7XG5jb25zdCBNSURfUFJFRklYID0gXCJtYW5pZmVzdDpcIjtcbmNvbnN0IE1JRF9JTkRFWCA9IFwiaW5kZXg6bWFuaWZlc3RcIjtcbmNvbnN0IE9QRU5fTUFOSUZFU1QgPSBcIm1hbmlmZXN0Om9wZW5cIjtcbmNvbnN0IENMT1NFRF9NQU5JRkVTVCA9IFwibWFuaWZlc3Q6Y2xvc2VkXCJcbmNvbnN0IFNISVBQRURfTUFOSUZFU1QgPSBcIm1hbmlmZXN0OnNoaXBwZWRcIlxuY29uc3QgTUlEX1BBQ0tBR0VTID0gXCJtYW5pZmVzdDpwYWNrYWdlczpcIlxuY29uc3QgVkVSSUZJRURfTUFOSUZFU1QgPSBcIm1hbmlmZXN0OnZlcmlmaWVkXCI7IC8vIG1hbmlmZXN0IHRoYXQgaGF2ZSBkdXRpZXMgdmVyaWZpZWRcbnZhciBQbGFuZVNlcnZpY2UgPSByZXF1aXJlKCcuL1BsYW5lU2VydmljZScpLlBsYW5lU2VydmljZTsgXG52YXIgcGxhbmVTZXJ2aWNlID0gbmV3IFBsYW5lU2VydmljZSgpOyBcbnZhciBtYW5pZmVzdFR5cGVzID0ge1xuICAgIGFpcjoge1xuICAgICAgICBpZDogMSxcbiAgICAgICAgdGl0bGU6IFwiQWlyIENhcmdvXCIsXG4gICAgICAgIHByZWZpeDogXCJNLVwiXG4gICAgfSxcbiAgICBvY2Vhbjoge1xuICAgICAgICBpZDogMixcbiAgICAgICAgdGl0bGU6IFwiT2NlYW5cIixcbiAgICAgICAgcHJlZml4OiBcIlMtXCJcbiAgICB9LFxuICAgIGhhem1hdDoge1xuICAgICAgICBpZDogMyxcbiAgICAgICAgdGl0bGU6IFwiSEFaTUFUXCIsXG4gICAgICAgIHByZWZpeDogXCJILVwiXG4gICAgfVxufVxudmFyIG1hbmlmZXN0U3RhZ2VzID0ge1xuICAgIG9wZW46IHtcbiAgICAgICAgaWQ6IDEsXG4gICAgICAgIHRpdGxlOiAnT3BlbidcbiAgICB9LFxuICAgIGNsb3NlZDoge1xuICAgICAgICBpZDogMixcbiAgICAgICAgdGl0bGU6ICdDbG9zZWQnXG4gICAgfSxcbiAgICBzaGlwcGVkOiB7XG4gICAgICAgIGlkOiAzLFxuICAgICAgICB0aXRsZTogJ1NoaXBwZWQnXG4gICAgfSxcbiAgICB2ZXJpZmllZDoge1xuICAgICAgICBpZDogNCxcbiAgICAgICAgdGl0bGU6ICdWZXJpZmllZCdcbiAgICB9XG5cbn1cblxuZXhwb3J0IGNsYXNzIE1hbmlmZXN0U2VydmljZSB7XG5cbiAgICBjb25zdHJ1Y3RvcigpIHsgICAgICAgIFxuICAgICAgICB0aGlzLnJlZGlzQ2xpZW50ID0gbHJlZGlzLmNsaWVudDtcbiAgICAgICAgdGhpcy5tdHlwZXMgPSBtYW5pZmVzdFR5cGVzO1xuICAgICAgICB0aGlzLm1zdGFnZXMgPSBtYW5pZmVzdFN0YWdlcztcbiAgICAgICAgLy9jaGVjayB0byBlbnN1cmUgd2UgaGF2ZSB0aGUgbWFuaWZlc3QgY291bnRlciBcbiAgICAgICAgdGhpcy5jaGVja1NldHVwKCk7IFxuICAgICAgICB0aGlzLnNldHVwSW5kZXgoKVxuICAgIH1cbiAgICBzZXR1cEluZGV4KCl7XG4gICAgICAgIHRoaXMubXlTZWFyY2ggPSByZWRpc1NlYXJjaChyZWRpcywgJ2luZGV4Om1hbmlmZXN0Jywge1xuICAgICAgICAgICAgY2xpZW50T3B0aW9uczpscmVkaXMuc2VhcmNoQ2xpZW50RGV0YWlsc1xuICAgICAgICB9KTtcbiAgICB9XG4gICAgY2hlY2tTZXR1cCgpe1xuICAgICAgICB0aGlzLnJlZGlzQ2xpZW50LmV4aXN0cyhNSURfQ09VTlRFUiwgKGVyciwgcmVzKSA9PiB7XG4gICAgICAgICAgICBpZiAocmVzID09IDApIHtcbiAgICAgICAgICAgICAgICAvL2NyZWF0ZSB0aGUgbWFuaWZlc3QgXG4gICAgICAgICAgICAgICAgbHJlZGlzLnNldChNSURfQ09VTlRFUiwgMTAwKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIFxuICAgICAgICB9KTtcbiAgICB9XG5cbiAgICBnZXRUeXBlcygpIHtcbiAgICAgICAgcmV0dXJuIHRoaXMubXl0eXBlc1xuICAgIH1cbiAgICBnZXRTdGFnZXMoKSB7XG4gICAgICAgIHJldHVybiB0aGlzLm1hbmlmZXN0U3RhZ2VzO1xuICAgIH1cbiAgICB1cGRhdGVNYW5pZmVzdERldGFpbHMoZGV0YWlscyl7XG4gICAgICAgIHJldHVybiBuZXcgUHJvbWlzZSgocmVzb2x2ZSxyZWplY3QpPT57XG4gICAgICAgICAgICBjb25zb2xlLmxvZygnc2F2aW5nIGRldGFpbHMnLCBkZXRhaWxzKTsgXG4gICAgICAgICAgICB0aGlzLm15U2VhcmNoLnVwZGF0ZShkZXRhaWxzLmlkLGRldGFpbHMsKGVycixyZXN1bHQpPT57XG4gICAgICAgICAgICAgICAgaWYgKGVycilcbiAgICAgICAgICAgICAgICAgICAgY29uc29sZS5sb2coZXJyKTsgXG4gICAgICAgICAgICAgICAgbHJlZGlzLmhtc2V0KE1JRF9QUkVGSVgrZGV0YWlscy5pZCxkZXRhaWxzKVxuICAgICAgICAgICAgICAgIHJlc29sdmUoe3VwZGF0ZWQ6dHJ1ZX0pXG4gICAgICAgICAgICB9KVxuICAgICAgICB9KVxuICAgIH1cbiAgICBnZXRPcGVuTWFuaWZlc3QodHlwZUlkKXtcbiAgICAgICAgXG4gICAgICAgIHJldHVybiBuZXcgUHJvbWlzZSgocmVzb2x2ZSxyZWplY3QpPT57XG4gICAgICAgICAgIGNvbnNvbGUubG9nKCBgQHN0YWdlSWQ6WyR7dHlwZUlkfSAke3R5cGVJZH1dIEBtdHlwZUlkOiR7dHlwZUlkfWApO1xuICAgICAgICAgICAgdGhpcy5teVNlYXJjaC5zZWFyY2goYEBzdGFnZUlkOlsxIDFdIEBtdHlwZUlkOiR7dHlwZUlkfWAsIHtcbiAgICAgICAgICAgICAgICBvZmZzZXQ6MCxcbiAgICAgICAgICAgICAgICBudW1iZXJPZlJlc3VsdHM6IDEwMCxcbiAgICAgICAgICAgICAgICBzb3J0Qnk6IFwibWlkXCIsXG4gICAgICAgICAgICAgICAgZGlyOiBcIkRFU0NcIlxuICAgICAgICAgICAgfSwgKHIxLCBkYXRhKSA9PiB7XG4gICAgICAgICAgICAgICAgaWYgKHIxKVxuICAgICAgICAgICAgICAgICB7XG4gICAgICAgICAgICAgICAgICAgICBjb25zb2xlLmxvZygnd2UgaGFkIGFuIGVycm9yJylcbiAgICAgICAgICAgICAgICAgICAgY29uc29sZS5sb2cocjEpO1xuICAgICAgICAgICAgICAgICAgICBcbiAgICAgICAgICAgICAgICAgfSAgIFxuICAgICAgICAgICAgICAgICBjb25zb2xlLmxvZygnbm8gZXJyb3JzIGRldGVjdGVkIGhlcmUgLi4uJylcbiAgICAgICAgICAgICAgICAgLy9jb25zb2xlLmxvZyhtYW5pZmVzdExpc3QpO1xuICAgICAgICAgICAgICAgICBjb25zb2xlLmxvZyhkYXRhKTtcbiAgICAgICAgICAgICAgICBcbiAgICAgICAgICAgICAgICByZXNvbHZlKGRhdGEudG90YWxSZXN1bHRzKTtcbiAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgXG4gICAgICAgIH0pO1xuICAgICAgICBcbiAgICB9XG4gICAgZ2V0T3Blbk1hbmlmZXN0TGlzdCh0eXBlSWQpe1xuICAgICAgICBcbiAgICAgICAgcmV0dXJuIG5ldyBQcm9taXNlKChyZXNvbHZlLHJlamVjdCk9PntcbiAgICAgICAgICAgY29uc29sZS5sb2coIGBAc3RhZ2VJZDpbJHt0eXBlSWR9ICR7dHlwZUlkfV0gQG10eXBlSWQ6JHt0eXBlSWR9YCk7XG4gICAgICAgICAgICB0aGlzLm15U2VhcmNoLnNlYXJjaChgQHN0YWdlSWQ6WzEgMV0gQG10eXBlSWQ6JHt0eXBlSWR9YCwge1xuICAgICAgICAgICAgICAgIG9mZnNldDowLFxuICAgICAgICAgICAgICAgIG51bWJlck9mUmVzdWx0czogMTAwLFxuICAgICAgICAgICAgICAgIHNvcnRCeTogXCJtaWRcIixcbiAgICAgICAgICAgICAgICBkaXI6IFwiREVTQ1wiXG4gICAgICAgICAgICB9LCAocjEsIGRhdGEpID0+IHtcbiAgICAgICAgICAgICAgICBpZiAocjEpXG4gICAgICAgICAgICAgICAgIHtcbiAgICAgICAgICAgICAgICAgICAgIGNvbnNvbGUubG9nKCd3ZSBoYWQgYW4gZXJyb3InKVxuICAgICAgICAgICAgICAgICAgICBjb25zb2xlLmxvZyhyMSk7XG4gICAgICAgICAgICAgICAgICAgIFxuICAgICAgICAgICAgICAgICB9ICAgXG4gICAgICAgICAgICAgICAgIGNvbnNvbGUubG9nKCdubyBlcnJvcnMgZGV0ZWN0ZWQgaGVyZSAuLi4nKVxuICAgICAgICAgICAgICAgICAvL2NvbnNvbGUubG9nKG1hbmlmZXN0TGlzdCk7XG4gICAgICAgICAgICAgICAgIGNvbnNvbGUubG9nKGRhdGEpO1xuICAgICAgICAgICAgICAgICB2YXIgbWFuaWZlc3RMaXN0ICA9IFtdOyBcblxuICAgICAgICAgICAgICAgICAgICAgUHJvbWlzZS5hbGwoZGF0YS5yZXN1bHRzLm1hcChtYW49PnBsYW5lU2VydmljZS5saXN0Q29tcGFydG1lbnRzKG1hbi5kb2MucGxhbmVJZCkpKS50aGVuKHBsYW5lUmVzdWxzdD0+e1xuICAgICAgICAgICAgICAgICAgICAgICAgIGNvbnNvbGUubG9nKHBsYW5lUmVzdWxzdCk7IFxuICAgICAgICAgICAgICAgICAgICAgICAgIGZvciAobGV0IGkgPSAwOyBpIDwgcGxhbmVSZXN1bHN0Lmxlbmd0aDsgaSsrKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgIHZhciBtID0gZGF0YS5yZXN1bHRzW2ldOyBcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgdmFyIG1hbmlmZXN0ID0ge31cbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgIG1hbmlmZXN0LnBsYW5lID0gcGxhbmVSZXN1bHN0W2ldLnBsYW5lXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgIG1hbmlmZXN0Lm1pZCA9IG0uZG9jLm1pZDsgXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgIG1hbmlmZXN0LnRpdGxlID0gbS5kb2MudGl0bGU7IFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAvL2NvbnNvbGUubG9nKG0uZG9jLmZsaWdodERhdGUsbW9tZW50LnVuaXgobS5kb2MuZmxpZ2h0RGF0ZSkuZm9ybWF0KFwiTU1NIERELFlZWVkgaGg6bW0gQVwiKSlcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgaWYgKCFtLmRvYy50YWlsTnVtKVxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBtLmRvYy50YWlsTnVtID0gXCJcIjsgXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgIGlmICghbS5kb2MuZmxpZ2h0RGF0ZSl7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBtYW5pZmVzdC5mbGlnaHREYXRlID0gXCJcIlxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgIGVsc2VcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgbWFuaWZlc3QuZmxpZ2h0RGF0ZSA9IG1vbWVudC51bml4KG0uZG9jLmZsaWdodERhdGUpLmZvcm1hdChcIk1NTSBERCxZWVlZIGhoOm1tIEFcIik7IFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICBtYW5pZmVzdExpc3QucHVzaChtYW5pZmVzdClcbiAgICAgICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgICAgICAgXG4gICAgICAgICAgICAgICAgICAgICAgICAgcmVzb2x2ZSh7bWFuaWZlc3RzOm1hbmlmZXN0TGlzdH0pO1xuICAgICAgICAgICAgICAgXG4gICAgICAgICAgICAgICAgICAgIFxuICAgICAgICAgICAgICAgICB9KTtcbiAgICAgICAgICAgICAgICBcbiAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgXG4gICAgICAgIH0pO1xuICAgICAgICBcbiAgICB9XG4gICAgY3JlYXRlTmV3TWFuaWZlc3QodHlwZSwgdXNlcikge1xuICAgICAgICAvL3dlIGhhdmUgc29tZSBydWxlcyB0byBmb2xsb3cgaGVyZSBcbiAgICAgICAgLy8xLiBhIG5ldyBtYW5pZmVzdCBjYW5ub3QgYmUgY3JlYXRlZCBpZiB0aGUgcHJldmlvdXMgbWFuaWZlc3QgaXMgbm90IGNsb3NlZCBcbiAgICAgICAgLy9jaGVjayBmb3Igb3BlbiBtYW5pZmVzdCBmaXJzdCBcbiAgICAgICAgdmFyIHNydiA9IHRoaXM7IFxuICAgICAgICByZXR1cm4gbmV3IFByb21pc2UoKHJlc29sdmUsIHJlamVjdCkgPT4ge1xuICAgICAgICAgICAgdGhpcy5nZXRPcGVuTWFuaWZlc3QodHlwZS5pZCkudGhlbigob3BlbkNvdW50KSA9PiB7XG4gICAgICAgICAgICAgIFxuICAgICAgICAgICAgICAgIGNvbnNvbGUubG9nKHR5cGUpOyBcbiAgICAgICAgICAgICAgICAvLyBpZiAob3BlbkNvdW50PjApIHtcbiAgICAgICAgICAgICAgICAvLyAgICAgLy93ZSBjYW4ndCBhZGQgdGhlIG1hbmlmZXN0IHJlamVjdCBcbiAgICAgICAgICAgICAgICAvLyAgICAgcmVqZWN0KHtcbiAgICAgICAgICAgICAgICAvLyAgICAgICAgIFwibWVzc2FnZVwiOiBcIlRoZXJlIGlzIGFuIG9wZW4gbWFuaWZlc3QgUGxlYXNlIGNsb3NlIGl0IGJlZm9yZSBjcmVhdGluZyBhIG5ldyBtYW5pZmVzdC5cIlxuICAgICAgICAgICAgICAgIC8vICAgICB9KTtcblxuICAgICAgICAgICAgICAgIC8vIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgICAgIHRoaXMucmVkaXNDbGllbnQubXVsdGkoKVxuICAgICAgICAgICAgICAgICAgICAgICAgLmluY3IoTUlEX0NPVU5URVIpXG4gICAgICAgICAgICAgICAgICAgICAgICAuZXhlYygoZXJyLCByZXNwKSA9PiB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgY29uc29sZS5sb2cocmVzcCk7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgdmFyIG1hbmlmZXN0ID0ge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBtaWQ6IHJlc3BbMF0sXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHRpdGxlOiB0eXBlLnByZWZpeCtyZXNwWzBdLFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBkYXRlQ3JlYXRlZDogbW9tZW50KCkudW5peCgpLC8vZm9ybWF0KFwiWVlZWS1NTS1ERFwiKSxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgbXR5cGVJZDogdHlwZS5pZCxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgc3RhZ2VJZDogbWFuaWZlc3RTdGFnZXMub3Blbi5pZCxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgc3RhZ2U6IG1hbmlmZXN0U3RhZ2VzLm9wZW4udGl0bGUsXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGNyZWF0ZWRCeTogdXNlclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIH07XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgY29uc29sZS5sb2cobWFuaWZlc3QpXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgc3J2LnJlZGlzQ2xpZW50Lm11bHRpKClcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgLmhtc2V0KE1JRF9QUkVGSVggKyBtYW5pZmVzdC5taWQsIG1hbmlmZXN0KVxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAuc2FkZChPUEVOX01BTklGRVNULCBtYW5pZmVzdC5taWQpXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIC5leGVjKChlcnIsIHJlc3VsdHMpID0+IHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHNydi5teVNlYXJjaC5hZGQobWFuaWZlc3QubWlkLG1hbmlmZXN0LChzZXJyLHJlc3UpPT57XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgaWYgKHNlcnIpXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGNvbnNvbGUubG9nKHNlcnIpXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgY29uc29sZS5sb2cocmVzdSlcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgLy9hbHNvIGFkZCB0byB0aGUgaW5kZXggaGVyZSBvbmUgdGltZSBcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGlmIChlcnIpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICByZWplY3QoZXJyKTtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgcmVzb2x2ZShtYW5pZmVzdClcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICAgICAgICAgICAgICB9KTtcbiAgICAgICAgICAgICAgICAvL31cblxuICAgICAgICAgICAgfSkuY2F0Y2goKGVycik9PntcbiAgICAgICAgICAgICAgICBjb25zb2xlLmxvZyhcImVyciBkZXRlY3RlZFwiKTsgXG4gICAgICAgICAgICAgICAgY29uc29sZS5sb2coZXJyKTtcbiAgICAgICAgICAgIH0pO1xuXG4gICAgICAgIH0pO1xuXG4gICAgfVxuICAgIGNoYW5nZVN0YWdlKG1pZCwgc3RhZ2VzKSB7XG4gICAgICAgIHJldHVybiBuZXcgUHJvbWlzZSgocmVzb2x2ZSwgcmVqZWN0KSA9PiB7XG4gICAgICAgICAgICBcbiAgICAgICAgICAgIGxyZWRpcy5jbGllbnQuaG1zZXQoTUlEX1BSRUZJWCttaWQsXCJzdGFnZUlkXCIsc3RhZ2VzLChlcnIscmVzdWx0KT0+e1xuICAgICAgICAgICAgICAgIHZhciBzdGFnZSA9IHRoaXMuZ2V0U3RhZ2VCeUlkKHN0YWdlcyk7IFxuICAgICAgICAgICAgICAgIGNvbnNvbGUubG9nKCdsb29rZWQgdXAgdGhlIHN0YWdlICcrc3RhZ2UudGl0bGUpO1xuICAgICAgICAgICAgICAgIGxyZWRpcy5jbGllbnQuaG1zZXQoTUlEX1BSRUZJWCttaWQsXCJzdGFnZVwiLHN0YWdlLnRpdGxlLChlcnIscmVzdWx0Mik9Pnt9KTsgXG4gICAgICAgICAgICAgICAgbHJlZGlzLmhnZXRhbGwoTUlEX1BSRUZJWCttaWQpLnRoZW4oKHVNYW5pZmVzdCk9PntcbiAgICAgICAgICAgICAgICAgICAgdGhpcy5teVNlYXJjaC5kZWxEb2N1bWVudChcImluZGV4Om1hbmlmZXN0XCIsbWlkLChlcnIscmVzdWx0MSk9PntcbiAgICAgICAgICAgICAgICAgICAgICAgIGNvbnNvbGUubG9nKCdjaGFuZ2luZyBkb2N1bWVudCcpO1xuICAgICAgICAgICAgICAgICAgICAgICAgY29uc29sZS5sb2coZXJyKTtcbiAgICAgICAgICAgICAgICAgICAgICAgIGNvbnNvbGUubG9nKHJlc3VsdDEpIFxuICAgICAgICAgICAgICAgICAgICAgICAgdGhpcy5teVNlYXJjaC5hZGQodU1hbmlmZXN0Lm1pZCx1TWFuaWZlc3QpOyBcbiAgICAgICAgICAgICAgICAgICAgICAgIHJlc29sdmUocmVzdWx0KTsgXG4gICAgICAgICAgICAgICAgICAgIH0pOyBcbiAgICAgICAgICAgICAgICAgICBcbiAgICAgICAgICAgICAgICB9KTtcbiAgICAgICAgICAgICAgIFxuICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICAvL3dlIGFsc28gbmVlZCB0byB0byB1cGRhdGUgdGhlIGRvY3VtZW50IFxuXG4gICAgICAgICAgICBcbiAgICAgICAgfSlcbiAgICB9XG4gICAgc2hpcE1hbmlmZXN0KG1pZCxhd2IsdXNlcil7XG4gICAgICAgIHJldHVybiBuZXcgUHJvbWlzZSgocmVzb2x2ZSxyZWplY3QpPT57XG4gICAgICAgICAgICBscmVkaXMuaG1zZXQoTUlEX1BSRUZJWCttaWQsIHthd2I6YXdiLHNoaXBEYXRlOm1vbWVudCgpLmZvcm1hdChcIllZWVktTU0tRERcIiksc2hpcHBlZEJ5OnVzZXJ9KS50aGVuKChzcmVzdWx0KT0+e1xuICAgICAgICAgICAgICAgIGNvbnNvbGUubG9nKHNyZXN1bHQpO1xuICAgICAgICAgICAgICAgIHRoaXMuY2hhbmdlU3RhZ2UobWlkLDMpLnRoZW4oKHJlc3UpPT57XG4gICAgICAgICAgICAgICAgICAgIHJlc29sdmUoc3Jlc3VsdCk7XG4gICAgICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICAgICAgXG4gICAgICAgICAgICB9KVxuICAgICAgICB9KVxuICAgIH1cbiAgICBsaXN0TWFuaWZlc3QodHlwZSxwYWdlLHBhZ2VTaXplKXtcbiAgICAgICAgcmV0dXJuIG5ldyBQcm9taXNlKChyZXNvbHZlLHJlamVjdCk9PntcbiAgICAgICAgICAgIHZhciBvZmZzZXRWYWwgPSAocGFnZSAtIDEpICogcGFnZVNpemU7XG4gICAgICAgICAgICBjb25zb2xlLmxvZygnb2Zmc2V0ICcrb2Zmc2V0VmFsKTtcbiAgICAgICAgICAgIFxuICAgICAgICAgICAgdGhpcy5teVNlYXJjaC5zZWFyY2goXCJAbXR5cGVJZDpcIit0eXBlLCB7XG4gICAgICAgICAgICAgICAgb2Zmc2V0Om9mZnNldFZhbCxcbiAgICAgICAgICAgICAgICBudW1iZXJPZlJlc3VsdHM6IHBhZ2VTaXplLFxuICAgICAgICAgICAgICAgIHNvcnRCeTogXCJtaWRcIixcbiAgICAgICAgICAgICAgICBkaXI6IFwiREVTQ1wiXG4gICAgICAgICAgICB9LCAocjEsIGRhdGEpID0+IHtcbiAgICAgICAgICAgICAgICBpZiAocjEpXG4gICAgICAgICAgICAgICAgICAgIGNvbnNvbGUubG9nKHIxKTtcbiAgICAgICAgICAgICAgICAgdmFyIG1hbmlmZXN0TGlzdCA9IFtdOyBcbiAgICAgICAgICAgICAgICAgZGF0YS5yZXN1bHRzLmZvckVhY2gobWFuaWZlc3RSZXN1bHQgPT4ge1xuICAgICAgICAgICAgICAgICAgICBtYW5pZmVzdExpc3QucHVzaChtYW5pZmVzdFJlc3VsdC5kb2MpOyAgICBcbiAgICAgICAgICAgICAgICAgICAgXG4gICAgICAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgICAgICAvL2NvbnNvbGUubG9nKG1hbmlmZXN0TGlzdCk7XG4gICAgICAgICAgICAgICAgIHZhciBwYWdlZERhdGEgPSB7XG4gICAgICAgICAgICAgICAgICAgIG1hbmlmZXN0czptYW5pZmVzdExpc3QsXG4gICAgICAgICAgICAgICAgICAgIHRvdGFsUmVzdWx0cyA6IGRhdGEudG90YWxSZXN1bHRzLFxuICAgICAgICAgICAgICAgICAgICBwYWdlIDogcGFnZSxcbiAgICAgICAgICAgICAgICAgICAgcGFnZVNpemU6IHBhZ2VTaXplLCBcbiAgICAgICAgICAgICAgICAgICAgVG90YWxQYWdlcyA6IChkYXRhLnRvdGFsUmVzdWx0cy9wYWdlU2l6ZSlcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgcmVzb2x2ZShwYWdlZERhdGEpO1xuICAgICAgICAgICAgICAgIGNvbnNvbGUubG9nKG1hbmlmZXN0TGlzdCk7XG4gICAgICAgICAgICAgICAgXG4gICAgICAgICAgICB9KTtcbiAgICAgICAgfSk7XG4gICAgfVxuICAgIGdldE1hbmlmZXN0KG1pZCkge1xuICAgICAgICByZXR1cm4gbHJlZGlzLmhnZXRhbGwoTUlEX1BSRUZJWCttaWQpXG4gICAgfVxuICAgIGRlbGV0ZU1hbmlmZXN0KG1pZCl7XG4gICAgICAgcmV0dXJuIG5ldyBQcm9taXNlKChyZXNvbHZlLHJlamVjdCk9PntcbiAgICAgICAgbHJlZGlzLmNsaWVudC5kZWwoTUlEX1BSRUZJWCttaWQsKGVycixyZXNwKT0+e1xuICAgICAgICAgICAgY29uc29sZS5sb2cocmVzcCk7IFxuICAgICAgICAgICAgdGhpcy5teVNlYXJjaC5kZWxEb2N1bWVudChcImluZGV4Om1hbmlmZXN0XCIsbWlkLChlcnIscmVzdWx0KT0+e1xuICAgICAgICAgICAgICAgIGNvbnNvbGUubG9nKFwiZGVsZXRpbmcgbWlkXCIpOyBcbiAgICAgICAgICAgICAgICBjb25zb2xlLmxvZyhlcnIpOyBcbiAgICAgICAgICAgICAgICBjb25zb2xlLmxvZyhyZXN1bHQpO1xuICAgICAgICAgICAgfSk7IFxuICAgICAgICAgICAgbHJlZGlzLnNyZW0oT1BFTl9NQU5JRkVTVCxtaWQpO1xuICAgICAgICAgICAgcmVzb2x2ZSh7ZGVsZXRlZDp0cnVlfSkgICAgXG4gICAgICAgIH0pXG5cbiAgICAgICB9KTsgXG4gICAgICAgIFxuICAgICAgICBcbiAgICB9XG4gICAgZ2V0TWFuaWZlc3RQcm9jZXNzaW5nKCl7XG4gICAgICAgIHZhciBtc2VhcmNoID0gdGhpcy5teVNlYXJjaDsgXG4gICAgICAgIHJldHVybiBuZXcgUHJvbWlzZSgocmVzb2x2ZSxyZWplY3QpPT57XG4gICAgICAgICAgICB2YXIgb2Zmc2V0VmFsID0wO1xuICAgICAgICAgICAgdmFyIHBhZ2VTaXplID0gMjA7IFxuICAgICAgICAgICAgY29uc29sZS5sb2coJ29mZnNldCAnK29mZnNldFZhbCk7XG4gICAgICAgICAgICB2YXIgbWFuaWZlc3RMaXN0ID0gW107IFxuICAgICAgICAgICAgbXNlYXJjaC5zZWFyY2goYEBzdGFnZUlkOlszIDRdYCwge1xuICAgICAgICAgICAgICAgIG9mZnNldDpvZmZzZXRWYWwsXG4gICAgICAgICAgICAgICAgbnVtYmVyT2ZSZXN1bHRzOiBwYWdlU2l6ZSxcbiAgICAgICAgICAgICAgICBzb3J0Qnk6IFwibWlkXCIsXG4gICAgICAgICAgICAgICAgZGlyOiBcIkRFU0NcIlxuICAgICAgICAgICAgfSwgKHIxLCBkYXRhKSA9PiB7XG4gICAgICAgICAgICAgICAgaWYgKHIxKVxuICAgICAgICAgICAgICAgICAgICBjb25zb2xlLmxvZyhyMSk7XG4gICAgICAgICAgICAgICAgIFxuICAgICAgICAgICAgICAgICBkYXRhLnJlc3VsdHMuZm9yRWFjaChtYW5pZmVzdFJlc3VsdCA9PiB7XG4gICAgICAgICAgICAgICAgICAgIG1hbmlmZXN0TGlzdC5wdXNoKG1hbmlmZXN0UmVzdWx0LmRvYyk7ICAgIFxuICAgICAgICAgICAgICAgICAgICBcbiAgICAgICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICAgICAgIC8vY29uc29sZS5sb2cobWFuaWZlc3RMaXN0KTtcbiAgICAgICAgICAgICAgICAgdmFyIHBhZ2VkRGF0YSA9IHtcbiAgICAgICAgICAgICAgICAgICAgbWFuaWZlc3RzOm1hbmlmZXN0TGlzdCxcbiAgICAgICAgICAgICAgICAgICAgdG90YWxSZXN1bHRzIDogZGF0YS50b3RhbFJlc3VsdHMsXG4gICAgICAgICAgICAgICAgICAgIHBhZ2UgOiAxLFxuICAgICAgICAgICAgICAgICAgICBwYWdlU2l6ZTogcGFnZVNpemUsIFxuICAgICAgICAgICAgICAgICAgICBUb3RhbFBhZ2VzIDogKGRhdGEudG90YWxSZXN1bHRzL3BhZ2VTaXplKVxuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICByZXNvbHZlKHBhZ2VkRGF0YSk7XG4gICAgICAgICAgICAgICAgY29uc29sZS5sb2cobWFuaWZlc3RMaXN0KTtcbiAgICAgICAgICAgICAgICBcbiAgICAgICAgICAgIH0pO1xuICAgICAgICB9KTtcbiAgICB9XG4gICAgXG4gICAgZ2V0VHlwZWJ5SWQgKGlkKXtcbiAgICAgICAgaWYgKGlkID09IDEpe1xuICAgICAgICAgICAgcmV0dXJuIG1hbmlmZXN0VHlwZXMuYWlyO1xuICAgICAgICB9XG4gICAgICAgIGlmIChpZCA9PSAyKXtcbiAgICAgICAgICAgIHJldHVybiBtYW5pZmVzdFR5cGVzLm9jZWFuO1xuICAgICAgICB9XG4gICAgICAgIGlmIChpZCA9PSAzKXtcbiAgICAgICAgICAgIHJldHVybiBtYW5pZmVzdFR5cGVzLmhhem1hdDtcbiAgICAgICAgfVxuICAgICAgICByZXR1cm4gbWFuaWZlc3RUeXBlcy5haXI7IFxuICAgIH1cbiAgICBnZXRTdGFnZUJ5SWQoaWQpe1xuICAgICAgICBpZiAoaWQgPT0gMSl7XG4gICAgICAgICAgICByZXR1cm4gbWFuaWZlc3RTdGFnZXMub3BlbjtcbiAgICAgICAgfVxuICAgICAgICBpZiAoaWQgPT0gMil7XG4gICAgICAgICAgICByZXR1cm4gbWFuaWZlc3RTdGFnZXMuY2xvc2VkO1xuICAgICAgICB9XG4gICAgICAgIGlmIChpZCA9PSAzKXtcbiAgICAgICAgICAgIHJldHVybiBtYW5pZmVzdFN0YWdlcy5zaGlwcGVkO1xuICAgICAgICB9XG4gICAgICAgIGlmIChpZCA9PSA0KXtcbiAgICAgICAgICAgIHJldHVybiBtYW5pZmVzdFN0YWdlcy52ZXJpZmllZDtcbiAgICAgICAgfVxuICAgICAgICByZXR1cm4gbWFuaWZlc3RTdGFnZXMub3BlbjsgXG4gICAgfVxuXG4gICAgLy8gYWRkUGFja2FnZVRvTWFuaWZlc3QocGFja2FnZUJhckNvZGUsIG1pZCl7XG4gICAgLy8gICAgIC8vd2Ugc2hvdWxkIGp1c3QgdXBkYXRlIHRoZSBwYWNrYWdlIGluIHRoZSBpbmRleC4gXG4gICAgLy8gICAgIHJldHVybiBuZXcgUHJvbWlzZSgocmVzb2x2ZSxyZWplY3QpPT57XG4gICAgLy8gICAgICAgICBkYXRhQ29udGV4dC5yZWRpc0NsaWVudC5zYWRkKE1JRF9QQUNLQUdFUyttaWQscGFja2FnZUJhckNvZGUsKGVycixyZXN1bHQpPT57XG4gICAgLy8gICAgICAgICAgICAgcmVzb2x2ZSh7YWRkZWQ6dHJ1ZX0pXG4gICAgLy8gICAgICAgICB9KTsgXG4gICAgLy8gICAgIH0pXG4gICAgLy8gfVxuICAgIC8vIHJlbW92ZVBhY2thZ2VGcm9tTWFuaWZlc3QocGFja2FnZUJhckNvZGUsbWlkKXtcbiAgICAvLyAgICAgcmV0dXJuIG5ldyBQcm9taXNlKChyZXNvbHZlLHJlamVjdCk9PntcbiAgICAvLyAgICAgICAgIGRhdGFDb250ZXh0LnJlZGlzQ2xpZW50LnNyZW0oTUlEX1BBQ0tBR0VTX21pZCxwYWNrYWdlQmFyQ29kZSwoZXJyLHJlc3VsdCk9PntcbiAgICAvLyAgICAgICAgICAgICByZXNvbHZlKHtyZW1vdmU6dHJ1ZX0pXG4gICAgLy8gICAgICAgICB9KVxuICAgIC8vICAgICB9KVxuICAgIC8vIH1cbiAgICAvLyBnZXRNYW5pZmVzdFBhY2thZ2VzKG1pZCl7XG4gICAgLy8gICAgIHJldHVybiBuZXcgUHJvbWlzZSgocmVzb2x2ZSxyZWplY3QpPT57XG4gICAgLy8gICAgICAgICBkYXRhQ29udGV4dC5yZWRpc0NsaWVudC5zbWVtYmVycyhNSURfUEFDS0FHRVMrbWlkLChlcnIpKVxuICAgIC8vICAgICB9KVxuICAgIC8vIH1cbn0iXX0=
