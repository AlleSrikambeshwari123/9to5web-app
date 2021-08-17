$(function () {
  $('#customer-login-form').submit(function(event) {
    event.preventDefault();
    var password = document.getElementById('password');
    var email = document.getElementById('email');

    $.ajax({
      url: "/customer/login",
      type: 'post',
      data: {
        email: email.value,
        password: password.value,
      },
      success: function(res) {
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
    console.log("customer forgot")
    let postbox = document.querySelector('.postbox').value;
    console.log(postbox , "postbox")
    postbox == "postboxesetc" ?
    window.location.replace('/customer/postbox/forgot-password'):
    window.location.replace('/customer/forgot-password');

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

}) 