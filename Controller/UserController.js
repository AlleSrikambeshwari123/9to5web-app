var services = require('../Services/RedisDataServices');
var helpers = require('../views/helpers')

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
 // services.userService.getAllUsers().then(userResult => {
    res.render('pages/admin/user/list', {
      title: 'System Users',
      page: req.originalUrl,
      user: res.user,
      users: [],
      daterange:req.query.daterange?req.query.daterange:'',
      clear:req.query.clear
    });
  //});
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
  services.userService.removeUser(req.params.username, req['username']).then(result => {
    res.send(result);
  })
}

exports.enable_user = (req, res, next) => {
  let username = req.params.username;
  let enabled = req.body.enabled;

  services.userService.enableUser(username, enabled, req['username']).then(result => {
    res.send(result);
  })
}

exports.allUsers = (req, res, next)=>{  
  if(req.body.clear){
    req.body.daterange = '';
  }
  services.userService.allUsers(req).then(userResult => {
     var dataTable = {
       draw: req.query.draw,
       recordsTotal: userResult.total,
       recordsFiltered: userResult.total,
       data:[]
     }
     var data = [];
     var users = userResult.users;
     for(var i=0; i< users.length; i++){
       var userDetail = [];
      var role_type = ''
      if (users[i].roles.length) {        
        users[i].roles.forEach(function(role, roleIndex){
          role_type = role_type + role.type;
          if ((roleIndex + 1) !== users[i].roles.length){
            role_type = role_type + '<spna>,<span>';
          }
        })
      }
      userDetail.push(role_type);
      userDetail.push(helpers.formatDate(users[i].createdAt));
      userDetail.push(users[i].username);
      userDetail.push(helpers.getFullName(users[i]));
      userDetail.push(users[i].email);
      userDetail.push(users[i].mobile);
      if (!users[i].enabled){
        userDetail.push(`<span class='badge badge-danger'>Inactive</span>`);
      }else{
        userDetail.push(`<span class='badge badge-info'>Active</span>`)
      }
      var actions = ` <a href='manage/${users[i].username}/get'><i class="fas fa-user-edit"></i></a>`;
      if (!users[i].enabled){ 
        actions =  actions + `<a href='javascript:void(0);' class='enableUser' data-id='${users[i].username}' data-value='true' onclick="enableUser(this)"> <span
        class='badge badge-info float-right'>Enable</span></a>`
      }else{
        actions =  actions + `<a href='javascript:void(0);' class='enableUser' data-id='${users[i].username}' data-value='false' onclick="enableUser(this)"> <span
        class='badge badge-danger float-right'>Disable</span> </a>`;
      }
      userDetail.push(actions);
      data.push(userDetail);
    }
    dataTable.data = data;
    res.json(dataTable);
  })

}