'use strict';

var cryptojs = require('crypto-js');
var jwt = require('jsonwebtoken');
var bcrypt = require('bcrypt');
const strings = require('../Res/strings');
var utils = require('../Util/utils');

// Redis
var client = require('./dataContext').redisClient;
var lredis = require('./redis-local');

const User = require('../models/user');
const Role = require('../models/role');

var PREFIX = strings.redis_prefix_user;
var ID_COUNTER = strings.redis_id_user;

class UserService {
  changePassword(username, newpassword, oldpassword) {
    return new Promise((resolve, reject) => {
      this.authenticate(username, oldpassword).then((userInfo) => {
        if (userInfo.authenticated == true) {
          const newPassword = bcrypt.hashSync(newpassword, 10);
          User.findOneAndUpdate({username: username}, {password: newPassword}, (err, response) => {
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
      const user = await this.getUser(username);
      
      if (!(user && user['_id'])) {
        return resolve({ authenticated: false, token: "", user: null });
      } else {
        user.comparePassword(password, (err, isPasswordMatch) => {
          if (err || !isPasswordMatch) {
            return resolve({ user: null, token: "", authenticated: false });
          } else {
            utils.generateToken(user)
            .then((token) => {
              delete user.password;
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
            .catch(() => {
              resolve({ user: null, token: "", authenticated: false });
            })
          }
        })
      }
    });
  }
  getUser(username) {
    return new Promise(function (resolve, reject) {
      User.findOne({username: username})
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
      Role.find({}, (err, result) => {
        if (err) {
          resolve([]);
        } else {
          resolve(result);
        }
      })
    });
  }
  getAllUsers() {
    return new Promise((resolve, reject) => {
      User.find({})
      .populate('roles')
      .exec((err, result) => {
        if (err) {
          resolve([]);
        } else {
          resolve(result)
        }
      });
    });
  }
  removeUser(username, loggedInUserName) {
    return new Promise((resolve, reject) => {
      if (username === loggedInUserName) {
        resolve({ success: false, message: strings.string_restrict_action });
        return;
      }
      User.deleteOne({username: username}, (err, result) => {
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
      User.findOneAndUpdate({username: username}, {enabled: enabledSatus}, (err, result) => {
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
      
      // Checking If username is already present 
      if (oldUser && oldUser.username && oldUser.username.toLowerCase() === user.username.toLowerCase()) {
        resolve({ success: false, message: strings.string_user_exist });
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

      User.findOneAndUpdate(
        {_id: userData['_id']},
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
}

module.exports = UserService;