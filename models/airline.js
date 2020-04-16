'use strict';
const mongoose = require('mongoose');
const airlineSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
  }, 
  firstName: {
    type: String,
  },  
  lastName: {
    type: String,
  }
}, {
  timestamps: true
});

module.exports = mongoose.model('Airline', airlineSchema);