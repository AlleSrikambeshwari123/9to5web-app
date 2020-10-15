var services = require('../Services/RedisDataServices');
var utils = require('../Util/utils');
var helpers = require('../views/helpers');

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
  //services.locationService.getLocations().then(locations => {
    res.render('pages/admin/location/list', {
      title: 'Locations',
      page: req.originalUrl,
      user: res.user,
      locations: [],
      daterange:req.query.daterange?req.query.daterange:'',
      clear:req.query.clear
    });
 // });
}

exports.get_all_locations = (req, res, next) =>{  
  if(req.body.clear){
    req.body.daterange = '';
  }
  services.locationService.get_all_locations(req).then(locationResult => {
     var dataTable = {
       draw: req.query.draw,
       recordsTotal: locationResult.total,
       recordsFiltered: locationResult.total,
       data:[]
     }
     var data = [];
     var locations = locationResult.locations;
     for(var i=0; i< locations.length; i++){
       var locationDetail = [];
       locationDetail.push((locations[i].company && locations[i].company.name) ? locations[i].company.name : '');
       locationDetail.push(helpers.formatDate(locations[i].createdAt));
       locationDetail.push(locations[i].name);
       locationDetail.push(locations[i].address);
       locationDetail.push(locations[i].phone);
       locationDetail.push(`<a href="manage/${locations[i].id}/get"><i class='fas fa-pencil-alt'></i></a>`);      
       data.push(locationDetail);
    }
    dataTable.data = data;
    res.json(dataTable);
  })
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