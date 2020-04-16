'use strict';
const mongoose = require('mongoose');
const Schema  = mongoose.Schema;
const manifestSchema = new mongoose.Schema({
  planeId: {type : Schema.Types.ObjectId, ref : 'Plane',required: true}, 
  airportFromId:  {type : Schema.Types.ObjectId, ref : 'Airport',required: true}, 
  airportToId:  {type : Schema.Types.ObjectId, ref : 'Airport',required: true},  
  shipDate: {type : Date}, 
  shippedBy: {type : String},
  stageId: {type:  Number}, 
  stage: {type : String}, 
  title: {type: String},  
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