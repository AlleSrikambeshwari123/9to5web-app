$("#paid-typeTable").on("click", ".rm-paid-type", function() { 
  var id = $(this).data('id');
  swal({
    title: "Are you sure?",
    showCancelButton: true,
    confirmButtonText: 'Delete',
  }).then(response => {
    if (response.value) {
      $.ajax({
        url: 'manage/' + id + '/delete',
        type: 'delete',
        success: function (response) {
          swal({
            title: response.success == true ? 'Removed' : 'Failed',
            text: response.message,
            type: response.success == true ? 'success' : 'error',
          }).then(res => {
            if (response.success == true) {
              $('tr[data-record="' + id + '"]').fadeOut('slow', () => $('tr[data-record="' + id + '"]').remove())
            }
          })
        }
      });
    }
  })
});

// $('#paid-typeTable').DataTable({
//   pageLength: 10,
// });



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
  $('.daterange').val($('#daterange').val())
  $('#paid-typeTable').DataTable( {
    "processing": true,
    "serverSide": true,    
    "ajax": {
      url: "/warehouse/paid-type/listAll",
      type: "POST",
      data :{ daterange:$('#daterange').val(), clear:$('#clear').val()}
    }
  })
  // var table = $('.customer-table').DataTable();
  $(document).on('click', '.applyBtn', function() {
    window.location = "/warehouse/paid-type/list?daterange="+$('.daterange').val();
  });	    
  
  $(document).on('click', '.cancelBtn', function() {
    window.location = "/warehouse/paid-type/list?clear=1";
  });  
});
