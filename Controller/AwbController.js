var services = require('../RedisServices/RedisDataServices');
var utils = require('../Util/utils');

exports.get_awb_detail = (req, res, next) => {
  var id = req.params.id;
  Promise.all([
    services.customerService.getCustomers(),
    services.hazmatService.getAllClasses(),
    services.shipperService.getAllShippers(),
    services.awbService.getAwb(id),
    services.packageService.getPackages(id),
  ]).then(results => {
    res.render('pages/warehouse/awb/edit', {
      page: req.url,
      title: 'AWB Details',
      user: res.user,
      printer: res.printer,
      customers: results[0],
      hazmats: results[1],
      shippers: results[2],
      awb: results[3],
      packages: results[4],
    });
  })
}

exports.create_awb = (req, res, next) => {
  Promise.all([
    services.customerService.getCustomers(),
    services.hazmatService.getAllClasses(),
    services.shipperService.getAllShippers(),
  ]).then(results => {
    res.render('pages/warehouse/awb/create', {
      page: req.url,
      title: 'Create New AWB',
      user: res.user,
      printer: res.printer,
      customers: results[0],
      hazmats: results[1],
      shippers: results[2],
    });
  })
}

exports.add_new_awb = (req, res, next) => {
  let awb = req.body;
  let packages = JSON.parse(awb.packages);
  services.awbService.createAwb(awb).then(result => {
    let awbId = result.awb.id;
    services.packageService.createPackages(awbId, packages).then(packageResult => {
      awb.id = awbId;
      result.awb = awb;
      res.send(result);
    })
  })
}

exports.get_awb_list = (req, res, next) => {
  services.awbService.getAwbs().then(awbs => {
    Promise.all(awbs.map(awb => {
      return Promise.all([
        services.packageService.getPackages(awb.id),
        services.customerService.getCustomer(awb.customerId),
        services.shipperService.getShipper(awb.shipper),
        services.shipperService.getShipper(awb.carrier),
      ]).then(results => {
        let weight = 0;
        awb.packages = results[0];
        awb.packages.forEach(pkg => weight += Number(pkg.weight));
        awb.customer = results[1];
        awb.shipper = results[2];
        awb.carrier = results[3];
        awb.weight = weight;
      })
    })).then(results => {
      res.render('pages/warehouse/awb/nodocs', {
        page: req.url,
        title: "AWB With No Invoice",
        user: res.user,
        awbs: awbs.map(utils.formattedRecord),
      })
    })
  })
}

exports.delete_awb = (req, res, next) => {
  let awbId = req.params.id;
  Promise.all([
    services.awbService.deleteAwb(awbId),
    services.packageService.removePackages(awbId),
  ]).then(results => {
    res.send(results[0]);
  })
}