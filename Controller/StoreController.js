var services = require('../RedisServices/RedisDataServices');
var utils = require('../Util/utils');

exports.render_store_check_in = (req, res, next) => {
  services.locationService.getLocations().then(locations => {
    res.render('pages/store/store-check-in', {
      page: req.originalUrl,
      title: 'Store Packages',
      user: res.user,
      locations: locations
    })
  })
}

exports.get_location_packages = (req, res, next) => {
  var locationId = req.params.id;
  services.packageService.getPackagesInLocation(locationId).then(packages => {
    Promise.all(packages.map(pkg => {
      return getFullPackage(pkg)
    })).then(pkgs => {
      res.send(pkgs);
    })
  })
}

var getFullPackage = (pkg) => {
  return new Promise((resolve, reject) => {
    services.awbService.getAwb(pkg.awbId).then(awb => {
      Promise.all([
        services.customerService.getCustomer(awb.customerId),
        services.packageService.getPackageLastStatus(pkg.id),
      ]).then(results => {
        pkg.customer = results[0];
        pkg.status = results[1];
        resolve(pkg);
      })
    })
  });
}