'use strict';

const mongoose = require('mongoose');

const PriceLabelSchema = new mongoose.Schema(
  {
    // packageId: {
    //   type: mongoose.Schema.Types.ObjectId,
    //   ref: 'Package',
    // },
    awbId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Awb',
    },
    Brokerage: { type: Number,default:0 },
    CustomsProc: { type: Number,default:0 },
    CustomsVAT: { type: Number,default:0 },
    VatMultiplier: { type: Number,default:0.12 }, 
    SumOfAllCharges: { type: Number,default:0 },
    Delivery: { type: Number,default:0 },
    Duty: { type: Number,default:0 },
    EnvLevy: { type: Number,default:0 },
    Express: { type: Number,default:0 },
    Freight: { type: Number,default:0 },
    OverrideFreight: { type: Number,default:0 },
    Hazmat: { type: Number,default:0 },
    Insurance: { type: Number,default:0 },
    OverrideInsurance: { type: Number,default:0 },
    NoDocs: { type: Number,default:0 },
    ProofOfPurchase: { type: Number,default:0 },
    Pickup: { type: Number,default:0 },
    Sed: { type: Number,default:0 },
    ServiceVat: { type: Number,default:0 },
    Storage: { type: Number,default:0 },
    TotalWet: { type: Number,default:0 },
    TotalInvoiceValue: { type: Number,default:0 },
    OverrideInvoiceValue: { type: Number,default:0 },
    TotalWeightValue: { type: Number,default:0 },
    TotalVolumetricWeight: { type: Number,default:0 },
    NoOfInvoice: { type: Number,default:0 },
  },
  {
    timestamps: true,
  }
);

module.exports = mongoose.model('PriceLabel', PriceLabelSchema);
