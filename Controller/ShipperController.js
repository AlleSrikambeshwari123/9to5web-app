var services = require('../Services/RedisDataServices');
var utils = require('../Util/utils');
var countries = require('../public/js/countries');
var helpers = require('../views/helpers');

exports.get_shipper_list = (req, res, next) => {
  services.shipperService.getAllShippers().then(shippers => {
    res.render('pages/warehouse/shipper/list', {
      page: req.originalUrl,
      title: 'Shippers',
      user: res.user,
      shippers: shippers.map(utils.formattedRecord),
      daterange:req.query.daterange?req.query.daterange:'',
      clear:req.query.clear
    })
  })
}
exports.get_all_shipper_list = (req, res, next) => {
  services.shipperService.getAllShipper(req).then(shippersResult => {
    var dataTable = {
      draw: req.query.draw,
      recordsTotal: shippersResult.total,
      recordsFiltered: shippersResult.total,
      data:[]
    }
    var data = [];
    var shippers = shippersResult.shippers?shippersResult.shippers:[];
    for(var i=0; i< shippers.length; i++){
      var shippersDetail = [];
      shippersDetail.push(shippers[i].name ? shippers[i].name : '');
      shippersDetail.push(helpers.formatDate(shippers[i].createdAt))
      shippersDetail.push(helpers.getFullName(shippers[i]));
      shippersDetail.push(shippers[i].email ? shippers[i].email : '');
      shippersDetail.push(shippers[i].telephone ? shippers[i].telephone : '');
      shippersDetail.push(shippers[i].address ? shippers[i].address : '');
      shippersDetail.push(`<a href='manage/${shippers[i]._id}/get'><i class="fas fa-pen"></i></a>
      <a href='#' class='rm-shipper ml-3' data-id='${shippers[i]._id}'><i class="fas fa-trash"></i></a>`);
      data.push(shippersDetail);
    }
    dataTable.data = data;
    res.json(dataTable);
  })
}

exports.create_shipper = (req, res, next) => {
  res.render('pages/warehouse/shipper/create', {
    page: req.originalUrl,
    title: 'Add New Shipper',
    user: res.user,
    countries : countries.default
  })
}

exports.add_new_shipper = (req, res, next) => {
  req.body['createdBy'] = req['userId'];
  services.shipperService.addShipper(req.body).then(result => {
    res.send(result);
  })
}

exports.get_shipper_detail = (req, res, next) => {
  services.shipperService.getShipper(req.params.id).then(shipper => {
    if(!shipper.country)
      shipper.country = ''
    res.render('pages/warehouse/shipper/edit', {
      page: req.originalUrl,
      title: "Shipper Details",
      user: res.user,
      shipper: shipper,
      countries : countries.default
    })
  })
}

exports.update_shipper = (req, res, next) => {
  services.shipperService.updateShipper(req.params.id, req.body).then(result => {
    res.send(result);
  })
}

exports.delete_shipper = (req, res, next) => {
  services.shipperService.removeShipper(req.params.id).then(result => {
    res.send(result);
  })
}