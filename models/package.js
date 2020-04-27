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
  // Thisid is used for package on frontend side
  id: {
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
    ref: 'Hazmat'
  },
  // Additional Fields
  lastStatusText: {
    type: String
  },
  location: {
    type: String
  },
  manifestId: {
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'Manifest'
  },
  deliveryId: {
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'Delivery'
  },
  compartmentId: {
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'Compartment'
  },
  isConsolidated: {
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

module.exports = mongoose.model('Package', packageSchema);