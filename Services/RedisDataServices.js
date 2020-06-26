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
var AirlineService = require('./AirlineService');
var airlineService = new AirlineService()
var CarrierService = require('./CarrierService');
var carrierService = new CarrierService();
var PaidTypeService = require('./PaidTypeService');
var paidTypeService = new PaidTypeService();
var ServiceTypeService = require('./ServiceTypeService');
var serviceTypeService = new ServiceTypeService();
var ContainerService = require('./ContainerService');
var containerService = new ContainerService();
var AirportService = require('./AirportService');
var airportService = new AirportService();
var InvoiceService = require('./InvoiceService');
var invoiceService = new InvoiceService();
var CubeService = require('./CubeService');
var cubeService = new CubeService();
var ZoneService = require('./ZoneService');
var zoneService = new ZoneService();
var PriceLabelService = require('./PriceLabelService')
var PriceLabelService = new PriceLabelService();

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
  airlineService,
  carrierService,
  paidTypeService,
  serviceTypeService,
  containerService,
  airportService,
  invoiceService,
  cubeService,
  zoneService,
  PriceLabelService
};

packageService.setServiceInstances(services);
awbService.setServiceInstances(services);
deliveryService.setServiceInstances(services);
PriceLabelService.setServiceInstances(services);

module.exports = services;