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
        value: function exportExcel(mid) {
            return new Promise(function (resolve, reject) {
                dataContext.getServiceProxy(SERVICE_KEY).exportManifestXLS({ mid: mid }, function (error, result) {
                    if (error) {
                        reject(error);
                    }
                    resolve(result);
                });
            });
        }
    }, {
        key: 'shipManifest',
        value: function shipManifest(mid) {
            return new Promise(function (resolve, reject) {
                dataContext.getServiceProxy(SERVICE_KEY).shipManifest({ mid: mid }, function (error, result) {
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
//# sourceMappingURL=data:application/json;charset=utf8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIkRhdGFTZXJ2aWNlcy9NYW5pZmVzdFNlcnZpY2UuZXM2Il0sIm5hbWVzIjpbImRhdGFDb250ZXh0IiwicmVxdWlyZSIsIlNFUlZJQ0VfS0VZIiwiTWFuaWZlc3RTZXJ2aWNlIiwidXNlcm5hbWUiLCJtdHlwZSIsImNvbnNvbGUiLCJsb2ciLCJQcm9taXNlIiwicmVzb2x2ZSIsInJlamVjdCIsImdldFNlcnZpY2VQcm94eSIsImNyZWF0ZU1hbmlmZXN0IiwiZXJyb3IiLCJyZXN1bHQiLCJsaXN0TWFuaWZlc3QiLCJtaWQiLCJzdGFnZSIsImNsb3NlTWFuaWZlc3QiLCJleHBvcnRNYW5pZmVzdFhMUyIsInNoaXBNYW5pZmVzdCJdLCJtYXBwaW5ncyI6Ijs7Ozs7Ozs7OztBQUFBLElBQUlBLGNBQWNDLFFBQVEsZUFBUixDQUFsQjtBQUNBLElBQU1DLGNBQWMsVUFBcEI7O0lBRWFDLGUsV0FBQUEsZTtBQUNULCtCQUFjO0FBQUE7QUFFYjs7Ozt1Q0FDY0MsUSxFQUFTQyxLLEVBQU07QUFDMUJDLG9CQUFRQyxHQUFSLENBQVksOEJBQVo7QUFDQSxtQkFBTyxJQUFJQyxPQUFKLENBQWEsVUFBU0MsT0FBVCxFQUFpQkMsTUFBakIsRUFBd0I7QUFDeENWLDRCQUFZVyxlQUFaLENBQTRCVCxXQUE1QixFQUF5Q1UsY0FBekMsQ0FBd0QsRUFBQ1IsVUFBU0EsUUFBVixFQUFtQkMsT0FBTUEsS0FBekIsRUFBeEQsRUFBd0YsVUFBU1EsS0FBVCxFQUFlQyxNQUFmLEVBQXNCO0FBQzFHLHdCQUFJRCxLQUFKLEVBQVU7QUFDTkgsK0JBQU9HLEtBQVA7QUFDSDtBQUNESiw0QkFBU0ssTUFBVDtBQUNILGlCQUxEO0FBTUgsYUFQTSxDQUFQO0FBUUg7Ozt3Q0FDZVQsSyxFQUFNO0FBQ2xCLG1CQUFPLElBQUlHLE9BQUosQ0FBYSxVQUFTQyxPQUFULEVBQWlCQyxNQUFqQixFQUF3QjtBQUN4Q1YsNEJBQVlXLGVBQVosQ0FBNEJULFdBQTVCLEVBQXlDYSxZQUF6QyxDQUFzRCxFQUFDVixPQUFNQSxLQUFQLEVBQXRELEVBQW9FLFVBQVNRLEtBQVQsRUFBZUMsTUFBZixFQUFzQjtBQUN0Rix3QkFBSUQsS0FBSixFQUFVO0FBQ05ILCtCQUFPRyxLQUFQO0FBQ0g7QUFDREosNEJBQVNLLE1BQVQ7QUFDSCxpQkFMRDtBQU1ILGFBUE0sQ0FBUDtBQVFIOzs7c0NBRWFFLEcsRUFBSUMsSyxFQUFNYixRLEVBQVM7QUFDN0IsbUJBQU8sSUFBSUksT0FBSixDQUFhLFVBQVNDLE9BQVQsRUFBaUJDLE1BQWpCLEVBQXdCO0FBQ3hDViw0QkFBWVcsZUFBWixDQUE0QlQsV0FBNUIsRUFBeUNnQixhQUF6QyxDQUF1RCxFQUFDRixLQUFJQSxHQUFMLEVBQVNDLE9BQU1BLEtBQWYsRUFBcUJiLFVBQVNBLFFBQTlCLEVBQXZELEVBQStGLFVBQVNTLEtBQVQsRUFBZUMsTUFBZixFQUFzQjtBQUNqSCx3QkFBSUQsS0FBSixFQUFVO0FBQ05ILCtCQUFPRyxLQUFQO0FBQ0g7QUFDREosNEJBQVNLLE1BQVQ7QUFDSCxpQkFMRDtBQU1ILGFBUE0sQ0FBUDtBQVFIOzs7b0NBQ1dFLEcsRUFBSTtBQUNaLG1CQUFPLElBQUlSLE9BQUosQ0FBYSxVQUFTQyxPQUFULEVBQWlCQyxNQUFqQixFQUF3QjtBQUN4Q1YsNEJBQVlXLGVBQVosQ0FBNEJULFdBQTVCLEVBQXlDaUIsaUJBQXpDLENBQTJELEVBQUNILEtBQUlBLEdBQUwsRUFBM0QsRUFBcUUsVUFBU0gsS0FBVCxFQUFlQyxNQUFmLEVBQXNCO0FBQ3ZGLHdCQUFJRCxLQUFKLEVBQVU7QUFDTkgsK0JBQU9HLEtBQVA7QUFDSDtBQUNESiw0QkFBU0ssTUFBVDtBQUNILGlCQUxEO0FBTUgsYUFQTSxDQUFQO0FBUUg7OztxQ0FDWUUsRyxFQUFJO0FBQ2IsbUJBQU8sSUFBSVIsT0FBSixDQUFhLFVBQVNDLE9BQVQsRUFBaUJDLE1BQWpCLEVBQXdCO0FBQ3hDViw0QkFBWVcsZUFBWixDQUE0QlQsV0FBNUIsRUFBeUNrQixZQUF6QyxDQUFzRCxFQUFDSixLQUFJQSxHQUFMLEVBQXRELEVBQWdFLFVBQVNILEtBQVQsRUFBZUMsTUFBZixFQUFzQjtBQUNsRix3QkFBSUQsS0FBSixFQUFVO0FBQ05ILCtCQUFPRyxLQUFQO0FBQ0g7QUFDREosNEJBQVNLLE1BQVQ7QUFDSCxpQkFMRDtBQU1ILGFBUE0sQ0FBUDtBQVFIIiwiZmlsZSI6IkRhdGFTZXJ2aWNlcy9NYW5pZmVzdFNlcnZpY2UuanMiLCJzb3VyY2VzQ29udGVudCI6WyJ2YXIgZGF0YUNvbnRleHQgPSByZXF1aXJlKCcuL2RhdGFDb250ZXh0Jyk7XHJcbmNvbnN0IFNFUlZJQ0VfS0VZID0gJ21hbmlmZXN0JztcclxuXHJcbmV4cG9ydCBjbGFzcyBNYW5pZmVzdFNlcnZpY2V7XHJcbiAgICBjb25zdHJ1Y3RvciAoKXtcclxuXHJcbiAgICB9XHJcbiAgICBjcmVhdGVNYW5maWVzdCh1c2VybmFtZSxtdHlwZSl7XHJcbiAgICAgICAgY29uc29sZS5sb2coXCJhYm91dCB0byBjcmVhdGUgdGhlIG1hbmlmZXN0XCIpO1xyXG4gICAgICAgIHJldHVybiBuZXcgUHJvbWlzZSAoZnVuY3Rpb24ocmVzb2x2ZSxyZWplY3Qpe1xyXG4gICAgICAgICAgICBkYXRhQ29udGV4dC5nZXRTZXJ2aWNlUHJveHkoU0VSVklDRV9LRVkpLmNyZWF0ZU1hbmlmZXN0KHt1c2VybmFtZTp1c2VybmFtZSxtdHlwZTptdHlwZX0sZnVuY3Rpb24oZXJyb3IscmVzdWx0KXtcclxuICAgICAgICAgICAgICAgIGlmIChlcnJvcil7XHJcbiAgICAgICAgICAgICAgICAgICAgcmVqZWN0KGVycm9yKTtcclxuICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgICAgIHJlc29sdmUoIHJlc3VsdCk7XHJcbiAgICAgICAgICAgIH0pO1xyXG4gICAgICAgIH0pO1xyXG4gICAgfVxyXG4gICAgbGlzdEFsbE1hbmlmZXN0KG10eXBlKXtcclxuICAgICAgICByZXR1cm4gbmV3IFByb21pc2UgKGZ1bmN0aW9uKHJlc29sdmUscmVqZWN0KXtcclxuICAgICAgICAgICAgZGF0YUNvbnRleHQuZ2V0U2VydmljZVByb3h5KFNFUlZJQ0VfS0VZKS5saXN0TWFuaWZlc3Qoe210eXBlOm10eXBlfSxmdW5jdGlvbihlcnJvcixyZXN1bHQpe1xyXG4gICAgICAgICAgICAgICAgaWYgKGVycm9yKXtcclxuICAgICAgICAgICAgICAgICAgICByZWplY3QoZXJyb3IpO1xyXG4gICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICAgICAgcmVzb2x2ZSggcmVzdWx0KTtcclxuICAgICAgICAgICAgfSk7XHJcbiAgICAgICAgfSk7XHJcbiAgICB9XHJcbiAgICBcclxuICAgIGNsb3NlTWFuaWZlc3QobWlkLHN0YWdlLHVzZXJuYW1lKXtcclxuICAgICAgICByZXR1cm4gbmV3IFByb21pc2UgKGZ1bmN0aW9uKHJlc29sdmUscmVqZWN0KXtcclxuICAgICAgICAgICAgZGF0YUNvbnRleHQuZ2V0U2VydmljZVByb3h5KFNFUlZJQ0VfS0VZKS5jbG9zZU1hbmlmZXN0KHttaWQ6bWlkLHN0YWdlOnN0YWdlLHVzZXJuYW1lOnVzZXJuYW1lfSxmdW5jdGlvbihlcnJvcixyZXN1bHQpe1xyXG4gICAgICAgICAgICAgICAgaWYgKGVycm9yKXtcclxuICAgICAgICAgICAgICAgICAgICByZWplY3QoZXJyb3IpO1xyXG4gICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICAgICAgcmVzb2x2ZSggcmVzdWx0KTtcclxuICAgICAgICAgICAgfSk7XHJcbiAgICAgICAgfSk7XHJcbiAgICB9XHJcbiAgICBleHBvcnRFeGNlbChtaWQpe1xyXG4gICAgICAgIHJldHVybiBuZXcgUHJvbWlzZSAoZnVuY3Rpb24ocmVzb2x2ZSxyZWplY3Qpe1xyXG4gICAgICAgICAgICBkYXRhQ29udGV4dC5nZXRTZXJ2aWNlUHJveHkoU0VSVklDRV9LRVkpLmV4cG9ydE1hbmlmZXN0WExTKHttaWQ6bWlkfSxmdW5jdGlvbihlcnJvcixyZXN1bHQpe1xyXG4gICAgICAgICAgICAgICAgaWYgKGVycm9yKXtcclxuICAgICAgICAgICAgICAgICAgICByZWplY3QoZXJyb3IpO1xyXG4gICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICAgICAgcmVzb2x2ZSggcmVzdWx0KTtcclxuICAgICAgICAgICAgfSk7XHJcbiAgICAgICAgfSk7XHJcbiAgICB9XHJcbiAgICBzaGlwTWFuaWZlc3QobWlkKXtcclxuICAgICAgICByZXR1cm4gbmV3IFByb21pc2UgKGZ1bmN0aW9uKHJlc29sdmUscmVqZWN0KXtcclxuICAgICAgICAgICAgZGF0YUNvbnRleHQuZ2V0U2VydmljZVByb3h5KFNFUlZJQ0VfS0VZKS5zaGlwTWFuaWZlc3Qoe21pZDptaWR9LGZ1bmN0aW9uKGVycm9yLHJlc3VsdCl7XHJcbiAgICAgICAgICAgICAgICBpZiAoZXJyb3Ipe1xyXG4gICAgICAgICAgICAgICAgICAgIHJlamVjdChlcnJvcik7XHJcbiAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgICAgICByZXNvbHZlKCByZXN1bHQpO1xyXG4gICAgICAgICAgICB9KTtcclxuICAgICAgICB9KTtcclxuICAgIH1cclxufSJdfQ==
