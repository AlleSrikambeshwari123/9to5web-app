var services = require('../RedisServices/RedisDataServices');
var utils = require('../Util/utils');

exports.get_delivery_list = (req, res, next) => {
  services.deliveryService.getDeliveries().then(deliveries => {
    Promise.all(deliveries.map(delivery => {
      return services.deliveryService.getFullDelivery(delivery.id)
    })).then(delivers => {
      Promise.all([
        services.locationService.getLocations(),
        services.driverService.getDrivers(),
        services.vehicleService.getVehicles()
      ]).then(results => {
        res.render('pages/warehouse/delivery/list', {
          page: req.originalUrl,
          user: res.user,
          title: 'Deliveries',
          deliveries: delivers.map(utils.formattedRecord),
          locations: results[0],
          drivers: results[1],
          vehicles: results[2],
        })
      })
    })
  })
}