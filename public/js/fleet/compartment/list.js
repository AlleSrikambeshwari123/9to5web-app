$(function () {

  var add_form = $('#add-compartment');
  $("#show-add").click(function () {
    clearForm()
  })

  $(".rm-compartment").click(function () {
    var id = $(this).data('id');
    //confirm 
    swal({
      title: 'Are you sure?',
      showCancelButton: true,
      confirmButtonText: 'Remove',
    }).then(response => {
      if (response.value) {
        $.ajax({
          url: 'delete',
          type: 'delete',
          data: {
            id: id
          },
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
        })
      }
    })
  })

  $('.add-compartment').click(function () {
    var compartment = getCompartment();
    console.log(compartment);
    if (validateCompartment(compartment)) {
      $(".close-del").trigger('click');
      $.ajax({
        url: 'create',
        type: 'post',
        data: compartment,
        success: function (response) {
          swal({
            title: response.success == true ? 'Added' : 'Failed',
            text: response.message,
            type: response.success == true ? 'success' : 'error',
          }).then(res => {
            if (response.success == true) {
              document.location.reload(true);
            }
          })
        }
      })
    }
    else {
      swal({
        title: 'Oops',
        text: 'Please fill up all fields.',
        type: 'error',
      })
    }
  })

  $('.compartment-table').DataTable({
    pageLength: 10,
  })

  function clearForm() {
    $(add_form).find("#name").val('')
    $(add_form).find('#max_weight').val('');
    $(add_form).find("#max_vol").val('');
  }
  function getCompartment() {
    return {
      planeId: $(add_form).find("#planeId").val(),
      name: $(add_form).find("#name").val(),
      weight: $(add_form).find("#max_weight").val(),
      volume: $(add_form).find("#max_vol").val(),
    }
  }
  function validateCompartment(compartment) {
    var isValid = true;
    if (compartment.name == "") {
      isValid = false;
    }
    if (compartment.weight == "") {
      isValid = false;
    }
    return isValid;
  }
})