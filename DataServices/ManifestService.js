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
            console.log('the path we have here is ' + path);
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
//# sourceMappingURL=data:application/json;charset=utf8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIkRhdGFTZXJ2aWNlcy9NYW5pZmVzdFNlcnZpY2UuZXM2Il0sIm5hbWVzIjpbImRhdGFDb250ZXh0IiwicmVxdWlyZSIsIlNFUlZJQ0VfS0VZIiwiTWFuaWZlc3RTZXJ2aWNlIiwidXNlcm5hbWUiLCJtdHlwZSIsImNvbnNvbGUiLCJsb2ciLCJQcm9taXNlIiwicmVzb2x2ZSIsInJlamVjdCIsImdldFNlcnZpY2VQcm94eSIsImNyZWF0ZU1hbmlmZXN0IiwiZXJyb3IiLCJyZXN1bHQiLCJsaXN0TWFuaWZlc3QiLCJtaWQiLCJnZXRNYW5pZmVzdCIsInN0YWdlIiwiY2xvc2VNYW5pZmVzdCIsInBhY2thZ2VzIiwicGF0aCIsImV4cG9ydE1hbmlmZXN0WExTIiwiZGlyX2xvYyIsInZlcmlmeU1hbmlmZXN0WGxzIiwiZmlsZSIsImF3YiIsInNoaXBNYW5pZmVzdCJdLCJtYXBwaW5ncyI6Ijs7Ozs7Ozs7OztBQUFBLElBQUlBLGNBQWNDLFFBQVEsZUFBUixDQUFsQjtBQUNBLElBQU1DLGNBQWMsVUFBcEI7O0lBRWFDLGUsV0FBQUEsZTtBQUNULCtCQUFjO0FBQUE7QUFFYjs7Ozt1Q0FDY0MsUSxFQUFTQyxLLEVBQU07QUFDMUJDLG9CQUFRQyxHQUFSLENBQVksOEJBQVo7QUFDQSxtQkFBTyxJQUFJQyxPQUFKLENBQWEsVUFBU0MsT0FBVCxFQUFpQkMsTUFBakIsRUFBd0I7QUFDeENWLDRCQUFZVyxlQUFaLENBQTRCVCxXQUE1QixFQUF5Q1UsY0FBekMsQ0FBd0QsRUFBQ1IsVUFBU0EsUUFBVixFQUFtQkMsT0FBTUEsS0FBekIsRUFBeEQsRUFBd0YsVUFBU1EsS0FBVCxFQUFlQyxNQUFmLEVBQXNCO0FBQzFHLHdCQUFJRCxLQUFKLEVBQVU7QUFDTkgsK0JBQU9HLEtBQVA7QUFDSDtBQUNESiw0QkFBU0ssTUFBVDtBQUNILGlCQUxEO0FBTUgsYUFQTSxDQUFQO0FBUUg7Ozt3Q0FDZVQsSyxFQUFNO0FBQ2xCLG1CQUFPLElBQUlHLE9BQUosQ0FBYSxVQUFTQyxPQUFU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VUFBU0EsUUFBMUIsRUFBdEQsRUFBMEYsVUFBU1MsS0FBVCxFQUFlQyxNQUFmLEVBQXNCO0FBQzVHLHdCQUFJRCxLQUFKLEVBQVU7QUFDTkgsK0JBQU9HLEtBQVA7QUFDSDtBQUNESiw0QkFBU0ssTUFBVDtBQUNILGlCQUxEO0FBTUgsYUFQTSxDQUFQO0FBUUgiLCJmaWxlIjoiRGF0YVNlcnZpY2VzL01hbmlmZXN0U2VydmljZS5qcyIsInNvdXJjZXNDb250ZW50IjpbInZhciBkYXRhQ29udGV4dCA9IHJlcXVpcmUoJy4vZGF0YUNvbnRleHQnKTtcclxuY29uc3QgU0VSVklDRV9LRVkgPSAnbWFuaWZlc3QnO1xyXG5cclxuZXhwb3J0IGNsYXNzIE1hbmlmZXN0U2VydmljZXtcclxuICAgIGNvbnN0cnVjdG9yICgpe1xyXG5cclxuICAgIH1cclxuICAgIGNyZWF0ZU1hbmZpZXN0KHVzZXJuYW1lLG10eXBlKXtcclxuICAgICAgICBjb25zb2xlLmxvZyhcImFib3V0IHRvIGNyZWF0ZSB0aGUgbWFuaWZlc3RcIik7XHJcbiAgICAgICAgcmV0dXJuIG5ldyBQcm9taXNlIChmdW5jdGlvbihyZXNvbHZlLHJlamVjdCl7XHJcbiAgICAgICAgICAgIGRhdGFDb250ZXh0LmdldFNlcnZpY2VQcm94eShTRVJWSUNFX0tFWSkuY3JlYXRlTWFuaWZlc3Qoe3VzZXJuYW1lOnVzZXJuYW1lLG10eXBlOm10eXBlfSxmdW5jdGlvbihlcnJvcixyZXN1bHQpe1xyXG4gICAgICAgICAgICAgICAgaWYgKGVycm9yKXtcclxuICAgICAgICAgICAgICAgICAgICByZWplY3QoZXJyb3IpO1xyXG4gICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICAgICAgcmVzb2x2ZSggcmVzdWx0KTtcclxuICAgICAgICAgICAgfSk7XHJcbiAgICAgICAgfSk7XHJcbiAgICB9XHJcbiAgICBsaXN0QWxsTWFuaWZlc3QobXR5cGUpe1xyXG4gICAgICAgIHJldHVybiBuZXcgUHJvbWlzZSAoZnVuY3Rpb24ocmVzb2x2ZSxyZWplY3Qpe1xyXG4gICAgICAgICAgICBkYXRhQ29udGV4dC5nZXRTZXJ2aWNlUHJveHkoU0VSVklDRV9LRVkpLmxpc3RNYW5pZmVzdCh7bXR5cGU6bXR5cGV9LGZ1bmN0aW9uKGVycm9yLHJlc3VsdCl7XHJcbiAgICAgICAgICAgICAgICBpZiAoZXJyb3Ipe1xyXG4gICAgICAgICAgICAgICAgICAgIHJlamVjdChlcnJvcik7XHJcbiAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgICAgICByZXNvbHZlKCByZXN1bHQpO1xyXG4gICAgICAgICAgICB9KTtcclxuICAgICAgICB9KTtcclxuICAgIH1cclxuICAgIGdldE1hbmlmZXN0KG1pZCl7XHJcbiAgICAgICAgcmV0dXJuIG5ldyBQcm9taXNlIChmdW5jdGlvbihyZXNvbHZlLHJlamVjdCl7XHJcbiAgICAgICAgICAgIGRhdGFDb250ZXh0LmdldFNlcnZpY2VQcm94eShTRVJWSUNFX0tFWSkuZ2V0TWFuaWZlc3Qoe21pZDptaWR9LGZ1bmN0aW9uKGVycm9yLHJlc3VsdCl7XHJcbiAgICAgICAgICAgICAgICBpZiAoZXJyb3Ipe1xyXG4gICAgICAgICAgICAgICAgICAgIHJlamVjdChlcnJvcik7XHJcbiAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgICAgICByZXNvbHZlKCByZXN1bHQpO1xyXG4gICAgICAgICAgICB9KTtcclxuICAgICAgICB9KTtcclxuICAgIH1cclxuICAgIGNsb3NlTWFuaWZlc3QobWlkLHN0YWdlLHVzZXJuYW1lKXtcclxuICAgICAgICByZXR1cm4gbmV3IFByb21pc2UgKGZ1bmN0aW9uKHJlc29sdmUscmVqZWN0KXtcclxuICAgICAgICAgICAgZGF0YUNvbnRleHQuZ2V0U2VydmljZVByb3h5KFNFUlZJQ0VfS0VZKS5jbG9zZU1hbmlmZXN0KHttaWQ6bWlkLHN0YWdlOnN0YWdlLHVzZXJuYW1lOnVzZXJuYW1lfSxmdW5jdGlvbihlcnJvcixyZXN1bHQpe1xyXG4gICAgICAgICAgICAgICAgaWYgKGVycm9yKXtcclxuICAgICAgICAgICAgICAgICAgICByZWplY3QoZXJyb3IpO1xyXG4gICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICAgICAgcmVzb2x2ZSggcmVzdWx0KTtcclxuICAgICAgICAgICAgfSk7XHJcbiAgICAgICAgfSk7XHJcbiAgICB9XHJcbiAgICBleHBvcnRFeGNlbChtaWQscGFja2FnZXMscGF0aCl7XHJcbiAgICAgICAgY29uc29sZS5sb2coJ3RoZSBwYXRoIHdlIGhhdmUgaGVyZSBpcyAnKyBwYXRoKTtcclxuICAgICAgICByZXR1cm4gbmV3IFByb21pc2UgKGZ1bmN0aW9uKHJlc29sdmUscmVqZWN0KXtcclxuICAgICAgICAgICAgY29uc29sZS5sb2coJ3RoZSBwYXRoIHdlIGhhdmUgaGVyIGlzICcrIHBhdGgpO1xyXG4gICAgICAgICAgICBkYXRhQ29udGV4dC5nZXRTZXJ2aWNlUHJveHkoU0VSVklDRV9LRVkpLmV4cG9ydE1hbmlmZXN0WExTKHttaWQ6bWlkLHBhY2thZ2VzOnBhY2thZ2VzLGRpcl9sb2M6cGF0aH0sZnVuY3Rpb24oZXJyb3IscmVzdWx0KXtcclxuICAgICAgICAgICAgICAgIGlmIChlcnJvcil7XHJcbiAgICAgICAgICAgICAgICAgICAgcmVqZWN0KGVycm9yKTtcclxuICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgICAgIHJlc29sdmUoIHJlc3VsdCk7XHJcbiAgICAgICAgICAgIH0pO1xyXG4gICAgICAgIH0pO1xyXG4gICAgfVxyXG4gICAgdmVyaWZ5TWFuaWZlc3QgKG1pZCwgcGF0aCl7XHJcbiAgICAgICAgY29uc29sZS5sb2coJ3RoZSBwYXRoIHdlIGhhdmUgaGVyZSBpcyAnKyBwYXRoKTtcclxuICAgICAgICByZXR1cm4gbmV3IFByb21pc2UgKGZ1bmN0aW9uKHJlc29sdmUscmVqZWN0KXtcclxuICAgICAgICAgICAgY29uc29sZS5sb2coJ3RoZSBwYXRoIHdlIGhhdmUgaGVyIGlzICcrIHBhdGgpO1xyXG4gICAgICAgICAgICBkYXRhQ29udGV4dC5nZXRTZXJ2aWNlUHJveHkoU0VSVklDRV9LRVkpLnZlcmlmeU1hbmlmZXN0WGxzKHttaWQ6bWlkLGZpbGU6cGF0aH0sZnVuY3Rpb24oZXJyb3IscmVzdWx0KXtcclxuICAgICAgICAgICAgICAgIGlmIChlcnJvcil7XHJcbiAgICAgICAgICAgICAgICAgICAgcmVqZWN0KGVycm9yKTtcclxuICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgICAgIHJlc29sdmUoIHJlc3VsdCk7XHJcbiAgICAgICAgICAgIH0pO1xyXG4gICAgICAgIH0pO1xyXG4gICAgfVxyXG4gICAgc2hpcE1hbmlmZXN0KG1pZCxhd2IsdXNlcm5hbWUpe1xyXG4gICAgICAgIHJldHVybiBuZXcgUHJvbWlzZSAoZnVuY3Rpb24ocmVzb2x2ZSxyZWplY3Qpe1xyXG4gICAgICAgICAgICBkYXRhQ29udGV4dC5nZXRTZXJ2aWNlUHJveHkoU0VSVklDRV9LRVkpLnNoaXBNYW5pZmVzdCh7bWlkOm1pZCxhd2I6YXdiLHVzZXJuYW1lOnVzZXJuYW1lfSxmdW5jdGlvbihlcnJvcixyZXN1bHQpe1xyXG4gICAgICAgICAgICAgICAgaWYgKGVycm9yKXtcclxuICAgICAgICAgICAgICAgICAgICByZWplY3QoZXJyb3IpO1xyXG4gICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICAgICAgcmVzb2x2ZSggcmVzdWx0KTtcclxuICAgICAgICAgICAgfSk7XHJcbiAgICAgICAgfSk7XHJcbiAgICB9XHJcbn0iXX0=
