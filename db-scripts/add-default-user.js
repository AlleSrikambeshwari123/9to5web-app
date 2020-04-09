'use strict';

// Importing Environment Variables
require('dotenv').config();

const createConnection = require('../Util/mongo');

const User = require('../models/user');
const Role = require('../models/role');

const STRINGS = require('../Res/strings');
// Role Constants
const ADMIN = STRINGS.role_admin;

const defaultUser = {
  username: 'admin',
  email: 'admin@company.com',
  firstName: 'admin',
  lastName: 'ad',
  // password text: 'admin'
  password: 'admin',
  enabled: true
};

createConnection()
  .then(() => {
    console.log('******Creating Default User******');
    User.findOne({email: defaultUser.email})
    .then((user) => {
      if (user && user._id) {
        console.log('User already added!');
        process.exit();
      } else {
        Role.findOne({type: ADMIN})
        .then((role) => {
          if (!(role && role._id)) {
            console.log('Roles not found. Please user npm run create-default-roles');
            process.exit();
          } else {
            defaultUser['roles'] = [role._id];
            const newAdminUser = new User(defaultUser);
            newAdminUser.save((err, result) => {
              if (err) {
                console.log('Error while creating the user!!', err);
                process.exit();
              } else {
                console.log('Admin user has been successfully created!!');
                process.exit();
              }
            }) 
          }
        })
      }
    })
  })  
  .catch((e) => {
    console.log('Error while creating the user!!', e);
    process.exit();
  });
