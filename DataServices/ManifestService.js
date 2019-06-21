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
        value: function exportExcel(title, mtype, packages, path) {

            return new Promise(function (resolve, reject) {
                console.log('the path we have her is ' + path);
                dataContext.getServiceProxy(SERVICE_KEY).exportManifestXLS({ title: title, mytype: mtype, packages: packages, dir_loc: path }, function (error, result) {
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
        key: 'alertCustomer',
        value: function alertCustomer(customerAlertRequest) {
            return new Promise(function (resolve, reject) {
                dataContext.getServiceProxy(SERVICE_KEY).alertRecAlert(customerAlertRequest, function (error, result) {
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
//# sourceMappingURL=data:application/json;charset=utf8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIkRhdGFTZXJ2aWNlcy9NYW5pZmVzdFNlcnZpY2UuZXM2Il0sIm5hbWVzIjpbImRhdGFDb250ZXh0IiwicmVxdWlyZSIsIlNFUlZJQ0VfS0VZIiwiTWFuaWZlc3RTZXJ2aWNlIiwidXNlcm5hbWUiLCJtdHlwZSIsImNvbnNvbGUiLCJsb2ciLCJQcm9taXNlIiwicmVzb2x2ZSIsInJlamVjdCIsImdldFNlcnZpY2VQcm94eSIsImNyZWF0ZU1hbmlmZXN0IiwiZXJyb3IiLCJyZXN1bHQiLCJsaXN0TWFuaWZlc3QiLCJtaWQiLCJnZXRNYW5pZmVzdCIsInN0YWdlIiwiY2xvc2VNYW5pZmVzdCIsInRpdGxlIiwicGFja2FnZXMiLCJwYXRoIiwiZXhwb3J0TWFuaWZlc3RYTFMiLCJteXR5cGUiLCJkaXJfbG9jIiwidmVyaWZ5TWFuaWZlc3RYbHMiLCJmaWxlIiwidGVtcGxhdGUiLCJ3ZWlnaHQiLCJ2YWx1ZSIsInBpZWNlcyIsImdlbmVyYXRlQXdiIiwidG90YWxXZWlnaHQiLCJ0b3RhbFZhbHVlIiwiZW1haWxCcm9rZXJSZXF1ZXN0IiwiZW1haWxCcm9rZXIiLCJjdXN0b21lckFsZXJ0UmVxdWVzdCIsImFsZXJ0UmVjQWxlcnQiLCJhd2IiLCJzaGlwTWFuaWZlc3QiXSwibWFwcGluZ3MiOiI7Ozs7Ozs7Ozs7QUFBQSxJQUFJQSxjQUFjQyxRQUFRLGVBQVIsQ0FBbEI7QUFDQSxJQUFNQyxjQUFjLFVBQXBCOztJQUVhQyxlLFdBQUFBLGU7QUFDVCwrQkFBYztBQUFBO0FBRWI7Ozs7dUNBQ2NDLFEsRUFBU0MsSyxFQUFNO0FBQzFCQyxvQkFBUUMsR0FBUixDQUFZLDhCQUFaO0FBQ0EsbUJBQU8sSUFBSUMsT0FBSixDQUFhLFVBQVNDLE9BQVQsRUFBaUJDLE1BQWpCLEVBQXdCO0FBQ3hDViw0QkFBWVcsZUFBWixDQUE0QlQsV0FBNUIsRUFBeUNVLGNBQXpDLENBQXdELEVBQUNSLFVBQVNBLFFBQVYsRUFBbUJDLE9BQU1BLEtBQXpCLEVBQXhELEVBQXdGLFVBQVNRLEtB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QVFIOzs7cUNBQ1lFLEcsRUFBSXVCLEcsRUFBSW5DLFEsRUFBUztBQUMxQixtQkFBTyxJQUFJSSxPQUFKLENBQWEsVUFBU0MsT0FBVCxFQUFpQkMsTUFBakIsRUFBd0I7QUFDeENWLDRCQUFZVyxlQUFaLENBQTRCVCxXQUE1QixFQUF5Q3NDLFlBQXpDLENBQXNELEVBQUN4QixLQUFJQSxHQUFMLEVBQVN1QixLQUFJQSxHQUFiLEVBQWlCbkMsVUFBU0EsUUFBMUIsRUFBdEQsRUFBMEYsVUFBU1MsS0FBVCxFQUFlQyxNQUFmLEVBQXNCO0FBQzVHLHdCQUFJRCxLQUFKLEVBQVU7QUFDTkgsK0JBQU9HLEtBQVA7QUFDSDtBQUNESiw0QkFBU0ssTUFBVDtBQUNILGlCQUxEO0FBTUgsYUFQTSxDQUFQO0FBUUgiLCJmaWxlIjoiRGF0YVNlcnZpY2VzL01hbmlmZXN0U2VydmljZS5qcyIsInNvdXJjZXNDb250ZW50IjpbInZhciBkYXRhQ29udGV4dCA9IHJlcXVpcmUoJy4vZGF0YUNvbnRleHQnKTtcbmNvbnN0IFNFUlZJQ0VfS0VZID0gJ21hbmlmZXN0JztcblxuZXhwb3J0IGNsYXNzIE1hbmlmZXN0U2VydmljZXtcbiAgICBjb25zdHJ1Y3RvciAoKXtcblxuICAgIH1cbiAgICBjcmVhdGVNYW5maWVzdCh1c2VybmFtZSxtdHlwZSl7XG4gICAgICAgIGNvbnNvbGUubG9nKFwiYWJvdXQgdG8gY3JlYXRlIHRoZSBtYW5pZmVzdFwiKTtcbiAgICAgICAgcmV0dXJuIG5ldyBQcm9taXNlIChmdW5jdGlvbihyZXNvbHZlLHJlamVjdCl7XG4gICAgICAgICAgICBkYXRhQ29udGV4dC5nZXRTZXJ2aWNlUHJveHkoU0VSVklDRV9LRVkpLmNyZWF0ZU1hbmlmZXN0KHt1c2VybmFtZTp1c2VybmFtZSxtdHlwZTptdHlwZX0sZnVuY3Rpb24oZXJyb3IscmVzdWx0KXtcbiAgICAgICAgICAgICAgICBpZiAoZXJyb3Ipe1xuICAgICAgICAgICAgICAgICAgICByZWplY3QoZXJyb3IpO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICByZXNvbHZlKCByZXN1bHQpO1xuICAgICAgICAgICAgfSk7XG4gICAgICAgIH0pO1xuICAgIH1cbiAgICBsaXN0QWxsTWFuaWZlc3QobXR5cGUpe1xuICAgICAgICByZXR1cm4gbmV3IFByb21pc2UgKGZ1bmN0aW9uKHJlc29sdmUscmVqZWN0KXtcbiAgICAgICAgICAgIGRhdGFDb250ZXh0LmdldFNlcnZpY2VQcm94eShTRVJWSUNFX0tFWSkubGlzdE1hbmlmZXN0KHttdHlwZTptdHlwZX0sZnVuY3Rpb24oZXJyb3IscmVzdWx0KXtcbiAgICAgICAgICAgICAgICBpZiAoZXJyb3Ipe1xuICAgICAgICAgICAgICAgICAgICByZWplY3QoZXJyb3IpO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICByZXNvbHZlKCByZXN1bHQpO1xuICAgICAgICAgICAgfSk7XG4gICAgICAgIH0pO1xuICAgIH1cbiAgICBnZXRNYW5pZmVzdChtaWQpe1xuICAgICAgICByZXR1cm4gbmV3IFByb21pc2UgKGZ1bmN0aW9uKHJlc29sdmUscmVqZWN0KXtcbiAgICAgICAgICAgIGRhdGFDb250ZXh0LmdldFNlcnZpY2VQcm94eShTRVJWSUNFX0tFWSkuZ2V0TWFuaWZlc3Qoe21pZDptaWR9LGZ1bmN0aW9uKGVycm9yLHJlc3VsdCl7XG4gICAgICAgICAgICAgICAgaWYgKGVycm9yKXtcbiAgICAgICAgICAgICAgICAgICAgcmVqZWN0KGVycm9yKTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgcmVzb2x2ZSggcmVzdWx0KTtcbiAgICAgICAgICAgIH0pO1xuICAgICAgICB9KTtcbiAgICB9XG4gICAgY2xvc2VNYW5pZmVzdChtaWQsc3RhZ2UsdXNlcm5hbWUpe1xuICAgICAgICByZXR1cm4gbmV3IFByb21pc2UgKGZ1bmN0aW9uKHJlc29sdmUscmVqZWN0KXtcbiAgICAgICAgICAgIGRhdGFDb250ZXh0LmdldFNlcnZpY2VQcm94eShTRVJWSUNFX0tFWSkuY2xvc2VNYW5pZmVzdCh7bWlkOm1pZCxzdGFnZTpzdGFnZSx1c2VybmFtZTp1c2VybmFtZX0sZnVuY3Rpb24oZXJyb3IscmVzdWx0KXtcbiAgICAgICAgICAgICAgICBpZiAoZXJyb3Ipe1xuICAgICAgICAgICAgICAgICAgICByZWplY3QoZXJyb3IpO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICByZXNvbHZlKCByZXN1bHQpO1xuICAgICAgICAgICAgfSk7XG4gICAgICAgIH0pO1xuICAgIH1cbiAgICBleHBvcnRFeGNlbCh0aXRsZSxtdHlwZSxwYWNrYWdlcyxwYXRoKXtcbiAgICAgICAgXG4gICAgICAgIHJldHVybiBuZXcgUHJvbWlzZSAoZnVuY3Rpb24ocmVzb2x2ZSxyZWplY3Qpe1xuICAgICAgICAgICAgY29uc29sZS5sb2coJ3RoZSBwYXRoIHdlIGhhdmUgaGVyIGlzICcrIHBhdGgpO1xuICAgICAgICAgICAgZGF0YUNvbnRleHQuZ2V0U2VydmljZVByb3h5KFNFUlZJQ0VfS0VZKS5leHBvcnRNYW5pZmVzdFhMUyh7dGl0bGU6dGl0bGUsbXl0eXBlOm10eXBlLHBhY2thZ2VzOnBhY2thZ2VzLGRpcl9sb2M6cGF0aH0sZnVuY3Rpb24oZXJyb3IscmVzdWx0KXtcbiAgICAgICAgICAgICAgICBpZiAoZXJyb3Ipe1xuICAgICAgICAgICAgICAgICAgICByZWplY3QoZXJyb3IpO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICByZXNvbHZlKCByZXN1bHQpO1xuICAgICAgICAgICAgfSk7XG4gICAgICAgIH0pO1xuICAgIH1cbiAgICB2ZXJpZnlNYW5pZmVzdCAobWlkLCBwYXRoKXtcbiAgICAgICAgY29uc29sZS5sb2coJ3RoZSBwYXRoIHdlIGhhdmUgaGVyZSBpcyAnKyBwYXRoKTtcbiAgICAgICAgcmV0dXJuIG5ldyBQcm9taXNlIChmdW5jdGlvbihyZXNvbHZlLHJlamVjdCl7XG4gICAgICAgICAgICBjb25zb2xlLmxvZygndGhlIHBhdGggd2UgaGF2ZSBoZXIgaXMgJysgcGF0aCk7XG4gICAgICAgICAgICBkYXRhQ29udGV4dC5nZXRTZXJ2aWNlUHJveHkoU0VSVklDRV9LRVkpLnZlcmlmeU1hbmlmZXN0WGxzKHttaWQ6bWlkLGZpbGU6cGF0aH0sZnVuY3Rpb24oZXJyb3IscmVzdWx0KXtcbiAgICAgICAgICAgICAgICBpZiAoZXJyb3Ipe1xuICAgICAgICAgICAgICAgICAgICByZWplY3QoZXJyb3IpO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICByZXNvbHZlKCByZXN1bHQpO1xuICAgICAgICAgICAgfSk7XG4gICAgICAgIH0pO1xuICAgIH1cbiAgICBnZXRBd2IobWlkLHRlbXBsYXRlLHdlaWdodCx2YWx1ZSxwaWVjZXMpe1xuICAgICAgICBcbiAgICAgICAgcmV0dXJuIG5ldyBQcm9taXNlIChmdW5jdGlvbihyZXNvbHZlLHJlamVjdCl7XG4gICAgICAgICAgICBkYXRhQ29udGV4dC5nZXRTZXJ2aWNlUHJveHkoU0VSVklDRV9LRVkpLmdlbmVyYXRlQXdiKHttaWQ6bWlkLHRlbXBsYXRlOnRlbXBsYXRlLHRvdGFsV2VpZ2h0OndlaWdodCx0b3RhbFZhbHVlOiB2YWx1ZSwgcGllY2VzOnBpZWNlc30sZnVuY3Rpb24oZXJyb3IscmVzdWx0KXtcbiAgICAgICAgICAgICAgICBpZiAoZXJyb3Ipe1xuICAgICAgICAgICAgICAgICAgICByZWplY3QoZXJyb3IpO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICByZXNvbHZlKCByZXN1bHQpO1xuICAgICAgICAgICAgfSk7XG4gICAgICAgIH0pO1xuICAgIH1cbiAgICBlbWFpbEJyb2tlcihlbWFpbEJyb2tlclJlcXVlc3Qpe1xuICAgICAgICByZXR1cm4gbmV3IFByb21pc2UgKGZ1bmN0aW9uKHJlc29sdmUscmVqZWN0KXtcbiAgICAgICAgICAgIGRhdGFDb250ZXh0LmdldFNlcnZpY2VQcm94eShTRVJWSUNFX0tFWSkuZW1haWxCcm9rZXIoZW1haWxCcm9rZXJSZXF1ZXN0LGZ1bmN0aW9uKGVycm9yLHJlc3VsdCl7XG4gICAgICAgICAgICAgICAgaWYgKGVycm9yKXtcbiAgICAgICAgICAgICAgICAgICAgcmVqZWN0KGVycm9yKTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgcmVzb2x2ZSggcmVzdWx0KTtcbiAgICAgICAgICAgIH0pO1xuICAgICAgICB9KTsgXG4gICAgfVxuICAgIGFsZXJ0Q3VzdG9tZXIoY3VzdG9tZXJBbGVydFJlcXVlc3Qpe1xuICAgICAgICByZXR1cm4gbmV3IFByb21pc2UgKGZ1bmN0aW9uKHJlc29sdmUscmVqZWN0KXtcbiAgICAgICAgICAgIGRhdGFDb250ZXh0LmdldFNlcnZpY2VQcm94eShTRVJWSUNFX0tFWSkuYWxlcnRSZWNBbGVydChjdXN0b21lckFsZXJ0UmVxdWVzdCxmdW5jdGlvbihlcnJvcixyZXN1bHQpe1xuICAgICAgICAgICAgICAgIGlmIChlcnJvcil7XG4gICAgICAgICAgICAgICAgICAgIHJlamVjdChlcnJvcik7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIHJlc29sdmUoIHJlc3VsdCk7XG4gICAgICAgICAgICB9KTtcbiAgICAgICAgfSk7IFxuICAgIH1cbiAgICBzaGlwTWFuaWZlc3QobWlkLGF3Yix1c2VybmFtZSl7XG4gICAgICAgIHJldHVybiBuZXcgUHJvbWlzZSAoZnVuY3Rpb24ocmVzb2x2ZSxyZWplY3Qpe1xuICAgICAgICAgICAgZGF0YUNvbnRleHQuZ2V0U2VydmljZVByb3h5KFNFUlZJQ0VfS0VZKS5zaGlwTWFuaWZlc3Qoe21pZDptaWQsYXdiOmF3Yix1c2VybmFtZTp1c2VybmFtZX0sZnVuY3Rpb24oZXJyb3IscmVzdWx0KXtcbiAgICAgICAgICAgICAgICBpZiAoZXJyb3Ipe1xuICAgICAgICAgICAgICAgICAgICByZWplY3QoZXJyb3IpO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICByZXNvbHZlKCByZXN1bHQpO1xuICAgICAgICAgICAgfSk7XG4gICAgICAgIH0pO1xuICAgIH1cbn0iXX0=
