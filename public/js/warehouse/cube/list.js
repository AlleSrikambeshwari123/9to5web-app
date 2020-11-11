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

$('#add-cube2-form').submit(function (event) {
  event.preventDefault();
  var data = extractFormData(this);
  const action = $('.cube2actionbtn').text()
  if(action == 'Update'){
    data['id'] = $('.hiddenCubeId').val()
    $.ajax({
      url: 'cube2type/update',
      type: 'put',
      data: data,
      success: function (response) {
        $(".close-del").trigger('click');
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
  }else{
    $.ajax({
      url: 'cube2type/create',
      type: 'post',
      data: data,
      success: function (response) {
        $(".close-del").trigger('click');
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
    }
  })
  
  $(".close-del").click(function(){
    $('.Cube2').val('')
    $('.hiddenCubeId').val('')
    $('.cube2actionbtn').text('Add')
  });

  $('.btn-add-cube2').click(function () {
    $.ajax({
      url: '/warehouse/cube/cube2type/',
      type: 'get',
      success: function (response) {
        var data = response.map(res=> `<ul class="list-group">
            <li class="list-group-item d-flex flex-row align-items-left py-1">
                <span class="float-left"><strong>${res.type}</strong></span>
                <span class="ml-md-auto pull-right">
                <a class="btn btn-link text-warning edit-cube2type " data-id=${res._id}>Edit </a>
                <a class="btn btn-link text-danger delete-cube2type" data-id=${res._id}>Remove</a>
                </span>
               
            </li></ul>`)
        $('#cube2TypeBody').html(data)
      }
    })
  })

  $(document).on('click', '.edit-cube2type', function(){
    var id = $(this).data('id');
    var val = $(this).parent().parent().find('strong').text();
    $('.Cube2').val(val)
    $('.hiddenCubeId').val(id)
    $('.cube2actionbtn').text('Update')
  })

  $(document).on('click', '.delete-cube2type', function(){
    var id = $(this).data('id');
    swal({
      title: 'Confirm',
        text: 'Are You Sure You want to remove Cube2 Type',
        type: 'warning',
        buttons: [
          'No, cancel it!',
          'Yes, I am sure!'
        ],
        dangerMode: true,
      }).then(function(isConfirm) {
        if (isConfirm) {
            $.ajax({
            url: 'cube2type/'+id,
            type: 'delete',
            success: function (response) {
              if(response.success){
                swal({
                  title: 'Deleted!',
                  text: 'Type Successfully Deleted',
                  icon: 'success'
                })
                window.location.reload();
              }else{
                swal({
                  title: 'Failed!',
                  text: 'Something Went Wrong',
                  icon: 'error'
                })
              }
            }
          })
        } else {
          swal("Cancelled", "Cube2 Type Delete is Cancel", "error");
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

$(document).on('click', '.applyBtn', function() {
  window.location = "/warehouse/cube/list?daterange="+$('.daterange').val();
})
 $(document).on('click', '.cancelBtn', function() {
  window.location = "/warehouse/cube/list?clear=1";
})
$(document).ready(function() {
  setTimeout(()=>{
		if($('#clear').val() ){
		  $('#clear').val('1');
		  var endate = new Date();      
		  endate.setDate(endate.getDate());
		  var stdate = new Date();
		  stdate.setDate(stdate.getDate() -14);      
		  var dateRange = (stdate.getMonth() + 1)+ '/'+stdate.getDate()+'/'+stdate.getFullYear()+' - '+
		  (endate.getMonth() + 1)+ '/'+endate.getDate()+'/'+endate.getFullYear()      
		  $('.daterange').val(dateRange)
		}	   
  },100) 
})  
