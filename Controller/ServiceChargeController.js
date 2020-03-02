var services = require('../RedisServices/RedisDataServices');

exports.get_charge_list = (req, res, next) => {
  services.chargeService.getCharges().then(charges => {
    res.render('pages/warehouse/charge/list', {
      page: req.originalUrl,
      title: 'Service Charges',
      user: res.user,
      charges: charges
    })
  })
}

exports.add_new_charge = (req, res, next) => {
  services.chargeService.createCharge(req.body).then(result => {
    res.send(result);
  })
}

exports.get_charge_detail = (req, res, next) => {
  services.chargeService.getCharge(req.params.id).then(charge => {
    res.send(charge);
  })
}

exports.update_charge = (req, res, next) => {
  services.chargeService.updateCharge(req.params.id, req.body).then(result => {
    res.send(result);
  })
}

exports.delete_charge = (req, res, next) => {
  services.chargeService.removeCharge(req.params.id).then(result => {
    res.send(result);
  })
}