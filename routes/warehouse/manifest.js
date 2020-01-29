var express = require('express');
var router = express.Router();
var services = require('../../RedisServices/RedisDataServices');
var middleware = require('../../middleware');
var manifestCtrl = require('../../Controller/ManifestController');

router.get('/fll/manifest/list', middleware().checkSession, manifestCtrl.get_manifest_list);
router.get('/fll/manifest/create', middleware().checkSession, manifestCtrl.create_manifest)
// router.post('/fll/manifest/create', middleware().checkSession, manifestCtrl.add_new_manifest);
// router.get('/fll/manifest/manage/:id/get', middleware().checkSession, manifestCtrl.get_manifest_detail);
// router.get('/fll/manifest/manage/:id/preview', middleware().checkSession, manifestCtrl.preview_manifest);
// router.delete('/fll/manifest/manage/:id/delete', middleware().checkSession, manifestCtrl.delete_manifest);

module.exports = router;