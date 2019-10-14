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
var dataContext = require('./dataContext');
var deliveryIndex = redisSearch(redis, INDEX, {
    clientOptions: dataContext.clientOptions
});

var DeliveryService = exports.DeliveryService = function () {
    function DeliveryService() {
        _classCallCheck(this, DeliveryService);
    }

    _createClass(DeliveryService, [{
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
//# sourceMappingURL=data:application/json;charset=utf8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIlJlZGlzU2VydmljZXMvUm91dGVTZXJ2aWNlLmVzNiJdLCJuYW1lcyI6WyJyZWRpcyIsInJlcXVpcmUiLCJscmVkaXMiLCJtb21lbnQiLCJyZWRpc1NlYXJjaCIsIklOREVYIiwiSUQiLCJkYXRhQ29udGV4dCIsImRlbGl2ZXJ5SW5kZXgiLCJjbGllbnRPcHRpb25zIiwiRGVsaXZlcnlTZXJ2aWNlIiwiZGVsaXZlcnkiLCJQcm9taXNlIiwicmVzb2x2ZSIsInJlamVjdCIsInJlZGlzQ2xpZW50IiwiaW5jciIsImVyciIsImlkIiwic3RhdHVzIiwiY29uc29sZSIsImxvZyIsImFkZCIsInNhdmVkIiwic2VhcmNoIiwib2Zmc2V0IiwibnVtYmVyT2ZSZXN1bHRzIiwic29ydEJ5Iiwic29ydERpciIsInJlcGx5IiwiZGVsaXZlcmllcyIsInJlc3VsdHMiLCJmb3JFYWNoIiwicHVzaCIsImRvYyIsImRlbGl2ZXJJZCIsImdldERvYyIsInJlc3VsdCIsInVwZGF0ZSJdLCJtYXBwaW5ncyI6Ijs7Ozs7Ozs7OztBQUFBLElBQUlBLFFBQVFDLFFBQVEsT0FBUixDQUFaO0FBQ0EsSUFBSUMsU0FBU0QsUUFBUSxlQUFSLENBQWI7QUFDQSxJQUFJRSxTQUFTRixRQUFRLFFBQVIsQ0FBYjtBQUNBLElBQUlHLGNBQWNILFFBQVEscUJBQVIsQ0FBbEI7O0FBRUEsSUFBTUksUUFBUSxrQkFBZDtBQUNBLElBQU1DLEtBQUssYUFBWDtBQUNBLElBQUlDLGNBQWNOLFFBQVEsZUFBUixDQUFsQjtBQUNBLElBQUlPLGdCQUFnQkosWUFBWUosS0FBWixFQUFtQkssS0FBbkIsRUFBMEI7QUFDMUNJLG1CQUFlRixZQUFZRTtBQURlLENBQTFCLENBQXBCOztJQUthQyxlLFdBQUFBLGU7QUFDVCwrQkFBYTtBQUFBO0FBRVo7Ozs7cUNBSVlDLFEsRUFBUztBQUNsQixtQkFBTyxJQUFJQyxPQUFKLENBQVksVUFBQ0MsT0FBRCxFQUFTQyxNQUFULEVBQWtCO0FBQ2pDUCw0QkFBWVEsV0FBWixDQUF3QkMsSUFBeEIsQ0FBNkJWLEVBQTdCLEVBQWdDLFVBQUNXLEdBQUQsRUFBS0MsRUFBTCxFQUFVO0FBQ3RDUCw2QkFBU08sRUFBVCxHQUFjQSxFQUFkO0FBQ0FQLDZCQUFTUSxNQUFULEdBQWtCLENBQWxCO0FBQ0FDLDRCQUFRQyxHQUFSLENBQVksaUJBQVosRUFBOEJWLFFBQTlCO0FBQ0FILGtDQUFjYyxHQUFkLENBQWtCSixFQUFsQixFQUFxQlAsUUFBckI7QUFDQUUsNEJBQVEsRUFBQ1UsT0FBTSxJQUFQLEVBQVI7QUFDSCxpQkFORDtBQVFILGFBVE0sQ0FBUDtBQVVIOzs7d0NBQ2M7QUFDWCxtQkFBTyxJQUFJWCxPQUFKLENBQVksVUFBQ0MsT0FBRCxFQUFTQyxNQUFULEVBQWtCO0FBQ2pDTiw4QkFBY2dCLE1BQWQsQ0FBcUIsR0FBckIsRUFBeUIsRUFBQ0MsUUFBTyxDQUFSLEVBQVVDLGlCQUFnQixJQUExQixFQUErQkMsUUFBTyxhQUF0QyxFQUFvREMsU0FBUSxNQUE1RCxFQUF6QixFQUE2RixVQUFDWCxHQUFELEVBQUtZLEtBQUwsRUFBYTtBQUN0Ryx3QkFBSVosR0FBSixFQUFRO0FBQ0pHLGdDQUFRQyxHQUFSLENBQVlKLEdBQVo7QUFDQUosZ0NBQVEsRUFBQ2lCLFlBQVcsRUFBWixFQUFSO0FBQ0E7QUFDSDtBQUNELHdCQUFJQSxhQUFhLEVBQWpCO0FBQ0FELDBCQUFNRSxPQUFOLENBQWNDLE9BQWQsQ0FBc0Isb0JBQVk7QUFDOUJGLG1DQUFXRyxJQUFYLENBQWdCdEIsU0FBU3VCLEdBQXpCO0FBQ0gscUJBRkQ7QUFHQXJCLDRCQUFRLEVBQUNpQixZQUFXQSxVQUFaLEVBQVI7QUFDSCxpQkFYRDtBQVlILGFBYk0sQ0FBUDtBQWNIOzs7NENBQ2tCO0FBQ2YsbUJBQU8sSUFBSWxCLE9BQUosQ0FBWSxVQUFDQyxPQUFELEVBQVNDLE1BQVQsRUFBa0I7QUFDakNOLDhCQUFjZ0IsTUFBZCxDQUFxQixXQUFyQixFQUFpQyxFQUFDQyxRQUFPLENBQVIsRUFBVUMsaUJBQWdCLElBQTFCLEVBQStCQyxRQUFPLGFBQXRDLEVBQW9EQyxTQUFRLE1BQTVELEVBQWpDLEVBQXFHLFVBQUNYLEdBQUQsRUFBS1ksS0FBTCxFQUFhO0FBQzlHLHdCQUFJWixHQUFKLEVBQVE7QUFDSkcsZ0NBQVFDLEdBQVIsQ0FBWUosR0FBWjtBQUNBSixnQ0FBUSxFQUFDaUIsWUFBVyxFQUFaLEVBQVI7QUFDQTtBQUNIO0FBQ0Qsd0JBQUlBLGFBQWEsRUFBakI7QUFDQUQsMEJBQU1FLE9BQU4sQ0FBY0MsT0FBZCxDQUFzQixvQkFBWTtBQUM5QkYsbUNBQVdHLElBQVgsQ0FBZ0J0QixTQUFTdUIsR0FBekI7QUFDSCxxQkFGRDtBQUdBckIsNEJBQVEsRUFBQ2lCLFlBQVdBLFVBQVosRUFBUjtBQUNILGlCQVhEO0FBWUgsYUFiTSxDQUFQO0FBY0g7OztxQ0FDWUssUyxFQUFVO0FBQ25CLG1CQUFPLElBQUl2QixPQUFKLENBQWEsVUFBQ0MsT0FBRCxFQUFTQyxNQUFULEVBQWtCO0FBQ2xDTiw4QkFBYzRCLE1BQWQsQ0FBcUJELFNBQXJCLEVBQStCLFVBQUNsQixHQUFELEVBQUtvQixNQUFMLEVBQWM7QUFDekNBLDJCQUFPSCxHQUFQLENBQVdmLE1BQVgsR0FBcUIsQ0FBckI7QUFDQVgsa0NBQWM4QixNQUFkLENBQXFCSCxTQUFyQixFQUErQkosUUFBUUcsR0FBdkM7QUFDSCxpQkFIRDtBQUlILGFBTE0sQ0FBUDtBQU1IIiwiZmlsZSI6IlJlZGlzU2VydmljZXMvUm91dGVTZXJ2aWNlLmpzIiwic291cmNlc0NvbnRlbnQiOlsidmFyIHJlZGlzID0gcmVxdWlyZShcInJlZGlzXCIpO1xudmFyIGxyZWRpcyA9IHJlcXVpcmUoXCIuL3JlZGlzLWxvY2FsXCIpO1xudmFyIG1vbWVudCA9IHJlcXVpcmUoXCJtb21lbnRcIik7XG52YXIgcmVkaXNTZWFyY2ggPSByZXF1aXJlKFwiLi4vcmVkaXNlYXJjaGNsaWVudFwiKTtcblxuY29uc3QgSU5ERVggPSBcImluZGV4OmRlbGl2ZXJpZXNcIlxuY29uc3QgSUQgPSBcImRlbGl2ZXJ5OklEXCI7IFxudmFyIGRhdGFDb250ZXh0ID0gcmVxdWlyZSgnLi9kYXRhQ29udGV4dCcpXG52YXIgZGVsaXZlcnlJbmRleCA9IHJlZGlzU2VhcmNoKHJlZGlzLCBJTkRFWCwge1xuICAgIGNsaWVudE9wdGlvbnM6IGRhdGFDb250ZXh0LmNsaWVudE9wdGlvbnNcbn0pO1xuXG5cbmV4cG9ydCBjbGFzcyBEZWxpdmVyeVNlcnZpY2Uge1xuICAgIGNvbnN0cnVjdG9yKCl7XG5cbiAgICB9XG5cblxuXG4gICAgc2F2ZURlbGl2ZXJ5KGRlbGl2ZXJ5KXtcbiAgICAgICAgcmV0dXJuIG5ldyBQcm9taXNlKChyZXNvbHZlLHJlamVjdCk9PntcbiAgICAgICAgICAgIGRhdGFDb250ZXh0LnJlZGlzQ2xpZW50LmluY3IoSUQsKGVycixpZCk9PntcbiAgICAgICAgICAgICAgICBkZWxpdmVyeS5pZCA9IGlkIDsgXG4gICAgICAgICAgICAgICAgZGVsaXZlcnkuc3RhdHVzID0gMCA7IFxuICAgICAgICAgICAgICAgIGNvbnNvbGUubG9nKCdzYXZpbmcgZGVsaXZlcnknLGRlbGl2ZXJ5KTsgXG4gICAgICAgICAgICAgICAgZGVsaXZlcnlJbmRleC5hZGQoaWQsZGVsaXZlcnkpIFxuICAgICAgICAgICAgICAgIHJlc29sdmUoe3NhdmVkOnRydWV9KTsgICAgICAgICAgICAgICAgXG4gICAgICAgICAgICB9KVxuICAgICAgICAgICAgXG4gICAgICAgIH0pXG4gICAgfVxuICAgIGdldERlbGl2ZXJpZXMoKXtcbiAgICAgICAgcmV0dXJuIG5ldyBQcm9taXNlKChyZXNvbHZlLHJlamVjdCk9PntcbiAgICAgICAgICAgIGRlbGl2ZXJ5SW5kZXguc2VhcmNoKFwiKlwiLHtvZmZzZXQ6MCxudW1iZXJPZlJlc3VsdHM6MTAwMCxzb3J0Qnk6J2NyZWF0ZWREYXRlJyxzb3J0RGlyOidERVNDJ30sKGVycixyZXBseSk9PntcbiAgICAgICAgICAgICAgICBpZiAoZXJyKXtcbiAgICAgICAgICAgICAgICAgICAgY29uc29sZS5sb2coZXJyKTsgXG4gICAgICAgICAgICAgICAgICAgIHJlc29sdmUoe2RlbGl2ZXJpZXM6W119KVxuICAgICAgICAgICAgICAgICAgICByZXR1cm47IFxuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICB2YXIgZGVsaXZlcmllcyA9IFtdOyBcbiAgICAgICAgICAgICAgICByZXBseS5yZXN1bHRzLmZvckVhY2goZGVsaXZlcnkgPT4ge1xuICAgICAgICAgICAgICAgICAgICBkZWxpdmVyaWVzLnB1c2goZGVsaXZlcnkuZG9jKSAgICBcbiAgICAgICAgICAgICAgICB9KTtcbiAgICAgICAgICAgICAgICByZXNvbHZlKHtkZWxpdmVyaWVzOmRlbGl2ZXJpZXN9KVxuICAgICAgICAgICAgfSlcbiAgICAgICAgfSlcbiAgICB9XG4gICAgZ2V0T3BlbkRlbGl2ZXJpZXMoKXtcbiAgICAgICAgcmV0dXJuIG5ldyBQcm9taXNlKChyZXNvbHZlLHJlamVjdCk9PntcbiAgICAgICAgICAgIGRlbGl2ZXJ5SW5kZXguc2VhcmNoKFwiQHN0YXR1czowXCIse29mZnNldDowLG51bWJlck9mUmVzdWx0czoxMDAwLHNvcnRCeTonY3JlYXRlZERhdGUnLHNvcnREaXI6J0RFU0MnfSwoZXJyLHJlcGx5KT0+e1xuICAgICAgICAgICAgICAgIGlmIChlcnIpe1xuICAgICAgICAgICAgICAgICAgICBjb25zb2xlLmxvZyhlcnIpOyBcbiAgICAgICAgICAgICAgICAgICAgcmVzb2x2ZSh7ZGVsaXZlcmllczpbXX0pXG4gICAgICAgICAgICAgICAgICAgIHJldHVybjsgXG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIHZhciBkZWxpdmVyaWVzID0gW107IFxuICAgICAgICAgICAgICAgIHJlcGx5LnJlc3VsdHMuZm9yRWFjaChkZWxpdmVyeSA9PiB7XG4gICAgICAgICAgICAgICAgICAgIGRlbGl2ZXJpZXMucHVzaChkZWxpdmVyeS5kb2MpICAgIFxuICAgICAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgICAgIHJlc29sdmUoe2RlbGl2ZXJpZXM6ZGVsaXZlcmllc30pXG4gICAgICAgICAgICB9KVxuICAgICAgICB9KVxuICAgIH1cbiAgICBzZW5kRGVsaXZlcnkoZGVsaXZlcklkKXtcbiAgICAgICAgcmV0dXJuIG5ldyBQcm9taXNlICgocmVzb2x2ZSxyZWplY3QpPT57XG4gICAgICAgICAgICBkZWxpdmVyeUluZGV4LmdldERvYyhkZWxpdmVySWQsKGVycixyZXN1bHQpPT57XG4gICAgICAgICAgICAgICAgcmVzdWx0LmRvYy5zdGF0dXMgID0gMTsgXG4gICAgICAgICAgICAgICAgZGVsaXZlcnlJbmRleC51cGRhdGUoZGVsaXZlcklkLHJlc3VsdHMuZG9jKTsgXG4gICAgICAgICAgICB9KVxuICAgICAgICB9KVxuICAgIH1cbn0iXX0=
