
function downloadInvoice(fileName){
  $.ajax({
      url: '/admin/invoices/invoice-url',
      type: 'post',
      data: {fileName: fileName},
      success: function (response) {
        window.open(response, '_blank');
      },
      error: function () {
        showNotify('Failed', response.message, 'fa fa-info', 'danger');
      }
    })  
 }
function deleteInvoice(filename,id){
  if(!filename)
    filename = 'null'
  swal({
    title: "Are you sure?",
    text: "You will not be able to recover this Invoice !",
    type: "warning",
    showCancelButton: true,
    confirmButtonColor: 'red',
    confirmButtonText: 'Yes, I am sure!',
    cancelButtonText: "No, cancel it!"
  }).then(response => {
    if (response.value) {
      $.ajax({
        url: `/admin/invoices/invoice-url/${id}/${filename}`,
        type: 'delete',
        success: function (response) {
          swal({
            title: response.success == true ? 'Removed' : 'Failed',
            text: response.message,
            type: response.success == true ? 'success' : 'error',
          }).then(()=>{
            window.location.reload()
          })
        },
        error: function () {
          showNotify('Failed', response.message, 'fa fa-info', 'danger');
        }
      })  
   }
  })
}

// $(".btn-view-invoice-package").click(function () { 
  $(document).on('click', '.btn-view-invoice-package', function() {
  var id = $(this).data('id');
  $.ajax({
    url: '/admin/invoices/packageStatus/'+id,
    type: 'get',
    success: function (response) {
      response.forEach((data,i) =>{
        $('#invoice-package-tbody').append('<tr><td >'+(i+1)+'</td><td >'+data.packageId.trackingNo+'</td><td> '+data.status+'</td></tr>');
      })
      if(response.length == 0){
        $('#invoice-package-tbody').append('No data available');
      }
    },
    error: function () {
      showNotify('Failed', response.message, 'fa fa-info', 'danger');
    }
  }) 
})

$('#invoice-packages').on('hidden.bs.modal', function () {
  $("#invoice-package-tbody").empty();
});

let invoixeTable = $('.invoice-table').DataTable({
  pageLength: 10,
  columndefs : [{ createdCell: function (td, cellData, rowData, row, col) {
    $(td).css('word-break', 'break-word');
    $(td).css('min-width', '150px');
  }}]
});

let ajks = $('.no-awb-invoice-table').DataTable({
  pageLength: 10,
  columndefs : [{ createdCell: function (td, cellData, rowData, row, col) {
    $(td).css('word-break', 'break-word');
    $(td).css('min-width', '150px');
  }}]
});

$(document).on('click', '.applyBtn', function() {
  window.location = "/admin/invoices/list?daterange="+$('.daterange').val();
})

 $(document).on('click', '.cancelBtn', function() {
  window.location = "/admin/invoices/list?clear=1";
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
