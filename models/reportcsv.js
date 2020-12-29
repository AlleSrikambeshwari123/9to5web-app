'use strict';

const mongoose = require('mongoose');
const Schema  = mongoose.Schema;

const reportCsvSchema = new mongoose.Schema({
  reportType: {
    type : String, 
  }, 
  dateFrom: {
    type: Date
  },  
  dateTo: {
    type: Date,
  },
  dateRange:{
    type: String,
  },  
  userId: {
    type: Schema.Types.ObjectId,
    ref : 'User',
    required: true
  }, 
  fileName: {
    type: String,
    required: true
  },  
}, {
  timestamps: true
});

module.exports = mongoose.model('ReportCsv', reportCsvSchema);