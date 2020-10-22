var pdfPath;
$("#package-table").on("click",'.btn-print-pkg',function() {
  let id = $(this).data('id');
  $.ajax({
    url: '/api/printer/pdf/generate/pkg/' + id,
    type: 'get',
    success: function (response) {
      if (response.success) {
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
      } else {
        $('.close-del').trigger('click');
        swal({
          title: 'Failed',
          text: response.message,
          type: 'error',
        })
      }
    }
  })
})

$('.print-package').click(function () {
  $('.close-del').trigger('click');
  printJS(pdfPath);
});

$(document).ready(function() {  
  if($('#clear').val() ){
    $('#daterange').val('')
    $('#clear').val('1')
  }
  setTimeout(()=>{
    if($('#clear').val() ){
      $('#daterange').val('')
      $('#clear').val('1')
    }else
      $('.daterange').val($('#daterange').val())
  },1000)
  $('.package-table').DataTable( {
    "processing": true,
    "serverSide": true,    
    "ajax": {
      url: "/warehouse/nas/package/all-aging",
      type: "POST",
      //data :{ daterange:$('#daterange').val(), clear:$('#clear').val()}
    },
  }) 

  $('.package-table-nas-package-hand').DataTable( {
    "processing": true,
    "serverSide": true,    
    "ajax": {
      url: "/warehouse/nas/package/all-list",
      type: "POST",
      data :{ daterange:$('#daterange').val(), clear:$('#clear').val(), filterURL: $('#filterURL').val()}
    },
  })

  $('.package-table-filter-package').DataTable( {
    "processing": true,
    "serverSide": true,    
    "ajax": {
      url: "/warehouse/package/all-list/"+$("#filter").val(),
      type: "POST",
      data :{ 
        daterange: $('#daterange').val(), 
        clear: $('#clear').val(), 
        filterURL: $('#filterURL').val()
      }
    },
  })
  
  $('.package-table-fll-package-hand').DataTable( {
    "processing": true,
    "serverSide": true,    
    "ajax": {
      url: "/warehouse/fll/package/all-list",
      type: "POST",
      data :{ 
        daterange: $('#daterange').val(), 
        clear: $('#clear').val(), 
        filterURL: $('#filterURL').val()
      }
    },
  })
  var applyurl = "/warehouse/nas/package/list";
  if( $("#filter").val() == "in-manifest"){
    applyurl ="/warehouse/package/list/in-manifest";
  }
  if( $("#filter").val() == "in-pmb9000"){
    applyurl ="/warehouse/package/list/in-pmb9000";
  }
  if( $("#filter").val() == "not-pmb9000"){
    applyurl ="/warehouse/package/list/not-pmb9000";
  }
 if( $("#filter").val() == "fllpackagelist" ){
   applyurl ="/warehouse/fll/package/list";
 }
     
    // Event listener to the two range filtering inputs to redraw on input
    $(document).on('click', '.applyBtn', function() {
        window.location = applyurl + "?daterange="+$('.daterange').val();
    });
    $(document).on('click', '.cancelBtn', function() {
      window.location = applyurl + "?clear=1";
    });  

})