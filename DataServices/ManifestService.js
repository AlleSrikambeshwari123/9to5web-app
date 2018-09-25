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
//# sourceMappingURL=data:application/json;charset=utf8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIkRhdGFTZXJ2aWNlcy9NYW5pZmVzdFNlcnZpY2UuZXM2Il0sIm5hbWVzIjpbImRhdGFDb250ZXh0IiwicmVxdWlyZSIsIlNFUlZJQ0VfS0VZIiwiTWFuaWZlc3RTZXJ2aWNlIiwidXNlcm5hbWUiLCJtdHlwZSIsImNvbnNvbGUiLCJsb2ciLCJQcm9taXNlIiwicmVzb2x2ZSIsInJlamVjdCIsImdldFNlcnZpY2VQcm94eSIsImNyZWF0ZU1hbmlmZXN0IiwiZXJyb3IiLCJyZXN1bHQiLCJsaXN0TWFuaWZlc3QiLCJtaWQiLCJnZXRNYW5pZmVzdCIsInN0YWdlIiwiY2xvc2VNYW5pZmVzdCIsInBhY2thZ2VzIiwicGF0aCIsImV4cG9ydE1hbmlmZXN0WExTIiwiZGlyX2xvYyIsImF3YiIsInNoaXBNYW5pZmVzdCJdLCJtYXBwaW5ncyI6Ijs7Ozs7Ozs7OztBQUFBLElBQUlBLGNBQWNDLFFBQVEsZUFBUixDQUFsQjtBQUNBLElBQU1DLGNBQWMsVUFBcEI7O0lBRWFDLGUsV0FBQUEsZTtBQUNULCtCQUFjO0FBQUE7QUFFYjs7Ozt1Q0FDY0MsUSxFQUFTQyxLLEVBQU07QUFDMUJDLG9CQUFRQyxHQUFSLENBQVksOEJBQVo7QUFDQSxtQkFBTyxJQUFJQyxPQUFKLENBQWEsVUFBU0MsT0FBVCxFQUFpQkMsTUFBakIsRUFBd0I7QUFDeENWLDRCQUFZVyxlQUFaLENBQTRCVCxXQUE1QixFQUF5Q1UsY0FBekMsQ0FBd0QsRUFBQ1IsVUFBU0EsUUFBVixFQUFtQkMsT0FBTUEsS0FBekIsRUFBeEQsRUFBd0YsVUFBU1EsS0FBVCxFQUFlQyxNQUFmLEVBQXNCO0FBQzFHLHdCQUFJRCxLQUFKLEVBQVU7QUFDTkgsK0JBQU9HLEtBQVA7QUFDSDtBQUNESiw0QkFBU0ssTUFBVDtBQUNILGlCQUxEO0FBTUgsYUFQTSxDQUFQO0FBUUg7Ozt3Q0FDZVQsSyxFQUFNO0FBQ2xCLG1CQUFPLElBQUlHLE9BQUosQ0FBYSxVQUFTQyxPQUFULEVBQWlCQyxNQUFqQixFQUF3QjtBQUN4Q1YsNEJBQVlXLGVBQVosQ0FBNEJULFdBQTVCLEVBQXlDYSxZQUF6QyxDQUFzRCxFQUFDVixPQUFNQSxLQUFQLEVBQXRELEVBQW9FLFVBQVNRLEtBQVQsRUFBZUMsTUFBZixFQUFzQjtBQUN0Rix3QkFBSUQsS0FBSixFQUFVO0FBQ05ILCtCQUFPRyxLQUFQO0FBQ0g7QUFDREosNEJBQVNLLE1BQVQ7QUFDSCxpQkFMRDtBQU1ILGFBUE0sQ0FBUDtBQVFIOzs7b0NBQ1dFLEcsRUFBSTtBQUNaLG1CQUFPLElBQUlSLE9BQUosQ0FBYSxVQUFTQyxPQUFULEVBQWlCQyxNQUFqQixFQUF3QjtBQUN4Q1YsNEJBQVlXLGVBQVosQ0FBNEJULFdBQTVCLEVBQXlDZSxXQUF6QyxDQUFxRCxFQUFDRCxLQUFJQSxHQUFMLEVBQXJELEVBQStELFVBQVNILEtBQVQsRUFBZUMsTUFBZixFQUFzQjtBQUNqRix3QkFBSUQsS0FBSixFQUFVO0FBQ05ILCtCQUFPRyxLQUFQO0FBQ0g7QUFDREosNEJBQVNLLE1BQVQ7QUFDSCxpQkFMRDtBQU1ILGFBUE0sQ0FBUDtBQVFIOzs7c0NBQ2FFLEcsRUFBSUUsSyxFQUFNZCxRLEVBQVM7QUFDN0IsbUJBQU8sSUFBSUksT0FBSixDQUFhLFVBQVNDLE9BQVQsRUFBaUJDLE1BQWpCLEVBQXdCO0FBQ3hDViw0QkFBWVcsZUFBWixDQUE0QlQsV0FBNUIsRUFBeUNpQixhQUF6QyxDQUF1RCxFQUFDSCxLQUFJQSxHQUFMLEVBQVNFLE9BQU1BLEtBQWYsRUFBcUJkLFVBQVNBLFFBQTlCLEVBQXZELEVBQStGLFVBQVNTLEtBQVQsRUFBZUMsTUFBZixFQUFzQjtBQUNqSCx3QkFBSUQsS0FBSixFQUFVO0FBQ05ILCtCQUFPRyxLQUFQO0FBQ0g7QUFDREosNEJBQVNLLE1BQVQ7QUFDSCxpQkFMRDtBQU1ILGFBUE0sQ0FBUDtBQVFIOzs7b0NBQ1dFLEcsRUFBSUksUSxFQUFTQyxJLEVBQUs7QUFDMUJmLG9CQUFRQyxHQUFSLENBQVksOEJBQTZCYyxJQUF6QztBQUNBLG1CQUFPLElBQUliLE9BQUosQ0FBYSxVQUFTQyxPQUFULEVBQWlCQyxNQUFqQixFQUF3QjtBQUN4Q0osd0JBQVFDLEdBQVIsQ0FBWSw2QkFBNEJjLElBQXhDO0FBQ0FyQiw0QkFBWVcsZUFBWixDQUE0QlQsV0FBNUIsRUFBeUNvQixpQkFBekMsQ0FBMkQsRUFBQ04sS0FBSUEsR0FBTCxFQUFTSSxVQUFTQSxRQUFsQixFQUEyQkcsU0FBUUYsSUFBbkMsRUFBM0QsRUFBb0csVUFBU1IsS0FBVCxFQUFlQyxNQUFmLEVBQXNCO0FBQ3RILHdCQUFJRCxLQUFKLEVBQVU7QUFDTkgsK0JBQU9HLEtBQVA7QUFDSDtBQUNESiw0QkFBU0ssTUFBVDtBQUNILGlCQUxEO0FBTUgsYUFSTSxDQUFQO0FBU0g7OztxQ0FDWUUsRyxFQUFJUSxHLEVBQUlwQixRLEVBQVM7QUFDMUIsbUJBQU8sSUFBSUksT0FBSixDQUFhLFVBQVNDLE9BQVQsRUFBaUJDLE1BQWpCLEVBQXdCO0FBQ3hDViw0QkFBWVcsZUFBWixDQUE0QlQsV0FBNUIsRUFBeUN1QixZQUF6QyxDQUFzRCxFQUFDVCxLQUFJQSxHQUFMLEVBQVNRLEtBQUlBLEdBQWIsRUFBaUJwQixVQUFTQSxRQUExQixFQUF0RCxFQUEwRixVQUFTUyxLQUFULEVBQWVDLE1BQWYsRUFBc0I7QUFDNUcsd0JBQUlELEtBQUosRUFBVTtBQUNOSCwrQkFBT0csS0FBUDtBQUNIO0FBQ0RKLDRCQUFTSyxNQUFUO0FBQ0gsaUJBTEQ7QUFNSCxhQVBNLENBQVA7QUFRSCIsImZpbGUiOiJEYXRhU2VydmljZXMvTWFuaWZlc3RTZXJ2aWNlLmpzIiwic291cmNlc0NvbnRlbnQiOlsidmFyIGRhdGFDb250ZXh0ID0gcmVxdWlyZSgnLi9kYXRhQ29udGV4dCcpO1xyXG5jb25zdCBTRVJWSUNFX0tFWSA9ICdtYW5pZmVzdCc7XHJcblxyXG5leHBvcnQgY2xhc3MgTWFuaWZlc3RTZXJ2aWNle1xyXG4gICAgY29uc3RydWN0b3IgKCl7XHJcblxyXG4gICAgfVxyXG4gICAgY3JlYXRlTWFuZmllc3QodXNlcm5hbWUsbXR5cGUpe1xyXG4gICAgICAgIGNvbnNvbGUubG9nKFwiYWJvdXQgdG8gY3JlYXRlIHRoZSBtYW5pZmVzdFwiKTtcclxuICAgICAgICByZXR1cm4gbmV3IFByb21pc2UgKGZ1bmN0aW9uKHJlc29sdmUscmVqZWN0KXtcclxuICAgICAgICAgICAgZGF0YUNvbnRleHQuZ2V0U2VydmljZVByb3h5KFNFUlZJQ0VfS0VZKS5jcmVhdGVNYW5pZmVzdCh7dXNlcm5hbWU6dXNlcm5hbWUsbXR5cGU6bXR5cGV9LGZ1bmN0aW9uKGVycm9yLHJlc3VsdCl7XHJcbiAgICAgICAgICAgICAgICBpZiAoZXJyb3Ipe1xyXG4gICAgICAgICAgICAgICAgICAgIHJlamVjdChlcnJvcik7XHJcbiAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgICAgICByZXNvbHZlKCByZXN1bHQpO1xyXG4gICAgICAgICAgICB9KTtcclxuICAgICAgICB9KTtcclxuICAgIH1cclxuICAgIGxpc3RBbGxNYW5pZmVzdChtdHlwZSl7XHJcbiAgICAgICAgcmV0dXJuIG5ldyBQcm9taXNlIChmdW5jdGlvbihyZXNvbHZlLHJlamVjdCl7XHJcbiAgICAgICAgICAgIGRhdGFDb250ZXh0LmdldFNlcnZpY2VQcm94eShTRVJWSUNFX0tFWSkubGlzdE1hbmlmZXN0KHttdHlwZTptdHlwZX0sZnVuY3Rpb24oZXJyb3IscmVzdWx0KXtcclxuICAgICAgICAgICAgICAgIGlmIChlcnJvcil7XHJcbiAgICAgICAgICAgICAgICAgICAgcmVqZWN0KGVycm9yKTtcclxuICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgICAgIHJlc29sdmUoIHJlc3VsdCk7XHJcbiAgICAgICAgICAgIH0pO1xyXG4gICAgICAgIH0pO1xyXG4gICAgfVxyXG4gICAgZ2V0TWFuaWZlc3QobWlkKXtcclxuICAgICAgICByZXR1cm4gbmV3IFByb21pc2UgKGZ1bmN0aW9uKHJlc29sdmUscmVqZWN0KXtcclxuICAgICAgICAgICAgZGF0YUNvbnRleHQuZ2V0U2VydmljZVByb3h5KFNFUlZJQ0VfS0VZKS5nZXRNYW5pZmVzdCh7bWlkOm1pZH0sZnVuY3Rpb24oZXJyb3IscmVzdWx0KXtcclxuICAgICAgICAgICAgICAgIGlmIChlcnJvcil7XHJcbiAgICAgICAgICAgICAgICAgICAgcmVqZWN0KGVycm9yKTtcclxuICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgICAgIHJlc29sdmUoIHJlc3VsdCk7XHJcbiAgICAgICAgICAgIH0pO1xyXG4gICAgICAgIH0pO1xyXG4gICAgfVxyXG4gICAgY2xvc2VNYW5pZmVzdChtaWQsc3RhZ2UsdXNlcm5hbWUpe1xyXG4gICAgICAgIHJldHVybiBuZXcgUHJvbWlzZSAoZnVuY3Rpb24ocmVzb2x2ZSxyZWplY3Qpe1xyXG4gICAgICAgICAgICBkYXRhQ29udGV4dC5nZXRTZXJ2aWNlUHJveHkoU0VSVklDRV9LRVkpLmNsb3NlTWFuaWZlc3Qoe21pZDptaWQsc3RhZ2U6c3RhZ2UsdXNlcm5hbWU6dXNlcm5hbWV9LGZ1bmN0aW9uKGVycm9yLHJlc3VsdCl7XHJcbiAgICAgICAgICAgICAgICBpZiAoZXJyb3Ipe1xyXG4gICAgICAgICAgICAgICAgICAgIHJlamVjdChlcnJvcik7XHJcbiAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgICAgICByZXNvbHZlKCByZXN1bHQpO1xyXG4gICAgICAgICAgICB9KTtcclxuICAgICAgICB9KTtcclxuICAgIH1cclxuICAgIGV4cG9ydEV4Y2VsKG1pZCxwYWNrYWdlcyxwYXRoKXtcclxuICAgICAgICBjb25zb2xlLmxvZygndGhlIHBhdGggd2UgaGF2ZSBoZXJlIGlzICcrIHBhdGgpO1xyXG4gICAgICAgIHJldHVybiBuZXcgUHJvbWlzZSAoZnVuY3Rpb24ocmVzb2x2ZSxyZWplY3Qpe1xyXG4gICAgICAgICAgICBjb25zb2xlLmxvZygndGhlIHBhdGggd2UgaGF2ZSBoZXIgaXMgJysgcGF0aCk7XHJcbiAgICAgICAgICAgIGRhdGFDb250ZXh0LmdldFNlcnZpY2VQcm94eShTRVJWSUNFX0tFWSkuZXhwb3J0TWFuaWZlc3RYTFMoe21pZDptaWQscGFja2FnZXM6cGFja2FnZXMsZGlyX2xvYzpwYXRofSxmdW5jdGlvbihlcnJvcixyZXN1bHQpe1xyXG4gICAgICAgICAgICAgICAgaWYgKGVycm9yKXtcclxuICAgICAgICAgICAgICAgICAgICByZWplY3QoZXJyb3IpO1xyXG4gICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICAgICAgcmVzb2x2ZSggcmVzdWx0KTtcclxuICAgICAgICAgICAgfSk7XHJcbiAgICAgICAgfSk7XHJcbiAgICB9XHJcbiAgICBzaGlwTWFuaWZlc3QobWlkLGF3Yix1c2VybmFtZSl7XHJcbiAgICAgICAgcmV0dXJuIG5ldyBQcm9taXNlIChmdW5jdGlvbihyZXNvbHZlLHJlamVjdCl7XHJcbiAgICAgICAgICAgIGRhdGFDb250ZXh0LmdldFNlcnZpY2VQcm94eShTRVJWSUNFX0tFWSkuc2hpcE1hbmlmZXN0KHttaWQ6bWlkLGF3Yjphd2IsdXNlcm5hbWU6dXNlcm5hbWV9LGZ1bmN0aW9uKGVycm9yLHJlc3VsdCl7XHJcbiAgICAgICAgICAgICAgICBpZiAoZXJyb3Ipe1xyXG4gICAgICAgICAgICAgICAgICAgIHJlamVjdChlcnJvcik7XHJcbiAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgICAgICByZXNvbHZlKCByZXN1bHQpO1xyXG4gICAgICAgICAgICB9KTtcclxuICAgICAgICB9KTtcclxuICAgIH1cclxufSJdfQ==
