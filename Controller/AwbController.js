var services = require('../RedisServices/RedisDataServices');

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

exports.get_awb_no_docs = (req, res, next) => {
  services.awbService.getAwbsNoDocs().then(awbs => {
    Promise.all(awbs.map(awb => {
      services.packageService.getPackages(awb.id).then(packages => {
        awb.packages = packages;
      })
      return awb;
    })).then(awbs => {
      res.render('pages/warehouse/fll/awb/nodocs', {
        page: req.url,
        title: "AWB With No Invoice",
        user: res.user,
        awbs: awbs,
      })
    })
  })
}