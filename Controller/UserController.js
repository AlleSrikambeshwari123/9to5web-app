var services = require('../RedisServices/RedisDataServices');

exports.create_user = (req, res, next) => {
  services.userService.getRoles().then(function (roles) {
    res.render('pages/admin/user/create', {
      page: req.originalUrl,
      title: 'Create New User',
      user: res.user,
      roles: roles,
    });
  })
}

exports.add_new_user = (req, res, next) => {
  services.userService.createUser(req.body).then(function (result) {
    res.send(result);
  })
}

exports.get_user_list = (req, res, next) => {
  services.userService.getAllUsers().then(userResult => {
    res.render('pages/admin/user/list', {
      title: 'System Users',
      page: req.originalUrl,
      user: res.user,
      users: userResult,
    });
  });
}

exports.get_user_detail = (req, res, next) => {
  let username = req.params.username;
  Promise.all([
    services.userService.getUser(username),
    services.userService.getRoles()
  ]).then(results => {
    const roleTypes = results[0].roles.map((role) => role.type);

    res.render('pages/admin/user/edit', {
      page: req.originalUrl,
      title: 'User Details',
      user: res.user,
      selectedRoles: roleTypes,
      userDetail: results[0],
      roles: results[1]
    });
  })
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
  let username = req.params.username;
  let enabled = req.body.enabled;

  services.userService.enableUser(username, enabled).then(result => {
    res.send(result);
  })
}