'use strict';

const mongoose = require('mongoose');
const bcrypt = require('bcrypt');

const userSchema = new mongoose.Schema({
  username: {
    type: String,
    required: true
  }, 
  email: {
    type: String,
    required: true,
    unique: true
  },
  firstName: {
    type: String,
    required: true
  },
  lastName: {
    type: String,
    required: true
  },
  mobile: {
    type: String,
  },
  password: {
    type: String,
    required: true
  },
  enabled: {
    type: Boolean,
    default: true
  },
  roles: [{ 
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'Role', 
    required: true 
  }]
}, {
  timestamps: true
});

// Save the password in encrypted form
userSchema.pre("save", function(next) {
  if (!this.isModified("password")) {
    return next();
  }

  this.password = bcrypt.hashSync(this.password, 10);
  next();
});

// Helper method for comparing the password
userSchema.methods.comparePassword = function(plaintext, callback) {
  return callback(null, bcrypt.compareSync(plaintext, this.password));
};

module.exports = mongoose.model('User', userSchema);