var services = require('../Services/RedisDataServices');
var utils = require('../Util/utils');
var helpers = require('../views/helpers');

exports.get_pilot_list = (req, res, next) => {
  services.pilotService.getPilots().then(pilots => {
    res.render('pages/fleet/pilot/list', {
      page: req.originalUrl,
      user: res.user,
      title: 'Pilots',
      pilots: [],//pilots.map(utils.formattedRecord),
      daterange:req.query.daterange?req.query.daterange:'',
      clear:req.query.clear
    })
  })
}

exports.get_all_pilot_list = (req, res, next) => {
  services.pilotService.getAllPilots(req).then(pilotsResult => {
    var dataTable = {
      draw: req.query.draw,
      recordsTotal: pilotsResult.total,
      recordsFiltered: pilotsResult.total,
      data:[]
    }
    var data = [];
    var pilots = pilotsResult.pilots?pilotsResult.pilots:[];
    for(var i=0; i< pilots.length; i++){
      var pilotDetail = [];
      var fname = (pilots[i].firstName) ? pilots[i].firstName: '';
      var lname = (pilots[i].lastName) ? pilots[i].lastName: '';
      pilotDetail.push(fname + ' ' +lname);
      pilotDetail.push(helpers.formatDate(pilots[i].createdAt));
      pilotDetail.push(pilots[i].company ? pilots[i].company : '');
      pilotDetail.push(pilots[i].mobile ? pilots[i].mobile : '');
      pilotDetail.push(pilots[i].email ? pilots[i].email : '');
      pilotDetail.push(`<a href='manage/${pilots[i]._id}/get'><i class="fas fa-user-edit"></i></a>`)

      data.push(pilotDetail);
    }
    dataTable.data = data;
    res.json(dataTable);
  })
}

exports.create_pilot = (req, res, next) => {
  res.render('pages/fleet/pilot/create', {
    page: req.originalUrl,
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
      page: req.originalUrl,
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

exports.get_warehouse_pilots = (req, res, next) => {
  //var warehouse = req.params.warehouse;
  services.pilotService.getPilots().then(pilots => {
    res.send(pilots);
  })
}