var express = require('express');
var router = express.Router();
var services = require('../../RedisServices/RedisDataServices');

router.post('/add-printer', (req, res, next) => {
  services.printService.addPrinter(req.body.printer).then(result => {
    res.send(result);
  })
})

module.exports = router;