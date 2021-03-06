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

$('.pilot-table').DataTable({
  pageLength: 10
})