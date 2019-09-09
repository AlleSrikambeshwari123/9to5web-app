'use strict';

Object.defineProperty(exports, "__esModule", {
    value: true
});

var _createClass = function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; }();

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

var redis = require('redis');
var lredis = require('./redis-local');
var redisSearch = require('redisearchclient');
var PREFIX = "vehicle:";
var INDEX = "index:vehicles";
var VEHICLE_ID = "vehicle:id";
var dataContext = require('./dataContext');
var rs = redisSearch(redis, INDEX, {
    clientOptions: dataContext.clientOptions
});

var VehicleService = exports.VehicleService = function () {
    function VehicleService() {
        _classCallCheck(this, VehicleService);
    }

    _createClass(VehicleService, [{
        key: 'addVehicle',
        value: function addVehicle(vechile) {
            return new Promise(function (resolve, reject) {
                dataContext.redisClient.incr(VEHICLE_ID, function (err, id) {
                    vechile.id = id;
                    dataContext.redisClient.hmset(PREFIX + id, vechile);
                    rs.add(id, vechile, function (err, results) {
                        resolve({ saved: true });
                    });
                });
            });
        }
    }, {
        key: 'updateVehicle',
        value: function updateVehicle(vechile) {
            return new Promise(function (resolve, reject) {
                dataContext.redisClient.hmset(PREFIX + id, vechile);
                rs.update(vechile.id, vechile, function (err, saved) {
                    resolve({ saved: true });
                });
            });
        }
    }, {
        key: 'rmVechile',
        value: function rmVechile(id) {
            return new Promise(function (resolve, reject) {
                dataContext.redisClient.del(PREFIX + id);
                rs.delDocument(INDEX, id, function (err, delResult) {
                    resolve({ deleted: true });
                });
            });
        }
    }, {
        key: 'getVehicle',
        value: function getVehicle(id) {
            return new Promise(function (resolve, reject) {
                dataContext.redisClient.hgetall(PREFIX + id, function (err, v) {
                    resolve({ vehicle: v });
                });
            });
        }
    }, {
        key: 'getVehicles',
        value: function getVehicles() {
            return new Promise(function (resolve, reject) {
                rs.search("*", {}, function (err, vResults) {
                    var vehilces = [];
                    vResults.results.forEach(function (vehicle) {
                        vehilces.push(vehicle.doc);
                    });
                    resolve({ vehicles: vehilces });
                });
            });
        }
    }, {
        key: 'getVehicleByCountry',
        value: function getVehicleByCountry(country) {
            return new Promise(function (resolve, reject) {
                rs.search("@country:" + country, {}, function (err, vResults) {
                    var vehilces = [];
                    vResults.results.forEach(function (vehicle) {
                        vehilces.push(vehicle.doc);
                    });
                    resolve({ vehicles: vehilces });
                });
            });
        }
    }]);

    return VehicleService;
}();
//# sourceMappingURL=data:application/json;charset=utf8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIlJlZGlzU2VydmljZXMvVmVoaWNsZVNlcnZpY2UuZXM2Il0sIm5hbWVzIjpbInJlZGlzIiwicmVxdWlyZSIsImxyZWRpcyIsInJlZGlzU2VhcmNoIiwiUFJFRklYIiwiSU5ERVgiLCJWRUhJQ0xFX0lEIiwiZGF0YUNvbnRleHQiLCJycyIsImNsaWVudE9wdGlvbnMiLCJWZWhpY2xlU2VydmljZSIsInZlY2hpbGUiLCJQcm9taXNlIiwicmVzb2x2ZSIsInJlamVjdCIsInJlZGlzQ2xpZW50IiwiaW5jciIsImVyciIsImlkIiwiaG1zZXQiLCJhZGQiLCJyZXN1bHRzIiwic2F2ZWQiLCJ1cGRhdGUiLCJkZWwiLCJkZWxEb2N1bWVudCIsImRlbFJlc3VsdCIsImRlbGV0ZWQiLCJoZ2V0YWxsIiwidiIsInZlaGljbGUiLCJzZWFyY2giLCJ2UmVzdWx0cyIsInZlaGlsY2VzIiwiZm9yRWFjaCIsInB1c2giLCJkb2MiLCJ2ZWhpY2xlcyIsImNvdW50cnkiXSwibWFwcGluZ3MiOiI7Ozs7Ozs7Ozs7QUFDQSxJQUFJQSxRQUFRQyxRQUFRLE9BQVIsQ0FBWjtBQUNBLElBQUlDLFNBQVNELFFBQVEsZUFBUixDQUFiO0FBQ0EsSUFBSUUsY0FBY0YsUUFBUSxrQkFBUixDQUFsQjtBQUNBLElBQU1HLFNBQVMsVUFBZjtBQUNBLElBQU1DLFFBQVEsZ0JBQWQ7QUFDQSxJQUFNQyxhQUFhLFlBQW5CO0FBQ0EsSUFBTUMsY0FBY04sUUFBUSxlQUFSLENBQXBCO0FBQ0EsSUFBTU8sS0FBS0wsWUFBWUgsS0FBWixFQUFtQkssS0FBbkIsRUFBMEI7QUFDakNJLG1CQUFjRixZQUFZRTtBQURPLENBQTFCLENBQVg7O0lBR2FDLGMsV0FBQUEsYztBQUNULDhCQUFhO0FBQUE7QUFFWjs7OzttQ0FDVUMsTyxFQUFRO0FBQ2YsbUJBQU8sSUFBSUMsT0FBSixDQUFZLFVBQUNDLE9BQUQsRUFBU0MsTUFBVCxFQUFrQjtBQUNqQ1AsNEJBQVlRLFdBQVosQ0FBd0JDLElBQXhCLENBQTZCVixVQUE3QixFQUF3QyxVQUFDVyxHQUFELEVBQUtDLEVBQUwsRUFBVTtBQUM5Q1AsNEJBQVFPLEVBQVIsR0FBYUEsRUFBYjtBQUNBWCxnQ0FBWVEsV0FBWixDQUF3QkksS0FBeEIsQ0FBOEJmLFNBQU9jLEVBQXJDLEVBQXdDUCxPQUF4QztBQUNBSCx1QkFBR1ksR0FBSCxDQUFPRixFQUFQLEVBQVVQLE9BQVYsRUFBbUIsVUFBQ00sR0FBRCxFQUFLSSxPQUFMLEVBQWU7QUFDOUJSLGdDQUFRLEVBQUNTLE9BQU0sSUFBUCxFQUFSO0FBQ0gscUJBRkQ7QUFHSCxpQkFORDtBQU9ILGFBUk0sQ0FBUDtBQVNIOzs7c0NBQ2FYLE8sRUFBUTtBQUNsQixtQkFBTyxJQUFJQyxPQUFKLENBQVksVUFBQ0MsT0FBRCxFQUFTQyxNQUFULEVBQWtCO0FBQ2pDUCw0QkFBWVEsV0FBWixDQUF3QkksS0FBeEIsQ0FBOEJmLFNBQU9jLEVBQXJDLEVBQXdDUCxPQUF4QztBQUNBSCxtQkFBR2UsTUFBSCxDQUFVWixRQUFRTyxFQUFsQixFQUFxQlAsT0FBckIsRUFBNkIsVUFBQ00sR0FBRCxFQUFLSyxLQUFMLEVBQWE7QUFDdENULDRCQUFRLEVBQUNTLE9BQU0sSUFBUCxFQUFSO0FBQ0gsaUJBRkQ7QUFHSCxhQUxNLENBQVA7QUFNSDs7O2tDQUNTSixFLEVBQUc7QUFDVCxtQkFBTyxJQUFJTixPQUFKLENBQVksVUFBQ0MsT0FBRCxFQUFTQyxNQUFULEVBQWtCO0FBQ2pDUCw0QkFBWVEsV0FBWixDQUF3QlMsR0FBeEIsQ0FBNEJwQixTQUFPYyxFQUFuQztBQUNBVixtQkFBR2lCLFdBQUgsQ0FBZXBCLEtBQWYsRUFBcUJhLEVBQXJCLEVBQXdCLFVBQUNELEdBQUQsRUFBS1MsU0FBTCxFQUFpQjtBQUNyQ2IsNEJBQVEsRUFBQ2MsU0FBUSxJQUFULEVBQVI7QUFDSCxpQkFGRDtBQUdILGFBTE0sQ0FBUDtBQU1IOzs7bUNBQ1VULEUsRUFBRztBQUNWLG1CQUFPLElBQUlOLE9BQUosQ0FBWSxVQUFDQyxPQUFELEVBQVNDLE1BQVQsRUFBa0I7QUFDakNQLDRCQUFZUSxXQUFaLENBQXdCYSxPQUF4QixDQUFnQ3hCLFNBQU9jLEVBQXZDLEVBQTBDLFVBQUNELEdBQUQsRUFBS1ksQ0FBTCxFQUFTO0FBQy9DaEIsNEJBQVEsRUFBQ2lCLFNBQVFELENBQVQsRUFBUjtBQUNILGlCQUZEO0FBR0gsYUFKTSxDQUFQO0FBS0g7OztzQ0FDWTtBQUNULG1CQUFPLElBQUlqQixPQUFKLENBQVksVUFBQ0MsT0FBRCxFQUFTQyxNQUFULEVBQWtCO0FBQ2pDTixtQkFBR3VCLE1BQUgsQ0FBVSxHQUFWLEVBQWMsRUFBZCxFQUFpQixVQUFDZCxHQUFELEVBQUtlLFFBQUwsRUFBZ0I7QUFDN0Isd0JBQUlDLFdBQVksRUFBaEI7QUFDSkQsNkJBQVNYLE9BQVQsQ0FBaUJhLE9BQWpCLENBQXlCLG1CQUFXO0FBQzVCRCxpQ0FBU0UsSUFBVCxDQUFlTCxRQUFRTSxHQUF2QjtBQUNILHFCQUZMO0FBR0l2Qiw0QkFBUSxFQUFDd0IsVUFBU0osUUFBVixFQUFSO0FBQ0gsaUJBTkQ7QUFPSCxhQVJNLENBQVA7QUFTSDs7OzRDQUNtQkssTyxFQUFRO0FBQ3hCLG1CQUFPLElBQUkxQixPQUFKLENBQVksVUFBQ0MsT0FBRCxFQUFTQyxNQUFULEVBQWtCO0FBQ2pDTixtQkFBR3VCLE1BQUgsQ0FBVSxjQUFZTyxPQUF0QixFQUE4QixFQUE5QixFQUFpQyxVQUFDckIsR0FBRCxFQUFLZSxRQUFMLEVBQWdCO0FBQzdDLHdCQUFJQyxXQUFZLEVBQWhCO0FBQ0pELDZCQUFTWCxPQUFULENBQWlCYSxPQUFqQixDQUF5QixtQkFBVztBQUM1QkQsaUNBQVNFLElBQVQsQ0FBZUwsUUFBUU0sR0FBdkI7QUFDSCxxQkFGTDtBQUdJdkIsNEJBQVEsRUFBQ3dCLFVBQVNKLFFBQVYsRUFBUjtBQUNILGlCQU5EO0FBT0gsYUFSTSxDQUFQO0FBU0giLCJmaWxlIjoiUmVkaXNTZXJ2aWNlcy9WZWhpY2xlU2VydmljZS5qcyIsInNvdXJjZXNDb250ZW50IjpbIlxudmFyIHJlZGlzID0gcmVxdWlyZSgncmVkaXMnKTtcbnZhciBscmVkaXMgPSByZXF1aXJlKCcuL3JlZGlzLWxvY2FsJyk7XG52YXIgcmVkaXNTZWFyY2ggPSByZXF1aXJlKCdyZWRpc2VhcmNoY2xpZW50Jyk7XG5jb25zdCBQUkVGSVggPSBcInZlaGljbGU6XCJcbmNvbnN0IElOREVYID0gXCJpbmRleDp2ZWhpY2xlc1wiXG5jb25zdCBWRUhJQ0xFX0lEID0gXCJ2ZWhpY2xlOmlkXCI7IFxuY29uc3QgZGF0YUNvbnRleHQgPSByZXF1aXJlKCcuL2RhdGFDb250ZXh0Jyk7IFxuY29uc3QgcnMgPSByZWRpc1NlYXJjaChyZWRpcywgSU5ERVgsIHtcbiAgICBjbGllbnRPcHRpb25zOmRhdGFDb250ZXh0LmNsaWVudE9wdGlvbnNcbn0pO1xuZXhwb3J0IGNsYXNzIFZlaGljbGVTZXJ2aWNle1xuICAgIGNvbnN0cnVjdG9yKCl7XG5cbiAgICB9XG4gICAgYWRkVmVoaWNsZSh2ZWNoaWxlKXtcbiAgICAgICAgcmV0dXJuIG5ldyBQcm9taXNlKChyZXNvbHZlLHJlamVjdCk9PntcbiAgICAgICAgICAgIGRhdGFDb250ZXh0LnJlZGlzQ2xpZW50LmluY3IoVkVISUNMRV9JRCwoZXJyLGlkKT0+e1xuICAgICAgICAgICAgICAgIHZlY2hpbGUuaWQgPSBpZCA7IFxuICAgICAgICAgICAgICAgIGRhdGFDb250ZXh0LnJlZGlzQ2xpZW50Lmhtc2V0KFBSRUZJWCtpZCx2ZWNoaWxlKTsgXG4gICAgICAgICAgICAgICAgcnMuYWRkKGlkLHZlY2hpbGUsIChlcnIscmVzdWx0cyk9PntcbiAgICAgICAgICAgICAgICAgICAgcmVzb2x2ZSh7c2F2ZWQ6dHJ1ZX0pOyBcbiAgICAgICAgICAgICAgICB9KTsgXG4gICAgICAgICAgICB9KVxuICAgICAgICB9KVxuICAgIH1cbiAgICB1cGRhdGVWZWhpY2xlKHZlY2hpbGUpe1xuICAgICAgICByZXR1cm4gbmV3IFByb21pc2UoKHJlc29sdmUscmVqZWN0KT0+e1xuICAgICAgICAgICAgZGF0YUNvbnRleHQucmVkaXNDbGllbnQuaG1zZXQoUFJFRklYK2lkLHZlY2hpbGUpOyBcbiAgICAgICAgICAgIHJzLnVwZGF0ZSh2ZWNoaWxlLmlkLHZlY2hpbGUsKGVycixzYXZlZCk9PntcbiAgICAgICAgICAgICAgICByZXNvbHZlKHtzYXZlZDp0cnVlfSlcbiAgICAgICAgICAgIH0pXG4gICAgICAgIH0pXG4gICAgfVxuICAgIHJtVmVjaGlsZShpZCl7XG4gICAgICAgIHJldHVybiBuZXcgUHJvbWlzZSgocmVzb2x2ZSxyZWplY3QpPT57XG4gICAgICAgICAgICBkYXRhQ29udGV4dC5yZWRpc0NsaWVudC5kZWwoUFJFRklYK2lkKTsgXG4gICAgICAgICAgICBycy5kZWxEb2N1bWVudChJTkRFWCxpZCwoZXJyLGRlbFJlc3VsdCk9PntcbiAgICAgICAgICAgICAgICByZXNvbHZlKHtkZWxldGVkOnRydWV9KTsgXG4gICAgICAgICAgICB9KVxuICAgICAgICB9KVxuICAgIH1cbiAgICBnZXRWZWhpY2xlKGlkKXtcbiAgICAgICAgcmV0dXJuIG5ldyBQcm9taXNlKChyZXNvbHZlLHJlamVjdCk9PntcbiAgICAgICAgICAgIGRhdGFDb250ZXh0LnJlZGlzQ2xpZW50LmhnZXRhbGwoUFJFRklYK2lkLChlcnIsdik9PntcbiAgICAgICAgICAgICAgICByZXNvbHZlKHt2ZWhpY2xlOnZ9KTsgXG4gICAgICAgICAgICB9KVxuICAgICAgICB9KVxuICAgIH1cbiAgICBnZXRWZWhpY2xlcygpe1xuICAgICAgICByZXR1cm4gbmV3IFByb21pc2UoKHJlc29sdmUscmVqZWN0KT0+e1xuICAgICAgICAgICAgcnMuc2VhcmNoKFwiKlwiLHt9LChlcnIsdlJlc3VsdHMpPT57XG4gICAgICAgICAgICAgICAgdmFyIHZlaGlsY2VzICA9IFtdOyBcbiAgICAgICAgICAgIHZSZXN1bHRzLnJlc3VsdHMuZm9yRWFjaCh2ZWhpY2xlID0+IHtcbiAgICAgICAgICAgICAgICAgICAgdmVoaWxjZXMucHVzaCAodmVoaWNsZS5kb2MpOyBcbiAgICAgICAgICAgICAgICB9KTtcbiAgICAgICAgICAgICAgICByZXNvbHZlKHt2ZWhpY2xlczp2ZWhpbGNlc30pO1xuICAgICAgICAgICAgfSlcbiAgICAgICAgfSlcbiAgICB9XG4gICAgZ2V0VmVoaWNsZUJ5Q291bnRyeShjb3VudHJ5KXtcbiAgICAgICAgcmV0dXJuIG5ldyBQcm9taXNlKChyZXNvbHZlLHJlamVjdCk9PntcbiAgICAgICAgICAgIHJzLnNlYXJjaChcIkBjb3VudHJ5OlwiK2NvdW50cnkse30sKGVycix2UmVzdWx0cyk9PntcbiAgICAgICAgICAgICAgICB2YXIgdmVoaWxjZXMgID0gW107IFxuICAgICAgICAgICAgdlJlc3VsdHMucmVzdWx0cy5mb3JFYWNoKHZlaGljbGUgPT4ge1xuICAgICAgICAgICAgICAgICAgICB2ZWhpbGNlcy5wdXNoICh2ZWhpY2xlLmRvYyk7IFxuICAgICAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgICAgIHJlc29sdmUoe3ZlaGljbGVzOnZlaGlsY2VzfSk7XG4gICAgICAgICAgICB9KVxuICAgICAgICB9KVxuICAgIH1cbn0iXX0=
