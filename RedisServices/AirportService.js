const strings = require('../Res/strings');


const PREFIX = strings.redis_prefix_airport;
const AIRPORT_ID_KEY = strings.redis_id_airport;
const Airport = require('../models/Airport');

/**
 * name: String
 * shortCode: String
 * country: String
 */
class AirportService {
  
  create(airport) {
    return new Promise((resolve, reject) => {
     let obj_airport = new Airport(airport);
     obj_airport.save((err, result) => {
        if (err) {
          resolve({ success: false, message: err});
        } else {
          resolve({ success: true, message: strings.string_response_added, airport: result});
        }
      })
    })
  }
  update(id, body) {
    return new Promise(async(resolve, reject) => {
      Airport.findOneAndUpdate({_id: id},body, (err, result) => {
          if (err) {
            resolve({ success: false, message: err});
          } else {
            resolve({ success: true, message:  strings.string_response_updated});
          }
      })
    })
  }
  remove(id) {
     return new Promise((resolve, reject) => {
      Airport.deleteOne({_id: id}, (err, result) => {
          if (err) {
            resolve({ success: false, message: err });
          } else {
            resolve({ success: true, message: strings.string_response_removed });
          }
      })
    
    });
  }
  get(id) {
     return new Promise((resolve, reject) => {
      Airport.findOne({_id: id}).exec((err, result) => {
        if(err){
          resolve({});
        }else{
          resolve(result)
        }
      });
    });
  }
  all() {
    return new Promise(async(resolve, reject) => {
      let airports = await Airport.find({})
      resolve(airports)
    })
  }
  removeAll() {
    return new Promise(async(resolve, reject) => {
      Airport.deleteMany({}, (err, result) => {
        if (err) {
          resolve([]);
        } else {
          resolve(result);
        }
      })
    });
  }
}

module.exports = AirportService;
