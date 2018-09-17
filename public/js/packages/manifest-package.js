$(function(){
    //#region Control Actions
    $(".skybox").change(function(){
        //set the user 
        //make sure that its the correct length 
        var form = $(this).closest('form'); 
        var box =  $(this).val(); 
        var nameCtrl = form.find('.customerName');
            lookupUser(box,$(nameCtrl)); 
    });
    $("input").change(function(){
        //revalidate the from
        var form = $(this).closest('form'); 
        var package =  getPackageDetails($(this)); 
        var validPackage = validatePackage(package,$(this));
    })
    $(".savePackage").click(function(){

        var package =  getPackageDetails($(this)); 
        var validPackage = validatePackage(package,$(this));
        if (validPackage){
            //save
            savePackage(package); 
        } 
        else {
            console.log('not saving the package...Invalid')
        }

    });
    //#endregion
  
    //#region FUNCTIONS
    function getPackageDetails(saveBtn){
        console.log('getting the package details')
        var form = saveBtn.closest('form'); 
        var package = {
            skybox : $(form).find('.skybox').val(),
            customer:$(form).find('.customerName').text(),
            tracking:$(form).find('.trackingNo').val(),
            description:$(form).find('.description').val(),
            shipper:$(form).find('.shipper').val(),
            value:$(form).find('.package-value').val(),
            pieces:$(form).find('.pieces').val(),
            weight:$(form).find('.weight').val(),
            mid:$(form).find('.mid').val(),
            mtype: $(form).find('.mtype').val(),
        }
        
        if(typeof form.find('.bag')!='undefined'){
            package.bag = $(form).find('.bag').val()
        }
        else {
            package.skid = $(form).find('.skid').val();
        }
        console.log(package)
        return package; 
    
    }
    function validatePackage(package,saveBtn){
        var valid = true; 
        var message = ''; 
        var form = saveBtn.closest('form'); 

        var skybox = form.find('.skybox') 
        $(skybox).parent().find('label').removeClass('text-danger'); 
       
        if (package.skybox ==""){
            valid = false; 
            $(skybox).parent().find('label').addClass('text-danger'); 
        }

        form.find('.trackingNo').parent().find('label').removeClass('text-danger'); 
        if (package.tracking ==''){
            valid = false; 
            form.find('.trackingNo').parent().find('label').addClass('text-danger'); 
        }
        form.find('.description').parent().find('label').removeClass('text-danger'); 
        if (package.description ==''){
            valid = false; 
            form.find('.description').parent().find('label').addClass('text-danger'); 
        }
        form.find('.shipper').parent().find('label').removeClass('text-danger'); 
        if (package.shipper ==''){
            valid = false; 
            form.find('.shipper').parent().find('label').addClass('text-danger'); 
        }
        form.find('.package-value').parent().find('label').removeClass('text-danger'); 
        if (package.value ==''){
            valid = false; 
            form.find('.package-value').parent().find('label').addClass('text-danger'); 
        }
        form.find('.weight').parent().find('label').removeClass('text-danger'); 
        if (package.weight ==''){
            valid = false; 
            form.find('.weight').parent().find('label').addClass('text-danger'); 
        }
        form.find('.pieces').parent().find('label').removeClass('text-danger'); 
        if (package.pieces ==''){
            valid = false; 
            form.find('.pieces').parent().find('label').addClass('text-danger'); 
        }
        return valid ; 
    }
    function getManifestPackages(mid, container){

    }
    function clearForm(){

    }
    var mailTable ; 
    function displayPackages(packages){
        if (mailTable)
            mailTable.destroy();
        console.log(packages);
        var colDef =  [
            {title:"trackingNo",data:null,render: function(data,type,row,meta){
                // console.log(data);
                 return `${data.trackingNo} `;
             } },
          
            {title:"shipper", data: null,render:function(data,type,row,meta){
                // console.log(data);
                return `${data.shipper}`;
             } },
           

        ];
        mailTable = $('#mailTable').DataTable( {
                               
            data: packages,
            paging:true,
           
            columns: colDef,
            //bInfo:false,
            
            "language": {
                "decimal": ",",
                "thousands": "."
            },
            
            "deferRender": true,
            initComplete: function(){
              
            },
          
        } );
    }
    function savePackage(package){

        $.ajax({
            url:'/warehouse/save-package',
            type:'post',
            data:package,
            success:function(result){
                if (result.saved == true){
                    //clear the form 
                    //and build dataTable 
                    clearForm(); 
                    displayPackages(result.packages); 
                    console.log('saved'); 
                }
            },
            error:function(err){
                //check to see if access denied and re-route to login screen 
            }
        })
    }

    //sets the name of the person on the page for a given skybox. 
    function setCustomerInfo(customer,ctrl) {
        ctrl.text(''); 
        ctrl.removeClass('text-info'); 
        ctrl.removeClass('text-danger'); 
            
        if (customer.err){
            //display as error
            ctrl.text(customer.err); 
            ctrl.removeClass('text-info'); 
            ctrl.addClass('text-danger'); 

            return; 
        }
        console.log(customer);
        ctrl.text(" - "+customer.name); 
        ctrl.addClass('text-info'); 

        
    }

    //Gets the name of the person associated with the skybox 
    function lookupUser(skybox,ctrl) {
        //ajax call 
        $.ajax({
            url: '/warehouse/get-customer-info',
            type: 'post',
            data: {
                box: skybox
            },
            success: function (customer) {

                setCustomerInfo(customer,ctrl); 

            }


        })
    }

    //#endregion
});
