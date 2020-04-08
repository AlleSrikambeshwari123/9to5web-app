const strings = require('../Res/strings');
const csv = require('csvtojson');

var client = require('./dataContext').redisClient;
var lredis = require('./redis-local');

const PREFIX = strings.redis_prefix_airline;
const AIRLINE_ID = strings.redis_id_airline;

const Airline = require('../models/Airline');

class AirlineService {
  importAirlinesFromCsv() {
    return new Promise((resolve, reject) => {
       this.removeAll().then(result => {
        csv().fromFile("./DB_Seed/shipper.csv").then(async(jsonObj) => {
          Promise.all(jsonObj.map(element => {
             let body = {
                id: id,
                name: element.sCarrierName,
                firstName: element.sContactFirstName,
                lastName: element.sContactLastName,
              }
           let obj_shipper = new Shipper(body);
           obj_shipper.save((err, result) => {
              if (err) {
                console.error('Error while creating the user!!');
                return({ success: false, message: err});
              } else {
                return({ success: true, message: "successfully added"});
              }
            })
         })).then(result => {
            resolve(result)
          })

        })
      })
    });
  }

  addAirline(airline) {
    return new Promise((resolve, reject) => {
     let obj_airline = new Airline(airline);
     obj_airline.save((err, result) => {
        if (err) {
          resolve({ success: false, message: err});
        } else {
          resolve({ success: true, message: "successfully added"});
        }
      })
    })
  }
  updateAirline(id, body) {
    return new Promise(async(resolve, reject) => {
      Airline.findOneAndUpdate({_id: id},body, (err, result) => {
          if (err) {
            resolve({ success: false, message: err});
          } else {
            resolve({ success: true, message: "successfully updated"});
          }
      })
    })
  }
  removeAirline(id) {
     return new Promise((resolve, reject) => {
      Airline.deleteOne({_id: id}, (err, result) => {
          if (err) {
            resolve({ success: false, message: err });
          } else {
            resolve({ success: true, message: "successfully removed"});
          }
      })
    
    });
  }
  getAirline(id) {
     return new Promise((resolve, reject) => {
      Airline.find({_id: id}).exec((err, result) => {
        if (err) {
          resolve({});
        } else {

          resolve(result[0])
        }
      });
    });
  }
  getAllAirlines() {
    return new Promise(async(resolve, reject) => {
      let airlines = await Airline.find({})
      resolve(airlines)
    })
  }
  removeAll() {
    return new Promise(async(resolve, reject) => {
       await Airline.remove()
       resolve(true)
    });
  }
}

//========== DB Structure ==========//
// id:
// name:
// firstName:
// lastName:

module.exports = AirlineService;