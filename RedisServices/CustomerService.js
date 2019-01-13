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
            clientOptions: lredis.searchClientDetails
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
                    sortBy: "svalue"
                }, function (r1, data) {
                    if (r1) console.log(r1);
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
                    console.log(customers);
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
                    sortBy: "svalue",
                    dir: "ASC"
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
//# sourceMappingURL=data:application/json;charset=utf8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIlJlZGlzU2VydmljZXMvQ3VzdG9tZXJTZXJ2aWNlLmVzNiJdLCJuYW1lcyI6WyJyZWRpcyIsInJlcXVpcmUiLCJscmVkaXMiLCJyZWRpc1NlYXJjaCIsIkN1c3RvbWVyU2VydmljZSIsIm15U2VhcmNoIiwiY2xpZW50T3B0aW9ucyIsInNlYXJjaENsaWVudERldGFpbHMiLCJwYWdlIiwicGFnZVNpemUiLCJQcm9taXNlIiwicmVzb2x2ZSIsInJlamVjdCIsIm9mZnNldFZhbCIsImNvbnNvbGUiLCJsb2ciLCJzZWFyY2giLCJvZmZzZXQiLCJudW1iZXJPZlJlc3VsdHMiLCJzb3J0QnkiLCJyMSIsImRhdGEiLCJjdXN0b21lcnMiLCJyZXN1bHRzIiwiZm9yRWFjaCIsInB1c2giLCJjdXN0b21lclJlc3VsdCIsImRvYyIsInBhZ2VkRGF0YSIsInRvdGFsUmVzdWx0cyIsIlRvdGFsUGFnZXMiLCJyZXBsYWNlIiwiZGlyIiwic2t5Ym94IiwiaGdldGFsbCIsInRoZW4iLCJ1c2VyIiwiY3VzdG9tZXIiLCJobXNldCIsInJlc3VsdCJdLCJtYXBwaW5ncyI6Ijs7Ozs7Ozs7OztBQUFBLElBQUlBLFFBQVFDLFFBQVEsT0FBUixDQUFaO0FBQ0EsSUFBSUMsU0FBU0QsUUFBUSw2QkFBUixDQUFiO0FBQ0EsSUFBSUUsY0FBY0YsUUFBUSxrQkFBUixDQUFsQjs7SUFFYUcsZSxXQUFBQSxlO0FBQ1QsK0JBQWM7QUFBQTs7QUFDVixhQUFLQyxRQUFMLEdBQWdCRixZQUFZSCxLQUFaLEVBQW1CLGVBQW5CLEVBQW9DO0FBQ2hETSwyQkFBZUosT0FBT0s7QUFEMEIsU0FBcEMsQ0FBaEI7QUFHSDs7OztzQ0FFYUMsSSxFQUFNQyxRLEVBQVU7QUFBQTs7QUFDMUIsbUJBQU8sSUFBSUMsT0FBSixDQUFZLFVBQUNDLE9BQUQsRUFBVUMsTUFBVixFQUFxQjtBQUNwQyxvQkFBSUMsWUFBWSxDQUFDTCxPQUFPLENBQVIsSUFBYUMsUUFBN0I7QUFDQUssd0JBQVFDLEdBQVIsQ0FBWSxZQUFV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LENBQVA7QUFLSCIsImZpbGUiOiJSZWRpc1NlcnZpY2VzL0N1c3RvbWVyU2VydmljZS5qcyIsInNvdXJjZXNDb250ZW50IjpbInZhciByZWRpcyA9IHJlcXVpcmUoJ3JlZGlzJyk7XHJcbnZhciBscmVkaXMgPSByZXF1aXJlKCcuLi9EYXRhU2VydmljZXMvcmVkaXMtbG9jYWwnKTtcclxudmFyIHJlZGlzU2VhcmNoID0gcmVxdWlyZSgncmVkaXNlYXJjaGNsaWVudCcpO1xyXG5cclxuZXhwb3J0IGNsYXNzIEN1c3RvbWVyU2VydmljZSB7XHJcbiAgICBjb25zdHJ1Y3RvcigpIHtcclxuICAgICAgICB0aGlzLm15U2VhcmNoID0gcmVkaXNTZWFyY2gocmVkaXMsICd0ZXc6Y3VzdG9tZXJzJywge1xyXG4gICAgICAgICAgICBjbGllbnRPcHRpb25zOiBscmVkaXMuc2VhcmNoQ2xpZW50RGV0YWlsc1xyXG4gICAgICAgIH0pO1xyXG4gICAgfVxyXG5cclxuICAgIGxpc3RDdXN0b21lcnMocGFnZSwgcGFnZVNpemUpIHtcclxuICAgICAgICByZXR1cm4gbmV3IFByb21pc2UoKHJlc29sdmUsIHJlamVjdCkgPT4ge1xyXG4gICAgICAgICAgICB2YXIgb2Zmc2V0VmFsID0gKHBhZ2UgLSAxKSAqIHBhZ2VTaXplO1xyXG4gICAgICAgICAgICBjb25zb2xlLmxvZygnb2Zmc2V0ICcrb2Zmc2V0VmFsKTtcclxuICAgICAgICAgICAgXHJcbiAgICAgICAgICAgIHRoaXMubXlTZWFyY2guc2VhcmNoKFwiKlwiLCB7XHJcbiAgICAgICAgICAgICAgICBvZmZzZXQ6b2Zmc2V0VmFsLFxyXG4gICAgICAgICAgICAgICAgbnVtYmVyT2ZSZXN1bHRzOiBwYWdlU2l6ZSxcclxuICAgICAgICAgICAgICAgIHNvcnRCeTogXCJzdmFsdWVcIlxyXG4gICAgICAgICAgICB9LCAocjEsIGRhdGEpID0+IHtcclxuICAgICAgICAgICAgICAgIGlmIChyMSlcclxuICAgICAgICAgICAgICAgICAgICBjb25zb2xlLmxvZyhyMSk7XHJcbiAgICAgICAgICAgICAgICB2YXIgY3VzdG9tZXJzID0gW107IFxyXG4gICAgICAgICAgICAgICAgIGRhdGEucmVzdWx0cy5mb3JFYWNoKGN1c3RvbWVyUmVzdWx0ID0+IHtcclxuICAgICAgICAgICAgICAgICAgICAgY3VzdG9tZXJzLnB1c2goY3VzdG9tZXJSZXN1bHQuZG9jKTsgICAgXHJcbiAgICAgICAgICAgICAgICAgICAgXHJcbiAgICAgICAgICAgICAgICAgfSk7XHJcbiAgICAgICAgICAgICAgICAgY29uc29sZS5sb2coY3VzdG9tZXJzKTtcclxuICAgICAgICAgICAgICAgICB2YXIgcGFnZWREYXRhID0ge1xyXG4gICAgICAgICAgICAgICAgICAgIGN1c3RvbWVyczpjdXN0b21lcnMsXHJcbiAgICAgICAgICAgICAgICAgICAgdG90YWxSZXN1bHRzIDogZGF0YS50b3RhbFJlc3VsdHMsXHJcbiAgICAgICAgICAgICAgICAgICAgcGFnZSA6IHBhZ2UsXHJcbiAgICAgICAgICAgICAgICAgICAgcGFnZVNpemU6IHBhZ2VTaXplLCBcclxuICAgICAgICAgICAgICAgICAgICBUb3RhbFBhZ2VzIDogKGRhdGEudG90YWxSZXN1bHRzL3BhZ2VTaXplKVxyXG4gICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICAgICAgcmVzb2x2ZShwYWdlZERhdGEpO1xyXG4gICAgICAgICAgICAgICAgY29uc29sZS5sb2coY3VzdG9tZXJzKTtcclxuICAgICAgICAgICAgICAgIFxyXG4gICAgICAgICAgICB9KTtcclxuICAgICAgICB9KVxyXG5cclxuXHJcbiAgICB9XHJcbiAgICBzZWFyY2hDdXN0b21lcnMoc2VhcmNoLHBhZ2UscGFnZVNpemUpe1xyXG4gICAgICAgIHJldHVybiBuZXcgUHJvbWlzZSgocmVzb2x2ZSwgcmVqZWN0KSA9PiB7XHJcbiAgICAgICAgICAgIHZhciBvZmZzZXRWYWwgPSAocGFnZSAtIDEpICogcGFnZVNpemU7XHJcbiAgICAgICAgICAgIGNvbnNvbGUubG9nKCdvZmZzZXQgJytvZmZzZXRWYWwpO1xyXG4gICAgICAgICAgICBcclxuICAgICAgICAgICAgdGhpcy5teVNlYXJjaC5zZWFyY2goc2VhcmNoLnJlcGxhY2UoXCJAXCIsXCIgXCIpKycqJywge1xyXG4gICAgICAgICAgICAgICAgb2Zmc2V0Om9mZnNldFZhbCxcclxuICAgICAgICAgICAgICAgIG51bWJlck9mUmVzdWx0czogcGFnZVNpemUsXHJcbiAgICAgICAgICAgICAgICBzb3J0Qnk6IFwic3ZhbHVlXCIsXHJcbiAgICAgICAgICAgICAgICBkaXIgOiBcIkFTQ1wiXHJcbiAgICAgICAgICAgIH0sIChyMSwgZGF0YSkgPT4ge1xyXG4gICAgICAgICAgICAgICAgY29uc29sZS5sb2coZGF0YSk7XHJcbiAgICAgICAgICAgICAgICB2YXIgY3VzdG9tZXJzID0gW107IFxyXG4gICAgICAgICAgICAgICAgIGRhdGEucmVzdWx0cy5mb3JFYWNoKGN1c3RvbWVyUmVzdWx0ID0+IHtcclxuICAgICAgICAgICAgICAgICAgICAgY3VzdG9tZXJzLnB1c2goY3VzdG9tZXJSZXN1bHQuZG9jKTsgICAgXHJcbiAgICAgICAgICAgICAgICAgICAgXHJcbiAgICAgICAgICAgICAgICAgfSk7XHJcbiAgICAgICAgICAgICAgICAgY29uc29sZS5sb2coY3VzdG9tZXJzKTtcclxuICAgICAgICAgICAgICAgICB2YXIgcGFnZWREYXRhID0ge1xyXG4gICAgICAgICAgICAgICAgICAgIGN1c3RvbWVyczpjdXN0b21lcnMsXHJcbiAgICAgICAgICAgICAgICAgICAgdG90YWxSZXN1bHRzIDogZGF0YS50b3RhbFJlc3VsdHMsXHJcbiAgICAgICAgICAgICAgICAgICAgcGFnZSA6IHBhZ2UsXHJcbiAgICAgICAgICAgICAgICAgICAgcGFnZVNpemU6IHBhZ2VTaXplLCBcclxuICAgICAgICAgICAgICAgICAgICBUb3RhbFBhZ2VzIDogKGRhdGEudG90YWxSZXN1bHRzL3BhZ2VTaXplKVxyXG4gICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICAgICAgcmVzb2x2ZShwYWdlZERhdGEpO1xyXG4gICAgICAgICAgICAgICAgLy9Qcm9taXNlLmFsbCgpXHJcbiAgICAgICAgICAgICAgICBjb25zb2xlLmxvZyhjdXN0b21lcnMpO1xyXG4gICAgICAgICAgICAgICAgLy8gUHJvbWlzZS5hbGwoY3VzdG9tZXJzLm1hcChscmVkaXMuaGdldGFsbCkpLnRoZW4oZnVuY3Rpb24gKG93bmVyc1Jlc3VsdCkge1xyXG4gICAgICAgICAgICAgICAgLy8gICAgIGNvbnNvbGUubG9nKG93bmVyc1Jlc3VsdCk7XHJcbiAgICAgICAgICAgICAgICAgICBcclxuICAgICAgICAgICAgICAgIC8vIH0pO1xyXG4gICAgICAgICAgICAgICBcclxuICAgICAgICAgICAgICAgIC8vY29uc29sZS5sb2cocjIpOyBcclxuICAgICAgICAgICAgfSk7XHJcbiAgICAgICAgfSlcclxuXHJcbiAgICB9XHJcblxyXG4gICAgZ2V0Q3VzdG9tZXIoc2t5Ym94KXtcclxuICAgICAgICByZXR1cm4gbmV3IFByb21pc2UoKHJlc29sdmUsIHJlamVjdCkgPT4ge1xyXG4gICAgICAgICAgbHJlZGlzLmhnZXRhbGwoXCJ0ZXc6b3duZXJzOlwiK3NreWJveCkudGhlbigodXNlcik9PntcclxuICAgICAgICAgICAgICBjb25zb2xlLmxvZyh1c2VyKTsgXHJcbiAgICAgICAgICAgICAgcmVzb2x2ZSh1c2VyKTsgXHJcbiAgICAgICAgICB9KVxyXG4gICAgICAgIH0pXHJcbiAgICB9IFxyXG4gICAgc2F2ZUN1c3RvbWVyKGN1c3RvbWVyKXsgXHJcbiAgICAgICAgcmV0dXJuIG5ldyBQcm9taXNlKChyZXNvbHZlLHJlamVjdCk9PntcclxuICAgICAgICAgICAgbHJlZGlzLmhtc2V0KFwidGV3Om93bmVyczpcIitjdXN0b21lci5za3lib3gsY3VzdG9tZXIpLnRoZW4oKHJlc3VsdCk9PntcclxuICAgICAgICAgICAgICAgIHJlc29sdmUocmVzdWx0KTtcclxuICAgICAgICAgICAgfSk7IFxyXG4gICAgICAgIH0pO1xyXG4gICAgfVxyXG59Il19
