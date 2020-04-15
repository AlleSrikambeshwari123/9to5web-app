const mongoose = require('mongoose');
const Schema  = mongoose.Schema;

const vehicleSchema = new mongoose.Schema({
  driverId: {
    type : Schema.Types.ObjectId, 
    ref : 'Driver',
    required: true
  }, 
  vehicleMake: {
    type: String,
    required: true
  },  
  model: {
    type: String,
    required: true
  },  
  registration: {
    type: String,
    required: true
  }, 
  location: {
    type: String,
    required: true
  }
}, {
  timestamps: true
});

module.exports = mongoose.model('Vehicle', vehicleSchema);