const Promise = require('bluebird');
const strings = require('../Res/strings');

const client = require('./dataContext').redisClient;
const lredis = require('./redis-local');

const PREFIX = strings.redis_prefix_container;
const CONTAINER_ID = strings.redis_id_container;

class ContainerService {
  async addContainer(container) {
    return new Promise((resolve, reject) => {
      client.incr(CONTAINER_ID, (err, id) => {
        if (err) resolve({ success: false, message: strings.string_response_error });
        container.id = id;
        client.hmset(PREFIX + id, container, (err, result) => {
          if (err) resolve({ success: false, message: strings.string_response_error });
          resolve({ success: true, message: strings.string_response_added, container: container });
        });
      });
    });
  }
  updateContainer(id, body) {
    return new Promise((resolve, reject) => {
      client.exists(PREFIX + id, (err, exist) => {
        if (err) resolve({ success: false, message: strings.string_response_error });
        if (Number(exist) == 1) {
          client.hmset(PREFIX + id, body);
          resolve({ success: true, message: strings.string_response_updated });
        } else resolve({ success: true, message: strings.string_not_found_customer });
      });
    });
  }
  removeContainer(id) {
    return new Promise((resolve, reject) => {
      client.del(PREFIX + id, (err, result) => {
        if (err) resolve({ success: false, message: strings.string_response_error });
        resolve({ success: true, message: strings.string_response_removed });
      });
    });
  }
  getContainer(id) {
    return new Promise((resolve, reject) => {
      client.hgetall(PREFIX + id, (err, container) => {
        if (err) resolve({});
        resolve(container);
      });
    });
  }
  getAllContainers() {
    return new Promise((resolve, reject) => {
      client.keys(PREFIX + '*', (err, keys) => {
        if (err) resolve([]);
        Promise.all(
          keys.map((key) => {
            return lredis.hgetall(key);
          }),
        ).then((containers) => {
          resolve(containers);
        });
      });
    });
  }
  removeAll() {
    return new Promise((resolve, reject) => {
      client.set(CONTAINER_ID, 0);
      client.keys(PREFIX + '*', (err, keys) => {
        if (err) resolve([]);
        Promise.all(
          keys.map((key) => {
            return lredis.del(key);
          }),
        ).then((result) => {
          resolve(result);
        });
      });
    });
  }
}

module.exports = ContainerService;
