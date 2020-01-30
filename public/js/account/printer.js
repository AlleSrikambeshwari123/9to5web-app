$('#printer').select2({
  theme: 'bootstrap',
  placeholder: 'Select a printer.',
})

$("#cancel").click(function () {
  window.history.back();
});

$('#change-printer').submit(function (event) {
  event.preventDefault();
  let data = extractFormData(this);
  $.ajax({
    url: 'set-printer',
    type: 'post',
    data: data,
    success: function (response) {
      console.log(response);
      swal({
        title: response.success == true ? 'Updated' : 'Failed',
        text: response.message,
        type: response.success == true ? 'success' : 'error',
      }).then(res => {
        if (response.success == true) {
          document.location.reload(true);
        }
      })
    }
  })
})