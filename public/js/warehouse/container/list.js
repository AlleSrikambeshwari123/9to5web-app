$("#containerTable").on("click", ".rm-container", function() {
  var id = $(this).data('id');
  swal({
    title: 'Are you sure?',
    showCancelButton: true,
    confirmButtonText: 'Delete',
  }).then((response) => {
    if (response.value) {
      $.ajax({
        url: 'manage/' + id + '/delete',
        type: 'delete',
        success: function(response) {
          swal({
            title: response.success == true ? 'Removed' : 'Failed',
            text: response.message,
            type: response.success == true ? 'success' : 'error',
          }).then((res) => {
            if (response.success == true) {
              $('tr[data-record="' + id + '"]').fadeOut('slow', () =>
                $('tr[data-record="' + id + '"]').remove(),
              );
            }
          });
        },
      });
    }
  });
});

// $('#containerTable').DataTable({
//   pageLength: 10,
// });
$(document).ready(function() { 
  $('#containerTable').DataTable( {
    "processing": true,
    "serverSide": true,    
    "ajax": {
      url: "/warehouse/container/all-list",
      type: "POST",
      data :{ daterange:$('#daterange').val(),
      clear:$('#clear').val()}
    },
  })
     
    // Event listener to the two range filtering inputs to redraw on input
    $(document).on('click', '.applyBtn', function() {
        window.location = "/warehouse/container/list?daterange="+$('.daterange').val();
    });
    $(document).on('click', '.cancelBtn', function() {
      window.location = "/warehouse/container/list?clear=1";
    });  
})
