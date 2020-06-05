const strings = require('../Res/strings');

const Airline = require('../models/airline');

class AirlineService {
  addAirline(airline) {
    return new Promise((resolve, reject) => {
     let newAirLine = new Airline(airline);
     newAirLine.save((err, result) => {
        if (err) {
          console.log("<==== Error While Adding new Airline ====> ", err);
          resolve({ success: false, message: strings.string_response_error});
        } else {
          resolve({ 
            success: true, 
            message: strings.string_response_added, 
            airline: result
          });
        }
      })
    })
  }
  updateAirline(id, body) {
    return new Promise(async(resolve, reject) => {
      Airline.findOneAndUpdate({_id: id}, body, (err, result) => {
        if (err) {
          console.log("<==== Error While updating Airline ====> ", err);
          resolve({ success: false, message: strings.string_response_error});
        } else {
          resolve({ success: true, message: strings.string_response_updated});
        }
      })
    })
  }
  removeAirline(id) {
     return new Promise((resolve, reject) => {
      Airline.deleteOne({_id: id}, (err, result) => {
        if (err) {
          console.log("<==== Error While removing airline ====> ", err);
          resolve({ success: false, message: strings.string_response_error });
        } else {
          resolve({ success: true, message: strings.string_response_removed });
        }
      })
    });
  }
  getAirline(id) {
     return new Promise((resolve, reject) => {
      Airline.findOne({_id: id}).exec((err, result) => {
        if (err) {
          console.log("<==== Error While getting Airline ====> ", err);
          resolve({});
        } else {
          resolve(result)
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
      Airline.deleteMany({}, (err, result) => {
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
// firstName:
// lastName:

module.exports = AirlineService;