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
    }
}, {
    timestamps: true
})

module.exports = mongoose.model('StoreInvoice', storeInvoiceSchema);