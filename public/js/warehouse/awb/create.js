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
$(function () {
  $('#customerId').select2({
    theme: 'bootstrap',
    width: '100%',
    placeholder: "Select a customer"
  })
  $('#shipper').select2({
    theme: 'bootstrap',
    width: '100%',
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

  var pageMode = $("#pgmode").val();
  var sedAnswered = 0;
  var awbPackages = [];

  $("#print-awb").click(function () {
    var awb = $(this).attr('data-id')
    $.ajax({
      url: '/warehouse/print-awb/' + awb,
      contentType: 'json',
      success: function (result) {
        console.log('result', result)
      }
    })
  })
  $("#print-lbl").click(function () {
    var awb = $(this).attr('data-id')
    $.ajax({
      url: '/warehouse/print-awb-lbl/' + awb,
      contentType: 'json',
      success: function (result) {
        console.log('result', result)
      }
    })
  })

  // Add Pacakge Popup
  $('#packageType').select2({
    theme: 'bootstrap',
    width: '100%',
    placeholder: "Select a package type"
  })
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
      }
    }
  });
  $(".btn-copy-last").click(function () {
    if (awbPackages.length > 0) {
      var lastPackage = awbPackages[awbPackages.length - 1];
      $("#trackingNo").val("");
      $("#description").val(lastPackage.description);
      $("#weight").val(lastPackage.weight);
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
    let package = extractFormData(this);
    console.log(package);
    package.id = package.packageNo;
    package.location = "Warehouse FLL";
    package.dimensions = package.W + 'x' + package.H + 'x' + package.L;
    awbPackages.push(package);
    displayPackages(awbPackages, "#packageTable", "cargo");
    $('.mfp-close').trigger("click");
  })

  // AWB Form
  $("#value").change(function () {
    sedAnswered = 0;
  })
  $(".sed-click").click(function () {
    $("#sedRequired").val(Number($(this).attr("data-id")));
    sedAnswered = 1;
    console.log('sed answer changed' + sedAnswered)
    $("#save_awb").trigger('click');
  })
  $("#add-awb-form").submit(function (event) {
    event.preventDefault();
    if (Number($("#value").val()) >= 2500 && sedAnswered == 0) {
      $("#show-sed").trigger('click');
      return;
    }

    var awbInfo = extractFormData(this);
    awbInfo.isSed = sedAnswered;
    awbInfo.packages = JSON.stringify(awbPackages);
    console.log(awbInfo, "saving the awb")

    uploadContentFile($("#invFile"), results => {
      var fileInfo = {};
      if (results != "") {
        var fileInfo = JSON.parse(results);
        if (fileInfo[0].uploadedFile) {
          awbInfo.invoice = fileInfo[0].uploadedFile;
        }
      }

      $.ajax({
        url: 'create',
        type: 'post',
        data: awbInfo,
        success: function (result) {
          console.log(result);
          $(".awb").text(result.id);
          $(".awb").val(result.id)
          $("#save_awb").hide();
          $(".print-options").show();
          $("#print-awb").attr('data-id', result.id);
          $("#print-lbl").attr('data-id', result.id);
        }
      });
    })
  });

  $("#print-label").click(function () {
  })

  //#region Package / Manifest FUNCTIONS
  function uploadContentFile(fileInputctrl, completeHandler) {
    var files = fileInputctrl.get(0).files;
    if (files.length > 0) {
      var formData = new FormData();
      for (var i = 0; i < files.length; i++) {
        var file = files[i];
        formData.append('uploads[]', file, file.name);
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

  function displayPackages(packages, tableId, ctype) {
    //REFACTORED FUNCTION  
    var totalWeight = 0;
    for (var i = 0; i < packages.length; i++) {
      if (!isNaN(packages[i].weight)) {
        totalWeight += Number(packages[i].weight)
      }
    }
    $('.total-weight').text(totalWeight + " lbs")
    if ($(tableId + " tbody").children().length > 0)
      $(tableId).DataTable().destroy();
    var containerLabel = "Skid";
    var hideCols = true;
    if (ctype == 'mail') {
      console.log('print')
      $("#mailCount").text(packages.length);
    }
    if (ctype == "unproc") {
      hideCols = false;
      $("#unProcCount").text(packages.length);
      console.log('going to hide cols');
    }
    if (ctype == "cargo") {
      $("#packageCount").text(packages.length);
    }
    var colDef = [
      {
        title: "Tracking No",
        data: null,
        render: function (data, type, row, meta) {
          // console.log(data);
          return `${data.trackingNo} `;
        }
      },


      {
        title: "Description",
        data: null,
        render: function (data, type, row, meta) {
          // console.log(data);
          return `${data.description}`;
        }
      },
      {
        title: "Weight",
        data: null,
        render: function (data, type, row, meta) {
          // console.log(data);
          return `${data.weight}`;
        }
      },
      {
        title: "Dimensions",
        data: null,
        render: function (data, type, row, meta) {
          // console.log(data);
          return `${data.dimensions}`;
        }
      },

      {
        title: "",
        data: null,
        render: function (data, type, row, meta) {
          // console.log(data);
          return `<i class='fas fa-pencil-alt edit'  data-id='${data.id}' title='Edit' style='cursor:pointer;'></i> <i class='fas fa-print print-single-label pl-2 pr-2'  data-id='${data.id}' title='Print Label' style='cursor:pointer;'></i> <i title='Delete' data-type='${ctype}' data-toggle='modal' data-target='#confirmPkgDel' class='fas fa-trash rm' data-id='${data.id}' style='cursor:pointer;'></i>`;
        }
      },

    ];
    var colDefc = [

      {
        title: "Compartment",
        data: null,
        render: function (data, type, row, meta) {
          // console.log(data);
          return `${data.compartment} `;
        }
      },
      {
        title: "Tracking No",
        data: null,
        render: function (data, type, row, meta) {
          // console.log(data);
          return `${data.trackingNo} `;
        }
      },


      {
        title: "Description",
        data: null,
        render: function (data, type, row, meta) {
          // console.log(data);
          return `${data.description}`;
        }
      },
      {
        title: "Weight",
        data: null,
        render: function (data, type, row, meta) {
          // console.log(data);
          return `${data.weight}`;
        }
      },
      {
        title: "Dimensions",
        data: null,
        render: function (data, type, row, meta) {
          // console.log(data);
          return `${data.dimensions}`;
        }
      },

      // {
      //     title: "",
      //     data: null,
      //     render: function (data, type, row, meta) {
      //         // console.log(data);
      //         return `<i class='fas fa-pencil-alt edit'  data-id='${data.id}' title='Edit' style='cursor:pointer;'></i> <i class='fas fa-print print-single-label pl-2 pr-2'  data-id='${data.id}' title='Print Label' style='cursor:pointer;'></i> <i title='Delete' data-type='${ctype}' data-toggle='modal' data-target='#confirmPkgDel' class='fas fa-trash rm' data-id='${data.id}' style='cursor:pointer;'></i>`;
      //     }
      // },

    ];
    if (pageMode == "flight") {
      colDef = colDefc;
    }

    $(tableId).DataTable({

      data: packages,
      paging: true,

      columns: colDef,
      //bInfo:false,

      "language": {
        "decimal": ",",
        "thousands": "."
      },

      "deferRender": true,
      initComplete: function () {
        $(tableId).find(".edit").click(function () {
          var id = $(this).attr('data-id');
          var form = "#cargoPackageForm";

          if (ctype == 'mail')
            form = '#mailPackageForm';
          if (ctype == "unproc")
            form = "#unprocPackageForm"
          $(form).parent().show();
          loadPackage(id, $(form));
        });
        $(tableId).find(".print-single-label").click(function () {
          var id = $(this).attr('data-id');
          $.ajax({
            url: '/warehouse/print-awb-lbl/' + $("#id").val() + ":" + id,
            contentType: 'json',
            success: function (result) {

            }
          })

        });
        $(tableId).find(".rm").click(function () {
          var id = $(this).attr('data-id');
          var type = $(this).attr('data-type');
          $("#rmPackage").attr('data-id', id);
          $("#rmPackage").attr('data-type', type);
          // deletePackage(id,"cargo");
        });
      },

    });
  }

  function loadPackage(trackingNo, form) {
    console.log(form.attr('id'));
    $.ajax({
      url: '/warehouse/load-package/' + trackingNo,
      contentType: 'json',
      success: function (dResult) {
        console.log(dResult);

        // form.find('.skybox').val(dResult.skybox);
        //console.log(dResult.skybox);
        $("#pkgId").val(dResult.id);
        $('#trackingNo').val(dResult.trackingNo);
        // form.find('.shipper').val(dResult.shipper);
        //form.find('.package-value').val(dResult.value);
        $('#weight').val(dResult.weight);
        //form.find('.pieces').val(dResult.pieces);
        $('#description').val(dResult.description);
        //form.find('.carrier').val(dResult.carrier);
        var dims = dResult.dimensions.split("x");
        if (dims.length == 3) {
          $("#W").val(dims[0])
          $("#H").val(dims[1])
          $("#L").val(dims[2])
        }
        if (dResult.pkgNo) {
          $("#pkgNo").val(dResult.pkgNo)
        }
        if (dResult.packaging) {
          $("#packaging").val(dResult.packaging)
        }
        form.find('.dimensions').val(dResult.dimensions);
        $(".btn-add-package").trigger('click');
        // if (typeof dResult.bag != "undefined")
        //     form.find('.bag').val(dResult.bag);
        // else
        //     form.find('.skid').val(dResult.skid);

        //form.find('.skybox').trigger('change');

      },
      error: function (err) {

      }

    })
  }

  function extractFormData(form) {
    let formData = $(form).serializeArray();
    let data = {};
    $.each(formData, function (_, record) {
      data[record.name] = record.value
    })
    return data;
  }
});