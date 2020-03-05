const strings = require('../Res/strings');
const services = require('../RedisServices/RedisDataServices');
const utils = require('../Util/utils');

exports.get_airport_list = (req, res, next) => {
  services.airportService
    .all()
    .then((airports) => {
      res.render('pages/fleet/airport/list', {
        page: req.originalUrl,
        title: 'Airports',
        user: res.user,
        airports: airports.map(utils.formattedRecord),
      });
    })
    .catch(next);
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
    .then((airport) => {
      res.send({
        success: true,
        message: strings.string_response_added,
        airport,
      });
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