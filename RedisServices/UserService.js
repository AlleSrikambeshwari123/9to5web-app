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
                        } else {
                            console.log('updating user', user);
                            user.password = bcrypt.hashSync(user.password, 10);
                        }

                        client.hmset(PREFIX + user.username, user);
                        srv.redisIndexSearch.update(user.id, user, function (err, reply) {
                            if (err) {
                                console.log(err);
                                resolve({ saved: false, "message": "Username err" });
                            } else {

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

//conver


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
//# sourceMappingURL=data:application/json;charset=utf8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIlJlZGlzU2VydmljZXMvVXNlclNlcnZpY2UuZXM2Il0sIm5hbWVzIjpbImNyeXB0b2pzIiwicmVxdWlyZSIsImp3dCIsInJlZGlzIiwibHJlZGlzIiwibW9tZW50IiwicmVkaXNTZWFyY2giLCJTRVJWSUNFX0tFWSIsImJjcnlwdCIsIlBSRUZJWCIsIklOREVYIiwiVVNFUklEQ09VTlRFUiIsIkVOViIsImNsaWVudCIsImNyZWF0ZUNsaWVudCIsInJlZGlzX3BvcnQiLCJyZWRpc19ob3N0IiwiYXV0aF9wYXNzIiwicmVkaXNfcGFzcyIsIlVzZXJTZXJ2aWNlIiwicmVkaXNJbmRleFNlYXJjaCIsImNsaWVudE9wdGlvbnMiLCJzZWFyY2hDbGllbnREZXRhaWxzIiwidXNlcm5hbWUiLCJwYXNzd29yZCIsInNydiIsImNvbnNvbGUiLCJsb2ciLCJQcm9taXNlIiwicmVzb2x2ZSIsInJlamVjdCIsImhnZXRhbGwiLCJlcnIiLCJyZXN1bHQiLCJjb21wYXJlIiwicHdkUmVzdWx0IiwiZ2VuZXJhdGVUb2tlbiIsInRoZW4iLCJ1c2VyIiwidG9rZW4iLCJ2YWxpZCIsImZpcnN0TmFtZSIsImxhc3ROYW1lIiwiZW1haWwiLCJtb2JpbGUiLCJyb2xlSWQiLCJwYWdlU2l6ZSIsImN1cnJlbnRQYWdlIiwib2Zmc2V0Iiwic2VhcmNoIiwibnVtYmVyT2ZSZXN1bHRzIiwic29ydEJ5IiwiZGlyIiwicmVzdWx0cyIsInVzZXJzIiwiZm9yRWFjaCIsImVsZW1lbnQiLCJkb2MiLCJwdXNoIiwiaWR4IiwiZGVsZXRlIiwiaWQiLCJyZW1vdmVkIiwiZW5hYmxlZCIsImhtc2V0IiwidXBkYXRlZCIsImNoZWNrVXNlcm5hbWUiLCJ0YWtlbiIsImluY3IiLCJoYXNoU3luYyIsImFkZFVzZXJUb0luZGV4Iiwic2F2ZWQiLCJ1cGRhdGUiLCJyZXBseSIsInJlc2xvdmUiLCJkZWNvZGVkSldUIiwidmVyaWZ5IiwiYnl0ZXMiLCJBRVMiLCJkZWNyeXB0IiwidG9rZW5EYXRhIiwiSlNPTiIsInBhcnNlIiwidG9TdHJpbmciLCJlbmMiLCJVdGY4IiwiZSIsImV4aXN0cyIsIk51bWJlciIsInN0cmluZ0RhdGEiLCJzdHJpbmdpZnkiLCJlbmNyeXB0ZWREYXRhIiwiZW5jcnlwdCIsInNpZ24iLCJDb252ZXJ0Um9sZXNUb1N0cmluZyIsInJvbGVzQXJyYXkiLCJhbGxQZXJtaXNzaW9ucyIsInJvbGUiLCJzdWJzdHJpbmciLCJsZW5ndGgiLCJjcmVhdGVEb2N1bWVudCIsImFjY291bnQiLCJjdXN0b21lckRvY3VtZW50Iiwic2VhcmNoT2JqIiwidXNlckRvY3VtZW50IiwiYWRkIl0sIm1hcHBpbmdzIjoiOzs7Ozs7Ozs7O0FBQUEsSUFBSUEsV0FBWUMsUUFBUSxXQUFSLENBQWhCO0FBQ0EsSUFBSUMsTUFBTUQsUUFBUSxjQUFSLENBQVY7QUFDQSxJQUFJRSxRQUFRRixRQUFRLE9BQVIsQ0FBWjtBQUNBLElBQUlHLFNBQVNILFFBQVEsZUFBUixDQUFiO0FBQ0EsSUFBSUksU0FBU0osUUFBUSxRQUFSLENBQWI7QUFDQSxJQUFJSyxjQUFjTCxRQUFRLHFCQUFSLENBQWxCO0FBQ0EsSUFBTU0sY0FBYyxPQUFwQjtBQUNBLElBQUlDLFNBQVNQLFFBQVEsUUFBUixDQUFiO0FBQ0EsSUFBTVEsU0FBVSxPQUFoQjtBQUNBLElBQU1DLFFBQVEsYUFBZDtBQUNBLElBQU1DLGdCQUFnQixTQUF0QjtBQUNBLElBQU1DLE1BQU1YLFFBQVEsZ0JBQVIsQ0FBWjtBQUNBLElBQUlZLFNBQVNWLE1BQU1XLFlBQU4sQ0FBbUJGLElBQUlHLFVBQXZCLEVBQW1DSCxJQUFJSSxVQUF2QyxFQUFtRDtBQUM1REMsZUFBV0wsSUFBSU07QUFDZjtBQUNBO0FBQ0E7QUFKNEQsQ0FBbkQsQ0FBYjs7SUFNYUMsVyxXQUFBQSxXO0FBQ1QsMkJBQWE7QUFBQTs7QUFDVCxhQUFLQyxnQkFBTCxHQUF3QmQsWUFBWUgsS0FBWixFQUFtQixhQUFuQixFQUFrQztBQUN0RGtCLDJCQUFjakIsT0FBT2tCO0FBRGlDLFNBQWxDLENBQXhCO0FBR0g7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QWVHLE1BQWYsR0FBc0IsQ0FBakQsQ0FBakI7QUFDQXpFLFlBQVFDLEdBQVIsQ0FBWXFFLGNBQVo7QUFDSDtBQUNELFNBQVNJLGNBQVQsQ0FBd0JDLE9BQXhCLEVBQWdDO0FBQzVCLFFBQUlDLG1CQUFtQjtBQUNuQnpDLFlBQUt3QyxRQUFReEMsRUFETTtBQUVuQnRDLGtCQUFTOEUsUUFBUTlFLFFBRkU7QUFHbkJvQixlQUFPMEQsUUFBUTFELEtBSEk7QUFJbkJGLG1CQUFZNEQsUUFBUTVELFNBSkQ7QUFLbkJDLGtCQUFVMkQsUUFBUTNELFFBTEM7QUFNbkJsQixrQkFBUzZFLFFBQVE3RSxRQU5FO0FBT25Cb0IsZ0JBQVF5RCxRQUFRekQsTUFQRztBQVFuQnFELGNBQU1JLFFBQVFKO0FBUkssS0FBdkI7QUFVQXZFLFlBQVFDLEdBQVIsQ0FBWTJFLGdCQUFaO0FBQ0EsV0FBT0EsZ0JBQVA7QUFDRjtBQUNELFNBQVNoQyxjQUFULENBQXdCK0IsT0FBeEIsRUFBaUNFLFNBQWpDLEVBQTJDO0FBQ3ZDLFFBQUlDLGVBQWVKLGVBQWVDLE9BQWYsQ0FBbkI7QUFDQUUsY0FBVUUsR0FBVixDQUFjSixRQUFReEMsRUFBdEIsRUFBeUIyQyxZQUF6QjtBQUNIIiwiZmlsZSI6IlJlZGlzU2VydmljZXMvVXNlclNlcnZpY2UuanMiLCJzb3VyY2VzQ29udGVudCI6WyJ2YXIgY3J5cHRvanMgID0gcmVxdWlyZSgnY3J5cHRvLWpzJyk7XG52YXIgand0ID0gcmVxdWlyZSgnanNvbndlYnRva2VuJyk7XG52YXIgcmVkaXMgPSByZXF1aXJlKCdyZWRpcycpO1xudmFyIGxyZWRpcyA9IHJlcXVpcmUoJy4vcmVkaXMtbG9jYWwnKTtcbnZhciBtb21lbnQgPSByZXF1aXJlKCdtb21lbnQnKTtcbnZhciByZWRpc1NlYXJjaCA9IHJlcXVpcmUoJy4uL3JlZGlzZWFyY2hjbGllbnQnKTtcbmNvbnN0IFNFUlZJQ0VfS0VZID0gJ3VzZXJzJztcbnZhciBiY3J5cHQgPSByZXF1aXJlKCdiY3J5cHQnKTsgXG5jb25zdCBQUkVGSVggID0gXCJ1c2VyOlwiXG5jb25zdCBJTkRFWCA9IFwiaW5kZXg6dXNlcnNcIlxuY29uc3QgVVNFUklEQ09VTlRFUiA9IFwidXNlcjppZFwiOyBcbmNvbnN0IEVOViA9IHJlcXVpcmUoJy4uL2Vudmlyb25tZW50JylcbnZhciBjbGllbnQgPSByZWRpcy5jcmVhdGVDbGllbnQoRU5WLnJlZGlzX3BvcnQsIEVOVi5yZWRpc19ob3N0LCB7XG4gICAgYXV0aF9wYXNzOiBFTlYucmVkaXNfcGFzcyxcbiAgICAvLyB0bHM6e1xuICAgIC8vICAgICBzZXJ2ZXJuYW1lOiAnY29yZS5zaGlwdHJvcGljYWwuY29tJ1xuICAgIC8vIH0gXG59KTtcbmV4cG9ydCBjbGFzcyBVc2VyU2VydmljZSB7XG4gICAgY29uc3RydWN0b3IoKXtcbiAgICAgICAgdGhpcy5yZWRpc0luZGV4U2VhcmNoID0gcmVkaXNTZWFyY2gocmVkaXMsICdpbmRleDp1c2VycycsIHtcbiAgICAgICAgICAgIGNsaWVudE9wdGlvbnM6bHJlZGlzLnNlYXJjaENsaWVudERldGFpbHNcbiAgICAgICAgfSk7XG4gICAgfVxuICAgIGF1dGhlbnRpY2F0ZSAodXNlcm5hbWUscGFzc3dvcmQpe1xuICAgICAgICB2YXIgc3J2ID0gdGhpczsgXG4gICAgICAgIGNvbnNvbGUubG9nKCdhYm91dCB0byBhdXRoJylcbiAgICAgICAgcmV0dXJuIG5ldyBQcm9taXNlKGZ1bmN0aW9uKHJlc29sdmUscmVqZWN0KXtcbiAgICAgICAgICAgXG4gICAgICAgICAgICBjbGllbnQuaGdldGFsbChQUkVGSVgrdXNlcm5hbWUsKGVycixyZXN1bHQpPT57XG5cbiAgICAgICAgICAgICAgICBjb25zb2xlLmxvZyhyZXN1bHQsIFwiaXMgdGhlIHJlc3VsdHNcIik7IFxuICAgICAgICAgICAgICAgIGlmIChyZXN1bHQpe1xuICAgICAgICAgICAgICAgICAgICBjb25zb2xlLmxvZyhyZXN1bHQpO1xuICAgICAgICAgICAgICAgICAgICBiY3J5cHQuY29tcGFyZShwYXNzd29yZCxyZXN1bHQucGFzc3dvcmQsKGVycixwd2RSZXN1bHQpPT57XG4gICAgICAgICAgICAgICAgICAgICAgICBpZiAoZXJyKXtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBjb25zb2xlLmxvZyhlcnIpOyBcblxuICAgICAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICAgICAgaWYocHdkUmVzdWx0ID09IHRydWUpe1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGRlbGV0ZSByZXN1bHQucGFzc3dvcmQ7IFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHNydi5nZW5lcmF0ZVRva2VuKHJlc3VsdCkudGhlbih0b2tlbj0+e1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICByZXNvbHZlKHt1c2VyOnJlc3VsdCx0b2tlbjp0b2tlbix2YWxpZDp0cnVlfSlcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICB9KTtcbiAgICAgICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgICAgIGVsc2UgeyBcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBjb25zb2xlLmxvZyhcImF1dGggZmFpbGVkXCIpXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgcmVzb2x2ZSh7dXNlcjpudWxsLHRva2VuOlwiXCIsdmFsaWQ6ZmFsc2V9KVxuICAgICAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICAgICBcbiAgICAgICAgICAgICAgICAgICAgICAgXG4gICAgICAgICAgICAgICAgICAgIH0pXG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIGVsc2V7XG4gICAgICAgICAgICAgICAgICAgIHJlc29sdmUoe3VzZXI6bnVsbCx0b2tlbjpcIlwiLHZhbGlkOmZhbHNlfSlcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9KTsgXG4gICAgICAgICAgICBcbiAgICAgICAgICAgIFxuICAgICAgICB9KTtcbiAgICB9XG4gICAgZ2V0VXNlcih1c2VybmFtZSl7XG4gICAgICAgIHJldHVybiBuZXcgUHJvbWlzZSAoZnVuY3Rpb24ocmVzb2x2ZSxyZWplY3Qpe1xuICAgICAgICAgICAgY2xpZW50LmhnZXRhbGwoUFJFRklYK3VzZXJuYW1lLChlcnIscmVzdWx0KT0+e1xuICAgICAgICAgICAgICAgIGlmIChyZXN1bHQpe1xuICAgICAgICAgICAgICAgICAgICBkZWxldGUgcmVzdWx0LnBhc3N3b3JkOyBcbiAgICAgICAgICAgICAgICAgICAgcmVzb2x2ZSh7dXNlcjpyZXN1bHR9KVxuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICBlbHNlIHJlc29sdmUoe3VzZXI6e3VzZXJuYW1lOicnLGZpcnN0TmFtZTonJyxsYXN0TmFtZTonJyxlbWFpbDonJyxtb2JpbGU6Jyd9fSlcbiAgICAgICAgICAgIH0pXG4gICAgICAgICBcbiAgICAgICAgfSk7XG4gICAgfVxuICAgIGdldFVzZXJzSW5Sb2xlKHJvbGVJZCl7XG4gICAgICAgIHJldHVybiBuZXcgUHJvbWlzZSAoZnVuY3Rpb24ocmVzb2x2ZSxyZWplY3Qpe1xuXG4gICAgICAgICAgICAvLyBkYXRhQ29udGV4dC5nZXRTZXJ2aWNlUHJveHkoU0VSVklDRV9LRVkpLmdldFVzZXJzQnlSb2xlKHtyb2xlSWQ6cm9sZUlkfSxmdW5jdGlvbihlcnJvcixyZXN1bHQpe1xuICAgICAgICAgICAgLy8gICAgIGlmIChlcnJvcil7XG4gICAgICAgICAgICAvLyAgICAgICAgIHJlamVjdChlcnJvcik7XG4gICAgICAgICAgICAvLyAgICAgfVxuICAgICAgICAgICAgLy8gICAgIHJlc29sdmUoIHJlc3VsdCk7XG4gICAgICAgICAgICAvLyB9KTtcbiAgICAgICAgfSk7XG4gICAgfVxuICAgIGdldFJvbGVzKCl7XG4gICAgICAgIHJldHVybiBuZXcgUHJvbWlzZSAoZnVuY3Rpb24ocmVzb2x2ZSxyZWplY3Qpe1xuXG4gICAgICAgICAgICByZXNvbHZlKFtcIkFkbWluXCIsXCJXYXJlaG91c2UgRkxMXCIsXCJDdXN0b21zIEFnZW50XCIsXCJXYXJlaG91c2UgQkFIQU1BU1wiLFwiQ2FzaGllclwiLFwiTG9jYXRpb24gTWFuYWdlclwiXSlcbiAgICAgICAgICAgIFxuICAgICAgICB9KTtcbiAgICB9XG4gICAgZ2V0QWxsVXNlcnMocGFnZVNpemUsY3VycmVudFBhZ2Upe1xuICAgICAgICB2YXIgc3J2ID0gdGhpczsgXG4gICAgICAgIGNvbnNvbGUubG9nKCdnZXR0aW5nIGFsbCB1c2VycycpXG4gICAgICAgIHJldHVybiBuZXcgUHJvbWlzZSAoZnVuY3Rpb24ocmVzb2x2ZSxyZWplY3Qpe1xuICAgICAgICAgICAgdmFyIG9mZnNldFxuICAgICAgICAgICBzcnYucmVkaXNJbmRleFNlYXJjaC5zZWFyY2goJyonLHtcbiAgICAgICAgICAgIG9mZnNldDowLFxuICAgICAgICAgICAgbnVtYmVyT2ZSZXN1bHRzOiAxMDAwLFxuICAgICAgICAgICAgc29ydEJ5OiBcImxhc3ROYW1lXCIsXG4gICAgICAgICAgICBkaXI6IFwiQVNDXCJcbiAgICAgICAgfSwoZXJyLHJlc3VsdHMpPT57XG4gICAgICAgICAgICB2YXIgdXNlcnMgPSBbXTtcbiAgICAgICAgICAgICAgICByZXN1bHRzLnJlc3VsdHMuZm9yRWFjaChlbGVtZW50ID0+IHtcbiAgICAgICAgICAgICAgICAgICAgZGVsZXRlIGVsZW1lbnQuZG9jLnBhc3N3b3JkXG4gICAgICAgICAgICAgICAgICAgIHVzZXJzLnB1c2goZWxlbWVudC5kb2MpOyBcbiAgICAgICAgICAgICAgICB9KTtcbiAgICAgICAgICAgICAgICByZXNvbHZlKHVzZXJzKVxuICAgICAgICB9KVxuICAgICAgICB9KTtcbiAgICB9XG4gICAgcmVtb3ZlVXNlcih1c2VybmFtZSl7XG4gICAgICAgIHJldHVybiBuZXcgUHJvbWlzZSAoZnVuY3Rpb24ocmVzb2x2ZSxyZWplY3Qpe1xuICAgICAgICAgICAgdmFyIGlkeD0gdGhpcy5yZWRpc0luZGV4U2VhcmNoOyBcbiAgICAgICAgbHJlZGlzLmhnZXRhbGwoUFJFRklYK3VzZXJuYW1lKS50aGVuKHVzZXI9PntcbiAgICAgICAgICAgIGlkeC5kZWxldGUodXNlci5pZCk7IFxuICAgICAgICAgICAgY2xpZW50LmRlbGV0ZShQUkVGSVgrdXNlcm5hbWUsKGVycixyZXN1bHQpPT57XG4gICAgICAgICAgICAgICAgaWYgKGVycil7XG4gICAgICAgICAgICAgICAgICAgIGNvbnNvbGUubG9nKFwidW5hYmxlIHRvIGRlbGV0ZVwiKTsgXG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIHJlc29sdmUoe3JlbW92ZWQ6dHJ1ZX0pXG4gICAgICAgICAgICB9KVxuICAgICAgICB9KVxuICAgICAgICAgIC8vZmluZCB0aGUgdXNlciBieSB1c2VybmFtZSBcbiAgICAgICAgICAvL2dldCB0aGUgZG9jIElkIFxuICAgICAgICAgIC8vZGVsZXRlIGZyb20gaW5kZXggXG4gICAgICAgICAgLy9kZWxldGUgaGFzaCBcbiAgICAgICAgfSk7XG4gICAgfVxuICAgIGVuYWJsZVVzZXIodXNlcm5hbWUsZW5hYmxlZCl7XG4gICAgICAgIHJldHVybiBuZXcgUHJvbWlzZSAoZnVuY3Rpb24ocmVzb2x2ZSxyZWplY3Qpe1xuICAgICAgICAgICAgY2xpZW50Lmhtc2V0KFBSRUZJWCt1c2VybmFtZSx7ZW5hYmxlZDplbmFibGVkfSwoZXJyLHJlc3VsdCk9PntcbiAgICAgICAgICAgICAgICBpZiAoZXJyKXtcbiAgICAgICAgICAgICAgICAgICAgcmVzb2x2ZSh7dXBkYXRlZDpmYWxzZX0pXG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIGVsc2Uge1xuICAgICAgICAgICAgICAgICAgICByZXNvbHZlKHt1cGRhdGVkOnRydWV9KVxuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH0pOyBcbiAgICAgICAgICAgIFxuICAgICAgICB9KTtcbiAgICB9XG4gICAgc2F2ZVVzZXIodXNlcil7XG4gICAgICAgdmFyIHNydiA9IHRoaXM7IFxuICAgICAgICByZXR1cm4gbmV3IFByb21pc2UgKGZ1bmN0aW9uKHJlc29sdmUscmVqZWN0KXtcbiAgICAgICAgICAgIHNydi5jaGVja1VzZXJuYW1lKHVzZXIudXNlcm5hbWUpLnRoZW4odmFsaWQ9PntcbiAgICAgICAgICAgICAgICBjb25zb2xlLmxvZyh2YWxpZClcbiAgICAgICAgICAgICAgICBpZiAodmFsaWQudGFrZW4gPT0gZmFsc2Upe1xuICAgICAgICAgICAgICAgICAgICAvL2NyZWF0ZSB0aGUgaGFzaCBcbiAgICAgICAgICAgICAgICAgICAgY2xpZW50LmluY3IoVVNFUklEQ09VTlRFUiwoZXJyLGlkKT0+e1xuICAgICAgICAgICAgICAgICAgICAgICAgdXNlci5pZCA9IGlkOyBcbiAgICAgICAgICAgICAgICAgICAgICAgIHVzZXIucGFzc3dvcmQgPSBiY3J5cHQuaGFzaFN5bmModXNlci5wYXNzd29yZCwxMCk7IFxuICAgICAgICAgICAgICAgICAgICAgICAgbHJlZGlzLmhtc2V0KFBSRUZJWCt1c2VyLnVzZXJuYW1lLHVzZXIpXG4gICAgICAgICAgICAgICAgICAgICAgICBhZGRVc2VyVG9JbmRleCh1c2VyLHNydi5yZWRpc0luZGV4U2VhcmNoKTsgXG4gICAgICAgICAgICAgICAgICAgICAgICByZXNvbHZlKHtzYXZlZDp0cnVlLFwibWVzc2FnZVwiOlwic2F2ZWQgc3VjY2Vzc2Z1bGx5LlwifSlcbiAgICAgICAgICAgICAgICAgICAgfSlcbiAgICAgICAgICAgICAgICAgICAgXG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIGVsc2Uge1xuICAgICAgICAgICAgICAgICAgICAvL3VwZGF0ZSB0aGUgdXNlciBcbiAgICAgICAgICAgICAgICAgICAgLy9wcmVwYXJlIHRoZSByb2xlcyB3ZSBhcmUgZ29pbmcgdG8gZ2V0IGFuIGFycmEgXG4gICAgICAgICAgICAgICAgICAgXG4gICAgICAgICAgICAgICAgICAgIFxuICAgICAgICAgICAgICAgICAgICBpZiAoIXVzZXIucGFzc3dvcmQgfHwgdXNlci5wYXNzd29yZCA9PSBcIlwiKXtcbiAgICAgICAgICAgICAgICAgICAgICAgIGRlbGV0ZSB1c2VyLnBhc3N3b3JkOyBcbiAgICAgICAgICAgICAgICAgICAgfWVsc2Uge1xuICAgICAgICAgICAgICAgICAgICAgICAgY29uc29sZS5sb2coJ3VwZGF0aW5nIHVzZXInLHVzZXIpXG4gICAgICAgICAgICAgICAgICAgICAgICB1c2VyLnBhc3N3b3JkID0gYmNyeXB0Lmhhc2hTeW5jKHVzZXIucGFzc3dvcmQsMTApOyBcbiAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgIFxuXG5cbiAgICAgICAgICAgICAgICAgICAgY2xpZW50Lmhtc2V0KFBSRUZJWCt1c2VyLnVzZXJuYW1lLHVzZXIpXG4gICAgICAgICAgICAgICAgICAgIHNydi5yZWRpc0luZGV4U2VhcmNoLnVwZGF0ZSh1c2VyLmlkLHVzZXIsKGVycixyZXBseSk9PntcbiAgICAgICAgICAgICAgICAgICAgICAgIGlmKGVycilcbiAgICAgICAgICAgICAgICAgICAgICAgICB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgIGNvbnNvbGUubG9nKGVycilcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICByZXNvbHZlKHtzYXZlZDpmYWxzZSxcIm1lc3NhZ2VcIjpcIlVzZXJuYW1lIGVyclwifSlcbiAgICAgICAgICAgICAgICAgICAgICAgICB9ICAgXG4gICAgICAgICAgICAgICAgICAgICAgICBlbHNlIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgIFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgcmVzb2x2ZSh7c2F2ZWQ6dHJ1ZSxcIm1lc3NhZ2VcIjpcIlVzZXIgdXBkYXRlZC5cIn0pXG4gICAgICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgICAgICBcbiAgICAgICAgICAgICAgICAgICAgfSlcbiAgICAgICAgICAgICAgICAgICAgXG4gICAgICAgICAgICAgICAgICAgIFxuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH0pXG4gICAgICAgICAgICBcbiAgICAgICAgfSk7XG4gICAgfVxuICAgIHZlcmlmeVRva2VuICh0b2tlbil7XG4gICAgICAgIHJldHVybiBuZXcgUHJvbWlzZShmdW5jdGlvbihyZXNsb3ZlLHJlamVjdCl7XG4gICAgICAgICAgICB0cnkge1xuICAgICAgICAgICAgICAgIHZhciBkZWNvZGVkSldUID0gand0LnZlcmlmeSh0b2tlbiwnc2lsdmVyMTIzLicpO1xuICAgICAgICAgICAgICAgIHZhciBieXRlcyA9IGNyeXB0b2pzLkFFUy5kZWNyeXB0KGRlY29kZWRKV1QudG9rZW4sJ1NpbHZlcjEyMycpO1xuICAgICAgICAgICAgICAgIHZhciB0b2tlbkRhdGEgPSBKU09OLnBhcnNlKGJ5dGVzLnRvU3RyaW5nKGNyeXB0b2pzLmVuYy5VdGY4KSk7XG4gICAgICAgICAgICAgICAgLyogIGNvbnNvbGUubG9nKCd0b2tlbiBkYXRhIGJlbG93Jyk7XG4gICAgICAgICAgICAgICAgIGNvbnNvbGUubG9nKHRva2VuRGF0YSk7Ki9cbiAgICAgICAgICAgICAgICByZXNsb3ZlKHRva2VuRGF0YSk7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBjYXRjaChlKXtcbiAgICAgICAgICAgICAgICBjb25zb2xlLmxvZyhlLFwidW5hYmxlIHRvIHZlcmlmeSB0b2tlblwiKVxuICAgICAgICAgICAgICAgIHJlamVjdCgpO1xuICAgICAgICAgICAgfVxuXG4gICAgICAgIH0pO1xuICAgIH1cbiAgICBjaGVja1VzZXJuYW1lKHVzZXJuYW1lKXtcbiAgICAgICAgcmV0dXJuIG5ldyBQcm9taXNlKChyZXNvbHZlLHJlamVjdCk9PntcbiAgICAgICAgICAgIC8vd2UgY2FuIGNoZWNrIGluIDIgd2F5cyBvbmUgc2VlIGlmIHRoZSBoYXNoIGV4aXN0cyBcbiAgICAgICAgICAgIGNsaWVudC5leGlzdHMoUFJFRklYK3VzZXJuYW1lLChlcnIscmVzdWx0cyk9PntcbiAgICAgICAgICAgICAgICBjb25zb2xlLmxvZyhyZXN1bHRzKVxuICAgICAgICAgICAgICAgIGlmIChOdW1iZXIocmVzdWx0cykgPT0gMSl7XG4gICAgICAgICAgICAgICAgICAgIHJlc29sdmUoe3Rha2VuOnRydWV9KVxuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICBlbHNlXG4gICAgICAgICAgICAgICAgICAgIHJlc29sdmUoe3Rha2VuOmZhbHNlfSlcbiAgICAgICAgICAgIH0pXG4gICAgICAgIH0pXG4gICAgfVxuICAgIGdlbmVyYXRlVG9rZW4gKHVzZXIpe1xuICAgICAgICByZXR1cm4gbmV3IFByb21pc2UoZnVuY3Rpb24ocmVzb2x2ZSxyZWplY3Qpe1xuXG4gICAgICAgICAgICB2YXIgc3RyaW5nRGF0YSA9IEpTT04uc3RyaW5naWZ5KHVzZXIpO1xuICAgICAgICAgICAgdmFyIGVuY3J5cHRlZERhdGEgPSBjcnlwdG9qcy5BRVMuZW5jcnlwdChzdHJpbmdEYXRhLCdTaWx2ZXIxMjMnKS50b1N0cmluZygpO1xuXG4gICAgICAgICAgICB2YXIgdG9rZW4gPSBqd3Quc2lnbih7XG4gICAgICAgICAgICAgICAgdG9rZW46ZW5jcnlwdGVkRGF0YVxuICAgICAgICAgICAgfSwgJ3NpbHZlcjEyMy4nKTtcbiAgICAgICAgICAgIHJlc29sdmUoIHRva2VuKTtcbiAgICAgICAgfSk7XG5cbiAgICB9XG59XG5cbi8vY29udmVyXG5mdW5jdGlvbiBDb252ZXJ0Um9sZXNUb1N0cmluZyhyb2xlc0FycmF5KXtcbiAgICB2YXIgYWxsUGVybWlzc2lvbnMgPSBcIlwiOyBcbiAgICByb2xlc0FycmF5LmZvckVhY2gocm9sZSA9PiB7XG4gICAgICAgIGFsbFBlcm1pc3Npb25zICs9IHJvbGUgK1wiLFwiXG4gICAgfSk7XG4gICAgYWxsUGVybWlzc2lvbnMgPSBhbGxQZXJtaXNzaW9ucy5zdWJzdHJpbmcoMCxhbGxQZXJtaXNzaW9ucy5sZW5ndGgtMSk7IFxuICAgIGNvbnNvbGUubG9nKGFsbFBlcm1pc3Npb25zKVxufVxuZnVuY3Rpb24gY3JlYXRlRG9jdW1lbnQoYWNjb3VudCl7XG4gICAgdmFyIGN1c3RvbWVyRG9jdW1lbnQgPSB7IFxuICAgICAgICBpZCA6IGFjY291bnQuaWQsXG4gICAgICAgIHVzZXJuYW1lOmFjY291bnQudXNlcm5hbWUsXG4gICAgICAgIGVtYWlsOiBhY2NvdW50LmVtYWlsLCBcbiAgICAgICAgZmlyc3ROYW1lIDogYWNjb3VudC5maXJzdE5hbWUsIFxuICAgICAgICBsYXN0TmFtZTogYWNjb3VudC5sYXN0TmFtZSxcbiAgICAgICAgcGFzc3dvcmQ6YWNjb3VudC5wYXNzd29yZCxcbiAgICAgICAgbW9iaWxlOiBhY2NvdW50Lm1vYmlsZSxcbiAgICAgICAgcm9sZTogYWNjb3VudC5yb2xlXG4gICAgfVxuICAgIGNvbnNvbGUubG9nKGN1c3RvbWVyRG9jdW1lbnQpXG4gICAgcmV0dXJuIGN1c3RvbWVyRG9jdW1lbnQ7IFxuIH1cbiBmdW5jdGlvbiBhZGRVc2VyVG9JbmRleChhY2NvdW50LCBzZWFyY2hPYmope1xuICAgICB2YXIgdXNlckRvY3VtZW50ID0gY3JlYXRlRG9jdW1lbnQoYWNjb3VudCk7IFxuICAgICBzZWFyY2hPYmouYWRkKGFjY291bnQuaWQsdXNlckRvY3VtZW50KTsgXG4gfSJdfQ==
