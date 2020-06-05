$("#carrierTable").on("click", ".rm-carrier", function() {
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
              $(`tr[data-record="${id}"]`).fadeOut('slow', () => $(`tr[data-record="${id}"]`).remove())
            }
          })
        }
      });
    }
  })
});

$('#carrierTable').DataTable({
  pageLength: 10,
});