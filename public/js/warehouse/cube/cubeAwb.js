
$('#update-cube-awb-form').submit(function (event) {
    event.preventDefault();
    var data = extractFormData(this);
    data['dimensions'] = $('#W').val()+'x'+$('#H').val()+'x'+$('#L').val()
    data['id'] = $('#cubeAwbId').val()
    delete data.H
    delete data.L
    delete data.W
    $.ajax({
        url: '/warehouse/cube/awb/update',
        type: 'post',
        data: data,
        success: function (response) {
            swal({
                title: response.success == true ? 'Updated' : 'Failed',
                text: response.message,
                type: response.success == true ? 'success' : 'error',
            })
      },
      error:function(error){
        swal({
            title: 'Failed',
            text: error,
            type: 'error',
          })
      }
    })
  })