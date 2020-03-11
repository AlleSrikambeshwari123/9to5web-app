Number.prototype.formatMoney = function (c, d, t) {
  var n = this,
    c = isNaN(c = Math.abs(c)) ? 2 : c,
    d = d == undefined ? "." : d,
    t = t == undefined ? "," : t,
    s = n < 0 ? "-" : "",
    i = String(parseInt(n = Math.abs(Number(n) || 0).toFixed(c))),
    j = (j = i.length) > 3 ? j % 3 : 0;
  return "$" + s + (j ? i.substr(0, j) + t : "") + i.substr(j).replace(/(\d{3})(?=\d)/g, "$1" + t) + (c ? d + Math.abs(n - i).toFixed(c).slice(2) : "");
};

if (Array.isArray(window.invoices) && window.invoices.length) {
  window.invoices.forEach(invoice => AWBInvoices.addInvoceRow(invoice))
} else {
  AWBInvoices.addInvoceRow() 
}

$(function () {
  $('#customerId').select2({
    theme: 'bootstrap',
    width: '100%',
    placeholder: "Select a customer"
  })
  $('#c-companyId').select2({
    theme: 'bootstrap',
    width: '100%',
    minimumResultsForSearch: -1
  })
  $('#c-companyId').change(function () {
    let companyId = $(this).val();
    if (companyId == '9to5') $('#c-pmb').val(9000);
    else $('#c-pmb').val("");
  })
  $('#po-source').select2({
    theme: 'bootstrap',
    width: '100%',
    minimumResultsForSearch: -1
  })
  $('#awb-isSed').select2({
    theme: 'bootstrap',
    width:'100%',
    placeholder: "Select",
    minimumResultsForSearch: Infinity,
  })
  $('#awb-deliveryMethod').select2({
    theme: 'bootstrap',
    width:'100%',
    minimumResultsForSearch: Infinity,
  })
  $('#po-paid-type').select2({
    theme: 'bootstrap',
    width: '100%',
    placeholder: 'Select a Paid Type',
    minimumResultsForSearch: -1
  })
  $('#shipper').select2({
    theme: 'bootstrap',
    placeholder: "Select a shipper"
  })
  $('#carrier').select2({
    theme: 'bootstrap',
    width: '100%',
    placeholder: "Select a carrier"
  })
  $('#hazmat').select2({
    theme: 'bootstrap',
    width: '100%',
    placeholder: "Select a HAZMAT Class"
  })
  $('#packageType').select2({
    theme: 'bootstrap',
    width: '100%',
    placeholder: "Select a package type"
  })

  var packageTable = $('#packageTable').DataTable({
    pageLength: 5,
    bSortable: false,
    ordering: false,
    bLengthChange: false,
    bFilter: false,
  })

  var sedAnswered = 0;

  var awbPackages = packages||[];
    //Showing old packages
  if(awbPackages.length>0){
    displayPackages();
  }
  // Add Pacakge Popup
  $('.btn-add-package').magnificPopup({
    type: 'inline',
    midClick: true,
    mainClass: 'mfp-fade',
    gallery: {
      enabled: true,
    },
    callbacks: {
      open: function () {
        if (awbPackages.length > 0) $('.btn-copy-last').show()
        else $('.btn-copy-last').hide();
        $('#id').val(undefined);
        $('#description').val("");
        $('#weight').val("");
        $('#packageType').val("");
        $('#packageCalculation').val("kg");
        $('#W').val("");
        $('#H').val("");
        $('#L').val("");
      }
    }
  });
  $(".btn-copy-last").click(function () {
    if (awbPackages.length > 0) {
      var lastPackage = awbPackages[awbPackages.length - 1];
      $("#description").val(lastPackage.description);
      $("#weight").val(lastPackage.weight);
      $('#packageCalculation').val(lastPackage.packageCalculation||'kg');
      $('#packageType').val("");
      var dims = lastPackage.dimensions.toLowerCase().split('x');
      $("#W").val(dims[0])
      $("#H").val(dims[1])
      $("#L").val(dims[2])
    }
  })
  $("#btn-cancel-add").click(function () {
    $('.mfp-close').trigger("click");
  })
  $('#add-package-form').submit(function (event) {
    event.preventDefault();
    let pkg = extractFormData(this);
   // console.log(pkg);
   // console.log(awbPackages);
    let isNew=false;
    if(!pkg.id){
      pkg.id = Date.now().toString();
      isNew=true;
    }

    pkg.location = "Warehouse FLL";
    pkg.dimensions = pkg.W + 'x' + pkg.H + 'x' + pkg.L;
    if(isNew===true){
      awbPackages.push(pkg);
    }else{
      awbPackages = awbPackages.map(m=>{
        if(m.id===pkg.id){
          return Object.assign(m,pkg);
        }else{
          return m;
        }
      })
    }

    displayPackages();
    $('.mfp-close').trigger("click");
  })

  // AWB Form
  $("#value").change(function () {
    sedAnswered = 0;
  })
  $(".sed-click").click(function () {
    $("#sedRequired").val(Number($(this).attr("data-id")));
    sedAnswered = 1;
    $("#save_awb").trigger('click');
  })
  $("#add-awb-form").submit(function (event) {
    event.preventDefault();
    if (Number($("#value").val()) >= 2500 && sedAnswered == 0) {
      $("#show-sed").trigger('click');
      return;
    }

    var awbInfo = $(this)
      .serializeArray()
      .reduce((acc, item) => {
        if (!item.name.startsWith('invoice.')) {
          acc[item.name] = item.value;
        }
        return acc;
      }, {});
    awbInfo.isSed = sedAnswered || Number(awbInfo.isSed);
    awbInfo.packages = JSON.stringify(awbPackages);
    awbInfo.invoices = [];

    let promises = AWBInvoices.getInvoices().map(({ file, ...invoice }) => {
      if (!invoice.number && !invoice.value && !invoice.id) {
        return;
      }
      return new Promise((r) => uploadContentFile(file, r)).then((result) => {
        if (result.fileName) {
          invoice.filename = result.fileName;
        }

        awbInfo.invoices.push(invoice);
      });
    });

    Promise.all(promises)
      .then(() => {
        $.ajax({
          url: 'create',
          type: 'post',
          data: JSON.stringify(awbInfo),
          dataType: 'json',
          contentType: 'application/json',
          processData: false,
          success: function(response) {
            swal({
              title: response.success == true ? 'Updated' : 'Failed',
              text: response.message,
              type: response.success == true ? 'success' : 'error',
            }).then((res) => {
              if (response.success == true) {
                window.location.href = 'preview';
              }
            });
          },
        });
      })
      .catch((error) => {
        console.log(error);
        swal({
          title: 'Failed',
          text: error.message || 'Unknown error',
          type: 'error',
        });
      });
  });

  // Shipper / Carrier
  $('#add-shipper-form').submit(function (event) {
    $(".close-del").trigger('click');
    event.preventDefault();
    var data = extractFormData(this);
    $.ajax({
      url: '/warehouse/shipper/create',
      type: 'post',
      data: data,
      success: function (response) {
        swal({
          title: response.success == true ? 'Created' : 'Failed',
          text: response.message,
          type: response.success == true ? 'success' : 'error',
        }).then(() => {
          if (response.success) {
            $('#shipper').append(`<option value="${response.shipper.id}">${response.shipper.name}</option>`)
          }
        })
      }
    })
  })
  $('#add-carrier-form').submit(function (event) {
    $(".close-del").trigger('click');
    event.preventDefault();
    var data = extractFormData(this);
    $.ajax({
      url: '/warehouse/carrier/create',
      type: 'post',
      data: data,
      success: function (response) {
        swal({
          title: response.success == true ? 'Created' : 'Failed',
          text: response.message,
          type: response.success == true ? 'success' : 'error',
        }).then(() => {
          if (response.success) {
            $('#carrier').append(`<option value="${response.carrier.id}">${response.carrier.name}</option>`)
          }
        })
      }
    })
  })
  $('#add-customer-form').submit(function (event) {
    $(".close-del").trigger('click');
    event.preventDefault();
    var data = extractFormData(this);
    $.ajax({
      url: '/admin/customers/create',
      type: 'post',
      data: data,
      success: function (response) {
        swal({
          title: response.success == true ? 'Created' : 'Failed',
          text: response.message,
          type: response.success == true ? 'success' : 'error',
        }).then(() => {
          if (response.success) {
            var customer = response.customer;
            $('#customerId').append(`<option value="${customer.id}">${customer.pmb} / ${customer.firstName} ${customer.lastName}</option>`)
          }
        })
      }
    })
  })

  //#region Package / Manifest FUNCTIONS
  function uploadContentFile(fileInputctrl, completeHandler) {
    var files = fileInputctrl.get(0).files;
    if (files.length > 0) {
      var formData = new FormData();
      for (var i = 0; i < files.length; i++) {
        var file = files[i];
        formData.append('upload', file, file.name);
      }
      $.ajax({
        url: '/util/upload',
        type: 'post',
        data: formData,
        processData: false,
        contentType: false,
        success: function (data) {
          console.log('upload successful!\n' + data);
          $("#pindecator").css('width', 0 + '%')
          if (completeHandler !== undefined) {
            completeHandler(data);
          }
        },
        xhr: function () {
          var xhr = new XMLHttpRequest();
          xhr.upload.addEventListener('progress', function (evt) {
            if (evt.lengthComputable) {
              var percentComplete = evt.loaded / evt.total;
              console.log(percentComplete);
              percentComplete = parseInt(percentComplete * 100);
              $("#pindecator").css('width', percentComplete + '%')
            }
          }, false);
          return xhr;
        }
      });
    }
    else {
      completeHandler("");
    }
  }

  function displayPackages() {
    var totalWeight = awbPackages.reduce((a,c)=>{
      let weight = Number(c.weight);
      let coef = 0.453592;
      let lbs;
      let kg;
      if(c.packageCalculation==='lbs'){
        lbs = a.lbs + weight;
        kg = a.kg + weight*coef;
      }else {
        kg = a.kg + weight;
        lbs = a.lbs +  weight/coef
      }
      return {kg, lbs}
    },{lbs:0,kg:0});
    //awbPackages.forEach(pkg => totalWeight += Number(pkg.weight));
    $('.package-info').html(`${awbPackages.length} Pieces / ${totalWeight.lbs.toFixed(2)}(${totalWeight.kg.toFixed(2)})   <span style="margin-left:20px">lbs(kg)</span>`);

    packageTable.clear().draw();
    awbPackages.forEach(pkg => {
      // A bit hacky way to detect newly added packages, pkg.id == Date.now() for new package for 
      // some reason
      let isNew = pkg.id > 1e9
      let rowNode = packageTable.row
        .add([
          `PK${pkg.id}`,
          pkg.trackingNo,
          pkg.description,
          pkg.dimensions,
          Number(pkg.weight).toFixed(2) + ` ${pkg.packageCalculation || 'kg'}`,
          `${calculatePackageVolumetricWeight(pkg).toFixed(2)} lbs`,
          pkg.lastStatusText,
          [
            `<a class="btn btn-link btn-primary btn-edit-pkg p-1" title="Edit" data-id="${pkg.id}" href="#add-package-popup"><i class="fa fa-pen"></i></a>`,
            `<a class="btn btn-link btn-danger btn-rm-pkg p-1" title="Delete" data-id="${pkg.id}" data-toggle='modal' data-target='#confirmPkgDel'><i class="fa fa-trash"></i></a>`,
            !isNew && `<a class="btn btn-link btn-primary p-1 btn-print-pkg" data-toggle="modal" data-id="${pkg.id}" data-original-title="Print Label" data-target="#print-popup"> <i class="fa fa-print"></i> </a>`,
          ].filter(Boolean).join('\n'),
        ])
        .draw(false)
        .node();
      $(rowNode).find('td').eq(2).addClass('text-center');
      $(rowNode).find('td').eq(3).addClass('text-center');
      $(rowNode).find('td').eq(4).addClass('text-center');
      $(rowNode).find('td').eq(5).addClass('text-center');
      $(rowNode).find('td').eq(6).addClass('text-right');
      $(rowNode).find('.btn-edit-pkg').magnificPopup({
        type: 'inline',
        midClick: true,
        mainClass: 'mfp-fade',
        gallery: {
          enabled: true,
        },
        callbacks: {
          open: function () {
            $('.btn-copy-last').hide();

            $('#id').val(pkg.id);
            $('#description').val(pkg.description);
            $('#weight').val(pkg.weight);
            $('#packageType').val(pkg.packageType);
            $('#packageCalculation').val(pkg.packageCalculation||'kg');
            var dims = pkg.dimensions.toLowerCase().split('x');
            $("#W").val(dims[0])
            $("#H").val(dims[1])
            $("#L").val(dims[2])
          }
        }
      })
    })

    $('.btn-rm-pkg').click(function () {
      var id = $(this).data('id');
      $("#rmPackage").attr('data-id', id);
    })
    $("#rmPackage").click(function () {
      var id = $(this).data('id');
      awbPackages = awbPackages.filter(package => package.id != id);
      displayPackages();
      $(".close-del").trigger('click');
    });
  }
});


$(function() {
  // This logic is copied from package lists:
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
});