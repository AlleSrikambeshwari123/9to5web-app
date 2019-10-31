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
        key: 'changePassword',
        value: function changePassword(username, newpassword, oldpassword) {
            var _this = this;

            return new Promise(function (resolve, reject) {
                var srv = _this;
                srv.authenticate(username, oldpassword).then(function (userInfo) {
                    if (userInfo.valid == "true" || userInfo.valid == true) {

                        client.hmset(PREFIX + username, { password: bcrypt.hashSync(newpassword, 10) }, function (err, result) {
                            if (err) {
                                resolve({ updated: false });
                                console.log(err);
                            }
                            resolve({ updated: true });
                        });
                    } else {
                        resolve({ updated: false });
                    }
                });
            });
        }
    }, {
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
//# sourceMappingURL=data:application/json;charset=utf8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIlJlZGlzU2VydmljZXMvVXNlclNlcnZpY2UuZXM2Il0sIm5hbWVzIjpbImNyeXB0b2pzIiwicmVxdWlyZSIsImp3dCIsInJlZGlzIiwibHJlZGlzIiwibW9tZW50IiwicmVkaXNTZWFyY2giLCJTRVJWSUNFX0tFWSIsImJjcnlwdCIsIlBSRUZJWCIsIklOREVYIiwiVVNFUklEQ09VTlRFUiIsIkVOViIsImNsaWVudCIsImNyZWF0ZUNsaWVudCIsInJlZGlzX3BvcnQiLCJyZWRpc19ob3N0IiwiYXV0aF9wYXNzIiwicmVkaXNfcGFzcyIsIlVzZXJTZXJ2aWNlIiwicmVkaXNJbmRleFNlYXJjaCIsImNsaWVudE9wdGlvbnMiLCJzZWFyY2hDbGllbnREZXRhaWxzIiwidXNlcm5hbWUiLCJuZXdwYXNzd29yZCIsIm9sZHBhc3N3b3JkIiwiUHJvbWlzZSIsInJlc29sdmUiLCJyZWplY3QiLCJzcnYiLCJhdXRoZW50aWNhdGUiLCJ0aGVuIiwidXNlckluZm8iLCJ2YWxpZCIsImhtc2V0IiwicGFzc3dvcmQiLCJoYXNoU3luYyIsImVyciIsInJlc3VsdCIsInVwZGF0ZWQiLCJjb25zb2xlIiwibG9nIiwiaGdldGFsbCIsImNvbXBhcmUiLCJwd2RSZXN1bHQiLCJnZW5lcmF0ZVRva2VuIiwidXNlciIsInRva2VuIiwiZmlyc3ROYW1lIiwibGFzdE5hbWUiLCJlbWFpbCIsIm1vYmlsZSIsInJvbGVJZCIsInBhZ2VTaXplIiwiY3VycmVudFBhZ2UiLCJvZmZzZXQiLCJzZWFyY2giLCJudW1iZXJPZlJlc3VsdHMiLCJzb3J0QnkiLCJkaXIiLCJyZXN1bHRzIiwidXNlcnMiLCJmb3JFYWNoIiwiZWxlbWVudCIsImRvYyIsInB1c2giLCJpZHgiLCJkZWxldGUiLCJpZCIsInJlbW92ZWQiLCJlbmFibGVkIiwiY2hlY2tVc2VybmFtZSIsInRha2VuIiwiaW5jciIsImFkZFVzZXJUb0luZGV4Iiwic2F2ZWQiLCJ1cGRhdGUiLCJyZXBseSIsInJlc2xvdmUiLCJkZWNvZGVkSldUIiwidmVyaWZ5IiwiYnl0ZXMiLCJBRVMiLCJkZWNyeXB0IiwidG9rZW5EYXRhIiwiSlNPTiIsInBhcnNlIiwidG9TdHJpbmciLCJlbmMiLCJVdGY4IiwiZSIsImV4aXN0cyIsIk51bWJlciIsInN0cmluZ0RhdGEiLCJzdHJpbmdpZnkiLCJlbmNyeXB0ZWREYXRhIiwiZW5jcnlwdCIsInNpZ24iLCJDb252ZXJ0Um9sZXNUb1N0cmluZyIsInJvbGVzQXJyYXkiLCJhbGxQZXJtaXNzaW9ucyIsInJvbGUiLCJzdWJzdHJpbmciLCJsZW5ndGgiLCJjcmVhdGVEb2N1bWVudCIsImFjY291bnQiLCJjdXN0b21lckRvY3VtZW50Iiwic2VhcmNoT2JqIiwidXNlckRvY3VtZW50IiwiYWRkIl0sIm1hcHBpbmdzIjoiOzs7Ozs7Ozs7O0FBQUEsSUFBSUEsV0FBWUMsUUFBUSxXQUFSLENBQWhCO0FBQ0EsSUFBSUMsTUFBTUQsUUFBUSxjQUFSLENBQVY7QUFDQSxJQUFJRSxRQUFRRixRQUFRLE9BQVIsQ0FBWjtBQUNBLElBQUlHLFNBQVNILFFBQVEsZUFBUixDQUFiO0FBQ0EsSUFBSUksU0FBU0osUUFBUSxRQUFSLENBQWI7QUFDQSxJQUFJSyxjQUFjTCxRQUFRLHFCQUFSLENBQWxCO0FBQ0EsSUFBTU0sY0FBYyxPQUFwQjtBQUNBLElBQUlDLFNBQVNQLFFBQVEsUUFBUixDQUFiO0FBQ0EsSUFBTVEsU0FBVSxPQUFoQjtBQUNBLElBQU1DLFFBQVEsYUFBZDtBQUNBLElBQU1DLGdCQUFnQixTQUF0QjtBQUNBLElBQU1DLE1BQU1YLFFBQVEsZ0JBQVIsQ0FBWjtBQUNBLElBQUlZLFNBQVNWLE1BQU1XLFlBQU4sQ0FBbUJGLElBQUlHLFVBQXZCLEVBQW1DSCxJQUFJSSxVQUF2QyxFQUFtRDtBQUM1REMsZUFBV0wsSUFBSU07QUFDZjtBQUNBO0FBQ0E7QUFKNEQsQ0FBbkQsQ0FBYjs7SUFNYUMsVyxXQUFBQSxXO0FBQ1QsMkJBQWE7QUFBQTs7QUFDVCxhQUFLQyxnQkFBTCxHQUF3QmQsWUFBWUgsS0FBWixFQUFtQixhQUFu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UXpELFNBSkQ7QUFLbkJDLGtCQUFVd0QsUUFBUXhELFFBTEM7QUFNbkJkLGtCQUFTc0UsUUFBUXRFLFFBTkU7QUFPbkJnQixnQkFBUXNELFFBQVF0RCxNQVBHO0FBUW5Ca0QsY0FBTUksUUFBUUo7QUFSSyxLQUF2QjtBQVVBN0QsWUFBUUMsR0FBUixDQUFZaUUsZ0JBQVo7QUFDQSxXQUFPQSxnQkFBUDtBQUNGO0FBQ0QsU0FBU2hDLGNBQVQsQ0FBd0IrQixPQUF4QixFQUFpQ0UsU0FBakMsRUFBMkM7QUFDdkMsUUFBSUMsZUFBZUosZUFBZUMsT0FBZixDQUFuQjtBQUNBRSxjQUFVRSxHQUFWLENBQWNKLFFBQVFyQyxFQUF0QixFQUF5QndDLFlBQXpCO0FBQ0giLCJmaWxlIjoiUmVkaXNTZXJ2aWNlcy9Vc2VyU2VydmljZS5qcyIsInNvdXJjZXNDb250ZW50IjpbInZhciBjcnlwdG9qcyAgPSByZXF1aXJlKCdjcnlwdG8tanMnKTtcbnZhciBqd3QgPSByZXF1aXJlKCdqc29ud2VidG9rZW4nKTtcbnZhciByZWRpcyA9IHJlcXVpcmUoJ3JlZGlzJyk7XG52YXIgbHJlZGlzID0gcmVxdWlyZSgnLi9yZWRpcy1sb2NhbCcpO1xudmFyIG1vbWVudCA9IHJlcXVpcmUoJ21vbWVudCcpO1xudmFyIHJlZGlzU2VhcmNoID0gcmVxdWlyZSgnLi4vcmVkaXNlYXJjaGNsaWVudCcpO1xuY29uc3QgU0VSVklDRV9LRVkgPSAndXNlcnMnO1xudmFyIGJjcnlwdCA9IHJlcXVpcmUoJ2JjcnlwdCcpOyBcbmNvbnN0IFBSRUZJWCAgPSBcInVzZXI6XCJcbmNvbnN0IElOREVYID0gXCJpbmRleDp1c2Vyc1wiXG5jb25zdCBVU0VSSURDT1VOVEVSID0gXCJ1c2VyOmlkXCI7IFxuY29uc3QgRU5WID0gcmVxdWlyZSgnLi4vZW52aXJvbm1lbnQnKVxudmFyIGNsaWVudCA9IHJlZGlzLmNyZWF0ZUNsaWVudChFTlYucmVkaXNfcG9ydCwgRU5WLnJlZGlzX2hvc3QsIHtcbiAgICBhdXRoX3Bhc3M6IEVOVi5yZWRpc19wYXNzLFxuICAgIC8vIHRsczp7XG4gICAgLy8gICAgIHNlcnZlcm5hbWU6ICdjb3JlLnNoaXB0cm9waWNhbC5jb20nXG4gICAgLy8gfSBcbn0pO1xuZXhwb3J0IGNsYXNzIFVzZXJTZXJ2aWNlIHtcbiAgICBjb25zdHJ1Y3Rvcigpe1xuICAgICAgICB0aGlzLnJlZGlzSW5kZXhTZWFyY2ggPSByZWRpc1NlYXJjaChyZWRpcywgJ2luZGV4OnVzZXJzJywge1xuICAgICAgICAgICAgY2xpZW50T3B0aW9uczpscmVkaXMuc2VhcmNoQ2xpZW50RGV0YWlsc1xuICAgICAgICB9KTtcbiAgICB9XG5cbiAgICBjaGFuZ2VQYXNzd29yZCh1c2VybmFtZSwgbmV3cGFzc3dvcmQsIG9sZHBhc3N3b3JkKXtcbiAgICAgICAgcmV0dXJuIG5ldyBQcm9taXNlKChyZXNvbHZlLHJlamVjdCk9PntcbiAgICAgICAgICAgIHZhciBzcnYgPSB0aGlzOyBcbiAgICAgICAgICAgIHNydi5hdXRoZW50aWNhdGUodXNlcm5hbWUsb2xkcGFzc3dvcmQpLnRoZW4odXNlckluZm89PnsgXG4gICAgICAgICAgICAgICAgaWYgKHVzZXJJbmZvLnZhbGlkID09XCJ0cnVlXCIgfHwgdXNlckluZm8udmFsaWQgPT0gdHJ1ZSl7XG4gICAgICAgICAgICAgICAgICAgIFxuICAgICAgICAgICAgICAgICAgICBjbGllbnQuaG1zZXQoUFJFRklYK3VzZXJuYW1lLHtwYXNzd29yZDpiY3J5cHQuaGFzaFN5bmMobmV3cGFzc3dvcmQsMTApfSwoZXJyLHJlc3VsdCk9PntcbiAgICAgICAgICAgICAgICAgICAgICAgIGlmKGVycilcbiAgICAgICAgICAgICAgICAgICAgICAgICB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgcmVzb2x2ZSh7dXBkYXRlZDpmYWxzZX0pXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgY29uc29sZS5sb2coZXJyKVxuICAgICAgICAgICAgICAgICAgICAgICAgIH0gICBcbiAgICAgICAgICAgICAgICAgICAgICAgIHJlc29sdmUoe3VwZGF0ZWQ6dHJ1ZX0pXG4gICAgICAgICAgICAgICAgICAgIH0pXG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIGVsc2Uge1xuICAgICAgICAgICAgICAgICAgICByZXNvbHZlKHt1cGRhdGVkOmZhbHNlfSlcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9KVxuICAgICAgICB9KVxuICAgIH1cbiAgICBhdXRoZW50aWNhdGUgKHVzZXJuYW1lLHBhc3N3b3JkKXtcbiAgICAgICAgdmFyIHNydiA9IHRoaXM7IFxuICAgICAgICBjb25zb2xlLmxvZygnYWJvdXQgdG8gYXV0aCcpXG4gICAgICAgIHJldHVybiBuZXcgUHJvbWlzZShmdW5jdGlvbihyZXNvbHZlLHJlamVjdCl7XG4gICAgICAgICAgIFxuICAgICAgICAgICAgY2xpZW50LmhnZXRhbGwoUFJFRklYK3VzZXJuYW1lLChlcnIscmVzdWx0KT0+e1xuXG4gICAgICAgICAgICAgICAgY29uc29sZS5sb2cocmVzdWx0LCBcImlzIHRoZSByZXN1bHRzXCIpOyBcbiAgICAgICAgICAgICAgICBpZiAocmVzdWx0KXtcbiAgICAgICAgICAgICAgICAgICAgY29uc29sZS5sb2cocmVzdWx0KTtcbiAgICAgICAgICAgICAgICAgICAgYmNyeXB0LmNvbXBhcmUocGFzc3dvcmQscmVzdWx0LnBhc3N3b3JkLChlcnIscHdkUmVzdWx0KT0+e1xuICAgICAgICAgICAgICAgICAgICAgICAgaWYgKGVycil7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgY29uc29sZS5sb2coZXJyKTsgXG5cbiAgICAgICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgICAgIGlmKHB3ZFJlc3VsdCA9PSB0cnVlKXtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBkZWxldGUgcmVzdWx0LnBhc3N3b3JkOyBcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBzcnYuZ2VuZXJhdGVUb2tlbihyZXN1bHQpLnRoZW4odG9rZW49PntcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgcmVzb2x2ZSh7dXNlcjpyZXN1bHQsdG9rZW46dG9rZW4sdmFsaWQ6dHJ1ZX0pXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgICAgICBlbHNlIHsgXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgY29uc29sZS5sb2coXCJhdXRoIGZhaWxlZFwiKVxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHJlc29sdmUoe3VzZXI6bnVsbCx0b2tlbjpcIlwiLHZhbGlkOmZhbHNlfSlcbiAgICAgICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgICAgXG4gICAgICAgICAgICAgICAgICAgICAgIFxuICAgICAgICAgICAgICAgICAgICB9KVxuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICBlbHNle1xuICAgICAgICAgICAgICAgICAgICByZXNvbHZlKHt1c2VyOm51bGwsdG9rZW46XCJcIix2YWxpZDpmYWxzZX0pXG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfSk7IFxuICAgICAgICAgICAgXG4gICAgICAgICAgICBcbiAgICAgICAgfSk7XG4gICAgfVxuICAgIGdldFVzZXIodXNlcm5hbWUpe1xuICAgICAgICByZXR1cm4gbmV3IFByb21pc2UgKGZ1bmN0aW9uKHJlc29sdmUscmVqZWN0KXtcbiAgICAgICAgICAgIGNsaWVudC5oZ2V0YWxsKFBSRUZJWCt1c2VybmFtZSwoZXJyLHJlc3VsdCk9PntcbiAgICAgICAgICAgICAgICBpZiAocmVzdWx0KXtcbiAgICAgICAgICAgICAgICAgICAgZGVsZXRlIHJlc3VsdC5wYXNzd29yZDsgXG4gICAgICAgICAgICAgICAgICAgIHJlc29sdmUoe3VzZXI6cmVzdWx0fSlcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgZWxzZSByZXNvbHZlKHt1c2VyOnt1c2VybmFtZTonJyxmaXJzdE5hbWU6JycsbGFzdE5hbWU6JycsZW1haWw6JycsbW9iaWxlOicnfX0pXG4gICAgICAgICAgICB9KVxuICAgICAgICAgXG4gICAgICAgIH0pO1xuICAgIH1cbiAgICBnZXRVc2Vyc0luUm9sZShyb2xlSWQpe1xuICAgICAgICByZXR1cm4gbmV3IFByb21pc2UgKGZ1bmN0aW9uKHJlc29sdmUscmVqZWN0KXtcblxuICAgICAgICAgICAgLy8gZGF0YUNvbnRleHQuZ2V0U2VydmljZVByb3h5KFNFUlZJQ0VfS0VZKS5nZXRVc2Vyc0J5Um9sZSh7cm9sZUlkOnJvbGVJZH0sZnVuY3Rpb24oZXJyb3IscmVzdWx0KXtcbiAgICAgICAgICAgIC8vICAgICBpZiAoZXJyb3Ipe1xuICAgICAgICAgICAgLy8gICAgICAgICByZWplY3QoZXJyb3IpO1xuICAgICAgICAgICAgLy8gICAgIH1cbiAgICAgICAgICAgIC8vICAgICByZXNvbHZlKCByZXN1bHQpO1xuICAgICAgICAgICAgLy8gfSk7XG4gICAgICAgIH0pO1xuICAgIH1cbiAgICBnZXRSb2xlcygpe1xuICAgICAgICByZXR1cm4gbmV3IFByb21pc2UgKGZ1bmN0aW9uKHJlc29sdmUscmVqZWN0KXtcblxuICAgICAgICAgICAgcmVzb2x2ZShbXCJBZG1pblwiLFwiV2FyZWhvdXNlIEZMTFwiLFwiQ3VzdG9tcyBBZ2VudFwiLFwiV2FyZWhvdXNlIEJBSEFNQVNcIixcIkNhc2hpZXJcIixcIkxvY2F0aW9uIE1hbmFnZXJcIl0pXG4gICAgICAgICAgICBcbiAgICAgICAgfSk7XG4gICAgfVxuICAgIGdldEFsbFVzZXJzKHBhZ2VTaXplLGN1cnJlbnRQYWdlKXtcbiAgICAgICAgdmFyIHNydiA9IHRoaXM7IFxuICAgICAgICBjb25zb2xlLmxvZygnZ2V0dGluZyBhbGwgdXNlcnMnKVxuICAgICAgICByZXR1cm4gbmV3IFByb21pc2UgKGZ1bmN0aW9uKHJlc29sdmUscmVqZWN0KXtcbiAgICAgICAgICAgIHZhciBvZmZzZXRcbiAgICAgICAgICAgc3J2LnJlZGlzSW5kZXhTZWFyY2guc2VhcmNoKCcqJyx7XG4gICAgICAgICAgICBvZmZzZXQ6MCxcbiAgICAgICAgICAgIG51bWJlck9mUmVzdWx0czogMTAwMCxcbiAgICAgICAgICAgIHNvcnRCeTogXCJsYXN0TmFtZVwiLFxuICAgICAgICAgICAgZGlyOiBcIkFTQ1wiXG4gICAgICAgIH0sKGVycixyZXN1bHRzKT0+e1xuICAgICAgICAgICAgdmFyIHVzZXJzID0gW107XG4gICAgICAgICAgICAgICAgcmVzdWx0cy5yZXN1bHRzLmZvckVhY2goZWxlbWVudCA9PiB7XG4gICAgICAgICAgICAgICAgICAgIGRlbGV0ZSBlbGVtZW50LmRvYy5wYXNzd29yZFxuICAgICAgICAgICAgICAgICAgICB1c2Vycy5wdXNoKGVsZW1lbnQuZG9jKTsgXG4gICAgICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICAgICAgcmVzb2x2ZSh1c2VycylcbiAgICAgICAgfSlcbiAgICAgICAgfSk7XG4gICAgfVxuICAgIHJlbW92ZVVzZXIodXNlcm5hbWUpe1xuICAgICAgICByZXR1cm4gbmV3IFByb21pc2UgKGZ1bmN0aW9uKHJlc29sdmUscmVqZWN0KXtcbiAgICAgICAgICAgIHZhciBpZHg9IHRoaXMucmVkaXNJbmRleFNlYXJjaDsgXG4gICAgICAgIGxyZWRpcy5oZ2V0YWxsKFBSRUZJWCt1c2VybmFtZSkudGhlbih1c2VyPT57XG4gICAgICAgICAgICBpZHguZGVsZXRlKHVzZXIuaWQpOyBcbiAgICAgICAgICAgIGNsaWVudC5kZWxldGUoUFJFRklYK3VzZXJuYW1lLChlcnIscmVzdWx0KT0+e1xuICAgICAgICAgICAgICAgIGlmIChlcnIpe1xuICAgICAgICAgICAgICAgICAgICBjb25zb2xlLmxvZyhcInVuYWJsZSB0byBkZWxldGVcIik7IFxuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICByZXNvbHZlKHtyZW1vdmVkOnRydWV9KVxuICAgICAgICAgICAgfSlcbiAgICAgICAgfSlcbiAgICAgICAgICAvL2ZpbmQgdGhlIHVzZXIgYnkgdXNlcm5hbWUgXG4gICAgICAgICAgLy9nZXQgdGhlIGRvYyBJZCBcbiAgICAgICAgICAvL2RlbGV0ZSBmcm9tIGluZGV4IFxuICAgICAgICAgIC8vZGVsZXRlIGhhc2ggXG4gICAgICAgIH0pO1xuICAgIH1cbiAgICBlbmFibGVVc2VyKHVzZXJuYW1lLGVuYWJsZWQpe1xuICAgICAgICByZXR1cm4gbmV3IFByb21pc2UgKGZ1bmN0aW9uKHJlc29sdmUscmVqZWN0KXtcbiAgICAgICAgICAgIGNsaWVudC5obXNldChQUkVGSVgrdXNlcm5hbWUse2VuYWJsZWQ6ZW5hYmxlZH0sKGVycixyZXN1bHQpPT57XG4gICAgICAgICAgICAgICAgaWYgKGVycil7XG4gICAgICAgICAgICAgICAgICAgIHJlc29sdmUoe3VwZGF0ZWQ6ZmFsc2V9KVxuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICBlbHNlIHtcbiAgICAgICAgICAgICAgICAgICAgcmVzb2x2ZSh7dXBkYXRlZDp0cnVlfSlcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9KTsgXG4gICAgICAgICAgICBcbiAgICAgICAgfSk7XG4gICAgfVxuICAgIHNhdmVVc2VyKHVzZXIpe1xuICAgICAgIHZhciBzcnYgPSB0aGlzOyBcbiAgICAgICAgcmV0dXJuIG5ldyBQcm9taXNlIChmdW5jdGlvbihyZXNvbHZlLHJlamVjdCl7XG4gICAgICAgICAgICBzcnYuY2hlY2tVc2VybmFtZSh1c2VyLnVzZXJuYW1lKS50aGVuKHZhbGlkPT57XG4gICAgICAgICAgICAgICAgY29uc29sZS5sb2codmFsaWQpXG4gICAgICAgICAgICAgICAgaWYgKHZhbGlkLnRha2VuID09IGZhbHNlKXtcbiAgICAgICAgICAgICAgICAgICAgLy9jcmVhdGUgdGhlIGhhc2ggXG4gICAgICAgICAgICAgICAgICAgIGNsaWVudC5pbmNyKFVTRVJJRENPVU5URVIsKGVycixpZCk9PntcbiAgICAgICAgICAgICAgICAgICAgICAgIHVzZXIuaWQgPSBpZDsgXG4gICAgICAgICAgICAgICAgICAgICAgICB1c2VyLnBhc3N3b3JkID0gYmNyeXB0Lmhhc2hTeW5jKHVzZXIucGFzc3dvcmQsMTApOyBcbiAgICAgICAgICAgICAgICAgICAgICAgIGxyZWRpcy5obXNldChQUkVGSVgrdXNlci51c2VybmFtZSx1c2VyKVxuICAgICAgICAgICAgICAgICAgICAgICAgYWRkVXNlclRvSW5kZXgodXNlcixzcnYucmVkaXNJbmRleFNlYXJjaCk7IFxuICAgICAgICAgICAgICAgICAgICAgICAgcmVzb2x2ZSh7c2F2ZWQ6dHJ1ZSxcIm1lc3NhZ2VcIjpcInNhdmVkIHN1Y2Nlc3NmdWxseS5cIn0pXG4gICAgICAgICAgICAgICAgICAgIH0pXG4gICAgICAgICAgICAgICAgICAgIFxuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICBlbHNlIHtcbiAgICAgICAgICAgICAgICAgICAgLy91cGRhdGUgdGhlIHVzZXIgXG4gICAgICAgICAgICAgICAgICAgIC8vcHJlcGFyZSB0aGUgcm9sZXMgd2UgYXJlIGdvaW5nIHRvIGdldCBhbiBhcnJhIFxuICAgICAgICAgICAgICAgICAgIFxuICAgICAgICAgICAgICAgICAgICBcbiAgICAgICAgICAgICAgICAgICAgaWYgKCF1c2VyLnBhc3N3b3JkIHx8IHVzZXIucGFzc3dvcmQgPT0gXCJcIil7XG4gICAgICAgICAgICAgICAgICAgICAgICBkZWxldGUgdXNlci5wYXNzd29yZDsgXG4gICAgICAgICAgICAgICAgICAgIH1lbHNlIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIGNvbnNvbGUubG9nKCd1cGRhdGluZyB1c2VyJyx1c2VyKVxuICAgICAgICAgICAgICAgICAgICAgICAgdXNlci5wYXNzd29yZCA9IGJjcnlwdC5oYXNoU3luYyh1c2VyLnBhc3N3b3JkLDEwKTsgXG4gICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICBcblxuXG4gICAgICAgICAgICAgICAgICAgIGNsaWVudC5obXNldChQUkVGSVgrdXNlci51c2VybmFtZSx1c2VyKVxuICAgICAgICAgICAgICAgICAgICBzcnYucmVkaXNJbmRleFNlYXJjaC51cGRhdGUodXNlci5pZCx1c2VyLChlcnIscmVwbHkpPT57XG4gICAgICAgICAgICAgICAgICAgICAgICBpZihlcnIpXG4gICAgICAgICAgICAgICAgICAgICAgICAge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICBjb25zb2xlLmxvZyhlcnIpXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgcmVzb2x2ZSh7c2F2ZWQ6ZmFsc2UsXCJtZXNzYWdlXCI6XCJVc2VybmFtZSBlcnJcIn0pXG4gICAgICAgICAgICAgICAgICAgICAgICAgfSAgIFxuICAgICAgICAgICAgICAgICAgICAgICAgZWxzZSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICBcbiAgICAgICAgICAgICAgICAgICAgICAgICAgIFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHJlc29sdmUoe3NhdmVkOnRydWUsXCJtZXNzYWdlXCI6XCJVc2VyIHVwZGF0ZWQuXCJ9KVxuICAgICAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICAgICAgXG4gICAgICAgICAgICAgICAgICAgIH0pXG4gICAgICAgICAgICAgICAgICAgIFxuICAgICAgICAgICAgICAgICAgICBcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9KVxuICAgICAgICAgICAgXG4gICAgICAgIH0pO1xuICAgIH1cbiAgICB2ZXJpZnlUb2tlbiAodG9rZW4pe1xuICAgICAgICByZXR1cm4gbmV3IFByb21pc2UoZnVuY3Rpb24ocmVzbG92ZSxyZWplY3Qpe1xuICAgICAgICAgICAgdHJ5IHtcbiAgICAgICAgICAgICAgICB2YXIgZGVjb2RlZEpXVCA9IGp3dC52ZXJpZnkodG9rZW4sJ3NpbHZlcjEyMy4nKTtcbiAgICAgICAgICAgICAgICB2YXIgYnl0ZXMgPSBjcnlwdG9qcy5BRVMuZGVjcnlwdChkZWNvZGVkSldULnRva2VuLCdTaWx2ZXIxMjMnKTtcbiAgICAgICAgICAgICAgICB2YXIgdG9rZW5EYXRhID0gSlNPTi5wYXJzZShieXRlcy50b1N0cmluZyhjcnlwdG9qcy5lbmMuVXRmOCkpO1xuICAgICAgICAgICAgICAgIC8qICBjb25zb2xlLmxvZygndG9rZW4gZGF0YSBiZWxvdycpO1xuICAgICAgICAgICAgICAgICBjb25zb2xlLmxvZyh0b2tlbkRhdGEpOyovXG4gICAgICAgICAgICAgICAgcmVzbG92ZSh0b2tlbkRhdGEpO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgY2F0Y2goZSl7XG4gICAgICAgICAgICAgICAgY29uc29sZS5sb2coZSxcInVuYWJsZSB0byB2ZXJpZnkgdG9rZW5cIilcbiAgICAgICAgICAgICAgICByZWplY3QoKTtcbiAgICAgICAgICAgIH1cblxuICAgICAgICB9KTtcbiAgICB9XG4gICAgY2hlY2tVc2VybmFtZSh1c2VybmFtZSl7XG4gICAgICAgIHJldHVybiBuZXcgUHJvbWlzZSgocmVzb2x2ZSxyZWplY3QpPT57XG4gICAgICAgICAgICAvL3dlIGNhbiBjaGVjayBpbiAyIHdheXMgb25lIHNlZSBpZiB0aGUgaGFzaCBleGlzdHMgXG4gICAgICAgICAgICBjbGllbnQuZXhpc3RzKFBSRUZJWCt1c2VybmFtZSwoZXJyLHJlc3VsdHMpPT57XG4gICAgICAgICAgICAgICAgY29uc29sZS5sb2cocmVzdWx0cylcbiAgICAgICAgICAgICAgICBpZiAoTnVtYmVyKHJlc3VsdHMpID09IDEpe1xuICAgICAgICAgICAgICAgICAgICByZXNvbHZlKHt0YWtlbjp0cnVlfSlcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgZWxzZVxuICAgICAgICAgICAgICAgICAgICByZXNvbHZlKHt0YWtlbjpmYWxzZX0pXG4gICAgICAgICAgICB9KVxuICAgICAgICB9KVxuICAgIH1cbiAgICBnZW5lcmF0ZVRva2VuICh1c2VyKXtcbiAgICAgICAgcmV0dXJuIG5ldyBQcm9taXNlKGZ1bmN0aW9uKHJlc29sdmUscmVqZWN0KXtcblxuICAgICAgICAgICAgdmFyIHN0cmluZ0RhdGEgPSBKU09OLnN0cmluZ2lmeSh1c2VyKTtcbiAgICAgICAgICAgIHZhciBlbmNyeXB0ZWREYXRhID0gY3J5cHRvanMuQUVTLmVuY3J5cHQoc3RyaW5nRGF0YSwnU2lsdmVyMTIzJykudG9TdHJpbmcoKTtcblxuICAgICAgICAgICAgdmFyIHRva2VuID0gand0LnNpZ24oe1xuICAgICAgICAgICAgICAgIHRva2VuOmVuY3J5cHRlZERhdGFcbiAgICAgICAgICAgIH0sICdzaWx2ZXIxMjMuJyk7XG4gICAgICAgICAgICByZXNvbHZlKCB0b2tlbik7XG4gICAgICAgIH0pO1xuXG4gICAgfVxufVxuXG4vL2NvbnZlclxuZnVuY3Rpb24gQ29udmVydFJvbGVzVG9TdHJpbmcocm9sZXNBcnJheSl7XG4gICAgdmFyIGFsbFBlcm1pc3Npb25zID0gXCJcIjsgXG4gICAgcm9sZXNBcnJheS5mb3JFYWNoKHJvbGUgPT4ge1xuICAgICAgICBhbGxQZXJtaXNzaW9ucyArPSByb2xlICtcIixcIlxuICAgIH0pO1xuICAgIGFsbFBlcm1pc3Npb25zID0gYWxsUGVybWlzc2lvbnMuc3Vic3RyaW5nKDAsYWxsUGVybWlzc2lvbnMubGVuZ3RoLTEpOyBcbiAgICBjb25zb2xlLmxvZyhhbGxQZXJtaXNzaW9ucylcbn1cbmZ1bmN0aW9uIGNyZWF0ZURvY3VtZW50KGFjY291bnQpe1xuICAgIHZhciBjdXN0b21lckRvY3VtZW50ID0geyBcbiAgICAgICAgaWQgOiBhY2NvdW50LmlkLFxuICAgICAgICB1c2VybmFtZTphY2NvdW50LnVzZXJuYW1lLFxuICAgICAgICBlbWFpbDogYWNjb3VudC5lbWFpbCwgXG4gICAgICAgIGZpcnN0TmFtZSA6IGFjY291bnQuZmlyc3ROYW1lLCBcbiAgICAgICAgbGFzdE5hbWU6IGFjY291bnQubGFzdE5hbWUsXG4gICAgICAgIHBhc3N3b3JkOmFjY291bnQucGFzc3dvcmQsXG4gICAgICAgIG1vYmlsZTogYWNjb3VudC5tb2JpbGUsXG4gICAgICAgIHJvbGU6IGFjY291bnQucm9sZVxuICAgIH1cbiAgICBjb25zb2xlLmxvZyhjdXN0b21lckRvY3VtZW50KVxuICAgIHJldHVybiBjdXN0b21lckRvY3VtZW50OyBcbiB9XG4gZnVuY3Rpb24gYWRkVXNlclRvSW5kZXgoYWNjb3VudCwgc2VhcmNoT2JqKXtcbiAgICAgdmFyIHVzZXJEb2N1bWVudCA9IGNyZWF0ZURvY3VtZW50KGFjY291bnQpOyBcbiAgICAgc2VhcmNoT2JqLmFkZChhY2NvdW50LmlkLHVzZXJEb2N1bWVudCk7IFxuIH0iXX0=
