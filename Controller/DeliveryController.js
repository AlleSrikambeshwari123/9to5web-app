var services = require('../RedisServices/RedisDataServices');
var utils = require('../Util/utils');

exports.get_delivery_list = (req, res, next) => {
  services.deliveryService.getDeliveriesFullData().then((deliveries) => {
    Promise.all([
      services.locationService.getLocations(),
      services.driverService.getLocationDrivers('nas'),
      services.vehicleService.getVehiclesByLocation('nas')
    ]).then((results) => {
      res.render('pages/warehouse/delivery/list', {
        page: req.originalUrl,
        user: res.user,
        title: 'Deliveries',
        deliveries: deliveries.map(utils.formattedRecord),
        locations: results[0],
        drivers: results[1],
        vehicles: results[2],
      })
    })
  });
}

exports.add_new_delivery = (req, res, next) => {
  req.body['createdBy'] = req['userId'];
  services.deliveryService.createDelivery(req.body, res.user.username).then(response => {
    res.send(response);
  })
}

exports.get_delivery_detail = (req, res, next) => {
  var deliveryId = req.params.id;
  services.deliveryService.getFullDelivery(deliveryId).then(delivery => {
    console.log(delivery)
    Promise.all(delivery.packages.map(pkg => {
      return getFullPackage(pkg);
    })).then(packages => {
      delivery.packages = packages;
      res.render('pages/warehouse/delivery/preview', {
        page: req.originalUrl,
        user: res.user,
        title: 'Delivery Detail',
        delivery: delivery
      })
    })
  })
}

var getFullPackage = (pkg) => {
  return new Promise((resolve, reject) => {
    services.awbService.getFullAwb(pkg.awbId).then(awb => {
      pkg.customer = awb.customer;
      pkg.shipper = awb.shipper;
      resolve(pkg);
    })
  });
} 