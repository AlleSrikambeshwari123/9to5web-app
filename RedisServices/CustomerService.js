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

                _this2.mySearch.search(search.replace("@", " ") + '*', {
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
    }, {
        key: 'saveCustomer',
        value: function saveCustomer(customer) {
            return new Promise(function (resolve, reject) {
                lredis.hmset("tew:owners:" + customer.skybox, customer).then(function (result) {
                    resolve(result);
                });
            });
        }
    }]);

    return CustomerService;
}();
//# sourceMappingURL=data:application/json;charset=utf8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIlJlZGlzU2VydmljZXMvQ3VzdG9tZXJTZXJ2aWNlLmVzNiJdLCJuYW1lcyI6WyJyZWRpcyIsInJlcXVpcmUiLCJscmVkaXMiLCJyZWRpc1NlYXJjaCIsIkN1c3RvbWVyU2VydmljZSIsIm15U2VhcmNoIiwiY2xpZW50T3B0aW9ucyIsImF1dGhfcGFzcyIsInBhZ2UiLCJwYWdlU2l6ZSIsIlByb21pc2UiLCJyZXNvbHZlIiwicmVqZWN0Iiwib2Zmc2V0VmFsIiwiY29uc29sZSIsImxvZyIsInNlYXJjaCIsIm9mZnNldCIsIm51bWJlck9mUmVzdWx0cyIsIlNPUlRCWSIsInIxIiwiZGF0YSIsImN1c3RvbWVycyIsInJlc3VsdHMiLCJmb3JFYWNoIiwicHVzaCIsImN1c3RvbWVyUmVzdWx0IiwiZG9jIiwicGFnZWREYXRhIiwidG90YWxSZXN1bHRzIiwiVG90YWxQYWdlcyIsInJlcGxhY2UiLCJza3lib3giLCJoZ2V0YWxsIiwidGhlbiIsInVzZXIiLCJjdXN0b21lciIsImhtc2V0IiwicmVzdWx0Il0sIm1hcHBpbmdzIjoiOzs7Ozs7Ozs7O0FBQUEsSUFBSUEsUUFBUUMsUUFBUSxPQUFSLENBQVo7QUFDQSxJQUFJQyxTQUFTRCxRQUFRLDZCQUFSLENBQWI7QUFDQSxJQUFJRSxjQUFjRixRQUFRLGtCQUFSLENBQWxCOztJQUVhRyxlLFdBQUFBLGU7QUFDVCwrQkFBYztBQUFBOztBQUNWLGFBQUtDLFFBQUwsR0FBZ0JGLFlBQVlILEtBQVosRUFBbUIsZUFBbkIsRUFBb0M7QUFDaERNLDJCQUFlO0FBQ1gsd0JBQVEsb0RBREc7QUFFWCx3QkFBUSxPQUZHO0FBR1hDLDJCQUFXO0FBSEE7QUFEaUMsU0FBcEMsQ0FBaEI7QUFPSDs7OztzQ0FFYUMsSSxFQUFNQyxRLEVBQVU7QUFBQTs7QUFDMUIsbUJBQU8sSUFBSUMsT0FBSixDQUFZLFVBQUNDLE9BQUQsRUFBVUMsTUFBVixFQUFxQjtBQUNwQyxvQkFBSUMsWUFBWSxDQUFDTCxPQUFPLENBQVIsSUFBYUMsUUFBN0I7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QUNILGlCQUZEO0FBR0gsYUFKTSxDQUFQO0FBS0giLCJmaWxlIjoiUmVkaXNTZXJ2aWNlcy9DdXN0b21lclNlcnZpY2UuanMiLCJzb3VyY2VzQ29udGVudCI6WyJ2YXIgcmVkaXMgPSByZXF1aXJlKCdyZWRpcycpO1xyXG52YXIgbHJlZGlzID0gcmVxdWlyZSgnLi4vRGF0YVNlcnZpY2VzL3JlZGlzLWxvY2FsJyk7XHJcbnZhciByZWRpc1NlYXJjaCA9IHJlcXVpcmUoJ3JlZGlzZWFyY2hjbGllbnQnKTtcclxuXHJcbmV4cG9ydCBjbGFzcyBDdXN0b21lclNlcnZpY2Uge1xyXG4gICAgY29uc3RydWN0b3IoKSB7XHJcbiAgICAgICAgdGhpcy5teVNlYXJjaCA9IHJlZGlzU2VhcmNoKHJlZGlzLCAndGV3OmN1c3RvbWVycycsIHtcclxuICAgICAgICAgICAgY2xpZW50T3B0aW9uczoge1xyXG4gICAgICAgICAgICAgICAgJ2hvc3QnOiAncmVkaXMtMTQ4OTcuYzI4MjIudXMtZWFzdC0xLW16LmVjMi5jbG91ZC5ybHJjcC5jb20nLFxyXG4gICAgICAgICAgICAgICAgJ3BvcnQnOiAnMTQ4OTcnLFxyXG4gICAgICAgICAgICAgICAgYXV0aF9wYXNzOiAndDVhdFJ1V1FsT1c3VnAydWhacFFpdmNJb3REbVRQcGwnXHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICB9KTtcclxuICAgIH1cclxuXHJcbiAgICBsaXN0Q3VzdG9tZXJzKHBhZ2UsIHBhZ2VTaXplKSB7XHJcbiAgICAgICAgcmV0dXJuIG5ldyBQcm9taXNlKChyZXNvbHZlLCByZWplY3QpID0+IHtcclxuICAgICAgICAgICAgdmFyIG9mZnNldFZhbCA9IChwYWdlIC0gMSkgKiBwYWdlU2l6ZTtcclxuICAgICAgICAgICAgY29uc29sZS5sb2coJ29mZnNldCAnK29mZnNldFZhbCk7XHJcbiAgICAgICAgICAgIFxyXG4gICAgICAgICAgICB0aGlzLm15U2VhcmNoLnNlYXJjaChcIipcIiwge1xyXG4gICAgICAgICAgICAgICAgb2Zmc2V0Om9mZnNldFZhbCxcclxuICAgICAgICAgICAgICAgIG51bWJlck9mUmVzdWx0czogcGFnZVNpemUsXHJcbiAgICAgICAgICAgICAgICBTT1JUQlk6IFwic2t5Ym94XCJcclxuICAgICAgICAgICAgfSwgKHIxLCBkYXRhKSA9PiB7XHJcbiAgICAgICAgICAgICAgICBjb25zb2xlLmxvZyhkYXRhKTtcclxuICAgICAgICAgICAgICAgIHZhciBjdXN0b21lcnMgPSBbXTsgXHJcbiAgICAgICAgICAgICAgICAgZGF0YS5yZXN1bHRzLmZvckVhY2goY3VzdG9tZXJSZXN1bHQgPT4ge1xyXG4gICAgICAgICAgICAgICAgICAgICBjdXN0b21lcnMucHVzaChjdXN0b21lclJlc3VsdC5kb2MpOyAgICBcclxuICAgICAgICAgICAgICAgICAgICBcclxuICAgICAgICAgICAgICAgICB9KTtcclxuICAgICAgICAgICAgICAgICBjb25zb2xlLmxvZyhjdXN0b21lcnMpO1xyXG4gICAgICAgICAgICAgICAgIHZhciBwYWdlZERhdGEgPSB7XHJcbiAgICAgICAgICAgICAgICAgICAgY3VzdG9tZXJzOmN1c3RvbWVycyxcclxuICAgICAgICAgICAgICAgICAgICB0b3RhbFJlc3VsdHMgOiBkYXRhLnRvdGFsUmVzdWx0cyxcclxuICAgICAgICAgICAgICAgICAgICBwYWdlIDogcGFnZSxcclxuICAgICAgICAgICAgICAgICAgICBwYWdlU2l6ZTogcGFnZVNpemUsIFxyXG4gICAgICAgICAgICAgICAgICAgIFRvdGFsUGFnZXMgOiAoZGF0YS50b3RhbFJlc3VsdHMvcGFnZVNpemUpXHJcbiAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgICAgICByZXNvbHZlKHBhZ2VkRGF0YSk7XHJcbiAgICAgICAgICAgICAgICAvL1Byb21pc2UuYWxsKClcclxuICAgICAgICAgICAgICAgIGNvbnNvbGUubG9nKGN1c3RvbWVycyk7XHJcbiAgICAgICAgICAgICAgICAvLyBQcm9taXNlLmFsbChjdXN0b21lcnMubWFwKGxyZWRpcy5oZ2V0YWxsKSkudGhlbihmdW5jdGlvbiAob3duZXJzUmVzdWx0KSB7XHJcbiAgICAgICAgICAgICAgICAvLyAgICAgY29uc29sZS5sb2cob3duZXJzUmVzdWx0KTtcclxuICAgICAgICAgICAgICAgICAgIFxyXG4gICAgICAgICAgICAgICAgLy8gfSk7XHJcbiAgICAgICAgICAgICAgIFxyXG4gICAgICAgICAgICAgICAgLy9jb25zb2xlLmxvZyhyMik7IFxyXG4gICAgICAgICAgICB9KTtcclxuICAgICAgICB9KVxyXG5cclxuXHJcbiAgICB9XHJcbiAgICBzZWFyY2hDdXN0b21lcnMoc2VhcmNoLHBhZ2UscGFnZVNpemUpe1xyXG4gICAgICAgIHJldHVybiBuZXcgUHJvbWlzZSgocmVzb2x2ZSwgcmVqZWN0KSA9PiB7XHJcbiAgICAgICAgICAgIHZhciBvZmZzZXRWYWwgPSAocGFnZSAtIDEpICogcGFnZVNpemU7XHJcbiAgICAgICAgICAgIGNvbnNvbGUubG9nKCdvZmZzZXQgJytvZmZzZXRWYWwpO1xyXG4gICAgICAgICAgICBcclxuICAgICAgICAgICAgdGhpcy5teVNlYXJjaC5zZWFyY2goc2VhcmNoLnJlcGxhY2UoXCJAXCIsXCIgXCIpKycqJywge1xyXG4gICAgICAgICAgICAgICAgb2Zmc2V0Om9mZnNldFZhbCxcclxuICAgICAgICAgICAgICAgIG51bWJlck9mUmVzdWx0czogcGFnZVNpemUsXHJcbiAgICAgICAgICAgICAgICBTT1JUQlk6IFwic2t5Ym94XCJcclxuICAgICAgICAgICAgfSwgKHIxLCBkYXRhKSA9PiB7XHJcbiAgICAgICAgICAgICAgICBjb25zb2xlLmxvZyhkYXRhKTtcclxuICAgICAgICAgICAgICAgIHZhciBjdXN0b21lcnMgPSBbXTsgXHJcbiAgICAgICAgICAgICAgICAgZGF0YS5yZXN1bHRzLmZvckVhY2goY3VzdG9tZXJSZXN1bHQgPT4ge1xyXG4gICAgICAgICAgICAgICAgICAgICBjdXN0b21lcnMucHVzaChjdXN0b21lclJlc3VsdC5kb2MpOyAgICBcclxuICAgICAgICAgICAgICAgICAgICBcclxuICAgICAgICAgICAgICAgICB9KTtcclxuICAgICAgICAgICAgICAgICBjb25zb2xlLmxvZyhjdXN0b21lcnMpO1xyXG4gICAgICAgICAgICAgICAgIHZhciBwYWdlZERhdGEgPSB7XHJcbiAgICAgICAgICAgICAgICAgICAgY3VzdG9tZXJzOmN1c3RvbWVycyxcclxuICAgICAgICAgICAgICAgICAgICB0b3RhbFJlc3VsdHMgOiBkYXRhLnRvdGFsUmVzdWx0cyxcclxuICAgICAgICAgICAgICAgICAgICBwYWdlIDogcGFnZSxcclxuICAgICAgICAgICAgICAgICAgICBwYWdlU2l6ZTogcGFnZVNpemUsIFxyXG4gICAgICAgICAgICAgICAgICAgIFRvdGFsUGFnZXMgOiAoZGF0YS50b3RhbFJlc3VsdHMvcGFnZVNpemUpXHJcbiAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgICAgICByZXNvbHZlKHBhZ2VkRGF0YSk7XHJcbiAgICAgICAgICAgICAgICAvL1Byb21pc2UuYWxsKClcclxuICAgICAgICAgICAgICAgIGNvbnNvbGUubG9nKGN1c3RvbWVycyk7XHJcbiAgICAgICAgICAgICAgICAvLyBQcm9taXNlLmFsbChjdXN0b21lcnMubWFwKGxyZWRpcy5oZ2V0YWxsKSkudGhlbihmdW5jdGlvbiAob3duZXJzUmVzdWx0KSB7XHJcbiAgICAgICAgICAgICAgICAvLyAgICAgY29uc29sZS5sb2cob3duZXJzUmVzdWx0KTtcclxuICAgICAgICAgICAgICAgICAgIFxyXG4gICAgICAgICAgICAgICAgLy8gfSk7XHJcbiAgICAgICAgICAgICAgIFxyXG4gICAgICAgICAgICAgICAgLy9jb25zb2xlLmxvZyhyMik7IFxyXG4gICAgICAgICAgICB9KTtcclxuICAgICAgICB9KVxyXG5cclxuICAgIH1cclxuXHJcbiAgICBnZXRDdXN0b21lcihza3lib3gpe1xyXG4gICAgICAgIHJldHVybiBuZXcgUHJvbWlzZSgocmVzb2x2ZSwgcmVqZWN0KSA9PiB7XHJcbiAgICAgICAgICBscmVkaXMuaGdldGFsbChcInRldzpvd25lcnM6XCIrc2t5Ym94KS50aGVuKCh1c2VyKT0+e1xyXG4gICAgICAgICAgICAgIGNvbnNvbGUubG9nKHVzZXIpOyBcclxuICAgICAgICAgICAgICByZXNvbHZlKHVzZXIpOyBcclxuICAgICAgICAgIH0pXHJcbiAgICAgICAgfSlcclxuICAgIH0gXHJcbiAgICBzYXZlQ3VzdG9tZXIoY3VzdG9tZXIpeyBcclxuICAgICAgICByZXR1cm4gbmV3IFByb21pc2UoKHJlc29sdmUscmVqZWN0KT0+e1xyXG4gICAgICAgICAgICBscmVkaXMuaG1zZXQoXCJ0ZXc6b3duZXJzOlwiK2N1c3RvbWVyLnNreWJveCxjdXN0b21lcikudGhlbigocmVzdWx0KT0+e1xyXG4gICAgICAgICAgICAgICAgcmVzb2x2ZShyZXN1bHQpO1xyXG4gICAgICAgICAgICB9KTsgXHJcbiAgICAgICAgfSk7XHJcbiAgICB9XHJcbn0iXX0=
