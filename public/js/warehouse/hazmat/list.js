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

$("#hazmatTable").on("click", ".rm-hazmat", function() {
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

// $('#hazmatTable').DataTable({
//   pageLength: 3,
// });


$(document).ready(function() {
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
  $('.daterange').val($('#daterange').val())
  $('#hazmatTable').DataTable( {
    "processing": true,
    "serverSide": true,    
    "ajax": {
      url: "/warehouse/hazmat/listAll",
      type: "POST",
      data :{ daterange:$('#daterange').val(), clear:$('#clear').val()}
    }
  })
  // var table = $('.customer-table').DataTable();
  $(document).on('click', '.applyBtn', function() {
    window.location = "/warehouse/hazmat/list?daterange="+$('.daterange').val();
  });	    
  
  $(document).on('click', '.cancelBtn', function() {
    window.location = "/warehouse/hazmat/list?clear=1";
  });  
});

function editHazmat(str){
  var id = $(str).data('id');
  $.ajax({
    url: 'manage/' + id + '/get',
    type: 'get',
    success: function (response) {
      $('#edit-hazmat-id').val(id);
      $('#edit-hazmat-name').val(response.name);
      $('#edit-hazmat-description').val(response.description);
    }
  })
}