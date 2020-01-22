$(function () {
  $('#location').select2({
    theme: 'bootstrap',
    placeholder: 'Select Location',
  })
  $("#cancelForm").click(function () {
    window.history.back();
  });
  $("#add-customer-form").submit(function (event) {
    event.preventDefault(event);
    let formUrl = $(this).attr('action');
    let formData = $(this).serializeArray();
    let password = $(this).find('#password').val();
    let confirmPassword = $(this).find('#confirmPassword').val();
    let data = {};
    $.each(formData, function (_, record) {
      data[record.name] = record.value
    })
    if (password != confirmPassword) {
      showNotify('Failed', "Password doesn't match", 'fa fa-info', 'danger');
    } else {
      $.ajax({
        url: formUrl,
        type: 'post',
        data: data,
        success: function (response) {
          if (response.success) {
            window.location.href = '/admin/customers/list';
          } else {
            showNotify('Failed', response.message, 'fa fa-info', 'danger');
          }
        }
      })
    }
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