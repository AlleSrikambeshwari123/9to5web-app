'use strict';

Object.defineProperty(exports, "__esModule", {
    value: true
});

var _createClass = function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; }();

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

var cryptojs = require('crypto-js');
var jwt = require('jsonwebtoken');
var dataContext = require('./dataContext');
var SERVICE_KEY = 'users';

var UserService = exports.UserService = function () {
    function UserService() {
        _classCallCheck(this, UserService);
    }

    _createClass(UserService, [{
        key: 'authenticate',
        value: function authenticate(username, password) {
            return new Promise(function (resolve, reject) {
                var verifyUser = {
                    username: username,
                    password: password
                };
                dataContext.getServiceProxy(SERVICE_KEY).authenticate(verifyUser, function (error, validUser) {
                    resolve(validUser);
                });
                reject();
            });
        }
    }, {
        key: 'getUser',
        value: function getUser(username) {
            return new Promise(function (resolve, reject) {
                dataContext.getServiceProxy(SERVICE_KEY).getUser({ username: username }, function (error, result) {
                    if (error) {
                        reject(error);
                    }
                    resolve(result);
                });
            });
        }
    }, {
        key: 'getUserInRole',
        value: function getUserInRole(roleId) {
            return new Promise(function (resolve, reject) {
                dataContext.getServiceProxy(SERVICE_KEY).getUsersByRole({ roleId: roleId }, function (error, result) {
                    if (error) {
                        reject(error);
                    }
                    resolve(result);
                });
            });
        }
    }, {
        key: 'getRoles',
        value: function getRoles() {
            return new Promise(function (resolve, reject) {
                dataContext.getServiceProxy(SERVICE_KEY).getUserRoles({}, function (error, result) {
                    if (error) {
                        reject(error);
                    }
                    resolve(result);
                });
            });
        }
    }, {
        key: 'getAllUsers',
        value: function getAllUsers() {
            return new Promise(function (resolve, reject) {
                dataContext.getServiceProxy(SERVICE_KEY).getUsers({}, function (error, result) {
                    if (error) {
                        reject(error);
                    }
                    resolve(result);
                });
            });
        }
    }, {
        key: 'removeUser',
        value: function removeUser(username) {
            return new Promise(function (resolve, reject) {
                dataContext.getServiceProxy(SERVICE_KEY).removeUser({ username: username }, function (error, result) {
                    if (error) {
                        reject(error);
                    }
                    resolve(result);
                });
            });
        }
    }, {
        key: 'enableUser',
        value: function enableUser(username, enabled) {
            return new Promise(function (resolve, reject) {
                dataContext.getServiceProxy(SERVICE_KEY).enableUser({ username: username, enabled: enabled }, function (error, result) {
                    if (error) {
                        reject(error);
                    }
                    resolve(result);
                });
            });
        }
    }, {
        key: 'saveUser',
        value: function saveUser(user) {
            return new Promise(function (resolve, reject) {
                dataContext.getServiceProxy(SERVICE_KEY).saveUser(user, function (error, result) {
                    if (error) {
                        reject(error);
                    }
                    resolve(result);
                });
            });
        }
    }, {
        key: 'verifyToken',
        value: function verifyToken(token) {
            return new Promise(function (reslove, reject) {
                try {
                    var decodedJWT = jwt.verify(token, 'silver123.');
                    var bytes = cryptojs.AES.decrypt(decodedJWT.token, 'Silver123');
                    var tokenData = JSON.parse(bytes.toString(cryptojs.enc.Utf8));
                    /*  console.log('token data below');
                     console.log(tokenData);*/
                    reslove(tokenData);
                } catch (e) {
                    reject();
                }
            });
        }
    }, {
        key: 'generateToken',
        value: function generateToken(user) {
            return new Promise(function (resolve, reject) {

                var stringData = JSON.stringify(user);
                var encryptedData = cryptojs.AES.encrypt(stringData, 'Silver123').toString();

                var token = jwt.sign({
                    token: encryptedData
                }, 'silver123.');
                resolve(token);
            });
        }
    }]);

    return UserService;
}();
//# sourceMappingURL=data:application/json;charset=utf8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIkRhdGFTZXJ2aWNlcy9Vc2VyRGF0YVNlcnZpY2UuZXM2Il0sIm5hbWVzIjpbImNyeXB0b2pzIiwicmVxdWlyZSIsImp3dCIsImRhdGFDb250ZXh0IiwiU0VSVklDRV9LRVkiLCJVc2VyU2VydmljZSIsInVzZXJuYW1lIiwicGFzc3dvcmQiLCJQcm9taXNlIiwicmVzb2x2ZSIsInJlamVjdCIsInZlcmlmeVVzZXIiLCJnZXRTZXJ2aWNlUHJveHkiLCJhdXRoZW50aWNhdGUiLCJlcnJvciIsInZhbGlkVXNlciIsImdldFVzZXIiLCJyZXN1bHQiLCJyb2xlSWQiLCJnZXRVc2Vyc0J5Um9sZSIsImdldFVzZXJSb2xlcyIsImdldFVzZXJzIiwicmVtb3ZlVXNlciIsImVuYWJsZWQiLCJlbmFibGVVc2VyIiwidXNlciIsInNhdmVVc2VyIiwidG9rZW4iLCJyZXNsb3ZlIiwiZGVjb2RlZEpXVCIsInZlcmlmeSIsImJ5dGVzIiwiQUVTIiwiZGVjcnlwdCIsInRva2VuRGF0YSIsIkpTT04iLCJwYXJzZSIsInRvU3RyaW5nIiwiZW5jIiwiVXRmOCIsImUiLCJzdHJpbmdEYXRhIiwic3RyaW5naWZ5IiwiZW5jcnlwdGVkRGF0YSIsImVuY3J5cHQiLCJzaWduIl0sIm1hcHBpbmdzIjoiOzs7Ozs7Ozs7O0FBQUEsSUFBSUEsV0FBWUMsUUFBUSxXQUFSLENBQWhCO0FBQ0EsSUFBSUMsTUFBTUQsUUFBUSxjQUFSLENBQVY7QUFDQSxJQUFJRSxjQUFjRixRQUFRLGVBQVIsQ0FBbEI7QUFDQSxJQUFNRyxjQUFjLE9BQXBCOztJQUNhQyxXLFdBQUFBLFc7QUFDVCwyQkFBYTtBQUFBO0FBRVo7Ozs7cUNBQ2FDLFEsRUFBU0MsUSxFQUFTO0FBQzVCLG1CQUFPLElBQUlDLE9BQUosQ0FBWSxVQUFTQyxPQUFULEVBQWlCQyxNQUFqQixFQUF3QjtBQUN2QyxvQkFBSUMsYUFBYztBQUNkTCw4QkFBVUEsUUFESTtBQUVkQyw4QkFBU0E7QUFGSyxpQkFBbEI7QUFJQUosNEJBQVlTLGVBQVosQ0FBNEJSLFdBQTVCLEVBQXlDUyxZQUF6QyxDQUFzREYsVUFBdEQsRUFBaUUsVUFBU0csS0FBVCxFQUFlQyxTQUFmLEVBQXlCO0FBQ3RGTiw0QkFBU00sU0FBVDtBQUNILGlCQUZEO0FBR0FMO0FBQ0gsYUFUTSxDQUFQO0FBVUg7OztnQ0FDT0osUSxFQUFTO0FBQ2IsbUJBQU8sSUFBSUUsT0FBSixDQUFhLFVBQVNDLE9BQVQsRUFBaUJDLE1BQWpCLEVBQXdCO0FBQ3hDUCw0QkFBWVMsZUFBWixDQUE0QlIsV0FBNUIsRUFBeUNZLE9BQXpDLENBQWlELEVBQUNWLFVBQVNBLFFBQVYsRUFBakQsRUFBcUUsVUFBU1EsS0FBVCxFQUFlRyxNQUFmLEVBQXNCO0FBQ3ZGLHdCQUFJSCxLQUFKLEVBQVU7QUFDTkosK0JBQU9JLEtBQVA7QUFDSDtBQUNETCw0QkFBU1EsTUFBVDtBQUNILGlCQUxEO0FBTUgsYUFQTSxDQUFQO0FBUUg7OztzQ0FDYUMsTSxFQUFPO0FBQ2pCLG1CQUFPLElBQUlWLE9BQUosQ0FBYSxVQUFTQyxPQUFULEVBQWlCQyxNQUFqQixFQUF3QjtBQUN4Q1AsNEJBQVlTLGVBQVosQ0FBNEJSLFdBQTVCLEVBQXlDZSxjQUF6QyxDQUF3RCxFQUFDRCxRQUFPQSxNQUFSLEVBQXhELEVBQXdFLFVBQVNKLEtBQVQsRUFBZUcsTUFBZixFQUFzQjtBQUMxRix3QkFBSUgsS0FBSixFQUFVO0FBQ05KLCtCQUFPSSxLQUFQO0FBQ0g7QUFDREwsNEJBQVNRLE1BQVQ7QUFDSCxpQkFMRDtBQU1ILGFBUE0sQ0FBUDtBQVFIOzs7bUNBQ1M7QUFDTixtQkFBTyxJQUFJVCxPQUFKLENBQWEsVUFBU0MsT0FBVCxFQUFpQkMsTUFBakIsRUFBd0I7QUFDeENQLDRCQUFZUyxlQUFaLENBQTRCUixXQUE1QixFQUF5Q2dCLFlBQXpDLENBQXNELEVBQXRELEVBQXlELFVBQVNOLEtBQVQsRUFBZUcsTUFBZixFQUFzQjtBQUMzRSx3QkFBSUgsS0FBSixFQUFVO0FBQ05KLCtCQUFPSSxLQUFQO0FBQ0g7QUFDREwsNEJBQVNRLE1BQVQ7QUFDSCxpQkFMRDtBQU1ILGFBUE0sQ0FBUDtBQVFIOzs7c0NBQ1k7QUFDVCxtQkFBTyxJQUFJVCxPQUFKLENBQWEsVUFBU0MsT0FBVCxFQUFpQkMsTUFBakIsRUFBd0I7QUFDeENQLDRCQUFZUyxlQUFaLENBQTRCUixXQUE1QixFQUF5Q2lCLFFBQXpDLENBQWtELEVBQWxELEVBQXFELFVBQVNQLEtBQVQsRUFBZUcsTUFBZixFQUFzQjtBQUN2RSx3QkFBSUgsS0FBSixFQUFVO0FBQ05KLCtCQUFPSSxLQUFQO0FBQ0g7QUFDREwsNEJBQVNRLE1BQVQ7QUFDSCxpQkFMRDtBQU1ILGFBUE0sQ0FBUDtBQVFIOzs7bUNBQ1VYLFEsRUFBUztBQUNoQixtQkFBTyxJQUFJRSxPQUFKLENBQWEsVUFBU0MsT0FBVCxFQUFpQkMsTUFBakIsRUFBd0I7QUFDeENQLDRCQUFZUyxlQUFaLENBQTRCUixXQUE1QixFQUF5Q2tCLFVBQXpDLENBQW9ELEVBQUNoQixVQUFTQSxRQUFWLEVBQXBELEVBQXdFLFVBQVNRLEtBQVQsRUFBZUcsTUFBZixFQUFzQjtBQUMxRix3QkFBSUgsS0FBSixFQUFVO0FBQ05KLCtCQUFPSSxLQUFQO0FBQ0g7QUFDREwsNEJBQVNRLE1BQVQ7QUFDSCxpQkFMRDtBQU1ILGFBUE0sQ0FBUDtBQVFIOzs7bUNBQ1VYLFEsRUFBU2lCLE8sRUFBUTtBQUN4QixtQkFBTyxJQUFJZixPQUFKLENBQWEsVUFBU0MsT0FBVCxFQUFpQkMsTUFBakIsRUFBd0I7QUFDeENQLDRCQUFZUyxlQUFaLENBQTRCUixXQUE1QixFQUF5Q29CLFVBQXpDLENBQW9ELEVBQUNsQixVQUFTQSxRQUFWLEVBQW1CaUIsU0FBUUEsT0FBM0IsRUFBcEQsRUFBd0YsVUFBU1QsS0FBVCxFQUFlRyxNQUFmLEVBQXNCO0FBQzFHLHdCQUFJSCxLQUFKLEVBQVU7QUFDTkosK0JBQU9JLEtBQVA7QUFDSDtBQUNETCw0QkFBU1EsTUFBVDtBQUNILGlCQUxEO0FBTUgsYUFQTSxDQUFQO0FBUUg7OztpQ0FDUVEsSSxFQUFLO0FBQ1YsbUJBQU8sSUFBSWpCLE9BQUosQ0FBYSxVQUFTQyxPQUFULEVBQWlCQyxNQUFqQixFQUF3QjtBQUN4Q1AsNEJBQVlTLGVBQVosQ0FBNEJSLFdBQTVCLEVBQXlDc0IsUUFBekMsQ0FBa0RELElBQWxELEVBQXVELFVBQVNYLEtBQVQsRUFBZUcsTUFBZixFQUFzQjtBQUN6RSx3QkFBSUgsS0FBSixFQUFVO0FBQ05KLCtCQUFPSSxLQUFQO0FBQ0g7QUFDREwsNEJBQVNRLE1BQVQ7QUFDSCxpQkFMRDtBQU1ILGFBUE0sQ0FBUDtBQVFIOzs7b0NBQ1lVLEssRUFBTTtBQUNmLG1CQUFPLElBQUluQixPQUFKLENBQVksVUFBU29CLE9BQVQsRUFBaUJsQixNQUFqQixFQUF3QjtBQUN2QyxvQkFBSTtBQUNBLHdCQUFJbUIsYUFBYTNCLElBQUk0QixNQUFKLENBQVdILEtBQVgsRUFBaUIsWUFBakIsQ0FBakI7QUFDQSx3QkFBSUksUUFBUS9CLFNBQVNnQyxHQUFULENBQWFDLE9BQWIsQ0FBcUJKLFdBQVdGLEtBQWhDLEVBQXNDLFdBQXRDLENBQVo7QUFDQSx3QkFBSU8sWUFBWUMsS0FBS0MsS0FBTCxDQUFXTCxNQUFNTSxRQUFOLENBQWVyQyxTQUFTc0MsR0FBVCxDQUFhQyxJQUE1QixDQUFYLENBQWhCO0FBQ0E7O0FBRUFYLDRCQUFRTSxTQUFSO0FBQ0gsaUJBUEQsQ0FRQSxPQUFNTSxDQUFOLEVBQVE7QUFDSjlCO0FBQ0g7QUFFSixhQWJNLENBQVA7QUFjSDs7O3NDQUNjZSxJLEVBQUs7QUFDaEIsbUJBQU8sSUFBSWpCLE9BQUosQ0FBWSxVQUFTQyxPQUFULEVBQWlCQyxNQUFqQixFQUF3Qjs7QUFFdkMsb0JBQUkrQixhQUFhTixLQUFLTyxTQUFMLENBQWVqQixJQUFmLENBQWpCO0FBQ0Esb0JBQUlrQixnQkFBZ0IzQyxTQUFTZ0MsR0FBVCxDQUFhWSxPQUFiLENBQXFCSCxVQUFyQixFQUFnQyxXQUFoQyxFQUE2Q0osUUFBN0MsRUFBcEI7O0FBRUEsb0JBQUlWLFFBQVF6QixJQUFJMkMsSUFBSixDQUFTO0FBQ2pCbEIsMkJBQU1nQjtBQURXLGlCQUFULEVBRVQsWUFGUyxDQUFaO0FBR0FsQyx3QkFBU2tCLEtBQVQ7QUFDSCxhQVRNLENBQVA7QUFXSCIsImZpbGUiOiJEYXRhU2VydmljZXMvVXNlckRhdGFTZXJ2aWNlLmpzIiwic291cmNlc0NvbnRlbnQiOlsidmFyIGNyeXB0b2pzICA9IHJlcXVpcmUoJ2NyeXB0by1qcycpO1xyXG52YXIgand0ID0gcmVxdWlyZSgnanNvbndlYnRva2VuJyk7XHJcbnZhciBkYXRhQ29udGV4dCA9IHJlcXVpcmUoJy4vZGF0YUNvbnRleHQnKTtcclxuY29uc3QgU0VSVklDRV9LRVkgPSAndXNlcnMnO1xyXG5leHBvcnQgY2xhc3MgVXNlclNlcnZpY2Uge1xyXG4gICAgY29uc3RydWN0b3IoKXtcclxuXHJcbiAgICB9XHJcbiAgICBhdXRoZW50aWNhdGUgKHVzZXJuYW1lLHBhc3N3b3JkKXtcclxuICAgICAgICByZXR1cm4gbmV3IFByb21pc2UoZnVuY3Rpb24ocmVzb2x2ZSxyZWplY3Qpe1xyXG4gICAgICAgICAgICB2YXIgdmVyaWZ5VXNlciAgPSB7XHJcbiAgICAgICAgICAgICAgICB1c2VybmFtZTogdXNlcm5hbWUsXHJcbiAgICAgICAgICAgICAgICBwYXNzd29yZDpwYXNzd29yZFxyXG4gICAgICAgICAgICB9O1xyXG4gICAgICAgICAgICBkYXRhQ29udGV4dC5nZXRTZXJ2aWNlUHJveHkoU0VSVklDRV9LRVkpLmF1dGhlbnRpY2F0ZSh2ZXJpZnlVc2VyLGZ1bmN0aW9uKGVycm9yLHZhbGlkVXNlcil7XHJcbiAgICAgICAgICAgICAgICByZXNvbHZlKCB2YWxpZFVzZXIpO1xyXG4gICAgICAgICAgICB9KTtcclxuICAgICAgICAgICAgcmVqZWN0KCk7XHJcbiAgICAgICAgfSk7XHJcbiAgICB9XHJcbiAgICBnZXRVc2VyKHVzZXJuYW1lKXtcclxuICAgICAgICByZXR1cm4gbmV3IFByb21pc2UgKGZ1bmN0aW9uKHJlc29sdmUscmVqZWN0KXtcclxuICAgICAgICAgICAgZGF0YUNvbnRleHQuZ2V0U2VydmljZVByb3h5KFNFUlZJQ0VfS0VZKS5nZXRVc2VyKHt1c2VybmFtZTp1c2VybmFtZX0sZnVuY3Rpb24oZXJyb3IscmVzdWx0KXtcclxuICAgICAgICAgICAgICAgIGlmIChlcnJvcil7XHJcbiAgICAgICAgICAgICAgICAgICAgcmVqZWN0KGVycm9yKTtcclxuICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgICAgIHJlc29sdmUoIHJlc3VsdCk7XHJcbiAgICAgICAgICAgIH0pO1xyXG4gICAgICAgIH0pO1xyXG4gICAgfVxyXG4gICAgZ2V0VXNlckluUm9sZShyb2xlSWQpe1xyXG4gICAgICAgIHJldHVybiBuZXcgUHJvbWlzZSAoZnVuY3Rpb24ocmVzb2x2ZSxyZWplY3Qpe1xyXG4gICAgICAgICAgICBkYXRhQ29udGV4dC5nZXRTZXJ2aWNlUHJveHkoU0VSVklDRV9LRVkpLmdldFVzZXJzQnlSb2xlKHtyb2xlSWQ6cm9sZUlkfSxmdW5jdGlvbihlcnJvcixyZXN1bHQpe1xyXG4gICAgICAgICAgICAgICAgaWYgKGVycm9yKXtcclxuICAgICAgICAgICAgICAgICAgICByZWplY3QoZXJyb3IpO1xyXG4gICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICAgICAgcmVzb2x2ZSggcmVzdWx0KTtcclxuICAgICAgICAgICAgfSk7XHJcbiAgICAgICAgfSk7XHJcbiAgICB9XHJcbiAgICBnZXRSb2xlcygpe1xyXG4gICAgICAgIHJldHVybiBuZXcgUHJvbWlzZSAoZnVuY3Rpb24ocmVzb2x2ZSxyZWplY3Qpe1xyXG4gICAgICAgICAgICBkYXRhQ29udGV4dC5nZXRTZXJ2aWNlUHJveHkoU0VSVklDRV9LRVkpLmdldFVzZXJSb2xlcyh7fSxmdW5jdGlvbihlcnJvcixyZXN1bHQpe1xyXG4gICAgICAgICAgICAgICAgaWYgKGVycm9yKXtcclxuICAgICAgICAgICAgICAgICAgICByZWplY3QoZXJyb3IpO1xyXG4gICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICAgICAgcmVzb2x2ZSggcmVzdWx0KTtcclxuICAgICAgICAgICAgfSk7XHJcbiAgICAgICAgfSk7XHJcbiAgICB9XHJcbiAgICBnZXRBbGxVc2Vycygpe1xyXG4gICAgICAgIHJldHVybiBuZXcgUHJvbWlzZSAoZnVuY3Rpb24ocmVzb2x2ZSxyZWplY3Qpe1xyXG4gICAgICAgICAgICBkYXRhQ29udGV4dC5nZXRTZXJ2aWNlUHJveHkoU0VSVklDRV9LRVkpLmdldFVzZXJzKHt9LGZ1bmN0aW9uKGVycm9yLHJlc3VsdCl7XHJcbiAgICAgICAgICAgICAgICBpZiAoZXJyb3Ipe1xyXG4gICAgICAgICAgICAgICAgICAgIHJlamVjdChlcnJvcik7XHJcbiAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgICAgICByZXNvbHZlKCByZXN1bHQpO1xyXG4gICAgICAgICAgICB9KTtcclxuICAgICAgICB9KTtcclxuICAgIH1cclxuICAgIHJlbW92ZVVzZXIodXNlcm5hbWUpe1xyXG4gICAgICAgIHJldHVybiBuZXcgUHJvbWlzZSAoZnVuY3Rpb24ocmVzb2x2ZSxyZWplY3Qpe1xyXG4gICAgICAgICAgICBkYXRhQ29udGV4dC5nZXRTZXJ2aWNlUHJveHkoU0VSVklDRV9LRVkpLnJlbW92ZVVzZXIoe3VzZXJuYW1lOnVzZXJuYW1lfSxmdW5jdGlvbihlcnJvcixyZXN1bHQpe1xyXG4gICAgICAgICAgICAgICAgaWYgKGVycm9yKXtcclxuICAgICAgICAgICAgICAgICAgICByZWplY3QoZXJyb3IpO1xyXG4gICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICAgICAgcmVzb2x2ZSggcmVzdWx0KTtcclxuICAgICAgICAgICAgfSk7XHJcbiAgICAgICAgfSk7XHJcbiAgICB9XHJcbiAgICBlbmFibGVVc2VyKHVzZXJuYW1lLGVuYWJsZWQpe1xyXG4gICAgICAgIHJldHVybiBuZXcgUHJvbWlzZSAoZnVuY3Rpb24ocmVzb2x2ZSxyZWplY3Qpe1xyXG4gICAgICAgICAgICBkYXRhQ29udGV4dC5nZXRTZXJ2aWNlUHJveHkoU0VSVklDRV9LRVkpLmVuYWJsZVVzZXIoe3VzZXJuYW1lOnVzZXJuYW1lLGVuYWJsZWQ6ZW5hYmxlZH0sZnVuY3Rpb24oZXJyb3IscmVzdWx0KXtcclxuICAgICAgICAgICAgICAgIGlmIChlcnJvcil7XHJcbiAgICAgICAgICAgICAgICAgICAgcmVqZWN0KGVycm9yKTtcclxuICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgICAgIHJlc29sdmUoIHJlc3VsdCk7XHJcbiAgICAgICAgICAgIH0pO1xyXG4gICAgICAgIH0pO1xyXG4gICAgfVxyXG4gICAgc2F2ZVVzZXIodXNlcil7XHJcbiAgICAgICAgcmV0dXJuIG5ldyBQcm9taXNlIChmdW5jdGlvbihyZXNvbHZlLHJlamVjdCl7XHJcbiAgICAgICAgICAgIGRhdGFDb250ZXh0LmdldFNlcnZpY2VQcm94eShTRVJWSUNFX0tFWSkuc2F2ZVVzZXIodXNlcixmdW5jdGlvbihlcnJvcixyZXN1bHQpe1xyXG4gICAgICAgICAgICAgICAgaWYgKGVycm9yKXtcclxuICAgICAgICAgICAgICAgICAgICByZWplY3QoZXJyb3IpO1xyXG4gICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICAgICAgcmVzb2x2ZSggcmVzdWx0KTtcclxuICAgICAgICAgICAgfSk7XHJcbiAgICAgICAgfSk7XHJcbiAgICB9XHJcbiAgICB2ZXJpZnlUb2tlbiAodG9rZW4pe1xyXG4gICAgICAgIHJldHVybiBuZXcgUHJvbWlzZShmdW5jdGlvbihyZXNsb3ZlLHJlamVjdCl7XHJcbiAgICAgICAgICAgIHRyeSB7XHJcbiAgICAgICAgICAgICAgICB2YXIgZGVjb2RlZEpXVCA9IGp3dC52ZXJpZnkodG9rZW4sJ3NpbHZlcjEyMy4nKTtcclxuICAgICAgICAgICAgICAgIHZhciBieXRlcyA9IGNyeXB0b2pzLkFFUy5kZWNyeXB0KGRlY29kZWRKV1QudG9rZW4sJ1NpbHZlcjEyMycpO1xyXG4gICAgICAgICAgICAgICAgdmFyIHRva2VuRGF0YSA9IEpTT04ucGFyc2UoYnl0ZXMudG9TdHJpbmcoY3J5cHRvanMuZW5jLlV0ZjgpKTtcclxuICAgICAgICAgICAgICAgIC8qICBjb25zb2xlLmxvZygndG9rZW4gZGF0YSBiZWxvdycpO1xyXG4gICAgICAgICAgICAgICAgIGNvbnNvbGUubG9nKHRva2VuRGF0YSk7Ki9cclxuICAgICAgICAgICAgICAgIHJlc2xvdmUodG9rZW5EYXRhKTtcclxuICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICBjYXRjaChlKXtcclxuICAgICAgICAgICAgICAgIHJlamVjdCgpO1xyXG4gICAgICAgICAgICB9XHJcblxyXG4gICAgICAgIH0pO1xyXG4gICAgfVxyXG4gICAgZ2VuZXJhdGVUb2tlbiAodXNlcil7XHJcbiAgICAgICAgcmV0dXJuIG5ldyBQcm9taXNlKGZ1bmN0aW9uKHJlc29sdmUscmVqZWN0KXtcclxuXHJcbiAgICAgICAgICAgIHZhciBzdHJpbmdEYXRhID0gSlNPTi5zdHJpbmdpZnkodXNlcik7XHJcbiAgICAgICAgICAgIHZhciBlbmNyeXB0ZWREYXRhID0gY3J5cHRvanMuQUVTLmVuY3J5cHQoc3RyaW5nRGF0YSwnU2lsdmVyMTIzJykudG9TdHJpbmcoKTtcclxuXHJcbiAgICAgICAgICAgIHZhciB0b2tlbiA9IGp3dC5zaWduKHtcclxuICAgICAgICAgICAgICAgIHRva2VuOmVuY3J5cHRlZERhdGFcclxuICAgICAgICAgICAgfSwgJ3NpbHZlcjEyMy4nKTtcclxuICAgICAgICAgICAgcmVzb2x2ZSggdG9rZW4pO1xyXG4gICAgICAgIH0pO1xyXG5cclxuICAgIH1cclxufSJdfQ==
