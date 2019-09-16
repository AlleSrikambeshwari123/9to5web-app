

$(function(){
  loadOpenDeliveries(); 

    $('.save-delivery').click(function(){
        var delivery = {
            toLocation: $("#toLoc").val(),
            locationName: $("#toLoc option:selected").text()
        }
        console.log(delivery); 
        var isValid = true; 
        if (delivery.toLocation == ""){
            isValid = false ; 
        }
        console.log('validation failed')
        if(isValid)
        $.ajax({
            url:'/warehouse/save-delivery',
            type:'post',
            data:delivery,
            success:function(result){
                $('.close-modal').trigger('click'); 
                setInterval(() => {
                    window.location = window.location; 
                }, 300);

            }
        })

       
    })


    function loadOpenDeliveries(){
        console.log(deliveries)
                displayDeliveries(deliveries)
            
    
    }
    function displayDeliveries(data){
        var colDef = [

            {
                title: "CreatedBy",
                data: null,
                render: function (data, type, row, meta) {
                    // console.log(data);
                    return `${data.createdBy} `;
                }
            },
            {
                title: "Delivery To",
                data: null,
                render: function (data, type, row, meta) {
                    // console.log(data);
                    return `${data.locationName}`;
                }
            },
            {
                title: "Delivery Date",
                data: null,
                render: function (data, type, row, meta) {
                    // console.log(data);
                    var dateString = moment.unix(data.dateCreated).format('YYYY-MM-DD')
                    return `${dateString}`;
                }
            },
            
            {
                title: "",
                data: null,
                render: function (data, type, row, meta) {
                    // console.log(data);
                    return ` <a href='/warehouse/delivery-detail/${data.id}'> <i class='fas fa-folder-open edit' title='View this Delivery' data-id='${data.id}' title='Edit' style='cursor:pointer;'></i> </a> <a href='javascript:void(0)' data-target='#close-delivery' data-toggle='modal' > <i title='Close this Delivery' style='padding-left:10px;' class="fas fa-check-circle"></i></a>`;
                }
            },

        ];
        var tableId = "#deliveryTable"
        $(tableId).DataTable({

            data: deliveries,
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
                  
                });
               
            },

        });
    }
})