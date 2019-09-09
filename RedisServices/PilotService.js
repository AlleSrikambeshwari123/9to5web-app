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
                    resolve({ pilots: pilots });
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
            });
        }
    }]);

    return PilotService;
}();
//# sourceMappingURL=data:application/json;charset=utf8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIlJlZGlzU2VydmljZXMvUGlsb3RTZXJ2aWNlLmVzNiJdLCJuYW1lcyI6WyJkYXRhQ29udGV4dCIsInJlcXVpcmUiLCJyZWRpcyIsIlBSRUZJWCIsIlBJTE9UX0lEIiwicmVkaXNTZWFyY2giLCJQSUxPVF9JTkRFWCIsInJzIiwiY2xpZW50T3B0aW9ucyIsIlBpbG90U2VydmljZSIsInBpbG90IiwiUHJvbWlzZSIsInJlc29sdmUiLCJyZWplY3QiLCJyZWRpc0NsaWVudCIsImluY3IiLCJlcnIiLCJpZCIsImhtc2V0IiwiZXJyUyIsInJlc3VsdCIsImFkZCIsInNhdmVkIiwidXBkYXRlIiwic2VhcmNoIiwicGlsb3RzIiwiclBpbG90cyIsInJlc3VsdHMiLCJmb3JFYWNoIiwicHVzaCIsImRvYyIsImhnZXRhbGwiLCJwIiwiZGVsIiwiZGVsRG9jdW1lbnQiXSwibWFwcGluZ3MiOiI7Ozs7Ozs7OztBQUFBOzs7O0FBRUEsSUFBSUEsY0FBY0MsUUFBUSxlQUFSLENBQWxCO0FBQ0EsSUFBSUMsUUFBUUQsUUFBUSxPQUFSLENBQVo7QUFDQSxJQUFNRSxTQUFTLFFBQWY7QUFDQSxJQUFNQyxXQUFXLFVBQWpCO0FBQ0EsSUFBSUMsY0FBY0osUUFBUSxxQkFBUixDQUFsQjtBQUNBLElBQUlLLGNBQWMsY0FBbEI7QUFDQSxJQUFNQyxLQUFLRixZQUFZSCxLQUFaLEVBQW1CSSxXQUFuQixFQUFnQztBQUN2Q0UsbUJBQWNSLFlBQVlRO0FBRGEsQ0FBaEMsQ0FBWDs7SUFJYUMsWSxXQUFBQSxZO0FBQ1QsNEJBQWE7QUFBQTtBQUVaOzs7O2lDQUNRQyxLLEVBQU07QUFDWCxtQkFBTyxJQUFJQyxPQUFKLENBQVksVUFBQ0MsT0FBRCxFQUFTQyxNQUFULEVBQWtCO0FBQ2pDYiw0QkFBWWMsV0FBWixDQUF3QkMsSUFBeEIsQ0FBNkJYLFFBQTdCLEVBQXNDLFVBQUNZLEdBQUQsRUFBS0MsRUFBTCxFQUFVO0FBQzVDakIsZ0NBQVljLFdBQVosQ0FBd0JJLEtBQXhCLENBQThCZixTQUFPYyxFQUFyQyxFQUF3Q1AsS0FBeEMsRUFBOEMsVUFBQ1MsSUFBRCxFQUFNQyxNQUFOLEVBQWU7QUFDekRiLDJCQUFHYyxHQUFILENBQU9KLEVBQVAsRUFBVVAsS0FBVjtBQUNBRSxnQ0FBUSxFQUFDVSxPQUFNLElBQVAsRUFBUjtBQUNILHFCQUhEO0FBSUgsaUJBTEQ7QUFNSCxhQVBNLENBQVA7QUFRSDs7O29DQUNXWixLLEVBQU07QUFDZCxtQkFBTyxJQUFJQyxPQUFKLENBQVksVUFBQ0MsT0FBRCxFQUFTQyxNQUFULEVBQWtCO0FBQ2pDYiw0QkFBWWMsV0FBWixDQUF3QkksS0FBeEIsQ0FBOEJmLFNBQU9PLE1BQU1PLEVBQTNDLEVBQThDUCxLQUE5QztBQUNBSCxtQkFBR2dCLE1BQUgsQ0FBVWIsTUFBTU8sRUFBaEIsRUFBbUJQLEtBQW5CO0FBQ0gsYUFITSxDQUFQO0FBSUg7OztvQ0FDVTtBQUNQLG1CQUFPLElBQUlDLE9BQUosQ0FBWSxVQUFDQyxPQUFELEVBQVNDLE1BQVQsRUFBa0I7QUFDakNOLG1CQUFHaUIsTUFBSCxDQUFVLEdBQVYsRUFBYyxFQUFkLEVBQWlCLFVBQUNSLEdBQUQsRUFBS1MsTUFBTCxFQUFjO0FBQzNCLHdCQUFJQyxVQUFVLEVBQWQ7QUFDQUQsMkJBQU9FLE9BQVAsQ0FBZUMsT0FBZixDQUF1QixpQkFBUztBQUM1QkYsZ0NBQVFHLElBQVIsQ0FBYW5CLE1BQU1vQixHQUFuQjtBQUNILHFCQUZEO0FBR0FsQiw0QkFBUSxFQUFDYSxRQUFPQSxNQUFSLEVBQVI7QUFDSCxpQkFORDtBQU9ILGFBUk0sQ0FBUDtBQVNIOzs7aUNBQ1FSLEUsRUFBRztBQUNSLG1CQUFPLElBQUlOLE9BQUosQ0FBWSxVQUFDQyxPQUFELEVBQVNDLE1BQVQsRUFBa0I7QUFDakNiLDRCQUFZYyxXQUFaLENBQXdCaUIsT0FBeEIsQ0FBZ0M1QixTQUFPYyxFQUF2QyxFQUEwQyxVQUFDRCxHQUFELEVBQUtnQixDQUFMLEVBQVM7QUFDL0NwQiw0QkFBUSxFQUFDRixPQUFNc0IsQ0FBUCxFQUFSO0FBQ0gsaUJBRkQ7QUFHSCxhQUpNLENBQVA7QUFLSDs7O2dDQUNPZixFLEVBQUc7QUFDUCxtQkFBTyxJQUFJTixPQUFKLENBQVksVUFBQ0MsT0FBRCxFQUFTQyxNQUFULEVBQWtCO0FBQ2pDYiw0QkFBWWMsV0FBWixDQUF3Qm1CLEdBQXhCLENBQTRCOUIsU0FBT2MsRUFBbkM7QUFDQVYsbUJBQUcyQixXQUFILENBQWU1QixXQUFmLEVBQTJCVyxFQUEzQjtBQUNILGFBSE0sQ0FBUDtBQUlIIiwiZmlsZSI6IlJlZGlzU2VydmljZXMvUGlsb3RTZXJ2aWNlLmpzIiwic291cmNlc0NvbnRlbnQiOlsiaW1wb3J0IHsgZnRydW5jYXRlLCBwcm9taXNlcyB9IGZyb20gJ2ZzJztcblxudmFyIGRhdGFDb250ZXh0ID0gcmVxdWlyZSgnLi9kYXRhQ29udGV4dCcpOyBcbnZhciByZWRpcyA9IHJlcXVpcmUoJ3JlZGlzJyk7IFxuY29uc3QgUFJFRklYID0gXCJwaWxvdDpcIlxuY29uc3QgUElMT1RfSUQgPSBcInBpbG90OmlkXCJcbnZhciByZWRpc1NlYXJjaCA9IHJlcXVpcmUoJy4uL3JlZGlzZWFyY2hjbGllbnQnKTtcbnZhciBQSUxPVF9JTkRFWCA9IFwiaW5kZXg6cGlsb3RzXCJcbmNvbnN0IHJzID0gcmVkaXNTZWFyY2gocmVkaXMsIFBJTE9UX0lOREVYLCB7XG4gICAgY2xpZW50T3B0aW9uczpkYXRhQ29udGV4dC5jbGllbnRPcHRpb25zXG59KTtcblxuZXhwb3J0IGNsYXNzIFBpbG90U2VydmljZXtcbiAgICBjb25zdHJ1Y3Rvcigpe1xuXG4gICAgfVxuICAgIGFkZFBpbG90KHBpbG90KXtcbiAgICAgICAgcmV0dXJuIG5ldyBQcm9taXNlKChyZXNvbHZlLHJlamVjdCk9PntcbiAgICAgICAgICAgIGRhdGFDb250ZXh0LnJlZGlzQ2xpZW50LmluY3IoUElMT1RfSUQsKGVycixpZCk9PntcbiAgICAgICAgICAgICAgICBkYXRhQ29udGV4dC5yZWRpc0NsaWVudC5obXNldChQUkVGSVgraWQscGlsb3QsKGVyclMscmVzdWx0KT0+e1xuICAgICAgICAgICAgICAgICAgICBycy5hZGQoaWQscGlsb3QpOyBcbiAgICAgICAgICAgICAgICAgICAgcmVzb2x2ZSh7c2F2ZWQ6dHJ1ZX0pOyBcbiAgICAgICAgICAgICAgICB9KVxuICAgICAgICAgICAgfSlcbiAgICAgICAgfSlcbiAgICB9XG4gICAgdXBkYXRlUGlsb3QocGlsb3Qpe1xuICAgICAgICByZXR1cm4gbmV3IFByb21pc2UoKHJlc29sdmUscmVqZWN0KT0+e1xuICAgICAgICAgICAgZGF0YUNvbnRleHQucmVkaXNDbGllbnQuaG1zZXQoUFJFRklYK3BpbG90LmlkLHBpbG90KVxuICAgICAgICAgICAgcnMudXBkYXRlKHBpbG90LmlkLHBpbG90KTtcbiAgICAgICAgfSlcbiAgICB9XG4gICAgZ2V0UGlsb3RzKCl7XG4gICAgICAgIHJldHVybiBuZXcgUHJvbWlzZSgocmVzb2x2ZSxyZWplY3QpPT57XG4gICAgICAgICAgICBycy5zZWFyY2goXCIqXCIse30sKGVycixwaWxvdHMpPT57XG4gICAgICAgICAgICAgICAgdmFyIHJQaWxvdHMgPSBbXTsgXG4gICAgICAgICAgICAgICAgcGlsb3RzLnJlc3VsdHMuZm9yRWFjaChwaWxvdCA9PiB7XG4gICAgICAgICAgICAgICAgICAgIHJQaWxvdHMucHVzaChwaWxvdC5kb2MpOyBcbiAgICAgICAgICAgICAgICB9KTtcbiAgICAgICAgICAgICAgICByZXNvbHZlKHtwaWxvdHM6cGlsb3RzfSlcbiAgICAgICAgICAgIH0pO1xuICAgICAgICB9KTsgXG4gICAgfVxuICAgIGdldFBpbG90KGlkKXtcbiAgICAgICAgcmV0dXJuIG5ldyBQcm9taXNlKChyZXNvbHZlLHJlamVjdCk9PntcbiAgICAgICAgICAgIGRhdGFDb250ZXh0LnJlZGlzQ2xpZW50LmhnZXRhbGwoUFJFRklYK2lkLChlcnIscCk9PntcbiAgICAgICAgICAgICAgICByZXNvbHZlKHtwaWxvdDpwfSk7IFxuICAgICAgICAgICAgfSlcbiAgICAgICAgfSlcbiAgICB9XG4gICAgcm1QaWxvdChpZCl7XG4gICAgICAgIHJldHVybiBuZXcgUHJvbWlzZSgocmVzb2x2ZSxyZWplY3QpPT57XG4gICAgICAgICAgICBkYXRhQ29udGV4dC5yZWRpc0NsaWVudC5kZWwoUFJFRklYK2lkKTsgXG4gICAgICAgICAgICBycy5kZWxEb2N1bWVudChQSUxPVF9JTkRFWCxpZClcbiAgICAgICAgfSk7XG4gICAgfVxufSJdfQ==
