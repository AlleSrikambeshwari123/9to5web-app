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
//# sourceMappingURL=data:application/json;charset=utf8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIlJlZGlzU2VydmljZXMvVXNlclNlcnZpY2UuZXM2Il0sIm5hbWVzIjpbImNyeXB0b2pzIiwicmVxdWlyZSIsImp3dCIsInJlZGlzIiwibHJlZGlzIiwibW9tZW50IiwicmVkaXNTZWFyY2giLCJTRVJWSUNFX0tFWSIsImJjcnlwdCIsIlBSRUZJWCIsIklOREVYIiwiVVNFUklEQ09VTlRFUiIsIkVOViIsImNsaWVudCIsImNyZWF0ZUNsaWVudCIsInJlZGlzX3BvcnQiLCJyZWRpc19ob3N0IiwiYXV0aF9wYXNzIiwicmVkaXNfcGFzcyIsIlVzZXJTZXJ2aWNlIiwicmVkaXNJbmRleFNlYXJjaCIsImNsaWVudE9wdGlvbnMiLCJzZWFyY2hDbGllbnREZXRhaWxzIiwidXNlcm5hbWUiLCJwYXNzd29yZCIsInNydiIsImNvbnNvbGUiLCJsb2ciLCJQcm9taXNlIiwicmVzb2x2ZSIsInJlamVjdCIsImhnZXRhbGwiLCJlcnIiLCJyZXN1bHQiLCJjb21wYXJlIiwicHdkUmVzdWx0IiwiZ2VuZXJhdGVUb2tlbiIsInRoZW4iLCJ1c2VyIiwidG9rZW4iLCJ2YWxpZCIsImZpcnN0TmFtZSIsImxhc3ROYW1lIiwiZW1haWwiLCJtb2JpbGUiLCJyb2xlSWQiLCJwYWdlU2l6ZSIsImN1cnJlbnRQYWdlIiwib2Zmc2V0Iiwic2VhcmNoIiwibnVtYmVyT2ZSZXN1bHRzIiwic29ydEJ5IiwiZGlyIiwicmVzdWx0cyIsInVzZXJzIiwiZm9yRWFjaCIsImVsZW1lbnQiLCJkb2MiLCJwdXNoIiwiaWR4IiwiZGVsZXRlIiwiaWQiLCJyZW1vdmVkIiwiZW5hYmxlZCIsImhtc2V0IiwidXBkYXRlZCIsImNoZWNrVXNlcm5hbWUiLCJ0YWtlbiIsImluY3IiLCJoYXNoU3luYyIsImFkZFVzZXJUb0luZGV4Iiwic2F2ZWQiLCJ1cGRhdGUiLCJyZXBseSIsInJlc2xvdmUiLCJkZWNvZGVkSldUIiwidmVyaWZ5IiwiYnl0ZXMiLCJBRVMiLCJkZWNyeXB0IiwidG9rZW5EYXRhIiwiSlNPTiIsInBhcnNlIiwidG9TdHJpbmciLCJlbmMiLCJVdGY4IiwiZSIsImV4aXN0cyIsIk51bWJlciIsInN0cmluZ0RhdGEiLCJzdHJpbmdpZnkiLCJlbmNyeXB0ZWREYXRhIiwiZW5jcnlwdCIsInNpZ24iLCJDb252ZXJ0Um9sZXNUb1N0cmluZyIsInJvbGVzQXJyYXkiLCJhbGxQZXJtaXNzaW9ucyIsInJvbGUiLCJzdWJzdHJpbmciLCJsZW5ndGgiLCJjcmVhdGVEb2N1bWVudCIsImFjY291bnQiLCJjdXN0b21lckRvY3VtZW50Iiwic2VhcmNoT2JqIiwidXNlckRvY3VtZW50IiwiYWRkIl0sIm1hcHBpbmdzIjoiOzs7Ozs7Ozs7O0FBQUEsSUFBSUEsV0FBWUMsUUFBUSxXQUFSLENBQWhCO0FBQ0EsSUFBSUMsTUFBTUQsUUFBUSxjQUFSLENBQVY7QUFDQSxJQUFJRSxRQUFRRixRQUFRLE9BQVIsQ0FBWjtBQUNBLElBQUlHLFNBQVNILFFBQVEsZUFBUixDQUFiO0FBQ0EsSUFBSUksU0FBU0osUUFBUSxRQUFSLENBQWI7QUFDQSxJQUFJSyxjQUFjTCxRQUFRLHFCQUFSLENBQWxCO0FBQ0EsSUFBTU0sY0FBYyxPQUFwQjtBQUNBLElBQUlDLFNBQVNQLFFBQVEsUUFBUixDQUFiO0FBQ0EsSUFBTVEsU0FBVSxPQUFoQjtBQUNBLElBQU1DLFFBQVEsYUFBZDtBQUNBLElBQU1DLGdCQUFnQixTQUF0QjtBQUNBLElBQU1DLE1BQU1YLFFBQVEsZ0JBQVIsQ0FBWjtBQUNBLElBQUlZLFNBQVNWLE1BQU1XLFlBQU4sQ0FBbUJGLElBQUlHLFVBQXZCLEVBQW1DSCxJQUFJSSxVQUF2QyxFQUFtRDtBQUM1REMsZUFBV0wsSUFBSU07QUFDZjtBQUNBO0FBQ0E7QUFKNEQsQ0FBbkQsQ0FBYjs7SUFNYUMsVyxXQUFBQSxXO0FBQ1QsMkJBQWE7QUFBQTs7QUFDVCxhQUFLQyxnQkFBTCxHQUF3QmQsWUFBWUgsS0FBWixFQUFtQixhQUFuQixFQUFrQztBQUN0RGtCLDJCQUFjakIsT0FBT2tCO0FBRGlDLFNBQWxDLENBQXhCO0FBR0g7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a0JDLE9BQU0sR0FBeEI7QUFDSCxLQUZEO0FBR0FELHFCQUFpQkEsZUFBZUUsU0FBZixDQUF5QixDQUF6QixFQUEyQkYsZUFBZUcsTUFBZixHQUFzQixDQUFqRCxDQUFqQjtBQUNBekUsWUFBUUMsR0FBUixDQUFZcUUsY0FBWjtBQUNIO0FBQ0QsU0FBU0ksY0FBVCxDQUF3QkMsT0FBeEIsRUFBZ0M7QUFDNUIsUUFBSUMsbUJBQW1CO0FBQ25CekMsWUFBS3dDLFFBQVF4QyxFQURNO0FBRW5CdEMsa0JBQVM4RSxRQUFROUUsUUFGRTtBQUduQm9CLGVBQU8wRCxRQUFRMUQsS0FISTtBQUluQkYsbUJBQVk0RCxRQUFRNUQsU0FKRDtBQUtuQkMsa0JBQVUyRCxRQUFRM0QsUUFMQztBQU1uQmxCLGtCQUFTNkUsUUFBUTdFLFFBTkU7QUFPbkJvQixnQkFBUXlELFFBQVF6RCxNQVBHO0FBUW5CcUQsY0FBTUksUUFBUUo7QUFSSyxLQUF2QjtBQVVBdkUsWUFBUUMsR0FBUixDQUFZMkUsZ0JBQVo7QUFDQSxXQUFPQSxnQkFBUDtBQUNGO0FBQ0QsU0FBU2hDLGNBQVQsQ0FBd0IrQixPQUF4QixFQUFpQ0UsU0FBakMsRUFBMkM7QUFDdkMsUUFBSUMsZUFBZUosZUFBZUMsT0FBZixDQUFuQjtBQUNBRSxjQUFVRSxHQUFWLENBQWNKLFFBQVF4QyxFQUF0QixFQUF5QjJDLFlBQXpCO0FBQ0giLCJmaWxlIjoiUmVkaXNTZXJ2aWNlcy9Vc2VyU2VydmljZS5qcyIsInNvdXJjZXNDb250ZW50IjpbInZhciBjcnlwdG9qcyAgPSByZXF1aXJlKCdjcnlwdG8tanMnKTtcbnZhciBqd3QgPSByZXF1aXJlKCdqc29ud2VidG9rZW4nKTtcbnZhciByZWRpcyA9IHJlcXVpcmUoJ3JlZGlzJyk7XG52YXIgbHJlZGlzID0gcmVxdWlyZSgnLi9yZWRpcy1sb2NhbCcpO1xudmFyIG1vbWVudCA9IHJlcXVpcmUoJ21vbWVudCcpO1xudmFyIHJlZGlzU2VhcmNoID0gcmVxdWlyZSgnLi4vcmVkaXNlYXJjaGNsaWVudCcpO1xuY29uc3QgU0VSVklDRV9LRVkgPSAndXNlcnMnO1xudmFyIGJjcnlwdCA9IHJlcXVpcmUoJ2JjcnlwdCcpOyBcbmNvbnN0IFBSRUZJWCAgPSBcInVzZXI6XCJcbmNvbnN0IElOREVYID0gXCJpbmRleDp1c2Vyc1wiXG5jb25zdCBVU0VSSURDT1VOVEVSID0gXCJ1c2VyOmlkXCI7IFxuY29uc3QgRU5WID0gcmVxdWlyZSgnLi4vZW52aXJvbm1lbnQnKVxudmFyIGNsaWVudCA9IHJlZGlzLmNyZWF0ZUNsaWVudChFTlYucmVkaXNfcG9ydCwgRU5WLnJlZGlzX2hvc3QsIHtcbiAgICBhdXRoX3Bhc3M6IEVOVi5yZWRpc19wYXNzLFxuICAgIC8vIHRsczp7XG4gICAgLy8gICAgIHNlcnZlcm5hbWU6ICdjb3JlLnNoaXB0cm9waWNhbC5jb20nXG4gICAgLy8gfSBcbn0pO1xuZXhwb3J0IGNsYXNzIFVzZXJTZXJ2aWNlIHtcbiAgICBjb25zdHJ1Y3Rvcigpe1xuICAgICAgICB0aGlzLnJlZGlzSW5kZXhTZWFyY2ggPSByZWRpc1NlYXJjaChyZWRpcywgJ2luZGV4OnVzZXJzJywge1xuICAgICAgICAgICAgY2xpZW50T3B0aW9uczpscmVkaXMuc2VhcmNoQ2xpZW50RGV0YWlsc1xuICAgICAgICB9KTtcbiAgICB9XG4gICAgYXV0aGVudGljYXRlICh1c2VybmFtZSxwYXNzd29yZCl7XG4gICAgICAgIHZhciBzcnYgPSB0aGlzOyBcbiAgICAgICAgY29uc29sZS5sb2coJ2Fib3V0IHRvIGF1dGgnKVxuICAgICAgICByZXR1cm4gbmV3IFByb21pc2UoZnVuY3Rpb24ocmVzb2x2ZSxyZWplY3Qpe1xuICAgICAgICAgICBcbiAgICAgICAgICAgIGNsaWVudC5oZ2V0YWxsKFBSRUZJWCt1c2VybmFtZSwoZXJyLHJlc3VsdCk9PntcblxuICAgICAgICAgICAgICAgIGNvbnNvbGUubG9nKHJlc3VsdCwgXCJpcyB0aGUgcmVzdWx0c1wiKTsgXG4gICAgICAgICAgICAgICAgaWYgKHJlc3VsdCl7XG4gICAgICAgICAgICAgICAgICAgIGNvbnNvbGUubG9nKHJlc3VsdCk7XG4gICAgICAgICAgICAgICAgICAgIGJjcnlwdC5jb21wYXJlKHBhc3N3b3JkLHJlc3VsdC5wYXNzd29yZCwoZXJyLHB3ZFJlc3VsdCk9PntcbiAgICAgICAgICAgICAgICAgICAgICAgIGlmIChlcnIpe1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGNvbnNvbGUubG9nKGVycik7IFxuXG4gICAgICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgICAgICBpZihwd2RSZXN1bHQgPT0gdHJ1ZSl7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgZGVsZXRlIHJlc3VsdC5wYXNzd29yZDsgXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgc3J2LmdlbmVyYXRlVG9rZW4ocmVzdWx0KS50aGVuKHRva2VuPT57XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHJlc29sdmUoe3VzZXI6cmVzdWx0LHRva2VuOnRva2VuLHZhbGlkOnRydWV9KVxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICAgICAgZWxzZSB7IFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGNvbnNvbGUubG9nKFwiYXV0aCBmYWlsZWRcIilcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICByZXNvbHZlKHt1c2VyOm51bGwsdG9rZW46XCJcIix2YWxpZDpmYWxzZX0pXG4gICAgICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgICAgIFxuICAgICAgICAgICAgICAgICAgICAgICBcbiAgICAgICAgICAgICAgICAgICAgfSlcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgZWxzZXtcbiAgICAgICAgICAgICAgICAgICAgcmVzb2x2ZSh7dXNlcjpudWxsLHRva2VuOlwiXCIsdmFsaWQ6ZmFsc2V9KVxuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH0pOyBcbiAgICAgICAgICAgIFxuICAgICAgICAgICAgXG4gICAgICAgIH0pO1xuICAgIH1cbiAgICBnZXRVc2VyKHVzZXJuYW1lKXtcbiAgICAgICAgcmV0dXJuIG5ldyBQcm9taXNlIChmdW5jdGlvbihyZXNvbHZlLHJlamVjdCl7XG4gICAgICAgICAgICBjbGllbnQuaGdldGFsbChQUkVGSVgrdXNlcm5hbWUsKGVycixyZXN1bHQpPT57XG4gICAgICAgICAgICAgICAgaWYgKHJlc3VsdCl7XG4gICAgICAgICAgICAgICAgICAgIGRlbGV0ZSByZXN1bHQucGFzc3dvcmQ7IFxuICAgICAgICAgICAgICAgICAgICByZXNvbHZlKHt1c2VyOnJlc3VsdH0pXG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIGVsc2UgcmVzb2x2ZSh7dXNlcjp7dXNlcm5hbWU6JycsZmlyc3ROYW1lOicnLGxhc3ROYW1lOicnLGVtYWlsOicnLG1vYmlsZTonJ319KVxuICAgICAgICAgICAgfSlcbiAgICAgICAgIFxuICAgICAgICB9KTtcbiAgICB9XG4gICAgZ2V0VXNlcnNJblJvbGUocm9sZUlkKXtcbiAgICAgICAgcmV0dXJuIG5ldyBQcm9taXNlIChmdW5jdGlvbihyZXNvbHZlLHJlamVjdCl7XG5cbiAgICAgICAgICAgIC8vIGRhdGFDb250ZXh0LmdldFNlcnZpY2VQcm94eShTRVJWSUNFX0tFWSkuZ2V0VXNlcnNCeVJvbGUoe3JvbGVJZDpyb2xlSWR9LGZ1bmN0aW9uKGVycm9yLHJlc3VsdCl7XG4gICAgICAgICAgICAvLyAgICAgaWYgKGVycm9yKXtcbiAgICAgICAgICAgIC8vICAgICAgICAgcmVqZWN0KGVycm9yKTtcbiAgICAgICAgICAgIC8vICAgICB9XG4gICAgICAgICAgICAvLyAgICAgcmVzb2x2ZSggcmVzdWx0KTtcbiAgICAgICAgICAgIC8vIH0pO1xuICAgICAgICB9KTtcbiAgICB9XG4gICAgZ2V0Um9sZXMoKXtcbiAgICAgICAgcmV0dXJuIG5ldyBQcm9taXNlIChmdW5jdGlvbihyZXNvbHZlLHJlamVjdCl7XG5cbiAgICAgICAgICAgIHJlc29sdmUoW1wiQWRtaW5cIixcIldhcmVob3VzZSBGTExcIixcIkN1c3RvbXMgQWdlbnRcIixcIldhcmVob3VzZSBCQUhBTUFTXCIsXCJDYXNoaWVyXCIsXCJMb2NhdGlvbiBNYW5hZ2VyXCJdKVxuICAgICAgICAgICAgXG4gICAgICAgIH0pO1xuICAgIH1cbiAgICBnZXRBbGxVc2VycyhwYWdlU2l6ZSxjdXJyZW50UGFnZSl7XG4gICAgICAgIHZhciBzcnYgPSB0aGlzOyBcbiAgICAgICAgY29uc29sZS5sb2coJ2dldHRpbmcgYWxsIHVzZXJzJylcbiAgICAgICAgcmV0dXJuIG5ldyBQcm9taXNlIChmdW5jdGlvbihyZXNvbHZlLHJlamVjdCl7XG4gICAgICAgICAgICB2YXIgb2Zmc2V0XG4gICAgICAgICAgIHNydi5yZWRpc0luZGV4U2VhcmNoLnNlYXJjaCgnKicse1xuICAgICAgICAgICAgb2Zmc2V0OjAsXG4gICAgICAgICAgICBudW1iZXJPZlJlc3VsdHM6IDEwMDAsXG4gICAgICAgICAgICBzb3J0Qnk6IFwibGFzdE5hbWVcIixcbiAgICAgICAgICAgIGRpcjogXCJBU0NcIlxuICAgICAgICB9LChlcnIscmVzdWx0cyk9PntcbiAgICAgICAgICAgIHZhciB1c2VycyA9IFtdO1xuICAgICAgICAgICAgICAgIHJlc3VsdHMucmVzdWx0cy5mb3JFYWNoKGVsZW1lbnQgPT4ge1xuICAgICAgICAgICAgICAgICAgICBkZWxldGUgZWxlbWVudC5kb2MucGFzc3dvcmRcbiAgICAgICAgICAgICAgICAgICAgdXNlcnMucHVzaChlbGVtZW50LmRvYyk7IFxuICAgICAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgICAgIHJlc29sdmUodXNlcnMpXG4gICAgICAgIH0pXG4gICAgICAgIH0pO1xuICAgIH1cbiAgICByZW1vdmVVc2VyKHVzZXJuYW1lKXtcbiAgICAgICAgcmV0dXJuIG5ldyBQcm9taXNlIChmdW5jdGlvbihyZXNvbHZlLHJlamVjdCl7XG4gICAgICAgICAgICB2YXIgaWR4PSB0aGlzLnJlZGlzSW5kZXhTZWFyY2g7IFxuICAgICAgICBscmVkaXMuaGdldGFsbChQUkVGSVgrdXNlcm5hbWUpLnRoZW4odXNlcj0+e1xuICAgICAgICAgICAgaWR4LmRlbGV0ZSh1c2VyLmlkKTsgXG4gICAgICAgICAgICBjbGllbnQuZGVsZXRlKFBSRUZJWCt1c2VybmFtZSwoZXJyLHJlc3VsdCk9PntcbiAgICAgICAgICAgICAgICBpZiAoZXJyKXtcbiAgICAgICAgICAgICAgICAgICAgY29uc29sZS5sb2coXCJ1bmFibGUgdG8gZGVsZXRlXCIpOyBcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgcmVzb2x2ZSh7cmVtb3ZlZDp0cnVlfSlcbiAgICAgICAgICAgIH0pXG4gICAgICAgIH0pXG4gICAgICAgICAgLy9maW5kIHRoZSB1c2VyIGJ5IHVzZXJuYW1lIFxuICAgICAgICAgIC8vZ2V0IHRoZSBkb2MgSWQgXG4gICAgICAgICAgLy9kZWxldGUgZnJvbSBpbmRleCBcbiAgICAgICAgICAvL2RlbGV0ZSBoYXNoIFxuICAgICAgICB9KTtcbiAgICB9XG4gICAgZW5hYmxlVXNlcih1c2VybmFtZSxlbmFibGVkKXtcbiAgICAgICAgcmV0dXJuIG5ldyBQcm9taXNlIChmdW5jdGlvbihyZXNvbHZlLHJlamVjdCl7XG4gICAgICAgICAgICBjbGllbnQuaG1zZXQoUFJFRklYK3VzZXJuYW1lLHtlbmFibGVkOmVuYWJsZWR9LChlcnIscmVzdWx0KT0+e1xuICAgICAgICAgICAgICAgIGlmIChlcnIpe1xuICAgICAgICAgICAgICAgICAgICByZXNvbHZlKHt1cGRhdGVkOmZhbHNlfSlcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgZWxzZSB7XG4gICAgICAgICAgICAgICAgICAgIHJlc29sdmUoe3VwZGF0ZWQ6dHJ1ZX0pXG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfSk7IFxuICAgICAgICAgICAgXG4gICAgICAgIH0pO1xuICAgIH1cbiAgICBzYXZlVXNlcih1c2VyKXtcbiAgICAgICB2YXIgc3J2ID0gdGhpczsgXG4gICAgICAgIHJldHVybiBuZXcgUHJvbWlzZSAoZnVuY3Rpb24ocmVzb2x2ZSxyZWplY3Qpe1xuICAgICAgICAgICAgc3J2LmNoZWNrVXNlcm5hbWUodXNlci51c2VybmFtZSkudGhlbih2YWxpZD0+e1xuICAgICAgICAgICAgICAgIGNvbnNvbGUubG9nKHZhbGlkKVxuICAgICAgICAgICAgICAgIGlmICh2YWxpZC50YWtlbiA9PSBmYWxzZSl7XG4gICAgICAgICAgICAgICAgICAgIC8vY3JlYXRlIHRoZSBoYXNoIFxuICAgICAgICAgICAgICAgICAgICBjbGllbnQuaW5jcihVU0VSSURDT1VOVEVSLChlcnIsaWQpPT57XG4gICAgICAgICAgICAgICAgICAgICAgICB1c2VyLmlkID0gaWQ7IFxuICAgICAgICAgICAgICAgICAgICAgICAgdXNlci5wYXNzd29yZCA9IGJjcnlwdC5oYXNoU3luYyh1c2VyLnBhc3N3b3JkLDEwKTsgXG4gICAgICAgICAgICAgICAgICAgICAgICBscmVkaXMuaG1zZXQoUFJFRklYK3VzZXIudXNlcm5hbWUsdXNlcilcbiAgICAgICAgICAgICAgICAgICAgICAgIGFkZFVzZXJUb0luZGV4KHVzZXIsc3J2LnJlZGlzSW5kZXhTZWFyY2gpOyBcbiAgICAgICAgICAgICAgICAgICAgICAgIHJlc29sdmUoe3NhdmVkOnRydWUsXCJtZXNzYWdlXCI6XCJzYXZlZCBzdWNjZXNzZnVsbHkuXCJ9KVxuICAgICAgICAgICAgICAgICAgICB9KVxuICAgICAgICAgICAgICAgICAgICBcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgZWxzZSB7XG4gICAgICAgICAgICAgICAgICAgIC8vdXBkYXRlIHRoZSB1c2VyIFxuICAgICAgICAgICAgICAgICAgICAvL3ByZXBhcmUgdGhlIHJvbGVzIHdlIGFyZSBnb2luZyB0byBnZXQgYW4gYXJyYSBcbiAgICAgICAgICAgICAgICAgICBcbiAgICAgICAgICAgICAgICAgICAgXG4gICAgICAgICAgICAgICAgICAgIGlmICghdXNlci5wYXNzd29yZCB8fCB1c2VyLnBhc3N3b3JkID09IFwiXCIpe1xuICAgICAgICAgICAgICAgICAgICAgICAgZGVsZXRlIHVzZXIucGFzc3dvcmQ7IFxuICAgICAgICAgICAgICAgICAgICB9ZWxzZSB7XG4gICAgICAgICAgICAgICAgICAgICAgICBjb25zb2xlLmxvZygndXBkYXRpbmcgdXNlcicsdXNlcilcbiAgICAgICAgICAgICAgICAgICAgICAgIHVzZXIucGFzc3dvcmQgPSBiY3J5cHQuaGFzaFN5bmModXNlci5wYXNzd29yZCwxMCk7IFxuICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgXG5cbiAgICAgICAgICAgICAgICAgICAgXG4gICAgICAgICAgICAgICAgICAgIGNsaWVudC5obXNldChQUkVGSVgrdXNlci51c2VybmFtZSx1c2VyKVxuICAgICAgICAgICAgICAgICAgICBzcnYucmVkaXNJbmRleFNlYXJjaC51cGRhdGUodXNlci5pZCx1c2VyLChlcnIscmVwbHkpPT57XG4gICAgICAgICAgICAgICAgICAgICAgICBpZihlcnIpXG4gICAgICAgICAgICAgICAgICAgICAgICAge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICBjb25zb2xlLmxvZyhlcnIpXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgcmVzb2x2ZSh7c2F2ZWQ6ZmFsc2UsXCJtZXNzYWdlXCI6XCJVc2VybmFtZSBlcnJcIn0pXG4gICAgICAgICAgICAgICAgICAgICAgICAgfSAgIFxuICAgICAgICAgICAgICAgICAgICAgICAgZWxzZSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICBcbiAgICAgICAgICAgICAgICAgICAgICAgICAgIFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB1c2VyLnBhc3N3b3JkID0gYmNyeXB0Lmhhc2hTeW5jKHVzZXIucGFzc3dvcmQsMTApOyBcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICByZXNvbHZlKHtzYXZlZDp0cnVlLFwibWVzc2FnZVwiOlwiVXNlciB1cGRhdGVkLlwifSlcbiAgICAgICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgICAgIFxuICAgICAgICAgICAgICAgICAgICB9KVxuICAgICAgICAgICAgICAgICAgICBcbiAgICAgICAgICAgICAgICAgICAgXG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfSlcbiAgICAgICAgICAgIFxuICAgICAgICB9KTtcbiAgICB9XG4gICAgdmVyaWZ5VG9rZW4gKHRva2VuKXtcbiAgICAgICAgcmV0dXJuIG5ldyBQcm9taXNlKGZ1bmN0aW9uKHJlc2xvdmUscmVqZWN0KXtcbiAgICAgICAgICAgIHRyeSB7XG4gICAgICAgICAgICAgICAgdmFyIGRlY29kZWRKV1QgPSBqd3QudmVyaWZ5KHRva2VuLCdzaWx2ZXIxMjMuJyk7XG4gICAgICAgICAgICAgICAgdmFyIGJ5dGVzID0gY3J5cHRvanMuQUVTLmRlY3J5cHQoZGVjb2RlZEpXVC50b2tlbiwnU2lsdmVyMTIzJyk7XG4gICAgICAgICAgICAgICAgdmFyIHRva2VuRGF0YSA9IEpTT04ucGFyc2UoYnl0ZXMudG9TdHJpbmcoY3J5cHRvanMuZW5jLlV0ZjgpKTtcbiAgICAgICAgICAgICAgICAvKiAgY29uc29sZS5sb2coJ3Rva2VuIGRhdGEgYmVsb3cnKTtcbiAgICAgICAgICAgICAgICAgY29uc29sZS5sb2codG9rZW5EYXRhKTsqL1xuICAgICAgICAgICAgICAgIHJlc2xvdmUodG9rZW5EYXRhKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIGNhdGNoKGUpe1xuICAgICAgICAgICAgICAgIGNvbnNvbGUubG9nKGUsXCJ1bmFibGUgdG8gdmVyaWZ5IHRva2VuXCIpXG4gICAgICAgICAgICAgICAgcmVqZWN0KCk7XG4gICAgICAgICAgICB9XG5cbiAgICAgICAgfSk7XG4gICAgfVxuICAgIGNoZWNrVXNlcm5hbWUodXNlcm5hbWUpe1xuICAgICAgICByZXR1cm4gbmV3IFByb21pc2UoKHJlc29sdmUscmVqZWN0KT0+e1xuICAgICAgICAgICAgLy93ZSBjYW4gY2hlY2sgaW4gMiB3YXlzIG9uZSBzZWUgaWYgdGhlIGhhc2ggZXhpc3RzIFxuICAgICAgICAgICAgY2xpZW50LmV4aXN0cyhQUkVGSVgrdXNlcm5hbWUsKGVycixyZXN1bHRzKT0+e1xuICAgICAgICAgICAgICAgIGNvbnNvbGUubG9nKHJlc3VsdHMpXG4gICAgICAgICAgICAgICAgaWYgKE51bWJlcihyZXN1bHRzKSA9PSAxKXtcbiAgICAgICAgICAgICAgICAgICAgcmVzb2x2ZSh7dGFrZW46dHJ1ZX0pXG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIGVsc2VcbiAgICAgICAgICAgICAgICAgICAgcmVzb2x2ZSh7dGFrZW46ZmFsc2V9KVxuICAgICAgICAgICAgfSlcbiAgICAgICAgfSlcbiAgICB9XG4gICAgZ2VuZXJhdGVUb2tlbiAodXNlcil7XG4gICAgICAgIHJldHVybiBuZXcgUHJvbWlzZShmdW5jdGlvbihyZXNvbHZlLHJlamVjdCl7XG5cbiAgICAgICAgICAgIHZhciBzdHJpbmdEYXRhID0gSlNPTi5zdHJpbmdpZnkodXNlcik7XG4gICAgICAgICAgICB2YXIgZW5jcnlwdGVkRGF0YSA9IGNyeXB0b2pzLkFFUy5lbmNyeXB0KHN0cmluZ0RhdGEsJ1NpbHZlcjEyMycpLnRvU3RyaW5nKCk7XG5cbiAgICAgICAgICAgIHZhciB0b2tlbiA9IGp3dC5zaWduKHtcbiAgICAgICAgICAgICAgICB0b2tlbjplbmNyeXB0ZWREYXRhXG4gICAgICAgICAgICB9LCAnc2lsdmVyMTIzLicpO1xuICAgICAgICAgICAgcmVzb2x2ZSggdG9rZW4pO1xuICAgICAgICB9KTtcblxuICAgIH1cbn1cbmZ1bmN0aW9uIENvbnZlcnRSb2xlc1RvU3RyaW5nKHJvbGVzQXJyYXkpe1xuICAgIHZhciBhbGxQZXJtaXNzaW9ucyA9IFwiXCI7IFxuICAgIHJvbGVzQXJyYXkuZm9yRWFjaChyb2xlID0+IHtcbiAgICAgICAgYWxsUGVybWlzc2lvbnMgKz0gcm9sZSArXCIsXCJcbiAgICB9KTtcbiAgICBhbGxQZXJtaXNzaW9ucyA9IGFsbFBlcm1pc3Npb25zLnN1YnN0cmluZygwLGFsbFBlcm1pc3Npb25zLmxlbmd0aC0xKTsgXG4gICAgY29uc29sZS5sb2coYWxsUGVybWlzc2lvbnMpXG59XG5mdW5jdGlvbiBjcmVhdGVEb2N1bWVudChhY2NvdW50KXtcbiAgICB2YXIgY3VzdG9tZXJEb2N1bWVudCA9IHsgXG4gICAgICAgIGlkIDogYWNjb3VudC5pZCxcbiAgICAgICAgdXNlcm5hbWU6YWNjb3VudC51c2VybmFtZSxcbiAgICAgICAgZW1haWw6IGFjY291bnQuZW1haWwsIFxuICAgICAgICBmaXJzdE5hbWUgOiBhY2NvdW50LmZpcnN0TmFtZSwgXG4gICAgICAgIGxhc3ROYW1lOiBhY2NvdW50Lmxhc3ROYW1lLFxuICAgICAgICBwYXNzd29yZDphY2NvdW50LnBhc3N3b3JkLFxuICAgICAgICBtb2JpbGU6IGFjY291bnQubW9iaWxlLFxuICAgICAgICByb2xlOiBhY2NvdW50LnJvbGVcbiAgICB9XG4gICAgY29uc29sZS5sb2coY3VzdG9tZXJEb2N1bWVudClcbiAgICByZXR1cm4gY3VzdG9tZXJEb2N1bWVudDsgXG4gfVxuIGZ1bmN0aW9uIGFkZFVzZXJUb0luZGV4KGFjY291bnQsIHNlYXJjaE9iail7XG4gICAgIHZhciB1c2VyRG9jdW1lbnQgPSBjcmVhdGVEb2N1bWVudChhY2NvdW50KTsgXG4gICAgIHNlYXJjaE9iai5hZGQoYWNjb3VudC5pZCx1c2VyRG9jdW1lbnQpOyBcbiB9Il19
