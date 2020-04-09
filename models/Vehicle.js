// vehicle_make:
// model:
// registration:
// driverId:
// location



const mongoose = require('mongoose');
const Schema  = mongoose.Schema;

const vehicleSchema = new mongoose.Schema({
  driverId: {type : Schema.Types.ObjectId, ref : 'Driver',required: true}, 
  vehicle_make: {type: String},  
  model: {type: String},  
  registration: {type: String}, 
  location: {type: String}
}, {
  timestamps: true
});

module.exports = mongoose.model('Vehicle', vehicleSchema);