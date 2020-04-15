'use strict';

// Importing Environment Variables
require('dotenv').config();
const createConnection = require('../Util/mongo');
const Location = require('../models/location');
const Company = require('../models/company');
const Strings = require('../Res/strings');

const companyName = Strings.company_9to5;

const defaultLocation = {
  name: 'NINE TO FIVE NAS WAREHOUSE',
  phone: '243770925',
  address: '#19 AIRPORT INDUSTRIAL PARK'
};

createConnection()
  .then(() => {
    console.log('******Creating Default Locations******');
    Location.findOne({name: defaultLocation.name}, (err, result) => {
      if (err) {
        console.error('Error while inserting the Locations', err);
        process.exit();
      } else if ((result && result._id)) {
        console.log('Deafult location data already added!!');
        process.exit();
      } else {
        Company.findOne({name: companyName}, (err, company) => {
          if (err) {
            console.error('Error while inserting the Locations', err);
            process.exit();
          } 
    
          if (!(company && company['_id'])) {
            console.log('Default company not found. Please run - npm run db-seed');
            process.exit();
          }
    
          defaultLocation['company'] = company['_id'];
          const newLocation = new Location(defaultLocation);
          
          newLocation.save((err, location) => {
            if (err) {
              console.log('Error while inserting the location!');
              process.exit();
            }
            else if (location) {
              console.log('Location default data has been added!!');
              process.exit();
            }
          });
        })
      }
    });
  })
  .catch((error) => {
    console.error('Error while inserting the default locations', error);
    process.exit();
  });
