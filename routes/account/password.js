var express = require('express');
var router = express.Router();
var services = require('../../RedisServices/RedisDataServices');
var middleware = require('../../middleware');
/* GET users listing. */

router.get('/change-pass', middleware(services.userService).checkSession, function (req, res, next) {
	res.render('pages/account/change-pass', {
		page: '/account' + req.url,
		title: "Change Password",
		user: res.user,
	});
});

router.post('/change-pass', middleware(services.userService).checkSession, (req, res, next) => {
	services.userService.changePassword(res.user.username, req.body.password, req.body.oldpass).then(result => {
		res.send(result)
	})
})

module.exports = router;
