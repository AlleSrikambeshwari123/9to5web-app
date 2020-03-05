$('#cancelForm').click(function() {
  window.history.back();
});

$('#add-airport-form').submit(function(event) {
  event.preventDefault(event);
  let formUrl = $(this).attr('action');
  var data = extractFormData(this);

  $.ajax({
    url: formUrl,
    type: 'post',
    data: data,
    success: function(response) {
      swal({
        title: response.success == true ? 'Created' : 'Failed',
        text: response.message,
        type: response.success == true ? 'success' : 'error',
      }).then((res) => {
        if (response.success == true) {
          window.location.href = 'list';
        }
      });
    },
  });
});
