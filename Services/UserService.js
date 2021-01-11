'use strict';

var cryptojs = require('crypto-js');
var jwt = require('jsonwebtoken');
var bcrypt = require('bcrypt');
const strings = require('../Res/strings');
var utils = require('../Util/utils');

const User = require('../models/user');
const Role = require('../models/role');
const Awb = require('../models/awb');
const mail = require('../Util/mail');

class UserService {
  changePassword(username, newpassword, oldpassword) {
    return new Promise((resolve, reject) => {
      this.authenticate(username, oldpassword).then((userInfo) => {
        if (userInfo.authenticated == true) {
          const newPassword = bcrypt.hashSync(newpassword, 10);
          User.findOneAndUpdate({ username: username }, { password: newPassword }, (err, response) => {
            if (err) {
              resolve({ success: false, message: strings.string_response_error });
            } else {
              resolve({ success: true, message: strings.string_response_updated });
            }
          });
        } else {
          resolve({ success: false, message: strings.string_password_incorrect });
        }
      });
    });
  }
  authenticate(username, password) {
    return new Promise(async (resolve, reject) => {
      const user = await this.getUserByEmail(username);
      if (!(user && user['_id'])) {
        return resolve({ authenticated: false, token: "", user: null });
      } else {
        user.comparePassword(password, (err, isPasswordMatch) => {
          if (err || !isPasswordMatch) {
            return resolve({ user: null, token: "", authenticated: false });
          } else {
            delete user._doc.password;
            utils.generateToken(user)
              .then((token) => {
                let isUserEnabled = true;
                if (!user.enabled) {
                  isUserEnabled = false;
                }
                return resolve({
                  user,
                  token,
                  isUserEnabled,
                  authenticated: true
                });
              })
              .catch((err) => {
                resolve({ user: null, token: "", authenticated: false });
              })
          }
        })
      }
    });
  }
  getUserByEmail(email) {
    return new Promise(function (resolve, reject) {
      User.findOne({
        $or : [
          { email: email },
          { username: email }
        ]
      })
        .populate('roles', 'type')
        .exec((err, result) => {
          if (err) {
            resolve({});
          } else {
            resolve(result);
          }
        })
    });
  }
  getUser(username) {
    return new Promise(function (resolve, reject) {
      User.findOne({ username: username })
        .populate('roles', 'type')
        .exec((err, result) => {
          if (err) {
            resolve({});
          } else {
            resolve(result);
          }
        })
    });
  }
  getRoles() {
    return new Promise(function (resolve, reject) {
      var roles = ['Admin', 'Warehouse FLL', 'Warehouse NAS', 'Custom Agent']
      Role.find({type:{$in:roles}}).exec((err, result) => {
        if (err) {
          resolve([]);
        } else {
          resolve(result);
        }
      })
    });
  }
  getAllUsers(req) {
    return new Promise((resolve, reject) => {
      var searchData = {};
      if(req && req.query){
      var daterange = req.query.daterange?req.query.daterange:'';  
          
      
      if(daterange){
        var moment = require('moment');
        var date_arr = daterange.split('-');
        var startDate = (date_arr[0]).trim();      
        var stdate = new Date(startDate);
        
        stdate.setDate(stdate.getDate() +1);
        var endDate = (date_arr[1]).trim();
        var endate = new Date(endDate);
        endate.setDate(endate.getDate() +1);

        stdate = new Date(stdate.setUTCHours(0,0,0,0));
        stdate = stdate.toISOString();
        endate = new Date(endate.setUTCHours(23,59,59,0));
        endate = endate.toISOString();
        //var stdate = new Date(stdate.getFullYear(), stdate.getMonth(), stdate.getDate(), 0, 0, 0);   
        searchData.createdAt = {"$gte":stdate, "$lte": endate};
      }
      

      if(!req.query.daterange && !req.query.clear){
        var endate = new Date();      
        endate.setDate(endate.getDate());
        var stdate = new Date();
        stdate.setDate(stdate.getDate() - parseInt(strings.default_days_table));  

        stdate = new Date(stdate.setUTCHours(0,0,0,0));
        stdate = stdate.toISOString();
        endate = new Date(endate.setUTCHours(23,59,59,0));
        endate = endate.toISOString();
            
        searchData.createdAt = {"$gte":stdate, "$lte": endate};
      }
      if(req.query.clear){
        var endate = new Date();      
        endate.setDate(endate.getDate()+1);
        var stdate = new Date();
        stdate.setDate(stdate.getDate() -14); 
        
        stdate = new Date(stdate.setUTCHours(0,0,0,0));
        stdate = stdate.toISOString();
        endate = new Date(endate.setUTCHours(23,59,59,0));
        endate = endate.toISOString();

        searchData.createdAt = {"$gte":stdate, "$lte": endate};
      }
    }
    console.log(searchData);
      User.find(searchData)
        .populate('roles')
        .exec((err, users) => {
          if (err) {
            resolve([]);
          } else {
            // Creating the user ids array i.e ['id1', 'id2']
            const userIds = users.map((user) => user['_id']);

            // Searching by array
            Awb.find({ createdBy: { '$in': userIds } }, (err, awbs) => {
              const awbByUserIds = {};
              awbs.forEach((awb) => {
                if (!awbByUserIds[awb['createdBy']]) {
                  awbByUserIds[awb['createdBy']] = 0;
                }
                awbByUserIds[awb['createdBy']] += 1
              })
              users = users.map((user) => {
                let newUser = user._doc;
                if (awbByUserIds[user._id]) newUser['awbCount'] = awbByUserIds[user._id];
                else newUser['awbCount'] = 0;
                return newUser;
              })
              resolve(users);
            });
          }
        });
    });
  }

