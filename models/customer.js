'use strict';

const mongoose = require('mongoose');
const bcrypt = require('bcrypt');

const customerSchema = new mongoose.Schema({
  company: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'Company', 
    required: true 
  },
  pmb: {
    type: Number,
    required: true
  },
  firstName: {
    type: String,
    required: true
  },
  lastName: {
    type: String
  },
  telephone: {
    type: String
  }, 
  email: {
    type: String
  },
  password: {
    type: String
  },
  location: {
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'Location', 
    required: true 
  },
  address: {
    type: String
  },
  city: {
    type: String
  }, 
  state: {
    type: String
  }, 
  country: {
    type: String
  },
  zipcode: {
    type: String
  }, 
  note: {
    type: String
  }, 
  fcmToken:{
    type:String
  },
  notificationStatus:{
    type:Number,
    default:1
  },
  deviceId:{
    type:String,
    unique:true
  },
  createdBy: {
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'User', 
    required: true 
  }
}, {
  timestamps: true
});

// Save the password in encrypted form
customerSchema.pre("save", function(next) {
  if (!this.isModified("password")) {
    return next();
  }

  this.password = bcrypt.hashSync(this.password, 10);
  next();
});

// Helper method for comparing the password
customerSchema.methods.comparePassword = function(plaintext, callback) {
  return callback(null, bcrypt.compareSync(plaintext, this.password));
};

module.exports = mongoose.model('Customer', customerSchema);
