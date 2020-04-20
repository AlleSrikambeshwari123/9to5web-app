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
  },
});

var pdfPath;
$('.btn-print-pkg').click(function() {
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

  compartmentIdSelect.select2({
    theme: 'bootstrap',
    width: '100%',
    placeholder: 'Select compartment',
    dropdownParent: addToManifestModal,
  });

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
            text: manifest.title,
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
            text: delivery.delivery_date,
            
          })),
        })
    },
  });

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
});
