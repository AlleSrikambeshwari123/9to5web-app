var services = require('../Services/RedisDataServices');
var utils = require('../Util/utils');
var helpers = require('../views/helpers')

exports.get_paid_type_list = (req, res, next) => {
  services.paidTypeService.getAllPaidTypes().then(paidTypes => {
    res.render('pages/warehouse/paid-type/list', {
      page: req.originalUrl,
      title: 'Paid Types',
      user: res.user,
      paidTypes: paidTypes.map(utils.formattedRecord),
      daterange:req.query.daterange?req.query.daterange:'',
      clear:req.query.clear 
    })
  })
}

exports.get_all_paid_type_list = (req, res, next) => {
  if(req.body.clear)
    req.body.daterange =''
  services.paidTypeService.getPaidTypes(req).then(results => {
    const paidTypes = results.paidTypes;
    var dataTable = {
      draw: req.query.draw,
      recordsTotal: results.total,
      recordsFiltered: results.total,
      data:[]
    }
    let data = [];
    for(var i=0; i< paidTypes.length; i++){
      var hazmatDetail = [];
      hazmatDetail.push(paidTypes[i].name)
      hazmatDetail.push(helpers.formatDate(paidTypes[i].createdAt));
      hazmatDetail.push(`<a href='manage/${paidTypes[i].id}/get'><i class="fas fa-pen"></i></a>`)
      data.push(hazmatDetail);
    }
    dataTable.data = data;
    res.json(dataTable);
})  
}

exports.create_paid_type = (req, res, next) => {
  res.render('pages/warehouse/paid-type/create', {
    page: req.originalUrl,
    title: 'Add New Paid Type',
    user: res.user,
  })
}

exports.add_new_paid_type = (req, res, next) => {
  req.body['createdBy'] = req['userId'];
  services.paidTypeService.addPaidType(req.body).then(result => {
    res.send(result);
  })
}

exports.get_paid_type_detail = (req, res, next) => {
  services.paidTypeService.getPaidType(req.params.id).then(paidType => {
    res.render('pages/warehouse/paid-type/edit', {
      page: req.originalUrl,
      title: "Paid Type Details",
      user: res.user,
      paidType: paidType
    })
  })
}

exports.update_paid_type = (req, res, next) => {
  services.paidTypeService.updatePaidType(req.params.id, req.body).then(result => {
    res.send(result);
  })
}

exports.delete_paid_type = (req, res, next) => {
  services.paidTypeService.removePaidType(req.params.id).then(result => {
    res.send(result);
  })
}