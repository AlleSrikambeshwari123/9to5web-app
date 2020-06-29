$(".manifest-table").on("click", ".btn-rm-manifest", function() {  
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

$(function() {
  let manifestChangeStatusForm = $('#change-manifest-status-form');
  const manifestStages = [
    {
      id: 3,
      title: 'Shipping'
    },
    {
      id: 4,
      title: 'Received'
    }
  ]
   // Get Cubes in DropDown

    manifestChangeStatusForm
    .find('[name="mstatus"]')
    .select2({
      theme: 'bootstrap',
      width: '100%',
      placeholder: 'Select Manifest Status',
      data: manifestStages.map((stage) => ({
        id: stage.id,
        text: stage.title
      })),
    })
    let id;
    $('.btn-manifest-status').click(function(){
      id = $(this).data('id');
      $('#ManifestIdStatus').val(id)
    })
    const switchUrl = (data) => {
      switch (data.mstatus) {
        case "2":
          return {
            method:"POST",
            url:`/warehouse/manifest/manage/${data.mid}/close`
          }
        case "3":
          return {
            method:"GET",
            url:`/warehouse/fll/manifest/manage/${data.mid}/ship`
          }
        case "4":
          return {
            method:"GET",
            url:`/warehouse/fll/manifest/manage/${data.mid}/receive`
          }
        default:
          return ''
      }
    }
    manifestChangeStatusForm.submit(function(event) {
      event.preventDefault();
      var data = extractFormData(this);
      var stageAction = switchUrl(data);
      if(stageAction !== ''){
        $.ajax({
          url: stageAction.url,
          type: stageAction.method,
          data: data,
          success: function(response) {
            $('.close-del').trigger('click');
            swal({
              title: response.success ? 'Success' : 'Error',
              type: response.success ? 'success' : 'error',
              text: response.message,
            }).then(res=>{
              if(res) location.reload()
            });
          },
          error: function ()  {
            swal({
              title: 'Error',
              type: 'error',
              text: 'Unknown error',
            });
            $('.close-del').trigger('click');
          }
        });
      }
    });
})