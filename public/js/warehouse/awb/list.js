$('.btn-rm-awb').click(function () {
  let id = $(this).data('id');
  $('#confirm-delete-awb').find('#rm-awb').attr('data-id', id);
})

$('#confirm-delete-awb').find('#rm-awb').click(function () {
  $('#confirm-delete-awb').find('.close').trigger('click');
  let id = $(this).data('id');
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
          $('tr[data-record="' + id + '"]').fadeOut('slow', () => $('tr[data-record="' + id + '"]').remove())
        }
      })
    }
  });
})

$('.btn-print-awb').click(function () {
  let id = $(this).data('id');
  $.ajax({
    url: '/api/printer/pdf/generate/awb/' + id,
    type: 'get',
    success: function (response) {
      console.log(response);
      pdfPath = '/util/pdf' + response.filename;
      pdfjsLib.getDocument({ url: pdfPath }).promise.then(pdfData => {
        pdfData.getPage(1).then(page => {
          var canvas = $('#pdf-preview')[0];
          var canvasContext = canvas.getContext('2d');
          const viewport = page.getViewport({ scale: .5 });
          canvas.height = canvas.width / viewport.width * viewport.height;
          console.log(viewport);
          page.render({ canvasContext, viewport })
        })
      })
    }
  })
})

$('.print-awb').click(function () {
  $('.close-del').trigger('click');
  printJS(pdfPath);
})

$('#awb-table').DataTable({
  pageLength: 10,
})
$('#no-docs-table').DataTable({
  pageLength: 10,
})