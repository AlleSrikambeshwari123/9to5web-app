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
  var upload = new FileUploadWithPreview('invoice-upload-field')

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
  $('#packageType').select2({
    theme: 'bootstrap',
    width: '100%',
    placeholder: "Select a package type"
  })

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

  var sedAnswered = 0;
  var awbPackages = [];

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

        $('#trackingNo').val("");
        $('#description').val("");
        $('#weight').val("");
        $('#packageType').val("");
        $('#W').val("");
        $('#H').val("");
        $('#L').val("");
      }
    }
  });
  $(".btn-copy-last").click(function () {
    if (awbPackages.length > 0) {
      var lastPackage = awbPackages[awbPackages.length - 1];
      $("#trackingNo").val("");
      $("#description").val(lastPackage.description);
      $("#weight").val(lastPackage.weight);
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
    pkg.id = Date.now().toString();
    pkg.location = "Warehouse FLL";
    pkg.dimensions = pkg.W + 'x' + pkg.H + 'x' + pkg.L;
    awbPackages.push(pkg);
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
        success: function (response) {
          swal({
            title: response.success == true ? 'Created' : 'Failed',
            text: response.message,
            type: response.success == true ? 'success' : 'error',
          }).then(res => {
            if (response.success == true) {
              window.location.href = 'manage/' + response.awb.id + '/preview';
            }
          })
        }
      });
    })
  });

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

  function displayPackages() {
    var totalWeight = 0;
    awbPackages.forEach(pkg => totalWeight += Number(pkg.weight));
    $('.package-info').text(`${awbPackages.length} Pieces / ${totalWeight.toFixed(2)} lbs`);

    packageTable.clear().draw();
    awbPackages.forEach(pkg => {
      let rowNode = packageTable.row.add([
        pkg.trackingNo,
        pkg.description,
        pkg.dimensions,
        Number(pkg.weight).toFixed(2) + ' lbs',
        `<a class="btn btn-link btn-primary btn-edit-pkg p-1" title="Edit" data-id="${pkg.id}" href="#add-package-popup">
          <i class="fa fa-pen"></i> </a>
        <a class="btn btn-link btn-danger btn-rm-pkg p-1" title="Delete" data-id="${pkg.id}" data-toggle='modal' data-target='#confirmPkgDel'>
          <i class="fa fa-trash"></i> </a>`
      ]).draw(false).node();
      $(rowNode).find('td').eq(1).addClass('text-center');
      $(rowNode).find('td').eq(2).addClass('text-center');
      $(rowNode).find('td').eq(3).addClass('text-right');
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

            $('#trackingNo').val(pkg.trackingNo);
            $('#description').val(pkg.description);
            $('#weight').val(pkg.weight);
            $('#packageType').val(pkg.packageType);
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

  function extractFormData(form) {
    let formData = $(form).serializeArray();
    let data = {};
    $.each(formData, function (_, record) {
      data[record.name] = record.value
    })
    return data;
  }
});