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
function deleteInvoice(filename,id){
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
 
  