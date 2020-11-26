
'use strict';

const mongoose = require('mongoose');

const shipperSchema = new mongoose.Schema({
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
  fax: {
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
    type: String
  },
  tax: {
    type: String
  },
  createdBy: {
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'User', 
    required: true 
  }
}, {
  timestamps: true
});

module.exports = mongoose.model('Shipper', shipperSchema);