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
