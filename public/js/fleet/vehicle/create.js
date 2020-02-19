$('#location').select2({
  theme: 'bootstrap',
  width: '100%',
  placeholder: 'Select a Location'
})

$("#location").change(function () {
  var location = $(this).val();
  $.ajax({
    url: '/fleet/driver/list/' + location,
    type: 'get',
    success: function (drivers) {
      $('#driverId').empty();
      drivers.forEach(driver => {
        $('#driverId').append(`<option value="${driver.id}">${driver.firstName} ${driver.lastName}</option>`)
      })
    }
  })
})

$('#driverId').select2({
  theme: 'bootstrap',
  width: '100%',
  placeholder: 'Select a Driver',
})

$("#add-vehicle-form").submit(function (event) {
  event.preventDefault(event);
  let formUrl = $(this).attr('action');
  let data = extractFormData(this);

  $.ajax({
    url: formUrl,
    type: 'post',
    data: data,
    success: function (response) {
      if (response.success) {
        window.location.href = '/fleet/vehicle/list';
      } else {
        showNotify('Failed', response.message, 'fa fa-info', 'danger');
      }
    }
  })
})

$('#cancelForm').click(function () {
  window.history.back();
})