'use strict';

Object.defineProperty(exports, "__esModule", {
    value: true
});
exports.CustomerService = undefined;

var _createClass = function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; }();

var _moment = require('moment');

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

var redis = require('redis');
var lredis = require('./redis-local');
var redisSearch = require('../redisearchclient/index');
var PREFIX = "pmb:";
var CUST_ID = "customer:id";
var dataContext = require('./dataContext');
var INDEX = "index:customers";

var customerIndex = redisSearch(redis, INDEX, {
    clientOptions: dataContext.clientOptions
});

var CustomerService = exports.CustomerService = function () {
    function CustomerService() {
        _classCallCheck(this, CustomerService);

        this.mySearch = redisSearch(redis, INDEX, {
            clientOptions: lredis.searchClientDetails
        });
        dataContext.redisClient.get(CUST_ID, function (err, id) {
            if (Number(id) < 50000) {
                dataContext.redisClient.set(CUST_ID, "50000");
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

                _this.mySearch.search("@id:[0 50000]", {
                    offset: offsetVal,
                    numberOfResults: 50000

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
        key: 'findCustomer',
        value: function findCustomer(query) {
            return new Promise(function (resolve, reject) {
                customerIndex.search('(@name:\'' + query + '*\')|(@pmb:\'' + query + '*\')', { offset: 0, numberOfResults: 1000 }, function (err, results) {
                    if (err) {
                        console.log(err);
                        resolve({ customer: [] });
                        return;
                    }
                    if (!results) {}
                    console.log('results', results);

                    var customers = [];
                    results.results.forEach(function (customer) {
                        customers.push(customer.doc);
                    });
                    console.log(customers);
                    resolve({ customer: customers });
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
                    numberOfResults: pageSize
                    // sortBy: "name",
                    // dir : "ASC"
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
            var _this3 = this;

            return new Promise(function (resolve, reject) {
                _this3.mySearch.getDoc(skybox, function (err, customerDoc) {

                    if (customerDoc.doc.pmb == '') customerDoc.doc.pmb = '9000';
                    console.log(customerDoc, 'looking up the customer');
                    resolve(customerDoc.doc);
                });
            });
        }
    }, {
        key: 'saveCustomer',
        value: function saveCustomer(customer) {
            var srv = this;
            return new Promise(function (resolve, reject) {
                if (customer.id) {

                    srv.mySearch.update(customer.id, customer, function (err, result) {
                        resolve({ saved: true });
                    });
                } else {
                    //create new 
                    dataContext.redisClient.incr(CUST_ID, function (err, id) {
                        customer.id = id;
                        srv.mySearch.add(id, customer, function (err, result) {
                            resolve({ saved: true });
                        });
                    });
                }
            });
        }
    }]);

    return CustomerService;
}();
//# sourceMappingURL=data:application/json;charset=utf8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIlJlZGlzU2VydmljZXMvQ3VzdG9tZXJTZXJ2aWNlLmVzNiJdLCJuYW1lcyI6WyJyZWRpcyIsInJlcXVpcmUiLCJscmVkaXMiLCJyZWRpc1NlYXJjaCIsIlBSRUZJWCIsIkNVU1RfSUQiLCJkYXRhQ29udGV4dCIsIklOREVYIiwiY3VzdG9tZXJJbmRleCIsImNsaWVudE9wdGlvbnMiLCJDdXN0b21lclNlcnZpY2UiLCJteVNlYXJjaCIsInNlYXJjaENsaWVudERldGFpbHMiLCJyZWRpc0NsaWVudCIsImdldCIsImVyciIsImlkIiwiTnVtYmVyIiwic2V0IiwicGFnZSIsInBhZ2VTaXplIiwiUHJvbWlzZSIsInJlc29sdmUiLCJyZWplY3QiLCJvZmZzZXRWYWwiLCJjb25zb2xlIiwibG9nIiwic2VhcmNoIiwib2Zmc2V0IiwibnVtYmVyT2ZSZXN1bHRzIiwicjEiLCJkYXRhIiwiY3VzdG9tZXJzIiwicmVzdWx0cyIsImZvckVhY2giLCJwdXNoIiwiY3VzdG9tZXJSZXN1bHQiLCJkb2MiLCJwYWdlZERhdGEiLCJ0b3RhbFJlc3VsdHMiLCJUb3RhbFBhZ2VzIiwicXVlcnkiLCJjdXN0b21lciIsInJlcGxhY2UiLCJza3lib3giLCJnZXREb2MiLCJjdXN0b21lckRvYyIsInBtYiIsInNydiIsInVwZGF0ZSIsInJlc3VsdCIsInNhdmVkIiwiaW5jciIsImFkZCJdLCJtYXBwaW5ncyI6Ijs7Ozs7Ozs7O0FBQUE7Ozs7QUFFQSxJQUFJQSxRQUFRQyxRQUFRLE9BQVIsQ0FBWjtBQUNBLElBQUlDLFNBQVNELFFBQVEsZUFBUixDQUFiO0FBQ0EsSUFBSUUsY0FBY0YsUUFBUSwyQkFBUixDQUFsQjtBQUNBLElBQU1HLFNBQVMsTUFBZjtBQUNBLElBQU1DLFVBQVUsYUFBaEI7QUFDQSxJQUFJQyxjQUFjTCxRQUFRLGVBQVIsQ0FBbEI7QUFDQSxJQUFNTSxRQUFRLGlCQUFkOztBQUVBLElBQUlDLGdCQUFnQkwsWUFBWUgsS0FBWixFQUFtQk8sS0FBbkIsRUFBMEI7QUFDMUNF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LEVBQXdCLHlCQUF4QjtBQUNKeEIsNEJBQVF3QixZQUFZVCxHQUFwQjtBQUNILGlCQU5EO0FBUUgsYUFUTSxDQUFQO0FBVUg7OztxQ0FDWUssUSxFQUFTO0FBQ2xCLGdCQUFJTSxNQUFPLElBQVg7QUFDQSxtQkFBTyxJQUFJM0IsT0FBSixDQUFZLFVBQUNDLE9BQUQsRUFBU0MsTUFBVCxFQUFrQjtBQUNqQyxvQkFBSW1CLFNBQVMxQixFQUFiLEVBQWdCOztBQUVaZ0Msd0JBQUlyQyxRQUFKLENBQWFzQyxNQUFiLENBQW9CUCxTQUFTMUIsRUFBN0IsRUFBZ0MwQixRQUFoQyxFQUF5QyxVQUFDM0IsR0FBRCxFQUFLbUMsTUFBTCxFQUFjO0FBQ25ENUIsZ0NBQVEsRUFBQzZCLE9BQU0sSUFBUCxFQUFSO0FBQ0gscUJBRkQ7QUFHSCxpQkFMRCxNQU1LO0FBQ0Q7QUFDQTdDLGdDQUFZTyxXQUFaLENBQXdCdUMsSUFBeEIsQ0FBNkIvQyxPQUE3QixFQUFxQyxVQUFDVSxHQUFELEVBQUtDLEVBQUwsRUFBVTtBQUMzQzBCLGlDQUFTMUIsRUFBVCxHQUFjQSxFQUFkO0FBQ0FnQyw0QkFBSXJDLFFBQUosQ0FBYTBDLEdBQWIsQ0FBaUJyQyxFQUFqQixFQUFvQjBCLFFBQXBCLEVBQThCLFVBQUMzQixHQUFELEVBQUttQyxNQUFMLEVBQWM7QUFDeEM1QixvQ0FBUSxFQUFDNkIsT0FBTSxJQUFQLEVBQVI7QUFDSCx5QkFGRDtBQUdILHFCQUxEO0FBT0g7QUFFSixhQWxCTSxDQUFQO0FBbUJIIiwiZmlsZSI6IlJlZGlzU2VydmljZXMvQ3VzdG9tZXJTZXJ2aWNlLmpzIiwic291cmNlc0NvbnRlbnQiOlsiaW1wb3J0IHsgY2FsZW5kYXJGb3JtYXQgfSBmcm9tICdtb21lbnQnO1xuXG52YXIgcmVkaXMgPSByZXF1aXJlKCdyZWRpcycpO1xudmFyIGxyZWRpcyA9IHJlcXVpcmUoJy4vcmVkaXMtbG9jYWwnKTtcbnZhciByZWRpc1NlYXJjaCA9IHJlcXVpcmUoJy4uL3JlZGlzZWFyY2hjbGllbnQvaW5kZXgnKTtcbmNvbnN0IFBSRUZJWCA9IFwicG1iOlwiXG5jb25zdCBDVVNUX0lEID0gXCJjdXN0b21lcjppZFwiOyBcbnZhciBkYXRhQ29udGV4dCA9IHJlcXVpcmUoJy4vZGF0YUNvbnRleHQnKVxuY29uc3QgSU5ERVggPSBcImluZGV4OmN1c3RvbWVyc1wiXG5cbnZhciBjdXN0b21lckluZGV4ID0gcmVkaXNTZWFyY2gocmVkaXMsIElOREVYLCB7XG4gICAgY2xpZW50T3B0aW9uczogZGF0YUNvbnRleHQuY2xpZW50T3B0aW9uc1xufSk7XG5leHBvcnQgY2xhc3MgQ3VzdG9tZXJTZXJ2aWNlIHtcbiAgICBjb25zdHJ1Y3RvcigpIHtcbiAgICAgICAgdGhpcy5teVNlYXJjaCA9IHJlZGlzU2VhcmNoKHJlZGlzLCBJTkRFWCwge1xuICAgICAgICAgICAgY2xpZW50T3B0aW9uczogbHJlZGlzLnNlYXJjaENsaWVudERldGFpbHNcbiAgICAgICAgfSk7XG4gICAgICAgIGRhdGFDb250ZXh0LnJlZGlzQ2xpZW50LmdldChDVVNUX0lELChlcnIsaWQpPT57XG4gICAgICAgICAgICBpZiAoTnVtYmVyKGlkKTwgNTAwMDApe1xuICAgICAgICAgICAgICAgIGRhdGFDb250ZXh0LnJlZGlzQ2xpZW50LnNldChDVVNUX0lELFwiNTAwMDBcIik7IFxuICAgICAgICAgICAgfVxuICAgICAgICB9KVxuICAgIH1cblxuICAgIGxpc3RDdXN0b21lcnMocGFnZSwgcGFnZVNpemUpIHtcbiAgICAgICAgcmV0dXJuIG5ldyBQcm9taXNlKChyZXNvbHZlLCByZWplY3QpID0+IHtcbiAgICAgICAgICAgIHZhciBvZmZzZXRWYWwgPSAocGFnZSAtIDEpICogcGFnZVNpemU7XG4gICAgICAgICAgICBjb25zb2xlLmxvZygnb2Zmc2V0ICcrb2Zmc2V0VmFsKTtcbiAgICAgICAgICAgIFxuICAgICAgICAgICAgdGhpcy5teVNlYXJjaC5zZWFyY2goXCJAaWQ6WzAgNTAwMDBdXCIsIHtcbiAgICAgICAgICAgICAgICBvZmZzZXQ6b2Zmc2V0VmFsLFxuICAgICAgICAgICAgICAgIG51bWJlck9mUmVzdWx0czogNTAwMDAsXG4gICAgICAgICAgICAgICBcbiAgICAgICAgICAgIH0sIChyMSwgZGF0YSkgPT4ge1xuICAgICAgICAgICAgICAgIGlmIChyMSlcbiAgICAgICAgICAgICAgICAgICAgY29uc29sZS5sb2cocjEpO1xuICAgICAgICAgICAgICAgIHZhciBjdXN0b21lcnMgPSBbXTsgXG4gICAgICAgICAgICAgICAgIGRhdGEucmVzdWx0cy5mb3JFYWNoKGN1c3RvbWVyUmVzdWx0ID0+IHsgICAgICAgICAgICAgICAgICAgICBcbiAgICAgICAgICAgICAgICAgICAgIGN1c3RvbWVycy5wdXNoKGN1c3RvbWVyUmVzdWx0LmRvYyk7ICAgIFxuICAgICAgICAgICAgICAgICB9KTtcbiAgICAgICAgICAgICAgICAgY29uc29sZS5sb2coY3VzdG9tZXJzKTtcbiAgICAgICAgICAgICAgICAgdmFyIHBhZ2VkRGF0YSA9IHtcbiAgICAgICAgICAgICAgICAgICAgY3VzdG9tZXJzOmN1c3RvbWVycyxcbiAgICAgICAgICAgICAgICAgICAgdG90YWxSZXN1bHRzIDogZGF0YS50b3RhbFJlc3VsdHMsXG4gICAgICAgICAgICAgICAgICAgIHBhZ2UgOiBwYWdlLFxuICAgICAgICAgICAgICAgICAgICBwYWdlU2l6ZTogcGFnZVNpemUsIFxuICAgICAgICAgICAgICAgICAgICBUb3RhbFBhZ2VzIDogKGRhdGEudG90YWxSZXN1bHRzL3BhZ2VTaXplKVxuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICByZXNvbHZlKHBhZ2VkRGF0YSk7XG4gICAgICAgICAgICAgICAgY29uc29sZS5sb2coY3VzdG9tZXJzKTtcbiAgICAgICAgICAgICAgICBcbiAgICAgICAgICAgIH0pO1xuICAgICAgICB9KVxuXG5cbiAgICB9XG4gICAgZmluZEN1c3RvbWVyKHF1ZXJ5KXtcbiAgICAgICAgcmV0dXJuIG5ldyBQcm9taXNlKChyZXNvbHZlLHJlamVjdCk9PntcbiAgICAgICAgICAgIGN1c3RvbWVySW5kZXguc2VhcmNoKGAoQG5hbWU6JyR7cXVlcnl9KicpfChAcG1iOicke3F1ZXJ5fSonKWAsIHtvZmZzZXQ6MCwgbnVtYmVyT2ZSZXN1bHRzOjEwMDB9LChlcnIscmVzdWx0cyk9PntcbiAgICAgICAgICAgICAgICBpZiAoZXJyKXtcbiAgICAgICAgICAgICAgICAgICAgY29uc29sZS5sb2coZXJyKVxuICAgICAgICAgICAgICAgICAgICByZXNvbHZlKHtjdXN0b21lcjpbXX0pOyBcbiAgICAgICAgICAgICAgICAgICAgcmV0dXJuOyBcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgaWYgKCFyZXN1bHRzKXtcbiAgICAgICAgICAgICAgICAgIFxuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICBjb25zb2xlLmxvZygncmVzdWx0cycsIHJlc3VsdHMpOyBcbiAgICAgICAgICAgICAgIFxuICAgICAgICAgICAgICAgIHZhciBjdXN0b21lcnMgPSBbXTsgXG4gICAgICAgICAgICAgICAgcmVzdWx0cy5yZXN1bHRzLmZvckVhY2goY3VzdG9tZXIgPT4ge1xuICAgICAgICAgICAgICAgICAgICBjdXN0b21lcnMucHVzaChjdXN0b21lci5kb2MpOyBcbiAgICAgICAgICAgICAgICB9KTtcbiAgICAgICAgICAgICAgICBjb25zb2xlLmxvZyhjdXN0b21lcnMpXG4gICAgICAgICAgICAgICAgcmVzb2x2ZSh7Y3VzdG9tZXI6Y3VzdG9tZXJzfSlcbiAgICAgICAgICAgIH0pXG4gICAgICAgIH0pXG4gICAgfVxuICAgIHNlYXJjaEN1c3RvbWVycyhzZWFyY2gscGFnZSxwYWdlU2l6ZSl7XG4gICAgICAgIHJldHVybiBuZXcgUHJvbWlzZSgocmVzb2x2ZSwgcmVqZWN0KSA9PiB7XG4gICAgICAgICAgICB2YXIgb2Zmc2V0VmFsID0gKHBhZ2UgLSAxKSAqIHBhZ2VTaXplO1xuICAgICAgICAgICAgY29uc29sZS5sb2coJ29mZnNldCAnK29mZnNldFZhbCk7XG4gICAgICAgICAgICBcbiAgICAgICAgICAgIHRoaXMubXlTZWFyY2guc2VhcmNoKHNlYXJjaC5yZXBsYWNlKFwiQFwiLFwiIFwiKSsnKicsIHtcbiAgICAgICAgICAgICAgICBvZmZzZXQ6b2Zmc2V0VmFsLFxuICAgICAgICAgICAgICAgIG51bWJlck9mUmVzdWx0czogcGFnZVNpemUsXG4gICAgICAgICAgICAgICAgLy8gc29ydEJ5OiBcIm5hbWVcIixcbiAgICAgICAgICAgICAgICAvLyBkaXIgOiBcIkFTQ1wiXG4gICAgICAgICAgICB9LCAocjEsIGRhdGEpID0+IHtcbiAgICAgICAgICAgICAgICBjb25zb2xlLmxvZyhkYXRhKTtcbiAgICAgICAgICAgICAgICB2YXIgY3VzdG9tZXJzID0gW107IFxuICAgICAgICAgICAgICAgICBkYXRhLnJlc3VsdHMuZm9yRWFjaChjdXN0b21lclJlc3VsdCA9PiB7XG4gICAgICAgICAgICAgICAgICAgICBjdXN0b21lcnMucHVzaChjdXN0b21lclJlc3VsdC5kb2MpOyAgICBcbiAgICAgICAgICAgICAgICAgICAgXG4gICAgICAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgICAgICBjb25zb2xlLmxvZyhjdXN0b21lcnMpO1xuICAgICAgICAgICAgICAgICB2YXIgcGFnZWREYXRhID0ge1xuICAgICAgICAgICAgICAgICAgICBjdXN0b21lcnM6Y3VzdG9tZXJzLFxuICAgICAgICAgICAgICAgICAgICB0b3RhbFJlc3VsdHMgOiBkYXRhLnRvdGFsUmVzdWx0cyxcbiAgICAgICAgICAgICAgICAgICAgcGFnZSA6IHBhZ2UsXG4gICAgICAgICAgICAgICAgICAgIHBhZ2VTaXplOiBwYWdlU2l6ZSwgXG4gICAgICAgICAgICAgICAgICAgIFRvdGFsUGFnZXMgOiAoZGF0YS50b3RhbFJlc3VsdHMvcGFnZVNpemUpXG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIHJlc29sdmUocGFnZWREYXRhKTtcbiAgICAgICAgICAgICAgICAvL1Byb21pc2UuYWxsKClcbiAgICAgICAgICAgICAgICBjb25zb2xlLmxvZyhjdXN0b21lcnMpO1xuICAgICAgICAgICAgICAgIC8vIFByb21pc2UuYWxsKGN1c3RvbWVycy5tYXAobHJlZGlzLmhnZXRhbGwpKS50aGVuKGZ1bmN0aW9uIChvd25lcnNSZXN1bHQpIHtcbiAgICAgICAgICAgICAgICAvLyAgICAgY29uc29sZS5sb2cob3duZXJzUmVzdWx0KTtcbiAgICAgICAgICAgICAgICAgICBcbiAgICAgICAgICAgICAgICAvLyB9KTtcbiAgICAgICAgICAgICAgIFxuICAgICAgICAgICAgICAgIC8vY29uc29sZS5sb2cocjIpOyBcbiAgICAgICAgICAgIH0pO1xuICAgICAgICB9KVxuXG4gICAgfVxuXG4gICAgZ2V0Q3VzdG9tZXIoc2t5Ym94KXtcbiAgICAgICAgcmV0dXJuIG5ldyBQcm9taXNlKChyZXNvbHZlLCByZWplY3QpID0+IHtcbiAgICAgICAgICAgIHRoaXMubXlTZWFyY2guZ2V0RG9jKHNreWJveCwgKGVycixjdXN0b21lckRvYyk9PntcbiAgICAgICAgICAgICAgIFxuICAgICAgICAgICAgICAgIGlmIChjdXN0b21lckRvYy5kb2MucG1iID09ICcnKVxuICAgICAgICAgICAgICAgICAgICBjdXN0b21lckRvYy5kb2MucG1iID0gJzkwMDAnXG4gICAgICAgICAgICAgICAgICAgIGNvbnNvbGUubG9nKGN1c3RvbWVyRG9jLCdsb29raW5nIHVwIHRoZSBjdXN0b21lcicpOyBcbiAgICAgICAgICAgICAgICByZXNvbHZlKGN1c3RvbWVyRG9jLmRvYyk7IFxuICAgICAgICAgICAgfSlcbiAgICAgICBcbiAgICAgICAgfSlcbiAgICB9IFxuICAgIHNhdmVDdXN0b21lcihjdXN0b21lcil7IFxuICAgICAgICB2YXIgc3J2ICA9IHRoaXM7IFxuICAgICAgICByZXR1cm4gbmV3IFByb21pc2UoKHJlc29sdmUscmVqZWN0KT0+e1xuICAgICAgICAgICAgaWYgKGN1c3RvbWVyLmlkKXtcbiAgICAgICAgICAgICAgICBcbiAgICAgICAgICAgICAgICBzcnYubXlTZWFyY2gudXBkYXRlKGN1c3RvbWVyLmlkLGN1c3RvbWVyLChlcnIscmVzdWx0KT0+e1xuICAgICAgICAgICAgICAgICAgICByZXNvbHZlKHtzYXZlZDp0cnVlfSlcbiAgICAgICAgICAgICAgICB9KTsgXG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBlbHNlIHtcbiAgICAgICAgICAgICAgICAvL2NyZWF0ZSBuZXcgXG4gICAgICAgICAgICAgICAgZGF0YUNvbnRleHQucmVkaXNDbGllbnQuaW5jcihDVVNUX0lELChlcnIsaWQpPT57XG4gICAgICAgICAgICAgICAgICAgIGN1c3RvbWVyLmlkID0gaWQ7IFxuICAgICAgICAgICAgICAgICAgICBzcnYubXlTZWFyY2guYWRkKGlkLGN1c3RvbWVyLCAoZXJyLHJlc3VsdCk9PntcbiAgICAgICAgICAgICAgICAgICAgICAgIHJlc29sdmUoe3NhdmVkOnRydWV9KVxuICAgICAgICAgICAgICAgICAgICB9KVxuICAgICAgICAgICAgICAgIH0pOyBcbiAgICAgICAgICAgICAgICBcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIFxuICAgICAgICB9KTtcbiAgICB9XG59Il19
