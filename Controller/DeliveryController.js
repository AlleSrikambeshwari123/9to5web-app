var services = require('../Services/RedisDataServices');
var utils = require('../Util/utils');
var moment = require('moment');

exports.get_delivery_list = (req, res, next) => {
  services.deliveryService.getDeliveriesFullData(req).then((deliveries) => {
    
    Promise.all([
      services.locationService.getLocations(),
      services.driverService.getLocationDrivers('nas'),
      services.vehicleService.getVehiclesByLocation('nas'),
      services.packageService.getAllDeliveryPackagesData()
    ]).then((results) => {
      const deliveryPackages = results[3];
      const packageDataByDeliveryId = {};
      
      deliveryPackages.forEach((deliveryPackage) => {
        if (!packageDataByDeliveryId[deliveryPackage['deliveryId']]) {
          packageDataByDeliveryId[deliveryPackage['deliveryId']] = [];
        }
        packageDataByDeliveryId[deliveryPackage['deliveryId']].push(deliveryPackage)
      });

      deliveries.forEach((delivery) => {
        delivery.packages = packageDataByDeliveryId[delivery._id];
      });

      res.render('pages/warehouse/delivery/list', {
        page: req.originalUrl,
        user: res.user,
        title: 'Deliveries',
        deliveries: deliveries.map(utils.formattedRecord),
        locations: results[0],
        drivers: results[1],
        vehicles: results[2],
        clear: req.query.clear
      })
    })
  });
}

exports.add_new_delivery = (req, res, next) => {
  const createdBy = req['userId'];
  services.deliveryService.createDelivery(req.body, createdBy).then(response => {
    res.send(response);
  })
}

exports.get_delivery_detail = (req, res, next) => {
  var deliveryId = req.params.id;
  Promise.all([
    services.deliveryService.getFullDelivery(deliveryId),
    services.packageService.getPackagesDataByDeliveryId(deliveryId)
  ]).then(([delivery, packages]) => {
    delivery.packages = packages;
    delivery._doc.delivery_date = moment(delivery.delivery_date).subtract(4, 'hours').format("dddd, MMMM Do YYYY, h:mm A")+' EST'
    res.render('pages/warehouse/delivery/preview', {
      page: req.originalUrl,
      user: res.user,
      title: 'Delivery Detail',
      delivery: delivery
    })
  })
}

exports.close_delivery = (req,res, next) => {
  services.deliveryService.closeDelivery(req.params.id).then((response) => {
    res.send(response);
  });
};
