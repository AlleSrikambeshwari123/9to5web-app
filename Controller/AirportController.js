const strings = require('../Res/strings');
const services = require('../Services/RedisDataServices');
const utils = require('../Util/utils');
var helpers = require('../views/helpers');

exports.get_airport_list = (req, res, next) => {
  services.airportService.all().then((airports) => {
      res.render('pages/fleet/airport/list', {
        page: req.originalUrl,
        title: 'Airports',
        user: res.user,
        airports: airports.map(utils.formattedRecord),
        daterange:req.query.daterange?req.query.daterange:'',
        clear:req.query.clear
      });
    })
    .catch(next);
};

exports.get_all_airport_list = (req, res, next) => {
  services.airportService.allAirport(req).then((airportsResult) => {
      var dataTable = {
        draw: req.query.draw,
        recordsTotal: airportsResult.total,
        recordsFiltered: airportsResult.total,
        data:[]
      }
      var data = [];
      var airports = airportsResult.airports?airportsResult.airports:[];
      for(var i=0; i< airports.length; i++){
        var airportDetail = [];
        
        airportDetail.push(airports[i].name ? airports[i].name : '');
        airportDetail.push(helpers.formatDate(airports[i].createdAt));
        airportDetail.push(airports[i].shortCode ? airports[i].shortCode : '');
        airportDetail.push(airports[i].country + ' '+ airports[i].country);
        airportDetail.push(`<a href="manage/${airports[i]._id}/get"><i class="fas fa-pen"></i></a>`);
        data.push(airportDetail);
      }
      dataTable.data = data;
      res.json(dataTable);
    })
};


exports.create_airport = (req, res, next) => {
  res.render('pages/fleet/airport/create', {
    page: req.originalUrl,
    title: 'Add New Airport',
    user: res.user,
  });
};

exports.add_new_airport = (req, res, next) => {
  services.airportService
    .create(req.body)
    .then((result) => {
      res.send(result);
    })
    .catch((error) => {
      res.send({ success: false, message: strings.string_response_error });
    });
};

exports.get_airport_detail = (req, res, next) => {
  services.airportService
    .get(req.params.id)
    .then((airport) => {
      res.render('pages/fleet/airport/edit', {
        page: req.originalUrl,
        title: 'Airport Details',
        user: res.user,
        airport: airport,
      });
    })
    .catch(next);
};

exports.update_airport = (req, res, next) => {
  services.airportService
    .update(req.params.id, req.body)
    .then((result) => {
      res.send({ success: true, message: strings.string_response_updated });
    })
    .catch((error) => {
      console.error(error)
      res.send({ success: false, message: strings.string_response_error });
    });
};

exports.delete_airport = (req, res, next) => {
  services.airportService
    .remove(req.params.id)
    .then((result) => {
      res.send({ success: true, message: strings.string_response_removed });
    })
    .catch((error) => {
      res.send({ success: false, message: strings.string_response_error });
    });
};
