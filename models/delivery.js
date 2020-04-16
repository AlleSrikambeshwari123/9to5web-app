'use strict';

const mongoose = require('mongoose');
const Schema  = mongoose.Schema;

const deliverySchema = new mongoose.Schema({
  locationId: {
  	type : Schema.Types.ObjectId,
  	ref : 'Location',
  	required: true
  },  
  driverId: {
  	type : Schema.Types.ObjectId,
  	ref : 'Driver',
  	required: true
  },
  vehicleId: {
  	type : Schema.Types.ObjectId,
  	ref : 'Vehicle',
  	required: true
  }, 
  createdBy: {
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'User', 
    required: true 
  }, 
  delivery_date: {
  	type: Date
  },
  Status: {
  	type: Number
  },
  // Additional fields
  packages: [{ 
    type : Schema.Types.ObjectId, 
    ref: "Package"
  }]
}, {
  timestamps: true
});

module.exports = mongoose.model('Delivery', deliverySchema);