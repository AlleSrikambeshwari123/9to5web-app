'use strict';

Object.defineProperty(exports, "__esModule", {
    value: true
});

var _createClass = function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; }();

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

var dataContext = require('./dataContext');
var redis = require('redis');

var redisSearch = require('../redisearchclient');
var HAZMAT_INDEX = "index:hazmat";
var rs = redisSearch(redis, HAZMAT_INDEX, {
    clientOptions: dataContext.clientOptions
});

var HazmatService = exports.HazmatService = function () {
    function HazmatService() {
        _classCallCheck(this, HazmatService);
    }

    _createClass(HazmatService, [{
        key: 'getAllClasses',
        value: function getAllClasses() {
            return new Promise(function (resolve, reject) {
                rs.search('*', { offset: 0, numberOfResults: 5000, sortBy: "name", sortDir: "ASC" }, function (err, shippers) {
                    var listing = [];
                    shippers.results.forEach(function (shipper) {
                        listing.push(shipper.doc);
                    });
                    resolve({ shippers: listing });
                });
            });
        }
    }, {
        key: 'findClass',
        value: function findClass(text) {
            return new Promise(function (resolve, reject) {
                return new Promise(function (resolve, reject) {
                    rs.search('@name:' + text + '*', { offset: 0, numberOfResults: 5000, sortBy: "name", sortDir: "ASC" }, function (err, shippers) {
                        var listing = [];
                        shippers.results.forEach(function (shipper) {
                            listing.push(shipper.doc);
                        });
                        resolve({ shippers: listing });
                    });
                });
            });
        }
    }]);

    return HazmatService;
}();
//# sourceMappingURL=data:application/json;charset=utf8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIlJlZGlzU2VydmljZXMvSGF6bWF0U2VydmljZS5lczYiXSwibmFtZXMiOlsiZGF0YUNvbnRleHQiLCJyZXF1aXJlIiwicmVkaXMiLCJyZWRpc1NlYXJjaCIsIkhBWk1BVF9JTkRFWCIsInJzIiwiY2xpZW50T3B0aW9ucyIsIkhhem1hdFNlcnZpY2UiLCJQcm9taXNlIiwicmVzb2x2ZSIsInJlamVjdCIsInNlYXJjaCIsIm9mZnNldCIsIm51bWJlck9mUmVzdWx0cyIsInNvcnRCeSIsInNvcnREaXIiLCJlcnIiLCJzaGlwcGVycyIsImxpc3RpbmciLCJyZXN1bHRzIiwiZm9yRWFjaCIsInB1c2giLCJzaGlwcGVyIiwiZG9jIiwidGV4dCJdLCJtYXBwaW5ncyI6Ijs7Ozs7Ozs7OztBQUVBLElBQUlBLGNBQWNDLFFBQVEsZUFBUixDQUFsQjtBQUNBLElBQUlDLFFBQVFELFFBQVEsT0FBUixDQUFaOztBQUVBLElBQUlFLGNBQWNGLFFBQVEscUJBQVIsQ0FBbEI7QUFDQSxJQUFJRyxlQUFlLGNBQW5CO0FBQ0EsSUFBTUMsS0FBS0YsWUFBWUQsS0FBWixFQUFtQkUsWUFBbkIsRUFBaUM7QUFDeENFLG1CQUFjTixZQUFZTTtBQURjLENBQWpDLENBQVg7O0lBR2FDLGEsV0FBQUEsYTtBQUNULDZCQUFhO0FBQUE7QUFFWjs7Ozt3Q0FDYztBQUNYLG1CQUFPLElBQUlDLE9BQUosQ0FBWSxVQUFDQyxPQUFELEVBQVNDLE1BQVQsRUFBa0I7QUFDakNMLG1CQUFHTSxNQUFILENBQVUsR0FBVixFQUFjLEVBQUNDLFFBQU8sQ0FBUixFQUFXQyxpQkFBZ0IsSUFBM0IsRUFBZ0NDLFFBQU8sTUFBdkMsRUFBOENDLFNBQVEsS0FBdEQsRUFBZCxFQUEyRSxVQUFDQyxHQUFELEVBQUtDLFFBQUwsRUFBZ0I7QUFDdkYsd0JBQUlDLFVBQVcsRUFBZjtBQUNBRCw2QkFBU0UsT0FBVCxDQUFpQkMsT0FBakIsQ0FBeUIsbUJBQVc7QUFDaENGLGdDQUFRRyxJQUFSLENBQWFDLFFBQVFDLEdBQXJCO0FBQ0gscUJBRkQ7QUFHQWQsNEJBQVEsRUFBQ1EsVUFBU0MsT0FBVixFQUFSO0FBQ0gsaUJBTkQ7QUFPSCxhQVJNLENBQVA7QUFTSDs7O2tDQUNTTSxJLEVBQUs7QUFDWCxtQkFBTyxJQUFJaEIsT0FBSixDQUFZLFVBQUNDLE9BQUQsRUFBU0MsTUFBVCxFQUFrQjtBQUNqQyx1QkFBTyxJQUFJRixPQUFKLENBQVksVUFBQ0MsT0FBRCxFQUFTQyxNQUFULEVBQWtCO0FBQ2pDTCx1QkFBR00sTUFBSCxZQUFtQmEsSUFBbkIsUUFBMkIsRUFBQ1osUUFBTyxDQUFSLEVBQVdDLGlCQUFnQixJQUEzQixFQUFnQ0MsUUFBTyxNQUF2QyxFQUE4Q0MsU0FBUSxLQUF0RCxFQUEzQixFQUF3RixVQUFDQyxHQUFELEVBQUtDLFFBQUwsRUFBZ0I7QUFDcEcsNEJBQUlDLFVBQVcsRUFBZjtBQUNBRCxpQ0FBU0UsT0FBVCxDQUFpQkMsT0FBakIsQ0FBeUIsbUJBQVc7QUFDaENGLG9DQUFRRyxJQUFSLENBQWFDLFFBQVFDLEdBQXJCO0FBQ0gseUJBRkQ7QUFHQWQsZ0NBQVEsRUFBQ1EsVUFBU0MsT0FBVixFQUFSO0FBQ0gscUJBTkQ7QUFPSCxpQkFSTSxDQUFQO0FBU0gsYUFWTSxDQUFQO0FBV0giLCJmaWxlIjoiUmVkaXNTZXJ2aWNlcy9IYXptYXRTZXJ2aWNlLmpzIiwic291cmNlc0NvbnRlbnQiOlsiXG5cbnZhciBkYXRhQ29udGV4dCA9IHJlcXVpcmUoJy4vZGF0YUNvbnRleHQnKTsgXG52YXIgcmVkaXMgPSByZXF1aXJlKCdyZWRpcycpOyBcblxudmFyIHJlZGlzU2VhcmNoID0gcmVxdWlyZSgnLi4vcmVkaXNlYXJjaGNsaWVudCcpO1xudmFyIEhBWk1BVF9JTkRFWCA9IFwiaW5kZXg6aGF6bWF0XCJcbmNvbnN0IHJzID0gcmVkaXNTZWFyY2gocmVkaXMsIEhBWk1BVF9JTkRFWCwge1xuICAgIGNsaWVudE9wdGlvbnM6ZGF0YUNvbnRleHQuY2xpZW50T3B0aW9uc1xufSk7XG5leHBvcnQgY2xhc3MgSGF6bWF0U2VydmljZXtcbiAgICBjb25zdHJ1Y3Rvcigpe1xuXG4gICAgfVxuICAgIGdldEFsbENsYXNzZXMoKXtcbiAgICAgICAgcmV0dXJuIG5ldyBQcm9taXNlKChyZXNvbHZlLHJlamVjdCk9PntcbiAgICAgICAgICAgIHJzLnNlYXJjaCgnKicse29mZnNldDowLCBudW1iZXJPZlJlc3VsdHM6NTAwMCxzb3J0Qnk6XCJuYW1lXCIsc29ydERpcjpcIkFTQ1wifSwoZXJyLHNoaXBwZXJzKT0+e1xuICAgICAgICAgICAgICAgIHZhciBsaXN0aW5nICA9IFtdOyBcbiAgICAgICAgICAgICAgICBzaGlwcGVycy5yZXN1bHRzLmZvckVhY2goc2hpcHBlciA9PiB7XG4gICAgICAgICAgICAgICAgICAgIGxpc3RpbmcucHVzaChzaGlwcGVyLmRvYyk7IFxuICAgICAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgICAgIHJlc29sdmUoe3NoaXBwZXJzOmxpc3Rpbmd9KVxuICAgICAgICAgICAgfSlcbiAgICAgICAgfSlcbiAgICB9XG4gICAgZmluZENsYXNzKHRleHQpe1xuICAgICAgICByZXR1cm4gbmV3IFByb21pc2UoKHJlc29sdmUscmVqZWN0KT0+e1xuICAgICAgICAgICAgcmV0dXJuIG5ldyBQcm9taXNlKChyZXNvbHZlLHJlamVjdCk9PntcbiAgICAgICAgICAgICAgICBycy5zZWFyY2goYEBuYW1lOiR7dGV4dH0qYCx7b2Zmc2V0OjAsIG51bWJlck9mUmVzdWx0czo1MDAwLHNvcnRCeTpcIm5hbWVcIixzb3J0RGlyOlwiQVNDXCJ9LChlcnIsc2hpcHBlcnMpPT57XG4gICAgICAgICAgICAgICAgICAgIHZhciBsaXN0aW5nICA9IFtdOyBcbiAgICAgICAgICAgICAgICAgICAgc2hpcHBlcnMucmVzdWx0cy5mb3JFYWNoKHNoaXBwZXIgPT4ge1xuICAgICAgICAgICAgICAgICAgICAgICAgbGlzdGluZy5wdXNoKHNoaXBwZXIuZG9jKTsgXG4gICAgICAgICAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgICAgICAgICByZXNvbHZlKHtzaGlwcGVyczpsaXN0aW5nfSlcbiAgICAgICAgICAgICAgICB9KVxuICAgICAgICAgICAgfSlcbiAgICAgICAgfSlcbiAgICB9XG59Il19
