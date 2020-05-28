var services = require('../Services/RedisDataServices');
var utils = require('../Util/utils');

exports.create_location = (req, res, next) => {
  services.locationService.getCompanies().then(function (companies) {
    res.render('pages/admin/location/create', {
      page: req.originalUrl,
      title: 'Create New Location',
      companies: companies,
      user: res.user,
    });
  });
}

exports.add_new_location = (req, res, next) => {
  services.locationService.addLocation(req.body).then(function (result) {
    res.send(result);
  })
}

exports.get_location_list = (req, res, next) => {
  services.locationService.getLocations().then(locations => {
    res.render('pages/admin/location/list', {
      title: 'Locations',
      page: req.originalUrl,
      user: res.user,
      locations: locations.map(utils.formattedRecord),
    });
  });
}

exports.get_location = (req, res, next) => {
  let id = req.params.id;
  services.locationService.getCompanies().then(function (companies) {
    services.locationService.getLocation(id).then(location => {
      res.render('pages/admin/location/edit', {
        page: req.originalUrl,
        title: 'Location Details',
        user: res.user,
        companies: companies,
        location: location
      });
    });
  });  
}

exports.update_location = (req, res, next) => {
  services.locationService.updateLocation(req.body).then(result => {
    res.send(result);
  })
}

exports.delete_location = (req, res, next) => {
  services.locationService.removeLocation(req.params.id).then(result => {
    res.send(result);
  })
}