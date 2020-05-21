'use strict';

const mongoose = require('mongoose');

const zoneSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true
  },   
  location: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'Location', 
    required: true 
  }
}, {
  timestamps: true
});

module.exports = mongoose.model('Zone', zoneSchema);