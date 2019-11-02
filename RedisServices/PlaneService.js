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
                    return plane;
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
//# sourceMappingURL=data:application/json;charset=utf8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIlJlZGlzU2VydmljZXMvUGxhbmVTZXJ2aWNlLmVzNiJdLCJuYW1lcyI6WyJyZWRpcyIsInJlcXVpcmUiLCJscmVkaXMiLCJkYXRhQ29udGV4dCIsInJlZGlzU2VhcmNoIiwiUFJFRklYIiwiSU5ERVgiLCJQTEFORV9DT1VOVEVSIiwiQ09NUEFSVE1FTlRfQ09VTlRFUiIsIlBMQU5FX0NPTVBBUlRNRU5UX0lOREVYIiwicnMiLCJjbGllbnRPcHRpb25zIiwiY29tcGFydG1lbnRJbmRleCIsIlBsYW5lU2VydmljZSIsInBsYW5lIiwiUHJvbWlzZSIsInJlc29sdmUiLCJyZWplY3QiLCJyZWRpc0NsaWVudCIsImluY3IiLCJlcnIiLCJpZCIsImhtc2V0IiwiYWRkIiwicmVzIiwic2F2ZWQiLCJ1cGRhdGUiLCJyZXN1bHQiLCJwbGFuZUlkIiwiZGVsRG9jdW1lbnQiLCJkZWwiLCJkZWxldGVkIiwiaGdldGFsbCIsInAiLCJzZWFyY2giLCJwbGFuZXNSZXN1bHQiLCJjb25zb2xlIiwibG9nIiwicGxhbmVzIiwicmVzdWx0cyIsImZvckVhY2giLCJwdXNoIiwiZG9jIiwiY29tcGFybWVudCIsInNydiIsImlzTmFOIiwiTnVtYmVyIiwidm9sdW1lIiwiZXJyMSIsInVwZGF0ZVBsYW5lQ2FwY2l0eSIsInBsYW5lX2lkIiwidG90YWxfd2VpZ2h0IiwidG90YWxfdm9sdW1lIiwib2Zmc2V0IiwibnVtYmVyT2ZSZXN1bHRzIiwiY29tcFJlc3VsdHMiLCJjb21wYXJ0bWVudCIsIndlaWdodCIsImdldERvYyIsInBsYW5lRG9jIiwibWF4aW11bV9jYXBhY2l0eSIsImNvbXBhcnRtZW50cyIsInNvcnRCeSIsImRpciIsImdldFBsYW5lIiwidGhlbiIsInJldmVyc2UiLCJjaWQiLCJkZWxSZXN1bHQiXSwibWFwcGluZ3MiOiI7Ozs7Ozs7OztBQUFBOzs7O0FBRUEsSUFBSUEsUUFBUUMsUUFBUSxPQUFSLENBQVo7QUFDQSxJQUFJQyxTQUFTRCxRQUFRLGVBQVIsQ0FBYjtBQUNB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QTFCLEVBQThCUSxRQUFPLE1BQXJDLEVBQTRDQyxLQUFJLE1BQWhELEVBQTVELEVBQW9ILFVBQUMzQyxHQUFELEVBQUttQyxXQUFMLEVBQW1CO0FBQ25JLDRCQUFJbkMsR0FBSixFQUNJZ0IsUUFBUUMsR0FBUixDQUFZakIsR0FBWjtBQUNKLDRCQUFJeUMsZUFBZSxFQUFuQjtBQUNBTixvQ0FBWWhCLE9BQVosQ0FBb0JDLE9BQXBCLENBQTRCLHVCQUFlOztBQUV2Q3FCLHlDQUFhcEIsSUFBYixDQUFrQmUsWUFBWWQsR0FBOUI7QUFDSCx5QkFIRDtBQUlBO0FBQ0FFLDRCQUFJb0IsUUFBSixDQUFhcEMsT0FBYixFQUFzQnFDLElBQXRCLENBQTJCLGlCQUFPO0FBQzlCbkQsa0NBQU1BLEtBQU4sQ0FBWStDLFlBQVosR0FBMkJBLGFBQWFLLE9BQWIsRUFBM0I7QUFDQWxELG9DQUFRRixLQUFSO0FBQ0gseUJBSEQ7QUFJSCxxQkFiRDtBQWNIO0FBRUosYUE1Qk0sQ0FBUDtBQTZCSDs7OzBDQUNpQmMsTyxFQUFRdUMsRyxFQUFJO0FBQzFCLGdCQUFJdkIsTUFBTSxJQUFWO0FBQ0EsbUJBQU8sSUFBSTdCLE9BQUosQ0FBWSxVQUFDQyxPQUFELEVBQVNDLE1BQVQsRUFBa0I7QUFDakNMLGlDQUFpQmlCLFdBQWpCLENBQTZCcEIsdUJBQTdCLEVBQXNEMEQsR0FBdEQsRUFBMEQsVUFBQy9DLEdBQUQsRUFBS2dELFNBQUwsRUFBaUI7QUFDdkVwRCw0QkFBUSxFQUFDZSxTQUFRLElBQVQsRUFBUjtBQUNBYSx3QkFBSUssa0JBQUosQ0FBdUJyQixPQUF2QjtBQUNILGlCQUhEO0FBSUgsYUFMTSxDQUFQO0FBTUgiLCJmaWxlIjoiUmVkaXNTZXJ2aWNlcy9QbGFuZVNlcnZpY2UuanMiLCJzb3VyY2VzQ29udGVudCI6WyJpbXBvcnQgeyBJTlNQRUNUX01BWF9CWVRFUyB9IGZyb20gJ2J1ZmZlcic7XG5cbnZhciByZWRpcyA9IHJlcXVpcmUoJ3JlZGlzJyk7XG52YXIgbHJlZGlzID0gcmVxdWlyZSgnLi9yZWRpcy1sb2NhbCcpO1xudmFyIGRhdGFDb250ZXh0ID0gcmVxdWlyZSgnLi9kYXRhQ29udGV4dCcpOyBcbnZhciByZWRpc1NlYXJjaCA9IHJlcXVpcmUoJy4uL3JlZGlzZWFyY2hjbGllbnQvaW5kZXgnKTtcbmNvbnN0IFBSRUZJWCA9IFwicGxhbmU6XCJcbmNvbnN0IElOREVYID0gXCJpbmRleDpwbGFuZXNcIlxuY29uc3QgUExBTkVfQ09VTlRFUiA9IFwicGxhbmU6aWRcIjsgXG5jb25zdCBDT01QQVJUTUVOVF9DT1VOVEVSID0gXCJjb21wYXJ0bWVudDppZFwiXG5jb25zdCBQTEFORV9DT01QQVJUTUVOVF9JTkRFWCA9IFwiaW5kZXg6Y29tcGFydG1lbnRzXCJcblxuIFxuXG5jb25zdCBycyA9IHJlZGlzU2VhcmNoKHJlZGlzLCBJTkRFWCwge1xuICAgIGNsaWVudE9wdGlvbnM6ZGF0YUNvbnRleHQuY2xpZW50T3B0aW9uc1xufSk7XG5jb25zdCBjb21wYXJ0bWVudEluZGV4ID0gcmVkaXNTZWFyY2gocmVkaXMsIFBMQU5FX0NPTVBBUlRNRU5UX0lOREVYLCB7XG4gICAgY2xpZW50T3B0aW9uczpkYXRhQ29udGV4dC5jbGllbnRPcHRpb25zXG59KTtcbmV4cG9ydCBjbGFzcyBQbGFuZVNlcnZpY2V7XG4gICAgY29uc3RydWN0b3IoKXtcblxuICAgIH1cbiAgICBhZGRQbGFuZShwbGFuZSl7XG4gICAgICAgIHJldHVybiBuZXcgUHJvbWlzZSgocmVzb2x2ZSxyZWplY3QpPT57XG4gICAgICAgICAgZGF0YUNvbnRleHQucmVkaXNDbGllbnQuaW5jcihQTEFORV9DT1VOVEVSLChlcnIsaWQpPT57XG4gICAgICAgICAgICAgIHBsYW5lLmlkID0gaWQ7IFxuICAgICAgICAgICAgICBkYXRhQ29udGV4dC5yZWRpc0NsaWVudC5obXNldChQUkVGSVgraWQscGxhbmUpOyBcbiAgICAgICAgICAgICAgcnMuYWRkKGlkLHBsYW5lLChlcnIscmVzKT0+e1xuICAgICAgICAgICAgICAgICAgcmVzb2x2ZSh7c2F2ZWQ6dHJ1ZX0pOyBcbiAgICAgICAgICAgICAgfSk7IFxuICAgICAgICAgIH0pXG4gICAgICAgIH0pXG4gICAgfVxuICAgIHVwZGF0ZVBsYW5lKHBsYW5lKXtcbiAgICAgICAgcmV0dXJuIG5ldyBQcm9taXNlICgocmVzb2x2ZSxyZWplY3QpPT57XG4gICAgICAgICAgICBkYXRhQ29udGV4dC5yZWRpc0NsaWVudC5obXNldChQUkVGSVgrcGxhbmUuaWQscGxhbmUpOyBcbiAgICAgICAgICAgIHJzLnVwZGF0ZShwbGFuZS5pZCxwbGFuZSwoZXJyLHJlc3VsdCk9PntcbiAgICAgICAgICAgICAgICByZXNvbHZlKHtzYXZlZDp0cnVlfSlcbiAgICAgICAgICAgIH0pXG4gICAgICAgIH0pXG4gICAgfVxuICAgIHJtUGxhbmUocGxhbmVJZCl7XG4gICAgICAgIHJldHVybiBuZXcgUHJvbWlzZSgocmVzb2x2ZSxyZWplY3QpPT57XG4gICAgICAgICAgICBycy5kZWxEb2N1bWVudChJTkRFWCxwbGFuZUlkKTsgXG4gICAgICAgICAgICBkYXRhQ29udGV4dC5yZWRpc0NsaWVudC5kZWwoUFJFRklYK3BsYW5lSWQsKGVycixyZXMpPT57XG4gICAgICAgICAgICAgICAgcmVzb2x2ZSh7ZGVsZXRlZDp0cnVlfSlcbiAgICAgICAgICAgIH0pXG4gICAgICAgIH0pXG4gICAgfVxuICAgIGdldFBsYW5lKHBsYW5lSWQpe1xuICAgICAgICByZXR1cm4gbmV3IFByb21pc2UoKHJlc29sdmUscmVqZWN0KT0+e1xuICAgICAgICAgICAgZGF0YUNvbnRleHQucmVkaXNDbGllbnQuaGdldGFsbChQUkVGSVgrcGxhbmVJZCwoZXJyLHApPT57XG4gICAgICAgICAgICAgICAgcmVzb2x2ZSh7cGxhbmU6cH0pOyBcbiAgICAgICAgICAgIH0pXG4gICAgICAgIH0pXG4gICAgfVxuICAgIGdldFBsYW5lcygpe1xuICAgICAgICByZXR1cm4gbmV3IFByb21pc2UoKHJlc29sdmUscmVqZWN0KT0+e1xuICAgICAgICAgICAgcnMuc2VhcmNoKCcqJyx7fSwoZXJyLHBsYW5lc1Jlc3VsdCk9PntcbiAgICAgICAgICAgICAgICBjb25zb2xlLmxvZyhwbGFuZXNSZXN1bHQpXG4gICAgICAgICAgICAgICAgdmFyIHBsYW5lcyA9IFtdOyBcbiAgICAgICAgICAgICAgICBwbGFuZXNSZXN1bHQucmVzdWx0cy5mb3JFYWNoKHBsYW5lID0+IHtcbiAgICAgICAgICAgICAgICAgICAgcGxhbmVzLnB1c2gocGxhbmUuZG9jKVxuICAgICAgICAgICAgICAgICAgICBcbiAgICAgICAgICAgICAgICB9KTtcbiAgICAgICAgICAgICAgICByZXNvbHZlKHtwbGFuZXM6cGxhbmVzfSk7IFxuICAgICAgICAgICAgfSlcbiAgICAgICAgfSlcbiAgICB9XG5cbiAgICBhZGRDb21wYXJ0bWVudChjb21wYXJtZW50KXtcbiAgICAgICAgdmFyIHNydiA9IHRoaXM7IFxuICAgICAgICByZXR1cm4gbmV3IFByb21pc2UoKHJlc29sdmUscmVqZWN0KT0+e1xuICAgICAgICAgICAgIGRhdGFDb250ZXh0LnJlZGlzQ2xpZW50LmluY3IoQ09NUEFSVE1FTlRfQ09VTlRFUiwoZXJyLGlkKT0+e1xuICAgICAgICAgICAgICAgICBjb21wYXJtZW50LmlkID0gaWQ7IFxuICAgICAgICAgICAgICAgICBjb25zb2xlLmxvZyhjb21wYXJtZW50KVxuICAgICAgICAgICAgICAgICBpZiAoaXNOYU4oTnVtYmVyKGNvbXBhcm1lbnQudm9sdW1lKSkpXG4gICAgICAgICAgICAgICAgIGNvbXBhcm1lbnQudm9sdW1lID0gMCA7IFxuICAgICAgICAgICAgICAgICBjb21wYXJ0bWVudEluZGV4LmFkZChpZCxjb21wYXJtZW50LChlcnIxLHJlc3VsdCk9PntcbiAgICAgICAgICAgICAgICAgICAgIGlmIChlcnIxKXtcbiAgICAgICAgICAgICAgICAgICAgICAgICBjb25zb2xlLmxvZyhlcnIxKVxuICAgICAgICAgICAgICAgICAgICAgICAgcmVzb2x2ZSh7c2F2ZWQ6ZmFsc2V9KVxuICAgICAgICAgICAgICAgICAgICAgICAgcmV0dXJuOyBcbiAgICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgIHNydi51cGRhdGVQbGFuZUNhcGNpdHkoY29tcGFybWVudC5wbGFuZV9pZClcbiAgICAgICAgICAgICAgICAgICAgcmVzb2x2ZSh7c2F2ZWQ6dHJ1ZX0pXG4gICAgICAgICAgICAgICAgIH0pOyBcbiAgICAgICAgICAgICB9KVxuICAgICAgICB9KVxuICAgIH1cbiAgICB1cGRhdGVQbGFuZUNhcGNpdHkocGxhbmVJZCl7XG4gICAgICAgIC8vIGdldCB0aGUgY29tcGFydG1lbnRzIFxuICAgICAgICBcbiAgICAgICAgdmFyIHRvdGFsX3dlaWdodCA9IDAgOyBcbiAgICAgICAgdmFyIHRvdGFsX3ZvbHVtZSA9IDAgOyBcbiAgICAgICAgY29tcGFydG1lbnRJbmRleC5zZWFyY2goYEBwbGFuZV9pZDpbJHtwbGFuZUlkfSAke3BsYW5lSWR9XWAse29mZnNldDowLG51bWJlck9mUmVzdWx0czoxMDB9LChlcnIsY29tcFJlc3VsdHMpPT57XG4gICAgICAgICAgICBpZihlcnIpXG4gICAgICAgICAgICBjb25zb2xlLmxvZyhlcnIpXG4gICAgICAgICAgICBjb21wUmVzdWx0cy5yZXN1bHRzLmZvckVhY2goY29tcGFydG1lbnQgPT4ge1xuICAgICAgICAgICAgICAgIGlmIChpc05hTihOdW1iZXIoY29tcGFydG1lbnQuZG9jLndlaWdodCkpID09IGZhbHNlKXtcbiAgICAgICAgICAgICAgICAgICAgdG90YWxfd2VpZ2h0ICs9IE51bWJlcihjb21wYXJ0bWVudC5kb2Mud2VpZ2h0KVxuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICBpZiAoaXNOYU4oTnVtYmVyKGNvbXBhcnRtZW50LmRvYy52b2x1bWUpKSA9PSBmYWxzZSl7XG4gICAgICAgICAgICAgICAgICAgIHRvdGFsX3ZvbHVtZSArPSBOdW1iZXIoY29tcGFydG1lbnQuZG9jLnZvbHVtZSlcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgcnMuZ2V0RG9jKHBsYW5lSWQsKGVycjEscGxhbmVEb2MpPT57XG4gICAgICAgICAgICAgICAgICAgIHZhciBwbGFuZSA9IHBsYW5lRG9jLmRvYzsgXG4gICAgICAgICAgICAgICAgICAgIHBsYW5lLm1heGltdW1fY2FwYWNpdHkgPSB0b3RhbF93ZWlnaHQ7IFxuICAgICAgICAgICAgICAgICAgICBycy51cGRhdGUocGxhbmVJZCxwbGFuZSk7IFxuICAgICAgICAgICAgICAgIH0pICAgIFxuICAgICAgICAgICAgfSk7XG4gICAgICAgICAgXG4gICAgICAgICAgICBcbiAgICAgICAgfSlcbiAgICB9XG4gICAgbGlzdENvbXBhcnRtZW50cyhwbGFuZUlkKXtcbiAgICAgICAgdmFyIHNydiA9IHRoaXM7IFxuICAgICAgICByZXR1cm4gbmV3IFByb21pc2UoKHJlc29sdmUscmVqZWN0KT0+e1xuICAgICAgICAgICAgaWYgKCFwbGFuZUlkKXtcbiAgICAgICAgICAgICAgICB2YXIgcGxhbmUgID0geyBcbiAgICAgICAgICAgICAgICAgICAgcGxhbmU6e1xuICAgICAgICAgICAgICAgICAgICAgICAgY29tcGFydG1lbnRzOltdIFxuICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgIFxuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICByZXR1cm4gcGxhbmUgOyBcblxuICAgICAgICAgICAgfVxuICAgICAgICAgICAgZWxzZSB7XG4gICAgICAgICAgICAgICAgY29tcGFydG1lbnRJbmRleC5zZWFyY2goYEBwbGFuZV9pZDpbJHtwbGFuZUlkfSAke3BsYW5lSWR9XWAse29mZnNldDowLG51bWJlck9mUmVzdWx0czoxMDAsc29ydEJ5OiduYW1lJyxkaXI6XCJERVNDXCJ9LChlcnIsY29tcFJlc3VsdHMpPT57XG4gICAgICAgICAgICAgICAgICAgIGlmIChlcnIpIFxuICAgICAgICAgICAgICAgICAgICAgICAgY29uc29sZS5sb2coZXJyKVxuICAgICAgICAgICAgICAgICAgICB2YXIgY29tcGFydG1lbnRzID0gW107IFxuICAgICAgICAgICAgICAgICAgICBjb21wUmVzdWx0cy5yZXN1bHRzLmZvckVhY2goY29tcGFydG1lbnQgPT4ge1xuICAgICAgICAgICAgICAgICAgICAgICAgXG4gICAgICAgICAgICAgICAgICAgICAgICBjb21wYXJ0bWVudHMucHVzaChjb21wYXJ0bWVudC5kb2MpXG4gICAgICAgICAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgICAgICAgICAvL1xuICAgICAgICAgICAgICAgICAgICBzcnYuZ2V0UGxhbmUocGxhbmVJZCkudGhlbihwbGFuZT0+e1xuICAgICAgICAgICAgICAgICAgICAgICAgcGxhbmUucGxhbmUuY29tcGFydG1lbnRzID0gY29tcGFydG1lbnRzLnJldmVyc2UoKTsgXG4gICAgICAgICAgICAgICAgICAgICAgICByZXNvbHZlKHBsYW5lKTsgXG4gICAgICAgICAgICAgICAgICAgIH0pXG4gICAgICAgICAgICAgICAgfSlcbiAgICAgICAgICAgIH1cbiAgICAgICAgICBcbiAgICAgICAgfSlcbiAgICB9XG4gICAgcmVtb3ZlQ29tcGFydG1lbnQocGxhbmVJZCxjaWQpe1xuICAgICAgICB2YXIgc3J2ID0gdGhpczsgXG4gICAgICAgIHJldHVybiBuZXcgUHJvbWlzZSgocmVzb2x2ZSxyZWplY3QpPT57XG4gICAgICAgICAgICBjb21wYXJ0bWVudEluZGV4LmRlbERvY3VtZW50KFBMQU5FX0NPTVBBUlRNRU5UX0lOREVYLCBjaWQsKGVycixkZWxSZXN1bHQpPT57XG4gICAgICAgICAgICAgICAgcmVzb2x2ZSh7ZGVsZXRlZDp0cnVlfSlcbiAgICAgICAgICAgICAgICBzcnYudXBkYXRlUGxhbmVDYXBjaXR5KHBsYW5lSWQpXG4gICAgICAgICAgICB9KTsgXG4gICAgICAgIH0pXG4gICAgfVxuICAgXG59Il19
