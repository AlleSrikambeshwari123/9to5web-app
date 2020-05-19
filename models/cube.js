'use strict';

const mongoose = require('mongoose');

const cubeTypeSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true
  },
  packages:[mongoose.Schema.Types.ObjectId],
  createdBy: {
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'Customer', 
    required: true 
  },
  cubepackageId:{
      type: mongoose.Schema.Types.ObjectId,
      ref:'Package',
      required:true
  }
}, {
  timestamps: true
});

module.exports = mongoose.model('Cube', cubeTypeSchema);