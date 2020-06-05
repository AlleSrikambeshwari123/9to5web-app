
const strings = require('../Res/strings');
const Airport = require('../models/airport');

class AirportService {
  
  create(airport) {
    return new Promise(async (resolve, reject) => {
      
      const airportData = await Airport.findOne({ name: new RegExp('^' + airport.name + '$', 'i')});
      if (airportData && airportData['_id']) {
        return resolve({ success: false, message: strings.string_airport_exist });
      }

      let newAirport = new Airport(airport);
      newAirport.save((err, result) => {
        if (err) {
          console.log("<==== Error While Adding new Airport ====> ", err);
          resolve({ success: false, message: strings.string_response_error});
        } else {
          resolve({ 
            success: true, 
            message: strings.string_response_added, 
            airport: result
          });
        }
      })
    })
  }
  update(id, body) {
    return new Promise(async(resolve, reject) => {
      Airport.findOneAndUpdate({_id: id}, body, (err, result) => {
        if (err) {
          console.log("<==== Error While updating Airport ====> ", err);
          resolve({ success: false, message: strings.string_response_error});
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
          console.log("<==== Error While removing Airport ====> ", err);
          resolve({ success: false, message: strings.string_response_error });
        } else {
          resolve({ success: true, message: strings.string_response_removed });
        }
      })
    });
  }
  get(id) {
    return new Promise((resolve, reject) => {
      Airport.findOne({_id: id}).exec((err, result) => {
        if (err) {
          resolve({});
        } else {
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
          console.log("<==== Error While removing all Airports ====> ", err);
          resolve([]);
        } else {
          resolve(result);
        }
      })
    });
  }
}

//========== DB Structure ==========//
// name: String
// shortCode: String
// country: String

module.exports = AirportService;
