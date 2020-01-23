var express = require('express');
var router = express.Router();
var services = require('../../RedisServices/RedisDataServices');
var middleware = require('../../middleware');
var awbCtrl = require('../../Controller/AwbController');

router.get('/fll/awb/create', middleware().checkSession, awbCtrl.create_awb)
router.post('/fll/awb/create', middleware().checkSession, awbCtrl.add_new_awb);
router.get('/fll/awb/:awb/get', middleware().checkSession, awbCtrl.get_awb_detail)

router.get('/fll/awb/no-docs', middleware().checkSession, awbCtrl.get_awb_no_docs);

router.post('find-package', middleware(services.userService).checkSession, (req, res, next) => {
  var search = req.body.search;
  var pageData = {};
  pageData.packages = [];
  pageData.title = "Recieve Package NAS";
  pageData.mid = req.params.mid;
  pageData.luser = res.User.firstName + ' ' + res.User.lastName;
  pageData.RoleId = res.User.role;
  services.packageService.find(search).then(packages => {
    res.render('pages/warehouse/package-results', pageData);
  })
})
router.get('/packages/:mid', middleware(services.userService).checkSession, (req, res, next) => {
  var pageData = {};
  pageData.title = "Add Packages";
  pageData.mid = req.params.mid;
  pageData.luser = res.User.FirstName + ' ' + res.User.LastName;
  pageData.RoleId = res.User.RoleId;
  rServices.manifestService.getManifest(Number(pageData.mid)).then((m) => {
    pageData.manifest = m;

    if (m.mtypeId == 2) {
      pageData.ColLabel = "Ocean"
      pageData.inital = "S"
      pageData.typeId = 2;
    }
    else if (m.mtypeId == 3) {
      pageData.ColLabel = "HAZMAT"
      pageData.inital = "H"
      pageData.typeId = 3;
    }
    res.render('pages/warehouse/add-package.ejs', pageData);
  })
});

module.exports = router;