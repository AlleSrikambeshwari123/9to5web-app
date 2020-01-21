'use strict';

var _moment = require('moment');

var redis = require('redis');
var lredis = require('./redis-local');
var redisSearch = require('../redisearchclient/index');
var PREFIX = "pmb:";
var CUST_ID = "customer:id";
var dataContext = require('./dataContext');
var INDEX = "index:customers";

var customerIndex = redisSearch(redis, INDEX, {
    clientOptions: dataContext.clientOptions
});

class CustomerService {
    constructor() {
        this.mySearch = redisSearch(redis, INDEX, {
            clientOptions: lredis.searchClientDetails
        });
        dataContext.redisClient.get(CUST_ID, function (err, id) {
            if (Number(id) < 50000) {
                dataContext.redisClient.set(CUST_ID, "50000");
            }
        });
    }

    listCustomers(page, pageSize) {
        var _this = this;

        return new Promise(function (resolve, reject) {
            var offsetVal = (page - 1) * pageSize;
            console.log('offset ' + offsetVal);

            _this.mySearch.search("@id:[0 50000]", {
                offset: offsetVal,
                numberOfResults: 50000

            }, function (r1, data) {
                if (r1) console.log(r1);
                var customers = [];
                data.results.forEach(function (customerResult) {
                    customers.push(customerResult.doc);
                });
                console.log(customers);
                var pagedData = {
                    customers: customers,
                    totalResults: data.totalResults,
                    page: page,
                    pageSize: pageSize,
                    TotalPages: data.totalResults / pageSize
                };
                resolve(pagedData);
                console.log(customers);
            });
        });
    }
    findCustomer(query) {
        return new Promise(function (resolve, reject) {
            customerIndex.search('(@name:\'' + query + '*\')|(@pmb:\'' + query + '*\')', { offset: 0, numberOfResults: 1000 }, function (err, results) {
                if (err) {
                    console.log(err);
                    resolve({ customer: [] });
                    return;
                }
                if (!results) { }
                console.log('results', results);

                var customers = [];
                results.results.forEach(function (customer) {
                    customers.push(customer.doc);
                });
                console.log(customers);
                resolve({ customer: customers });
            });
        });
    }
    searchCustomers(search, page, pageSize) {
        var _this2 = this;

        return new Promise(function (resolve, reject) {
            var offsetVal = (page - 1) * pageSize;
            console.log('offset ' + offsetVal);

            _this2.mySearch.search(search.replace("@", " ") + '*', {
                offset: offsetVal,
                numberOfResults: pageSize
                // sortBy: "name",
                // dir : "ASC"
            }, function (r1, data) {
                console.log(data);
                var customers = [];
                data.results.forEach(function (customerResult) {
                    customers.push(customerResult.doc);
                });
                console.log(customers);
                var pagedData = {
                    customers: customers,
                    totalResults: data.totalResults,
                    page: page,
                    pageSize: pageSize,
                    TotalPages: data.totalResults / pageSize
                };
                resolve(pagedData);
                //Promise.all()
                console.log(customers);
                // Promise.all(customers.map(lredis.hgetall)).then(function (ownersResult) {
                //     console.log(ownersResult);

                // });

                //console.log(r2); 
            });
        });
    }
    getCustomer(skybox) {
        var _this3 = this;

        return new Promise(function (resolve, reject) {
            _this3.mySearch.getDoc(skybox, function (err, customerDoc) {

                if (customerDoc.doc.pmb == '') customerDoc.doc.pmb = '9000';
                console.log(customerDoc, 'looking up the customer');
                resolve(customerDoc.doc);
            });
        });
    }
    saveCustomer(customer) {
        var srv = this;
        return new Promise(function (resolve, reject) {
            if (customer.id) {

                srv.mySearch.update(customer.id, customer, function (err, result) {
                    resolve({ saved: true });
                });
            } else {
                //create new 
                dataContext.redisClient.incr(CUST_ID, function (err, id) {
                    customer.id = id;
                    srv.mySearch.add(id, customer, function (err, result) {
                        resolve({ saved: true });
                    });
                });
            }
        });
    }
}

module.exports = CustomerService;