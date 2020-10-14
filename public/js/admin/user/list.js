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

$(document).ready(function() {
  $('.user-table').DataTable( {
    "processing": true,
    "serverSide": true,    
    "ajax": "/admin/users/all-users?daterange="+$('.daterange').val(),
  })
  var table = $('.user-table').DataTable();
     
    // Event listener to the two range filtering inputs to redraw on input
    $(".applyBtn").click(function(){
      alert(1);
        //table.search().draw();
    });
  
})

function enableUser(str){
  var username = $(str).data('id');
  var enabled = $(str).data('value');

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
}