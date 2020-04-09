'use strict';

// Importing Environment Variables
require('dotenv').config();

const createConnection = require('../Util/mongo');
const Role = require('../models/role');
const STRINGS = require('../Res/strings');

// Role Constants
const ADMIN = STRINGS.role_admin;
const WAREHOUSE_FL = STRINGS.role_warehouse_fl;
const WAREHOUSE_NAS = STRINGS.role_warehouse_nas;
const WAREHOUSE_BAHAMAS = STRINGS.role_warehouse_bahamas;
const LOCATION_MANAGER = STRINGS.role_location_manager;
const CUSTOMER_AGENT = STRINGS.role_customer_agent;
const CASHIER = STRINGS.role_cashier;
const STORE = STRINGS.role_store;

const defaultRoles = [{
  type: ADMIN
}, {
  type: WAREHOUSE_FL
}, {
  type: WAREHOUSE_NAS
}, {
  type: WAREHOUSE_BAHAMAS
}, {
  type: LOCATION_MANAGER
}, {
  type: CUSTOMER_AGENT
}, {
  type: CASHIER
}, {
  type: STORE
}];

createConnection()
  .then(() => {
    console.log('******Creating Default Roles******');
    return Role.find({}, (err, response) => {
      if (err) {
        console.error('Error while inserting the roles', err);
        process.exit();
      }
      if (response.length === defaultRoles.length) {
        console.log('Roles default data already added!!');
        process.exit();
      }
      return Role.deleteMany({});
    })
  })
  .then(() => {
    return Role.insertMany(defaultRoles);
  })
  .then(() => {
    console.log('Roles has been successfully Added!!');
    process.exit();
  })
  .catch((error) => {
    console.error('Error while inserting the roles', error);
    process.exit();
  });
