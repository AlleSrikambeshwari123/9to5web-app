var maximum_capacity = 0, current_capacity = 0;

var packageTable = $('#packageTable').DataTable({
  pageLength: 5,
})

var selected_manifestId;
$('.btn-send').click(function () {
  selected_manifestId = $(this).data('id');
})

$('.ship-manifest').click(function () {
  $('.close-del').trigger('click');
  $.ajax({
    url: 'ship',
    type: 'get',
    success: response => {
      swal({
        title: response.success == true ? 'Shipped' : 'Failed',
        text: response.message,
        type: response.success == true ? 'success' : 'error',
      }).then(res => {
        if (response.success == true) {
          document.location.href = "/warehouse/fll/manifest/list";
        }
      })
    }
  })
})