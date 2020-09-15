var services = require('../Services/RedisDataServices');
var utils = require('../Util/utils');

exports.get_customer_list = (req, res, next) => {
  Promise.all([
    services.customerChildService.getCustomers()
  ]).then(results => {
    const customers = results[0];
    res.render('pages/admin/customerchild/list', {
      page: req.originalUrl,
      title: "Consignee",
      user: res.user,
      customers: customers.map(utils.formattedRecord),
    })
  })
}

exports.get_sub_customer_list = (req, res, next) => {
  Promise.all([
    services.customerChildService.getCustomers({createdBy : req.params.customerId })
  ]).then(results => {
    const  customers = results[0]
    res.render('pages/customer/customerchild/list', {
      page: req.originalUrl,
      title: "Consignee",
      user: res.user,
      customers: customers.map(utils.formattedRecord),
      createdBy : req.params.customerId
    })
  })
}

exports.create_customer = (req, res, next) => {
  Promise.all([
    services.customerService.getCustomers()
  ]).then((results) => {
    res.render('pages/admin/customerchild/create', {
      page: req.originalUrl,
      title: "Create New Sub Consignee",
      user: res.user,
      customers: results[0]
    })
  });
}

exports.create_sub_customer = (req, res, next) => {
  Promise.all([
    services.customerService.getCustomers()
  ]).then((results) => {
    res.render('pages/customer/customerchild/create', {
      page: req.originalUrl,
      title: "Create New Sub Consignee",
      user: res.user,
      customers: results[0]
    })
  });
}

exports.add_new_customer = (req, res, next) => {
  req.body['createdBy'] = req['userId'];
  services.customerChildService.createCustomer(req.body).then(result => {
    res.send(result);
  }).catch(err=>{
    console.log(err);
  })
}

exports.get_customer_detail = (req, res, next) => {
  Promise.all([
    services.customerChildService.getCustomer({_id: req.params.id})
  ]).then(results => {
    res.render('pages/admin/customerchild/edit', {
      page: req.originalUrl,
      title: "Consignee Details",
      user: res.user,
      customer: results[0],
    })
  })
}

exports.get_sub_customer_detail = (req, res, next) => {
  Promise.all([
    services.customerChildService.getCustomer({_id: req.params.id})
  ]).then(results => {
    res.render('pages/customer/customerchild/edit', {
      page: req.originalUrl,
      title: "Consignee Details",
      user: res.user,
      customer: results[0],
    })
  })
}

exports.update_customer = (req, res, next) => {
  services.customerChildService.updateCustomer(req.params.id, req.body).then(result => {
    res.send(result);
  })
}

exports.delete_customer = (req, res, next) => {
  services.customerChildService.removeCustomer(req.params.id).then(result => {
    res.send(result);
  })
}

exports.get_sub_customer_no_docs = (req, res, next) => {
  Promise.all([
    services.customerChildService.getCustomerAwbsNoDocs({createdBy : req.params.customerId})
  ]).then(results => {
    console.log("resp",results)
    res.render('pages/customer/no-docs/list', {
      page: req.originalUrl,
      title: "Consignee Details",
      user: res.user,
      awbs: results[0],
    })
  })
}
