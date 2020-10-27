'use strict';

var moment = require('moment');
var bcrypt = require('bcrypt');
var utils = require('../Util/utils');
const csv = require('csvtojson');
const strings = require('../Res/strings');
const mail = require('../Util/mail');

// var lredis = require('./redis-local');
// var client = require('./dataContext').redisClient;
// var PREFIX = strings.redis_prefix_customer;
// var ID_COUNTER = strings.redis_id_customer;

const Customer = require('../models/customer');
const CustomerChild = require('../models/customerChild');

class CustomerChildService {

  constructor() {
    this.services = {};
}

setServiceInstances(services) {
    this.services = services;
}
  createCustomer(customer) {
    return new Promise(async (resolve, reject) => {
      if (customer.email) {
        const customerData = await this.getCustomerWithEmail(customer.email);
        if (customerData && customerData['_id']) {
          return resolve({ success: false, message: 'Account already exists' });
        } 
      }
      
      const customerData = new CustomerChild(customer);
      customerData.save((err, customer) => {
        if (err) {
          console.log("Create-customer error:",err)
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
  signUp(customer) {
    return new Promise(async (resolve, reject) => {
      const customerData = await this.getCustomerWithEmail(customer.email);
        
      if (!customerData['_id'] ) {
        return resolve({ success: false, message: strings.string_customer_not_exists });
      } 
                  
      const password = bcrypt.hashSync(customer.password, 10);
      Customer.updateOne({_id: customerData['_id']}, {password:password}).exec(async(err, updateCustomer) => {
        if (err) {
          return resolve({ success: false, message: strings.string_response_error });
        } else {
          let customerDetail = await this.getCustomerWithEmail(customer.email);
          customerDetail = JSON.parse(JSON.stringify(customerDetail));
          delete customerDetail.password;
          resolve({
            success: true,
            message: strings.string_response_created,
            customer: customerDetail,
          });
        }  
      })
    });
  }
  login(email, password) {
    return new Promise(async (resolve, reject) => {
      const customer = await this.getCustomerWithEmail(email);
      
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
  changePassword(updateData) {
    let { email, password, oldPassword } = updateData;
    return new Promise(async (resolve, reject) => {
      const customer = await this.getCustomerWithEmail(email);

      if (!(customer && customer['_id'])) {
        resolve({ authenticated: false, message: strings.string_not_found_customer });
      } else {
        customer.comparePassword(oldPassword, (err, isMatch) => {
          if (err) {
            return resolve({ success: false, message: strings.string_response_error });
          }
          if (!isMatch) {
            resolve({ authenticated: false, message: strings.string_password_incorrect });
          } else {
            password = bcrypt.hashSync(password, 10);
            Customer.findOneAndUpdate({_id: customer['_id']}, {password: password}, (err, result) => {
              if (err) {
                resolve({ success: false, message: strings.string_response_error });
              } else {
                resolve({ success: true, message: strings.string_response_updated });
              }
            })
          }
        });
      }
    })
  }
  getCustomers(object) {
    console.log("obj",object)
    return new Promise((resolve, reject) => {
      CustomerChild.find(object)
      .populate('parentCustomer')
      .exec((err, customers) => {
        if (err) {
          resolve([]);
        } else {
          resolve(customers);
        }
      })
    })
  }
  getAllCustomers(req){
    return new Promise((resolve, reject) => {
            
      var searchData = {};
      if(req && req.query){
        var daterange = req.query.daterange?req.query.daterange:'';
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

        if(!req.query.daterange && !req.query.clear){
          var endate = new Date();      
          endate.setDate(endate.getDate()+1);
          var stdate = new Date();
          stdate.setDate(stdate.getDate() -21);      
          searchData.createdAt = {"$gte":stdate, "$lte": endate};
        }
        if(req.query.clear){
          var endate = new Date();      
          endate.setDate(endate.getDate()+1);
          var stdate = new Date();
          stdate.setDate(stdate.getDate() -14);      
          searchData.createdAt = {"$gte":stdate, "$lte": endate};
        }
      }
      CustomerChild.find(searchData)
      .populate('parentCustomer')
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
      CustomerChild.findOne(fieldData)
      .populate('parentCustomer')
      .exec((err, result) => {
        if (err || !result) {
          resolve({});
        } else {
          delete result._doc.password
          resolve(result);
        }
      });
    });
  }
  getCustomerWithEmail(email) {
    return new Promise((resolve, reject) => {
      CustomerChild.find({email: new RegExp('^' + email + '$', 'i')})
      .then(results => {
        if (results.length == 0) resolve({});
        else resolve(results[0]);
      })
    });
  }
  saveProfile(body) {
    return new Promise(async (resolve, reject) => {
      const customer = await this.getCustomerWithEmail(body.email);
      if (!(customer && customer['_id'])) {
        resolve({ authenticated: false, message: strings.string_not_found_customer });
      } else {
        Customer.findOneAndUpdate({_id: customer['_id']}, {...body}, (err, result) => {
          if (err) {
            resolve({ success: false, message: strings.string_response_error });
          } else {
            resolve({ success: true, message: strings.string_response_updated });
          }
        })
      }
    })
  }
  updateCustomer(id, body) {
    return new Promise(async (resolve, reject) => {
      const email = body.email;
      const customerData = await CustomerChild.find({_id:{$ne:id},email:email});
      if(customerData && customerData.length){
        return resolve({ success: false, message: strings.string_emailExist });
      }
      const customer = await this.getCustomer({_id: id});
      if (!(customer && customer['_id'])) {
        return resolve({ success: false, message: strings.string_not_found_customer });
      } 
      CustomerChild.findOneAndUpdate({_id: id}, {...body}, (err, result) => {
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
      CustomerChild.deleteOne({_id: id}, (err, result) => {
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
          Customer.updateOne({email:email},{ fcmToken: fcmToken }).exec((err,updateData)=>{
            resolve({ success:  true, message: strings.string_response_updated });
          })
        }
      })
    });
  }

  notificationStatus(email, status) {
    return new Promise((resolve, reject) => {
      this.getCustomerWithEmail(email).then(customer => {
        if (customer.id == undefined) {
          resolve({ success: false, message: strings.string_not_found_customer });
        } else {
          Customer.updateOne({email:email},{ notificationStatus: status }).exec((err,updateData)=>{
            resolve({ success:  true, message: strings.string_response_updated });
          })
        }
      })
    });
  }
  deviceUniqueId(email, id) {
    return new Promise((resolve, reject) => {
      this.getCustomerWithEmail(email).then(customer => {
        if (customer.id == undefined) {
          resolve({ success: false, message: strings.string_not_found_customer });
        } else {
          Customer.updateOne({email:email},{ deviceId: id }).exec((err,updateData)=>{
            resolve({ success:  true, message: strings.string_response_updated });
          })
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

  requestResetPassword(email, webUrl){
    return new Promise(async (resolve, reject) => {
      try {       
        let customer = await Customer.findOne({ email: email });              
        if (!customer) {
          return resolve({ success: false, message: strings.string_not_found_customer });
        } 
        this.sendEmail('reset_password', customer, webUrl);
        resolve({ success: true, message: strings.string_password_reseted });
      }catch(error){
        console.log(error);
        resolve({ success: false, message: strings.string_response_error });
      }
    })
  }
  
  sendEmail(emailType, user, webUrl){
    if(emailType == "reset_password"){
      mail.send('reset_password/user.html', {
        email: user.email,
        subject: "Password Reset Request",
        NAME: user.firstName,
        CONFIRM_LINK: webUrl + '/reset-password/customer/' + user.id
      });
    }
  }
  
  getUserByResetPasswordToken(id) {
    return new Promise(async (resolve, reject) => {
      try {
        let customer = await Customer.findById(id);
        if (!customer) return resolve({ success: false, message: string.string_password_token_invalid });
        
        resolve({ success: true, customer: customer, token: id });
      } catch (error) {
        console.log(error.message);
        resolve({ success: false, message: error.message });
      }
    });
  }
  
  resetPassword(id, password){
    return new Promise(async (resolve, reject) => {
      try {
        let customer = await Customer.findById(id);
        if (!customer) return resolve({ success: false, message: strings.string_not_found_customer });
        customer.password = password;        
        await customer.save();
        resolve({ success: true, message: strings.string_response_updated });
      } catch (error) {
        console.log(error.message);
        resolve({ success: false, message: strings.string_response_error });
      }
    });
  }  
  getCustomerAwbsNoDocs(object) {
    return new Promise((resolve, reject) => {
        CustomerChild.find(object)
            .populate('parentCustomer')
            .exec(async (err, awbData) => {
                if (err) {
                    resolve([]);
                } else {
                    let responseArray = []
                    // for(let data of awbData){
                    //     let packagesResult = await this.services.packageService.get_Packages_update({ customerId:data._id});
                    //     responseArray.push(...packagesResult)
                    // }
                    let customerPackagesResult = await this.services.packageService.get_Packages_update({ customerId:object.createdBy});
                    responseArray.push(...customerPackagesResult)

                    resolve(responseArray);
                }
            });
    });
  }
}

module.exports = CustomerChildService;
