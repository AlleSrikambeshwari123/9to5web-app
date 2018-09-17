$(function () {

    $("#skybox").change(function(){
        //set the user 
        //make sure that its the correct length 
        var box =  $(this).val(); 
       
            lookupUser(box); 
    });


    function setCustomerInfo(customer) {
        $("#customerName").text(''); 
        $("#customerName").removeClass('text-info'); 
        $("#customerName").removeClass('text-danger'); 
            
        if (customer.err){
            //display as error
            $('#customerName').text(customer.err); 
            $("#customerName").removeClass('text-info'); 
            
            $("#customerName").addClass('text-danger'); 

            return; 
        }
        console.log(customer);
        $('#customerName').text(" - "+customer.name); 
        $("#customerName").addClass('text-info'); 

        
    }

    function lookupUser(skybox) {
        //ajax call 
        $.ajax({
            url: '/warehouse/get-customer-info',
            type: 'post',
            data: {
                box: skybox
            },
            success: function (customer) {

                setCustomerInfo(customer); 

            }


        })
    }
});