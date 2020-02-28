$('#add-hazmat-form').submit(function (event) {
  $(".close-del").trigger('click');
  event.preventDefault();
  var data = extractFormData(this);
  $.ajax({
    url: 'create',
    type: 'post',
    data: data,
    success: function (response) {
      swal({
        title: response.success == true ? 'Added' : 'Failed',
        text: response.message,
        type: response.success == true ? 'success' : 'error',
      }).then(res => {
        if (response.success == true) {
          window.location.reload();
        }
      })
    }
  })
})

$('.btn-edit-hazmat').click(function () {
  var id = $(this).data('id');
  $.ajax({
    url: 'manage/' + id + '/get',
    type: 'get',
    success: function (response) {
      $('#edit-hazmat-id').val(id);
      $('#edit-hazmat-name').val(response.name);
      $('#edit-hazmat-description').val(response.description);
    }
  })
})

$('#edit-hazmat-form').submit(function (event) {
  $(".close-del").trigger('click');
  event.preventDefault();
  var data = extractFormData(this);
  $.ajax({
    url: 'manage/' + data.id + '/update',
    type: 'post',
    data: data,
    success: function (response) {
      swal({
        title: response.success == true ? 'Updated' : 'Failed',
        text: response.message,
        type: response.success == true ? 'success' : 'error',
      }).then(res => {
        if (response.success == true) {
          window.location.reload();
        }
      })
    }
  })
})

$('.rm-hazmat').click(function () {
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

$('#hazmatTable').DataTable({
  pageLength: 10,
});