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
  getAllAirline(req){
    return new Promise(async(resolve, reject) => {
      var start = req.body.start ? parseInt(req.body.start) : 0;
      var length = req.body.length ? parseInt(req.body.length) : 10;      
      var field = req.body['order[0][column]'] ?parseInt(req.body['order[0][column]']) : 0;
      var columns = {0:'name', 1: 'createdAt', 2: 'firstName'} 
      
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
          {firstName:{'$regex' : search, '$options' : 'i'}},
          {lastName:{'$regex' : search, '$options' : 'i'}}          
        ]
      }
      let totalRecords = await Airline.countDocuments({})
      if(totalRecords){
        Airline.find(searchData)
        .sort({[sortField]: sort})
        .skip(start)
        .limit(length)
        .exec((err, result) =>{
          if(err){
            resolve({total:0, airlines: []});
          }else{
            resolve({total:totalRecords, airlines: result})
          }
        })
      }else{
        resolve({total:0, airlines: []});
      }

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