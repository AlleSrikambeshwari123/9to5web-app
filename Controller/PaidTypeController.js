var services = require('../RedisServices/RedisDataServices');
var utils = require('../Util/utils');

exports.get_paid_type_list = (req, res, next) => {
  services.paidTypeService.getAllPaidTypes().then(paidTypes => {
    res.render('pages/warehouse/paid-type/list', {
      page: req.originalUrl,
      title: 'Paid Types',
      user: res.user,
      paidTypes: paidTypes.map(utils.formattedRecord),
    })
  })
}

exports.create_paid_type = (req, res, next) => {
  res.render('pages/warehouse/paid-type/create', {
    page: req.originalUrl,
    title: 'Add New Paid Type',
    user: res.user,
  })
}

exports.add_new_paid_type = (req, res, next) => {
  req.body['createdBy'] = req['userId'];
  services.paidTypeService.addPaidType(req.body).then(result => {
    res.send(result);
  })
}

exports.get_paid_type_detail = (req, res, next) => {
  services.paidTypeService.getPaidType(req.params.id).then(paidType => {
    res.render('pages/warehouse/paid-type/edit', {
      page: req.originalUrl,
      title: "Paid Type Details",
      user: res.user,
      paidType: paidType
    })
  })
}

exports.update_paid_type = (req, res, next) => {
  services.paidTypeService.updatePaidType(req.params.id, req.body).then(result => {
    res.send(result);
  })
}

exports.delete_paid_type = (req, res, next) => {
  services.paidTypeService.removePaidType(req.params.id).then(result => {
    res.send(result);
  })
}