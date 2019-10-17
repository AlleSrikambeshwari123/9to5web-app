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
                    resolve({ classes: listing });
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
//# sourceMappingURL=data:application/json;charset=utf8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIlJlZGlzU2VydmljZXMvSGF6bWF0U2VydmljZS5lczYiXSwibmFtZXMiOlsiZGF0YUNvbnRleHQiLCJyZXF1aXJlIiwicmVkaXMiLCJyZWRpc1NlYXJjaCIsIkhBWk1BVF9JTkRFWCIsInJzIiwiY2xpZW50T3B0aW9ucyIsIkhhem1hdFNlcnZpY2UiLCJQcm9taXNlIiwicmVzb2x2ZSIsInJlamVjdCIsInNlYXJjaCIsIm9mZnNldCIsIm51bWJlck9mUmVzdWx0cyIsInNvcnRCeSIsInNvcnREaXIiLCJlcnIiLCJzaGlwcGVycyIsImxpc3RpbmciLCJyZXN1bHRzIiwiZm9yRWFjaCIsInB1c2giLCJzaGlwcGVyIiwiZG9jIiwiY2xhc3NlcyIsInRleHQiXSwibWFwcGluZ3MiOiI7Ozs7Ozs7Ozs7QUFFQSxJQUFJQSxjQUFjQyxRQUFRLGVBQVIsQ0FBbEI7QUFDQSxJQUFJQyxRQUFRRCxRQUFRLE9BQVIsQ0FBWjs7QUFFQSxJQUFJRSxjQUFjRixRQUFRLHFCQUFSLENBQWxCO0FBQ0EsSUFBSUcsZUFBZSxjQUFuQjtBQUNBLElBQU1DLEtBQUtGLFlBQVlELEtBQVosRUFBbUJFLFlBQW5CLEVBQWlDO0FBQ3hDRSxtQkFBY04sWUFBWU07QUFEYyxDQUFqQyxDQUFYOztJQUdhQyxhLFdBQUFBLGE7QUFDVCw2QkFBYTtBQUFBO0FBRVo7Ozs7d0NBQ2M7QUFDWCxtQkFBTyxJQUFJQyxPQUFKLENBQVksVUFBQ0MsT0FBRCxFQUFTQyxNQUFULEVBQWtCO0FBQ2pDTCxtQkFBR00sTUFBSCxDQUFVLEdBQVYsRUFBYyxFQUFDQyxRQUFPLENBQVIsRUFBV0MsaUJBQWdCLElBQTNCLEVBQWdDQyxRQUFPLE1BQXZDLEVBQThDQyxTQUFRLEtBQXRELEVBQWQsRUFBMkUsVUFBQ0MsR0FBRCxFQUFLQyxRQUFMLEVBQWdCO0FBQ3ZGLHdCQUFJQyxVQUFXLEVBQWY7QUFDQUQsNkJBQVNFLE9BQVQsQ0FBaUJDLE9BQWpCLENBQXlCLG1CQUFXO0FBQ2hDRixnQ0FBUUcsSUFBUixDQUFhQyxRQUFRQyxHQUFyQjtBQUNILHFCQUZEO0FBR0FkLDRCQUFRLEVBQUNlLFNBQVFOLE9BQVQsRUFBUjtBQUNILGlCQU5EO0FBT0gsYUFSTSxDQUFQO0FBU0g7OztrQ0FDU08sSSxFQUFLO0FBQ1gsbUJBQU8sSUFBSWpCLE9BQUosQ0FBWSxVQUFDQyxPQUFELEVBQVNDLE1BQVQsRUFBa0I7QUFDakMsdUJBQU8sSUFBSUYsT0FBSixDQUFZLFVBQUNDLE9BQUQsRUFBU0MsTUFBVCxFQUFrQjtBQUNqQ0wsdUJBQUdNLE1BQUgsWUFBbUJjLElBQW5CLFFBQTJCLEVBQUNiLFFBQU8sQ0FBUixFQUFXQyxpQkFBZ0IsSUFBM0IsRUFBZ0NDLFFBQU8sTUFBdkMsRUFBOENDLFNBQVEsS0FBdEQsRUFBM0IsRUFBd0YsVUFBQ0MsR0FBRCxFQUFLQyxRQUFMLEVBQWdCO0FBQ3BHLDRCQUFJQyxVQUFXLEVBQWY7QUFDQUQsaUNBQVNFLE9BQVQsQ0FBaUJDLE9BQWpCLENBQXlCLG1CQUFXO0FBQ2hDRixvQ0FBUUcsSUFBUixDQUFhQyxRQUFRQyxHQUFyQjtBQUNILHlCQUZEO0FBR0FkLGdDQUFRLEVBQUNRLFVBQVNDLE9BQVYsRUFBUjtBQUNILHFCQU5EO0FBT0gsaUJBUk0sQ0FBUDtBQVNILGFBVk0sQ0FBUDtBQVdIIiwiZmlsZSI6IlJlZGlzU2VydmljZXMvSGF6bWF0U2VydmljZS5qcyIsInNvdXJjZXNDb250ZW50IjpbIlxuXG52YXIgZGF0YUNvbnRleHQgPSByZXF1aXJlKCcuL2RhdGFDb250ZXh0Jyk7IFxudmFyIHJlZGlzID0gcmVxdWlyZSgncmVkaXMnKTsgXG5cbnZhciByZWRpc1NlYXJjaCA9IHJlcXVpcmUoJy4uL3JlZGlzZWFyY2hjbGllbnQnKTtcbnZhciBIQVpNQVRfSU5ERVggPSBcImluZGV4Omhhem1hdFwiXG5jb25zdCBycyA9IHJlZGlzU2VhcmNoKHJlZGlzLCBIQVpNQVRfSU5ERVgsIHtcbiAgICBjbGllbnRPcHRpb25zOmRhdGFDb250ZXh0LmNsaWVudE9wdGlvbnNcbn0pO1xuZXhwb3J0IGNsYXNzIEhhem1hdFNlcnZpY2V7XG4gICAgY29uc3RydWN0b3IoKXtcblxuICAgIH1cbiAgICBnZXRBbGxDbGFzc2VzKCl7XG4gICAgICAgIHJldHVybiBuZXcgUHJvbWlzZSgocmVzb2x2ZSxyZWplY3QpPT57XG4gICAgICAgICAgICBycy5zZWFyY2goJyonLHtvZmZzZXQ6MCwgbnVtYmVyT2ZSZXN1bHRzOjUwMDAsc29ydEJ5OlwibmFtZVwiLHNvcnREaXI6XCJBU0NcIn0sKGVycixzaGlwcGVycyk9PntcbiAgICAgICAgICAgICAgICB2YXIgbGlzdGluZyAgPSBbXTsgXG4gICAgICAgICAgICAgICAgc2hpcHBlcnMucmVzdWx0cy5mb3JFYWNoKHNoaXBwZXIgPT4ge1xuICAgICAgICAgICAgICAgICAgICBsaXN0aW5nLnB1c2goc2hpcHBlci5kb2MpOyBcbiAgICAgICAgICAgICAgICB9KTtcbiAgICAgICAgICAgICAgICByZXNvbHZlKHtjbGFzc2VzOmxpc3Rpbmd9KVxuICAgICAgICAgICAgfSlcbiAgICAgICAgfSlcbiAgICB9XG4gICAgZmluZENsYXNzKHRleHQpe1xuICAgICAgICByZXR1cm4gbmV3IFByb21pc2UoKHJlc29sdmUscmVqZWN0KT0+e1xuICAgICAgICAgICAgcmV0dXJuIG5ldyBQcm9taXNlKChyZXNvbHZlLHJlamVjdCk9PntcbiAgICAgICAgICAgICAgICBycy5zZWFyY2goYEBuYW1lOiR7dGV4dH0qYCx7b2Zmc2V0OjAsIG51bWJlck9mUmVzdWx0czo1MDAwLHNvcnRCeTpcIm5hbWVcIixzb3J0RGlyOlwiQVNDXCJ9LChlcnIsc2hpcHBlcnMpPT57XG4gICAgICAgICAgICAgICAgICAgIHZhciBsaXN0aW5nICA9IFtdOyBcbiAgICAgICAgICAgICAgICAgICAgc2hpcHBlcnMucmVzdWx0cy5mb3JFYWNoKHNoaXBwZXIgPT4ge1xuICAgICAgICAgICAgICAgICAgICAgICAgbGlzdGluZy5wdXNoKHNoaXBwZXIuZG9jKTsgXG4gICAgICAgICAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgICAgICAgICByZXNvbHZlKHtzaGlwcGVyczpsaXN0aW5nfSlcbiAgICAgICAgICAgICAgICB9KVxuICAgICAgICAgICAgfSlcbiAgICAgICAgfSlcbiAgICB9XG59Il19
