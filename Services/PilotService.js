const strings = require('../Res/strings');

// Redis
// var client = require('./dataContext').redisClient;
// var lredis = require('./redis-local');

// const PREFIX = strings.redis_prefix_pilot;
// const PILOT_ID = strings.redis_id_pilot;
// const PILOT_LIST = strings.redis_prefix_pilot_list;

const Pilot = require('../models/pilot');

class PilotService {
  addPilot(pilot) {
    return new Promise((resolve, reject) => {
      let newPilot = new Pilot(pilot);
      newPilot.save((err, result) => {
        if (err) {
          resolve({ success: false, message: strings.string_response_error});
        } else {
          resolve({ 
            success: true, 
            message: strings.string_response_added, 
            pilot: result
          });
        }
      })
    })
  }
  updatePilot(id, pilot) {
    return new Promise(async(resolve, reject) => {
      Pilot.findOneAndUpdate({_id: id}, pilot, (err, result) => {
        if (err) {
          resolve({ success: false, message: strings.string_response_error});
        } else {
          resolve({ success: true, message:  strings.string_response_updated});
        }
      })
    })
  }
  getPilots() {
    return new Promise(async(resolve, reject) => {
      let pilots = await Pilot.find({})
      resolve(pilots)
    })
  }
  getAllPilots(req) {
    var start = req.body.start ? parseInt(req.body.start) : 0;
    var length = req.body.length ? parseInt(req.body.length) : 10;      
    var field = req.body['order[0][column]'] ?parseInt(req.body['order[0][column]']) : 0;
    var columns = {0:'firstName', 1: 'createdAt', 2: 'company', 3: 'mobile', 3: 'email'} 
    
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
        {firstName:{'$regex' : search, '$options' : 'i'}},
        {company:{'$regex' : search, '$options' : 'i'}},
        {mobile:search},
        {email:{'$regex' : search, '$options' : 'i'}}
      ]
    }
    return new Promise(async(resolve, reject) => {
      var totalRecords = await Pilot.countDocuments(searchData);
      if(totalRecords){
        Pilot.find(searchData)
        .populate('location')
        .sort({[sortField]:sort})
        .skip(start)
        .limit(length)
        .exec((err, result) => {
          if (err) {
            resolve({total: 0, zones:[]});
          } else {
            resolve({total: totalRecords, pilots: result});
          }
        })    
      }else{
        resolve({total: 0, zones:[]});
      }      
    })

  }
  
  getPilotsWarehouse(warehouse) {
    return new Promise(async(resolve, reject) => {
      let pilots = await Pilot.find({warehouse: warehouse})
      resolve(pilots)
    });
  }
  getPilot(id) {
    return new Promise((resolve, reject) => {
      Pilot.findOne({_id: id}).exec((err, result) => {
        if (err) {
          resolve({});
        } else {
          resolve(result)
        }
      });
    });
  }
  removePilot(id) {
    return new Promise((resolve, reject) => {
      Pilot.deleteOne({_id: id}, (err, result) => {
        if (err) {
          resolve({ success: false, message: strings.string_response_error });
        } else {
          resolve({ success: true, message: strings.string_response_removed });
        }
      })
    });
  }
}

module.exports = PilotService;