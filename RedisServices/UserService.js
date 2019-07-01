'use strict';

Object.defineProperty(exports, "__esModule", {
    value: true
});

var _createClass = function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; }();

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

var cryptojs = require('crypto-js');
var jwt = require('jsonwebtoken');
var redis = require('redis');
var lredis = require('./redis-local');
var moment = require('moment');
var redisSearch = require('../redisearchclient');
var SERVICE_KEY = 'users';
var bcrypt = require('bcrypt');
var PREFIX = "user:";
var INDEX = "index:users";
var USERIDCOUNTER = "user:id";
var client = redis.createClient(6379, "core.shiptropical.com", {
    auth_pass: 'Silver123.',
    tls: {
        servername: 'core.shiptropical.com'
    }
});

var UserService = exports.UserService = function () {
    function UserService() {
        _classCallCheck(this, UserService);

        this.redisIndexSearch = redisSearch(redis, 'index:users', {
            clientOptions: lredis.searchClientDetails
        });
    }

    _createClass(UserService, [{
        key: 'authenticate',
        value: function authenticate(username, password) {
            var srv = this;
            console.log('about to auth');
            return new Promise(function (resolve, reject) {

                client.hgetall(PREFIX + username, function (err, result) {

                    console.log(result, "is the results");
                    if (result) {
                        console.log(result);
                        bcrypt.compare(password, result.password, function (err, pwdResult) {
                            if (err) {
                                console.log(err);
                            }
                            if (pwdResult == true) {
                                delete result.password;
                                srv.generateToken(result).then(function (token) {
                                    resolve({ user: result, token: token, valid: true });
                                });
                            } else {
                                resolve({ user: null, token: "", valid: false });
                            }
                        });
                    } else {
                        resolve({ user: null, token: "", valid: false });
                    }
                });
            });
        }
    }, {
        key: 'getUser',
        value: function getUser(username) {
            return new Promise(function (resolve, reject) {
                client.hgetall(PREFIX + username, function (err, result) {
                    if (result) {
                        delete result.password;
                        resolve({ user: result });
                    }
                });
            });
        }
    }, {
        key: 'getUsersInRole',
        value: function getUsersInRole(roleId) {
            return new Promise(function (resolve, reject) {

                // dataContext.getServiceProxy(SERVICE_KEY).getUsersByRole({roleId:roleId},function(error,result){
                //     if (error){
                //         reject(error);
                //     }
                //     resolve( result);
                // });
            });
        }
    }, {
        key: 'getRoles',
        value: function getRoles() {
            return new Promise(function (resolve, reject) {

                resolve(["Admin", "Warehouse MIA", "Customs Agent", "Warehouse TT", "Cashier", "Location Manager"]);
            });
        }
    }, {
        key: 'getAllUsers',
        value: function getAllUsers(pageSize, currentPage) {
            var srv = this;
            return new Promise(function (resolve, reject) {
                var offset;
                srv.redisIndexSearch.search('*', {
                    offset: 0,
                    numberOfResults: 1000,
                    sortBy: "lastName",
                    dir: "ASC"
                }, function (err, results) {
                    var users = [];
                    results.results.forEach(function (element) {
                        delete element.doc.password;
                        users.push(element.doc);
                    });
                    resolve(users);
                });
            });
        }
    }, {
        key: 'removeUser',
        value: function removeUser(username) {
            return new Promise(function (resolve, reject) {
                var idx = this.redisIndexSearch;
                lredis.hgetall(PREFIX + username).then(function (user) {
                    idx.delete(user.id);
                    client.delete(PREFIX + username, function (err, result) {
                        if (err) {
                            console.log("unable to delete");
                        }
                        resolve({ removed: true });
                    });
                });
                //find the user by username 
                //get the doc Id 
                //delete from index 
                //delete hash 
            });
        }
    }, {
        key: 'enableUser',
        value: function enableUser(username, enabled) {
            return new Promise(function (resolve, reject) {
                client.hmset(PREFIX + username, { enabled: enabled }, function (err, result) {
                    if (err) {
                        resolve({ updated: false });
                    } else {
                        resolve({ updated: true });
                    }
                });
            });
        }
    }, {
        key: 'saveUser',
        value: function saveUser(user) {
            var srv = this;
            return new Promise(function (resolve, reject) {
                srv.checkUsername(user.username).then(function (valid) {
                    console.log(valid);
                    if (valid.taken == false) {
                        //create the hash 
                        client.incr(USERIDCOUNTER, function (err, id) {
                            user.id = id;
                            user.password = bcrypt.hashSync(user.password, 10);
                            lredis.hmset(PREFIX + user.username, user);
                            addUserToIndex(user, srv.redisIndexSearch);
                        });
                    } else {
                        //update the user 
                        resolve({ saved: false, "message": "Username taken" });
                    }
                });
                // dataContext.getServiceProxy(SERVICE_KEY).saveUser(user,function(error,result){
                //     if (error){
                //         reject(error);
                //     }
                //     resolve( result);
                // });
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
                    console.log(e, "unable to verify token");
                    reject();
                }
            });
        }
    }, {
        key: 'checkUsername',
        value: function checkUsername(username) {
            return new Promise(function (resolve, reject) {
                //we can check in 2 ways one see if the hash exists 
                client.exists(PREFIX + username, function (err, results) {
                    console.log(results);
                    if (Number(results) == 1) {
                        resolve({ taken: true });
                    } else resolve({ taken: false });
                });
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

function createDocument(account) {
    var customerDocument = {
        id: account.id,
        username: account.username,
        email: account.email,
        firstName: account.firstName,
        lastName: account.lastName,
        password: account.password,
        mobile: account.mobile,
        role: account.role
    };
    console.log(customerDocument);
    return customerDocument;
}
function addUserToIndex(account, searchObj) {
    var userDocument = createDocument(account);
    searchObj.add(account.id, userDocument);
}
//# sourceMappingURL=data:application/json;charset=utf8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIlJlZGlzU2VydmljZXMvVXNlclNlcnZpY2UuZXM2Il0sIm5hbWVzIjpbImNyeXB0b2pzIiwicmVxdWlyZSIsImp3dCIsInJlZGlzIiwibHJlZGlzIiwibW9tZW50IiwicmVkaXNTZWFyY2giLCJTRVJWSUNFX0tFWSIsImJjcnlwdCIsIlBSRUZJWCIsIklOREVYIiwiVVNFUklEQ09VTlRFUiIsImNsaWVudCIsImNyZWF0ZUNsaWVudCIsImF1dGhfcGFzcyIsInRscyIsInNlcnZlcm5hbWUiLCJVc2VyU2VydmljZSIsInJlZGlzSW5kZXhTZWFyY2giLCJjbGllbnRPcHRpb25zIiwic2VhcmNoQ2xpZW50RGV0YWlscyIsInVzZXJuYW1lIiwicGFzc3dvcmQiLCJzcnYiLCJjb25zb2xlIiwibG9nIiwiUHJvbWlzZSIsInJlc29sdmUiLCJyZWplY3QiLCJoZ2V0YWxsIiwiZXJyIiwicmVzdWx0IiwiY29tcGFyZSIsInB3ZFJlc3VsdCIsImdlbmVyYXRlVG9rZW4iLCJ0aGVuIiwidXNlciIsInRva2VuIiwidmFsaWQiLCJyb2xlSWQiLCJwYWdlU2l6ZSIsImN1cnJlbnRQYWdlIiwib2Zmc2V0Iiwic2VhcmNoIiwibnVtYmVyT2ZSZXN1bHRzIiwic29ydEJ5IiwiZGlyIiwicmVzdWx0cyIsInVzZXJzIiwiZm9yRWFjaCIsImVsZW1lbnQiLCJkb2MiLCJwdXNoIiwiaWR4IiwiZGVsZXRlIiwiaWQiLCJyZW1vdmVkIiwiZW5hYmxlZCIsImhtc2V0IiwidXBkYXRlZCIsImNoZWNrVXNlcm5hbWUiLCJ0YWtlbiIsImluY3IiLCJoYXNoU3luYyIsImFkZFVzZXJUb0luZGV4Iiwic2F2ZWQiLCJyZXNsb3ZlIiwiZGVjb2RlZEpXVCIsInZlcmlmeSIsImJ5dGVzIiwiQUVTIiwiZGVjcnlwdCIsInRva2VuRGF0YSIsIkpTT04iLCJwYXJzZSIsInRvU3RyaW5nIiwiZW5jIiwiVXRmOCIsImUiLCJleGlzdHMiLCJOdW1iZXIiLCJzdHJpbmdEYXRhIiwic3RyaW5naWZ5IiwiZW5jcnlwdGVkRGF0YSIsImVuY3J5cHQiLCJzaWduIiwiY3JlYXRlRG9jdW1lbnQiLCJhY2NvdW50IiwiY3VzdG9tZXJEb2N1bWVudCIsImVtYWlsIiwiZmlyc3ROYW1lIiwibGFzdE5hbWUiLCJtb2JpbGUiLCJyb2xlIiwic2VhcmNoT2JqIiwidXNlckRvY3VtZW50IiwiYWRkIl0sIm1hcHBpbmdzIjoiOzs7Ozs7Ozs7O0FBQUEsSUFBSUEsV0FBWUMsUUFBUSxXQUFSLENBQWhCO0FBQ0EsSUFBSUMsTUFBTUQsUUFBUSxjQUFSLENBQVY7QUFDQSxJQUFJRSxRQUFRRixRQUFRLE9BQVIsQ0FBWjtBQUNBLElBQUlHLFNBQVNILFFBQVEsZUFBUixDQUFiO0FBQ0EsSUFBSUksU0FBU0osUUFBUSxRQUFSLENBQWI7QUFDQSxJQUFJSyxjQUFjTCxRQUFRLHFCQUFSLENBQWxCO0FBQ0EsSUFBTU0sY0FBYyxPQUFwQjtBQUNBLElBQUlDLFNBQVNQLFFBQVEsUUFBUixDQUFiO0FBQ0EsSUFBTVEsU0FBVSxPQUFoQjtBQUNBLElBQU1DLFFBQVEsYUFBZDtBQUNBLElBQU1DLGdCQUFnQixTQUF0QjtBQUNBLElBQUlDLFNBQVNULE1BQU1VLFlBQU4sQ0FBbUIsSUFBbkIsRUFBeUIsdUJBQXpCLEVBQWtEO0FBQzNEQyxlQUFXLFlBRGdEO0FBRTNEQyxTQUFJO0FBQ0FDLG9CQUFZO0FBRFo7QUFGdUQsQ0FBbEQsQ0FBYjs7SUFNYUMsVyxXQUFBQSxXO0FBQ1QsMkJBQWE7QUFBQTs7QUFDVCxhQUFLQyxnQkFBTCxHQUF3QlosWUFBWUgsS0FBWixFQUFtQixhQUFuQixFQUFrQztBQUN0RGdCLDJCQUFjZixPQUFPZ0I7QUFEaUMsU0FBbEMsQ0FBeEI7QUFHSDs7OztxQ0FDYUMsUSxFQUFTQyxRLEVBQVM7QUFDNUIsZ0JBQUlDLE1BQU0sSUFBVjtBQUNBQyxvQkFBUUMsR0FBUixDQUFZLGVBQVo7QUFDQSxtQkFBTyxJQUFJQyxPQUFKLENBQVksVUFBU0MsT0FBVCxFQUFpQkMsTUFBakIsRUFBd0I7O0FBRXZDaEIsdUJBQU9pQixP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UUFBUUksUUFMQztBQU1uQnJFLGtCQUFTaUUsUUFBUWpFLFFBTkU7QUFPbkJzRSxnQkFBUUwsUUFBUUssTUFQRztBQVFuQkMsY0FBTU4sUUFBUU07QUFSSyxLQUF2QjtBQVVBckUsWUFBUUMsR0FBUixDQUFZK0QsZ0JBQVo7QUFDQSxXQUFPQSxnQkFBUDtBQUNGO0FBQ0QsU0FBU3hCLGNBQVQsQ0FBd0J1QixPQUF4QixFQUFpQ08sU0FBakMsRUFBMkM7QUFDdkMsUUFBSUMsZUFBZVQsZUFBZUMsT0FBZixDQUFuQjtBQUNBTyxjQUFVRSxHQUFWLENBQWNULFFBQVFoQyxFQUF0QixFQUF5QndDLFlBQXpCO0FBQ0giLCJmaWxlIjoiUmVkaXNTZXJ2aWNlcy9Vc2VyU2VydmljZS5qcyIsInNvdXJjZXNDb250ZW50IjpbInZhciBjcnlwdG9qcyAgPSByZXF1aXJlKCdjcnlwdG8tanMnKTtcclxudmFyIGp3dCA9IHJlcXVpcmUoJ2pzb253ZWJ0b2tlbicpO1xyXG52YXIgcmVkaXMgPSByZXF1aXJlKCdyZWRpcycpO1xyXG52YXIgbHJlZGlzID0gcmVxdWlyZSgnLi9yZWRpcy1sb2NhbCcpO1xyXG52YXIgbW9tZW50ID0gcmVxdWlyZSgnbW9tZW50Jyk7XHJcbnZhciByZWRpc1NlYXJjaCA9IHJlcXVpcmUoJy4uL3JlZGlzZWFyY2hjbGllbnQnKTtcclxuY29uc3QgU0VSVklDRV9LRVkgPSAndXNlcnMnO1xyXG52YXIgYmNyeXB0ID0gcmVxdWlyZSgnYmNyeXB0Jyk7IFxyXG5jb25zdCBQUkVGSVggID0gXCJ1c2VyOlwiXHJcbmNvbnN0IElOREVYID0gXCJpbmRleDp1c2Vyc1wiXHJcbmNvbnN0IFVTRVJJRENPVU5URVIgPSBcInVzZXI6aWRcIjsgXHJcbnZhciBjbGllbnQgPSByZWRpcy5jcmVhdGVDbGllbnQoNjM3OSwgXCJjb3JlLnNoaXB0cm9waWNhbC5jb21cIiwge1xyXG4gICAgYXV0aF9wYXNzOiAnU2lsdmVyMTIzLicsXHJcbiAgICB0bHM6e1xyXG4gICAgICAgIHNlcnZlcm5hbWU6ICdjb3JlLnNoaXB0cm9waWNhbC5jb20nXHJcbiAgICB9XHJcbn0pO1xyXG5leHBvcnQgY2xhc3MgVXNlclNlcnZpY2Uge1xyXG4gICAgY29uc3RydWN0b3IoKXtcclxuICAgICAgICB0aGlzLnJlZGlzSW5kZXhTZWFyY2ggPSByZWRpc1NlYXJjaChyZWRpcywgJ2luZGV4OnVzZXJzJywge1xyXG4gICAgICAgICAgICBjbGllbnRPcHRpb25zOmxyZWRpcy5zZWFyY2hDbGllbnREZXRhaWxzXHJcbiAgICAgICAgfSk7XHJcbiAgICB9XHJcbiAgICBhdXRoZW50aWNhdGUgKHVzZXJuYW1lLHBhc3N3b3JkKXtcclxuICAgICAgICB2YXIgc3J2ID0gdGhpczsgXHJcbiAgICAgICAgY29uc29sZS5sb2coJ2Fib3V0IHRvIGF1dGgnKVxyXG4gICAgICAgIHJldHVybiBuZXcgUHJvbWlzZShmdW5jdGlvbihyZXNvbHZlLHJlamVjdCl7XHJcbiAgICAgICAgICAgXHJcbiAgICAgICAgICAgIGNsaWVudC5oZ2V0YWxsKFBSRUZJWCt1c2VybmFtZSwoZXJyLHJlc3VsdCk9PntcclxuXHJcbiAgICAgICAgICAgICAgICBjb25zb2xlLmxvZyhyZXN1bHQsIFwiaXMgdGhlIHJlc3VsdHNcIik7IFxyXG4gICAgICAgICAgICAgICAgaWYgKHJlc3VsdCl7XHJcbiAgICAgICAgICAgICAgICAgICAgY29uc29sZS5sb2cocmVzdWx0KTtcclxuICAgICAgICAgICAgICAgICAgICBiY3J5cHQuY29tcGFyZShwYXNzd29yZCxyZXN1bHQucGFzc3dvcmQsKGVycixwd2RSZXN1bHQpPT57XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIGlmIChlcnIpe1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgY29uc29sZS5sb2coZXJyKTsgXHJcblxyXG4gICAgICAgICAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIGlmKHB3ZFJlc3VsdCA9PSB0cnVlKXtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGRlbGV0ZSByZXN1bHQucGFzc3dvcmQ7IFxyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgc3J2LmdlbmVyYXRlVG9rZW4ocmVzdWx0KS50aGVuKHRva2VuPT57XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgcmVzb2x2ZSh7dXNlcjpyZXN1bHQsdG9rZW46dG9rZW4sdmFsaWQ6dHJ1ZX0pXHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICB9KTtcclxuICAgICAgICAgICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICAgICAgICAgICAgICBlbHNlIHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHJlc29sdmUoe3VzZXI6bnVsbCx0b2tlbjpcIlwiLHZhbGlkOmZhbHNlfSlcclxuICAgICAgICAgICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICAgICAgICAgICAgIFxyXG4gICAgICAgICAgICAgICAgICAgICAgIFxyXG4gICAgICAgICAgICAgICAgICAgIH0pXHJcbiAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgICAgICBlbHNle1xyXG4gICAgICAgICAgICAgICAgICAgIHJlc29sdmUoe3VzZXI6bnVsbCx0b2tlbjpcIlwiLHZhbGlkOmZhbHNlfSlcclxuICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgfSk7IFxyXG4gICAgICAgICAgICBcclxuICAgICAgICAgICAgXHJcbiAgICAgICAgfSk7XHJcbiAgICB9XHJcbiAgICBnZXRVc2VyKHVzZXJuYW1lKXtcclxuICAgICAgICByZXR1cm4gbmV3IFByb21pc2UgKGZ1bmN0aW9uKHJlc29sdmUscmVqZWN0KXtcclxuICAgICAgICAgICAgY2xpZW50LmhnZXRhbGwoUFJFRklYK3VzZXJuYW1lLChlcnIscmVzdWx0KT0+e1xyXG4gICAgICAgICAgICAgICAgaWYgKHJlc3VsdCl7XHJcbiAgICAgICAgICAgICAgICAgICAgZGVsZXRlIHJlc3VsdC5wYXNzd29yZDsgXHJcbiAgICAgICAgICAgICAgICAgICAgcmVzb2x2ZSh7dXNlcjpyZXN1bHR9KVxyXG4gICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICB9KVxyXG4gICAgICAgICBcclxuICAgICAgICB9KTtcclxuICAgIH1cclxuICAgIGdldFVzZXJzSW5Sb2xlKHJvbGVJZCl7XHJcbiAgICAgICAgcmV0dXJuIG5ldyBQcm9taXNlIChmdW5jdGlvbihyZXNvbHZlLHJlamVjdCl7XHJcblxyXG4gICAgICAgICAgICAvLyBkYXRhQ29udGV4dC5nZXRTZXJ2aWNlUHJveHkoU0VSVklDRV9LRVkpLmdldFVzZXJzQnlSb2xlKHtyb2xlSWQ6cm9sZUlkfSxmdW5jdGlvbihlcnJvcixyZXN1bHQpe1xyXG4gICAgICAgICAgICAvLyAgICAgaWYgKGVycm9yKXtcclxuICAgICAgICAgICAgLy8gICAgICAgICByZWplY3QoZXJyb3IpO1xyXG4gICAgICAgICAgICAvLyAgICAgfVxyXG4gICAgICAgICAgICAvLyAgICAgcmVzb2x2ZSggcmVzdWx0KTtcclxuICAgICAgICAgICAgLy8gfSk7XHJcbiAgICAgICAgfSk7XHJcbiAgICB9XHJcbiAgICBnZXRSb2xlcygpe1xyXG4gICAgICAgIHJldHVybiBuZXcgUHJvbWlzZSAoZnVuY3Rpb24ocmVzb2x2ZSxyZWplY3Qpe1xyXG5cclxuICAgICAgICAgICAgcmVzb2x2ZShbXCJBZG1pblwiLFwiV2FyZWhvdXNlIE1JQVwiLFwiQ3VzdG9tcyBBZ2VudFwiLFwiV2FyZWhvdXNlIFRUXCIsXCJDYXNoaWVyXCIsXCJMb2NhdGlvbiBNYW5hZ2VyXCJdKVxyXG4gICAgICAgICAgICBcclxuICAgICAgICB9KTtcclxuICAgIH1cclxuICAgIGdldEFsbFVzZXJzKHBhZ2VTaXplLGN1cnJlbnRQYWdlKXtcclxuICAgICAgICB2YXIgc3J2ID0gdGhpczsgXHJcbiAgICAgICAgcmV0dXJuIG5ldyBQcm9taXNlIChmdW5jdGlvbihyZXNvbHZlLHJlamVjdCl7XHJcbiAgICAgICAgICAgIHZhciBvZmZzZXRcclxuICAgICAgICAgICBzcnYucmVkaXNJbmRleFNlYXJjaC5zZWFyY2goJyonLHtcclxuICAgICAgICAgICAgb2Zmc2V0OjAsXHJcbiAgICAgICAgICAgIG51bWJlck9mUmVzdWx0czogMTAwMCxcclxuICAgICAgICAgICAgc29ydEJ5OiBcImxhc3ROYW1lXCIsXHJcbiAgICAgICAgICAgIGRpcjogXCJBU0NcIlxyXG4gICAgICAgIH0sKGVycixyZXN1bHRzKT0+e1xyXG4gICAgICAgICAgICB2YXIgdXNlcnMgPSBbXTtcclxuICAgICAgICAgICAgICAgIHJlc3VsdHMucmVzdWx0cy5mb3JFYWNoKGVsZW1lbnQgPT4ge1xyXG4gICAgICAgICAgICAgICAgICAgIGRlbGV0ZSBlbGVtZW50LmRvYy5wYXNzd29yZFxyXG4gICAgICAgICAgICAgICAgICAgIHVzZXJzLnB1c2goZWxlbWVudC5kb2MpOyBcclxuICAgICAgICAgICAgICAgIH0pO1xyXG4gICAgICAgICAgICAgICAgcmVzb2x2ZSh1c2VycylcclxuICAgICAgICB9KVxyXG4gICAgICAgIH0pO1xyXG4gICAgfVxyXG4gICAgcmVtb3ZlVXNlcih1c2VybmFtZSl7XHJcbiAgICAgICAgcmV0dXJuIG5ldyBQcm9taXNlIChmdW5jdGlvbihyZXNvbHZlLHJlamVjdCl7XHJcbiAgICAgICAgICAgIHZhciBpZHg9IHRoaXMucmVkaXNJbmRleFNlYXJjaDsgXHJcbiAgICAgICAgbHJlZGlzLmhnZXRhbGwoUFJFRklYK3VzZXJuYW1lKS50aGVuKHVzZXI9PntcclxuICAgICAgICAgICAgaWR4LmRlbGV0ZSh1c2VyLmlkKTsgXHJcbiAgICAgICAgICAgIGNsaWVudC5kZWxldGUoUFJFRklYK3VzZXJuYW1lLChlcnIscmVzdWx0KT0+e1xyXG4gICAgICAgICAgICAgICAgaWYgKGVycil7XHJcbiAgICAgICAgICAgICAgICAgICAgY29uc29sZS5sb2coXCJ1bmFibGUgdG8gZGVsZXRlXCIpOyBcclxuICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgICAgIHJlc29sdmUoe3JlbW92ZWQ6dHJ1ZX0pXHJcbiAgICAgICAgICAgIH0pXHJcbiAgICAgICAgfSlcclxuICAgICAgICAgIC8vZmluZCB0aGUgdXNlciBieSB1c2VybmFtZSBcclxuICAgICAgICAgIC8vZ2V0IHRoZSBkb2MgSWQgXHJcbiAgICAgICAgICAvL2RlbGV0ZSBmcm9tIGluZGV4IFxyXG4gICAgICAgICAgLy9kZWxldGUgaGFzaCBcclxuICAgICAgICB9KTtcclxuICAgIH1cclxuICAgIGVuYWJsZVVzZXIodXNlcm5hbWUsZW5hYmxlZCl7XHJcbiAgICAgICAgcmV0dXJuIG5ldyBQcm9taXNlIChmdW5jdGlvbihyZXNvbHZlLHJlamVjdCl7XHJcbiAgICAgICAgICAgIGNsaWVudC5obXNldChQUkVGSVgrdXNlcm5hbWUse2VuYWJsZWQ6ZW5hYmxlZH0sKGVycixyZXN1bHQpPT57XHJcbiAgICAgICAgICAgICAgICBpZiAoZXJyKXtcclxuICAgICAgICAgICAgICAgICAgICByZXNvbHZlKHt1cGRhdGVkOmZhbHNlfSlcclxuICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgICAgIGVsc2Uge1xyXG4gICAgICAgICAgICAgICAgICAgIHJlc29sdmUoe3VwZGF0ZWQ6dHJ1ZX0pXHJcbiAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgIH0pOyBcclxuICAgICAgICAgICAgXHJcbiAgICAgICAgfSk7XHJcbiAgICB9XHJcbiAgICBzYXZlVXNlcih1c2VyKXtcclxuICAgICAgIHZhciBzcnYgPSB0aGlzOyBcclxuICAgICAgICByZXR1cm4gbmV3IFByb21pc2UgKGZ1bmN0aW9uKHJlc29sdmUscmVqZWN0KXtcclxuICAgICAgICAgICAgc3J2LmNoZWNrVXNlcm5hbWUodXNlci51c2VybmFtZSkudGhlbih2YWxpZD0+e1xyXG4gICAgICAgICAgICAgICAgY29uc29sZS5sb2codmFsaWQpXHJcbiAgICAgICAgICAgICAgICBpZiAodmFsaWQudGFrZW4gPT0gZmFsc2Upe1xyXG4gICAgICAgICAgICAgICAgICAgIC8vY3JlYXRlIHRoZSBoYXNoIFxyXG4gICAgICAgICAgICAgICAgICAgIGNsaWVudC5pbmNyKFVTRVJJRENPVU5URVIsKGVycixpZCk9PntcclxuICAgICAgICAgICAgICAgICAgICAgICAgdXNlci5pZCA9IGlkOyBcclxuICAgICAgICAgICAgICAgICAgICAgICAgdXNlci5wYXNzd29yZCA9IGJjcnlwdC5oYXNoU3luYyh1c2VyLnBhc3N3b3JkLDEwKTsgXHJcbiAgICAgICAgICAgICAgICAgICAgICAgIGxyZWRpcy5obXNldChQUkVGSVgrdXNlci51c2VybmFtZSx1c2VyKVxyXG4gICAgICAgICAgICAgICAgICAgICAgICBhZGRVc2VyVG9JbmRleCh1c2VyLHNydi5yZWRpc0luZGV4U2VhcmNoKTsgXHJcbiAgICAgICAgICAgICAgICAgICAgfSlcclxuICAgICAgICAgICAgICAgICAgICBcclxuICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgICAgIGVsc2Uge1xyXG4gICAgICAgICAgICAgICAgICAgIC8vdXBkYXRlIHRoZSB1c2VyIFxyXG4gICAgICAgICAgICAgICAgICAgIHJlc29sdmUoe3NhdmVkOmZhbHNlLFwibWVzc2FnZVwiOlwiVXNlcm5hbWUgdGFrZW5cIn0pXHJcbiAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgIH0pXHJcbiAgICAgICAgICAgIC8vIGRhdGFDb250ZXh0LmdldFNlcnZpY2VQcm94eShTRVJWSUNFX0tFWSkuc2F2ZVVzZXIodXNlcixmdW5jdGlvbihlcnJvcixyZXN1bHQpe1xyXG4gICAgICAgICAgICAvLyAgICAgaWYgKGVycm9yKXtcclxuICAgICAgICAgICAgLy8gICAgICAgICByZWplY3QoZXJyb3IpO1xyXG4gICAgICAgICAgICAvLyAgICAgfVxyXG4gICAgICAgICAgICAvLyAgICAgcmVzb2x2ZSggcmVzdWx0KTtcclxuICAgICAgICAgICAgLy8gfSk7XHJcbiAgICAgICAgfSk7XHJcbiAgICB9XHJcbiAgICB2ZXJpZnlUb2tlbiAodG9rZW4pe1xyXG4gICAgICAgIHJldHVybiBuZXcgUHJvbWlzZShmdW5jdGlvbihyZXNsb3ZlLHJlamVjdCl7XHJcbiAgICAgICAgICAgIHRyeSB7XHJcbiAgICAgICAgICAgICAgICB2YXIgZGVjb2RlZEpXVCA9IGp3dC52ZXJpZnkodG9rZW4sJ3NpbHZlcjEyMy4nKTtcclxuICAgICAgICAgICAgICAgIHZhciBieXRlcyA9IGNyeXB0b2pzLkFFUy5kZWNyeXB0KGRlY29kZWRKV1QudG9rZW4sJ1NpbHZlcjEyMycpO1xyXG4gICAgICAgICAgICAgICAgdmFyIHRva2VuRGF0YSA9IEpTT04ucGFyc2UoYnl0ZXMudG9TdHJpbmcoY3J5cHRvanMuZW5jLlV0ZjgpKTtcclxuICAgICAgICAgICAgICAgIC8qICBjb25zb2xlLmxvZygndG9rZW4gZGF0YSBiZWxvdycpO1xyXG4gICAgICAgICAgICAgICAgIGNvbnNvbGUubG9nKHRva2VuRGF0YSk7Ki9cclxuICAgICAgICAgICAgICAgIHJlc2xvdmUodG9rZW5EYXRhKTtcclxuICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICBjYXRjaChlKXtcclxuICAgICAgICAgICAgICAgIGNvbnNvbGUubG9nKGUsXCJ1bmFibGUgdG8gdmVyaWZ5IHRva2VuXCIpXHJcbiAgICAgICAgICAgICAgICByZWplY3QoKTtcclxuICAgICAgICAgICAgfVxyXG5cclxuICAgICAgICB9KTtcclxuICAgIH1cclxuICAgIGNoZWNrVXNlcm5hbWUodXNlcm5hbWUpe1xyXG4gICAgICAgIHJldHVybiBuZXcgUHJvbWlzZSgocmVzb2x2ZSxyZWplY3QpPT57XHJcbiAgICAgICAgICAgIC8vd2UgY2FuIGNoZWNrIGluIDIgd2F5cyBvbmUgc2VlIGlmIHRoZSBoYXNoIGV4aXN0cyBcclxuICAgICAgICAgICAgY2xpZW50LmV4aXN0cyhQUkVGSVgrdXNlcm5hbWUsKGVycixyZXN1bHRzKT0+e1xyXG4gICAgICAgICAgICAgICAgY29uc29sZS5sb2cocmVzdWx0cylcclxuICAgICAgICAgICAgICAgIGlmIChOdW1iZXIocmVzdWx0cykgPT0gMSl7XHJcbiAgICAgICAgICAgICAgICAgICAgcmVzb2x2ZSh7dGFrZW46dHJ1ZX0pXHJcbiAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgICAgICBlbHNlXHJcbiAgICAgICAgICAgICAgICAgICAgcmVzb2x2ZSh7dGFrZW46ZmFsc2V9KVxyXG4gICAgICAgICAgICB9KVxyXG4gICAgICAgIH0pXHJcbiAgICB9XHJcbiAgICBnZW5lcmF0ZVRva2VuICh1c2VyKXtcclxuICAgICAgICByZXR1cm4gbmV3IFByb21pc2UoZnVuY3Rpb24ocmVzb2x2ZSxyZWplY3Qpe1xyXG5cclxuICAgICAgICAgICAgdmFyIHN0cmluZ0RhdGEgPSBKU09OLnN0cmluZ2lmeSh1c2VyKTtcclxuICAgICAgICAgICAgdmFyIGVuY3J5cHRlZERhdGEgPSBjcnlwdG9qcy5BRVMuZW5jcnlwdChzdHJpbmdEYXRhLCdTaWx2ZXIxMjMnKS50b1N0cmluZygpO1xyXG5cclxuICAgICAgICAgICAgdmFyIHRva2VuID0gand0LnNpZ24oe1xyXG4gICAgICAgICAgICAgICAgdG9rZW46ZW5jcnlwdGVkRGF0YVxyXG4gICAgICAgICAgICB9LCAnc2lsdmVyMTIzLicpO1xyXG4gICAgICAgICAgICByZXNvbHZlKCB0b2tlbik7XHJcbiAgICAgICAgfSk7XHJcblxyXG4gICAgfVxyXG59XHJcbmZ1bmN0aW9uIGNyZWF0ZURvY3VtZW50KGFjY291bnQpe1xyXG4gICAgdmFyIGN1c3RvbWVyRG9jdW1lbnQgPSB7IFxyXG4gICAgICAgIGlkIDogYWNjb3VudC5pZCxcclxuICAgICAgICB1c2VybmFtZTphY2NvdW50LnVzZXJuYW1lLFxyXG4gICAgICAgIGVtYWlsOiBhY2NvdW50LmVtYWlsLCBcclxuICAgICAgICBmaXJzdE5hbWUgOiBhY2NvdW50LmZpcnN0TmFtZSwgXHJcbiAgICAgICAgbGFzdE5hbWU6IGFjY291bnQubGFzdE5hbWUsXHJcbiAgICAgICAgcGFzc3dvcmQ6YWNjb3VudC5wYXNzd29yZCxcclxuICAgICAgICBtb2JpbGU6IGFjY291bnQubW9iaWxlLFxyXG4gICAgICAgIHJvbGU6IGFjY291bnQucm9sZVxyXG4gICAgfVxyXG4gICAgY29uc29sZS5sb2coY3VzdG9tZXJEb2N1bWVudClcclxuICAgIHJldHVybiBjdXN0b21lckRvY3VtZW50OyBcclxuIH1cclxuIGZ1bmN0aW9uIGFkZFVzZXJUb0luZGV4KGFjY291bnQsIHNlYXJjaE9iail7XHJcbiAgICAgdmFyIHVzZXJEb2N1bWVudCA9IGNyZWF0ZURvY3VtZW50KGFjY291bnQpOyBcclxuICAgICBzZWFyY2hPYmouYWRkKGFjY291bnQuaWQsdXNlckRvY3VtZW50KTsgXHJcbiB9Il19
