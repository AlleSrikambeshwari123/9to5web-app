var express = require('express');
var router = express.Router();
var middleware = require('../../middleware.js');
var services = require('../../RedisServices/RedisDataServices');
const strings = require('../../Res/strings');

router.get('/print-awb/:awb', middleware().checkSession, (req, res, next) => {
  var username = res.user.username;
  var awb = req.params.awb;
  services.printService.sendAwbToPrint(awb, username)
  res.send({ sent: true })
})
router.get('/print-awb-lbl/:awb', middleware().checkSession, (req, res, next) => {
  var username = res.user.username;
  var awb = req.params.awb;
  services.printService.sendLblToPrint(awb, username);
  res.send({ sent: true })
})
router.get('/print-single-label/:awb/:pkgId', middleware().checkSession, (req, res, next) => {
  var username = res.user.username;
  var awb = req.params.awb;
  var pkgId = req.params.pkgId
  services.printService.sendLblToPrint(awb, username);
  res.send({ sent: true })
})

module.exports = router;