$(function () {
  $('#add-plane-form').find('#warehouse').select2({
    theme: 'bootstrap',
    placeholder: 'Select a warehouse',
  })
  $('#add-plane-form').find('#time').select2({
    theme: 'bootstrap',
    placeholder: 'Select a time',
  })
  $('#add-plane-form').find('#pilotId').select2({
    theme: 'bootstrap',
    placeholder: 'Select a pilot',
  })

  $('#airlineId').select2({
    theme: 'bootstrap',
    placeholder: 'Select an airline',
  })

  $('#add-plane-form').find('#warehouse').change(function () {
    console.log($(this).val());
    var warehouse = $(this).val();
    $.ajax({
      url: '/fleet/pilot/get-list/' + warehouse,
      type: 'get',
      success: function (pilots) {
        var pilotSelect = $('#add-plane-form').find('#pilotId');
        $(pilotSelect).empty();
        $(pilotSelect).append('<option><option>');
        pilots.forEach(pilot => {
          $(pilotSelect).append(`<option value="${pilot._id}">${pilot.firstName} ${pilot.lastName}<option>`);
        })
        $(pilotSelect).select2({
          theme: 'bootstrap',
          placeholder: 'Select a pilot',
        })
      }
    })
  })

  $("#cancelForm").click(function () {
    window.history.back();
  });
  $("#add-plane-form").submit(function (event) {
    event.preventDefault(event);
    let formUrl = $(this).attr('action');
    let data = extractFormData(this);

    $.ajax({
      url: formUrl,
      type: 'post',
      data: data,
      success: function (response) {
        if (response.success) {
          window.location.href = '/fleet/plane/list';
        } else {
          showNotify('Failed', response.message, 'fa fa-info', 'danger');
        }
      }
    })
  })
})