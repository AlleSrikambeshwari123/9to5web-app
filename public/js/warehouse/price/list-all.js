let packageTable = $('.pricelabel-table').DataTable({
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
$('#pricelabel-table').on('click', '.btn-print-pkg', function () {
  let id = $(this).data('id');
  $.ajax({
    url: '/api/printer/pdf/generate/pricelabel/' + id,
    type: 'get',
    success: function (response) {
      if (response.success) {
        pdfPath = '/util/pdf' + response.filename;
        pdfjsLib.getDocument({ url: pdfPath }).promise.then((pdfData) => {
          pdfData.getPage(1).then((page) => {
            var canvas = $('#pdf-preview')[0];
            var canvasContext = canvas.getContext('2d');
            const viewport = page.getViewport({ scale: 1 });
            canvas.height = 214;
            canvas.width = 280;
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

function pricelLabelCheck(response){
  const pkg = response.packageId;
  let ServiceVat = (response.ServiceVat || 0).toFixed(2);
  let TotalVat = (response.TotalWet || 0).toFixed(2);
  let NoDocsVal = 0;
  let InsuranceVal = 0;
  let SedVal = 0;
  let ExpressVal = 0;
  if (pkg.packageCalculation == 'Kg') pkg.weight = 2.20462 * pkg.weight;
  let totalinvoiceVal = 0;
  if (pkg.awbId.invoices) {
    pkg.awbId.invoices.map((inv) => (totalinvoiceVal += inv.value));
  }
  let Freight = (1.55 * pkg.weight).toFixed(2);
  $('#Brokerage').val(response.Brokerage);
  $('#CustomsProc').val(response.CustomsProc);
  $('#CustomsVAT').val(response.CustomsVAT);
  $('#Delivery').val(response.Delivery);
  $('#Duty').val(response.Duty);
  $('#EnvLevy').val(response.EnvLevy);
  $('#Freight').val(Freight);
  $('#Hazmat').val(response.Hazmat);
  $('#Pickup').val(response.Pickup);
  $('#ServiceVat').val(ServiceVat);
  $('#Storage').val(response.Storage);
  $('#NoDocsVal').text(response.NoDocs);
  $('#InsuranceVal').text(response.Insurance);
  $('#SedVal').text(response.Sed);
  $('#ExpressVal').text(response.Express);
  $('#TotalWet').val(TotalVat);
  pricelabelcommon(ServiceVat,NoDocsVal,InsuranceVal,SedVal,ExpressVal,totalinvoiceVal)
}

function packagePriceLabel(response){
  const pkg = response;
  let ServiceVat = 0;
  let TotalVat = 0;
  let NoDocsVal = 0;
  let InsuranceVal = 0;
  let SedVal = 0;
  let ExpressVal = 0;
  if (pkg.packageCalculation == 'Kg') pkg.weight = 2.20462 * pkg.weight;
  let totalinvoiceVal = 0;
  if (pkg.awbId.invoices) {
    pkg.awbId.invoices.map((inv) => (totalinvoiceVal += inv.value));
  }
  let Freight = (1.55 * pkg.weight).toFixed(2);
  $('#Freight').val(Freight);
  pricelabelcommon(ServiceVat,NoDocsVal,InsuranceVal,SedVal,ExpressVal,totalinvoiceVal)
}

function pricelabelcommon(ServiceVat,NoDocsVal,InsuranceVal,SedVal,ExpressVal,totalinvoiceVal){
  let Insurance = totalinvoiceVal * 0.01;
  $('#NoDocs').click(function () {
    if ($(this).prop('checked') == true) {
      $('#NoDocsVal').text('5');
      NoDocsVal = 5;
    } else if ($(this).prop('checked') == false) {
      $('#NoDocsVal').text('');
      NoDocsVal = 0;
    }
  });
  $('#Insurance').click(function () {
    if ($(this).prop('checked') == true) {
      $('#InsuranceVal').text(Insurance);
      InsuranceVal = Insurance;
    } else if ($(this).prop('checked') == false) {
      $('#InsuranceVal').text('');
      InsuranceVal = 0;
    }
  });
  $('#Sed').click(function () {
    if ($(this).prop('checked') == true) {
      $('#SedVal').text('25');
      SedVal = 25;
    } else if ($(this).prop('checked') == false) {
      $('#SedVal').text('');
      SedVal = 0;
    }
  });
  $('#Express').click(function () {
    if ($(this).prop('checked') == true) {
      $('#ExpressVal').text('35');
      ExpressVal = 35;
    } else if ($(this).prop('checked') == false) {
      $('#ExpressVal').text('');
      ExpressVal = 0;
    }
  });

  function tval() {
    return (
      Number($('#Brokerage').val()) +
      Number($('#CustomsProc').val()) +
      Number($('#CustomsVAT').val()) +
      Number($('#Delivery').val()) +
      Number($('#Duty').val()) +
      Number($('#EnvLevy').val()) +
      Number($('#Freight').val()) +
      Number($('#Hazmat').val()) +
      Number($('#Pickup').val()) +
      Number(NoDocsVal) +
      Number(InsuranceVal) +
      Number(SedVal) +
      Number(ExpressVal) +
      Number(ServiceVat) +
      Number($('#Storage').val())
    );
  }
  $('#add-to-pricelabel-form').change(function () {
    tval();
    $('#ServiceVat').val(((tval() * 7.5) / 100).toFixed(2));
    $('#TotalWet').val((tval() + Number($('#ServiceVat').val())).toFixed(2));
  });
}

$('#pricelabel-table').on('click', '.btn-edit-pricelabel', function () {
  let id = $(this).data('id');
  var data = extractFormData($('#add-to-pricelabel-form'));
  $('#Brokerage').val(''),
  $('#CustomsProc').val(''),
  $('#CustomsVAT').val(''),
  $('#Delivery').val(''),
  $('#Duty').val(''),
  $('#EnvLevy').val(''),
  $('#Freight').val(''),
  $('#Hazmat').val(''),
  $('#Pickup').val(''),
  $('#ServiceVat').val(''),
  $('#Storage').val(''),
  $('#NoDocsVal').text(''),
  $('#InsuranceVal').text(''),
  $('#SedVal').text(''),
  $('#ExpressVal').text(''),
  $('#TotalWet').val(''),
  $.ajax({
    url: '/warehouse/pricelabels/' + id,
    type: 'get',
    success: function (response) {
      if(response.packageId){
        pricelLabelCheck(response)
      }else{
        $.ajax({
          url: '/warehouse/pricelabels-package/' + id,
          type: 'get',
          success:function(response){
            packagePriceLabel(response)
          }
        })
      }
    },
    error:function(){
  }
  });
  $(function () {
    var addtoPriceLabel = $('#add-to-pricelabel-form');
    addtoPriceLabel.submit(function (event) {
      event.preventDefault();
      data = {
        Brokerage: $('#Brokerage').val() == "" ? 0 : $('#Brokerage').val(),
        CustomsProc: $('#CustomsProc').val() == "" ? 0 : $('#CustomsProc').val(),
        CustomsVAT: $('#CustomsVAT').val() == "" ? 0 : $('#CustomsVAT').val(),
        Delivery: $('#Delivery').val() == "" ? 0 : $('#Delivery').val(),
        Duty: $('#Duty').val() == "" ? 0 : $('#Duty').val(),
        EnvLevy: $('#EnvLevy').val() == "" ? 0 : $('#EnvLevy').val(),
        Freight: $('#Freight').val() == "" ? 0 : $('#Freight').val(),
        Hazmat: $('#Hazmat').val() == "" ? 0 : $('#Hazmat').val(),
        Pickup: $('#Pickup').val() == "" ? 0 : $('#Pickup').val(),
        ServiceVat: $('#ServiceVat').val() == "" ? 0 : $('#ServiceVat').val(),
        Storage: $('#Storage').val() == "" ? 0 : $('#Storage').val(),
        NoDocs: $('#NoDocsVal').text() == "" ? 0 : $('#NoDocsVal').text(),
        Insurance: $('#InsuranceVal').text() == "" ? 0 : $('#InsuranceVal').text(),
        Sed: $('#SedVal').text() == "" ? 0 : $('#SedVal').text(),
        Express: $('#ExpressVal').text() == "" ? 0 : $('#ExpressVal').text(),
        TotalWet: $('#TotalWet').val() == "" ? 0 : $('#TotalWet').val(),
      };
      $.ajax({
        url: '/warehouse/pricelabels/' + id,
        type: 'post',
        data: data,
        success: function (response) {
          $('#pricelabel-popup').modal('hide');
          swal({
            title: response.success ? 'Success' : 'Error',
            type: response.success ? 'success' : 'error',
            text: response.message,
          });
        },
        error: function () {
          swal({
            title: 'Error',
            type: 'error',
            text: 'Unknown error',
          });
        },
      });
    });
  });
});

$('.print-package').click(function () {
  $('.close-del').trigger('click');
  printJS(pdfPath);
});

$(function () {
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
        .on('select2:select', function (event) {
          compartmentIdSelect.val(null).trigger('change');
          compartmentIdSelect.find('option').remove();
          compartmentIdSelect.prop('disabled', true);

          let manifest = event.params.data && event.params.data.source;
          const manifestPlanId = manifest && (manifest.planeId['_id'] || manifest.planeId);
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
      addToDeliveryForm.find('[name="deliveryId"]').select2({
        theme: 'bootstrap',
        width: '100%',
        placeholder: 'Select delivery',

        data: data.map((delivery) => ({
          id: delivery._id,
          text: formatDate(delivery.delivery_date),
        })),
      });
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
            text: compartment.name,
          })),
        });

        compartmentIdSelect.prop('disabled', false);
      },
    });
  }

  addToManifestForm.submit(function (event) {
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
      success: function (response) {
        swal({
          title: response.success ? 'Success' : 'Error',
          type: response.success ? 'success' : 'error',
          text: response.message,
        });
        const statusText = response.status;
        const packageIds = (data['packageIds'] || '').split(',');

        packageIds.forEach((packageId) => {
          $(`tr[data-record="${packageId}"] > .lastStatusText_field`).text(statusText);
        });
      },
      error: function () {
        swal({
          title: 'Error',
          type: 'error',
          text: 'Unknown error',
        });
      },
    });
  });

  addToDeliveryForm.submit(function (event) {
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
      success: function (response) {
        swal({
          title: response.success ? 'Success' : 'Error',
          type: response.success ? 'success' : 'error',
          text: response.message,
        });
      },
      error: function () {
        swal({
          title: 'Error',
          type: 'error',
          text: 'Unknown error',
        });
      },
    });
  });
});
