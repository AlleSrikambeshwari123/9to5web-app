'use strict';

Object.defineProperty(exports, "__esModule", {
    value: true
});

var _createClass = function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; }();

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

var redis = require('redis');
var lredis = require('../DataServices/redis-local');
var redisSearch = require('redisearchclient');

var CustomerService = exports.CustomerService = function () {
    function CustomerService() {
        _classCallCheck(this, CustomerService);

        this.mySearch = redisSearch(redis, 'tew:customers', {
            clientOptions: {
                'host': 'redis-14897.c2822.us-east-1-mz.ec2.cloud.rlrcp.com',
                'port': '14897',
                auth_pass: 't5atRuWQlOW7Vp2uhZpQivcIotDmTPpl'
            }
        });
    }

    _createClass(CustomerService, [{
        key: 'listCustomers',
        value: function listCustomers(page, pageSize) {
            var _this = this;

            return new Promise(function (resolve, reject) {
                var offsetVal = (page - 1) * pageSize;
                console.log('offset ' + offsetVal);

                _this.mySearch.search("*", {
                    offset: offsetVal,
                    numberOfResults: pageSize,
                    SORTBY: "skybox"
                }, function (r1, data) {
                    console.log(data);
                    var customers = [];
                    data.results.forEach(function (customerResult) {
                        customers.push(customerResult.doc);
                    });
                    console.log(customers);
                    var pagedData = {
                        customers: customers,
                        totalResults: data.totalResults,
                        page: page,
                        pageSize: pageSize,
                        TotalPages: data.totalResults / pageSize
                    };
                    resolve(pagedData);
                    //Promise.all()
                    console.log(customers);
                    // Promise.all(customers.map(lredis.hgetall)).then(function (ownersResult) {
                    //     console.log(ownersResult);

                    // });

                    //console.log(r2); 
                });
            });
        }
    }, {
        key: 'searchCustomers',
        value: function searchCustomers(search, page, pageSize) {
            var _this2 = this;

            return new Promise(function (resolve, reject) {
                var offsetVal = (page - 1) * pageSize;
                console.log('offset ' + offsetVal);

                _this2.mySearch.search(search + '*', {
                    offset: offsetVal,
                    numberOfResults: pageSize,
                    SORTBY: "skybox"
                }, function (r1, data) {
                    console.log(data);
                    var customers = [];
                    data.results.forEach(function (customerResult) {
                        customers.push(customerResult.doc);
                    });
                    console.log(customers);
                    var pagedData = {
                        customers: customers,
                        totalResults: data.totalResults,
                        page: page,
                        pageSize: pageSize,
                        TotalPages: data.totalResults / pageSize
                    };
                    resolve(pagedData);
                    //Promise.all()
                    console.log(customers);
                    // Promise.all(customers.map(lredis.hgetall)).then(function (ownersResult) {
                    //     console.log(ownersResult);

                    // });

                    //console.log(r2); 
                });
            });
        }
    }, {
        key: 'getCustomer',
        value: function getCustomer(skybox) {
            return new Promise(function (resolve, reject) {
                lredis.hgetall("tew:owners:" + skybox).then(function (user) {
                    console.log(user);
                    resolve(user);
                });
            });
        }
    }]);

    return CustomerService;
}();
//# sourceMappingURL=data:application/json;charset=utf8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIlJlZGlzU2VydmljZXMvQ3VzdG9tZXJTZXJ2aWNlLmVzNiJdLCJuYW1lcyI6WyJyZWRpcyIsInJlcXVpcmUiLCJscmVkaXMiLCJyZWRpc1NlYXJjaCIsIkN1c3RvbWVyU2VydmljZSIsIm15U2VhcmNoIiwiY2xpZW50T3B0aW9ucyIsImF1dGhfcGFzcyIsInBhZ2UiLCJwYWdlU2l6ZSIsIlByb21pc2UiLCJyZXNvbHZlIiwicmVqZWN0Iiwib2Zmc2V0VmFsIiwiY29uc29sZSIsImxvZyIsInNlYXJjaCIsIm9mZnNldCIsIm51bWJlck9mUmVzdWx0cyIsIlNPUlRCWSIsInIxIiwiZGF0YSIsImN1c3RvbWVycyIsInJlc3VsdHMiLCJmb3JFYWNoIiwicHVzaCIsImN1c3RvbWVyUmVzdWx0IiwiZG9jIiwicGFnZWREYXRhIiwidG90YWxSZXN1bHRzIiwiVG90YWxQYWdlcyIsInNreWJveCIsImhnZXRhbGwiLCJ0aGVuIiwidXNlciJdLCJtYXBwaW5ncyI6Ijs7Ozs7Ozs7OztBQUFBLElBQUlBLFFBQVFDLFFBQVEsT0FBUixDQUFaO0FBQ0EsSUFBSUMsU0FBU0QsUUFBUSw2QkFBUixDQUFiO0FBQ0EsSUFBSUUsY0FBY0YsUUFBUSxrQkFBUixDQUFsQjs7SUFFYUcsZSxXQUFBQSxlO0FBQ1QsK0JBQWM7QUFBQTs7QUFDVixhQUFLQyxRQUFMLEdBQWdCRixZQUFZSCxLQUFaLEVBQW1CLGVBQW5CLEVBQW9DO0FBQ2hETSwyQkFBZTtBQUNYLHdCQUFRLG9EQURHO0FBRVgsd0JBQVEsT0FGRztBQUdYQywyQkFBVztBQUhBO0FBRGlDLFNBQXBDLENBQWhCO0FBT0g7Ozs7c0NBRWFDLEksRUFBTUMsUSxFQUFVO0FBQUE7O0FBQzFCLG1CQUFPLElBQUlDLE9BQUosQ0FBWSxVQUFDQyxPQUFELEVBQVVDLE1BQVYsRUFBcUI7QUFDcEMsb0JBQUlDLFlBQVksQ0FBQ0wsT0FBTyxDQUFSLElBQWFDLFFBQTdCO0FBQ0FLLHdCQUFRQyxHQUFSLENBQVksWUFBVUYsU0FBdEI7O0FBRUEsc0JBQUtSLFFBQUwsQ0FBY1csTUFBZCxDQUFxQixHQUFyQixFQUEwQjtBQUN0QkMsNEJBQU9KLFNBRGU7QUFFdEJLLHFDQUFpQlQsUUFGSztBQUd0QlUsNEJBQVE7QUFIYyxpQkFBMUIsRUFJRyxVQUFDQyxFQUFELEVBQUtDLElBQUwsRUFBYztBQUNiUCw0QkFBUUMsR0FBUixDQUFZTSxJQUFaO0FBQ0Esd0JBQUlDLFlBQVksRUFBaEI7QUFDQ0QseUJBQUtFLE9BQUwsQ0FBYUMsT0FBYixDQUFxQiwwQkFBa0I7QUFDbkNGLGtDQUFVRyxJQUFWLENBQWVDLGVBQWVDLEdBQTlCO0FBRUgscUJBSEQ7QUFJQWIsNEJBQVFDLEdBQVIsQ0FBWU8sU0FBWjtBQUNBLHdCQUFJTSxZQUFZO0FBQ2JOLG1DQUFVQSxTQURHO0FBRWJPLHNDQUFlUixLQUFLUSxZQUZQO0FBR2JyQiw4QkFBT0EsSUFITTtBQUliQyxrQ0FBVUEsUUFKRztBQUticUIsb0NBQWNULEtBQUtRLFlBQUwsR0FBa0JwQjtBQUxuQixxQkFBaEI7QUFPREUsNEJBQVFpQixTQUFSO0FBQ0E7QUFDQWQsNEJBQVFDLEdBQVIsQ0FBWU8sU0FBWjtBQUNBO0FBQ0E7O0FBRUE7O0FBRUE7QUFDSCxpQkE1QkQ7QUE2QkgsYUFqQ00sQ0FBUDtBQW9DSDs7O3dDQUNlTixNLEVBQU9SLEksRUFBS0MsUSxFQUFTO0FBQUE7O0FBQ2pDLG1CQUFPLElBQUlDLE9BQUosQ0FBWSxVQUFDQyxPQUFELEVBQVVDLE1BQVYsRUFBcUI7QUFDcEMsb0JBQUlDLFlBQVksQ0FBQ0wsT0FBTyxDQUFSLElBQWFDLFFBQTdCO0FBQ0FLLHdCQUFRQyxHQUFSLENBQVksWUFBVUYsU0FBdEI7O0FBRUEsdUJBQUtSLFFBQUwsQ0FBY1csTUFBZCxDQUFxQkEsU0FBTyxHQUE1QixFQUFpQztBQUM3QkMsNEJBQU9KLFNBRHNCO0FBRTdCSyxxQ0FBaUJULFFBRlk7QUFHN0JVLDRCQUFRO0FBSHFCLGlCQUFqQyxFQUlHLFVBQUNDLEVBQUQsRUFBS0MsSUFBTCxFQUFjO0FBQ2JQLDRCQUFRQyxHQUFSLENBQVlNLElBQVo7QUFDQSx3QkFBSUMsWUFBWSxFQUFoQjtBQUNDRCx5QkFBS0UsT0FBTCxDQUFhQyxPQUFiLENBQXFCLDBCQUFrQjtBQUNuQ0Ysa0NBQVVHLElBQVYsQ0FBZUMsZUFBZUMsR0FBOUI7QUFFSCxxQkFIRDtBQUlBYiw0QkFBUUMsR0FBUixDQUFZTyxTQUFaO0FBQ0Esd0JBQUlNLFlBQVk7QUFDYk4sbUNBQVVBLFNBREc7QUFFYk8sc0NBQWVSLEtBQUtRLFlBRlA7QUFHYnJCLDhCQUFPQSxJQUhNO0FBSWJDLGtDQUFVQSxRQUpHO0FBS2JxQixvQ0FBY1QsS0FBS1EsWUFBTCxHQUFrQnBCO0FBTG5CLHFCQUFoQjtBQU9ERSw0QkFBUWlCLFNBQVI7QUFDQTtBQUNBZCw0QkFBUUMsR0FBUixDQUFZTyxTQUFaO0FBQ0E7QUFDQTs7QUFFQTs7QUFFQTtBQUNILGlCQTVCRDtBQTZCSCxhQWpDTSxDQUFQO0FBbUNIOzs7b0NBRVdTLE0sRUFBTztBQUNmLG1CQUFPLElBQUlyQixPQUFKLENBQVksVUFBQ0MsT0FBRCxFQUFVQyxNQUFWLEVBQXFCO0FBQ3RDVix1QkFBTzhCLE9BQVAsQ0FBZSxnQkFBY0QsTUFBN0IsRUFBcUNFLElBQXJDLENBQTBDLFVBQUNDLElBQUQsRUFBUTtBQUM5Q3BCLDRCQUFRQyxHQUFSLENBQVltQixJQUFaO0FBQ0F2Qiw0QkFBUXVCLElBQVI7QUFDSCxpQkFIRDtBQUlELGFBTE0sQ0FBUDtBQU1IIiwiZmlsZSI6IlJlZGlzU2VydmljZXMvQ3VzdG9tZXJTZXJ2aWNlLmpzIiwic291cmNlc0NvbnRlbnQiOlsidmFyIHJlZGlzID0gcmVxdWlyZSgncmVkaXMnKTtcclxudmFyIGxyZWRpcyA9IHJlcXVpcmUoJy4uL0RhdGFTZXJ2aWNlcy9yZWRpcy1sb2NhbCcpO1xyXG52YXIgcmVkaXNTZWFyY2ggPSByZXF1aXJlKCdyZWRpc2VhcmNoY2xpZW50Jyk7XHJcblxyXG5leHBvcnQgY2xhc3MgQ3VzdG9tZXJTZXJ2aWNlIHtcclxuICAgIGNvbnN0cnVjdG9yKCkge1xyXG4gICAgICAgIHRoaXMubXlTZWFyY2ggPSByZWRpc1NlYXJjaChyZWRpcywgJ3RldzpjdXN0b21lcnMnLCB7XHJcbiAgICAgICAgICAgIGNsaWVudE9wdGlvbnM6IHtcclxuICAgICAgICAgICAgICAgICdob3N0JzogJ3JlZGlzLTE0ODk3LmMyODIyLnVzLWVhc3QtMS1tei5lYzIuY2xvdWQucmxyY3AuY29tJyxcclxuICAgICAgICAgICAgICAgICdwb3J0JzogJzE0ODk3JyxcclxuICAgICAgICAgICAgICAgIGF1dGhfcGFzczogJ3Q1YXRSdVdRbE9XN1ZwMnVoWnBRaXZjSW90RG1UUHBsJ1xyXG4gICAgICAgICAgICB9XHJcbiAgICAgICAgfSk7XHJcbiAgICB9XHJcblxyXG4gICAgbGlzdEN1c3RvbWVycyhwYWdlLCBwYWdlU2l6ZSkge1xyXG4gICAgICAgIHJldHVybiBuZXcgUHJvbWlzZSgocmVzb2x2ZSwgcmVqZWN0KSA9PiB7XHJcbiAgICAgICAgICAgIHZhciBvZmZzZXRWYWwgPSAocGFnZSAtIDEpICogcGFnZVNpemU7XHJcbiAgICAgICAgICAgIGNvbnNvbGUubG9nKCdvZmZzZXQgJytvZmZzZXRWYWwpO1xyXG4gICAgICAgICAgICBcclxuICAgICAgICAgICAgdGhpcy5teVNlYXJjaC5zZWFyY2goXCIqXCIsIHtcclxuICAgICAgICAgICAgICAgIG9mZnNldDpvZmZzZXRWYWwsXHJcbiAgICAgICAgICAgICAgICBudW1iZXJPZlJlc3VsdHM6IHBhZ2VTaXplLFxyXG4gICAgICAgICAgICAgICAgU09SVEJZOiBcInNreWJveFwiXHJcbiAgICAgICAgICAgIH0sIChyMSwgZGF0YSkgPT4ge1xyXG4gICAgICAgICAgICAgICAgY29uc29sZS5sb2coZGF0YSk7XHJcbiAgICAgICAgICAgICAgICB2YXIgY3VzdG9tZXJzID0gW107IFxyXG4gICAgICAgICAgICAgICAgIGRhdGEucmVzdWx0cy5mb3JFYWNoKGN1c3RvbWVyUmVzdWx0ID0+IHtcclxuICAgICAgICAgICAgICAgICAgICAgY3VzdG9tZXJzLnB1c2goY3VzdG9tZXJSZXN1bHQuZG9jKTsgICAgXHJcbiAgICAgICAgICAgICAgICAgICAgXHJcbiAgICAgICAgICAgICAgICAgfSk7XHJcbiAgICAgICAgICAgICAgICAgY29uc29sZS5sb2coY3VzdG9tZXJzKTtcclxuICAgICAgICAgICAgICAgICB2YXIgcGFnZWREYXRhID0ge1xyXG4gICAgICAgICAgICAgICAgICAgIGN1c3RvbWVyczpjdXN0b21lcnMsXHJcbiAgICAgICAgICAgICAgICAgICAgdG90YWxSZXN1bHRzIDogZGF0YS50b3RhbFJlc3VsdHMsXHJcbiAgICAgICAgICAgICAgICAgICAgcGFnZSA6IHBhZ2UsXHJcbiAgICAgICAgICAgICAgICAgICAgcGFnZVNpemU6IHBhZ2VTaXplLCBcclxuICAgICAgICAgICAgICAgICAgICBUb3RhbFBhZ2VzIDogKGRhdGEudG90YWxSZXN1bHRzL3BhZ2VTaXplKVxyXG4gICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICAgICAgcmVzb2x2ZShwYWdlZERhdGEpO1xyXG4gICAgICAgICAgICAgICAgLy9Qcm9taXNlLmFsbCgpXHJcbiAgICAgICAgICAgICAgICBjb25zb2xlLmxvZyhjdXN0b21lcnMpO1xyXG4gICAgICAgICAgICAgICAgLy8gUHJvbWlzZS5hbGwoY3VzdG9tZXJzLm1hcChscmVkaXMuaGdldGFsbCkpLnRoZW4oZnVuY3Rpb24gKG93bmVyc1Jlc3VsdCkge1xyXG4gICAgICAgICAgICAgICAgLy8gICAgIGNvbnNvbGUubG9nKG93bmVyc1Jlc3VsdCk7XHJcbiAgICAgICAgICAgICAgICAgICBcclxuICAgICAgICAgICAgICAgIC8vIH0pO1xyXG4gICAgICAgICAgICAgICBcclxuICAgICAgICAgICAgICAgIC8vY29uc29sZS5sb2cocjIpOyBcclxuICAgICAgICAgICAgfSk7XHJcbiAgICAgICAgfSlcclxuXHJcblxyXG4gICAgfVxyXG4gICAgc2VhcmNoQ3VzdG9tZXJzKHNlYXJjaCxwYWdlLHBhZ2VTaXplKXtcclxuICAgICAgICByZXR1cm4gbmV3IFByb21pc2UoKHJlc29sdmUsIHJlamVjdCkgPT4ge1xyXG4gICAgICAgICAgICB2YXIgb2Zmc2V0VmFsID0gKHBhZ2UgLSAxKSAqIHBhZ2VTaXplO1xyXG4gICAgICAgICAgICBjb25zb2xlLmxvZygnb2Zmc2V0ICcrb2Zmc2V0VmFsKTtcclxuICAgICAgICAgICAgXHJcbiAgICAgICAgICAgIHRoaXMubXlTZWFyY2guc2VhcmNoKHNlYXJjaCsnKicsIHtcclxuICAgICAgICAgICAgICAgIG9mZnNldDpvZmZzZXRWYWwsXHJcbiAgICAgICAgICAgICAgICBudW1iZXJPZlJlc3VsdHM6IHBhZ2VTaXplLFxyXG4gICAgICAgICAgICAgICAgU09SVEJZOiBcInNreWJveFwiXHJcbiAgICAgICAgICAgIH0sIChyMSwgZGF0YSkgPT4ge1xyXG4gICAgICAgICAgICAgICAgY29uc29sZS5sb2coZGF0YSk7XHJcbiAgICAgICAgICAgICAgICB2YXIgY3VzdG9tZXJzID0gW107IFxyXG4gICAgICAgICAgICAgICAgIGRhdGEucmVzdWx0cy5mb3JFYWNoKGN1c3RvbWVyUmVzdWx0ID0+IHtcclxuICAgICAgICAgICAgICAgICAgICAgY3VzdG9tZXJzLnB1c2goY3VzdG9tZXJSZXN1bHQuZG9jKTsgICAgXHJcbiAgICAgICAgICAgICAgICAgICAgXHJcbiAgICAgICAgICAgICAgICAgfSk7XHJcbiAgICAgICAgICAgICAgICAgY29uc29sZS5sb2coY3VzdG9tZXJzKTtcclxuICAgICAgICAgICAgICAgICB2YXIgcGFnZWREYXRhID0ge1xyXG4gICAgICAgICAgICAgICAgICAgIGN1c3RvbWVyczpjdXN0b21lcnMsXHJcbiAgICAgICAgICAgICAgICAgICAgdG90YWxSZXN1bHRzIDogZGF0YS50b3RhbFJlc3VsdHMsXHJcbiAgICAgICAgICAgICAgICAgICAgcGFnZSA6IHBhZ2UsXHJcbiAgICAgICAgICAgICAgICAgICAgcGFnZVNpemU6IHBhZ2VTaXplLCBcclxuICAgICAgICAgICAgICAgICAgICBUb3RhbFBhZ2VzIDogKGRhdGEudG90YWxSZXN1bHRzL3BhZ2VTaXplKVxyXG4gICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICAgICAgcmVzb2x2ZShwYWdlZERhdGEpO1xyXG4gICAgICAgICAgICAgICAgLy9Qcm9taXNlLmFsbCgpXHJcbiAgICAgICAgICAgICAgICBjb25zb2xlLmxvZyhjdXN0b21lcnMpO1xyXG4gICAgICAgICAgICAgICAgLy8gUHJvbWlzZS5hbGwoY3VzdG9tZXJzLm1hcChscmVkaXMuaGdldGFsbCkpLnRoZW4oZnVuY3Rpb24gKG93bmVyc1Jlc3VsdCkge1xyXG4gICAgICAgICAgICAgICAgLy8gICAgIGNvbnNvbGUubG9nKG93bmVyc1Jlc3VsdCk7XHJcbiAgICAgICAgICAgICAgICAgICBcclxuICAgICAgICAgICAgICAgIC8vIH0pO1xyXG4gICAgICAgICAgICAgICBcclxuICAgICAgICAgICAgICAgIC8vY29uc29sZS5sb2cocjIpOyBcclxuICAgICAgICAgICAgfSk7XHJcbiAgICAgICAgfSlcclxuXHJcbiAgICB9XHJcblxyXG4gICAgZ2V0Q3VzdG9tZXIoc2t5Ym94KXtcclxuICAgICAgICByZXR1cm4gbmV3IFByb21pc2UoKHJlc29sdmUsIHJlamVjdCkgPT4ge1xyXG4gICAgICAgICAgbHJlZGlzLmhnZXRhbGwoXCJ0ZXc6b3duZXJzOlwiK3NreWJveCkudGhlbigodXNlcik9PntcclxuICAgICAgICAgICAgICBjb25zb2xlLmxvZyh1c2VyKTsgXHJcbiAgICAgICAgICAgICAgcmVzb2x2ZSh1c2VyKTsgXHJcbiAgICAgICAgICB9KVxyXG4gICAgICAgIH0pXHJcbiAgICB9XHJcbn0iXX0=
