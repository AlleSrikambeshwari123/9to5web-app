'use strict';

const mongoose = require('mongoose');
const cubeTypeSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true
  },
  cubeAwbId:{
    type:mongoose.Schema.Types.ObjectId,
    ref:'CubeAwb'
  },
  userId:{
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'Customer', 
    required: true 
  },
  packages:[{ type: mongoose.Schema.Types.ObjectId,ref:"Package"}],
  createdBy: {
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'Customer', 
    required: true 
  },
  cubepackageId:{
      type: mongoose.Schema.Types.ObjectId,
      ref:'PackageHistory'
  }
}, {
  timestamps: true
});

module.exports = mongoose.model('Cube', cubeTypeSchema);