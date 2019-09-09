'use strict';

Object.defineProperty(exports, "__esModule", {
    value: true
});

var _createClass = function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; }();

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

var redis = require('redis');
var lredis = require('./redis-local');
var dataContext = require('./dataContext');
var redisSearch = require('../redisearchclient/index');
var PREFIX = "location:";
var INDEX = "index:locations";
var LOCATION_COUNTER = "location:id";

var rs = redisSearch(redis, INDEX, {
    clientOptions: dataContext.clientOptions
});

var LocationService = exports.LocationService = function () {
    function LocationService() {
        _classCallCheck(this, LocationService);
    }

    _createClass(LocationService, [{
        key: 'getLocations',
        value: function getLocations() {
            return new Promise(function (resolve, reject) {
                rs.search('*', { numberOfResults: 100 }, function (err, locations) {
                    var locationsResult = [];
                    console.log(locations, 'results from locations');
                    locations.results.forEach(function (locDocument) {
                        locationsResult.push(locDocument.doc);
                    });
                    resolve({ locations: locationsResult });
                });
            });
        }
    }, {
        key: 'saveLocation',
        value: function saveLocation(location) {
            return new Promise(function (resolve, reject) {
                dataContext.redisClient.incr(LOCATION_COUNTER, function (err, id) {
                    location.id = id;
                    dataContext.redisClient.hmset(PREFIX + id, location, function (errS, result) {
                        if (errS) resolve({ saved: false });
                        rs.add(id, location);
                        resolve({ saved: true });
                    });
                });
            });
        }
    }, {
        key: 'getLocation',
        value: function getLocation(id) {
            console.log('looking up id' + id);
            return new Promise(function (resolve, reject) {
                rs.getDoc(id, function (err, location) {
                    console.log(location, "from rs");
                    resolve({ location: location.doc });
                });
            });
        }
    }, {
        key: 'updateLocation',
        value: function updateLocation(location) {
            return new Promise(function (resolve, reject) {
                rs.update(location.id, location, function (err, result) {
                    if (err) resolve({ saved: false });
                    resolve({ saved: true });
                });
                dataContext.redisClient.hmset(PREFIX + location.id, location);
            });
        }
    }, {
        key: 'rmLocation',
        value: function rmLocation(id) {
            return new Promise(function (resolve, reject) {
                rs.delDocument(INDEX, id);
                dataContext.redisClient.del(PREFIX + id);
            });
        }
    }]);

    return LocationService;
}();
//# sourceMappingURL=data:application/json;charset=utf8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIlJlZGlzU2VydmljZXMvTG9jYXRpb25TZXJ2aWNlLmVzNiJdLCJuYW1lcyI6WyJyZWRpcyIsInJlcXVpcmUiLCJscmVkaXMiLCJkYXRhQ29udGV4dCIsInJlZGlzU2VhcmNoIiwiUFJFRklYIiwiSU5ERVgiLCJMT0NBVElPTl9DT1VOVEVSIiwicnMiLCJjbGllbnRPcHRpb25zIiwiTG9jYXRpb25TZXJ2aWNlIiwiUHJvbWlzZSIsInJlc29sdmUiLCJyZWplY3QiLCJzZWFyY2giLCJudW1iZXJPZlJlc3VsdHMiLCJlcnIiLCJsb2NhdGlvbnMiLCJsb2NhdGlvbnNSZXN1bHQiLCJjb25zb2xlIiwibG9nIiwicmVzdWx0cyIsImZvckVhY2giLCJwdXNoIiwibG9jRG9jdW1lbnQiLCJkb2MiLCJsb2NhdGlvbiIsInJlZGlzQ2xpZW50IiwiaW5jciIsImlkIiwiaG1zZXQiLCJlcnJTIiwicmVzdWx0Iiwic2F2ZWQiLCJhZGQiLCJnZXREb2MiLCJ1cGRhdGUiLCJkZWxEb2N1bWVudCIsImRlbCJdLCJtYXBwaW5ncyI6Ijs7Ozs7Ozs7OztBQUFBLElBQUlBLFFBQVFDLFFBQVEsT0FBUixDQUFaO0FBQ0EsSUFBSUMsU0FBU0QsUUFBUSxlQUFSLENBQWI7QUFDQSxJQUFJRSxjQUFjRixRQUFRLGVBQVIsQ0FBbEI7QUFDQSxJQUFJRyxjQUFjSCxRQUFRLDJCQUFSLENBQWxCO0FBQ0EsSUFBTUksU0FBUyxXQUFmO0FBQ0EsSUFBTUMsUUFBUSxpQkFBZDtBQUNBLElBQU1DLG1CQUFtQixhQUF6Qjs7QUFFQSxJQUFNQyxLQUFLSixZQUFZSixLQUFaLEVBQW1CTSxLQUFuQixFQUEwQjtBQUNqQ0csbUJBQWNOLFlBQVlNO0FBRE8sQ0FBMUIsQ0FBWDs7SUFHYUMsZSxXQUFBQSxlO0FBQ1QsK0JBQWE7QUFBQTtBQUVaOzs7O3VDQUVhO0FBQ1YsbUJBQU8sSUFBSUMsT0FBSixDQUFZLFVBQUNDLE9BQUQsRUFBU0MsTUFBVCxFQUFrQjtBQUNqQ0wsbUJBQUdNLE1BQUgsQ0FBVSxHQUFWLEVBQWMsRUFBQ0MsaUJBQWdCLEdBQWpCLEVBQWQsRUFBb0MsVUFBQ0MsR0FBRCxFQUFLQyxTQUFMLEVBQWlCO0FBQ2pELHdCQUFJQyxrQkFBa0IsRUFBdEI7QUFDQUMsNEJBQVFDLEdBQVIsQ0FBWUgsU0FBWixFQUF1Qix3QkFBdkI7QUFDQUEsOEJBQVVJLE9BQVYsQ0FBa0JDLE9BQWxCLENBQTBCLHVCQUFlO0FBQ3JDSix3Q0FBZ0JLLElBQWhCLENBQXNCQyxZQUFZQyxHQUFsQztBQUNILHFCQUZEO0FBR0FiLDRCQUFRLEVBQUNLLFdBQVVDLGVBQVgsRUFBUjtBQUNILGlCQVBEO0FBUUgsYUFUTSxDQUFQO0FBVUg7OztxQ0FDWVEsUSxFQUFTO0FBQ2xCLG1CQUFPLElBQUlmLE9BQUosQ0FBWSxVQUFDQyxPQUFELEVBQVNDLE1BQVQsRUFBa0I7QUFDakNWLDRCQUFZd0IsV0FBWixDQUF3QkMsSUFBeEIsQ0FBNkJyQixnQkFBN0IsRUFBOEMsVUFBQ1MsR0FBRCxFQUFLYSxFQUFMLEVBQVU7QUFDcERILDZCQUFTRyxFQUFULEdBQWNBLEVBQWQ7QUFDQTFCLGdDQUFZd0IsV0FBWixDQUF3QkcsS0FBeEIsQ0FBOEJ6QixTQUFPd0IsRUFBckMsRUFBd0NILFFBQXhDLEVBQWlELFVBQUNLLElBQUQsRUFBTUMsTUFBTixFQUFlO0FBQzVELDRCQUFJRCxJQUFKLEVBQ0luQixRQUFRLEVBQUNxQixPQUFNLEtBQVAsRUFBUjtBQUNKekIsMkJBQUcwQixHQUFILENBQU9MLEVBQVAsRUFBVUgsUUFBVjtBQUNBZCxnQ0FBUSxFQUFDcUIsT0FBTSxJQUFQLEVBQVI7QUFDSCxxQkFMRDtBQU1ILGlCQVJEO0FBVUgsYUFYTSxDQUFQO0FBWUg7OztvQ0FDV0osRSxFQUFHO0FBQ1hWLG9CQUFRQyxHQUFSLENBQVksa0JBQWdCUyxFQUE1QjtBQUNBLG1CQUFPLElBQUlsQixPQUFKLENBQVksVUFBQ0MsT0FBRCxFQUFTQyxNQUFULEVBQWtCO0FBQ2xDTCxtQkFBRzJCLE1BQUgsQ0FBVU4sRUFBVixFQUFhLFVBQUNiLEdBQUQsRUFBS1UsUUFBTCxFQUFnQjtBQUN6QlAsNEJBQVFDLEdBQVIsQ0FBWU0sUUFBWixFQUFxQixTQUFyQjtBQUNBZCw0QkFBUSxFQUFDYyxVQUFTQSxTQUFTRCxHQUFuQixFQUFSO0FBQ0gsaUJBSEQ7QUFJRixhQUxNLENBQVA7QUFNSDs7O3VDQUNjQyxRLEVBQVM7QUFDcEIsbUJBQU8sSUFBSWYsT0FBSixDQUFZLFVBQUNDLE9BQUQsRUFBU0MsTUFBVCxFQUFrQjtBQUNqQ0wsbUJBQUc0QixNQUFILENBQVVWLFNBQVNHLEVBQW5CLEVBQXNCSCxRQUF0QixFQUErQixVQUFDVixHQUFELEVBQUtnQixNQUFMLEVBQWM7QUFDekMsd0JBQUloQixHQUFKLEVBQ0lKLFFBQVEsRUFBQ3FCLE9BQU0sS0FBUCxFQUFSO0FBQ0pyQiw0QkFBUSxFQUFDcUIsT0FBTSxJQUFQLEVBQVI7QUFDSCxpQkFKRDtBQUtBOUIsNEJBQVl3QixXQUFaLENBQXdCRyxLQUF4QixDQUE4QnpCLFNBQU9xQixTQUFTRyxFQUE5QyxFQUFpREgsUUFBakQ7QUFFSCxhQVJNLENBQVA7QUFTSDs7O21DQUNVRyxFLEVBQUc7QUFDVixtQkFBTyxJQUFJbEIsT0FBSixDQUFZLFVBQUNDLE9BQUQsRUFBU0MsTUFBVCxFQUFrQjtBQUNqQ0wsbUJBQUc2QixXQUFILENBQWUvQixLQUFmLEVBQXFCdUIsRUFBckI7QUFDQTFCLDRCQUFZd0IsV0FBWixDQUF3QlcsR0FBeEIsQ0FBNEJqQyxTQUFPd0IsRUFBbkM7QUFDSCxhQUhNLENBQVA7QUFJSCIsImZpbGUiOiJSZWRpc1NlcnZpY2VzL0xvY2F0aW9uU2VydmljZS5qcyIsInNvdXJjZXNDb250ZW50IjpbInZhciByZWRpcyA9IHJlcXVpcmUoJ3JlZGlzJyk7XG52YXIgbHJlZGlzID0gcmVxdWlyZSgnLi9yZWRpcy1sb2NhbCcpO1xudmFyIGRhdGFDb250ZXh0ID0gcmVxdWlyZSgnLi9kYXRhQ29udGV4dCcpOyBcbnZhciByZWRpc1NlYXJjaCA9IHJlcXVpcmUoJy4uL3JlZGlzZWFyY2hjbGllbnQvaW5kZXgnKTtcbmNvbnN0IFBSRUZJWCA9IFwibG9jYXRpb246XCJcbmNvbnN0IElOREVYID0gXCJpbmRleDpsb2NhdGlvbnNcIlxuY29uc3QgTE9DQVRJT05fQ09VTlRFUiA9IFwibG9jYXRpb246aWRcIjsgXG5cbmNvbnN0IHJzID0gcmVkaXNTZWFyY2gocmVkaXMsIElOREVYLCB7XG4gICAgY2xpZW50T3B0aW9uczpkYXRhQ29udGV4dC5jbGllbnRPcHRpb25zXG59KTtcbmV4cG9ydCBjbGFzcyBMb2NhdGlvblNlcnZpY2Uge1xuICAgIGNvbnN0cnVjdG9yKCl7XG5cbiAgICB9XG5cbiAgICBnZXRMb2NhdGlvbnMoKXtcbiAgICAgICAgcmV0dXJuIG5ldyBQcm9taXNlKChyZXNvbHZlLHJlamVjdCk9PntcbiAgICAgICAgICAgIHJzLnNlYXJjaCgnKicse251bWJlck9mUmVzdWx0czoxMDB9LChlcnIsbG9jYXRpb25zKT0+e1xuICAgICAgICAgICAgICAgIHZhciBsb2NhdGlvbnNSZXN1bHQgPSBbXTsgXG4gICAgICAgICAgICAgICAgY29uc29sZS5sb2cobG9jYXRpb25zLCAncmVzdWx0cyBmcm9tIGxvY2F0aW9ucycpXG4gICAgICAgICAgICAgICAgbG9jYXRpb25zLnJlc3VsdHMuZm9yRWFjaChsb2NEb2N1bWVudCA9PiB7XG4gICAgICAgICAgICAgICAgICAgIGxvY2F0aW9uc1Jlc3VsdC5wdXNoIChsb2NEb2N1bWVudC5kb2MpOyBcbiAgICAgICAgICAgICAgICB9KTtcbiAgICAgICAgICAgICAgICByZXNvbHZlKHtsb2NhdGlvbnM6bG9jYXRpb25zUmVzdWx0fSlcbiAgICAgICAgICAgIH0pXG4gICAgICAgIH0pXG4gICAgfVxuICAgIHNhdmVMb2NhdGlvbihsb2NhdGlvbil7XG4gICAgICAgIHJldHVybiBuZXcgUHJvbWlzZSgocmVzb2x2ZSxyZWplY3QpPT57XG4gICAgICAgICAgICBkYXRhQ29udGV4dC5yZWRpc0NsaWVudC5pbmNyKExPQ0FUSU9OX0NPVU5URVIsKGVycixpZCk9PntcbiAgICAgICAgICAgICAgICBsb2NhdGlvbi5pZCA9IGlkOyBcbiAgICAgICAgICAgICAgICBkYXRhQ29udGV4dC5yZWRpc0NsaWVudC5obXNldChQUkVGSVgraWQsbG9jYXRpb24sKGVyclMscmVzdWx0KT0+e1xuICAgICAgICAgICAgICAgICAgICBpZiAoZXJyUylcbiAgICAgICAgICAgICAgICAgICAgICAgIHJlc29sdmUoe3NhdmVkOmZhbHNlfSlcbiAgICAgICAgICAgICAgICAgICAgcnMuYWRkKGlkLGxvY2F0aW9uKTtcbiAgICAgICAgICAgICAgICAgICAgcmVzb2x2ZSh7c2F2ZWQ6dHJ1ZX0pICAgIFxuICAgICAgICAgICAgICAgIH0pXG4gICAgICAgICAgICB9KVxuXG4gICAgICAgIH0pOyBcbiAgICB9XG4gICAgZ2V0TG9jYXRpb24oaWQpe1xuICAgICAgICBjb25zb2xlLmxvZygnbG9va2luZyB1cCBpZCcraWQpOyBcbiAgICAgICAgcmV0dXJuIG5ldyBQcm9taXNlKChyZXNvbHZlLHJlamVjdCk9PntcbiAgICAgICAgICAgcnMuZ2V0RG9jKGlkLChlcnIsbG9jYXRpb24pPT57XG4gICAgICAgICAgICAgICBjb25zb2xlLmxvZyhsb2NhdGlvbixcImZyb20gcnNcIilcbiAgICAgICAgICAgICAgIHJlc29sdmUoe2xvY2F0aW9uOmxvY2F0aW9uLmRvY30pXG4gICAgICAgICAgIH0pXG4gICAgICAgIH0pXG4gICAgfVxuICAgIHVwZGF0ZUxvY2F0aW9uKGxvY2F0aW9uKXtcbiAgICAgICAgcmV0dXJuIG5ldyBQcm9taXNlKChyZXNvbHZlLHJlamVjdCk9PntcbiAgICAgICAgICAgIHJzLnVwZGF0ZShsb2NhdGlvbi5pZCxsb2NhdGlvbiwoZXJyLHJlc3VsdCk9PntcbiAgICAgICAgICAgICAgICBpZiAoZXJyKVxuICAgICAgICAgICAgICAgICAgICByZXNvbHZlKHtzYXZlZDpmYWxzZX0pO1xuICAgICAgICAgICAgICAgIHJlc29sdmUoe3NhdmVkOnRydWV9KVxuICAgICAgICAgICAgfSk7IFxuICAgICAgICAgICAgZGF0YUNvbnRleHQucmVkaXNDbGllbnQuaG1zZXQoUFJFRklYK2xvY2F0aW9uLmlkLGxvY2F0aW9uKTsgXG4gICAgICAgICAgIFxuICAgICAgICB9KTsgXG4gICAgfVxuICAgIHJtTG9jYXRpb24oaWQpe1xuICAgICAgICByZXR1cm4gbmV3IFByb21pc2UoKHJlc29sdmUscmVqZWN0KT0+e1xuICAgICAgICAgICAgcnMuZGVsRG9jdW1lbnQoSU5ERVgsaWQpOyBcbiAgICAgICAgICAgIGRhdGFDb250ZXh0LnJlZGlzQ2xpZW50LmRlbChQUkVGSVgraWQpOyBcbiAgICAgICAgfSlcbiAgICB9XG59Il19
