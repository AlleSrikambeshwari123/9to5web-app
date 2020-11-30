'use strict';

const mongoose = require('mongoose');
const bcrypt = require('bcrypt');

const customerSchemaChild = new mongoose.Schema({
  parentCustomer: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'Customer', 
    required: true 
  },
  firstName: {
    type: String,
    required: true
  },
  lastName: {
    type: String
  },
  email: {
    type: String
  },
  telephone: {
    type: String
  }, 
  password: {
    type: String
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
customerSchemaChild.pre("save", function(next) {
  if (!this.isModified("password")) {
    return next();
  }
  this.password = bcrypt.hashSync(this.password, 10);
  next();
});

// Helper method for comparing the password
customerSchemaChild.methods.comparePassword = function(plaintext, callback) {
  return callback(null, bcrypt.compareSync(plaintext, this.password));
};

module.exports = mongoose.model('CustomerChild', customerSchemaChild);
