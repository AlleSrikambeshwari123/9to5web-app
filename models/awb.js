'use strict';

const mongoose = require('mongoose');
const  autoIncrement = require('mongoose-auto-increment');
autoIncrement.initialize(mongoose.connection);

const awbSchema = new mongoose.Schema({
  awbId: {
    type: Number,
    // default: 0, 
    unique: true,
    index:true
  },
  customerId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Customer',
    required: true
  },
  shipper: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Shipper',
    required: true
  },
  driver:{
    type:mongoose.Schema.Types.ObjectId,
    ref:'Driver'
  },
  carrier: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Carrier',
    required: true
  },
  hazmat: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Hazmat'
  },
  packages: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Package'
  }],
  purchaseOrders: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'PurchaseOrder'
  }],
  invoices: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Invoice'
  }],
  deliveryMethod: {
    type: String,
    required: true
  },
  isSed: {
    type: Number
  },
  note: {
    type: String
  },
  invoicecheck:{
    type:Boolean,
    default:false
  },
  fll_pickup:{
    type:Boolean,
    default:false
  },
  eamil_incoice:{
    type:Boolean,
    default:false
  },
  eamil_delivered_store:{
    type:Boolean,
    default:false
  },
  //add for searching purpose
  customerFirstName:{
    type: String,
    index:true
  },
  customerLastName:{
    type: String,
    index:true
  },
  customerFullName:{
    type: String,
    index:true
  },
  shipperName:{
    type: String,
    index:true
  },
  pmb:{
    type:Number,
    index:true
  },
  pmbString:{
    type:String,
    index:true
  },
  awbIdString: {
    type: String,
    index:true
  },
  carrierName:{
    type: String
  },
  //end searching
  po_number:{
      type: Number,
      unique: true
  },
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  updatedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  }
}, {
  timestamps: true
});

awbSchema.plugin(autoIncrement.plugin, {
  model: 'awbSchema', 
  field: 'awbId', 
  startAt: 100000
});
awbSchema.plugin(autoIncrement.plugin, {
  model: 'awbSchema', 
  field: 'po_number', 
  startAt: 1000
});

module.exports = mongoose.model('Awb', awbSchema);
