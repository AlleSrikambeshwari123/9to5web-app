
let packageTable = $('.package-table').DataTable({
    pageLength: 10,
   // dom: 'Bfrtip',
    //buttons: [  'pdf'],
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
  
  $('#package-table').on('draw.dt', function () {
    unSelectAll();
  });
  
  $('#customerId').select2({
    theme: 'bootstrap',
    width: '30%',
    placeholder: "Select a customer"
  })
  
  $('#locationsId').select2({
    theme: 'bootstrap',
    width: '40%',
    placeholder: "Select a location"
  })
  
  $(document).on('click', '.btn-view-more-package', function () {
    var id = $(this).data('id');
    $.ajax({
      url: '/warehouse/snapshot/package/report' + id,
      type: 'get',
      success: function (response) {
        console.log("respon", response)
        response.forEach((data, i) => {
          let carrierName  = data.carrierId ? data.carrierId.name : '-',zoneName =data.zoneId ? data.zoneId.name : '-',driverName ='-' ,manifestTitle = data.manifestId  ?  data.manifestId.title : '-',cubeName = data.cubeId?data.cubeId.name : '-',locationName = '-',companyName = '-';
          let nodocs = (data.awbId && data.awbId.invoices)?data.awbId.invoices.length:0;
          if(data.awbId && data.awbId.driver){
            driverName =  (data.awbId.driver.firstName + " " + data.awbId.driver.lastName) 
          }
          if(data.zoneId && data.zoneId.location && data.zoneId.location.name){
            locationName = data.zoneId.location.name
            if(data.zoneId.location.company && data.zoneId.location.company.name){
              companyName = data.zoneId.location.company.name;
            }
          }
          console.log("zone",zoneName,companyName,locationName)
          let pmbNo = data.customerId.pmb, location = '-'
          if((pmbNo > 0 && pmbNo <= 1999) || (pmbNo >= 4000 && pmbNo <= 4999)) {
              location = "Cabel Beach"
          }else if((pmbNo >= 3000 && pmbNo <= 3999)){
              location = "Albany"
          }else {
              location = "9to5"          
          }
          console.log("loc",location)
          $('#details-package').html('  <div class="row"><div class="form-group form-show-validation row" style="width:100%"><label class="col-lg-6 col-md-6 col-sm-4 ">Carrier</label><div class="col-lg-6 col-md-6 col-sm-6">'+ carrierName +'</div></div></div>        <div class="row"><div class="form-group form-show-validation row" style="width:100%"><label class="col-lg-6 col-md-6 col-sm-4 ">AWB Packages Count </label><div class="col-lg-6 col-md-6 col-sm-6">'+data.awbId.packages.length +'</div></div></div> <div class="row"><div class="form-group form-show-validation row" style="width:100%"><label class="col-lg-6 col-md-6 col-sm-4 ">Zone</label><div class="col-lg-6 col-md-6 col-sm-6">'+zoneName+'</div></div></div> <div class="row"><div class="form-group form-show-validation row" style="width:100%"><label class="col-lg-6 col-md-6 col-sm-4 ">Manifest Title</label><div class="col-lg-6 col-md-6 col-sm-6">'+ manifestTitle +'</div></div></div><div class="row"><div class="form-group form-show-validation row" style="width:100%"><label class="col-lg-6 col-md-6 col-sm-4 ">Driver</label><div class="col-lg-6 col-md-6 col-sm-6">'+driverName +'</div></div></div>      <div class="row"><div class="form-group form-show-validation row" style="width:100%"><label class="col-lg-6 col-md-6 col-sm-4 ">Cube</label><div class="col-lg-6 col-md-6 col-sm-6">'+cubeName+'</div></div></div> <div class="row"><div class="form-group form-show-validation row" style="width:100%"><label class="col-lg-6 col-md-6 col-sm-4 ">Location</label><div class="col-lg-6 col-md-6 col-sm-6">'+ locationName +'</div></div></div>  <div class="row"><div class="form-group form-show-validation row" style="width:100%"><label class="col-lg-6 col-md-6 col-sm-4 ">Company</label><div class="col-lg-6 col-md-6 col-sm-6">'+ companyName +'</div></div></div><div class="row"><div class="form-group form-show-validation row" style="width:100%"><label class="col-lg-6 col-md-6 col-sm-4 ">No Docs</label><div class="col-lg-6 col-md-6 col-sm-6">'+ nodocs +'</div></div></div>')
          
          
         
          if (response.length == 0) {
            $('#details-package').html('No data available');
          }
        })
      },
          error: function () {
            showNotify('Failed', response.message, 'fa fa-info', 'danger');
          }
    })
  })
  
  function unSelectAll() {
    packageTable.rows().deselect();
    $("tr").removeClass("selected");
    $("input.package-select-all").removeClass("selected");
    $("input.package-select").prop("checked", false);
    $("input.package-select-all").prop("checked", false);
  }
  
  $('#package-table').on('click', '.btn-edit-pricelabel', function () {
    const id = $(this).data('id');
    $('#setIdPriceLabel').val(id);
    $('#Brokerage').val(''),
      $('#CustomsProc').val(''),
      $('#sum-of-charges').val(''),
      $('#CustomsVAT').val(''),
      $('#Delivery').val(''),
      $('#Duty').val(''),
      $('#EnvLevy').val(''),
      $('#Freight').val(''),
      $('#Hazmat').val(''),
      $('#Pickup').val(''),
      $('#ServiceVat').val(''),
      $('#Storage').val(''),
      $('#NoDocsVal').val(''),
      $('#InsuranceVal').val(''),
      $('#SedVal').val(''),
      $('#ExpressVal').val(''),
      $('#TotalWet').val(''),
      $('#total-value-invoice').html(''),
      $("#override-value-invoice").val('')
    $.ajax({
      url: '/warehouse/pricelabels/' + id,
      type: 'get',
      success: function (response) {
        console.log(response);
        $('input').css({ "color": "black" })
        if (response.awbId) {
          pricelLabelCheck(response)
        } else {
          $.ajax({
            url: '/warehouse/pricelabels-package/' + id,
            type: 'get',
            success: function (response) {
              packagePriceLabel(response)
            }
          })
        }
      },
      error: function () {
      }
    });
  
  });
  
  function pricelLabelCheck(response) {
    const pkg = response.awbId;
    let ServiceVat = (response.ServiceVat || 0).toFixed(2);
    let TotalVat = (response.TotalWet || 0).toFixed(2);
    let NoDocsVal = 0;
    let InsuranceVal = 0;
    let SedVal = 0;
    let ExpressVal = 0;
    // if (pkg.packageCalculation == 'Kg') pkg.weight = 2.20462 * pkg.weight;
    // let totalinvoiceVal = 0;
  
    // if (pkg.invoices) {
    //   pkg.invoices.map((inv) => (totalinvoiceVal += inv.value));
    // }
    // var totalweightVal = 0;
  
    // if (pkg.packages) {
    //   const pa = pkg.packages;
    //   for (var i = 0; i < pa.length; i++) {
  
    //     var weight = pa[i].weight;
    //     if (pa[i].packageCalculation == 'kg') {
    //       weight = 2.20462 * pa[i].weight;
  
    //     }
    //     totalweightVal = totalweightVal + weight;
    //   }
  
    //pkg.packages.map((pkge) => (totalweightVal += pkge.weight));
    // }
  
    let Freight = response.Freight //(1.55 * pkg.weight).toFixed(2);
    let VatMultiplier = response.VatMultiplier
    $('#VatMultiplier').val(VatMultiplier.toFixed(2));
    $('#Brokerage').val(response.Brokerage.toFixed(2));
    $('#CustomsProc').val(response.CustomsProc.toFixed(2));
    $('#sum-of-charges').val(response.SumOfAllCharges.toFixed(2));
    $('#CustomsVAT').val(response.CustomsVAT.toFixed(2));
    $('#Delivery').val(response.Delivery.toFixed(2));
    $('#Duty').val(response.Duty.toFixed(2));
    $('#EnvLevy').val(response.EnvLevy.toFixed(2));
    $('#Freight').val(Freight.toFixed(2));
  
    $('#Hazmat').val(response.Hazmat.toFixed(2));
    $('#Pickup').val(response.Pickup.toFixed(2));
    $('#ServiceVat').val(ServiceVat);
    $('#Storage').val(response.Storage.toFixed(2));
    $('#NoDocsVal').val(response.NoDocs.toFixed(2));
    $('#InsuranceVal').val(response.Insurance.toFixed(2));
    $('#SedVal').val(response.Sed.toFixed(2));
    $('#ExpressVal').val(response.Express.toFixed(2));
    $('#TotalWet').val(TotalVat);
    $("#no_of_invoice").val((pkg.invoices).length.toFixed(2))
    $("#total-value-invoice").val(response.TotalInvoiceValue.toFixed(2))
    $("#override-value-invoice").val(response.OverrideInvoiceValue.toFixed(2))
    $("#total_weight_value").val(response.TotalWeightValue.toFixed(2))
    if (response.NoDocs > 0) $('#NoDocs').prop('checked', true)
    if (response.Insurance > 0) $('#Insurance').prop('checked', true)
    if (response.Sed > 0) $('#Sed').prop('checked', true)
    if (response.Express > 0) $('#Express').prop('checked', true)
    pricelabelcommon(ServiceVat, NoDocsVal, InsuranceVal, SedVal, ExpressVal, response.TotalInvoiceValue)
  }
  
  function packagePriceLabel(response) {
    const pkg = response;
    let ServiceVat = 0;
    let NoDocsVal = 0;
    let InsuranceVal = 0;
    let SedVal = 0;
    let ExpressVal = 0;
    let VatMultiplier = 0.12;
    //if (pkg.packageCalculation == 'Kg') pkg.weight = 2.20462 * pkg.weight;
    // let totalinvoiceVal = 0;
    // if (pkg.invoices) {
    //   pkg.invoices.map((inv) => (totalinvoiceVal += inv.value));
    // }
    // let totalweightVal = 0;
    // if (pkg.packages) {
    //   const pa = pkg.packages;
    //   for (var i = 0; i < pa.length; i++) {
  
    //     var weight = pa[i].weight;
    //     if (pa[i].packageCalculation == 'kg') {
    //       weight = 2.20462 * pa[i].weight;
  
    //     }
    //     totalweightVal = totalweightVal + weight;
    //   }
  
    //pkg.packages.map((pkge) => (totalweightVal += pkge.weight));
    // }
    $('#sum-of-charges').val(response.SumOfAllCharges ? response.SumOfAllCharges.toFixed(2) : 0)
    $("#VatMultiplier").val(VatMultiplier)
    $("#no_of_invoice").val((pkg.invoices).length)
    $("#total-value-invoice").val(response.TotalInvoiceValue ? response.TotalInvoiceValue.toFixed(2) : 0)
    $("#override-value-invoice").val(response.OverrideInvoiceValue ? response.OverrideInvoiceValue.toFixed(2) : 0)
    $("#total_weight_value").val(response.TotalWeightValue ? response.TotalWeightValue.toFixed(2) : 0)
    let Freight = (1.55 * pkg.weight).toFixed(2);
    if (pkg.company == "Post Boxes") {
      let fw = pkg.weight * 3;
      if (fw <= 35) $('#Freight').val(35)
      else $('#Freight').val(fw);
    } else {
      $('#Freight').val(Freight);
    }
    if (pkg.express) ExpressVal = 35, $('#Express').prop('checked', true), $('#ExpressVal').val('35');
    tval(0, 0, 0, 0, ExpressVal);
    pricelabelcommon(ServiceVat, NoDocsVal, InsuranceVal, SedVal, ExpressVal, response.TotalInvoiceValue)
  }
  function tval(ServiceVat, NoDocsVal, InsuranceVal, SedVal, ExpressVal) {
    let total = (
      Number($('#Brokerage').val()) +
      Number($('#CustomsProc').val()) +
      Number($('#sum-of-charges').val()) +
      Number($('#CustomsVAT').val()) +
      Number($('#Delivery').val()) +
      Number($('#Duty').val()) +
      Number($('#EnvLevy').val()) +
      Number($('#Freight').val()) +
      Number($('#Hazmat').val()) +
      Number($('#Pickup').val()) +
      Number($('#NoDocsVal').val()) +
      Number($('#InsuranceVal').val()) +
      Number($('#SedVal').val()) +
      Number($('#ExpressVal').val()) +
      // Number(NoDocsVal) +
      // Number(InsuranceVal) +
      // Number(SedVal) +
      // Number(ExpressVal) +
      Number(ServiceVat) +
      Number($('#Storage').val())
    );
    // $('#ServiceVat').val(((total * 7.5) / 100).toFixed(2));
    if (Number($('#ServiceVat').val()) > 0) {
      $('#serviceVatSpan').text($('#ServiceVat').val());
    } else {
      $('#serviceVatSpan').text(((total * 7.5) / 100).toFixed(2));
    }
    if (Number($('#TotalWet').val()) > 0) {
      $('#totalWetSpan').text($('#TotalWet').val());
    } else {
      $('#totalWetSpan').text((total + Number($('#ServiceVat').val())).toFixed(2));
    }
  
    // $('#TotalWet').val((total + Number($('#ServiceVat').val())).toFixed(2));
  }
  function pricelabelcommon(ServiceVat, NoDocsVal, InsuranceVal, SedVal, ExpressVal, totalinvoiceVal) {
    let Insurance = totalinvoiceVal * 0.01;
    $('#NoDocs').click(function () {
      if ($(this).prop('checked') == true) {
        $('#NoDocsVal').val('5');
        NoDocsVal = 5;
      } else if ($(this).prop('checked') == false) {
        $('#NoDocsVal').val('');
        NoDocsVal = 0;
      }
    });
    $('#Insurance').click(function () {
      if ($(this).prop('checked') == true) {
        $('#InsuranceVal').val(Insurance);
        InsuranceVal = Insurance;
      } else if ($(this).prop('checked') == false) {
        $('#InsuranceVal').val('');
        InsuranceVal = 0;
      }
    });
    $('#Sed').click(function () {
      if ($(this).prop('checked') == true) {
        $('#SedVal').val('25');
        SedVal = 25;
      } else if ($(this).prop('checked') == false) {
        $('#SedVal').val('');
        SedVal = 0;
      }
    });
    $('#Express').click(function () {
      if ($(this).prop('checked') == true) {
        $('#ExpressVal').val('35');
        ExpressVal = 35;
      } else if ($(this).prop('checked') == false) {
        $('#ExpressVal').val('');
        ExpressVal = 0;
      }
    });
  
    $('#add-to-pricelabel-form').on('keyup change', function () {
      tval(ServiceVat, NoDocsVal, InsuranceVal, SedVal, ExpressVal)
    });
  }
  
  packageTable.on("click", "input.package-select-all", function () {
    if ($("input.package-select-all").hasClass("selected")) {
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
  
  $('#package-table tbody').on('change', 'input[type="checkbox"]', function () {
    if (!this.checked) {
      $(this).closest("tr").removeClass('selected');
      $(this).prop("checked", false);
    }
    if (this.checked) $(this).closest("tr").addClass('selected')
    let selectingRowCount = packageTable.rows({ selected: true }).count();
    if ((selectingRowCount) !== packageTable.rows({ page: 'current' }).count()) {
      $("input.package-select-all").removeClass("selected");
      $("input.package-select-all").prop("checked", false);
    } else if ((selectingRowCount) === packageTable.rows({ page: 'current' }).count()) {
      $("input.package-select-all").prop("checked", true);
      $("input.package-select-all").addClass("selected");
    }
  });
  
  $('#package-table tbody').on('click', 'tr', function () {
    $(this).toggleClass('selected');
  });
  
  
  
  var pdfPath;
  $("#package-table").on("click", '.btn-print-pkg', function () {
    let id = $(this).data('id');
    $.ajax({
      url: '/api/printer/pdf/generate/pkg/' + id,
      type: 'get',
      success: function (response) {
        if (response.success) {
          pdfPath = '/util/pdf' + response.filename;
          printJS(pdfPath)
          // pdfjsLib.getDocument({ url: pdfPath }).promise.then((pdfData) => {
          //   pdfData.getPage(1).then((page) => {
          //     var canvas = $('#pdf-preview')[0];
          //     var canvasContext = canvas.getContext('2d');
          //     const viewport = page.getViewport({ scale: 1 });
          //     canvas.height = (canvas.width / viewport.width) * viewport.height;
          //     page.render({ canvasContext, viewport });
          //   });
          // });
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
              text: manifest.planeId.tailNumber + ' ' + moment(manifest.shipDate).subtract(4, 'hours').format('dddd, MMMM Do YYYY, h:mm A'),
              source: manifest,
            })),
          })
          .on('select2:select', function (event) {
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
  
    $.ajax({
      url: '/warehouse/package/locations',
      type: 'get',
      dataType: 'json',
      success(data) {
        addToDeliveryForm
          .find('[name="locationId"]')
          .select2({
            theme: 'bootstrap',
            width: '100%',
            placeholder: 'Select Location',
  
            data: data.map((locate) => ({
              id: locate._id,
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
            data: data.result.map((compartment) => ({
              id: compartment._id,
              text: compartment.name
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
          })
        },
        error: function () {
          swal({
            title: 'Error',
            type: 'error',
            text: 'Unknown error',
          });
        }
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
        url: '/api/warehouse/web/packages/add-packages-to-delivery',
        type: 'post',
        data: data,
        success: function (response) {
          if (!response.success && response.message && response.message.packageIds)
            response.message = response.message.packageIds
  
          if (response.error_message) {
            response.message = response.error_message
            swal({
              title: response.message[0],
              showCancelButton: true,
              confirmButtonText: 'yes',
            }).then(response => {
              if (response.value) {
                $.ajax({
                  url: '/api/warehouse/web/packages/add-packages-to-delivery?override=true',
                  type: 'post',
                  data: data,
                  success: function (response) {
                    swal({
                      title: response.success ? 'Success' : 'Error',
                      type: response.success ? 'success' : 'error',
                      text: response.message,
                    }).then(res => {
                      if (response.success) {
                        location.reload()
                      }
                    })
                  }
                });
              }
            })
          } else {
            swal({
              title: response.success ? 'Success' : 'Error',
              type: response.success ? 'success' : 'error',
              text: response.message,
            });
          }
        },
        error: function () {
          swal({
            title: 'Error',
            type: 'error',
            text: 'Unknown error',
          });
        }
      });
    });
  
    // Add To Cube Form
    addToCubeForm.submit(function (event) {
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
        url: '/api/cube/web/assign-packages/' + data.CubeId,
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
        }
      });
    });
  
    // Add To NoDOc Form
    addtoNoDocForm.submit(function (event) {
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
      if (data.packageIds == '') {
        swal({
          title: 'Empty Packages',
          type: 'warning',
          text: 'Please Select Packages',
        });
      }
      $.ajax({
        url: '/api/warehouse/web/packages/add-packages-to-nodoc',
        type: 'post',
        data: data,
        success: function (response) {
          swal({
            title: response.success ? 'Success' : 'Error',
            type: response.success ? 'success' : 'error',
            text: response.message,
          });
          // location.reload()
        },
        error: function () {
          swal({
            title: 'Error',
            type: 'error',
            text: 'Unknown error',
          });
        }
      });
    });
  });
  
  
function generate_package_detail_report(){
  $.ajax({
      url: "/reports/package-detail/report",
      type: "post",
      data: {
          daterange:$("#daterange-package-detail").val(),
          user:$("#package_detail_user").val(),
          status:$("#package_detail_status").val()
      } ,
      success: function (response) {
        if(response && response.status){
          swal("Report!", "Please wait while your report is generated.!", "success");
        }else{
          swal("Report!", "Something went wrong Please try again after 5 min.!", "error");
        }
         
      },
      error: function(jqXHR, textStatus, errorThrown) {
         console.log(textStatus, errorThrown);
      }
  });
}

  var pageUrl = pageUrl ? pageUrl : '';
  var pageArr = pageUrl.split('?');
  var urlPage = (pageArr && pageArr.length) ? pageArr[0] : '';
  var urlPage = (pageArr && pageArr.length) ? pageArr[0] : '';
  console.log(pageUrl,pageArr)
  var redirectUrl = "package-report";

  console.log(this)
  console.log("redir",redirectUrl,pageUrl,pageUrl.indexOf("/reports/awbreport"))
  if(pageUrl.indexOf("/reports/agingreport") >= 0){
    redirectUrl = "agingreport";
  }else if(pageUrl.indexOf("reports/package-report/by/employees") >= 0){
    redirectUrl = "package-report/by/employees";
  }

  if(pageUrl.indexOf("/reports/package-status") >= 0){
      redirectUrl = "/reports/package-status";
  }

  if(pageUrl.indexOf("/reports/nodocsreport") >= 0){
    redirectUrl = "nodocsreport";

  }
  if(pageUrl.indexOf("/reports/awbreport") >= 0){
    redirectUrl = "awbreport";

  }

  if(pageUrl.indexOf("/reports/agingreport") >= 0){
    redirectUrl = "agingreport";

  }
  if(pageUrl.indexOf("/reports/nodocsreport") >= 0){
    redirectUrl = "nodocsreport";

  }
  if(pageUrl.indexOf("/reports/awbreport") >= 0){
    redirectUrl = "awbreport";

  }
  console.log(pageUrl.indexOf("reports/package-report/by/employees"));
  if(pageUrl.indexOf("reports/package-report/by/employees") >= 0){
    redirectUrl = "/reports/package-report/by/employees";
  }
  else if (pageUrl.indexOf("package-report") >= 0) {
    redirectUrl = "package-report";
  }
  console.log("redirect cj",pageUrl,redirectUrl)
  if (pageUrl.indexOf("/warehouse/snapshot/package/list") >= 0) {
    redirectUrl = "/warehouse/snapshot/package/list/report";
  }
  if (pageUrl.indexOf("/package/list") >= 0  ) {
    redirectUrl = "/reports/package/list";
  }
  if (pageUrl.split('/')[2] == "customer") {
    redirectUrl = window.location.pathname;
  }
  // console.log(redirectUrl);
  if(nodoc){
    $(document).on('click', '.applyBtn', function () {
      var urlLocation = redirectUrl + "?nodocs=load&&daterange=" + $('.daterange').val();
      if($('#search_collection').val()){
        urlLocation = urlLocation+'&search_collection='+$('#search_collection').val();
      }
      window.location = urlLocation;
    })
  }else{
  
  $(document).on('click', '.applyBtn', function () {
    console.log("redirectUrl",redirectUrl)
    var urlLocation = redirectUrl + "?daterange=" + $('.daterange').val();
    if($('#search_collection').val()){
      urlLocation = urlLocation+'&search_collection='+$('#search_collection').val();
    }
     window.location = urlLocation;
  })
  }
  
  $(document).on('click', '.cancelBtn', function () {
    window.location = redirectUrl + "?clear=1";
  })
  $(document).ready(function () {
    setTimeout(() => {
      console.log("page ",pageUrl)
      if ($('#clear').val()) {
        // $('#daterange').val('')
        $('#clear').val('1');
        var endate = new Date();
        endate.setDate(endate.getDate());
        var stdate = new Date();
        stdate.setDate(stdate.getDate() - 14);
        var dateRange = (stdate.getMonth() + 1) + '/' + stdate.getDate() + '/' + stdate.getFullYear() + ' - ' +
          (endate.getMonth() + 1) + '/' + endate.getDate() + '/' + endate.getFullYear()
        localStorage.clear()
        $('.daterange').val(dateRange)
      }
    }, 100)
    $("#customerId").val($("#customer").val()).trigger("change")
    $("#locationsId").val($("#location").val()).trigger("change")
  })
  
  function searchDataFilter(){
    
    var search_type = $("#search_type").val() || "100";
    console.log()
    var search_text = $("#search_text").val() || "All1";  
    var customerId = $("#customerId").val();
    var locationId = $("#locationsId").val();
    
    var pageUrl =$("#page").val();
    var pageArr =  pageUrl.split('?');
    var urlPage = (pageArr && pageArr.length) ? pageArr[0] : '';
    urlPage = urlPage+'?1=1'
    if(search_type && search_text){

      urlPage =  urlPage+"&search_type="+search_type+'&search_text='+search_text;
    }
    if(customerId){
      urlPage =  urlPage+"&customerId="+customerId;
    }
    if(nodoc){
      urlPage =  urlPage+"&nodocs=load";
    }
    if(locationId){
      urlPage =  urlPage+"&locationId="+locationId;
    }
    if($("#search_collection").val()){
      urlPage = urlPage+'&search_collection='+$("#search_collection").val();
    }
  
     window.location = urlPage;
  }