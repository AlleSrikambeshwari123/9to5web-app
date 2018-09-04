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
        value: function createManfiest(username) {
            console.log("about to create the manifest");
            return new Promise(function (resolve, reject) {
                dataContext.getServiceProxy(SERVICE_KEY).createManifest({ username: username }, function (error, result) {
                    if (error) {
                        reject(error);
                    }
                    resolve(result);
                });
            });
        }
    }, {
        key: 'listAllManifest',
        value: function listAllManifest() {
            return new Promise(function (resolve, reject) {
                dataContext.getServiceProxy(SERVICE_KEY).listManifest({}, function (error, result) {
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
//# sourceMappingURL=data:application/json;charset=utf8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIkRhdGFTZXJ2aWNlcy9NYW5pZmVzdFNlcnZpY2UuZXM2Il0sIm5hbWVzIjpbImRhdGFDb250ZXh0IiwicmVxdWlyZSIsIlNFUlZJQ0VfS0VZIiwiTWFuaWZlc3RTZXJ2aWNlIiwidXNlcm5hbWUiLCJjb25zb2xlIiwibG9nIiwiUHJvbWlzZSIsInJlc29sdmUiLCJyZWplY3QiLCJnZXRTZXJ2aWNlUHJveHkiLCJjcmVhdGVNYW5pZmVzdCIsImVycm9yIiwicmVzdWx0IiwibGlzdE1hbmlmZXN0Il0sIm1hcHBpbmdzIjoiOzs7Ozs7Ozs7O0FBQUEsSUFBSUEsY0FBY0MsUUFBUSxlQUFSLENBQWxCO0FBQ0EsSUFBTUMsY0FBYyxVQUFwQjs7SUFFYUMsZSxXQUFBQSxlO0FBQ1QsK0JBQWM7QUFBQTtBQUViOzs7O3VDQUNjQyxRLEVBQVM7QUFDcEJDLG9CQUFRQyxHQUFSLENBQVksOEJBQVo7QUFDQSxtQkFBTyxJQUFJQyxPQUFKLENBQWEsVUFBU0MsT0FBVCxFQUFpQkMsTUFBakIsRUFBd0I7QUFDeENULDRCQUFZVSxlQUFaLENBQTRCUixXQUE1QixFQUF5Q1MsY0FBekMsQ0FBd0QsRUFBQ1AsVUFBU0EsUUFBVixFQUF4RCxFQUE0RSxVQUFTUSxLQUFULEVBQWVDLE1BQWYsRUFBc0I7QUFDOUYsd0JBQUlELEtBQUosRUFBVTtBQUNOSCwrQkFBT0csS0FBUDtBQUNIO0FBQ0RKLDRCQUFTSyxNQUFUO0FBQ0gsaUJBTEQ7QUFNSCxhQVBNLENBQVA7QUFRSDs7OzBDQUNnQjtBQUNiLG1CQUFPLElBQUlOLE9BQUosQ0FBYSxVQUFTQyxPQUFULEVBQWlCQyxNQUFqQixFQUF3QjtBQUN4Q1QsNEJBQVlVLGVBQVosQ0FBNEJSLFdBQTVCLEVBQXlDWSxZQUF6QyxDQUFzRCxFQUF0RCxFQUF5RCxVQUFTRixLQUFULEVBQWVDLE1BQWYsRUFBc0I7QUFDM0Usd0JBQUlELEtBQUosRUFBVTtBQUNOSCwrQkFBT0csS0FBUDtBQUNIO0FBQ0RKLDRCQUFTSyxNQUFUO0FBQ0gsaUJBTEQ7QUFNSCxhQVBNLENBQVA7QUFRSCIsImZpbGUiOiJEYXRhU2VydmljZXMvTWFuaWZlc3RTZXJ2aWNlLmpzIiwic291cmNlc0NvbnRlbnQiOlsidmFyIGRhdGFDb250ZXh0ID0gcmVxdWlyZSgnLi9kYXRhQ29udGV4dCcpO1xyXG5jb25zdCBTRVJWSUNFX0tFWSA9ICdtYW5pZmVzdCc7XHJcblxyXG5leHBvcnQgY2xhc3MgTWFuaWZlc3RTZXJ2aWNle1xyXG4gICAgY29uc3RydWN0b3IgKCl7XHJcblxyXG4gICAgfVxyXG4gICAgY3JlYXRlTWFuZmllc3QodXNlcm5hbWUpe1xyXG4gICAgICAgIGNvbnNvbGUubG9nKFwiYWJvdXQgdG8gY3JlYXRlIHRoZSBtYW5pZmVzdFwiKTtcclxuICAgICAgICByZXR1cm4gbmV3IFByb21pc2UgKGZ1bmN0aW9uKHJlc29sdmUscmVqZWN0KXtcclxuICAgICAgICAgICAgZGF0YUNvbnRleHQuZ2V0U2VydmljZVByb3h5KFNFUlZJQ0VfS0VZKS5jcmVhdGVNYW5pZmVzdCh7dXNlcm5hbWU6dXNlcm5hbWV9LGZ1bmN0aW9uKGVycm9yLHJlc3VsdCl7XHJcbiAgICAgICAgICAgICAgICBpZiAoZXJyb3Ipe1xyXG4gICAgICAgICAgICAgICAgICAgIHJlamVjdChlcnJvcik7XHJcbiAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgICAgICByZXNvbHZlKCByZXN1bHQpO1xyXG4gICAgICAgICAgICB9KTtcclxuICAgICAgICB9KTtcclxuICAgIH1cclxuICAgIGxpc3RBbGxNYW5pZmVzdCgpe1xyXG4gICAgICAgIHJldHVybiBuZXcgUHJvbWlzZSAoZnVuY3Rpb24ocmVzb2x2ZSxyZWplY3Qpe1xyXG4gICAgICAgICAgICBkYXRhQ29udGV4dC5nZXRTZXJ2aWNlUHJveHkoU0VSVklDRV9LRVkpLmxpc3RNYW5pZmVzdCh7fSxmdW5jdGlvbihlcnJvcixyZXN1bHQpe1xyXG4gICAgICAgICAgICAgICAgaWYgKGVycm9yKXtcclxuICAgICAgICAgICAgICAgICAgICByZWplY3QoZXJyb3IpO1xyXG4gICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICAgICAgcmVzb2x2ZSggcmVzdWx0KTtcclxuICAgICAgICAgICAgfSk7XHJcbiAgICAgICAgfSk7XHJcbiAgICB9XHJcbn0iXX0=
