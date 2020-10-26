
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
// var pendingtable = $('#pending-awb-table').DataTable({
//   pageLength: 10,
// })
// var pickuptable = $('#pickup-awb-table').DataTable({
//   pageLength: 10,
// })

$(document).ready(function() {
  let flagStatus = ''
  if($('#clear').val() ){
    // $('#daterange').val('')
    $('#clear').val('1')
  }
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

   
  },1000)
  $('.noDocsTable').DataTable( {
    "processing": true,
    "serverSide": true,    
    "ajax": {
      url: "/warehouse/fll/awb/no-docs-list",
      type: "POST",
      data :{ daterange:$('#daterange').val(), clear:$('#clear').val()},
      
    }
  })
  $('#awb-table').on( 'xhr.dt', function () {
    
        flagStatus = 1
  });
  $('.noDocsTable').on( 'xhr.dt', function () {
    flagStatus = 0
  });
  flagStatus = 1

  // $('.awbTable').DataTable( {
  //   "processing": true,
  //   "serverSide": true,    
  //   "ajax": {
  //     url: "/warehouse/fll/awb/allAbws",
  //     type: "POST",
  //     data :{ daterange:$('#daterange').val(), clear:$('#clear').val(),status : 1},
  //   }
  // })

  $('.awb-no-docs-table').DataTable( {
    "processing": true,
    "serverSide": true,    
    "ajax": {
      url: "/warehouse/fll/awb/allAbws",
      type: "POST",
      data :{ daterange:$('#daterange').val(), clear:$('#clear').val(),status : 2},
    }
  })
  $('.pending-awb-table').DataTable( {
    "processing": true,
    "serverSide": true,    
    "ajax": {
      url: "/warehouse/fll/awb/allAbws",
      type: "POST",
      data :{ daterange:$('#daterange').val(), clear:$('#clear').val(),status : 3},
    }
  })
  $('.pickup-awb-table').DataTable( {
    "processing": true,
    "serverSide": true,    
    "ajax": {
      url: "/warehouse/fll/awb/allAbws",
      type: "POST",
      data :{ daterange:$('#daterange').val(), clear:$('#clear').val(),status : 4},
    }
  })
  $(document).on('click', '.applyBtn', function() {
    if(flagStatus == 0)
      window.location = "/warehouse/fll/awb/no-docs?daterange="+$('.daterange').val();
    else if(flagStatus == 1)
      window.location = "/warehouse/fll/awb/list?daterange="+$('.daterange').val();

  });	    
  
  $(document).on('click', '.cancelBtn', function() {
    if(flagStatus == 0)
      window.location = "/warehouse/fll/awb/no-docs?clear=1";
    else if(flagStatus == 1)
      window.location = "/warehouse/fll/awb/list?clear=1";
  });
});
let pdfPath
function printAwb(str){
  let id = $(str).data('id');
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
}
$(document).on('click', '.applyBtn', function() {
  window.location = "fll/awb/list?daterange="+$('.daterange').val();
})
$(document).on('click', '.cancelBtn', function() {
  window.location = "fll/awb/list?clear=1";
})
function print(){
  $('.close-del').trigger('click');
  printJS(pdfPath);
}