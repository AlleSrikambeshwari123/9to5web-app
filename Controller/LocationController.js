var services = require('../RedisServices/RedisDataServices');

exports.create_location = (req, res, next) => {
  res.render('pages/admin/location/create', {
    page: req.url,
    title: 'Create New User',
    user: res.user,
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
      page: req.url,
      user: res.user,
      locations: locations,
    });
  });
}

exports.get_location = (req, res, next) => {
  let id = req.params.id;
  services.locationService.getLocation(id).then(location => {
    res.render('pages/admin/location/edit', {
      page: req.url,
      title: 'Location Details',
      user: res.user,
      location: location
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