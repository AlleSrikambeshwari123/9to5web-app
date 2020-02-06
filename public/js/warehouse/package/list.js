$('.package-table').DataTable({
  pageLength: 10,
})

var pdfPath;
$('.btn-print-pkg').click(function () {
  let id = $(this).data('id');
  $.ajax({
    url: 'manage/' + id + '/print',
    type: 'get',
    success: function (response) {
      pdfPath = '/util/pdf' + response.filename;
      pdfjsLib.getDocument({ url: pdfPath }).promise.then(pdfData => {
        pdfData.getPage(1).then(page => {
          var canvas = $('#pdf-preview')[0];
          var canvasContext = canvas.getContext('2d');
          const viewport = page.getViewport({ scale: 1 });
          canvas.height = canvas.width / viewport.width * viewport.height;
          page.render({ canvasContext, viewport })
        })
      })
    }
  })
})

$('.print-package').click(function () {
  $('.close-del').trigger('click');
  printJS(pdfPath);
})