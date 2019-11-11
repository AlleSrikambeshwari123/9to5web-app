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
                lredis.hmset(MID_PREFIX + mid, { shipDate: moment().format("YYYY-MM-DD"), shippedBy: user }).then(function (sresult) {
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
                            manifest.plane = planeInfo.plane;
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
//# sourceMappingURL=data:application/json;charset=utf8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIlJlZGlzU2VydmljZXMvTWFuaWZlc3RTZXJ2aWNlLmVzNiJdLCJuYW1lcyI6WyJyZWRpcyIsInJlcXVpcmUiLCJscmVkaXMiLCJtb21lbnQiLCJkYXRhQ29udGV4dCIsInJlZGlzU2VhcmNoIiwiTUlEX0NPVU5URVIiLCJNSURfUFJFRklYIiwiTUlEX0lOREVYIiwiT1BFTl9NQU5JRkVTVCIsIkNMT1NFRF9NQU5JRkVTVCIsIlNISVBQRURfTUFOSUZFU1QiLCJNSURfUEFDS0FHRVMiLCJWRVJJRklFRF9NQU5JRkVTVCIsIlBsYW5lU2VydmljZSIsInBsYW5lU2VydmljZSIsIm1hbmlmZXN0VHlwZXMiLCJhaXIiLCJpZCIsInRpdGxlIiwicHJlZml4Iiwib2NlYW4iLCJoYXptYXQiLCJtYW5pZmVzdFN0YWdlcyIsIm9wZW4iLCJjbG9zZWQiLCJzaGlwcGVkIiwidmVyaWZpZWQiLCJNYW5pZmVzdFNlcnZpY2UiLCJyZWRpc0NsaWVudCIsImNsaWVudCIsIm10eXBlcyIsIm1zdGFnZXMiLCJjaGVja1NldHVwIiwic2V0dXBJbmRleCIsIm15U2VhcmNoIiwiY2xpZW50T3B0aW9ucyIsInNlYXJjaENsaWVudERldGFpbHMiLCJleGlzdHMiLCJlcnIiLCJyZXMiLCJzZXQiLCJteXR5cGVzIiwiZGV0YWlscyIsIlByb21pc2UiLCJyZXNvbHZlIiwicmVqZWN0IiwiY29uc29sZSIsImxvZyIsInVwZGF0ZSIsInJlc3VsdCIsImhtc2V0IiwidXBkYXRlZCIsInR5cGVJZCIsInNlYXJjaCIsIm9mZnNldCIsIm51bWJlck9mUmVzdWx0cyIsInNvcnRCeSIsImRpciIsInIxIiwiZGF0YSIsInRvdGFsUmVzdWx0cyIsIm1hbmlmZXN0TGlzdCIsImFsbCIsInJlc3VsdHMiLCJtYXAiLCJsaXN0Q29tcGFydG1lbnRzIiwibWFuIiwiZG9jIiwicGxhbmVJZCIsInRoZW4iLCJwbGFuZVJlc3Vsc3QiLCJpIiwibGVuZ3RoIiwibSIsIm1hbmlmZXN0IiwicGxhbmUiLCJtaWQiLCJ0YWlsTnVtIiwic2hpcERhdGUiLCJ1bml4IiwiZm9ybWF0IiwicHVzaCIsIm1hbmlmZXN0cyIsImNhdGNoIiwiZXJyYWxsIiwidHlwZSIsInVzZXIiLCJzcnYiLCJnZXRPcGVuTWFuaWZlc3QiLCJvcGVuQ291bnQiLCJtdWx0aSIsImluY3IiLCJleGVjIiwicmVzcCIsImRhdGVDcmVhdGVkIiwibXR5cGVJZCIsInN0YWdlSWQiLCJzdGFnZSIsImNyZWF0ZWRCeSIsInNhZGQiLCJhZGQiLCJzZXJyIiwicmVzdSIsInN0YWdlcyIsImdldFN0YWdlQnlJZCIsInJlc3VsdDIiLCJoZ2V0YWxsIiwidU1hbmlmZXN0IiwiZGVsRG9jdW1lbnQiLCJyZXN1bHQxIiwiYXdiIiwic2hpcHBlZEJ5Iiwic3Jlc3VsdCIsImNoYW5nZVN0YWdlIiwicGFnZSIsInBhZ2VTaXplIiwib2Zmc2V0VmFsIiwiZm9yRWFjaCIsIm1hbmlmZXN0UmVzdWx0IiwicGFnZWREYXRhIiwiVG90YWxQYWdlcyIsInBsYW5lSW5mbyIsImRlbCIsInNyZW0iLCJkZWxldGVkIiwibXNlYXJjaCJdLCJtYXBwaW5ncyI6Ijs7Ozs7Ozs7O0FBQUE7Ozs7QUFFQSxJQUFJQSxRQUFRQyxRQUFRLE9BQVIsQ0FBWjtBQUNBLElBQUlDLFNBQVNELFFBQVEsZUFBUixDQUFiO0FBQ0EsSUFBSUUsU0FBU0YsUUFBUSxRQUFSLENBQWI7QUFDQSxJQUFJRyxjQUFjSCxRQUFRLGVBQVIsQ0FBbEI7QUFDQSxJQUFJSSxjQUFjSixRQUFRLHFCQUFSLENBQWxCO0FBQ0EsSUFBTUssY0FBYyxtQkFBcEI7QUFDQSxJQUFNQyxhQUFhLFdBQW5CO0FBQ0EsSUFBTUMsWUFBWSxnQkFBbEI7QUFDQSxJQUFNQyxnQkFBZ0IsZUFBdEI7QUFDQSxJQUFNQyxrQkFBa0IsaUJBQXhCO0FBQ0EsSUFBTUMsbUJBQW1CLGtCQUF6QjtBQUNBLElBQU1DLGVBQWUsb0JBQXJCO0FBQ0EsSUFBTUMsb0JBQW9CLG1CQUExQixDLENBQStDO0FBQy9DLElBQUlDLGVBQWViLFFBQVEsZ0JBQVIs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RWJELHNDQUFlRCxLQUFLQyxZQUZQO0FBR2JzRCw4QkFBTyxDQUhNO0FBSWJDLGtDQUFVQSxRQUpHO0FBS2JLLG9DQUFjN0QsS0FBS0MsWUFBTCxHQUFrQnVEO0FBTG5CLHFCQUFoQjtBQU9EdkUsNEJBQVEyRSxTQUFSO0FBQ0F6RSw0QkFBUUMsR0FBUixDQUFZYyxZQUFaO0FBRUgsaUJBeEJEO0FBeUJILGFBOUJNLENBQVA7QUErQkg7OztvQ0FFWTVDLEUsRUFBRztBQUNaLGdCQUFJQSxNQUFNLENBQVYsRUFBWTtBQUNSLHVCQUFPRixjQUFjQyxHQUFyQjtBQUNIO0FBQ0QsZ0JBQUlDLE1BQU0sQ0FBVixFQUFZO0FBQ1IsdUJBQU9GLGNBQWNLLEtBQXJCO0FBQ0g7QUFDRCxnQkFBSUgsTUFBTSxDQUFWLEVBQVk7QUFDUix1QkFBT0YsY0FBY00sTUFBckI7QUFDSDtBQUNELG1CQUFPTixjQUFjQyxHQUFyQjtBQUNIOzs7cUNBQ1lDLEUsRUFBRztBQUNaLGdCQUFJQSxNQUFNLENBQVYsRUFBWTtBQUNSLHVCQUFPSyxlQUFlQyxJQUF0QjtBQUNIO0FBQ0QsZ0JBQUlOLE1BQU0sQ0FBVixFQUFZO0FBQ1IsdUJBQU9LLGVBQWVFLE1BQXRCO0FBQ0g7QUFDRCxnQkFBSVAsTUFBTSxDQUFWLEVBQVk7QUFDUix1QkFBT0ssZUFBZUcsT0FBdEI7QUFDSDtBQUNELGdCQUFJUixNQUFNLENBQVYsRUFBWTtBQUNSLHVCQUFPSyxlQUFlSSxRQUF0QjtBQUNIO0FBQ0QsbUJBQU9KLGVBQWVDLElBQXRCO0FBQ0giLCJmaWxlIjoiUmVkaXNTZXJ2aWNlcy9NYW5pZmVzdFNlcnZpY2UuanMiLCJzb3VyY2VzQ29udGVudCI6WyJpbXBvcnQgeyBwcm9taXNlcyB9IGZyb20gJ2ZzJztcblxudmFyIHJlZGlzID0gcmVxdWlyZSgncmVkaXMnKTtcbnZhciBscmVkaXMgPSByZXF1aXJlKCcuL3JlZGlzLWxvY2FsJyk7XG52YXIgbW9tZW50ID0gcmVxdWlyZSgnbW9tZW50Jyk7XG52YXIgZGF0YUNvbnRleHQgPSByZXF1aXJlKCcuL2RhdGFDb250ZXh0JylcbnZhciByZWRpc1NlYXJjaCA9IHJlcXVpcmUoJy4uL3JlZGlzZWFyY2hjbGllbnQnKTtcbmNvbnN0IE1JRF9DT1VOVEVSID0gXCJnbG9iYWw6bWlkQ291bnRlclwiO1xuY29uc3QgTUlEX1BSRUZJWCA9IFwibWFuaWZlc3Q6XCI7XG5jb25zdCBNSURfSU5ERVggPSBcImluZGV4Om1hbmlmZXN0XCI7XG5jb25zdCBPUEVOX01BTklGRVNUID0gXCJtYW5pZmVzdDpvcGVuXCI7XG5jb25zdCBDTE9TRURfTUFOSUZFU1QgPSBcIm1hbmlmZXN0OmNsb3NlZFwiXG5jb25zdCBTSElQUEVEX01BTklGRVNUID0gXCJtYW5pZmVzdDpzaGlwcGVkXCJcbmNvbnN0IE1JRF9QQUNLQUdFUyA9IFwibWFuaWZlc3Q6cGFja2FnZXM6XCJcbmNvbnN0IFZFUklGSUVEX01BTklGRVNUID0gXCJtYW5pZmVzdDp2ZXJpZmllZFwiOyAvLyBtYW5pZmVzdCB0aGF0IGhhdmUgZHV0aWVzIHZlcmlmaWVkXG52YXIgUGxhbmVTZXJ2aWNlID0gcmVxdWlyZSgnLi9QbGFuZVNlcnZpY2UnKS5QbGFuZVNlcnZpY2U7IFxudmFyIHBsYW5lU2VydmljZSA9IG5ldyBQbGFuZVNlcnZpY2UoKTsgXG52YXIgbWFuaWZlc3RUeXBlcyA9IHtcbiAgICBhaXI6IHtcbiAgICAgICAgaWQ6IDEsXG4gICAgICAgIHRpdGxlOiBcIkFpciBDYXJnb1wiLFxuICAgICAgICBwcmVmaXg6IFwiTS1cIlxuICAgIH0sXG4gICAgb2NlYW46IHtcbiAgICAgICAgaWQ6IDIsXG4gICAgICAgIHRpdGxlOiBcIk9jZWFuXCIsXG4gICAgICAgIHByZWZpeDogXCJTLVwiXG4gICAgfSxcbiAgICBoYXptYXQ6IHtcbiAgICAgICAgaWQ6IDMsXG4gICAgICAgIHRpdGxlOiBcIkhBWk1BVFwiLFxuICAgICAgICBwcmVmaXg6IFwiSC1cIlxuICAgIH1cbn1cbnZhciBtYW5pZmVzdFN0YWdlcyA9IHtcbiAgICBvcGVuOiB7XG4gICAgICAgIGlkOiAxLFxuICAgICAgICB0aXRsZTogJ09wZW4nXG4gICAgfSxcbiAgICBjbG9zZWQ6IHtcbiAgICAgICAgaWQ6IDIsXG4gICAgICAgIHRpdGxlOiAnQ2xvc2VkJ1xuICAgIH0sXG4gICAgc2hpcHBlZDoge1xuICAgICAgICBpZDogMyxcbiAgICAgICAgdGl0bGU6ICdTaGlwcGVkJ1xuICAgIH0sXG4gICAgdmVyaWZpZWQ6IHtcbiAgICAgICAgaWQ6IDQsXG4gICAgICAgIHRpdGxlOiAnVmVyaWZpZWQnXG4gICAgfVxuXG59XG5cbmV4cG9ydCBjbGFzcyBNYW5pZmVzdFNlcnZpY2Uge1xuXG4gICAgY29uc3RydWN0b3IoKSB7ICAgICAgICBcbiAgICAgICAgdGhpcy5yZWRpc0NsaWVudCA9IGxyZWRpcy5jbGllbnQ7XG4gICAgICAgIHRoaXMubXR5cGVzID0gbWFuaWZlc3RUeXBlcztcbiAgICAgICAgdGhpcy5tc3RhZ2VzID0gbWFuaWZlc3RTdGFnZXM7XG4gICAgICAgIC8vY2hlY2sgdG8gZW5zdXJlIHdlIGhhdmUgdGhlIG1hbmlmZXN0IGNvdW50ZXIgXG4gICAgICAgIHRoaXMuY2hlY2tTZXR1cCgpOyBcbiAgICAgICAgdGhpcy5zZXR1cEluZGV4KClcbiAgICB9XG4gICAgc2V0dXBJbmRleCgpe1xuICAgICAgICB0aGlzLm15U2VhcmNoID0gcmVkaXNTZWFyY2gocmVkaXMsICdpbmRleDptYW5pZmVzdCcsIHtcbiAgICAgICAgICAgIGNsaWVudE9wdGlvbnM6bHJlZGlzLnNlYXJjaENsaWVudERldGFpbHNcbiAgICAgICAgfSk7XG4gICAgfVxuICAgIGNoZWNrU2V0dXAoKXtcbiAgICAgICAgdGhpcy5yZWRpc0NsaWVudC5leGlzdHMoTUlEX0NPVU5URVIsIChlcnIsIHJlcykgPT4ge1xuICAgICAgICAgICAgaWYgKHJlcyA9PSAwKSB7XG4gICAgICAgICAgICAgICAgLy9jcmVhdGUgdGhlIG1hbmlmZXN0IFxuICAgICAgICAgICAgICAgIGxyZWRpcy5zZXQoTUlEX0NPVU5URVIsIDEwMCk7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBcbiAgICAgICAgfSk7XG4gICAgfVxuXG4gICAgZ2V0VHlwZXMoKSB7XG4gICAgICAgIHJldHVybiB0aGlzLm15dHlwZXNcbiAgICB9XG4gICAgZ2V0U3RhZ2VzKCkge1xuICAgICAgICByZXR1cm4gdGhpcy5tYW5pZmVzdFN0YWdlcztcbiAgICB9XG4gICAgdXBkYXRlTWFuaWZlc3REZXRhaWxzKGRldGFpbHMpe1xuICAgICAgICByZXR1cm4gbmV3IFByb21pc2UoKHJlc29sdmUscmVqZWN0KT0+e1xuICAgICAgICAgICAgY29uc29sZS5sb2coJ3NhdmluZyBkZXRhaWxzJywgZGV0YWlscyk7IFxuICAgICAgICAgICAgdGhpcy5teVNlYXJjaC51cGRhdGUoZGV0YWlscy5pZCxkZXRhaWxzLChlcnIscmVzdWx0KT0+e1xuICAgICAgICAgICAgICAgIGlmIChlcnIpXG4gICAgICAgICAgICAgICAgICAgIGNvbnNvbGUubG9nKGVycik7IFxuICAgICAgICAgICAgICAgIGxyZWRpcy5obXNldChNSURfUFJFRklYK2RldGFpbHMuaWQsZGV0YWlscylcbiAgICAgICAgICAgICAgICByZXNvbHZlKHt1cGRhdGVkOnRydWV9KVxuICAgICAgICAgICAgfSlcbiAgICAgICAgfSlcbiAgICB9XG4gICAgZ2V0T3Blbk1hbmlmZXN0KHR5cGVJZCl7XG4gICAgICAgIFxuICAgICAgICByZXR1cm4gbmV3IFByb21pc2UoKHJlc29sdmUscmVqZWN0KT0+e1xuICAgICAgICAgICBjb25zb2xlLmxvZyggYEBzdGFnZUlkOlske3R5cGVJZH0gJHt0eXBlSWR9XSBAbXR5cGVJZDoke3R5cGVJZH1gKTtcbiAgICAgICAgICAgIHRoaXMubXlTZWFyY2guc2VhcmNoKGBAc3RhZ2VJZDpbMSAxXSBAbXR5cGVJZDoke3R5cGVJZH1gLCB7XG4gICAgICAgICAgICAgICAgb2Zmc2V0OjAsXG4gICAgICAgICAgICAgICAgbnVtYmVyT2ZSZXN1bHRzOiAxMDAsXG4gICAgICAgICAgICAgICAgc29ydEJ5OiBcIm1pZFwiLFxuICAgICAgICAgICAgICAgIGRpcjogXCJERVNDXCJcbiAgICAgICAgICAgIH0sIChyMSwgZGF0YSkgPT4ge1xuICAgICAgICAgICAgICAgIGlmIChyMSlcbiAgICAgICAgICAgICAgICAge1xuICAgICAgICAgICAgICAgICAgICAgY29uc29sZS5sb2coJ3dlIGhhZCBhbiBlcnJvcicpXG4gICAgICAgICAgICAgICAgICAgIGNvbnNvbGUubG9nKHIxKTtcbiAgICAgICAgICAgICAgICAgICAgXG4gICAgICAgICAgICAgICAgIH0gICBcbiAgICAgICAgICAgICAgICAgY29uc29sZS5sb2coJ25vIGVycm9ycyBkZXRlY3RlZCBoZXJlIC4uLicpXG4gICAgICAgICAgICAgICAgIC8vY29uc29sZS5sb2cobWFuaWZlc3RMaXN0KTtcbiAgICAgICAgICAgICAgICAgY29uc29sZS5sb2coZGF0YSk7XG4gICAgICAgICAgICAgICAgXG4gICAgICAgICAgICAgICAgcmVzb2x2ZShkYXRhLnRvdGFsUmVzdWx0cyk7XG4gICAgICAgICAgICB9KTtcbiAgICAgICAgICAgIFxuICAgICAgICB9KTtcbiAgICAgICAgXG4gICAgfVxuICAgIGdldE9wZW5NYW5pZmVzdExpc3QodHlwZUlkKXtcbiAgICAgICAgXG4gICAgICAgIHJldHVybiBuZXcgUHJvbWlzZSgocmVzb2x2ZSxyZWplY3QpPT57XG4gICAgICAgICAgIGNvbnNvbGUubG9nKCBgQHN0YWdlSWQ6WyR7dHlwZUlkfSAke3R5cGVJZH1dIEBtdHlwZUlkOiR7dHlwZUlkfWApO1xuICAgICAgICAgICAgdGhpcy5teVNlYXJjaC5zZWFyY2goYEBzdGFnZUlkOlsxIDFdIEBtdHlwZUlkOiR7dHlwZUlkfWAsIHtcbiAgICAgICAgICAgICAgICBvZmZzZXQ6MCxcbiAgICAgICAgICAgICAgICBudW1iZXJPZlJlc3VsdHM6IDEwMCxcbiAgICAgICAgICAgICAgICBzb3J0Qnk6IFwibWlkXCIsXG4gICAgICAgICAgICAgICAgZGlyOiBcIkRFU0NcIlxuICAgICAgICAgICAgfSwgKHIxLCBkYXRhKSA9PiB7XG4gICAgICAgICAgICAgICAgaWYgKHIxKVxuICAgICAgICAgICAgICAgICB7XG4gICAgICAgICAgICAgICAgICAgICBjb25zb2xlLmxvZygnd2UgaGFkIGFuIGVycm9yJylcbiAgICAgICAgICAgICAgICAgICAgY29uc29sZS5sb2cocjEpO1xuICAgICAgICAgICAgICAgICAgICBcbiAgICAgICAgICAgICAgICAgfSAgIFxuICAgICAgICAgICAgICAgICBjb25zb2xlLmxvZygnbm8gZXJyb3JzIGRldGVjdGVkIGhlcmUgLi4uJylcbiAgICAgICAgICAgICAgICAgLy9jb25zb2xlLmxvZyhtYW5pZmVzdExpc3QpO1xuICAgICAgICAgICAgICAgICBjb25zb2xlLmxvZyhkYXRhKTtcbiAgICAgICAgICAgICAgICAgdmFyIG1hbmlmZXN0TGlzdCAgPSBbXTsgXG5cbiAgICAgICAgICAgICAgICAgICAgIFByb21pc2UuYWxsKGRhdGEucmVzdWx0cy5tYXAobWFuPT5wbGFuZVNlcnZpY2UubGlzdENvbXBhcnRtZW50cyhtYW4uZG9jLnBsYW5lSWQpKSkudGhlbihwbGFuZVJlc3Vsc3Q9PntcbiAgICAgICAgICAgICAgICAgICAgICAgICBjb25zb2xlLmxvZyhwbGFuZVJlc3Vsc3QpOyBcbiAgICAgICAgICAgICAgICAgICAgICAgICBmb3IgKGxldCBpID0gMDsgaSA8IHBsYW5lUmVzdWxzdC5sZW5ndGg7IGkrKykge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICB2YXIgbSA9IGRhdGEucmVzdWx0c1tpXTsgXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgIHZhciBtYW5pZmVzdCA9IHt9XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgIFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICBtYW5pZmVzdC5wbGFuZSA9IHBsYW5lUmVzdWxzdFtpXS5wbGFuZVxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICBtYW5pZmVzdC5taWQgPSBtLmRvYy5taWQ7IFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICBtYW5pZmVzdC50aXRsZSA9IG0uZG9jLnRpdGxlOyBcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgbWFuaWZlc3QudGFpbE51bSA9IG0uZG9jLnRhaWxOdW1cbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgLy9jb25zb2xlLmxvZyhtLmRvYy5mbGlnaHREYXRlLG1vbWVudC51bml4KG0uZG9jLmZsaWdodERhdGUpLmZvcm1hdChcIk1NTSBERCxZWVlZIGhoOm1tIEFcIikpXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgIGlmICghbS5kb2MudGFpbE51bSlcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgbS5kb2MudGFpbE51bSA9IFwiXCI7IFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICBpZiAoIW0uZG9jLnNoaXBEYXRlKXtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIG1hbmlmZXN0LnNoaXBEYXRlID0gXCJcIlxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgIGVsc2VcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgbWFuaWZlc3Quc2hpcERhdGUgPSBtb21lbnQudW5peChtLmRvYy5zaGlwRGF0ZSkuZm9ybWF0KFwiTU1NIERELFlZWVkgaGg6bW0gQVwiKTsgXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgIG1hbmlmZXN0TGlzdC5wdXNoKG1hbmlmZXN0KVxuICAgICAgICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgICAgICBcbiAgICAgICAgICAgICAgICAgICAgICAgICByZXNvbHZlKHttYW5pZmVzdHM6bWFuaWZlc3RMaXN0fSk7XG4gICAgICAgICAgICAgICBcbiAgICAgICAgICAgICAgICAgICAgXG4gICAgICAgICAgICAgICAgIH0pLmNhdGNoKGVycmFsbD0+e1xuICAgICAgICAgICAgICAgICAgICAgY29uc29sZS5sb2coZXJyYWxsKVxuICAgICAgICAgICAgICAgICB9KTtcbiAgICAgICAgICAgICAgICBcbiAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgXG4gICAgICAgIH0pO1xuICAgICAgICBcbiAgICB9XG4gICAgY3JlYXRlTmV3TWFuaWZlc3QodHlwZSwgdXNlcikge1xuICAgICAgICAvL3dlIGhhdmUgc29tZSBydWxlcyB0byBmb2xsb3cgaGVyZSBcbiAgICAgICAgLy8xLiBhIG5ldyBtYW5pZmVzdCBjYW5ub3QgYmUgY3JlYXRlZCBpZiB0aGUgcHJldmlvdXMgbWFuaWZlc3QgaXMgbm90IGNsb3NlZCBcbiAgICAgICAgLy9jaGVjayBmb3Igb3BlbiBtYW5pZmVzdCBmaXJzdCBcbiAgICAgICAgdmFyIHNydiA9IHRoaXM7IFxuICAgICAgICByZXR1cm4gbmV3IFByb21pc2UoKHJlc29sdmUsIHJlamVjdCkgPT4ge1xuICAgICAgICAgICAgdGhpcy5nZXRPcGVuTWFuaWZlc3QodHlwZS5pZCkudGhlbigob3BlbkNvdW50KSA9PiB7XG4gICAgICAgICAgICAgIFxuICAgICAgICAgICAgICAgIGNvbnNvbGUubG9nKHR5cGUpOyBcbiAgICAgICAgICAgICAgICAvLyBpZiAob3BlbkNvdW50PjApIHtcbiAgICAgICAgICAgICAgICAvLyAgICAgLy93ZSBjYW4ndCBhZGQgdGhlIG1hbmlmZXN0IHJlamVjdCBcbiAgICAgICAgICAgICAgICAvLyAgICAgcmVqZWN0KHtcbiAgICAgICAgICAgICAgICAvLyAgICAgICAgIFwibWVzc2FnZVwiOiBcIlRoZXJlIGlzIGFuIG9wZW4gbWFuaWZlc3QgUGxlYXNlIGNsb3NlIGl0IGJlZm9yZSBjcmVhdGluZyBhIG5ldyBtYW5pZmVzdC5cIlxuICAgICAgICAgICAgICAgIC8vICAgICB9KTtcblxuICAgICAgICAgICAgICAgIC8vIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgICAgIHRoaXMucmVkaXNDbGllbnQubXVsdGkoKVxuICAgICAgICAgICAgICAgICAgICAgICAgLmluY3IoTUlEX0NPVU5URVIpXG4gICAgICAgICAgICAgICAgICAgICAgICAuZXhlYygoZXJyLCByZXNwKSA9PiB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgY29uc29sZS5sb2cocmVzcCk7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgdmFyIG1hbmlmZXN0ID0ge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBtaWQ6IHJlc3BbMF0sXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHRpdGxlOiB0eXBlLnByZWZpeCtyZXNwWzBdLFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBkYXRlQ3JlYXRlZDogbW9tZW50KCkudW5peCgpLC8vZm9ybWF0KFwiWVlZWS1NTS1ERFwiKSxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgbXR5cGVJZDogdHlwZS5pZCxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgc3RhZ2VJZDogbWFuaWZlc3RTdGFnZXMub3Blbi5pZCxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgc3RhZ2U6IG1hbmlmZXN0U3RhZ2VzLm9wZW4udGl0bGUsXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGNyZWF0ZWRCeTogdXNlclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIH07XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgY29uc29sZS5sb2cobWFuaWZlc3QpXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgc3J2LnJlZGlzQ2xpZW50Lm11bHRpKClcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgLmhtc2V0KE1JRF9QUkVGSVggKyBtYW5pZmVzdC5taWQsIG1hbmlmZXN0KVxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAuc2FkZChPUEVOX01BTklGRVNULCBtYW5pZmVzdC5taWQpXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIC5leGVjKChlcnIsIHJlc3VsdHMpID0+IHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHNydi5teVNlYXJjaC5hZGQobWFuaWZlc3QubWlkLG1hbmlmZXN0LChzZXJyLHJlc3UpPT57XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgaWYgKHNlcnIpXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGNvbnNvbGUubG9nKHNlcnIpXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgY29uc29sZS5sb2cocmVzdSlcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgLy9hbHNvIGFkZCB0byB0aGUgaW5kZXggaGVyZSBvbmUgdGltZSBcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGlmIChlcnIpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICByZWplY3QoZXJyKTtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgcmVzb2x2ZShtYW5pZmVzdClcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICAgICAgICAgICAgICB9KTtcbiAgICAgICAgICAgICAgICAvL31cblxuICAgICAgICAgICAgfSkuY2F0Y2goKGVycik9PntcbiAgICAgICAgICAgICAgICBjb25zb2xlLmxvZyhcImVyciBkZXRlY3RlZFwiKTsgXG4gICAgICAgICAgICAgICAgY29uc29sZS5sb2coZXJyKTtcbiAgICAgICAgICAgIH0pO1xuXG4gICAgICAgIH0pO1xuXG4gICAgfVxuICAgIGNoYW5nZVN0YWdlKG1pZCwgc3RhZ2VzKSB7XG4gICAgICAgIHJldHVybiBuZXcgUHJvbWlzZSgocmVzb2x2ZSwgcmVqZWN0KSA9PiB7XG4gICAgICAgICAgICBcbiAgICAgICAgICAgIGxyZWRpcy5jbGllbnQuaG1zZXQoTUlEX1BSRUZJWCttaWQsXCJzdGFnZUlkXCIsc3RhZ2VzLChlcnIscmVzdWx0KT0+e1xuICAgICAgICAgICAgICAgIHZhciBzdGFnZSA9IHRoaXMuZ2V0U3RhZ2VCeUlkKHN0YWdlcyk7IFxuICAgICAgICAgICAgICAgIGNvbnNvbGUubG9nKCdsb29rZWQgdXAgdGhlIHN0YWdlICcrc3RhZ2UudGl0bGUpO1xuICAgICAgICAgICAgICAgIGxyZWRpcy5jbGllbnQuaG1zZXQoTUlEX1BSRUZJWCttaWQsXCJzdGFnZVwiLHN0YWdlLnRpdGxlLChlcnIscmVzdWx0Mik9Pnt9KTsgXG4gICAgICAgICAgICAgICAgbHJlZGlzLmhnZXRhbGwoTUlEX1BSRUZJWCttaWQpLnRoZW4oKHVNYW5pZmVzdCk9PntcbiAgICAgICAgICAgICAgICAgICAgdGhpcy5teVNlYXJjaC5kZWxEb2N1bWVudChcImluZGV4Om1hbmlmZXN0XCIsbWlkLChlcnIscmVzdWx0MSk9PntcbiAgICAgICAgICAgICAgICAgICAgICAgIGNvbnNvbGUubG9nKCdjaGFuZ2luZyBkb2N1bWVudCcpO1xuICAgICAgICAgICAgICAgICAgICAgICAgY29uc29sZS5sb2coZXJyKTtcbiAgICAgICAgICAgICAgICAgICAgICAgIGNvbnNvbGUubG9nKHJlc3VsdDEpIFxuICAgICAgICAgICAgICAgICAgICAgICAgdGhpcy5teVNlYXJjaC5hZGQodU1hbmlmZXN0Lm1pZCx1TWFuaWZlc3QpOyBcbiAgICAgICAgICAgICAgICAgICAgICAgIHJlc29sdmUocmVzdWx0KTsgXG4gICAgICAgICAgICAgICAgICAgIH0pOyBcbiAgICAgICAgICAgICAgICAgICBcbiAgICAgICAgICAgICAgICB9KTtcbiAgICAgICAgICAgICAgIFxuICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICAvL3dlIGFsc28gbmVlZCB0byB0byB1cGRhdGUgdGhlIGRvY3VtZW50IFxuXG4gICAgICAgICAgICBcbiAgICAgICAgfSlcbiAgICB9XG4gICAgc2hpcE1hbmlmZXN0KG1pZCxhd2IsdXNlcil7XG4gICAgICAgIHJldHVybiBuZXcgUHJvbWlzZSgocmVzb2x2ZSxyZWplY3QpPT57XG4gICAgICAgICAgICBscmVkaXMuaG1zZXQoTUlEX1BSRUZJWCttaWQsIHtzaGlwRGF0ZTptb21lbnQoKS5mb3JtYXQoXCJZWVlZLU1NLUREXCIpLHNoaXBwZWRCeTp1c2VyfSkudGhlbigoc3Jlc3VsdCk9PntcbiAgICAgICAgICAgICAgICBjb25zb2xlLmxvZyhzcmVzdWx0KTtcbiAgICAgICAgICAgICAgICB0aGlzLmNoYW5nZVN0YWdlKG1pZCwzKS50aGVuKChyZXN1KT0+e1xuICAgICAgICAgICAgICAgICAgICByZXNvbHZlKHNyZXN1bHQpO1xuICAgICAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgICAgIFxuICAgICAgICAgICAgfSlcbiAgICAgICAgfSlcbiAgICB9XG4gICAgbGlzdE1hbmlmZXN0KHR5cGUscGFnZSxwYWdlU2l6ZSl7XG4gICAgICAgIHJldHVybiBuZXcgUHJvbWlzZSgocmVzb2x2ZSxyZWplY3QpPT57XG4gICAgICAgICAgICB2YXIgb2Zmc2V0VmFsID0gKHBhZ2UgLSAxKSAqIHBhZ2VTaXplO1xuICAgICAgICAgICAgY29uc29sZS5sb2coJ29mZnNldCAnK29mZnNldFZhbCk7XG4gICAgICAgICAgICBcbiAgICAgICAgICAgIHRoaXMubXlTZWFyY2guc2VhcmNoKFwiQG10eXBlSWQ6XCIrdHlwZSwge1xuICAgICAgICAgICAgICAgIG9mZnNldDpvZmZzZXRWYWwsXG4gICAgICAgICAgICAgICAgbnVtYmVyT2ZSZXN1bHRzOiBwYWdlU2l6ZSxcbiAgICAgICAgICAgICAgICBzb3J0Qnk6IFwibWlkXCIsXG4gICAgICAgICAgICAgICAgZGlyOiBcIkRFU0NcIlxuICAgICAgICAgICAgfSwgKHIxLCBkYXRhKSA9PiB7XG4gICAgICAgICAgICAgICAgaWYgKHIxKVxuICAgICAgICAgICAgICAgICAgICBjb25zb2xlLmxvZyhyMSk7XG4gICAgICAgICAgICAgICAgIHZhciBtYW5pZmVzdExpc3QgPSBbXTsgXG4gICAgICAgICAgICAgICAgIGRhdGEucmVzdWx0cy5mb3JFYWNoKG1hbmlmZXN0UmVzdWx0ID0+IHtcbiAgICAgICAgICAgICAgICAgICAgbWFuaWZlc3RMaXN0LnB1c2gobWFuaWZlc3RSZXN1bHQuZG9jKTsgICAgXG4gICAgICAgICAgICAgICAgICAgIFxuICAgICAgICAgICAgICAgICB9KTtcbiAgICAgICAgICAgICAgICAgLy9jb25zb2xlLmxvZyhtYW5pZmVzdExpc3QpO1xuICAgICAgICAgICAgICAgICB2YXIgcGFnZWREYXRhID0ge1xuICAgICAgICAgICAgICAgICAgICBtYW5pZmVzdHM6bWFuaWZlc3RMaXN0LFxuICAgICAgICAgICAgICAgICAgICB0b3RhbFJlc3VsdHMgOiBkYXRhLnRvdGFsUmVzdWx0cyxcbiAgICAgICAgICAgICAgICAgICAgcGFnZSA6IHBhZ2UsXG4gICAgICAgICAgICAgICAgICAgIHBhZ2VTaXplOiBwYWdlU2l6ZSwgXG4gICAgICAgICAgICAgICAgICAgIFRvdGFsUGFnZXMgOiAoZGF0YS50b3RhbFJlc3VsdHMvcGFnZVNpemUpXG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIHJlc29sdmUocGFnZWREYXRhKTtcbiAgICAgICAgICAgICAgICBjb25zb2xlLmxvZyhtYW5pZmVzdExpc3QpO1xuICAgICAgICAgICAgICAgIFxuICAgICAgICAgICAgfSk7XG4gICAgICAgIH0pO1xuICAgIH1cbiAgICBnZXRNYW5pZmVzdChtaWQpIHtcbiAgICAgICAgcmV0dXJuIG5ldyBQcm9taXNlKChyZXNvbHZlLHJlamVjdCk9PntcbiAgICAgICAgICAgIGxyZWRpcy5oZ2V0YWxsKE1JRF9QUkVGSVgrbWlkKS50aGVuKG1hbmlmZXN0PT57XG4gICAgICAgICAgICAgICAgaWYgKG1hbmlmZXN0LnBsYW5lSWQpe1xuICAgICAgICAgICAgICAgICAgICBwbGFuZVNlcnZpY2UubGlzdENvbXBhcnRtZW50cyhtYW5pZmVzdC5wbGFuZUlkKS50aGVuKHBsYW5lSW5mbz0+e1xuICAgICAgICAgICAgICAgICAgICAgICAgbWFuaWZlc3QucGxhbmUgPSBwbGFuZUluZm8ucGxhbmU7IFxuICAgICAgICAgICAgICAgICAgICAgICAgcmVzb2x2ZShtYW5pZmVzdCk7XG4gICAgICAgICAgICAgICAgICAgIH0pXG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICBcbiAgICAgICAgICAgIH0pICAgIFxuICAgICAgICB9KVxuICAgICAgICBcbiAgICB9XG4gICAgZGVsZXRlTWFuaWZlc3QobWlkKXtcbiAgICAgICByZXR1cm4gbmV3IFByb21pc2UoKHJlc29sdmUscmVqZWN0KT0+e1xuICAgICAgICBscmVkaXMuY2xpZW50LmRlbChNSURfUFJFRklYK21pZCwoZXJyLHJlc3ApPT57XG4gICAgICAgICAgICBjb25zb2xlLmxvZyhyZXNwKTsgXG4gICAgICAgICAgICB0aGlzLm15U2VhcmNoLmRlbERvY3VtZW50KFwiaW5kZXg6bWFuaWZlc3RcIixtaWQsKGVycixyZXN1bHQpPT57XG4gICAgICAgICAgICAgICAgY29uc29sZS5sb2coXCJkZWxldGluZyBtaWRcIik7IFxuICAgICAgICAgICAgICAgIGNvbnNvbGUubG9nKGVycik7IFxuICAgICAgICAgICAgICAgIGNvbnNvbGUubG9nKHJlc3VsdCk7XG4gICAgICAgICAgICB9KTsgXG4gICAgICAgICAgICBscmVkaXMuc3JlbShPUEVOX01BTklGRVNULG1pZCk7XG4gICAgICAgICAgICByZXNvbHZlKHtkZWxldGVkOnRydWV9KSAgICBcbiAgICAgICAgfSlcblxuICAgICAgIH0pOyBcbiAgICAgICAgXG4gICAgICAgIFxuICAgIH1cbiAgICBnZXRNYW5pZmVzdFByb2Nlc3NpbmcoKXtcbiAgICAgICAgdmFyIG1zZWFyY2ggPSB0aGlzLm15U2VhcmNoOyBcbiAgICAgICAgcmV0dXJuIG5ldyBQcm9taXNlKChyZXNvbHZlLHJlamVjdCk9PntcbiAgICAgICAgICAgIHZhciBvZmZzZXRWYWwgPTA7XG4gICAgICAgICAgICB2YXIgcGFnZVNpemUgPSAyMDsgXG4gICAgICAgICAgICBjb25zb2xlLmxvZygnb2Zmc2V0ICcrb2Zmc2V0VmFsKTtcbiAgICAgICAgICAgIHZhciBtYW5pZmVzdExpc3QgPSBbXTsgXG4gICAgICAgICAgICBtc2VhcmNoLnNlYXJjaChgQHN0YWdlSWQ6WzMgNF1gLCB7XG4gICAgICAgICAgICAgICAgb2Zmc2V0Om9mZnNldFZhbCxcbiAgICAgICAgICAgICAgICBudW1iZXJPZlJlc3VsdHM6IHBhZ2VTaXplLFxuICAgICAgICAgICAgICAgIHNvcnRCeTogXCJtaWRcIixcbiAgICAgICAgICAgICAgICBkaXI6IFwiREVTQ1wiXG4gICAgICAgICAgICB9LCAocjEsIGRhdGEpID0+IHtcbiAgICAgICAgICAgICAgICBpZiAocjEpXG4gICAgICAgICAgICAgICAgICAgIGNvbnNvbGUubG9nKHIxKTtcbiAgICAgICAgICAgICAgICAgXG4gICAgICAgICAgICAgICAgIGRhdGEucmVzdWx0cy5mb3JFYWNoKG1hbmlmZXN0UmVzdWx0ID0+IHtcbiAgICAgICAgICAgICAgICAgICAgbWFuaWZlc3RMaXN0LnB1c2gobWFuaWZlc3RSZXN1bHQuZG9jKTsgICAgXG4gICAgICAgICAgICAgICAgICAgIFxuICAgICAgICAgICAgICAgICB9KTtcbiAgICAgICAgICAgICAgICAgLy9jb25zb2xlLmxvZyhtYW5pZmVzdExpc3QpO1xuICAgICAgICAgICAgICAgICB2YXIgcGFnZWREYXRhID0ge1xuICAgICAgICAgICAgICAgICAgICBtYW5pZmVzdHM6bWFuaWZlc3RMaXN0LFxuICAgICAgICAgICAgICAgICAgICB0b3RhbFJlc3VsdHMgOiBkYXRhLnRvdGFsUmVzdWx0cyxcbiAgICAgICAgICAgICAgICAgICAgcGFnZSA6IDEsXG4gICAgICAgICAgICAgICAgICAgIHBhZ2VTaXplOiBwYWdlU2l6ZSwgXG4gICAgICAgICAgICAgICAgICAgIFRvdGFsUGFnZXMgOiAoZGF0YS50b3RhbFJlc3VsdHMvcGFnZVNpemUpXG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIHJlc29sdmUocGFnZWREYXRhKTtcbiAgICAgICAgICAgICAgICBjb25zb2xlLmxvZyhtYW5pZmVzdExpc3QpO1xuICAgICAgICAgICAgICAgIFxuICAgICAgICAgICAgfSk7XG4gICAgICAgIH0pO1xuICAgIH1cbiAgICBcbiAgICBnZXRUeXBlYnlJZCAoaWQpe1xuICAgICAgICBpZiAoaWQgPT0gMSl7XG4gICAgICAgICAgICByZXR1cm4gbWFuaWZlc3RUeXBlcy5haXI7XG4gICAgICAgIH1cbiAgICAgICAgaWYgKGlkID09IDIpe1xuICAgICAgICAgICAgcmV0dXJuIG1hbmlmZXN0VHlwZXMub2NlYW47XG4gICAgICAgIH1cbiAgICAgICAgaWYgKGlkID09IDMpe1xuICAgICAgICAgICAgcmV0dXJuIG1hbmlmZXN0VHlwZXMuaGF6bWF0O1xuICAgICAgICB9XG4gICAgICAgIHJldHVybiBtYW5pZmVzdFR5cGVzLmFpcjsgXG4gICAgfVxuICAgIGdldFN0YWdlQnlJZChpZCl7XG4gICAgICAgIGlmIChpZCA9PSAxKXtcbiAgICAgICAgICAgIHJldHVybiBtYW5pZmVzdFN0YWdlcy5vcGVuO1xuICAgICAgICB9XG4gICAgICAgIGlmIChpZCA9PSAyKXtcbiAgICAgICAgICAgIHJldHVybiBtYW5pZmVzdFN0YWdlcy5jbG9zZWQ7XG4gICAgICAgIH1cbiAgICAgICAgaWYgKGlkID09IDMpe1xuICAgICAgICAgICAgcmV0dXJuIG1hbmlmZXN0U3RhZ2VzLnNoaXBwZWQ7XG4gICAgICAgIH1cbiAgICAgICAgaWYgKGlkID09IDQpe1xuICAgICAgICAgICAgcmV0dXJuIG1hbmlmZXN0U3RhZ2VzLnZlcmlmaWVkO1xuICAgICAgICB9XG4gICAgICAgIHJldHVybiBtYW5pZmVzdFN0YWdlcy5vcGVuOyBcbiAgICB9XG5cbn0iXX0=
