let packageTable = $('.package-table').DataTable({
  pageLength: 10,
  columnDefs: [
    {
      orderable: false,
      targets: 0,
    },
  ],
  select: {
    style: 'multi',
    selector: 'td:first-child input[type="checkbox"]',
  }
});

$('#package-table').on('draw.dt', function() {
  unSelectAll();
});

function unSelectAll() {
  packageTable.rows().deselect();
  $("tr").removeClass("selected");
  $("input.package-select-all").removeClass("selected");
  $("input.package-select").prop("checked", false);
  $("input.package-select-all").prop("checked", false);
}



packageTable.on("click", "input.package-select-all", function() {
  if($("input.package-select-all").hasClass("selected")) {
    packageTable.rows().deselect();
    return unSelectAll()
  }
  var tableRows = packageTable.rows({ page: 'current' }).nodes();
  packageTable.rows({ page: 'current' }).select();
  $("input.package-select-all").addClass("selected");
  $("input.package-select-all").prop("checked", true);
  tableRows.each(function () {
    $(this).find("input.package-select").prop("checked", true); 
  });
})

$('#package-table tbody').on('change', 'input[type="checkbox"]', function(){
  if(!this.checked) {
    $(this).closest("tr").removeClass('selected');
    $(this).prop("checked", false);
  } 
  if(this.checked) $(this).closest("tr").addClass('selected')
  let selectingRowCount = packageTable.rows({selected: true}).count();
  if ((selectingRowCount) !== packageTable.rows({ page: 'current' }).count()) {
    $("input.package-select-all").removeClass("selected");
    $("input.package-select-all").prop("checked", false);
  } else if((selectingRowCount ) === packageTable.rows({ page: 'current' }).count()) {
    $("input.package-select-all").prop("checked", true);
    $("input.package-select-all").addClass("selected");
  }
});

$('#package-table tbody').on( 'click', 'tr', function () {
  $(this).toggleClass('selected');
} );



var pdfPath;
$("#package-table").on("click",'.btn-print-pkg',function() {
  let id = $(this).data('id');
  $.ajax({
    url: '/api/printer/pdf/generate/pkg/' + id,
    type: 'get',
    success: function(response) {
      if (response.success) {
        pdfPath = '/util/pdf' + response.filename;
        pdfjsLib.getDocument({ url: pdfPath }).promise.then((pdfData) => {
          pdfData.getPage(1).then((page) => {
            var canvas = $('#pdf-preview')[0];
            var canvasContext = canvas.getContext('2d');
            const viewport = page.getViewport({ scale: 1 });
            canvas.height = (canvas.width / viewport.width) * viewport.height;
            page.render({ canvasContext, viewport });
          });
        });
      } else {
        $('.close-del').trigger('click');
        swal({
          title: 'Failed',
          text: response.message,
          type: 'error',
        });
      }
    },
  });
});

$('.print-package').click(function() {
  $('.close-del').trigger('click');
  printJS(pdfPath);
});

