$(function () {
  $('#global-search-table-data').DataTable({
    "pageLength": 10,
  })
  $("#global-search-button").click(function () {
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
      data: { selectedOption, inputField },
      beforeSend: function() {
        $("#myLoader").show();
     },
      success: function (response) {
        showDataInModal(response, selectedOption);
      },
      error: function () {
        $("#myLoader").hide();
        showNotify('Failed', response.message, 'fa fa-info', 'danger');
      }
    })
  });

  function showDataInModal(response, inputField) {
    // Clearing the previous data
    $('#global-search-table-data').dataTable().fnClearTable();

    if (response && response.length) {
      response.forEach((data) => {
         id = data.trackingNo;
          var customerFullName = data.customerFullName?data.customerFullName:'';
          var trackingNo = data.trackingNo?data.trackingNo:'';
          var barcode = data.barcode?data.barcode:''; 
          var awbIdNumber =  data.awbIdNumber?data.awbIdNumber:'';
          if (inputField === 'Customer') {
          id = data.firstName;
          customerId = data._id
        }
        
        if(inputField =="Package" || inputField =="Customer" || inputField =="Original" || inputField =="Awb"){
          $('#global-search-table-data').dataTable().fnAddData([customerFullName , '<span class="font-weight-bold text-right text-primary ml-3">' + barcode + '</span>', trackingNo, awbIdNumber, `<a id="global-search-collection-details" href="javascript: void(0)" data-id=${data._id}>Show Details</a>`])
          $("#myLoader").hide();
        } else {
          $('#global-search-table-data').dataTable().fnAddData([id, `<a id="global-search-collection-details" href="javascript: void(0)" data-id=${data._id}>Show Details</a>`]);
        }
      })
    }

    $('#global-search-data-modal').modal('show');
  }

  $("#global-search-close-button").click(function () {
    reset();
  });

  function reset() {
    $('#group-search-select-input').val('default');
    $('#group-search-input-field').val('');
    $('#group-search-input-field').attr('placeholder', "Search...");
  }

  $('#global-search-table-data').on('click', '#global-search-collection-details', function () {
    const id = $(this).attr('data-id');
    const selectedOption = $('#group-search-select-input').val();

    // Resetting the selected values
    reset();
    document.location.href = `/warehouse/package/package-detail/${id}`;

    // if (selectedOption === 'Customer') {
    //   document.location.href = `/admin/customers/manage/${customerId}/get`;
    // }
    // else {
    //   document.location.href = `/warehouse/fll/awb/manage/${awbId}/get`;
    // }

    $('#global-search-data-modal').modal('hide');
  });

  // Changing the placeholder
  $("#group-search-select-input").change(function () {
    const selectedVal = $(this).val();
    const targetElement = $('#group-search-input-field');
    if (selectedVal === 'Package') {
      targetElement.attr("placeholder", "Search Packages by description...");
    } else if (selectedVal === 'Customer') {
      targetElement.attr("placeholder", "Search Packages by customer name...");
    } else if (selectedVal === 'Original') {
      targetElement.attr("placeholder", "Search Packages by Original Barcode.");
    } else if (selectedVal === 'Awb') {
      targetElement.attr("placeholder", "Search Packages by AWB number...");
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
$(function () {
  var dtTable = $('.dateRangeFilterTable').DataTable()
  var dtPicker = ` <div class="d-flex w-100 d-inline-block py-4 col-xs-10 col-sm-4 float-left ">
  <label class="w-10-rem align-text-bottom">Select Dates : </label>
  <input type="text" class="form-control form-control-sm daterange" name="daterange" value=""  placeholder="Select dates"/>
</div>`
  $('.daterangepickerbody').prepend(dtPicker)
  $.fn.dataTable.ext.search.push(
    function (settings, data, dataIndex) {
      var startDate = moment(jQuery(dtTable.table().node()).data('startDate')).format("YYYY/MM/DD");
      var endDate = moment(jQuery(dtTable.table().node()).data('endDate')).add(1,'days').format("YYYY/MM/DD");
      if (jQuery(dtTable.table().node()).data('startDate') == null || jQuery(dtTable.table().node()).data('endDate') == null) {
        return true;
      }
      var dateTime = new Date(data[1]).getTime();
      if (new Date(startDate).getTime() <= dateTime && new Date(endDate).getTime() >= dateTime) {
        return true
      } else {
        return false
      }
    }
  );
  // $('.table-date-created').map(function (i, dateElement) {
  //   dateElement.innerHTML = moment(dateElement.innerHTML).format("YYYY/MM/DD, h:mm:ss a");
  // });
  if ($('div').hasClass('daterangepickerbody')) {
    if (location.pathname !== localStorage.filterPath) {
      localStorage.clear()
    }
  }
  $(document).ready(function () {
    $('#daterange-postbox').daterangepicker({});
    $('#daterange-nineToPackages').daterangepicker({});
    $('#daterange-noDocs').daterangepicker({autoApply:true});
    $('#daterange-user').daterangepicker({});

    //report
    $('#daterange-awbStatus').daterangepicker({});
    $('#daterange-package-detail').daterangepicker({});    
    $('#daterange-dekivery-detail').daterangepicker({});    
    $('#daterange-package-status').daterangepicker({});

    $('input[name="daterange"]').daterangepicker({
      //autoUpdateInput: false,
      locale: { cancelLabel: 'Clear' },
      opens: 'center',
      startDate: localStorage.dateRangePickerStartDate ? moment(localStorage.dateRangePickerStartDate) : moment().startOf('hour').subtract(3, 'days'),
      endDate: localStorage.dateRangePickerEndDate ? moment(localStorage.dateRangePickerEndDate) : moment(),
    }, function (start, end, label) {
      $(dtTable.table().node()).data('startDate', start);
      $(dtTable.table().node()).data('endDate', end);
      dtTable.draw();
    });

    $('input[name="daterange"]').on('apply.daterangepicker', function (ev, picker) {
      $(this).val(picker.startDate.format('MM/DD/YYYY') + ' - ' + picker.endDate.format('MM/DD/YYYY'));
      localStorage.setItem('dateRangePickerStartDate', picker.startDate.format('MM/DD/YYYY'))
      localStorage.setItem('dateRangePickerEndDate', picker.endDate.format('MM/DD/YYYY'))
      localStorage.setItem('filterPath', location.pathname)
    });

    $('.daterange').on('cancel.daterangepicker', function (ev, picker) {
      //do something, like clearing an input
      $('.daterange').val('');
      localStorage.clear()
      $(dtTable.table().node()).data('startDate', null);
      $(dtTable.table().node()).data('endDate', null);
      localStorage.setItem('dateRangePickerStartDate', "")
      localStorage.setItem('dateRangePickerEndDate', "")
      localStorage.setItem('filterPath', location.pathname)
      dtTable.draw();
    });
    if($('input[name="daterange"]').val()){
      $(dtTable.table().node()).data('startDate', localStorage.dateRangePickerStartDate ? moment(localStorage.dateRangePickerStartDate) : moment().startOf('hour').subtract(21, 'days'));
      $(dtTable.table().node()).data('endDate', localStorage.dateRangePickerEndDate ? moment(localStorage.dateRangePickerEndDate) : moment());
    }
    if(localStorage.dateRangePickerStartDate == ""){
      $(dtTable.table().node()).data('startDate', null);
      $(dtTable.table().node()).data('endDate', null);
      $('.daterange').val('');
    }
    dtTable.draw();
  });
})