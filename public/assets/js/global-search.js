$(function () {
  $('#global-search-table-data').DataTable({
    "pageLength": 10,
  })
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
    // Clearing the previous data
    $('#global-search-table-data').dataTable().fnClearTable();

    if (response && response.length) {
      response.forEach((data) => {
        if(inputField === 'Package' || inputField === 'Original'){
          id = data.trackingNo;
          awbId = data.awbId
        }else if (inputField === 'Customer'){
          id = data.firstName;
          customerId = data._id
        }
        else{
          id = data.awbId;
          awbId = data._id
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

    
    if (selectedOption === 'Customer') {
      document.location.href = `/admin/customers/manage/${customerId}/get`;
    } 
    else {
      document.location.href = `/warehouse/fll/awb/manage/${awbId}/get`;
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
$(function(){
  var dtTable = $('.dataTable').DataTable()
  var dtPicker = ` <div class="d-flex w-100 d-inline-block py-4 col-xs-10 col-sm-4 float-left ">
  <label class="w-10-rem align-text-bottom">Select Dates : </label>
  <input type="text" class="form-control form-control-sm daterange" name="daterange" value=""  placeholder="Select dates"/>
</div>`
  $('.daterangepickerbody').prepend(dtPicker)
  $.fn.dataTable.ext.search.push(
    function (settings, data, dataIndex) {
      var startDate = moment(jQuery(dtTable.table().node()).data('startDate')).format("YYYY/MM/DD");
      var endDate = moment(jQuery(dtTable.table().node()).data('endDate')).format("YYYY/MM/DD");
      if (jQuery(dtTable.table().node()).data('startDate') == null || jQuery(dtTable.table().node()).data('endDate') == null) {
        return true;
      }
      var dateTime = new Date(data[1]).getTime();
      if(new Date(startDate).getTime() <= dateTime && new Date(endDate).getTime() >= dateTime){
        return true
      }else{
        return false
      }
    }
  );
  // $('.table-date-created').map(function (i, dateElement) {
  //   dateElement.innerHTML = moment(dateElement.innerHTML).format("YYYY/MM/DD, h:mm:ss a");
  // });
  $(document).ready(function () {
    $('input[name="daterange"]').daterangepicker({
      //autoUpdateInput: false,
      locale: { cancelLabel: 'Clear' },
      opens: 'center',
      startDate: moment().startOf('hour').subtract(21, 'days'),
      endDate: moment(),
    }, function (start, end, label) {
      $(dtTable.table().node()).data('startDate', start);
      $(dtTable.table().node()).data('endDate', end);
      dtTable.draw();
    });

    $('input[name="daterange"]').on('apply.daterangepicker', function (ev, picker) {
      $(this).val(picker.startDate.format('MM/DD/YYYY') + ' - ' + picker.endDate.format('MM/DD/YYYY'));
    });

    $('.daterange').on('cancel.daterangepicker', function (ev, picker) {
      //do something, like clearing an input
      $('.daterange').val('');
      $(dtTable.table().node()).data('startDate', null);
      $(dtTable.table().node()).data('endDate', null);
      dtTable.draw();
    });
    $(dtTable.table().node()).data('startDate', moment().startOf('hour').subtract(21, 'days'));
    $(dtTable.table().node()).data('endDate', moment());
    dtTable.draw();
  });
})