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
        if (res.success) {
          window.location.href = res.url;
        }
      },
    });
  });
  $('.forgot-password').click(function() {
    window.location.replace('./forgot-password');
  });
});
