/*
var services = require('../RedisServices/RedisDataServices');
var user = {
   username: "admin",
   firstName: "admin",
   lastName: "9-5 Import",
   password: "admin",
   email: "admin@9-5imports.com",
   mobile: "868.354.7177",
   role: "Admin"
 }
services.userService.createUser(user)
    .then(d=>{
        console.log(d);
    })
    .catch(err=>console.log(err));
*/
var services = require('../RedisServices/RedisDataServices');

services.customerService.importShippersFromCsv()
    .then(d=>{
        console.log('Customers ok');
    })
    .catch(err=>console.log(err));

services.hazmatService.importClassesFromCsv()
    .then(d=>{
        console.log('Hazmat ok');
    })
    .catch(err=>console.log(err));


services.shipperService.importShippersFromCsv()
    .then(d=>{
        console.log('Shipper ok');
    })
    .catch(err=>console.log(err));

