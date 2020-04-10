'use strict';

const mongoose = require('mongoose');

const invoiceSchema = new mongoose.Schema({
  // Invoice Number
  number: {
    type: String,
    required: true
  },
  value: {
    type: String,
    required: true
  },
  filename: {
    type: String,
    required: true
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
