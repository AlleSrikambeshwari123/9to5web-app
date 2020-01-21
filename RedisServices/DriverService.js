'use strict';

var dataContext = require('./dataContext');
var redis = require('redis');
var PREFIX = "driver:";
var DRIVER_ID = "driver:id";
var redisSearch = require('../redisearchclient');
var DRIVER_INDEX = "index:drivers";
var rs = redisSearch(redis, DRIVER_INDEX, {
    clientOptions: dataContext.clientOptions
});

class DriverService {
    getDrivers() {
        return new Promise(function (resolve, rejct) {
            rs.search('*', {
                offset: 0,
                numberOfResults: 1000,
                sortBy: "lastName",
                dir: "DESC"
            }, function (err, results) {
                var drivers = [];
                results.results.forEach(function (driverDocument) {
                    drivers.push(driverDocument.doc);
                });
                resolve({ drivers: drivers });
            });
        });
    }
    findDriver(query) {
        return new Promise(function (resolve, reject) {
            rs.search(query, { offset: 0, numberOfResults: 1000 }, function (err, drivers) {
                //array 
                var fDrivers = [];
                drivers.results.forEach(function (driverDocument) {
                    fDrivers.push(driverDocument.doc);
                });

                resolve({ drivers: fDrivers });
            });
        });
    }
    getDriver(driverId) {
        return new Promise(function (resolve, reject) {
            if (driverId) {
                rs.search("@id:" + driverId, {
                    offset: 0,
                    numberOfResults: 1

                }, function (err, driverRes) {
                    if (driverRes.results.length == 1) {
                        resolve({ driver: driverRes.results[0].doc });
                    } else {
                        resolve({ driver: {} });
                    }
                });
            }
        });
    }
    createDriver(driver) {
        return new Promise(function (resolve, reject) {
            dataContext.redisClient.incr(DRIVER_ID, function (err, id) {
                driver.id = id;
                dataContext.redisClient.hmset(DRIVER + id, driver);
                rs.add(id, driver, function (err, result) {
                    resolve({ saved: true });
                });
            });
        });
    }
    updateDriver(driver) {
        return new Promise(function (resolve, reject) {
            rs.update(driver.id, driver, (err, result));
        });
    }
    removeDriver(id) {
        return new Promise(function (resolve, reject) {

            rs.del(id, function (err, restult) {
                dataContext.redisClient.del(PREFIX + id);
                resolve({ deleted: true });
            });
        });
    }
}
module.exports = DriverService;