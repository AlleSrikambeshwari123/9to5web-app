
const strings = require('../Res/strings');

var client = require('./dataContext').redisClient;
var lredis = require('./redis-local');

const PREFIX = strings.redis_prefix_shipper;
const SHIPPER_ID = strings.redis_id_shipper;

class ShipperService {
    getShipmentId() {
        return new Promise((resolve, reject) => {
            client.incr("rec:truck:id", (err, reply) => {
                resolve(reply);
            })
        })
    }
    addShipper(shipper) {
        return new Promise((resolve, reject) => {
            client.incr(SHIPPER_ID, (err, id) => {
                if (err) resolve({ success: false, message: strings.string_response_error });
                shipper.id = id;
                client.hmset(PREFIX + id, shipper, (err, result) => {
                    if (err) resolve({ success: false, message: strings.string_response_error });
                    resolve({ success: true, message: strings.string_response_added });
                })
            })
        })
    }
    getAllShippers() {
        return new Promise((resolve, reject) => {
            client.keys(PREFIX + '*', (err, keys) => {
                if (err) resolve([]);
                Promise.all(keys.map(key => {
                    return lredis.hgetall(key);
                })).then(shippers => {
                    resolve(shippers);
                })
            })
        })
    }
}

module.exports = ShipperService;