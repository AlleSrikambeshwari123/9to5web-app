'use strict';

const mongoose = require('mongoose');
const cube2TypeSchema = new mongoose.Schema({
  type: {
    type: String,
  },
  createdBy: {
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'User', 
    required: true 
  }
}, {
  timestamps: true
});

module.exports = mongoose.model('Cube2Type', cube2TypeSchema);