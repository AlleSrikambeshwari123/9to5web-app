'use strict';
const mongoose = require('mongoose');
const Schema  = mongoose.Schema;
const manifestSchema = new mongoose.Schema({
  planeId: {
    type : Schema.Types.ObjectId,
    ref : 'Plane',
    required: true
  },
  originalManifestId: {
    type : Schema.Types.ObjectId,
    ref:'Manifest'
  },
  packages:[{
    type:Schema.Types.ObjectId,
    ref:'Package'
  }], 
  clonePackages:[{
    type:Schema.Types.ObjectId,
    ref:'Package'
  }], 
  airportFromId:  {
    type : Schema.Types.ObjectId, 
    ref : 'Airport',
    required: true
  }, 
  airportToId:  {
    type : Schema.Types.ObjectId, 
    ref : 'Airport',
    required: true
  },  
  shipDate: {
    type : Date
  }, 
  shippedBy: {
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'User'
  },
  // received manifest field
  receivedBy: {
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'User'
  },
  receiveDate: {
    type: Date
  },
  stageId: {
    type:  Number
  }, 
  stage: {
    type : String
  }, 
  title: {
    type: String
  },  
  // stageId: {type : Schema.Types.ObjectId, ref : 'Stage',required: true}
}, {
  timestamps: true
});

manifestSchema.virtual('plane',{
  ref: 'Plane',
  localField: 'planeId',
  foreignField: '_id',
  justOne: true
});

manifestSchema.set('toObject', { virtuals: true });
manifestSchema.set('toJSON', { virtuals: true });

module.exports = mongoose.model('Manifest', manifestSchema);