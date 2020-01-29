const strings = require('../Res/strings');

// Redis
var client = require('./dataContext').redisClient;
var lredis = require('./redis-local');

const PREFIX = strings.redis_prefix_pilot;
const PILOT_ID = strings.redis_id_pilot;
const PILOT_LIST = strings.redis_prefix_pilot_list;

class PilotService {
    addPilot(pilot) {
        return new Promise((resolve, reject) => {
            client.incr(PILOT_ID, (err, id) => {
                if (err) resolve({ success: false, message: strings.string_response_error });
                pilot.id = id;
                client.sadd(PILOT_LIST + pilot.warehouse, id);
                client.hmset(PREFIX + id, pilot, (err, result) => {
                    if (err) resolve({ success: false, message: strings.string_response_error });
                    resolve({ success: true, message: strings.string_response_added });
                })
            })
        })
    }
    updatePilot(id, pilot) {
        return new Promise((resolve, reject) => {
            client.exists(PREFIX + id, (err, exist) => {
                if (Number(exist) == 1) {
                    client.hmset(PREFIX + id, pilot);
                    resolve({ success: true, message: strings.string_response_updated });
                } else {
                    resolve({ success: false, message: strings.string_not_found_user });
                }
            });
        });
    }
    getPilots() {
        return new Promise((resolve, reject) => {
            client.keys(PREFIX + '*', (err, keys) => {
                if (err) resolve([]);
                Promise.all(keys.map(key => {
                    return lredis.hgetall(key);
                })).then(pilots => {
                    resolve(pilots);
                })
            })
        });
    }
    getPilotsWarehouse(warehouse) {
        return new Promise((resolve, reject) => {
            client.smembers(PILOT_LIST + warehouse, (err, ids) => {
                if (err) resolve([]);
                Promise.all(ids.map(id => {
                    return lredis.hgetall(PREFIX + id);
                })).then(pilots => {
                    resolve(pilots);
                })
            })
        });
    }
    getPilot(id) {
        return new Promise((resolve, reject) => {
            client.hgetall(PREFIX + id, (err, pilot) => {
                if (err) resolve({});
                resolve(pilot);
            })
        })
    }
    removePilot(id) {
        return new Promise((resolve, reject) => {
            client.del(PREFIX + id, (err, result) => {
                if (err) resolve({ success: false, message: strings.string_response_error });
                resolve({ success: true, message: strings.string_response_removed });
            })
        });
    }
}
module.exports = PilotService;