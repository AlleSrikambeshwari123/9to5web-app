
const strings = require('../Res/strings');
const csv = require('csvtojson');

var client = require('./dataContext').redisClient;
var lredis = require('./redis-local');

const HAZMAT_ID = strings.redis_id_hazmat;
const PREFIX = strings.redis_prefix_hazmat;

const Hazmat = require('../models/hazmat');

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
  getHazmat(id) {
    return new Promise((resolve, reject) => {
      Hazmat.findOne({_id: id}, (err, result) => {
        if (err) {
          resolve({});
        } else {
          resolve(result);
        }
      })
    });
  }
  getHazmats() {
    return new Promise((resolve, reject) => {
      Hazmat.find({}, (err, result) => {
        if (err) {
          resolve([]);
        } else {
          resolve(result);
        }
      })
    })
  }
  createHazmat(hazmat) {
    return new Promise((resolve, reject) => {
      const newHazmat = new Hazmat({name: hazmat.name, description: hazmat.description})
      newHazmat.save((err, result) => {
        if (err) {
          resolve({ success: false, message: strings.string_response_error });
        } else {
          resolve({ success: true, message: strings.string_response_added });
        }
      });
    });
  }
  updateHazmat(id, hazmat) {
    return new Promise((resolve, reject) => {
      const updatedHazmatData = {
        name: hazmat.name, 
        description: hazmat.description
      };
      Hazmat.findOneAndUpdate({_id: id}, updatedHazmatData, (err, result) => {
        if (err) {
          resolve({ success: false, message: strings.string_response_error });
        } else {
          resolve({ success: true, message: strings.string_response_updated });
        }
      });
    })
  }
  removeHazmat(id) {
    return new Promise((resolve, reject) => {
      Hazmat.deleteOne({_id: id}, (err, result) => {
        if (err) {
          resolve({ success: false, message: strings.string_not_found_hazmat });
        } else {
          resolve({ success: true, message: strings.string_response_removed });
        }
      })
    })
  }
  removeAll() {
    return new Promise((resolve, reject) => {
      Hazmat.deleteMany({}, (err, result) => {
        if (err) {
          resolve([]);
        } else {
          resolve(result);
        }
      })
    });
  }
}

//========== DB Structure ==========//
// id:
// name:
// description:

module.exports = HazmatService;