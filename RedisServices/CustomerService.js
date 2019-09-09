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
                    console.log(customerDoc);
                    resolve(customerDoc.doc);
                });
                //   lredis.hgetall("95:owners:"+skybox).then((user)=>{
                //       console.log(user); 
                //       resolve(user); 
                //   })
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
                //we need to a reids update or add here 
                // lredis.hmset("95:owners:"+customer.pmb,customer).then((result)=>{
                //     resolve(result);
                // }); 
            });
        }
    }]);

    return CustomerService;
}();
//# sourceMappingURL=data:application/json;charset=utf8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIlJlZGlzU2VydmljZXMvQ3VzdG9tZXJTZXJ2aWNlLmVzNiJdLCJuYW1lcyI6WyJyZWRpcyIsInJlcXVpcmUiLCJscmVkaXMiLCJyZWRpc1NlYXJjaCIsIlBSRUZJWCIsIkNVU1RfSUQiLCJkYXRhQ29udGV4dCIsIklOREVYIiwiY3VzdG9tZXJJbmRleCIsImNsaWVudE9wdGlvbnMiLCJDdXN0b21lclNlcnZpY2UiLCJteVNlYXJjaCIsInNlYXJjaENsaWVudERldGFpbHMiLCJyZWRpc0NsaWVudCIsImdldCIsImVyciIsImlkIiwiTnVtYmVyIiwic2V0IiwicGFnZSIsInBhZ2VTaXplIiwiUHJvbWlzZSIsInJlc29sdmUiLCJyZWplY3QiLCJvZmZzZXRWYWwiLCJjb25zb2xlIiwibG9nIiwic2VhcmNoIiwib2Zmc2V0IiwibnVtYmVyT2ZSZXN1bHRzIiwicjEiLCJkYXRhIiwiY3VzdG9tZXJzIiwicmVzdWx0cyIsImZvckVhY2giLCJwdXNoIiwiY3VzdG9tZXJSZXN1bHQiLCJkb2MiLCJwYWdlZERhdGEiLCJ0b3RhbFJlc3VsdHMiLCJUb3RhbFBhZ2VzIiwicXVlcnkiLCJjdXN0b21lciIsInJlcGxhY2UiLCJza3lib3giLCJnZXREb2MiLCJjdXN0b21lckRvYyIsInNydiIsInVwZGF0ZSIsInJlc3VsdCIsInNhdmVkIiwiaW5jciIsImFkZCJdLCJtYXBwaW5ncyI6Ijs7Ozs7Ozs7O0FBQUE7Ozs7QUFFQSxJQUFJQSxRQUFRQyxRQUFRLE9BQVIsQ0FBWjtBQUNBLElBQUlDLFNBQVNELFFBQVEsZUFBUixDQUFiO0FBQ0EsSUFBSUUsY0FBY0YsUUFBUSwyQkFBUixDQUFsQjtBQUNBLElBQU1HLFNBQVMsTUFBZjtBQUNBLElBQU1DLFVBQVUsYUFBaEI7QUFDQSxJQUFJQyxjQUFjTCxRQUFRLGVBQVIsQ0FBbEI7QUFDQSxJQUFNTSxRQUFRLGlCQUFkOztBQUVBLElBQUlDLGdCQUFnQkwsWUFBWUgsS0FBWixFQUFtQk8sS0FBbkIsRUFBMEI7QUFDMUNFLG1CQUFl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Q2xCLGdCQUFJSyxNQUFPLElBQVg7QUFDQSxtQkFBTyxJQUFJMUIsT0FBSixDQUFZLFVBQUNDLE9BQUQsRUFBU0MsTUFBVCxFQUFrQjtBQUNqQyxvQkFBSW1CLFNBQVMxQixFQUFiLEVBQWdCOztBQUVaK0Isd0JBQUlwQyxRQUFKLENBQWFxQyxNQUFiLENBQW9CTixTQUFTMUIsRUFBN0IsRUFBZ0MwQixRQUFoQyxFQUF5QyxVQUFDM0IsR0FBRCxFQUFLa0MsTUFBTCxFQUFjO0FBQ25EM0IsZ0NBQVEsRUFBQzRCLE9BQU0sSUFBUCxFQUFSO0FBQ0gscUJBRkQ7QUFHSCxpQkFMRCxNQU1LO0FBQ0Q7QUFDQTVDLGdDQUFZTyxXQUFaLENBQXdCc0MsSUFBeEIsQ0FBNkI5QyxPQUE3QixFQUFxQyxVQUFDVSxHQUFELEVBQUtDLEVBQUwsRUFBVTtBQUMzQzBCLGlDQUFTMUIsRUFBVCxHQUFjQSxFQUFkO0FBQ0ErQiw0QkFBSXBDLFFBQUosQ0FBYXlDLEdBQWIsQ0FBaUJwQyxFQUFqQixFQUFvQjBCLFFBQXBCLEVBQThCLFVBQUMzQixHQUFELEVBQUtrQyxNQUFMLEVBQWM7QUFDeEMzQixvQ0FBUSxFQUFDNEIsT0FBTSxJQUFQLEVBQVI7QUFDSCx5QkFGRDtBQUdILHFCQUxEO0FBT0g7QUFDRDtBQUNBO0FBQ0E7QUFDQTtBQUNILGFBckJNLENBQVA7QUFzQkgiLCJmaWxlIjoiUmVkaXNTZXJ2aWNlcy9DdXN0b21lclNlcnZpY2UuanMiLCJzb3VyY2VzQ29udGVudCI6WyJpbXBvcnQgeyBjYWxlbmRhckZvcm1hdCB9IGZyb20gJ21vbWVudCc7XG5cbnZhciByZWRpcyA9IHJlcXVpcmUoJ3JlZGlzJyk7XG52YXIgbHJlZGlzID0gcmVxdWlyZSgnLi9yZWRpcy1sb2NhbCcpO1xudmFyIHJlZGlzU2VhcmNoID0gcmVxdWlyZSgnLi4vcmVkaXNlYXJjaGNsaWVudC9pbmRleCcpO1xuY29uc3QgUFJFRklYID0gXCJwbWI6XCJcbmNvbnN0IENVU1RfSUQgPSBcImN1c3RvbWVyOmlkXCI7IFxudmFyIGRhdGFDb250ZXh0ID0gcmVxdWlyZSgnLi9kYXRhQ29udGV4dCcpXG5jb25zdCBJTkRFWCA9IFwiaW5kZXg6Y3VzdG9tZXJzXCJcblxudmFyIGN1c3RvbWVySW5kZXggPSByZWRpc1NlYXJjaChyZWRpcywgSU5ERVgsIHtcbiAgICBjbGllbnRPcHRpb25zOiBkYXRhQ29udGV4dC5jbGllbnRPcHRpb25zXG59KTtcbmV4cG9ydCBjbGFzcyBDdXN0b21lclNlcnZpY2Uge1xuICAgIGNvbnN0cnVjdG9yKCkge1xuICAgICAgICB0aGlzLm15U2VhcmNoID0gcmVkaXNTZWFyY2gocmVkaXMsIElOREVYLCB7XG4gICAgICAgICAgICBjbGllbnRPcHRpb25zOiBscmVkaXMuc2VhcmNoQ2xpZW50RGV0YWlsc1xuICAgICAgICB9KTtcbiAgICAgICAgZGF0YUNvbnRleHQucmVkaXNDbGllbnQuZ2V0KENVU1RfSUQsKGVycixpZCk9PntcbiAgICAgICAgICAgIGlmIChOdW1iZXIoaWQpPCA1MDAwMCl7XG4gICAgICAgICAgICAgICAgZGF0YUNvbnRleHQucmVkaXNDbGllbnQuc2V0KENVU1RfSUQsXCI1MDAwMFwiKTsgXG4gICAgICAgICAgICB9XG4gICAgICAgIH0pXG4gICAgfVxuXG4gICAgbGlzdEN1c3RvbWVycyhwYWdlLCBwYWdlU2l6ZSkge1xuICAgICAgICByZXR1cm4gbmV3IFByb21pc2UoKHJlc29sdmUsIHJlamVjdCkgPT4ge1xuICAgICAgICAgICAgdmFyIG9mZnNldFZhbCA9IChwYWdlIC0gMSkgKiBwYWdlU2l6ZTtcbiAgICAgICAgICAgIGNvbnNvbGUubG9nKCdvZmZzZXQgJytvZmZzZXRWYWwpO1xuICAgICAgICAgICAgXG4gICAgICAgICAgICB0aGlzLm15U2VhcmNoLnNlYXJjaChcIkBpZDpbMCA1MDAwMF1cIiwge1xuICAgICAgICAgICAgICAgIG9mZnNldDpvZmZzZXRWYWwsXG4gICAgICAgICAgICAgICAgbnVtYmVyT2ZSZXN1bHRzOiA1MDAwMCxcbiAgICAgICAgICAgICAgIFxuICAgICAgICAgICAgfSwgKHIxLCBkYXRhKSA9PiB7XG4gICAgICAgICAgICAgICAgaWYgKHIxKVxuICAgICAgICAgICAgICAgICAgICBjb25zb2xlLmxvZyhyMSk7XG4gICAgICAgICAgICAgICAgdmFyIGN1c3RvbWVycyA9IFtdOyBcbiAgICAgICAgICAgICAgICAgZGF0YS5yZXN1bHRzLmZvckVhY2goY3VzdG9tZXJSZXN1bHQgPT4geyAgICAgICAgICAgICAgICAgICAgIFxuICAgICAgICAgICAgICAgICAgICAgY3VzdG9tZXJzLnB1c2goY3VzdG9tZXJSZXN1bHQuZG9jKTsgICAgXG4gICAgICAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgICAgICBjb25zb2xlLmxvZyhjdXN0b21lcnMpO1xuICAgICAgICAgICAgICAgICB2YXIgcGFnZWREYXRhID0ge1xuICAgICAgICAgICAgICAgICAgICBjdXN0b21lcnM6Y3VzdG9tZXJzLFxuICAgICAgICAgICAgICAgICAgICB0b3RhbFJlc3VsdHMgOiBkYXRhLnRvdGFsUmVzdWx0cyxcbiAgICAgICAgICAgICAgICAgICAgcGFnZSA6IHBhZ2UsXG4gICAgICAgICAgICAgICAgICAgIHBhZ2VTaXplOiBwYWdlU2l6ZSwgXG4gICAgICAgICAgICAgICAgICAgIFRvdGFsUGFnZXMgOiAoZGF0YS50b3RhbFJlc3VsdHMvcGFnZVNpemUpXG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIHJlc29sdmUocGFnZWREYXRhKTtcbiAgICAgICAgICAgICAgICBjb25zb2xlLmxvZyhjdXN0b21lcnMpO1xuICAgICAgICAgICAgICAgIFxuICAgICAgICAgICAgfSk7XG4gICAgICAgIH0pXG5cblxuICAgIH1cbiAgICBmaW5kQ3VzdG9tZXIocXVlcnkpe1xuICAgICAgICByZXR1cm4gbmV3IFByb21pc2UoKHJlc29sdmUscmVqZWN0KT0+e1xuICAgICAgICAgICAgY3VzdG9tZXJJbmRleC5zZWFyY2goYChAbmFtZTonJHtxdWVyeX0qJyl8KEBwbWI6JyR7cXVlcnl9KicpYCwge29mZnNldDowLCBudW1iZXJPZlJlc3VsdHM6MTAwMH0sKGVycixyZXN1bHRzKT0+e1xuICAgICAgICAgICAgICAgIGlmIChlcnIpe1xuICAgICAgICAgICAgICAgICAgICBjb25zb2xlLmxvZyhlcnIpXG4gICAgICAgICAgICAgICAgICAgIHJlc29sdmUoe2N1c3RvbWVyOltdfSk7IFxuICAgICAgICAgICAgICAgICAgICByZXR1cm47IFxuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICBpZiAoIXJlc3VsdHMpe1xuICAgICAgICAgICAgICAgICAgXG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIGNvbnNvbGUubG9nKCdyZXN1bHRzJywgcmVzdWx0cyk7IFxuICAgICAgICAgICAgICAgXG4gICAgICAgICAgICAgICAgdmFyIGN1c3RvbWVycyA9IFtdOyBcbiAgICAgICAgICAgICAgICByZXN1bHRzLnJlc3VsdHMuZm9yRWFjaChjdXN0b21lciA9PiB7XG4gICAgICAgICAgICAgICAgICAgIGN1c3RvbWVycy5wdXNoKGN1c3RvbWVyLmRvYyk7IFxuICAgICAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgICAgIGNvbnNvbGUubG9nKGN1c3RvbWVycylcbiAgICAgICAgICAgICAgICByZXNvbHZlKHtjdXN0b21lcjpjdXN0b21lcnN9KVxuICAgICAgICAgICAgfSlcbiAgICAgICAgfSlcbiAgICB9XG4gICAgc2VhcmNoQ3VzdG9tZXJzKHNlYXJjaCxwYWdlLHBhZ2VTaXplKXtcbiAgICAgICAgcmV0dXJuIG5ldyBQcm9taXNlKChyZXNvbHZlLCByZWplY3QpID0+IHtcbiAgICAgICAgICAgIHZhciBvZmZzZXRWYWwgPSAocGFnZSAtIDEpICogcGFnZVNpemU7XG4gICAgICAgICAgICBjb25zb2xlLmxvZygnb2Zmc2V0ICcrb2Zmc2V0VmFsKTtcbiAgICAgICAgICAgIFxuICAgICAgICAgICAgdGhpcy5teVNlYXJjaC5zZWFyY2goc2VhcmNoLnJlcGxhY2UoXCJAXCIsXCIgXCIpKycqJywge1xuICAgICAgICAgICAgICAgIG9mZnNldDpvZmZzZXRWYWwsXG4gICAgICAgICAgICAgICAgbnVtYmVyT2ZSZXN1bHRzOiBwYWdlU2l6ZSxcbiAgICAgICAgICAgICAgICAvLyBzb3J0Qnk6IFwibmFtZVwiLFxuICAgICAgICAgICAgICAgIC8vIGRpciA6IFwiQVNDXCJcbiAgICAgICAgICAgIH0sIChyMSwgZGF0YSkgPT4ge1xuICAgICAgICAgICAgICAgIGNvbnNvbGUubG9nKGRhdGEpO1xuICAgICAgICAgICAgICAgIHZhciBjdXN0b21lcnMgPSBbXTsgXG4gICAgICAgICAgICAgICAgIGRhdGEucmVzdWx0cy5mb3JFYWNoKGN1c3RvbWVyUmVzdWx0ID0+IHtcbiAgICAgICAgICAgICAgICAgICAgIGN1c3RvbWVycy5wdXNoKGN1c3RvbWVyUmVzdWx0LmRvYyk7ICAgIFxuICAgICAgICAgICAgICAgICAgICBcbiAgICAgICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICAgICAgIGNvbnNvbGUubG9nKGN1c3RvbWVycyk7XG4gICAgICAgICAgICAgICAgIHZhciBwYWdlZERhdGEgPSB7XG4gICAgICAgICAgICAgICAgICAgIGN1c3RvbWVyczpjdXN0b21lcnMsXG4gICAgICAgICAgICAgICAgICAgIHRvdGFsUmVzdWx0cyA6IGRhdGEudG90YWxSZXN1bHRzLFxuICAgICAgICAgICAgICAgICAgICBwYWdlIDogcGFnZSxcbiAgICAgICAgICAgICAgICAgICAgcGFnZVNpemU6IHBhZ2VTaXplLCBcbiAgICAgICAgICAgICAgICAgICAgVG90YWxQYWdlcyA6IChkYXRhLnRvdGFsUmVzdWx0cy9wYWdlU2l6ZSlcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgcmVzb2x2ZShwYWdlZERhdGEpO1xuICAgICAgICAgICAgICAgIC8vUHJvbWlzZS5hbGwoKVxuICAgICAgICAgICAgICAgIGNvbnNvbGUubG9nKGN1c3RvbWVycyk7XG4gICAgICAgICAgICAgICAgLy8gUHJvbWlzZS5hbGwoY3VzdG9tZXJzLm1hcChscmVkaXMuaGdldGFsbCkpLnRoZW4oZnVuY3Rpb24gKG93bmVyc1Jlc3VsdCkge1xuICAgICAgICAgICAgICAgIC8vICAgICBjb25zb2xlLmxvZyhvd25lcnNSZXN1bHQpO1xuICAgICAgICAgICAgICAgICAgIFxuICAgICAgICAgICAgICAgIC8vIH0pO1xuICAgICAgICAgICAgICAgXG4gICAgICAgICAgICAgICAgLy9jb25zb2xlLmxvZyhyMik7IFxuICAgICAgICAgICAgfSk7XG4gICAgICAgIH0pXG5cbiAgICB9XG5cbiAgICBnZXRDdXN0b21lcihza3lib3gpe1xuICAgICAgICByZXR1cm4gbmV3IFByb21pc2UoKHJlc29sdmUsIHJlamVjdCkgPT4ge1xuICAgICAgICAgICAgdGhpcy5teVNlYXJjaC5nZXREb2Moc2t5Ym94LCAoZXJyLGN1c3RvbWVyRG9jKT0+e1xuICAgICAgICAgICAgICAgIGNvbnNvbGUubG9nKGN1c3RvbWVyRG9jKTsgXG4gICAgICAgICAgICAgICAgcmVzb2x2ZShjdXN0b21lckRvYy5kb2MpOyBcbiAgICAgICAgICAgIH0pXG4gICAgICAgIC8vICAgbHJlZGlzLmhnZXRhbGwoXCI5NTpvd25lcnM6XCIrc2t5Ym94KS50aGVuKCh1c2VyKT0+e1xuICAgICAgICAvLyAgICAgICBjb25zb2xlLmxvZyh1c2VyKTsgXG4gICAgICAgIC8vICAgICAgIHJlc29sdmUodXNlcik7IFxuICAgICAgICAvLyAgIH0pXG4gICAgICAgIH0pXG4gICAgfSBcbiAgICBzYXZlQ3VzdG9tZXIoY3VzdG9tZXIpeyBcbiAgICAgICAgdmFyIHNydiAgPSB0aGlzOyBcbiAgICAgICAgcmV0dXJuIG5ldyBQcm9taXNlKChyZXNvbHZlLHJlamVjdCk9PntcbiAgICAgICAgICAgIGlmIChjdXN0b21lci5pZCl7XG4gICAgICAgICAgICAgICAgXG4gICAgICAgICAgICAgICAgc3J2Lm15U2VhcmNoLnVwZGF0ZShjdXN0b21lci5pZCxjdXN0b21lciwoZXJyLHJlc3VsdCk9PntcbiAgICAgICAgICAgICAgICAgICAgcmVzb2x2ZSh7c2F2ZWQ6dHJ1ZX0pXG4gICAgICAgICAgICAgICAgfSk7IFxuICAgICAgICAgICAgfVxuICAgICAgICAgICAgZWxzZSB7XG4gICAgICAgICAgICAgICAgLy9jcmVhdGUgbmV3IFxuICAgICAgICAgICAgICAgIGRhdGFDb250ZXh0LnJlZGlzQ2xpZW50LmluY3IoQ1VTVF9JRCwoZXJyLGlkKT0+e1xuICAgICAgICAgICAgICAgICAgICBjdXN0b21lci5pZCA9IGlkOyBcbiAgICAgICAgICAgICAgICAgICAgc3J2Lm15U2VhcmNoLmFkZChpZCxjdXN0b21lciwgKGVycixyZXN1bHQpPT57XG4gICAgICAgICAgICAgICAgICAgICAgICByZXNvbHZlKHtzYXZlZDp0cnVlfSlcbiAgICAgICAgICAgICAgICAgICAgfSlcbiAgICAgICAgICAgICAgICB9KTsgXG4gICAgICAgICAgICAgICAgXG4gICAgICAgICAgICB9XG4gICAgICAgICAgICAvL3dlIG5lZWQgdG8gYSByZWlkcyB1cGRhdGUgb3IgYWRkIGhlcmUgXG4gICAgICAgICAgICAvLyBscmVkaXMuaG1zZXQoXCI5NTpvd25lcnM6XCIrY3VzdG9tZXIucG1iLGN1c3RvbWVyKS50aGVuKChyZXN1bHQpPT57XG4gICAgICAgICAgICAvLyAgICAgcmVzb2x2ZShyZXN1bHQpO1xuICAgICAgICAgICAgLy8gfSk7IFxuICAgICAgICB9KTtcbiAgICB9XG59Il19
