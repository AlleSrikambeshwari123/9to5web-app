
'use strict';

const mongoose = require('mongoose');
const Schema  = mongoose.Schema;

const planeSchema = new mongoose.Schema({
  pilotId: {
    type : Schema.Types.ObjectId, 
    ref : 'Pilot',
    required: true
  }, 
  warehouse: {
    type: String
  },  
  tailNumber: {
    type: String,
    required: true
  },  
  aircraftType: {
    type: String,
    required: true
  }, 
  airlineId: {
    type : Schema.Types.ObjectId, 
    ref : 'Airline',
    required: true
  }, 
  maximumCapacity: {
    type: Number
  }
}, {
  timestamps: true
});

module.exports = mongoose.model('Plane', planeSchema);