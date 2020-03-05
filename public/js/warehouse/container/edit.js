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

$('#edit-container-form').submit(function(event) {
  event.preventDefault(event);
  let formUrl = $(this).attr('action');
  var data = extractFormData(this);
  $.ajax({
    url: formUrl,
    type: 'post',
    data: data,
    success: function(response) {
      if (response.success) {
        window.location.href = '/warehouse/container/list';
      } else {
        showNotify('Failed', response.message, 'fa fa-info', 'danger');
      }
    },
  });
});
