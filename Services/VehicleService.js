
const strings = require('../Res/strings');

// var lredis = require('./redis-local');
// var client = require('./dataContext').redisClient;

// const PREFIX = strings.redis_prefix_vehicle;
// const VEHICLE_ID = strings.redis_id_vehicle;
// const VEHICLE_LIST = strings.redis_prefid_vehicle_list;

const Vehicle = require('../models/vehicle');

class VehicleService {
  addVehicle(vehicle) {
    return new Promise((resolve, reject) => {
      let newVehicle = new Vehicle(vehicle);
      newVehicle.save((err, result) => {
        if (err) {
          resolve({ success: false, message: strings.string_response_error});
        } else {
          resolve({ 
            success: true, 
            message: strings.string_response_added, 
            vehicle: result
          });
        }
      })
    })
  }
  updateVehicle(id, vehicle) {
    return new Promise((resolve, reject) => {
      Vehicle.findOneAndUpdate({_id: id}, vehicle, (err, result) => {
        if (err) {
          resolve({ success: false, message: strings.string_response_error});
        } else {
          resolve({ success: true, message:  strings.string_response_updated});
        }
      })
    })
  }
  removeVehicle(id) {
     return new Promise((resolve, reject) => {
      Vehicle.deleteOne({_id: id}, (err, result) => {
        if (err) {
          resolve({ success: false, message: strings.string_response_error });
        } else {
          resolve({ success: true, message: strings.string_response_removed });
        }
      })
    });
  }
  getVehicle(id) {
    return new Promise((resolve, reject) => {
      Vehicle.findOne({_id: id}).exec((err, result) => {
        if (err) {
          resolve({});
        } else {
          resolve(result)
        }
      });
    });
  }
  getVehicles() {
    return new Promise(async(resolve, reject) => {
      let vehicles = await Vehicle.find({})
      resolve(vehicles)
    })
  }
  async getAllVehicles(req){
    var start = req.body.start ? parseInt(req.body.start) : 0;
    var length = req.body.length ? parseInt(req.body.length) : 10;      
    var field = req.body['order[0][column]'] ?parseInt(req.body['order[0][column]']) : 0;
    var columns = {0:'vehicleMake', 1: 'createdAt', 2: 'model', 3: 'registration'} 
    
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
        {vehicleMake:{'$regex' : search, '$options' : 'i'}},
        {model:{'$regex' : search, '$options' : 'i'}},
        {registration:{'$regex' : search, '$options' : 'i'}},
        {location:{'$regex' : search, '$options' : 'i'}}
      ]
    }

    var pipeLineAggregate = [{
      $lookup:{
        from: "drivers",
        localField: "driverId",
        foreignField: "_id",
        as:"driver"
      }
      },
      { 
        $unwind: "$driver" 
      },
      {
        $match:searchData
      }
    ]
    var totalvehicle = await Vehicle.aggregate([
      ...pipeLineAggregate,
      ...[{$count: "total"}]
    ]);

    
    return new Promise((resolve, reject) => {
      if(totalvehicle && totalvehicle.length && totalvehicle[0].total){
        Vehicle.aggregate([
          ...pipeLineAggregate,
          ...[
              {$sort: {[sortField]: sort}},
              {$skip: start},
              {$limit: length},
            ]
        ]).exec((err,result)=>{        
          if (err) {
            resolve({total: 0, vehicles:[]});
          } else {
            resolve({total: totalvehicle, vehicles: result});
          }
        });
      }else{
        resolve({total: 0, vehicles:[]});
      }
    })
  }
  getVehiclesByLocation(location) {
    return new Promise(async(resolve, reject) => {
      let vehicles = await Vehicle.find({location: location})
      resolve(vehicles)
    });
  }
}

//========== DB Structure ==========//
// id:
// vehicle_make:
// model:
// registration:
// driverId:
// location

module.exports = VehicleService;