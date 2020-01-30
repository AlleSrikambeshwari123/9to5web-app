
$('.btn-rm-manifest').click(function () {
  let id = $(this).data('id');
  $('#confirm-delete-manifest').find('#btn-rm').attr('data-id', id);
})

$('#confirm-delete-manifest').find('#btn-rm').click(function () {
  $('#confirm-delete-manifest').find('.close').trigger('click');
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

$('.manifest-table').DataTable({
  pageLength: 10,
})