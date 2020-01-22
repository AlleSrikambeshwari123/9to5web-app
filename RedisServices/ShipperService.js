
const strings = require('../Res/strings');
const csv = require('csvtojson');

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
    importShippersFromCsv() {
        return new Promise((resolve, reject) => {
            this.removeAll().then(result => {
                csv().fromFile("./DB_Seed/shipper.csv").then(jsonObj => {
                    Promise.all(jsonObj.map(element => {
                        console.log(element.sCarrierName);
                        client.incr(SHIPPER_ID, (err, id) => {
                            return lredis.hmset(PREFIX + id, {
                                id: id,
                                name: element.sCarrierName,
                                firstName: element.sContactFirstName,
                                lastName: element.sContactLastName,
                                telephone: element.sTelephone,
                                fax: element.sFaxNumber,
                                email: element.sEmail,
                                address: element.sAddress,
                                state: element.sState,
                                country: element.sCountry
                            });
                        });
                    })).then(result => {
                        resolve(result);
                    })
                })
            })
        });
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
    removeAll() {
        return new Promise((resolve, reject) => {
            client.keys(PREFIX + '*', (err, keys) => {
                if (err) resolve([]);
                Promise.all(keys.map(key => {
                    return lredis.del(key);
                })).then(result => {
                    resolve(result);
                })
            })
        });
    }
}

module.exports = ShipperService;