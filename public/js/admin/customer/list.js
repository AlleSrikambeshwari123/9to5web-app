$(function () {
  $('.rm-customer').click(function () {
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

  $(document).ready(function() {
    // if(localStorage.dateRangePickerStartDate){
    //   $('#daterange').val(localStorage.dateRangePickerStartDate + ' - ' +localStorage.dateRangePickerEndDate)
    // }
    // localStorage.dateRangePickerStartDate = $('#daterange').val().split('-')[0]
    // localStorage.dateRangePickerEndDate = $('#daterange').val().split('-')[1]
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
    $('.customer-table').DataTable( {
      "processing": true,
      "serverSide": true,    
      "ajax": {
        url: "/admin/customers/allCustomers",
        type: "POST",
        data :{ daterange:$('#daterange').val(), clear:$('#clear').val()}
      }
    })
    $(document).on('click', '.applyBtn', function() {
      window.location = "/admin/customers/list?daterange="+$('.daterange').val();
    });	    
    
    $(document).on('click', '.cancelBtn', function() {
      window.location = "/admin/customers/list?clear=1";
    });  
  });
    
}); 