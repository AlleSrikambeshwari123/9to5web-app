
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
    return Airport.find({}).exec()
  }
  allAirport(req) {
    var start = req.body.start ? parseInt(req.body.start) : 0;
    var length = req.body.length ? parseInt(req.body.length) : 10;      
    var field = req.body['order[0][column]'] ?parseInt(req.body['order[0][column]']) : 0;
    var columns = {0:'name', 1: 'createdAt', 2: 'shortCode', 3: 'country'} 
    
    var dir = req.body['order[0][dir]'] ? req.body['order[0][dir]'] : 0;
    var sort = (dir=='asc') ? 1 : -1;
    var sortField = columns[field];

    var search = req.body['search[value]'] ? req.body['search[value]'] : ''; 
    var searchData = {};

    //date range
    var daterange = req.body.daterange?req.body.daterange:''
    if(daterange){
      var date_arr = daterange.split('-');
      var startDate = (date_arr[0]).trim();      
      var stdate = new Date(startDate);
      stdate.setDate(stdate.getDate() +1);

      var endDate = (date_arr[1]).trim();
      var endate = new Date(endDate);
      endate.setDate(endate.getDate() +1);     
      searchData.createdAt = {"$gte":stdate, "$lte": endate};
    }

    if(!req.body.daterange && !req.body.clear){
      var endate = new Date();      
      endate.setDate(endate.getDate()+1);
      var stdate = new Date();
      stdate.setDate(stdate.getDate() -21);      
      searchData.createdAt = {"$gte":stdate, "$lte": endate};
    }

    if(search){
      searchData.$or = [          
        {name:{'$regex' : search, '$options' : 'i'}},
        {shortCode:{'$regex' : search, '$options' : 'i'}},
        {country:{'$regex' : search, '$options' : 'i'}}
      ]
    }
    return new Promise(async(resolve, reject) => {
      var totalRecords = await Airport.countDocuments(searchData);
      if(totalRecords){
        Airport.find(searchData)
        .populate('location')
        .sort({[sortField]:sort})
        .skip(start)
        .limit(length)
        .exec((err, result) => {
          if (err) {
            resolve({total: 0, zones:[]});
          } else {
            resolve({total: totalRecords, airports: result});
          }
        })    
      }else{
        resolve({total: 0, zones:[]});
      }      
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
