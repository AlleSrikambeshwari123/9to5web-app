$(function () {
  $(".enableUser").on('click',function () {
    var username = $(this).data('id');
    var enabled = $(this).data('value');

    $.ajax({
      url: 'manage/' + username + '/enable',
      type: 'put',
      data: { username: username, enabled: !!enabled },
      success: function (response) {
        swal({
          title: response.success == true ? 'Updated' : 'Failed',
          text: response.message,
          type: response.success == true ? 'success' : 'error',
        }).then(res => {
          if (response.success == true) {
            document.location.reload(true);
          }
        })
      }
    });
  });
  $('.rm-user').click(function () {
    var username = $(this).data('id');
    swal({
      title: "Are you sure?",
      showCancelButton: true,
      confirmButtonText: 'Delete',
    }).then(response => {
      if (response.value) {
        $.ajax({
          url: 'manage/' + username + '/delete',
          type: 'delete',
          success: function (response) {
            swal({
              title: response.success == true ? 'Removed' : 'Failed',
              text: response.message,
              type: response.success == true ? 'success' : 'error',
            }).then(res => {
              if (response.success == true) {
                $('tr[data-record="' + username + '"]').fadeOut('slow', () => $('tr[data-record="' + username + '"]').remove())
              }
            })
          }
        });
      }
    })
  });
}); 

$(document).on('click', '.applyBtn', function() {
  window.location = "/admin/users/list?daterange="+$('.daterange').val();
})

$(document).on('click', '.cancelBtn', function() {
  window.location = "/admin/users/list?clear=1";
})
$(document).ready(function() {
  setTimeout(()=>{
		if($('#clear').val() ){
		  // $('#daterange').val('')
		  $('#clear').val('1');
		  var endate = new Date();      
		  endate.setDate(endate.getDate());
		  var stdate = new Date();
		  stdate.setDate(stdate.getDate() -14);      
		  var dateRange = (stdate.getMonth() + 1)+ '/'+stdate.getDate()+'/'+stdate.getFullYear()+' - '+
		  (endate.getMonth() + 1)+ '/'+endate.getDate()+'/'+endate.getFullYear()      
		  $('.daterange').val(dateRange)
		}	   
	},100)

})
