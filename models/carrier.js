'use strict';

const mongoose = require('mongoose');

const carrierSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
  }, 
  firstName: {
    type: String,
  },  
  lastName: {
    type: String,
  },  
  telephone: {
    type: Number,
  }, 
  tax: {
    type: Number
  },
  email: {
    type: String
  },
  address: {
    type: String
  },
  state: {
    type: String
  },
  country: {
    type: String
  },
  zipcode: {
    type: Number
  },
  createdBy: {
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'User', 
    required: true 
  }
}, {
  timestamps: true
});

module.exports = mongoose.model('Carrier', carrierSchema);