'use strict';

var CustomerService = require('./CustomerService');
var customerService = new CustomerService();
var AwbService = require('./AwbService');
var awbService = new AwbService();
var ManifestService = require('./ManifestService');
var manifestService = new ManifestService();
var PackageService = require('./PackageService');
var packageService = new PackageService();
var UserService = require('./UserService');
var userService = new UserService();
var LocationService = require('./LocationService');
var locationService = new LocationService();
var DeliveryService = require('./DeliveryService');
var deliveryService = new DeliveryService();
var VehicleService = require('./VehicleService');
var vehicleService = new VehicleService();
var DriverService = require('./DriverService');
var driverService = new DriverService();
var PrintService = require('./PrintService');
var printService = new PrintService();
var PilotService = require('./PilotService');
var pilotService = new PilotService();
var PlaneService = require('./PlaneService');
var planeService = new PlaneService();
var HazmatService = require('./HazmatService');
var hazmatService = new HazmatService();
var ShipperService = require('./ShipperService');
var shipperService = new ShipperService();
var CarrierService = require('./CarrierService');
var carrierService = new CarrierService();
var ChargeService = require('./ChargeService');
var chargeService = new ChargeService();

var services = {
  customerService,
  awbService,
  manifestService,
  packageService,
  userService,
  locationService,
  deliveryService,
  driverService,
  vehicleService,
  printService,
  pilotService,
  planeService,
  hazmatService,
  shipperService,
  carrierService,
  chargeService,
};

packageService.setServiceInstances(services);
awbService.setServiceInstances(services);
deliveryService.setServiceInstances(services);

module.exports = services;