const { DataBrew } = require("aws-sdk");

function showPriceBreakupModal(id){
    console.log(`price_breakup_${id}`);
    const modal = $("#priceBreakupModal");
    modal.find('.modal-body').html($(`#price_breakup_${id}`).html());
    modal.modal("show");
   
}
var packages;


 function getawbdata(id){
    event.preventDefault()
 
    $.ajax({
      url: `/customer/awb/${id}/previewjson`,
      
      type: "GET",
      success: function (data) {
     packages =    data.awb.packages.map((d,index)=>{
        console.log(d)
        if(index == 0){
            return  `<tr >
            <div style= "padding-left:10px ">
            <td style="padding: 20px !important;border:0 2 0 2; font-size:24px;" >S.No</td>
             <td style="padding: 20px !important;border:0 2 0 2;font-size:24px" >Package Type</td>
              <td style="padding: 20px !important;font-size:24px" >Description</td>
              <td style="padding: 20px !important;font-size:24px" >Dimension</td>
              <td style="padding: 20px !important;font-size:24px" >Weight</td>

                </div>

              
            </tr>
            
            
            <tr >
            <div style= "padding-left:10px ">
            <td style="padding: 20px !important;border:0 2 0 2; font-size:24px;" >${index +1}</td>
             <td style="padding: 20px !important;border:0 2 0 2;font-size:24px" >${d.packageType}</td>
              <td style="padding: 20px !important;font-size:24px" >${d.description}</td>
              <td style="padding: 20px !important;font-size:24px" >${d.dimensions}</td>
              <td style="padding: 20px !important;font-size:24px" >${d.weight}</td>

                </div>

              
            </tr>`
        }
        else{
            return  `<tr >
            <div style= "padding-left:10px ">
            <td style="padding: 20px !important;border:0 2 0 2; font-size:24px;" >${index +1}</td>
             <td style="padding: 20px !important;border:0 2 0 2;font-size:24px" >${d.packageType}</td>
              <td style="padding: 20px !important;font-size:24px" >${d.description}</td>
              <td style="padding: 20px !important;font-size:24px" >${d.dimensions}</td>
              <td style="padding: 20px !important;font-size:24px" >${d.weight}</td>

                </div>

              
            </tr>`
        }

        })
    const modal = $("#priceBreakupModal");
    packages[0].replace('<tr>','<table><thead><thead><tbody>')
    

    modal.find('.modal-body').html($('.tablearea')).html(packages);
    

// console.log(packages)
    
    }

})
// console.log(packages)
return packages ;
  
   
}

 function showAwbModal(id){
     const data =  getawbdata(id)
    // console.log(`price_breakup_${id}`);
    const modal = $("#priceBreakupModal");
    // modal.find('.modal-body').html($(`#awb_${id}`).html());
    // modal.find('.modal-body').html($(`#awb_${id}`).html(data));
    console.log(data , "datata")
    modal.find('.modal-body').html($('.tablearea')).html(data);


    modal.modal("show");

   
}

function showUploadInvoiceModal(id=""){
    const modal = $("#uploadInvoiceModal");
    modal.find("form").trigger("reset");
    modal.find("button[type='submit']").html("Submit").prop("disabled",false);
    modal.find('[name="awbId"]').val(id);
    modal.modal("show");
    
}
