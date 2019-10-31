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
                                console.log("auth failed");
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
                        //prepare the roles we are going to get an arra 


                        if (!user.password || user.password == "") {
                            delete user.password;
                        }
                        console.log('updating user', user);
                        user.password = bcrypt.hashSync(user.password, 10);
                        client.hmset(PREFIX + user.username, user);
                        srv.redisIndexSearch.update(user.id, user, function (err, reply) {
                            if (err) {
                                console.log(err);
                                resolve({ saved: false, "message": "Username err" });
                            } else {

                                user.password = bcrypt.hashSync(user.password, 10);

                                resolve({ saved: true, "message": "User updated." });
                            }
                        });
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

function ConvertRolesToString(rolesArray) {
    var allPermissions = "";
    rolesArray.forEach(function (role) {
        allPermissions += role + ",";
    });
    allPermissions = allPermissions.substring(0, allPermissions.length - 1);
    console.log(allPermissions);
}
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
//# sourceMappingURL=data:application/json;charset=utf8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIlJlZGlzU2VydmljZXMvVXNlclNlcnZpY2UuZXM2Il0sIm5hbWVzIjpbImNyeXB0b2pzIiwicmVxdWlyZSIsImp3dCIsInJlZGlzIiwibHJlZGlzIiwibW9tZW50IiwicmVkaXNTZWFyY2giLCJTRVJWSUNFX0tFWSIsImJjcnlwdCIsIlBSRUZJWCIsIklOREVYIiwiVVNFUklEQ09VTlRFUiIsIkVOViIsImNsaWVudCIsImNyZWF0ZUNsaWVudCIsInJlZGlzX3BvcnQiLCJyZWRpc19ob3N0IiwiYXV0aF9wYXNzIiwicmVkaXNfcGFzcyIsIlVzZXJTZXJ2aWNlIiwicmVkaXNJbmRleFNlYXJjaCIsImNsaWVudE9wdGlvbnMiLCJzZWFyY2hDbGllbnREZXRhaWxzIiwidXNlcm5hbWUiLCJwYXNzd29yZCIsInNydiIsImNvbnNvbGUiLCJsb2ciLCJQcm9taXNlIiwicmVzb2x2ZSIsInJlamVjdCIsImhnZXRhbGwiLCJlcnIiLCJyZXN1bHQiLCJjb21wYXJlIiwicHdkUmVzdWx0IiwiZ2VuZXJhdGVUb2tlbiIsInRoZW4iLCJ1c2VyIiwidG9rZW4iLCJ2YWxpZCIsImZpcnN0TmFtZSIsImxhc3ROYW1lIiwiZW1haWwiLCJtb2JpbGUiLCJyb2xlSWQiLCJwYWdlU2l6ZSIsImN1cnJlbnRQYWdlIiwib2Zmc2V0Iiwic2VhcmNoIiwibnVtYmVyT2ZSZXN1bHRzIiwic29ydEJ5IiwiZGlyIiwicmVzdWx0cyIsInVzZXJzIiwiZm9yRWFjaCIsImVsZW1lbnQiLCJkb2MiLCJwdXNoIiwiaWR4IiwiZGVsZXRlIiwiaWQiLCJyZW1vdmVkIiwiZW5hYmxlZCIsImhtc2V0IiwidXBkYXRlZCIsImNoZWNrVXNlcm5hbWUiLCJ0YWtlbiIsImluY3IiLCJoYXNoU3luYyIsImFkZFVzZXJUb0luZGV4Iiwic2F2ZWQiLCJ1cGRhdGUiLCJyZXBseSIsInJlc2xvdmUiLCJkZWNvZGVkSldUIiwidmVyaWZ5IiwiYnl0ZXMiLCJBRVMiLCJkZWNyeXB0IiwidG9rZW5EYXRhIiwiSlNPTiIsInBhcnNlIiwidG9TdHJpbmciLCJlbmMiLCJVdGY4IiwiZSIsImV4aXN0cyIsIk51bWJlciIsInN0cmluZ0RhdGEiLCJzdHJpbmdpZnkiLCJlbmNyeXB0ZWREYXRhIiwiZW5jcnlwdCIsInNpZ24iLCJDb252ZXJ0Um9sZXNUb1N0cmluZyIsInJvbGVzQXJyYXkiLCJhbGxQZXJtaXNzaW9ucyIsInJvbGUiLCJzdWJzdHJpbmciLCJsZW5ndGgiLCJjcmVhdGVEb2N1bWVudCIsImFjY291bnQiLCJjdXN0b21lckRvY3VtZW50Iiwic2VhcmNoT2JqIiwidXNlckRvY3VtZW50IiwiYWRkIl0sIm1hcHBpbmdzIjoiOzs7Ozs7Ozs7O0FBQUEsSUFBSUEsV0FBWUMsUUFBUSxXQUFSLENBQWhCO0FBQ0EsSUFBSUMsTUFBTUQsUUFBUSxjQUFSLENBQVY7QUFDQSxJQUFJRSxRQUFRRixRQUFRLE9BQVIsQ0FBWjtBQUNBLElBQUlHLFNBQVNILFFBQVEsZUFBUixDQUFiO0FBQ0EsSUFBSUksU0FBU0osUUFBUSxRQUFSLENBQWI7QUFDQSxJQUFJSyxjQUFjTCxRQUFRLHFCQUFSLENBQWxCO0FBQ0EsSUFBTU0sY0FBYyxPQUFwQjtBQUNBLElBQUlDLFNBQVNQLFFBQVEsUUFBUixDQUFiO0FBQ0EsSUFBTVEsU0FBVSxPQUFoQjtBQUNBLElBQU1DLFFBQVEsYUFBZDtBQUNBLElBQU1DLGdCQUFnQixTQUF0QjtBQUNBLElBQU1DLE1BQU1YLFFBQVEsZ0JBQVIsQ0FBWjtBQUNBLElBQUlZLFNBQVNWLE1BQU1XLFlBQU4sQ0FBbUJGLElBQUlHLFVBQXZCLEVBQW1DSCxJQUFJSSxVQUF2QyxFQUFtRDtBQUM1REMsZUFBV0wsSUFBSU07QUFDZjtBQUNBO0FBQ0E7QUFKNEQsQ0FBbkQsQ0FBYjs7SUFNYUMsVyxXQUFBQSxXO0FBQ1QsMkJBQWE7QUFBQTs7QUFDVCxhQUFLQyxnQkFBTCxHQUF3QmQsWUFBWUgsS0FBWixFQUFtQixhQUFuQixFQUFrQztBQUN0RGtCLDJCQUFjakIsT0FBT2tCO0FBRGlDLFNBQWxDLENBQXhCO0FBR0g7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Q0gsS0FGRDtBQUdBRCxxQkFBaUJBLGVBQWVFLFNBQWYsQ0FBeUIsQ0FBekIsRUFBMkJGLGVBQWVHLE1BQWYsR0FBc0IsQ0FBakQsQ0FBakI7QUFDQXpFLFlBQVFDLEdBQVIsQ0FBWXFFLGNBQVo7QUFDSDtBQUNELFNBQVNJLGNBQVQsQ0FBd0JDLE9BQXhCLEVBQWdDO0FBQzVCLFFBQUlDLG1CQUFtQjtBQUNuQnpDLFlBQUt3QyxRQUFReEMsRUFETTtBQUVuQnRDLGtCQUFTOEUsUUFBUTlFLFFBRkU7QUFHbkJvQixlQUFPMEQsUUFBUTFELEtBSEk7QUFJbkJGLG1CQUFZNEQsUUFBUTVELFNBSkQ7QUFLbkJDLGtCQUFVMkQsUUFBUTNELFFBTEM7QUFNbkJsQixrQkFBUzZFLFFBQVE3RSxRQU5FO0FBT25Cb0IsZ0JBQVF5RCxRQUFRekQsTUFQRztBQVFuQnFELGNBQU1JLFFBQVFKO0FBUkssS0FBdkI7QUFVQXZFLFlBQVFDLEdBQVIsQ0FBWTJFLGdCQUFaO0FBQ0EsV0FBT0EsZ0JBQVA7QUFDRjtBQUNELFNBQVNoQyxjQUFULENBQXdCK0IsT0FBeEIsRUFBaUNFLFNBQWpDLEVBQTJDO0FBQ3ZDLFFBQUlDLGVBQWVKLGVBQWVDLE9BQWYsQ0FBbkI7QUFDQUUsY0FBVUUsR0FBVixDQUFjSixRQUFReEMsRUFBdEIsRUFBeUIyQyxZQUF6QjtBQUNIIiwiZmlsZSI6IlJlZGlzU2VydmljZXMvVXNlclNlcnZpY2UuanMiLCJzb3VyY2VzQ29udGVudCI6WyJ2YXIgY3J5cHRvanMgID0gcmVxdWlyZSgnY3J5cHRvLWpzJyk7XG52YXIgand0ID0gcmVxdWlyZSgnanNvbndlYnRva2VuJyk7XG52YXIgcmVkaXMgPSByZXF1aXJlKCdyZWRpcycpO1xudmFyIGxyZWRpcyA9IHJlcXVpcmUoJy4vcmVkaXMtbG9jYWwnKTtcbnZhciBtb21lbnQgPSByZXF1aXJlKCdtb21lbnQnKTtcbnZhciByZWRpc1NlYXJjaCA9IHJlcXVpcmUoJy4uL3JlZGlzZWFyY2hjbGllbnQnKTtcbmNvbnN0IFNFUlZJQ0VfS0VZID0gJ3VzZXJzJztcbnZhciBiY3J5cHQgPSByZXF1aXJlKCdiY3J5cHQnKTsgXG5jb25zdCBQUkVGSVggID0gXCJ1c2VyOlwiXG5jb25zdCBJTkRFWCA9IFwiaW5kZXg6dXNlcnNcIlxuY29uc3QgVVNFUklEQ09VTlRFUiA9IFwidXNlcjppZFwiOyBcbmNvbnN0IEVOViA9IHJlcXVpcmUoJy4uL2Vudmlyb25tZW50JylcbnZhciBjbGllbnQgPSByZWRpcy5jcmVhdGVDbGllbnQoRU5WLnJlZGlzX3BvcnQsIEVOVi5yZWRpc19ob3N0LCB7XG4gICAgYXV0aF9wYXNzOiBFTlYucmVkaXNfcGFzcyxcbiAgICAvLyB0bHM6e1xuICAgIC8vICAgICBzZXJ2ZXJuYW1lOiAnY29yZS5zaGlwdHJvcGljYWwuY29tJ1xuICAgIC8vIH0gXG59KTtcbmV4cG9ydCBjbGFzcyBVc2VyU2VydmljZSB7XG4gICAgY29uc3RydWN0b3IoKXtcbiAgICAgICAgdGhpcy5yZWRpc0luZGV4U2VhcmNoID0gcmVkaXNTZWFyY2gocmVkaXMsICdpbmRleDp1c2VycycsIHtcbiAgICAgICAgICAgIGNsaWVudE9wdGlvbnM6bHJlZGlzLnNlYXJjaENsaWVudERldGFpbHNcbiAgICAgICAgfSk7XG4gICAgfVxuICAgIGF1dGhlbnRpY2F0ZSAodXNlcm5hbWUscGFzc3dvcmQpe1xuICAgICAgICB2YXIgc3J2ID0gdGhpczsgXG4gICAgICAgIGNvbnNvbGUubG9nKCdhYm91dCB0byBhdXRoJylcbiAgICAgICAgcmV0dXJuIG5ldyBQcm9taXNlKGZ1bmN0aW9uKHJlc29sdmUscmVqZWN0KXtcbiAgICAgICAgICAgXG4gICAgICAgICAgICBjbGllbnQuaGdldGFsbChQUkVGSVgrdXNlcm5hbWUsKGVycixyZXN1bHQpPT57XG5cbiAgICAgICAgICAgICAgICBjb25zb2xlLmxvZyhyZXN1bHQsIFwiaXMgdGhlIHJlc3VsdHNcIik7IFxuICAgICAgICAgICAgICAgIGlmIChyZXN1bHQpe1xuICAgICAgICAgICAgICAgICAgICBjb25zb2xlLmxvZyhyZXN1bHQpO1xuICAgICAgICAgICAgICAgICAgICBiY3J5cHQuY29tcGFyZShwYXNzd29yZCxyZXN1bHQucGFzc3dvcmQsKGVycixwd2RSZXN1bHQpPT57XG4gICAgICAgICAgICAgICAgICAgICAgICBpZiAoZXJyKXtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBjb25zb2xlLmxvZyhlcnIpOyBcblxuICAgICAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICAgICAgaWYocHdkUmVzdWx0ID09IHRydWUpe1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGRlbGV0ZSByZXN1bHQucGFzc3dvcmQ7IFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHNydi5nZW5lcmF0ZVRva2VuKHJlc3VsdCkudGhlbih0b2tlbj0+e1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICByZXNvbHZlKHt1c2VyOnJlc3VsdCx0b2tlbjp0b2tlbix2YWxpZDp0cnVlfSlcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICB9KTtcbiAgICAgICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgICAgIGVsc2UgeyBcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBjb25zb2xlLmxvZyhcImF1dGggZmFpbGVkXCIpXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgcmVzb2x2ZSh7dXNlcjpudWxsLHRva2VuOlwiXCIsdmFsaWQ6ZmFsc2V9KVxuICAgICAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICAgICBcbiAgICAgICAgICAgICAgICAgICAgICAgXG4gICAgICAgICAgICAgICAgICAgIH0pXG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIGVsc2V7XG4gICAgICAgICAgICAgICAgICAgIHJlc29sdmUoe3VzZXI6bnVsbCx0b2tlbjpcIlwiLHZhbGlkOmZhbHNlfSlcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9KTsgXG4gICAgICAgICAgICBcbiAgICAgICAgICAgIFxuICAgICAgICB9KTtcbiAgICB9XG4gICAgZ2V0VXNlcih1c2VybmFtZSl7XG4gICAgICAgIHJldHVybiBuZXcgUHJvbWlzZSAoZnVuY3Rpb24ocmVzb2x2ZSxyZWplY3Qpe1xuICAgICAgICAgICAgY2xpZW50LmhnZXRhbGwoUFJFRklYK3VzZXJuYW1lLChlcnIscmVzdWx0KT0+e1xuICAgICAgICAgICAgICAgIGlmIChyZXN1bHQpe1xuICAgICAgICAgICAgICAgICAgICBkZWxldGUgcmVzdWx0LnBhc3N3b3JkOyBcbiAgICAgICAgICAgICAgICAgICAgcmVzb2x2ZSh7dXNlcjpyZXN1bHR9KVxuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICBlbHNlIHJlc29sdmUoe3VzZXI6e3VzZXJuYW1lOicnLGZpcnN0TmFtZTonJyxsYXN0TmFtZTonJyxlbWFpbDonJyxtb2JpbGU6Jyd9fSlcbiAgICAgICAgICAgIH0pXG4gICAgICAgICBcbiAgICAgICAgfSk7XG4gICAgfVxuICAgIGdldFVzZXJzSW5Sb2xlKHJvbGVJZCl7XG4gICAgICAgIHJldHVybiBuZXcgUHJvbWlzZSAoZnVuY3Rpb24ocmVzb2x2ZSxyZWplY3Qpe1xuXG4gICAgICAgICAgICAvLyBkYXRhQ29udGV4dC5nZXRTZXJ2aWNlUHJveHkoU0VSVklDRV9LRVkpLmdldFVzZXJzQnlSb2xlKHtyb2xlSWQ6cm9sZUlkfSxmdW5jdGlvbihlcnJvcixyZXN1bHQpe1xuICAgICAgICAgICAgLy8gICAgIGlmIChlcnJvcil7XG4gICAgICAgICAgICAvLyAgICAgICAgIHJlamVjdChlcnJvcik7XG4gICAgICAgICAgICAvLyAgICAgfVxuICAgICAgICAgICAgLy8gICAgIHJlc29sdmUoIHJlc3VsdCk7XG4gICAgICAgICAgICAvLyB9KTtcbiAgICAgICAgfSk7XG4gICAgfVxuICAgIGdldFJvbGVzKCl7XG4gICAgICAgIHJldHVybiBuZXcgUHJvbWlzZSAoZnVuY3Rpb24ocmVzb2x2ZSxyZWplY3Qpe1xuXG4gICAgICAgICAgICByZXNvbHZlKFtcIkFkbWluXCIsXCJXYXJlaG91c2UgRkxMXCIsXCJDdXN0b21zIEFnZW50XCIsXCJXYXJlaG91c2UgQkFIQU1BU1wiLFwiQ2FzaGllclwiLFwiTG9jYXRpb24gTWFuYWdlclwiXSlcbiAgICAgICAgICAgIFxuICAgICAgICB9KTtcbiAgICB9XG4gICAgZ2V0QWxsVXNlcnMocGFnZVNpemUsY3VycmVudFBhZ2Upe1xuICAgICAgICB2YXIgc3J2ID0gdGhpczsgXG4gICAgICAgIGNvbnNvbGUubG9nKCdnZXR0aW5nIGFsbCB1c2VycycpXG4gICAgICAgIHJldHVybiBuZXcgUHJvbWlzZSAoZnVuY3Rpb24ocmVzb2x2ZSxyZWplY3Qpe1xuICAgICAgICAgICAgdmFyIG9mZnNldFxuICAgICAgICAgICBzcnYucmVkaXNJbmRleFNlYXJjaC5zZWFyY2goJyonLHtcbiAgICAgICAgICAgIG9mZnNldDowLFxuICAgICAgICAgICAgbnVtYmVyT2ZSZXN1bHRzOiAxMDAwLFxuICAgICAgICAgICAgc29ydEJ5OiBcImxhc3ROYW1lXCIsXG4gICAgICAgICAgICBkaXI6IFwiQVNDXCJcbiAgICAgICAgfSwoZXJyLHJlc3VsdHMpPT57XG4gICAgICAgICAgICB2YXIgdXNlcnMgPSBbXTtcbiAgICAgICAgICAgICAgICByZXN1bHRzLnJlc3VsdHMuZm9yRWFjaChlbGVtZW50ID0+IHtcbiAgICAgICAgICAgICAgICAgICAgZGVsZXRlIGVsZW1lbnQuZG9jLnBhc3N3b3JkXG4gICAgICAgICAgICAgICAgICAgIHVzZXJzLnB1c2goZWxlbWVudC5kb2MpOyBcbiAgICAgICAgICAgICAgICB9KTtcbiAgICAgICAgICAgICAgICByZXNvbHZlKHVzZXJzKVxuICAgICAgICB9KVxuICAgICAgICB9KTtcbiAgICB9XG4gICAgcmVtb3ZlVXNlcih1c2VybmFtZSl7XG4gICAgICAgIHJldHVybiBuZXcgUHJvbWlzZSAoZnVuY3Rpb24ocmVzb2x2ZSxyZWplY3Qpe1xuICAgICAgICAgICAgdmFyIGlkeD0gdGhpcy5yZWRpc0luZGV4U2VhcmNoOyBcbiAgICAgICAgbHJlZGlzLmhnZXRhbGwoUFJFRklYK3VzZXJuYW1lKS50aGVuKHVzZXI9PntcbiAgICAgICAgICAgIGlkeC5kZWxldGUodXNlci5pZCk7IFxuICAgICAgICAgICAgY2xpZW50LmRlbGV0ZShQUkVGSVgrdXNlcm5hbWUsKGVycixyZXN1bHQpPT57XG4gICAgICAgICAgICAgICAgaWYgKGVycil7XG4gICAgICAgICAgICAgICAgICAgIGNvbnNvbGUubG9nKFwidW5hYmxlIHRvIGRlbGV0ZVwiKTsgXG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIHJlc29sdmUoe3JlbW92ZWQ6dHJ1ZX0pXG4gICAgICAgICAgICB9KVxuICAgICAgICB9KVxuICAgICAgICAgIC8vZmluZCB0aGUgdXNlciBieSB1c2VybmFtZSBcbiAgICAgICAgICAvL2dldCB0aGUgZG9jIElkIFxuICAgICAgICAgIC8vZGVsZXRlIGZyb20gaW5kZXggXG4gICAgICAgICAgLy9kZWxldGUgaGFzaCBcbiAgICAgICAgfSk7XG4gICAgfVxuICAgIGVuYWJsZVVzZXIodXNlcm5hbWUsZW5hYmxlZCl7XG4gICAgICAgIHJldHVybiBuZXcgUHJvbWlzZSAoZnVuY3Rpb24ocmVzb2x2ZSxyZWplY3Qpe1xuICAgICAgICAgICAgY2xpZW50Lmhtc2V0KFBSRUZJWCt1c2VybmFtZSx7ZW5hYmxlZDplbmFibGVkfSwoZXJyLHJlc3VsdCk9PntcbiAgICAgICAgICAgICAgICBpZiAoZXJyKXtcbiAgICAgICAgICAgICAgICAgICAgcmVzb2x2ZSh7dXBkYXRlZDpmYWxzZX0pXG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIGVsc2Uge1xuICAgICAgICAgICAgICAgICAgICByZXNvbHZlKHt1cGRhdGVkOnRydWV9KVxuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH0pOyBcbiAgICAgICAgICAgIFxuICAgICAgICB9KTtcbiAgICB9XG4gICAgc2F2ZVVzZXIodXNlcil7XG4gICAgICAgdmFyIHNydiA9IHRoaXM7IFxuICAgICAgICByZXR1cm4gbmV3IFByb21pc2UgKGZ1bmN0aW9uKHJlc29sdmUscmVqZWN0KXtcbiAgICAgICAgICAgIHNydi5jaGVja1VzZXJuYW1lKHVzZXIudXNlcm5hbWUpLnRoZW4odmFsaWQ9PntcbiAgICAgICAgICAgICAgICBjb25zb2xlLmxvZyh2YWxpZClcbiAgICAgICAgICAgICAgICBpZiAodmFsaWQudGFrZW4gPT0gZmFsc2Upe1xuICAgICAgICAgICAgICAgICAgICAvL2NyZWF0ZSB0aGUgaGFzaCBcbiAgICAgICAgICAgICAgICAgICAgY2xpZW50LmluY3IoVVNFUklEQ09VTlRFUiwoZXJyLGlkKT0+e1xuICAgICAgICAgICAgICAgICAgICAgICAgdXNlci5pZCA9IGlkOyBcbiAgICAgICAgICAgICAgICAgICAgICAgIHVzZXIucGFzc3dvcmQgPSBiY3J5cHQuaGFzaFN5bmModXNlci5wYXNzd29yZCwxMCk7IFxuICAgICAgICAgICAgICAgICAgICAgICAgbHJlZGlzLmhtc2V0KFBSRUZJWCt1c2VyLnVzZXJuYW1lLHVzZXIpXG4gICAgICAgICAgICAgICAgICAgICAgICBhZGRVc2VyVG9JbmRleCh1c2VyLHNydi5yZWRpc0luZGV4U2VhcmNoKTsgXG4gICAgICAgICAgICAgICAgICAgICAgICByZXNvbHZlKHtzYXZlZDp0cnVlLFwibWVzc2FnZVwiOlwic2F2ZWQgc3VjY2Vzc2Z1bGx5LlwifSlcbiAgICAgICAgICAgICAgICAgICAgfSlcbiAgICAgICAgICAgICAgICAgICAgXG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIGVsc2Uge1xuICAgICAgICAgICAgICAgICAgICAvL3VwZGF0ZSB0aGUgdXNlciBcbiAgICAgICAgICAgICAgICAgICAgLy9wcmVwYXJlIHRoZSByb2xlcyB3ZSBhcmUgZ29pbmcgdG8gZ2V0IGFuIGFycmEgXG4gICAgICAgICAgICAgICAgICAgXG4gICAgICAgICAgICAgICAgICAgIFxuICAgICAgICAgICAgICAgICAgICBpZiAoIXVzZXIucGFzc3dvcmQgfHwgdXNlci5wYXNzd29yZCA9PSBcIlwiKXtcbiAgICAgICAgICAgICAgICAgICAgICAgIGRlbGV0ZSB1c2VyLnBhc3N3b3JkOyBcbiAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICBjb25zb2xlLmxvZygndXBkYXRpbmcgdXNlcicsdXNlcilcbiAgICAgICAgICAgICAgICAgICAgdXNlci5wYXNzd29yZCA9IGJjcnlwdC5oYXNoU3luYyh1c2VyLnBhc3N3b3JkLDEwKTsgXG4gICAgICAgICAgICAgICAgICAgIGNsaWVudC5obXNldChQUkVGSVgrdXNlci51c2VybmFtZSx1c2VyKVxuICAgICAgICAgICAgICAgICAgICBzcnYucmVkaXNJbmRleFNlYXJjaC51cGRhdGUodXNlci5pZCx1c2VyLChlcnIscmVwbHkpPT57XG4gICAgICAgICAgICAgICAgICAgICAgICBpZihlcnIpXG4gICAgICAgICAgICAgICAgICAgICAgICAge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICBjb25zb2xlLmxvZyhlcnIpXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgcmVzb2x2ZSh7c2F2ZWQ6ZmFsc2UsXCJtZXNzYWdlXCI6XCJVc2VybmFtZSBlcnJcIn0pXG4gICAgICAgICAgICAgICAgICAgICAgICAgfSAgIFxuICAgICAgICAgICAgICAgICAgICAgICAgZWxzZSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICBcbiAgICAgICAgICAgICAgICAgICAgICAgICAgIFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB1c2VyLnBhc3N3b3JkID0gYmNyeXB0Lmhhc2hTeW5jKHVzZXIucGFzc3dvcmQsMTApOyBcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICByZXNvbHZlKHtzYXZlZDp0cnVlLFwibWVzc2FnZVwiOlwiVXNlciB1cGRhdGVkLlwifSlcbiAgICAgICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgICAgIFxuICAgICAgICAgICAgICAgICAgICB9KVxuICAgICAgICAgICAgICAgICAgICBcbiAgICAgICAgICAgICAgICAgICAgXG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfSlcbiAgICAgICAgICAgIFxuICAgICAgICB9KTtcbiAgICB9XG4gICAgdmVyaWZ5VG9rZW4gKHRva2VuKXtcbiAgICAgICAgcmV0dXJuIG5ldyBQcm9taXNlKGZ1bmN0aW9uKHJlc2xvdmUscmVqZWN0KXtcbiAgICAgICAgICAgIHRyeSB7XG4gICAgICAgICAgICAgICAgdmFyIGRlY29kZWRKV1QgPSBqd3QudmVyaWZ5KHRva2VuLCdzaWx2ZXIxMjMuJyk7XG4gICAgICAgICAgICAgICAgdmFyIGJ5dGVzID0gY3J5cHRvanMuQUVTLmRlY3J5cHQoZGVjb2RlZEpXVC50b2tlbiwnU2lsdmVyMTIzJyk7XG4gICAgICAgICAgICAgICAgdmFyIHRva2VuRGF0YSA9IEpTT04ucGFyc2UoYnl0ZXMudG9TdHJpbmcoY3J5cHRvanMuZW5jLlV0ZjgpKTtcbiAgICAgICAgICAgICAgICAvKiAgY29uc29sZS5sb2coJ3Rva2VuIGRhdGEgYmVsb3cnKTtcbiAgICAgICAgICAgICAgICAgY29uc29sZS5sb2codG9rZW5EYXRhKTsqL1xuICAgICAgICAgICAgICAgIHJlc2xvdmUodG9rZW5EYXRhKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIGNhdGNoKGUpe1xuICAgICAgICAgICAgICAgIGNvbnNvbGUubG9nKGUsXCJ1bmFibGUgdG8gdmVyaWZ5IHRva2VuXCIpXG4gICAgICAgICAgICAgICAgcmVqZWN0KCk7XG4gICAgICAgICAgICB9XG5cbiAgICAgICAgfSk7XG4gICAgfVxuICAgIGNoZWNrVXNlcm5hbWUodXNlcm5hbWUpe1xuICAgICAgICByZXR1cm4gbmV3IFByb21pc2UoKHJlc29sdmUscmVqZWN0KT0+e1xuICAgICAgICAgICAgLy93ZSBjYW4gY2hlY2sgaW4gMiB3YXlzIG9uZSBzZWUgaWYgdGhlIGhhc2ggZXhpc3RzIFxuICAgICAgICAgICAgY2xpZW50LmV4aXN0cyhQUkVGSVgrdXNlcm5hbWUsKGVycixyZXN1bHRzKT0+e1xuICAgICAgICAgICAgICAgIGNvbnNvbGUubG9nKHJlc3VsdHMpXG4gICAgICAgICAgICAgICAgaWYgKE51bWJlcihyZXN1bHRzKSA9PSAxKXtcbiAgICAgICAgICAgICAgICAgICAgcmVzb2x2ZSh7dGFrZW46dHJ1ZX0pXG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIGVsc2VcbiAgICAgICAgICAgICAgICAgICAgcmVzb2x2ZSh7dGFrZW46ZmFsc2V9KVxuICAgICAgICAgICAgfSlcbiAgICAgICAgfSlcbiAgICB9XG4gICAgZ2VuZXJhdGVUb2tlbiAodXNlcil7XG4gICAgICAgIHJldHVybiBuZXcgUHJvbWlzZShmdW5jdGlvbihyZXNvbHZlLHJlamVjdCl7XG5cbiAgICAgICAgICAgIHZhciBzdHJpbmdEYXRhID0gSlNPTi5zdHJpbmdpZnkodXNlcik7XG4gICAgICAgICAgICB2YXIgZW5jcnlwdGVkRGF0YSA9IGNyeXB0b2pzLkFFUy5lbmNyeXB0KHN0cmluZ0RhdGEsJ1NpbHZlcjEyMycpLnRvU3RyaW5nKCk7XG5cbiAgICAgICAgICAgIHZhciB0b2tlbiA9IGp3dC5zaWduKHtcbiAgICAgICAgICAgICAgICB0b2tlbjplbmNyeXB0ZWREYXRhXG4gICAgICAgICAgICB9LCAnc2lsdmVyMTIzLicpO1xuICAgICAgICAgICAgcmVzb2x2ZSggdG9rZW4pO1xuICAgICAgICB9KTtcblxuICAgIH1cbn1cbmZ1bmN0aW9uIENvbnZlcnRSb2xlc1RvU3RyaW5nKHJvbGVzQXJyYXkpe1xuICAgIHZhciBhbGxQZXJtaXNzaW9ucyA9IFwiXCI7IFxuICAgIHJvbGVzQXJyYXkuZm9yRWFjaChyb2xlID0+IHtcbiAgICAgICAgYWxsUGVybWlzc2lvbnMgKz0gcm9sZSArXCIsXCJcbiAgICB9KTtcbiAgICBhbGxQZXJtaXNzaW9ucyA9IGFsbFBlcm1pc3Npb25zLnN1YnN0cmluZygwLGFsbFBlcm1pc3Npb25zLmxlbmd0aC0xKTsgXG4gICAgY29uc29sZS5sb2coYWxsUGVybWlzc2lvbnMpXG59XG5mdW5jdGlvbiBjcmVhdGVEb2N1bWVudChhY2NvdW50KXtcbiAgICB2YXIgY3VzdG9tZXJEb2N1bWVudCA9IHsgXG4gICAgICAgIGlkIDogYWNjb3VudC5pZCxcbiAgICAgICAgdXNlcm5hbWU6YWNjb3VudC51c2VybmFtZSxcbiAgICAgICAgZW1haWw6IGFjY291bnQuZW1haWwsIFxuICAgICAgICBmaXJzdE5hbWUgOiBhY2NvdW50LmZpcnN0TmFtZSwgXG4gICAgICAgIGxhc3ROYW1lOiBhY2NvdW50Lmxhc3ROYW1lLFxuICAgICAgICBwYXNzd29yZDphY2NvdW50LnBhc3N3b3JkLFxuICAgICAgICBtb2JpbGU6IGFjY291bnQubW9iaWxlLFxuICAgICAgICByb2xlOiBhY2NvdW50LnJvbGVcbiAgICB9XG4gICAgY29uc29sZS5sb2coY3VzdG9tZXJEb2N1bWVudClcbiAgICByZXR1cm4gY3VzdG9tZXJEb2N1bWVudDsgXG4gfVxuIGZ1bmN0aW9uIGFkZFVzZXJUb0luZGV4KGFjY291bnQsIHNlYXJjaE9iail7XG4gICAgIHZhciB1c2VyRG9jdW1lbnQgPSBjcmVhdGVEb2N1bWVudChhY2NvdW50KTsgXG4gICAgIHNlYXJjaE9iai5hZGQoYWNjb3VudC5pZCx1c2VyRG9jdW1lbnQpOyBcbiB9Il19
