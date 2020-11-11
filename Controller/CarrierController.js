var services = require('../Services/RedisDataServices');
var utils = require('../Util/utils');
var helpers = require('../views/helpers')

exports.get_carrier_list = (req, res, next) => {
  services.carrierService.getAllCarriers().then(carriers => {
    res.render('pages/warehouse/carrier/list', {
      page: req.originalUrl,
      title: 'Carriers',
      user: res.user,
      carriers: carriers.map(utils.formattedRecord),
      daterange:req.query.daterange?req.query.daterange:'',
      clear:req.query.clear
    })
  })
}

exports.get_all_carrier_list = (req, res, next) =>{
  if(req.body.clear)
    req.body.daterange =''
  services.carrierService.getCarriers(req).then(results => {
    const carriers = results.carriers;
    var dataTable = {
      draw: req.query.draw,
      recordsTotal: results.total,
      recordsFiltered: results.total,
      data:[]
    }
    let data = [];
    for(var i=0; i< carriers.length; i++){
      var carrierDetail = [];
      carrierDetail.push(carriers[i].name)
      carrierDetail.push(helpers.formatDate(carriers[i].createdAt));
      carrierDetail.push(helpers.getFullName(carriers[i]))
      carrierDetail.push(carriers[i].email)
      carrierDetail.push(carriers[i].telephone)
      carrierDetail.push(carriers[i].address)
      carrierDetail.push(`<a href='manage/${carriers[i]._id}/get'><i class="fas fa-pen"></i></a>`)
      data.push(carrierDetail);
    }
    dataTable.data = data;
    res.json(dataTable);
  }) 
}

exports.create_carrier = (req, res, next) => {
  res.render('pages/warehouse/carrier/create', {
    page: req.originalUrl,
    title: 'Add New Carrier',
    user: res.user,
  })
}

exports.add_new_carrier = (req, res, next) => {
  req.body['createdBy'] = req['userId'];
  services.carrierService.addCarrier(req.body).then(result => {
    res.send(result);
  })
}

exports.get_carrier_detail = (req, res, next) => {
  services.carrierService.getCarrier(req.params.id).then(carrier => {
    res.render('pages/warehouse/carrier/edit', {
      page: req.originalUrl,
      title: "Carrier Details",
      user: res.user,
      carrier: carrier
    })
  })
}

exports.update_carrier = (req, res, next) => {
  services.carrierService.updateCarrier(req.params.id, req.body).then(result => {
    res.send(result);
  })
}

exports.delete_carrier = (req, res, next) => {
  services.carrierService.removeCarrier(req.params.id).then(result => {
    res.send(result);
  })
}