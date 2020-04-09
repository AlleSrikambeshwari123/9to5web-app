'use strict';

const mongoose = require('mongoose');
const Schema  = mongoose.Schema;

const compartmentSchema = new mongoose.Schema({
  planeId: {type : Schema.Types.ObjectId, ref : 'Plane',required: true}, 
  weight: {type: Number},  
  name: {type: String},  
  volume: {type: Number}
}, {
  timestamps: true
});

module.exports = mongoose.model('Compartment', compartmentSchema);