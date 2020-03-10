var express = require('express');
var router = express.Router();
var middleware = require('../../middleware');
var packageCtrl = require('../../Controller/PackageController');

router.get('/package/list', middleware().checkSession, packageCtrl.get_package_list);
router.get('/package/list/:filter', middleware().checkSession, packageCtrl.get_filtered_package_list);
router.get('/fll/package/list', middleware().checkSession, packageCtrl.get_fll_package_list);
// router.get('/fll/package/create', middleware().checkSession, packageCtrl.create_package);
// router.post('/fll/package/create', middleware().checkSession, packageCtrl.add_new_package);
// router.get('/fll/package/manage/:id/get', middleware().checkSession, packageCtrl.get_package_detail);
// router.post('/fll/package/manage/:id/update', middleware().checkSession, packageCtrl.update_package);
// router.delete('/fll/package/manage/:id/delete', middleware().checkSession, packageCtrl.delete_package);
router.get('/fll/package/get/:awbId', middleware().checkSession, packageCtrl.get_awb_packages);

router.get('/nas/package/list', middleware().checkSession, packageCtrl.get_nas_package_list);

module.exports = router;