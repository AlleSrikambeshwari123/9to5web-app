'use strict';

Object.defineProperty(exports, "__esModule", {
    value: true
});
exports.PilotService = undefined;

var _createClass = function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; }();

var _fs = require('fs');

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

var dataContext = require('./dataContext');
var redis = require('redis');
var PREFIX = "pilot:";
var PILOT_ID = "pilot:id";
var redisSearch = require('../redisearchclient');
var PILOT_INDEX = "index:pilots";
var rs = redisSearch(redis, PILOT_INDEX, {
    clientOptions: dataContext.clientOptions
});

var PilotService = exports.PilotService = function () {
    function PilotService() {
        _classCallCheck(this, PilotService);
    }

    _createClass(PilotService, [{
        key: 'addPilot',
        value: function addPilot(pilot) {
            return new Promise(function (resolve, reject) {
                dataContext.redisClient.incr(PILOT_ID, function (err, id) {
                    pilot.id = id;
                    dataContext.redisClient.hmset(PREFIX + id, pilot, function (errS, result) {
                        rs.add(id, pilot);
                        resolve({ saved: true });
                    });
                });
            });
        }
    }, {
        key: 'updatePilot',
        value: function updatePilot(pilot) {
            return new Promise(function (resolve, reject) {
                dataContext.redisClient.hmset(PREFIX + pilot.id, pilot);
                rs.update(pilot.id, pilot);
            });
        }
    }, {
        key: 'getPilots',
        value: function getPilots() {
            return new Promise(function (resolve, reject) {
                rs.search("*", {}, function (err, pilots) {
                    var rPilots = [];
                    pilots.results.forEach(function (pilot) {
                        rPilots.push(pilot.doc);
                    });
                    resolve({ pilots: rPilots });
                });
            });
        }
    }, {
        key: 'getPilot',
        value: function getPilot(id) {
            return new Promise(function (resolve, reject) {
                dataContext.redisClient.hgetall(PREFIX + id, function (err, p) {
                    resolve({ pilot: p });
                });
            });
        }
    }, {
        key: 'rmPilot',
        value: function rmPilot(id) {
            return new Promise(function (resolve, reject) {
                dataContext.redisClient.del(PREFIX + id);
                rs.delDocument(PILOT_INDEX, id);
                resolve({ deleted: true });
            });
        }
    }]);

    return PilotService;
}();
//# sourceMappingURL=data:application/json;charset=utf8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIlJlZGlzU2VydmljZXMvUGlsb3RTZXJ2aWNlLmVzNiJdLCJuYW1lcyI6WyJkYXRhQ29udGV4dCIsInJlcXVpcmUiLCJyZWRpcyIsIlBSRUZJWCIsIlBJTE9UX0lEIiwicmVkaXNTZWFyY2giLCJQSUxPVF9JTkRFWCIsInJzIiwiY2xpZW50T3B0aW9ucyIsIlBpbG90U2VydmljZSIsInBpbG90IiwiUHJvbWlzZSIsInJlc29sdmUiLCJyZWplY3QiLCJyZWRpc0NsaWVudCIsImluY3IiLCJlcnIiLCJpZCIsImhtc2V0IiwiZXJyUyIsInJlc3VsdCIsImFkZCIsInNhdmVkIiwidXBkYXRlIiwic2VhcmNoIiwicGlsb3RzIiwiclBpbG90cyIsInJlc3VsdHMiLCJmb3JFYWNoIiwicHVzaCIsImRvYyIsImhnZXRhbGwiLCJwIiwiZGVsIiwiZGVsRG9jdW1lbnQiLCJkZWxldGVkIl0sIm1hcHBpbmdzIjoiOzs7Ozs7Ozs7QUFBQTs7OztBQUVBLElBQUlBLGNBQWNDLFFBQVEsZUFBUixDQUFsQjtBQUNBLElBQUlDLFFBQVFELFFBQVEsT0FBUixDQUFaO0FBQ0EsSUFBTUUsU0FBUyxRQUFmO0FBQ0EsSUFBTUMsV0FBVyxVQUFqQjtBQUNBLElBQUlDLGNBQWNKLFFBQVEscUJBQVIsQ0FBbEI7QUFDQSxJQUFJSyxjQUFjLGNBQWxCO0FBQ0EsSUFBTUMsS0FBS0YsWUFBWUgsS0FBWixFQUFtQkksV0FBbkIsRUFBZ0M7QUFDdkNFLG1CQUFjUixZQUFZUTtBQURhLENBQWhDLENBQVg7O0lBSWFDLFksV0FBQUEsWTtBQUNULDRCQUFhO0FBQUE7QUFFWjs7OztpQ0FDUUMsSyxFQUFNO0FBQ1gsbUJBQU8sSUFBSUMsT0FBSixDQUFZLFVBQUNDLE9BQUQsRUFBU0MsTUFBVCxFQUFrQjtBQUNqQ2IsNEJBQVljLFdBQVosQ0FBd0JDLElBQXhCLENBQTZCWCxRQUE3QixFQUFzQyxVQUFDWSxHQUFELEVBQUtDLEVBQUwsRUFBVTtBQUM1Q1AsMEJBQU1PLEVBQU4sR0FBV0EsRUFBWDtBQUNBakIsZ0NBQVljLFdBQVosQ0FBd0JJLEtBQXhCLENBQThCZixTQUFPYyxFQUFyQyxFQUF3Q1AsS0FBeEMsRUFBOEMsVUFBQ1MsSUFBRCxFQUFNQyxNQUFOLEVBQWU7QUFDekRiLDJCQUFHYyxHQUFILENBQU9KLEVBQVAsRUFBVVAsS0FBVjtBQUNBRSxnQ0FBUSxFQUFDVSxPQUFNLElBQVAsRUFBUjtBQUNILHFCQUhEO0FBSUgsaUJBTkQ7QUFPSCxhQVJNLENBQVA7QUFTSDs7O29DQUNXWixLLEVBQU07QUFDZCxtQkFBTyxJQUFJQyxPQUFKLENBQVksVUFBQ0MsT0FBRCxFQUFTQyxNQUFULEVBQWtCO0FBQ2pDYiw0QkFBWWMsV0FBWixDQUF3QkksS0FBeEIsQ0FBOEJmLFNBQU9PLE1BQU1PLEVBQTNDLEVBQThDUCxLQUE5QztBQUNBSCxtQkFBR2dCLE1BQUgsQ0FBVWIsTUFBTU8sRUFBaEIsRUFBbUJQLEtBQW5CO0FBQ0gsYUFITSxDQUFQO0FBSUg7OztvQ0FDVTtBQUNQLG1CQUFPLElBQUlDLE9BQUosQ0FBWSxVQUFDQyxPQUFELEVBQVNDLE1BQVQsRUFBa0I7QUFDakNOLG1CQUFHaUIsTUFBSCxDQUFVLEdBQVYsRUFBYyxFQUFkLEVBQWlCLFVBQUNSLEdBQUQsRUFBS1MsTUFBTCxFQUFjO0FBQzNCLHdCQUFJQyxVQUFVLEVBQWQ7QUFDQUQsMkJBQU9FLE9BQVAsQ0FBZUMsT0FBZixDQUF1QixpQkFBUztBQUM1QkYsZ0NBQVFHLElBQVIsQ0FBYW5CLE1BQU1vQixHQUFuQjtBQUNILHFCQUZEO0FBR0FsQiw0QkFBUSxFQUFDYSxRQUFPQyxPQUFSLEVBQVI7QUFDSCxpQkFORDtBQU9ILGFBUk0sQ0FBUDtBQVNIOzs7aUNBQ1FULEUsRUFBRztBQUNSLG1CQUFPLElBQUlOLE9BQUosQ0FBWSxVQUFDQyxPQUFELEVBQVNDLE1BQVQsRUFBa0I7QUFDakNiLDRCQUFZYyxXQUFaLENBQXdCaUIsT0FBeEIsQ0FBZ0M1QixTQUFPYyxFQUF2QyxFQUEwQyxVQUFDRCxHQUFELEVBQUtnQixDQUFMLEVBQVM7QUFDL0NwQiw0QkFBUSxFQUFDRixPQUFNc0IsQ0FBUCxFQUFSO0FBQ0gsaUJBRkQ7QUFHSCxhQUpNLENBQVA7QUFLSDs7O2dDQUNPZixFLEVBQUc7QUFDUCxtQkFBTyxJQUFJTixPQUFKLENBQVksVUFBQ0MsT0FBRCxFQUFTQyxNQUFULEVBQWtCO0FBQ2pDYiw0QkFBWWMsV0FBWixDQUF3Qm1CLEdBQXhCLENBQTRCOUIsU0FBT2MsRUFBbkM7QUFDQVYsbUJBQUcyQixXQUFILENBQWU1QixXQUFmLEVBQTJCVyxFQUEzQjtBQUNBTCx3QkFBUSxFQUFDdUIsU0FBUSxJQUFULEVBQVI7QUFDSCxhQUpNLENBQVA7QUFLSCIsImZpbGUiOiJSZWRpc1NlcnZpY2VzL1BpbG90U2VydmljZS5qcyIsInNvdXJjZXNDb250ZW50IjpbImltcG9ydCB7IGZ0cnVuY2F0ZSwgcHJvbWlzZXMgfSBmcm9tICdmcyc7XG5cbnZhciBkYXRhQ29udGV4dCA9IHJlcXVpcmUoJy4vZGF0YUNvbnRleHQnKTsgXG52YXIgcmVkaXMgPSByZXF1aXJlKCdyZWRpcycpOyBcbmNvbnN0IFBSRUZJWCA9IFwicGlsb3Q6XCJcbmNvbnN0IFBJTE9UX0lEID0gXCJwaWxvdDppZFwiXG52YXIgcmVkaXNTZWFyY2ggPSByZXF1aXJlKCcuLi9yZWRpc2VhcmNoY2xpZW50Jyk7XG52YXIgUElMT1RfSU5ERVggPSBcImluZGV4OnBpbG90c1wiXG5jb25zdCBycyA9IHJlZGlzU2VhcmNoKHJlZGlzLCBQSUxPVF9JTkRFWCwge1xuICAgIGNsaWVudE9wdGlvbnM6ZGF0YUNvbnRleHQuY2xpZW50T3B0aW9uc1xufSk7XG5cbmV4cG9ydCBjbGFzcyBQaWxvdFNlcnZpY2V7XG4gICAgY29uc3RydWN0b3IoKXtcblxuICAgIH1cbiAgICBhZGRQaWxvdChwaWxvdCl7XG4gICAgICAgIHJldHVybiBuZXcgUHJvbWlzZSgocmVzb2x2ZSxyZWplY3QpPT57XG4gICAgICAgICAgICBkYXRhQ29udGV4dC5yZWRpc0NsaWVudC5pbmNyKFBJTE9UX0lELChlcnIsaWQpPT57XG4gICAgICAgICAgICAgICAgcGlsb3QuaWQgPSBpZDsgXG4gICAgICAgICAgICAgICAgZGF0YUNvbnRleHQucmVkaXNDbGllbnQuaG1zZXQoUFJFRklYK2lkLHBpbG90LChlcnJTLHJlc3VsdCk9PntcbiAgICAgICAgICAgICAgICAgICAgcnMuYWRkKGlkLHBpbG90KTsgXG4gICAgICAgICAgICAgICAgICAgIHJlc29sdmUoe3NhdmVkOnRydWV9KTsgXG4gICAgICAgICAgICAgICAgfSlcbiAgICAgICAgICAgIH0pXG4gICAgICAgIH0pXG4gICAgfVxuICAgIHVwZGF0ZVBpbG90KHBpbG90KXtcbiAgICAgICAgcmV0dXJuIG5ldyBQcm9taXNlKChyZXNvbHZlLHJlamVjdCk9PntcbiAgICAgICAgICAgIGRhdGFDb250ZXh0LnJlZGlzQ2xpZW50Lmhtc2V0KFBSRUZJWCtwaWxvdC5pZCxwaWxvdClcbiAgICAgICAgICAgIHJzLnVwZGF0ZShwaWxvdC5pZCxwaWxvdCk7XG4gICAgICAgIH0pXG4gICAgfVxuICAgIGdldFBpbG90cygpe1xuICAgICAgICByZXR1cm4gbmV3IFByb21pc2UoKHJlc29sdmUscmVqZWN0KT0+e1xuICAgICAgICAgICAgcnMuc2VhcmNoKFwiKlwiLHt9LChlcnIscGlsb3RzKT0+e1xuICAgICAgICAgICAgICAgIHZhciByUGlsb3RzID0gW107IFxuICAgICAgICAgICAgICAgIHBpbG90cy5yZXN1bHRzLmZvckVhY2gocGlsb3QgPT4ge1xuICAgICAgICAgICAgICAgICAgICByUGlsb3RzLnB1c2gocGlsb3QuZG9jKTsgXG4gICAgICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICAgICAgcmVzb2x2ZSh7cGlsb3RzOnJQaWxvdHN9KVxuICAgICAgICAgICAgfSk7XG4gICAgICAgIH0pOyBcbiAgICB9XG4gICAgZ2V0UGlsb3QoaWQpe1xuICAgICAgICByZXR1cm4gbmV3IFByb21pc2UoKHJlc29sdmUscmVqZWN0KT0+e1xuICAgICAgICAgICAgZGF0YUNvbnRleHQucmVkaXNDbGllbnQuaGdldGFsbChQUkVGSVgraWQsKGVycixwKT0+e1xuICAgICAgICAgICAgICAgIHJlc29sdmUoe3BpbG90OnB9KTsgXG4gICAgICAgICAgICB9KVxuICAgICAgICB9KVxuICAgIH1cbiAgICBybVBpbG90KGlkKXtcbiAgICAgICAgcmV0dXJuIG5ldyBQcm9taXNlKChyZXNvbHZlLHJlamVjdCk9PntcbiAgICAgICAgICAgIGRhdGFDb250ZXh0LnJlZGlzQ2xpZW50LmRlbChQUkVGSVgraWQpOyBcbiAgICAgICAgICAgIHJzLmRlbERvY3VtZW50KFBJTE9UX0lOREVYLGlkKVxuICAgICAgICAgICAgcmVzb2x2ZSh7ZGVsZXRlZDp0cnVlfSlcbiAgICAgICAgfSk7XG4gICAgfVxufSJdfQ==
