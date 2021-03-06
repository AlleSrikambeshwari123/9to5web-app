

$(document).on('click', '.applyBtn', function() {
    window.location = "/customer/customerchild/no-docs/"+$('#customer').val()+"?daterange="+$('.daterange').val();
})
  
$(document).on('click', '.cancelBtn', function() {
window.location = "/customer/customerchild/no-docs/"+$('#customer').val()+"?clear=1";
})
$(document).ready(function() {
    setTimeout(()=>{
        console.log("no docs",$('#clear').val())
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
let noDocsTable = $('#no-docs-table').DataTable({
    pageLength: 10,
});

var pdfPath;
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

// $('#no-docs-table').DataTable({
//     pageLength: 10,
//     columns:[
//         //"dummy" configuration
//         { visible: true }, //col 1
//         { visible: true }, //col 2
//         { visible: true }, //col 3
//         { visible: true }, //col 4
//         { visible: true }, //col 5
//         { visible: true }, //col 6 
//         { visible: true }, //col 7
//         { visible: true }  //col 8 
//     ]
// });
