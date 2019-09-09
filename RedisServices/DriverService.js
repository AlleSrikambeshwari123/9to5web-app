'use strict';

Object.defineProperty(exports, "__esModule", {
    value: true
});
exports.DriverService = undefined;

var _createClass = function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; }();

var _fs = require('fs');

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

var dataContext = require('./dataContext');
var redis = require('redis');
var PREFIX = "driver:";
var DRIVER_ID = "driver:id";
var redisSearch = require('../redisearchclient');
var DRIVER_INDEX = "index:drivers";
var rs = redisSearch(redis, DRIVER_INDEX, {
    clientOptions: dataContext.clientOptions
});

var DriverService = exports.DriverService = function () {
    function DriverService() {
        _classCallCheck(this, DriverService);
    }

    _createClass(DriverService, [{
        key: 'getDrivers',
        value: function getDrivers() {
            return new Promise(function (resolve, rejct) {
                rs.search('*', {
                    offset: 0,
                    numberOfResults: 1000,
                    sortBy: "lastName",
                    dir: "DESC"
                }, function (err, results) {
                    var drivers = [];
                    results.results.forEach(function (driverDocument) {
                        drivers.push(driverDocument.doc);
                    });
                    resolve({ drivers: drivers });
                });
            });
        }
    }, {
        key: 'findDriver',
        value: function findDriver(query) {
            return new Promise(function (resolve, reject) {
                rs.search(query, { offset: 0, numberOfResults: 1000 }, function (err, drivers) {
                    //array 
                    var fDrivers = [];
                    drivers.results.forEach(function (driverDocument) {
                        fDrivers.push(driverDocument.doc);
                    });

                    resolve({ drivers: fDrivers });
                });
            });
        }
    }, {
        key: 'getDriver',
        value: function getDriver(driverId) {
            return new Promise(function (resolve, reject) {
                if (driverId) {
                    rs.search("@id:" + driverId, {
                        offset: 0,
                        numberOfResults: 1

                    }, function (err, driverRes) {
                        if (driverRes.results.length == 1) {
                            resolve({ driver: driverRes.results[0].doc });
                        } else {
                            resolve({ driver: {} });
                        }
                    });
                }
            });
        }
    }, {
        key: 'createDriver',
        value: function createDriver(driver) {
            return new Promise(function (resolve, reject) {
                dataContext.redisClient.incr(DRIVER_ID, function (err, id) {
                    driver.id = id;
                    dataContext.redisClient.hmset(DRIVER + id, driver);
                    rs.add(id, driver, function (err, result) {
                        resolve({ saved: true });
                    });
                });
            });
        }
    }, {
        key: 'updateDriver',
        value: function updateDriver(driver) {
            return new Promise(function (resolve, reject) {
                rs.update(driver.id, driver, (err, result));
            });
        }
    }, {
        key: 'removeDriver',
        value: function removeDriver(id) {
            return new Promise(function (resolve, reject) {

                rs.del(id, function (err, restult) {
                    dataContext.redisClient.del(PREFIX + id);
                    resolve({ deleted: true });
                });
            });
        }
    }]);

    return DriverService;
}();
//# sourceMappingURL=data:application/json;charset=utf8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIlJlZGlzU2VydmljZXMvRHJpdmVyU2VydmljZS5lczYiXSwibmFtZXMiOlsiZGF0YUNvbnRleHQiLCJyZXF1aXJlIiwicmVkaXMiLCJQUkVGSVgiLCJEUklWRVJfSUQiLCJyZWRpc1NlYXJjaCIsIkRSSVZFUl9JTkRFWCIsInJzIiwiY2xpZW50T3B0aW9ucyIsIkRyaXZlclNlcnZpY2UiLCJQcm9taXNlIiwicmVzb2x2ZSIsInJlamN0Iiwic2VhcmNoIiwib2Zmc2V0IiwibnVtYmVyT2ZSZXN1bHRzIiwic29ydEJ5IiwiZGlyIiwiZXJyIiwicmVzdWx0cyIsImRyaXZlcnMiLCJmb3JFYWNoIiwicHVzaCIsImRyaXZlckRvY3VtZW50IiwiZG9jIiwicXVlcnkiLCJyZWplY3QiLCJmRHJpdmVycyIsImRyaXZlcklkIiwiZHJpdmVyUmVzIiwibGVuZ3RoIiwiZHJpdmVyIiwicmVkaXNDbGllbnQiLCJpbmNyIiwiaWQiLCJobXNldCIsIkRSSVZFUiIsImFkZCIsInJlc3VsdCIsInNhdmVkIiwidXBkYXRlIiwiZGVsIiwicmVzdHVsdCIsImRlbGV0ZWQiXSwibWFwcGluZ3MiOiI7Ozs7Ozs7OztBQUFBOzs7O0FBRUEsSUFBSUEsY0FBY0MsUUFBUSxlQUFSLENBQWxCO0FBQ0EsSUFBSUMsUUFBUUQsUUFBUSxPQUFSLENBQVo7QUFDQSxJQUFNRSxTQUFTLFNBQWY7QUFDQSxJQUFNQyxZQUFZLFdBQWxCO0FBQ0EsSUFBSUMsY0FBY0osUUFBUSxxQkFBUixDQUFsQjtBQUNBLElBQUlLLGVBQWUsZUFBbkI7QUFDQSxJQUFNQyxLQUFLRixZQUFZSCxLQUFaLEVBQW1CSSxZQUFuQixFQUFpQztBQUN4Q0UsbUJBQWNSLFlBQVlRO0FBRGMsQ0FBakMsQ0FBWDs7SUFHYUMsYSxXQUFBQSxhO0FBRVQsNkJBQWE7QUFBQTtBQUVaOzs7O3FDQUNTO0FBQ1IsbUJBQU8sSUFBSUMsT0FBSixDQUFZLFVBQUNDLE9BQUQsRUFBU0MsS0FBVCxFQUFpQjtBQUM5QkwsbUJBQUdNLE1BQUgs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TCxFQUFlO0FBQ3JCMUMsZ0NBQVlnQyxXQUFaLENBQXdCUyxHQUF4QixDQUE0QnRDLFNBQU8rQixFQUFuQztBQUNBdkIsNEJBQVEsRUFBQ2dDLFNBQVEsSUFBVCxFQUFSO0FBQ0gsaUJBSEQ7QUFJSCxhQU5NLENBQVA7QUFPRCIsImZpbGUiOiJSZWRpc1NlcnZpY2VzL0RyaXZlclNlcnZpY2UuanMiLCJzb3VyY2VzQ29udGVudCI6WyJpbXBvcnQgeyBmdHJ1bmNhdGUgfSBmcm9tICdmcyc7XG5cbnZhciBkYXRhQ29udGV4dCA9IHJlcXVpcmUoJy4vZGF0YUNvbnRleHQnKTsgXG52YXIgcmVkaXMgPSByZXF1aXJlKCdyZWRpcycpOyBcbmNvbnN0IFBSRUZJWCA9IFwiZHJpdmVyOlwiXG5jb25zdCBEUklWRVJfSUQgPSBcImRyaXZlcjppZFwiXG52YXIgcmVkaXNTZWFyY2ggPSByZXF1aXJlKCcuLi9yZWRpc2VhcmNoY2xpZW50Jyk7XG52YXIgRFJJVkVSX0lOREVYID0gXCJpbmRleDpkcml2ZXJzXCJcbmNvbnN0IHJzID0gcmVkaXNTZWFyY2gocmVkaXMsIERSSVZFUl9JTkRFWCwge1xuICAgIGNsaWVudE9wdGlvbnM6ZGF0YUNvbnRleHQuY2xpZW50T3B0aW9uc1xufSk7XG5leHBvcnQgY2xhc3MgRHJpdmVyU2VydmljZSB7IFxuXG4gICAgY29uc3RydWN0b3IoKXtcbiAgICAgICAgXG4gICAgfVxuICBnZXREcml2ZXJzKCl7XG4gICAgICByZXR1cm4gbmV3IFByb21pc2UoKHJlc29sdmUscmVqY3QpPT57XG4gICAgICAgICAgICBycy5zZWFyY2goJyonLHtcbiAgICAgICAgICAgICAgICBvZmZzZXQ6MCxcbiAgICAgICAgICAgICAgICBudW1iZXJPZlJlc3VsdHM6IDEwMDAsXG4gICAgICAgICAgICAgICAgc29ydEJ5OiBcImxhc3ROYW1lXCIsXG4gICAgICAgICAgICAgICAgZGlyOiBcIkRFU0NcIlxuICAgICAgICAgICAgfSwoZXJyLHJlc3VsdHMpPT57XG4gICAgICAgICAgICAgICAgdmFyIGRyaXZlcnMgPSBbXTsgXG4gICAgICAgICAgICAgICAgcmVzdWx0cy5yZXN1bHRzLmZvckVhY2goZHJpdmVyRG9jdW1lbnQgPT4ge1xuICAgICAgICAgICAgICAgICAgICBkcml2ZXJzLnB1c2goZHJpdmVyRG9jdW1lbnQuZG9jKVxuICAgICAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgICAgIHJlc29sdmUoe2RyaXZlcnM6ZHJpdmVyc30pXG4gICAgICAgICAgICB9KVxuICAgICAgfSlcbiAgfVxuICBmaW5kRHJpdmVyKHF1ZXJ5KXtcbiAgICAgIHJldHVybiBuZXcgUHJvbWlzZSgocmVzb2x2ZSxyZWplY3QpPT57XG4gICAgICAgICAgcnMuc2VhcmNoKHF1ZXJ5LHtvZmZzZXQ6MCxudW1iZXJPZlJlc3VsdHM6MTAwMH0sKGVycixkcml2ZXJzKT0+e1xuICAgICAgICAgICAgICAvL2FycmF5IFxuICAgICAgICAgICAgICB2YXIgZkRyaXZlcnMgPSBbXTsgXG4gICAgICAgICAgICAgIGRyaXZlcnMucmVzdWx0cy5mb3JFYWNoKGRyaXZlckRvY3VtZW50ID0+IHtcbiAgICAgICAgICAgICAgICAgICAgZkRyaXZlcnMucHVzaChkcml2ZXJEb2N1bWVudC5kb2MpOyBcbiAgICAgICAgICAgICAgfSk7XG5cbiAgICAgICAgICAgIHJlc29sdmUoe2RyaXZlcnM6ZkRyaXZlcnN9KVxuICAgICAgICAgIH0pXG4gICAgICB9KVxuICB9XG4gIGdldERyaXZlcihkcml2ZXJJZCl7XG4gICAgcmV0dXJuIG5ldyBQcm9taXNlKChyZXNvbHZlLHJlamVjdCk9PntcbiAgICAgICAgaWYgKGRyaXZlcklkKXtcbiAgICAgICAgICAgIHJzLnNlYXJjaChcIkBpZDpcIitkcml2ZXJJZCx7XG4gICAgICAgICAgICAgICAgb2Zmc2V0OjAsXG4gICAgICAgICAgICAgICAgbnVtYmVyT2ZSZXN1bHRzOiAxLFxuICAgICAgICAgICAgICAgIFxuICAgICAgICAgICAgfSwoZXJyLGRyaXZlclJlcyk9PntcbiAgICAgICAgICAgICAgICBpZiAoZHJpdmVyUmVzLnJlc3VsdHMubGVuZ3RoPT0xKXtcbiAgICAgICAgICAgICAgICAgICAgcmVzb2x2ZSh7ZHJpdmVyOmRyaXZlclJlcy5yZXN1bHRzWzBdLmRvY30pXG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIGVsc2Uge1xuICAgICAgICAgICAgICAgICAgICByZXNvbHZlKHtkcml2ZXI6e319KVxuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH0pOyBcbiAgICAgICAgfVxuICAgIH0pXG4gIH1cbiAgY3JlYXRlRHJpdmVyKGRyaXZlcil7XG4gICAgcmV0dXJuIG5ldyBQcm9taXNlKChyZXNvbHZlLHJlamVjdCk9PntcbiAgICAgICAgZGF0YUNvbnRleHQucmVkaXNDbGllbnQuaW5jcihEUklWRVJfSUQsKGVycixpZCk9PntcbiAgICAgICAgICAgIGRyaXZlci5pZCA9IGlkIDsgXG4gICAgICAgICAgICBkYXRhQ29udGV4dC5yZWRpc0NsaWVudC5obXNldChEUklWRVIraWQsZHJpdmVyKTsgXG4gICAgICAgICAgICBycy5hZGQoaWQsZHJpdmVyLChlcnIscmVzdWx0KT0+e1xuICAgICAgICAgICAgICAgIHJlc29sdmUoe3NhdmVkOnRydWV9KVxuICAgICAgICAgICAgfSlcbiAgICAgICAgfSkgICBcbiAgICB9KVxuICB9XG4gIHVwZGF0ZURyaXZlcihkcml2ZXIpe1xuICAgIHJldHVybiBuZXcgUHJvbWlzZSgocmVzb2x2ZSxyZWplY3QpPT57XG4gICAgICAgIHJzLnVwZGF0ZShkcml2ZXIuaWQsZHJpdmVyLChlcnIscmVzdWx0KSk7XG4gICAgfSlcbiAgfVxuICByZW1vdmVEcml2ZXIoaWQpe1xuICAgIHJldHVybiBuZXcgUHJvbWlzZSgocmVzb2x2ZSxyZWplY3QpPT57XG4gICAgICAgIFxuICAgICAgICBycy5kZWwoaWQsKGVycixyZXN0dWx0KT0+e1xuICAgICAgICAgICAgZGF0YUNvbnRleHQucmVkaXNDbGllbnQuZGVsKFBSRUZJWCtpZClcbiAgICAgICAgICAgIHJlc29sdmUoe2RlbGV0ZWQ6dHJ1ZX0pXG4gICAgICAgIH0pXG4gICAgfSkgIFxuICB9XG4gIFxuXG59Il19
