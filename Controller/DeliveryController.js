var services = require('../Services/RedisDataServices');
var utils = require('../Util/utils');
var moment = require('moment');
var helpers = require('../views/helpers');

exports.get_delivery_list = (req, res, next) => {
 // services.deliveryService.getDeliveriesFullData().then((deliveries) => {
    
    Promise.all([
      services.locationService.getLocations(),
      services.driverService.getLocationDrivers('nas'),
      services.vehicleService.getVehiclesByLocation('nas'),
      services.packageService.getAllDeliveryPackagesData()
    ]).then((results) => {
      // const deliveryPackages = results[3];
      // const packageDataByDeliveryId = {};
      
      // deliveryPackages.forEach((deliveryPackage) => {
      //   if (!packageDataByDeliveryId[deliveryPackage['deliveryId']]) {
      //     packageDataByDeliveryId[deliveryPackage['deliveryId']] = [];
      //   }
      //   packageDataByDeliveryId[deliveryPackage['deliveryId']].push(deliveryPackage)
      // });

      // deliveries.forEach((delivery) => {
      //   delivery.packages = packageDataByDeliveryId[delivery._id];
      // });

      res.render('pages/warehouse/delivery/list', {
        page: req.originalUrl,
        user: res.user,
        title: 'Deliveries',
        deliveries: [],//deliveries.map(utils.formattedRecord),
        locations: results[0],
        drivers: results[1],
        vehicles: results[2],
        daterange:req.query.daterange?req.query.daterange:'',
        clear:req.query.clear
      })
    })
  //});
}

exports.get_all_delivery_list = (req, res, next)=>{
  services.deliveryService.getAllDeliveriesFullData(req).then((deliveriesResult) => {
    var total = deliveriesResult.total;
    var deliveries = deliveriesResult.deliveries;
    
    Promise.all([
      services.locationService.getLocations(),
      services.driverService.getLocationDrivers('nas'),
      services.vehicleService.getVehiclesByLocation('nas'),
      services.packageService.getAllDeliveryPackagesData()
    ]).then((results) => {
      const deliveryPackages = results[3];
      const packageDataByDeliveryId = {};
      
      deliveryPackages.forEach((deliveryPackage) => {
        if (!packageDataByDeliveryId[deliveryPackage['deliveryId']]) {
          packageDataByDeliveryId[deliveryPackage['deliveryId']] = [];
        }
        packageDataByDeliveryId[deliveryPackage['deliveryId']].push(deliveryPackage)
      });

      deliveries.forEach((delivery) => {
        delivery.packages = packageDataByDeliveryId[delivery._id];
      });
      var dataTable = {
        draw: req.query.draw,
        recordsTotal: deliveriesResult.total,
        recordsFiltered: deliveriesResult.total,
        data:[]
      }
      var data = [];
      
      for(var i=0; i< deliveries.length; i++){
        var deliveryDetail = [];
        deliveryDetail.push(deliveries[i].deliveryNum ? deliveries[i].deliveryNum : '');
        deliveryDetail.push(helpers.formatDate(deliveries[i].delivery_date));
        deliveryDetail.push((deliveries[i].user && deliveries[i].user.username));
        deliveryDetail.push(deliveries[i].location.name);
        deliveryDetail.push(deliveries[i].packages && deliveries[i].packages.length );
        deliveryDetail.push(helpers.getFullName(deliveries[i].driver));
        deliveryDetail.push(deliveries[i].vehicle.vehicleMake + '-' + deliveries[i].vehicle.model + '-' + deliveries[i].vehicle.registration)
        var action = `<a href='manage/${deliveries[i]._id}/get' class="btn btn-link btn-primary px-2" data-toggle="tooltip" data-original-title="Delivery Packages"> <i class="fa fa-box-open"></i> </a>
        <a class="btn btn-link btn-primary btn-close-delivery px-2 close-deliveryy" data-toggle="modal" data-id="${deliveries[i]._id}"> <i class="fa fa-check-circle"></i>
        </a>`;
        deliveryDetail.push(action);
        data.push(deliveryDetail);
      }
      dataTable.data = data;
      res.json(dataTable);
      
    })
  })
}

exports.add_new_delivery = (req, res, next) => {
  const createdBy = req['userId'];
  services.deliveryService.createDelivery(req.body, createdBy).then(response => {
    res.send(response);
  })
}

exports.get_delivery_detail = (req, res, next) => {
  var deliveryId = req.params.id;
  Promise.all([
    services.deliveryService.getFullDelivery(deliveryId),
    services.packageService.getPackagesDataByDeliveryId(deliveryId)
  ]).then(([delivery, packages]) => {
    delivery.packages = packages;
    delivery._doc.delivery_date = moment(delivery.delivery_date).subtract(4, 'hours').format("dddd, MMMM Do YYYY, h:mm A")+' EST'
    res.render('pages/warehouse/delivery/preview', {
      page: req.originalUrl,
      user: res.user,
      title: 'Delivery Detail',
      delivery: delivery
    })
  })
}

exports.close_delivery = (req,res, next) => {
  services.deliveryService.closeDelivery(req.params.id).then((response) => {
    res.send(response);
  });
};
