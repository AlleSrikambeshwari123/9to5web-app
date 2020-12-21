'use strict';

const mongoose = require('mongoose');

const packageSchema = new mongoose.Schema({
  description: {
    type: String,
    required: true
  },
  trackingNo: {
    type: String
  },
  weight: {
    type: Number,
    required: true
  },
  packageCalculation: {
    type: String
  },
  packageType: {
    type: String,
    required: true
  },
  express:{
    type:Boolean,
    default:false
  },
  aging:{
    type:Number
  },
  agingdollar:{
    type:Number
  },
  emailAging:{
    type:Boolean,
    default:false
  },
  agingStore:{
    type:Number
  },
  agingStoredollar:{
    type:Number
  },
  emailAgingStore:{
    type:Boolean,
    default:false
  },
  originBarcode: {
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'Barcode', 
    required: true
  },
  // Thisid is used for package on frontend side
  id: {
    type: String,
    required: true
  },
  width: {
    type: String
  },
  height: {
    type: String
  },
  dimensions: {
    type: String
  },
  companyId:{
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'Company', 
  },
  zoneId:{
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'Zone', 
  },
  awbId: {
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'Awb', 
    required: true 
  },
  customerId: {
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'Customer', 
    required: true 
  },
  shipperId: {
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'Shipper', 
    required: true 
  },
  carrierId: {
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'Carrier', 
    required: true
  },
  hazmatId: {
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'Hazmat'
  },
  // Additional Fields
  lastStatusText: {
    type: String
  },
  lastStatusDate: {
    type: Date
  },
  location: {
    type: String
  },
  manifestId: {
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'Manifest'
  },
  cloneManifestId: {
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'Manifest'
  },
  deliveryId: {
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'Delivery'
  },
  compartmentId: {
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'Compartment'
  },
  cubeId:{
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'Cube'
  },
  isConsolidated: {
    type: String
  },
  //add for searching purpose
  awbIdNumber:{
    type: Number
  },
  awbIdString:{
    type: String
  },  
  barcode:{
    type: String
  },
  customerFirstName:{
    type: String
  },
  customerLastName:{
    type: String
  },
  customerFullName:{
    type: String
  },
  pmb:{
    type:Number
  },
  pmbString:{
    type:String
  },
  shipperName:{
    type: String
  },
  storeLocation:{
    type: String
  },
  //end searching
  createdBy: {
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'User', 
    required: true 
  }
}, {
  timestamps: true
});

module.exports = mongoose.model('Package', packageSchema);
