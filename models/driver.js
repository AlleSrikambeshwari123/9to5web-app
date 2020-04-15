
'use strict';

const mongoose = require('mongoose');

const driverSchema = new mongoose.Schema({
  firstName: {
    type: String,
    required: true
  },  
  lastName: {
    type: String,
    required: true
  },  
  mobile: {
    type: Number,
    required: true
  },
  email: {
    type: String,
    required: true
  },
  location: {
    type: String,
    required: true
  },
}, {
  timestamps: true
});

module.exports = mongoose.model('Driver', driverSchema);