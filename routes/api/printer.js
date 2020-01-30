var express = require('express');
var router = express.Router();
var services = require('../../RedisServices/RedisDataServices');
var utils = require('../../Util/utils');

router.post('/add-printer', (req, res, next) => {
  services.printService.addPrinter(req.body.printer).then(result => {
    res.send(result);
  })
})

router.get('/get-printers', (req, res, next) => {
  services.printService.getPrinters().then(result => {
    res.send(result);
  })
})

router.get('/get-awb/:id', (req, res, next) => {
  let id = req.params.id;
  Promise.all([
    services.awbService.getAwb(id),
    services.packageService.getPackages(id),
  ]).then(results => {
    let awb = results[0];
    let packages = results[1];
    Promise.all([
      services.customerService.getCustomer(awb.customerId),
      services.shipperService.getShipper(awb.shipper),
      services.shipperService.getShipper(awb.carrier),
      services.hazmatService.getClass(awb.hazmat),
    ]).then(otherInfos => {
      awb.packages = packages;
      awb.customer = otherInfos[0];
      delete awb.customer.password;
      delete awb.customer.confirmPassword;
      awb.shipper = otherInfos[1];
      awb.carrier = otherInfos[2];
      awb.hazmat = otherInfos[3];
      res.send(awb);
    })
  })
})

module.exports = router;