'use strict';

var cryptojs = require('crypto-js');
var jwt = require('jsonwebtoken');
var bcrypt = require('bcrypt');
const strings = require('../Res/strings');
var utils = require('../Util/utils');

// Redis
var client = require('./dataContext').redisClient;
var lredis = require('./redis-local');

var PREFIX = strings.redis_prefix_user;
var ID_COUNTER = strings.redis_id_user;

class UserService {
    changePassword(username, newpassword, oldpassword) {
        return new Promise((resolve, reject) => {
            this.authenticate(username, oldpassword).then((userInfo) => {
                if (userInfo.valid == true) {
                    client.hmset(PREFIX + username, { password: bcrypt.hashSync(newpassword, 10) }, function (err, result) {
                        if (err) resolve({ success: false, message: strings.string_response_error });
                        resolve({ success: true, message: strings.string_response_updated });
                    });
                } else resolve({ success: false, message: strings.string_password_incorrect });
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
                            utils.generateToken(result).then(function (token) {
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
            client.hgetall(PREFIX + username, (err, user) => {
                if (err) resolve({});
                resolve(user);
            });
        });
    }
    getRoles() {
        return new Promise(function (resolve, reject) {
            resolve([
                strings.role_admin,
                strings.role_warehouse_fl,
                strings.role_warehouse_nas,
                strings.role_customer_agent,
                strings.role_location_manager,
                strings.role_cashier,
            ])
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
                    resolve({ success: false, message: strings.string_response_error });
                } else {
                    resolve({ success: true, message: strings.string_response_updated });
                }
            });
        });
    }

    createUser(user) {
        return new Promise((resolve, reject) => {
            this.checkUsername(user.username).then(valid => {
                if (valid.exist) {
                    resolve({ success: false, message: strings.string_user_exist });
                } else {
                    client.incr(ID_COUNTER, (err, id) => {
                        user.id = id;
                        user.password = bcrypt.hashSync(user.password, 10);
                        delete user.confirmPassword;
                        client.hmset(PREFIX + user.username, user);
                        resolve({ success: true, message: strings.string_response_created });
                    })
                }
            })
        })
    }
    updateUser(user) {
        return new Promise((resolve, reject) => {
            this.checkUsername(user.username).then(function (valid) {
                if (valid.exist) {
                    client.hmset(PREFIX + user.username, user);
                    resolve({ success: true, message: strings.string_response_updated });
                } else {
                    resolve({ success: false, message: strings.string_not_found_user });
                }
            });
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