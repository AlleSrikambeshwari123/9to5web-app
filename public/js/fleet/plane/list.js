$(function () {

  $('.rm-plane').click(function () {
    let id = $(this).data('id');
    $('#rm-plane').attr('data-id', id);
  })

  $('#rm-plane').click(function () {
    $(".close-del").trigger('click');
    let id = $(this).data('id');
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
  })
});

$(document).ready(function() { 
  $('.plane-table').DataTable( {
    "processing": true,
    "serverSide": true,    
    "ajax": {
      url: "/fleet/plane/all-list",
      type: "POST",
      data :{ daterange:$('#daterange').val(), clear:$('#clear').val()}
    },
  })     
    // Event listener to the two range filtering inputs to redraw on input
  $(document).on('click', '.applyBtn', function() {
      window.location = "/fleet/plane/list?daterange="+$('.daterange').val();
  });
  $(document).on('click', '.cancelBtn', function() {
    window.location = "/fleet/plane/list?clear=1";
  });  
})