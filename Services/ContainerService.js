const Promise = require('bluebird');
const strings = require('../Res/strings');

// const client = require('./dataContext').redisClient;
// const lredis = require('./redis-local');
// const PREFIX = strings.redis_prefix_container;
// const CONTAINER_ID = strings.redis_id_container;

const Container = require('../models/container');

class ContainerService {
  async addContainer(container) {
    return new Promise((resolve, reject) => {
      const newContainer = new Container(container);
      newContainer.save((err, result) => {
        if (err) {
          resolve({ success: false, message: strings.string_response_error });
        } else {
          container['id'] = result['_id'];
          resolve({ 
            success: true, 
            message: strings.string_response_added, 
            container: container 
          });
        }
      });
    });
  }
  updateContainer(id, body) {
    return new Promise(async (resolve, reject) => {
      const container = await this.getContainer(id);
      if (!(container && container['_id'])) {
        return resolve({ success: true, message: strings.string_not_found_customer });
      }

      Container.findOneAndUpdate({_id: id}, {...body}, (err, res) => {
        if (err) {
          resolve({ success: false, message: strings.string_response_error });
        } else {
          resolve({ success: true, message: strings.string_response_updated });
        }

      })
    });
  }
  removeContainer(id) {
    return new Promise((resolve, reject) => {
      Container.deleteOne({_id: id}, (err, result) => {
        if (err) {
          resolve({ success: false, message: strings.string_response_error });
        } else {
          resolve({ success: true, message: strings.string_response_removed });
        }
      });

    });
  }
  getContainer(id) {
    return new Promise((resolve, reject) => {
      Container.findOne({_id: id}, (err, result) => {
        if (err) {
          resolve({});
        } else {
          resolve(result);
        }
      });
    });
  }
  getAllContainers() {
    return new Promise((resolve, reject) => {
      Container.find({}, (err, result) => {
        if (err) {
          resolve([]);
        } else {
          resolve(result);
        }
      })
    });
  }
  getAllContainer(req) {
    return new Promise(async (resolve, reject) => {
      var start = req.body.start ? parseInt(req.body.start) : 0;
      var length = req.body.length ? parseInt(req.body.length) : 10;      
      var field = req.body['order[0][column]'] ?parseInt(req.body['order[0][column]']) : 0;
      var columns = {0:'name', 1: 'createdAt', 2: 'number', 3: 'size', 5: 'weight', 6: 'seal' } 
      
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
          // {size: search},
          // {weight: search},
          {seal:{'$regex' : search, '$options' : 'i'}} 
      ]
      }
      var totalRecords = await Container.countDocuments({});
      console.log(JSON.stringify(searchData));
      if(totalRecords){
        Container.find(searchData)
                .sort({[sortField]:sort})
                .skip(start)
                .limit(length)
                .exec((err, result) => {
                  if(err){
                    resolve({total: 0, containers: []})
                  }else{
                    resolve({total: totalRecords, containers: result})
                  }
                })
      }else{
        resolve({total: 0, containers: []})
      }
    });
  }
  removeAll() {
    return new Promise((resolve, reject) => {
      Container.deleteMany({}, (err, result) => {
        if (err) {
          resolve([]);
        } else {
          resolve(result);
        }
      });
    });
  }
}

module.exports = ContainerService;
