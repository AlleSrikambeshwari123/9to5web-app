var services = require('../RedisServices/RedisDataServices');

exports.get_user_list = (req, res, next) => {
  services.userService.getAllUsers().then(userResult => {
    res.render('pages/admin/user/list', {
      title: 'System Users',
      page: req.url,
      user: res.user,
      users: userResult,
    });
  });
}

exports.get_user_detail = (req, res, next) => {
  let username = req.params.username;
  services.userService.getUser(username).then(function (user) {
    services.userService.getRoles().then(function (roles) {
      res.render('pages/admin/user/edit', {
        page: req.url,
        title: 'User Details',
        user: res.user,
        userDetail: user,
        roles: roles,
      });
    });
  });
}

exports.update_user = (req, res, next) => {
  services.userService.updateUser(req.body).then(result => {
    res.send(result);
  })
}

exports.delete_user = (req, res, next) => {
  services.userService.removeUser(req.params.username).then(result => {
    res.send(result);
  })
}

exports.enable_user = (req, res, next) => {
  let username = req.body.username;
  let enabled = req.body.enabled;

  services.userService.enableUser(username, enabled).then(result => {
    res.send(result);
  })
}