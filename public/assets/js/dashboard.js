formatDate = (date) => {
    if (!date) return '';
    return moment(date).subtract(4,'hours').format("MMM DD,YYYY HH:mm");
  }

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