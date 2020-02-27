
const strings = require('../Res/strings');
const csv = require('csvtojson');

var client = require('./dataContext').redisClient;
var lredis = require('./redis-local');

const HAZMAT_ID = strings.redis_id_hazmat;
const PREFIX = strings.redis_prefix_hazmat;

class HazmatService {
  importClassesFromCsv() {
    return new Promise((resolve, reject) => {
      console.log("Importing HAZMAT Classes from the CSV file.");
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
  getClass(id) {
    return new Promise((resolve, reject) => {
      client.hgetall(PREFIX + id, (err, hazmat) => {
        if (err) resolve({ description: "" });
        if (hazmat) resolve(hazmat);
        else resolve({ description: "" });
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
          classes.sort((a, b) => a.id - b.id);
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