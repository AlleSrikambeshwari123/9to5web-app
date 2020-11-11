var services = require('../Services/RedisDataServices');
var utils = require('../Util/utils');
var helpers = require('../views/helpers')

exports.get_service_type_list = (req, res, next) => {
  services.serviceTypeService.getAllServiceTypes().then(serviceTypes => {
    res.render('pages/warehouse/service-type/list', {
      page: req.originalUrl,
      title: 'Service Types',
      user: res.user,
      serviceTypes: serviceTypes.map(utils.formattedRecord),
      daterange:req.query.daterange?req.query.daterange:'',
      clear:req.query.clear
    })
  })
}

exports.get_all_service_type_list = (req, res, next) =>{
  if(req.body.clear)
    req.body.daterange =''
  services.serviceTypeService.getServiceTypes(req).then(results => {
    const serviceTypes = results.serviceTypes;
    var dataTable = {
      draw: req.query.draw,
      recordsTotal: results.total,
      recordsFiltered: results.total,
      data:[]
    }
    let data = [];
    for(var i=0; i< serviceTypes.length; i++){
      var serviceTypeDetail = [];
      serviceTypeDetail.push(serviceTypes[i].name)
      serviceTypeDetail.push(helpers.formatDate(serviceTypes[i].createdAt));
      serviceTypeDetail.push(serviceTypes[i].amount)
      serviceTypeDetail.push(` <a href='manage/${serviceTypes[i].id}/get'><i class="fas fa-pen"></i></a>`)
      data.push(serviceTypeDetail);
    }
    dataTable.data = data;
    res.json(dataTable);
  })  
}

exports.create_service_type = (req, res, next) => {
  res.render('pages/warehouse/service-type/create', {
    page: req.originalUrl,
    title: 'Add New Service Type',
    user: res.user,
  })
}

exports.add_new_service_type = (req, res, next) => {
  req.body['createdBy'] = req['userId'];
  services.serviceTypeService.addServiceType(req.body).then(result => {
    res.send(result);
  })
}

exports.get_service_type_detail = (req, res, next) => {
  services.serviceTypeService.getServiceType(req.params.id).then(serviceType => {
    res.render('pages/warehouse/service-type/edit', {
      page: req.originalUrl,
      title: "Service Type Details",
      user: res.user,
      serviceType: serviceType
    })
  })
}

exports.update_service_type = (req, res, next) => {
  services.serviceTypeService.updateServiceType(req.params.id, req.body).then(result => {
    res.send(result);
  })
}

exports.delete_service_type = (req, res, next) => {
  services.serviceTypeService.removeServiceType(req.params.id).then(result => {
    res.send(result);
  })
}