const strings = require('../Res/strings');
const csv = require('csvtojson');

// var client = require('./dataContext').redisClient;
// var lredis = require('./redis-local');

// const PREFIX = strings.redis_prefix_carrier;
// const CARRIER_ID = strings.redis_id_carrier;

const Carrier = require('../models/carrier');

class CarrierService {
  addCarrier(carrier) {
    return new Promise((resolve, reject) => {
      let newCarrier = new Carrier(carrier);
      newCarrier.save((err, result) => {
        if (err) {
          resolve({ success: false, message: strings.string_response_error});
        } else {
          resolve({ 
            success: true, 
            message: strings.string_response_added, 
            carrier: result
          });
        }
      })
    })
  }
  updateCarrier(id, body) {
    return new Promise(async(resolve, reject) => {
      Carrier.findOneAndUpdate({_id: id}, body, (err, result) => {
        if (err) {
          resolve({ success: false, message: strings.string_response_error});
        } else {
          resolve({ success: true, message: strings.string_response_updated });
        }
      })
    })
  }
  removeCarrier(id) {
    return new Promise((resolve, reject) => {
      Carrier.deleteOne({_id: id}, (err, result) => {
        if (err) {
          resolve({ success: false, message: strings.string_response_error });
        } else {
          resolve({ success: true, message: strings.string_response_removed });
        }
      })
    });
  }
  getCarrier(id) {
    return new Promise((resolve, reject) => {
      Carrier.findOne({_id: id}).read("primary").exec((err, result) => {
        if (err) {
          resolve({});
        } else {
          resolve(result)
        }
      });
    });
  }
  getAllCarriers() {
    return new Promise(async(resolve, reject) => {
      let carriers = await Carrier.find({})
      resolve(carriers)
    })
  }

  async getCarriers(req) {
    var start = req.body.start ? parseInt(req.body.start) : 0;
    var length = req.body.length ? parseInt(req.body.length) : 10;
    var field = req.body['order[0][column]'] ?parseInt(req.body['order[0][column]']) : 0;
    var columns = {0:'createdAt', 1: 'createdAt', 2: 'firstName', 3:'email', 4: 'telephone', 5: 'address'} 
    var dir = req.body['order[0][dir]'] ? req.body['order[0][dir]'] : 0;
    var sort = (dir=='asc') ? 1 : -1;
    var sortField = columns[field];
    var search = req.body['search[value]'] ? req.body['search[value]'] : '';
    var daterange = req.body.daterange?req.body.daterange:''

    var searchData = {};

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
      {"name":{'$regex' : search, '$options' : 'i'}},        
      {"email":{'$regex' : search, '$options' : 'i'}},        
      {"address":{'$regex' : search, '$options' : 'i'}},        
      ]
    }
    var totalCarriers = await Carrier.count(searchData);
    return new Promise(async(resolve, reject) => {
      Carrier.find(searchData)
      .sort({[sortField]:sort})
      .skip(start)
      .limit(length)
      .exec((err, result) => {
        if (err) {
          resolve([]);
        } else {
          resolve({carriers:result, total: totalCarriers});
        }
      })
    })
  }

  removeAll() {
    return new Promise((resolve, reject) => {
      Carrier.deleteMany({}, (err, result) => {
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
// telephone:
// email:
// fax:
// address:
// city:
// state:
// country:
// zipcode:

module.exports = CarrierService;