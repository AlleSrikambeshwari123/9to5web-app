$(function () {

  $('.btn-rm-awb').click(function () {
    let id = $(this).data('id');
    $('#confirm-delete-awb').find('#rm-awb').attr('data-id', id);
  })

  $('#confirm-delete-awb').find('#rm-awb').click(function () {
    $('#confirm-delete-awb').find('.close').trigger('click');
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

  $('#packageTable').DataTable({
    pageLength: 10,
  })
})