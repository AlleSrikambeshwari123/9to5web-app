
var redis = require('redis');
var lredis = require('./redis-local');
var redisSearch = require('redisearchclient');
const PREFIX = "vehicle:"
const INDEX = "index:vehicles"
const VEHICLE_ID = "vehicle:id";
const dataContext = require('./dataContext');
const rs = redisSearch(redis, INDEX, {
    clientOptions: dataContext.clientOptions
});

class VehicleService {
    constructor() {

    }
    addVehicle(vechile) {
        return new Promise((resolve, reject) => {
            dataContext.redisClient.incr(VEHICLE_ID, (err, id) => {
                vechile.id = id;
                dataContext.redisClient.hmset(PREFIX + id, vechile);
                rs.add(id, vechile, (err, results) => {
                    resolve({ saved: true });
                });
            })
        })
    }
    updateVehicle(vechile) {
        return new Promise((resolve, reject) => {
            dataContext.redisClient.hmset(PREFIX + id, vechile);
            rs.update(vechile.id, vechile, (err, saved) => {
                resolve({ saved: true })
            })
        })
    }
    rmVechile(id) {
        return new Promise((resolve, reject) => {
            dataContext.redisClient.del(PREFIX + id);
            rs.delDocument(INDEX, id, (err, delResult) => {
                resolve({ deleted: true });
            })
        })
    }
    getVehicle(id) {
        return new Promise((resolve, reject) => {
            dataContext.redisClient.hgetall(PREFIX + id, (err, v) => {
                resolve({ vehicle: v });
            })
        })
    }
    getVehicles() {
        return new Promise((resolve, reject) => {
            rs.search("*", {}, (err, vResults) => {
                var vehilces = [];
                vResults.results.forEach(vehicle => {
                    vehilces.push(vehicle.doc);
                });
                resolve({ vehicles: vehilces });
            })
        })
    }
    getVehicleByCountry(country) {
        return new Promise((resolve, reject) => {
            rs.search("@country:" + country, {}, (err, vResults) => {
                var vehilces = [];
                vResults.results.forEach(vehicle => {
                    vehilces.push(vehicle.doc);
                });
                resolve({ vehicles: vehilces });
            })
        })
    }
}

module.exports = VehicleService;