var services = require('../Services/RedisDataServices');
var utils = require('../Util/utils');
var countries = require('../public/js/countries');

exports.get_shipper_list = (req, res, next) => {
  services.shipperService.getAllShippers().then(shippers => {
    res.render('pages/warehouse/shipper/list', {
      page: req.originalUrl,
      title: 'Shippers',
      user: res.user,
      shippers: shippers.map(utils.formattedRecord),
    })
  })
}

exports.create_shipper = (req, res, next) => {
  res.render('pages/warehouse/shipper/create', {
    page: req.originalUrl,
    title: 'Add New Shipper',
    user: res.user,
    countries : countries.default
  })
}

exports.add_new_shipper = (req, res, next) => {
  req.body['createdBy'] = req['userId'];
  services.shipperService.addShipper(req.body).then(result => {
    res.send(result);
  })
}

exports.get_shipper_detail = (req, res, next) => {
  services.shipperService.getShipper(req.params.id).then(shipper => {
    res.render('pages/warehouse/shipper/edit', {
      page: req.originalUrl,
      title: "Shipper Details",
      user: res.user,
      shipper: shipper,
      countries : countries.default
    })
  })
}

exports.update_shipper = (req, res, next) => {
  services.shipperService.updateShipper(req.params.id, req.body).then(result => {
    res.send(result);
  })
}

exports.delete_shipper = (req, res, next) => {
  services.shipperService.removeShipper(req.params.id).then(result => {
    res.send(result);
  })
}