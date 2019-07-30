'use strict';

Object.defineProperty(exports, "__esModule", {
    value: true
});

var _createClass = function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; }();

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

var redis = require('redis');
var lredis = require('./redis-local');
var redisSearch = require('redisearchclient');
var PREFIX = "95:owners";
var INDEX = "95:customers";

var CustomerService = exports.CustomerService = function () {
    function CustomerService() {
        _classCallCheck(this, CustomerService);

        this.mySearch = redisSearch(redis, '95:customers', {
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
//# sourceMappingURL=data:application/json;charset=utf8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIlJlZGlzU2VydmljZXMvQ3VzdG9tZXJTZXJ2aWNlLmVzNiJdLCJuYW1lcyI6WyJyZWRpcyIsInJlcXVpcmUiLCJscmVkaXMiLCJyZWRpc1NlYXJjaCIsIlBSRUZJWCIsIklOREVYIiwiQ3VzdG9tZXJTZXJ2aWNlIiwibXlTZWFyY2giLCJjbGllbnRPcHRpb25zIiwic2VhcmNoQ2xpZW50RGV0YWlscyIsInBhZ2UiLCJwYWdlU2l6ZSIsIlByb21pc2UiLCJyZXNvbHZlIiwicmVqZWN0Iiwib2Zmc2V0VmFsIiwiY29uc29sZSIsImxvZyIsInNlYXJjaCIsIm9mZnNldCIsIm51bWJlck9mUmVzdWx0cyIsInNvcnRCeSIsInIxIiwiZGF0YSIsImN1c3RvbWVycyIsInJlc3VsdHMiLCJmb3JFYWNoIiwicHVzaCIsImN1c3RvbWVyUmVzdWx0IiwiZG9jIiwicGFnZWREYXRhIiwidG90YWxSZXN1bHRzIiwiVG90YWxQYWdlcyIsInJlcGxhY2UiLCJkaXIiLCJza3lib3giLCJoZ2V0YWxsIiwidGhlbiIsInVzZXIiLCJjdXN0b21lciIsImhtc2V0IiwicmVzdWx0Il0sIm1hcHBpbmdzIjoiOzs7Ozs7Ozs7O0FBQUEsSUFBSUEsUUFBUUMsUUFBUSxPQUFSLENBQVo7QUFDQSxJQUFJQyxTQUFTRCxRQUFRLGVBQVIsQ0FBYjtBQUNBLElBQUlFLGNBQWNGLFFBQVEsa0JBQVIsQ0FBbEI7QUFDQSxJQUFNRyxTQUFTLFdBQWY7QUFDQSxJQUFNQyxRQUFRLGNBQWQ7O0lBQ2FDLGUsV0FBQUEsZTtBQUNULCtCQUFjO0FBQUE7O0FBQ1YsYUFBS0MsUUFBTCxHQUFnQkosWUFBWUgsS0FBWixFQUFtQixjQUFuQixFQUFtQztBQUMvQ1EsMkJBQWVOLE9BQU9PO0FBRHlCLFNBQW5DLENBQWhCO0FBR0g7Ozs7c0NBRWFDLEksRUFBTUMsUSxFQUFVO0FBQUE7O0FBQzFCLG1CQUFPLElBQUlDLE9BQUosQ0FBWSxVQUFDQyxPQUFELEVBQVVDLE1BQVYsRUFBcUI7QUFDcEMsb0JBQUlDLFlB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QUFDSSxNQUFELEVBQVU7QUFDL0Q1Qiw0QkFBUTRCLE1BQVI7QUFDSCxpQkFGRDtBQUdILGFBSk0sQ0FBUDtBQUtIIiwiZmlsZSI6IlJlZGlzU2VydmljZXMvQ3VzdG9tZXJTZXJ2aWNlLmpzIiwic291cmNlc0NvbnRlbnQiOlsidmFyIHJlZGlzID0gcmVxdWlyZSgncmVkaXMnKTtcbnZhciBscmVkaXMgPSByZXF1aXJlKCcuL3JlZGlzLWxvY2FsJyk7XG52YXIgcmVkaXNTZWFyY2ggPSByZXF1aXJlKCdyZWRpc2VhcmNoY2xpZW50Jyk7XG5jb25zdCBQUkVGSVggPSBcIjk1Om93bmVyc1wiXG5jb25zdCBJTkRFWCA9IFwiOTU6Y3VzdG9tZXJzXCJcbmV4cG9ydCBjbGFzcyBDdXN0b21lclNlcnZpY2Uge1xuICAgIGNvbnN0cnVjdG9yKCkge1xuICAgICAgICB0aGlzLm15U2VhcmNoID0gcmVkaXNTZWFyY2gocmVkaXMsICc5NTpjdXN0b21lcnMnLCB7XG4gICAgICAgICAgICBjbGllbnRPcHRpb25zOiBscmVkaXMuc2VhcmNoQ2xpZW50RGV0YWlsc1xuICAgICAgICB9KTtcbiAgICB9XG5cbiAgICBsaXN0Q3VzdG9tZXJzKHBhZ2UsIHBhZ2VTaXplKSB7XG4gICAgICAgIHJldHVybiBuZXcgUHJvbWlzZSgocmVzb2x2ZSwgcmVqZWN0KSA9PiB7XG4gICAgICAgICAgICB2YXIgb2Zmc2V0VmFsID0gKHBhZ2UgLSAxKSAqIHBhZ2VTaXplO1xuICAgICAgICAgICAgY29uc29sZS5sb2coJ29mZnNldCAnK29mZnNldFZhbCk7XG4gICAgICAgICAgICBcbiAgICAgICAgICAgIHRoaXMubXlTZWFyY2guc2VhcmNoKFwiKlwiLCB7XG4gICAgICAgICAgICAgICAgb2Zmc2V0Om9mZnNldFZhbCxcbiAgICAgICAgICAgICAgICBudW1iZXJPZlJlc3VsdHM6IHBhZ2VTaXplLFxuICAgICAgICAgICAgICAgIHNvcnRCeTogXCJzdmFsdWVcIlxuICAgICAgICAgICAgfSwgKHIxLCBkYXRhKSA9PiB7XG4gICAgICAgICAgICAgICAgaWYgKHIxKVxuICAgICAgICAgICAgICAgICAgICBjb25zb2xlLmxvZyhyMSk7XG4gICAgICAgICAgICAgICAgdmFyIGN1c3RvbWVycyA9IFtdOyBcbiAgICAgICAgICAgICAgICAgZGF0YS5yZXN1bHRzLmZvckVhY2goY3VzdG9tZXJSZXN1bHQgPT4ge1xuICAgICAgICAgICAgICAgICAgICAgY3VzdG9tZXJzLnB1c2goY3VzdG9tZXJSZXN1bHQuZG9jKTsgICAgXG4gICAgICAgICAgICAgICAgICAgIFxuICAgICAgICAgICAgICAgICB9KTtcbiAgICAgICAgICAgICAgICAgY29uc29sZS5sb2coY3VzdG9tZXJzKTtcbiAgICAgICAgICAgICAgICAgdmFyIHBhZ2VkRGF0YSA9IHtcbiAgICAgICAgICAgICAgICAgICAgY3VzdG9tZXJzOmN1c3RvbWVycyxcbiAgICAgICAgICAgICAgICAgICAgdG90YWxSZXN1bHRzIDogZGF0YS50b3RhbFJlc3VsdHMsXG4gICAgICAgICAgICAgICAgICAgIHBhZ2UgOiBwYWdlLFxuICAgICAgICAgICAgICAgICAgICBwYWdlU2l6ZTogcGFnZVNpemUsIFxuICAgICAgICAgICAgICAgICAgICBUb3RhbFBhZ2VzIDogKGRhdGEudG90YWxSZXN1bHRzL3BhZ2VTaXplKVxuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICByZXNvbHZlKHBhZ2VkRGF0YSk7XG4gICAgICAgICAgICAgICAgY29uc29sZS5sb2coY3VzdG9tZXJzKTtcbiAgICAgICAgICAgICAgICBcbiAgICAgICAgICAgIH0pO1xuICAgICAgICB9KVxuXG5cbiAgICB9XG4gICAgc2VhcmNoQ3VzdG9tZXJzKHNlYXJjaCxwYWdlLHBhZ2VTaXplKXtcbiAgICAgICAgcmV0dXJuIG5ldyBQcm9taXNlKChyZXNvbHZlLCByZWplY3QpID0+IHtcbiAgICAgICAgICAgIHZhciBvZmZzZXRWYWwgPSAocGFnZSAtIDEpICogcGFnZVNpemU7XG4gICAgICAgICAgICBjb25zb2xlLmxvZygnb2Zmc2V0ICcrb2Zmc2V0VmFsKTtcbiAgICAgICAgICAgIFxuICAgICAgICAgICAgdGhpcy5teVNlYXJjaC5zZWFyY2goc2VhcmNoLnJlcGxhY2UoXCJAXCIsXCIgXCIpKycqJywge1xuICAgICAgICAgICAgICAgIG9mZnNldDpvZmZzZXRWYWwsXG4gICAgICAgICAgICAgICAgbnVtYmVyT2ZSZXN1bHRzOiBwYWdlU2l6ZSxcbiAgICAgICAgICAgICAgICBzb3J0Qnk6IFwic3ZhbHVlXCIsXG4gICAgICAgICAgICAgICAgZGlyIDogXCJBU0NcIlxuICAgICAgICAgICAgfSwgKHIxLCBkYXRhKSA9PiB7XG4gICAgICAgICAgICAgICAgY29uc29sZS5sb2coZGF0YSk7XG4gICAgICAgICAgICAgICAgdmFyIGN1c3RvbWVycyA9IFtdOyBcbiAgICAgICAgICAgICAgICAgZGF0YS5yZXN1bHRzLmZvckVhY2goY3VzdG9tZXJSZXN1bHQgPT4ge1xuICAgICAgICAgICAgICAgICAgICAgY3VzdG9tZXJzLnB1c2goY3VzdG9tZXJSZXN1bHQuZG9jKTsgICAgXG4gICAgICAgICAgICAgICAgICAgIFxuICAgICAgICAgICAgICAgICB9KTtcbiAgICAgICAgICAgICAgICAgY29uc29sZS5sb2coY3VzdG9tZXJzKTtcbiAgICAgICAgICAgICAgICAgdmFyIHBhZ2VkRGF0YSA9IHtcbiAgICAgICAgICAgICAgICAgICAgY3VzdG9tZXJzOmN1c3RvbWVycyxcbiAgICAgICAgICAgICAgICAgICAgdG90YWxSZXN1bHRzIDogZGF0YS50b3RhbFJlc3VsdHMsXG4gICAgICAgICAgICAgICAgICAgIHBhZ2UgOiBwYWdlLFxuICAgICAgICAgICAgICAgICAgICBwYWdlU2l6ZTogcGFnZVNpemUsIFxuICAgICAgICAgICAgICAgICAgICBUb3RhbFBhZ2VzIDogKGRhdGEudG90YWxSZXN1bHRzL3BhZ2VTaXplKVxuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICByZXNvbHZlKHBhZ2VkRGF0YSk7XG4gICAgICAgICAgICAgICAgLy9Qcm9taXNlLmFsbCgpXG4gICAgICAgICAgICAgICAgY29uc29sZS5sb2coY3VzdG9tZXJzKTtcbiAgICAgICAgICAgICAgICAvLyBQcm9taXNlLmFsbChjdXN0b21lcnMubWFwKGxyZWRpcy5oZ2V0YWxsKSkudGhlbihmdW5jdGlvbiAob3duZXJzUmVzdWx0KSB7XG4gICAgICAgICAgICAgICAgLy8gICAgIGNvbnNvbGUubG9nKG93bmVyc1Jlc3VsdCk7XG4gICAgICAgICAgICAgICAgICAgXG4gICAgICAgICAgICAgICAgLy8gfSk7XG4gICAgICAgICAgICAgICBcbiAgICAgICAgICAgICAgICAvL2NvbnNvbGUubG9nKHIyKTsgXG4gICAgICAgICAgICB9KTtcbiAgICAgICAgfSlcblxuICAgIH1cblxuICAgIGdldEN1c3RvbWVyKHNreWJveCl7XG4gICAgICAgIHJldHVybiBuZXcgUHJvbWlzZSgocmVzb2x2ZSwgcmVqZWN0KSA9PiB7XG4gICAgICAgICAgbHJlZGlzLmhnZXRhbGwoXCI5NTpvd25lcnM6XCIrc2t5Ym94KS50aGVuKCh1c2VyKT0+e1xuICAgICAgICAgICAgICBjb25zb2xlLmxvZyh1c2VyKTsgXG4gICAgICAgICAgICAgIHJlc29sdmUodXNlcik7IFxuICAgICAgICAgIH0pXG4gICAgICAgIH0pXG4gICAgfSBcbiAgICBzYXZlQ3VzdG9tZXIoY3VzdG9tZXIpeyBcbiAgICAgICAgcmV0dXJuIG5ldyBQcm9taXNlKChyZXNvbHZlLHJlamVjdCk9PntcbiAgICAgICAgICAgIGxyZWRpcy5obXNldChcIjk1Om93bmVyczpcIitjdXN0b21lci5za3lib3gsY3VzdG9tZXIpLnRoZW4oKHJlc3VsdCk9PntcbiAgICAgICAgICAgICAgICByZXNvbHZlKHJlc3VsdCk7XG4gICAgICAgICAgICB9KTsgXG4gICAgICAgIH0pO1xuICAgIH1cbn0iXX0=