$(function() {
  let addToManifestModal = $('#add-to-manifest-modal');
  let addToManifestForm = $('#add-to-manifest-form');
  let compartmentIdSelect = addToManifestForm.find('[name="compartmentId"]');

  let addToDeliveryModal = $('#add-to-delivery-modal');
  let addToDeliveryForm = $('#add-to-delivery-form');

  let addToCubeModal = $('#add-to-cube-modal');
  let addToNoDocModal = $('#add-to-nodoc-modal');
  let addtoNoDocForm = $('#add-to-nodoc-form')
  let addToCubeForm = $('#add-to-cube-form');
  let cubeSelectOption = addToCubeForm.find('[name="compartmentId"]');

  compartmentIdSelect.select2({
    theme: 'bootstrap',
    width: '100%',
    placeholder: 'Select compartment',
    dropdownParent: addToManifestModal,
  });
  // cubeSelectOption.select2({
  //   theme: 'bootstrap',
  //   width: '100%',
  //   placeholder: 'Select Cube',
  //   dropdownParent: addToCubeModal,
  // });

  $.ajax({
    url: '/api/warehouse/get-manifests',
    type: 'get',
    dataType: 'json',
    success(data) {
      addToManifestForm
        .find('[name="manifestId"]')
        .select2({
          theme: 'bootstrap',
          width: '100%',
          placeholder: 'Select manifest',
          dropdownParent: addToManifestModal,
          data: data.map((manifest) => ({
            id: manifest.id,
            text: manifest.planeId.tailNumber+' '+moment(manifest.shipDate).subtract(4, 'hours').format('dddd, MMMM Do YYYY, h:mm A'),
            source: manifest,
          })),
        })
        .on('select2:select', function(event) {
          compartmentIdSelect.val(null).trigger('change');
          compartmentIdSelect.find('option').remove();
          compartmentIdSelect.prop('disabled', true);

          let manifest = event.params.data && event.params.data.source;
          const manifestPlanId = (manifest && (manifest.planeId['_id'] || manifest.planeId)); 
          if (manifestPlanId) {
            loadCompartments(manifestPlanId);
          }
        });
    },
  });

  $.ajax({
    url: '/api/warehouse/get-deliverys',
    type: 'get',
    dataType: 'json',
    success(data) {      
      addToDeliveryForm
        .find('[name="deliveryId"]')
        .select2({
          theme: 'bootstrap',
          width: '100%',
          placeholder: 'Select delivery',
 
          data: data.map((delivery) => ({
            id: delivery._id,
            text: formatDate(delivery.delivery_date)
          })),
        })
    },
  });

  // Get Cubes in DropDown
  $.ajax({
    url: '/warehouse/cube/getall',
    type: 'get',
    dataType: 'json',
    success(data) {    
      addToCubeForm
        .find('[name="CubeId"]')
        .select2({
          theme: 'bootstrap',
          width: '100%',
          placeholder: 'Select Cube',
 
          data: data.map((cube) => ({
            id: cube._id,
            text: cube.name
          })),
        })
    },
  });

  /*  Get Location and ZOne IN Nodoc Dropdown */
  // Location
  $.ajax({
    url: '/warehouse/package/locations',
    type: 'get',
    dataType: 'json',
    success(data) {    
      addtoNoDocForm
        .find('[name="location"]')
        .select2({
          theme: 'bootstrap',
          width: '100%',
          placeholder: 'Select Location',
 
          data: data.map((locate) => ({
            id: locate.name,
            text: locate.name
          })),
        })
    },
  });
  // Zone
  $.ajax({
    url: '/warehouse/package/zones',
    type: 'get',
    dataType: 'json',
    success(data) {    
      addtoNoDocForm
        .find('[name="zoneId"]')
        .select2({
          theme: 'bootstrap',
          width: '100%',
          placeholder: 'Select Zone',
 
          data: data.map((zone) => ({
            id: zone._id,
            text: zone.name
          })),
        })
    },
  });
/* End Location And Zone */
  function loadCompartments(planeId) {
    compartmentIdSelect.prop('disabled', true);
    $.ajax({
      url: '/api/warehouse/get-compartments',
      data: { planeId: planeId },
      type: 'get',
      dataType: 'json',
      success(data) {
        compartmentIdSelect.select2({
          theme: 'bootstrap',
          width: '100%',
          placeholder: 'Select compartment',
          dropdownParent: addToManifestModal,
          data: data.map((compartment) => ({
            id: compartment._id,
            text: compartment.name
          })),
        });

        compartmentIdSelect.prop('disabled', false);
      },
    });
  }

  addToManifestForm.submit(function(event) {
    addToManifestModal.modal('hide');
    event.preventDefault();
    var packageIds = packageTable
      .rows({ selected: true })
      .nodes()
      .map((i) => $(i).data('record'))
      .toArray()
      .join(',');
    addToManifestForm.find('[name="packageIds"]').val(packageIds);
    var data = extractFormData(this);
   
    $.ajax({
      url: '/api/warehouse/add-packages-to-flight',
      type: 'post',
      data: data,
      success: function(response) {
        swal({
          title: response.success ? 'Success' : 'Error',
          type: response.success ? 'success' : 'error',
          text: response.message,
        });
        const statusText = response.status;
        const packageIds = (data['packageIds'] || '').split(',');

        packageIds.forEach((packageId) => {
          $(`tr[data-record="${packageId}"] > .lastStatusText_field`).text(statusText);
        })
      },
      error: function ()  {
        swal({
          title: 'Error',
          type: 'error',
          text: 'Unknown error',
        });
      }
    });
  });

  addToDeliveryForm.submit(function(event) {
    addToDeliveryModal.modal('hide');
    event.preventDefault();
    var packageIds = packageTable
      .rows({ selected: true })
      .nodes()
      .map((i) => $(i).data('record'))
      .toArray()
      .join(',');
    addToDeliveryForm.find('[name="packageIds"]').val(packageIds);
    var data = extractFormData(this);
    $.ajax({
      url: '/api/warehouse/add-packages-to-delivery',
      type: 'post',
      data: data,
      success: function(response) {
        swal({
          title: response.success ? 'Success' : 'Error',
          type: response.success ? 'success' : 'error',
          text: response.message,
        });
      },
      error: function ()  {
        swal({
          title: 'Error',
          type: 'error',
          text: 'Unknown error',
        });
      }
    });
  });

  // Add To Cube Form
  addToCubeForm.submit(function(event) {
    addToCubeModal.modal('hide');
    event.preventDefault();
    var packageIds = packageTable
      .rows({ selected: true })
      .nodes()
      .map((i) => $(i).data('record'))
      .toArray()
      .join(',');
      addToCubeForm.find('[name="packageIds"]').val(packageIds);
    var data = extractFormData(this);
    $.ajax({
      url: '/api/cube/web/assign-packages/'+data.CubeId,
      type: 'post',
      data: data,
      success: function(response) {
        swal({
          title: response.success ? 'Success' : 'Error',
          type: response.success ? 'success' : 'error',
          text: response.message,
        });
      },
      error: function ()  {
        swal({
          title: 'Error',
          type: 'error',
          text: 'Unknown error',
        });
      }
    });
  });

  // Add To NoDOc Form
  addtoNoDocForm.submit(function(event) {
    addToNoDocModal.modal('hide');
    event.preventDefault();
    var packageIds = packageTable
      .rows({ selected: true })
      .nodes()
      .map((i) => $(i).data('record'))
      .toArray()
      .join(',');
      addtoNoDocForm.find('[name="packageIds"]').val(packageIds);
    var data = extractFormData(this);
    if(data.packageIds == ''){
      swal({
            title:'Empty Packages',
            type: 'warning',
            text: 'Please Select Packages',
          });
    }
    $.ajax({
      url: '/api/warehouse/web/packages/add-packages-to-nodoc',
      type: 'post',
      data: data,
      success: function(response) {
        swal({
          title: response.success ? 'Success' : 'Error',
          type: response.success ? 'success' : 'error',
          text: response.message,
        });
        location.reload()
      },
      error: function ()  {
        swal({
          title: 'Error',
          type: 'error',
          text: 'Unknown error',
        });
      }
    });
  });
});
