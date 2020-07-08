$(function () {
  $('.invoice-table').DataTable({
    "pageLength": 10,
  });
})
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