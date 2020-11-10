var services = require('../Services/RedisDataServices');
var utils = require('../Util/utils');
var helpers = require('../views/helpers');

exports.get_plane_list = (req, res, next) => {
  services.planeService.getPlanes().then(async (planes) => {
    await Promise.all(
      planes.map(async (plane) => {
        let [pilot, airline] = await Promise.all([
          services.pilotService.getPilot(plane.pilotId),
          plane.airlineId && services.airlineService.getAirline(plane.airlineId),
        ]);
        plane.pilot = pilot;
        plane.airline = airline;
      }),
    );
    res.render('pages/fleet/plane/list', {
      page: req.originalUrl,
      user: res.user,
      title: 'Planes',
      planes: planes.map(utils.formattedRecord),
      daterange:req.query.daterange?req.query.daterange:'',
      clear:req.query.clear
    });
  });
}

exports.get_all_plane_list = (req, res, next) => {
  services.planeService.getAllPlanes(req).then(async (planesResult) => {
    var dataTable = {
      draw: req.query.draw,
      recordsTotal: planesResult.total,
      recordsFiltered: planesResult.total,
      data:[]
    }
    var data = [];
    var planes = planesResult.planes?planesResult.planes:[];
    for(var i=0; i< planes.length; i++){
      var planeDetail = [];
      
      planeDetail.push(planes[i].tailNumber ? planes[i].tailNumber : '');
      planeDetail.push(helpers.formatDate(planes[i].createdAt));
      planeDetail.push(planes[i].flightName ? planes[i].flightName : '');
      planeDetail.push(planes[i].pilot.firstName + ' '+ planes[i].pilot.lastName );
      planeDetail.push(planes[i].airline.name ? planes[i].airline.name : '');
      planeDetail.push(planes[i].aircraftType ? planes[i].aircraftType : '');
      planeDetail.push(planes[i].maximumCapacity ? planes[i].maximumCapacity : '');
      planeDetail.push(`<a class='config-plane ml-2' title='Setup Compartments' data-id='${planes[i]._id}'
      href="/fleet/compartment/${planes[i]._id}/list"><i class='fa fa-cog'></i></a>
    <a href='manage/${planes[i]._id}/get' class="ml-2"><i class="fas fa-edit"></i></a>`)
      data.push(planeDetail);
    }
    dataTable.data = data;
    res.json(dataTable);
  });

}

exports.create_plane = async (req, res, next) => {  
  let airlines = await services.airlineService.getAllAirlines().catch(() => [])
  res.render('pages/fleet/plane/create', {
    page: req.originalUrl,
    user: res.user,
    title: 'Add New Plane',
    airlines,
  })
}

exports.add_new_plane = async (req, res, next) => {
  // const flightName = await services.planeService.getFlieghtName(req.body.tailNumber);
  req.body.flightName = req.body.tailNumber;
  services.planeService.addPlane(req.body).then(result => {
    res.send(result);
  })
}

exports.delete_plane = (req, res, next) => {
  services.planeService.removePlane(req.params.id).then(result => {
    res.send(result);
  })
}

exports.get_plane_detail = (req, res, next) => {
  services.planeService.getPlane(req.params.id).then(plane => {
    Promise.all([
      services.pilotService.getPilotsWarehouse(plane.warehouse),
      services.airlineService.getAllAirlines().catch(() => []),
    ]).then(([pilots, airlines]) => {
      res.render('pages/fleet/plane/edit', {
        page: req.originalUrl,
        user: res.user,
        title: 'Plane Details',
        plane: utils.formattedRecord(plane),
        pilots: pilots,
        airlines: airlines,
      })
    })
  })
}

exports.update_plane = (req, res, next) => { 
  services.planeService.updatePlane(req.params.id, req.body).then(result => {
    res.send(result);
  })
}

exports.get_plane = (req, res, next) => {
  services.planeService.getPlane(req.params.id).then(plane => {
    res.send(plane);
  })
}