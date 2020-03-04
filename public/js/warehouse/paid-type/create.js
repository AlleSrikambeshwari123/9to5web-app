$("#cancelForm").click(function () {
  window.history.back();
});
$("#add-paid-type-form").submit(function (event) {
  event.preventDefault(event);
  let formUrl = $(this).attr('action');
  var data = extractFormData(this);

  $.ajax({
    url: formUrl,
    type: 'post',
    data: data,
    success: function (response) {
      if (response.success) {
        window.location.href = '/warehouse/paid-type/list';
      } else {
        showNotify('Failed', response.message, 'fa fa-info', 'danger');
      }
    }
  })
});