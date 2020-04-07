
$("#cancelForm").click(function () {
  window.history.back();
});
$("#add-service-type-form").submit(function (event) {
  event.preventDefault(event);
  let formUrl = $(this).attr('action');
  var data = extractFormData(this);

  // Converting the amount to integer before sending it to API
  // and setting 0 as default if value is empty
  data['amount'] = !data['amount'] ? 0 : parseInt(data['amount'], 10);

  $.ajax({
    url: formUrl,
    type: 'post',
    data: data,
    success: function (response) {
      if (response.success) {
        window.location.href = '/warehouse/service-type/list';
      } else {
        showNotify('Failed', response.message, 'fa fa-info', 'danger');
      }
    }
  })
});