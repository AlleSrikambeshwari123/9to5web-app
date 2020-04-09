
'use strict';

const mongoose = require('mongoose');
const Schema  = mongoose.Schema;

const planeSchema = new mongoose.Schema({
  pilotId: {type : Schema.Types.ObjectId, ref : 'Pilot',required: true}, 
  warehouse: {type: String},  
  tail_number: {type: String},  
  aircraft_type: {type: String}, 
  airlineId: {type : Schema.Types.ObjectId, ref : 'Airline',required: true}, 
  maximum_capacity: {type: Number}
}, {
  timestamps: true
});

module.exports = mongoose.model('Plane', planeSchema);