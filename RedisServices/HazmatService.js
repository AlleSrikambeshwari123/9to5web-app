
const strings = require('../Res/strings');
const csv = require('csvtojson');

var client = require('./dataContext').redisClient;
var lredis = require('./redis-local');

const HAZMAT_ID = strings.redis_id_hazmat;
const PREFIX = strings.redis_prefix_hazmat;

class HazmatService {
    importClassesFromCsv() {
        return new Promise((resolve, reject) => {
            this.removeAll().then(result => {
                csv().fromFile("./DB_Seed/hazmat.csv").then(jsonObj => {
                    Promise.all(jsonObj.map(element => {
                        console.log(element.sClassName + '/' + element.sClassDescription);
                        client.incr(HAZMAT_ID, (err, id) => {
                            return lredis.hmset(PREFIX + id, {
                                id: id,
                                name: element.sClassName,
                                description: element.sClassDescription
                            });
                        });
                    })).then(result => {
                        resolve(result);
                    })
                })
            })
        });
    }
    getAllClasses() {
        return new Promise((resolve, reject) => {
            client.keys(PREFIX + '*', (err, keys) => {
                if (err) resolve([]);
                Promise.all(keys.map(key => {
                    return lredis.hgetall(key);
                })).then(classes => {
                    resolve(classes);
                })
            })
        })
    }
    removeAll() {
        return new Promise((resolve, reject) => {
            client.set(HAZMAT_ID, 0);
            client.keys(PREFIX + '*', (err, keys) => {
                if (err) resolve([]);
                Promise.all(keys.map(key => {
                    return lredis.del(key);
                })).then(classes => {
                    resolve(classes);
                })
            })
        });
    }
}
module.exports = HazmatService;