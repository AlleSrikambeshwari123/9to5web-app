var services = require('../RedisServices/RedisDataServices');
var utils = require('../Util/utils');

exports.get_carrier_list = (req, res, next) => {
  services.carrierService.getAllCarriers().then(carriers => {
    res.render('pages/warehouse/carrier/list', {
      page: req.originalUrl,
      title: 'Carriers',
      user: res.user,
      carriers: carriers.map(utils.formattedRecord),
    })
  })
}

exports.create_carrier = (req, res, next) => {
  res.render('pages/warehouse/carrier/create', {
    page: req.originalUrl,
    title: 'Add New Carrier',
    user: res.user,
  })
}

exports.add_new_carrier = (req, res, next) => {
  services.carrierService.addCarrier(req.body).then(result => {
    res.send(result);
  })
}

exports.get_carrier_detail = (req, res, next) => {
  services.carrierService.getCarrier(req.params.id).then(carrier => {
    res.render('pages/warehouse/carrier/edit', {
      page: req.originalUrl,
      title: "Carrier Details",
      user: res.user,
      carrier: carrier
    })
  })
}

exports.update_carrier = (req, res, next) => {
  services.carrierService.updateCarrier(req.params.id, req.body).then(result => {
    res.send(result);
  })
}

exports.delete_carrier = (req, res, next) => {
  services.carrierService.removeCarrier(req.params.id).then(result => {
    res.send(result);
  })
}