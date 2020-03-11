let Promise = require('bluebird');
let assert = require('assert');

let client = require('./dataContext').redisClient;

const Keys = {
  item: (id) => `invoice:${id}`,
  id: () => `id:invoice`,
  awbInvoices: (awbId) => `awb:${awbId}:invoices`,
};

class InvoiceService {
  async create(data) {
    data.id = await this.generateId();
    let key = Keys.item(data.id);

    let transaction = client.multi();
    transaction.hmset(key, data);

    if (data.awbId) {
      transaction.sadd(Keys.awbInvoices(data.awbId), data.id);
    }

    await Promise.fromCallback((cb) => transaction.exec(cb));
    return data;
  }

  async getByKey(key) {
    return await Promise.fromCallback((cb) => client.hgetall(key, cb));
  }

  async get(id) {
    return await this.getByKey(Keys.item(id));
  }

  async update(id, data) {
    let key = Keys.item(id);
    let exists = await Promise.fromCallback((cb) => client.exists(key, cb));
    if (exists !== 1) {
      throw new Error('Not found');
    }

    let previous = await this.get(id);

    let transaction = client.multi();
    transaction.hmset(key, data);

    if ('awbId' in data && previous.awbId != data.awbId) {
      // If we updating awbId we should update lists of invoices for awb
      transaction.srem(Keys.awbInvoices(previous.awbId), previous.id);
      if (data.awbId) {
        transaction.sadd(Keys.awbInvoices(previous.awbId), data.awbId);
      }
    }

    await Promise.fromCallback((cb) => transaction.exec(cb));
  }

  async removeFromAWB(id) {
    await this.update(id, {
      awbId: null,
    });
  }

  async getInvoicesByAWB(awbId) {
    let ids = await Promise.fromCallback((cb) => client.smembers(Keys.awbInvoices(awbId), cb));
    let items = await Promise.map(ids, (id) => this.get(id));
    return items;
  }

  async all() {
    let keys = await Promise.fromCallback((cb) => client.keys(Keys.item('*'), cb));
    return await Promise.map(keys, (key) => this.getByKey(key));
  }

  async generateId() {
    let id = await Promise.fromCallback((cb) => client.incr(Keys.id(), cb));
    return id;
  }
}

module.exports = InvoiceService;
