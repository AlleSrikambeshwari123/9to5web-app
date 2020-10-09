'use strict';

const mongoose = require('mongoose');

const storeInvoiceSchema = new mongoose.Schema({
    awbId: {
        type: mongoose.Schema.Types.ObjectId, 
        ref: 'Awb', 
        required: true
    },
    fileName: {
        type: String
    },
    filePath: {
        type: String
    },
    pmb: {
        type: Number,
    },
    courierNo: {
        type: String,
    },
    customerId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Customer',
    }
}, {
    timestamps: true
})

module.exports = mongoose.model('StoreInvoice', storeInvoiceSchema);