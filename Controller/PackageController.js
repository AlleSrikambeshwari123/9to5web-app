var services = require('../RedisServices/RedisDataServices');
var printerCtrl = require('./PrinterController');
var utils = require('../Util/utils');

exports.get_package_list = (req, res, next) => {
  services.packageService
    .getAllPackages()
    .then((packages) => {
      return Promise.all(
        packages.map(async (pkg) => {
          let status = await services.packageService.getPackageLastStatus(pkg.id);
          pkg.lastStatusText = status && status.status;
          return pkg;
        }),
      );
    })
    .then((packages) => {
      res.render('pages/warehouse/package/list-all', {
        page: req.originalUrl,
        user: res.user,
        title: 'All Packages',
        packages: packages,
      });
    });
};

exports.get_filtered_package_list = (req, res, next) => {
  let title = 'All packages';
  services.packageService
    .getAllPackages()
    .then((results) => {
      let packages = results;
      switch (req.params.filter) {
        case 'in-manifest':
          packages = packages.filter((i) => i.manifestId);
          title = 'Packages in Manifest';
          break;
        default:
          break;
      }
      return Promise.all(
        packages.map(async (pkg) => {
          let status = await services.packageService.getPackageLastStatus(pkg.id);
          pkg.lastStatusText = status && status.status;
          return pkg;
        }),
      );
    })
    .then((packages) => {
      res.render('pages/warehouse/package/list', {
        page: req.originalUrl,
        user: res.user,
        title: title,
        packages: packages,
      });
    });
};

exports.get_fll_package_list = (req, res, next) => {
  services.packageService.getPackagesInFll().then((packages) => {
    res.render('pages/warehouse/package/list', {
      page: req.originalUrl,
      user: res.user,
      title: 'Packages On Hands Of FLL',
      packages: packages,
    });
  });
};

exports.get_nas_package_list = (req, res, next) => {
  services.packageService.getPackagesInNas().then((packages) => {
    res.render('pages/warehouse/package/list', {
      page: req.originalUrl,
      user: res.user,
      title: 'Packages On Hand Of NAS',
      packages: packages,
    });
  });
};

exports.get_awb_packages = (req, res, next) => {
  services.packageService.getPackages(req.params.awbId).then((packages) => {
    res.send(packages);
  });
};
