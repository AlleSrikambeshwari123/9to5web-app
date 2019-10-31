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
                        var roles = ConvertRolesToString(user.role);
                        srv.redisIndexSearch.update(user.id, user, function (err, reply) {
                            if (err) resolve({ saved: false, "message": "Username taken" });else {
                                if (!user.password || user.password == "") {
                                    delete user.password;
                                } else user.password = bcrypt.hashSync(user.password, 10);
                                client.hmset(PREFIX + user.username, user);
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
//# sourceMappingURL=data:application/json;charset=utf8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIlJlZGlzU2VydmljZXMvVXNlclNlcnZpY2UuZXM2Il0sIm5hbWVzIjpbImNyeXB0b2pzIiwicmVxdWlyZSIsImp3dCIsInJlZGlzIiwibHJlZGlzIiwibW9tZW50IiwicmVkaXNTZWFyY2giLCJTRVJWSUNFX0tFWSIsImJjcnlwdCIsIlBSRUZJWCIsIklOREVYIiwiVVNFUklEQ09VTlRFUiIsIkVOViIsImNsaWVudCIsImNyZWF0ZUNsaWVudCIsInJlZGlzX3BvcnQiLCJyZWRpc19ob3N0IiwiYXV0aF9wYXNzIiwicmVkaXNfcGFzcyIsIlVzZXJTZXJ2aWNlIiwicmVkaXNJbmRleFNlYXJjaCIsImNsaWVudE9wdGlvbnMiLCJzZWFyY2hDbGllbnREZXRhaWxzIiwidXNlcm5hbWUiLCJwYXNzd29yZCIsInNydiIsImNvbnNvbGUiLCJsb2ciLCJQcm9taXNlIiwicmVzb2x2ZSIsInJlamVjdCIsImhnZXRhbGwiLCJlcnIiLCJyZXN1bHQiLCJjb21wYXJlIiwicHdkUmVzdWx0IiwiZ2VuZXJhdGVUb2tlbiIsInRoZW4iLCJ1c2VyIiwidG9rZW4iLCJ2YWxpZCIsImZpcnN0TmFtZSIsImxhc3ROYW1lIiwiZW1haWwiLCJtb2JpbGUiLCJyb2xlSWQiLCJwYWdlU2l6ZSIsImN1cnJlbnRQYWdlIiwib2Zmc2V0Iiwic2VhcmNoIiwibnVtYmVyT2ZSZXN1bHRzIiwic29ydEJ5IiwiZGlyIiwicmVzdWx0cyIsInVzZXJzIiwiZm9yRWFjaCIsImVsZW1lbnQiLCJkb2MiLCJwdXNoIiwiaWR4IiwiZGVsZXRlIiwiaWQiLCJyZW1vdmVkIiwiZW5hYmxlZCIsImhtc2V0IiwidXBkYXRlZCIsImNoZWNrVXNlcm5hbWUiLCJ0YWtlbiIsImluY3IiLCJoYXNoU3luYyIsImFkZFVzZXJUb0luZGV4Iiwic2F2ZWQiLCJyb2xlcyIsIkNvbnZlcnRSb2xlc1RvU3RyaW5nIiwicm9sZSIsInVwZGF0ZSIsInJlcGx5IiwicmVzbG92ZSIsImRlY29kZWRKV1QiLCJ2ZXJpZnkiLCJieXRlcyIsIkFFUyIsImRlY3J5cHQiLCJ0b2tlbkRhdGEiLCJKU09OIiwicGFyc2UiLCJ0b1N0cmluZyIsImVuYyIsIlV0ZjgiLCJlIiwiZXhpc3RzIiwiTnVtYmVyIiwic3RyaW5nRGF0YSIsInN0cmluZ2lmeSIsImVuY3J5cHRlZERhdGEiLCJlbmNyeXB0Iiwic2lnbiIsInJvbGVzQXJyYXkiLCJhbGxQZXJtaXNzaW9ucyIsInN1YnN0cmluZyIsImxlbmd0aCIsImNyZWF0ZURvY3VtZW50IiwiYWNjb3VudCIsImN1c3RvbWVyRG9jdW1lbnQiLCJzZWFyY2hPYmoiLCJ1c2VyRG9jdW1lbnQiLCJhZGQiXSwibWFwcGluZ3MiOiI7Ozs7Ozs7Ozs7QUFBQSxJQUFJQSxXQUFZQyxRQUFRLFdBQVIsQ0FBaEI7QUFDQSxJQUFJQyxNQUFNRCxRQUFRLGNBQVIsQ0FBVjtBQUNBLElBQUlFLFFBQVFGLFFBQVEsT0FBUixDQUFaO0FBQ0EsSUFBSUcsU0FBU0gsUUFBUSxlQUFSLENBQWI7QUFDQSxJQUFJSSxTQUFTSixRQUFRLFFBQVIsQ0FBYjtBQUNBLElBQUlLLGNBQWNMLFFBQVEscUJBQVIsQ0FBbEI7QUFDQSxJQUFNTSxjQUFjLE9BQXBCO0FBQ0EsSUFBSUMsU0FBU1AsUUFBUSxRQUFSLENBQWI7QUFDQSxJQUFNUSxTQUFVLE9BQWhCO0FBQ0EsSUFBTUMsUUFBUSxhQUFkO0FBQ0EsSUFBTUMsZ0JBQWdCLFNBQXRCO0FBQ0EsSUFBTUMsTUFBTVgsUUFBUSxnQkFBUixDQUFaO0FBQ0EsSUFBSVksU0FBU1YsTUFBTVcsWUFBTixDQUFtQkYsSUFBSUcsVUFBdkIsRUFBbUNILElBQUlJLFVBQXZDLEVBQW1EO0FBQzVEQyxlQUFXTCxJQUFJTTtBQUNmO0FBQ0E7QUFDQTtBQUo0RCxDQUFuRCxDQUFiOztJQU1hQyxXLFdBQUFBLFc7QUFDVCwyQkFBYTtBQUFBOztBQUNULGFBQUtDLGdCQUFMLEdBQXdCZCxZQUFZSCxLQUFaLEVBQW1CLGFBQW5CLEVBQWtDO0FBQ3REa0IsMkJBQWNqQixPQUFPa0I7QUFEaUMsU0FBbEMsQ0FB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QUFZdUUsY0FBWjtBQUNIO0FBQ0QsU0FBU0csY0FBVCxDQUF3QkMsT0FBeEIsRUFBZ0M7QUFDNUIsUUFBSUMsbUJBQW1CO0FBQ25CMUMsWUFBS3lDLFFBQVF6QyxFQURNO0FBRW5CdEMsa0JBQVMrRSxRQUFRL0UsUUFGRTtBQUduQm9CLGVBQU8yRCxRQUFRM0QsS0FISTtBQUluQkYsbUJBQVk2RCxRQUFRN0QsU0FKRDtBQUtuQkMsa0JBQVU0RCxRQUFRNUQsUUFMQztBQU1uQmxCLGtCQUFTOEUsUUFBUTlFLFFBTkU7QUFPbkJvQixnQkFBUTBELFFBQVExRCxNQVBHO0FBUW5COEIsY0FBTTRCLFFBQVE1QjtBQVJLLEtBQXZCO0FBVUFoRCxZQUFRQyxHQUFSLENBQVk0RSxnQkFBWjtBQUNBLFdBQU9BLGdCQUFQO0FBQ0Y7QUFDRCxTQUFTakMsY0FBVCxDQUF3QmdDLE9BQXhCLEVBQWlDRSxTQUFqQyxFQUEyQztBQUN2QyxRQUFJQyxlQUFlSixlQUFlQyxPQUFmLENBQW5CO0FBQ0FFLGNBQVVFLEdBQVYsQ0FBY0osUUFBUXpDLEVBQXRCLEVBQXlCNEMsWUFBekI7QUFDSCIsImZpbGUiOiJSZWRpc1NlcnZpY2VzL1VzZXJTZXJ2aWNlLmpzIiwic291cmNlc0NvbnRlbnQiOlsidmFyIGNyeXB0b2pzICA9IHJlcXVpcmUoJ2NyeXB0by1qcycpO1xudmFyIGp3dCA9IHJlcXVpcmUoJ2pzb253ZWJ0b2tlbicpO1xudmFyIHJlZGlzID0gcmVxdWlyZSgncmVkaXMnKTtcbnZhciBscmVkaXMgPSByZXF1aXJlKCcuL3JlZGlzLWxvY2FsJyk7XG52YXIgbW9tZW50ID0gcmVxdWlyZSgnbW9tZW50Jyk7XG52YXIgcmVkaXNTZWFyY2ggPSByZXF1aXJlKCcuLi9yZWRpc2VhcmNoY2xpZW50Jyk7XG5jb25zdCBTRVJWSUNFX0tFWSA9ICd1c2Vycyc7XG52YXIgYmNyeXB0ID0gcmVxdWlyZSgnYmNyeXB0Jyk7IFxuY29uc3QgUFJFRklYICA9IFwidXNlcjpcIlxuY29uc3QgSU5ERVggPSBcImluZGV4OnVzZXJzXCJcbmNvbnN0IFVTRVJJRENPVU5URVIgPSBcInVzZXI6aWRcIjsgXG5jb25zdCBFTlYgPSByZXF1aXJlKCcuLi9lbnZpcm9ubWVudCcpXG52YXIgY2xpZW50ID0gcmVkaXMuY3JlYXRlQ2xpZW50KEVOVi5yZWRpc19wb3J0LCBFTlYucmVkaXNfaG9zdCwge1xuICAgIGF1dGhfcGFzczogRU5WLnJlZGlzX3Bhc3MsXG4gICAgLy8gdGxzOntcbiAgICAvLyAgICAgc2VydmVybmFtZTogJ2NvcmUuc2hpcHRyb3BpY2FsLmNvbSdcbiAgICAvLyB9IFxufSk7XG5leHBvcnQgY2xhc3MgVXNlclNlcnZpY2Uge1xuICAgIGNvbnN0cnVjdG9yKCl7XG4gICAgICAgIHRoaXMucmVkaXNJbmRleFNlYXJjaCA9IHJlZGlzU2VhcmNoKHJlZGlzLCAnaW5kZXg6dXNlcnMnLCB7XG4gICAgICAgICAgICBjbGllbnRPcHRpb25zOmxyZWRpcy5zZWFyY2hDbGllbnREZXRhaWxzXG4gICAgICAgIH0pO1xuICAgIH1cbiAgICBhdXRoZW50aWNhdGUgKHVzZXJuYW1lLHBhc3N3b3JkKXtcbiAgICAgICAgdmFyIHNydiA9IHRoaXM7IFxuICAgICAgICBjb25zb2xlLmxvZygnYWJvdXQgdG8gYXV0aCcpXG4gICAgICAgIHJldHVybiBuZXcgUHJvbWlzZShmdW5jdGlvbihyZXNvbHZlLHJlamVjdCl7XG4gICAgICAgICAgIFxuICAgICAgICAgICAgY2xpZW50LmhnZXRhbGwoUFJFRklYK3VzZXJuYW1lLChlcnIscmVzdWx0KT0+e1xuXG4gICAgICAgICAgICAgICAgY29uc29sZS5sb2cocmVzdWx0LCBcImlzIHRoZSByZXN1bHRzXCIpOyBcbiAgICAgICAgICAgICAgICBpZiAocmVzdWx0KXtcbiAgICAgICAgICAgICAgICAgICAgY29uc29sZS5sb2cocmVzdWx0KTtcbiAgICAgICAgICAgICAgICAgICAgYmNyeXB0LmNvbXBhcmUocGFzc3dvcmQscmVzdWx0LnBhc3N3b3JkLChlcnIscHdkUmVzdWx0KT0+e1xuICAgICAgICAgICAgICAgICAgICAgICAgaWYgKGVycil7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgY29uc29sZS5sb2coZXJyKTsgXG5cbiAgICAgICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgICAgIGlmKHB3ZFJlc3VsdCA9PSB0cnVlKXtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBkZWxldGUgcmVzdWx0LnBhc3N3b3JkOyBcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBzcnYuZ2VuZXJhdGVUb2tlbihyZXN1bHQpLnRoZW4odG9rZW49PntcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgcmVzb2x2ZSh7dXNlcjpyZXN1bHQsdG9rZW46dG9rZW4sdmFsaWQ6dHJ1ZX0pXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgICAgICBlbHNlIHsgXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgY29uc29sZS5sb2coXCJhdXRoIGZhaWxlZFwiKVxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHJlc29sdmUoe3VzZXI6bnVsbCx0b2tlbjpcIlwiLHZhbGlkOmZhbHNlfSlcbiAgICAgICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgICAgXG4gICAgICAgICAgICAgICAgICAgICAgIFxuICAgICAgICAgICAgICAgICAgICB9KVxuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICBlbHNle1xuICAgICAgICAgICAgICAgICAgICByZXNvbHZlKHt1c2VyOm51bGwsdG9rZW46XCJcIix2YWxpZDpmYWxzZX0pXG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfSk7IFxuICAgICAgICAgICAgXG4gICAgICAgICAgICBcbiAgICAgICAgfSk7XG4gICAgfVxuICAgIGdldFVzZXIodXNlcm5hbWUpe1xuICAgICAgICByZXR1cm4gbmV3IFByb21pc2UgKGZ1bmN0aW9uKHJlc29sdmUscmVqZWN0KXtcbiAgICAgICAgICAgIGNsaWVudC5oZ2V0YWxsKFBSRUZJWCt1c2VybmFtZSwoZXJyLHJlc3VsdCk9PntcbiAgICAgICAgICAgICAgICBpZiAocmVzdWx0KXtcbiAgICAgICAgICAgICAgICAgICAgZGVsZXRlIHJlc3VsdC5wYXNzd29yZDsgXG4gICAgICAgICAgICAgICAgICAgIHJlc29sdmUoe3VzZXI6cmVzdWx0fSlcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgZWxzZSByZXNvbHZlKHt1c2VyOnt1c2VybmFtZTonJyxmaXJzdE5hbWU6JycsbGFzdE5hbWU6JycsZW1haWw6JycsbW9iaWxlOicnfX0pXG4gICAgICAgICAgICB9KVxuICAgICAgICAgXG4gICAgICAgIH0pO1xuICAgIH1cbiAgICBnZXRVc2Vyc0luUm9sZShyb2xlSWQpe1xuICAgICAgICByZXR1cm4gbmV3IFByb21pc2UgKGZ1bmN0aW9uKHJlc29sdmUscmVqZWN0KXtcblxuICAgICAgICAgICAgLy8gZGF0YUNvbnRleHQuZ2V0U2VydmljZVByb3h5KFNFUlZJQ0VfS0VZKS5nZXRVc2Vyc0J5Um9sZSh7cm9sZUlkOnJvbGVJZH0sZnVuY3Rpb24oZXJyb3IscmVzdWx0KXtcbiAgICAgICAgICAgIC8vICAgICBpZiAoZXJyb3Ipe1xuICAgICAgICAgICAgLy8gICAgICAgICByZWplY3QoZXJyb3IpO1xuICAgICAgICAgICAgLy8gICAgIH1cbiAgICAgICAgICAgIC8vICAgICByZXNvbHZlKCByZXN1bHQpO1xuICAgICAgICAgICAgLy8gfSk7XG4gICAgICAgIH0pO1xuICAgIH1cbiAgICBnZXRSb2xlcygpe1xuICAgICAgICByZXR1cm4gbmV3IFByb21pc2UgKGZ1bmN0aW9uKHJlc29sdmUscmVqZWN0KXtcblxuICAgICAgICAgICAgcmVzb2x2ZShbXCJBZG1pblwiLFwiV2FyZWhvdXNlIEZMTFwiLFwiQ3VzdG9tcyBBZ2VudFwiLFwiV2FyZWhvdXNlIEJBSEFNQVNcIixcIkNhc2hpZXJcIixcIkxvY2F0aW9uIE1hbmFnZXJcIl0pXG4gICAgICAgICAgICBcbiAgICAgICAgfSk7XG4gICAgfVxuICAgIGdldEFsbFVzZXJzKHBhZ2VTaXplLGN1cnJlbnRQYWdlKXtcbiAgICAgICAgdmFyIHNydiA9IHRoaXM7IFxuICAgICAgICBjb25zb2xlLmxvZygnZ2V0dGluZyBhbGwgdXNlcnMnKVxuICAgICAgICByZXR1cm4gbmV3IFByb21pc2UgKGZ1bmN0aW9uKHJlc29sdmUscmVqZWN0KXtcbiAgICAgICAgICAgIHZhciBvZmZzZXRcbiAgICAgICAgICAgc3J2LnJlZGlzSW5kZXhTZWFyY2guc2VhcmNoKCcqJyx7XG4gICAgICAgICAgICBvZmZzZXQ6MCxcbiAgICAgICAgICAgIG51bWJlck9mUmVzdWx0czogMTAwMCxcbiAgICAgICAgICAgIHNvcnRCeTogXCJsYXN0TmFtZVwiLFxuICAgICAgICAgICAgZGlyOiBcIkFTQ1wiXG4gICAgICAgIH0sKGVycixyZXN1bHRzKT0+e1xuICAgICAgICAgICAgdmFyIHVzZXJzID0gW107XG4gICAgICAgICAgICAgICAgcmVzdWx0cy5yZXN1bHRzLmZvckVhY2goZWxlbWVudCA9PiB7XG4gICAgICAgICAgICAgICAgICAgIGRlbGV0ZSBlbGVtZW50LmRvYy5wYXNzd29yZFxuICAgICAgICAgICAgICAgICAgICB1c2Vycy5wdXNoKGVsZW1lbnQuZG9jKTsgXG4gICAgICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICAgICAgcmVzb2x2ZSh1c2VycylcbiAgICAgICAgfSlcbiAgICAgICAgfSk7XG4gICAgfVxuICAgIHJlbW92ZVVzZXIodXNlcm5hbWUpe1xuICAgICAgICByZXR1cm4gbmV3IFByb21pc2UgKGZ1bmN0aW9uKHJlc29sdmUscmVqZWN0KXtcbiAgICAgICAgICAgIHZhciBpZHg9IHRoaXMucmVkaXNJbmRleFNlYXJjaDsgXG4gICAgICAgIGxyZWRpcy5oZ2V0YWxsKFBSRUZJWCt1c2VybmFtZSkudGhlbih1c2VyPT57XG4gICAgICAgICAgICBpZHguZGVsZXRlKHVzZXIuaWQpOyBcbiAgICAgICAgICAgIGNsaWVudC5kZWxldGUoUFJFRklYK3VzZXJuYW1lLChlcnIscmVzdWx0KT0+e1xuICAgICAgICAgICAgICAgIGlmIChlcnIpe1xuICAgICAgICAgICAgICAgICAgICBjb25zb2xlLmxvZyhcInVuYWJsZSB0byBkZWxldGVcIik7IFxuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICByZXNvbHZlKHtyZW1vdmVkOnRydWV9KVxuICAgICAgICAgICAgfSlcbiAgICAgICAgfSlcbiAgICAgICAgICAvL2ZpbmQgdGhlIHVzZXIgYnkgdXNlcm5hbWUgXG4gICAgICAgICAgLy9nZXQgdGhlIGRvYyBJZCBcbiAgICAgICAgICAvL2RlbGV0ZSBmcm9tIGluZGV4IFxuICAgICAgICAgIC8vZGVsZXRlIGhhc2ggXG4gICAgICAgIH0pO1xuICAgIH1cbiAgICBlbmFibGVVc2VyKHVzZXJuYW1lLGVuYWJsZWQpe1xuICAgICAgICByZXR1cm4gbmV3IFByb21pc2UgKGZ1bmN0aW9uKHJlc29sdmUscmVqZWN0KXtcbiAgICAgICAgICAgIGNsaWVudC5obXNldChQUkVGSVgrdXNlcm5hbWUse2VuYWJsZWQ6ZW5hYmxlZH0sKGVycixyZXN1bHQpPT57XG4gICAgICAgICAgICAgICAgaWYgKGVycil7XG4gICAgICAgICAgICAgICAgICAgIHJlc29sdmUoe3VwZGF0ZWQ6ZmFsc2V9KVxuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICBlbHNlIHtcbiAgICAgICAgICAgICAgICAgICAgcmVzb2x2ZSh7dXBkYXRlZDp0cnVlfSlcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9KTsgXG4gICAgICAgICAgICBcbiAgICAgICAgfSk7XG4gICAgfVxuICAgIHNhdmVVc2VyKHVzZXIpe1xuICAgICAgIHZhciBzcnYgPSB0aGlzOyBcbiAgICAgICAgcmV0dXJuIG5ldyBQcm9taXNlIChmdW5jdGlvbihyZXNvbHZlLHJlamVjdCl7XG4gICAgICAgICAgICBzcnYuY2hlY2tVc2VybmFtZSh1c2VyLnVzZXJuYW1lKS50aGVuKHZhbGlkPT57XG4gICAgICAgICAgICAgICAgY29uc29sZS5sb2codmFsaWQpXG4gICAgICAgICAgICAgICAgaWYgKHZhbGlkLnRha2VuID09IGZhbHNlKXtcbiAgICAgICAgICAgICAgICAgICAgLy9jcmVhdGUgdGhlIGhhc2ggXG4gICAgICAgICAgICAgICAgICAgIGNsaWVudC5pbmNyKFVTRVJJRENPVU5URVIsKGVycixpZCk9PntcbiAgICAgICAgICAgICAgICAgICAgICAgIHVzZXIuaWQgPSBpZDsgXG4gICAgICAgICAgICAgICAgICAgICAgICB1c2VyLnBhc3N3b3JkID0gYmNyeXB0Lmhhc2hTeW5jKHVzZXIucGFzc3dvcmQsMTApOyBcbiAgICAgICAgICAgICAgICAgICAgICAgIGxyZWRpcy5obXNldChQUkVGSVgrdXNlci51c2VybmFtZSx1c2VyKVxuICAgICAgICAgICAgICAgICAgICAgICAgYWRkVXNlclRvSW5kZXgodXNlcixzcnYucmVkaXNJbmRleFNlYXJjaCk7IFxuICAgICAgICAgICAgICAgICAgICAgICAgcmVzb2x2ZSh7c2F2ZWQ6dHJ1ZSxcIm1lc3NhZ2VcIjpcInNhdmVkIHN1Y2Nlc3NmdWxseS5cIn0pXG4gICAgICAgICAgICAgICAgICAgIH0pXG4gICAgICAgICAgICAgICAgICAgIFxuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICBlbHNlIHtcbiAgICAgICAgICAgICAgICAgICAgLy91cGRhdGUgdGhlIHVzZXIgXG4gICAgICAgICAgICAgICAgICAgIC8vcHJlcGFyZSB0aGUgcm9sZXMgd2UgYXJlIGdvaW5nIHRvIGdldCBhbiBhcnJhIFxuICAgICAgICAgICAgICAgICAgICBjb25zdCByb2xlcyA9IENvbnZlcnRSb2xlc1RvU3RyaW5nKHVzZXIucm9sZSlcbiAgICAgICAgICAgICAgICAgICAgc3J2LnJlZGlzSW5kZXhTZWFyY2gudXBkYXRlKHVzZXIuaWQsdXNlciwoZXJyLHJlcGx5KT0+e1xuICAgICAgICAgICAgICAgICAgICAgICAgaWYoZXJyKVxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHJlc29sdmUoe3NhdmVkOmZhbHNlLFwibWVzc2FnZVwiOlwiVXNlcm5hbWUgdGFrZW5cIn0pXG4gICAgICAgICAgICAgICAgICAgICAgICBlbHNlIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBpZiAoIXVzZXIucGFzc3dvcmQgfHwgdXNlci5wYXNzd29yZCA9PSBcIlwiKXtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgZGVsZXRlIHVzZXIucGFzc3dvcmQ7IFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBlbHNlIFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB1c2VyLnBhc3N3b3JkID0gYmNyeXB0Lmhhc2hTeW5jKHVzZXIucGFzc3dvcmQsMTApOyBcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBjbGllbnQuaG1zZXQoUFJFRklYK3VzZXIudXNlcm5hbWUsdXNlcilcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICByZXNvbHZlKHtzYXZlZDp0cnVlLFwibWVzc2FnZVwiOlwiVXNlciB1cGRhdGVkLlwifSlcbiAgICAgICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgICAgIFxuICAgICAgICAgICAgICAgICAgICB9KVxuICAgICAgICAgICAgICAgICAgICBcbiAgICAgICAgICAgICAgICAgICAgXG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfSlcbiAgICAgICAgICAgIFxuICAgICAgICB9KTtcbiAgICB9XG4gICAgdmVyaWZ5VG9rZW4gKHRva2VuKXtcbiAgICAgICAgcmV0dXJuIG5ldyBQcm9taXNlKGZ1bmN0aW9uKHJlc2xvdmUscmVqZWN0KXtcbiAgICAgICAgICAgIHRyeSB7XG4gICAgICAgICAgICAgICAgdmFyIGRlY29kZWRKV1QgPSBqd3QudmVyaWZ5KHRva2VuLCdzaWx2ZXIxMjMuJyk7XG4gICAgICAgICAgICAgICAgdmFyIGJ5dGVzID0gY3J5cHRvanMuQUVTLmRlY3J5cHQoZGVjb2RlZEpXVC50b2tlbiwnU2lsdmVyMTIzJyk7XG4gICAgICAgICAgICAgICAgdmFyIHRva2VuRGF0YSA9IEpTT04ucGFyc2UoYnl0ZXMudG9TdHJpbmcoY3J5cHRvanMuZW5jLlV0ZjgpKTtcbiAgICAgICAgICAgICAgICAvKiAgY29uc29sZS5sb2coJ3Rva2VuIGRhdGEgYmVsb3cnKTtcbiAgICAgICAgICAgICAgICAgY29uc29sZS5sb2codG9rZW5EYXRhKTsqL1xuICAgICAgICAgICAgICAgIHJlc2xvdmUodG9rZW5EYXRhKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIGNhdGNoKGUpe1xuICAgICAgICAgICAgICAgIGNvbnNvbGUubG9nKGUsXCJ1bmFibGUgdG8gdmVyaWZ5IHRva2VuXCIpXG4gICAgICAgICAgICAgICAgcmVqZWN0KCk7XG4gICAgICAgICAgICB9XG5cbiAgICAgICAgfSk7XG4gICAgfVxuICAgIGNoZWNrVXNlcm5hbWUodXNlcm5hbWUpe1xuICAgICAgICByZXR1cm4gbmV3IFByb21pc2UoKHJlc29sdmUscmVqZWN0KT0+e1xuICAgICAgICAgICAgLy93ZSBjYW4gY2hlY2sgaW4gMiB3YXlzIG9uZSBzZWUgaWYgdGhlIGhhc2ggZXhpc3RzIFxuICAgICAgICAgICAgY2xpZW50LmV4aXN0cyhQUkVGSVgrdXNlcm5hbWUsKGVycixyZXN1bHRzKT0+e1xuICAgICAgICAgICAgICAgIGNvbnNvbGUubG9nKHJlc3VsdHMpXG4gICAgICAgICAgICAgICAgaWYgKE51bWJlcihyZXN1bHRzKSA9PSAxKXtcbiAgICAgICAgICAgICAgICAgICAgcmVzb2x2ZSh7dGFrZW46dHJ1ZX0pXG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIGVsc2VcbiAgICAgICAgICAgICAgICAgICAgcmVzb2x2ZSh7dGFrZW46ZmFsc2V9KVxuICAgICAgICAgICAgfSlcbiAgICAgICAgfSlcbiAgICB9XG4gICAgZ2VuZXJhdGVUb2tlbiAodXNlcil7XG4gICAgICAgIHJldHVybiBuZXcgUHJvbWlzZShmdW5jdGlvbihyZXNvbHZlLHJlamVjdCl7XG5cbiAgICAgICAgICAgIHZhciBzdHJpbmdEYXRhID0gSlNPTi5zdHJpbmdpZnkodXNlcik7XG4gICAgICAgICAgICB2YXIgZW5jcnlwdGVkRGF0YSA9IGNyeXB0b2pzLkFFUy5lbmNyeXB0KHN0cmluZ0RhdGEsJ1NpbHZlcjEyMycpLnRvU3RyaW5nKCk7XG5cbiAgICAgICAgICAgIHZhciB0b2tlbiA9IGp3dC5zaWduKHtcbiAgICAgICAgICAgICAgICB0b2tlbjplbmNyeXB0ZWREYXRhXG4gICAgICAgICAgICB9LCAnc2lsdmVyMTIzLicpO1xuICAgICAgICAgICAgcmVzb2x2ZSggdG9rZW4pO1xuICAgICAgICB9KTtcblxuICAgIH1cbn1cbmZ1bmN0aW9uIENvbnZlcnRSb2xlc1RvU3RyaW5nKHJvbGVzQXJyYXkpe1xuICAgIHZhciBhbGxQZXJtaXNzaW9ucyA9IFwiXCI7IFxuICAgIHJvbGVzQXJyYXkuZm9yRWFjaChyb2xlID0+IHtcbiAgICAgICAgYWxsUGVybWlzc2lvbnMgKz0gcm9sZSArXCIsXCJcbiAgICB9KTtcbiAgICBhbGxQZXJtaXNzaW9ucyA9IGFsbFBlcm1pc3Npb25zLnN1YnN0cmluZygwLGFsbFBlcm1pc3Npb25zLmxlbmd0aC0xKTsgXG4gICAgY29uc29sZS5sb2coYWxsUGVybWlzc2lvbnMpXG59XG5mdW5jdGlvbiBjcmVhdGVEb2N1bWVudChhY2NvdW50KXtcbiAgICB2YXIgY3VzdG9tZXJEb2N1bWVudCA9IHsgXG4gICAgICAgIGlkIDogYWNjb3VudC5pZCxcbiAgICAgICAgdXNlcm5hbWU6YWNjb3VudC51c2VybmFtZSxcbiAgICAgICAgZW1haWw6IGFjY291bnQuZW1haWwsIFxuICAgICAgICBmaXJzdE5hbWUgOiBhY2NvdW50LmZpcnN0TmFtZSwgXG4gICAgICAgIGxhc3ROYW1lOiBhY2NvdW50Lmxhc3ROYW1lLFxuICAgICAgICBwYXNzd29yZDphY2NvdW50LnBhc3N3b3JkLFxuICAgICAgICBtb2JpbGU6IGFjY291bnQubW9iaWxlLFxuICAgICAgICByb2xlOiBhY2NvdW50LnJvbGVcbiAgICB9XG4gICAgY29uc29sZS5sb2coY3VzdG9tZXJEb2N1bWVudClcbiAgICByZXR1cm4gY3VzdG9tZXJEb2N1bWVudDsgXG4gfVxuIGZ1bmN0aW9uIGFkZFVzZXJUb0luZGV4KGFjY291bnQsIHNlYXJjaE9iail7XG4gICAgIHZhciB1c2VyRG9jdW1lbnQgPSBjcmVhdGVEb2N1bWVudChhY2NvdW50KTsgXG4gICAgIHNlYXJjaE9iai5hZGQoYWNjb3VudC5pZCx1c2VyRG9jdW1lbnQpOyBcbiB9Il19
