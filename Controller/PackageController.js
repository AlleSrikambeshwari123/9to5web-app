var services = require('../RedisServices/RedisDataServices');

exports.get_package_detail = (req, res, next) => {
  var awb = req.params.awb;
  services.hazmatService.getAllClasses().then(classes => {
    services.shipperService.getAllShippers().then(shippers => {
      services.packageService.getAwb(awb).then(awbResult => {
        res.render('pages/warehouse/package/edit', {
          page: req.url,
          title: 'Package Details',
          user: res.user,
          printer: res.printer,
          hazmats: classes,
          shippers: shippers,
          awb: awbResult.awb,
        });
      })
    })
  })
}

exports.create_package = (req, res, next) => {
  services.hazmatService.getAllClasses().then(classes => {
    services.shipperService.getAllShippers().then(shippers => {
      res.render('pages/warehouse/package/create', {
        page: req.url,
        title: 'Create New Package',
        user: res.user,
        printer: res.printer,
        hazmats: classes,
        shippers: shippers,
      });
    })
  })
}