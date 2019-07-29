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
var ENV = require('../environment');
var client = redis.createClient(ENV.redis_port, ENV.redis_host, {
    auth_pass: ENV.redis_pass
    // tls:{
    //     servername: 'core.shiptropical.com'
    // } 
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
                    } else resolve({ user: { username: '', firstName: '', lastName: '', email: '', mobile: '' } });
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

                resolve(["Admin", "Warehouse FLL", "Customs Agent", "Warehouse BAHAMAS", "Cashier", "Location Manager"]);
            });
        }
    }, {
        key: 'getAllUsers',
        value: function getAllUsers(pageSize, currentPage) {
            var srv = this;
            console.log('getting all users');
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
                            resolve({ saved: true, "message": "saved successfully." });
                        });
                    } else {
                        //update the user 
                        resolve({ saved: false, "message": "Username taken" });
                    }
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
//# sourceMappingURL=data:application/json;charset=utf8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIlJlZGlzU2VydmljZXMvVXNlclNlcnZpY2UuZXM2Il0sIm5hbWVzIjpbImNyeXB0b2pzIiwicmVxdWlyZSIsImp3dCIsInJlZGlzIiwibHJlZGlzIiwibW9tZW50IiwicmVkaXNTZWFyY2giLCJTRVJWSUNFX0tFWSIsImJjcnlwdCIsIlBSRUZJWCIsIklOREVYIiwiVVNFUklEQ09VTlRFUiIsIkVOViIsImNsaWVudCIsImNyZWF0ZUNsaWVudCIsInJlZGlzX3BvcnQiLCJyZWRpc19ob3N0IiwiYXV0aF9wYXNzIiwicmVkaXNfcGFzcyIsIlVzZXJTZXJ2aWNlIiwicmVkaXNJbmRleFNlYXJjaCIsImNsaWVudE9wdGlvbnMiLCJzZWFyY2hDbGllbnREZXRhaWxzIiwidXNlcm5hbWUiLCJwYXNzd29yZCIsInNydiIsImNvbnNvbGUiLCJsb2ciLCJQcm9taXNlIiwicmVzb2x2ZSIsInJlamVjdCIsImhnZXRhbGwiLCJlcnIiLCJyZXN1bHQiLCJjb21wYXJlIiwicHdkUmVzdWx0IiwiZ2VuZXJhdGVUb2tlbiIsInRoZW4iLCJ1c2VyIiwidG9rZW4iLCJ2YWxpZCIsImZpcnN0TmFtZSIsImxhc3ROYW1lIiwiZW1haWwiLCJtb2JpbGUiLCJyb2xlSWQiLCJwYWdlU2l6ZSIsImN1cnJlbnRQYWdlIiwib2Zmc2V0Iiwic2VhcmNoIiwibnVtYmVyT2ZSZXN1bHRzIiwic29ydEJ5IiwiZGlyIiwicmVzdWx0cyIsInVzZXJzIiwiZm9yRWFjaCIsImVsZW1lbnQiLCJkb2MiLCJwdXNoIiwiaWR4IiwiZGVsZXRlIiwiaWQiLCJyZW1vdmVkIiwiZW5hYmxlZCIsImhtc2V0IiwidXBkYXRlZCIsImNoZWNrVXNlcm5hbWUiLCJ0YWtlbiIsImluY3IiLCJoYXNoU3luYyIsImFkZFVzZXJUb0luZGV4Iiwic2F2ZWQiLCJyZXNsb3ZlIiwiZGVjb2RlZEpXVCIsInZlcmlmeSIsImJ5dGVzIiwiQUVTIiwiZGVjcnlwdCIsInRva2VuRGF0YSIsIkpTT04iLCJwYXJzZSIsInRvU3RyaW5nIiwiZW5jIiwiVXRmOCIsImUiLCJleGlzdHMiLCJOdW1iZXIiLCJzdHJpbmdEYXRhIiwic3RyaW5naWZ5IiwiZW5jcnlwdGVkRGF0YSIsImVuY3J5cHQiLCJzaWduIiwiY3JlYXRlRG9jdW1lbnQiLCJhY2NvdW50IiwiY3VzdG9tZXJEb2N1bWVudCIsInJvbGUiLCJzZWFyY2hPYmoiLCJ1c2VyRG9jdW1lbnQiLCJhZGQiXSwibWFwcGluZ3MiOiI7Ozs7Ozs7Ozs7QUFBQSxJQUFJQSxXQUFZQyxRQUFRLFdBQVIsQ0FBaEI7QUFDQSxJQUFJQyxNQUFNRCxRQUFRLGNBQVIsQ0FBVjtBQUNBLElBQUlFLFFBQVFGLFFBQVEsT0FBUixDQUFaO0FBQ0EsSUFBSUcsU0FBU0gsUUFBUSxlQUFSLENBQWI7QUFDQSxJQUFJSSxTQUFTSixRQUFRLFFBQVIsQ0FBYjtBQUNBLElBQUlLLGNBQWNMLFFBQVEscUJBQVIsQ0FBbEI7QUFDQSxJQUFNTSxjQUFjLE9BQXBCO0FBQ0EsSUFBSUMsU0FBU1AsUUFBUSxRQUFSLENBQWI7QUFDQSxJQUFNUSxTQUFVLE9BQWhCO0FBQ0EsSUFBTUMsUUFBUSxhQUFkO0FBQ0EsSUFBTUMsZ0JBQWdCLFNBQXRCO0FBQ0EsSUFBTUMsTUFBTVgsUUFBUSxnQkFBUixDQUFaO0FBQ0EsSUFBSVksU0FBU1YsTUFBTVcsWUFBTixDQUFtQkYsSUFBSUcsVUFBdkIsRUFBbUNILElBQUlJLFVBQXZDLEVBQW1EO0FBQzVEQyxlQUFXTCxJQUFJTTtBQUNmO0FBQ0E7QUFDQTtBQUo0RCxDQUFuRCxDQUFiOztJQU1hQyxXLFdBQUFBLFc7QUFDVCwyQkFBYTtBQUFBOztBQUNULGFBQUtDLGdCQUFMLEdBQXdCZCxZQUFZSCxLQUFaLEVBQW1CLGFBQW5CLEVBQWtDO0FBQ3REa0IsMkJBQWNqQixPQUFPa0I7QUFEaUMsU0FBbEMsQ0FBeEI7QUFHSDs7OztxQ0FDYUMsUSxFQUFTQyxRLEVBQVM7QUFDNUIsZ0JBQUlDLE1BQU0sSUFBVjtBQUNBQyxvQkFBUUMsR0FBUixDQUFZLGVBQVo7QUFDQSxtQkFBTyxJQUFJ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QURXLGlCQUFULEVBRVQsWUFGUyxDQUFaO0FBR0E1RCx3QkFBU1UsS0FBVDtBQUNILGFBVE0sQ0FBUDtBQVdIOzs7Ozs7QUFFTCxTQUFTcUQsY0FBVCxDQUF3QkMsT0FBeEIsRUFBZ0M7QUFDNUIsUUFBSUMsbUJBQW1CO0FBQ25CakMsWUFBS2dDLFFBQVFoQyxFQURNO0FBRW5CdEMsa0JBQVNzRSxRQUFRdEUsUUFGRTtBQUduQm9CLGVBQU9rRCxRQUFRbEQsS0FISTtBQUluQkYsbUJBQVlvRCxRQUFRcEQsU0FKRDtBQUtuQkMsa0JBQVVtRCxRQUFRbkQsUUFMQztBQU1uQmxCLGtCQUFTcUUsUUFBUXJFLFFBTkU7QUFPbkJvQixnQkFBUWlELFFBQVFqRCxNQVBHO0FBUW5CbUQsY0FBTUYsUUFBUUU7QUFSSyxLQUF2QjtBQVVBckUsWUFBUUMsR0FBUixDQUFZbUUsZ0JBQVo7QUFDQSxXQUFPQSxnQkFBUDtBQUNGO0FBQ0QsU0FBU3hCLGNBQVQsQ0FBd0J1QixPQUF4QixFQUFpQ0csU0FBakMsRUFBMkM7QUFDdkMsUUFBSUMsZUFBZUwsZUFBZUMsT0FBZixDQUFuQjtBQUNBRyxjQUFVRSxHQUFWLENBQWNMLFFBQVFoQyxFQUF0QixFQUF5Qm9DLFlBQXpCO0FBQ0giLCJmaWxlIjoiUmVkaXNTZXJ2aWNlcy9Vc2VyU2VydmljZS5qcyIsInNvdXJjZXNDb250ZW50IjpbInZhciBjcnlwdG9qcyAgPSByZXF1aXJlKCdjcnlwdG8tanMnKTtcbnZhciBqd3QgPSByZXF1aXJlKCdqc29ud2VidG9rZW4nKTtcbnZhciByZWRpcyA9IHJlcXVpcmUoJ3JlZGlzJyk7XG52YXIgbHJlZGlzID0gcmVxdWlyZSgnLi9yZWRpcy1sb2NhbCcpO1xudmFyIG1vbWVudCA9IHJlcXVpcmUoJ21vbWVudCcpO1xudmFyIHJlZGlzU2VhcmNoID0gcmVxdWlyZSgnLi4vcmVkaXNlYXJjaGNsaWVudCcpO1xuY29uc3QgU0VSVklDRV9LRVkgPSAndXNlcnMnO1xudmFyIGJjcnlwdCA9IHJlcXVpcmUoJ2JjcnlwdCcpOyBcbmNvbnN0IFBSRUZJWCAgPSBcInVzZXI6XCJcbmNvbnN0IElOREVYID0gXCJpbmRleDp1c2Vyc1wiXG5jb25zdCBVU0VSSURDT1VOVEVSID0gXCJ1c2VyOmlkXCI7IFxuY29uc3QgRU5WID0gcmVxdWlyZSgnLi4vZW52aXJvbm1lbnQnKVxudmFyIGNsaWVudCA9IHJlZGlzLmNyZWF0ZUNsaWVudChFTlYucmVkaXNfcG9ydCwgRU5WLnJlZGlzX2hvc3QsIHtcbiAgICBhdXRoX3Bhc3M6IEVOVi5yZWRpc19wYXNzLFxuICAgIC8vIHRsczp7XG4gICAgLy8gICAgIHNlcnZlcm5hbWU6ICdjb3JlLnNoaXB0cm9waWNhbC5jb20nXG4gICAgLy8gfSBcbn0pO1xuZXhwb3J0IGNsYXNzIFVzZXJTZXJ2aWNlIHtcbiAgICBjb25zdHJ1Y3Rvcigpe1xuICAgICAgICB0aGlzLnJlZGlzSW5kZXhTZWFyY2ggPSByZWRpc1NlYXJjaChyZWRpcywgJ2luZGV4OnVzZXJzJywge1xuICAgICAgICAgICAgY2xpZW50T3B0aW9uczpscmVkaXMuc2VhcmNoQ2xpZW50RGV0YWlsc1xuICAgICAgICB9KTtcbiAgICB9XG4gICAgYXV0aGVudGljYXRlICh1c2VybmFtZSxwYXNzd29yZCl7XG4gICAgICAgIHZhciBzcnYgPSB0aGlzOyBcbiAgICAgICAgY29uc29sZS5sb2coJ2Fib3V0IHRvIGF1dGgnKVxuICAgICAgICByZXR1cm4gbmV3IFByb21pc2UoZnVuY3Rpb24ocmVzb2x2ZSxyZWplY3Qpe1xuICAgICAgICAgICBcbiAgICAgICAgICAgIGNsaWVudC5oZ2V0YWxsKFBSRUZJWCt1c2VybmFtZSwoZXJyLHJlc3VsdCk9PntcblxuICAgICAgICAgICAgICAgIGNvbnNvbGUubG9nKHJlc3VsdCwgXCJpcyB0aGUgcmVzdWx0c1wiKTsgXG4gICAgICAgICAgICAgICAgaWYgKHJlc3VsdCl7XG4gICAgICAgICAgICAgICAgICAgIGNvbnNvbGUubG9nKHJlc3VsdCk7XG4gICAgICAgICAgICAgICAgICAgIGJjcnlwdC5jb21wYXJlKHBhc3N3b3JkLHJlc3VsdC5wYXNzd29yZCwoZXJyLHB3ZFJlc3VsdCk9PntcbiAgICAgICAgICAgICAgICAgICAgICAgIGlmIChlcnIpe1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGNvbnNvbGUubG9nKGVycik7IFxuXG4gICAgICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgICAgICBpZihwd2RSZXN1bHQgPT0gdHJ1ZSl7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgZGVsZXRlIHJlc3VsdC5wYXNzd29yZDsgXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgc3J2LmdlbmVyYXRlVG9rZW4ocmVzdWx0KS50aGVuKHRva2VuPT57XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHJlc29sdmUoe3VzZXI6cmVzdWx0LHRva2VuOnRva2VuLHZhbGlkOnRydWV9KVxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICAgICAgZWxzZSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgcmVzb2x2ZSh7dXNlcjpudWxsLHRva2VuOlwiXCIsdmFsaWQ6ZmFsc2V9KVxuICAgICAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICAgICBcbiAgICAgICAgICAgICAgICAgICAgICAgXG4gICAgICAgICAgICAgICAgICAgIH0pXG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIGVsc2V7XG4gICAgICAgICAgICAgICAgICAgIHJlc29sdmUoe3VzZXI6bnVsbCx0b2tlbjpcIlwiLHZhbGlkOmZhbHNlfSlcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9KTsgXG4gICAgICAgICAgICBcbiAgICAgICAgICAgIFxuICAgICAgICB9KTtcbiAgICB9XG4gICAgZ2V0VXNlcih1c2VybmFtZSl7XG4gICAgICAgIHJldHVybiBuZXcgUHJvbWlzZSAoZnVuY3Rpb24ocmVzb2x2ZSxyZWplY3Qpe1xuICAgICAgICAgICAgY2xpZW50LmhnZXRhbGwoUFJFRklYK3VzZXJuYW1lLChlcnIscmVzdWx0KT0+e1xuICAgICAgICAgICAgICAgIGlmIChyZXN1bHQpe1xuICAgICAgICAgICAgICAgICAgICBkZWxldGUgcmVzdWx0LnBhc3N3b3JkOyBcbiAgICAgICAgICAgICAgICAgICAgcmVzb2x2ZSh7dXNlcjpyZXN1bHR9KVxuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICBlbHNlIHJlc29sdmUoe3VzZXI6e3VzZXJuYW1lOicnLGZpcnN0TmFtZTonJyxsYXN0TmFtZTonJyxlbWFpbDonJyxtb2JpbGU6Jyd9fSlcbiAgICAgICAgICAgIH0pXG4gICAgICAgICBcbiAgICAgICAgfSk7XG4gICAgfVxuICAgIGdldFVzZXJzSW5Sb2xlKHJvbGVJZCl7XG4gICAgICAgIHJldHVybiBuZXcgUHJvbWlzZSAoZnVuY3Rpb24ocmVzb2x2ZSxyZWplY3Qpe1xuXG4gICAgICAgICAgICAvLyBkYXRhQ29udGV4dC5nZXRTZXJ2aWNlUHJveHkoU0VSVklDRV9LRVkpLmdldFVzZXJzQnlSb2xlKHtyb2xlSWQ6cm9sZUlkfSxmdW5jdGlvbihlcnJvcixyZXN1bHQpe1xuICAgICAgICAgICAgLy8gICAgIGlmIChlcnJvcil7XG4gICAgICAgICAgICAvLyAgICAgICAgIHJlamVjdChlcnJvcik7XG4gICAgICAgICAgICAvLyAgICAgfVxuICAgICAgICAgICAgLy8gICAgIHJlc29sdmUoIHJlc3VsdCk7XG4gICAgICAgICAgICAvLyB9KTtcbiAgICAgICAgfSk7XG4gICAgfVxuICAgIGdldFJvbGVzKCl7XG4gICAgICAgIHJldHVybiBuZXcgUHJvbWlzZSAoZnVuY3Rpb24ocmVzb2x2ZSxyZWplY3Qpe1xuXG4gICAgICAgICAgICByZXNvbHZlKFtcIkFkbWluXCIsXCJXYXJlaG91c2UgRkxMXCIsXCJDdXN0b21zIEFnZW50XCIsXCJXYXJlaG91c2UgQkFIQU1BU1wiLFwiQ2FzaGllclwiLFwiTG9jYXRpb24gTWFuYWdlclwiXSlcbiAgICAgICAgICAgIFxuICAgICAgICB9KTtcbiAgICB9XG4gICAgZ2V0QWxsVXNlcnMocGFnZVNpemUsY3VycmVudFBhZ2Upe1xuICAgICAgICB2YXIgc3J2ID0gdGhpczsgXG4gICAgICAgIGNvbnNvbGUubG9nKCdnZXR0aW5nIGFsbCB1c2VycycpXG4gICAgICAgIHJldHVybiBuZXcgUHJvbWlzZSAoZnVuY3Rpb24ocmVzb2x2ZSxyZWplY3Qpe1xuICAgICAgICAgICAgdmFyIG9mZnNldFxuICAgICAgICAgICBzcnYucmVkaXNJbmRleFNlYXJjaC5zZWFyY2goJyonLHtcbiAgICAgICAgICAgIG9mZnNldDowLFxuICAgICAgICAgICAgbnVtYmVyT2ZSZXN1bHRzOiAxMDAwLFxuICAgICAgICAgICAgc29ydEJ5OiBcImxhc3ROYW1lXCIsXG4gICAgICAgICAgICBkaXI6IFwiQVNDXCJcbiAgICAgICAgfSwoZXJyLHJlc3VsdHMpPT57XG4gICAgICAgICAgICB2YXIgdXNlcnMgPSBbXTtcbiAgICAgICAgICAgICAgICByZXN1bHRzLnJlc3VsdHMuZm9yRWFjaChlbGVtZW50ID0+IHtcbiAgICAgICAgICAgICAgICAgICAgZGVsZXRlIGVsZW1lbnQuZG9jLnBhc3N3b3JkXG4gICAgICAgICAgICAgICAgICAgIHVzZXJzLnB1c2goZWxlbWVudC5kb2MpOyBcbiAgICAgICAgICAgICAgICB9KTtcbiAgICAgICAgICAgICAgICByZXNvbHZlKHVzZXJzKVxuICAgICAgICB9KVxuICAgICAgICB9KTtcbiAgICB9XG4gICAgcmVtb3ZlVXNlcih1c2VybmFtZSl7XG4gICAgICAgIHJldHVybiBuZXcgUHJvbWlzZSAoZnVuY3Rpb24ocmVzb2x2ZSxyZWplY3Qpe1xuICAgICAgICAgICAgdmFyIGlkeD0gdGhpcy5yZWRpc0luZGV4U2VhcmNoOyBcbiAgICAgICAgbHJlZGlzLmhnZXRhbGwoUFJFRklYK3VzZXJuYW1lKS50aGVuKHVzZXI9PntcbiAgICAgICAgICAgIGlkeC5kZWxldGUodXNlci5pZCk7IFxuICAgICAgICAgICAgY2xpZW50LmRlbGV0ZShQUkVGSVgrdXNlcm5hbWUsKGVycixyZXN1bHQpPT57XG4gICAgICAgICAgICAgICAgaWYgKGVycil7XG4gICAgICAgICAgICAgICAgICAgIGNvbnNvbGUubG9nKFwidW5hYmxlIHRvIGRlbGV0ZVwiKTsgXG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIHJlc29sdmUoe3JlbW92ZWQ6dHJ1ZX0pXG4gICAgICAgICAgICB9KVxuICAgICAgICB9KVxuICAgICAgICAgIC8vZmluZCB0aGUgdXNlciBieSB1c2VybmFtZSBcbiAgICAgICAgICAvL2dldCB0aGUgZG9jIElkIFxuICAgICAgICAgIC8vZGVsZXRlIGZyb20gaW5kZXggXG4gICAgICAgICAgLy9kZWxldGUgaGFzaCBcbiAgICAgICAgfSk7XG4gICAgfVxuICAgIGVuYWJsZVVzZXIodXNlcm5hbWUsZW5hYmxlZCl7XG4gICAgICAgIHJldHVybiBuZXcgUHJvbWlzZSAoZnVuY3Rpb24ocmVzb2x2ZSxyZWplY3Qpe1xuICAgICAgICAgICAgY2xpZW50Lmhtc2V0KFBSRUZJWCt1c2VybmFtZSx7ZW5hYmxlZDplbmFibGVkfSwoZXJyLHJlc3VsdCk9PntcbiAgICAgICAgICAgICAgICBpZiAoZXJyKXtcbiAgICAgICAgICAgICAgICAgICAgcmVzb2x2ZSh7dXBkYXRlZDpmYWxzZX0pXG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIGVsc2Uge1xuICAgICAgICAgICAgICAgICAgICByZXNvbHZlKHt1cGRhdGVkOnRydWV9KVxuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH0pOyBcbiAgICAgICAgICAgIFxuICAgICAgICB9KTtcbiAgICB9XG4gICAgc2F2ZVVzZXIodXNlcil7XG4gICAgICAgdmFyIHNydiA9IHRoaXM7IFxuICAgICAgICByZXR1cm4gbmV3IFByb21pc2UgKGZ1bmN0aW9uKHJlc29sdmUscmVqZWN0KXtcbiAgICAgICAgICAgIHNydi5jaGVja1VzZXJuYW1lKHVzZXIudXNlcm5hbWUpLnRoZW4odmFsaWQ9PntcbiAgICAgICAgICAgICAgICBjb25zb2xlLmxvZyh2YWxpZClcbiAgICAgICAgICAgICAgICBpZiAodmFsaWQudGFrZW4gPT0gZmFsc2Upe1xuICAgICAgICAgICAgICAgICAgICAvL2NyZWF0ZSB0aGUgaGFzaCBcbiAgICAgICAgICAgICAgICAgICAgY2xpZW50LmluY3IoVVNFUklEQ09VTlRFUiwoZXJyLGlkKT0+e1xuICAgICAgICAgICAgICAgICAgICAgICAgdXNlci5pZCA9IGlkOyBcbiAgICAgICAgICAgICAgICAgICAgICAgIHVzZXIucGFzc3dvcmQgPSBiY3J5cHQuaGFzaFN5bmModXNlci5wYXNzd29yZCwxMCk7IFxuICAgICAgICAgICAgICAgICAgICAgICAgbHJlZGlzLmhtc2V0KFBSRUZJWCt1c2VyLnVzZXJuYW1lLHVzZXIpXG4gICAgICAgICAgICAgICAgICAgICAgICBhZGRVc2VyVG9JbmRleCh1c2VyLHNydi5yZWRpc0luZGV4U2VhcmNoKTsgXG4gICAgICAgICAgICAgICAgICAgICAgICByZXNvbHZlKHtzYXZlZDp0cnVlLFwibWVzc2FnZVwiOlwic2F2ZWQgc3VjY2Vzc2Z1bGx5LlwifSlcbiAgICAgICAgICAgICAgICAgICAgfSlcbiAgICAgICAgICAgICAgICAgICAgXG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIGVsc2Uge1xuICAgICAgICAgICAgICAgICAgICAvL3VwZGF0ZSB0aGUgdXNlciBcbiAgICAgICAgICAgICAgICAgICAgcmVzb2x2ZSh7c2F2ZWQ6ZmFsc2UsXCJtZXNzYWdlXCI6XCJVc2VybmFtZSB0YWtlblwifSlcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9KVxuICAgICAgICAgICAgXG4gICAgICAgIH0pO1xuICAgIH1cbiAgICB2ZXJpZnlUb2tlbiAodG9rZW4pe1xuICAgICAgICByZXR1cm4gbmV3IFByb21pc2UoZnVuY3Rpb24ocmVzbG92ZSxyZWplY3Qpe1xuICAgICAgICAgICAgdHJ5IHtcbiAgICAgICAgICAgICAgICB2YXIgZGVjb2RlZEpXVCA9IGp3dC52ZXJpZnkodG9rZW4sJ3NpbHZlcjEyMy4nKTtcbiAgICAgICAgICAgICAgICB2YXIgYnl0ZXMgPSBjcnlwdG9qcy5BRVMuZGVjcnlwdChkZWNvZGVkSldULnRva2VuLCdTaWx2ZXIxMjMnKTtcbiAgICAgICAgICAgICAgICB2YXIgdG9rZW5EYXRhID0gSlNPTi5wYXJzZShieXRlcy50b1N0cmluZyhjcnlwdG9qcy5lbmMuVXRmOCkpO1xuICAgICAgICAgICAgICAgIC8qICBjb25zb2xlLmxvZygndG9rZW4gZGF0YSBiZWxvdycpO1xuICAgICAgICAgICAgICAgICBjb25zb2xlLmxvZyh0b2tlbkRhdGEpOyovXG4gICAgICAgICAgICAgICAgcmVzbG92ZSh0b2tlbkRhdGEpO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgY2F0Y2goZSl7XG4gICAgICAgICAgICAgICAgY29uc29sZS5sb2coZSxcInVuYWJsZSB0byB2ZXJpZnkgdG9rZW5cIilcbiAgICAgICAgICAgICAgICByZWplY3QoKTtcbiAgICAgICAgICAgIH1cblxuICAgICAgICB9KTtcbiAgICB9XG4gICAgY2hlY2tVc2VybmFtZSh1c2VybmFtZSl7XG4gICAgICAgIHJldHVybiBuZXcgUHJvbWlzZSgocmVzb2x2ZSxyZWplY3QpPT57XG4gICAgICAgICAgICAvL3dlIGNhbiBjaGVjayBpbiAyIHdheXMgb25lIHNlZSBpZiB0aGUgaGFzaCBleGlzdHMgXG4gICAgICAgICAgICBjbGllbnQuZXhpc3RzKFBSRUZJWCt1c2VybmFtZSwoZXJyLHJlc3VsdHMpPT57XG4gICAgICAgICAgICAgICAgY29uc29sZS5sb2cocmVzdWx0cylcbiAgICAgICAgICAgICAgICBpZiAoTnVtYmVyKHJlc3VsdHMpID09IDEpe1xuICAgICAgICAgICAgICAgICAgICByZXNvbHZlKHt0YWtlbjp0cnVlfSlcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgZWxzZVxuICAgICAgICAgICAgICAgICAgICByZXNvbHZlKHt0YWtlbjpmYWxzZX0pXG4gICAgICAgICAgICB9KVxuICAgICAgICB9KVxuICAgIH1cbiAgICBnZW5lcmF0ZVRva2VuICh1c2VyKXtcbiAgICAgICAgcmV0dXJuIG5ldyBQcm9taXNlKGZ1bmN0aW9uKHJlc29sdmUscmVqZWN0KXtcblxuICAgICAgICAgICAgdmFyIHN0cmluZ0RhdGEgPSBKU09OLnN0cmluZ2lmeSh1c2VyKTtcbiAgICAgICAgICAgIHZhciBlbmNyeXB0ZWREYXRhID0gY3J5cHRvanMuQUVTLmVuY3J5cHQoc3RyaW5nRGF0YSwnU2lsdmVyMTIzJykudG9TdHJpbmcoKTtcblxuICAgICAgICAgICAgdmFyIHRva2VuID0gand0LnNpZ24oe1xuICAgICAgICAgICAgICAgIHRva2VuOmVuY3J5cHRlZERhdGFcbiAgICAgICAgICAgIH0sICdzaWx2ZXIxMjMuJyk7XG4gICAgICAgICAgICByZXNvbHZlKCB0b2tlbik7XG4gICAgICAgIH0pO1xuXG4gICAgfVxufVxuZnVuY3Rpb24gY3JlYXRlRG9jdW1lbnQoYWNjb3VudCl7XG4gICAgdmFyIGN1c3RvbWVyRG9jdW1lbnQgPSB7IFxuICAgICAgICBpZCA6IGFjY291bnQuaWQsXG4gICAgICAgIHVzZXJuYW1lOmFjY291bnQudXNlcm5hbWUsXG4gICAgICAgIGVtYWlsOiBhY2NvdW50LmVtYWlsLCBcbiAgICAgICAgZmlyc3ROYW1lIDogYWNjb3VudC5maXJzdE5hbWUsIFxuICAgICAgICBsYXN0TmFtZTogYWNjb3VudC5sYXN0TmFtZSxcbiAgICAgICAgcGFzc3dvcmQ6YWNjb3VudC5wYXNzd29yZCxcbiAgICAgICAgbW9iaWxlOiBhY2NvdW50Lm1vYmlsZSxcbiAgICAgICAgcm9sZTogYWNjb3VudC5yb2xlXG4gICAgfVxuICAgIGNvbnNvbGUubG9nKGN1c3RvbWVyRG9jdW1lbnQpXG4gICAgcmV0dXJuIGN1c3RvbWVyRG9jdW1lbnQ7IFxuIH1cbiBmdW5jdGlvbiBhZGRVc2VyVG9JbmRleChhY2NvdW50LCBzZWFyY2hPYmope1xuICAgICB2YXIgdXNlckRvY3VtZW50ID0gY3JlYXRlRG9jdW1lbnQoYWNjb3VudCk7IFxuICAgICBzZWFyY2hPYmouYWRkKGFjY291bnQuaWQsdXNlckRvY3VtZW50KTsgXG4gfSJdfQ==
