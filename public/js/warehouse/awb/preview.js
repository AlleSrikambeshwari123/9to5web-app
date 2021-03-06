var pdfPath;

$('.btn-print-awb').click(function () {
  let id = $(this).data('id');
  $.ajax({
    url: '/api/printer/pdf/generate/awb/' + id,
    type: 'get',
    success: function (response) {
      pdfPath = '/util/pdf' + response.filename;
      printJS(pdfPath)

      // pdfjsLib.getDocument({ url: pdfPath }).promise.then(pdfData => {
      //   pdfData.getPage(1).then(page => {
      //     var canvas = $('#pdf-preview')[0];
      //     var canvasContext = canvas.getContext('2d');
      //     const viewport = page.getViewport({ scale: .5 });
      //     canvas.height = canvas.width / viewport.width * viewport.height;
      //     page.render({ canvasContext, viewport })
      //   })
      // })
    }
  })
})

var pdfPath;
$('.btn-print-pkg').click(function () {
  let id = $(this).data('id');
  $('.modal-title').text('Print Package Label')
  $.ajax({
    url: '/api/printer/pdf/generate/pkg/' + id,
    type: 'get',
    success: function(response) {
      if (response.success) {
        pdfPath = '/util/pdf' + response.filename;
        printJS(pdfPath)
        // pdfjsLib.getDocument({ url: pdfPath }).promise.then((pdfData) => {
        //   pdfData.getPage(1).then((page) => {
        //     var canvas = $('#pdf-preview')[0];
        //     var canvasContext = canvas.getContext('2d');
        //     const viewport = page.getViewport({ scale: 1 });
        //     canvas.height = (canvas.width / viewport.width) * viewport.height;
        //     page.render({ canvasContext, viewport });
        //   });
        // });
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

$('.btn-print-pkgs').click(function () {
  let id = $(this).data('id');
  $('.btn-print-pkgs').text('Loading...')
  $.ajax({
    url: '/warehouse/print-pdf/pkg/' + id,
    type: 'get',
    success: function(response) {
      console.log('reser',response)
      if (response.success) {
        pdfPath = '/util/pdf' + response.filename;
        console.log("pdf",pdfPath)
        printJS(pdfPath)
        $('.btn-print-pkgs').text('Print Pkgs')
      } else {
        $('.btn-print-pkgs').text('Print Pkgs')
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

$('.print-awb').click(function () {
  $('.close-del').trigger('click');
  printJS(pdfPath);
})

$('.print-package').click(function() {
  $('.close-del').trigger('click');
  printJS(pdfPath);
});

$('.btn-print-po').click(function () {
  let id = $(this).data('id');
  $('.btn-print-po').text('Loading...')
  $.ajax({
    url: '/api/printer/pdf/generate/awb-purchase-order/' + id +'?type=file',
    type: 'get',
    success: function(response) {
      console.log('reser',response)
      if (response.success) {
        pdfPath = '/uploads/'+response.filepath;
        console.log("pdf",pdfPath)
        printJS(pdfPath)
        $('.btn-print-po').text('Print P.O')
      } else {
        $('.btn-print-po').text('Print P.O')
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