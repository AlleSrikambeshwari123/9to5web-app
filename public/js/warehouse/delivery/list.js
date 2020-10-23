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

// $('.delivery-table').DataTable({
//   pageLength: 10
// })

//$('.close-deliveryy').click(function() {
$(document).on('click', '.close-deliveryy', function() {
  var id = $(this).data('id');

  swal({
    title: "Are you sure you want to close this delivery?",
    showCancelButton: true,
    confirmButtonText: 'Close Delivery',
  }).then(response => {
    if (response.value) {
      $.ajax({
        url: 'manage/' + id + '/close',
        type: 'post',
        success: function (response) {
          swal({
            title: response.success == true ? 'Closed' : 'Failed',
            text: response.message,
            type: response.success == true ? 'success' : 'error',
          }).then(res => {
            if (response.success == true) {
              $(`tr[data-record="${id}"]`).fadeOut('slow', () => $(`tr[data-record="${id}"]`).remove())
            }
          })
        }
      });
    }
  })
});  

$(document).ready(function() { 
  if($('#clear').val() ){
    $('#daterange').val('')
    $('#clear').val('1')
  }
  setTimeout(()=>{
    if($('#clear').val() ){
      $('#daterange').val('')
      $('#clear').val('1')
    }else
      $('.daterange').val($('#daterange').val())
  },1000)
  $('.delivery-table').DataTable( {
    "processing": true,
    "serverSide": true,    
    "ajax": {
      url: "/warehouse/nas/delivery/all-list",
      type: "POST",
      data :{ daterange:$('#daterange').val(), clear:$('#clear').val()}
    },
  })
     
    // Event listener to the two range filtering inputs to redraw on input
    $(document).on('click', '.applyBtn', function() {
        window.location = "/warehouse/nas/delivery/list?daterange="+$('.daterange').val();
    });
    $(document).on('click', '.cancelBtn', function() {
      window.location = "/warehouse/nas/delivery/list?clear=1";
    });  
})