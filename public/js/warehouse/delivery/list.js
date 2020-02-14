$('#addDelivery').find('#locationId').select2({
  theme: 'bootstrap',
  width: '100%',
  placeholder: 'Select Delivery Location'
})

$('.delivery-table').DataTable({
  pageLength: 10
})