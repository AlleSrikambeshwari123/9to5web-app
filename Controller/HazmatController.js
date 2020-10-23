var services = require('../Services/RedisDataServices');
var utils = require('../Util/utils');
var helpers = require('../views/helpers')

exports.get_hazmat_list = (req, res, next) => {
  // services.hazmatService.getHazmats().then(hazmats => {
    res.render('pages/warehouse/hazmat/list', {
      page: req.originalUrl,
      title: 'HAZMAT Classes',
      user: res.user,
      hazmats: [],//hazmats
      daterange:req.query.daterange?req.query.daterange:'',
      clear:req.query.clear
    })
  // })
}

exports.get_all_hazmat_list = (req, res, next) => {
  if(req.body.clear)
    req.body.daterange =''
  services.hazmatService.getAllHazmats(req).then(results => {
    const hazmats = results.hazmats;
    var dataTable = {
      draw: req.query.draw,
      recordsTotal: results.total,
      recordsFiltered: results.total,
      data:[]
    }
    let data = [];
    for(var i=0; i< hazmats.length; i++){
      var hazmatDetail = [];
      hazmatDetail.push(hazmats[i].id)
      hazmatDetail.push(helpers.formatDate(hazmats[i].createdAt));
      hazmatDetail.push(hazmats[i].name)
      hazmatDetail.push(hazmats[i].description)
      hazmatDetail.push(` <button href='#' data-id='${hazmats[i].id}' data-target="#edit-hazmat" data-toggle='modal'
      class='btn btn-link btn-primary btn-edit-hazmat mx-3' onclick="editHazmat(this)"><i class="fas fa-pen"></i></button>`)
      data.push(hazmatDetail);
    }
    dataTable.data = data;
    res.json(dataTable);
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