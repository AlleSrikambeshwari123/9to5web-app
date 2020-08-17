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