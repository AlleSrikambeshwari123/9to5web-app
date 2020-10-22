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

// $('.manifest-table').DataTable({
//   pageLength: 10,
// })

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

function setManifestId(str){
  var id = $(str).data('id');
  $('#ManifestIdStatus').val(id)
}
$(document).ready(function() { 
  let flagStatus = 1;
 
  if($('#clear').val() ){
    $('#daterange').val('')
    $('#clear').val('1')
  }
  setTimeout(()=>{
    if($('#clear').val() ){
      $('#daterange').val('')
      $('#clear').val('1')
    }else
      $('.daterange').val($('#daterange').val())
  },1000)

  $('.manifest-table').on( 'xhr.dt', function () {
    flagStatus = 1
  });
  $('.manifest-table-fll').on( 'xhr.dt', function () {
    flagStatus = 0
  });

  $('.manifest-table').DataTable( {
    "processing": true,
    "serverSide": true,    
    "ajax": {
      url: "/warehouse/nas/manifest/all-incoming",
      type: "POST",
      data :{ daterange:$('#daterange').val(), clear:$('#clear').val()}
    },
  })
  $('.manifest-table-fll').DataTable( {
    "processing": true,
    "serverSide": true,    
    "ajax": {
      url: "/warehouse/fll/manifest/all-list",
      type: "POST",
      data :{ daterange:$('#daterange').val(), clear:$('#clear').val()}
    },
  })
     
    // Event listener to the two range filtering inputs to redraw on input
    $(document).on('click', '.applyBtn', function() {
      if(flagStatus == 1)
        window.location = "/warehouse/nas/manifest/incoming?daterange="+$('.daterange').val();
      else
        window.location = "/warehouse/fll/manifest/list?daterange="+$('.daterange').val();     
    });
    $(document).on('click', '.cancelBtn', function() {
      if(flagStatus  == 1)
        window.location = "/warehouse/nas/manifest/incoming?clear=1";
      else
        window.location = "/warehouse/fll/manifest/list?clear=1";
    });  
})
