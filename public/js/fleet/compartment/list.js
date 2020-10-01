$(function () {

  var add_form = $('#add-compartment');
  var edit_form = $('#edit-compartment');
  $("#show-add").click(function () {
    clearForm()
  })

  $(".compartment-table").on("click", ".rm-compartment", function() {  
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


  $('.compartment-table').on('click', '.btn-edit-compartment', function () {
    const id = $(this).data('id');
    $.ajax({
      url: '/fleet/compartment/' + id,
      type: 'get',
      success: function (response) {
        $("#edit_name").val(response.name)
        $("#edit_max_weight").val(response.weight)
        $("#edit_max_vol").val(response.volume)
        $("#edit_compartment_id").val(response._id)
      }
    });
  })

  $('.edit-compartment').click(function () {
    var compartment = editCompartment();
    console.log(compartment);
    if (validateCompartment(compartment)) {
      $(".close-del").trigger('click');
      $.ajax({
        url: 'update/'+compartment.id,
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
  function editCompartment() {
    return {
      planeId: $(edit_form).find("#edit_planeId").val(),
      name: $(edit_form).find("#edit_name").val(),
      weight: $(edit_form).find("#edit_max_weight").val(),
      volume: $(edit_form).find("#edit_max_vol").val(),
      id: $("#edit_compartment_id").val(),
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