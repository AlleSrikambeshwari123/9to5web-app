// let Promise = require('bluebird');
// let assert = require('assert');

// let client = require('./dataContext').redisClient;

// class CRUDService {
//   constructor(options = {}) {
//     assert(typeof options.prefix === 'string', 'options.prefix required');
//     assert(typeof options.idKey === 'string', 'options.idKey required');

//     this.options = options;
//   }

//   async create(data) {
//     data.id = await this.generateId();
//     let key = this.getKey(data.id);
//     await Promise.fromCallback((cb) => client.hmset(key, data, cb));
//     return data;
//   }

//   async get(id) {
//     let key = this.getKey(id);
//     let data = await Promise.fromCallback((cb) => client.hgetall(key, cb));
//     return data;
//   }

//   async update(id, data) {
//     let key = this.getKey(id);
//     let exists = await Promise.fromCallback((cb) => client.exists(key, cb));
//     if (exists !== 1) {
//       throw new Error('Not found');
//     }

//     await Promise.fromCallback((cb) => client.hmset(key, data, cb));
//   }

//   async remove(id) {
//     let key = this.getKey(id);
//     await Promise.fromCallback((cb) => client.del(key, cb));
//   }

//   async all() {
//     let keys = await Promise.fromCallback((cb) => client.keys(this.options.prefix + '*', cb));

//     let promises = keys.map((key) => Promise.fromCallback((cb) => client.hgetall(key, cb)));
//     let items = await Promise.all(promises);
//     return items;
//   }

//   async generateId() {
//     let id = await Promise.fromCallback((cb) => client.incr(this.options.idKey, cb));
//     return id;
//   }

//   getKey(id) {
//     return this.options.prefix + id;
//   }
// }

// module.exports = CRUDService;
