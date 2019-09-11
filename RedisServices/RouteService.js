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
    }]);

    return DeliveryService;
}();
//# sourceMappingURL=data:application/json;charset=utf8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIlJlZGlzU2VydmljZXMvUm91dGVTZXJ2aWNlLmVzNiJdLCJuYW1lcyI6WyJyZWRpcyIsInJlcXVpcmUiLCJscmVkaXMiLCJtb21lbnQiLCJyZWRpc1NlYXJjaCIsIklOREVYIiwiSUQiLCJkYXRhQ29udGV4dCIsImRlbGl2ZXJ5SW5kZXgiLCJjbGllbnRPcHRpb25zIiwiRGVsaXZlcnlTZXJ2aWNlIiwiZGVsaXZlcnkiLCJQcm9taXNlIiwicmVzb2x2ZSIsInJlamVjdCIsInJlZGlzQ2xpZW50IiwiaW5jciIsImVyciIsImlkIiwiY29uc29sZSIsImxvZyIsImFkZCIsInNhdmVkIiwic2VhcmNoIiwib2Zmc2V0IiwibnVtYmVyT2ZSZXN1bHRzIiwic29ydEJ5Iiwic29ydERpciIsInJlcGx5IiwiZGVsaXZlcmllcyIsInJlc3VsdHMiLCJmb3JFYWNoIiwicHVzaCIsImRvYyJdLCJtYXBwaW5ncyI6Ijs7Ozs7Ozs7OztBQUFBLElBQUlBLFFBQVFDLFFBQVEsT0FBUixDQUFaO0FBQ0EsSUFBSUMsU0FBU0QsUUFBUSxlQUFSLENBQWI7QUFDQSxJQUFJRSxTQUFTRixRQUFRLFFBQVIsQ0FBYjtBQUNBLElBQUlHLGNBQWNILFFBQVEscUJBQVIsQ0FBbEI7O0FBRUEsSUFBTUksUUFBUSxrQkFBZDtBQUNBLElBQU1DLEtBQUssYUFBWDtBQUNBLElBQUlDLGNBQWNOLFFBQVEsZUFBUixDQUFsQjtBQUNBLElBQUlPLGdCQUFnQkosWUFBWUosS0FBWixFQUFtQkssS0FBbkIsRUFBMEI7QUFDMUNJLG1CQUFlRixZQUFZRTtBQURlLENBQTFCLENBQXBCOztJQUthQyxlLFdBQUFBLGU7QUFDVCwrQkFBYTtBQUFBO0FBRVo7Ozs7cUNBSVlDLFEsRUFBUztBQUNsQixtQkFBTyxJQUFJQyxPQUFKLENBQVksVUFBQ0MsT0FBRCxFQUFTQyxNQUFULEVBQWtCO0FBQ2pDUCw0QkFBWVEsV0FBWixDQUF3QkMsSUFBeEIsQ0FBNkJWLEVBQTdCLEVBQWdDLFVBQUNXLEdBQUQsRUFBS0MsRUFBTCxFQUFVO0FBQ3RDUCw2QkFBU08sRUFBVCxHQUFjQSxFQUFkO0FBQ0FDLDRCQUFRQyxHQUFSLENBQVksaUJBQVosRUFBOEJULFFBQTlCO0FBQ0FILGtDQUFjYSxHQUFkLENBQWtCSCxFQUFsQixFQUFxQlAsUUFBckI7QUFDQUUsNEJBQVEsRUFBQ1MsT0FBTSxJQUFQLEVBQVI7QUFDSCxpQkFMRDtBQU9ILGFBUk0sQ0FBUDtBQVNIOzs7d0NBQ2M7QUFDWCxtQkFBTyxJQUFJVixPQUFKLENBQVksVUFBQ0MsT0FBRCxFQUFTQyxNQUFULEVBQWtCO0FBQ2pDTiw4QkFBY2UsTUFBZCxDQUFxQixHQUFyQixFQUF5QixFQUFDQyxRQUFPLENBQVIsRUFBVUMsaUJBQWdCLElBQTFCLEVBQStCQyxRQUFPLGFBQXRDLEVBQW9EQyxTQUFRLE1BQTVELEVBQXpCLEVBQTZGLFVBQUNWLEdBQUQsRUFBS1csS0FBTCxFQUFhO0FBQ3RHLHdCQUFJWCxHQUFKLEVBQVE7QUFDSkUsZ0NBQVFDLEdBQVIsQ0FBWUgsR0FBWjtBQUNBSixnQ0FBUSxFQUFDZ0IsWUFBVyxFQUFaLEVBQVI7QUFDQTtBQUNIO0FBQ0Qsd0JBQUlBLGFBQWEsRUFBakI7QUFDQUQsMEJBQU1FLE9BQU4sQ0FBY0MsT0FBZCxDQUFzQixvQkFBWTtBQUM5QkYsbUNBQVdHLElBQVgsQ0FBZ0JyQixTQUFTc0IsR0FBekI7QUFDSCxxQkFGRDtBQUdBcEIsNEJBQVEsRUFBQ2dCLFlBQVdBLFVBQVosRUFBUjtBQUNILGlCQVhEO0FBWUgsYUFiTSxDQUFQO0FBY0giLCJmaWxlIjoiUmVkaXNTZXJ2aWNlcy9Sb3V0ZVNlcnZpY2UuanMiLCJzb3VyY2VzQ29udGVudCI6WyJ2YXIgcmVkaXMgPSByZXF1aXJlKFwicmVkaXNcIik7XG52YXIgbHJlZGlzID0gcmVxdWlyZShcIi4vcmVkaXMtbG9jYWxcIik7XG52YXIgbW9tZW50ID0gcmVxdWlyZShcIm1vbWVudFwiKTtcbnZhciByZWRpc1NlYXJjaCA9IHJlcXVpcmUoXCIuLi9yZWRpc2VhcmNoY2xpZW50XCIpO1xuXG5jb25zdCBJTkRFWCA9IFwiaW5kZXg6ZGVsaXZlcmllc1wiXG5jb25zdCBJRCA9IFwiZGVsaXZlcnk6SURcIjsgXG52YXIgZGF0YUNvbnRleHQgPSByZXF1aXJlKCcuL2RhdGFDb250ZXh0JylcbnZhciBkZWxpdmVyeUluZGV4ID0gcmVkaXNTZWFyY2gocmVkaXMsIElOREVYLCB7XG4gICAgY2xpZW50T3B0aW9uczogZGF0YUNvbnRleHQuY2xpZW50T3B0aW9uc1xufSk7XG5cblxuZXhwb3J0IGNsYXNzIERlbGl2ZXJ5U2VydmljZSB7XG4gICAgY29uc3RydWN0b3IoKXtcblxuICAgIH1cblxuXG5cbiAgICBzYXZlRGVsaXZlcnkoZGVsaXZlcnkpe1xuICAgICAgICByZXR1cm4gbmV3IFByb21pc2UoKHJlc29sdmUscmVqZWN0KT0+e1xuICAgICAgICAgICAgZGF0YUNvbnRleHQucmVkaXNDbGllbnQuaW5jcihJRCwoZXJyLGlkKT0+e1xuICAgICAgICAgICAgICAgIGRlbGl2ZXJ5LmlkID0gaWQgOyBcbiAgICAgICAgICAgICAgICBjb25zb2xlLmxvZygnc2F2aW5nIGRlbGl2ZXJ5JyxkZWxpdmVyeSk7IFxuICAgICAgICAgICAgICAgIGRlbGl2ZXJ5SW5kZXguYWRkKGlkLGRlbGl2ZXJ5KSBcbiAgICAgICAgICAgICAgICByZXNvbHZlKHtzYXZlZDp0cnVlfSk7ICAgICAgICAgICAgICAgIFxuICAgICAgICAgICAgfSlcbiAgICAgICAgICAgIFxuICAgICAgICB9KVxuICAgIH1cbiAgICBnZXREZWxpdmVyaWVzKCl7XG4gICAgICAgIHJldHVybiBuZXcgUHJvbWlzZSgocmVzb2x2ZSxyZWplY3QpPT57XG4gICAgICAgICAgICBkZWxpdmVyeUluZGV4LnNlYXJjaChcIipcIix7b2Zmc2V0OjAsbnVtYmVyT2ZSZXN1bHRzOjEwMDAsc29ydEJ5OidjcmVhdGVkRGF0ZScsc29ydERpcjonREVTQyd9LChlcnIscmVwbHkpPT57XG4gICAgICAgICAgICAgICAgaWYgKGVycil7XG4gICAgICAgICAgICAgICAgICAgIGNvbnNvbGUubG9nKGVycik7IFxuICAgICAgICAgICAgICAgICAgICByZXNvbHZlKHtkZWxpdmVyaWVzOltdfSlcbiAgICAgICAgICAgICAgICAgICAgcmV0dXJuOyBcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgdmFyIGRlbGl2ZXJpZXMgPSBbXTsgXG4gICAgICAgICAgICAgICAgcmVwbHkucmVzdWx0cy5mb3JFYWNoKGRlbGl2ZXJ5ID0+IHtcbiAgICAgICAgICAgICAgICAgICAgZGVsaXZlcmllcy5wdXNoKGRlbGl2ZXJ5LmRvYykgICAgXG4gICAgICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICAgICAgcmVzb2x2ZSh7ZGVsaXZlcmllczpkZWxpdmVyaWVzfSlcbiAgICAgICAgICAgIH0pXG4gICAgICAgIH0pXG4gICAgfVxufSJdfQ==
