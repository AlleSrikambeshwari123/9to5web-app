$("#add-driver-form").submit(function (event) {
  event.preventDefault(event);
  let formUrl = $(this).attr('action');
  let data = extractFormData(this);

  $.ajax({
    url: formUrl,
    type: 'post',
    data: data,
    success: function (response) {
      if (response.success) {
        window.location.href = '/fleet/driver/list';
      } else {
        showNotify('Failed', response.message, 'fa fa-info', 'danger');
      }
    }
  })
})