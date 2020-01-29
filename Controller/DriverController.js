var services = require('../RedisServices/RedisDataServices');

exports.get_driver_list = (req, res, next) => {
  services.driverService.getDrivers().then(drivers => {
    res.render('pages/fleet/driver/list', {
      page: req.originalUrl,
      title: 'Drivers',
      user: res.user,
      drivers: drivers,
    })
  })
}

exports.create_driver = (req, res, next) => {
  res.render('pages/fleet/driver/create', {
    page: req.originalUrl,
    title: 'Create New Driver',
    user: res.user,
  })
}

exports.add_new_driver = (req, res, next) => {
  services.driverService.createDriver(req.body).then(result => {
    res.send(result);
  })
}

exports.get_driver_detail = (req, res, next) => {
  services.driverService.getDriver(req.params.id).then(driver => {
    res.render('pages/fleet/driver/edit', {
      page: req.originalUrl,
      title: 'Driver Detail',
      user: res.user,
      driver: driver,
    })
  })
}

exports.update_driver = (req, res, next) => {
  services.driverService.updateDriver(req.params.id, req.body).then(result => {
    res.send(result);
  })
}

exports.delete_driver = (req, res, next) => {
  services.driverService.removeDriver(req.params.id).then(result => {
    res.send(result);
  })
}