  getAllUsersWithAwbCount(req){
    return new Promise((resolve, reject) => {
      var searchData = {}
      var endate = new Date();      
      endate.setDate(endate.getDate());
      var stdate = new Date();
      stdate.setDate(stdate.getDate() - parseInt(1));  

      stdate = new Date(stdate.setUTCHours(0,0,0,0));
      //stdate = stdate.toISOString();
      endate = new Date(endate.setUTCHours(23,59,59,0));
      //endate = endate.toISOString();
          
      searchData.createdAt = {"$gte":stdate, "$lte": endate};
      Awb.aggregate([
        {$match:searchData},
        {
          $group:{
            _id:"$createdBy",
            awbCount:{$sum:1}
          }
        },
        {
          $lookup:{
            from:"users",
            localField: "_id",
            foreignField:"_id",
            as:"user"
          }
        },
        {$unwind:"$user"}
      ]).exec((err,data)=>{
        console.log("result>>>>>>>>>>>>>>>",searchData,data)
        if (err) {
          console.log(err)
          resolve([]);
        }else{
          resolve(data)
        }
      })
    })
  }

  getAllUsersData(req) {
    return new Promise((resolve, reject) => {
      var searchData = {};
      if(req && req.query){
      var daterange = req.query.daterange?req.query.daterange:'';  
          
      
      if(daterange){
        var moment = require('moment');
        var date_arr = daterange.split('-');
        var startDate = (date_arr[0]).trim();      
        var stdate = new Date(startDate);
        
        stdate.setDate(stdate.getDate() +1);
        var endDate = (date_arr[1]).trim();
        var endate = new Date(endDate);
        endate.setDate(endate.getDate() +1);

        stdate = new Date(stdate.setUTCHours(0,0,0,0));
        stdate = stdate.toISOString();
        endate = new Date(endate.setUTCHours(23,59,59,0));
        endate = endate.toISOString();
        //var stdate = new Date(stdate.getFullYear(), stdate.getMonth(), stdate.getDate(), 0, 0, 0);   
        searchData.createdAt = {"$gte":stdate, "$lte": endate};
      }
      

      if(!req.query.daterange && !req.query.clear){
        var endate = new Date();      
        endate.setDate(endate.getDate());
        var stdate = new Date();
        stdate.setDate(stdate.getDate() - parseInt(strings.default_days_table));  

        stdate = new Date(stdate.setUTCHours(0,0,0,0));
        stdate = stdate.toISOString();
        endate = new Date(endate.setUTCHours(23,59,59,0));
        endate = endate.toISOString();
            
        searchData.createdAt = {"$gte":stdate, "$lte": endate};
      }
      if(req.query.clear){
        var endate = new Date();      
        endate.setDate(endate.getDate()+1);
        var stdate = new Date();
        stdate.setDate(stdate.getDate() -14); 
        
        stdate = new Date(stdate.setUTCHours(0,0,0,0));
        stdate = stdate.toISOString();
        endate = new Date(endate.setUTCHours(23,59,59,0));
        endate = endate.toISOString();

        searchData.createdAt = {"$gte":stdate, "$lte": endate};
      }
    }
      User.aggregate([
        {$match:searchData},
        {
          $lookup:{
            from:"awbs",
            localField:"_id",
            foreignField:"createdBy",
            as:"awb"
          }
        },
        {
          $project:{
            username:1,  
            name:{$concat:['$firstName',' ', '$lastName']},
            awbCount:{$size:"$awb"},
            email:1   
          }
        }
      ]).exec((err, result)=>{
        resolve(result);
      })
    });
  }


