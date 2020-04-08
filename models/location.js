'use strict';

const mongoose = require('mongoose');

const locationSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    unique: true
  }, 
  phone: {
    type: String
  },
  address: {
    type: String
  },
  company: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'Company', 
    required: true 
  }
}, {
  timestamps: true
});

module.exports = mongoose.model('Location', locationSchema);