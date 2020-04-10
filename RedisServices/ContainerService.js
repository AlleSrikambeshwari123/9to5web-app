const Promise = require('bluebird');
const strings = require('../Res/strings');

const client = require('./dataContext').redisClient;
const lredis = require('./redis-local');
const Container = require('../models/Container');

const PREFIX = strings.redis_prefix_container;
const CONTAINER_ID = strings.redis_id_container;

class ContainerService {
  async addContainer(container) {
    return new Promise((resolve, reject) => {
     let obj_container = new Container(container);
     obj_container.save((err, result) => {
        if (err) {
          resolve({ success: false, message: err});
        } else {
          resolve({ success: true, message: strings.string_response_added, container: result});
        }
      })
    });
  }
  updateContainer(id, body) {
    return new Promise((resolve, reject) => {
      Container.findOneAndUpdate({_id: id},body, (err, result) => {
          if (err) {
            resolve({ success: false, message: err});
          } else {
            resolve({ success: true, message:  strings.string_response_updated});
          }
      })
    });
  }
  removeContainer(id) {
    return new Promise((resolve, reject) => {
     Container.deleteOne({_id: id}, (err, result) => {
          if (err) {
            resolve({ success: false, message: err });
          } else {
            resolve({ success: true, message: strings.string_response_removed });
          }
      })
    });
  }
  getContainer(id) {
    return new Promise((resolve, reject) => {
     Container.findOne({_id: id}).exec((err, result) => {
        if(err){
          resolve({});
        }else{
          resolve(result)
        }
      });
    });
  }
  getAllContainers() {
    return new Promise(async(resolve, reject) => {
      let containers = await Container.find({})
      resolve(containers)
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
      })
    });
  }
}

module.exports = ContainerService;
