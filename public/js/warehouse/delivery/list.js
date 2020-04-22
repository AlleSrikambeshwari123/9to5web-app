$('#addDelivery').find('#locationId').select2({
  theme: 'bootstrap',
  width: '100%',
  placeholder: 'Select Delivery Location'
})

$('#addDelivery').find('#driverId').select2({
  theme: 'bootstrap',
  width: '100%',
  placeholder: 'Select a driver'
})

$('#addDelivery').find('#vehicleId').select2({
  theme: 'bootstrap',
  width: '100%',
  placeholder: 'Select a vehicle'
})

$('#addDelivery').find('#delivery_date').datetimepicker({
  format: 'MMM DD,YYYY HH:mm',
  useCurrent: false,
  showTodayButton: true,
  showClear: true,
  minDate: new Date(),
  toolbarPlacement: 'bottom',
  sideBySide: true,
  icons: {
    time: "fa fa-clock-o",
    date: "fa fa-calendar",
    up: "fa fa-arrow-up",
    down: "fa fa-arrow-down",
    previous: "fa fa-chevron-left",
    next: "fa fa-chevron-right",
    today: "fa fa-clock",
    clear: "fa fa-trash"
  }
});

$("#delivery_date").attr("autocomplete", "off");

$('.delivery-form').submit(function (event) {
  $('.close-modal').trigger('click');
  event.preventDefault();
  let formData = extractFormData(this);
  $.ajax({
    url: 'create',
    type: 'post',
    data: formData,
    success: response => {
      swal({
        title: response.success == true ? 'Created' : 'Failed',
        text: response.message,
        type: response.success == true ? 'success' : 'error',
      }).then(res => {
        if (response.success == true) {
          window.location.reload();
        }
      })
    }
  })
})

$('.delivery-table').DataTable({
  pageLength: 10
})