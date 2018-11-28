'use strict';

Object.defineProperty(exports, "__esModule", {
    value: true
});

var _createClass = function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; }();

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

var dataContext = require('./dataContext');
var SERVICE_KEY = 'manifest';

var ManifestService = exports.ManifestService = function () {
    function ManifestService() {
        _classCallCheck(this, ManifestService);
    }

    _createClass(ManifestService, [{
        key: 'createManfiest',
        value: function createManfiest(username, mtype) {
            console.log("about to create the manifest");
            return new Promise(function (resolve, reject) {
                dataContext.getServiceProxy(SERVICE_KEY).createManifest({ username: username, mtype: mtype }, function (error, result) {
                    if (error) {
                        reject(error);
                    }
                    resolve(result);
                });
            });
        }
    }, {
        key: 'listAllManifest',
        value: function listAllManifest(mtype) {
            return new Promise(function (resolve, reject) {
                dataContext.getServiceProxy(SERVICE_KEY).listManifest({ mtype: mtype }, function (error, result) {
                    if (error) {
                        reject(error);
                    }
                    resolve(result);
                });
            });
        }
    }, {
        key: 'getManifest',
        value: function getManifest(mid) {
            return new Promise(function (resolve, reject) {
                dataContext.getServiceProxy(SERVICE_KEY).getManifest({ mid: mid }, function (error, result) {
                    if (error) {
                        reject(error);
                    }
                    resolve(result);
                });
            });
        }
    }, {
        key: 'closeManifest',
        value: function closeManifest(mid, stage, username) {
            return new Promise(function (resolve, reject) {
                dataContext.getServiceProxy(SERVICE_KEY).closeManifest({ mid: mid, stage: stage, username: username }, function (error, result) {
                    if (error) {
                        reject(error);
                    }
                    resolve(result);
                });
            });
        }
    }, {
        key: 'exportExcel',
        value: function exportExcel(mid, packages, path) {

            return new Promise(function (resolve, reject) {
                console.log('the path we have her is ' + path);
                dataContext.getServiceProxy(SERVICE_KEY).exportManifestXLS({ mid: mid, packages: packages, dir_loc: path }, function (error, result) {
                    if (error) {
                        reject(error);
                    }
                    resolve(result);
                });
            });
        }
    }, {
        key: 'verifyManifest',
        value: function verifyManifest(mid, path) {
            console.log('the path we have here is ' + path);
            return new Promise(function (resolve, reject) {
                console.log('the path we have her is ' + path);
                dataContext.getServiceProxy(SERVICE_KEY).verifyManifestXls({ mid: mid, file: path }, function (error, result) {
                    if (error) {
                        reject(error);
                    }
                    resolve(result);
                });
            });
        }
    }, {
        key: 'getAwb',
        value: function getAwb(mid, template, weight, value, pieces) {

            return new Promise(function (resolve, reject) {
                dataContext.getServiceProxy(SERVICE_KEY).generateAwb({ mid: mid, template: template, totalWeight: weight, totalValue: value, pieces: pieces }, function (error, result) {
                    if (error) {
                        reject(error);
                    }
                    resolve(result);
                });
            });
        }
    }, {
        key: 'emailBroker',
        value: function emailBroker(emailBrokerRequest) {
            return new Promise(function (resolve, reject) {
                dataContext.getServiceProxy(SERVICE_KEY).emailBroker(emailBrokerRequest, function (error, result) {
                    if (error) {
                        reject(error);
                    }
                    resolve(result);
                });
            });
        }
    }, {
        key: 'shipManifest',
        value: function shipManifest(mid, awb, username) {
            return new Promise(function (resolve, reject) {
                dataContext.getServiceProxy(SERVICE_KEY).shipManifest({ mid: mid, awb: awb, username: username }, function (error, result) {
                    if (error) {
                        reject(error);
                    }
                    resolve(result);
                });
            });
        }
    }]);

    return ManifestService;
}();
//# sourceMappingURL=data:application/json;charset=utf8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIkRhdGFTZXJ2aWNlcy9NYW5pZmVzdFNlcnZpY2UuZXM2Il0sIm5hbWVzIjpbImRhdGFDb250ZXh0IiwicmVxdWlyZSIsIlNFUlZJQ0VfS0VZIiwiTWFuaWZlc3RTZXJ2aWNlIiwidXNlcm5hbWUiLCJtdHlwZSIsImNvbnNvbGUiLCJsb2ciLCJQcm9taXNlIiwicmVzb2x2ZSIsInJlamVjdCIsImdldFNlcnZpY2VQcm94eSIsImNyZWF0ZU1hbmlmZXN0IiwiZXJyb3IiLCJyZXN1bHQiLCJsaXN0TWFuaWZlc3QiLCJtaWQiLCJnZXRNYW5pZmVzdCIsInN0YWdlIiwiY2xvc2VNYW5pZmVzdCIsInBhY2thZ2VzIiwicGF0aCIsImV4cG9ydE1hbmlmZXN0WExTIiwiZGlyX2xvYyIsInZlcmlmeU1hbmlmZXN0WGxzIiwiZmlsZSIsInRlbXBsYXRlIiwid2VpZ2h0IiwidmFsdWUiLCJwaWVjZXMiLCJnZW5lcmF0ZUF3YiIsInRvdGFsV2VpZ2h0IiwidG90YWxWYWx1ZSIsImVtYWlsQnJva2VyUmVxdWVzdCIsImVtYWlsQnJva2VyIiwiYXdiIiwic2hpcE1hbmlmZXN0Il0sIm1hcHBpbmdzIjoiOzs7Ozs7Ozs7O0FBQUEsSUFBSUEsY0FBY0MsUUFBUSxlQUFSLENBQWxCO0FBQ0EsSUFBTUMsY0FBYyxVQUFwQjs7SUFFYUMsZSxXQUFBQSxlO0FBQ1QsK0JBQWM7QUFBQTtBQUViOzs7O3VDQUNjQyxRLEVBQVNDLEssRUFBTTtBQUMxQkMsb0JBQVFDLEdBQVIsQ0FBWSw4QkFBWjtBQUNBLG1CQUFPLElBQUlDLE9BQUosQ0FBYSxVQUFTQyxPQUFULEVBQWlCQyxNQUFqQixFQUF3QjtBQUN4Q1YsNEJBQVlXLGVBQVosQ0FBNEJULFdBQTVCLEVBQXlDVSxjQUF6QyxDQUF3RCxFQUFDUixVQUFTQSxRQUFWLEVBQW1CQyxPQUFNQSxLQUF6QixFQUF4RCxFQUF3RixVQUFTUSxLQUFULEVBQWVDLE1BQWYsRUFBc0I7QUFDMUcsd0JBQUlELEtBQUosRUFBVTtBQUNOSCwrQkFBT0cs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aWNlcy9NYW5pZmVzdFNlcnZpY2UuanMiLCJzb3VyY2VzQ29udGVudCI6WyJ2YXIgZGF0YUNvbnRleHQgPSByZXF1aXJlKCcuL2RhdGFDb250ZXh0Jyk7XHJcbmNvbnN0IFNFUlZJQ0VfS0VZID0gJ21hbmlmZXN0JztcclxuXHJcbmV4cG9ydCBjbGFzcyBNYW5pZmVzdFNlcnZpY2V7XHJcbiAgICBjb25zdHJ1Y3RvciAoKXtcclxuXHJcbiAgICB9XHJcbiAgICBjcmVhdGVNYW5maWVzdCh1c2VybmFtZSxtdHlwZSl7XHJcbiAgICAgICAgY29uc29sZS5sb2coXCJhYm91dCB0byBjcmVhdGUgdGhlIG1hbmlmZXN0XCIpO1xyXG4gICAgICAgIHJldHVybiBuZXcgUHJvbWlzZSAoZnVuY3Rpb24ocmVzb2x2ZSxyZWplY3Qpe1xyXG4gICAgICAgICAgICBkYXRhQ29udGV4dC5nZXRTZXJ2aWNlUHJveHkoU0VSVklDRV9LRVkpLmNyZWF0ZU1hbmlmZXN0KHt1c2VybmFtZTp1c2VybmFtZSxtdHlwZTptdHlwZX0sZnVuY3Rpb24oZXJyb3IscmVzdWx0KXtcclxuICAgICAgICAgICAgICAgIGlmIChlcnJvcil7XHJcbiAgICAgICAgICAgICAgICAgICAgcmVqZWN0KGVycm9yKTtcclxuICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgICAgIHJlc29sdmUoIHJlc3VsdCk7XHJcbiAgICAgICAgICAgIH0pO1xyXG4gICAgICAgIH0pO1xyXG4gICAgfVxyXG4gICAgbGlzdEFsbE1hbmlmZXN0KG10eXBlKXtcclxuICAgICAgICByZXR1cm4gbmV3IFByb21pc2UgKGZ1bmN0aW9uKHJlc29sdmUscmVqZWN0KXtcclxuICAgICAgICAgICAgZGF0YUNvbnRleHQuZ2V0U2VydmljZVByb3h5KFNFUlZJQ0VfS0VZKS5saXN0TWFuaWZlc3Qoe210eXBlOm10eXBlfSxmdW5jdGlvbihlcnJvcixyZXN1bHQpe1xyXG4gICAgICAgICAgICAgICAgaWYgKGVycm9yKXtcclxuICAgICAgICAgICAgICAgICAgICByZWplY3QoZXJyb3IpO1xyXG4gICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICAgICAgcmVzb2x2ZSggcmVzdWx0KTtcclxuICAgICAgICAgICAgfSk7XHJcbiAgICAgICAgfSk7XHJcbiAgICB9XHJcbiAgICBnZXRNYW5pZmVzdChtaWQpe1xyXG4gICAgICAgIHJldHVybiBuZXcgUHJvbWlzZSAoZnVuY3Rpb24ocmVzb2x2ZSxyZWplY3Qpe1xyXG4gICAgICAgICAgICBkYXRhQ29udGV4dC5nZXRTZXJ2aWNlUHJveHkoU0VSVklDRV9LRVkpLmdldE1hbmlmZXN0KHttaWQ6bWlkfSxmdW5jdGlvbihlcnJvcixyZXN1bHQpe1xyXG4gICAgICAgICAgICAgICAgaWYgKGVycm9yKXtcclxuICAgICAgICAgICAgICAgICAgICByZWplY3QoZXJyb3IpO1xyXG4gICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICAgICAgcmVzb2x2ZSggcmVzdWx0KTtcclxuICAgICAgICAgICAgfSk7XHJcbiAgICAgICAgfSk7XHJcbiAgICB9XHJcbiAgICBjbG9zZU1hbmlmZXN0KG1pZCxzdGFnZSx1c2VybmFtZSl7XHJcbiAgICAgICAgcmV0dXJuIG5ldyBQcm9taXNlIChmdW5jdGlvbihyZXNvbHZlLHJlamVjdCl7XHJcbiAgICAgICAgICAgIGRhdGFDb250ZXh0LmdldFNlcnZpY2VQcm94eShTRVJWSUNFX0tFWSkuY2xvc2VNYW5pZmVzdCh7bWlkOm1pZCxzdGFnZTpzdGFnZSx1c2VybmFtZTp1c2VybmFtZX0sZnVuY3Rpb24oZXJyb3IscmVzdWx0KXtcclxuICAgICAgICAgICAgICAgIGlmIChlcnJvcil7XHJcbiAgICAgICAgICAgICAgICAgICAgcmVqZWN0KGVycm9yKTtcclxuICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgICAgIHJlc29sdmUoIHJlc3VsdCk7XHJcbiAgICAgICAgICAgIH0pO1xyXG4gICAgICAgIH0pO1xyXG4gICAgfVxyXG4gICAgZXhwb3J0RXhjZWwobWlkLHBhY2thZ2VzLHBhdGgpe1xyXG4gICAgICAgIFxyXG4gICAgICAgIHJldHVybiBuZXcgUHJvbWlzZSAoZnVuY3Rpb24ocmVzb2x2ZSxyZWplY3Qpe1xyXG4gICAgICAgICAgICBjb25zb2xlLmxvZygndGhlIHBhdGggd2UgaGF2ZSBoZXIgaXMgJysgcGF0aCk7XHJcbiAgICAgICAgICAgIGRhdGFDb250ZXh0LmdldFNlcnZpY2VQcm94eShTRVJWSUNFX0tFWSkuZXhwb3J0TWFuaWZlc3RYTFMoe21pZDptaWQscGFja2FnZXM6cGFja2FnZXMsZGlyX2xvYzpwYXRofSxmdW5jdGlvbihlcnJvcixyZXN1bHQpe1xyXG4gICAgICAgICAgICAgICAgaWYgKGVycm9yKXtcclxuICAgICAgICAgICAgICAgICAgICByZWplY3QoZXJyb3IpO1xyXG4gICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICAgICAgcmVzb2x2ZSggcmVzdWx0KTtcclxuICAgICAgICAgICAgfSk7XHJcbiAgICAgICAgfSk7XHJcbiAgICB9XHJcbiAgICB2ZXJpZnlNYW5pZmVzdCAobWlkLCBwYXRoKXtcclxuICAgICAgICBjb25zb2xlLmxvZygndGhlIHBhdGggd2UgaGF2ZSBoZXJlIGlzICcrIHBhdGgpO1xyXG4gICAgICAgIHJldHVybiBuZXcgUHJvbWlzZSAoZnVuY3Rpb24ocmVzb2x2ZSxyZWplY3Qpe1xyXG4gICAgICAgICAgICBjb25zb2xlLmxvZygndGhlIHBhdGggd2UgaGF2ZSBoZXIgaXMgJysgcGF0aCk7XHJcbiAgICAgICAgICAgIGRhdGFDb250ZXh0LmdldFNlcnZpY2VQcm94eShTRVJWSUNFX0tFWSkudmVyaWZ5TWFuaWZlc3RYbHMoe21pZDptaWQsZmlsZTpwYXRofSxmdW5jdGlvbihlcnJvcixyZXN1bHQpe1xyXG4gICAgICAgICAgICAgICAgaWYgKGVycm9yKXtcclxuICAgICAgICAgICAgICAgICAgICByZWplY3QoZXJyb3IpO1xyXG4gICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICAgICAgcmVzb2x2ZSggcmVzdWx0KTtcclxuICAgICAgICAgICAgfSk7XHJcbiAgICAgICAgfSk7XHJcbiAgICB9XHJcbiAgICBnZXRBd2IobWlkLHRlbXBsYXRlLHdlaWdodCx2YWx1ZSxwaWVjZXMpe1xyXG4gICAgICAgIFxyXG4gICAgICAgIHJldHVybiBuZXcgUHJvbWlzZSAoZnVuY3Rpb24ocmVzb2x2ZSxyZWplY3Qpe1xyXG4gICAgICAgICAgICBkYXRhQ29udGV4dC5nZXRTZXJ2aWNlUHJveHkoU0VSVklDRV9LRVkpLmdlbmVyYXRlQXdiKHttaWQ6bWlkLHRlbXBsYXRlOnRlbXBsYXRlLHRvdGFsV2VpZ2h0OndlaWdodCx0b3RhbFZhbHVlOiB2YWx1ZSwgcGllY2VzOnBpZWNlc30sZnVuY3Rpb24oZXJyb3IscmVzdWx0KXtcclxuICAgICAgICAgICAgICAgIGlmIChlcnJvcil7XHJcbiAgICAgICAgICAgICAgICAgICAgcmVqZWN0KGVycm9yKTtcclxuICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgICAgIHJlc29sdmUoIHJlc3VsdCk7XHJcbiAgICAgICAgICAgIH0pO1xyXG4gICAgICAgIH0pO1xyXG4gICAgfVxyXG4gICAgZW1haWxCcm9rZXIoZW1haWxCcm9rZXJSZXF1ZXN0KXtcclxuICAgICAgICByZXR1cm4gbmV3IFByb21pc2UgKGZ1bmN0aW9uKHJlc29sdmUscmVqZWN0KXtcclxuICAgICAgICAgICAgZGF0YUNvbnRleHQuZ2V0U2VydmljZVByb3h5KFNFUlZJQ0VfS0VZKS5lbWFpbEJyb2tlcihlbWFpbEJyb2tlclJlcXVlc3QsZnVuY3Rpb24oZXJyb3IscmVzdWx0KXtcclxuICAgICAgICAgICAgICAgIGlmIChlcnJvcil7XHJcbiAgICAgICAgICAgICAgICAgICAgcmVqZWN0KGVycm9yKTtcclxuICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgICAgIHJlc29sdmUoIHJlc3VsdCk7XHJcbiAgICAgICAgICAgIH0pO1xyXG4gICAgICAgIH0pOyBcclxuICAgIH1cclxuICAgIHNoaXBNYW5pZmVzdChtaWQsYXdiLHVzZXJuYW1lKXtcclxuICAgICAgICByZXR1cm4gbmV3IFByb21pc2UgKGZ1bmN0aW9uKHJlc29sdmUscmVqZWN0KXtcclxuICAgICAgICAgICAgZGF0YUNvbnRleHQuZ2V0U2VydmljZVByb3h5KFNFUlZJQ0VfS0VZKS5zaGlwTWFuaWZlc3Qoe21pZDptaWQsYXdiOmF3Yix1c2VybmFtZTp1c2VybmFtZX0sZnVuY3Rpb24oZXJyb3IscmVzdWx0KXtcclxuICAgICAgICAgICAgICAgIGlmIChlcnJvcil7XHJcbiAgICAgICAgICAgICAgICAgICAgcmVqZWN0KGVycm9yKTtcclxuICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgICAgIHJlc29sdmUoIHJlc3VsdCk7XHJcbiAgICAgICAgICAgIH0pO1xyXG4gICAgICAgIH0pO1xyXG4gICAgfVxyXG59Il19
