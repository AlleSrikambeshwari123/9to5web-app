'use strict';

const mongoose = require('mongoose');

const invoiceSchema = new mongoose.Schema({
  // Invoice Number
  number: {
    type: String
  },
  value: {
    type: String
  },
  filename: {
    type: String
  },
  awbId: {
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'Awb', 
    required: true
  }             
}, {
  timestamps: true
});

module.exports = mongoose.model('Invoice', invoiceSchema);
