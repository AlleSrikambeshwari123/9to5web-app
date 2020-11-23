$(function () {
  $("#userRole").select2({
    theme: 'bootstrap',
    placeholder: 'Select Permissions',
  })
  $("#cancelForm").click(function () {
    window.history.back();
  });
  $("#saveFrom").submit(function (event) {
    event.preventDefault(event);
    let formUrl = $(this).attr('action');
    let formData = $(this).serializeArray();
    let email = $(this).find('#email').val();
    let password = $(this).find('#password').val();
    let confirmPassword = $(this).find('#confirmPassword').val();
    var roles = $("#userRole").val().toString();
    if (roles == '') {
      event.preventDefault(event);
      showNotify('Failed', 'Please select a user role.', 'fa fa-info', 'warning');
    } else if (password != confirmPassword) {
      showNotify('Failed', "Password doesn't match", 'fa fa-info', 'danger');
    } else if (email && email.trim() && !validateEmail(email)) {
      showNotify('Failed', "Invalid Email", 'fa fa-info', 'danger');
    } else {
      let data = {};
      $.each(formData, function (_, record) {
        data[record.name] = record.value
      })

      data.roles = roles;
      if(password == ''){
        delete data.password
        delete data.confirm_password
      }
      $.ajax({
        url: formUrl,
        type: 'post',
        data: data,
        success: function (response) {
          if (response.success) {
            window.location.href = '/admin/users/list';
          } else {
            showNotify('Failed', response.message, 'fa fa-info', 'danger');
          }
        }
      })
    }
  });
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