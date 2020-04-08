'use strict';

// Importing Environment Variables
require('dotenv').config();

const createConnection = require('../Util/mongo');
const Company = require('../models/company');
const STRINGS = require('../Res/strings');

// Role Constants
const firstCompany = STRINGS.company_9to5;
const secondCompany = STRINGS.company_PostBoxes;

const defaultCompanies = [{
  name: firstCompany
}, {
  name: secondCompany
}];

createConnection()
  .then(() => {
    Company.find({}, (err, response) => {
      if (err) {
        console.error('Error while inserting the companies', err);
        process.exit();
      }
      if (response.length === defaultCompanies.length) {
        console.log('Companies default data already added!!');
        process.exit();
      }
    })
    return Company.deleteMany({});
  })
  .then(() => {
    return Company.insertMany(defaultCompanies);
  })
  .then(() => {
    process.exit();
  })
  .catch((error) => {
    console.error('Error while inserting the defaultCompanies', error);
    process.exit();
  });
