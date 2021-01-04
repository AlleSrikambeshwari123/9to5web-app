
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



$(document).on('click', '.btn-view-more-awb', function () {
  var id = $(this).data('id');
  $.ajax({
    url: '/warehouse/snapshot/awb/' + id,
    type: 'get',
    success: function (response) {
      console.log("respon", response)
      response.forEach((data, i) => {
        let carrierName  = data.carrier ? data.carrier.name : '-',driverName =data.driver ? data.driver.name :'-';
        $('#details-awb').html('  <div class="row"><div class="form-group form-show-validation row" style="width:100%"><label class="col-lg-6 col-md-6 col-sm-4 ">Carrier</label><div class="col-lg-6 col-md-6 col-sm-6">'+ carrierName +'</div></div></div>         <div class="row"><div class="form-group form-show-validation row" style="width:100%"><label class="col-lg-6 col-md-6 col-sm-4 ">AWB Weight </label><div class="col-lg-6 col-md-6 col-sm-6">'+data.weight.toFixed(2) +' lbs</div></div></div> <div class="row"><div class="form-group form-show-validation row" style="width:100%"><label class="col-lg-6 col-md-6 col-sm-4 ">Volumetric Weight</label><div class="col-lg-6 col-md-6 col-sm-6">'+data.volumetricWeight.toFixed(2)+' vlbs</div></div></div> <div class="row"><div class="form-group form-show-validation row" style="width:100%"><label class="col-lg-6 col-md-6 col-sm-4 ">Driver</label><div class="col-lg-6 col-md-6 col-sm-6">'+driverName +'</div></div></div> ')
       
        if (response.length == 0) {
          $('#details-awb').html('No data available');
        }
      })
    },
        error: function () {
          showNotify('Failed', response.message, 'fa fa-info', 'danger');
        }
  })
})


$('.print-awb').click(function () {
  $('.close-del').trigger('click');
  printJS(pdfPath);
})

var awbTable = $('#awb-table').DataTable({
  pageLength: 10,
  dom: 'Bfrtip',
  buttons: [ 'pdf']
})
var nodocsTable = $('#no-docs-table').DataTable({
  pageLength: 10,
})
var pendingtable = $('#pending-awb-table').DataTable({
  pageLength: 10,
})
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
      window.location = "/warehouse/snapshot/awb/list?daterange="+$('.daterange').val()+"&type="+type;

  });	    
  
  $(document).on('click', '.cancelBtn', function() {
    if(flagStatus == 0)
      window.location = "/warehouse/fll/awb/no-docs?clear=1";
    else if(flagStatus == 1)
      window.location = "/warehouse/snapshot/awb/list?clear=1&type="+type;
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
  window.location = "snapshot/awb/list?daterange="+$('.daterange').val();
})
var pickuptable = $('#pickup-awb-table').DataTable({
  pageLength: 10,
})

var pageUrl = pageUrl ? pageUrl : '';
var pageArr =  pageUrl.split('?');
var urlPage = (pageArr && pageArr.length) ? pageArr[0] : '';
var redirectUrl = "/warehouse/snapshot/awb/list";
if(urlPage == "/warehouse/nas/awb/no-docs"){
  redirectUrl = "/warehouse/nas/awb/no-docs";
}
if(urlPage == "/warehouse/fll/awb/no-docs"){
  redirectUrl = "/warehouse/fll/awb/no-docs";
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
      localStorage.clear()
		  $('.daterange').val(dateRange)
		}	   
	},100)

})
function pagereload(str){
  localStorage.clear()
  window.location ="/warehouse/snapshot/awb/list?type="+str
}

function searchDataFilter(){
  var search_type = $("#search_type").val();
  var search_text = $("#search_text").val();  
  var pageUrl =$("#page").val();
  var pageArr =  pageUrl.split('?');
  var urlPage = (pageArr && pageArr.length) ? pageArr[0] : '';
  urlPage = urlPage+'?1=1'
  if(search_type && search_text){
    urlPage =  urlPage+"&search_type="+search_type+'&search_text='+search_text;
  }
  if($("#type").val()){
    urlPage = urlPage+'&type='+$("#type").val();
  }
   window.location = urlPage;
}