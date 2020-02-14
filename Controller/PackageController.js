var services = require('../RedisServices/RedisDataServices');
var printerCtrl = require('./PrinterController');
var utils = require('../Util/utils');

exports.get_fll_package_list = (req, res, next) => {
  services.packageService.getPackagesInFll().then(packages => {
    res.render('pages/warehouse/package/list', {
      page: req.originalUrl,
      user: res.user,
      title: "Packages On Hands Of FLL",
      packages: packages
    })
  })
}

exports.get_nas_package_list = (req, res, next) => {
  services.packageService.getPackagesInNas().then(packages => {
    res.render('pages/warehouse/package/list', {
      page: req.originalUrl,
      user: res.user,
      title: "Packages On Hand Of NAS",
      packages: packages
    })
  })
}

exports.get_awb_packages = (req, res, next) => {
  services.packageService.getPackages(req.params.awbId).then(packages => {
    res.send(packages);
  })
}