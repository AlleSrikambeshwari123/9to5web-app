$(function () {
  $("#global-search-button").click(function() {
    const selectedOption = $('#group-search-select-input').val();
    const inputField = $('#group-search-input-field').val();

    if (selectedOption === 'default') {
      showNotify('Failed', 'Please select any option!', 'fa fa-info', 'danger');
      return;
    } else if (!(inputField && inputField.trim())) {
      showNotify('Failed', 'Input field can\'t be empty!', 'fa fa-info', 'danger');
      return;
    }

    // Calling request
    $.ajax({
      url: '/global-search',
      type: 'post',
      data: {selectedOption, inputField},
      success: function (response) {
        showDataInModal(response, selectedOption);
      },
      error: function () {
        showNotify('Failed', response.message, 'fa fa-info', 'danger');
      }
    })
  });

  function showDataInModal(response, inputField) {
    $('#global-search-table-data').DataTable({
      "pageLength": 10,
    })

    // Clearing the previous data
    $('#global-search-table-data').dataTable().fnClearTable();

    if (response && response.length) {
      response.forEach((data) => {
        if(inputField === 'Package' || inputField === 'Original'){
          id = data.id;
        }else{
          id = data._id;
        }
        $('#global-search-table-data').dataTable().fnAddData([id, `<a id="global-search-collection-details" href="javascript: void(0)" data-id=${data._id}>Show Details</a>`]);
      })
    }
    
    $('#global-search-data-modal').modal('show'); 
  }

  $("#global-search-close-button").click(function() {
    reset();
  });

  function reset() {
    $('#group-search-select-input').val('default');
    $('#group-search-input-field').val('');
    $('#group-search-input-field').attr('placeholder', "Search...");
  }

  $('#global-search-table-data').on('click', '#global-search-collection-details', function() { 
    const id = $(this).attr('data-id');
    const selectedOption = $('#group-search-select-input').val(); 
    
    // Resetting the selected values
    reset();

    if (selectedOption === 'Package') {
      document.location.href = '/warehouse/package/list';
    } else if (selectedOption === 'Customer') {
      document.location.href = `/admin/customers/manage/${id}/get`;
    } else if (selectedOption === 'Original') {
      document.location.href = '/warehouse/package/list';
    } else {
      document.location.href = `/warehouse/fll/awb/manage/${id}/get`;
    }

    $('#global-search-data-modal').modal('hide');
  });

  // Changing the placeholder
  $("#group-search-select-input").change(function() {
    const selectedVal = $(this).val();
    const targetElement = $('#group-search-input-field');
    if (selectedVal === 'Package') {
      targetElement.attr("placeholder", "Search Packages by description...");
    } else if (selectedVal === 'Customer') {
      targetElement.attr("placeholder", "Search Customer by email...");
    } else if (selectedVal === 'Original') {
      targetElement.attr("placeholder", "Search Packages by Original Tracking No.");
    } else if (selectedVal === 'Awb') {
      targetElement.attr("placeholder", "Search AWB by AWB number...");
    } else {
      targetElement.attr("placeholder", "Search...");
    }
  });

  function showNotify(title, message, icon, type) {
    $.notify({
      title: title,
      message: message,
      icon: icon,
      target: '_blank'
    }, {
      type: type,
      placement: {
        from: "top",
        align: "right",
      },
      time: 1000,
      delay: 3000
    });
  }

});  
