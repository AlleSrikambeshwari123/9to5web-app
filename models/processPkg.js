'use strict';

const mongoose = require('mongoose');

const processPkgSchema = new mongoose.Schema({
    userId:{
        type:mongoose.Schema.Types.ObjectId,
        ref:'User'
    },
    barcode: {
      type:mongoose.Schema.Types.ObjectId,
      ref:'Barcode'
  }
}, {
  timestamps: true
});

module.exports = mongoose.model('ProcessPackage', processPkgSchema);