Number.prototype.formatMoney = function(c, d, t){
    var n = this,
        c = isNaN(c = Math.abs(c)) ? 2 : c,
        d = d == undefined ? "." : d,
        t = t == undefined ? "," : t,
        s = n < 0 ? "-" : "",
        i = String(parseInt(n = Math.abs(Number(n) || 0).toFixed(c))),
        j = (j = i.length) > 3 ? j % 3 : 0;
    return "$"+s + (j ? i.substr(0, j) + t : "") + i.substr(j).replace(/(\d{3})(?=\d)/g, "$1" + t) + (c ? d + Math.abs(n - i).toFixed(c).slice(2) : "");
};
$(function () {

    //#region PAGE LOAD 
    var mid = $("#mid").val();
    var mtype = $('#mtype').val();
    var mailTable;
    var cargoTable;
    
    function LoadPageData() {
        //we need to load page data based on manifest type... 
        getManifestTotals(mid,mtype);
        if (mtype!="cargo"){
            getManifestPackages(mid, mtype, function (mailPackages) {
             
                // displayMailPackages(mailPackages);
                displayPackages(mailPackages,"#packageTable",mtype)
            });
            
        }
       
        else {
            getManifestPackages(mid, 'mail', function (mailPackages) {
             
                // displayMailPackages(mailPackages);
                displayPackages(mailPackages,"#mailTable","mail")
            });
    
            getManifestPackages(mid, 'cargo', function (cargoPackages) {
                //displayCargoPackages(cargoPackages);
                displayPackages(cargoPackages,"#cargoTable","cargo")
            });
        }
       
        //we need to get the counts intially 
        LoadPackageCounters();

    }

    function LoadPackageCounters() {
        getPackageCountBySize(mid, mtype, "#packageCount");
        if ($("#mailCount"))
            getPackageCountBySize(mid, "mail", "#mailCount");
    }
    LoadPageData();
    //#endregion

    //#region Control Actions
    $(".skybox").change(function () {
        //set the user 
        //make sure that its the correct length 
        var form = $(this).closest('form');
        var box = $(this).val();
        var nameCtrl = form.find('.customerName');
        lookupUser(box, $(nameCtrl));
    });
    $("input").change(function () {
        //revalidate the from
        var form = $(this).closest('form');
        var package = getPackageDetails($(this));
        var validPackage = validatePackage(package, $(this));
    })
    $(".savePackage").click(function () {

        var package = getPackageDetails($(this));
        var stage = $(this).attr('data-stage');
        var mtype = $("#mytpe").val();
        var validPackage = validatePackage(package, $(this));
        var form = $(this).closest('form');
        if (validPackage) {
            //save
            savePackage(package, form,Number(stage)>1);
        } else {
            console.log('not saving the package...Invalid')
        }

    });
    $(".close-manifest").click(function () {
        var btn = $(this);
        $.ajax({
            url: '/warehouse/close-manifest',
            type: 'post',
            data: {
                mid: mid
            },
            success: function (result) {
                btn.fadeOut();
                $(".pkg-form").hide();
                notes.show(result.message, {
                    type: 'info',
                    title: 'Hey',
                    icon: '<i class="icon-icon-lock-open-outline"></i>',
                    sticky: true
                });
            }
        });
    });
    $(".ship-manifest").click(function () {
        //we need the awb 
        var btn = $(".ship-manifest-btn");
        var awb = $("#awb").val();

        $.ajax({
            url: '/warehouse/ship-manifest',
            type: 'post',
            data: {
                mid: mid,
                awb: awb
            },
            success: function (result) {
                $(".close-del").trigger('click');
                btn.fadeOut();
                notes.show(result.message, {
                    type: 'info',
                    title: 'Hey',
                    icon: '<i class="icon-icon-lock-open-outline"></i>',
                    sticky: false
                });
            }
        });
    });
    $(".export-manifest").click(function () {
        window.location = '/warehouse/export-manifest';
    });
    $("#rmPackage").click(function () {
        var id = $(this).attr('data-id');
        var type = $(this).attr('data-type');
        console.log('type ' + type);
        deletePackage(id, type);
        $(".close-del").trigger('click');
    });
    //#endregion

    //#region Package / Manifest FUNCTIONS
    function getPackageDetails(saveBtn) {
        console.log('getting the package details')
        var form = saveBtn.closest('form');
        var package = {
            skybox: $(form).find('.skybox').val(),
            customer: $(form).find('.customerName').text(),
            tracking: $(form).find('.trackingNo').val(),
            description: $(form).find('.description').val(),
            shipper: $(form).find('.shipper').val(),
            value: $(form).find('.package-value').val(),
            pieces: $(form).find('.pieces').val(),
            weight: $(form).find('.weight').val(),
            mid: $(form).find('.mid').val(),
            mtype: $(form).find('.mtype').val(),
        }

        if (typeof $(form).find('.bag').val() != 'undefined') {
            package.bag = $(form).find('.bag').val()
        } else {
            package.skid = $(form).find('.skid').val();
        }
        console.log(package)
        return package;

    }
   
    function getManifestTotals(mid,type){
        var totalWeight = 0; 
        var totalValue = 0 ; 
        
        
        
   
        getManifestPackages(mid,mtype,function(packages){
           
            packages.forEach(element => {
               
                totalWeight = totalWeight + Number(element.weight);
            
                totalValue = totalValue + Number(element.value); 
            });
            if (type == 'cargo'){
                getManifestPackages(mid,"mail",function(packages){
                    packages.forEach(element => {
                        totalWeight += Number(element.weight); 
                        totalValue += Number(element.value); 
                    });
                    $(".total-weight").text(' '+totalWeight+' LBS');
                    $(".total-value").text(' '+Number(totalValue).formatMoney(2,'.',','))
                });
                
            }
            else{
                $(".total-weight").text(' '+totalWeight+' LBS');
                $(".total-value").text(' '+Number(totalValue).formatMoney(2,'.',','))
            }
        });
       
      
    }
    function validatePackage(package, saveBtn) {
        var valid = true;
        var message = '';
        var form = saveBtn.closest('form');

        var skybox = form.find('.skybox')
        $(skybox).parent().find('label').removeClass('text-danger');

        if (package.skybox == "") {
            valid = false;
            $(skybox).parent().find('label').addClass('text-danger');
        }

        form.find('.trackingNo').parent().find('label').removeClass('text-danger');
        if (package.tracking == '') {
            valid = false;
            form.find('.trackingNo').parent().find('label').addClass('text-danger');
        }
        form.find('.description').parent().find('label').removeClass('text-danger');
        if (package.description == '') {
            valid = false;
            form.find('.description').parent().find('label').addClass('text-danger');
        }
        form.find('.shipper').parent().find('label').removeClass('text-danger');
        if (package.shipper == '') {
            valid = false;
            form.find('.shipper').parent().find('label').addClass('text-danger');
        }
        form.find('.package-value').parent().find('label').removeClass('text-danger');
        if (package.value == '') {
            valid = false;
            form.find('.package-value').parent().find('label').addClass('text-danger');
        }
        form.find('.weight').parent().find('label').removeClass('text-danger');
        if (package.weight == '') {
            valid = false;
            form.find('.weight').parent().find('label').addClass('text-danger');
        }
        form.find('.pieces').parent().find('label').removeClass('text-danger');
        if (package.pieces == '') {
            valid = false;
            form.find('.pieces').parent().find('label').addClass('text-danger');
        }
        return valid;
    }

    function getManifestPackages(mid, type, callbk) {
        var pkgs = [];
        $.ajax({
            url: '/warehouse/get-mpackages',
            type: 'post',
            data: {
                mid: mid,
                mtype: type
            },
            success: function (result) {
                console.log(result);
                pkgs = result;
                callbk(pkgs);
            },
            error: function (err) {

            }
        });
    }

    function clearForm(form) {
        form.find('.skybox').val('');
        form.find('.customerName').text('');
        form.find('.trackingNo').val('');
        form.find('.description').val('');
        form.find('.shipper').val('');
        form.find('.package-value').val('');
        form.find('.pieces').val('');
        form.find('.weight').val('');

    }

    
    
    function displayPackages(packages, tableId,ctype) {
        //REFACTORED FUNCTION  
        if ($(tableId +" tbody").children().length >0  )
             $(tableId).DataTable().destroy();
        var containerLabel = "Skid"; 

        if (ctype=='mail')
            containerLabel = "Bag";
        var colDef = [
            {
                title: containerLabel,
                data: null,
                render: function (data, type, row, meta) {
                    // console.log(data);
                    if(ctype=='mail')
                        return `${data.bag}`; 
                    else
                        return `${data.skid} `;
                }
            },
            {
                title: "Skybox",
                data: null,
                render: function (data, type, row, meta) {
                    // console.log(data);
                    return `T-${data.skybox} `;
                }
            },
            {
                title: "Customer",
                data: null,
                render: function (data, type, row, meta) {
                    // console.log(data);
                    return `${data.customer} `;
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
                title: "Shipper",
                data: null,
                render: function (data, type, row, meta) {
                    // console.log(data);
                    return `${data.shipper}`;
                }
            },
            {
                title: "Pieces",
                data: null,
                render: function (data, type, row, meta) {
                    // console.log(data);
                    return `${data.pieces}`;
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
                title: "Value (USD)",
                data: null,
                render: function (data, type, row, meta) {
                    // console.log(data);
                    return `${Number(data.value).formatMoney(2,'.',',')}`;
                }
            },
            {
                title: "",
                data: null,
                render: function (data, type, row, meta) {
                    // console.log(data);
                    return `<i class='icon-pencil3 edit'  data-id='${data.trackingNo}' title='Edit' style='cursor:pointer;'></i> <i title='Delete' data-type='${ctype}' data-toggle='modal' data-target='#confirmPkgDel' class='icon-trash rm' data-id='${data.trackingNo}' style='cursor:pointer;'></i>`;
                }
            },

        ];
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
                   
                    if (ctype =='mail')
                        form ='#mailPackageForm';
                    
                    $(form).parent().show();
                    loadPackage(id,$(form));
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

   

    function getPackageCountBySize(mid, type, ctrlName) {
        $.ajax({
            url: `/warehouse/manifest-count/${mid}/${type}`,
            contentType: 'json',
            success: function (result) {
                $(ctrlName).html(result.size);
                console.log(result);
            }
        });
    }

    function savePackage(package, form,isClosed) {

        $.ajax({
            url: '/warehouse/save-package',
            type: 'post',
            data: package,
            success: function (result) {
                if (result.saved == true) {
                    //clear the form 
                    //and build dataTable 
                    //if the manifest is closed then hide the form after  
                    clearForm(form);
                    if (isClosed){
                        form.parent().hide();
                    }
                    LoadPackageCounters();
                    console.log("about to re-display " + package.mtype);
                    if (package.mtype == 'mail') {
                        getManifestPackages(mid, 'mail', function (mailPackages) {
                            displayPackages(mailPackages,"#mailTable",package.mtype);
                        });
                    }
                    else if (package.mtype == 'cargo') {
                        getManifestPackages(mid, 'cargo', function (cargoPackages) {
                            displayPackages(cargoPackages,"#cargoTable","cargo");
                        });
                    }
                    else {
                        getManifestPackages(mid, mtype, function (cargoPackages) {
                            displayPackages(cargoPackages,"#packageTable",mtype);
                        });
                    }

                    console.log('saved');
                }
            },
            error: function (err) {
                //check to see if access denied and re-route to login screen 
            }
        })
    }

    function loadPackage(trackingNo, form) {
        console.log(form.attr('id'));
        $.ajax({
            url: '/warehouse/load-package/' + trackingNo,
            contentType: 'json',
            success: function (dResult) {
                console.log(dResult);

                form.find('.skybox').val(dResult.skybox);
                console.log(dResult.skybox);
                form.find('.trackingNo').val(dResult.trackingNo);
                form.find('.shipper').val(dResult.shipper);
                form.find('.package-value').val(dResult.value);
                form.find('.weight').val(dResult.weight);
                form.find('.pieces').val(dResult.pieces);
                form.find('.description').val(dResult.description);
                if (typeof dResult.bag != "undefined")
                    form.find('.bag').val(dResult.bag);
                else
                    form.find('.skid').val(dResult.skid);

                form.find('.skybox').trigger('change');

            },
            error: function (err) {

            }

        })
    }

    function deletePackage(trackingNo, type) {
        $.ajax({
            url: '/warehouse/rm-package',
            type: 'post',
            data: {
                trackingNo: trackingNo,
                mid: $("#mid").val()
            },
            success: function (dResult) {
                LoadPackageCounters();
                if (type == 'mail') {
                    //refresh the package listing 
                    console.log('refreshing mail');
                    getManifestPackages(mid, "mail", function (mailPackages) {
             
                        // displayMailPackages(mailPackages);
                        displayPackages(mailPackages,"#mailTable",mtype)
                    });
                } else if (type == "cargo") {
                    // cargo 
                    console.log('refreshing cargo');
                    getManifestPackages(mid, "cargo", function (mailPackages) {
             
                        
                        displayPackages(mailPackages,"#cargoTable",mtype)
                    });
                }
                else {
                    getManifestPackages(mid, mtype, function (mailPackages) {
             
                        
                        displayPackages(mailPackages,"#packageTable",mtype)
                    });
                }
            },
            error: function (err) {

            }

        })
    }
    //sets the name of the person on the page for a given skybox. 
    function setCustomerInfo(customer, ctrl) {
        ctrl.text('');
        ctrl.removeClass('text-info');
        ctrl.removeClass('text-danger');

        if (customer.err) {
            //display as error
            ctrl.text(customer.err);
            ctrl.removeClass('text-info');
            ctrl.addClass('text-danger');

            return;
        }
        console.log(customer);
        ctrl.text(" - " + customer.name);
        ctrl.addClass('text-info');


    }

    //Gets the name of the person associated with the skybox 
    function lookupUser(skybox, ctrl) {
        //ajax call 
        $.ajax({
            url: '/warehouse/get-customer-info',
            type: 'post',
            data: {
                box: skybox
            },
            success: function (customer) {

                setCustomerInfo(customer, ctrl);

            }


        })
    }

    //#endregion
});