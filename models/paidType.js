'use strict';

const mongoose = require('mongoose');

const paidTypeSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true
  }
}, {
  timestamps: true
});

module.exports = mongoose.model('PaidType', paidTypeSchema);
