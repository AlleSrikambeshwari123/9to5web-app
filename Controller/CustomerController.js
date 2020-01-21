var services = require('../RedisServices/RedisDataServices');

exports.get_customer_list = (req, res, next) => {
  services.customerService.getCustomers().then(customers => {
    res.render('pages/admin/customers/list', {
      page: req.url,
      title: "Customers",
      user: res.user,
      customers: customers,
    })
  })
}

exports.delete_customer = (req, res, next) => {
  services.customerService.removeCustomer(req.params.id).then(result => {
    res.send(result);
  })
}