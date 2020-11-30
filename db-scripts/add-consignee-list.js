'use strict';

// Importing Environment Variables
require('dotenv').config();

const createConnection = require('../Util/mongo');
const Company = require('../models/company');
const Location = require('../models/location');
const Customer = require('../models/customer');
const CustomerChild = require('../models/customerChild');
const User = require('../models/user');
const csv = require('csvtojson');

createConnection()
      .then(async() => {
        let company = await Company.findOne({name : "Post Boxes"})
        let location = await Location.findOne({name : "CABLE BEACH"})
        let user = await User.findOne({email : "admin@company.com"})
        let consigneeArray = [];
        return csv().fromFile("./DB_Seed/CableBeachConsignee.csv").then(jsonObj => {
            Promise.all(jsonObj.map(element => {
                let consigneeObj = {
                    pmb : Number(element.pmb),
                    firstName : element.firstName,
                    lastName : element.lastName,
                    telephone : element.telephone,
                    email : element.email,
                    company : company._id,
                    password : "welcome",
                    location : location._id,
                    createdBy : user._id
                }
                if(consigneeObj.email == "")
                    consigneeObj.email = "nodocsfll@postboxesetc.com"

                consigneeArray.push(consigneeObj)
                return consigneeObj
            }))
            return consigneeArray
        })
      })
      .then(async(customers) => {
        for(let customer of customers){
            if (customer.pmb) {
                const customerData = await Customer.findOne({pmb : customer.pmb});
                if (customerData && customerData['_id']) {
                    console.log("PMB : "+customer.pmb+" already exits. Customer name : " + customer.firstName + " " + customer.lastName + " not created.")
                    continue;
                } 
            }
            const customerResult = new Customer(customer);
            customerResult.save((err) => {
                if (err) {
                    console.log("Customer name : " + customer.firstName + " " + customer.lastName + " not created. Create-customer error:",err)
                }
            })
        }
      })
      .then(async() => {
        let company = await Company.findOne({name : "Post Boxes"})
        let location = await Location.findOne({name : "ALBANY"})
        let user = await User.findOne({email : "admin@company.com"})
        let consigneeArray = []
        return csv().fromFile("./DB_Seed/AlbanyConsignee.csv").then(jsonObj => {
            Promise.all(jsonObj.map(element => {
                let consigneeObj = {
                    pmb : Number(element.pmb),
                    firstName : element.firstName,
                    lastName : element.lastName,
                    telephone : element.telephone,
                    email : element.email,
                    company : company._id,
                    password : "welcome",
                    location : location._id,
                    createdBy : user._id
                }
                if(consigneeObj.email == "")
                    consigneeObj.email = "nodocsfll@postboxesetc.com"

                consigneeArray.push(consigneeObj)
                return consigneeObj
            }))
            return consigneeArray
        })
      })
      .then(async(customers) => {
        for(let customer of customers){
            if (customer.pmb) {
                const customerData = await Customer.findOne({pmb : customer.pmb});
                if (customerData && customerData['_id']) {
                    console.log("PMB : "+customer.pmb+" already exits. Customer name : " + customer.firstName + " " + customer.lastName + " not created.")
                    continue;
                } 
            }
            const customerResult = new Customer(customer);
            customerResult.save((err) => {
                if (err) {
                    console.log("Customer name : " + customer.firstName + " " + customer.lastName + " not created. Create-customer error:",err)
                }
            })
        }
      })
    .then(async () => {
        let user = await User.findOne({ email: "admin@company.com" })
        let consigneeArray = []
        return csv().fromFile("./DB_Seed/SubConsignee.csv").then(async(jsonObj) => {
            for(let element of jsonObj ){
                let customer = await Customer.findOne({ pmb: element.pmb })
                if (customer && customer._id) {
                    let subConsigneeObj = {
                        parentCustomer: customer._id,
                        firstName: element.firstName,
                        lastName: element.lastName,
                        telephone: element.telephone,
                        email: element.email,
                        password: "welcome",
                        createdBy: user._id
                    }
                    if (subConsigneeObj.email == "")
                        subConsigneeObj.email = "nodocsfll@postboxesetc.com"

                    consigneeArray.push(subConsigneeObj)
                } else {
                    console.log("Parent customer with PMB : "+element.pmb+" not found. Customer name : " + element.firstName + " " + element.lastName + " not created.")
                }
            }
            return consigneeArray
        })
    })
    .then(async (subCustomers) => {
        let count = 0
        return new Promise(async(resolve,reject) =>{
            for (let cust of subCustomers) {
                const customerResult = new CustomerChild(cust);
                await customerResult.save((err) => {
                    if (err) {
                        console.log("Customer name : " + cust.firstName + " " + cust.lastName + " not created. Create-customer error:",err)
                    }
                    if(count == subCustomers.length-1){
                        return resolve()
                    }
                    count++
                })
            }
        })
    })
  .then(() => {
    console.log('Consignees and sub consignees added successfully!!');
    process.exit();
  })
  .catch((error) => {
    console.error('Error while inserting the defaultCompanies', error);
    process.exit();
  });
