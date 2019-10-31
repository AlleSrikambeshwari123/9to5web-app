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
            return new Promise(function (resolve, reject) {
                dataContext.redisClient.incr("rec:truck:id", function (err, reply) {
                    resolve(reply);
                });
            });
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
//# sourceMappingURL=data:application/json;charset=utf8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIlJlZGlzU2VydmljZXMvU2hpcHBlclNlcnZpY2UuZXM2Il0sIm5hbWVzIjpbImRhdGFDb250ZXh0IiwicmVxdWlyZSIsInJlZGlzIiwicmVkaXNTZWFyY2giLCJTSElQUEVSX0lOREVYIiwicnMiLCJjbGllbnRPcHRpb25zIiwiU2hpcHBlclNlcnZpY2UiLCJQcm9taXNlIiwicmVzb2x2ZSIsInJlamVjdCIsInJlZGlzQ2xpZW50IiwiaW5jciIsImVyciIsInJlcGx5Iiwic2hpcHBlciIsImlkIiwiYWRkIiwic3Jlc3VsdCIsInNhdmVkIiwic2VhcmNoIiwib2Zmc2V0IiwibnVtYmVyT2ZSZXN1bHRzIiwic29ydEJ5Iiwic29ydERpciIsInNoaXBwZXJzIiwibGlzdGluZyIsImNvbnNvbGUiLCJsb2ciLCJyZXN1bHRzIiwiZm9yRWFjaCIsInB1c2giLCJkb2MiLCJ0ZXh0Il0sIm1hcHBpbmdzIjoiOzs7Ozs7Ozs7O0FBRUEsSUFBSUEsY0FBY0MsUUFBUSxlQUFSLENBQWxCO0FBQ0EsSUFBSUMsUUFBUUQsUUFBUSxPQUFSLENBQVo7O0FBRUEsSUFBSUUsY0FBY0YsUUFBUSxxQkFBUixDQUFsQjtBQUNBLElBQUlHLGdCQUFnQixlQUFwQjtBQUNBLElBQU1DLEtBQUtGLFlBQVlELEtBQVosRUFBbUJFLGFBQW5CLEVBQWtDO0FBQ3pDRSxtQkFBY04sWUFBWU07QUFEZSxDQUFsQyxDQUFYOztJQUdhQyxjLFdBQUFBLGM7QUFDVCw4QkFBYTtBQUFBO0FBRVo7Ozs7d0NBRWM7QUFDWCxtQkFBTyxJQUFJQyxPQUFKLENBQVksVUFBQ0MsT0FBRCxFQUFTQyxNQUFULEVBQWtCO0FBQ2pDViw0QkFBWVcsV0FBWixDQUF3QkMsSUFBeEIsQ0FBNkIsY0FBN0IsRUFBNEMsVUFBQ0MsR0FBRCxFQUFLQyxLQUFMLEVBQWE7QUFDckRMLDRCQUFRSyxLQUFSO0FBQ0gsaUJBRkQ7QUFHSCxhQUpNLENBQVA7QUFLSDs7O21DQUNVQyxPLEVBQVE7QUFDZixtQkFBTyxJQUFJUCxPQUFKLENBQVksVUFBQ0MsT0FBRCxFQUFTQyxNQUFULEVBQWtCO0FBQ2pDViw0QkFBWVcsV0FBWixDQUF3QkMsSUFBeEIsQ0FBNkIsWUFBN0IsRUFBMEMsVUFBQ0MsR0FBRCxFQUFLQyxLQUFMLEVBQWE7QUFDbkRDLDRCQUFRQyxFQUFSLEdBQVlGLEtBQVo7QUFDQVQsdUJBQUdZLEdBQUgsQ0FBT0gsS0FBUCxFQUFhQyxPQUFiLEVBQXFCLFVBQUNGLEdBQUQsRUFBS0ssT0FBTCxFQUFlO0FBQ2hDLDRCQUFJTCxHQUFKLEVBQ0lKLFFBQVEsRUFBQ1UsT0FBTSxLQUFQLEVBQVI7QUFDSlYsZ0NBQVEsRUFBQ1UsT0FBTSxJQUFQLEVBQVlKLGdCQUFaLEVBQVI7QUFDSCxxQkFKRDtBQUtILGlCQVBEO0FBUUgsYUFUTSxDQUFQO0FBVUg7Ozt5Q0FDZTtBQUNaLG1CQUFPLElBQUlQLE9BQUosQ0FBWSxVQUFDQyxPQUFELEVBQVNDLE1BQVQsRUFBa0I7QUFDakNMLG1CQUFHZSxNQUFILENBQVUsR0FBVixFQUFjLEVBQUNDLFFBQU8sQ0FBUixFQUFXQyxpQkFBZ0IsSUFBM0IsRUFBZ0NDLFFBQU8sTUFBdkMsRUFBOENDLFNBQVEsS0FBdEQsRUFBZCxFQUEyRSxVQUFDWCxHQUFELEVBQUtZLFFBQUwsRUFBZ0I7QUFDdkYsd0JBQUlDLFVBQVcsRUFBZjtBQUNBLHdCQUFJYixHQUFKLEVBQVE7QUFDSmMsZ0NBQVFDLEdBQVIsQ0FBWWYsR0FBWjtBQUNIOztBQUVEWSw2QkFBU0ksT0FBVCxDQUFpQkMsT0FBakIsQ0FBeUIsbUJBQVc7QUFDaENKLGdDQUFRSyxJQUFSLENBQWFoQixRQUFRaUIsR0FBckI7QUFDSCxxQkFGRDs7QUFJQXZCLDRCQUFRLEVBQUNnQixVQUFTQyxPQUFWLEVBQVI7QUFDSCxpQkFYRDtBQVlILGFBYk0sQ0FBUDtBQWNIOzs7b0NBQ1dPLEksRUFBSztBQUNiLG1CQUFPLElBQUl6QixPQUFKLENBQVksVUFBQ0MsT0FBRCxFQUFTQyxNQUFULEVBQWtCO0FBQ2pDTCxtQkFBR2UsTUFBSCxZQUFtQmEsSUFBbkIsUUFBMkIsRUFBQ1osUUFBTyxDQUFSLEVBQVdDLGlCQUFnQixJQUEzQixFQUFnQ0MsUUFBTyxNQUF2QyxFQUE4Q0MsU0FBUSxLQUF0RCxFQUEzQixFQUF3RixVQUFDWCxHQUFELEVBQUtZLFFBQUwsRUFBZ0I7QUFDcEcsd0JBQUlDLFVBQVcsRUFBZjtBQUNBRCw2QkFBU0ksT0FBVCxDQUFpQkMsT0FBakIsQ0FBeUIsbUJBQVc7QUFDaENKLGdDQUFRSyxJQUFSLENBQWFoQixRQUFRaUIsR0FBckI7QUFDSCxxQkFGRDtBQUdBdkIsNEJBQVEsRUFBQ2dCLFVBQVNDLE9BQVYsRUFBUjtBQUNILGlCQU5EO0FBT0gsYUFSTSxDQUFQO0FBU0giLCJmaWxlIjoiUmVkaXNTZXJ2aWNlcy9TaGlwcGVyU2VydmljZS5qcyIsInNvdXJjZXNDb250ZW50IjpbIlxuXG52YXIgZGF0YUNvbnRleHQgPSByZXF1aXJlKCcuL2RhdGFDb250ZXh0Jyk7IFxudmFyIHJlZGlzID0gcmVxdWlyZSgncmVkaXMnKTsgXG5cbnZhciByZWRpc1NlYXJjaCA9IHJlcXVpcmUoJy4uL3JlZGlzZWFyY2hjbGllbnQnKTtcbnZhciBTSElQUEVSX0lOREVYID0gXCJpbmRleDpzaGlwcGVyXCJcbmNvbnN0IHJzID0gcmVkaXNTZWFyY2gocmVkaXMsIFNISVBQRVJfSU5ERVgsIHtcbiAgICBjbGllbnRPcHRpb25zOmRhdGFDb250ZXh0LmNsaWVudE9wdGlvbnNcbn0pO1xuZXhwb3J0IGNsYXNzIFNoaXBwZXJTZXJ2aWNlIHtcbiAgICBjb25zdHJ1Y3Rvcigpe1xuXG4gICAgfVxuXG4gICAgZ2V0U2hpcG1lbnRJZCgpe1xuICAgICAgICByZXR1cm4gbmV3IFByb21pc2UoKHJlc29sdmUscmVqZWN0KT0+e1xuICAgICAgICAgICAgZGF0YUNvbnRleHQucmVkaXNDbGllbnQuaW5jcihcInJlYzp0cnVjazppZFwiLChlcnIscmVwbHkpPT57XG4gICAgICAgICAgICAgICAgcmVzb2x2ZShyZXBseSk7IFxuICAgICAgICAgICAgfSlcbiAgICAgICAgfSlcbiAgICB9XG4gICAgYWRkU2hpcHBlcihzaGlwcGVyKXtcbiAgICAgICAgcmV0dXJuIG5ldyBQcm9taXNlKChyZXNvbHZlLHJlamVjdCk9PntcbiAgICAgICAgICAgIGRhdGFDb250ZXh0LnJlZGlzQ2xpZW50LmluY3IoXCJzaGlwcGVyOmlkXCIsKGVycixyZXBseSk9PntcbiAgICAgICAgICAgICAgICBzaGlwcGVyLmlkPSByZXBseVxuICAgICAgICAgICAgICAgIHJzLmFkZChyZXBseSxzaGlwcGVyLChlcnIsc3Jlc3VsdCk9PntcbiAgICAgICAgICAgICAgICAgICAgaWYgKGVycilcbiAgICAgICAgICAgICAgICAgICAgICAgIHJlc29sdmUoe3NhdmVkOmZhbHNlfSlcbiAgICAgICAgICAgICAgICAgICAgcmVzb2x2ZSh7c2F2ZWQ6dHJ1ZSxzaGlwcGVyfSlcbiAgICAgICAgICAgICAgICB9KVxuICAgICAgICAgICAgfSlcbiAgICAgICAgfSlcbiAgICB9XG4gICAgZ2V0QWxsU2hpcHBlcnMoKXtcbiAgICAgICAgcmV0dXJuIG5ldyBQcm9taXNlKChyZXNvbHZlLHJlamVjdCk9PntcbiAgICAgICAgICAgIHJzLnNlYXJjaCgnKicse29mZnNldDowLCBudW1iZXJPZlJlc3VsdHM6NTAwMCxzb3J0Qnk6XCJuYW1lXCIsc29ydERpcjpcIkFTQ1wifSwoZXJyLHNoaXBwZXJzKT0+e1xuICAgICAgICAgICAgICAgIHZhciBsaXN0aW5nICA9IFtdOyBcbiAgICAgICAgICAgICAgICBpZiAoZXJyKXtcbiAgICAgICAgICAgICAgICAgICAgY29uc29sZS5sb2coZXJyKVxuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICBcbiAgICAgICAgICAgICAgICBzaGlwcGVycy5yZXN1bHRzLmZvckVhY2goc2hpcHBlciA9PiB7XG4gICAgICAgICAgICAgICAgICAgIGxpc3RpbmcucHVzaChzaGlwcGVyLmRvYyk7IFxuICAgICAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgICAgIFxuICAgICAgICAgICAgICAgIHJlc29sdmUoe3NoaXBwZXJzOmxpc3Rpbmd9KVxuICAgICAgICAgICAgfSlcbiAgICAgICAgfSlcbiAgICB9XG4gICAgZmluZFNoaXBwZXIodGV4dCl7XG4gICAgICAgIHJldHVybiBuZXcgUHJvbWlzZSgocmVzb2x2ZSxyZWplY3QpPT57XG4gICAgICAgICAgICBycy5zZWFyY2goYEBuYW1lOiR7dGV4dH0qYCx7b2Zmc2V0OjAsIG51bWJlck9mUmVzdWx0czo1MDAwLHNvcnRCeTpcIm5hbWVcIixzb3J0RGlyOlwiQVNDXCJ9LChlcnIsc2hpcHBlcnMpPT57XG4gICAgICAgICAgICAgICAgdmFyIGxpc3RpbmcgID0gW107IFxuICAgICAgICAgICAgICAgIHNoaXBwZXJzLnJlc3VsdHMuZm9yRWFjaChzaGlwcGVyID0+IHtcbiAgICAgICAgICAgICAgICAgICAgbGlzdGluZy5wdXNoKHNoaXBwZXIuZG9jKTsgXG4gICAgICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICAgICAgcmVzb2x2ZSh7c2hpcHBlcnM6bGlzdGluZ30pXG4gICAgICAgICAgICB9KVxuICAgICAgICB9KVxuICAgIH1cbn0iXX0=
