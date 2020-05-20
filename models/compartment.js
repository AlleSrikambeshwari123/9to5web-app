'use strict';

const mongoose = require('mongoose');
const Schema  = mongoose.Schema;

const compartmentSchema = new mongoose.Schema({
  planeId: {
    type : Schema.Types.ObjectId, 
    ref : 'Plane',
    required: true
  }, 
  packages:[{
      type:Schema.Types.ObjectId,
      ref:'Package'
    }],
  weight: {
    type: Number
  },  
  name: {
    type: String
  },  
  volume: {
    type: Number
  },
  createdBy:{
    type:Schema.Types.ObjectId,
    ref: 'User', 
    required: true 
  }
}, {
  timestamps: true
});

module.exports = mongoose.model('Compartment', compartmentSchema);