var add_manifest_form = $('.add-manifest-form');
var maximum_capacity = 0, current_capacity = 0;

var packageTable = $('#packageTable').DataTable({
  pageLength: 5,
  bSortable: false,
  bLengthChange: false,
  bFilter: false,
  columnDefs: [{
    orderable: false,
    targets: [0, 1, 2, 3, 4]
  }]
})

$('#planeId').select2({
  theme: 'bootstrap',
  placeholder: 'Select a plane',
  width: '100%',
});

$('#planeId').change(function () {
  let planeId = $(this).val();
  $.ajax({
    url: '/fleet/plane/get/' + planeId,
    type: 'get',
    success: function (plane) {
      maximum_capacity = plane.maximum_capacity;
      $(add_manifest_form).find('#tailNumber').val(plane.tail_number);
      $(add_manifest_form).find('#aircraft_type').val(plane.aircraft_type);
      setWeightInfo();
    }
  })
})

$('#shipDate').datetimepicker({
  format: 'MMM DD,YYYY HH:mm',
  useCurrent: false,
  showTodayButton: true,
  showClear: true,
  toolbarPlacement: 'bottom',
  sideBySide: true,
  icons: {
    time: "fa fa-clock-o",
    date: "fa fa-calendar",
    up: "fa fa-arrow-up",
    down: "fa fa-arrow-down",
    previous: "fa fa-chevron-left",
    next: "fa fa-chevron-right",
    today: "fa fa-clock",
    clear: "fa fa-trash"
  }
});

// Add AWB Popup
$('.btn-add-awb').magnificPopup({
  type: 'inline',
  midClick: true,
  mainClass: 'mfp-fade',
  gallery: {
    enabled: true,
  },
  callbacks: {
    open: function () {
      $('#awbId').val("");
      $('#awbId').select2({
        theme: 'bootstrap',
        placeholder: 'Select AirWay Bill',
      })
      $('#weight').val('');
    }
  }
});

var awbPopupPackages = [];
$('#awbId').change(function () {
  var awbId = $(this).val();
  $.ajax({
    url: '/warehouse/fll/package/get/' + awbId,
    type: 'get',
    success: function (packages) {
      awbPopupPackages = packages;
      var total_weight = 0;
      packages.forEach(package => {
        total_weight += Number(package.weight);
      })
      $('#add-awb-popup').find('#weight').val(total_weight);
    }
  })
})

$("#btn-cancel-add").click(function () {
  $('.mfp-close').trigger("click");
})

$('#add-awb-form').submit(function (event) {
  event.preventDefault();
  var awb = extractFormData(this);
  if (current_capacity + Number(awb.weight) > maximum_capacity) {
    showNotify('Failed', 'Plane Capacity Overflow', 'fa fa-info', 'danger');
  } else if (manifestAwbs.includes(awb.awbId)) {
    showNotify('Failed', 'This AWB is already added.', 'fa fa-info', 'danger');
  } else {
    manifestAwbs.push(awb.awbId);
    manifestPackages = manifestPackages.concat(awbPopupPackages);
    displayPackages();
  }
  $('.mfp-close').trigger("click");
})

$('.add-manifest-form').submit(function (event) {
  event.preventDefault();
  var manifestInfo = extractFormData(this);
  manifestInfo.awbs = manifestAwbs.toString();
  $.ajax({
    url: 'create',
    type: 'post',
    data: manifestInfo,
    success: function (response) {
      swal({
        title: response.success == true ? 'Created' : 'Failed',
        text: response.message,
        type: response.success == true ? 'success' : 'error',
      }).then(res => {
        if (response.success == true) {
          window.location.href = 'list';
        }
      })
    }
  })
})

var manifestAwbs = [];
var manifestPackages = [];
function displayPackages() {
  current_capacity = 0;
  manifestPackages.forEach(pkg => current_capacity += Number(pkg.weight));
  setWeightInfo();

  packageTable.clear().draw();
  manifestPackages.forEach(pkg => {
    let rowNode = packageTable.row.add([
      pkg.awbId,
      pkg.trackingNo,
      pkg.description,
      pkg.dimensions,
      Number(pkg.weight).toFixed(2) + ' lbs',
    ]).draw(false).node();
  })
}

function setWeightInfo() {
  $('.package-info').text(`Data Entry ( Weight: ${current_capacity} lbs / ${maximum_capacity} lbs )`);
}