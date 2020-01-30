var express = require('express');
var router = express.Router();
var middleware = require('../../middleware.js');
var services = require('../../RedisServices/RedisDataServices');
const strings = require('../../Res/strings');

router.get('/change-printer', middleware().checkSession, (req, res, next) => {
  Promise.all([
    services.printService.getUserPrinter(res.user.username),
    services.printService.getPrinters(),
  ]).then(results => {
    res.render('pages/account/printer', {
      page: req.originalUrl,
      user: res.user,
      title: 'Change Printer',
      currentPrinter: results[0],
      printers: results[1],
    })
  })
})
router.post('/set-printer', middleware().checkSession, (req, res, next) => {
  services.printService.setUserPrinter(res.user.username, req.body.printer);
  res.printer = req.body.printer;
  res.send({ success: true, message: strings.string_response_updated, printer: req.body.printer })
});

module.exports = router;