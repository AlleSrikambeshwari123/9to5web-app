'use strict';

const mongoose = require('mongoose');

const barCodeSchema = new mongoose.Schema({
  barcode: {
    type : String,
    required: true
  }
}, {
  timestamps: true
});

module.exports = mongoose.model('Barcode', barCodeSchema);