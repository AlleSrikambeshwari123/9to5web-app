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
//# sourceMappingURL=data:application/json;charset=utf8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIlJlZGlzU2VydmljZXMvVXNlclNlcnZpY2UuZXM2Il0sIm5hbWVzIjpbImNyeXB0b2pzIiwicmVxdWlyZSIsImp3dCIsInJlZGlzIiwibHJlZGlzIiwibW9tZW50IiwicmVkaXNTZWFyY2giLCJTRVJWSUNFX0tFWSIsImJjcnlwdCIsIlBSRUZJWCIsIklOREVYIiwiVVNFUklEQ09VTlRFUiIsIkVOViIsImNsaWVudCIsImNyZWF0ZUNsaWVudCIsInJlZGlzX3BvcnQiLCJyZWRpc19ob3N0IiwiYXV0aF9wYXNzIiwicmVkaXNfcGFzcyIsIlVzZXJTZXJ2aWNlIiwicmVkaXNJbmRleFNlYXJjaCIsImNsaWVudE9wdGlvbnMiLCJzZWFyY2hDbGllbnREZXRhaWxzIiwidXNlcm5hbWUiLCJwYXNzd29yZCIsInNydiIsImNvbnNvbGUiLCJsb2ciLCJQcm9taXNlIiwicmVzb2x2ZSIsInJlamVjdCIsImhnZXRhbGwiLCJlcnIiLCJyZXN1bHQiLCJjb21wYXJlIiwicHdkUmVzdWx0IiwiZ2VuZXJhdGVUb2tlbiIsInRoZW4iLCJ1c2VyIiwidG9rZW4iLCJ2YWxpZCIsImZpcnN0TmFtZSIsImxhc3ROYW1lIiwiZW1haWwiLCJtb2JpbGUiLCJyb2xlSWQiLCJwYWdlU2l6ZSIsImN1cnJlbnRQYWdlIiwib2Zmc2V0Iiwic2VhcmNoIiwibnVtYmVyT2ZSZXN1bHRzIiwic29ydEJ5IiwiZGlyIiwicmVzdWx0cyIsInVzZXJzIiwiZm9yRWFjaCIsImVsZW1lbnQiLCJkb2MiLCJwdXNoIiwiaWR4IiwiZGVsZXRlIiwiaWQiLCJyZW1vdmVkIiwiZW5hYmxlZCIsImhtc2V0IiwidXBkYXRlZCIsImNoZWNrVXNlcm5hbWUiLCJ0YWtlbiIsImluY3IiLCJoYXNoU3luYyIsImFkZFVzZXJUb0luZGV4Iiwic2F2ZWQiLCJyZXNsb3ZlIiwiZGVjb2RlZEpXVCIsInZlcmlmeSIsImJ5dGVzIiwiQUVTIiwiZGVjcnlwdCIsInRva2VuRGF0YSIsIkpTT04iLCJwYXJzZSIsInRvU3RyaW5nIiwiZW5jIiwiVXRmOCIsImUiLCJleGlzdHMiLCJOdW1iZXIiLCJzdHJpbmdEYXRhIiwic3RyaW5naWZ5IiwiZW5jcnlwdGVkRGF0YSIsImVuY3J5cHQiLCJzaWduIiwiY3JlYXRlRG9jdW1lbnQiLCJhY2NvdW50IiwiY3VzdG9tZXJEb2N1bWVudCIsInJvbGUiLCJzZWFyY2hPYmoiLCJ1c2VyRG9jdW1lbnQiLCJhZGQiXSwibWFwcGluZ3MiOiI7Ozs7Ozs7Ozs7QUFBQSxJQUFJQSxXQUFZQyxRQUFRLFdBQVIsQ0FBaEI7QUFDQSxJQUFJQyxNQUFNRCxRQUFRLGNBQVIsQ0FBVjtBQUNBLElBQUlFLFFBQVFGLFFBQVEsT0FBUixDQUFaO0FBQ0EsSUFBSUcsU0FBU0gsUUFBUSxlQUFSLENBQWI7QUFDQSxJQUFJSSxTQUFTSixRQUFRLFFBQVIsQ0FBYjtBQUNBLElBQUlLLGNBQWNMLFFBQVEscUJBQVIsQ0FBbEI7QUFDQSxJQUFNTSxjQUFjLE9BQXBCO0FBQ0EsSUFBSUMsU0FBU1AsUUFBUSxRQUFSLENBQWI7QUFDQSxJQUFNUSxTQUFVLE9BQWhCO0FBQ0EsSUFBTUMsUUFBUSxhQUFkO0FBQ0EsSUFBTUMsZ0JBQWdCLFNBQXRCO0FBQ0EsSUFBTUMsTUFBTVgsUUFBUSxnQkFBUixDQUFaO0FBQ0EsSUFBSVksU0FBU1YsTUFBTVcsWUFBTixDQUFtQkYsSUFBSUcsVUFBdkIsRUFBbUNILElBQUlJLFVBQXZDLEVBQW1EO0FBQzVEQyxlQUFXTCxJQUFJTTtBQUNmO0FBQ0E7QUFDQTtBQUo0RCxDQUFuRCxDQUFiOztJQU1hQyxXLFdBQUFBLFc7QUFDVCwyQkFBYTtBQUFBOztBQUNULGFBQUtDLGdCQUFMLEdBQXdCZCxZQUFZSCxLQUFaLEVBQW1CLGFBQW5CLEVBQWtDO0FBQ3REa0IsMkJBQWNqQixPQUFPa0I7QUFEaUMsU0FBbEMsQ0FBeEI7QUFHSDs7OztxQ0FDYUMsUSxFQUFTQyxRLEVBQVM7QUFDNUIsZ0JBQUlDLE1BQU0sSUFBVjtBQUNBQyxvQkFBUUMsR0FBUixDQUFZLGVBQVo7QUFDQSxtQkFBTyxJQUFJ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QVo7QUFHQTVELHdCQUFTVSxLQUFUO0FBQ0gsYUFUTSxDQUFQO0FBV0g7Ozs7OztBQUVMLFNBQVNxRCxjQUFULENBQXdCQyxPQUF4QixFQUFnQztBQUM1QixRQUFJQyxtQkFBbUI7QUFDbkJqQyxZQUFLZ0MsUUFBUWhDLEVBRE07QUFFbkJ0QyxrQkFBU3NFLFFBQVF0RSxRQUZFO0FBR25Cb0IsZUFBT2tELFFBQVFsRCxLQUhJO0FBSW5CRixtQkFBWW9ELFFBQVFwRCxTQUpEO0FBS25CQyxrQkFBVW1ELFFBQVFuRCxRQUxDO0FBTW5CbEIsa0JBQVNxRSxRQUFRckUsUUFORTtBQU9uQm9CLGdCQUFRaUQsUUFBUWpELE1BUEc7QUFRbkJtRCxjQUFNRixRQUFRRTtBQVJLLEtBQXZCO0FBVUFyRSxZQUFRQyxHQUFSLENBQVltRSxnQkFBWjtBQUNBLFdBQU9BLGdCQUFQO0FBQ0Y7QUFDRCxTQUFTeEIsY0FBVCxDQUF3QnVCLE9BQXhCLEVBQWlDRyxTQUFqQyxFQUEyQztBQUN2QyxRQUFJQyxlQUFlTCxlQUFlQyxPQUFmLENBQW5CO0FBQ0FHLGNBQVVFLEdBQVYsQ0FBY0wsUUFBUWhDLEVBQXRCLEVBQXlCb0MsWUFBekI7QUFDSCIsImZpbGUiOiJSZWRpc1NlcnZpY2VzL1VzZXJTZXJ2aWNlLmpzIiwic291cmNlc0NvbnRlbnQiOlsidmFyIGNyeXB0b2pzICA9IHJlcXVpcmUoJ2NyeXB0by1qcycpO1xudmFyIGp3dCA9IHJlcXVpcmUoJ2pzb253ZWJ0b2tlbicpO1xudmFyIHJlZGlzID0gcmVxdWlyZSgncmVkaXMnKTtcbnZhciBscmVkaXMgPSByZXF1aXJlKCcuL3JlZGlzLWxvY2FsJyk7XG52YXIgbW9tZW50ID0gcmVxdWlyZSgnbW9tZW50Jyk7XG52YXIgcmVkaXNTZWFyY2ggPSByZXF1aXJlKCcuLi9yZWRpc2VhcmNoY2xpZW50Jyk7XG5jb25zdCBTRVJWSUNFX0tFWSA9ICd1c2Vycyc7XG52YXIgYmNyeXB0ID0gcmVxdWlyZSgnYmNyeXB0Jyk7IFxuY29uc3QgUFJFRklYICA9IFwidXNlcjpcIlxuY29uc3QgSU5ERVggPSBcImluZGV4OnVzZXJzXCJcbmNvbnN0IFVTRVJJRENPVU5URVIgPSBcInVzZXI6aWRcIjsgXG5jb25zdCBFTlYgPSByZXF1aXJlKCcuLi9lbnZpcm9ubWVudCcpXG52YXIgY2xpZW50ID0gcmVkaXMuY3JlYXRlQ2xpZW50KEVOVi5yZWRpc19wb3J0LCBFTlYucmVkaXNfaG9zdCwge1xuICAgIGF1dGhfcGFzczogRU5WLnJlZGlzX3Bhc3MsXG4gICAgLy8gdGxzOntcbiAgICAvLyAgICAgc2VydmVybmFtZTogJ2NvcmUuc2hpcHRyb3BpY2FsLmNvbSdcbiAgICAvLyB9IFxufSk7XG5leHBvcnQgY2xhc3MgVXNlclNlcnZpY2Uge1xuICAgIGNvbnN0cnVjdG9yKCl7XG4gICAgICAgIHRoaXMucmVkaXNJbmRleFNlYXJjaCA9IHJlZGlzU2VhcmNoKHJlZGlzLCAnaW5kZXg6dXNlcnMnLCB7XG4gICAgICAgICAgICBjbGllbnRPcHRpb25zOmxyZWRpcy5zZWFyY2hDbGllbnREZXRhaWxzXG4gICAgICAgIH0pO1xuICAgIH1cbiAgICBhdXRoZW50aWNhdGUgKHVzZXJuYW1lLHBhc3N3b3JkKXtcbiAgICAgICAgdmFyIHNydiA9IHRoaXM7IFxuICAgICAgICBjb25zb2xlLmxvZygnYWJvdXQgdG8gYXV0aCcpXG4gICAgICAgIHJldHVybiBuZXcgUHJvbWlzZShmdW5jdGlvbihyZXNvbHZlLHJlamVjdCl7XG4gICAgICAgICAgIFxuICAgICAgICAgICAgY2xpZW50LmhnZXRhbGwoUFJFRklYK3VzZXJuYW1lLChlcnIscmVzdWx0KT0+e1xuXG4gICAgICAgICAgICAgICAgY29uc29sZS5sb2cocmVzdWx0LCBcImlzIHRoZSByZXN1bHRzXCIpOyBcbiAgICAgICAgICAgICAgICBpZiAocmVzdWx0KXtcbiAgICAgICAgICAgICAgICAgICAgY29uc29sZS5sb2cocmVzdWx0KTtcbiAgICAgICAgICAgICAgICAgICAgYmNyeXB0LmNvbXBhcmUocGFzc3dvcmQscmVzdWx0LnBhc3N3b3JkLChlcnIscHdkUmVzdWx0KT0+e1xuICAgICAgICAgICAgICAgICAgICAgICAgaWYgKGVycil7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgY29uc29sZS5sb2coZXJyKTsgXG5cbiAgICAgICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgICAgIGlmKHB3ZFJlc3VsdCA9PSB0cnVlKXtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBkZWxldGUgcmVzdWx0LnBhc3N3b3JkOyBcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBzcnYuZ2VuZXJhdGVUb2tlbihyZXN1bHQpLnRoZW4odG9rZW49PntcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgcmVzb2x2ZSh7dXNlcjpyZXN1bHQsdG9rZW46dG9rZW4sdmFsaWQ6dHJ1ZX0pXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgICAgICBlbHNlIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICByZXNvbHZlKHt1c2VyOm51bGwsdG9rZW46XCJcIix2YWxpZDpmYWxzZX0pXG4gICAgICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgICAgIFxuICAgICAgICAgICAgICAgICAgICAgICBcbiAgICAgICAgICAgICAgICAgICAgfSlcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgZWxzZXtcbiAgICAgICAgICAgICAgICAgICAgcmVzb2x2ZSh7dXNlcjpudWxsLHRva2VuOlwiXCIsdmFsaWQ6ZmFsc2V9KVxuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH0pOyBcbiAgICAgICAgICAgIFxuICAgICAgICAgICAgXG4gICAgICAgIH0pO1xuICAgIH1cbiAgICBnZXRVc2VyKHVzZXJuYW1lKXtcbiAgICAgICAgcmV0dXJuIG5ldyBQcm9taXNlIChmdW5jdGlvbihyZXNvbHZlLHJlamVjdCl7XG4gICAgICAgICAgICBjbGllbnQuaGdldGFsbChQUkVGSVgrdXNlcm5hbWUsKGVycixyZXN1bHQpPT57XG4gICAgICAgICAgICAgICAgaWYgKHJlc3VsdCl7XG4gICAgICAgICAgICAgICAgICAgIGRlbGV0ZSByZXN1bHQucGFzc3dvcmQ7IFxuICAgICAgICAgICAgICAgICAgICByZXNvbHZlKHt1c2VyOnJlc3VsdH0pXG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIGVsc2UgcmVzb2x2ZSh7dXNlcjp7dXNlcm5hbWU6JycsZmlyc3ROYW1lOicnLGxhc3ROYW1lOicnLGVtYWlsOicnLG1vYmlsZTonJ319KVxuICAgICAgICAgICAgfSlcbiAgICAgICAgIFxuICAgICAgICB9KTtcbiAgICB9XG4gICAgZ2V0VXNlcnNJblJvbGUocm9sZUlkKXtcbiAgICAgICAgcmV0dXJuIG5ldyBQcm9taXNlIChmdW5jdGlvbihyZXNvbHZlLHJlamVjdCl7XG5cbiAgICAgICAgICAgIC8vIGRhdGFDb250ZXh0LmdldFNlcnZpY2VQcm94eShTRVJWSUNFX0tFWSkuZ2V0VXNlcnNCeVJvbGUoe3JvbGVJZDpyb2xlSWR9LGZ1bmN0aW9uKGVycm9yLHJlc3VsdCl7XG4gICAgICAgICAgICAvLyAgICAgaWYgKGVycm9yKXtcbiAgICAgICAgICAgIC8vICAgICAgICAgcmVqZWN0KGVycm9yKTtcbiAgICAgICAgICAgIC8vICAgICB9XG4gICAgICAgICAgICAvLyAgICAgcmVzb2x2ZSggcmVzdWx0KTtcbiAgICAgICAgICAgIC8vIH0pO1xuICAgICAgICB9KTtcbiAgICB9XG4gICAgZ2V0Um9sZXMoKXtcbiAgICAgICAgcmV0dXJuIG5ldyBQcm9taXNlIChmdW5jdGlvbihyZXNvbHZlLHJlamVjdCl7XG5cbiAgICAgICAgICAgIHJlc29sdmUoW1wiQWRtaW5cIixcIldhcmVob3VzZSBGTExcIixcIkN1c3RvbXMgQWdlbnRcIixcIldhcmVob3VzZSBCQUhBTUFTXCIsXCJDYXNoaWVyXCIsXCJMb2NhdGlvbiBNYW5hZ2VyXCJdKVxuICAgICAgICAgICAgXG4gICAgICAgIH0pO1xuICAgIH1cbiAgICBnZXRBbGxVc2VycyhwYWdlU2l6ZSxjdXJyZW50UGFnZSl7XG4gICAgICAgIHZhciBzcnYgPSB0aGlzOyBcbiAgICAgICAgY29uc29sZS5sb2coJ2dldHRpbmcgYWxsIHVzZXJzJylcbiAgICAgICAgcmV0dXJuIG5ldyBQcm9taXNlIChmdW5jdGlvbihyZXNvbHZlLHJlamVjdCl7XG4gICAgICAgICAgICB2YXIgb2Zmc2V0XG4gICAgICAgICAgIHNydi5yZWRpc0luZGV4U2VhcmNoLnNlYXJjaCgnKicse1xuICAgICAgICAgICAgb2Zmc2V0OjAsXG4gICAgICAgICAgICBudW1iZXJPZlJlc3VsdHM6IDEwMDAsXG4gICAgICAgICAgICBzb3J0Qnk6IFwibGFzdE5hbWVcIixcbiAgICAgICAgICAgIGRpcjogXCJBU0NcIlxuICAgICAgICB9LChlcnIscmVzdWx0cyk9PntcbiAgICAgICAgICAgIHZhciB1c2VycyA9IFtdO1xuICAgICAgICAgICAgICAgIHJlc3VsdHMucmVzdWx0cy5mb3JFYWNoKGVsZW1lbnQgPT4ge1xuICAgICAgICAgICAgICAgICAgICBkZWxldGUgZWxlbWVudC5kb2MucGFzc3dvcmRcbiAgICAgICAgICAgICAgICAgICAgdXNlcnMucHVzaChlbGVtZW50LmRvYyk7IFxuICAgICAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgICAgIHJlc29sdmUodXNlcnMpXG4gICAgICAgIH0pXG4gICAgICAgIH0pO1xuICAgIH1cbiAgICByZW1vdmVVc2VyKHVzZXJuYW1lKXtcbiAgICAgICAgcmV0dXJuIG5ldyBQcm9taXNlIChmdW5jdGlvbihyZXNvbHZlLHJlamVjdCl7XG4gICAgICAgICAgICB2YXIgaWR4PSB0aGlzLnJlZGlzSW5kZXhTZWFyY2g7IFxuICAgICAgICBscmVkaXMuaGdldGFsbChQUkVGSVgrdXNlcm5hbWUpLnRoZW4odXNlcj0+e1xuICAgICAgICAgICAgaWR4LmRlbGV0ZSh1c2VyLmlkKTsgXG4gICAgICAgICAgICBjbGllbnQuZGVsZXRlKFBSRUZJWCt1c2VybmFtZSwoZXJyLHJlc3VsdCk9PntcbiAgICAgICAgICAgICAgICBpZiAoZXJyKXtcbiAgICAgICAgICAgICAgICAgICAgY29uc29sZS5sb2coXCJ1bmFibGUgdG8gZGVsZXRlXCIpOyBcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgcmVzb2x2ZSh7cmVtb3ZlZDp0cnVlfSlcbiAgICAgICAgICAgIH0pXG4gICAgICAgIH0pXG4gICAgICAgICAgLy9maW5kIHRoZSB1c2VyIGJ5IHVzZXJuYW1lIFxuICAgICAgICAgIC8vZ2V0IHRoZSBkb2MgSWQgXG4gICAgICAgICAgLy9kZWxldGUgZnJvbSBpbmRleCBcbiAgICAgICAgICAvL2RlbGV0ZSBoYXNoIFxuICAgICAgICB9KTtcbiAgICB9XG4gICAgZW5hYmxlVXNlcih1c2VybmFtZSxlbmFibGVkKXtcbiAgICAgICAgcmV0dXJuIG5ldyBQcm9taXNlIChmdW5jdGlvbihyZXNvbHZlLHJlamVjdCl7XG4gICAgICAgICAgICBjbGllbnQuaG1zZXQoUFJFRklYK3VzZXJuYW1lLHtlbmFibGVkOmVuYWJsZWR9LChlcnIscmVzdWx0KT0+e1xuICAgICAgICAgICAgICAgIGlmIChlcnIpe1xuICAgICAgICAgICAgICAgICAgICByZXNvbHZlKHt1cGRhdGVkOmZhbHNlfSlcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgZWxzZSB7XG4gICAgICAgICAgICAgICAgICAgIHJlc29sdmUoe3VwZGF0ZWQ6dHJ1ZX0pXG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfSk7IFxuICAgICAgICAgICAgXG4gICAgICAgIH0pO1xuICAgIH1cbiAgICBzYXZlVXNlcih1c2VyKXtcbiAgICAgICB2YXIgc3J2ID0gdGhpczsgXG4gICAgICAgIHJldHVybiBuZXcgUHJvbWlzZSAoZnVuY3Rpb24ocmVzb2x2ZSxyZWplY3Qpe1xuICAgICAgICAgICAgc3J2LmNoZWNrVXNlcm5hbWUodXNlci51c2VybmFtZSkudGhlbih2YWxpZD0+e1xuICAgICAgICAgICAgICAgIGNvbnNvbGUubG9nKHZhbGlkKVxuICAgICAgICAgICAgICAgIGlmICh2YWxpZC50YWtlbiA9PSBmYWxzZSl7XG4gICAgICAgICAgICAgICAgICAgIC8vY3JlYXRlIHRoZSBoYXNoIFxuICAgICAgICAgICAgICAgICAgICBjbGllbnQuaW5jcihVU0VSSURDT1VOVEVSLChlcnIsaWQpPT57XG4gICAgICAgICAgICAgICAgICAgICAgICB1c2VyLmlkID0gaWQ7IFxuICAgICAgICAgICAgICAgICAgICAgICAgdXNlci5wYXNzd29yZCA9IGJjcnlwdC5oYXNoU3luYyh1c2VyLnBhc3N3b3JkLDEwKTsgXG4gICAgICAgICAgICAgICAgICAgICAgICBscmVkaXMuaG1zZXQoUFJFRklYK3VzZXIudXNlcm5hbWUsdXNlcilcbiAgICAgICAgICAgICAgICAgICAgICAgIGFkZFVzZXJUb0luZGV4KHVzZXIsc3J2LnJlZGlzSW5kZXhTZWFyY2gpOyBcbiAgICAgICAgICAgICAgICAgICAgfSlcbiAgICAgICAgICAgICAgICAgICAgXG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIGVsc2Uge1xuICAgICAgICAgICAgICAgICAgICAvL3VwZGF0ZSB0aGUgdXNlciBcbiAgICAgICAgICAgICAgICAgICAgcmVzb2x2ZSh7c2F2ZWQ6ZmFsc2UsXCJtZXNzYWdlXCI6XCJVc2VybmFtZSB0YWtlblwifSlcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9KVxuICAgICAgICAgICAgLy8gZGF0YUNvbnRleHQuZ2V0U2VydmljZVByb3h5KFNFUlZJQ0VfS0VZKS5zYXZlVXNlcih1c2VyLGZ1bmN0aW9uKGVycm9yLHJlc3VsdCl7XG4gICAgICAgICAgICAvLyAgICAgaWYgKGVycm9yKXtcbiAgICAgICAgICAgIC8vICAgICAgICAgcmVqZWN0KGVycm9yKTtcbiAgICAgICAgICAgIC8vICAgICB9XG4gICAgICAgICAgICAvLyAgICAgcmVzb2x2ZSggcmVzdWx0KTtcbiAgICAgICAgICAgIC8vIH0pO1xuICAgICAgICB9KTtcbiAgICB9XG4gICAgdmVyaWZ5VG9rZW4gKHRva2VuKXtcbiAgICAgICAgcmV0dXJuIG5ldyBQcm9taXNlKGZ1bmN0aW9uKHJlc2xvdmUscmVqZWN0KXtcbiAgICAgICAgICAgIHRyeSB7XG4gICAgICAgICAgICAgICAgdmFyIGRlY29kZWRKV1QgPSBqd3QudmVyaWZ5KHRva2VuLCdzaWx2ZXIxMjMuJyk7XG4gICAgICAgICAgICAgICAgdmFyIGJ5dGVzID0gY3J5cHRvanMuQUVTLmRlY3J5cHQoZGVjb2RlZEpXVC50b2tlbiwnU2lsdmVyMTIzJyk7XG4gICAgICAgICAgICAgICAgdmFyIHRva2VuRGF0YSA9IEpTT04ucGFyc2UoYnl0ZXMudG9TdHJpbmcoY3J5cHRvanMuZW5jLlV0ZjgpKTtcbiAgICAgICAgICAgICAgICAvKiAgY29uc29sZS5sb2coJ3Rva2VuIGRhdGEgYmVsb3cnKTtcbiAgICAgICAgICAgICAgICAgY29uc29sZS5sb2codG9rZW5EYXRhKTsqL1xuICAgICAgICAgICAgICAgIHJlc2xvdmUodG9rZW5EYXRhKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIGNhdGNoKGUpe1xuICAgICAgICAgICAgICAgIGNvbnNvbGUubG9nKGUsXCJ1bmFibGUgdG8gdmVyaWZ5IHRva2VuXCIpXG4gICAgICAgICAgICAgICAgcmVqZWN0KCk7XG4gICAgICAgICAgICB9XG5cbiAgICAgICAgfSk7XG4gICAgfVxuICAgIGNoZWNrVXNlcm5hbWUodXNlcm5hbWUpe1xuICAgICAgICByZXR1cm4gbmV3IFByb21pc2UoKHJlc29sdmUscmVqZWN0KT0+e1xuICAgICAgICAgICAgLy93ZSBjYW4gY2hlY2sgaW4gMiB3YXlzIG9uZSBzZWUgaWYgdGhlIGhhc2ggZXhpc3RzIFxuICAgICAgICAgICAgY2xpZW50LmV4aXN0cyhQUkVGSVgrdXNlcm5hbWUsKGVycixyZXN1bHRzKT0+e1xuICAgICAgICAgICAgICAgIGNvbnNvbGUubG9nKHJlc3VsdHMpXG4gICAgICAgICAgICAgICAgaWYgKE51bWJlcihyZXN1bHRzKSA9PSAxKXtcbiAgICAgICAgICAgICAgICAgICAgcmVzb2x2ZSh7dGFrZW46dHJ1ZX0pXG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIGVsc2VcbiAgICAgICAgICAgICAgICAgICAgcmVzb2x2ZSh7dGFrZW46ZmFsc2V9KVxuICAgICAgICAgICAgfSlcbiAgICAgICAgfSlcbiAgICB9XG4gICAgZ2VuZXJhdGVUb2tlbiAodXNlcil7XG4gICAgICAgIHJldHVybiBuZXcgUHJvbWlzZShmdW5jdGlvbihyZXNvbHZlLHJlamVjdCl7XG5cbiAgICAgICAgICAgIHZhciBzdHJpbmdEYXRhID0gSlNPTi5zdHJpbmdpZnkodXNlcik7XG4gICAgICAgICAgICB2YXIgZW5jcnlwdGVkRGF0YSA9IGNyeXB0b2pzLkFFUy5lbmNyeXB0KHN0cmluZ0RhdGEsJ1NpbHZlcjEyMycpLnRvU3RyaW5nKCk7XG5cbiAgICAgICAgICAgIHZhciB0b2tlbiA9IGp3dC5zaWduKHtcbiAgICAgICAgICAgICAgICB0b2tlbjplbmNyeXB0ZWREYXRhXG4gICAgICAgICAgICB9LCAnc2lsdmVyMTIzLicpO1xuICAgICAgICAgICAgcmVzb2x2ZSggdG9rZW4pO1xuICAgICAgICB9KTtcblxuICAgIH1cbn1cbmZ1bmN0aW9uIGNyZWF0ZURvY3VtZW50KGFjY291bnQpe1xuICAgIHZhciBjdXN0b21lckRvY3VtZW50ID0geyBcbiAgICAgICAgaWQgOiBhY2NvdW50LmlkLFxuICAgICAgICB1c2VybmFtZTphY2NvdW50LnVzZXJuYW1lLFxuICAgICAgICBlbWFpbDogYWNjb3VudC5lbWFpbCwgXG4gICAgICAgIGZpcnN0TmFtZSA6IGFjY291bnQuZmlyc3ROYW1lLCBcbiAgICAgICAgbGFzdE5hbWU6IGFjY291bnQubGFzdE5hbWUsXG4gICAgICAgIHBhc3N3b3JkOmFjY291bnQucGFzc3dvcmQsXG4gICAgICAgIG1vYmlsZTogYWNjb3VudC5tb2JpbGUsXG4gICAgICAgIHJvbGU6IGFjY291bnQucm9sZVxuICAgIH1cbiAgICBjb25zb2xlLmxvZyhjdXN0b21lckRvY3VtZW50KVxuICAgIHJldHVybiBjdXN0b21lckRvY3VtZW50OyBcbiB9XG4gZnVuY3Rpb24gYWRkVXNlclRvSW5kZXgoYWNjb3VudCwgc2VhcmNoT2JqKXtcbiAgICAgdmFyIHVzZXJEb2N1bWVudCA9IGNyZWF0ZURvY3VtZW50KGFjY291bnQpOyBcbiAgICAgc2VhcmNoT2JqLmFkZChhY2NvdW50LmlkLHVzZXJEb2N1bWVudCk7IFxuIH0iXX0=
