'use strict';

const mongoose = require('mongoose');

const invoiceSchema = new mongoose.Schema({
  // Invoice Number
  number: {
    type: String
  },
  value: {
    type: Number
  },
  filename: {
    type: String
  },
  name: {
    type: String
  },
  awbId: {
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'Awb', 
    required: true
  },
  createdBy: {
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'User', 
    required: true 
  }             
}, {
  timestamps: true
});

module.exports = mongoose.model('Invoice', invoiceSchema);