  allUsers(req){
    return new Promise(async (resolve, reject) => {
      var start = req.body.start ? parseInt(req.body.start) : 0;
      var length = req.body.length ? parseInt(req.body.length) : 10;
      var sortColumn = req.body.order;  
      
      var field = req.body['order[0][column]'] ?parseInt(req.body['order[0][column]']) : 0;
      var columns = {0:'createdAt', 1: 'createdAt', 2: 'username', 3:'firstName', 4: 'email', 5: 'mobile'} 
      
      var dir = req.body['order[0][dir]'] ? req.body['order[0][dir]'] : 0;
      var sort = (dir=='asc') ? 1 : -1;
      var sortField = columns[field];
      var search = req.body['search[value]'] ? req.body['search[value]'] : '';
      var daterange = req.body.daterange?req.body.daterange:''
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
        
        stdate = new Date(stdate.setUTCHours(0,0,0,0));
        stdate = stdate.toISOString();
        endate = new Date(endate.setUTCHours(23,59,59,0));
        endate = endate.toISOString(); 
            
        searchData.createdAt = {"$gte":stdate, "$lte": endate};
      }

      if(!req.body.daterange && !req.body.clear){
        var endate = new Date();      
        endate.setDate(endate.getDate());
        var stdate = new Date();
        stdate.setDate(stdate.getDate() - parseInt(strings.default_days_table));  
        
        stdate = new Date(stdate.setUTCHours(0,0,0,0));
        stdate = stdate.toISOString();
        endate = new Date(endate.setUTCHours(23,59,59,0));
        endate = endate.toISOString(); 
             
        searchData.createdAt = {"$gte":stdate, "$lte": endate};
      }
      if(search){
        searchData.$or = [
          {username:{'$regex' : search, '$options' : 'i'}},
          {firstName:{'$regex' : search, '$options' : 'i'}},
          {email:{'$regex' : search, '$options' : 'i'}},
          {mobile:{'$regex' : search, '$options' : 'i'}}
        ]
      }
      var totalusers = await User.count(searchData);
     
      User.find(searchData)
        .populate({path:'roles'})
        .sort({[sortField]:sort})
        .skip(start)
        .limit(length)
        .exec((err, users) => {
         // console.log(users)
          if (err) {
            resolve([]);
          } else {
            // Creating the user ids array i.e ['id1', 'id2']
            const userIds = users.map((user) => user['_id']);

            // Searching by array
            Awb.find({ createdBy: { '$in': userIds } }, (err, awbs) => {
              const awbByUserIds = {};
              awbs.forEach((awb) => {
                if (!awbByUserIds[awb['createdBy']]) {
                  awbByUserIds[awb['createdBy']] = 0;
                }
                awbByUserIds[awb['createdBy']] += 1
              })
              users = users.map((user) => {
                let newUser = user._doc;
                if (awbByUserIds[user._id]) newUser['awbCount'] = awbByUserIds[user._id];
                else newUser['awbCount'] = 0;
                return newUser;
              })
              resolve({users:users, total: totalusers});
            });
          }
        });
    })
  }


  removeUser(username, loggedInUserName) {
    return new Promise((resolve, reject) => {
      if (username === loggedInUserName) {
        resolve({ success: false, message: strings.string_restrict_action });
        return;
      }
      User.deleteOne({ username: username }, (err, result) => {
        if (err) {
          resolve({ success: false, message: strings.string_response_error });
        } else {
          resolve({ success: true, message: strings.string_response_removed });
        }
      });
    });
  }
  enableUser(username, enabledSatus, loggedInUserName) {
    return new Promise((resolve, reject) => {
      if (username === loggedInUserName) {
        resolve({ success: false, message: strings.string_restrict_action });
        return;
      }
      User.findOneAndUpdate({ username: username }, { enabled: enabledSatus }, (err, result) => {
        if (err) {
          resolve({ success: false, message: strings.string_response_error });
        } else {
          resolve({ success: true, message: strings.string_response_updated });
        }
      })
    });
  }
  createUser(user) {
    return new Promise(async (resolve, reject) => {
      const oldUser = await this.getUser(user.username);
      let index = await User.syncIndexes()
      // Checking If username is already present 
      if (oldUser && oldUser.username && oldUser.username.toLowerCase() === user.username.toLowerCase()) {
        return resolve({ success: false, message: strings.string_user_exist });
      }

      user.roles = user.roles.split(',');
      const newUser = new User(user);

      newUser.save((err, result) => {
        if (err) {
          console.error('Error while creating the user!!');
          resolve({ success: false, message: strings.string_response_error });
        } else {
          resolve({ success: true, message: strings.string_response_created });
        }
      })
    })
  }
  updateUser(user) {
    return new Promise(async (resolve, reject) => {
      const userData = await this.getUser(user.username);
      if (!(userData && userData._id)) {
        return resolve({ success: false, message: strings.string_not_found_user });
      }
      if(user.password){
        const password = bcrypt.hashSync(user.password, 10);
        user.password  = password 
      }

      User.findOneAndUpdate(
        { _id: userData['_id'] },
        {
          ...user,
          roles: user.roles.split(',')
        },
        (err, result) => {
          if (err) {
            resolve({ success: false, message: strings.string_response_error });
          } else {
            resolve({ success: true, message: strings.string_response_updated });
          }
        })
    });
  }
  requestPasswordReset(email, webUrl) {
    return new Promise(async (resolve, reject) => {
      try {
        let user = await User.findOne({ email: email });
        if (!user) {
          return resolve({ success: false, message: strings.string_user_not_found });
        }
        this.sendEmail('reset_password', user, webUrl);
        resolve({ success: true, message: strings.string_password_reseted });
      } catch (error) {
        console.log(error);
        resolve({ success: false, message: strings.string_response_error });
      }
    })
  }

  sendEmail(emailType, user, webUrl) {
    if (emailType == "reset_password") {
      mail.send('reset_password/user.html', {
        email: user.email,
        subject: "Password Reset Request",
        NAME: user.firstName,
        CONFIRM_LINK: webUrl + '/reset-password/user/' + user.id
      });
    }
  }

  getUserByResetPasswordToken(id) {
    console.log(id)
    return new Promise(async (resolve, reject) => {
      try {
        let user = await User.findById(id);
        if (!user) return resolve({ success: false, message: string.string_password_token_invalid });

        resolve({ success: true, user: user, token: id });
      } catch (error) {
        console.log(error.message);
        resolve({ success: false, message: error.message });
      }
    });
  }

  resetPassword(id, password) {
    return new Promise(async (resolve, reject) => {
      try {
        let user = await User.findById(id);
        if (!user) return resolve({ success: false, message: strings.string_user_not_found });
        user.password = password;
        await user.save();
        resolve({ success: true, message: strings.string_response_updated });
      } catch (error) {
        console.log(error.message);
        resolve({ success: false, message: strings.string_response_error });
      }
    });
  }

}

module.exports = UserService;