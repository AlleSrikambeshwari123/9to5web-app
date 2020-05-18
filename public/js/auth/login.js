$(function() {
  $('#login-form').submit(function(event) {
    event.preventDefault();
    var password = document.getElementById('password');
    var username = document.getElementById('username');
    $.ajax({
      url: '/login',
      type: 'post',
      data: {
        username: username.value,
        password: password.value,
      },
      success: function(res) {
        console.log(res);
       if (res.success) {
          window.location.href = res.url;
        } else if (!res.authenticated) {
          // displaying error message when credentials is wrong.
          showNotify('Failed', "Invalid username or password!", 'fa fa-info', 'danger');
        } else if (!res.isUserEnabled) {
          // displaying error message when account is disabled.
          showNotify('Failed', "Your account is temporary disabled!", 'fa fa-info', 'danger');
        }
      },
    });
  });
  $('.forgot-password').click(function() {
    window.location.replace('./forgot-password');
  });

  function showNotify(title, message, icon, type) {
    $.notify({
      title: title,
      message: message,
      icon: icon,
      target: '_blank'
    }, {
      type: type,
      placement: {
        from: "top",
        align: "right",
      },
      time: 1000,
      delay: 3000
    });
  }
});
