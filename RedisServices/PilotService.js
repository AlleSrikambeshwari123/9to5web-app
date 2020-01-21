var dataContext = require('./dataContext');
var redis = require('redis');
const PREFIX = "pilot:"
const PILOT_ID = "pilot:id"
var redisSearch = require('../redisearchclient');
var PILOT_INDEX = "index:pilots"
const rs = redisSearch(redis, PILOT_INDEX, {
    clientOptions: dataContext.clientOptions
});

class PilotService {
    constructor() {

    }
    addPilot(pilot) {
        return new Promise((resolve, reject) => {
            dataContext.redisClient.incr(PILOT_ID, (err, id) => {
                pilot.id = id;
                dataContext.redisClient.hmset(PREFIX + id, pilot, (errS, result) => {
                    rs.add(id, pilot);
                    resolve({ saved: true });
                })
            })
        })
    }
    updatePilot(pilot) {
        return new Promise((resolve, reject) => {
            dataContext.redisClient.hmset(PREFIX + pilot.id, pilot)
            rs.update(pilot.id, pilot);
        })
    }
    getPilots() {
        return new Promise((resolve, reject) => {
            rs.search("*", {}, (err, pilots) => {
                var rPilots = [];
                pilots.results.forEach(pilot => {
                    rPilots.push(pilot.doc);
                });
                resolve({ pilots: rPilots })
            });
        });
    }
    getPilot(id) {
        return new Promise((resolve, reject) => {
            dataContext.redisClient.hgetall(PREFIX + id, (err, p) => {
                resolve({ pilot: p });
            })
        })
    }
    rmPilot(id) {
        return new Promise((resolve, reject) => {
            dataContext.redisClient.del(PREFIX + id);
            rs.delDocument(PILOT_INDEX, id)
            resolve({ deleted: true })
        });
    }
}
module.exports = PilotService;