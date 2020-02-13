var maximum_capacity = 0, current_capacity = 0;

var packageTable = $('#packageTable').DataTable({
  pageLength: 5,
})

var selected_manifestId;
$('.btn-send').click(function () {
  selected_manifestId = $(this).data('id');
})

$('.ship-manifest').click(function () {
  console.log(selected_manifestId);
})