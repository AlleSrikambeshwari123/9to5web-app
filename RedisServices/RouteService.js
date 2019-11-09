"use strict";

Object.defineProperty(exports, "__esModule", {
    value: true
});

var _createClass = function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; }();

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

var redis = require("redis");
var lredis = require("./redis-local");
var moment = require("moment");
var redisSearch = require("../redisearchclient");

var INDEX = "index:deliveries";
var ID = "delivery:ID";
var DELIVERY_SET = "delivery:id:";
var dataContext = require('./dataContext');
var deliveryIndex = redisSearch(redis, INDEX, {
    clientOptions: dataContext.clientOptions
});

var PackageService = require("./PackageService").PackageService;
var packageService = new PackageService();

var DeliveryService = exports.DeliveryService = function () {
    function DeliveryService() {
        _classCallCheck(this, DeliveryService);
    }

    _createClass(DeliveryService, [{
        key: "addPackage",
        value: function addPackage(deliveryId, barcode) {
            return new Promise(function (resolve, reject) {
                dataContext.redisClient.sadd(DELIVERY_SET + deliveryId, barcode, function (err, reply) {
                    if (err) {
                        resolve({ added: false });
                    }
                    resolve({ added: true });
                });
            });
        }
    }, {
        key: "getDeliveryPackages",
        value: function getDeliveryPackages(deliveryId) {
            return new Promise(function (resolve, reject) {
                dataContext.redisClient.smembers(DELIVERY_SET + deliveryId, function (err, results) {
                    Promise.all(results.map(function (dpkg) {
                        return packageService.getPackageById(dpkg);
                    })).then(function (packages) {
                        resolve({ packages: packages });
                    });
                });
            });
        }
    }, {
        key: "saveDelivery",
        value: function saveDelivery(delivery) {
            return new Promise(function (resolve, reject) {
                dataContext.redisClient.incr(ID, function (err, id) {
                    delivery.id = id;
                    delivery.status = 0;
                    console.log('saving delivery', delivery);
                    deliveryIndex.add(id, delivery);
                    resolve({ saved: true });
                });
            });
        }
    }, {
        key: "getDeliveries",
        value: function getDeliveries() {
            return new Promise(function (resolve, reject) {
                deliveryIndex.search("*", { offset: 0, numberOfResults: 1000, sortBy: 'createdDate', sortDir: 'DESC' }, function (err, reply) {
                    if (err) {
                        console.log(err);
                        resolve({ deliveries: [] });
                        return;
                    }
                    var deliveries = [];
                    reply.results.forEach(function (delivery) {
                        deliveries.push(delivery.doc);
                    });
                    resolve({ deliveries: deliveries });
                });
            });
        }
    }, {
        key: "getOpenDeliveries",
        value: function getOpenDeliveries() {
            return new Promise(function (resolve, reject) {
                deliveryIndex.search("@status:0", { offset: 0, numberOfResults: 1000, sortBy: 'createdDate', sortDir: 'DESC' }, function (err, reply) {
                    if (err) {
                        console.log(err);
                        resolve({ deliveries: [] });
                        return;
                    }
                    var deliveries = [];
                    reply.results.forEach(function (delivery) {
                        deliveries.push(delivery.doc);
                    });
                    resolve({ deliveries: deliveries });
                });
            });
        }
    }, {
        key: "sendDelivery",
        value: function sendDelivery(deliverId) {
            return new Promise(function (resolve, reject) {
                deliveryIndex.getDoc(deliverId, function (err, result) {
                    result.doc.status = 1;
                    deliveryIndex.update(deliverId, results.doc);
                });
            });
        }
    }]);

    return DeliveryService;
}();
//# sourceMappingURL=data:application/json;charset=utf8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIlJlZGlzU2VydmljZXMvUm91dGVTZXJ2aWNlLmVzNiJdLCJuYW1lcyI6WyJyZWRpcyIsInJlcXVpcmUiLCJscmVkaXMiLCJtb21lbnQiLCJyZWRpc1NlYXJjaCIsIklOREVYIiwiSUQiLCJERUxJVkVSWV9TRVQiLCJkYXRhQ29udGV4dCIsImRlbGl2ZXJ5SW5kZXgiLCJjbGllbnRPcHRpb25zIiwiUGFja2FnZVNlcnZpY2UiLCJwYWNrYWdlU2VydmljZSIsIkRlbGl2ZXJ5U2VydmljZSIsImRlbGl2ZXJ5SWQiLCJiYXJjb2RlIiwiUHJvbWlzZSIsInJlc29sdmUiLCJyZWplY3QiLCJyZWRpc0NsaWVudCIsInNhZGQiLCJlcnIiLCJyZXBseSIsImFkZGVkIiwic21lbWJlcnMiLCJyZXN1bHRzIiwiYWxsIiwibWFwIiwiZ2V0UGFja2FnZUJ5SWQiLCJkcGtnIiwidGhlbiIsInBhY2thZ2VzIiwiZGVsaXZlcnkiLCJpbmNyIiwiaWQiLCJzdGF0dXMiLCJjb25zb2xlIiwibG9nIiwiYWRkIiwic2F2ZWQiLCJzZWFyY2giLCJvZmZzZXQiLCJudW1iZXJPZlJlc3VsdHMiLCJzb3J0QnkiLCJzb3J0RGlyIiwiZGVsaXZlcmllcyIsImZvckVhY2giLCJwdXNoIiwiZG9jIiwiZGVsaXZlcklkIiwiZ2V0RG9jIiwicmVzdWx0IiwidXBkYXRlIl0sIm1hcHBpbmdzIjoiOzs7Ozs7Ozs7O0FBQUEsSUFBSUEsUUFBUUMsUUFBUSxPQUFSLENBQVo7QUFDQSxJQUFJQyxTQUFTRCxRQUFRLGVBQVIsQ0FBYjtBQUNBLElBQUlFLFNBQVNGLFFBQVEsUUFBUixDQUFiO0FBQ0EsSUFBSUcsY0FBY0gsUUFBUSxxQkFBUixDQUFsQjs7QUFFQSxJQUFNSSxRQUFRLGtCQUFkO0FBQ0EsSUFBTUMsS0FBSyxhQUFYO0FBQ0EsSUFBTUMsZUFBZSxjQUFyQjtBQUNBLElBQUlDLGNBQWNQLFFBQVEsZUFBUixDQUFsQjtBQUNBLElBQUlRLGdCQUFnQkwsWUFBWUosS0FBWixFQUFtQkssS0FBbkIs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QUFVQyxpQkFBZ0IsSUFBMUIsRUFBK0JDLFFBQU8sYUFBdEMsRUFBb0RDLFNBQVEsTUFBNUQsRUFBakMsRUFBcUcsVUFBQ3ZCLEdBQUQsRUFBS0MsS0FBTCxFQUFhO0FBQzlHLHdCQUFJRCxHQUFKLEVBQVE7QUFDSmUsZ0NBQVFDLEdBQVIsQ0FBWWhCLEdBQVo7QUFDQUosZ0NBQVEsRUFBQzRCLFlBQVcsRUFBWixFQUFSO0FBQ0E7QUFDSDtBQUNELHdCQUFJQSxhQUFhLEVBQWpCO0FBQ0F2QiwwQkFBTUcsT0FBTixDQUFjcUIsT0FBZCxDQUFzQixvQkFBWTtBQUM5QkQsbUNBQVdFLElBQVgsQ0FBZ0JmLFNBQVNnQixHQUF6QjtBQUNILHFCQUZEO0FBR0EvQiw0QkFBUSxFQUFDNEIsWUFBV0EsVUFBWixFQUFSO0FBQ0gsaUJBWEQ7QUFZSCxhQWJNLENBQVA7QUFjSDs7O3FDQUNZSSxTLEVBQVU7QUFDbkIsbUJBQU8sSUFBSWpDLE9BQUosQ0FBYSxVQUFDQyxPQUFELEVBQVNDLE1BQVQsRUFBa0I7QUFDbENULDhCQUFjeUMsTUFBZCxDQUFxQkQsU0FBckIsRUFBK0IsVUFBQzVCLEdBQUQsRUFBSzhCLE1BQUwsRUFBYztBQUN6Q0EsMkJBQU9ILEdBQVAsQ0FBV2IsTUFBWCxHQUFxQixDQUFyQjtBQUNBMUIsa0NBQWMyQyxNQUFkLENBQXFCSCxTQUFyQixFQUErQnhCLFFBQVF1QixHQUF2QztBQUNILGlCQUhEO0FBSUgsYUFMTSxDQUFQO0FBTUgiLCJmaWxlIjoiUmVkaXNTZXJ2aWNlcy9Sb3V0ZVNlcnZpY2UuanMiLCJzb3VyY2VzQ29udGVudCI6WyJ2YXIgcmVkaXMgPSByZXF1aXJlKFwicmVkaXNcIik7XG52YXIgbHJlZGlzID0gcmVxdWlyZShcIi4vcmVkaXMtbG9jYWxcIik7XG52YXIgbW9tZW50ID0gcmVxdWlyZShcIm1vbWVudFwiKTtcbnZhciByZWRpc1NlYXJjaCA9IHJlcXVpcmUoXCIuLi9yZWRpc2VhcmNoY2xpZW50XCIpO1xuXG5jb25zdCBJTkRFWCA9IFwiaW5kZXg6ZGVsaXZlcmllc1wiXG5jb25zdCBJRCA9IFwiZGVsaXZlcnk6SURcIjsgXG5jb25zdCBERUxJVkVSWV9TRVQgPSBcImRlbGl2ZXJ5OmlkOlwiXG52YXIgZGF0YUNvbnRleHQgPSByZXF1aXJlKCcuL2RhdGFDb250ZXh0JylcbnZhciBkZWxpdmVyeUluZGV4ID0gcmVkaXNTZWFyY2gocmVkaXMsIElOREVYLCB7XG4gICAgY2xpZW50T3B0aW9uczogZGF0YUNvbnRleHQuY2xpZW50T3B0aW9uc1xufSk7XG5cbnZhciBQYWNrYWdlU2VydmljZSA9IHJlcXVpcmUoXCIuL1BhY2thZ2VTZXJ2aWNlXCIpLlBhY2thZ2VTZXJ2aWNlOyBcbnZhciBwYWNrYWdlU2VydmljZSA9IG5ldyBQYWNrYWdlU2VydmljZSgpOyBcblxuZXhwb3J0IGNsYXNzIERlbGl2ZXJ5U2VydmljZSB7XG4gICAgY29uc3RydWN0b3IoKXtcblxuICAgIH1cblxuICAgIGFkZFBhY2thZ2UoZGVsaXZlcnlJZCwgYmFyY29kZSl7XG4gICAgICAgIHJldHVybiBuZXcgUHJvbWlzZSgocmVzb2x2ZSxyZWplY3QpPT57XG4gICAgICAgICAgICBkYXRhQ29udGV4dC5yZWRpc0NsaWVudC5zYWRkKERFTElWRVJZX1NFVCtkZWxpdmVyeUlkLGJhcmNvZGUsKGVycixyZXBseSk9PntcbiAgICAgICAgICAgICAgICBpZiAoZXJyKXtcbiAgICAgICAgICAgICAgICAgICAgcmVzb2x2ZSh7YWRkZWQ6ZmFsc2V9KVxuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICByZXNvbHZlKHthZGRlZDp0cnVlfSlcbiAgICAgICAgICAgIH0pXG4gICAgICAgIH0pXG4gICAgfVxuICAgIGdldERlbGl2ZXJ5UGFja2FnZXMoZGVsaXZlcnlJZCl7XG4gICAgICAgIHJldHVybiBuZXcgUHJvbWlzZSgocmVzb2x2ZSxyZWplY3QpPT57XG4gICAgICAgICAgICBkYXRhQ29udGV4dC5yZWRpc0NsaWVudC5zbWVtYmVycyhERUxJVkVSWV9TRVQrZGVsaXZlcnlJZCwoZXJyLHJlc3VsdHMpPT57XG4gICAgICAgICAgICAgICAgUHJvbWlzZS5hbGwocmVzdWx0cy5tYXAoZHBrZz0+IHBhY2thZ2VTZXJ2aWNlLmdldFBhY2thZ2VCeUlkKGRwa2cpKSkudGhlbihwYWNrYWdlcz0+e1xuICAgICAgICAgICAgICAgICAgICByZXNvbHZlKHtwYWNrYWdlczpwYWNrYWdlc30pXG4gICAgICAgICAgICAgICAgfSlcbiAgICAgICAgICAgIH0pXG4gICAgICAgIH0pXG4gICAgfVxuXG4gICAgc2F2ZURlbGl2ZXJ5KGRlbGl2ZXJ5KXtcbiAgICAgICAgcmV0dXJuIG5ldyBQcm9taXNlKChyZXNvbHZlLHJlamVjdCk9PntcbiAgICAgICAgICAgIGRhdGFDb250ZXh0LnJlZGlzQ2xpZW50LmluY3IoSUQsKGVycixpZCk9PntcbiAgICAgICAgICAgICAgICBkZWxpdmVyeS5pZCA9IGlkIDsgXG4gICAgICAgICAgICAgICAgZGVsaXZlcnkuc3RhdHVzID0gMCA7IFxuICAgICAgICAgICAgICAgIGNvbnNvbGUubG9nKCdzYXZpbmcgZGVsaXZlcnknLGRlbGl2ZXJ5KTsgXG4gICAgICAgICAgICAgICAgZGVsaXZlcnlJbmRleC5hZGQoaWQsZGVsaXZlcnkpIFxuICAgICAgICAgICAgICAgIHJlc29sdmUoe3NhdmVkOnRydWV9KTsgICAgICAgICAgICAgICAgXG4gICAgICAgICAgICB9KVxuICAgICAgICAgICAgXG4gICAgICAgIH0pXG4gICAgfVxuICAgIGdldERlbGl2ZXJpZXMoKXtcbiAgICAgICAgcmV0dXJuIG5ldyBQcm9taXNlKChyZXNvbHZlLHJlamVjdCk9PntcbiAgICAgICAgICAgIGRlbGl2ZXJ5SW5kZXguc2VhcmNoKFwiKlwiLHtvZmZzZXQ6MCxudW1iZXJPZlJlc3VsdHM6MTAwMCxzb3J0Qnk6J2NyZWF0ZWREYXRlJyxzb3J0RGlyOidERVNDJ30sKGVycixyZXBseSk9PntcbiAgICAgICAgICAgICAgICBpZiAoZXJyKXtcbiAgICAgICAgICAgICAgICAgICAgY29uc29sZS5sb2coZXJyKTsgXG4gICAgICAgICAgICAgICAgICAgIHJlc29sdmUoe2RlbGl2ZXJpZXM6W119KVxuICAgICAgICAgICAgICAgICAgICByZXR1cm47IFxuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICB2YXIgZGVsaXZlcmllcyA9IFtdOyBcbiAgICAgICAgICAgICAgICByZXBseS5yZXN1bHRzLmZvckVhY2goZGVsaXZlcnkgPT4ge1xuICAgICAgICAgICAgICAgICAgICBkZWxpdmVyaWVzLnB1c2goZGVsaXZlcnkuZG9jKSAgICBcbiAgICAgICAgICAgICAgICB9KTtcbiAgICAgICAgICAgICAgICByZXNvbHZlKHtkZWxpdmVyaWVzOmRlbGl2ZXJpZXN9KVxuICAgICAgICAgICAgfSlcbiAgICAgICAgfSlcbiAgICB9XG4gICAgZ2V0T3BlbkRlbGl2ZXJpZXMoKXtcbiAgICAgICAgcmV0dXJuIG5ldyBQcm9taXNlKChyZXNvbHZlLHJlamVjdCk9PntcbiAgICAgICAgICAgIGRlbGl2ZXJ5SW5kZXguc2VhcmNoKFwiQHN0YXR1czowXCIse29mZnNldDowLG51bWJlck9mUmVzdWx0czoxMDAwLHNvcnRCeTonY3JlYXRlZERhdGUnLHNvcnREaXI6J0RFU0MnfSwoZXJyLHJlcGx5KT0+e1xuICAgICAgICAgICAgICAgIGlmIChlcnIpe1xuICAgICAgICAgICAgICAgICAgICBjb25zb2xlLmxvZyhlcnIpOyBcbiAgICAgICAgICAgICAgICAgICAgcmVzb2x2ZSh7ZGVsaXZlcmllczpbXX0pXG4gICAgICAgICAgICAgICAgICAgIHJldHVybjsgXG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIHZhciBkZWxpdmVyaWVzID0gW107IFxuICAgICAgICAgICAgICAgIHJlcGx5LnJlc3VsdHMuZm9yRWFjaChkZWxpdmVyeSA9PiB7XG4gICAgICAgICAgICAgICAgICAgIGRlbGl2ZXJpZXMucHVzaChkZWxpdmVyeS5kb2MpICAgIFxuICAgICAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgICAgIHJlc29sdmUoe2RlbGl2ZXJpZXM6ZGVsaXZlcmllc30pXG4gICAgICAgICAgICB9KVxuICAgICAgICB9KVxuICAgIH1cbiAgICBzZW5kRGVsaXZlcnkoZGVsaXZlcklkKXtcbiAgICAgICAgcmV0dXJuIG5ldyBQcm9taXNlICgocmVzb2x2ZSxyZWplY3QpPT57XG4gICAgICAgICAgICBkZWxpdmVyeUluZGV4LmdldERvYyhkZWxpdmVySWQsKGVycixyZXN1bHQpPT57XG4gICAgICAgICAgICAgICAgcmVzdWx0LmRvYy5zdGF0dXMgID0gMTsgXG4gICAgICAgICAgICAgICAgZGVsaXZlcnlJbmRleC51cGRhdGUoZGVsaXZlcklkLHJlc3VsdHMuZG9jKTsgXG4gICAgICAgICAgICB9KVxuICAgICAgICB9KVxuICAgIH1cbn0iXX0=
