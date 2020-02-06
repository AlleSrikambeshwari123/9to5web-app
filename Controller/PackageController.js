var services = require('../RedisServices/RedisDataServices');
var printerCtrl = require('./PrinterController');
var utils = require('../Util/utils');

exports.get_package_list = (req, res, next) => {
  services.packageService.getAllPackages().then(packages => {
    res.render('pages/warehouse/package/list', {
      page: req.originalUrl,
      user: res.user,
      title: "Packages On Hand",
      packages: packages
    })
  })
}

exports.get_awb_packages = (req, res, next) => {
  services.packageService.getPackages(req.params.awbId).then(packages => {
    res.send(packages);
  })
}

exports.generate_package_pdf = (req, res, next) => {
  printerCtrl.generate_pkg_label_pdf(req.params.packageId).then(result => {
    res.send(result);
  })
}