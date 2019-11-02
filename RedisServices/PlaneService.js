'use strict';

Object.defineProperty(exports, "__esModule", {
    value: true
});
exports.PlaneService = undefined;

var _createClass = function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; }();

var _buffer = require('buffer');

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

var redis = require('redis');
var lredis = require('./redis-local');
var dataContext = require('./dataContext');
var redisSearch = require('../redisearchclient/index');
var PREFIX = "plane:";
var INDEX = "index:planes";
var PLANE_COUNTER = "plane:id";
var COMPARTMENT_COUNTER = "compartment:id";
var PLANE_COMPARTMENT_INDEX = "index:compartments";

var rs = redisSearch(redis, INDEX, {
    clientOptions: dataContext.clientOptions
});
var compartmentIndex = redisSearch(redis, PLANE_COMPARTMENT_INDEX, {
    clientOptions: dataContext.clientOptions
});

var PlaneService = exports.PlaneService = function () {
    function PlaneService() {
        _classCallCheck(this, PlaneService);
    }

    _createClass(PlaneService, [{
        key: 'addPlane',
        value: function addPlane(plane) {
            return new Promise(function (resolve, reject) {
                dataContext.redisClient.incr(PLANE_COUNTER, function (err, id) {
                    plane.id = id;
                    dataContext.redisClient.hmset(PREFIX + id, plane);
                    rs.add(id, plane, function (err, res) {
                        resolve({ saved: true });
                    });
                });
            });
        }
    }, {
        key: 'updatePlane',
        value: function updatePlane(plane) {
            return new Promise(function (resolve, reject) {
                dataContext.redisClient.hmset(PREFIX + plane.id, plane);
                rs.update(plane.id, plane, function (err, result) {
                    resolve({ saved: true });
                });
            });
        }
    }, {
        key: 'rmPlane',
        value: function rmPlane(planeId) {
            return new Promise(function (resolve, reject) {
                rs.delDocument(INDEX, planeId);
                dataContext.redisClient.del(PREFIX + planeId, function (err, res) {
                    resolve({ deleted: true });
                });
            });
        }
    }, {
        key: 'getPlane',
        value: function getPlane(planeId) {
            return new Promise(function (resolve, reject) {
                dataContext.redisClient.hgetall(PREFIX + planeId, function (err, p) {
                    resolve({ plane: p });
                });
            });
        }
    }, {
        key: 'getPlanes',
        value: function getPlanes() {
            return new Promise(function (resolve, reject) {
                rs.search('*', {}, function (err, planesResult) {
                    console.log(planesResult);
                    var planes = [];
                    planesResult.results.forEach(function (plane) {
                        planes.push(plane.doc);
                    });
                    resolve({ planes: planes });
                });
            });
        }
    }, {
        key: 'addCompartment',
        value: function addCompartment(comparment) {
            var srv = this;
            return new Promise(function (resolve, reject) {
                dataContext.redisClient.incr(COMPARTMENT_COUNTER, function (err, id) {
                    comparment.id = id;
                    console.log(comparment);
                    if (isNaN(Number(comparment.volume))) comparment.volume = 0;
                    compartmentIndex.add(id, comparment, function (err1, result) {
                        if (err1) {
                            console.log(err1);
                            resolve({ saved: false });
                            return;
                        }
                        srv.updatePlaneCapcity(comparment.plane_id);
                        resolve({ saved: true });
                    });
                });
            });
        }
    }, {
        key: 'updatePlaneCapcity',
        value: function updatePlaneCapcity(planeId) {
            // get the compartments 

            var total_weight = 0;
            var total_volume = 0;
            compartmentIndex.search('@plane_id:[' + planeId + ' ' + planeId + ']', { offset: 0, numberOfResults: 100 }, function (err, compResults) {
                if (err) console.log(err);
                compResults.results.forEach(function (compartment) {
                    if (isNaN(Number(compartment.doc.weight)) == false) {
                        total_weight += Number(compartment.doc.weight);
                    }
                    if (isNaN(Number(compartment.doc.volume)) == false) {
                        total_volume += Number(compartment.doc.volume);
                    }
                    rs.getDoc(planeId, function (err1, planeDoc) {
                        var plane = planeDoc.doc;
                        plane.maximum_capacity = total_weight;
                        rs.update(planeId, plane);
                    });
                });
            });
        }
    }, {
        key: 'listCompartments',
        value: function listCompartments(planeId) {
            var srv = this;
            return new Promise(function (resolve, reject) {
                if (!planeId) {
                    var plane = {
                        plane: {
                            id: 0,
                            tail_num: "No Plane",
                            aircraft_type: "NO Plane",
                            contact_name: "",
                            contact_phone: "",
                            company: "",
                            compartments: []
                        }

                    };
                    return resolve(plane);
                } else {
                    compartmentIndex.search('@plane_id:[' + planeId + ' ' + planeId + ']', { offset: 0, numberOfResults: 100, sortBy: 'name', dir: "DESC" }, function (err, compResults) {
                        if (err) console.log(err);
                        var compartments = [];
                        compResults.results.forEach(function (compartment) {

                            compartments.push(compartment.doc);
                        });
                        //
                        srv.getPlane(planeId).then(function (plane) {
                            plane.plane.compartments = compartments.reverse();
                            resolve(plane);
                        });
                    });
                }
            });
        }
    }, {
        key: 'removeCompartment',
        value: function removeCompartment(planeId, cid) {
            var srv = this;
            return new Promise(function (resolve, reject) {
                compartmentIndex.delDocument(PLANE_COMPARTMENT_INDEX, cid, function (err, delResult) {
                    resolve({ deleted: true });
                    srv.updatePlaneCapcity(planeId);
                });
            });
        }
    }]);

    return PlaneService;
}();
//# sourceMappingURL=data:application/json;charset=utf8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIlJlZGlzU2VydmljZXMvUGxhbmVTZXJ2aWNlLmVzNiJdLCJuYW1lcyI6WyJyZWRpcyIsInJlcXVpcmUiLCJscmVkaXMiLCJkYXRhQ29udGV4dCIsInJlZGlzU2VhcmNoIiwiUFJFRklYIiwiSU5ERVgiLCJQTEFORV9DT1VOVEVSIiwiQ09NUEFSVE1FTlRfQ09VTlRFUiIsIlBMQU5FX0NPTVBBUlRNRU5UX0lOREVYIiwicnMiLCJjbGllbnRPcHRpb25zIiwiY29tcGFydG1lbnRJbmRleCIsIlBsYW5lU2VydmljZSIsInBsYW5lIiwiUHJvbWlzZSIsInJlc29sdmUiLCJyZWplY3QiLCJyZWRpc0NsaWVudCIsImluY3IiLCJlcnIiLCJpZCIsImhtc2V0IiwiYWRkIiwicmVzIiwic2F2ZWQiLCJ1cGRhdGUiLCJyZXN1bHQiLCJwbGFuZUlkIiwiZGVsRG9jdW1lbnQiLCJkZWwiLCJkZWxldGVkIiwiaGdldGFsbCIsInAiLCJzZWFyY2giLCJwbGFuZXNSZXN1bHQiLCJjb25zb2xlIiwibG9nIiwicGxhbmVzIiwicmVzdWx0cyIsImZvckVhY2giLCJwdXNoIiwiZG9jIiwiY29tcGFybWVudCIsInNydiIsImlzTmFOIiwiTnVtYmVyIiwidm9sdW1lIiwiZXJyMSIsInVwZGF0ZVBsYW5lQ2FwY2l0eSIsInBsYW5lX2lkIiwidG90YWxfd2VpZ2h0IiwidG90YWxfdm9sdW1lIiwib2Zmc2V0IiwibnVtYmVyT2ZSZXN1bHRzIiwiY29tcFJlc3VsdHMiLCJjb21wYXJ0bWVudCIsIndlaWdodCIsImdldERvYyIsInBsYW5lRG9jIiwibWF4aW11bV9jYXBhY2l0eSIsInRhaWxfbnVtIiwiYWlyY3JhZnRfdHlwZSIsImNvbnRhY3RfbmFtZSIsImNvbnRhY3RfcGhvbmUiLCJjb21wYW55IiwiY29tcGFydG1lbnRzIiwic29ydEJ5IiwiZGlyIiwiZ2V0UGxhbmUiLCJ0aGVuIiwicmV2ZXJzZSIsImNpZCIsImRlbFJlc3VsdCJdLCJtYXBwaW5ncyI6Ijs7Ozs7Ozs7O0FBQUE7Ozs7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LENBQVA7QUFNSCIsImZpbGUiOiJSZWRpc1NlcnZpY2VzL1BsYW5lU2VydmljZS5qcyIsInNvdXJjZXNDb250ZW50IjpbImltcG9ydCB7IElOU1BFQ1RfTUFYX0JZVEVTIH0gZnJvbSAnYnVmZmVyJztcblxudmFyIHJlZGlzID0gcmVxdWlyZSgncmVkaXMnKTtcbnZhciBscmVkaXMgPSByZXF1aXJlKCcuL3JlZGlzLWxvY2FsJyk7XG52YXIgZGF0YUNvbnRleHQgPSByZXF1aXJlKCcuL2RhdGFDb250ZXh0Jyk7IFxudmFyIHJlZGlzU2VhcmNoID0gcmVxdWlyZSgnLi4vcmVkaXNlYXJjaGNsaWVudC9pbmRleCcpO1xuY29uc3QgUFJFRklYID0gXCJwbGFuZTpcIlxuY29uc3QgSU5ERVggPSBcImluZGV4OnBsYW5lc1wiXG5jb25zdCBQTEFORV9DT1VOVEVSID0gXCJwbGFuZTppZFwiOyBcbmNvbnN0IENPTVBBUlRNRU5UX0NPVU5URVIgPSBcImNvbXBhcnRtZW50OmlkXCJcbmNvbnN0IFBMQU5FX0NPTVBBUlRNRU5UX0lOREVYID0gXCJpbmRleDpjb21wYXJ0bWVudHNcIlxuXG4gXG5cbmNvbnN0IHJzID0gcmVkaXNTZWFyY2gocmVkaXMsIElOREVYLCB7XG4gICAgY2xpZW50T3B0aW9uczpkYXRhQ29udGV4dC5jbGllbnRPcHRpb25zXG59KTtcbmNvbnN0IGNvbXBhcnRtZW50SW5kZXggPSByZWRpc1NlYXJjaChyZWRpcywgUExBTkVfQ09NUEFSVE1FTlRfSU5ERVgsIHtcbiAgICBjbGllbnRPcHRpb25zOmRhdGFDb250ZXh0LmNsaWVudE9wdGlvbnNcbn0pO1xuZXhwb3J0IGNsYXNzIFBsYW5lU2VydmljZXtcbiAgICBjb25zdHJ1Y3Rvcigpe1xuXG4gICAgfVxuICAgIGFkZFBsYW5lKHBsYW5lKXtcbiAgICAgICAgcmV0dXJuIG5ldyBQcm9taXNlKChyZXNvbHZlLHJlamVjdCk9PntcbiAgICAgICAgICBkYXRhQ29udGV4dC5yZWRpc0NsaWVudC5pbmNyKFBMQU5FX0NPVU5URVIsKGVycixpZCk9PntcbiAgICAgICAgICAgICAgcGxhbmUuaWQgPSBpZDsgXG4gICAgICAgICAgICAgIGRhdGFDb250ZXh0LnJlZGlzQ2xpZW50Lmhtc2V0KFBSRUZJWCtpZCxwbGFuZSk7IFxuICAgICAgICAgICAgICBycy5hZGQoaWQscGxhbmUsKGVycixyZXMpPT57XG4gICAgICAgICAgICAgICAgICByZXNvbHZlKHtzYXZlZDp0cnVlfSk7IFxuICAgICAgICAgICAgICB9KTsgXG4gICAgICAgICAgfSlcbiAgICAgICAgfSlcbiAgICB9XG4gICAgdXBkYXRlUGxhbmUocGxhbmUpe1xuICAgICAgICByZXR1cm4gbmV3IFByb21pc2UgKChyZXNvbHZlLHJlamVjdCk9PntcbiAgICAgICAgICAgIGRhdGFDb250ZXh0LnJlZGlzQ2xpZW50Lmhtc2V0KFBSRUZJWCtwbGFuZS5pZCxwbGFuZSk7IFxuICAgICAgICAgICAgcnMudXBkYXRlKHBsYW5lLmlkLHBsYW5lLChlcnIscmVzdWx0KT0+e1xuICAgICAgICAgICAgICAgIHJlc29sdmUoe3NhdmVkOnRydWV9KVxuICAgICAgICAgICAgfSlcbiAgICAgICAgfSlcbiAgICB9XG4gICAgcm1QbGFuZShwbGFuZUlkKXtcbiAgICAgICAgcmV0dXJuIG5ldyBQcm9taXNlKChyZXNvbHZlLHJlamVjdCk9PntcbiAgICAgICAgICAgIHJzLmRlbERvY3VtZW50KElOREVYLHBsYW5lSWQpOyBcbiAgICAgICAgICAgIGRhdGFDb250ZXh0LnJlZGlzQ2xpZW50LmRlbChQUkVGSVgrcGxhbmVJZCwoZXJyLHJlcyk9PntcbiAgICAgICAgICAgICAgICByZXNvbHZlKHtkZWxldGVkOnRydWV9KVxuICAgICAgICAgICAgfSlcbiAgICAgICAgfSlcbiAgICB9XG4gICAgZ2V0UGxhbmUocGxhbmVJZCl7XG4gICAgICAgIHJldHVybiBuZXcgUHJvbWlzZSgocmVzb2x2ZSxyZWplY3QpPT57XG4gICAgICAgICAgICBkYXRhQ29udGV4dC5yZWRpc0NsaWVudC5oZ2V0YWxsKFBSRUZJWCtwbGFuZUlkLChlcnIscCk9PntcbiAgICAgICAgICAgICAgICByZXNvbHZlKHtwbGFuZTpwfSk7IFxuICAgICAgICAgICAgfSlcbiAgICAgICAgfSlcbiAgICB9XG4gICAgZ2V0UGxhbmVzKCl7XG4gICAgICAgIHJldHVybiBuZXcgUHJvbWlzZSgocmVzb2x2ZSxyZWplY3QpPT57XG4gICAgICAgICAgICBycy5zZWFyY2goJyonLHt9LChlcnIscGxhbmVzUmVzdWx0KT0+e1xuICAgICAgICAgICAgICAgIGNvbnNvbGUubG9nKHBsYW5lc1Jlc3VsdClcbiAgICAgICAgICAgICAgICB2YXIgcGxhbmVzID0gW107IFxuICAgICAgICAgICAgICAgIHBsYW5lc1Jlc3VsdC5yZXN1bHRzLmZvckVhY2gocGxhbmUgPT4ge1xuICAgICAgICAgICAgICAgICAgICBwbGFuZXMucHVzaChwbGFuZS5kb2MpXG4gICAgICAgICAgICAgICAgICAgIFxuICAgICAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgICAgIHJlc29sdmUoe3BsYW5lczpwbGFuZXN9KTsgXG4gICAgICAgICAgICB9KVxuICAgICAgICB9KVxuICAgIH1cblxuICAgIGFkZENvbXBhcnRtZW50KGNvbXBhcm1lbnQpe1xuICAgICAgICB2YXIgc3J2ID0gdGhpczsgXG4gICAgICAgIHJldHVybiBuZXcgUHJvbWlzZSgocmVzb2x2ZSxyZWplY3QpPT57XG4gICAgICAgICAgICAgZGF0YUNvbnRleHQucmVkaXNDbGllbnQuaW5jcihDT01QQVJUTUVOVF9DT1VOVEVSLChlcnIsaWQpPT57XG4gICAgICAgICAgICAgICAgIGNvbXBhcm1lbnQuaWQgPSBpZDsgXG4gICAgICAgICAgICAgICAgIGNvbnNvbGUubG9nKGNvbXBhcm1lbnQpXG4gICAgICAgICAgICAgICAgIGlmIChpc05hTihOdW1iZXIoY29tcGFybWVudC52b2x1bWUpKSlcbiAgICAgICAgICAgICAgICAgY29tcGFybWVudC52b2x1bWUgPSAwIDsgXG4gICAgICAgICAgICAgICAgIGNvbXBhcnRtZW50SW5kZXguYWRkKGlkLGNvbXBhcm1lbnQsKGVycjEscmVzdWx0KT0+e1xuICAgICAgICAgICAgICAgICAgICAgaWYgKGVycjEpe1xuICAgICAgICAgICAgICAgICAgICAgICAgIGNvbnNvbGUubG9nKGVycjEpXG4gICAgICAgICAgICAgICAgICAgICAgICByZXNvbHZlKHtzYXZlZDpmYWxzZX0pXG4gICAgICAgICAgICAgICAgICAgICAgICByZXR1cm47IFxuICAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICAgc3J2LnVwZGF0ZVBsYW5lQ2FwY2l0eShjb21wYXJtZW50LnBsYW5lX2lkKVxuICAgICAgICAgICAgICAgICAgICByZXNvbHZlKHtzYXZlZDp0cnVlfSlcbiAgICAgICAgICAgICAgICAgfSk7IFxuICAgICAgICAgICAgIH0pXG4gICAgICAgIH0pXG4gICAgfVxuICAgIHVwZGF0ZVBsYW5lQ2FwY2l0eShwbGFuZUlkKXtcbiAgICAgICAgLy8gZ2V0IHRoZSBjb21wYXJ0bWVudHMgXG4gICAgICAgIFxuICAgICAgICB2YXIgdG90YWxfd2VpZ2h0ID0gMCA7IFxuICAgICAgICB2YXIgdG90YWxfdm9sdW1lID0gMCA7IFxuICAgICAgICBjb21wYXJ0bWVudEluZGV4LnNlYXJjaChgQHBsYW5lX2lkOlske3BsYW5lSWR9ICR7cGxhbmVJZH1dYCx7b2Zmc2V0OjAsbnVtYmVyT2ZSZXN1bHRzOjEwMH0sKGVycixjb21wUmVzdWx0cyk9PntcbiAgICAgICAgICAgIGlmKGVycilcbiAgICAgICAgICAgIGNvbnNvbGUubG9nKGVycilcbiAgICAgICAgICAgIGNvbXBSZXN1bHRzLnJlc3VsdHMuZm9yRWFjaChjb21wYXJ0bWVudCA9PiB7XG4gICAgICAgICAgICAgICAgaWYgKGlzTmFOKE51bWJlcihjb21wYXJ0bWVudC5kb2Mud2VpZ2h0KSkgPT0gZmFsc2Upe1xuICAgICAgICAgICAgICAgICAgICB0b3RhbF93ZWlnaHQgKz0gTnVtYmVyKGNvbXBhcnRtZW50LmRvYy53ZWlnaHQpXG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIGlmIChpc05hTihOdW1iZXIoY29tcGFydG1lbnQuZG9jLnZvbHVtZSkpID09IGZhbHNlKXtcbiAgICAgICAgICAgICAgICAgICAgdG90YWxfdm9sdW1lICs9IE51bWJlcihjb21wYXJ0bWVudC5kb2Mudm9sdW1lKVxuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICBycy5nZXREb2MocGxhbmVJZCwoZXJyMSxwbGFuZURvYyk9PntcbiAgICAgICAgICAgICAgICAgICAgdmFyIHBsYW5lID0gcGxhbmVEb2MuZG9jOyBcbiAgICAgICAgICAgICAgICAgICAgcGxhbmUubWF4aW11bV9jYXBhY2l0eSA9IHRvdGFsX3dlaWdodDsgXG4gICAgICAgICAgICAgICAgICAgIHJzLnVwZGF0ZShwbGFuZUlkLHBsYW5lKTsgXG4gICAgICAgICAgICAgICAgfSkgICAgXG4gICAgICAgICAgICB9KTtcbiAgICAgICAgICBcbiAgICAgICAgICAgIFxuICAgICAgICB9KVxuICAgIH1cbiAgICBsaXN0Q29tcGFydG1lbnRzKHBsYW5lSWQpe1xuICAgICAgICB2YXIgc3J2ID0gdGhpczsgXG4gICAgICAgIHJldHVybiBuZXcgUHJvbWlzZSgocmVzb2x2ZSxyZWplY3QpPT57XG4gICAgICAgICAgICBpZiAoIXBsYW5lSWQpe1xuICAgICAgICAgICAgICAgIHZhciBwbGFuZSAgPSB7IFxuICAgICAgICAgICAgICAgICAgICBwbGFuZTp7XG4gICAgICAgICAgICAgICAgICAgICAgICBpZDowLCBcbiAgICAgICAgICAgICAgICAgICAgICAgIHRhaWxfbnVtOlwiTm8gUGxhbmVcIixcbiAgICAgICAgICAgICAgICAgICAgICAgIGFpcmNyYWZ0X3R5cGU6XCJOTyBQbGFuZVwiLFxuICAgICAgICAgICAgICAgICAgICAgICAgY29udGFjdF9uYW1lOiBcIlwiLFxuICAgICAgICAgICAgICAgICAgICAgICAgY29udGFjdF9waG9uZTpcIlwiLFxuICAgICAgICAgICAgICAgICAgICAgICAgY29tcGFueTpcIlwiLFxuICAgICAgICAgICAgICAgICAgICAgICAgY29tcGFydG1lbnRzOltdIFxuICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgIFxuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICByZXR1cm4gcmVzb2x2ZShwbGFuZSkgOyBcblxuICAgICAgICAgICAgfVxuICAgICAgICAgICAgZWxzZSB7XG4gICAgICAgICAgICAgICAgY29tcGFydG1lbnRJbmRleC5zZWFyY2goYEBwbGFuZV9pZDpbJHtwbGFuZUlkfSAke3BsYW5lSWR9XWAse29mZnNldDowLG51bWJlck9mUmVzdWx0czoxMDAsc29ydEJ5OiduYW1lJyxkaXI6XCJERVNDXCJ9LChlcnIsY29tcFJlc3VsdHMpPT57XG4gICAgICAgICAgICAgICAgICAgIGlmIChlcnIpIFxuICAgICAgICAgICAgICAgICAgICAgICAgY29uc29sZS5sb2coZXJyKVxuICAgICAgICAgICAgICAgICAgICB2YXIgY29tcGFydG1lbnRzID0gW107IFxuICAgICAgICAgICAgICAgICAgICBjb21wUmVzdWx0cy5yZXN1bHRzLmZvckVhY2goY29tcGFydG1lbnQgPT4ge1xuICAgICAgICAgICAgICAgICAgICAgICAgXG4gICAgICAgICAgICAgICAgICAgICAgICBjb21wYXJ0bWVudHMucHVzaChjb21wYXJ0bWVudC5kb2MpXG4gICAgICAgICAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgICAgICAgICAvL1xuICAgICAgICAgICAgICAgICAgICBzcnYuZ2V0UGxhbmUocGxhbmVJZCkudGhlbihwbGFuZT0+e1xuICAgICAgICAgICAgICAgICAgICAgICAgcGxhbmUucGxhbmUuY29tcGFydG1lbnRzID0gY29tcGFydG1lbnRzLnJldmVyc2UoKTsgXG4gICAgICAgICAgICAgICAgICAgICAgICByZXNvbHZlKHBsYW5lKTsgXG4gICAgICAgICAgICAgICAgICAgIH0pXG4gICAgICAgICAgICAgICAgfSlcbiAgICAgICAgICAgIH1cbiAgICAgICAgICBcbiAgICAgICAgfSlcbiAgICB9XG4gICAgcmVtb3ZlQ29tcGFydG1lbnQocGxhbmVJZCxjaWQpe1xuICAgICAgICB2YXIgc3J2ID0gdGhpczsgXG4gICAgICAgIHJldHVybiBuZXcgUHJvbWlzZSgocmVzb2x2ZSxyZWplY3QpPT57XG4gICAgICAgICAgICBjb21wYXJ0bWVudEluZGV4LmRlbERvY3VtZW50KFBMQU5FX0NPTVBBUlRNRU5UX0lOREVYLCBjaWQsKGVycixkZWxSZXN1bHQpPT57XG4gICAgICAgICAgICAgICAgcmVzb2x2ZSh7ZGVsZXRlZDp0cnVlfSlcbiAgICAgICAgICAgICAgICBzcnYudXBkYXRlUGxhbmVDYXBjaXR5KHBsYW5lSWQpXG4gICAgICAgICAgICB9KTsgXG4gICAgICAgIH0pXG4gICAgfVxuICAgXG59Il19
