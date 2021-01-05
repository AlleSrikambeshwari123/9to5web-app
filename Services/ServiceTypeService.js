const strings = require('../Res/strings');
const csv = require('csvtojson');

// var client = require('./dataContext').redisClient;
// var lredis = require('./redis-local');
// const PREFIX = strings.redis_prefix_service_type;
// const SERVICETYPE_ID = strings.redis_id_service_type;

const ServiceType = require('../models/serviceType');

class ServiceTypeService {
  // importServiceTypeFromCsv() {
  //   return new Promise((resolve, reject) => {
  //     this.removeAll().then(result => {
  //       csv().fromFile("./DB_Seed/-----.csv").then(jsonObj => {
  //         Promise.all(jsonObj.map(element => {
  //           console.log(element.sCarrierName);
  //           client.incr(SERVICETYPE_ID, (err, id) => {
  //             return lredis.hmset(PREFIX + id, {
  //               id: id,
  //               name: element.sCarrierName,
  //               amount: element.Amount,
  //             });
  //           });
  //         })).then(result => {
  //           resolve(result);
  //         })
  //       })
  //     })
  //   });
  // }

  addServiceType(serviceType) {
    return new Promise((resolve, reject) => {
      const newServiceType = new ServiceType(serviceType);
      newServiceType.save((err, result) => {
        if (err) {
          resolve({ success: false, message: strings.string_response_error });
        } else {
          serviceType['id'] = serviceType['_id'];
          resolve({ success: true, message: strings.string_response_added, serviceType: serviceType });
        }
      });
    })
  }
  updateServiceType(id, body) {
    return new Promise((resolve, reject) => {
      ServiceType.findOneAndUpdate({_id: id}, {name: body.name, amount: body.amount,type : body.type}, (err, result) => {
        if (err) {
          resolve({ success: false, message: strings.string_response_error });
        } else {
          resolve({ success: true, message: strings.string_not_found_customer });
        }
      });
    })
  }
  removeServiceType(id) {
    return new Promise((resolve, reject) => {
      ServiceType.deleteOne({_id: id}, (err, result) => {
        if (err) {
          resolve({ success: false, message: strings.string_response_error });
        } else {
          resolve({ success: true, message: strings.string_response_removed });
        }
      })
    });
  }
  getServiceType(id) {
    return new Promise((resolve, reject) => {
      ServiceType.findOne({_id: id}, (err, result) => {
        if (err) {
          resolve({});
        } else {
          resolve(result);
        }
      })
    });
  }
  getAllServiceTypes() {
    return new Promise((resolve, reject) => {
      ServiceType.find({}, (err, result) => {
        if (err) {
          resolve([]);
        } else {
          resolve(result);
        }
      })
    })
  }
  async getServiceTypes(req){

    var start = req.body.start ? parseInt(req.body.start) : 0;
    var length = req.body.length ? parseInt(req.body.length) : 10;
    var field = req.body['order[0][column]'] ?parseInt(req.body['order[0][column]']) : 0;
    var columns = {0:'name', 1: 'createdAt', 2: 'amount'} 
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
      {"name":{'$regex' : search, '$options' : 'i'}}  
      ]
    }
    var totalServiceType = await ServiceType.count(searchData);
    return new Promise(async(resolve, reject) => {
      ServiceType.find(searchData)
      .sort({[sortField]:sort})
      .skip(start)
      .limit(length)
      .exec((err, result) => {
        if (err) {
          resolve([]);
        } else {
          resolve({serviceTypes:result, total: totalServiceType});
        }
      })
    })
  }
  removeAll() {
    return new Promise((resolve, reject) => {
      PaidType.deleteMany({}, (err, result) => {
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
// amount:

module.exports = ServiceTypeService;