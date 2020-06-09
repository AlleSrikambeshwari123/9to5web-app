var services = require('../Services/RedisDataServices');
var printerCtrl = require('./PrinterController');
var utils = require('../Util/utils');

exports.get_package_list = (req, res, next) => {
  services.packageService.getAllPackagesWithLastStatus().then((packages) => {
    res.render('pages/warehouse/price/list-all', {
      page: req.originalUrl,
      user: res.user,
      title: 'All Price Label',
      filterURL: '',
      packages: packages,
    });
  });
};
exports.add_pricelabel_package = (req,res) =>{
  services.PriceLabelService.updatePriceLabel(req.body,req.params.id).then((result)=>{
    res.send(result)
  })
}

exports.get_pricelabel_package = (req,res) =>{
  services.PriceLabelService.getPriceLabel(req.params.id).then((result)=>{
    res.send(result)
  })
}
exports.get_package_pricelabel = (req,res) =>{
  services.PriceLabelService.getPackgePriceLabel(req.params.id).then((result)=>{
    res.send(result)
  })
}


exports.get_fll_package_list = (req, res, next) => {
  services.packageService.getPackagesInFll_updated().then((packages) => {
    res.render('pages/warehouse/package/list', {
      page: req.originalUrl,
      user: res.user,
      title: 'Packages On Hands Of FLL',
      filterURL: '',
      packages: packages,
    });
  });
};

exports.get_nas_package_list = (req, res, next) => {
  services.packageService.getPackagesInNas_updated().then((packages) => {
    res.render('pages/warehouse/package/list', {
      page: req.originalUrl,
      user: res.user,
      title: 'Packages On Hand Of NAS',
      filterURL: '',
      packages: packages,
    });
  });
};

exports.get_awb_packages = (req, res, next) => {
  services.packageService.getPackages_updated(req.params.awbId).then((packages) => {
    res.send(packages);
  });
};
