var services = require('../Services/RedisDataServices');
var utils = require('../Util/utils');
var helpers = require('../views/helpers');

exports.get_airline_list = (req, res, next) => {
 // services.airlineService.getAllAirlines().then(airlines => {
    res.render('pages/warehouse/airline/list', {
      page: req.originalUrl,
      title: 'Airlines',
      user: res.user,
      airlines: [],//airlines.map(utils.formattedRecord),
      daterange:req.query.daterange?req.query.daterange:'',
      clear:req.query.clear
    })
  //})
}

exports.get_all_airline_list = (req, res, next) => {
  services.airlineService.getAllAirline(req).then(airlinesResult => {
    var dataTable = {
      draw: req.query.draw,
      recordsTotal: airlinesResult.total,
      recordsFiltered: airlinesResult.total,
      data:[]
    }
    var data = [];
    var airlines = airlinesResult.airlines ? airlinesResult.airlines : [];
    for(var i=0; i< airlines.length; i++){
      var airlinesDetail = [];
      airlinesDetail.push(airlines[i].name ? airlines[i].name : '');
      airlinesDetail.push(helpers.formatDate(airlines[i].createdAt))
      airlinesDetail.push(helpers.getFullName(airlines[i]));
      airlinesDetail.push(`<a href='manage/${airlines[i]._id}/get'><i class="fas fa-pen"></i></a>`)
      data.push(airlinesDetail);
    }
    dataTable.data = data;
    res.json(dataTable);
  })
}

exports.create_airline = (req, res, next) => {
  res.render('pages/warehouse/airline/create', {
    page: req.originalUrl,
    title: 'Add New Airline',
    user: res.user,
  })
}

exports.add_new_airline = (req, res, next) => {
  services.airlineService.addAirline(req.body).then(result => {
    res.send(result);
  })
}

exports.get_airline_detail = (req, res, next) => {
  services.airlineService.getAirline(req.params.id).then(airline => {
    res.render('pages/warehouse/airline/edit', {
      page: req.originalUrl,
      title: "Airline Details",
      user: res.user,
      airline: airline
    })
  })
}

exports.update_airline = (req, res, next) => {
  services.airlineService.updateAirline(req.params.id, req.body).then(result => {
    res.send(result);
  })
}

exports.delete_airline = (req, res, next) => {
  services.airlineService.removeAirline(req.params.id).then(result => {
    res.send(result);
  })
}