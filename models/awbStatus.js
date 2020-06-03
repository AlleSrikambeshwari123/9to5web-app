'use strict';

const mongoose = require('mongoose');

const awbStatusSchema = new mongoose.Schema({
  awbId: {
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'Awb', 
    required: true 
  },
  awbGeneratedId: {
    type: Number,
    required: true
  },
  // Created, Updated, Deleted
  action: {
    type: String,
    required: true
  },
  User: {
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'User'
  }
}, {
  timestamps: true
});

module.exports = mongoose.model('awbStatus', awbStatusSchema);
