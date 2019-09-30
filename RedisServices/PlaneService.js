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
                compartmentIndex.search('@plane_id:[' + planeId + ' ' + planeId + ']', { offset: 0, numberOfResults: 100 }, function (err, compResults) {
                    var compartments = [];
                    compResults.results.forEach(function (compartment) {
                        compartments.push(compartment.doc);
                    });
                    //
                    srv.getPlane(planeId).then(function (plane) {
                        plane.plane.compartments = compartments;
                        resolve(plane);
                    });
                });
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
//# sourceMappingURL=data:application/json;charset=utf8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIlJlZGlzU2VydmljZXMvUGxhbmVTZXJ2aWNlLmVzNiJdLCJuYW1lcyI6WyJyZWRpcyIsInJlcXVpcmUiLCJscmVkaXMiLCJkYXRhQ29udGV4dCIsInJlZGlzU2VhcmNoIiwiUFJFRklYIiwiSU5ERVgiLCJQTEFORV9DT1VOVEVSIiwiQ09NUEFSVE1FTlRfQ09VTlRFUiIsIlBMQU5FX0NPTVBBUlRNRU5UX0lOREVYIiwicnMiLCJjbGllbnRPcHRpb25zIiwiY29tcGFydG1lbnRJbmRleCIsIlBsYW5lU2VydmljZSIsInBsYW5lIiwiUHJvbWlzZSIsInJlc29sdmUiLCJyZWplY3QiLCJyZWRpc0NsaWVudCIsImluY3IiLCJlcnIiLCJpZCIsImhtc2V0IiwiYWRkIiwicmVzIiwic2F2ZWQiLCJ1cGRhdGUiLCJyZXN1bHQiLCJwbGFuZUlkIiwiZGVsRG9jdW1lbnQiLCJkZWwiLCJkZWxldGVkIiwiaGdldGFsbCIsInAiLCJzZWFyY2giLCJwbGFuZXNSZXN1bHQiLCJjb25zb2xlIiwibG9nIiwicGxhbmVzIiwicmVzdWx0cyIsImZvckVhY2giLCJwdXNoIiwiZG9jIiwiY29tcGFybWVudCIsInNydiIsImlzTmFOIiwiTnVtYmVyIiwidm9sdW1lIiwiZXJyMSIsInVwZGF0ZVBsYW5lQ2FwY2l0eSIsInBsYW5lX2lkIiwidG90YWxfd2VpZ2h0IiwidG90YWxfdm9sdW1lIiwib2Zmc2V0IiwibnVtYmVyT2ZSZXN1bHRzIiwiY29tcFJlc3VsdHMiLCJjb21wYXJ0bWVudCIsIndlaWdodCIsImdldERvYyIsInBsYW5lRG9jIiwibWF4aW11bV9jYXBhY2l0eSIsImNvbXBhcnRtZW50cyIsImdldFBsYW5lIiwidGhlbiIsImNpZCIsImRlbFJlc3VsdCJdLCJtYXBwaW5ncyI6Ijs7Ozs7Ozs7O0FBQUE7Ozs7QUFFQSxJQUFJQSxRQUFRQyxRQUFRLE9BQVIsQ0FBWjtBQUNBLElBQUlDLFNBQVNELFFBQVEsZUFBUixDQUFiO0FBQ0EsSUFBSUUsY0FBY0YsUUFBUSxlQUFSLENB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WWQsR0FBOUI7QUFDSCxxQkFGRDtBQUdBO0FBQ0FFLHdCQUFJa0IsUUFBSixDQUFhbEMsT0FBYixFQUFzQm1DLElBQXRCLENBQTJCLGlCQUFPO0FBQzlCakQsOEJBQU1BLEtBQU4sQ0FBWStDLFlBQVosR0FBMkJBLFlBQTNCO0FBQ0E3QyxnQ0FBUUYsS0FBUjtBQUNILHFCQUhEO0FBSUgsaUJBVkQ7QUFXSCxhQVpNLENBQVA7QUFhSDs7OzBDQUNpQmMsTyxFQUFRb0MsRyxFQUFJO0FBQzFCLGdCQUFJcEIsTUFBTSxJQUFWO0FBQ0EsbUJBQU8sSUFBSTdCLE9BQUosQ0FBWSxVQUFDQyxPQUFELEVBQVNDLE1BQVQsRUFBa0I7QUFDakNMLGlDQUFpQmlCLFdBQWpCLENBQTZCcEIsdUJBQTdCLEVBQXNEdUQsR0FBdEQsRUFBMEQsVUFBQzVDLEdBQUQsRUFBSzZDLFNBQUwsRUFBaUI7QUFDdkVqRCw0QkFBUSxFQUFDZSxTQUFRLElBQVQsRUFBUjtBQUNBYSx3QkFBSUssa0JBQUosQ0FBdUJyQixPQUF2QjtBQUNILGlCQUhEO0FBSUgsYUFMTSxDQUFQO0FBTUgiLCJmaWxlIjoiUmVkaXNTZXJ2aWNlcy9QbGFuZVNlcnZpY2UuanMiLCJzb3VyY2VzQ29udGVudCI6WyJpbXBvcnQgeyBJTlNQRUNUX01BWF9CWVRFUyB9IGZyb20gJ2J1ZmZlcic7XG5cbnZhciByZWRpcyA9IHJlcXVpcmUoJ3JlZGlzJyk7XG52YXIgbHJlZGlzID0gcmVxdWlyZSgnLi9yZWRpcy1sb2NhbCcpO1xudmFyIGRhdGFDb250ZXh0ID0gcmVxdWlyZSgnLi9kYXRhQ29udGV4dCcpOyBcbnZhciByZWRpc1NlYXJjaCA9IHJlcXVpcmUoJy4uL3JlZGlzZWFyY2hjbGllbnQvaW5kZXgnKTtcbmNvbnN0IFBSRUZJWCA9IFwicGxhbmU6XCJcbmNvbnN0IElOREVYID0gXCJpbmRleDpwbGFuZXNcIlxuY29uc3QgUExBTkVfQ09VTlRFUiA9IFwicGxhbmU6aWRcIjsgXG5jb25zdCBDT01QQVJUTUVOVF9DT1VOVEVSID0gXCJjb21wYXJ0bWVudDppZFwiXG5jb25zdCBQTEFORV9DT01QQVJUTUVOVF9JTkRFWCA9IFwiaW5kZXg6Y29tcGFydG1lbnRzXCJcblxuIFxuXG5jb25zdCBycyA9IHJlZGlzU2VhcmNoKHJlZGlzLCBJTkRFWCwge1xuICAgIGNsaWVudE9wdGlvbnM6ZGF0YUNvbnRleHQuY2xpZW50T3B0aW9uc1xufSk7XG5jb25zdCBjb21wYXJ0bWVudEluZGV4ID0gcmVkaXNTZWFyY2gocmVkaXMsIFBMQU5FX0NPTVBBUlRNRU5UX0lOREVYLCB7XG4gICAgY2xpZW50T3B0aW9uczpkYXRhQ29udGV4dC5jbGllbnRPcHRpb25zXG59KTtcbmV4cG9ydCBjbGFzcyBQbGFuZVNlcnZpY2V7XG4gICAgY29uc3RydWN0b3IoKXtcblxuICAgIH1cbiAgICBhZGRQbGFuZShwbGFuZSl7XG4gICAgICAgIHJldHVybiBuZXcgUHJvbWlzZSgocmVzb2x2ZSxyZWplY3QpPT57XG4gICAgICAgICAgZGF0YUNvbnRleHQucmVkaXNDbGllbnQuaW5jcihQTEFORV9DT1VOVEVSLChlcnIsaWQpPT57XG4gICAgICAgICAgICAgIHBsYW5lLmlkID0gaWQ7IFxuICAgICAgICAgICAgICBkYXRhQ29udGV4dC5yZWRpc0NsaWVudC5obXNldChQUkVGSVgraWQscGxhbmUpOyBcbiAgICAgICAgICAgICAgcnMuYWRkKGlkLHBsYW5lLChlcnIscmVzKT0+e1xuICAgICAgICAgICAgICAgICAgcmVzb2x2ZSh7c2F2ZWQ6dHJ1ZX0pOyBcbiAgICAgICAgICAgICAgfSk7IFxuICAgICAgICAgIH0pXG4gICAgICAgIH0pXG4gICAgfVxuICAgIHVwZGF0ZVBsYW5lKHBsYW5lKXtcbiAgICAgICAgcmV0dXJuIG5ldyBQcm9taXNlICgocmVzb2x2ZSxyZWplY3QpPT57XG4gICAgICAgICAgICBkYXRhQ29udGV4dC5yZWRpc0NsaWVudC5obXNldChQUkVGSVgrcGxhbmUuaWQscGxhbmUpOyBcbiAgICAgICAgICAgIHJzLnVwZGF0ZShwbGFuZS5pZCxwbGFuZSwoZXJyLHJlc3VsdCk9PntcbiAgICAgICAgICAgICAgICByZXNvbHZlKHtzYXZlZDp0cnVlfSlcbiAgICAgICAgICAgIH0pXG4gICAgICAgIH0pXG4gICAgfVxuICAgIHJtUGxhbmUocGxhbmVJZCl7XG4gICAgICAgIHJldHVybiBuZXcgUHJvbWlzZSgocmVzb2x2ZSxyZWplY3QpPT57XG4gICAgICAgICAgICBycy5kZWxEb2N1bWVudChJTkRFWCxwbGFuZUlkKTsgXG4gICAgICAgICAgICBkYXRhQ29udGV4dC5yZWRpc0NsaWVudC5kZWwoUFJFRklYK3BsYW5lSWQsKGVycixyZXMpPT57XG4gICAgICAgICAgICAgICAgcmVzb2x2ZSh7ZGVsZXRlZDp0cnVlfSlcbiAgICAgICAgICAgIH0pXG4gICAgICAgIH0pXG4gICAgfVxuICAgIGdldFBsYW5lKHBsYW5lSWQpe1xuICAgICAgICByZXR1cm4gbmV3IFByb21pc2UoKHJlc29sdmUscmVqZWN0KT0+e1xuICAgICAgICAgICAgZGF0YUNvbnRleHQucmVkaXNDbGllbnQuaGdldGFsbChQUkVGSVgrcGxhbmVJZCwoZXJyLHApPT57XG4gICAgICAgICAgICAgICAgcmVzb2x2ZSh7cGxhbmU6cH0pOyBcbiAgICAgICAgICAgIH0pXG4gICAgICAgIH0pXG4gICAgfVxuICAgIGdldFBsYW5lcygpe1xuICAgICAgICByZXR1cm4gbmV3IFByb21pc2UoKHJlc29sdmUscmVqZWN0KT0+e1xuICAgICAgICAgICAgcnMuc2VhcmNoKCcqJyx7fSwoZXJyLHBsYW5lc1Jlc3VsdCk9PntcbiAgICAgICAgICAgICAgICBjb25zb2xlLmxvZyhwbGFuZXNSZXN1bHQpXG4gICAgICAgICAgICAgICAgdmFyIHBsYW5lcyA9IFtdOyBcbiAgICAgICAgICAgICAgICBwbGFuZXNSZXN1bHQucmVzdWx0cy5mb3JFYWNoKHBsYW5lID0+IHtcbiAgICAgICAgICAgICAgICAgICAgcGxhbmVzLnB1c2gocGxhbmUuZG9jKVxuICAgICAgICAgICAgICAgICAgICBcbiAgICAgICAgICAgICAgICB9KTtcbiAgICAgICAgICAgICAgICByZXNvbHZlKHtwbGFuZXM6cGxhbmVzfSk7IFxuICAgICAgICAgICAgfSlcbiAgICAgICAgfSlcbiAgICB9XG5cbiAgICBhZGRDb21wYXJ0bWVudChjb21wYXJtZW50KXtcbiAgICAgICAgdmFyIHNydiA9IHRoaXM7IFxuICAgICAgICByZXR1cm4gbmV3IFByb21pc2UoKHJlc29sdmUscmVqZWN0KT0+e1xuICAgICAgICAgICAgIGRhdGFDb250ZXh0LnJlZGlzQ2xpZW50LmluY3IoQ09NUEFSVE1FTlRfQ09VTlRFUiwoZXJyLGlkKT0+e1xuICAgICAgICAgICAgICAgICBjb21wYXJtZW50LmlkID0gaWQ7IFxuICAgICAgICAgICAgICAgICBjb25zb2xlLmxvZyhjb21wYXJtZW50KVxuICAgICAgICAgICAgICAgICBpZiAoaXNOYU4oTnVtYmVyKGNvbXBhcm1lbnQudm9sdW1lKSkpXG4gICAgICAgICAgICAgICAgIGNvbXBhcm1lbnQudm9sdW1lID0gMCA7IFxuICAgICAgICAgICAgICAgICBjb21wYXJ0bWVudEluZGV4LmFkZChpZCxjb21wYXJtZW50LChlcnIxLHJlc3VsdCk9PntcbiAgICAgICAgICAgICAgICAgICAgIGlmIChlcnIxKXtcbiAgICAgICAgICAgICAgICAgICAgICAgICBjb25zb2xlLmxvZyhlcnIxKVxuICAgICAgICAgICAgICAgICAgICAgICAgcmVzb2x2ZSh7c2F2ZWQ6ZmFsc2V9KVxuICAgICAgICAgICAgICAgICAgICAgICAgcmV0dXJuOyBcbiAgICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgIHNydi51cGRhdGVQbGFuZUNhcGNpdHkoY29tcGFybWVudC5wbGFuZV9pZClcbiAgICAgICAgICAgICAgICAgICAgcmVzb2x2ZSh7c2F2ZWQ6dHJ1ZX0pXG4gICAgICAgICAgICAgICAgIH0pOyBcbiAgICAgICAgICAgICB9KVxuICAgICAgICB9KVxuICAgIH1cbiAgICB1cGRhdGVQbGFuZUNhcGNpdHkocGxhbmVJZCl7XG4gICAgICAgIC8vIGdldCB0aGUgY29tcGFydG1lbnRzIFxuICAgICAgICBcbiAgICAgICAgdmFyIHRvdGFsX3dlaWdodCA9IDAgOyBcbiAgICAgICAgdmFyIHRvdGFsX3ZvbHVtZSA9IDAgOyBcbiAgICAgICAgY29tcGFydG1lbnRJbmRleC5zZWFyY2goYEBwbGFuZV9pZDpbJHtwbGFuZUlkfSAke3BsYW5lSWR9XWAse29mZnNldDowLG51bWJlck9mUmVzdWx0czoxMDB9LChlcnIsY29tcFJlc3VsdHMpPT57XG4gICAgICAgICAgICBpZihlcnIpXG4gICAgICAgICAgICBjb25zb2xlLmxvZyhlcnIpXG4gICAgICAgICAgICBjb21wUmVzdWx0cy5yZXN1bHRzLmZvckVhY2goY29tcGFydG1lbnQgPT4ge1xuICAgICAgICAgICAgICAgIGlmIChpc05hTihOdW1iZXIoY29tcGFydG1lbnQuZG9jLndlaWdodCkpID09IGZhbHNlKXtcbiAgICAgICAgICAgICAgICAgICAgdG90YWxfd2VpZ2h0ICs9IE51bWJlcihjb21wYXJ0bWVudC5kb2Mud2VpZ2h0KVxuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICBpZiAoaXNOYU4oTnVtYmVyKGNvbXBhcnRtZW50LmRvYy52b2x1bWUpKSA9PSBmYWxzZSl7XG4gICAgICAgICAgICAgICAgICAgIHRvdGFsX3ZvbHVtZSArPSBOdW1iZXIoY29tcGFydG1lbnQuZG9jLnZvbHVtZSlcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgcnMuZ2V0RG9jKHBsYW5lSWQsKGVycjEscGxhbmVEb2MpPT57XG4gICAgICAgICAgICAgICAgICAgIHZhciBwbGFuZSA9IHBsYW5lRG9jLmRvYzsgXG4gICAgICAgICAgICAgICAgICAgIHBsYW5lLm1heGltdW1fY2FwYWNpdHkgPSB0b3RhbF93ZWlnaHQ7IFxuICAgICAgICAgICAgICAgICAgICBycy51cGRhdGUocGxhbmVJZCxwbGFuZSk7IFxuICAgICAgICAgICAgICAgIH0pICAgIFxuICAgICAgICAgICAgfSk7XG4gICAgICAgICAgXG4gICAgICAgICAgICBcbiAgICAgICAgfSlcbiAgICB9XG4gICAgbGlzdENvbXBhcnRtZW50cyhwbGFuZUlkKXtcbiAgICAgICAgdmFyIHNydiA9IHRoaXM7IFxuICAgICAgICByZXR1cm4gbmV3IFByb21pc2UoKHJlc29sdmUscmVqZWN0KT0+e1xuICAgICAgICAgICAgY29tcGFydG1lbnRJbmRleC5zZWFyY2goYEBwbGFuZV9pZDpbJHtwbGFuZUlkfSAke3BsYW5lSWR9XWAse29mZnNldDowLG51bWJlck9mUmVzdWx0czoxMDB9LChlcnIsY29tcFJlc3VsdHMpPT57XG4gICAgICAgICAgICAgICAgdmFyIGNvbXBhcnRtZW50cyA9IFtdOyBcbiAgICAgICAgICAgICAgICBjb21wUmVzdWx0cy5yZXN1bHRzLmZvckVhY2goY29tcGFydG1lbnQgPT4ge1xuICAgICAgICAgICAgICAgICAgICBjb21wYXJ0bWVudHMucHVzaChjb21wYXJ0bWVudC5kb2MpXG4gICAgICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICAgICAgLy9cbiAgICAgICAgICAgICAgICBzcnYuZ2V0UGxhbmUocGxhbmVJZCkudGhlbihwbGFuZT0+e1xuICAgICAgICAgICAgICAgICAgICBwbGFuZS5wbGFuZS5jb21wYXJ0bWVudHMgPSBjb21wYXJ0bWVudHM7IFxuICAgICAgICAgICAgICAgICAgICByZXNvbHZlKHBsYW5lKTsgXG4gICAgICAgICAgICAgICAgfSlcbiAgICAgICAgICAgIH0pXG4gICAgICAgIH0pXG4gICAgfVxuICAgIHJlbW92ZUNvbXBhcnRtZW50KHBsYW5lSWQsY2lkKXtcbiAgICAgICAgdmFyIHNydiA9IHRoaXM7IFxuICAgICAgICByZXR1cm4gbmV3IFByb21pc2UoKHJlc29sdmUscmVqZWN0KT0+e1xuICAgICAgICAgICAgY29tcGFydG1lbnRJbmRleC5kZWxEb2N1bWVudChQTEFORV9DT01QQVJUTUVOVF9JTkRFWCwgY2lkLChlcnIsZGVsUmVzdWx0KT0+e1xuICAgICAgICAgICAgICAgIHJlc29sdmUoe2RlbGV0ZWQ6dHJ1ZX0pXG4gICAgICAgICAgICAgICAgc3J2LnVwZGF0ZVBsYW5lQ2FwY2l0eShwbGFuZUlkKVxuICAgICAgICAgICAgfSk7IFxuICAgICAgICB9KVxuICAgIH1cbiAgIFxufSJdfQ==
