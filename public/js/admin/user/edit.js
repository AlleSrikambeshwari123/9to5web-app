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
    var roleId = $("#userRole").val().toString();
    if (roleId == '') {
      event.preventDefault(event);
      showNotify('Failed', 'Please select a user role.', 'fa fa-info', 'warning');
    } else {
      let data = {};
      $.each(formData, function (_, record) {
        data[record.name] = record.value
      })
      data.userRole = roleId;
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