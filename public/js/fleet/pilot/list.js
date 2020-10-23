$(function () {

  $('.rm-pilot').click(function () {
    let id = $(this).data('id');
    $('#rm-pilot').attr('data-id', id);
  })

  $('#rm-pilot').click(function () {
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
})

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
  $('.pilot-table').DataTable( {
    "processing": true,
    "serverSide": true,    
    "ajax": {
      url: "/fleet/pilot/all-list",
      type: "POST",
      data :{ daterange:$('#daterange').val(), clear:$('#clear').val()}
    },
  })     
    // Event listener to the two range filtering inputs to redraw on input
  $(document).on('click', '.applyBtn', function() {
      window.location = "/fleet/pilot/list?daterange="+$('.daterange').val();
  });
  $(document).on('click', '.cancelBtn', function() {
    window.location = "/fleet/pilot/list?clear=1";
  });  
})