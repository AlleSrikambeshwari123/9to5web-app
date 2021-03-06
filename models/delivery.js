'use strict';

const mongoose = require('mongoose');
const Schema = mongoose.Schema;
const autoIncrement = require('mongoose-auto-increment');
autoIncrement.initialize(mongoose.connection);

const deliverySchema = new mongoose.Schema({
    locationId: {
        type: Schema.Types.ObjectId,
        ref: 'Location',
        required: true
    },
    driverId: {
        type: Schema.Types.ObjectId,
        ref: 'Driver',
        required: true
    },
    vehicleId: {
        type: Schema.Types.ObjectId,
        ref: 'Vehicle',
        required: true
    },
    createdBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    updatedBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
    },
    delivery_date: {
        type: Date
    },
    status: {
        type: Number
    },
    deliveryNum: {
        type: Number,
        required: true
    },
    // Additional fields
    packages: [{
        type: Schema.Types.ObjectId,
        ref: "Package"
    }]
}, {
    timestamps: true
});

deliverySchema.plugin(autoIncrement.plugin, {
    model: 'deliverySchema',
    field: 'deliveryNum',
    startAt: 1000
});

module.exports = mongoose.model('Delivery', deliverySchema);