'use strict';

// Importing Environment Variables
require('dotenv').config();

const createConnection = require('../Util/mongo');
const Barcode = require('../models/barcode');

// Role Constants
const barCodes = [
  { barcode: '9000-100068-47' },
  { barcode: '420112359241990105856901520828' },
  { barcode: '9000-100068-47' },
  { barcode: '9000-100031-24' },
  { barcode: '9000-100031-24' },
  { barcode: '100068' },
  { barcode: '9000-100069-48' },
  { barcode: '100067' },
  { barcode: '48110822' },
  { barcode: '9000-100068-47' },
  { barcode: '100067' },
  { barcode: '420112359241990105856901520828' },
  { barcode: '9000-100031-24' },
  { barcode: '03241271' },
  { barcode: '100067' },
  { barcode: '100068' },
  { barcode: '100068' },
  { barcode: '10012178'},
  { barcode: '100068' },
  { barcode: '420112359241990105856901520828' },
  { barcode: '420112359241990105856901520828' },
  { barcode: '100067' },
  { barcode: '420112359241990105856901520828' },
  { barcode: '100068' },
  { barcode: '58118719' },
  { barcode: '5519224227674' },
  { barcode: '9000-100068-47' },
  { barcode: '100008' },
  { barcode: '9000-100010-13' },
  { barcode: '9000-100010-13' },
  { barcode: '10002896'},
  { barcode: '9000-100031-24' },
  { barcode: '100069' },
  { barcode: '420112359241990105856901520828' },
  { barcode: '420112359241990105856901520828' },
  { barcode: '100067' },
  { barcode: '12493720' },
  { barcode: '100069' },
  { barcode: '00068' },
  { barcode: '00171779'},
  { barcode: '09839425' },
  { barcode: '100067' },
  { barcode: '03712092' },
  { barcode: '11831075' },
  { barcode: '100069' },
  { barcode: '100068' },
  { barcode: '100068' },
  { barcode: '9000-100010-13' },
  { barcode: '9000-100010-13' }
]; 

createConnection()
  .then(() => {
    console.log('******Creating Default Barcodes******');
    return Barcode.find({}, (err, response) => {
      if (err) {
        console.error('Error while inserting the barCodes', err);
        process.exit();
      }

      if (response.length === barCodes.length) {
        console.log('Barcodes default data already added!!');
        process.exit();
      }
      return Barcode.deleteMany({});
    }).read('primary')
  })
  .then(() => {
    return Barcode.insertMany(barCodes);
  })
  .then(() => {
    console.log('barCodes default data has been successfully added!!');
    process.exit();
  })
  .catch((error) => {
    console.error('Error while inserting the barCodes', error);
    process.exit();
  });