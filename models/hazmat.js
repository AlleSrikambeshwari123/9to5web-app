'use strict';

const mongoose = require('mongoose');

const hazmatTypeSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true
  },
  description: {
    type: String,
    required: true
  }
}, {
  timestamps: true
});

module.exports = mongoose.model('Hazmat', hazmatTypeSchema);