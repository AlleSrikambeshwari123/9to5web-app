
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
    type: Number
  },
  accountNo: {
    type: Number
  },
  type: {
    type: String
  },
  isExternal: {
    type: Boolean
  },
  tranVersion: {
    type: String
  },
   departurePortId: {
    type: String
  },
}, {
  timestamps: true
});

module.exports = mongoose.model('Shipper', shipperSchema);