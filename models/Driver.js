
'use strict';

const mongoose = require('mongoose');
const Schema  = mongoose.Schema;

const driverSchema = new mongoose.Schema({
  firstName: {type: String},  
  lastName: {type: String},  
  mobile: {type: Number},
  email: {type: String},
  location: {type: String},
  
}, {
  timestamps: true
});

module.exports = mongoose.model('Driver', driverSchema);