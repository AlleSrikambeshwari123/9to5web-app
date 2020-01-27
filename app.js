var express = require('express');
var path = require('path');
var favicon = require('serve-favicon');
var logger = require('morgan');
var cookieParser = require('cookie-parser');
var bodyParser = require('body-parser');
var ejsmate = require('ejs-mate');
var session = require('client-sessions');

var accountRouter = require('./routes/account');
var authRouter = require('./routes/auth');
var adminIndexRouter = require('./routes/index');
var adminUserRouter = require('./routes/admin/users');
var adminCustRouter = require('./routes/admin/customers');
var adminLocaRouter = require('./routes/admin/locations');

var fleetVehicleRouter = require('./routes/fleet/vehicles');
var fleetDriverRouter = require('./routes/fleet/drivers');

var warehouseAwbRouter = require('./routes/warehouse/awb');
var warehouseManifestRouter = require('./routes/warehouse/manifest');
var warehouseShipperRouter = require('./routes/warehouse/shipper');
var warehousePackageRouter = require('./routes/warehouse/package');

var warehouse = require('./routes/warehouse');
var fleet = require('./routes/fleet');
var util = require('./routes/util');
var wapi = require('./routes/wapi');
var app = express();

// view engine setup
app.engine("ejs", ejsmate);
app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'ejs');

// uncomment after placing your favicon in /public
//app.use(favicon(path.join(__dirname, 'public', 'favicon.ico')));
app.use(logger('dev'));

app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: false }));
app.use(cookieParser());
app.use(express.static(path.join(__dirname, 'public')));
app.use(session({
  cookieName: 'session',
  secret: 'Silver123.',
  duration: 60 * 60 * 1000,
  activeDuration: 60 * 60 * 1000
}));
app.use('/', adminIndexRouter, authRouter);
app.use('/account', accountRouter);
app.use('/admin', adminUserRouter, adminCustRouter, adminLocaRouter);
app.use('/warehouse', warehouse, warehouseAwbRouter, warehouseManifestRouter, warehouseShipperRouter, warehousePackageRouter);
app.use('/fleet', fleetVehicleRouter, fleetDriverRouter);
app.use('/util', util);
app.use('/api/warehouse', wapi);
// catch 404 and forward to error handler
app.use(function (req, res, next) {
  var err = new Error('Not Found');
  err.status = 404;
  next(err);
});

// error handler
app.use(function (err, req, res, next) {
  // set locals, only providing error in development
  res.locals.message = err.message;
  res.locals.error = req.app.get('env') === 'development' ? err : {};

  // render the error page
  res.status(err.status || 500);
  res.render('error');
});

module.exports = app;
