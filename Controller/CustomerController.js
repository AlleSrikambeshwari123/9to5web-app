var services = require('../RedisServices/RedisDataServices');
var utils = require('../Util/utils');

exports.get_customer_list = (req, res, next) => {
  Promise.all([
    services.locationService.getLocations(),
    services.customerService.getCustomers(),
    services.locationService.getCompanies()
  ]).then(results => {
    const locations = results[0];
    const customers = results[1];
    const companies = results[2];

    res.render('pages/admin/customers/list', {
      page: req.originalUrl,
      title: "Consignee",
      user: res.user,
      customers: customers.map(utils.formattedRecord),
      locations: locations,
      companies: companies
    })
  })
}

exports.create_customer = (req, res, next) => {
  Promise.all([
    services.locationService.getLocations(),
    services.locationService.getCompanies()
  ]).then((results) => {
    res.render('pages/admin/customers/create', {
      page: req.originalUrl,
      title: "Create New Consignee",
      user: res.user,
      locations: results[0],
      companies: results[1]
    })
  });
}

exports.add_new_customer = (req, res, next) => {
  req.body['createdBy'] = req['userId'];
  services.customerService.signUp(req.body).then(result => {
    res.send(result);
  }).catch(err=>{
    console.log(err);
  })
}

exports.get_customer_detail = (req, res, next) => {
  Promise.all([
    services.locationService.getLocations(),
    services.customerService.getCustomer({_id: req.params.id}),
    services.locationService.getCompanies()
  ]).then(results => {
    res.render('pages/admin/customers/edit', {
      page: req.originalUrl,
      title: "Consignee Details",
      user: res.user,
      locations: results[0],
      customer: results[1],
      companies: results[2]
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
