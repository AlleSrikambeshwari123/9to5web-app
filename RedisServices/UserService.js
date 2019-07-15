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
//# sourceMappingURL=data:application/json;charset=utf8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIlJlZGlzU2VydmljZXMvVXNlclNlcnZpY2UuZXM2Il0sIm5hbWVzIjpbImNyeXB0b2pzIiwicmVxdWlyZSIsImp3dCIsInJlZGlzIiwibHJlZGlzIiwibW9tZW50IiwicmVkaXNTZWFyY2giLCJTRVJWSUNFX0tFWSIsImJjcnlwdCIsIlBSRUZJWCIsIklOREVYIiwiVVNFUklEQ09VTlRFUiIsImNsaWVudCIsImNyZWF0ZUNsaWVudCIsImF1dGhfcGFzcyIsInRscyIsInNlcnZlcm5hbWUiLCJVc2VyU2VydmljZSIsInJlZGlzSW5kZXhTZWFyY2giLCJjbGllbnRPcHRpb25zIiwic2VhcmNoQ2xpZW50RGV0YWlscyIsInVzZXJuYW1lIiwicGFzc3dvcmQiLCJzcnYiLCJjb25zb2xlIiwibG9nIiwiUHJvbWlzZSIsInJlc29sdmUiLCJyZWplY3QiLCJoZ2V0YWxsIiwiZXJyIiwicmVzdWx0IiwiY29tcGFyZSIsInB3ZFJlc3VsdCIsImdlbmVyYXRlVG9rZW4iLCJ0aGVuIiwidXNlciIsInRva2VuIiwidmFsaWQiLCJyb2xlSWQiLCJwYWdlU2l6ZSIsImN1cnJlbnRQYWdlIiwib2Zmc2V0Iiwic2VhcmNoIiwibnVtYmVyT2ZSZXN1bHRzIiwic29ydEJ5IiwiZGlyIiwicmVzdWx0cyIsInVzZXJzIiwiZm9yRWFjaCIsImVsZW1lbnQiLCJkb2MiLCJwdXNoIiwiaWR4IiwiZGVsZXRlIiwiaWQiLCJyZW1vdmVkIiwiZW5hYmxlZCIsImhtc2V0IiwidXBkYXRlZCIsImNoZWNrVXNlcm5hbWUiLCJ0YWtlbiIsImluY3IiLCJoYXNoU3luYyIsImFkZFVzZXJUb0luZGV4Iiwic2F2ZWQiLCJyZXNsb3ZlIiwiZGVjb2RlZEpXVCIsInZlcmlmeSIsImJ5dGVzIiwiQUVTIiwiZGVjcnlwdCIsInRva2VuRGF0YSIsIkpTT04iLCJwYXJzZSIsInRvU3RyaW5nIiwiZW5jIiwiVXRmOCIsImUiLCJleGlzdHMiLCJOdW1iZXIiLCJzdHJpbmdEYXRhIiwic3RyaW5naWZ5IiwiZW5jcnlwdGVkRGF0YSIsImVuY3J5cHQiLCJzaWduIiwiY3JlYXRlRG9jdW1lbnQiLCJhY2NvdW50IiwiY3VzdG9tZXJEb2N1bWVudCIsImVtYWlsIiwiZmlyc3ROYW1lIiwibGFzdE5hbWUiLCJtb2JpbGUiLCJyb2xlIiwic2VhcmNoT2JqIiwidXNlckRvY3VtZW50IiwiYWRkIl0sIm1hcHBpbmdzIjoiOzs7Ozs7Ozs7O0FBQUEsSUFBSUEsV0FBWUMsUUFBUSxXQUFSLENBQWhCO0FBQ0EsSUFBSUMsTUFBTUQsUUFBUSxjQUFSLENBQVY7QUFDQSxJQUFJRSxRQUFRRixRQUFRLE9BQVIsQ0FBWjtBQUNBLElBQUlHLFNBQVNILFFBQVEsZUFBUixDQUFiO0FBQ0EsSUFBSUksU0FBU0osUUFBUSxRQUFSLENBQWI7QUFDQSxJQUFJSyxjQUFjTCxRQUFRLHFCQUFSLENBQWxCO0FBQ0EsSUFBTU0sY0FBYyxPQUFwQjtBQUNBLElBQUlDLFNBQVNQLFFBQVEsUUFBUixDQUFiO0FBQ0EsSUFBTVEsU0FBVSxPQUFoQjtBQUNBLElBQU1DLFFBQVEsYUFBZDtBQUNBLElBQU1DLGdCQUFnQixTQUF0QjtBQUNBLElBQUlDLFNBQVNULE1BQU1VLFlBQU4sQ0FBbUIsSUFBbkIsRUFBeUIsdUJBQXpCLEVBQWtEO0FBQzNEQyxlQUFXLFlBRGdEO0FBRTNEQyxTQUFJO0FBQ0FDLG9CQUFZO0FBRFo7QUFGdUQsQ0FBbEQsQ0FBYjs7SUFNYUMsVyxXQUFBQSxXO0FBQ1QsMkJBQWE7QUFBQTs7QUFDVCxhQUFLQyxnQkFBTCxHQUF3QlosWUFBWUgsS0FBWixFQUFtQixhQUFuQixFQUFrQztBQUN0RGdCLDJCQUFjZixPQUFPZ0I7QUFEaUMsU0FBbEMsQ0FBeEI7QUFHSDs7OztxQ0FDYUMsUSxFQUFTQyxRLEVBQVM7QUFDNUIsZ0JBQUlDLE1BQU0sSUFBVjtBQUNBQyxvQkFBUUMsR0FBUixDQUFZLGVBQVo7QUFDQSxtQkFBTyxJQUFJQyxPQUFKLENBQVksVUFBU0MsT0FBVCxFQUFpQkMsTUFBakIsRUFBd0I7O0FBRXZDaEIsdUJBQU9pQixP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UUFBUUksUUFMQztBQU1uQnJFLGtCQUFTaUUsUUFBUWpFLFFBTkU7QUFPbkJzRSxnQkFBUUwsUUFBUUssTUFQRztBQVFuQkMsY0FBTU4sUUFBUU07QUFSSyxLQUF2QjtBQVVBckUsWUFBUUMsR0FBUixDQUFZK0QsZ0JBQVo7QUFDQSxXQUFPQSxnQkFBUDtBQUNGO0FBQ0QsU0FBU3hCLGNBQVQsQ0FBd0J1QixPQUF4QixFQUFpQ08sU0FBakMsRUFBMkM7QUFDdkMsUUFBSUMsZUFBZVQsZUFBZUMsT0FBZixDQUFuQjtBQUNBTyxjQUFVRSxHQUFWLENBQWNULFFBQVFoQyxFQUF0QixFQUF5QndDLFlBQXpCO0FBQ0giLCJmaWxlIjoiUmVkaXNTZXJ2aWNlcy9Vc2VyU2VydmljZS5qcyIsInNvdXJjZXNDb250ZW50IjpbInZhciBjcnlwdG9qcyAgPSByZXF1aXJlKCdjcnlwdG8tanMnKTtcbnZhciBqd3QgPSByZXF1aXJlKCdqc29ud2VidG9rZW4nKTtcbnZhciByZWRpcyA9IHJlcXVpcmUoJ3JlZGlzJyk7XG52YXIgbHJlZGlzID0gcmVxdWlyZSgnLi9yZWRpcy1sb2NhbCcpO1xudmFyIG1vbWVudCA9IHJlcXVpcmUoJ21vbWVudCcpO1xudmFyIHJlZGlzU2VhcmNoID0gcmVxdWlyZSgnLi4vcmVkaXNlYXJjaGNsaWVudCcpO1xuY29uc3QgU0VSVklDRV9LRVkgPSAndXNlcnMnO1xudmFyIGJjcnlwdCA9IHJlcXVpcmUoJ2JjcnlwdCcpOyBcbmNvbnN0IFBSRUZJWCAgPSBcInVzZXI6XCJcbmNvbnN0IElOREVYID0gXCJpbmRleDp1c2Vyc1wiXG5jb25zdCBVU0VSSURDT1VOVEVSID0gXCJ1c2VyOmlkXCI7IFxudmFyIGNsaWVudCA9IHJlZGlzLmNyZWF0ZUNsaWVudCg2Mzc5LCBcImNvcmUuc2hpcHRyb3BpY2FsLmNvbVwiLCB7XG4gICAgYXV0aF9wYXNzOiAnU2lsdmVyMTIzLicsXG4gICAgdGxzOntcbiAgICAgICAgc2VydmVybmFtZTogJ2NvcmUuc2hpcHRyb3BpY2FsLmNvbSdcbiAgICB9XG59KTtcbmV4cG9ydCBjbGFzcyBVc2VyU2VydmljZSB7XG4gICAgY29uc3RydWN0b3IoKXtcbiAgICAgICAgdGhpcy5yZWRpc0luZGV4U2VhcmNoID0gcmVkaXNTZWFyY2gocmVkaXMsICdpbmRleDp1c2VycycsIHtcbiAgICAgICAgICAgIGNsaWVudE9wdGlvbnM6bHJlZGlzLnNlYXJjaENsaWVudERldGFpbHNcbiAgICAgICAgfSk7XG4gICAgfVxuICAgIGF1dGhlbnRpY2F0ZSAodXNlcm5hbWUscGFzc3dvcmQpe1xuICAgICAgICB2YXIgc3J2ID0gdGhpczsgXG4gICAgICAgIGNvbnNvbGUubG9nKCdhYm91dCB0byBhdXRoJylcbiAgICAgICAgcmV0dXJuIG5ldyBQcm9taXNlKGZ1bmN0aW9uKHJlc29sdmUscmVqZWN0KXtcbiAgICAgICAgICAgXG4gICAgICAgICAgICBjbGllbnQuaGdldGFsbChQUkVGSVgrdXNlcm5hbWUsKGVycixyZXN1bHQpPT57XG5cbiAgICAgICAgICAgICAgICBjb25zb2xlLmxvZyhyZXN1bHQsIFwiaXMgdGhlIHJlc3VsdHNcIik7IFxuICAgICAgICAgICAgICAgIGlmIChyZXN1bHQpe1xuICAgICAgICAgICAgICAgICAgICBjb25zb2xlLmxvZyhyZXN1bHQpO1xuICAgICAgICAgICAgICAgICAgICBiY3J5cHQuY29tcGFyZShwYXNzd29yZCxyZXN1bHQucGFzc3dvcmQsKGVycixwd2RSZXN1bHQpPT57XG4gICAgICAgICAgICAgICAgICAgICAgICBpZiAoZXJyKXtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBjb25zb2xlLmxvZyhlcnIpOyBcblxuICAgICAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICAgICAgaWYocHdkUmVzdWx0ID09IHRydWUpe1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGRlbGV0ZSByZXN1bHQucGFzc3dvcmQ7IFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHNydi5nZW5lcmF0ZVRva2VuKHJlc3VsdCkudGhlbih0b2tlbj0+e1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICByZXNvbHZlKHt1c2VyOnJlc3VsdCx0b2tlbjp0b2tlbix2YWxpZDp0cnVlfSlcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICB9KTtcbiAgICAgICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgICAgIGVsc2Uge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHJlc29sdmUoe3VzZXI6bnVsbCx0b2tlbjpcIlwiLHZhbGlkOmZhbHNlfSlcbiAgICAgICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgICAgXG4gICAgICAgICAgICAgICAgICAgICAgIFxuICAgICAgICAgICAgICAgICAgICB9KVxuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICBlbHNle1xuICAgICAgICAgICAgICAgICAgICByZXNvbHZlKHt1c2VyOm51bGwsdG9rZW46XCJcIix2YWxpZDpmYWxzZX0pXG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfSk7IFxuICAgICAgICAgICAgXG4gICAgICAgICAgICBcbiAgICAgICAgfSk7XG4gICAgfVxuICAgIGdldFVzZXIodXNlcm5hbWUpe1xuICAgICAgICByZXR1cm4gbmV3IFByb21pc2UgKGZ1bmN0aW9uKHJlc29sdmUscmVqZWN0KXtcbiAgICAgICAgICAgIGNsaWVudC5oZ2V0YWxsKFBSRUZJWCt1c2VybmFtZSwoZXJyLHJlc3VsdCk9PntcbiAgICAgICAgICAgICAgICBpZiAocmVzdWx0KXtcbiAgICAgICAgICAgICAgICAgICAgZGVsZXRlIHJlc3VsdC5wYXNzd29yZDsgXG4gICAgICAgICAgICAgICAgICAgIHJlc29sdmUoe3VzZXI6cmVzdWx0fSlcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9KVxuICAgICAgICAgXG4gICAgICAgIH0pO1xuICAgIH1cbiAgICBnZXRVc2Vyc0luUm9sZShyb2xlSWQpe1xuICAgICAgICByZXR1cm4gbmV3IFByb21pc2UgKGZ1bmN0aW9uKHJlc29sdmUscmVqZWN0KXtcblxuICAgICAgICAgICAgLy8gZGF0YUNvbnRleHQuZ2V0U2VydmljZVByb3h5KFNFUlZJQ0VfS0VZKS5nZXRVc2Vyc0J5Um9sZSh7cm9sZUlkOnJvbGVJZH0sZnVuY3Rpb24oZXJyb3IscmVzdWx0KXtcbiAgICAgICAgICAgIC8vICAgICBpZiAoZXJyb3Ipe1xuICAgICAgICAgICAgLy8gICAgICAgICByZWplY3QoZXJyb3IpO1xuICAgICAgICAgICAgLy8gICAgIH1cbiAgICAgICAgICAgIC8vICAgICByZXNvbHZlKCByZXN1bHQpO1xuICAgICAgICAgICAgLy8gfSk7XG4gICAgICAgIH0pO1xuICAgIH1cbiAgICBnZXRSb2xlcygpe1xuICAgICAgICByZXR1cm4gbmV3IFByb21pc2UgKGZ1bmN0aW9uKHJlc29sdmUscmVqZWN0KXtcblxuICAgICAgICAgICAgcmVzb2x2ZShbXCJBZG1pblwiLFwiV2FyZWhvdXNlIE1JQVwiLFwiQ3VzdG9tcyBBZ2VudFwiLFwiV2FyZWhvdXNlIFRUXCIsXCJDYXNoaWVyXCIsXCJMb2NhdGlvbiBNYW5hZ2VyXCJdKVxuICAgICAgICAgICAgXG4gICAgICAgIH0pO1xuICAgIH1cbiAgICBnZXRBbGxVc2VycyhwYWdlU2l6ZSxjdXJyZW50UGFnZSl7XG4gICAgICAgIHZhciBzcnYgPSB0aGlzOyBcbiAgICAgICAgcmV0dXJuIG5ldyBQcm9taXNlIChmdW5jdGlvbihyZXNvbHZlLHJlamVjdCl7XG4gICAgICAgICAgICB2YXIgb2Zmc2V0XG4gICAgICAgICAgIHNydi5yZWRpc0luZGV4U2VhcmNoLnNlYXJjaCgnKicse1xuICAgICAgICAgICAgb2Zmc2V0OjAsXG4gICAgICAgICAgICBudW1iZXJPZlJlc3VsdHM6IDEwMDAsXG4gICAgICAgICAgICBzb3J0Qnk6IFwibGFzdE5hbWVcIixcbiAgICAgICAgICAgIGRpcjogXCJBU0NcIlxuICAgICAgICB9LChlcnIscmVzdWx0cyk9PntcbiAgICAgICAgICAgIHZhciB1c2VycyA9IFtdO1xuICAgICAgICAgICAgICAgIHJlc3VsdHMucmVzdWx0cy5mb3JFYWNoKGVsZW1lbnQgPT4ge1xuICAgICAgICAgICAgICAgICAgICBkZWxldGUgZWxlbWVudC5kb2MucGFzc3dvcmRcbiAgICAgICAgICAgICAgICAgICAgdXNlcnMucHVzaChlbGVtZW50LmRvYyk7IFxuICAgICAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgICAgIHJlc29sdmUodXNlcnMpXG4gICAgICAgIH0pXG4gICAgICAgIH0pO1xuICAgIH1cbiAgICByZW1vdmVVc2VyKHVzZXJuYW1lKXtcbiAgICAgICAgcmV0dXJuIG5ldyBQcm9taXNlIChmdW5jdGlvbihyZXNvbHZlLHJlamVjdCl7XG4gICAgICAgICAgICB2YXIgaWR4PSB0aGlzLnJlZGlzSW5kZXhTZWFyY2g7IFxuICAgICAgICBscmVkaXMuaGdldGFsbChQUkVGSVgrdXNlcm5hbWUpLnRoZW4odXNlcj0+e1xuICAgICAgICAgICAgaWR4LmRlbGV0ZSh1c2VyLmlkKTsgXG4gICAgICAgICAgICBjbGllbnQuZGVsZXRlKFBSRUZJWCt1c2VybmFtZSwoZXJyLHJlc3VsdCk9PntcbiAgICAgICAgICAgICAgICBpZiAoZXJyKXtcbiAgICAgICAgICAgICAgICAgICAgY29uc29sZS5sb2coXCJ1bmFibGUgdG8gZGVsZXRlXCIpOyBcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgcmVzb2x2ZSh7cmVtb3ZlZDp0cnVlfSlcbiAgICAgICAgICAgIH0pXG4gICAgICAgIH0pXG4gICAgICAgICAgLy9maW5kIHRoZSB1c2VyIGJ5IHVzZXJuYW1lIFxuICAgICAgICAgIC8vZ2V0IHRoZSBkb2MgSWQgXG4gICAgICAgICAgLy9kZWxldGUgZnJvbSBpbmRleCBcbiAgICAgICAgICAvL2RlbGV0ZSBoYXNoIFxuICAgICAgICB9KTtcbiAgICB9XG4gICAgZW5hYmxlVXNlcih1c2VybmFtZSxlbmFibGVkKXtcbiAgICAgICAgcmV0dXJuIG5ldyBQcm9taXNlIChmdW5jdGlvbihyZXNvbHZlLHJlamVjdCl7XG4gICAgICAgICAgICBjbGllbnQuaG1zZXQoUFJFRklYK3VzZXJuYW1lLHtlbmFibGVkOmVuYWJsZWR9LChlcnIscmVzdWx0KT0+e1xuICAgICAgICAgICAgICAgIGlmIChlcnIpe1xuICAgICAgICAgICAgICAgICAgICByZXNvbHZlKHt1cGRhdGVkOmZhbHNlfSlcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgZWxzZSB7XG4gICAgICAgICAgICAgICAgICAgIHJlc29sdmUoe3VwZGF0ZWQ6dHJ1ZX0pXG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfSk7IFxuICAgICAgICAgICAgXG4gICAgICAgIH0pO1xuICAgIH1cbiAgICBzYXZlVXNlcih1c2VyKXtcbiAgICAgICB2YXIgc3J2ID0gdGhpczsgXG4gICAgICAgIHJldHVybiBuZXcgUHJvbWlzZSAoZnVuY3Rpb24ocmVzb2x2ZSxyZWplY3Qpe1xuICAgICAgICAgICAgc3J2LmNoZWNrVXNlcm5hbWUodXNlci51c2VybmFtZSkudGhlbih2YWxpZD0+e1xuICAgICAgICAgICAgICAgIGNvbnNvbGUubG9nKHZhbGlkKVxuICAgICAgICAgICAgICAgIGlmICh2YWxpZC50YWtlbiA9PSBmYWxzZSl7XG4gICAgICAgICAgICAgICAgICAgIC8vY3JlYXRlIHRoZSBoYXNoIFxuICAgICAgICAgICAgICAgICAgICBjbGllbnQuaW5jcihVU0VSSURDT1VOVEVSLChlcnIsaWQpPT57XG4gICAgICAgICAgICAgICAgICAgICAgICB1c2VyLmlkID0gaWQ7IFxuICAgICAgICAgICAgICAgICAgICAgICAgdXNlci5wYXNzd29yZCA9IGJjcnlwdC5oYXNoU3luYyh1c2VyLnBhc3N3b3JkLDEwKTsgXG4gICAgICAgICAgICAgICAgICAgICAgICBscmVkaXMuaG1zZXQoUFJFRklYK3VzZXIudXNlcm5hbWUsdXNlcilcbiAgICAgICAgICAgICAgICAgICAgICAgIGFkZFVzZXJUb0luZGV4KHVzZXIsc3J2LnJlZGlzSW5kZXhTZWFyY2gpOyBcbiAgICAgICAgICAgICAgICAgICAgfSlcbiAgICAgICAgICAgICAgICAgICAgXG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIGVsc2Uge1xuICAgICAgICAgICAgICAgICAgICAvL3VwZGF0ZSB0aGUgdXNlciBcbiAgICAgICAgICAgICAgICAgICAgcmVzb2x2ZSh7c2F2ZWQ6ZmFsc2UsXCJtZXNzYWdlXCI6XCJVc2VybmFtZSB0YWtlblwifSlcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9KVxuICAgICAgICAgICAgLy8gZGF0YUNvbnRleHQuZ2V0U2VydmljZVByb3h5KFNFUlZJQ0VfS0VZKS5zYXZlVXNlcih1c2VyLGZ1bmN0aW9uKGVycm9yLHJlc3VsdCl7XG4gICAgICAgICAgICAvLyAgICAgaWYgKGVycm9yKXtcbiAgICAgICAgICAgIC8vICAgICAgICAgcmVqZWN0KGVycm9yKTtcbiAgICAgICAgICAgIC8vICAgICB9XG4gICAgICAgICAgICAvLyAgICAgcmVzb2x2ZSggcmVzdWx0KTtcbiAgICAgICAgICAgIC8vIH0pO1xuICAgICAgICB9KTtcbiAgICB9XG4gICAgdmVyaWZ5VG9rZW4gKHRva2VuKXtcbiAgICAgICAgcmV0dXJuIG5ldyBQcm9taXNlKGZ1bmN0aW9uKHJlc2xvdmUscmVqZWN0KXtcbiAgICAgICAgICAgIHRyeSB7XG4gICAgICAgICAgICAgICAgdmFyIGRlY29kZWRKV1QgPSBqd3QudmVyaWZ5KHRva2VuLCdzaWx2ZXIxMjMuJyk7XG4gICAgICAgICAgICAgICAgdmFyIGJ5dGVzID0gY3J5cHRvanMuQUVTLmRlY3J5cHQoZGVjb2RlZEpXVC50b2tlbiwnU2lsdmVyMTIzJyk7XG4gICAgICAgICAgICAgICAgdmFyIHRva2VuRGF0YSA9IEpTT04ucGFyc2UoYnl0ZXMudG9TdHJpbmcoY3J5cHRvanMuZW5jLlV0ZjgpKTtcbiAgICAgICAgICAgICAgICAvKiAgY29uc29sZS5sb2coJ3Rva2VuIGRhdGEgYmVsb3cnKTtcbiAgICAgICAgICAgICAgICAgY29uc29sZS5sb2codG9rZW5EYXRhKTsqL1xuICAgICAgICAgICAgICAgIHJlc2xvdmUodG9rZW5EYXRhKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIGNhdGNoKGUpe1xuICAgICAgICAgICAgICAgIGNvbnNvbGUubG9nKGUsXCJ1bmFibGUgdG8gdmVyaWZ5IHRva2VuXCIpXG4gICAgICAgICAgICAgICAgcmVqZWN0KCk7XG4gICAgICAgICAgICB9XG5cbiAgICAgICAgfSk7XG4gICAgfVxuICAgIGNoZWNrVXNlcm5hbWUodXNlcm5hbWUpe1xuICAgICAgICByZXR1cm4gbmV3IFByb21pc2UoKHJlc29sdmUscmVqZWN0KT0+e1xuICAgICAgICAgICAgLy93ZSBjYW4gY2hlY2sgaW4gMiB3YXlzIG9uZSBzZWUgaWYgdGhlIGhhc2ggZXhpc3RzIFxuICAgICAgICAgICAgY2xpZW50LmV4aXN0cyhQUkVGSVgrdXNlcm5hbWUsKGVycixyZXN1bHRzKT0+e1xuICAgICAgICAgICAgICAgIGNvbnNvbGUubG9nKHJlc3VsdHMpXG4gICAgICAgICAgICAgICAgaWYgKE51bWJlcihyZXN1bHRzKSA9PSAxKXtcbiAgICAgICAgICAgICAgICAgICAgcmVzb2x2ZSh7dGFrZW46dHJ1ZX0pXG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIGVsc2VcbiAgICAgICAgICAgICAgICAgICAgcmVzb2x2ZSh7dGFrZW46ZmFsc2V9KVxuICAgICAgICAgICAgfSlcbiAgICAgICAgfSlcbiAgICB9XG4gICAgZ2VuZXJhdGVUb2tlbiAodXNlcil7XG4gICAgICAgIHJldHVybiBuZXcgUHJvbWlzZShmdW5jdGlvbihyZXNvbHZlLHJlamVjdCl7XG5cbiAgICAgICAgICAgIHZhciBzdHJpbmdEYXRhID0gSlNPTi5zdHJpbmdpZnkodXNlcik7XG4gICAgICAgICAgICB2YXIgZW5jcnlwdGVkRGF0YSA9IGNyeXB0b2pzLkFFUy5lbmNyeXB0KHN0cmluZ0RhdGEsJ1NpbHZlcjEyMycpLnRvU3RyaW5nKCk7XG5cbiAgICAgICAgICAgIHZhciB0b2tlbiA9IGp3dC5zaWduKHtcbiAgICAgICAgICAgICAgICB0b2tlbjplbmNyeXB0ZWREYXRhXG4gICAgICAgICAgICB9LCAnc2lsdmVyMTIzLicpO1xuICAgICAgICAgICAgcmVzb2x2ZSggdG9rZW4pO1xuICAgICAgICB9KTtcblxuICAgIH1cbn1cbmZ1bmN0aW9uIGNyZWF0ZURvY3VtZW50KGFjY291bnQpe1xuICAgIHZhciBjdXN0b21lckRvY3VtZW50ID0geyBcbiAgICAgICAgaWQgOiBhY2NvdW50LmlkLFxuICAgICAgICB1c2VybmFtZTphY2NvdW50LnVzZXJuYW1lLFxuICAgICAgICBlbWFpbDogYWNjb3VudC5lbWFpbCwgXG4gICAgICAgIGZpcnN0TmFtZSA6IGFjY291bnQuZmlyc3ROYW1lLCBcbiAgICAgICAgbGFzdE5hbWU6IGFjY291bnQubGFzdE5hbWUsXG4gICAgICAgIHBhc3N3b3JkOmFjY291bnQucGFzc3dvcmQsXG4gICAgICAgIG1vYmlsZTogYWNjb3VudC5tb2JpbGUsXG4gICAgICAgIHJvbGU6IGFjY291bnQucm9sZVxuICAgIH1cbiAgICBjb25zb2xlLmxvZyhjdXN0b21lckRvY3VtZW50KVxuICAgIHJldHVybiBjdXN0b21lckRvY3VtZW50OyBcbiB9XG4gZnVuY3Rpb24gYWRkVXNlclRvSW5kZXgoYWNjb3VudCwgc2VhcmNoT2JqKXtcbiAgICAgdmFyIHVzZXJEb2N1bWVudCA9IGNyZWF0ZURvY3VtZW50KGFjY291bnQpOyBcbiAgICAgc2VhcmNoT2JqLmFkZChhY2NvdW50LmlkLHVzZXJEb2N1bWVudCk7IFxuIH0iXX0=
