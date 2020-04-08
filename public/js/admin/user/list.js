$(function () {
  $(".enableUser").click(function () {
    var username = $(this).data('id');
    var enabled = $(this).data('value');
    
    $.ajax({
      url: 'manage/' + username + '/enable',
      type: 'put',
      data: { username: username, enabled: enabled === 'true' ? true : false },
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

  $('.user-table').DataTable({
    "pageLength": 10,
  });
}); 