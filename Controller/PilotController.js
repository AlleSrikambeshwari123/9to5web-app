var services = require('../RedisServices/RedisDataServices');
var utils = require('../Util/utils');

exports.get_pilot_list = (req, res, next) => {
  services.pilotService.getPilots().then(pilots => {
    res.render('pages/fleet/pilot/list', {
      page: req.url,
      user: res.user,
      title: 'Pilots',
      pilots: pilots.map(utils.formattedRecord),
    })
  })
}

exports.create_pilot = (req, res, next) => {
  res.render('pages/fleet/pilot/create', {
    page: req.url,
    user: res.user,
    title: 'Add New Pilot',
  })
}

exports.add_new_pilot = (req, res, next) => {
  services.pilotService.addPilot(req.body).then(result => {
    res.send(result);
  })
}

exports.delete_pilot = (req, res, next) => {
  services.pilotService.removePilot(req.params.id).then(result => {
    res.send(result);
  })
}

exports.get_pilot_detail = (req, res, next) => {
  services.pilotService.getPilot(req.params.id).then(pilot => {
    res.render('pages/fleet/pilot/edit', {
      page: req.url,
      user: res.user,
      title: 'Pilot Details',
      pilot: pilot,
    })
  })
}

exports.update_pilot = (req, res, next) => {
  services.pilotService.updatePilot(req.params.id, req.body).then(result => {
    res.send(result);
  })
}