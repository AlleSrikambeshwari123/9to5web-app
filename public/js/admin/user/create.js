$(function () {
  $("#userRole").select2({
    theme: 'bootstrap',
    placeholder: 'Select Permissions',
  })
  $("#cancelForm").click(function () {
    window.history.back();
  });
  $("#createFrom").submit(function (event) {
    event.preventDefault(event);
    let formUrl = $(this).attr('action');
    let formData = $(this).serializeArray();
    let roleId = $("#userRole").val();
    let password = $(this).find('#password').val();
    let confirmPassword = $(this).find('#confirmPassword').val();
    if (password != confirmPassword) {
      showNotify('Failed', "Password doesn't match", 'fa fa-info', 'danger');
    } else if (roleId == '') {
      showNotify('Failed', 'Please select a user role.', 'fa fa-info', 'warning');
    } else {
      let data = {};
      $.each(formData, function (_, record) {
        data[record.name] = record.value
      })
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
})