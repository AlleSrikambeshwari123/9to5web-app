var services = require('../RedisServices/RedisDataServices');
var utils = require('../Util/utils');

exports.get_customer_list = (req, res, next) => {
  Promise.all([
    services.locationService.getLocations(),
    services.customerService.getCustomers(),
  ]).then(results => {
    let locations = {};
    results[0].forEach(location => locations[location.id] = location.name);
    let customers = results[1];
    customers.forEach(customer => customer.location = locations[customer.location]);

    res.render('pages/admin/customers/list', {
      page: req.originalUrl,
      title: "Customers",
      user: res.user,
      customers: customers.map(utils.formattedRecord),
      locations: locations,
    })
  })
}

exports.create_customer = (req, res, next) => {
  services.locationService.getLocations().then(locations => {
    res.render('pages/admin/customers/create', {
      page: req.originalUrl,
      title: "Create New Customer",
      user: res.user,
      locations: locations
    })
  })
}

exports.add_new_customer = (req, res, next) => {
  services.customerService.signUp(req.body).then(result => {
    res.send(result);
  }).catch(err=>{
    console.log(err);
  })
}

exports.get_customer_detail = (req, res, next) => {
  Promise.all([
    services.locationService.getLocations(),
    services.customerService.getCustomer(req.params.id),
  ]).then(results => {
    res.render('pages/admin/customers/edit', {
      page: req.originalUrl,
      title: "Customer Details",
      user: res.user,
      locations: results[0],
      customer: results[1]
    })
  })
}

exports.update_customer = (req, res, next) => {
  services.customerService.updateCustomer(req.params.id, req.body).then(result => {
    res.send(result);
  })
}

exports.delete_customer = (req, res, next) => {
  services.customerService.removeCustomer(req.params.id).then(result => {
    res.send(result);
  })
}
