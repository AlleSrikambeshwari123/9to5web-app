var express = require('express');
var router = express.Router();
var middleware = require('../../middleware');
var containerCtrl = require('../../Controller/ContainerController');

router.get('/container/list', middleware().checkSession, containerCtrl.get_container_list);
router.get('/container/create', middleware().checkSession, containerCtrl.create_container);
router.post('/container/create', middleware().checkSession, containerCtrl.add_new_container);
router.get(
  '/container/manage/:id/get',
  middleware().checkSession,
  containerCtrl.get_container_detail,
);
router.post(
  '/container/manage/:id/update',
  middleware().checkSession,
  containerCtrl.update_container,
);
router.delete(
  '/container/manage/:id/delete',
  middleware().checkSession,
  containerCtrl.delete_container,
);

module.exports = router;
