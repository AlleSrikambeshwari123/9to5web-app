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
//# sourceMappingURL=data:application/json;charset=utf8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIlJlZGlzU2VydmljZXMvU2hpcHBlclNlcnZpY2UuZXM2Il0sIm5hbWVzIjpbImRhdGFDb250ZXh0IiwicmVxdWlyZSIsInJlZGlzIiwicmVkaXNTZWFyY2giLCJTSElQUEVSX0lOREVYIiwicnMiLCJjbGllbnRPcHRpb25zIiwiU2hpcHBlclNlcnZpY2UiLCJzaGlwcGVyIiwiUHJvbWlzZSIsInJlc29sdmUiLCJyZWplY3QiLCJyZWRpc0NsaWVudCIsImluY3IiLCJlcnIiLCJyZXBseSIsImlkIiwiYWRkIiwic3Jlc3VsdCIsInNhdmVkIiwic2VhcmNoIiwib2Zmc2V0IiwibnVtYmVyT2ZSZXN1bHRzIiwic29ydEJ5Iiwic29ydERpciIsInNoaXBwZXJzIiwibGlzdGluZyIsImNvbnNvbGUiLCJsb2ciLCJyZXN1bHRzIiwiZm9yRWFjaCIsInB1c2giLCJkb2MiLCJ0ZXh0Il0sIm1hcHBpbmdzIjoiOzs7Ozs7Ozs7O0FBRUEsSUFBSUEsY0FBY0MsUUFBUSxlQUFSLENBQWxCO0FBQ0EsSUFBSUMsUUFBUUQsUUFBUSxPQUFSLENBQVo7O0FBRUEsSUFBSUUsY0FBY0YsUUFBUSxxQkFBUixDQUFsQjtBQUNBLElBQUlHLGdCQUFnQixlQUFwQjtBQUNBLElBQU1DLEtBQUtGLFlBQVlELEtBQVosRUFBbUJFLGFBQW5CLEVBQWtDO0FBQ3pDRSxtQkFBY04sWUFBWU07QUFEZSxDQUFsQyxDQUFYOztJQUdhQyxjLFdBQUFBLGM7QUFDVCw4QkFBYTtBQUFBO0FBRVo7Ozs7bUNBR1VDLE8sRUFBUTtBQUNmLG1CQUFPLElBQUlDLE9BQUosQ0FBWSxVQUFDQyxPQUFELEVBQVNDLE1BQVQsRUFBa0I7QUFDakNYLDRCQUFZWSxXQUFaLENBQXdCQyxJQUF4QixDQUE2QixZQUE3QixFQUEwQyxVQUFDQyxHQUFELEVBQUtDLEtBQUwsRUFBYTtBQUNuRFAsNEJBQVFRLEVBQVIsR0FBWUQsS0FBWjtBQUNBVix1QkFBR1ksR0FBSCxDQUFPRixLQUFQLEVBQWFQLE9BQWIsRUFBcUIsVUFBQ00sR0FBRCxFQUFLSSxPQUFMLEVBQWU7QUFDaEMsNEJBQUlKLEdBQUosRUFDSUosUUFBUSxFQUFDUyxPQUFNLEtBQVAsRUFBUjtBQUNKVCxnQ0FBUSxFQUFDUyxPQUFNLElBQVAsRUFBWVgsZ0JBQVosRUFBUjtBQUNILHFCQUpEO0FBS0gsaUJBUEQ7QUFRSCxhQVRNLENBQVA7QUFVSDs7O3lDQUNlO0FBQ1osbUJBQU8sSUFBSUMsT0FBSixDQUFZLFVBQUNDLE9BQUQsRUFBU0MsTUFBVCxFQUFrQjtBQUNqQ04sbUJBQUdlLE1BQUgsQ0FBVSxHQUFWLEVBQWMsRUFBQ0MsUUFBTyxDQUFSLEVBQVdDLGlCQUFnQixJQUEzQixFQUFnQ0MsUUFBTyxNQUF2QyxFQUE4Q0MsU0FBUSxLQUF0RCxFQUFkLEVBQTJFLFVBQUNWLEdBQUQsRUFBS1csUUFBTCxFQUFnQjtBQUN2Rix3QkFBSUMsVUFBVyxFQUFmO0FBQ0Esd0JBQUlaLEdBQUosRUFBUTtBQUNKYSxnQ0FBUUMsR0FBUixDQUFZZCxHQUFaO0FBQ0g7O0FBRURXLDZCQUFTSSxPQUFULENBQWlCQyxPQUFqQixDQUF5QixtQkFBVztBQUNoQ0osZ0NBQVFLLElBQVIsQ0FBYXZCLFFBQVF3QixHQUFyQjtBQUNILHFCQUZEOztBQUlBdEIsNEJBQVEsRUFBQ2UsVUFBU0MsT0FBVixFQUFSO0FBQ0gsaUJBWEQ7QUFZSCxhQWJNLENBQVA7QUFjSDs7O29DQUNXTyxJLEVBQUs7QUFDYixtQkFBTyxJQUFJeEIsT0FBSixDQUFZLFVBQUNDLE9BQUQsRUFBU0MsTUFBVCxFQUFrQjtBQUNqQ04sbUJBQUdlLE1BQUgsWUFBbUJhLElBQW5CLFFBQTJCLEVBQUNaLFFBQU8sQ0FBUixFQUFXQyxpQkFBZ0IsSUFBM0IsRUFBZ0NDLFFBQU8sTUFBdkMsRUFBOENDLFNBQVEsS0FBdEQsRUFBM0IsRUFBd0YsVUFBQ1YsR0FBRCxFQUFLVyxRQUFMLEVBQWdCO0FBQ3BHLHdCQUFJQyxVQUFXLEVBQWY7QUFDQUQsNkJBQVNJLE9BQVQsQ0FBaUJDLE9BQWpCLENBQXlCLG1CQUFXO0FBQ2hDSixnQ0FBUUssSUFBUixDQUFhdkIsUUFBUXdCLEdBQXJCO0FBQ0gscUJBRkQ7QUFHQXRCLDRCQUFRLEVBQUNlLFVBQVNDLE9BQVYsRUFBUjtBQUNILGlCQU5EO0FBT0gsYUFSTSxDQUFQO0FBU0giLCJmaWxlIjoiUmVkaXNTZXJ2aWNlcy9TaGlwcGVyU2VydmljZS5qcyIsInNvdXJjZXNDb250ZW50IjpbIlxuXG52YXIgZGF0YUNvbnRleHQgPSByZXF1aXJlKCcuL2RhdGFDb250ZXh0Jyk7IFxudmFyIHJlZGlzID0gcmVxdWlyZSgncmVkaXMnKTsgXG5cbnZhciByZWRpc1NlYXJjaCA9IHJlcXVpcmUoJy4uL3JlZGlzZWFyY2hjbGllbnQnKTtcbnZhciBTSElQUEVSX0lOREVYID0gXCJpbmRleDpzaGlwcGVyXCJcbmNvbnN0IHJzID0gcmVkaXNTZWFyY2gocmVkaXMsIFNISVBQRVJfSU5ERVgsIHtcbiAgICBjbGllbnRPcHRpb25zOmRhdGFDb250ZXh0LmNsaWVudE9wdGlvbnNcbn0pO1xuZXhwb3J0IGNsYXNzIFNoaXBwZXJTZXJ2aWNlIHtcbiAgICBjb25zdHJ1Y3Rvcigpe1xuXG4gICAgfVxuXG5cbiAgICBhZGRTaGlwcGVyKHNoaXBwZXIpe1xuICAgICAgICByZXR1cm4gbmV3IFByb21pc2UoKHJlc29sdmUscmVqZWN0KT0+e1xuICAgICAgICAgICAgZGF0YUNvbnRleHQucmVkaXNDbGllbnQuaW5jcihcInNoaXBwZXI6aWRcIiwoZXJyLHJlcGx5KT0+e1xuICAgICAgICAgICAgICAgIHNoaXBwZXIuaWQ9IHJlcGx5XG4gICAgICAgICAgICAgICAgcnMuYWRkKHJlcGx5LHNoaXBwZXIsKGVycixzcmVzdWx0KT0+e1xuICAgICAgICAgICAgICAgICAgICBpZiAoZXJyKVxuICAgICAgICAgICAgICAgICAgICAgICAgcmVzb2x2ZSh7c2F2ZWQ6ZmFsc2V9KVxuICAgICAgICAgICAgICAgICAgICByZXNvbHZlKHtzYXZlZDp0cnVlLHNoaXBwZXJ9KVxuICAgICAgICAgICAgICAgIH0pXG4gICAgICAgICAgICB9KVxuICAgICAgICB9KVxuICAgIH1cbiAgICBnZXRBbGxTaGlwcGVycygpe1xuICAgICAgICByZXR1cm4gbmV3IFByb21pc2UoKHJlc29sdmUscmVqZWN0KT0+e1xuICAgICAgICAgICAgcnMuc2VhcmNoKCcqJyx7b2Zmc2V0OjAsIG51bWJlck9mUmVzdWx0czo1MDAwLHNvcnRCeTpcIm5hbWVcIixzb3J0RGlyOlwiQVNDXCJ9LChlcnIsc2hpcHBlcnMpPT57XG4gICAgICAgICAgICAgICAgdmFyIGxpc3RpbmcgID0gW107IFxuICAgICAgICAgICAgICAgIGlmIChlcnIpe1xuICAgICAgICAgICAgICAgICAgICBjb25zb2xlLmxvZyhlcnIpXG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIFxuICAgICAgICAgICAgICAgIHNoaXBwZXJzLnJlc3VsdHMuZm9yRWFjaChzaGlwcGVyID0+IHtcbiAgICAgICAgICAgICAgICAgICAgbGlzdGluZy5wdXNoKHNoaXBwZXIuZG9jKTsgXG4gICAgICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICAgICAgXG4gICAgICAgICAgICAgICAgcmVzb2x2ZSh7c2hpcHBlcnM6bGlzdGluZ30pXG4gICAgICAgICAgICB9KVxuICAgICAgICB9KVxuICAgIH1cbiAgICBmaW5kU2hpcHBlcih0ZXh0KXtcbiAgICAgICAgcmV0dXJuIG5ldyBQcm9taXNlKChyZXNvbHZlLHJlamVjdCk9PntcbiAgICAgICAgICAgIHJzLnNlYXJjaChgQG5hbWU6JHt0ZXh0fSpgLHtvZmZzZXQ6MCwgbnVtYmVyT2ZSZXN1bHRzOjUwMDAsc29ydEJ5OlwibmFtZVwiLHNvcnREaXI6XCJBU0NcIn0sKGVycixzaGlwcGVycyk9PntcbiAgICAgICAgICAgICAgICB2YXIgbGlzdGluZyAgPSBbXTsgXG4gICAgICAgICAgICAgICAgc2hpcHBlcnMucmVzdWx0cy5mb3JFYWNoKHNoaXBwZXIgPT4ge1xuICAgICAgICAgICAgICAgICAgICBsaXN0aW5nLnB1c2goc2hpcHBlci5kb2MpOyBcbiAgICAgICAgICAgICAgICB9KTtcbiAgICAgICAgICAgICAgICByZXNvbHZlKHtzaGlwcGVyczpsaXN0aW5nfSlcbiAgICAgICAgICAgIH0pXG4gICAgICAgIH0pXG4gICAgfVxufSJdfQ==
