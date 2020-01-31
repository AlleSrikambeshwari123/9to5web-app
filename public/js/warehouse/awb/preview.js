$('.btn-print-awb').click(function () {
  let awbId = $('#awbId').data('id');
  $.ajax({
    url: '/warehouse/print-awb/' + awbId,
    type: 'get',
    success: function (response) {
      if (response.success)
        showNotify('Success', response.message, 'fa fa-print', 'success');
      else
        showNotify('Failed', response.message, 'fa fa-print', 'danger');
    }
  })
})

$('.btn-print-labels').click(function () {
  let awbId = $('#awbId').data('id');
  $.ajax({
    url: '/warehouse/print-awb-lbl/' + awbId,
    type: 'get',
    success: function (response) {
      if (response.success)
        showNotify('Success', response.message, 'fa fa-print', 'success');
      else
        showNotify('Failed', response.message, 'fa fa-print', 'danger');
    }
  })
})