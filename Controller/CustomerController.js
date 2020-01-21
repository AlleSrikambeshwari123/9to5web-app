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