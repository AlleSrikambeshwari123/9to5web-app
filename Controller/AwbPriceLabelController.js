var services = require('../Services/RedisDataServices');
var printerCtrl = require('./PrinterController');
var utils = require('../Util/utils');
exports.get_awb_list = (req, res, next) => {
  services.awbService.getAwbsFull().then((awbs) => {
    res.render('pages/warehouse/awbprice/list-all', {
      page: req.originalUrl,
      user: res.user,
      title: 'All Price Label',
      filterURL: '',
      awbs: awbs,
    });
  });
};

exports.get_pricelabel_awb = (req,res) =>{
  services.AwbPriceLabelService.getPriceLabel(req.params.id).then((result)=>{
    res.send(result)
  })
}
exports.get_awb_pricelabel = (req,res) =>{
  services.AwbPriceLabelService.getAwbPriceLabel(req.params.id).then((result)=>{
    res.send(result)
  })
}

exports.add_pricelabel_awb = (req,res) =>{
  services.AwbPriceLabelService.updatePriceLabel(req.body,req.params.id).then((result)=>{
    res.send(result)
  })
}

////////////////////////////////////////////////////////////////


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
