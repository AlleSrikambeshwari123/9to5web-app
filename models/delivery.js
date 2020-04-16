
// locationId:
// driverId:
// vehicleId:
// createdBy:
// dateCreated:
// delivery_date:
// status:


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
  	ref : 'vehicle',
  	required: true
  }, 
  createdBy: {
  	type: String
  }, 
  delivery_date: {
  	type: Date
  },
  Status: {
  	type: Number
  },
  // packages: [{ type : Schema.Types.ObjectId, ref: "Package"}]

}, {
  timestamps: true
});

module.exports = mongoose.model('Delivery', deliverySchema);