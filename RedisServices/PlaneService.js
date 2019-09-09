'use strict';

Object.defineProperty(exports, "__esModule", {
    value: true
});

var _createClass = function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; }();

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

var redis = require('redis');
var lredis = require('./redis-local');
var dataContext = require('./dataContext');
var redisSearch = require('../redisearchclient/index');
var PREFIX = "plane:";
var INDEX = "index:planes";
var PLANE_COUNTER = "plane:id";
var PLANE_COMPARTMENTS = "plane:x:compartments"; //list of compartments 
var COMPARTMENT_INDEX = "index:plane:compartment";

var rs = redisSearch(redis, INDEX, {
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
                    var planes = [];
                    planesResults.results.forEach(function (plane) {
                        planes.push(planes.doc);
                    });
                    resolve({ planes: palnes });
                });
            });
        }
    }, {
        key: 'addCompartment',
        value: function addCompartment(planeId, comparment) {
            return new Promise(function (resolve, reject) {});
        }
    }, {
        key: 'removeCompartment',
        value: function removeCompartment(cid) {
            return new Promise(function (resolve, reject) {});
        }
    }]);

    return PlaneService;
}();
//# sourceMappingURL=data:application/json;charset=utf8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIlJlZGlzU2VydmljZXMvUGxhbmVTZXJ2aWNlLmVzNiJdLCJuYW1lcyI6WyJyZWRpcyIsInJlcXVpcmUiLCJscmVkaXMiLCJkYXRhQ29udGV4dCIsInJlZGlzU2VhcmNoIiwiUFJFRklYIiwiSU5ERVgiLCJQTEFORV9DT1VOVEVSIiwiUExBTkVfQ09NUEFSVE1FTlRTIiwiQ09NUEFSVE1FTlRfSU5ERVgiLCJycyIsImNsaWVudE9wdGlvbnMiLCJQbGFuZVNlcnZpY2UiLCJwbGFuZSIsIlByb21pc2UiLCJyZXNvbHZlIiwicmVqZWN0IiwicmVkaXNDbGllbnQiLCJpbmNyIiwiZXJyIiwiaWQiLCJobXNldCIsImFkZCIsInJlcyIsInNhdmVkIiwicGxhbmVJZCIsImRlbERvY3VtZW50IiwiZGVsIiwiZGVsZXRlZCIsImhnZXRhbGwiLCJwIiwic2VhcmNoIiwicGxhbmVzUmVzdWx0IiwicGxhbmVzIiwicGxhbmVzUmVzdWx0cyIsInJlc3VsdHMiLCJmb3JFYWNoIiwicHVzaCIsImRvYyIsInBhbG5lcyIsImNvbXBhcm1lbnQiLCJjaWQiXSwibWFwcGluZ3MiOiI7Ozs7Ozs7Ozs7QUFDQSxJQUFJQSxRQUFRQyxRQUFRLE9BQVIsQ0FBWjtBQUNBLElBQUlDLFNBQVNELFFBQVEsZUFBUixDQUFiO0FBQ0EsSUFBSUUsY0FBY0YsUUFBUSxlQUFSLENBQWxCO0FBQ0EsSUFBSUcsY0FBY0gsUUFBUSwyQkFBUixDQUFsQjtBQUNBLElBQU1JLFNBQVMsUUFBZjtBQUNBLElBQU1DLFFBQVEsY0FBZDtBQUNBLElBQU1DLGdCQUFnQixVQUF0QjtBQUNBLElBQU1DLHFCQUFxQixzQkFBM0IsQyxDQUFrRDtBQUNsRCxJQUFNQyxvQkFBb0IseUJBQTFCOztBQUVBLElBQU1DLEtBQUtOLFlBQVlKLEtBQVosRUFBbUJNLEtBQW5CLEVBQTBCO0FBQ2pDSyxtQkFBY1IsWUFBWVE7QUFETyxDQUExQixDQUFYOztJQUdhQyxZLFdBQUFBLFk7QUFDVCw0QkFBYTtBQUFBO0FBRVo7Ozs7aUNBQ1FDLEssRUFBTTtBQUNYLG1CQUFPLElBQUlDLE9BQUosQ0FBWSxVQUFDQyxPQUFELEVBQVNDLE1BQVQsRUFBa0I7QUFDbkNiLDRCQUFZYyxXQUFaLENBQXdCQyxJQUF4QixDQUE2QlgsYUFBN0IsRUFBMkMsVUFBQ1ksR0FBRCxFQUFLQyxFQUFMLEVBQVU7QUFDakRQLDBCQUFNTyxFQUFOLEdBQVdBLEVBQVg7QUFDQWpCLGdDQUFZYyxXQUFaLENBQXdCSSxLQUF4QixDQUE4QmhCLFNBQU9lLEVBQXJDLEVBQXdDUCxLQUF4QztBQUNBSCx1QkFBR1ksR0FBSCxDQUFPRixFQUFQLEVBQVVQLEtBQVYsRUFBZ0IsVUFBQ00sR0FBRCxFQUFLSSxHQUFMLEVBQVc7QUFDdkJSLGdDQUFRLEVBQUNTLE9BQU0sSUFBUCxFQUFSO0FBQ0gscUJBRkQ7QUFHSCxpQkFORDtBQU9ELGFBUk0sQ0FBUDtBQVNIOzs7Z0NBQ09DLE8sRUFBUTtBQUNaLG1CQUFPLElBQUlYLE9BQUosQ0FBWSxVQUFDQyxPQUFELEVBQVNDLE1BQVQsRUFBa0I7QUFDakNOLG1CQUFHZ0IsV0FBSCxDQUFlcEIsS0FBZixFQUFxQm1CLE9BQXJCO0FBQ0F0Qiw0QkFBWWMsV0FBWixDQUF3QlUsR0FBeEIsQ0FBNEJ0QixTQUFPb0IsT0FBbkMsRUFBMkMsVUFBQ04sR0FBRCxFQUFLSSxHQUFMLEVBQVc7QUFDbERSLDRCQUFRLEVBQUNhLFNBQVEsSUFBVCxFQUFSO0FBQ0gsaUJBRkQ7QUFHSCxhQUxNLENBQVA7QUFNSDs7O2lDQUNRSCxPLEVBQVE7QUFDYixtQkFBTyxJQUFJWCxPQUFKLENBQVksVUFBQ0MsT0FBRCxFQUFTQyxNQUFULEVBQWtCO0FBQ2pDYiw0QkFBWWMsV0FBWixDQUF3QlksT0FBeEIsQ0FBZ0N4QixTQUFPb0IsT0FBdkMsRUFBK0MsVUFBQ04sR0FBRCxFQUFLVyxDQUFMLEVBQVM7QUFDcERmLDRCQUFRLEVBQUNGLE9BQU1pQixDQUFQLEVBQVI7QUFDSCxpQkFGRDtBQUdILGFBSk0sQ0FBUDtBQUtIOzs7b0NBQ1U7QUFDUCxtQkFBTyxJQUFJaEIsT0FBSixDQUFZLFVBQUNDLE9BQUQsRUFBU0MsTUFBVCxFQUFrQjtBQUNqQ04sbUJBQUdxQixNQUFILENBQVUsR0FBVixFQUFjLEVBQWQsRUFBaUIsVUFBQ1osR0FBRCxFQUFLYSxZQUFMLEVBQW9CO0FBQ2pDLHdCQUFJQyxTQUFTLEVBQWI7QUFDQUMsa0NBQWNDLE9BQWQsQ0FBc0JDLE9BQXRCLENBQThCLGlCQUFTO0FBQ25DSCwrQkFBT0ksSUFBUCxDQUFZSixPQUFPSyxHQUFuQjtBQUVILHFCQUhEO0FBSUF2Qiw0QkFBUSxFQUFDa0IsUUFBT00sTUFBUixFQUFSO0FBQ0gsaUJBUEQ7QUFRSCxhQVRNLENBQVA7QUFVSDs7O3VDQUNjZCxPLEVBQVFlLFUsRUFBVztBQUM5QixtQkFBTyxJQUFJMUIsT0FBSixDQUFZLFVBQUNDLE9BQUQsRUFBU0MsTUFBVCxFQUFrQixDQUVwQyxDQUZNLENBQVA7QUFHSDs7OzBDQUNpQnlCLEcsRUFBSTtBQUNsQixtQkFBTyxJQUFJM0IsT0FBSixDQUFZLFVBQUNDLE9BQUQsRUFBU0MsTUFBVCxFQUFrQixDQUVwQyxDQUZNLENBQVA7QUFHSCIsImZpbGUiOiJSZWRpc1NlcnZpY2VzL1BsYW5lU2VydmljZS5qcyIsInNvdXJjZXNDb250ZW50IjpbIlxudmFyIHJlZGlzID0gcmVxdWlyZSgncmVkaXMnKTtcbnZhciBscmVkaXMgPSByZXF1aXJlKCcuL3JlZGlzLWxvY2FsJyk7XG52YXIgZGF0YUNvbnRleHQgPSByZXF1aXJlKCcuL2RhdGFDb250ZXh0Jyk7IFxudmFyIHJlZGlzU2VhcmNoID0gcmVxdWlyZSgnLi4vcmVkaXNlYXJjaGNsaWVudC9pbmRleCcpO1xuY29uc3QgUFJFRklYID0gXCJwbGFuZTpcIlxuY29uc3QgSU5ERVggPSBcImluZGV4OnBsYW5lc1wiXG5jb25zdCBQTEFORV9DT1VOVEVSID0gXCJwbGFuZTppZFwiOyBcbmNvbnN0IFBMQU5FX0NPTVBBUlRNRU5UUyA9IFwicGxhbmU6eDpjb21wYXJ0bWVudHNcIiAvL2xpc3Qgb2YgY29tcGFydG1lbnRzIFxuY29uc3QgQ09NUEFSVE1FTlRfSU5ERVggPSBcImluZGV4OnBsYW5lOmNvbXBhcnRtZW50XCI7IFxuXG5jb25zdCBycyA9IHJlZGlzU2VhcmNoKHJlZGlzLCBJTkRFWCwge1xuICAgIGNsaWVudE9wdGlvbnM6ZGF0YUNvbnRleHQuY2xpZW50T3B0aW9uc1xufSk7XG5leHBvcnQgY2xhc3MgUGxhbmVTZXJ2aWNle1xuICAgIGNvbnN0cnVjdG9yKCl7XG5cbiAgICB9XG4gICAgYWRkUGxhbmUocGxhbmUpe1xuICAgICAgICByZXR1cm4gbmV3IFByb21pc2UoKHJlc29sdmUscmVqZWN0KT0+e1xuICAgICAgICAgIGRhdGFDb250ZXh0LnJlZGlzQ2xpZW50LmluY3IoUExBTkVfQ09VTlRFUiwoZXJyLGlkKT0+e1xuICAgICAgICAgICAgICBwbGFuZS5pZCA9IGlkOyBcbiAgICAgICAgICAgICAgZGF0YUNvbnRleHQucmVkaXNDbGllbnQuaG1zZXQoUFJFRklYK2lkLHBsYW5lKTsgXG4gICAgICAgICAgICAgIHJzLmFkZChpZCxwbGFuZSwoZXJyLHJlcyk9PntcbiAgICAgICAgICAgICAgICAgIHJlc29sdmUoe3NhdmVkOnRydWV9KTsgXG4gICAgICAgICAgICAgIH0pOyBcbiAgICAgICAgICB9KVxuICAgICAgICB9KVxuICAgIH1cbiAgICBybVBsYW5lKHBsYW5lSWQpe1xuICAgICAgICByZXR1cm4gbmV3IFByb21pc2UoKHJlc29sdmUscmVqZWN0KT0+e1xuICAgICAgICAgICAgcnMuZGVsRG9jdW1lbnQoSU5ERVgscGxhbmVJZCk7IFxuICAgICAgICAgICAgZGF0YUNvbnRleHQucmVkaXNDbGllbnQuZGVsKFBSRUZJWCtwbGFuZUlkLChlcnIscmVzKT0+e1xuICAgICAgICAgICAgICAgIHJlc29sdmUoe2RlbGV0ZWQ6dHJ1ZX0pXG4gICAgICAgICAgICB9KVxuICAgICAgICB9KVxuICAgIH1cbiAgICBnZXRQbGFuZShwbGFuZUlkKXtcbiAgICAgICAgcmV0dXJuIG5ldyBQcm9taXNlKChyZXNvbHZlLHJlamVjdCk9PntcbiAgICAgICAgICAgIGRhdGFDb250ZXh0LnJlZGlzQ2xpZW50LmhnZXRhbGwoUFJFRklYK3BsYW5lSWQsKGVycixwKT0+e1xuICAgICAgICAgICAgICAgIHJlc29sdmUoe3BsYW5lOnB9KTsgXG4gICAgICAgICAgICB9KVxuICAgICAgICB9KVxuICAgIH1cbiAgICBnZXRQbGFuZXMoKXtcbiAgICAgICAgcmV0dXJuIG5ldyBQcm9taXNlKChyZXNvbHZlLHJlamVjdCk9PntcbiAgICAgICAgICAgIHJzLnNlYXJjaCgnKicse30sKGVycixwbGFuZXNSZXN1bHQpPT57XG4gICAgICAgICAgICAgICAgdmFyIHBsYW5lcyA9IFtdOyBcbiAgICAgICAgICAgICAgICBwbGFuZXNSZXN1bHRzLnJlc3VsdHMuZm9yRWFjaChwbGFuZSA9PiB7XG4gICAgICAgICAgICAgICAgICAgIHBsYW5lcy5wdXNoKHBsYW5lcy5kb2MpXG4gICAgICAgICAgICAgICAgICAgIFxuICAgICAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgICAgIHJlc29sdmUoe3BsYW5lczpwYWxuZXN9KTsgXG4gICAgICAgICAgICB9KVxuICAgICAgICB9KVxuICAgIH1cbiAgICBhZGRDb21wYXJ0bWVudChwbGFuZUlkLGNvbXBhcm1lbnQpe1xuICAgICAgICByZXR1cm4gbmV3IFByb21pc2UoKHJlc29sdmUscmVqZWN0KT0+e1xuICAgICAgICAgICAgXG4gICAgICAgIH0pXG4gICAgfVxuICAgIHJlbW92ZUNvbXBhcnRtZW50KGNpZCl7XG4gICAgICAgIHJldHVybiBuZXcgUHJvbWlzZSgocmVzb2x2ZSxyZWplY3QpPT57XG4gICAgICAgICAgICBcbiAgICAgICAgfSlcbiAgICB9XG4gICBcbn0iXX0=
