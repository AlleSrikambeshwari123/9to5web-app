
const strings = require('../Res/strings');
const csv = require('csvtojson');

// var client = require('./dataContext').redisClient;
// var lredis = require('./redis-local');

// const HAZMAT_ID = strings.redis_id_hazmat;
// const PREFIX = strings.redis_prefix_hazmat;

const Hazmat = require('../models/hazmat');

class HazmatService {
  // importClassesFromCsv() {
  //   return new Promise((resolve, reject) => {
  //     this.removeAll().then(result => {
  //       csv().fromFile("./DB_Seed/hazmat.csv").then(jsonObj => {
  //         Promise.all(jsonObj.map(element => {
  //           client.incr(HAZMAT_ID, (err, id) => {
  //             return lredis.hmset(PREFIX + id, {
  //               id: id,
  //               name: element.sClassName,
  //               description: element.sClassDescription
  //             });
  //           });
  //         })).then(result => {
  //           resolve(result);
  //         })
  //       })
  //     })
  //   });
  // }
  getHazmat(id) {
    return new Promise((resolve, reject) => {
      Hazmat.findOne({_id: id}, (err, result) => {
        if (err) {
          resolve({});
        } else {
          resolve(result);
        }
      })
    });
  }
  getHazmats() {
    return new Promise((resolve, reject) => {
      Hazmat.find({}, (err, result) => {
        if (err) {
          resolve([]);
        } else {
          resolve(result);
        }
      })
    })
  }

  async getAllHazmats(req){

    var start = req.body.start ? parseInt(req.body.start) : 0;
    var length = req.body.length ? parseInt(req.body.length) : 10;
    var field = req.body['order[0][column]'] ?parseInt(req.body['order[0][column]']) : 0;
    var columns = {0:'createdAt', 1: 'createdAt', 2: 'name', 3:'description'} 
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
      {"description":{'$regex' : search, '$options' : 'i'}},        
      ]
    }
    var totalHazmats = await Hazmat.count(searchData);
    return new Promise(async(resolve, reject) => {
      Hazmat.find(searchData)
      .sort({[sortField]:sort})
      .skip(start)
      .limit(length)
      .exec((err, result) => {
        if (err) {
          resolve([]);
        } else {
          resolve({hazmats:result, total: totalHazmats});
        }
      })
    })
  }

  createHazmat(hazmat) {
    return new Promise((resolve, reject) => {
      const newHazmat = new Hazmat(hazmat)
      newHazmat.save((err, result) => {
        if (err) {
          resolve({ success: false, message: strings.string_response_error });
        } else {
          resolve({ success: true, message: strings.string_response_added });
        }
      });
    });
  }
  updateHazmat(id, hazmat) {
    return new Promise((resolve, reject) => {
      const updatedHazmatData = {
        name: hazmat.name, 
        description: hazmat.description
      };
      Hazmat.findOneAndUpdate({_id: id}, updatedHazmatData, (err, result) => {
        if (err) {
          resolve({ success: false, message: strings.string_response_error });
        } else {
          resolve({ success: true, message: strings.string_response_updated });
        }
      });
    })
  }
  removeHazmat(id) {
    return new Promise((resolve, reject) => {
      Hazmat.deleteOne({_id: id}, (err, result) => {
        if (err) {
          resolve({ success: false, message: strings.string_not_found_hazmat });
        } else {
          resolve({ success: true, message: strings.string_response_removed });
        }
      })
    })
  }
  removeAll() {
    return new Promise((resolve, reject) => {
      Hazmat.deleteMany({}, (err, result) => {
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
// description:

module.exports = HazmatService;