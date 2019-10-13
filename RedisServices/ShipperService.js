'use strict';

Object.defineProperty(exports, "__esModule", {
    value: true
});

var _createClass = function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; }();

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

var dataContext = require('./dataContext');
var redis = require('redis');

var redisSearch = require('../redisearchclient');
var SHIPPER_INDEX = "index:shippers";
var rs = redisSearch(redis, DRIVER_INDEX, {
    clientOptions: dataContext.clientOptions
});

var ShipperService = exports.ShipperService = function () {
    function ShipperService() {
        _classCallCheck(this, ShipperService);
    }

    _createClass(ShipperService, [{
        key: 'getAllShippers',
        value: function getAllShippers() {
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
//# sourceMappingURL=data:application/json;charset=utf8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIlJlZGlzU2VydmljZXMvU2hpcHBlclNlcnZpY2UuZXM2Il0sIm5hbWVzIjpbImRhdGFDb250ZXh0IiwicmVxdWlyZSIsInJlZGlzIiwicmVkaXNTZWFyY2giLCJTSElQUEVSX0lOREVYIiwicnMiLCJEUklWRVJfSU5ERVgiLCJjbGllbnRPcHRpb25zIiwiU2hpcHBlclNlcnZpY2UiLCJQcm9taXNlIiwicmVzb2x2ZSIsInJlamVjdCIsInNlYXJjaCIsIm9mZnNldCIsIm51bWJlck9mUmVzdWx0cyIsInNvcnRCeSIsInNvcnREaXIiLCJlcnIiLCJzaGlwcGVycyIsImxpc3RpbmciLCJyZXN1bHRzIiwiZm9yRWFjaCIsInB1c2giLCJzaGlwcGVyIiwiZG9jIiwidGV4dCJdLCJtYXBwaW5ncyI6Ijs7Ozs7Ozs7OztBQUVBLElBQUlBLGNBQWNDLFFBQVEsZUFBUixDQUFsQjtBQUNBLElBQUlDLFFBQVFELFFBQVEsT0FBUixDQUFaOztBQUVBLElBQUlFLGNBQWNGLFFBQVEscUJBQVIsQ0FBbEI7QUFDQSxJQUFJRyxnQkFBZ0IsZ0JBQXBCO0FBQ0EsSUFBTUMsS0FBS0YsWUFBWUQsS0FBWixFQUFtQkksWUFBbkIsRUFBaUM7QUFDeENDLG1CQUFjUCxZQUFZTztBQURjLENBQWpDLENBQVg7O0lBR2FDLGMsV0FBQUEsYztBQUNULDhCQUFhO0FBQUE7QUFFWjs7Ozt5Q0FFZTtBQUNaLG1CQUFPLElBQUlDLE9BQUosQ0FBWSxVQUFDQyxPQUFELEVBQVNDLE1BQVQsRUFBa0I7QUFDakNOLG1CQUFHTyxNQUFILENBQVUsR0FBVixFQUFjLEVBQUNDLFFBQU8sQ0FBUixFQUFXQyxpQkFBZ0IsSUFBM0IsRUFBZ0NDLFFBQU8sTUFBdkMsRUFBOENDLFNBQVEsS0FBdEQsRUFBZCxFQUEyRSxVQUFDQyxHQUFELEVBQUtDLFFBQUwsRUFBZ0I7QUFDdkYsd0JBQUlDLFVBQVcsRUFBZjtBQUNBRCw2QkFBU0UsT0FBVCxDQUFpQkMsT0FBakIsQ0FBeUIsbUJBQVc7QUFDaENGLGdDQUFRRyxJQUFSLENBQWFDLFFBQVFDLEdBQXJCO0FBQ0gscUJBRkQ7QUFHQWQsNEJBQVEsRUFBQ1EsVUFBU0MsT0FBVixFQUFSO0FBQ0gsaUJBTkQ7QUFPSCxhQVJNLENBQVA7QUFTSDs7O29DQUNXTSxJLEVBQUs7QUFDYixtQkFBTyxJQUFJaEIsT0FBSixDQUFZLFVBQUNDLE9BQUQsRUFBU0MsTUFBVCxFQUFrQjtBQUNqQ04sbUJBQUdPLE1BQUgsWUFBbUJhLElBQW5CLFFBQTJCLEVBQUNaLFFBQU8sQ0FBUixFQUFXQyxpQkFBZ0IsSUFBM0IsRUFBZ0NDLFFBQU8sTUFBdkMsRUFBOENDLFNBQVEsS0FBdEQsRUFBM0IsRUFBd0YsVUFBQ0MsR0FBRCxFQUFLQyxRQUFMLEVBQWdCO0FBQ3BHLHdCQUFJQyxVQUFXLEVBQWY7QUFDQUQsNkJBQVNFLE9BQVQsQ0FBaUJDLE9BQWpCLENBQXlCLG1CQUFXO0FBQ2hDRixnQ0FBUUcsSUFBUixDQUFhQyxRQUFRQyxHQUFyQjtBQUNILHFCQUZEO0FBR0FkLDRCQUFRLEVBQUNRLFVBQVNDLE9BQVYsRUFBUjtBQUNILGlCQU5EO0FBT0gsYUFSTSxDQUFQO0FBU0giLCJmaWxlIjoiUmVkaXNTZXJ2aWNlcy9TaGlwcGVyU2VydmljZS5qcyIsInNvdXJjZXNDb250ZW50IjpbIlxuXG52YXIgZGF0YUNvbnRleHQgPSByZXF1aXJlKCcuL2RhdGFDb250ZXh0Jyk7IFxudmFyIHJlZGlzID0gcmVxdWlyZSgncmVkaXMnKTsgXG5cbnZhciByZWRpc1NlYXJjaCA9IHJlcXVpcmUoJy4uL3JlZGlzZWFyY2hjbGllbnQnKTtcbnZhciBTSElQUEVSX0lOREVYID0gXCJpbmRleDpzaGlwcGVyc1wiXG5jb25zdCBycyA9IHJlZGlzU2VhcmNoKHJlZGlzLCBEUklWRVJfSU5ERVgsIHtcbiAgICBjbGllbnRPcHRpb25zOmRhdGFDb250ZXh0LmNsaWVudE9wdGlvbnNcbn0pO1xuZXhwb3J0IGNsYXNzIFNoaXBwZXJTZXJ2aWNlIHtcbiAgICBjb25zdHJ1Y3Rvcigpe1xuXG4gICAgfVxuXG4gICAgZ2V0QWxsU2hpcHBlcnMoKXtcbiAgICAgICAgcmV0dXJuIG5ldyBQcm9taXNlKChyZXNvbHZlLHJlamVjdCk9PntcbiAgICAgICAgICAgIHJzLnNlYXJjaCgnKicse29mZnNldDowLCBudW1iZXJPZlJlc3VsdHM6NTAwMCxzb3J0Qnk6XCJuYW1lXCIsc29ydERpcjpcIkFTQ1wifSwoZXJyLHNoaXBwZXJzKT0+e1xuICAgICAgICAgICAgICAgIHZhciBsaXN0aW5nICA9IFtdOyBcbiAgICAgICAgICAgICAgICBzaGlwcGVycy5yZXN1bHRzLmZvckVhY2goc2hpcHBlciA9PiB7XG4gICAgICAgICAgICAgICAgICAgIGxpc3RpbmcucHVzaChzaGlwcGVyLmRvYyk7IFxuICAgICAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgICAgIHJlc29sdmUoe3NoaXBwZXJzOmxpc3Rpbmd9KVxuICAgICAgICAgICAgfSlcbiAgICAgICAgfSlcbiAgICB9XG4gICAgZmluZFNoaXBwZXIodGV4dCl7XG4gICAgICAgIHJldHVybiBuZXcgUHJvbWlzZSgocmVzb2x2ZSxyZWplY3QpPT57XG4gICAgICAgICAgICBycy5zZWFyY2goYEBuYW1lOiR7dGV4dH0qYCx7b2Zmc2V0OjAsIG51bWJlck9mUmVzdWx0czo1MDAwLHNvcnRCeTpcIm5hbWVcIixzb3J0RGlyOlwiQVNDXCJ9LChlcnIsc2hpcHBlcnMpPT57XG4gICAgICAgICAgICAgICAgdmFyIGxpc3RpbmcgID0gW107IFxuICAgICAgICAgICAgICAgIHNoaXBwZXJzLnJlc3VsdHMuZm9yRWFjaChzaGlwcGVyID0+IHtcbiAgICAgICAgICAgICAgICAgICAgbGlzdGluZy5wdXNoKHNoaXBwZXIuZG9jKTsgXG4gICAgICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICAgICAgcmVzb2x2ZSh7c2hpcHBlcnM6bGlzdGluZ30pXG4gICAgICAgICAgICB9KVxuICAgICAgICB9KVxuICAgIH1cbn0iXX0=
