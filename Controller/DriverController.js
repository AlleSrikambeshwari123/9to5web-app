var services = require('../Services/RedisDataServices');
var utils = require('../Util/utils');
var helpers = require('../views/helpers');

exports.get_driver_list = (req, res, next) => {
 services.driverService.getDrivers().then(drivers => {
    res.render('pages/fleet/driver/list', {
      page: req.originalUrl,
      title: 'Drivers',
      user: res.user,
      drivers: drivers.map(utils.formattedRecord),
      daterange:req.query.daterange?req.query.daterange:'',
      clear:req.query.clear
    })
  })
}

exports.get_all_driver_list = (req, res, next) =>{
  if(req.body.clear){
    req.body.daterange = '';
  }
  services.driverService.getDriversList(req).then(driversResult => {
    var dataTable = {
      draw: req.query.draw,
      recordsTotal: driversResult.total,
      recordsFiltered: driversResult.total,
      data:[]
    }
    var data = [];
    var drivers = driversResult.drivers?driversResult.drivers:[];
    console.log(drivers)
    drivers = drivers.map(utils.formattedRecord)
    for(var i=0; i< drivers.length; i++){
      var driverDetail = [];
      var name = (drivers[i].firstName ? drivers[i].firstName : '') + ' ' + (drivers[i].lastName ? drivers[i].lastName : '')
      driverDetail.push(name);
      driverDetail.push(helpers.formatDate(drivers[i].createdAt))
      driverDetail.push(drivers[i].email ? drivers[i].email : '');
      driverDetail.push(drivers[i].mobile ? drivers[i].mobile : '');
      driverDetail.push(drivers[i].location ? drivers[i].location : '');
      driverDetail.push(`<a href='manage/${drivers[i]._id}/get'><i class="fas fa-user-edit px-3"></i></a>`)
      data.push(driverDetail);
    }
    dataTable.data = data;
    res.json(dataTable);
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

exports.get_location_drivers = (req, res, next) => {
  var location = req.params.location;
  services.driverService.getLocationDrivers(location).then(drivers => {
    res.send(drivers.map(utils.formattedRecord));
  })
}