'use strict';
require('dotenv').config();

var moment = require('moment');
var bcrypt = require('bcrypt');
var utils = require('../Util/utils');
const strings = require('../Res/strings');

var lredis = require('./redis-local');
var client = require('./dataContext').redisClient;

var PREFIX = "customers:";
var ID_COUNTER = "id:customer";

class CustomerService {
    signUp(customer) {
        return new Promise((resolve, reject) => {
            this.getCustomerWithEmail(customer.email).then(existingCustomer => {
                if (existingCustomer.id) {
                    resolve({ success: false, message: "Account already exists" });
                } else {
                    client.incr(ID_COUNTER, (err, id) => {
                        customer.id = id;
                        customer.password = bcrypt.hashSync(customer.password, 10);
                        client.hmset(PREFIX + id, customer, (err, result) => {
                            if (err) resolve({ success: false, message: strings.string_response_error });
                            resolve({ success: true, message: strings.string_response_created });
                        })
                    })
                }
            })
        });
    }

    login(email, password) {
        return new Promise((resolve, reject) => {
            this.getCustomerWithEmail(email).then(customer => {
                if (customer.id == undefined) {
                    resolve({ authenticated: false, message: strings.string_not_found_customer });
                } else {
                    bcrypt.compare(password, customer.password, (err, same) => {
                        if (same) {
                            delete customer.password;
                            utils.generateToken(customer).then(token => {
                                resolve({ authenticated: true, token: token, user: customer });
                            });
                        } else {
                            resolve({ authenticated: false, message: strings.string_password_incorrect });
                        }
                    })
                }
            })
        })
    }

    getCustomers() {
        return new Promise((resolve, reject) => {
            client.keys(PREFIX + '*', (err, keys) => {
                console.log(keys);
                Promise.all(keys.map(key => {
                    return lredis.hgetall(key);
                })).then(customers => {
                    resolve(customers);
                })
            })
        })
    }

    getCustomer(id) {
        return new Promise((resolve, reject) => {
            client.hgetall(PREFIX + id, (err, customer) => {
                if (err) resolve({});
                resolve(customer);
            })
        });
    }
    getCustomerWithEmail(email) {
        return new Promise((resolve, reject) => {
            lredis.search(PREFIX, 'email', email).then(results => {
                if (results.length == 0) resolve({});
                else resolve(results[0]);
            })
        });
    }
    updateCustomer(id, body) {
        return new Promise((resolve, reject) => {
            client.exists(PREFIX + id, (err, exist) => {
                if (err) resolve({ success: false, message: strings.string_response_error });
                if (Number(exist) == 1) {
                    client.hmset(PREFIX + id, body);
                    resolve({ success: true, message: strings.string_response_updated });
                } else
                    resolve({ success: true, message: strings.string_not_found_customer });
            })
        })
    }
    removeCustomer(id) {
        return new Promise((resolve, reject) => {
            client.del(PREFIX + id, (err, result) => {
                if (err) resolve({ success: false, message: strings.string_response_error });
                resolve({ success: true, message: strings.string_response_removed });
            })
        });
    }
}

module.exports = CustomerService;