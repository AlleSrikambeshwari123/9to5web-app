'use strict';

var cryptojs = require('crypto-js');
var jwt = require('jsonwebtoken');
var moment = require('moment');
var SERVICE_KEY = 'users';
var bcrypt = require('bcrypt');
const strings = require('../Res/strings');

// Redis
var client = require('./dataContext').redisClient;
var lredis = require('./redis-local');

var PREFIX = "user:";
var INDEX = "index:users";
var USERIDCOUNTER = "user:id";

class UserService {
    changePassword(username, newpassword, oldpassword) {
        return new Promise((resolve, reject) => {
            this.authenticate(username, oldpassword).then((userInfo) => {
                if (userInfo.valid == "true" || userInfo.valid == true) {
                    client.hmset(PREFIX + username, { password: bcrypt.hashSync(newpassword, 10) }, function (err, result) {
                        if (err) {
                            resolve({ updated: false });
                        }
                        resolve({ updated: true });
                    });
                } else {
                    resolve({ updated: false });
                }
            });
        });
    }
    authenticate(username, password) {
        return new Promise((resolve, reject) => {
            client.hgetall(PREFIX + username, (err, result) => {
                if (err) {
                    resolve({ valid: false, token: "", user: null });
                }
                if (result) {
                    bcrypt.compare(password, result.password, (err, pwdsame) => {
                        if (err) resolve({ valid: false, token: "", user: null });
                        if (pwdsame) {
                            delete result.password;
                            this.generateToken(result).then(function (token) {
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
    getUser(username) {
        return new Promise(function (resolve, reject) {
            client.hgetall(PREFIX + username, function (err, result) {
                if (result) {
                    delete result.password;
                    resolve({ user: result });
                } else resolve({ user: { username: '', firstName: '', lastName: '', email: '', mobile: '' } });
            });
        });
    }
    getUsersInRole(roleId) {
        return new Promise(function (resolve, reject) {

            // dataContext.getServiceProxy(SERVICE_KEY).getUsersByRole({roleId:roleId},function(error,result){
            //     if (error){
            //         reject(error);
            //     }
            //     resolve( result);
            // });
        });
    }
    getRoles() {
        return new Promise(function (resolve, reject) {
            resolve(["Admin", "Warehouse FLL", "Customs Agent", "Warehouse BAHAMAS", "Cashier", "Location Manager"]);
        });
    }
    getAllUsers() {
        return new Promise((resolve, reject) => {
            this.removeUser('id').then(result => {
                client.keys(PREFIX + '*', (err, keys) => {
                    if (err) resolve([]);
                    Promise.all(keys.map(key => {
                        return lredis.hgetall(key);
                    })).then(users => {
                        users.forEach(user => delete user.password);
                        resolve(users);
                    })
                })
            })
        });
    }
    removeUser(username) {
        return new Promise((resolve, reject) => {
            client.del(PREFIX + username, (err, result) => {
                if (err) resolve({ success: false, message: strings.string_response_error });
                resolve({ success: true, message: strings.string_response_removed });
            })
        });
    }
    enableUser(username, enabled) {
        return new Promise((resolve, reject) => {
            client.hmset(PREFIX + username, { enabled: enabled }, (err, result) => {
                if (err) {
                    resolve({ updated: false, message: strings.string_response_error });
                } else {
                    resolve({ updated: true, message: strings.string_response_updated });
                }
            });
        });
    }

    createUser(user) {
        return new Promise((resolve, reject) => {
            this.checkUsername(user.username).then(valid => {
                if (valid.exist) {
                    client.incr(USERIDCOUNTER, (err, id) => {
                        user.id = id;
                        user.password = bcrypt.hashSync(user.password, 10);
                        client.hmset(PREFIX + user.username, user);
                        resolve({ saved: true, message: strings.string_response_created });
                    })
                }
            })
        })
    }
    saveUser(user) {
        return new Promise((resolve, reject) => {
            srv.checkUsername(user.username).then(function (valid) {
                if (valid.exist) {
                    client.hmset(PREFIX + user.username, user);
                    resolve({ saved: true, message: strings.string_response_updated });
                } else {
                    resolve({ success: false, message: strings.string_user_not_found });
                }
                // if (valid.taken == false) {
                //     //create the hash 
                //     client.incr(USERIDCOUNTER, function (err, id) {
                //         user.id = id;
                //         user.password = bcrypt.hashSync(user.password, 10);
                //         lredis.hmset(PREFIX + user.username, user);
                //         addUserToIndex(user, srv.redisIndexSearch);
                //         resolve({ saved: true, "message": "saved successfully." });
                //     });
                // } else {
                //     if (!user.password || user.password == "") {
                //         delete user.password;
                //     } else {
                //         console.log('updating user', user);
                //         user.password = bcrypt.hashSync(user.password, 10);
                //     }

                //     client.hmset(PREFIX + user.username, user);
                //     srv.redisIndexSearch.update(user.id, user, function (err, reply) {
                //         if (err) {
                //             console.log(err);
                //             resolve({ saved: false, "message": "Username err" });
                //         } else {

                //             resolve({ saved: true, "message": "User updated." });
                //         }
                //     });
                // }
            });
        });
    }
    verifyToken(token) {
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
    checkUsername(username) {
        return new Promise((resolve, reject) => {
            client.exists(PREFIX + username, (err, results) => {
                if (err) resolve({ exist: false });
                if (Number(results) == 1)
                    resolve({ exist: true });
                else
                    resolve({ exist: false });
            });
        });
    }
    generateToken(user) {
        return new Promise(function (resolve, reject) {

            var stringData = JSON.stringify(user);
            var encryptedData = cryptojs.AES.encrypt(stringData, 'Silver123').toString();

            var token = jwt.sign({
                token: encryptedData
            }, 'silver123.');
            resolve(token);
        });
    }
}

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

module.exports = UserService;