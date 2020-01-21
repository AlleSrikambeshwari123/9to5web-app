var express = require('express');
var router = express.Router();
var services = require('../RedisServices/RedisDataServices');
var middleware = require('../middleware');

router.get('/planes', middleware(services.userService).checkSession, function (req, res, next) {
	var pageData = {};
	pageData.title = "Planes"
	pageData.luser = res.User.firstName + ' ' + res.User.lastName;
	pageData.RoleId = res.User.role;
	services.planeService.getPlanes().then(planes => {
		pageData.planes = planes.planes;
		res.render('pages/fleet/flights', pageData);
	})

});
router.get('/get-plane/:id', middleware(services.userService).checkSession, (req, res, next) => {
	services.planeService.getPlane(req.params.id).then(plane => {
		res.send(plane);
	})
})
router.post('/save-plane', middleware(services.userService).checkSession, function (req, res, next) {
	// var pageData = {};
	// pageData.title = "Vehicles"
	// pageData.luser = res.User.firstName + ' ' + res.User.lastName;
	// pageData.RoleId = res.User.role;
	var body = req.body;
	if (Number(body.id) == 0) {
		services.planeService.addPlane(body).then(result => {
			res.send(result)
		});
	}
	else {
		services.planeService.updatePlane(body).then(result => {
			res.send(result)
		});
	}


});

router.post('/rm-plane', middleware(services.userService).checkSession, function (req, res, next) {
	console.log(req.body)
	var id = req.body.id;
	services.planeService.rmPlane(id).then(result => {
		res.send(result)
	})
});
router.get('/list-compartments/:plane', middleware(services.userService).checkSession, (req, res, next) => {
	var pageData = {};
	pageData.title = "Plane Compartments"
	pageData.luser = res.User.firstName + ' ' + res.User.lastName;
	pageData.RoleId = res.User.role;
	pageData.planeId = req.params.plane;
	services.planeService.listCompartments(req.params.plane).then(data => {
		pageData.plane = data.plane;
		console.log(data.plane.compartments)
		res.render('pages/fleet/plane-compartments', pageData)
	})

})
router.post('/add-plane-compartment/', middleware(services.userService).checkSession, (req, res, next) => {
	var body = req.body;
	services.planeService.addCompartment(body).then(results => {
		res.send(results)
	})
})
router.post('/rm-plane-compartment/', middleware(services.userService).checkSession, (req, res, next) => {
	var body = req.body;

	services.planeService.removeCompartment(body.planeId, body.id).then(result => {
		res.send(result)
	})
})
router.get('/vehicles', middleware(services.userService).checkSession, function (req, res, next) {
	var pageData = {};
	pageData.title = "Vehicles"
	pageData.luser = res.User.firstName + ' ' + res.User.lastName;
	pageData.RoleId = res.User.role;
	res.render('pages/fleet/vehicles', pageData);
});

router.get('/pilots', middleware(services.userService).checkSession, (req, res, next) => {
	var pageData = {};
	pageData.title = "Pilots",
		pageData.luser = res.User.firstName + ' ' + res.User.lastName;
	pageData.RoleId = res.User.role;
	services.pilotService.getPilots().then(pilots => {
		pageData.pilots = pilots.pilots;
		console.log(pilots);
		res.render('pages/fleet/pilots', pageData);
	})


})
router.post('/save-pilot', middleware(services.userService).checkSession, (req, res, next) => {
	var body = req.body;
	if (Number(body.id) == 0) {
		//add new pilot
		services.pilotService.addPilot(body).then(result => {
			res.send(result)
		})
	}
	else {
		//update pilot 
		services.pilotService.updatePilot(body).then(result => {
			res.send(result)
		})
	}
});
router.post('/rm-pilot', middleware(services.userService).checkSession, (req, res, next) => {
	console.log(req.body);
	services.pilotService.rmPilot(req.body.id).then(result => {
		res.send(result);
	})
})
router.get('/get-pilot/:id', middleware(services.userService).checkSession, (req, res, next) => {
	var id = req.params.id;
	services.pilotService.getPilot(id).then(pilot => {
		console.log(pilot);
		res.send(pilot.pilot);
	})
})
router.get('/add-vehicle', middleware(services.userService).checkSession, function (req, res, next) {
	var pageData = {};
	pageData.title = "Add Vehicle"
	pageData.luser = res.User.firstName + ' ' + res.User.lastName;
	pageData.RoleId = res.User.role;

	res.render('pages/fleet/addvehicle', pageData);
});

router.post('/add-vehicle', middleware(services.userService).checkSession, (req, res, next) => {
	var body = req.body;
	services.vehicleService.addVehicle(body).then(result => {
		if (result.saved == true) {
			res.redirect('/fleet/add-vehicle')
		}
		else {
			var pageData = {};
			pageData.title = "Add Vehicle"
			pageData.luser = res.User.firstName + ' ' + res.User.lastName;
			pageData.RoleId = res.User.role;
			res.render('pages/fleet/addvehicle', pageData);
		}
	})
})

router.get('/drivers', middleware(services.userService).checkSession, function (req, res, next) {
	var pageData = {};
	pageData.title = "Drivers"
	pageData.luser = res.User.firstName + ' ' + res.User.lastName;
	pageData.RoleId = res.User.role;
	res.render('pages/fleet/drivers', pageData);
});
router.get('/add-driver', middleware(services.userService).checkSession, function (req, res, next) {
	var pageData = {};
	pageData.title = "Add Driver"
	pageData.luser = res.User.firstName + ' ' + res.User.lastName;
	pageData.RoleId = res.User.role;
	res.render('pages/fleet/add-driver', pageData);
});
router.get('/routes', middleware(services.userService).checkSession, function (req, res, next) {
	var pageData = {};
	pageData.title = "Routes"
	pageData.luser = res.User.firstName + ' ' + res.User.lastName;
	pageData.RoleId = res.User.role;

	res.render('pages/fleet/routes', pageData);
});
router.get('/add-routes', middleware(services.userService).checkSession, function (req, res, next) {
	var pageData = {};
	pageData.title = "Add Route"
	pageData.luser = res.User.firstName + ' ' + res.User.lastName;
	pageData.RoleId = res.User.role;

	res.render('pages/fleet/add-routes', pageData);
});
module.exports = router;