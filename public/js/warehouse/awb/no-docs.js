$("#no-docs-table").on("click", ".btn-rm-awb", function(){
    let id = $(this).data('id');
    $('#confirm-delete-awb').find('#rm-awb').attr('data-id', id);
  });
      
  $("#awb-table").on("click", ".btn-rm-awb", function(){
    let id = $(this).data('id');
    $('#confirm-delete-awb').find('#rm-awb').attr('data-id', id);
  });
          
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
        pdfPath = '/util/pdf' + response.filename;
        pdfjsLib.getDocument({ url: pdfPath }).promise.then(pdfData => {
          pdfData.getPage(1).then(page => {
            var canvas = $('#pdf-preview')[0];
            var canvasContext = canvas.getContext('2d');
            const viewport = page.getViewport({ scale: .5 });
            canvas.height = canvas.width / viewport.width * viewport.height;
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
  
  var awbTable = $('#awb-table').DataTable({
    pageLength: 10,
  })
  var nodocsTable = $('#no-docs-table').DataTable({
    pageLength: 10,
  })
  var pendingtable = $('#pending-awb-table').DataTable({
    pageLength: 10,
  })
  var pickuptable = $('#pickup-awb-table').DataTable({
    pageLength: 10,
  })
  
  $(document).on('click', '.applyBtn', function() {
    window.location = "/warehouse/fll/awb/list?daterange="+$('.daterange').val();
  })
  
  $(document).on('click', '.cancelBtn', function() {
    window.location = "/warehouse/fll/awb/list?clear=1";
  })
  $(document).ready(function() {
    setTimeout(()=>{
          if($('#clear').val() ){
            // $('#daterange').val('')
            $('#clear').val('1');
            var endate = new Date();      
            endate.setDate(endate.getDate());
            var stdate = new Date();
            stdate.setDate(stdate.getDate() -14);      
            var dateRange = (stdate.getMonth() + 1)+ '/'+stdate.getDate()+'/'+stdate.getFullYear()+' - '+
            (endate.getMonth() + 1)+ '/'+endate.getDate()+'/'+endate.getFullYear()      
            $('.daterange').val(dateRange)
          }	   
      },100)
  
  })