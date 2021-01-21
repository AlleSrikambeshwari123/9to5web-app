const strings = require('../Res/strings');

// var lredis = require('./redis-local');
// var client = require('./dataContext').redisClient;
// const PREFIX = strings.redis_prefix_location;
// const ID_COUNTER = strings.redis_id_location;

const Location = require('../models/location');
const Zone = require('../models/zone');

class ZoneService {
  getZones() {
    return new Promise((resolve, reject) => {
      Zone.aggregate([{
        $lookup :{
          from : "locations",
          localField :"location",
          foreignField : "_id",
          as :"location"
        }
      },
      {$unwind : "$location"},
      {
        $project: {
          _id: 1,
          name: '$name',
          location: {
              _id : '$location._id',
              name: '$location.name',
              company : '$location.company'
          },
        }
      }])
      // Zone.find()
      // .populate('location')
      .exec((err, result) => {
        if (err) {
          resolve([]);
        } else {
          resolve(result);
        }
      })
    })
  }

  async get_all_zone(req) {
    var start = req.body.start ? parseInt(req.body.start) : 0;
    var length = req.body.length ? parseInt(req.body.length) : 10;      
    var field = req.body['order[0][column]'] ?parseInt(req.body['order[0][column]']) : 0;
    var columns = {0:'name', 1: 'createdAt', 2: 'location.name'} 
    
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
        {address:{'$regex' : search, '$options' : 'i'}},
        {phone:{'$regex' : search, '$options' : 'i'}}
      ]
    }
    
    var totalzones = await Zone.countDocuments(searchData);
    return new Promise((resolve, reject) => {
      Zone.find(searchData)
      .populate('location')
      .sort({[sortField]:sort})
      .skip(start)
      .limit(length)
      .exec((err, result) => {
        if (err) {
          resolve({total: 0, zones:[]});
        } else {
          resolve({total: totalzones, zones: result});
        }
      })
    })
  }
  addZone(zone) {
    return new Promise((resolve, reject) => {
      const newZoneData = new Zone(zone);
      newZoneData.save((err, result) => {
        if (err) {
          console.error(err);  
          resolve({ success: false, message: strings.string_response_error });
        } else {
          resolve({ success: true, message: strings.string_response_created });
        }
      })
    });
  }
  getZone(id) {
    return new Promise((resolve, reject) => {
      Zone.findOne({_id: id})
      .populate('location', 'name')
      .exec((err, result) => {
        if (err) {
          resolve({});
        } else {
          resolve(result);
        }
      });
    })
  }
  updateZone(zone) {
    return new Promise(async (resolve, reject) => {
      const zoneData = await this.getZone(zone.id);
      if (!(zoneData && zoneData._id)) {
        return resolve({success: false, message: strings.string_not_found_location});
      }

      Zone.findOneAndUpdate(
        { _id: zoneData._id }, 
        zone,
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
  removeZone(id) {
    return new Promise((resolve, reject) => {
      Zone.deleteOne({_id: id}, (err, result) => {
        if (err) {
          resolve({ success: false, message: strings.string_response_error });
        } else {
          resolve({ success: true, message: strings.string_response_removed });
        }
      });
    })
  }
  getLocations(){
    return new Promise((resolve, reject) => {
        Location.find()
        .exec((err, result) => {
          if (err) {
            resolve([]);
          } else {
            resolve(result);
          }
        })
      })  
  }
}

module.exports = ZoneService;