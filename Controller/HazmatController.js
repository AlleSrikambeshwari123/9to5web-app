var services = require('../Services/RedisDataServices');
var utils = require('../Util/utils');

exports.get_hazmat_list = (req, res, next) => {
  services.hazmatService.getHazmats().then(hazmats => {
    res.render('pages/warehouse/hazmat/list', {
      page: req.originalUrl,
      title: 'HAZMAT Classes',
      user: res.user,
      hazmats: hazmats
    })
  })
}

exports.add_new_hazmat = (req, res, next) => {
  req.body['createdBy'] = req['userId'];
  services.hazmatService.createHazmat(req.body).then(result => {
    res.send(result);
  })
}

exports.get_hazmat_detail = (req, res, next) => {
  services.hazmatService.getHazmat(req.params.id).then(hazmat => {
    res.send(hazmat);
  })
}

exports.update_hazmat = (req, res, next) => {
  services.hazmatService.updateHazmat(req.params.id, req.body).then(result => {
    res.send(result);
  })
}

exports.delete_hazmat = (req, res, next) => {
  services.hazmatService.removeHazmat(req.params.id).then(result => {
    res.send(result);
  })
}