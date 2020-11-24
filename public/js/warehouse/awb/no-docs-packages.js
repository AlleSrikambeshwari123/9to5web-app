var pdfPath;
$(".no-docs-table").on("click",'.btn-print-pkg',function() {
  let id = $(this).data('id');
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

  var pageUrl = pageUrl ? pageUrl : '';
var pageArr =  pageUrl.split('?');
var urlPage = (pageArr && pageArr.length) ? pageArr[0] : '';
var redirectUrl = "";
if(urlPage == "/warehouse/fll/awb/no-docs-packages"){
  redirectUrl = "/warehouse/fll/awb/no-docs-packages";
}
$(document).on('click', '.applyBtn', function() {
  window.location = redirectUrl+"?daterange="+$('.daterange').val();
})

$(document).on('click', '.cancelBtn', function() {
  window.location = redirectUrl+"?clear=1";
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