var pdfPath;
$(".no-docs-table").on("click",'.btn-print-pkg',function() {
  let id = $(this).data('id');
  $.ajax({
    url: '/api/printer/pdf/generate/pkg/' + id,
    type: 'get',
    success: function(response) {
      if (response.success) {
        pdfPath = '/util/pdf' + response.filename;
        pdfjsLib.getDocument({ url: pdfPath }).promise.then((pdfData) => {
          pdfData.getPage(1).then((page) => {
            var canvas = $('#pdf-preview')[0];
            var canvasContext = canvas.getContext('2d');
            const viewport = page.getViewport({ scale: 1 });
            canvas.height = (canvas.width / viewport.width) * viewport.height;
            page.render({ canvasContext, viewport });
          });
        });
      } else {
        $('.close-del').trigger('click');
        swal({
          title: 'Failed',
          text: response.message,
          type: 'error',
        });
      }
    },
  });
});

$('.print-package').click(function() {
    $('.close-del').trigger('click');
    printJS(pdfPath);
  });
  
  $('#awb-table').DataTable({
    pageLength: 10,
  })
  $('#no-docs-table').DataTable({
    pageLength: 10,
  })