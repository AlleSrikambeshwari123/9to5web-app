'use strict';

Object.defineProperty(exports, "__esModule", {
    value: true
});

var _createClass = function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; }();

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

var dataContext = require('./dataContext');
var SERVICE_KEY = 'customer';

var Customer = exports.Customer = function () {
    function Customer() {
        _classCallCheck(this, Customer);
    }

    _createClass(Customer, [{
        key: 'processCustomers',
        value: function processCustomers(customerList) {
            return new Promise(function (resolve, reject) {
                dataContext.getServiceProxy(SERVICE_KEY).processCustomerList(customerList, function (error, result) {
                    if (error) {
                        reject(error);
                    }
                    resolve(result);
                });
            });
        }
    }, {
        key: 'findCustomers',
        value: function findCustomers(searchTxt) {
            return new Promise(function (resolve, reject) {
                dataContext.getServiceProxy(SERVICE_KEY).findCustomer({ text: searchTxt }, function (error, result) {
                    if (error) {
                        reject(error);
                    }
                    resolve(result);
                });
            });
        }
    }, {
        key: 'listCustomers',
        value: function listCustomers(currentPage, pageSize) {
            return new Promise(function (resolve, reject) {
                dataContext.getServiceProxy(SERVICE_KEY).getCustomers({ currentPage: currentPage, pageSize: pageSize }, function (error, result) {
                    if (error) {
                        reject(error);
                    }
                    resolve(result);
                });
            });
        }
    }, {
        key: 'getCustomer',
        value: function getCustomer(customerId) {
            return new Promise(function (resolve, reject) {
                dataContext.getServiceProxy(SERVICE_KEY).getCustomer({ customerId: customerId }, function (error, result) {
                    if (error) {
                        reject(error);
                    }
                    resolve(result);
                });
            });
        }
    }, {
        key: 'saveCustomer',
        value: function saveCustomer(customer) {
            return new Promise(function (resolve, reject) {
                dataContext.getServiceProxy(SERVICE_KEY).saveCustomer(customer, function (error, result) {
                    if (error) {
                        reject(error);
                    }
                    resolve(result);
                });
            });
        }
    }]);

    return Customer;
}();
//# sourceMappingURL=data:application/json;charset=utf8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIkRhdGFTZXJ2aWNlcy9DdXN0b21lclNlcnZpY2UuZXM2Il0sIm5hbWVzIjpbImRhdGFDb250ZXh0IiwicmVxdWlyZSIsIlNFUlZJQ0VfS0VZIiwiQ3VzdG9tZXIiLCJjdXN0b21lckxpc3QiLCJQcm9taXNlIiwicmVzb2x2ZSIsInJlamVjdCIsImdldFNlcnZpY2VQcm94eSIsInByb2Nlc3NDdXN0b21lckxpc3QiLCJlcnJvciIsInJlc3VsdCIsInNlYXJjaFR4dCIsImZpbmRDdXN0b21lciIsInRleHQiLCJjdXJyZW50UGFnZSIsInBhZ2VTaXplIiwiZ2V0Q3VzdG9tZXJzIiwiY3VzdG9tZXJJZCIsImdldEN1c3RvbWVyIiwiY3VzdG9tZXIiLCJzYXZlQ3VzdG9tZXIiXSwibWFwcGluZ3MiOiI7Ozs7Ozs7Ozs7QUFBQSxJQUFJQSxjQUFjQyxRQUFRLGVBQVIsQ0FBbEI7QUFDQSxJQUFNQyxjQUFjLFVBQXBCOztJQUVhQyxRLFdBQUFBLFE7QUFDVCx3QkFBYTtBQUFBO0FBRVo7Ozs7eUNBRWdCQyxZLEVBQWE7QUFDMUIsbUJBQU8sSUFBSUMsT0FBSixDQUFhLFVBQVNDLE9BQVQsRUFBaUJDLE1BQWpCLEVBQXdCO0FBQ3hDUCw0QkFBWVEsZUFBWixDQUE0Qk4sV0FBNUIsRUFBeUNPLG1CQUF6QyxDQUE2REwsWUFBN0QsRUFBMEUsVUFBU00sS0FBVCxFQUFlQyxNQUFmLEVBQXNCO0FBQzVGLHdCQUFJRCxLQUFKLEVBQVU7QUFDTkgsK0JBQU9HLEtBQVA7QUFDSDtBQUNESiw0QkFBU0ssTUFBVDtBQUNILGlCQUxEO0FBTUgsYUFQTSxDQUFQO0FBUUg7OztzQ0FDYUMsUyxFQUFVO0FBQ3BCLG1CQUFPLElBQUlQLE9BQUosQ0FBYSxVQUFTQyxPQUFULEVBQWlCQyxNQUFqQixFQUF3QjtBQUN4Q1AsNEJBQVlRLGVBQVosQ0FBNEJOLFdBQTVCLEVBQXlDVyxZQUF6QyxDQUFzRCxFQUFDQyxNQUFLRixTQUFOLEVBQXRELEVBQXVFLFVBQVNGLEtBQVQsRUFBZUMsTUFBZixFQUFzQjtBQUN6Rix3QkFBSUQsS0FBSixFQUFVO0FBQ05ILCtCQUFPRyxLQUFQO0FBQ0g7QUFDREosNEJBQVNLLE1BQVQ7QUFDSCxpQkFMRDtBQU1ILGFBUE0sQ0FBUDtBQVFIOzs7c0NBQ2FJLFcsRUFBYUMsUSxFQUFTO0FBQ2hDLG1CQUFPLElBQUlYLE9BQUosQ0FBYSxVQUFTQyxPQUFULEVBQWlCQyxNQUFqQixFQUF3QjtBQUN4Q1AsNEJBQVlRLGVBQVosQ0FBNEJOLFdBQTVCLEVBQXlDZSxZQUF6QyxDQUFzRCxFQUFDRixhQUFZQSxXQUFiLEVBQXlCQyxVQUFTQSxRQUFsQyxFQUF0RCxFQUFrRyxVQUFTTixLQUFULEVBQWVDLE1BQWYsRUFBc0I7QUFDcEgsd0JBQUlELEtBQUosRUFBVTtBQUNOSCwrQkFBT0csS0FBUDtBQUNIO0FBQ0RKLDRCQUFTSyxNQUFUO0FBQ0gsaUJBTEQ7QUFNSCxhQVBNLENBQVA7QUFRSDs7O29DQUNXTyxVLEVBQVc7QUFDbkIsbUJBQU8sSUFBSWIsT0FBSixDQUFhLFVBQVNDLE9BQVQsRUFBaUJDLE1BQWpCLEVBQXdCO0FBQ3hDUCw0QkFBWVEsZUFBWixDQUE0Qk4sV0FBNUIsRUFBeUNpQixXQUF6QyxDQUFxRCxFQUFDRCxZQUFXQSxVQUFaLEVBQXJELEVBQTZFLFVBQVNSLEtBQVQsRUFBZUMsTUFBZixFQUFzQjtBQUMvRix3QkFBSUQsS0FBSixFQUFVO0FBQ05ILCtCQUFPRyxLQUFQO0FBQ0g7QUFDREosNEJBQVNLLE1BQVQ7QUFDSCxpQkFMRDtBQU1ILGFBUE0sQ0FBUDtBQVFIOzs7cUNBQ1lTLFEsRUFBUztBQUNsQixtQkFBTyxJQUFJZixPQUFKLENBQWEsVUFBU0MsT0FBVCxFQUFpQkMsTUFBakIsRUFBd0I7QUFDeENQLDRCQUFZUSxlQUFaLENBQTRCTixXQUE1QixFQUF5Q21CLFlBQXpDLENBQXNERCxRQUF0RCxFQUErRCxVQUFTVixLQUFULEVBQWVDLE1BQWYsRUFBc0I7QUFDakYsd0JBQUlELEtBQUosRUFBVTtBQUNOSCwrQkFBT0csS0FBUDtBQUNIO0FBQ0RKLDRCQUFTSyxNQUFUO0FBQ0gsaUJBTEQ7QUFNSCxhQVBNLENBQVA7QUFRSCIsImZpbGUiOiJEYXRhU2VydmljZXMvQ3VzdG9tZXJTZXJ2aWNlLmpzIiwic291cmNlc0NvbnRlbnQiOlsidmFyIGRhdGFDb250ZXh0ID0gcmVxdWlyZSgnLi9kYXRhQ29udGV4dCcpO1xyXG5jb25zdCBTRVJWSUNFX0tFWSA9ICdjdXN0b21lcic7XHJcblxyXG5leHBvcnQgY2xhc3MgQ3VzdG9tZXJ7IFxyXG4gICAgY29uc3RydWN0b3IoKXtcclxuXHJcbiAgICB9XHJcblxyXG4gICAgcHJvY2Vzc0N1c3RvbWVycyhjdXN0b21lckxpc3Qpe1xyXG4gICAgICAgIHJldHVybiBuZXcgUHJvbWlzZSAoZnVuY3Rpb24ocmVzb2x2ZSxyZWplY3Qpe1xyXG4gICAgICAgICAgICBkYXRhQ29udGV4dC5nZXRTZXJ2aWNlUHJveHkoU0VSVklDRV9LRVkpLnByb2Nlc3NDdXN0b21lckxpc3QoY3VzdG9tZXJMaXN0LGZ1bmN0aW9uKGVycm9yLHJlc3VsdCl7XHJcbiAgICAgICAgICAgICAgICBpZiAoZXJyb3Ipe1xyXG4gICAgICAgICAgICAgICAgICAgIHJlamVjdChlcnJvcik7XHJcbiAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgICAgICByZXNvbHZlKCByZXN1bHQpO1xyXG4gICAgICAgICAgICB9KTtcclxuICAgICAgICB9KTtcclxuICAgIH1cclxuICAgIGZpbmRDdXN0b21lcnMoc2VhcmNoVHh0KXtcclxuICAgICAgICByZXR1cm4gbmV3IFByb21pc2UgKGZ1bmN0aW9uKHJlc29sdmUscmVqZWN0KXtcclxuICAgICAgICAgICAgZGF0YUNvbnRleHQuZ2V0U2VydmljZVByb3h5KFNFUlZJQ0VfS0VZKS5maW5kQ3VzdG9tZXIoe3RleHQ6c2VhcmNoVHh0fSxmdW5jdGlvbihlcnJvcixyZXN1bHQpe1xyXG4gICAgICAgICAgICAgICAgaWYgKGVycm9yKXtcclxuICAgICAgICAgICAgICAgICAgICByZWplY3QoZXJyb3IpO1xyXG4gICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICAgICAgcmVzb2x2ZSggcmVzdWx0KTtcclxuICAgICAgICAgICAgfSk7XHJcbiAgICAgICAgfSk7XHJcbiAgICB9XHJcbiAgICBsaXN0Q3VzdG9tZXJzKGN1cnJlbnRQYWdlLCBwYWdlU2l6ZSl7XHJcbiAgICAgICAgcmV0dXJuIG5ldyBQcm9taXNlIChmdW5jdGlvbihyZXNvbHZlLHJlamVjdCl7XHJcbiAgICAgICAgICAgIGRhdGFDb250ZXh0LmdldFNlcnZpY2VQcm94eShTRVJWSUNFX0tFWSkuZ2V0Q3VzdG9tZXJzKHtjdXJyZW50UGFnZTpjdXJyZW50UGFnZSxwYWdlU2l6ZTpwYWdlU2l6ZX0sZnVuY3Rpb24oZXJyb3IscmVzdWx0KXtcclxuICAgICAgICAgICAgICAgIGlmIChlcnJvcil7XHJcbiAgICAgICAgICAgICAgICAgICAgcmVqZWN0KGVycm9yKTtcclxuICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgICAgIHJlc29sdmUoIHJlc3VsdCk7XHJcbiAgICAgICAgICAgIH0pO1xyXG4gICAgICAgIH0pO1xyXG4gICAgfVxyXG4gICAgZ2V0Q3VzdG9tZXIoY3VzdG9tZXJJZCl7XHJcbiAgICAgICAgcmV0dXJuIG5ldyBQcm9taXNlIChmdW5jdGlvbihyZXNvbHZlLHJlamVjdCl7XHJcbiAgICAgICAgICAgIGRhdGFDb250ZXh0LmdldFNlcnZpY2VQcm94eShTRVJWSUNFX0tFWSkuZ2V0Q3VzdG9tZXIoe2N1c3RvbWVySWQ6Y3VzdG9tZXJJZH0sZnVuY3Rpb24oZXJyb3IscmVzdWx0KXtcclxuICAgICAgICAgICAgICAgIGlmIChlcnJvcil7XHJcbiAgICAgICAgICAgICAgICAgICAgcmVqZWN0KGVycm9yKTtcclxuICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgICAgIHJlc29sdmUoIHJlc3VsdCk7XHJcbiAgICAgICAgICAgIH0pO1xyXG4gICAgICAgIH0pO1xyXG4gICAgfVxyXG4gICAgc2F2ZUN1c3RvbWVyKGN1c3RvbWVyKXtcclxuICAgICAgICByZXR1cm4gbmV3IFByb21pc2UgKGZ1bmN0aW9uKHJlc29sdmUscmVqZWN0KXtcclxuICAgICAgICAgICAgZGF0YUNvbnRleHQuZ2V0U2VydmljZVByb3h5KFNFUlZJQ0VfS0VZKS5zYXZlQ3VzdG9tZXIoY3VzdG9tZXIsZnVuY3Rpb24oZXJyb3IscmVzdWx0KXtcclxuICAgICAgICAgICAgICAgIGlmIChlcnJvcil7XHJcbiAgICAgICAgICAgICAgICAgICAgcmVqZWN0KGVycm9yKTtcclxuICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgICAgIHJlc29sdmUoIHJlc3VsdCk7XHJcbiAgICAgICAgICAgIH0pO1xyXG4gICAgICAgIH0pO1xyXG4gICAgfVxyXG59Il19
