var maximum_capacity = 0, current_capacity = 0;

var packageTable = $('#packageTable').DataTable({
  pageLength: 5,
})

$('#lbs-data-entry').html($("#lsweight").html())
$('#vlbs-data-entry').html($("#vlsweight").html())
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

$('.btn-receive').click(function () {
  selected_manifestId = $(this).data('id');
})

$('.receive-manifest').click(function () {
  $('.close-del').trigger('click');
  $.ajax({
    url: 'receive',
    type: 'get',
    success: response => {
      swal({
        title: response.success == true ? 'Received' : 'Failed',
        text: response.message,
        type: response.success == true ? 'success' : 'error',
      }).then(res => {
        if (response.success == true) {
          document.location.href = "/warehouse/nas/manifest/incoming";
        }
      })
    }
  })
})

$('.btn-rm-pkg').click(function () {
  var id = $(this).data('id');
  
  $('.close-del').trigger('click');
  $.ajax({
    url: 'delete-package/'+id,
    type: 'get',
    success: response => {
      swal({
        title: response.success == true ? 'Received' : 'Failed',
        text: response.message,
        type: response.success == true ? 'success' : 'error',
      }).then(res => {
        if (response.success == true) {
          document.location.href = "get";
        }
      })
    }
  })
})

$('.btn-rm-pkg-awb').click(function () {
  var id = $(this).data('id');
  var awbId = $("#cubeid").val();
  
  $('.close-del').trigger('click');
  $.ajax({
    url: awbId+'/delete-package/'+id,
    type: 'get',
    success: response => {
      swal({
        title: response.success == true ? 'Received' : 'Failed',
        text: response.message,
        type: response.success == true ? 'success' : 'error',
      }).then(res => {
        if (response.success == true) {
          location.reload();
        }
      })
    }
  })
})