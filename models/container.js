'use strict';

const mongoose = require('mongoose');

const containerSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true
  }, 
  number: {
    type: Number
  },
  size: {
    type: Number
  }, 
  weight: {
    type: Number
  },
  date: {
    type: Date
  },
  seal: {
    type: String
  }    
}, {
  timestamps: true
});

module.exports = mongoose.model('Container', containerSchema);
