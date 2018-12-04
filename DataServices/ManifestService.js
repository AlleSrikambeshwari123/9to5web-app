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
//# sourceMappingURL=data:application/json;charset=utf8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIkRhdGFTZXJ2aWNlcy9NYW5pZmVzdFNlcnZpY2UuZXM2Il0sIm5hbWVzIjpbImRhdGFDb250ZXh0IiwicmVxdWlyZSIsIlNFUlZJQ0VfS0VZIiwiTWFuaWZlc3RTZXJ2aWNlIiwidXNlcm5hbWUiLCJtdHlwZSIsImNvbnNvbGUiLCJsb2ciLCJQcm9taXNlIiwicmVzb2x2ZSIsInJlamVjdCIsImdldFNlcnZpY2VQcm94eSIsImNyZWF0ZU1hbmlmZXN0IiwiZXJyb3IiLCJyZXN1bHQiLCJsaXN0TWFuaWZlc3QiLCJtaWQiLCJnZXRNYW5pZmVzdCIsInN0YWdlIiwiY2xvc2VNYW5pZmVzdCIsInRpdGxlIiwicGFja2FnZXMiLCJwYXRoIiwiZXhwb3J0TWFuaWZlc3RYTFMiLCJteXR5cGUiLCJkaXJfbG9jIiwidmVyaWZ5TWFuaWZlc3RYbHMiLCJmaWxlIiwidGVtcGxhdGUiLCJ3ZWlnaHQiLCJ2YWx1ZSIsInBpZWNlcyIsImdlbmVyYXRlQXdiIiwidG90YWxXZWlnaHQiLCJ0b3RhbFZhbHVlIiwiZW1haWxCcm9rZXJSZXF1ZXN0IiwiZW1haWxCcm9rZXIiLCJjdXN0b21lckFsZXJ0UmVxdWVzdCIsImFsZXJ0UmVjQWxlcnQiLCJhd2IiLCJzaGlwTWFuaWZlc3QiXSwibWFwcGluZ3MiOiI7Ozs7Ozs7Ozs7QUFBQSxJQUFJQSxjQUFjQyxRQUFRLGVBQVIsQ0FBbEI7QUFDQSxJQUFNQyxjQUFjLFVBQXBCOztJQUVhQyxlLFdBQUFBLGU7QUFDVCwrQkFBYztBQUFBO0FBRWI7Ozs7dUNBQ2NDLFEsRUFBU0MsSyxFQUFNO0FBQzFCQyxvQkFBUUMsR0FBUixDQUFZLDhCQUFaO0FBQ0EsbUJBQU8sSUFBSUMsT0FBSixDQUFhLFVBQVNDLE9BQVQsRUFBaUJDLE1BQWpCLEVBQXdCO0FBQ3hDViw0QkFBWVcsZUFBWixDQUE0QlQsV0FBNUIsRUFBeUNVLGNBQXpDLENBQXdELEVBQUNSLFVBQVNBLFFBQVYsRUFBbUJDLE9BQU1BLEtBQXpCLEVBQXhELEVBQXdGLFVBQVNRLEtB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QVFIOzs7cUNBQ1lFLEcsRUFBSXVCLEcsRUFBSW5DLFEsRUFBUztBQUMxQixtQkFBTyxJQUFJSSxPQUFKLENBQWEsVUFBU0MsT0FBVCxFQUFpQkMsTUFBakIsRUFBd0I7QUFDeENWLDRCQUFZVyxlQUFaLENBQTRCVCxXQUE1QixFQUF5Q3NDLFlBQXpDLENBQXNELEVBQUN4QixLQUFJQSxHQUFMLEVBQVN1QixLQUFJQSxHQUFiLEVBQWlCbkMsVUFBU0EsUUFBMUIsRUFBdEQsRUFBMEYsVUFBU1MsS0FBVCxFQUFlQyxNQUFmLEVBQXNCO0FBQzVHLHdCQUFJRCxLQUFKLEVBQVU7QUFDTkgsK0JBQU9HLEtBQVA7QUFDSDtBQUNESiw0QkFBU0ssTUFBVDtBQUNILGlCQUxEO0FBTUgsYUFQTSxDQUFQO0FBUUgiLCJmaWxlIjoiRGF0YVNlcnZpY2VzL01hbmlmZXN0U2VydmljZS5qcyIsInNvdXJjZXNDb250ZW50IjpbInZhciBkYXRhQ29udGV4dCA9IHJlcXVpcmUoJy4vZGF0YUNvbnRleHQnKTtcclxuY29uc3QgU0VSVklDRV9LRVkgPSAnbWFuaWZlc3QnO1xyXG5cclxuZXhwb3J0IGNsYXNzIE1hbmlmZXN0U2VydmljZXtcclxuICAgIGNvbnN0cnVjdG9yICgpe1xyXG5cclxuICAgIH1cclxuICAgIGNyZWF0ZU1hbmZpZXN0KHVzZXJuYW1lLG10eXBlKXtcclxuICAgICAgICBjb25zb2xlLmxvZyhcImFib3V0IHRvIGNyZWF0ZSB0aGUgbWFuaWZlc3RcIik7XHJcbiAgICAgICAgcmV0dXJuIG5ldyBQcm9taXNlIChmdW5jdGlvbihyZXNvbHZlLHJlamVjdCl7XHJcbiAgICAgICAgICAgIGRhdGFDb250ZXh0LmdldFNlcnZpY2VQcm94eShTRVJWSUNFX0tFWSkuY3JlYXRlTWFuaWZlc3Qoe3VzZXJuYW1lOnVzZXJuYW1lLG10eXBlOm10eXBlfSxmdW5jdGlvbihlcnJvcixyZXN1bHQpe1xyXG4gICAgICAgICAgICAgICAgaWYgKGVycm9yKXtcclxuICAgICAgICAgICAgICAgICAgICByZWplY3QoZXJyb3IpO1xyXG4gICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICAgICAgcmVzb2x2ZSggcmVzdWx0KTtcclxuICAgICAgICAgICAgfSk7XHJcbiAgICAgICAgfSk7XHJcbiAgICB9XHJcbiAgICBsaXN0QWxsTWFuaWZlc3QobXR5cGUpe1xyXG4gICAgICAgIHJldHVybiBuZXcgUHJvbWlzZSAoZnVuY3Rpb24ocmVzb2x2ZSxyZWplY3Qpe1xyXG4gICAgICAgICAgICBkYXRhQ29udGV4dC5nZXRTZXJ2aWNlUHJveHkoU0VSVklDRV9LRVkpLmxpc3RNYW5pZmVzdCh7bXR5cGU6bXR5cGV9LGZ1bmN0aW9uKGVycm9yLHJlc3VsdCl7XHJcbiAgICAgICAgICAgICAgICBpZiAoZXJyb3Ipe1xyXG4gICAgICAgICAgICAgICAgICAgIHJlamVjdChlcnJvcik7XHJcbiAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgICAgICByZXNvbHZlKCByZXN1bHQpO1xyXG4gICAgICAgICAgICB9KTtcclxuICAgICAgICB9KTtcclxuICAgIH1cclxuICAgIGdldE1hbmlmZXN0KG1pZCl7XHJcbiAgICAgICAgcmV0dXJuIG5ldyBQcm9taXNlIChmdW5jdGlvbihyZXNvbHZlLHJlamVjdCl7XHJcbiAgICAgICAgICAgIGRhdGFDb250ZXh0LmdldFNlcnZpY2VQcm94eShTRVJWSUNFX0tFWSkuZ2V0TWFuaWZlc3Qoe21pZDptaWR9LGZ1bmN0aW9uKGVycm9yLHJlc3VsdCl7XHJcbiAgICAgICAgICAgICAgICBpZiAoZXJyb3Ipe1xyXG4gICAgICAgICAgICAgICAgICAgIHJlamVjdChlcnJvcik7XHJcbiAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgICAgICByZXNvbHZlKCByZXN1bHQpO1xyXG4gICAgICAgICAgICB9KTtcclxuICAgICAgICB9KTtcclxuICAgIH1cclxuICAgIGNsb3NlTWFuaWZlc3QobWlkLHN0YWdlLHVzZXJuYW1lKXtcclxuICAgICAgICByZXR1cm4gbmV3IFByb21pc2UgKGZ1bmN0aW9uKHJlc29sdmUscmVqZWN0KXtcclxuICAgICAgICAgICAgZGF0YUNvbnRleHQuZ2V0U2VydmljZVByb3h5KFNFUlZJQ0VfS0VZKS5jbG9zZU1hbmlmZXN0KHttaWQ6bWlkLHN0YWdlOnN0YWdlLHVzZXJuYW1lOnVzZXJuYW1lfSxmdW5jdGlvbihlcnJvcixyZXN1bHQpe1xyXG4gICAgICAgICAgICAgICAgaWYgKGVycm9yKXtcclxuICAgICAgICAgICAgICAgICAgICByZWplY3QoZXJyb3IpO1xyXG4gICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICAgICAgcmVzb2x2ZSggcmVzdWx0KTtcclxuICAgICAgICAgICAgfSk7XHJcbiAgICAgICAgfSk7XHJcbiAgICB9XHJcbiAgICBleHBvcnRFeGNlbCh0aXRsZSxtdHlwZSxwYWNrYWdlcyxwYXRoKXtcclxuICAgICAgICBcclxuICAgICAgICByZXR1cm4gbmV3IFByb21pc2UgKGZ1bmN0aW9uKHJlc29sdmUscmVqZWN0KXtcclxuICAgICAgICAgICAgY29uc29sZS5sb2coJ3RoZSBwYXRoIHdlIGhhdmUgaGVyIGlzICcrIHBhdGgpO1xyXG4gICAgICAgICAgICBkYXRhQ29udGV4dC5nZXRTZXJ2aWNlUHJveHkoU0VSVklDRV9LRVkpLmV4cG9ydE1hbmlmZXN0WExTKHt0aXRsZTp0aXRsZSxteXR5cGU6bXR5cGUscGFja2FnZXM6cGFja2FnZXMsZGlyX2xvYzpwYXRofSxmdW5jdGlvbihlcnJvcixyZXN1bHQpe1xyXG4gICAgICAgICAgICAgICAgaWYgKGVycm9yKXtcclxuICAgICAgICAgICAgICAgICAgICByZWplY3QoZXJyb3IpO1xyXG4gICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICAgICAgcmVzb2x2ZSggcmVzdWx0KTtcclxuICAgICAgICAgICAgfSk7XHJcbiAgICAgICAgfSk7XHJcbiAgICB9XHJcbiAgICB2ZXJpZnlNYW5pZmVzdCAobWlkLCBwYXRoKXtcclxuICAgICAgICBjb25zb2xlLmxvZygndGhlIHBhdGggd2UgaGF2ZSBoZXJlIGlzICcrIHBhdGgpO1xyXG4gICAgICAgIHJldHVybiBuZXcgUHJvbWlzZSAoZnVuY3Rpb24ocmVzb2x2ZSxyZWplY3Qpe1xyXG4gICAgICAgICAgICBjb25zb2xlLmxvZygndGhlIHBhdGggd2UgaGF2ZSBoZXIgaXMgJysgcGF0aCk7XHJcbiAgICAgICAgICAgIGRhdGFDb250ZXh0LmdldFNlcnZpY2VQcm94eShTRVJWSUNFX0tFWSkudmVyaWZ5TWFuaWZlc3RYbHMoe21pZDptaWQsZmlsZTpwYXRofSxmdW5jdGlvbihlcnJvcixyZXN1bHQpe1xyXG4gICAgICAgICAgICAgICAgaWYgKGVycm9yKXtcclxuICAgICAgICAgICAgICAgICAgICByZWplY3QoZXJyb3IpO1xyXG4gICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICAgICAgcmVzb2x2ZSggcmVzdWx0KTtcclxuICAgICAgICAgICAgfSk7XHJcbiAgICAgICAgfSk7XHJcbiAgICB9XHJcbiAgICBnZXRBd2IobWlkLHRlbXBsYXRlLHdlaWdodCx2YWx1ZSxwaWVjZXMpe1xyXG4gICAgICAgIFxyXG4gICAgICAgIHJldHVybiBuZXcgUHJvbWlzZSAoZnVuY3Rpb24ocmVzb2x2ZSxyZWplY3Qpe1xyXG4gICAgICAgICAgICBkYXRhQ29udGV4dC5nZXRTZXJ2aWNlUHJveHkoU0VSVklDRV9LRVkpLmdlbmVyYXRlQXdiKHttaWQ6bWlkLHRlbXBsYXRlOnRlbXBsYXRlLHRvdGFsV2VpZ2h0OndlaWdodCx0b3RhbFZhbHVlOiB2YWx1ZSwgcGllY2VzOnBpZWNlc30sZnVuY3Rpb24oZXJyb3IscmVzdWx0KXtcclxuICAgICAgICAgICAgICAgIGlmIChlcnJvcil7XHJcbiAgICAgICAgICAgICAgICAgICAgcmVqZWN0KGVycm9yKTtcclxuICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgICAgIHJlc29sdmUoIHJlc3VsdCk7XHJcbiAgICAgICAgICAgIH0pO1xyXG4gICAgICAgIH0pO1xyXG4gICAgfVxyXG4gICAgZW1haWxCcm9rZXIoZW1haWxCcm9rZXJSZXF1ZXN0KXtcclxuICAgICAgICByZXR1cm4gbmV3IFByb21pc2UgKGZ1bmN0aW9uKHJlc29sdmUscmVqZWN0KXtcclxuICAgICAgICAgICAgZGF0YUNvbnRleHQuZ2V0U2VydmljZVByb3h5KFNFUlZJQ0VfS0VZKS5lbWFpbEJyb2tlcihlbWFpbEJyb2tlclJlcXVlc3QsZnVuY3Rpb24oZXJyb3IscmVzdWx0KXtcclxuICAgICAgICAgICAgICAgIGlmIChlcnJvcil7XHJcbiAgICAgICAgICAgICAgICAgICAgcmVqZWN0KGVycm9yKTtcclxuICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgICAgIHJlc29sdmUoIHJlc3VsdCk7XHJcbiAgICAgICAgICAgIH0pO1xyXG4gICAgICAgIH0pOyBcclxuICAgIH1cclxuICAgIGFsZXJ0Q3VzdG9tZXIoY3VzdG9tZXJBbGVydFJlcXVlc3Qpe1xyXG4gICAgICAgIHJldHVybiBuZXcgUHJvbWlzZSAoZnVuY3Rpb24ocmVzb2x2ZSxyZWplY3Qpe1xyXG4gICAgICAgICAgICBkYXRhQ29udGV4dC5nZXRTZXJ2aWNlUHJveHkoU0VSVklDRV9LRVkpLmFsZXJ0UmVjQWxlcnQoY3VzdG9tZXJBbGVydFJlcXVlc3QsZnVuY3Rpb24oZXJyb3IscmVzdWx0KXtcclxuICAgICAgICAgICAgICAgIGlmIChlcnJvcil7XHJcbiAgICAgICAgICAgICAgICAgICAgcmVqZWN0KGVycm9yKTtcclxuICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgICAgIHJlc29sdmUoIHJlc3VsdCk7XHJcbiAgICAgICAgICAgIH0pO1xyXG4gICAgICAgIH0pOyBcclxuICAgIH1cclxuICAgIHNoaXBNYW5pZmVzdChtaWQsYXdiLHVzZXJuYW1lKXtcclxuICAgICAgICByZXR1cm4gbmV3IFByb21pc2UgKGZ1bmN0aW9uKHJlc29sdmUscmVqZWN0KXtcclxuICAgICAgICAgICAgZGF0YUNvbnRleHQuZ2V0U2VydmljZVByb3h5KFNFUlZJQ0VfS0VZKS5zaGlwTWFuaWZlc3Qoe21pZDptaWQsYXdiOmF3Yix1c2VybmFtZTp1c2VybmFtZX0sZnVuY3Rpb24oZXJyb3IscmVzdWx0KXtcclxuICAgICAgICAgICAgICAgIGlmIChlcnJvcil7XHJcbiAgICAgICAgICAgICAgICAgICAgcmVqZWN0KGVycm9yKTtcclxuICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgICAgIHJlc29sdmUoIHJlc3VsdCk7XHJcbiAgICAgICAgICAgIH0pO1xyXG4gICAgICAgIH0pO1xyXG4gICAgfVxyXG59Il19
