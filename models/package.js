'use strict';

const mongoose = require('mongoose');

const packageSchema = new mongoose.Schema({
  description: {
    type: String,
    required: true
  },
  trackingNo: {
    type: String
  },
  weight: {
    type: Number,
    required: true
  },
  packageCalculation: {
    type: String
  },
  packageType: {
    type: String,
    required: true
  },
  originBarcode: {
    type: String,
    required: true
  },
  
  width: {
    type: String
  },
  height: {
    type: String
  },
  dimensions: {
    type: String
  },
  awbId: {
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'Awb', 
    required: true 
  },
  customerId: {
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'Customer', 
    required: true 
  },
  shipperId: {
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'Shipper', 
    required: true 
  },
  carrierId: {
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'Carrier', 
    required: true
  },
  hazmatId: {
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'Hazmat', 
    required: true
  },
  // Additional Fields
  lastStatusText: {
    type: String
  },
  location: {
    type: String
  },
  manifestId: {
    type: String
  },
  compartmentId: {
    type: String
  }
}, {
  timestamps: true
});

module.exports = mongoose.model('Package', packageSchema);
