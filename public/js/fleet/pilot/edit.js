$(function () {
  $('#add-pilot-form').find('#warehouse').select2({
    theme: 'bootstrap',
    placeholder: 'Select a warehouse',
  })
  $("#cancelForm").click(function () {
    window.history.back();
  });
  $("#add-pilot-form").submit(function (event) {
    event.preventDefault(event);
    let formUrl = $(this).attr('action');
    let formData = $(this).serializeArray();
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
          window.location.href = '/fleet/pilot/list';
        } else {
          showNotify('Failed', response.message, 'fa fa-info', 'danger');
        }
      }
    })
  })
})