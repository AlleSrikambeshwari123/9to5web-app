'use strict';

const mongoose = require('mongoose');

const serviceTypeSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true
  },
  amount: {
    type: Number,
    required: 0
  }
}, {
  timestamps: true
});

module.exports = mongoose.model('ServiceType', serviceTypeSchema);