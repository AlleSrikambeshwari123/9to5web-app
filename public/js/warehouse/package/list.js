$('.package-table').DataTable({
  pageLength: 10,
})

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
})

var pageUrl = pageUrl ? pageUrl : '';
var pageArr =  pageUrl.split('?');
var urlPage = (pageArr && pageArr.length) ? pageArr[0] : '';
var redirectUrl = "/warehouse/nas/package/list";
if(urlPage == "/warehouse/nas/package/list"){
  redirectUrl = "/warehouse/nas/package/list";
}

if(urlPage == "/warehouse/nas/package/aging"){
  redirectUrl = "/warehouse/nas/package/aging";
}
if(urlPage == "/warehouse/package/list/in-manifest"){
  redirectUrl = "/warehouse/package/list/in-manifest";
}

if(urlPage == "/warehouse/package/list/deliver"){
  redirectUrl = "/warehouse/package/list/deliver";
}
if(urlPage == "/warehouse/package/list/in-pmb9000"){
  redirectUrl = "/warehouse/package/list/in-pmb9000";
}
if(urlPage == "/warehouse/package/list/not-pmb9000"){
  redirectUrl = "/warehouse/package/list/not-pmb9000";
}
if(urlPage == "/warehouse/package/list/in-manifest-no-docs"){
  redirectUrl = "/warehouse/package/list/in-manifest-no-docs";
}
if(urlPage == "/warehouse/fll/package/list"){
  redirectUrl = "/warehouse/fll/package/list";
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