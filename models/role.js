'use strict';

const mongoose = require('mongoose');
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

const roleSchema = new mongoose.Schema({
  type: {
    type: String,
    enum : [
      ADMIN, 
      WAREHOUSE_FL, 
      WAREHOUSE_NAS, 
      WAREHOUSE_BAHAMAS, 
      LOCATION_MANAGER,
      CUSTOMER_AGENT,
      CASHIER,
      STORE
    ],
    required: true
  }
}, {
  timestamps: true
});

module.exports = mongoose.model('Role', roleSchema);