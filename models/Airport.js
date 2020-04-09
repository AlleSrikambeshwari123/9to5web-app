
'use strict';

const mongoose = require('mongoose');
const Schema  = mongoose.Schema;



const airportSchema = new mongoose.Schema({
  name: {type : String,required: true}, 
  shortCode: {type: String},  
  country: {type: String}, 
}, {
  timestamps: true
});

module.exports = mongoose.model('Airport', airportSchema);