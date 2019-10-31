'use strict';

Object.defineProperty(exports, "__esModule", {
    value: true
});

var _createClass = function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; }();

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

var dataContext = require('./dataContext');
var redis = require('redis');

var redisSearch = require('../redisearchclient');
var SHIPPER_INDEX = "index:shipper";
var rs = redisSearch(redis, SHIPPER_INDEX, {
    clientOptions: dataContext.clientOptions
});

var ShipperService = exports.ShipperService = function () {
    function ShipperService() {
        _classCallCheck(this, ShipperService);
    }

    _createClass(ShipperService, [{
        key: 'getShipmentId',
        value: function getShipmentId() {
            return new Promise(function (resolve, reject) {});
        }
    }, {
        key: 'addShipper',
        value: function addShipper(shipper) {
            return new Promise(function (resolve, reject) {
                dataContext.redisClient.incr("shipper:id", function (err, reply) {
                    shipper.id = reply;
                    rs.add(reply, shipper, function (err, sresult) {
                        if (err) resolve({ saved: false });
                        resolve({ saved: true, shipper: shipper });
                    });
                });
            });
        }
    }, {
        key: 'getAllShippers',
        value: function getAllShippers() {
            return new Promise(function (resolve, reject) {
                rs.search('*', { offset: 0, numberOfResults: 5000, sortBy: "name", sortDir: "ASC" }, function (err, shippers) {
                    var listing = [];
                    if (err) {
                        console.log(err);
                    }

                    shippers.results.forEach(function (shipper) {
                        listing.push(shipper.doc);
                    });

                    resolve({ shippers: listing });
                });
            });
        }
    }, {
        key: 'findShipper',
        value: function findShipper(text) {
            return new Promise(function (resolve, reject) {
                rs.search('@name:' + text + '*', { offset: 0, numberOfResults: 5000, sortBy: "name", sortDir: "ASC" }, function (err, shippers) {
                    var listing = [];
                    shippers.results.forEach(function (shipper) {
                        listing.push(shipper.doc);
                    });
                    resolve({ shippers: listing });
                });
            });
        }
    }]);

    return ShipperService;
}();
//# sourceMappingURL=data:application/json;charset=utf8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIlJlZGlzU2VydmljZXMvU2hpcHBlclNlcnZpY2UuZXM2Il0sIm5hbWVzIjpbImRhdGFDb250ZXh0IiwicmVxdWlyZSIsInJlZGlzIiwicmVkaXNTZWFyY2giLCJTSElQUEVSX0lOREVYIiwicnMiLCJjbGllbnRPcHRpb25zIiwiU2hpcHBlclNlcnZpY2UiLCJQcm9taXNlIiwicmVzb2x2ZSIsInJlamVjdCIsInNoaXBwZXIiLCJyZWRpc0NsaWVudCIsImluY3IiLCJlcnIiLCJyZXBseSIsImlkIiwiYWRkIiwic3Jlc3VsdCIsInNhdmVkIiwic2VhcmNoIiwib2Zmc2V0IiwibnVtYmVyT2ZSZXN1bHRzIiwic29ydEJ5Iiwic29ydERpciIsInNoaXBwZXJzIiwibGlzdGluZyIsImNvbnNvbGUiLCJsb2ciLCJyZXN1bHRzIiwiZm9yRWFjaCIsInB1c2giLCJkb2MiLCJ0ZXh0Il0sIm1hcHBpbmdzIjoiOzs7Ozs7Ozs7O0FBRUEsSUFBSUEsY0FBY0MsUUFBUSxlQUFSLENBQWxCO0FBQ0EsSUFBSUMsUUFBUUQsUUFBUSxPQUFSLENBQVo7O0FBRUEsSUFBSUUsY0FBY0YsUUFBUSxxQkFBUixDQUFsQjtBQUNBLElBQUlHLGdCQUFnQixlQUFwQjtBQUNBLElBQU1DLEtBQUtGLFlBQVlELEtBQVosRUFBbUJFLGFBQW5CLEVBQWtDO0FBQ3pDRSxtQkFBY04sWUFBWU07QUFEZSxDQUFsQyxDQUFYOztJQUdhQyxjLFdBQUFBLGM7QUFDVCw4QkFBYTtBQUFBO0FBRVo7Ozs7d0NBRWM7QUFDWCxtQkFBTyxJQUFJQyxPQUFKLENBQVksVUFBQ0MsT0FBRCxFQUFTQyxNQUFULEVBQWtCLENBRXBDLENBRk0sQ0FBUDtBQUdIOzs7bUNBQ1VDLE8sRUFBUTtBQUNmLG1CQUFPLElBQUlILE9BQUosQ0FBWSxVQUFDQyxPQUFELEVBQVNDLE1BQVQsRUFBa0I7QUFDakNWLDRCQUFZWSxXQUFaLENBQXdCQyxJQUF4QixDQUE2QixZQUE3QixFQUEwQyxVQUFDQyxHQUFELEVBQUtDLEtBQUwsRUFBYTtBQUNuREosNEJBQVFLLEVBQVIsR0FBWUQsS0FBWjtBQUNBVix1QkFBR1ksR0FBSCxDQUFPRixLQUFQLEVBQWFKLE9BQWIsRUFBcUIsVUFBQ0csR0FBRCxFQUFLSSxPQUFMLEVBQWU7QUFDaEMsNEJBQUlKLEdBQUosRUFDSUwsUUFBUSxFQUFDVSxPQUFNLEtBQVAsRUFBUjtBQUNKVixnQ0FBUSxFQUFDVSxPQUFNLElBQVAsRUFBWVIsZ0JBQVosRUFBUjtBQUNILHFCQUpEO0FBS0gsaUJBUEQ7QUFRSCxhQVRNLENBQVA7QUFVSDs7O3lDQUNlO0FBQ1osbUJBQU8sSUFBSUgsT0FBSixDQUFZLFVBQUNDLE9BQUQsRUFBU0MsTUFBVCxFQUFrQjtBQUNqQ0wsbUJBQUdlLE1BQUgsQ0FBVSxHQUFWLEVBQWMsRUFBQ0MsUUFBTyxDQUFSLEVBQVdDLGlCQUFnQixJQUEzQixFQUFnQ0MsUUFBTyxNQUF2QyxFQUE4Q0MsU0FBUSxLQUF0RCxFQUFkLEVBQTJFLFVBQUNWLEdBQUQsRUFBS1csUUFBTCxFQUFnQjtBQUN2Rix3QkFBSUMsVUFBVyxFQUFmO0FBQ0Esd0JBQUlaLEdBQUosRUFBUTtBQUNKYSxnQ0FBUUMsR0FBUixDQUFZZCxHQUFaO0FBQ0g7O0FBRURXLDZCQUFTSSxPQUFULENBQWlCQyxPQUFqQixDQUF5QixtQkFBVztBQUNoQ0osZ0NBQVFLLElBQVIsQ0FBYXBCLFFBQVFxQixHQUFyQjtBQUNILHFCQUZEOztBQUlBdkIsNEJBQVEsRUFBQ2dCLFVBQVNDLE9BQVYsRUFBUjtBQUNILGlCQVhEO0FBWUgsYUFiTSxDQUFQO0FBY0g7OztvQ0FDV08sSSxFQUFLO0FBQ2IsbUJBQU8sSUFBSXpCLE9BQUosQ0FBWSxVQUFDQyxPQUFELEVBQVNDLE1BQVQsRUFBa0I7QUFDakNMLG1CQUFHZSxNQUFILFlBQW1CYSxJQUFuQixRQUEyQixFQUFDWixRQUFPLENBQVIsRUFBV0MsaUJBQWdCLElBQTNCLEVBQWdDQyxRQUFPLE1BQXZDLEVBQThDQyxTQUFRLEtBQXRELEVBQTNCLEVBQXdGLFVBQUNWLEdBQUQsRUFBS1csUUFBTCxFQUFnQjtBQUNwRyx3QkFBSUMsVUFBVyxFQUFmO0FBQ0FELDZCQUFTSSxPQUFULENBQWlCQyxPQUFqQixDQUF5QixtQkFBVztBQUNoQ0osZ0NBQVFLLElBQVIsQ0FBYXBCLFFBQVFxQixHQUFyQjtBQUNILHFCQUZEO0FBR0F2Qiw0QkFBUSxFQUFDZ0IsVUFBU0MsT0FBVixFQUFSO0FBQ0gsaUJBTkQ7QUFPSCxhQVJNLENBQVA7QUFTSCIsImZpbGUiOiJSZWRpc1NlcnZpY2VzL1NoaXBwZXJTZXJ2aWNlLmpzIiwic291cmNlc0NvbnRlbnQiOlsiXG5cbnZhciBkYXRhQ29udGV4dCA9IHJlcXVpcmUoJy4vZGF0YUNvbnRleHQnKTsgXG52YXIgcmVkaXMgPSByZXF1aXJlKCdyZWRpcycpOyBcblxudmFyIHJlZGlzU2VhcmNoID0gcmVxdWlyZSgnLi4vcmVkaXNlYXJjaGNsaWVudCcpO1xudmFyIFNISVBQRVJfSU5ERVggPSBcImluZGV4OnNoaXBwZXJcIlxuY29uc3QgcnMgPSByZWRpc1NlYXJjaChyZWRpcywgU0hJUFBFUl9JTkRFWCwge1xuICAgIGNsaWVudE9wdGlvbnM6ZGF0YUNvbnRleHQuY2xpZW50T3B0aW9uc1xufSk7XG5leHBvcnQgY2xhc3MgU2hpcHBlclNlcnZpY2Uge1xuICAgIGNvbnN0cnVjdG9yKCl7XG5cbiAgICB9XG5cbiAgICBnZXRTaGlwbWVudElkKCl7XG4gICAgICAgIHJldHVybiBuZXcgUHJvbWlzZSgocmVzb2x2ZSxyZWplY3QpPT57XG4gICAgICAgICAgICBcbiAgICAgICAgfSlcbiAgICB9XG4gICAgYWRkU2hpcHBlcihzaGlwcGVyKXtcbiAgICAgICAgcmV0dXJuIG5ldyBQcm9taXNlKChyZXNvbHZlLHJlamVjdCk9PntcbiAgICAgICAgICAgIGRhdGFDb250ZXh0LnJlZGlzQ2xpZW50LmluY3IoXCJzaGlwcGVyOmlkXCIsKGVycixyZXBseSk9PntcbiAgICAgICAgICAgICAgICBzaGlwcGVyLmlkPSByZXBseVxuICAgICAgICAgICAgICAgIHJzLmFkZChyZXBseSxzaGlwcGVyLChlcnIsc3Jlc3VsdCk9PntcbiAgICAgICAgICAgICAgICAgICAgaWYgKGVycilcbiAgICAgICAgICAgICAgICAgICAgICAgIHJlc29sdmUoe3NhdmVkOmZhbHNlfSlcbiAgICAgICAgICAgICAgICAgICAgcmVzb2x2ZSh7c2F2ZWQ6dHJ1ZSxzaGlwcGVyfSlcbiAgICAgICAgICAgICAgICB9KVxuICAgICAgICAgICAgfSlcbiAgICAgICAgfSlcbiAgICB9XG4gICAgZ2V0QWxsU2hpcHBlcnMoKXtcbiAgICAgICAgcmV0dXJuIG5ldyBQcm9taXNlKChyZXNvbHZlLHJlamVjdCk9PntcbiAgICAgICAgICAgIHJzLnNlYXJjaCgnKicse29mZnNldDowLCBudW1iZXJPZlJlc3VsdHM6NTAwMCxzb3J0Qnk6XCJuYW1lXCIsc29ydERpcjpcIkFTQ1wifSwoZXJyLHNoaXBwZXJzKT0+e1xuICAgICAgICAgICAgICAgIHZhciBsaXN0aW5nICA9IFtdOyBcbiAgICAgICAgICAgICAgICBpZiAoZXJyKXtcbiAgICAgICAgICAgICAgICAgICAgY29uc29sZS5sb2coZXJyKVxuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICBcbiAgICAgICAgICAgICAgICBzaGlwcGVycy5yZXN1bHRzLmZvckVhY2goc2hpcHBlciA9PiB7XG4gICAgICAgICAgICAgICAgICAgIGxpc3RpbmcucHVzaChzaGlwcGVyLmRvYyk7IFxuICAgICAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgICAgIFxuICAgICAgICAgICAgICAgIHJlc29sdmUoe3NoaXBwZXJzOmxpc3Rpbmd9KVxuICAgICAgICAgICAgfSlcbiAgICAgICAgfSlcbiAgICB9XG4gICAgZmluZFNoaXBwZXIodGV4dCl7XG4gICAgICAgIHJldHVybiBuZXcgUHJvbWlzZSgocmVzb2x2ZSxyZWplY3QpPT57XG4gICAgICAgICAgICBycy5zZWFyY2goYEBuYW1lOiR7dGV4dH0qYCx7b2Zmc2V0OjAsIG51bWJlck9mUmVzdWx0czo1MDAwLHNvcnRCeTpcIm5hbWVcIixzb3J0RGlyOlwiQVNDXCJ9LChlcnIsc2hpcHBlcnMpPT57XG4gICAgICAgICAgICAgICAgdmFyIGxpc3RpbmcgID0gW107IFxuICAgICAgICAgICAgICAgIHNoaXBwZXJzLnJlc3VsdHMuZm9yRWFjaChzaGlwcGVyID0+IHtcbiAgICAgICAgICAgICAgICAgICAgbGlzdGluZy5wdXNoKHNoaXBwZXIuZG9jKTsgXG4gICAgICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICAgICAgcmVzb2x2ZSh7c2hpcHBlcnM6bGlzdGluZ30pXG4gICAgICAgICAgICB9KVxuICAgICAgICB9KVxuICAgIH1cbn0iXX0=
