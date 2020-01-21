var services = require('../RedisServices/RedisDataServices');

exports.get_user_list = (req, res, next) => {
  services.userService.getAllUsers().then(userResult => {
    res.render('pages/admin/users', {
      title: 'System Users',
      page: req.url,
      luser: res.User.firstName + ' ' + res.User.lastName,
      RoleId: res.User.role,
      users: userResult,
    });
  });
}

exports.get_user_detail = (req, res, next) => {

}

exports.update_user = (req, res, next) => {

}

exports.delete_user = (req, res, next) => {

}