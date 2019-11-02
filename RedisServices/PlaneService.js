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
//# sourceMappingURL=data:application/json;charset=utf8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIlJlZGlzU2VydmljZXMvUGxhbmVTZXJ2aWNlLmVzNiJdLCJuYW1lcyI6WyJyZWRpcyIsInJlcXVpcmUiLCJscmVkaXMiLCJkYXRhQ29udGV4dCIsInJlZGlzU2VhcmNoIiwiUFJFRklYIiwiSU5ERVgiLCJQTEFORV9DT1VOVEVSIiwiQ09NUEFSVE1FTlRfQ09VTlRFUiIsIlBMQU5FX0NPTVBBUlRNRU5UX0lOREVYIiwicnMiLCJjbGllbnRPcHRpb25zIiwiY29tcGFydG1lbnRJbmRleCIsIlBsYW5lU2VydmljZSIsInBsYW5lIiwiUHJvbWlzZSIsInJlc29sdmUiLCJyZWplY3QiLCJyZWRpc0NsaWVudCIsImluY3IiLCJlcnIiLCJpZCIsImhtc2V0IiwiYWRkIiwicmVzIiwic2F2ZWQiLCJ1cGRhdGUiLCJyZXN1bHQiLCJwbGFuZUlkIiwiZGVsRG9jdW1lbnQiLCJkZWwiLCJkZWxldGVkIiwiaGdldGFsbCIsInAiLCJzZWFyY2giLCJwbGFuZXNSZXN1bHQiLCJjb25zb2xlIiwibG9nIiwicGxhbmVzIiwicmVzdWx0cyIsImZvckVhY2giLCJwdXNoIiwiZG9jIiwiY29tcGFybWVudCIsInNydiIsImlzTmFOIiwiTnVtYmVyIiwidm9sdW1lIiwiZXJyMSIsInVwZGF0ZVBsYW5lQ2FwY2l0eSIsInBsYW5lX2lkIiwidG90YWxfd2VpZ2h0IiwidG90YWxfdm9sdW1lIiwib2Zmc2V0IiwibnVtYmVyT2ZSZXN1bHRzIiwiY29tcFJlc3VsdHMiLCJjb21wYXJ0bWVudCIsIndlaWdodCIsImdldERvYyIsInBsYW5lRG9jIiwibWF4aW11bV9jYXBhY2l0eSIsImNvbXBhcnRtZW50cyIsInNvcnRCeSIsImRpciIsImdldFBsYW5lIiwidGhlbiIsInJldmVyc2UiLCJjaWQiLCJkZWxSZXN1bHQiXSwibWFwcGluZ3MiOiI7Ozs7Ozs7OztBQUFBOzs7O0FBRUEsSUFBSUEsUUFBUUMsUUFBUSxPQUFSLENBQVo7QUFDQSxJQUFJQyxTQUFTRCxRQUFRLGVBQVIsQ0FBYjtBQUNB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QyxpQkFBZ0IsR0FBMUIsRUFBOEJRLFFBQU8sTUFBckMsRUFBNENDLEtBQUksTUFBaEQsRUFBNUQsRUFBb0gsVUFBQzNDLEdBQUQsRUFBS21DLFdBQUwsRUFBbUI7QUFDbkksNEJBQUluQyxHQUFKLEVBQ0lnQixRQUFRQyxHQUFSLENBQVlqQixHQUFaO0FBQ0osNEJBQUl5QyxlQUFlLEVBQW5CO0FBQ0FOLG9DQUFZaEIsT0FBWixDQUFvQkMsT0FBcEIsQ0FBNEIsdUJBQWU7O0FBRXZDcUIseUNBQWFwQixJQUFiLENBQWtCZSxZQUFZZCxHQUE5QjtBQUNILHlCQUhEO0FBSUE7QUFDQUUsNEJBQUlvQixRQUFKLENBQWFwQyxPQUFiLEVBQXNCcUMsSUFBdEIsQ0FBMkIsaUJBQU87QUFDOUJuRCxrQ0FBTUEsS0FBTixDQUFZK0MsWUFBWixHQUEyQkEsYUFBYUssT0FBYixFQUEzQjtBQUNBbEQsb0NBQVFGLEtBQVI7QUFDSCx5QkFIRDtBQUlILHFCQWJEO0FBY0g7QUFFSixhQTVCTSxDQUFQO0FBNkJIOzs7MENBQ2lCYyxPLEVBQVF1QyxHLEVBQUk7QUFDMUIsZ0JBQUl2QixNQUFNLElBQVY7QUFDQSxtQkFBTyxJQUFJN0IsT0FBSixDQUFZLFVBQUNDLE9BQUQsRUFBU0MsTUFBVCxFQUFrQjtBQUNqQ0wsaUNBQWlCaUIsV0FBakIsQ0FBNkJwQix1QkFBN0IsRUFBc0QwRCxHQUF0RCxFQUEwRCxVQUFDL0MsR0FBRCxFQUFLZ0QsU0FBTCxFQUFpQjtBQUN2RXBELDRCQUFRLEVBQUNlLFNBQVEsSUFBVCxFQUFSO0FBQ0FhLHdCQUFJSyxrQkFBSixDQUF1QnJCLE9BQXZCO0FBQ0gsaUJBSEQ7QUFJSCxhQUxNLENBQVA7QUFNSCIsImZpbGUiOiJSZWRpc1NlcnZpY2VzL1BsYW5lU2VydmljZS5qcyIsInNvdXJjZXNDb250ZW50IjpbImltcG9ydCB7IElOU1BFQ1RfTUFYX0JZVEVTIH0gZnJvbSAnYnVmZmVyJztcblxudmFyIHJlZGlzID0gcmVxdWlyZSgncmVkaXMnKTtcbnZhciBscmVkaXMgPSByZXF1aXJlKCcuL3JlZGlzLWxvY2FsJyk7XG52YXIgZGF0YUNvbnRleHQgPSByZXF1aXJlKCcuL2RhdGFDb250ZXh0Jyk7IFxudmFyIHJlZGlzU2VhcmNoID0gcmVxdWlyZSgnLi4vcmVkaXNlYXJjaGNsaWVudC9pbmRleCcpO1xuY29uc3QgUFJFRklYID0gXCJwbGFuZTpcIlxuY29uc3QgSU5ERVggPSBcImluZGV4OnBsYW5lc1wiXG5jb25zdCBQTEFORV9DT1VOVEVSID0gXCJwbGFuZTppZFwiOyBcbmNvbnN0IENPTVBBUlRNRU5UX0NPVU5URVIgPSBcImNvbXBhcnRtZW50OmlkXCJcbmNvbnN0IFBMQU5FX0NPTVBBUlRNRU5UX0lOREVYID0gXCJpbmRleDpjb21wYXJ0bWVudHNcIlxuXG4gXG5cbmNvbnN0IHJzID0gcmVkaXNTZWFyY2gocmVkaXMsIElOREVYLCB7XG4gICAgY2xpZW50T3B0aW9uczpkYXRhQ29udGV4dC5jbGllbnRPcHRpb25zXG59KTtcbmNvbnN0IGNvbXBhcnRtZW50SW5kZXggPSByZWRpc1NlYXJjaChyZWRpcywgUExBTkVfQ09NUEFSVE1FTlRfSU5ERVgsIHtcbiAgICBjbGllbnRPcHRpb25zOmRhdGFDb250ZXh0LmNsaWVudE9wdGlvbnNcbn0pO1xuZXhwb3J0IGNsYXNzIFBsYW5lU2VydmljZXtcbiAgICBjb25zdHJ1Y3Rvcigpe1xuXG4gICAgfVxuICAgIGFkZFBsYW5lKHBsYW5lKXtcbiAgICAgICAgcmV0dXJuIG5ldyBQcm9taXNlKChyZXNvbHZlLHJlamVjdCk9PntcbiAgICAgICAgICBkYXRhQ29udGV4dC5yZWRpc0NsaWVudC5pbmNyKFBMQU5FX0NPVU5URVIsKGVycixpZCk9PntcbiAgICAgICAgICAgICAgcGxhbmUuaWQgPSBpZDsgXG4gICAgICAgICAgICAgIGRhdGFDb250ZXh0LnJlZGlzQ2xpZW50Lmhtc2V0KFBSRUZJWCtpZCxwbGFuZSk7IFxuICAgICAgICAgICAgICBycy5hZGQoaWQscGxhbmUsKGVycixyZXMpPT57XG4gICAgICAgICAgICAgICAgICByZXNvbHZlKHtzYXZlZDp0cnVlfSk7IFxuICAgICAgICAgICAgICB9KTsgXG4gICAgICAgICAgfSlcbiAgICAgICAgfSlcbiAgICB9XG4gICAgdXBkYXRlUGxhbmUocGxhbmUpe1xuICAgICAgICByZXR1cm4gbmV3IFByb21pc2UgKChyZXNvbHZlLHJlamVjdCk9PntcbiAgICAgICAgICAgIGRhdGFDb250ZXh0LnJlZGlzQ2xpZW50Lmhtc2V0KFBSRUZJWCtwbGFuZS5pZCxwbGFuZSk7IFxuICAgICAgICAgICAgcnMudXBkYXRlKHBsYW5lLmlkLHBsYW5lLChlcnIscmVzdWx0KT0+e1xuICAgICAgICAgICAgICAgIHJlc29sdmUoe3NhdmVkOnRydWV9KVxuICAgICAgICAgICAgfSlcbiAgICAgICAgfSlcbiAgICB9XG4gICAgcm1QbGFuZShwbGFuZUlkKXtcbiAgICAgICAgcmV0dXJuIG5ldyBQcm9taXNlKChyZXNvbHZlLHJlamVjdCk9PntcbiAgICAgICAgICAgIHJzLmRlbERvY3VtZW50KElOREVYLHBsYW5lSWQpOyBcbiAgICAgICAgICAgIGRhdGFDb250ZXh0LnJlZGlzQ2xpZW50LmRlbChQUkVGSVgrcGxhbmVJZCwoZXJyLHJlcyk9PntcbiAgICAgICAgICAgICAgICByZXNvbHZlKHtkZWxldGVkOnRydWV9KVxuICAgICAgICAgICAgfSlcbiAgICAgICAgfSlcbiAgICB9XG4gICAgZ2V0UGxhbmUocGxhbmVJZCl7XG4gICAgICAgIHJldHVybiBuZXcgUHJvbWlzZSgocmVzb2x2ZSxyZWplY3QpPT57XG4gICAgICAgICAgICBkYXRhQ29udGV4dC5yZWRpc0NsaWVudC5oZ2V0YWxsKFBSRUZJWCtwbGFuZUlkLChlcnIscCk9PntcbiAgICAgICAgICAgICAgICByZXNvbHZlKHtwbGFuZTpwfSk7IFxuICAgICAgICAgICAgfSlcbiAgICAgICAgfSlcbiAgICB9XG4gICAgZ2V0UGxhbmVzKCl7XG4gICAgICAgIHJldHVybiBuZXcgUHJvbWlzZSgocmVzb2x2ZSxyZWplY3QpPT57XG4gICAgICAgICAgICBycy5zZWFyY2goJyonLHt9LChlcnIscGxhbmVzUmVzdWx0KT0+e1xuICAgICAgICAgICAgICAgIGNvbnNvbGUubG9nKHBsYW5lc1Jlc3VsdClcbiAgICAgICAgICAgICAgICB2YXIgcGxhbmVzID0gW107IFxuICAgICAgICAgICAgICAgIHBsYW5lc1Jlc3VsdC5yZXN1bHRzLmZvckVhY2gocGxhbmUgPT4ge1xuICAgICAgICAgICAgICAgICAgICBwbGFuZXMucHVzaChwbGFuZS5kb2MpXG4gICAgICAgICAgICAgICAgICAgIFxuICAgICAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgICAgIHJlc29sdmUoe3BsYW5lczpwbGFuZXN9KTsgXG4gICAgICAgICAgICB9KVxuICAgICAgICB9KVxuICAgIH1cblxuICAgIGFkZENvbXBhcnRtZW50KGNvbXBhcm1lbnQpe1xuICAgICAgICB2YXIgc3J2ID0gdGhpczsgXG4gICAgICAgIHJldHVybiBuZXcgUHJvbWlzZSgocmVzb2x2ZSxyZWplY3QpPT57XG4gICAgICAgICAgICAgZGF0YUNvbnRleHQucmVkaXNDbGllbnQuaW5jcihDT01QQVJUTUVOVF9DT1VOVEVSLChlcnIsaWQpPT57XG4gICAgICAgICAgICAgICAgIGNvbXBhcm1lbnQuaWQgPSBpZDsgXG4gICAgICAgICAgICAgICAgIGNvbnNvbGUubG9nKGNvbXBhcm1lbnQpXG4gICAgICAgICAgICAgICAgIGlmIChpc05hTihOdW1iZXIoY29tcGFybWVudC52b2x1bWUpKSlcbiAgICAgICAgICAgICAgICAgY29tcGFybWVudC52b2x1bWUgPSAwIDsgXG4gICAgICAgICAgICAgICAgIGNvbXBhcnRtZW50SW5kZXguYWRkKGlkLGNvbXBhcm1lbnQsKGVycjEscmVzdWx0KT0+e1xuICAgICAgICAgICAgICAgICAgICAgaWYgKGVycjEpe1xuICAgICAgICAgICAgICAgICAgICAgICAgIGNvbnNvbGUubG9nKGVycjEpXG4gICAgICAgICAgICAgICAgICAgICAgICByZXNvbHZlKHtzYXZlZDpmYWxzZX0pXG4gICAgICAgICAgICAgICAgICAgICAgICByZXR1cm47IFxuICAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICAgc3J2LnVwZGF0ZVBsYW5lQ2FwY2l0eShjb21wYXJtZW50LnBsYW5lX2lkKVxuICAgICAgICAgICAgICAgICAgICByZXNvbHZlKHtzYXZlZDp0cnVlfSlcbiAgICAgICAgICAgICAgICAgfSk7IFxuICAgICAgICAgICAgIH0pXG4gICAgICAgIH0pXG4gICAgfVxuICAgIHVwZGF0ZVBsYW5lQ2FwY2l0eShwbGFuZUlkKXtcbiAgICAgICAgLy8gZ2V0IHRoZSBjb21wYXJ0bWVudHMgXG4gICAgICAgIFxuICAgICAgICB2YXIgdG90YWxfd2VpZ2h0ID0gMCA7IFxuICAgICAgICB2YXIgdG90YWxfdm9sdW1lID0gMCA7IFxuICAgICAgICBjb21wYXJ0bWVudEluZGV4LnNlYXJjaChgQHBsYW5lX2lkOlske3BsYW5lSWR9ICR7cGxhbmVJZH1dYCx7b2Zmc2V0OjAsbnVtYmVyT2ZSZXN1bHRzOjEwMH0sKGVycixjb21wUmVzdWx0cyk9PntcbiAgICAgICAgICAgIGlmKGVycilcbiAgICAgICAgICAgIGNvbnNvbGUubG9nKGVycilcbiAgICAgICAgICAgIGNvbXBSZXN1bHRzLnJlc3VsdHMuZm9yRWFjaChjb21wYXJ0bWVudCA9PiB7XG4gICAgICAgICAgICAgICAgaWYgKGlzTmFOKE51bWJlcihjb21wYXJ0bWVudC5kb2Mud2VpZ2h0KSkgPT0gZmFsc2Upe1xuICAgICAgICAgICAgICAgICAgICB0b3RhbF93ZWlnaHQgKz0gTnVtYmVyKGNvbXBhcnRtZW50LmRvYy53ZWlnaHQpXG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIGlmIChpc05hTihOdW1iZXIoY29tcGFydG1lbnQuZG9jLnZvbHVtZSkpID09IGZhbHNlKXtcbiAgICAgICAgICAgICAgICAgICAgdG90YWxfdm9sdW1lICs9IE51bWJlcihjb21wYXJ0bWVudC5kb2Mudm9sdW1lKVxuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICBycy5nZXREb2MocGxhbmVJZCwoZXJyMSxwbGFuZURvYyk9PntcbiAgICAgICAgICAgICAgICAgICAgdmFyIHBsYW5lID0gcGxhbmVEb2MuZG9jOyBcbiAgICAgICAgICAgICAgICAgICAgcGxhbmUubWF4aW11bV9jYXBhY2l0eSA9IHRvdGFsX3dlaWdodDsgXG4gICAgICAgICAgICAgICAgICAgIHJzLnVwZGF0ZShwbGFuZUlkLHBsYW5lKTsgXG4gICAgICAgICAgICAgICAgfSkgICAgXG4gICAgICAgICAgICB9KTtcbiAgICAgICAgICBcbiAgICAgICAgICAgIFxuICAgICAgICB9KVxuICAgIH1cbiAgICBsaXN0Q29tcGFydG1lbnRzKHBsYW5lSWQpe1xuICAgICAgICB2YXIgc3J2ID0gdGhpczsgXG4gICAgICAgIHJldHVybiBuZXcgUHJvbWlzZSgocmVzb2x2ZSxyZWplY3QpPT57XG4gICAgICAgICAgICBpZiAoIXBsYW5lSWQpe1xuICAgICAgICAgICAgICAgIHZhciBwbGFuZSAgPSB7IFxuICAgICAgICAgICAgICAgICAgICBwbGFuZTp7XG4gICAgICAgICAgICAgICAgICAgICAgICBjb21wYXJ0bWVudHM6W10gXG4gICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgXG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIHJldHVybiByZXNvbHZlKHBsYW5lKSA7IFxuXG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBlbHNlIHtcbiAgICAgICAgICAgICAgICBjb21wYXJ0bWVudEluZGV4LnNlYXJjaChgQHBsYW5lX2lkOlske3BsYW5lSWR9ICR7cGxhbmVJZH1dYCx7b2Zmc2V0OjAsbnVtYmVyT2ZSZXN1bHRzOjEwMCxzb3J0Qnk6J25hbWUnLGRpcjpcIkRFU0NcIn0sKGVycixjb21wUmVzdWx0cyk9PntcbiAgICAgICAgICAgICAgICAgICAgaWYgKGVycikgXG4gICAgICAgICAgICAgICAgICAgICAgICBjb25zb2xlLmxvZyhlcnIpXG4gICAgICAgICAgICAgICAgICAgIHZhciBjb21wYXJ0bWVudHMgPSBbXTsgXG4gICAgICAgICAgICAgICAgICAgIGNvbXBSZXN1bHRzLnJlc3VsdHMuZm9yRWFjaChjb21wYXJ0bWVudCA9PiB7XG4gICAgICAgICAgICAgICAgICAgICAgICBcbiAgICAgICAgICAgICAgICAgICAgICAgIGNvbXBhcnRtZW50cy5wdXNoKGNvbXBhcnRtZW50LmRvYylcbiAgICAgICAgICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICAgICAgICAgIC8vXG4gICAgICAgICAgICAgICAgICAgIHNydi5nZXRQbGFuZShwbGFuZUlkKS50aGVuKHBsYW5lPT57XG4gICAgICAgICAgICAgICAgICAgICAgICBwbGFuZS5wbGFuZS5jb21wYXJ0bWVudHMgPSBjb21wYXJ0bWVudHMucmV2ZXJzZSgpOyBcbiAgICAgICAgICAgICAgICAgICAgICAgIHJlc29sdmUocGxhbmUpOyBcbiAgICAgICAgICAgICAgICAgICAgfSlcbiAgICAgICAgICAgICAgICB9KVxuICAgICAgICAgICAgfVxuICAgICAgICAgIFxuICAgICAgICB9KVxuICAgIH1cbiAgICByZW1vdmVDb21wYXJ0bWVudChwbGFuZUlkLGNpZCl7XG4gICAgICAgIHZhciBzcnYgPSB0aGlzOyBcbiAgICAgICAgcmV0dXJuIG5ldyBQcm9taXNlKChyZXNvbHZlLHJlamVjdCk9PntcbiAgICAgICAgICAgIGNvbXBhcnRtZW50SW5kZXguZGVsRG9jdW1lbnQoUExBTkVfQ09NUEFSVE1FTlRfSU5ERVgsIGNpZCwoZXJyLGRlbFJlc3VsdCk9PntcbiAgICAgICAgICAgICAgICByZXNvbHZlKHtkZWxldGVkOnRydWV9KVxuICAgICAgICAgICAgICAgIHNydi51cGRhdGVQbGFuZUNhcGNpdHkocGxhbmVJZClcbiAgICAgICAgICAgIH0pOyBcbiAgICAgICAgfSlcbiAgICB9XG4gICBcbn0iXX0=
