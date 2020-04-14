'use strict';

const mongoose = require('mongoose');

const awbSchema = new mongoose.Schema({
  customerId: {
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'Customer', 
    required: true 
  },
  shipper: {
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'Shipper', 
    required: true 
  },
  carrier: {
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'Carrier', 
    required: true
  },
  hazmat: {
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'Hazmat'
  },
  packages: [{
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'Package'
  }],
  purchaseOrders: [{
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'PurchaseOrder'
  }],
  invoices: [{
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'Invoice'
  }],
  deliveryMethod: {
    type: String,
    required: true
  },
  isSed: {
    type: Number
  },
  note: {
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

module.exports = mongoose.model('Awb', awbSchema);
