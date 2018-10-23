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
//# sourceMappingURL=data:application/json;charset=utf8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIkRhdGFTZXJ2aWNlcy9NYW5pZmVzdFNlcnZpY2UuZXM2Il0sIm5hbWVzIjpbImRhdGFDb250ZXh0IiwicmVxdWlyZSIsIlNFUlZJQ0VfS0VZIiwiTWFuaWZlc3RTZXJ2aWNlIiwidXNlcm5hbWUiLCJtdHlwZSIsImNvbnNvbGUiLCJsb2ciLCJQcm9taXNlIiwicmVzb2x2ZSIsInJlamVjdCIsImdldFNlcnZpY2VQcm94eSIsImNyZWF0ZU1hbmlmZXN0IiwiZXJyb3IiLCJyZXN1bHQiLCJsaXN0TWFuaWZlc3QiLCJtaWQiLCJnZXRNYW5pZmVzdCIsInN0YWdlIiwiY2xvc2VNYW5pZmVzdCIsInBhY2thZ2VzIiwicGF0aCIsImV4cG9ydE1hbmlmZXN0WExTIiwiZGlyX2xvYyIsInZlcmlmeU1hbmlmZXN0WGxzIiwiZmlsZSIsInRlbXBsYXRlIiwid2VpZ2h0IiwidmFsdWUiLCJwaWVjZXMiLCJnZW5lcmF0ZUF3YiIsInRvdGFsV2VpZ2h0IiwidG90YWxWYWx1ZSIsImF3YiIsInNoaXBNYW5pZmVzdCJdLCJtYXBwaW5ncyI6Ijs7Ozs7Ozs7OztBQUFBLElBQUlBLGNBQWNDLFFBQVEsZUFBUixDQUFsQjtBQUNBLElBQU1DLGNBQWMsVUFBcEI7O0lBRWFDLGUsV0FBQUEsZTtBQUNULCtCQUFjO0FBQUE7QUFFYjs7Ozt1Q0FDY0MsUSxFQUFTQyxLLEVBQU07QUFDMUJDLG9CQUFRQyxHQUFSLENBQVksOEJBQVo7QUFDQSxtQkFBTyxJQUFJQyxPQUFKLENBQWEsVUFBU0MsT0FBVCxFQUFpQkMsTUFBakIsRUFBd0I7QUFDeENWLDRCQUFZVyxlQUFaLENBQTRCVCxXQUE1QixFQUF5Q1UsY0FBekMsQ0FBd0QsRUFBQ1IsVUFBU0EsUUFBVixFQUFtQkMsT0FBTUEsS0FBekIsRUFBeEQsRUFBd0YsVUFBU1EsS0FBVCxFQUFlQyxNQUFmLEVBQXNCO0FBQzFHLHdCQUFJRCxLQUFKLEVBQVU7QUFDTkgsK0JBQU9HLEtBQVA7QUFDSDtBQUNESiw0QkFBU0ssTUFBVDtBQUNILGlC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eUM0QixXQUF6QyxDQUFxRCxFQUFDZCxLQUFJQSxHQUFMLEVBQVNVLFVBQVNBLFFBQWxCLEVBQTJCSyxhQUFZSixNQUF2QyxFQUE4Q0ssWUFBWUosS0FBMUQsRUFBaUVDLFFBQU9BLE1BQXhFLEVBQXJELEVBQXFJLFVBQVNoQixLQUFULEVBQWVDLE1BQWYsRUFBc0I7QUFDdkosd0JBQUlELEtBQUosRUFBVTtBQUNOSCwrQkFBT0csS0FBUDtBQUNIO0FBQ0RKLDRCQUFTSyxNQUFUO0FBQ0gsaUJBTEQ7QUFNSCxhQVBNLENBQVA7QUFRSDs7O3FDQUNZRSxHLEVBQUlpQixHLEVBQUk3QixRLEVBQVM7QUFDMUIsbUJBQU8sSUFBSUksT0FBSixDQUFhLFVBQVNDLE9BQVQsRUFBaUJDLE1BQWpCLEVBQXdCO0FBQ3hDViw0QkFBWVcsZUFBWixDQUE0QlQsV0FBNUIsRUFBeUNnQyxZQUF6QyxDQUFzRCxFQUFDbEIsS0FBSUEsR0FBTCxFQUFTaUIsS0FBSUEsR0FBYixFQUFpQjdCLFVBQVNBLFFBQTFCLEVBQXRELEVBQTBGLFVBQVNTLEtBQVQsRUFBZUMsTUFBZixFQUFzQjtBQUM1Ryx3QkFBSUQsS0FBSixFQUFVO0FBQ05ILCtCQUFPRyxLQUFQO0FBQ0g7QUFDREosNEJBQVNLLE1BQVQ7QUFDSCxpQkFMRDtBQU1ILGFBUE0sQ0FBUDtBQVFIIiwiZmlsZSI6IkRhdGFTZXJ2aWNlcy9NYW5pZmVzdFNlcnZpY2UuanMiLCJzb3VyY2VzQ29udGVudCI6WyJ2YXIgZGF0YUNvbnRleHQgPSByZXF1aXJlKCcuL2RhdGFDb250ZXh0Jyk7XHJcbmNvbnN0IFNFUlZJQ0VfS0VZID0gJ21hbmlmZXN0JztcclxuXHJcbmV4cG9ydCBjbGFzcyBNYW5pZmVzdFNlcnZpY2V7XHJcbiAgICBjb25zdHJ1Y3RvciAoKXtcclxuXHJcbiAgICB9XHJcbiAgICBjcmVhdGVNYW5maWVzdCh1c2VybmFtZSxtdHlwZSl7XHJcbiAgICAgICAgY29uc29sZS5sb2coXCJhYm91dCB0byBjcmVhdGUgdGhlIG1hbmlmZXN0XCIpO1xyXG4gICAgICAgIHJldHVybiBuZXcgUHJvbWlzZSAoZnVuY3Rpb24ocmVzb2x2ZSxyZWplY3Qpe1xyXG4gICAgICAgICAgICBkYXRhQ29udGV4dC5nZXRTZXJ2aWNlUHJveHkoU0VSVklDRV9LRVkpLmNyZWF0ZU1hbmlmZXN0KHt1c2VybmFtZTp1c2VybmFtZSxtdHlwZTptdHlwZX0sZnVuY3Rpb24oZXJyb3IscmVzdWx0KXtcclxuICAgICAgICAgICAgICAgIGlmIChlcnJvcil7XHJcbiAgICAgICAgICAgICAgICAgICAgcmVqZWN0KGVycm9yKTtcclxuICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgICAgIHJlc29sdmUoIHJlc3VsdCk7XHJcbiAgICAgICAgICAgIH0pO1xyXG4gICAgICAgIH0pO1xyXG4gICAgfVxyXG4gICAgbGlzdEFsbE1hbmlmZXN0KG10eXBlKXtcclxuICAgICAgICByZXR1cm4gbmV3IFByb21pc2UgKGZ1bmN0aW9uKHJlc29sdmUscmVqZWN0KXtcclxuICAgICAgICAgICAgZGF0YUNvbnRleHQuZ2V0U2VydmljZVByb3h5KFNFUlZJQ0VfS0VZKS5saXN0TWFuaWZlc3Qoe210eXBlOm10eXBlfSxmdW5jdGlvbihlcnJvcixyZXN1bHQpe1xyXG4gICAgICAgICAgICAgICAgaWYgKGVycm9yKXtcclxuICAgICAgICAgICAgICAgICAgICByZWplY3QoZXJyb3IpO1xyXG4gICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICAgICAgcmVzb2x2ZSggcmVzdWx0KTtcclxuICAgICAgICAgICAgfSk7XHJcbiAgICAgICAgfSk7XHJcbiAgICB9XHJcbiAgICBnZXRNYW5pZmVzdChtaWQpe1xyXG4gICAgICAgIHJldHVybiBuZXcgUHJvbWlzZSAoZnVuY3Rpb24ocmVzb2x2ZSxyZWplY3Qpe1xyXG4gICAgICAgICAgICBkYXRhQ29udGV4dC5nZXRTZXJ2aWNlUHJveHkoU0VSVklDRV9LRVkpLmdldE1hbmlmZXN0KHttaWQ6bWlkfSxmdW5jdGlvbihlcnJvcixyZXN1bHQpe1xyXG4gICAgICAgICAgICAgICAgaWYgKGVycm9yKXtcclxuICAgICAgICAgICAgICAgICAgICByZWplY3QoZXJyb3IpO1xyXG4gICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICAgICAgcmVzb2x2ZSggcmVzdWx0KTtcclxuICAgICAgICAgICAgfSk7XHJcbiAgICAgICAgfSk7XHJcbiAgICB9XHJcbiAgICBjbG9zZU1hbmlmZXN0KG1pZCxzdGFnZSx1c2VybmFtZSl7XHJcbiAgICAgICAgcmV0dXJuIG5ldyBQcm9taXNlIChmdW5jdGlvbihyZXNvbHZlLHJlamVjdCl7XHJcbiAgICAgICAgICAgIGRhdGFDb250ZXh0LmdldFNlcnZpY2VQcm94eShTRVJWSUNFX0tFWSkuY2xvc2VNYW5pZmVzdCh7bWlkOm1pZCxzdGFnZTpzdGFnZSx1c2VybmFtZTp1c2VybmFtZX0sZnVuY3Rpb24oZXJyb3IscmVzdWx0KXtcclxuICAgICAgICAgICAgICAgIGlmIChlcnJvcil7XHJcbiAgICAgICAgICAgICAgICAgICAgcmVqZWN0KGVycm9yKTtcclxuICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgICAgIHJlc29sdmUoIHJlc3VsdCk7XHJcbiAgICAgICAgICAgIH0pO1xyXG4gICAgICAgIH0pO1xyXG4gICAgfVxyXG4gICAgZXhwb3J0RXhjZWwobWlkLHBhY2thZ2VzLHBhdGgpe1xyXG4gICAgICAgIFxyXG4gICAgICAgIHJldHVybiBuZXcgUHJvbWlzZSAoZnVuY3Rpb24ocmVzb2x2ZSxyZWplY3Qpe1xyXG4gICAgICAgICAgICBjb25zb2xlLmxvZygndGhlIHBhdGggd2UgaGF2ZSBoZXIgaXMgJysgcGF0aCk7XHJcbiAgICAgICAgICAgIGRhdGFDb250ZXh0LmdldFNlcnZpY2VQcm94eShTRVJWSUNFX0tFWSkuZXhwb3J0TWFuaWZlc3RYTFMoe21pZDptaWQscGFja2FnZXM6cGFja2FnZXMsZGlyX2xvYzpwYXRofSxmdW5jdGlvbihlcnJvcixyZXN1bHQpe1xyXG4gICAgICAgICAgICAgICAgaWYgKGVycm9yKXtcclxuICAgICAgICAgICAgICAgICAgICByZWplY3QoZXJyb3IpO1xyXG4gICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICAgICAgcmVzb2x2ZSggcmVzdWx0KTtcclxuICAgICAgICAgICAgfSk7XHJcbiAgICAgICAgfSk7XHJcbiAgICB9XHJcbiAgICB2ZXJpZnlNYW5pZmVzdCAobWlkLCBwYXRoKXtcclxuICAgICAgICBjb25zb2xlLmxvZygndGhlIHBhdGggd2UgaGF2ZSBoZXJlIGlzICcrIHBhdGgpO1xyXG4gICAgICAgIHJldHVybiBuZXcgUHJvbWlzZSAoZnVuY3Rpb24ocmVzb2x2ZSxyZWplY3Qpe1xyXG4gICAgICAgICAgICBjb25zb2xlLmxvZygndGhlIHBhdGggd2UgaGF2ZSBoZXIgaXMgJysgcGF0aCk7XHJcbiAgICAgICAgICAgIGRhdGFDb250ZXh0LmdldFNlcnZpY2VQcm94eShTRVJWSUNFX0tFWSkudmVyaWZ5TWFuaWZlc3RYbHMoe21pZDptaWQsZmlsZTpwYXRofSxmdW5jdGlvbihlcnJvcixyZXN1bHQpe1xyXG4gICAgICAgICAgICAgICAgaWYgKGVycm9yKXtcclxuICAgICAgICAgICAgICAgICAgICByZWplY3QoZXJyb3IpO1xyXG4gICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICAgICAgcmVzb2x2ZSggcmVzdWx0KTtcclxuICAgICAgICAgICAgfSk7XHJcbiAgICAgICAgfSk7XHJcbiAgICB9XHJcbiAgICBnZXRBd2IobWlkLHRlbXBsYXRlLHdlaWdodCx2YWx1ZSxwaWVjZXMpe1xyXG4gICAgICAgIFxyXG4gICAgICAgIHJldHVybiBuZXcgUHJvbWlzZSAoZnVuY3Rpb24ocmVzb2x2ZSxyZWplY3Qpe1xyXG4gICAgICAgICAgICBkYXRhQ29udGV4dC5nZXRTZXJ2aWNlUHJveHkoU0VSVklDRV9LRVkpLmdlbmVyYXRlQXdiKHttaWQ6bWlkLHRlbXBsYXRlOnRlbXBsYXRlLHRvdGFsV2VpZ2h0OndlaWdodCx0b3RhbFZhbHVlOiB2YWx1ZSwgcGllY2VzOnBpZWNlc30sZnVuY3Rpb24oZXJyb3IscmVzdWx0KXtcclxuICAgICAgICAgICAgICAgIGlmIChlcnJvcil7XHJcbiAgICAgICAgICAgICAgICAgICAgcmVqZWN0KGVycm9yKTtcclxuICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgICAgIHJlc29sdmUoIHJlc3VsdCk7XHJcbiAgICAgICAgICAgIH0pO1xyXG4gICAgICAgIH0pO1xyXG4gICAgfVxyXG4gICAgc2hpcE1hbmlmZXN0KG1pZCxhd2IsdXNlcm5hbWUpe1xyXG4gICAgICAgIHJldHVybiBuZXcgUHJvbWlzZSAoZnVuY3Rpb24ocmVzb2x2ZSxyZWplY3Qpe1xyXG4gICAgICAgICAgICBkYXRhQ29udGV4dC5nZXRTZXJ2aWNlUHJveHkoU0VSVklDRV9LRVkpLnNoaXBNYW5pZmVzdCh7bWlkOm1pZCxhd2I6YXdiLHVzZXJuYW1lOnVzZXJuYW1lfSxmdW5jdGlvbihlcnJvcixyZXN1bHQpe1xyXG4gICAgICAgICAgICAgICAgaWYgKGVycm9yKXtcclxuICAgICAgICAgICAgICAgICAgICByZWplY3QoZXJyb3IpO1xyXG4gICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICAgICAgcmVzb2x2ZSggcmVzdWx0KTtcclxuICAgICAgICAgICAgfSk7XHJcbiAgICAgICAgfSk7XHJcbiAgICB9XHJcbn0iXX0=
