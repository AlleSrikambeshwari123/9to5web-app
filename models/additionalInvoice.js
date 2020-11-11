'use strict';

const mongoose = require('mongoose');

const additionalInvoiceSchema = new mongoose.Schema({
    fileName: {
        type: String
    },
    name: {
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

module.exports = mongoose.model('AdditionalInvoice', additionalInvoiceSchema);