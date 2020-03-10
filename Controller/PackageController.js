var services = require('../RedisServices/RedisDataServices');
var printerCtrl = require('./PrinterController');
var utils = require('../Util/utils');

exports.get_package_list = (req, res, next) => {
  services.packageService.getAllPackagesWithLastStatus().then((packages) => {
    console.log(packages[0]);
    res.render('pages/warehouse/package/list-all', {
      page: req.originalUrl,
      user: res.user,
      title: 'All Packages',
      packages: packages,
    });
  });
};

exports.get_filtered_package_list = (req, res, next) => {
  let title = 'All Packages';

  services.packageService
    .getAllPackagesWithLastStatus({ filter: req.params.filter })
    .then(async (packages) => {
      if (req.params.filter === 'in-manifest') {
        packages = packages.filter((i) => i.manifestId);
        title = 'Packages in Manifest';
      }

      if (req.params.filter === 'in-manifest-no-docs') {
        let noDocsAWBIds = await services.awbService.getAwbsNoDocsIds();
        console.log(noDocsAWBIds);
        let noDocsAWBIdsIndex = noDocsAWBIds.reduce((acc, i) => {
          acc[i] = true;
          return acc;
        }, {});
        packages = packages.filter((i) => i.manifestId && noDocsAWBIdsIndex[i.awbId]);
        title = 'Packages in Manifest (no docs)';
      }

      return packages;
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
