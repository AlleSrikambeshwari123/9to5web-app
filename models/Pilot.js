'use strict';
const mongoose = require('mongoose');
const Schema  = mongoose.Schema;

const pilotSchema = new mongoose.Schema({
 
  firstName: {type: String},  
  lastName: {type: String},  
  company: {type: String}, 
  mobile: {type: Number},
  email: {type: String},
  warehouse: {type : String,required: true},

}, {
  timestamps: true
});

module.exports = mongoose.model('Pilot', pilotSchema)