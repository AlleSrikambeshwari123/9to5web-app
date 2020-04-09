$('#cancelForm').click(function() {
  window.history.back();
});

$('#container-date').datetimepicker({
  format: 'MMM DD,YYYY HH:mm',
  useCurrent: false,
  showTodayButton: true,
  showClear: true,
  toolbarPlacement: 'bottom',
  sideBySide: true,
  icons: {
    time: 'fa fa-clock-o',
    date: 'fa fa-calendar',
    up: 'fa fa-arrow-up',
    down: 'fa fa-arrow-down',
    previous: 'fa fa-chevron-left',
    next: 'fa fa-chevron-right',
    today: 'fa fa-clock',
    clear: 'fa fa-trash',
  },
});

$('#add-container-form').submit(function(event) {
  event.preventDefault(event);
  let formUrl = $(this).attr('action');

  let formData = $(this).serializeArray();
  let data = {};
  
  $.each(formData, function (_, record) {
    if (record.value !== "") {
      // Converting the date into ISO format
      if (record.name === 'date') {
        record.value = moment(record.value, 'MMM DD,YYYY HH:mm').toISOString();
      }
      data[record.name] = record.value;
    } 
  })

  $.ajax({
    url: formUrl,
    type: 'post',
    data: data,
    success: function(response) {
      swal({
        title: response.success == true ? 'Created' : 'Failed',
        text: response.message,
        type: response.success == true ? 'success' : 'error',
      }).then(res => {
        if (response.success == true) {
          window.location.href = 'list';
        }
      })
    },
  });
});
