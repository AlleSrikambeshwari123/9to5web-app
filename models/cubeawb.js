'use strict';

const mongoose = require('mongoose');
const autoIncrement = require('mongoose-auto-increment');
autoIncrement.initialize(mongoose.connection);
const cubeAwbSchema = new mongoose.Schema(
  {
    cubeAwbNo: {
      type: Number,
      unique: true,
    },
    cubeId:{
        type:mongoose.Schema.Types.ObjectId,
        ref:'Cube'
    },
    consignee: {
      type: String,
      default: 'Nine To Five Import',
    },
    shipper: {
      type: String,
      default: 'Nine To Five Import',
    },
    cubeTrackingNo:{
        type:String
    },
    description: {
      type: String,
    },
    dimensions: {
      type: String,
    },
    weight: {
      type: Number,
    },
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
  },
  {
    timestamps: true,
  }
);

cubeAwbSchema.plugin(autoIncrement.plugin, {
  model: 'cubeAwbSchema',
  field: 'cubeAwbNo',
  startAt: 1000,
});

module.exports = mongoose.model('CubeAwb', cubeAwbSchema);
