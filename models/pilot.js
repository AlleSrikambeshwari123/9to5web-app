'use strict';
const mongoose = require('mongoose');

const pilotSchema = new mongoose.Schema({
  firstName: {
    type: String,
    required: true
  },  
  lastName: {
    type: String,
    required: true
  },  
  company: {
    type: String,
    required: true
  }, 
  mobile: {
    type: Number,
    //required: true
  },
  email: {
    type: String,
    //required: true
  },
  warehouse: {
    type : String,
  },
}, {
  timestamps: true
});

module.exports = mongoose.model('Pilot', pilotSchema)