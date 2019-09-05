'use strict';

Object.defineProperty(exports, "__esModule", {
    value: true
});

var _createClass = function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; }();

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

var redis = require('redis');
var lredis = require('./redis-local');
var redisSearch = require('redisearchclient');
var PREFIX = "pmb:";
var INDEX = "index:customers";

var CustomerService = exports.CustomerService = function () {
    function CustomerService() {
        _classCallCheck(this, CustomerService);

        this.mySearch = redisSearch(redis, INDEX, {
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
                lredis.hgetall("95:owners:" + skybox).then(function (user) {
                    console.log(user);
                    resolve(user);
                });
            });
        }
    }, {
        key: 'saveCustomer',
        value: function saveCustomer(customer) {
            return new Promise(function (resolve, reject) {
                lredis.hmset("95:owners:" + customer.skybox, customer).then(function (result) {
                    resolve(result);
                });
            });
        }
    }]);

    return CustomerService;
}();
//# sourceMappingURL=data:application/json;charset=utf8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIlJlZGlzU2VydmljZXMvQ3VzdG9tZXJTZXJ2aWNlLmVzNiJdLCJuYW1lcyI6WyJyZWRpcyIsInJlcXVpcmUiLCJscmVkaXMiLCJyZWRpc1NlYXJjaCIsIlBSRUZJWCIsIklOREVYIiwiQ3VzdG9tZXJTZXJ2aWNlIiwibXlTZWFyY2giLCJjbGllbnRPcHRpb25zIiwic2VhcmNoQ2xpZW50RGV0YWlscyIsInBhZ2UiLCJwYWdlU2l6ZSIsIlByb21pc2UiLCJyZXNvbHZlIiwicmVqZWN0Iiwib2Zmc2V0VmFsIiwiY29uc29sZSIsImxvZyIsInNlYXJjaCIsIm9mZnNldCIsIm51bWJlck9mUmVzdWx0cyIsInNvcnRCeSIsInIxIiwiZGF0YSIsImN1c3RvbWVycyIsInJlc3VsdHMiLCJmb3JFYWNoIiwicHVzaCIsImN1c3RvbWVyUmVzdWx0IiwiZG9jIiwicGFnZWREYXRhIiwidG90YWxSZXN1bHRzIiwiVG90YWxQYWdlcyIsInJlcGxhY2UiLCJkaXIiLCJza3lib3giLCJoZ2V0YWxsIiwidGhlbiIsInVzZXIiLCJjdXN0b21lciIsImhtc2V0IiwicmVzdWx0Il0sIm1hcHBpbmdzIjoiOzs7Ozs7Ozs7O0FBQUEsSUFBSUEsUUFBUUMsUUFBUSxPQUFSLENBQVo7QUFDQSxJQUFJQyxTQUFTRCxRQUFRLGVBQVIsQ0FBYjtBQUNBLElBQUlFLGNBQWNGLFFBQVEsa0JBQVIsQ0FBbEI7QUFDQSxJQUFNRyxTQUFTLE1BQWY7QUFDQSxJQUFNQyxRQUFRLGlCQUFkOztJQUNhQyxlLFdBQUFBLGU7QUFDVCwrQkFBYztBQUFBOztBQUNWLGFBQUtDLFFBQUwsR0FBZ0JKLFlBQVlILEtBQVosRUFBbUJLLEtBQW5CLEVBQTBCO0FBQ3RDRywyQkFBZU4sT0FBT087QUFEZ0IsU0FBMUIsQ0FBaEI7QUFHSDs7OztzQ0FFYUMsSSxFQUFNQyxRLEVBQVU7QUFBQTs7QUFDMUIsbUJBQU8sSUFBSUMsT0FBSixDQUFZLFVBQUNDLE9BQUQsRUFBVUMsTUFBVixFQUFxQjtBQUNwQyxvQkFBSUMs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LFVBQUNJLE1BQUQsRUFBVTtBQUMvRDVCLDRCQUFRNEIsTUFBUjtBQUNILGlCQUZEO0FBR0gsYUFKTSxDQUFQO0FBS0giLCJmaWxlIjoiUmVkaXNTZXJ2aWNlcy9DdXN0b21lclNlcnZpY2UuanMiLCJzb3VyY2VzQ29udGVudCI6WyJ2YXIgcmVkaXMgPSByZXF1aXJlKCdyZWRpcycpO1xudmFyIGxyZWRpcyA9IHJlcXVpcmUoJy4vcmVkaXMtbG9jYWwnKTtcbnZhciByZWRpc1NlYXJjaCA9IHJlcXVpcmUoJ3JlZGlzZWFyY2hjbGllbnQnKTtcbmNvbnN0IFBSRUZJWCA9IFwicG1iOlwiXG5jb25zdCBJTkRFWCA9IFwiaW5kZXg6Y3VzdG9tZXJzXCJcbmV4cG9ydCBjbGFzcyBDdXN0b21lclNlcnZpY2Uge1xuICAgIGNvbnN0cnVjdG9yKCkge1xuICAgICAgICB0aGlzLm15U2VhcmNoID0gcmVkaXNTZWFyY2gocmVkaXMsIElOREVYLCB7XG4gICAgICAgICAgICBjbGllbnRPcHRpb25zOiBscmVkaXMuc2VhcmNoQ2xpZW50RGV0YWlsc1xuICAgICAgICB9KTtcbiAgICB9XG5cbiAgICBsaXN0Q3VzdG9tZXJzKHBhZ2UsIHBhZ2VTaXplKSB7XG4gICAgICAgIHJldHVybiBuZXcgUHJvbWlzZSgocmVzb2x2ZSwgcmVqZWN0KSA9PiB7XG4gICAgICAgICAgICB2YXIgb2Zmc2V0VmFsID0gKHBhZ2UgLSAxKSAqIHBhZ2VTaXplO1xuICAgICAgICAgICAgY29uc29sZS5sb2coJ29mZnNldCAnK29mZnNldFZhbCk7XG4gICAgICAgICAgICBcbiAgICAgICAgICAgIHRoaXMubXlTZWFyY2guc2VhcmNoKFwiKlwiLCB7XG4gICAgICAgICAgICAgICAgb2Zmc2V0Om9mZnNldFZhbCxcbiAgICAgICAgICAgICAgICBudW1iZXJPZlJlc3VsdHM6IHBhZ2VTaXplLFxuICAgICAgICAgICAgICAgIHNvcnRCeTogXCJzdmFsdWVcIlxuICAgICAgICAgICAgfSwgKHIxLCBkYXRhKSA9PiB7XG4gICAgICAgICAgICAgICAgaWYgKHIxKVxuICAgICAgICAgICAgICAgICAgICBjb25zb2xlLmxvZyhyMSk7XG4gICAgICAgICAgICAgICAgdmFyIGN1c3RvbWVycyA9IFtdOyBcbiAgICAgICAgICAgICAgICAgZGF0YS5yZXN1bHRzLmZvckVhY2goY3VzdG9tZXJSZXN1bHQgPT4ge1xuICAgICAgICAgICAgICAgICAgICAgY3VzdG9tZXJzLnB1c2goY3VzdG9tZXJSZXN1bHQuZG9jKTsgICAgXG4gICAgICAgICAgICAgICAgICAgIFxuICAgICAgICAgICAgICAgICB9KTtcbiAgICAgICAgICAgICAgICAgY29uc29sZS5sb2coY3VzdG9tZXJzKTtcbiAgICAgICAgICAgICAgICAgdmFyIHBhZ2VkRGF0YSA9IHtcbiAgICAgICAgICAgICAgICAgICAgY3VzdG9tZXJzOmN1c3RvbWVycyxcbiAgICAgICAgICAgICAgICAgICAgdG90YWxSZXN1bHRzIDogZGF0YS50b3RhbFJlc3VsdHMsXG4gICAgICAgICAgICAgICAgICAgIHBhZ2UgOiBwYWdlLFxuICAgICAgICAgICAgICAgICAgICBwYWdlU2l6ZTogcGFnZVNpemUsIFxuICAgICAgICAgICAgICAgICAgICBUb3RhbFBhZ2VzIDogKGRhdGEudG90YWxSZXN1bHRzL3BhZ2VTaXplKVxuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICByZXNvbHZlKHBhZ2VkRGF0YSk7XG4gICAgICAgICAgICAgICAgY29uc29sZS5sb2coY3VzdG9tZXJzKTtcbiAgICAgICAgICAgICAgICBcbiAgICAgICAgICAgIH0pO1xuICAgICAgICB9KVxuXG5cbiAgICB9XG4gICAgc2VhcmNoQ3VzdG9tZXJzKHNlYXJjaCxwYWdlLHBhZ2VTaXplKXtcbiAgICAgICAgcmV0dXJuIG5ldyBQcm9taXNlKChyZXNvbHZlLCByZWplY3QpID0+IHtcbiAgICAgICAgICAgIHZhciBvZmZzZXRWYWwgPSAocGFnZSAtIDEpICogcGFnZVNpemU7XG4gICAgICAgICAgICBjb25zb2xlLmxvZygnb2Zmc2V0ICcrb2Zmc2V0VmFsKTtcbiAgICAgICAgICAgIFxuICAgICAgICAgICAgdGhpcy5teVNlYXJjaC5zZWFyY2goc2VhcmNoLnJlcGxhY2UoXCJAXCIsXCIgXCIpKycqJywge1xuICAgICAgICAgICAgICAgIG9mZnNldDpvZmZzZXRWYWwsXG4gICAgICAgICAgICAgICAgbnVtYmVyT2ZSZXN1bHRzOiBwYWdlU2l6ZSxcbiAgICAgICAgICAgICAgICBzb3J0Qnk6IFwic3ZhbHVlXCIsXG4gICAgICAgICAgICAgICAgZGlyIDogXCJBU0NcIlxuICAgICAgICAgICAgfSwgKHIxLCBkYXRhKSA9PiB7XG4gICAgICAgICAgICAgICAgY29uc29sZS5sb2coZGF0YSk7XG4gICAgICAgICAgICAgICAgdmFyIGN1c3RvbWVycyA9IFtdOyBcbiAgICAgICAgICAgICAgICAgZGF0YS5yZXN1bHRzLmZvckVhY2goY3VzdG9tZXJSZXN1bHQgPT4ge1xuICAgICAgICAgICAgICAgICAgICAgY3VzdG9tZXJzLnB1c2goY3VzdG9tZXJSZXN1bHQuZG9jKTsgICAgXG4gICAgICAgICAgICAgICAgICAgIFxuICAgICAgICAgICAgICAgICB9KTtcbiAgICAgICAgICAgICAgICAgY29uc29sZS5sb2coY3VzdG9tZXJzKTtcbiAgICAgICAgICAgICAgICAgdmFyIHBhZ2VkRGF0YSA9IHtcbiAgICAgICAgICAgICAgICAgICAgY3VzdG9tZXJzOmN1c3RvbWVycyxcbiAgICAgICAgICAgICAgICAgICAgdG90YWxSZXN1bHRzIDogZGF0YS50b3RhbFJlc3VsdHMsXG4gICAgICAgICAgICAgICAgICAgIHBhZ2UgOiBwYWdlLFxuICAgICAgICAgICAgICAgICAgICBwYWdlU2l6ZTogcGFnZVNpemUsIFxuICAgICAgICAgICAgICAgICAgICBUb3RhbFBhZ2VzIDogKGRhdGEudG90YWxSZXN1bHRzL3BhZ2VTaXplKVxuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICByZXNvbHZlKHBhZ2VkRGF0YSk7XG4gICAgICAgICAgICAgICAgLy9Qcm9taXNlLmFsbCgpXG4gICAgICAgICAgICAgICAgY29uc29sZS5sb2coY3VzdG9tZXJzKTtcbiAgICAgICAgICAgICAgICAvLyBQcm9taXNlLmFsbChjdXN0b21lcnMubWFwKGxyZWRpcy5oZ2V0YWxsKSkudGhlbihmdW5jdGlvbiAob3duZXJzUmVzdWx0KSB7XG4gICAgICAgICAgICAgICAgLy8gICAgIGNvbnNvbGUubG9nKG93bmVyc1Jlc3VsdCk7XG4gICAgICAgICAgICAgICAgICAgXG4gICAgICAgICAgICAgICAgLy8gfSk7XG4gICAgICAgICAgICAgICBcbiAgICAgICAgICAgICAgICAvL2NvbnNvbGUubG9nKHIyKTsgXG4gICAgICAgICAgICB9KTtcbiAgICAgICAgfSlcblxuICAgIH1cblxuICAgIGdldEN1c3RvbWVyKHNreWJveCl7XG4gICAgICAgIHJldHVybiBuZXcgUHJvbWlzZSgocmVzb2x2ZSwgcmVqZWN0KSA9PiB7XG4gICAgICAgICAgbHJlZGlzLmhnZXRhbGwoXCI5NTpvd25lcnM6XCIrc2t5Ym94KS50aGVuKCh1c2VyKT0+e1xuICAgICAgICAgICAgICBjb25zb2xlLmxvZyh1c2VyKTsgXG4gICAgICAgICAgICAgIHJlc29sdmUodXNlcik7IFxuICAgICAgICAgIH0pXG4gICAgICAgIH0pXG4gICAgfSBcbiAgICBzYXZlQ3VzdG9tZXIoY3VzdG9tZXIpeyBcbiAgICAgICAgcmV0dXJuIG5ldyBQcm9taXNlKChyZXNvbHZlLHJlamVjdCk9PntcbiAgICAgICAgICAgIGxyZWRpcy5obXNldChcIjk1Om93bmVyczpcIitjdXN0b21lci5za3lib3gsY3VzdG9tZXIpLnRoZW4oKHJlc3VsdCk9PntcbiAgICAgICAgICAgICAgICByZXNvbHZlKHJlc3VsdCk7XG4gICAgICAgICAgICB9KTsgXG4gICAgICAgIH0pO1xuICAgIH1cbn0iXX0=
