var services = require('../Services/RedisDataServices');
var utils = require('../Util/utils');

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
    });
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
  const flightName = await services.planeService.getFlieghtName(req.body.tailNumber);
  req.body.flightName = req.body.tailNumber+flightName;
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