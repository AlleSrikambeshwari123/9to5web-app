var add_manifest_form = $('.add-manifest-form');

$('#planeId').select2({
  theme: 'bootstrap',
  placeholder: 'Select a plane',
  width: '100%',
});

$('#planeId').change(function () {
  let planeId = $(this).val();
  $.ajax({
    url: '/fleet/plane/get/' + planeId,
    type: 'get',
    success: function (plane) {
      maximum_capacity = plane.maximum_capacity;
      $(add_manifest_form).find('#tailNumber').val(plane.tail_number);
      $(add_manifest_form).find('#aircraft_type').val(plane.aircraft_type);
      // $('.package-info').text(`Data Entry ( Weight: ${current_capacity} lbs / ${maximum_capacity} lbs )`);
    }
  })
})

$('#shipDate').datetimepicker({
  format: 'MMM DD,YYYY HH:mm',
  useCurrent: false,
  showTodayButton: true,
  showClear: true,
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

$('.add-manifest-form').submit(function (event) {
  event.preventDefault();
  var manifestInfo = extractFormData(this);
  $.ajax({
    url: 'create',
    type: 'post',
    data: manifestInfo,
    success: function (response) {
      swal({
        title: response.success == true ? 'Created' : 'Failed',
        text: response.message,
        type: response.success == true ? 'success' : 'error',
      }).then(res => {
        if (response.success == true) {
          window.location.href = 'list';
        }
      })
    }
  })
})