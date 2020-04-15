'use strict';

const mongoose = require('mongoose');

const purchaseOrderSchema = new mongoose.Schema({
  source: {
    type: String,
    required: true
  },
  paidTypeId: {
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'PaidType', 
    required: true 
  },
  serviceTypeId: {
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'ServiceType', 
    required: true
  },
  amount: {
    type: Number,
    required: true
  },
  notes: {
    type: String
  },
  paidTypeText: {
    type: String,
    required: true
  }, 
  sourceText: {
    type: String,
    required: true
  },
  serviceTypeText: {
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

module.exports = mongoose.model('PurchaseOrder', purchaseOrderSchema);