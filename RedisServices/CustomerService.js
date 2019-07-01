'use strict';

Object.defineProperty(exports, "__esModule", {
    value: true
});

var _createClass = function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; }();

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

var redis = require('redis');
var lredis = require('./redis-local');
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
//# sourceMappingURL=data:application/json;charset=utf8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIlJlZGlzU2VydmljZXMvQ3VzdG9tZXJTZXJ2aWNlLmVzNiJdLCJuYW1lcyI6WyJyZWRpcyIsInJlcXVpcmUiLCJscmVkaXMiLCJyZWRpc1NlYXJjaCIsIkN1c3RvbWVyU2VydmljZSIsIm15U2VhcmNoIiwiY2xpZW50T3B0aW9ucyIsInNlYXJjaENsaWVudERldGFpbHMiLCJwYWdlIiwicGFnZVNpemUiLCJQcm9taXNlIiwicmVzb2x2ZSIsInJlamVjdCIsIm9mZnNldFZhbCIsImNvbnNvbGUiLCJsb2ciLCJzZWFyY2giLCJvZmZzZXQiLCJudW1iZXJPZlJlc3VsdHMiLCJzb3J0QnkiLCJyMSIsImRhdGEiLCJjdXN0b21lcnMiLCJyZXN1bHRzIiwiZm9yRWFjaCIsInB1c2giLCJjdXN0b21lclJlc3VsdCIsImRvYyIsInBhZ2VkRGF0YSIsInRvdGFsUmVzdWx0cyIsIlRvdGFsUGFnZXMiLCJyZXBsYWNlIiwiZGlyIiwic2t5Ym94IiwiaGdldGFsbCIsInRoZW4iLCJ1c2VyIiwiY3VzdG9tZXIiLCJobXNldCIsInJlc3VsdCJdLCJtYXBwaW5ncyI6Ijs7Ozs7Ozs7OztBQUFBLElBQUlBLFFBQVFDLFFBQVEsT0FBUixDQUFaO0FBQ0EsSUFBSUMsU0FBU0QsUUFBUSxlQUFSLENBQWI7QUFDQSxJQUFJRSxjQUFjRixRQUFRLGtCQUFSLENBQWxCOztJQUVhRyxlLFdBQUFBLGU7QUFDVCwrQkFBYztBQUFBOztBQUNWLGFBQUtDLFFBQUwsR0FBZ0JGLFlBQVlILEtBQVosRUFBbUIsZUFBbkIsRUFBb0M7QUFDaERNLDJCQUFlSixPQUFPSztBQUQwQixTQUFwQyxDQUFoQjtBQUdIOzs7O3NDQUVhQyxJLEVBQU1DLFEsRUFBVTtBQUFBOztBQUMxQixtQkFBTyxJQUFJQyxPQUFKLENBQVksVUFBQ0MsT0FBRCxFQUFVQyxNQUFWLEVBQXFCO0FBQ3BDLG9CQUFJQyxZQUFZLENBQUNMLE9BQU8sQ0FBUixJQUFhQyxRQUE3QjtBQUNBSyx3QkFBUUMsR0FBUixDQUFZLFlBQVVGLFNBQXRCOztBQUVBLHNCQUFLUixRQUFMLENBQWNXLE1BQWQsQ0FBcUIsR0FBckIsRUFBMEI7QUFDdEJDLDRCQUFPSixTQURlO0FBRXRCSyxxQ0FBaUJULFFBRks7QUFHdEJVLDRCQUFRO0FBSGMsaUJBQTFCLEVBSUcsVUFBQ0MsRUFBRCxFQUFLQyxJQUFMLEVBQWM7QUFDYix3QkFBSUQsRUFBSixFQUNJTixRQUFRQyxHQUFSLENBQVlLLEVBQVo7QUFDSix3QkFBSUUsWUFBWSxFQUFoQjtBQUNDRCx5QkFBS0UsT0FBTCxDQUFhQyxPQUFiLENBQXFCLDBCQUFrQjtBQUNuQ0Ysa0NBQVVHLElBQVYsQ0FBZUMsZUFBZUMsR0FBOUI7QUFFSCxxQkFIRDtBQUlBYiw0QkFBUUMsR0FBUixDQUFZTyxTQUFaO0FBQ0Esd0JBQUlNLFlBQVk7QUFDYk4sbUNBQVVBLFNBREc7QUFFYk8sc0NBQWVSLEtBQUtRLFlBRlA7QUFHYnJCLDhCQUFPQSxJQUhNO0FBSWJDLGtDQUFVQSxRQUpHO0FBS2JxQixvQ0FBY1QsS0FBS1EsWUFBTCxHQUFrQnBCO0FBTG5CLHFCQUFoQjtBQU9ERSw0QkFBUWlCLFNBQVI7QUFDQWQsNEJBQVFDLEdBQVIsQ0FBWU8sU0FBWjtBQUVILGlCQXZCRDtBQXdCSCxhQTVCTSxDQUFQO0FBK0JIOzs7d0NBQ2VOLE0sRUFBT1IsSSxFQUFLQyxRLEVBQVM7QUFBQTs7QUFDakMsbUJBQU8sSUFBSUMsT0FBSixDQUFZLFVBQUNDLE9BQUQsRUFBVUMsTUFBVixFQUFxQjtBQUNwQyxvQkFBSUMsWUFBWSxDQUFDTCxPQUFPLENBQVIsSUFBYUMsUUFBN0I7QUFDQUssd0JBQVFDLEdBQVIsQ0FBWSxZQUFVRixTQUF0Qjs7QUFFQSx1QkFBS1IsUUFBTCxDQUFjVyxNQUFkLENBQXFCQSxPQUFPZSxPQUFQLENBQWUsR0FBZixFQUFtQixHQUFuQixJQUF3QixHQUE3QyxFQUFrRDtBQUM5Q2QsNEJBQU9KLFNBRHVDO0FBRTlDSyxxQ0FBaUJULFFBRjZCO0FBRzlDVSw0QkFBUSxRQUhzQztBQUk5Q2EseUJBQU07QUFKd0MsaUJBQWxELEVBS0csVUFBQ1osRUFBRCxFQUFLQyxJQUFMLEVBQWM7QUFDYlAsNEJBQVFDLEdBQVIsQ0FBWU0sSUFBWjtBQUNBLHdCQUFJQyxZQUFZLEVBQWhCO0FBQ0NELHlCQUFLRSxPQUFMLENBQWFDLE9BQWIsQ0FBcUIsMEJBQWtCO0FBQ25DRixrQ0FBVUcsSUFBVixDQUFlQyxlQUFlQyxHQUE5QjtBQUVILHFCQUhEO0FBSUFiLDRCQUFRQyxHQUFSLENBQVlPLFNBQVo7QUFDQSx3QkFBSU0sWUFBWTtBQUNiTixtQ0FBVUEsU0FERztBQUViTyxzQ0FBZVIsS0FBS1EsWUFGUDtBQUdickIsOEJBQU9BLElBSE07QUFJYkMsa0NBQVVBLFFBSkc7QUFLYnFCLG9DQUFjVCxLQUFLUSxZQUFMLEdBQWtCcEI7QUFMbkIscUJBQWhCO0FBT0RFLDRCQUFRaUIsU0FBUjtBQUNBO0FBQ0FkLDRCQUFRQyxHQUFSLENBQVlPLFNBQVo7QUFDQTtBQUNBOztBQUVBOztBQUVBO0FBQ0gsaUJBN0JEO0FBOEJILGFBbENNLENBQVA7QUFvQ0g7OztvQ0FFV1csTSxFQUFPO0FBQ2YsbUJBQU8sSUFBSXZCLE9BQUosQ0FBWSxVQUFDQyxPQUFELEVBQVVDLE1BQVYsRUFBcUI7QUFDdENWLHVCQUFPZ0MsT0FBUCxDQUFlLGdCQUFjRCxNQUE3QixFQUFxQ0UsSUFBckMsQ0FBMEMsVUFBQ0MsSUFBRCxFQUFRO0FBQzlDdEIsNEJBQVFDLEdBQVIsQ0FBWXFCLElBQVo7QUFDQXpCLDRCQUFReUIsSUFBUjtBQUNILGlCQUhEO0FBSUQsYUFMTSxDQUFQO0FBTUg7OztxQ0FDWUMsUSxFQUFTO0FBQ2xCLG1CQUFPLElBQUkzQixPQUFKLENBQVksVUFBQ0MsT0FBRCxFQUFTQyxNQUFULEVBQWtCO0FBQ2pDVix1QkFBT29DLEtBQVAsQ0FBYSxnQkFBY0QsU0FBU0osTUFBcEMsRUFBMkNJLFFBQTNDLEVBQXFERixJQUFyRCxDQUEwRCxVQUFDSSxNQUFELEVBQVU7QUFDaEU1Qiw0QkFBUTRCLE1BQVI7QUFDSCxpQkFGRDtBQUdILGFBSk0sQ0FBUDtBQUtIIiwiZmlsZSI6IlJlZGlzU2VydmljZXMvQ3VzdG9tZXJTZXJ2aWNlLmpzIiwic291cmNlc0NvbnRlbnQiOlsidmFyIHJlZGlzID0gcmVxdWlyZSgncmVkaXMnKTtcbnZhciBscmVkaXMgPSByZXF1aXJlKCcuL3JlZGlzLWxvY2FsJyk7XG52YXIgcmVkaXNTZWFyY2ggPSByZXF1aXJlKCdyZWRpc2VhcmNoY2xpZW50Jyk7XG5cbmV4cG9ydCBjbGFzcyBDdXN0b21lclNlcnZpY2Uge1xuICAgIGNvbnN0cnVjdG9yKCkge1xuICAgICAgICB0aGlzLm15U2VhcmNoID0gcmVkaXNTZWFyY2gocmVkaXMsICd0ZXc6Y3VzdG9tZXJzJywge1xuICAgICAgICAgICAgY2xpZW50T3B0aW9uczogbHJlZGlzLnNlYXJjaENsaWVudERldGFpbHNcbiAgICAgICAgfSk7XG4gICAgfVxuXG4gICAgbGlzdEN1c3RvbWVycyhwYWdlLCBwYWdlU2l6ZSkge1xuICAgICAgICByZXR1cm4gbmV3IFByb21pc2UoKHJlc29sdmUsIHJlamVjdCkgPT4ge1xuICAgICAgICAgICAgdmFyIG9mZnNldFZhbCA9IChwYWdlIC0gMSkgKiBwYWdlU2l6ZTtcbiAgICAgICAgICAgIGNvbnNvbGUubG9nKCdvZmZzZXQgJytvZmZzZXRWYWwpO1xuICAgICAgICAgICAgXG4gICAgICAgICAgICB0aGlzLm15U2VhcmNoLnNlYXJjaChcIipcIiwge1xuICAgICAgICAgICAgICAgIG9mZnNldDpvZmZzZXRWYWwsXG4gICAgICAgICAgICAgICAgbnVtYmVyT2ZSZXN1bHRzOiBwYWdlU2l6ZSxcbiAgICAgICAgICAgICAgICBzb3J0Qnk6IFwic3ZhbHVlXCJcbiAgICAgICAgICAgIH0sIChyMSwgZGF0YSkgPT4ge1xuICAgICAgICAgICAgICAgIGlmIChyMSlcbiAgICAgICAgICAgICAgICAgICAgY29uc29sZS5sb2cocjEpO1xuICAgICAgICAgICAgICAgIHZhciBjdXN0b21lcnMgPSBbXTsgXG4gICAgICAgICAgICAgICAgIGRhdGEucmVzdWx0cy5mb3JFYWNoKGN1c3RvbWVyUmVzdWx0ID0+IHtcbiAgICAgICAgICAgICAgICAgICAgIGN1c3RvbWVycy5wdXNoKGN1c3RvbWVyUmVzdWx0LmRvYyk7ICAgIFxuICAgICAgICAgICAgICAgICAgICBcbiAgICAgICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICAgICAgIGNvbnNvbGUubG9nKGN1c3RvbWVycyk7XG4gICAgICAgICAgICAgICAgIHZhciBwYWdlZERhdGEgPSB7XG4gICAgICAgICAgICAgICAgICAgIGN1c3RvbWVyczpjdXN0b21lcnMsXG4gICAgICAgICAgICAgICAgICAgIHRvdGFsUmVzdWx0cyA6IGRhdGEudG90YWxSZXN1bHRzLFxuICAgICAgICAgICAgICAgICAgICBwYWdlIDogcGFnZSxcbiAgICAgICAgICAgICAgICAgICAgcGFnZVNpemU6IHBhZ2VTaXplLCBcbiAgICAgICAgICAgICAgICAgICAgVG90YWxQYWdlcyA6IChkYXRhLnRvdGFsUmVzdWx0cy9wYWdlU2l6ZSlcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgcmVzb2x2ZShwYWdlZERhdGEpO1xuICAgICAgICAgICAgICAgIGNvbnNvbGUubG9nKGN1c3RvbWVycyk7XG4gICAgICAgICAgICAgICAgXG4gICAgICAgICAgICB9KTtcbiAgICAgICAgfSlcblxuXG4gICAgfVxuICAgIHNlYXJjaEN1c3RvbWVycyhzZWFyY2gscGFnZSxwYWdlU2l6ZSl7XG4gICAgICAgIHJldHVybiBuZXcgUHJvbWlzZSgocmVzb2x2ZSwgcmVqZWN0KSA9PiB7XG4gICAgICAgICAgICB2YXIgb2Zmc2V0VmFsID0gKHBhZ2UgLSAxKSAqIHBhZ2VTaXplO1xuICAgICAgICAgICAgY29uc29sZS5sb2coJ29mZnNldCAnK29mZnNldFZhbCk7XG4gICAgICAgICAgICBcbiAgICAgICAgICAgIHRoaXMubXlTZWFyY2guc2VhcmNoKHNlYXJjaC5yZXBsYWNlKFwiQFwiLFwiIFwiKSsnKicsIHtcbiAgICAgICAgICAgICAgICBvZmZzZXQ6b2Zmc2V0VmFsLFxuICAgICAgICAgICAgICAgIG51bWJlck9mUmVzdWx0czogcGFnZVNpemUsXG4gICAgICAgICAgICAgICAgc29ydEJ5OiBcInN2YWx1ZVwiLFxuICAgICAgICAgICAgICAgIGRpciA6IFwiQVNDXCJcbiAgICAgICAgICAgIH0sIChyMSwgZGF0YSkgPT4ge1xuICAgICAgICAgICAgICAgIGNvbnNvbGUubG9nKGRhdGEpO1xuICAgICAgICAgICAgICAgIHZhciBjdXN0b21lcnMgPSBbXTsgXG4gICAgICAgICAgICAgICAgIGRhdGEucmVzdWx0cy5mb3JFYWNoKGN1c3RvbWVyUmVzdWx0ID0+IHtcbiAgICAgICAgICAgICAgICAgICAgIGN1c3RvbWVycy5wdXNoKGN1c3RvbWVyUmVzdWx0LmRvYyk7ICAgIFxuICAgICAgICAgICAgICAgICAgICBcbiAgICAgICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICAgICAgIGNvbnNvbGUubG9nKGN1c3RvbWVycyk7XG4gICAgICAgICAgICAgICAgIHZhciBwYWdlZERhdGEgPSB7XG4gICAgICAgICAgICAgICAgICAgIGN1c3RvbWVyczpjdXN0b21lcnMsXG4gICAgICAgICAgICAgICAgICAgIHRvdGFsUmVzdWx0cyA6IGRhdGEudG90YWxSZXN1bHRzLFxuICAgICAgICAgICAgICAgICAgICBwYWdlIDogcGFnZSxcbiAgICAgICAgICAgICAgICAgICAgcGFnZVNpemU6IHBhZ2VTaXplLCBcbiAgICAgICAgICAgICAgICAgICAgVG90YWxQYWdlcyA6IChkYXRhLnRvdGFsUmVzdWx0cy9wYWdlU2l6ZSlcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgcmVzb2x2ZShwYWdlZERhdGEpO1xuICAgICAgICAgICAgICAgIC8vUHJvbWlzZS5hbGwoKVxuICAgICAgICAgICAgICAgIGNvbnNvbGUubG9nKGN1c3RvbWVycyk7XG4gICAgICAgICAgICAgICAgLy8gUHJvbWlzZS5hbGwoY3VzdG9tZXJzLm1hcChscmVkaXMuaGdldGFsbCkpLnRoZW4oZnVuY3Rpb24gKG93bmVyc1Jlc3VsdCkge1xuICAgICAgICAgICAgICAgIC8vICAgICBjb25zb2xlLmxvZyhvd25lcnNSZXN1bHQpO1xuICAgICAgICAgICAgICAgICAgIFxuICAgICAgICAgICAgICAgIC8vIH0pO1xuICAgICAgICAgICAgICAgXG4gICAgICAgICAgICAgICAgLy9jb25zb2xlLmxvZyhyMik7IFxuICAgICAgICAgICAgfSk7XG4gICAgICAgIH0pXG5cbiAgICB9XG5cbiAgICBnZXRDdXN0b21lcihza3lib3gpe1xuICAgICAgICByZXR1cm4gbmV3IFByb21pc2UoKHJlc29sdmUsIHJlamVjdCkgPT4ge1xuICAgICAgICAgIGxyZWRpcy5oZ2V0YWxsKFwidGV3Om93bmVyczpcIitza3lib3gpLnRoZW4oKHVzZXIpPT57XG4gICAgICAgICAgICAgIGNvbnNvbGUubG9nKHVzZXIpOyBcbiAgICAgICAgICAgICAgcmVzb2x2ZSh1c2VyKTsgXG4gICAgICAgICAgfSlcbiAgICAgICAgfSlcbiAgICB9IFxuICAgIHNhdmVDdXN0b21lcihjdXN0b21lcil7IFxuICAgICAgICByZXR1cm4gbmV3IFByb21pc2UoKHJlc29sdmUscmVqZWN0KT0+e1xuICAgICAgICAgICAgbHJlZGlzLmhtc2V0KFwidGV3Om93bmVyczpcIitjdXN0b21lci5za3lib3gsY3VzdG9tZXIpLnRoZW4oKHJlc3VsdCk9PntcbiAgICAgICAgICAgICAgICByZXNvbHZlKHJlc3VsdCk7XG4gICAgICAgICAgICB9KTsgXG4gICAgICAgIH0pO1xuICAgIH1cbn0iXX0=
