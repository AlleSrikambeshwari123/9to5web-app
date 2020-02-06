var pdfPath;

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
          const viewport = page.getViewport({ scale: 1 });
          // console.log(canvas.width);
          canvas.width = 448;
          canvas.height = canvas.width / viewport.width * viewport.height;
          viewport.scale = canvas.width / viewport.width;
          viewport.width = canvas.width;
          viewport.height = canvas.height;
          console.log(viewport);
          page.render({ canvasContext, viewport })
        })
      })
    }
  })
  // let awbId = $('#awbId').data('id');
  // $.ajax({
  //   url: '/warehouse/print-awb/' + awbId,
  //   type: 'get',
  //   success: function (response) {
  //     if (response.success)
  //       showNotify('Success', response.message, 'fa fa-print', 'success');
  //     else
  //       showNotify('Failed', response.message, 'fa fa-print', 'danger');
  //   }
  // })
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

$('.print-awb').click(function () {
  $('.close-del').trigger('click');
  printJS(pdfPath);
})