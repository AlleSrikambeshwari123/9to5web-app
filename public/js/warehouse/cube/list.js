$('#add-cube-form').submit(function (event) {
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
  
  $('.btn-edit-cube').click(function () {
    var id = $(this).data('id');
    $.ajax({
      url: 'manage/' + id + '/get',
      type: 'get',
      success: function (response) {
        $('#edit-cube-id').val(id);
        $('#edit-cube-name').val(response.name);
        $('#edit-cube-description').val(response.description);
      }
    })
  })
  
  $('#edit-cube-form').submit(function (event) {
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
  
  $("#cubeTable").on("click", ".rm-cube", function() {
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

  function cubePackaceDetail(cubeId){
    $.ajax({
      url: 'manage/' + cubeId + '/get',
      type: 'get',
      success: function (response) {
        console.log(response);
        if(response._id){
          console.log(1);
          var row = '';
          const packages = response.packages;
          for(let i=0;i<packages.length;i++){
            row = row+`<tr>
              <td>Pk${packages[i].id}</td>
              <td>${packages[i].trackingNo}</td>
              <td>${packages[i].description}</td>
            </tr>
            `;
           
          }
          $("#package-row").html(row)
        }else{
          console.log(2);
          var row = '<tr><td colspan="3">Package not found</td></tr>';
          $("#package-row").html(row)
        }
      }
    })
  }
  
  $('#cubeTable').DataTable({
    pageLength: 10,
  });

  var pdfPath;
$("#cubeTable").on("click",'.btn-print-pkg',function() {
  let id = $(this).data('id');
  $.ajax({
    url: '/api/printer/pdf/generate/cube/' + id,
    type: 'get',
    success: function(response) {
      if (response.success) {
        pdfPath = '/util/pdf' + response.filename;
        pdfjsLib.getDocument({ url: pdfPath }).promise.then((pdfData) => {
          pdfData.getPage(1).then((page) => {
            var canvas = $('#pdf-preview')[0];
            var canvasContext = canvas.getContext('2d');
            const viewport = page.getViewport({ scale: 1 });
            canvas.height = (canvas.width / viewport.width) * viewport.height;
            page.render({ canvasContext, viewport });
          });
        });
      } else {
        $('.close-del').trigger('click');
        swal({
          title: 'Failed',
          text: response.message,
          type: 'error',
        });
      }
    },
  });
});

$('.print-package').click(function() {
  $('.close-del').trigger('click');
  printJS(pdfPath);
});
