'use strict';

var moment = require('moment');
var bcrypt = require('bcrypt');
var utils = require('../Util/utils');
const csv = require('csvtojson');
const strings = require('../Res/strings');

var lredis = require('./redis-local');
var client = require('./dataContext').redisClient;

const Customer = require('../models/customer');

var PREFIX = strings.redis_prefix_customer;
var ID_COUNTER = strings.redis_id_customer;

class CustomerService {
  signUp(customer) {
    return new Promise(async (resolve, reject) => {
      if (customer.email) {
        const customerData = await this.getCustomer({email: customer.email.toLowerCase()});
        if (customerData && customerData['_id']) {
          return resolve({ success: false, message: 'Account already exists' });
        } 
      }

      const customerData = new Customer(customer);
      customerData.save((err, customer) => {
        if (err) {
          return resolve({ success: false, message: strings.string_response_error });
        } else {
          delete customer.password;
          resolve({
            success: true,
            message: strings.string_response_created,
            customer: customer,
          });
        }  
      })
    });
  }
  login(email, password) {
    return new Promise(async (resolve, reject) => {
      const customer = await this.getCustomer({email: email});
      
      if (!(customer && customer['_id'])) {
        resolve({ authenticated: false, message: strings.string_not_found_customer });
      } else {
        customer.comparePassword(password, (err, isMatch) => {
          if (err) {
            return resolve({ success: false, message: strings.string_response_error });
          }

          if (!isMatch) {
            resolve({ authenticated: false, message: strings.string_password_incorrect });
          } else {
            delete customer.password;
            utils.generateToken(customer)
            .then((token) => {
              return resolve({ authenticated: true, token: token, user: customer });
            })
            .catch(() => {
              return resolve({ success: false, message: strings.string_response_error });
            })
          }
        });
      }
    })
  }
  getCustomers() {
    return new Promise((resolve, reject) => {
      Customer.find({})
      .populate('company', 'name')
      .populate('location', 'name')
      .exec((err, customers) => {
        if (err) {
          resolve([]);
        } else {
          resolve(customers);
        }
      })
    })
  }
  getCustomer(fieldData) {
    return new Promise((resolve, reject) => {
      Customer.findOne(fieldData)
      .populate('company', 'name')
      .populate('location', 'name')
      .exec((err, result) => {
        if (err || !result) {
          resolve({});
        } else {
          resolve(result);
        }
      });
    });
  }
  getCustomerWithEmail(email) {
    return new Promise((resolve, reject) => {
      lredis.search(PREFIX, [{ field: 'email', value: email }]).then(results => {
        if (results.length == 0) resolve({});
        else resolve(results[0]);
      })
    });
  }
  updateCustomer(id, body) {
    return new Promise(async (resolve, reject) => {
      const customer = await this.getCustomer({_id: id});
      if (!(customer && customer['_id'])) {
        return resolve({ success: false, message: strings.string_not_found_customer });
      } 

      Customer.findOneAndUpdate({_id: id}, {...body}, (err, result) => {
        if (err) {
          resolve({ success: false, message: strings.string_response_error });
        } else {
          resolve({ success: true, message: strings.string_response_updated });
        }
      })
    })
  }
  removeCustomer(id) {
    return new Promise((resolve, reject) => {
      Customer.deleteOne({_id: id}, (err, result) => {
        if (err) {
          resolve({ success: false, message: strings.string_response_error });
        } else {
          resolve({ success: true, message: strings.string_response_removed });
        }
      })
    });
  }
  removeAll() {
    return new Promise((resolve, reject) => {
      Customer.deleteMany({}, (err, result) => {
        if (err) {
          resolve({ success: false, message: strings.string_response_error });
        } else {
          resolve(result);
        }
      })
    });
  }
  updateFcm(email, fcmToken) {
    return new Promise((resolve, reject) => {
      this.getCustomerWithEmail(email).then(customer => {
        if (customer.id == undefined) {
          resolve({ success: false, message: strings.string_not_found_customer });
        } else {
          client.hmset(PREFIX + customer.id, { fcmToken: fcmToken });
          resolve({ success: true, message: strings.string_response_updated });
        }
      })
    });
  }

  importShippersFromCsv() {
    return new Promise((resolve, reject) => {
      this.removeAll().then(result => {
        csv().fromFile("./DB_Seed/customers.csv").then(jsonObj => {
          Promise.all(jsonObj.map(element => {
            client.incr(ID_COUNTER, (err, id) => {
              return lredis.hmset(PREFIX + id, {
                id: id,
                name: element.sCustomerName,
                firstName: element.sFirstName,
                lastName: element.sLastName,
                telephone: element.sTelephone,
                address: element.sAddress,
                pmb: element.iPMBID,
                email: element.sEmail,
                city: element.sCity,
                state: element.sState,
                zipcode: element.sZipcode,
                company: element.sCompany,
                country: element.sCountry,
                priorityLevel: element.iPriorityLevel,
                notOnPmb: element.bNotOnPMB,
                note: element.sNotes,
                createdBy: element.iCreatedBy,
                createdOn: element.dtCreatedOn,
                tranVersion: element.msrepl_tran_version,
                poeRequired: element.bPOERequired,
              });
            });
          })).then(result => {
            resolve(result);
          })
        })
      })
    });
  }
}

module.exports = CustomerService;
