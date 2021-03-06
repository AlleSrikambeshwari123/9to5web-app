const strings = require('../Res/strings');

// var lredis = require('./redis-local');
// var client = require('./dataContext').redisClient;
// const PREFIX = strings.redis_prefix_location;
// const ID_COUNTER = strings.redis_id_location;

const Company = require('../models/company');
const Location = require('../models/location');
const Package = require('../models/package');

class LocationService {
  getLocations() {
    return new Promise((resolve, reject) => {
      Location.find({})
      .populate('company', 'name')
      .exec((err, result) => {
        if (err) {
          resolve([]);
        } else {
          resolve(result);
        }
      })
    })
  }
  getPackageLocations(){
    return new Promise((resolve,reject)=>{
      Package.find({}).distinct('location',(err,result)=>{
        if (err) {
          resolve([]);
        } else {
          resolve(result);
        }
      })
    })
  }
  getCompanies() {
    return new Promise((resolve, reject) => {
      Company.find({}, (err, result) => {
        if (err) {
          resolve([]);
        } else {
          resolve(result);
        }
      })
    });
  }
  addLocation(location) {
    return new Promise((resolve, reject) => {
      const newLocationData = new Location(location);
      newLocationData.save((err, result) => {
        if (err) {
          console.error(err);  
          resolve({ success: false, message: strings.string_response_error });
        } else {
          resolve({ success: true, message: strings.string_response_created });
        }
      })
    });
  }
  getLocation(id) {
    return new Promise((resolve, reject) => {
      Location.findOne({_id: id})
      .populate('company', 'name')
      .exec((err, result) => {
        if (err) {
          resolve({});
        } else {
          resolve(result);
        }
      });
    })
  }
  get_all_locations(req){
    
    return new Promise(async (resolve, reject) => {
      var start = req.body.start ? parseInt(req.body.start) : 0;
      var length = req.body.length ? parseInt(req.body.length) : 10;      
      var field = req.body['order[0][column]'] ?parseInt(req.body['order[0][column]']) : 0;
      var columns = {0:'company', 1: 'createdAt', 2: 'name', 3:'address', 4: 'phone'} 
      
      var dir = req.body['order[0][dir]'] ? req.body['order[0][dir]'] : 0;
      var sort = (dir=='asc') ? 1 : -1;
      var sortField = columns[field];
      var search = req.body['search[value]'] ? req.body['search[value]'] : '';
     
      var daterange = req.body.daterange?req.body.daterange:''
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
          {address:{'$regex' : search, '$options' : 'i'}},
          {phone:{'$regex' : search, '$options' : 'i'}}
        ]
      }
      
      var totallocations = await Location.count(searchData);
     
      Location.find(searchData)
        .populate('company', 'name')
        .sort({[sortField]:sort})
        .skip(start)
        .limit(length)
        .exec((err, locations) => {
         // console.log(locations)
          if (err) {
            console.log(err)
            resolve({total:0, locations:[]});
          } else {
            resolve({total:totallocations, locations:locations})
          }
        });
    })
  }
  updateLocation(location) {
    return new Promise(async (resolve, reject) => {
      const locationData = await this.getLocation(location.id);
      if (!(locationData && locationData._id)) {
        return resolve({success: false, message: strings.string_not_found_location});
      }

      Location.findOneAndUpdate(
        { _id: locationData._id }, 
        { ...location },
        (err, result) => {
          if (err) {
            resolve({ success: false, message: strings.string_response_error });
          } else {
            resolve({ success: true, message: strings.string_response_updated });
          }
        }
      )
    });
  }
  removeLocation(id) {
    return new Promise((resolve, reject) => {
      Location.deleteOne({_id: id}, (err, result) => {
        if (err) {
          resolve({ success: false, message: strings.string_response_error });
        } else {
          resolve({ success: true, message: strings.string_response_removed });
        }
      });
    })
  }
}

//========== DB Structure ==========//
// id:
// phone:
// companyId:
// name:
// address:

module.exports = LocationService;