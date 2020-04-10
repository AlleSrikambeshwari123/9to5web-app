'use strict';

const mongoose = require('mongoose');

const packageStatusSchema = new mongoose.Schema({
  packageId: {
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'Package', 
    required: true 
  },
  status: {
    type: String,
    required: true
  },
  updatedBy: {
    type: String
  }
}, {
  timestamps: true
});

module.exports = mongoose.model('packageStatus', packageStatusSchema);
